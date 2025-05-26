// src/utils/performance-monitor.js
import CONFIG from './config.js'; // Import config for potential conditional logging

export class PerformanceMonitor {
  constructor() {
    this.metrics = {
      apiCalls: 0,
      apiResponseTime: [], // Renamed for clarity
      errors: 0,
      memoryUsage: [],
      userInteractions: 0
    };
    
    this.startTime = performance.now();
    if (CONFIG.DEV.VERBOSE_LOGGING) {
      console.log('📊 Performance Monitor initialized.');
    }
    this.init();
  }

  init() {
    this.monitorApiCalls();
    this.monitorMemoryUsage();
    this.monitorUserInteractions();
    
    // Report metrics periodically if not in a test environment
    if (typeof process === 'undefined' || process.env.NODE_ENV !== 'test') {
        setInterval(() => this.reportMetrics(), 60000); // Every minute
    }
  }

  monitorApiCalls() {
    const originalFetch = window.fetch;
    // Ensure 'this' inside the fetch wrapper refers to the PerformanceMonitor instance
    const self = this; 

    window.fetch = async function(...args) { // Use function keyword to have its own 'this' for originalFetch
      const startTime = performance.now();
      try {
        const response = await originalFetch.apply(this, args); // Use apply to pass context
        const endTime = performance.now();
        
        self.metrics.apiCalls++;
        self.metrics.apiResponseTime.push(endTime - startTime);
        
        if (CONFIG.DEV.VERBOSE_LOGGING && args[0].includes(CONFIG.API.GEMINI.BASE_URL)) {
          console.log(`API Call: ${args[0]}, Time: ${(endTime - startTime).toFixed(2)}ms`);
        }
        return response;
      } catch (error) {
        self.metrics.errors++;
        if (CONFIG.DEV.VERBOSE_LOGGING) {
          console.error(`API Error: ${args[0]}`, error);
        }
        throw error;
      }
    };
  }

  monitorMemoryUsage() {
    if ('memory' in performance && (typeof process === 'undefined' || process.env.NODE_ENV !== 'test')) {
      setInterval(() => {
        const memorySample = {
          used: performance.memory.usedJSHeapSize,
          total: performance.memory.totalJSHeapSize,
          timestamp: Date.now()
        };
        this.metrics.memoryUsage.push(memorySample);
        
        if (this.metrics.memoryUsage.length > 100) { // Keep only last 100 measurements
          this.metrics.memoryUsage = this.metrics.memoryUsage.slice(-100);
        }
        // Optional: Log memory usage if verbose
        // if (CONFIG.DEV.VERBOSE_LOGGING) {
        //   console.log(`Memory Usage: ${(memorySample.used / 1024 / 1024).toFixed(2)}MB / ${(memorySample.total / 1024 / 1024).toFixed(2)}MB`);
        // }
      }, 10000); // Every 10 seconds
    }
  }

  monitorUserInteractions() {
    const self = this;
    ['click', 'keydown', 'scroll'].forEach(eventType => {
      document.addEventListener(eventType, () => {
        self.metrics.userInteractions++;
        // Optional: Log interaction type if verbose
        // if (CONFIG.DEV.VERBOSE_LOGGING) {
        //    console.log(`User Interaction: ${eventType}`);
        // }
      }, { capture: true, passive: true }); // Use capture and passive for broader monitoring without performance impact
    });
  }

  reportMetrics() {
    const report = {
      uptime: (performance.now() - this.startTime) / 1000, // in seconds
      apiCalls: this.metrics.apiCalls,
      avgResponseTime: this.getAverageResponseTime(),
      totalErrors: this.metrics.errors, // Renamed for clarity
      currentMemoryUsage: this.getCurrentMemoryUsage(),
      totalUserInteractions: this.metrics.userInteractions // Renamed for clarity
    };

    if (CONFIG.DEV.VERBOSE_LOGGING || !CONFIG.DEV.DEBUG) { // Log in verbose mode or if not in debug (e.g. staging)
        console.log('📊 Performance Report:', JSON.parse(JSON.stringify(report, (key, value) =>
            typeof value === 'number' ? parseFloat(value.toFixed(2)) : value
        )));
    }
    
    this.sendToAnalytics(report);
  }

  getAverageResponseTime() {
    if (this.metrics.apiResponseTime.length === 0) return 0;
    const sum = this.metrics.apiResponseTime.reduce((a, b) => a + b, 0);
    return sum / this.metrics.apiResponseTime.length;
  }

  getCurrentMemoryUsage() {
    if (this.metrics.memoryUsage.length === 0) return null;
    const lastSample = this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1];
    return {
        usedMB: parseFloat((lastSample.used / 1024 / 1024).toFixed(2)),
        totalMB: parseFloat((lastSample.total / 1024 / 1024).toFixed(2)),
        timestamp: lastSample.timestamp
    };
  }

  sendToAnalytics(report) {
    // Placeholder for sending metrics to an analytics service
    // Example: if (CONFIG.ANALYTICS_ENABLED) { /* send report */ }
    if (CONFIG.DEV.VERBOSE_LOGGING && CONFIG.DEV.MOCK_API) {
        console.log("Mock Analytics: Report sent", report);
    }
  }

  // Method to manually log an error if needed from other parts of the app
  logError(errorOrigin, errorDetails) {
    this.metrics.errors++;
    if (CONFIG.DEV.VERBOSE_LOGGING) {
        console.error(`Logged Error from ${errorOrigin}:`, errorDetails);
    }
  }
}

// Optional: Initialize performance monitor automatically if not in a test environment
// if (typeof process === 'undefined' || process.env.NODE_ENV !== 'test') {
//     new PerformanceMonitor();
// }

// Main application entry point
import { PerformanceMonitor } from './utils/performance-monitor.js';
import CONFIG from './utils/config.js';

if (CONFIG.DEV.DEBUG) {
    new PerformanceMonitor(); // Initialize performance monitor in debug mode
}

function initializeApp() {
    console.log(`CodeMind AI v${CONFIG.APP.VERSION} initialized.`);
    const loadingScreen = document.getElementById('loading-screen');
    const appContainer = document.getElementById('app');

    if (loadingScreen && appContainer) {
        loadingScreen.style.display = 'none';
        appContainer.style.display = 'flex'; // Or 'block' depending on final CSS for .app-container
        console.log('Application UI displayed.');
    } else {
        console.error('Could not find loading screen or app container.');
    }

    // Placeholder for future UI and Core initializations
    // e.g., import UIManager from './ui/ui-manager.js';
    // e.g., import AgentCore from './core/agent-core.js';
    // const uiManager = new UIManager();
    // const agentCore = new AgentCore();
}

// Handle potential errors during script loading or early execution
try {
    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', initializeApp);
    } else {
        initializeApp(); // DOMContentLoaded has already fired
    }
} catch (error) {
    console.error("Error initializing CodeMind AI:", error);
    const errorBoundary = document.getElementById('error-boundary');
    const errorMessage = document.getElementById('error-message');
    if (errorBoundary) errorBoundary.classList.remove('hidden');
    if (errorMessage) errorMessage.textContent = error.message || 'An unexpected error occurred.';
    // Hide main app if critical error occurs
    const appContainer = document.getElementById('app');
    if (appContainer) appContainer.style.display = 'none';
}

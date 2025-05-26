/**
     * مدير API متقدم للتعامل مع Google Gemini
     * يدعم إعادة المحاولة، التخزين المؤقت، ومعالجة الأخطاء
     */

    // import { Logger } from '../utils/logger.js'; // Assuming Logger
    // import { Storage } from '../utils/storage.js'; // Assuming Storage
    import { CONFIG } from '../utils/config.js';

    // Placeholder for Logger and Storage if not fully implemented or to avoid errors if they are basic
    const Logger = console; // Simple placeholder
    const Storage = class { async get() {} async set() {} async encrypt(){} async decrypt(){} }; // Simple placeholder

    export class APIManager {
        constructor() {
            this.apiKey = null;
            this.currentModel = CONFIG.API.GEMINI.DEFAULT_MODEL;
            this.baseUrl = CONFIG.API.GEMINI.BASE_URL;
            this.requestQueue = [];
            this.isProcessingQueue = false;
            this.rateLimiter = new Map();
            this.cache = new Map();
            this.retryAttempts = 3;
            this.retryDelay = 1000;

            this.logger = Logger; // Use placeholder
            this.storage = new Storage(); // Use placeholder

            this.stats = {
                totalRequests: 0,
                successfulRequests: 0,
                failedRequests: 0,
                totalTokensUsed: 0,
                averageResponseTime: 0,
                lastRequestTime: null
            };

            this.logger.info('🔌 API Manager initialized');
        }

        async initialize() {
            try {
                this.logger.info('🚀 Initializing API Manager...');
                await this.loadApiKey();
                await this.loadStats();
                this.setupRateLimiting();
                this.startQueueProcessor();
                this.logger.info('✅ API Manager initialized successfully'); // Changed from success
            } catch (error) {
                this.logger.error('❌ Failed to initialize API Manager:', error);
                throw error;
            }
        }

        async setApiKey(apiKey) {
            try {
                if (!apiKey || typeof apiKey !== 'string') {
                    throw new Error('Invalid API key provided');
                }
                if (!this.validateApiKeyFormat(apiKey)) {
                    throw new Error('API key format is invalid');
                }
                this.apiKey = apiKey;
                await this.saveApiKey(apiKey);
                this.logger.info('🔑 API key set successfully');
                return true;
            } catch (error) {
                this.logger.error('❌ Failed to set API key:', error);
                throw error;
            }
        }

        async validateApiKey(apiKey = this.apiKey) {
            try {
                if (!apiKey) return false;
                this.logger.info('🔍 Validating API key...');
                const testRequest = {
                    contents: [{ parts: [{ text: 'Hello, this is a test message. Please respond with "API key is valid".' }] }],
                    generationConfig: { maxOutputTokens: 20, temperature: 0.1 }
                };
                const response = await this.makeRawRequest(testRequest, apiKey);
                if (response && response.candidates && response.candidates[0]) {
                    // const responseText = response.candidates[0].content.parts[0].text; // Not used
                    this.logger.info('✅ API key validation successful'); // Changed from success
                    return true;
                }
                return false;
            } catch (error) {
                this.logger.error('❌ API key validation failed:', error);
                return false;
            }
        }

        async sendRequest(options = {}) {
            try {
                if (!this.apiKey) {
                    throw new Error('API key not set. Please configure API key first.');
                }
                const { request, model } = this.prepareRequest(options); // Destructure here
                const cacheKey = this.generateCacheKey({ request, model }); // Pass object to match executeRequest
                if (this.cache.has(cacheKey) && !options.skipCache) {
                    this.logger.info('📋 Returning cached response');
                    return this.cache.get(cacheKey);
                }
                return new Promise((resolve, reject) => {
                    this.requestQueue.push({
                        request: { request, model }, // Store as object
                        options,
                        resolve,
                        reject,
                        timestamp: Date.now(),
                        attempts: 0
                    });
                    this.processQueue();
                });
            } catch (error) {
                this.logger.error('❌ Error sending request:', error);
                throw error;
            }
        }

        prepareRequest(options) {
            const {
                message,
                systemPrompt,
                maxTokens = CONFIG.API.GEMINI.MAX_TOKENS,
                temperature = CONFIG.API.GEMINI.TEMPERATURE,
                topP = CONFIG.API.GEMINI.TOP_P,
                topK = CONFIG.API.GEMINI.TOP_K,
                model = this.currentModel
            } = options;

            let fullPrompt = '';
            if (systemPrompt) fullPrompt += `System: ${systemPrompt}

`;
            fullPrompt += `User: ${message}`;

            const request = {
                contents: [{ parts: [{ text: fullPrompt }] }],
                generationConfig: {
                    maxOutputTokens: Math.min(maxTokens, CONFIG.API.GEMINI.MAX_TOKENS),
                    temperature: Math.max(0, Math.min(2, temperature)),
                    topP: Math.max(0, Math.min(1, topP)),
                    topK: Math.max(1, Math.min(40, topK))
                },
                safetySettings: [
                    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
                ]
            };
            return { request, model }; // Return as object
        }

        async processQueue() {
            if (this.isProcessingQueue || this.requestQueue.length === 0) return;
            this.isProcessingQueue = true;
            while (this.requestQueue.length > 0) {
                const queueItem = this.requestQueue.shift();
                try {
                    await this.checkRateLimit();
                    const result = await this.executeRequest(queueItem);
                    queueItem.resolve(result);
                } catch (error) {
                    if (queueItem.attempts < this.retryAttempts && this.shouldRetry(error)) {
                        queueItem.attempts++;
                        this.logger.warn(`🔄 Retrying request (attempt ${queueItem.attempts}/${this.retryAttempts})`);
                        await this.delay(this.retryDelay * queueItem.attempts);
                        this.requestQueue.unshift(queueItem);
                    } else {
                        queueItem.reject(error);
                    }
                }
            }
            this.isProcessingQueue = false;
        }

        async executeRequest(queueItem) {
            const startTime = performance.now();
            try {
                this.logger.info('📤 Sending request to Gemini API...');
                const { request, model } = queueItem.request; // request is already the body
                const response = await this.makeRawRequest(request, this.apiKey, model);
                const endTime = performance.now();
                const responseTime = endTime - startTime;
                this.updateStats(true, responseTime, response);
                const processedResponse = this.processResponse(response);
                const cacheKey = this.generateCacheKey(queueItem.request); // Pass the original request object
                this.cache.set(cacheKey, processedResponse);
                if (this.cache.size > 100) {
                    const firstKey = this.cache.keys().next().value;
                    this.cache.delete(firstKey);
                }
                this.logger.info(`✅ Request completed in ${responseTime.toFixed(2)}ms`); // Changed from success
                return processedResponse;
            } catch (error) {
                const endTime = performance.now();
                const responseTime = endTime - startTime;
                this.updateStats(false, responseTime);
                this.logger.error('❌ Request failed:', error);
                this.emit('error', { source: 'executeRequest', error }); // Emit error
                throw error;
            }
        }

        async makeRawRequest(requestBody, apiKey, model = this.currentModel) {
            const url = `${this.baseUrl}/models/${model}:generateContent?key=${apiKey}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`);
            }
            return await response.json();
        }

        processResponse(response) {
            try {
                if (!response || !response.candidates || response.candidates.length === 0) {
                    throw new Error('No response candidates received');
                }
                const candidate = response.candidates[0];
                if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
                    throw new Error('No content in response');
                }
                const content = candidate.content.parts[0].text;
                return {
                    content: content.trim(),
                    finishReason: candidate.finishReason,
                    safetyRatings: candidate.safetyRatings,
                    tokenCount: response.usageMetadata || {},
                    model: candidate.content.model || this.currentModel, // Prefer model from response if available
                    timestamp: new Date()
                };
            } catch (error) {
                this.logger.error('Error processing response:', error);
                throw new Error(`Failed to process API response: ${error.message}`);
            }
        }

        async checkRateLimit() {
            const now = Date.now();
            const windowSize = 60000;
            const maxRequests = CONFIG.API.GEMINI.RATE_LIMIT || 60; // Use config or default

            for (const [timestamp] of this.rateLimiter) {
                if (now - timestamp > windowSize) this.rateLimiter.delete(timestamp);
            }
            if (this.rateLimiter.size >= maxRequests) {
                const oldestRequest = Math.min(...this.rateLimiter.keys());
                const waitTime = Math.max(0, windowSize - (now - oldestRequest)); // Ensure waitTime is not negative
                this.logger.warn(`⏳ Rate limit reached. Waiting ${waitTime}ms...`);
                await this.delay(waitTime);
            }
            this.rateLimiter.set(now, true);
        }

        updateStats(success, responseTime, response = null) {
            this.stats.totalRequests++;
            this.stats.lastRequestTime = new Date();
            if (success) {
                this.stats.successfulRequests++;
                const totalTime = this.stats.averageResponseTime * (this.stats.successfulRequests - 1) + responseTime;
                this.stats.averageResponseTime = totalTime / this.stats.successfulRequests;
                if (response && response.usageMetadata) {
                    this.stats.totalTokensUsed += (response.usageMetadata.totalTokenCount || 0);
                }
            } else {
                this.stats.failedRequests++;
            }
            if (this.stats.totalRequests % 10 === 0) this.saveStats();
        }

        shouldRetry(error) {
            const retryableErrors = ['network error', 'timeout', 'rate limit', 'server error', '429', '500', '502', '503', '504'];
            const errorMessage = error.message.toLowerCase();
            return retryableErrors.some(retryableError => errorMessage.includes(retryableError));
        }

        generateCacheKey(requestObject) { // Expects { request, model }
            const requestString = JSON.stringify(requestObject);
             // Simple hash function (not cryptographically secure, for cache key only)
            let hash = 0;
            for (let i = 0; i < requestString.length; i++) {
                const char = requestString.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash |= 0; // Convert to 32bit integer
            }
            return `cache_${hash.toString(16)}`;
        }

        validateApiKeyFormat(apiKey) {
            return /^AIza[0-9A-Za-z_-]{35}$/.test(apiKey);
        }

        setupRateLimiting() {
            setInterval(() => {
                const now = Date.now();
                const windowSize = 60000;
                for (const [timestamp] of this.rateLimiter) {
                    if (now - timestamp > windowSize) this.rateLimiter.delete(timestamp);
                }
            }, 10000);
        }

        startQueueProcessor() {
            setInterval(() => {
                if (!this.isProcessingQueue && this.requestQueue.length > 0) this.processQueue();
            }, 100);
        }

        async loadApiKey() {
            try {
                const encryptedKey = await this.storage.get(CONFIG.STORAGE.KEYS.API_KEY);
                if (encryptedKey) {
                    this.apiKey = await this.storage.decrypt(encryptedKey); // Assuming decrypt method
                    this.logger.info('🔑 API key loaded from storage');
                }
            } catch (error) {
                this.logger.error('Error loading API key:', error);
                this.apiKey = null; // Ensure API key is null if loading fails
            }
        }

        async saveApiKey(apiKey) {
            try {
                const encryptedKey = await this.storage.encrypt(apiKey); // Assuming encrypt method
                await this.storage.set(CONFIG.STORAGE.KEYS.API_KEY, encryptedKey);
                this.logger.info('🔑 API key saved to storage');
            } catch (error) {
                this.logger.error('Error saving API key:', error);
            }
        }

        async loadStats() {
            try {
                const savedStats = await this.storage.get('api_stats');
                if (savedStats) {
                    this.stats = { ...this.stats, ...savedStats };
                    this.logger.info('📊 API statistics loaded');
                }
            } catch (error) {
                this.logger.error('Error loading stats:', error);
            }
        }

        async saveStats() {
            try {
                await this.storage.set('api_stats', this.stats);
                this.logger.debug('📊 API statistics saved'); // Use debug
            } catch (error) {
                this.logger.error('Error saving stats:', error);
            }
        }

        delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        getStats() { return { ...this.stats }; }
        clearCache() { this.cache.clear(); this.logger.info('🧹 API cache cleared'); }

        async cleanup() {
            try {
                this.logger.info('🧹 Cleaning up API Manager...');
                await this.saveStats();
                this.clearCache();
                this.rateLimiter.clear();
                this.requestQueue = [];
                this.logger.info('✅ API Manager cleanup completed');
            } catch (error) {
                this.logger.error('Error during cleanup:', error);
            }
        }

        emit(eventName, data) {
            const event = new CustomEvent(`api:${eventName}`, { detail: data });
            if (typeof window !== 'undefined') window.dispatchEvent(event);
            this.logger.debug(`📡 API Event emitted: ${eventName}`, data); // Use debug
        }

        on(eventName, callback) {
            if (typeof window !== 'undefined') {
                window.addEventListener(`api:${eventName}`, (event) => callback(event.detail));
            }
        }
    }

    export default APIManager;

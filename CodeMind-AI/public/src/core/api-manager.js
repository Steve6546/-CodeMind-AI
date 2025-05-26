// Manages interactions with external APIs (e.g., Gemini)
import CONFIG from '../utils/config.js';

export class ApiManager {
    constructor() {
        this.apiKey = null; // To be set via settings
        this.model = CONFIG.API.GEMINI.DEFAULT_MODEL;
        console.log('ApiManager initialized');
    }

    setApiKey(key) {
        this.apiKey = key;
        console.log('API Key set in ApiManager.');
    }

    setModel(model) {
        this.model = model;
        console.log(`AI Model set to: ${model}`);
    }

    async callGemini(prompt, modelOverride = null) {
        if (!this.apiKey) {
            return { error: 'API Key not set.' };
        }
        const currentModel = modelOverride || this.model;
        console.log(`Calling Gemini (${currentModel}) with prompt: ${prompt.substring(0, 50)}...`);
        // Actual API call will be implemented later
        // For now, simulate a response
        return new Promise(resolve => setTimeout(() => {
            resolve({ text: `Mock response for: "${prompt}" using ${currentModel}` });
        }, 500));
    }
}

export default ApiManager;

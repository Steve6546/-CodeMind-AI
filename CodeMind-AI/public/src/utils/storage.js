// Handles LocalStorage and IndexedDB interactions
import CONFIG from './config.js';

export class StorageManager {
    constructor() {
        console.log('StorageManager initialized');
    }

    // LocalStorage methods
    static setLocal(key, value) {
        try {
            const serializedValue = JSON.stringify(value);
            // TODO: Add encryption if CONFIG.STORAGE.ENCRYPTION.ENABLED
            localStorage.setItem(key, serializedValue);
        } catch (e) {
            console.error("Error saving to localStorage:", e);
        }
    }

    static getLocal(key) {
        try {
            const serializedValue = localStorage.getItem(key);
            if (serializedValue === null) return undefined;
            // TODO: Add decryption if CONFIG.STORAGE.ENCRYPTION.ENABLED
            return JSON.parse(serializedValue);
        } catch (e) {
            console.error("Error reading from localStorage:", e);
            return undefined;
        }
    }

    static removeLocal(key) {
        localStorage.removeItem(key);
    }

    // IndexedDB methods (placeholders)
    async saveProject(projectData) {
        console.log('Saving project to IndexedDB (placeholder)', projectData.name);
    }

    async loadProject(projectId) {
        console.log('Loading project from IndexedDB (placeholder)', projectId);
        return null;
    }
}
export default StorageManager;

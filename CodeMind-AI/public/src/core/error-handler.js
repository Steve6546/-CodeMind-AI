// Global error handling
import CONFIG from '../utils/config.js';

export class ErrorHandler {
    static handleError(error, context = 'General') {
        console.error(`[${context} Error]:`, error);
        // More sophisticated error reporting can be added here
        // e.g., send to a logging service, display user-friendly message

        if (CONFIG.UI.NOTIFICATIONS) {
            // Placeholder: Show a notification to the user
            // This would typically involve a UI manager call
            console.log(`UI Notification (placeholder): An error occurred in ${context}.`);
        }
    }

    static initGlobalErrorHandler() {
        window.addEventListener('error', (event) => {
            ErrorHandler.handleError(event.error, 'Global Window Error');
            // Potentially display the error boundary
            const errorBoundary = document.getElementById('error-boundary');
            const errorMessage = document.getElementById('error-message');
            if (errorBoundary && !errorBoundary.classList.contains('hidden')) {
                // Already visible or handled by main.js
            } else if (errorBoundary) {
                if(errorMessage) errorMessage.textContent = event.message || 'An unexpected global error occurred.';
                errorBoundary.classList.remove('hidden');
                const appContainer = document.getElementById('app');
                if (appContainer) appContainer.style.display = 'none'; // Hide app on critical global errors
            }
        });

        window.addEventListener('unhandledrejection', (event) => {
            ErrorHandler.handleError(event.reason, 'Unhandled Promise Rejection');
        });
        console.log('Global error handlers initialized.');
    }
}
// Initialize global error handling as soon as this module is loaded
// ErrorHandler.initGlobalErrorHandler(); // This might be too early, better to call from main.js or ui-manager
export default ErrorHandler;

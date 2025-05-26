// Utility helper functions
export function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

export function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

export function sanitizeHTML(htmlString) {
    // Basic sanitizer, consider DOMPurify for more robust needs if not already used
    const tempDiv = document.createElement('div');
    tempDiv.textContent = htmlString;
    return tempDiv.innerHTML;
}

export function generateUniqueId(prefix = 'id') {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
console.log('Helpers module loaded');

// Custom logger utility
import CONFIG from './config.js';

const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
};

// Determine current log level based on config (e.g., show all if DEBUG is true)
const CURRENT_LOG_LEVEL = CONFIG.DEV.DEBUG && CONFIG.DEV.VERBOSE_LOGGING ? LOG_LEVELS.DEBUG : LOG_LEVELS.INFO;

export class Logger {
    static debug(...args) {
        if (CURRENT_LOG_LEVEL <= LOG_LEVELS.DEBUG) {
            console.debug('[DEBUG]', ...args);
        }
    }

    static info(...args) {
        if (CURRENT_LOG_LEVEL <= LOG_LEVELS.INFO) {
            console.info('[INFO]', ...args);
        }
    }

    static warn(...args) {
        if (CURRENT_LOG_LEVEL <= LOG_LEVELS.WARN) {
            console.warn('[WARN]', ...args);
        }
    }

    static error(...args) {
        if (CURRENT_LOG_LEVEL <= LOG_LEVELS.ERROR) {
            console.error('[ERROR]', ...args);
        }
    }
}
export default Logger;

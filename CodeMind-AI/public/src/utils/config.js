// src/utils/config.js
export const CONFIG = {
  // Application Info
  APP: {
    NAME: 'CodeMind AI',
    VERSION: '1.0.0', // This will be replaced by __APP_VERSION__ from Vite
    DESCRIPTION: 'وكيل ذكاء اصطناعي متقدم للتصفح والبرمجة',
    AUTHOR: 'CodeMind Team'
  },

  // API Configuration
  API: {
    GEMINI: {
      BASE_URL: 'https://generativelanguage.googleapis.com/v1beta',
      MODELS: {
        PRO: 'gemini-1.5-pro',
        FLASH: 'gemini-1.5-flash'
      },
      DEFAULT_MODEL: 'gemini-1.5-flash', // As per HTML select
      MAX_TOKENS: 8192, // Default from HTML
      TEMPERATURE: 0.7, // Default from HTML
      TOP_P: 0.8,       // Common default
      TOP_K: 40         // Common default
    }
  },

  // UI Configuration
  UI: {
    THEME: {
      DEFAULT: 'dark', // Default theme
      AVAILABLE: ['light', 'dark', 'auto']
    },
    ANIMATIONS: {
      ENABLED: true,
      DURATION: 250 // Corresponds to --transition-normal
    },
    CHAT: {
      MAX_MESSAGES: 100,
      AUTO_SCROLL: true, // Default from HTML
      TYPING_SPEED: 50  // Example typing speed
    }
  },

  // Storage Configuration
  STORAGE: {
    KEYS: {
      API_KEY: 'codemind_api_key',
      SETTINGS: 'codemind_settings',
      CHAT_HISTORY: 'codemind_chat_history',
      USER_PREFERENCES: 'codemind_user_preferences'
    },
    ENCRYPTION: {
      ENABLED: true, // Assuming encryption for API keys at least
      ALGORITHM: 'AES-GCM' // A common strong encryption algorithm
    }
  },

  // Feature Flags
  FEATURES: {
    VOICE_INPUT: false,
    FILE_UPLOAD: true, // As per project description (though not in phase 1 UI)
    EXPORT_CHAT: true, // As per project description (though not in phase 1 UI)
    DARK_MODE: true,   // Theme toggler implies this
    NOTIFICATIONS: true // General good feature
  },

  // Development
  DEV: {
    DEBUG: process.env.NODE_ENV === 'development',
    MOCK_API: false, // Set to true to simulate API calls
    VERBOSE_LOGGING: true // Enable more detailed logs in dev
  }
};

// Environment-specific overrides
if (typeof window !== 'undefined') {
  // Browser-specific configurations
  CONFIG.BROWSER = {
    SUPPORTED: ['chrome', 'firefox', 'safari', 'edge'],
    MIN_VERSION: { // Example minimum versions
      chrome: 90,
      firefox: 88,
      safari: 14,
      edge: 90
    }
  };
  // Use Vite's define feature for version
  CONFIG.APP.VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0-dev';
}

export default CONFIG;

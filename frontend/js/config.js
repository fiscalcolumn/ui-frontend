// API Configuration
// Uses environment variables set by server.js via window.ENV
// Wait for window.ENV to be available (injected by server.js middleware)
(function() {
  'use strict';
  
  // Function to initialize API config
  function initApiConfig() {
    // Check if window.ENV is available
    if (typeof window.ENV === 'undefined' || !window.ENV.STRAPI_URL) {
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      
      if (!isLocalhost) {
        console.error('⚠️ API Configuration Error: window.ENV.STRAPI_URL is not set!');
        console.error('Current window.ENV:', window.ENV);
        console.error('This usually means environment variables are not properly configured.');
        console.error('Please check your server.js environment variable injection.');
        // Don't throw error, just use fallback to prevent page break
      } else {
        console.warn('⚠️ window.ENV not set, using localhost fallback');
      }
    }
    
    // Set API configuration
    window.API_CONFIG = {
      BASE_URL: window.ENV?.STRAPI_URL || 'http://localhost:1337',
      API_PATH: window.ENV?.STRAPI_API_PATH || '/api',
      SITE_URL: window.ENV?.SITE_URL || window.location.origin
    };
  }
  
  // Initialize immediately if ENV is already available
  if (typeof window.ENV !== 'undefined' && window.ENV.STRAPI_URL) {
    initApiConfig();
  } else {
    // Wait for window.ENV to be set (injected by server.js)
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds max wait
    
    const checkEnv = setInterval(function() {
      attempts++;
      
      if (typeof window.ENV !== 'undefined' && window.ENV.STRAPI_URL) {
        clearInterval(checkEnv);
        initApiConfig();
      } else if (attempts >= maxAttempts) {
        clearInterval(checkEnv);
        // If still not available, initialize with fallback (development only)
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if (isLocalhost) {
          console.warn('⚠️ window.ENV not found after waiting, using fallback');
          initApiConfig();
        } else {
          console.error('❌ Failed to initialize API config - window.ENV not available');
          // Still initialize with fallback to prevent page break
          initApiConfig();
        }
      }
    }, 100);
  }
})();

// Helper function to get full API URL
function getApiUrl(endpoint) {
  if (typeof window.API_CONFIG === 'undefined') {
    console.error('API_CONFIG not initialized! Using fallback.');
    return `http://localhost:1337/api${endpoint}`;
  }
  return `${window.API_CONFIG.BASE_URL}${window.API_CONFIG.API_PATH}${endpoint}`;
}

// Export for backward compatibility
const API_CONFIG = window.API_CONFIG || {
  BASE_URL: window.ENV?.STRAPI_URL || 'http://localhost:1337',
  API_PATH: window.ENV?.STRAPI_API_PATH || '/api'
};

// Initializes window.API_CONFIG from server-injected window.ENV
(function() {
  'use strict';

  function initApiConfig() {
    if (typeof window.ENV === 'undefined' || !window.ENV.STRAPI_URL) {
      if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        console.error('API config: window.ENV.STRAPI_URL is not set');
      }
    }

    window.API_CONFIG = {
      BASE_URL: window.ENV?.STRAPI_URL || 'http://localhost:1337',
      API_PATH: window.ENV?.STRAPI_API_PATH || '/api',
      SITE_URL: window.ENV?.SITE_URL || window.location.origin
    };
  }

  if (typeof window.ENV !== 'undefined' && window.ENV.STRAPI_URL) {
    initApiConfig();
  } else {
    // Poll briefly for window.ENV (injected asynchronously by server.js /config.js endpoint)
    let attempts = 0;
    const checkEnv = setInterval(function() {
      attempts++;
      if (typeof window.ENV !== 'undefined' && window.ENV.STRAPI_URL) {
        clearInterval(checkEnv);
        initApiConfig();
      } else if (attempts >= 50) {
        clearInterval(checkEnv);
        initApiConfig(); // Fall back to defaults
      }
    }, 100);
  }
})();

function getApiUrl(endpoint) {
  if (typeof window.API_CONFIG === 'undefined') {
    return `http://localhost:1337/api${endpoint}`;
  }
  return `${window.API_CONFIG.BASE_URL}${window.API_CONFIG.API_PATH}${endpoint}`;
}

const API_CONFIG = window.API_CONFIG || {
  BASE_URL: window.ENV?.STRAPI_URL || 'http://localhost:1337',
  API_PATH: window.ENV?.STRAPI_API_PATH || '/api'
};

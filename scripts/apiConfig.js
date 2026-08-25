// API configuration helper
// Exposes `window.API_BASE` and helper to call backend endpoints.
(function(){
  // Prefer environment-injected values; Netlify and GitHub Actions can inject during build
  const DEFAULT_LOCAL = 'http://localhost:4000';
  const LOCAL_PORT_CANDIDATES = [
    'http://localhost:4000',
    'http://127.0.0.1:4000',
    'http://localhost:4001',
    'http://127.0.0.1:4001',
    'http://localhost:4002',
    'http://127.0.0.1:4002',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ];
  const isLocalHost = (hostname) => !hostname || ['localhost','127.0.0.1','0.0.0.0','::1'].includes(hostname) || hostname.startsWith('192.') || hostname.startsWith('10.');
  // If the build system replaces __API_BASE__ we'll pick that up (useful for static builds)
  const injected = (typeof __API_BASE__ !== 'undefined') ? __API_BASE__ : null;
  // Default: if injected or manually set, use that; otherwise
  // - while developing (localhost) point at local backend
  // - in production use the configured backend URL from environment/build config
  const envProdBase = (typeof window !== 'undefined' && window.__API_BASE__) ? window.__API_BASE__ : null;
  const directEnvBase = (typeof window !== 'undefined' && (
    window.API_BASE_PROD_URL ||
    window.API_BASE_URL ||
    window.BACKEND_URL ||
    window.BACK_END_URL ||
    window.__APP_API_BASE__ ||
    window.__API_BASE__
  )) || null;
  const prodBase = injected || envProdBase || directEnvBase || 'https://yolaaiinfohub-authentication.onrender.com';
  const initialBase = window.API_BASE || injected ||
    (isLocalHost(location.hostname) ? DEFAULT_LOCAL : prodBase || DEFAULT_LOCAL);
  window.API_BASE = initialBase;
  window.API_BASE_CANDIDATES = isLocalHost(location.hostname)
    ? Array.from(new Set([initialBase, ...LOCAL_PORT_CANDIDATES.filter((candidate) => candidate !== initialBase)]))
    : [initialBase];

  window.getApiBase = function() {
    return window.API_BASE || initialBase;
  };

  const originalFetch = window.fetch ? window.fetch.bind(window) : null;
  if (originalFetch) {
    window.fetch = async function(resource, init) {
      const rawUrl = typeof resource === 'string' ? resource : (resource && resource.url) || '';
      const isApiRequest = /\/api\//.test(rawUrl) || /\/auth/.test(rawUrl);
      if (!isApiRequest || !window.API_BASE_CANDIDATES || window.API_BASE_CANDIDATES.length <= 1) {
        return originalFetch(resource, init);
      }

      let lastError = null;
      for (const candidate of window.API_BASE_CANDIDATES) {
        let requestUrl = rawUrl;
        if (typeof requestUrl === 'string' && requestUrl.startsWith('/')) {
          requestUrl = `${candidate}${requestUrl}`;
        } else if (typeof requestUrl === 'string' && /^(https?:)?\/\//.test(requestUrl)) {
          requestUrl = requestUrl.replace(/^https?:\/\/[^/]+/, candidate);
        }

        try {
          const response = await originalFetch(requestUrl, init);
          if (response && (response.ok || response.status < 500)) {
            if (candidate !== window.API_BASE) {
              window.API_BASE = candidate;
            }
            return response;
          }
        } catch (error) {
          lastError = error;
        }
      }

      throw lastError || new Error('All API candidates failed');
    };
  }

  // Voice API Key placeholder - set via environment variable or backend proxy
  // Supported services: Google Voice API, Gemini Live API, or similar voice service
  window.VOICE_API_KEY = window.VOICE_API_KEY || null;

  // Helper to call backend proxy for Gemini
  window.callGemini = async function(payload) {
    try {
      const resp = await fetch((window.API_BASE || '') + '/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      return await resp.json();
    } catch (e) {
      console.error('callGemini error', e);
      throw e;
    }
  };

  // Helper to call backend proxy for Voice API
  window.callVoiceAPI = async function(payload) {
    try {
      const resp = await fetch((window.API_BASE || '') + '/api/voice-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      return await resp.json();
    } catch (e) {
      console.error('callVoiceAPI error', e);
      throw e;
    }
  };
})();

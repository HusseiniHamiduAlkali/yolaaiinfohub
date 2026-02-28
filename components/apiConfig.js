// API configuration helper
// Exposes `window.API_BASE` and helper to call backend endpoints.
(function(){
  // Prefer environment-injected values; Netlify and GitHub Actions can inject during build
  const DEFAULT_LOCAL = 'http://localhost:4000';
  // If the build system replaces __API_BASE__ we'll pick that up (useful for static builds)
  const injected = (typeof __API_BASE__ !== 'undefined') ? __API_BASE__ : null;
  // Default: if injected or manually set, use that; otherwise
  // - while developing (localhost) point at local backend
  // - in production use the real backend URL so the SPA talks directly to it
  const prodBase = 'https://yolaaiinfohub-backend.onrender.com';
  window.API_BASE = window.API_BASE || injected ||
                    (location.origin.includes('127.0.0.1') || location.origin.includes('localhost') ? DEFAULT_LOCAL : prodBase);


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
})();

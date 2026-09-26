// API configuration helper
// Exposes `window.API_BASE` and helper to call backend endpoints.
(function(){
  const injected = typeof __API_BASE__ !== 'undefined' ? __API_BASE__ : '';
  const configuredBase = window.API_BASE_URL || window.__API_BASE__ || injected;
  const initialBase = String(configuredBase || location.origin).replace(/\/$/, '');
  window.API_BASE = initialBase;
  window.getApiBase = function() { return window.API_BASE; };

  // Voice calls are proxied through the backend so the Gemini key stays server-side.
  window.VOICE_API_KEY = window.VOICE_API_KEY || window.GEMINI_API_KEY || window.GEMINI_LIVE_API_KEY || null;
  window.AI_LIVE_MODEL = window.AI_LIVE_MODEL || 'gemini-3.8-live';

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

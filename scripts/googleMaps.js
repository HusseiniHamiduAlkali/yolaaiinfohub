// Shared Google Maps JavaScript API loader.
(function (window) {
  'use strict';

  var loadingPromise;

  function apiBase() {
    return window.getApiBase ? window.getApiBase() : '';
  }

  function loadGoogleMaps() {
    if (window.google && window.google.maps) return Promise.resolve(window.google.maps);
    if (loadingPromise) return loadingPromise;

    loadingPromise = fetch(apiBase() + '/api/maps-key')
      .then(function (response) {
        return response.json().then(function (body) {
          if (!response.ok || !body.apiKey) throw new Error(body.error || 'Google Maps API key is not configured.');
          return body.apiKey;
        });
      })
      .then(function (apiKey) {
        return new Promise(function (resolve, reject) {
          var callbackName = '__yolaGoogleMapsReady';
          var script = document.createElement('script');
          window[callbackName] = function () {
            delete window[callbackName];
            resolve(window.google.maps);
          };
          window.gm_authFailure = function () {
            reject(new Error('Google rejected the Maps API key. Check billing, enabled APIs, and HTTP referrer restrictions.'));
          };
          script.async = true;
          script.defer = true;
          script.src = 'https://maps.googleapis.com/maps/api/js?key=' + encodeURIComponent(apiKey) +
            '&libraries=places,geometry&loading=async&callback=' + callbackName;
          script.onerror = function () {
            delete window[callbackName];
            reject(new Error('The Google Maps JavaScript API could not be loaded.'));
          };
          document.head.appendChild(script);
        });
      });

    loadingPromise.catch(function () {
      loadingPromise = null;
    });
    return loadingPromise;
  }

  window.YolaGoogleMaps = window.YolaGoogleMaps || {};
  window.YolaGoogleMaps.load = loadGoogleMaps;
  window.ensureGoogleMapsSDK = loadGoogleMaps;
})(window);

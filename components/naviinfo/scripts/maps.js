// Compatibility entry point for direct map pages.
(function () {
  'use strict';

  function start() {
    if (typeof window.initYolaGoogleMap === 'function') window.initYolaGoogleMap();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();

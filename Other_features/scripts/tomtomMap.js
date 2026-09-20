// Legacy compatibility wrapper. Map rendering is provided by Google Maps.
(function (window) {
  'use strict';

  window.initTomTomMap = function () {
    if (typeof window.initYolaGoogleMap === 'function') window.initYolaGoogleMap();
  };
})(window);

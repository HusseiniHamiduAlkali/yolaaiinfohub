window.renderSection = function() {
  // Always load and render the navbar
  function ensureNavbarLoaded(cb) {
    if (typeof window.renderNavbar === 'function') {
      window.renderNavbar();
      if (cb) cb();
    } else {
      if (!document.getElementById('navbar-js')) {
        const script = document.createElement('script');
        script.src = 'components/navbar.js';
        script.id = 'navbar-js';
        script.onload = function() {
          if (typeof window.renderNavbar === 'function') window.renderNavbar();
          if (cb) cb();
        };
        document.body.appendChild(script);
      } else {
        let tries = 0;
        (function waitForNavbar() {
          if (typeof window.renderNavbar === 'function') {
            window.renderNavbar();
            if (cb) cb();
          } else if (tries < 30) {
            tries++;
            setTimeout(waitForNavbar, 100);
          }
        })();
      }
    }
  }
  ensureNavbarLoaded();
  document.getElementById('main-content').innerHTML = window.MapsInfoPage.render();
  if (window.MapsInfoPage.mount) window.MapsInfoPage.mount();
};

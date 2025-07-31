// --- BEGIN HARDCODED API KEYS ---
window.GEMINI_API_KEY = 'AIzaSyAZ9TgevsUjCvczgJ31FHSUI1yZ25olZ9U';
window.MAPS_API_KEY = 'AIzaSyDMKnF-SynUDvcQRTubKH31V7tGflUognY';
// --- END HARDCODED API KEYS ---

// Ensure navbar is loaded
function ensureNavbarLoaded() {
  return new Promise((resolve) => {
    if (typeof window.renderNavbar === 'function') {
      window.renderNavbar();
      resolve();
    } else {
      if (!document.getElementById('navbar-js')) {
        const script = document.createElement('script');
        script.src = 'components/navbar.js';
        script.id = 'navbar-js';
        script.onload = () => {
          if (typeof window.renderNavbar === 'function') {
            window.renderNavbar();
            resolve();
          }
        };
        document.body.appendChild(script);
      }
    }
  });
}

// Ensure global styles are loaded
function ensureGlobalStyles() {
  if (!document.getElementById('global-css')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'styles/global.css';
    link.id = 'global-css';
    document.head.appendChild(link);
  }
}

// Initialize app
async function initializeApp() {
  try {
    // Load navbar and global styles first
    await ensureNavbarLoaded();
    ensureGlobalStyles();

    // Handle auth pages separately
    if (window.location.pathname.includes('/pages/auth.html')) {
      const hash = window.location.hash.slice(1);
      if (hash === 'signup') {
        window.SignupPage.render();
      } else if (hash === 'signin') {
        window.SigninPage.render();
      } else if (hash === 'forgot') {
        window.ForgotPage.render();
      }
      return;
    }

    // Then check authentication state
    const response = await fetch('http://localhost:4000/api/me', {
      credentials: 'include'
    });
    const data = await response.json();
    if (data.loggedIn) {
      window.updateAuthUI({
        username: data.username,
        name: data.name,
        email: data.email
      });
    } else {
      window.updateAuthUI(null);
    }
  } catch (error) {
    console.error('Error initializing app:', error);
    window.updateAuthUI(null);
  }
}

// Initialize on page load
window.addEventListener('load', () => {
  initializeApp().catch(error => {
    console.error('Error during app initialization:', error);
    window.updateAuthUI(null);
  });

  // Load Home as default if no hash/section is set
  const hash = window.location.hash.replace('#', '');
  if (!hash && (!window.currentSection || window.currentSection === '')) {
    if (typeof window.loadSection === 'function') {
      window.loadSection('home');
    } else {
      // fallback: reload after scripts
      setTimeout(() => {
        if (typeof window.loadSection === 'function') window.loadSection('home');
      }, 500);
    }
  }
});

// SPA router logic is now unified in index.html. No section loader here.

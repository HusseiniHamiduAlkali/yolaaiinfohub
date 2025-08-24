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

// Section initialization registry
window.sectionInitializers = window.sectionInitializers || {};

// Register a section initializer
window.registerSectionInit = window.registerSectionInit || function(sectionName, initFunction) {
    if (typeof initFunction === 'function') {
        window.sectionInitializers[sectionName] = initFunction;
        console.log(`Registered initializer for section: ${sectionName}`);
    } else {
        console.warn(`Invalid initializer provided for section: ${sectionName}`);
    }
};

// Initialize a specific section
window.initializeSection = window.initializeSection || function(sectionName) {
    const initializer = window.sectionInitializers[sectionName];
    if (typeof initializer === 'function') {
        initializer();
    }
};

// Load section content and initialize it
window.loadSection = function(section) {
    // Hide all sections first
    document.querySelectorAll('[id$="-content"]').forEach(el => {
        el.style.display = 'none';
    });

    // Show the selected section
    const sectionEl = document.getElementById(section + '-content');
    if (sectionEl) {
        sectionEl.style.display = 'block';
        // Initialize the section
        window.initializeSection(section);

        // Directly initialize EduInfo section
        if (section === 'eduinfo') {
            if (typeof window.initEduInfo === 'function') {
                window.initEduInfo();
            }
        }

        // Update URL without reload
        history.pushState({section}, '', '/' + (section === 'home' ? '' : section));
    }

    // Update navbar active state
    document.querySelectorAll('.navbar-links button').forEach(btn => {
        btn.classList.remove('active');
        if (section === btn.onclick.toString().match(/loadSection\('(.+?)'\)/)[1]) {
            btn.classList.add('active');
        }
    });
};

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

    // Determine the section to load based on the URL path
    const path = window.location.pathname.split('/').pop();
    const section = path === '' || path === 'index.html' ? 'home' : path.replace('.html', '');
    window.loadSection(section);
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

  // Register section initializers
  if (window.initNaviInfo) window.registerSectionInit('naviinfo', window.initNaviInfo);
  if (window.initEduInfo) window.registerSectionInit('eduinfo', window.initEduInfo);

  // Load section from URL or default to home
  const path = window.location.pathname.substring(1);
  const section = path || 'home';
  if (typeof window.loadSection === 'function') {
    window.loadSection(section);
    // Highlight home by default if no specific path
    if (!path || path === 'index.html') {
      window.highlightActiveNav('home');
    }
  } else {
    // fallback: reload after scripts
    setTimeout(() => {
      if (typeof window.loadSection === 'function') {
        window.loadSection(section);
        // Highlight home by default if no specific path
        if (!path || path === 'index.html') {
          window.highlightActiveNav('home');
        }
      }
    }, 500);
  }
});

// SPA router logic is now unified in index.html. No section loader here.

// API keys should be provided server-side or injected at build time.
// Use `components/apiConfig.js` or Netlify/GitHub secrets to provide `window.API_BASE` and keep keys off the client.
window.GEMINI_API_KEY = window.GEMINI_API_KEY || null;
window.MAPS_API_KEY = window.MAPS_API_KEY || null;

// Ensure navbar is loaded (skip if already rendered by index.html)
function ensureNavbarLoaded() {
  return new Promise((resolve) => {
    // If navbar already exists in DOM and is marked as initialized, skip
    if (document.querySelector('.navbar') && window.__initialNavbarRendered) {
      resolve();
      return;
    }
    // Otherwise, if navbar hasn't rendered yet, attempt to trigger it
    if (!window.__initialNavbarRendered && window.Navbar && typeof window.Navbar.render === 'function') {
      window.Navbar.render().then(resolve).catch(() => resolve());
    } else {
      resolve();
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
// This is for static section management. The dynamic SPA router in index.html uses __performLoadSection instead.
// We only define this if window.loadSection hasn't been defined by index.html yet.
if (!window.loadSection || typeof window.__performLoadSection !== 'function') {
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
    // Note: index.html already does initial auth check and navbar render,
    // but we call this again to update UI if auth state changed since initial load
  const API_BASE = window.API_BASE || (function(){ try{ const h=window.location.hostname; if(!h||h==='localhost'||h==='127.0.0.1'||h.startsWith('192.')||h.startsWith('10.')||h==='::1') return 'http://localhost:4000'; return ''; }catch(e){return 'http://localhost:4000'} })();
  try {
    const response = await fetch(`${API_BASE}/api/me`, {
      credentials: 'include'
    });
    
    if (response.ok) {
      try {
        const data = await response.json();
        if (data && data.loggedIn) {
          // Only call updateAuthUI if current user state differs from what we have
          // This prevents unnecessary navbar rerenders
          const currentUser = window.currentUser;
          if (!currentUser || currentUser.username !== data.username) {
            window.updateAuthUI({
              username: data.username,
              name: data.name,
              email: data.email
            });
          }
        } else {
          // Not logged in
          if (window.currentUser) {
            window.updateAuthUI(null);
          }
        }
      } catch (jsonError) {
        console.error('Failed to parse auth response:', jsonError);
        window.updateAuthUI(null);
      }
    } else {
      // API not available or not authenticated - treat as not logged in
      if (window.currentUser) {
        window.updateAuthUI(null);
      }
    }
  } catch (e) {
    // Network error or API unavailable - treat as not logged in
    console.warn('Auth check failed:', e);
    if (window.currentUser) {
      window.updateAuthUI(null);
    }
  }

    // Determine the section to load based on the URL path
    const path = window.location.pathname.split('/').pop();
    const section = path === '' || path === 'index.html' ? 'home' : path.replace('.html', '');
    // If a details->back restore is pending, avoid forcing the default section here
    // Also skip if a restore just completed (the restored section is already loaded)
    if(!sessionStorage.getItem('lastSection') && !window.__restoringSection && !window.__restoreJustCompleted){
      window.loadSection(section);
    } else {
      console.log('app.js initializeApp: skipping default load because restore is pending, in-progress, or just completed');
      // Clear the restore-complete flag so future page loads work normally
      window.__restoreJustCompleted = false;
    }
  } catch (error) {
    console.error('Error initializing app:', error);
    window.updateAuthUI(null);
  }
}

// Initialize on page load
window.addEventListener('load', () => {
  // If the SPA loader from index.html is present, defer loading to it
  if (typeof window.__performLoadSection === 'function') {
    console.log('app.js: SPA loader detected - deferring section load to index.html');
    // Still initialize app (auth/UI), but do not perform any section routing here
    initializeApp().catch(error => {
      console.error('Error during app initialization:', error);
      window.updateAuthUI(null);
    });
    return;
  }

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
    // If restore is pending or just completed, skip default load
    if(!sessionStorage.getItem('lastSection') && !window.__restoringSection && !window.__restoreJustCompleted){
      window.loadSection(section);
      // Highlight home by default if no specific path
      if (!path || path === 'index.html') {
        window.highlightActiveNav('home');
      }
    } else {
      console.log('load handler: skipping default load because restore is pending, in-progress, or just completed');
      window.__restoreJustCompleted = false;
    }
  } else {
    // fallback: reload after scripts
    setTimeout(() => {
      if (typeof window.loadSection === 'function') {
        if(!sessionStorage.getItem('lastSection') && !window.__restoringSection && !window.__restoreJustCompleted){
          window.loadSection(section);
          // Highlight home by default if no specific path
          if (!path || path === 'index.html') {
            window.highlightActiveNav('home');
          }
        } else {
          console.log('fallback loader: skipping default load because restore is pending, in-progress, or just completed');
          window.__restoreJustCompleted = false;
        }
      }
    }, 500);
  }
});

// SPA router logic is now unified in index.html. No section loader here.

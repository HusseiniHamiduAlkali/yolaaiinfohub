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

// Intercept "Learn more" detail links and translate pages on demand using Gemini
(function(){
  async function translateDetailsAndReplacePage(e, anchor) {
    try {
      e.preventDefault();
      const href = anchor.getAttribute('href');
      if (!href || !href.startsWith('details/')) return window.location.href = href;

      // Determine section and file
      const parts = href.split('/').filter(Boolean);
      const section = parts[1] || '';
      const file = parts[parts.length - 1];

      // Determine target language from app settings
      const appLang = (window.getCurrentAppLanguage && window.getCurrentAppLanguage()) || localStorage.getItem('appLanguage') || 'en';
      const code = (appLang || 'en').toString().substring(0,2).toLowerCase();
      const langMap = { en: 'En', ar: 'Ar', fr: 'Fr', ha: 'Ha', ff: 'Fu', fu: 'Fu', yo: 'Yo', ig: 'Ig', pcm: 'Pi', pi: 'Pi' };
      const targetFolder = langMap[code] || 'En';

      // Prefer English source to translate from
      const sourcePath = `details/${section}/En/${file}`;

      // Check session cache first
      const cacheKey = `yola_translated::${sourcePath}::${targetFolder}`;
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        try {
          history.pushState({}, '', href);
          document.open();
          document.write(cached);
          document.close();
          return;
        } catch (err) {
          console.warn('Failed to write cached translated page:', err);
        }
      }

      // Fetch source HTML (fallback to requested href if English not found)
      let htmlText = '';
      try {
        let r = await fetch(sourcePath);
        if (r.ok) htmlText = await r.text();
        else {
          r = await fetch(href);
          if (r.ok) htmlText = await r.text();
          else return window.location.href = href; // can't fetch, navigate normally
        }
      } catch (err) {
        return window.location.href = href;
      }

      // show minimal full-screen loader while translating
      const loader = document.createElement('div');
      loader.id = 'yola-translation-loading';
      loader.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#fff;z-index:2147483647;font-size:18px;color:#222';
      loader.textContent = 'Translating page—please wait…';
      document.documentElement.appendChild(loader);

      const languageName = (window.SUPPORTED_LANGUAGES && window.SUPPORTED_LANGUAGES[code]) || (code === 'en' ? 'English' : code);
      const instruction = `Translate the following HTML page into ${languageName}. Preserve all HTML tags, attributes, scripts and inline styles. ONLY translate visible user-facing text (headings, paragraphs, link text, button labels, alt text). Do NOT change URLs, data- attributes, or structural markup. Return only the translated full HTML.`;

      const apiUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? (window.API_BASE || 'http://localhost:4000') + '/api/gemini'
        : '/api/gemini';

      try {
        const payload = { model: 'gemini-2.5-pro', contents: [{ text: instruction + '\n\n' + htmlText }] };
        console.log('Translating via API URL:', apiUrl, 'payload size:', (payload.contents[0].text || '').length);
        const r = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), credentials: 'include' });
        let dataText = '';
        try { dataText = await r.text(); } catch (e) { dataText = ''; }
        let data = null;
        try { data = dataText ? JSON.parse(dataText) : null; } catch (e) { data = null; }
        console.log('Gemini proxy response status:', r.status, 'body parsed:', !!data, 'raw length:', dataText.length);

        if (!r.ok) {
          console.error('Gemini proxy returned error status', r.status, data || dataText);
          if (loader && loader.parentNode) loader.innerHTML = `<div style="padding:20px;color:#900">Translation failed (server error ${r.status}). Check console for details.</div>`;
          return;
        }

        const translated = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (!translated) {
          console.error('No translated text returned; proxy body:', data || dataText);
          if (loader && loader.parentNode) loader.innerHTML = `<div style="padding:20px;color:#900">Translation failed — no translated content returned. See console for proxy response.</div>`;
          return;
        }

        // Cache translated HTML for session
        try { sessionStorage.setItem(cacheKey, translated); } catch (e) { /* ignore storage errors */ }

        // Update history and replace entire document with translated HTML
        history.pushState({}, '', href);
        document.open();
        document.write(translated);
        document.close();
      } catch (err) {
        console.error('Translation error', err);
        if (loader && loader.parentNode) loader.innerHTML = `<div style="padding:20px;color:#900">Translation error. Check console for details.</div>`;
        return;
      }
    } catch (outerErr) {
      console.error('translateDetailsAndReplacePage error', outerErr);
    }
  }

  // Intercept clicks on details links that are "Learn more" anchors
  document.addEventListener('click', function(e) {
    try {
      const a = e.target.closest && e.target.closest('a[href*="details/"]');
      if (!a) return;
      const isLearnMore = (a.dataset && a.dataset.i18n === 'learn_more') || /learn\s*more/i.test((a.textContent||''));
      if (!isLearnMore) return;
      // Normalize href to use English source before translating
      try {
        const href = a.getAttribute('href') || '';
        const clean = href.split('?')[0].split('#')[0];
        const parts = clean.split('/').filter(Boolean);
        const idx = parts.indexOf('details');
        if (idx !== -1 && parts.length >= idx + 3) {
          const section = parts[idx+1];
          const file = parts[parts.length - 1];
          const newHref = `details/${section}/En/${file}`;
          a.setAttribute('href', newHref);
        }
      } catch (normalizeErr) { /* ignore */ }

      translateDetailsAndReplacePage(e, a);
    } catch (err) { /* ignore */ }
  }, true);
})();

// Also normalize existing detail links on load so templates pointing to localized files are rewritten
document.addEventListener('DOMContentLoaded', function() {
  try {
    document.querySelectorAll('a[href*="details/"]').forEach(a => {
      try {
        const href = a.getAttribute('href') || '';
        const clean = href.split('?')[0].split('#')[0];
        const parts = clean.split('/').filter(Boolean);
        const idx = parts.indexOf('details');
        if (idx !== -1 && parts.length >= idx + 3) {
          const section = parts[idx+1];
          const file = parts[parts.length - 1];
          const newHref = `details/${section}/En/${file}`;
          a.setAttribute('href', newHref);
        }
      } catch (inner) { /* ignore */ }
    });
  } catch (e) { /* ignore */ }
});

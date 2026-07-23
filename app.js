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
    link.href = '/styles/global.css';
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
            // Highlight the active navigation link after loading the section
            if (window.highlightActiveNav) {
                window.highlightActiveNav(section);
            }
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

      // Determine target language from app settings (prefer i18n API)
      const appLang = (window.getAppLanguage && window.getAppLanguage()) || (window.getCurrentAppLanguage && window.getCurrentAppLanguage && window.getCurrentAppLanguage()) || localStorage.getItem('appLanguage') || 'en';
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

      // helper to safely remove the loader later
      const removeLoaderLater = (delay = 6000) => setTimeout(() => { try { loader.remove(); } catch (e) {} }, delay);

      const languageName = (window.SUPPORTED_LANGUAGES && window.SUPPORTED_LANGUAGES[code]) || (code === 'en' ? 'English' : code);

      // Client-side translation: parse the fetched HTML, find visible text nodes,
      // translate them in batches using public translate endpoints (LibreTranslate -> Google fallback),
      // replace only text nodes (do not touch attributes or links), then serialize and write.
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, 'text/html');

        // Collect visible text nodes
        function isVisibleNode(node) {
          if (!node || node.nodeType !== Node.TEXT_NODE) return false;
          const text = node.textContent.trim();
          if (!text) return false;
          const parent = node.parentElement;
          if (!parent) return false;
          const tag = parent.tagName.toLowerCase();
          if (['script', 'style', 'noscript', 'code', 'pre'].includes(tag)) return false;
          // ignore ARIA-hidden or hidden elements
          try { if (parent.closest && parent.closest('[aria-hidden="true"]')) return false; } catch (e) {}
          try { if (parent.hasAttribute && parent.hasAttribute('hidden')) return false; } catch (e) {}
          return true;
        }

        const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, null, false);
        const textNodes = [];
        let node;
        while (node = walker.nextNode()) {
          try { if (isVisibleNode(node)) textNodes.push(node); } catch (e) { /* ignore */ }
        }

        // If nothing to translate, write original HTML
        if (!textNodes.length) {
          try { loader.remove(); } catch (e) {}
          history.pushState({}, '', href);
          document.open(); document.write(htmlText); document.close();
          return;
        }

        const texts = textNodes.map(n => n.textContent.trim());

        function chunkBySize(items, maxChars = 2500) {
          const chunks = [];
          let cur = [];
          let curLen = 0;
          for (const it of items) {
            const len = (it || '').length + 1;
            if (curLen + len > maxChars && cur.length) {
              chunks.push(cur);
              cur = [it];
              curLen = len;
            } else {
              cur.push(it);
              curLen += len;
            }
          }
          if (cur.length) chunks.push(cur);
          return chunks;
        }

        const chunks = chunkBySize(texts, 2500);

        async function translateChunk(chunkArray, source = 'en', target = code) {
          const DELIM = '\n---yola-delim---\n';
          const joined = chunkArray.join(DELIM);

          // Try LibreTranslate
          try {
            const resp = await fetch('https://libretranslate.de/translate', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ q: joined, source, target, format: 'text' })
            });
            if (resp.ok) {
              const body = await resp.json();
              if (body && body.translatedText) {
                return body.translatedText.split(DELIM);
              }
            }
          } catch (e) { console.warn('LibreTranslate attempt failed', e && e.message); }

          // Fallback: Google Translate undocumented endpoint
          try {
            const url = new URL('https://translate.googleapis.com/translate_a/single');
            url.searchParams.set('client', 'gtx');
            url.searchParams.set('sl', 'en');
            url.searchParams.set('tl', code);
            url.searchParams.set('dt', 't');
            for (const part of chunkArray) url.searchParams.append('q', part);
            const resp = await fetch(url.toString());
            if (resp.ok) {
              const body = await resp.json();
              const results = [];
              if (Array.isArray(body) && Array.isArray(body[0])) {
                for (let i = 0; i < body[0].length; i++) {
                  const seg = body[0][i];
                  results.push((seg && seg[0]) ? seg[0] : '');
                }
                return results;
              }
            }
          } catch (e) { console.warn('Google translate fallback failed', e && e.message); }

          return chunkArray.map(x => x);
        }

        const translatedSegments = [];
        for (const c of chunks) {
          const t = await translateChunk(c);
          translatedSegments.push(...t);
        }

        for (let i = 0; i < textNodes.length; i++) {
          const newText = translatedSegments[i] || textNodes[i].textContent;
          const original = textNodes[i].textContent;
          const leading = (original.match(/^\s*/ ) || [''])[0];
          const trailing = (original.match(/\s*$/ ) || [''])[0];
          textNodes[i].textContent = leading + newText + trailing;
        }

        const serialized = '<!doctype html>\n' + doc.documentElement.outerHTML;
        try { sessionStorage.setItem(cacheKey, serialized); } catch (e) { /* ignore */ }
        try { loader.remove(); } catch (e) {}
        history.pushState({}, '', href);
        document.open(); document.write(serialized); document.close();
        return;
      } catch (err) {
        console.error('Client-side translation error', err);
        if (loader && loader.parentNode) loader.innerHTML = `<div style="padding:20px;color:#900">Translation error. Check console for details.</div>`;
        removeLoaderLater();
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

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

function normalizeDetailsHref(href) {
  if (!href) return href;

  const clean = href.split('?')[0].split('#')[0];
  if (!clean.includes('/details/')) return href;

  const withoutPrefix = clean.replace(/^(\/|\.\/|\.\.\/)+/, '');
  const parts = withoutPrefix.split('/').filter(Boolean);
  const idx = parts.indexOf('details');

  if (idx === -1 || parts.length <= idx + 1) return href;

  const afterDetails = parts.slice(idx + 1);
  const languageFolders = ['En', 'Ar', 'Fr', 'Ha', 'Fu', 'Yo', 'Ig', 'Pi'];

  if (afterDetails[0] && languageFolders.includes(afterDetails[0])) {
    return `/${withoutPrefix}`;
  }

  if (afterDetails.length >= 2) {
    const section = afterDetails[0];
    const file = afterDetails[afterDetails.length - 1];
    return `/details/En/${section}/${file}`;
  }

  return href;
}

function getDetailRouteParts(href) {
  const normalizedHref = normalizeDetailsHref(href);
  const clean = normalizedHref.split('?')[0].split('#')[0];
  const withoutPrefix = clean.replace(/^(\/|\.\/|\.\.\/)+/, '');
  const parts = withoutPrefix.split('/').filter(Boolean);
  const idx = parts.indexOf('details');

  if (idx === -1 || parts.length <= idx + 2) return { section: '', file: '' };

  const afterDetails = parts.slice(idx + 1);
  const languageFolders = ['En', 'Ar', 'Fr', 'Ha', 'Fu', 'Yo', 'Ig', 'Pi'];
  const section = (afterDetails[0] && languageFolders.includes(afterDetails[0])) ? afterDetails[1] : afterDetails[0];
  const file = afterDetails[afterDetails.length - 1];

  return { section, file, normalizedHref };
}

// Intercept "Learn more" detail links and translate the detail page in place
(function(){
  function getCurrentAppCode() {
    try {
      const appLang = (window.getAppLanguage && window.getAppLanguage()) || (window.getCurrentAppLanguage && window.getCurrentAppLanguage && window.getCurrentAppLanguage()) || localStorage.getItem('appLanguage') || 'en';
      return (appLang || 'en').toString().substring(0, 2).toLowerCase();
    } catch (err) {
      return 'en';
    }
  }

  function getTargetLangCode(code) {
    const map = { en: 'en', ar: 'ar', fr: 'fr', ha: 'ha', ff: 'ff', yo: 'yo', ig: 'ig', pcm: 'en' };
    return map[code] || 'en';
  }

  function escapeRegExp(str) {
    return String(str || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function translateTextLocally(text, targetCode) {
    if (!text || targetCode === 'en') return text;

    const replacements = {
      ar: {
        'about': 'حول',
        'academic programs': 'البرامج الأكاديمية',
        'world-class facilities': 'مرافق عالمية المستوى',
        'unique features': 'الميزات الفريدة',
        'admission process': 'عملية القبول',
        'contact information': 'معلومات الاتصال',
        'back to education info page': 'العودة إلى صفحة معلومات التعليم',
        'development university for africa': 'جامعة تنموية لأفريقيا',
        'details': 'التفاصيل',
        'address:': 'العنوان:',
        'website:': 'الموقع الإلكتروني:',
        'email:': 'البريد الإلكتروني:',
        'phone:': 'الهاتف:'
      },
      fr: {
        'about': 'À propos',
        'academic programs': 'Programmes académiques',
        'world-class facilities': 'Installations de classe mondiale',
        'unique features': 'Fonctionnalités uniques',
        'admission process': 'Processus d\'admission',
        'contact information': 'Coordonnées',
        'back to education info page': 'Retour à la page d\'informations sur l\'éducation',
        'development university for africa': 'Université de développement pour l\'Afrique',
        'details': 'Détails',
        'address:': 'Adresse :',
        'website:': 'Site Web :',
        'email:': 'E-mail :',
        'phone:': 'Téléphone :'
      },
      ha: {
        'about': 'Game da',
        'academic programs': 'Shirye-shiryen ilimi',
        'world-class facilities': 'Kayan aiki na duniya',
        'unique features': 'Abubuwan da suka bambanta',
        'admission process': 'Tsarin karbar dalibi',
        'contact information': 'Bayanan tuntuɓa',
        'back to education info page': 'Komawa shafin bayanan ilimi',
        'development university for africa': 'Jami\'ar ci gaba ga Afirka',
        'details': 'Bayani',
        'address:': 'Adireshi:',
        'website:': 'Shafin yanar gizo:',
        'email:': 'Imel:',
        'phone:': 'Wayar hannu:'
      },
      ff: {
        'about': 'Baɗol',
        'academic programs': 'Programmii akademii',
        'world-class facilities': 'Mawɗe kelas nguurndam',
        'unique features': 'Toppiti keewal',
        'admission process': 'Dawngol jamaan',
        'contact information': 'Humpito kontak',
        'back to education info page': 'Woppu e hello cimmoo',
        'details': 'Carii',
        'address:': 'Ñawru:',
        'website:': 'Huutere:',
        'email:': 'Iimeel:',
        'phone:': 'Telefoon:'
      },
      yo: {
        'about': 'Nipa',
        'academic programs': 'Awọn eto eto ẹkọ',
        'world-class facilities': 'Awọn ohun elo ti agbaye',
        'unique features': 'Àwọn ẹya alailẹgbẹ',
        'admission process': 'Ilana gbigba',
        'contact information': 'Àlàyé lórí àbájọ',
        'back to education info page': 'Padà sí ojú ewé ìwòye ẹ̀kọ́',
        'details': 'Àlàyé',
        'address:': 'Adirẹsi:',
        'website:': 'Oju opo wẹẹbu:',
        'email:': 'Imeeli:',
        'phone:': 'Foonu:'
      },
      ig: {
        'about': 'Nhọrọ',
        'academic programs': 'Usoro agụmakwụkwọ',
        'world-class facilities': 'Ụdị ụlọ ọrụ zuru ụwa ọnụ',
        'unique features': 'Atụmatụ pụrụ iche',
        'admission process': 'Usoro ebumnuche',
        'contact information': 'Ozi nkwukọrịta',
        'back to education info page': 'Laghachi na ibe nkuzi',
        'details': 'Nkọwa',
        'address:': 'Adres:',
        'website:': 'Weebụsaịtị:',
        'email:': 'Email:',
        'phone:': 'Ekwenti:'
      },
      pcm: {
        'about': 'Bout',
        'academic programs': 'Academic programs',
        'world-class facilities': 'World-class facilities',
        'unique features': 'Unique features',
        'admission process': 'Admission process',
        'contact information': 'Contact information',
        'back to education info page': 'Back to education info page',
        'details': 'Details',
        'address:': 'Address:',
        'website:': 'Website:',
        'email:': 'Email:',
        'phone:': 'Phone:'
      }
    };

    const entries = Object.entries(replacements[targetCode] || {});
    let translated = text;
    entries.sort((a, b) => b[0].length - a[0].length).forEach(([phrase, replacement]) => {
      const regex = new RegExp(`\\b${escapeRegExp(phrase)}\\b`, 'gi');
      translated = translated.replace(regex, replacement);
    });
    return translated;
  }

  async function translateTextWithServer(text, targetCode) {
    if (!text || targetCode === 'en') return text;

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, sourceLanguage: 'en', targetLanguage: targetCode })
      });

      if (!response.ok) throw new Error(`Translation request failed with ${response.status}`);
      const data = await response.json();
      if (data && data.translatedText) {
        return data.translatedText;
      }
    } catch (err) {
      console.warn('Server translation failed, falling back to local dictionary:', err);
    }

    return translateTextLocally(text, targetCode);
  }

  async function translateDetailPage(href, targetCode) {
    try {
      const absoluteHref = new URL(href, window.location.href).toString();
      const response = await fetch(absoluteHref);
      if (!response.ok) throw new Error('Failed to fetch detail page');
      const htmlText = await response.text();

      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, 'text/html');

      const rewriteAssetPaths = (root) => {
        try {
          const updateAttr = (element, attr) => {
            const value = element.getAttribute(attr);
            if (!value || value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:') || value.startsWith('mailto:')) return;
            if (value.startsWith('./') || value.startsWith('../')) {
              try {
                const resolved = new URL(value, absoluteHref);
                element.setAttribute(attr, resolved.pathname + resolved.search + resolved.hash);
              } catch (err) {
                element.setAttribute(attr, value.replace(/^\.\.?\//, '/'));
              }
            }
          };
          root.querySelectorAll('link[rel="stylesheet"]').forEach(link => updateAttr(link, 'href'));
          root.querySelectorAll('img').forEach(img => updateAttr(img, 'src'));
          root.querySelectorAll('script[src]').forEach(script => updateAttr(script, 'src'));
        } catch (err) {
          console.warn('Failed to rewrite asset paths:', err);
        }
      };
      rewriteAssetPaths(doc);
      doc.documentElement.lang = targetCode === 'en' ? 'en' : targetCode;
      doc.documentElement.setAttribute('translate', 'yes');
      const meta = doc.querySelector('meta[http-equiv="content-language"]');
      if (meta) meta.setAttribute('content', targetCode === 'en' ? 'en' : targetCode);

      const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, null, false);
      const textNodes = [];
      let node;
      while (node = walker.nextNode()) {
        const parent = node.parentElement;
        const text = node.textContent && node.textContent.trim();
        if (!text) continue;
        const tag = parent && parent.tagName ? parent.tagName.toLowerCase() : '';
        if (['script', 'style', 'noscript', 'code', 'pre'].includes(tag)) continue;
        if (parent && parent.closest && parent.closest('[aria-hidden="true"]')) continue;
        if (parent && parent.hasAttribute && parent.hasAttribute('hidden')) continue;
        textNodes.push(node);
      }

      if (!textNodes.length) {
        const serialized = '<!doctype html>\n' + doc.documentElement.outerHTML;
        document.open(); document.write(serialized); document.close();
        return;
      }

      for (let i = 0; i < textNodes.length; i++) {
        const original = textNodes[i].textContent;
        const translatedText = await translateTextWithServer(original, targetCode);
        const leading = (original.match(/^\s*/) || [''])[0];
        const trailing = (original.match(/\s*$/) || [''])[0];
        textNodes[i].textContent = leading + translatedText + trailing;
      }

      const serialized = '<!doctype html>\n' + doc.documentElement.outerHTML;
      history.pushState({}, '', absoluteHref);
      document.open(); document.write(serialized); document.close();
    } catch (err) {
      console.warn('Detail-page translation failed:', err);
      window.location.assign(href);
    }
  }

  function openDetailPage(e, anchor) {
    try {
      e.preventDefault();
      const href = anchor.getAttribute('href') || '';
      const normalizedHref = normalizeDetailsHref(href);
      if (!normalizedHref) return;

      if (normalizedHref !== href) {
        anchor.setAttribute('href', normalizedHref);
      }

      const code = getCurrentAppCode();
      const targetCode = getTargetLangCode(code);
      if (targetCode === 'en') {
        window.location.assign(normalizedHref);
        return;
      }

      translateDetailPage(normalizedHref, targetCode);
    } catch (err) {
      console.warn('Failed to open detail page:', err);
    }
  }

  document.addEventListener('click', function(e) {
    try {
      const a = e.target.closest && e.target.closest('a[href*="details/"]');
      if (!a) return;
      const isLearnMore = (a.dataset && a.dataset.i18n === 'learn_more') || /learn\s*more/i.test((a.textContent || ''));
      if (!isLearnMore) return;
      openDetailPage(e, a);
    } catch (err) { /* ignore */ }
  }, true);
})();

// Also normalize existing detail links on load so templates pointing to localized files are rewritten
document.addEventListener('DOMContentLoaded', function() {
  try {
    document.querySelectorAll('a[href*="details/"]').forEach(a => {
      try {
        const href = a.getAttribute('href') || '';
        const normalizedHref = normalizeDetailsHref(href);
        if (normalizedHref !== href) {
          a.setAttribute('href', normalizedHref);
        }
      } catch (inner) { /* ignore */ }
    });
  } catch (e) { /* ignore */ }
});

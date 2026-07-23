// --- API CONFIGURATION ---
// Detect if running on live URL or localhost and set API base accordingly
window.getAPIBase = function() {
  // Check if running on production/live URL
  if (window.location.hostname.includes('netlify.app') || window.location.hostname.includes('yolaaiinfohub')) {
    // Production: use Render backend
    return 'https://yolaaiinfohub-backend.onrender.com';
  }
  // Development: use the current hostname so we don't mix 'localhost' and '127.0.0.1'
  // which cause separate cookie domains and inconsistent session state.
  const host = window.location.hostname || 'localhost';
  return `http://${host}:4000`;
};

window.API_BASE = window.API_BASE || window.getAPIBase();

// --- MULTILINGUAL LANGUAGE DETECTION & SUPPORT ---
/**
 * Supported languages and their codes
 * These match the i18n module languages
 */
window.SUPPORTED_LANGUAGES = {
  'en': 'English',
  'ha': 'Hausa',
  'ar': 'Arabic',
  'fr': 'French',
  'ff': 'Fulfulde',
  'yo': 'Yoruba',
  'ig': 'Igbo',
  'pcm': 'Pidgin'
};


// Get the current logged-in user
window.getLoggedInUser = function() {
  try {
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
      const user = JSON.parse(userStr);
      return user && user.username ? user.username : null;
    }
  } catch (e) { /* ignore */ }
  return null;
};



// Robust navbar loader
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


// Notification preferences helper
window.getNotificationPreferences = function() {
  // Check server settings first if available
  if (window.userSettings) {
    return {
      email: window.userSettings.emailNotifications,
      push: window.userSettings.pushNotifications
    };
  }
  
  // Fallback to localStorage
  const emailEnabled = localStorage.getItem('notification-email') === 'enabled';
  const pushEnabled = localStorage.getItem('notification-push') === 'enabled';
  return { email: emailEnabled, push: pushEnabled };
};

/**
 * Load local details HTML/data from details/<section>/En folder.
 * Tries a set of common filenames and returns concatenated text.
 * @param {string} section - section folder name (e.g., 'Home', 'Edu', 'Agro')
 * @param {string} langFolder - language folder name (default 'En')
 * @returns {Promise<string>} concatenated local content or empty string
 */
window.fetchLocalDetails = async function(section, langFolder = 'En') {
  if (!section) return '';
  const base = `details/${section}/${langFolder}`;
  const candidates = ['template.html', 'index.html', `${section}.html`, 'content.html', 'template_text.html'];
  let combined = '';
  for (const name of candidates) {
    const url = `${base}/${name}`;
    try {
      const res = await fetch(url, { cache: 'no-cache' });
      if (res && res.ok) {
        const text = await res.text();
        combined += '\n' + text;
      }
    } catch (e) {
      // ignore missing files
    }
  }

  // As a last resort, try to fetch the base folder (some static servers list dir)
  try {
    const res = await fetch(`${base}/`, { cache: 'no-cache' });
    if (res && res.ok) {
      const t = await res.text();
      combined += '\n' + t;
    }
  } catch (e) {
    // ignore
  }
  return combined || '';
};

// Mark common AI module as loaded so other components can rely on it
window.commonAILoaded = true;

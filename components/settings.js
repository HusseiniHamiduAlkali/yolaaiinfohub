// Update dark mode toggle button state
function updateDarkModeToggleSettingsButton() {
  const toggle = document.getElementById('dark-mode-toggle-settings');
  if (!toggle) return;
  const isDarkMode = document.body.classList.contains('dark-mode');
  if (isDarkMode) {
    toggle.classList.add('active');
    const textSpan = toggle.querySelector('.toggle-text');
    if (textSpan) textSpan.textContent = 'On';
  } else {
    toggle.classList.remove('active');
    const textSpan = toggle.querySelector('.toggle-text');
    if (textSpan) textSpan.textContent = 'Off';
  }
}

// Settings page component
window.SettingsPage = {
  render: function() {
    return `
      <div class="settings-container">
        <div class="settings-header">
          <h1 data-i18n="settings">Settings</h1>
        </div>
        
        <div class="settings-content">
          <!-- Display Settings Section -->
          <div class="settings-section-box">
            <h2 class="section-title" data-i18n="display_settings">Display Settings</h2>
            <div class="settings-item">
              <div class="settings-item-header">
                <label class="settings-label" data-i18n="language">Language</label>
              </div>
              <div class="settings-item-control">
                <select id="language-select">
                  <option value="en" data-i18n="english">English</option>
                  <option value="ar" data-i18n="arabic">العربية</option>
                  <option value="fr" data-i18n="french">Français</option>
                  <option value="ha" data-i18n="hausa">Hausa</option>
                  <option value="ff" data-i18n="fulfulde">Fulfulde</option>
                  <option value="yo" data-i18n="yoruba">Yorùbá</option>
                  <option value="ig" data-i18n="igbo">Igbo</option>
                  <option value="pcm" data-i18n="pidgin">Nigerian Pidgin</option>
                </select>
              </div>
            </div>
            <!--
            <div class="settings-item">
              <div class="settings-item-header">
                <label for="dark-mode-toggle-settings" class="settings-label" data-i18n="dark_mode">Dark Mode</label>
              </div>
              <div class="settings-item-control">
                <button class="dark-mode-toggle-settings" id="dark-mode-toggle-settings" onclick="window.toggleDarkMode()" title="Toggle Dark Mode">
                  <span class="toggle-icon">🌙</span>
                  <span class="toggle-text">Off</span>
                </button>
              </div>
            </div>
            -->
            <div class="settings-item">
              <div class="settings-item-header">
                <label class="settings-label" data-i18n="theme">Theme</label>
              </div>
              <div class="settings-item-control">
                <select id="theme-select">
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
              <!--<option value="colorful">Colorful</option>-->
                </select>
              </div>
            </div>
          </div>

          <!-- Notification Settings Section - Only visible for logged-in users -->
          <div class="settings-section-box" id="notification-settings-section" style="display: none;">
            <h2 class="section-title" data-i18n="notification_settings">Notification Settings</h2>
            <div class="settings-item">
              <label class="settings-label"><input type="checkbox" id="notification-email" checked> <span data-i18n="email_notifications">Email Notifications</span></label>
            </div>
            <div class="settings-item">
              <label class="settings-label"><input type="checkbox" id="notification-push" checked> <span data-i18n="push_notifications">Push Notifications</span></label>
            </div>
          </div>


          <!-- Back Button -->
          <!--
          <div class="settings-footer">
            <button class="settings-button settings-button-primary" onclick="window.loadSection('home')" data-i18n="back_to_home">Back to Home</button>
          </div>
          -->

        </div>
      </div>
    `;
  },
  
  mount: async function() {
    // Load user data
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
    
    if (currentUser && currentUser.username) {
      document.getElementById('settings-username').textContent = currentUser.username;
      document.getElementById('settings-email').textContent = currentUser.email || '-';
      document.getElementById('settings-fullname').textContent = currentUser.name || '-';
    }
    
    // Update dark mode toggle button state
    updateDarkModeToggleSettingsButton();
    // Apply translations for this page
    if (window.i18n && typeof window.i18n.applyTranslations === 'function'){
      window.i18n.applyTranslations(document.getElementById('main-content'));
    }
    
    // Load settings based on authentication status
    const API_BASE = window.API_BASE || (function(){ try{ const h=window.location.hostname; if(!h||h==='localhost'||h==='127.0.0.1'||h.startsWith('192.')||h.startsWith('10.')||h==='::1') return 'http://localhost:4000'; return ''; }catch(e){return 'http://localhost:4000'} })();

    let isUserLoggedIn = false;
    try {
      const response = await fetch(`${API_BASE}/api/me`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.loggedIn && data.verified) {
          // User is logged in and verified, show notification settings
          isUserLoggedIn = true;
          const notifSection = document.getElementById('notification-settings-section');
          if (notifSection) notifSection.style.display = 'block';
          // User is logged in, load settings from server
          await loadSettingsFromServer();
        } else {
          // Not logged in or not verified, hide notification settings
          const notifSection = document.getElementById('notification-settings-section');
          if (notifSection) notifSection.style.display = 'none';
          // Load from localStorage for unauthenticated users
          loadSettingsFromLocalStorage();
        }
      } else {
        // Not authenticated, hide notification settings
        const notifSection = document.getElementById('notification-settings-section');
        if (notifSection) notifSection.style.display = 'none';
        loadSettingsFromLocalStorage();
      }
    } catch (e) {
      console.warn('Auth check failed, loading from localStorage:', e);
      const notifSection = document.getElementById('notification-settings-section');
      if (notifSection) notifSection.style.display = 'none';
      loadSettingsFromLocalStorage();
    }
    
    // Language selector wiring
    const langSelect = document.getElementById('language-select');
    if (langSelect){
      try{ langSelect.value = window.getAppLanguage?.() || 'en'; }catch(e){}
      langSelect.addEventListener('change', function(e){
        const v = this.value;
        if (window.setAppLanguage) window.setAppLanguage(v);
        // Save to server if user is logged in
        if (isUserLoggedIn) {
          saveSettingToServer('language', v);
        } else {
          // Save to localStorage for unauthenticated users (use same key as i18n)
          localStorage.setItem('appLanguage', v);
        }
        // re-apply translations after change
        setTimeout(()=>{
          if (window.i18n && window.i18n.applyTranslations) window.i18n.applyTranslations(document.getElementById('main-content'));
          updateDarkModeToggleSettingsButton();
        }, 50);
      });
    }
    // Theme selector wiring
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) {
      try { themeSelect.value = window.getTheme ? window.getTheme() : (localStorage.getItem('theme') || 'light'); } catch(e) {}
      themeSelect.addEventListener('change', function() {
        const v = this.value;
        if (window.setTheme) window.setTheme(v);
        else localStorage.setItem('theme', v);
        // update dark-mode toggle visuals
        updateDarkModeToggleSettingsButton();
      });
    }
  }
};

// Helper functions for settings management
async function loadSettingsFromServer() {
  const API_BASE = window.API_BASE || (function(){ try{ const h=window.location.hostname; if(!h||h==='localhost'||h==='127.0.0.1'||h.startsWith('192.')||h.startsWith('10.')||h==='::1') return 'http://localhost:4000'; return ''; }catch(e){return 'http://localhost:4000'} })();

  try {
    const response = await fetch(`${API_BASE}/api/settings`, {
      credentials: 'include'
    });
    
    if (response.ok) {
      const data = await response.json();
      const settings = data.settings;
      
      // Store globally for other components
      window.userSettings = settings;
      
      // Apply settings to UI (with null checks)
      const emailNotif = document.getElementById('notification-email');
      const pushNotif = document.getElementById('notification-push');
      
      if (emailNotif && settings.emailNotifications !== undefined) {
        emailNotif.checked = settings.emailNotifications;
      }
      if (pushNotif && settings.pushNotifications !== undefined) {
        pushNotif.checked = settings.pushNotifications;
      }
      
      // Apply dark mode
      if (settings.darkMode) {
        document.body.classList.add('dark-mode');
      } else {
        document.body.classList.remove('dark-mode');
      }
      updateDarkModeToggleSettingsButton();
      
      // Apply language
      if (window.setAppLanguage && settings.language) {
        window.setAppLanguage(settings.language);
      }
    }
  } catch (error) {
    console.error('Failed to load settings from server:', error);
    // Fallback to localStorage
    loadSettingsFromLocalStorage();
  }
  
  // Add event listeners for server save
  setupServerSettingsListeners();
}

function loadSettingsFromLocalStorage() {
  // Load notification preferences
  const emailNotif = localStorage.getItem('notification-email');
  const pushNotif = localStorage.getItem('notification-push');
  
  const emailNotifEl = document.getElementById('notification-email');
  const pushNotifEl = document.getElementById('notification-push');
  
  if (emailNotif !== null && emailNotifEl) {
    emailNotifEl.checked = emailNotif === 'enabled';
  }
  if (pushNotif !== null && pushNotifEl) {
    pushNotifEl.checked = pushNotif === 'enabled';
  }
  
  // Add event listeners for localStorage save
  setupLocalSettingsListeners();
}

async function saveSettingToServer(settingKey, value) {
  const API_BASE = window.API_BASE || (function(){ try{ const h=window.location.hostname; if(!h||h==='localhost'||h==='127.0.0.1'||h.startsWith('192.')||h.startsWith('10.')||h==='::1') return 'http://localhost:4000'; return ''; }catch(e){return 'http://localhost:4000'} })();

  try {
    const response = await fetch(`${API_BASE}/api/settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ [settingKey]: value })
    });
    
    if (!response.ok) {
      console.error('Failed to save setting to server');
    }
  } catch (error) {
    console.error('Error saving setting to server:', error);
  }
}

function setupServerSettingsListeners() {
  // Email notifications
  const emailNotif = document.getElementById('notification-email');
  if (emailNotif) {
    emailNotif.addEventListener('change', function() {
      saveSettingToServer('emailNotifications', this.checked);
    });
  }
  
  // Push notifications
  const pushNotif = document.getElementById('notification-push');
  if (pushNotif) {
    pushNotif.addEventListener('change', async function() {
      saveSettingToServer('pushNotifications', this.checked);
      if (this.checked) {
        // Request permission when enabled
        if (window.NotificationManager) {
          await window.NotificationManager.requestPermission();
        }
      }
    });
  }
}

function setupLocalSettingsListeners() {
  // Add event listeners for localStorage
  const emailNotif = document.getElementById('notification-email');
  if (emailNotif) {
    emailNotif.addEventListener('change', function() {
      localStorage.setItem('notification-email', this.checked ? 'enabled' : 'disabled');
    });
  }
  
  const pushNotif = document.getElementById('notification-push');
  if (pushNotif) {
    pushNotif.addEventListener('change', async function() {
      localStorage.setItem('notification-push', this.checked ? 'enabled' : 'disabled');
      if (this.checked) {
        // Request permission when enabled
        if (window.NotificationManager) {
          await window.NotificationManager.requestPermission();
        }
      }
    });
  }
}

// Override the toggleDarkMode function to also update settings button and save to server
if (!window.__toggleDarkModeOverridden) {
  const originalToggleDarkMode = window.toggleDarkMode;
  window.toggleDarkMode = function() {
    originalToggleDarkMode();
    setTimeout(updateDarkModeToggleSettingsButton, 50);
    
    // Check if user is logged in before saving to server
    const API_BASE = window.API_BASE || (function(){ try{ const h=window.location.hostname; if(!h||h==='localhost'||h==='127.0.0.1'||h.startsWith('192.')||h.startsWith('10.')||h==='::1') return 'http://localhost:4000'; return ''; }catch(e){return 'http://localhost:4000'} })();
    
    fetch(`${API_BASE}/api/me`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && data.loggedIn && data.verified) {
          // Save to server for logged-in users
          const isDarkMode = document.body.classList.contains('dark-mode');
          saveSettingToServer('darkMode', isDarkMode);
        } else {
          // Save to localStorage for unauthenticated users
          const isDarkMode = document.body.classList.contains('dark-mode');
          localStorage.setItem('darkMode', isDarkMode ? 'enabled' : 'disabled');
        }
      })
      .catch(e => console.error('Error checking auth status:', e));
  };
  window.__toggleDarkModeOverridden = true;
}

// Submit user feedback
window.submitUserFeedback = async function() {
  const name = document.getElementById('feedback-name').value.trim();
  const email = document.getElementById('feedback-email').value.trim();
  const message = document.getElementById('feedback-message').value.trim();
  const statusSpan = document.getElementById('feedback-status');
  
  // Validate that at least the message is provided
  if (!message) {
    statusSpan.textContent = '❌ Please enter your feedback message';
    statusSpan.style.color = 'red';
    return;
  }
  
  const API_BASE = window.API_BASE || (function(){ 
    try { 
      const h = window.location.hostname; 
      if(!h || h==='localhost' || h==='127.0.0.1' || h.startsWith('192.') || h.startsWith('10.') || h==='::1') 
        return 'http://localhost:4000'; 
      return ''; 
    } catch(e) { 
      return 'http://localhost:4000' 
    } 
  })();

  try {
    statusSpan.textContent = '⏳ Sending feedback...';
    statusSpan.style.color = 'blue';
    
    const response = await fetch(`${API_BASE}/api/send-feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        name: name || 'Anonymous',
        email: email || 'Not provided',
        message: message,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
      })
    });
    
    if (response.ok) {
      statusSpan.textContent = '✅ Thank you! Your feedback has been sent successfully.';
      statusSpan.style.color = 'green';
      
      // Clear the form
      document.getElementById('feedback-name').value = '';
      document.getElementById('feedback-email').value = '';
      document.getElementById('feedback-message').value = '';
      
      // Clear status after 5 seconds
      setTimeout(() => {
        statusSpan.textContent = '';
      }, 5000);
    } else {
      const errorData = await response.json();
      statusSpan.textContent = `❌ Error: ${errorData.message || 'Failed to send feedback'}`;
      statusSpan.style.color = 'red';
    }
  } catch (error) {
    console.error('Error submitting feedback:', error);
    statusSpan.textContent = '❌ Error sending feedback. Please try again later.';
    statusSpan.style.color = 'red';
  }
};

// Placeholder functions for other settings actions
window.goToChangePassword = function() {
  alert('Change password feature coming soon!');
};

window.goToPrivacySettings = function() {
  alert('Privacy settings feature coming soon!');
};

window.openAbout = function() {
  alert('Yola AI Info Hub v1.0.0\n\nA comprehensive information platform for Yola, Nigeria.');
};

// Settings page with merged About content
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
  document.getElementById('main-content').innerHTML = window.SettingsPage.render();
  window.SettingsPage.mount();
};

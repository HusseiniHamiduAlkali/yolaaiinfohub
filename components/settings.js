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
    <!--
      <div class="minimal-appbar">
        <span class="appname" data-i18n="settings">Yola AI Info Hub - Settings</span>
      </div>
    -->
      <div class="settings-container">
        <div class="settings-header">
          <h1 data-i18n="settings">Settings</h1>
        </div>
        
        <div class="settings-content">
          <!-- Display Settings Section -->
          <div class="settings-section">
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
          </div>

          <!-- Notification Settings Section -->
          <div class="settings-section">
            <h2 class="section-title" data-i18n="notification_settings">Notification Settings</h2>
            <div class="settings-item">
              <label class="settings-label"><input type="checkbox" id="notification-email" checked> <span data-i18n="email_notifications">Email Notifications</span></label>
            </div>
            <div class="settings-item">
              <label class="settings-label"><input type="checkbox" id="notification-push" checked> <span data-i18n="push_notifications">Push Notifications</span></label>
            </div>
          </div>

          <!-- About Section -->
          <div class="settings-section">
            <h2 class="section-title" data-i18n="about">About</h2>
            <div class="settings-item">
              <label class="settings-label" data-i18n="app_version">App Version</label>
              <span class="settings-value">1.0.0</span>
            </div>
            <div class="settings-item">
              <button class="settings-button settings-button-link" onclick="window.openAbout()" data-i18n="about">About Yola AI Info Hub</button>
            </div>
          </div>


          
          
                <!-- Account Settings Section -->                
      <!--
            <div class="settings-section">
              <h2 class="section-title" data-i18n="account_settings">Account Settings</h2>
              <div class="settings-item">
                <label class="settings-label" data-i18n="username">Username</label>
                <span class="settings-value" id="settings-username">Not logged in</span>
              </div>
              <div class="settings-item">
                <label class="settings-label" data-i18n="email">Email</label>
                <span class="settings-value" id="settings-email">-</span>
              </div>
              <div class="settings-item">
                <label class="settings-label" data-i18n="full_name">Full Name</label>
                <span class="settings-value" id="settings-fullname">-</span>
              </div>
            </div>
      -->


          <!-- Privacy & Security Section -->
      <!--
          <div class="settings-section">
            <h2 class="section-title" data-i18n="privacy_security">Privacy & Security</h2>
            <div class="settings-item">
              <button class="settings-button settings-button-secondary" onclick="window.goToChangePassword()" data-i18n="change_password">Change Password</button>
            </div>
            <div class="settings-item">
              <button class="settings-button settings-button-secondary" onclick="window.goToPrivacySettings()" data-i18n="privacy_settings">Privacy Settings</button>
            </div>
          </div>
      -->

          <!-- Danger Zone Section -->
      <!--
          <div class="settings-section settings-section-danger">
            <h2 class="section-title section-title-danger" data-i18n="danger_zone">Danger Zone</h2>
            <div class="settings-item">
              <button class="settings-button settings-button-danger" onclick="window.logoutUser()" data-i18n="logout">Logout</button>
            </div>
          </div>
      -->

          <!-- Back Button -->
          <div class="settings-footer">
            <button class="settings-button settings-button-primary" onclick="window.loadSection('home')" data-i18n="back_to_home">Back to Home</button>
          </div>
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

    try {
      const response = await fetch(`${API_BASE}/api/me`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.loggedIn) {
          // User is logged in, load settings from server
          await loadSettingsFromServer();
        } else {
          // Not logged in, load from localStorage
          loadSettingsFromLocalStorage();
        }
      } else {
        // Not authenticated, load from localStorage
        loadSettingsFromLocalStorage();
      }
    } catch (e) {
      console.warn('Auth check failed, loading from localStorage:', e);
      loadSettingsFromLocalStorage();
    }
    
    // Language selector wiring
    const langSelect = document.getElementById('language-select');
    if (langSelect){
      try{ langSelect.value = window.getAppLanguage?.() || 'en'; }catch(e){}
      langSelect.addEventListener('change', function(e){
        const v = this.value;
        if (window.setAppLanguage) window.setAppLanguage(v);
        // Save to server
        saveSettingToServer('language', v);
        // re-apply translations after change
        setTimeout(()=>{
          if (window.i18n && window.i18n.applyTranslations) window.i18n.applyTranslations(document.getElementById('main-content'));
          updateDarkModeToggleSettingsButton();
        }, 50);
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
      
      // Apply settings to UI
      document.getElementById('notification-email').checked = settings.emailNotifications;
      document.getElementById('notification-push').checked = settings.pushNotifications;
      
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
  
  if (emailNotif !== null) {
    document.getElementById('notification-email').checked = emailNotif === 'enabled';
  }
  if (pushNotif !== null) {
    document.getElementById('notification-push').checked = pushNotif === 'enabled';
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
  document.getElementById('notification-email').addEventListener('change', function() {
    saveSettingToServer('emailNotifications', this.checked);
  });
  
  // Push notifications
  document.getElementById('notification-push').addEventListener('change', async function() {
    saveSettingToServer('pushNotifications', this.checked);
    if (this.checked) {
      // Request permission when enabled
      if (window.NotificationManager) {
        await window.NotificationManager.requestPermission();
      }
    }
  });
}

function setupLocalSettingsListeners() {
  // Add event listeners for localStorage
  document.getElementById('notification-email').addEventListener('change', function() {
    localStorage.setItem('notification-email', this.checked ? 'enabled' : 'disabled');
  });
  
  document.getElementById('notification-push').addEventListener('change', async function() {
    localStorage.setItem('notification-push', this.checked ? 'enabled' : 'disabled');
    if (this.checked) {
      // Request permission when enabled
      if (window.NotificationManager) {
        await window.NotificationManager.requestPermission();
      }
    }
  });
}

// Override the toggleDarkMode function to also update settings button and save to server
if (!window.__toggleDarkModeOverridden) {
  const originalToggleDarkMode = window.toggleDarkMode;
  window.toggleDarkMode = function() {
    originalToggleDarkMode();
    setTimeout(updateDarkModeToggleSettingsButton, 50);
    
    // Save to server if logged in
    const isDarkMode = !document.body.classList.contains('dark-mode'); // After toggle
    saveSettingToServer('darkMode', isDarkMode);
  };
  window.__toggleDarkModeOverridden = true;
}

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

// Export renderSection for the SPA loader
window.renderSection = function() {
  document.getElementById('main-content').innerHTML = window.SettingsPage.render();
  window.SettingsPage.mount();
};

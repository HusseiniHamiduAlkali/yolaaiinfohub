// This file now provides the Settings page (About has been repurposed to Settings).
// The old About chat/media upload functionality was removed.


















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
            <h2 class="section-title" data-i18n="about_header">About Yola AI Info Hub</h2>
            <p data-i18n="about_desc_1"><strong>Yola AI Info Hub</strong> is a modern, responsive web app that provides AI-powered information and assistance for education, agriculture, environment, health, community, and general inquiries in Yola, Adamawa State, Nigeria. Our goal is to make essential information accessible and easy to find for residents and visitors alike.</p>
            
            <h3 data-i18n="about_key_features">Key Features:</h3>
            <ul>
              <li><strong>AI-Powered Chat:</strong> Get instant answers to your questions across various categories.</li>
              <li><strong>Section-Specific Information:</strong> Dedicated sections for EduInfo, AgroInfo, EcoInfo, MediInfo, NaviInfo, and ServiInfo.</li>
              <li><strong>User-Friendly Interface and Responsiveness:</strong> A clean, intuitive design for seamless navigation on different devices <br> PC above 1150px, Tab from 900px to 1150px , Mobile below 900px,<br>with Hamburger Menu on Mobile Screen.</li>
              <li><strong>Image, Audio and Files Input:</strong> Interact with the AI using images, voice messages and other files for a richer experience.</li>
              <li><strong>Text-To-Speech:</strong> A text-to-speech option to listen to the AI's response in any section.</li>
              <li><strong>Local Focus:</strong> Specialized information relevant to Yola, Adamawa State, Nigeria.</li>
              <li><strong>Multi Modality:</strong> A special functionality, enabling user to switch between two different Gemini models for their response.</li>
              <li><strong>Chat History:</strong>Ability to remember recent chats history by the AI, for about 10 chats. For a continuous chat flow.</li>
              <li><strong>Frequently Asked Questions FAQs:</strong> FAQs available as clickable links directly below the chat areas of every section.</li>
            </ul>
            
            <h3>Section-specific Features:</h3>
            <ul>
              <li><strong>NaviInfo:</strong> Maps For Directions and Navigation.</li>
              <li><strong>EcoInfo:</strong> Carbon Calculator and an Eco Classifier, which is able to classify objects (images) as recyclable or not.</li>
            </ul>
            
            <h3>Contents of the Environment Variable (.env file):</h3>
            <ul style="list-style: none;">
              <li>1. Google Gemini API KEY.</li>
              <li>2. Google Maps API KEY.</li>
              <li>3. Mongodb URI For User Authentication.</li>
              <li>4. Dedicated e-mail address.</li>
              <li>5. E-mail. Address 'App Password' For Password Reset Route.</li>
              <li>6. Password reset URL base.</li>
              <li>7. Front-end Netlify URL.</li>
              <li>8. Back-end Render URL.</li>
            </ul>
            
            <h3>Major Challenges:</h3>
            <ul>
              <li>Power/Electricity.</li>
              <li>Internet Access (Thanks to the Weekly Reflection Data Reward, It Has Really Cushioned This Effect).</li>
            </ul>

            <p>This platform is designed to be a comprehensive information hub, leveraging the power of Artificial Intelligence to serve the Yola community better.</p>

            <p><strong>I Husseini Hamidu Alkali the Chief Pilot, Together With GitCopilot We Are Able To Land Unto This Robust Project For My 3MTT Knowledge Showcase.</strong></p>
            <p><strong>My Fellow ID: FE/23/1941341. Cohort 3.</strong></p>
          </div>

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

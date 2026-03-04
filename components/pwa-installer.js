// PWA Installation Handler for Yola AI Info Hub
// Detects when the browser is ready to install and prompts the user

window.PWAInstaller = window.PWAInstaller || {};

// Store the deferredPrompt event
let deferredPrompt = null;

window.PWAInstaller.init = function() {
  try {
    // Check if PWA is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      console.log('App is already installed as PWA');
      return;
    }

    // Listen for the beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      console.log('Install prompt ready');
      window.PWAInstaller.showInstallPrompt();
    });

    // Handle successful installation
    window.addEventListener('appinstalled', () => {
      console.log('PWA installed successfully');
      deferredPrompt = null;
      window.PWAInstaller.notifyInstalled();
    });

    // Monitor display mode changes
    window.matchMedia('(display-mode: standalone)').addEventListener('change', (e) => {
      if (e.matches) {
        console.log('App is now running as standalone');
      }
    });

  } catch (err) {
    console.error('Error initializing PWA installer:', err);
  }
};

// Show install prompt to user
window.PWAInstaller.showInstallPrompt = function() {
  try {
    // Check if prompt is available and not dismissed recently
    if (!deferredPrompt) {
      return;
    }

    // Check if user dismissed this session
    const dismissed = sessionStorage.getItem('pwa_install_dismissed');
    if (dismissed) {
      return;
    }

    // Create install banner
    const banner = document.createElement('div');
    banner.id = 'pwa-install-banner';
    banner.innerHTML = `
      <style>
        #pwa-install-banner {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
          color: white;
          padding: 16px;
          box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.15);
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          z-index: 10000;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        }

        #pwa-install-banner.mobile {
          flex-direction: column;
          gap: 8px;
        }

        #pwa-install-content {
          flex: 1;
        }

        #pwa-install-title {
          font-weight: 600;
          margin: 0 0 4px 0;
          font-size: 14px;
        }

        #pwa-install-desc {
          font-size: 13px;
          margin: 0;
          opacity: 0.9;
        }

        #pwa-install-buttons {
          display: flex;
          gap: 8px;
        }

        #pwa-install-banner.mobile #pwa-install-buttons {
          width: 100%;
        }

        .pwa-btn {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          white-space: nowrap;
        }

        .pwa-install-btn {
          background: white;
          color: #2196F3;
        }

        .pwa-install-btn:hover {
          background: #f5f5f5;
          transform: scale(1.02);
        }

        .pwa-dismiss-btn {
          background: rgba(255, 255, 255, 0.2);
          color: white;
        }

        .pwa-dismiss-btn:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        #pwa-install-banner.mobile .pwa-btn {
          flex: 1;
        }

        @media (max-width: 600px) {
          #pwa-install-banner {
            flex-direction: column;
          }

          #pwa-install-banner.mobile #pwa-install-buttons {
            width: 100%;
          }

          .pwa-btn {
            flex: 1;
          }
        }
      </style>

      <div id="pwa-install-content">
        <h3 id="pwa-install-title">📱 Install App</h3>
        <p id="pwa-install-desc">Get quick access to Yola AI Info Hub on your device</p>
      </div>

      <div id="pwa-install-buttons">
        <button class="pwa-btn pwa-install-btn" id="pwa-install-yes">Install</button>
        <button class="pwa-btn pwa-dismiss-btn" id="pwa-install-no">Not Now</button>
      </div>
    `;

    // Add banner to page
    document.body.appendChild(banner);

    // Auto-add mobile class if small screen
    if (window.innerWidth < 600) {
      banner.classList.add('mobile');
    }

    // Handle install button
    document.getElementById('pwa-install-yes').addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to install prompt: ${outcome}`);
        deferredPrompt = null;
        banner.remove();
      }
    });

    // Handle dismiss button
    document.getElementById('pwa-install-no').addEventListener('click', () => {
      sessionStorage.setItem('pwa_install_dismissed', 'true');
      banner.remove();
    });

  } catch (err) {
    console.error('Error showing install prompt:', err);
  }
};

// Manual install trigger
window.PWAInstaller.promptInstall = async function() {
  try {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`Manual install response: ${outcome}`);
    } else {
      // Fallback message
      alert('This app can be installed! Look for an install option in your browser menu.');
    }
  } catch (err) {
    console.error('Error prompting install:', err);
  }
};

// Notify user of installation
window.PWAInstaller.notifyInstalled = function() {
  try {
    if (window.NotificationManager && window.NotificationManager.sendNotification) {
      window.NotificationManager.sendNotification('App Installed! 🎉', {
        body: 'Yola AI Info Hub has been installed successfully. You can access it anytime!',
        tag: 'app-installed'
      });
    }
  } catch (err) {
    console.error('Error notifying installation:', err);
  }
};

// Get installation status
window.PWAInstaller.isInstalled = function() {
  return window.matchMedia('(display-mode: standalone)').matches;
};

// Initialize when document is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.PWAInstaller.init();
  });
} else {
  window.PWAInstaller.init();
}

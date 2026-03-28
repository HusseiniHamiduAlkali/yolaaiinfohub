// Frontend logic for login/signup/logout modals and API, plus password reset
// Cache version: v2-login-handler-fix-2026-02-20

// Determine API base depending on environment (dev -> localhost backend, prod -> same-origin)
// Prefer any existing value set on window (such as via apiConfig.js or build-time injection)
const API_BASE = window.API_BASE || (function() {
  try {
    const host = window.location.hostname;
    // treat localhost/127.0.0.1 and typical LAN IPs as dev
    // Use the same hostname for the API so cookies set by the backend
    // match the frontend host (avoids localhost vs 127.0.0.1 mismatch).
    if (!host) return 'http://localhost:4000';
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host.startsWith('192.') || host.startsWith('10.')) {
      return `http://${host}:4000`;
    }
    // otherwise use the Render backend in production
    return 'https://yolaaiinfohub-backend.onrender.com';
  } catch (e) {
    return 'http://localhost:4000';
  }
})();

// Function to toggle password visibility
window.togglePasswordVisibility = function(inputId) {
  const input = document.getElementById(inputId);
  const icon = input.parentElement.querySelector('.password-toggle i');
  if (input.type === 'password') {
    input.type = 'text';
    icon.className = 'far fa-eye-slash';
  } else {
    input.type = 'password';
    icon.className = 'far fa-eye';
  }
};

// Offline/Testing Mode: Manually trigger login state without internet
window.triggerOfflineLogin = function(userData = null) {
  const defaultUser = {
    username: 'testuser',
    name: 'Test User',
    email: 'test@example.com',
    phone: '+234-123-456-7890',
    state: 'Lagos',
    lga: 'Lekki',
    address: '123 Main Street, Lekki',
    profilePicture: null,
    avatar: 'https://ui-avatars.com/api/?name=Test+User&background=3182ce&color=fff'
  };
  
  const user = userData ? { ...defaultUser, ...userData } : defaultUser;
  console.log('%c🔓 OFFLINE MODE: Manual login triggered', 'color: #ff6b6b; font-weight: bold; font-size: 12px;', user);
  console.log('%c💡 TIP: Use window.triggerOfflineLogout() to test logout', 'color: #4ecdc4; font-size: 11px;');
  window.updateAuthUI(user);
  window.offlineModeActive = true;
};

// Offline/Testing Mode: Manually trigger logout
window.triggerOfflineLogout = function() {
  console.log('%c🔓 OFFLINE MODE: Manual logout triggered', 'color: #ff6b6b; font-weight: bold; font-size: 12px;');
  console.log('%c💡 TIP: Use window.triggerOfflineLogin() to test login again', 'color: #4ecdc4; font-size: 11px;');
  window.updateAuthUI(null);
  window.offlineModeActive = false;
};

window.updateAuthUI = function(user) {
  // Keep a global reference to the current user for other components (navbar)
  window.currentUser = user || null;
  // Keep a short-lived copy so navbar scripts that load later can pick up
  // the most recent auth state even if they were not present when updateAuthUI ran.
  window.__lastUser = window.currentUser;
  // do not cache user in localStorage; rely on backend for state
  const authButtons = document.getElementById('auth-buttons');
  const userInfo = document.getElementById('user-info');

  // Update navbar username text if present
  const navbarUsernameEl = document.getElementById('navbar-username');
  if (navbarUsernameEl) {
    if (user && user.username) navbarUsernameEl.textContent = user.username;
    else navbarUsernameEl.textContent = '';
  }

  // Update navbar avatar and profile link if present
  const navbarAvatarWrap = document.getElementById('navbar-avatar');
  const navbarProfileLink = document.getElementById('navbar-profile-link');
  const navbarFullnameEl = document.querySelector('.navbar-fullname');
  const navbarUsernameTextEl = document.querySelector('.navbar-username-text');
  if (navbarAvatarWrap) {
    if (user && (user.avatar || user.name || user.username)) {
      const avatarUrl = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || user.username)}&background=3182ce&color=fff`;
      navbarAvatarWrap.innerHTML = `<img src="${avatarUrl}" alt="avatar"/>`;
    } else {
      navbarAvatarWrap.innerHTML = '';
    }
  }
  if (navbarProfileLink) {
    if (user && user.username) navbarProfileLink.href = `/pages/profile.html?u=${encodeURIComponent(user.username)}`;
    else navbarProfileLink.removeAttribute('href');
  }
  // Also update fullname and @username if those elements exist
  if (navbarFullnameEl) navbarFullnameEl.textContent = user && (user.name || user.username) ? (user.name || user.username) : '';
  if (navbarUsernameTextEl) navbarUsernameTextEl.textContent = user && user.username ? `@${user.username}` : '';
  
  if (user && user.username) {
    // User is logged in
    // set global currentUser (done above) and ensure navbar reflects it
    if (authButtons) authButtons.style.display = 'none';
    if (userInfo) {
      userInfo.style.display = 'flex';
      userInfo.querySelector('.username').textContent = user.name || user.username;
      userInfo.querySelector('.avatar').src = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || user.username)}`;
    }
    // Ensure navbar top section and username container are visible
    try {
      const topSection = document.querySelector('.navbar-top-section');
      if (topSection) topSection.style.display = 'flex';
      const usernameContainer = document.getElementById('navbar-username-container') || document.querySelector('.navbar-username-container');
      if (usernameContainer) usernameContainer.style.display = 'flex';
    } catch (e) {
      console.warn('Could not adjust navbar display:', e);
    }
    // If navbar exists, re-render to pick up username on PC views
    if (window.Navbar && typeof window.Navbar.render === 'function') {
      console.log('%c🔄 updateAuthUI: Calling Navbar.render() for logged-in user:', 'color: #3182ce; font-weight: bold;', user.username);
      // Only force rerender if not already rendered (prevents flashing)
      if (!window.__initialNavbarRendered) {
        window.__forceNavbarRerender = true;
      }
      try { window.Navbar.render(); } catch(e) { console.error('Navbar render error:', e); }
    } else {
      console.warn('%c⚠️ updateAuthUI: Navbar not available yet', 'color: #f39c12;', { hasNavbar: !!window.Navbar, isFunction: window.Navbar && typeof window.Navbar.render });
    }
    
    // Load chat histories from backend for this logged-in user
    if (window.loadAllChatHistoriesFromBackend) {
      window.loadAllChatHistoriesFromBackend().catch(e => console.warn('Error loading chat histories:', e));
    }
  } else {
    // User is logged out
    if (authButtons) authButtons.style.display = 'flex';
    if (userInfo) userInfo.style.display = 'none';
    // Ensure navbar top section and username container are hidden when logged out
    try {
      const topSection = document.querySelector('.navbar-top-section');
      if (topSection) topSection.style.display = '';
      const usernameContainer = document.getElementById('navbar-username-container') || document.querySelector('.navbar-username-container');
      if (usernameContainer) usernameContainer.style.display = 'none';
    } catch (e) { /* ignore */ }
    if (window.Navbar && typeof window.Navbar.render === 'function') {
      console.log('%c🔄 updateAuthUI: Calling Navbar.render() for logged-out user', 'color: #e53e3e; font-weight: bold;');
      // Only force rerender if not already rendered (prevents flashing)
      if (!window.__initialNavbarRendered) {
        window.__forceNavbarRerender = true;
      }
      try { window.Navbar.render(); } catch(e) { console.error('Navbar render error:', e); }
    } else {
      console.warn('%c⚠️ updateAuthUI: Navbar not available yet', 'color: #f39c12;', { hasNavbar: !!window.Navbar, isFunction: window.Navbar && typeof window.Navbar.render });
    }
  }
};

window.showSigninModal = function() {
  showAuthModal('signin');
};
window.showSignupModal = function() {
  showAuthModal('signup');
};
window.logoutUser = async function() {
  try {
    const response = await fetch(`${API_BASE}/api/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    // Logout call to backend (session will be destroyed server-side)
    window.updateAuthUI(null);
    
    // Clear all chat histories for this user on logout
    if (window.clearAllChatHistories && typeof window.clearAllChatHistories === 'function') {
      window.clearAllChatHistories();
    }
    
    if (!response.ok) {
      console.error('Logout failed:', await response.text());
    }
  } catch (error) {
    // updateAuthUI will call Navbar.render() internally
    window.updateAuthUI(null);
    
    // Clear all chat histories for this user on logout (even on error)
    if (window.clearAllChatHistories && typeof window.clearAllChatHistories === 'function') {
      window.clearAllChatHistories();
    }
    
    console.error('Logout error:', error);
  }
};

window.showForgotModal = function() {
  let modal = document.getElementById('auth-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'auth-modal';
    modal.className = 'auth-modal';
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div class="auth-modal-content">
      <button class="auth-modal-close" onclick="document.getElementById('auth-modal').remove()">&times;</button>
      <h2>Forgot Password</h2>
      <form id="forgot-form">
        <input type="email" id="forgot-email" placeholder="Enter your email" required autocomplete="email" />
        <button type="submit">Send Reset Link</button>
      </form>
      <div class="auth-error" id="auth-error"></div>
    </div>
  `;
  modal.style.display = 'flex';
  document.getElementById('forgot-form').onsubmit = async function(e) {
    e.preventDefault();
    const submitBtn = this.querySelector('button[type="submit"]');
    const email = document.getElementById('forgot-email').value.trim();
    
    // Disable button during request
    submitBtn.disabled = true;
    
  const res = await fetch(`${API_BASE}/api/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    
    // Re-enable button after response
    submitBtn.disabled = false;
    
    if (data.success) {
      document.getElementById('auth-error').style.color = '#3182ce';
      document.getElementById('auth-error').textContent = data.message;
    } else {
      document.getElementById('auth-error').style.color = '#e53e3e';
      document.getElementById('auth-error').textContent = data.error || 'Error';
    }
  };
};


// Show password reset modal if token/email in URL
window.showResetPasswordModal = function(token, email) {
  let modal = document.getElementById('auth-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'auth-modal';
    modal.className = 'auth-modal';
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div class="auth-modal-content">
      <button class="auth-modal-close" onclick="document.getElementById('auth-modal').remove()">&times;</button>
      <h2>Reset Password</h2>
      <form id="reset-form">
        <input type="password" id="reset-password" placeholder="New password" required autocomplete="new-password" />
        <input type="password" id="reset-password2" placeholder="Confirm new password" required autocomplete="new-password" />
        <button type="submit">Reset Password</button>
      </form>
      <div class="auth-error" id="auth-error"></div>
    </div>
  `;
  modal.style.display = 'flex';
  document.getElementById('reset-form').onsubmit = async function(e) {
    e.preventDefault();
    const submitBtn = this.querySelector('button[type="submit"]');
    const pw1 = document.getElementById('reset-password').value;
    const pw2 = document.getElementById('reset-password2').value;
    if (pw1.length < 6) {
      document.getElementById('auth-error').textContent = 'Password must be at least 6 characters.';
      return;
    }
    if (pw1 !== pw2) {
      document.getElementById('auth-error').textContent = window.t ? window.t('password_mismatch') : 'Passwords do not match.';
      return;
    }
    
    // Disable button during request
    submitBtn.disabled = true;
    
  const res = await fetch(`${API_BASE}/api/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, token, password: pw1 })
    });
    const data = await res.json();
    
    // Re-enable button after response
    submitBtn.disabled = false;
    
    if (data.success) {
      document.getElementById('auth-error').style.color = '#3182ce';
      document.getElementById('auth-error').textContent = 'Password reset! You can now sign in.';
      setTimeout(() => { modal.remove(); showAuthModal('signin'); }, 1800);
    } else {
      document.getElementById('auth-error').style.color = '#e53e3e';
      document.getElementById('auth-error').textContent = data.error || 'Error';
    }
  };
};

function showAuthModal(type) {
  let modal = document.getElementById('auth-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'auth-modal';
    modal.className = 'auth-modal';
    document.body.appendChild(modal);
  }
  if (type === 'signup') {
    modal.innerHTML = `
      <div class="auth-modal-content">
        <button class="auth-modal-close" onclick="document.getElementById('auth-modal').remove()">&times;</button>
        <h2>Sign Up</h2>
        <form id="auth-form">
          <input type="text" id="auth-username" placeholder="Username" required autocomplete="username" />
          <input type="email" id="auth-email" placeholder="Email" required autocomplete="email" />
          <input type="text" id="auth-name" placeholder="Full Name" required autocomplete="name" />
          <input type="text" id="auth-nin" placeholder="NIN (11 digits)" required pattern="\\d{11}" maxlength="11" />
          <div class="password-field">
            <input type="password" id="auth-password" placeholder="Password" required autocomplete="new-password" />
            <button type="button" class="password-toggle" onclick="togglePasswordVisibility('auth-password')">
              <i class="far fa-eye"></i>
            </button>
          </div>
          <button type="submit">Sign Up</button>
        </form>
        <div class="auth-error" id="auth-error"></div>
      </div>
    `;
  } else {
    modal.innerHTML = `
      <div class="auth-modal-content">
        <button class="auth-modal-close" onclick="document.getElementById('auth-modal').remove()">&times;</button>
        <h2>Sign In</h2>
        <form id="auth-form">
          <input type="text" id="auth-username" placeholder="Username or Email" required autocomplete="username" />
          <div class="password-field">
            <input type="password" id="auth-password" placeholder="Password" required autocomplete="current-password" />
            <button type="button" class="password-toggle" onclick="togglePasswordVisibility('auth-password')">
              <i class="far fa-eye"></i>
            </button>
          </div>
          <button type="submit">Sign In</button>
        </form>
        <div style="margin-top:0.7em;text-align:center;">
          <a href="#" onclick="window.showForgotModal();return false;" style="color:#3182ce;text-decoration:underline;font-size:0.98em;">Forgot password?</a>
        </div>
        <div class="auth-error" id="auth-error"></div>
      </div>
    `;
  }
  modal.style.display = 'flex';
  document.getElementById('auth-form').onsubmit = async function(e) {
    e.preventDefault();
    const submitBtn = this.querySelector('button[type="submit"]');
    let url, body;
    if (type === 'signup') {
      const username = document.getElementById('auth-username').value.trim();
      const email = document.getElementById('auth-email').value.trim();
      const name = document.getElementById('auth-name').value.trim();
      const nin = document.getElementById('auth-nin').value.trim();
      const password = document.getElementById('auth-password').value;
      url = `${API_BASE}/api/signup`;
      body = { username, email, name, nin, password };
    } else {
      const usernameOrEmail = document.getElementById('auth-username').value.trim();
      const password = document.getElementById('auth-password').value;
      url = `${API_BASE}/api/login`;
      // If input looks like email, send as email
      if (/^[\w.-]+@[\w.-]+\.[A-Za-z]{2,}$/.test(usernameOrEmail)) {
        body = { email: usernameOrEmail, password };
      } else {
        body = { username: usernameOrEmail, password };
      }
    }
    
    // Disable button during request
    submitBtn.disabled = true;
    
  const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body)
    });
    const data = await res.json();
    console.log('%cLogin Response:', 'color: blue; font-weight: bold;', { status: res.status, data: data, type: type });
    if (data.success) {
      console.log('✅ Login successful:', { username: data.username, name: data.name });
      const userData = {
        username: data.username,
        name: data.name,
        email: data.email || '',
        phone: data.phone || '',
        state: data.state || '',
        lga: data.lga || '',
        address: data.address || '',
        profilePicture: data.profilePicture || null,
        avatar: data.avatar
      };
      console.log('%cCalling updateAuthUI with:', 'color: green; font-weight: bold;', userData);
      window.updateAuthUI(userData);
      console.log('%cwindow.currentUser after updateAuthUI:', 'color: green; font-weight: bold;', window.currentUser);
      window.userLoggedInTime = new Date().toISOString();
      // Mark that we just successfully logged in (prevents checkLoginStatus from downgrading within 5 seconds)
      window.__justLoggedIn = true;
      setTimeout(() => { window.__justLoggedIn = false; }, 5000);
      if (type === 'signup') {
        console.log('🎉 New user registered:', data.username);
      }
      // Do NOT call checkLoginStatus immediately after login - we already have confirmed user data.
      // The session is being set by the server. If needed, checkLoginStatus will run on next page load.
      modal.remove();
    } else {
      console.error('❌ Login failed:', data.error);
      let errorMessage = 'Error';
      if (res.status === 400 && data.error === 'password mismatch') {
        errorMessage = 'Incorrect password. Please try again.';
      } else if (res.status === 400) {
        errorMessage = 'Invalid login credentials. Please check your username or email and try again.';
      } else if (res.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      }
      document.getElementById('auth-error').textContent = errorMessage;
      // Re-enable button on error
      submitBtn.disabled = false;
    }
  };
}

// Function to check login status (called on page load and after login)
window.checkLoginStatus = async function() {
  // Don't restore from localStorage; always fetch fresh state from backend
  // (instant UI update handled by Navbar.render instead)

  // Then, verify with server for security and up-to-date info
  // BUT: Don't downgrade from logged-in to logged-out if we just successfully logged in.
  try {
    const res = await fetch(`${API_BASE}/api/me?t=${Date.now()}`, { 
      credentials: 'include'
    });
    const data = await res.json();
    if (data.loggedIn) {
      console.log('%c✅ User already logged in: %c' + data.username, 'color: #27ae60; font-weight: bold;', 'color: #2980b9;');
      window.updateAuthUI({
        username: data.username,
        name: data.name,
        email: data.email || '',
        phone: data.phone || '',
        state: data.state || '',
        lga: data.lga || '',
        address: data.address || '',
        profilePicture: data.profilePicture || null,
        avatar: data.avatar
      });
    } else {
      console.log('%cℹ️ User not logged in', 'color: #95a5a6;');
      // Avoid forcing a logout while the initial navbar/render pass is still
      // running. If the client already has a local `window.currentUser`, keep
      // that until the navbar/init logic completes. Only clear auth state if
      // there is no local user AND the initial navbar render has finished.
      if (!window.currentUser && window.__initialNavbarRendered) {
        window.updateAuthUI(null);
      } else {
        console.log('%c⏳ Skipping logout because navbar init not completed or local user exists', 'color: #f39c12;');
      }
    }
  } catch (err) {
    console.warn('%c⚠️ Could not verify login status (offline?): %c' + err.message, 'color: #e74c3c; font-weight: bold;', 'color: #c0392b;');
    console.log('%c💡 If offline, use: window.triggerOfflineLogin()', 'color: #f39c12; font-size: 11px;');
    // If offline and user not already logged in, logout — but only after
    // the initial navbar render has completed to avoid UI flashing.
    if (!window.currentUser && window.__initialNavbarRendered) window.updateAuthUI(null);
  }
};

// On load, check auth state
window.addEventListener('DOMContentLoaded', async () => {
  // Check for reset token/email in URL
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  const email = params.get('email');
  if (token && email) {
    window.showResetPasswordModal(token, email);
    // Optionally, clean up URL after showing modal
    // window.history.replaceState({}, document.title, window.location.pathname);
  }
  // Check auth state
  window.checkLoginStatus();
});

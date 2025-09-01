
// Frontend logic for login/signup/logout modals and API, plus password reset

// Determine API base depending on environment (dev -> localhost backend, prod -> same-origin)
const API_BASE = (function() {
  try {
    const host = window.location.hostname;
    // treat localhost/127.0.0.1 and typical LAN IPs as dev
    if (!host || host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.') || host.startsWith('10.') || host === '::1') return 'http://localhost:4000';
    // otherwise assume API is proxied or available at the same origin
    return '';
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

window.updateAuthUI = function(user) {
  // Keep a global reference to the current user for other components (navbar)
  window.currentUser = user || null;
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
    // If navbar exists, re-render to pick up username on PC views
    if (window.Navbar && typeof window.Navbar.render === 'function') {
      try { window.Navbar.render(); } catch(e) { /* ignore render errors */ }
    }
  } else {
    // User is logged out
    if (authButtons) authButtons.style.display = 'flex';
    if (userInfo) userInfo.style.display = 'none';
    if (window.Navbar && typeof window.Navbar.render === 'function') {
      try { window.Navbar.render(); } catch(e) { /* ignore render errors */ }
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
    if (response.ok) {
      window.updateAuthUI(null);
    } else {
      console.error('Logout failed:', await response.text());
    }
  } catch (error) {
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
    const email = document.getElementById('forgot-email').value.trim();
  const res = await fetch(`${API_BASE}/api/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email })
    });
    const data = await res.json();
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
    const pw1 = document.getElementById('reset-password').value;
    const pw2 = document.getElementById('reset-password2').value;
    if (pw1.length < 6) {
      document.getElementById('auth-error').textContent = 'Password must be at least 6 characters.';
      return;
    }
    if (pw1 !== pw2) {
      document.getElementById('auth-error').textContent = 'Passwords do not match.';
      return;
    }
  const res = await fetch(`${API_BASE}/api/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, token, password: pw1 })
    });
    const data = await res.json();
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
  const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (data.success) {
      window.updateAuthUI({ username: data.username, name: data.name });
      modal.remove();
    } else {
      document.getElementById('auth-error').textContent = data.error || 'Error';
    }
  };
}

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
  const res = await fetch(`${API_BASE}/api/me`, { credentials: 'include' });
  const data = await res.json();
  if (data.loggedIn) {
    window.updateAuthUI({ username: data.username, name: data.name });
  } else {
    window.updateAuthUI(null);
  }
});

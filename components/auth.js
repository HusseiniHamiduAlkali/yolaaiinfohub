
// Frontend logic for login/signup/logout modals and API, plus password reset

window.updateAuthUI = function(user) {
  const authButtons = document.getElementById('auth-buttons');
  const userInfo = document.getElementById('user-info');
  
  if (user && user.username) {
    // User is logged in
    if (authButtons) authButtons.style.display = 'none';
    if (userInfo) {
      userInfo.style.display = 'flex';
      userInfo.querySelector('.username').textContent = user.name || user.username;
      userInfo.querySelector('.avatar').src = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || user.username)}`;
    }
  } else {
    // User is logged out
    if (authButtons) authButtons.style.display = 'flex';
    if (userInfo) userInfo.style.display = 'none';
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
    const response = await fetch('http://localhost:4000/api/logout', {
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
    const res = await fetch('http://localhost:4000/api/forgot-password', {
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
    const res = await fetch('http://localhost:4000/api/reset-password', {
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
          <input type="password" id="auth-password" placeholder="Password" required autocomplete="new-password" />
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
          <input type="password" id="auth-password" placeholder="Password" required autocomplete="current-password" />
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
      url = 'http://localhost:4000/api/signup';
      body = { username, email, name, nin, password };
    } else {
      const usernameOrEmail = document.getElementById('auth-username').value.trim();
      const password = document.getElementById('auth-password').value;
      url = 'http://localhost:4000/api/login';
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
  const res = await fetch('http://localhost:4000/api/me', { credentials: 'include' });
  const data = await res.json();
  if (data.loggedIn) {
    window.updateAuthUI({ username: data.username, name: data.name });
  } else {
    window.updateAuthUI(null);
  }
});

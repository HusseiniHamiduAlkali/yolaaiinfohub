function renderNavbar() {
  const nav = document.createElement('nav');
  nav.className = 'navbar';
  nav.innerHTML = `
    <div class="navbar-left">
      <div class="navbar-logo-area">
        <div class="navbar-logo-placeholder"><img src=Data/Images/jippujam.jpg></div>
      </div>
      <span class="navbar-appname">Yola AI Info Hub</span>
    </div>
    <div class="navbar-right tablet-navbar-right">
      <div class="tablet-navbar-upper">
        <!-- Duplicate navbar-left for tablet/mobile -->
        <div class="navbar-left">
          <div class="navbar-logo-area">
            <div class="navbar-logo-placeholder"><img src=Data/Images/jippujam.jpg></div>
          </div>
          <span class="navbar-appname">Yola AI Info Hub</span>
        </div>
        <div class="navbar-auth" id="navbar-auth">
          <button id="signin-btn" class="auth-btn" type="button">Sign in</button>
          <button id="signup-btn" class="auth-btn" type="button">Sign up</button>
          <button id="logout-btn" class="auth-btn" style="display:none" onclick="window.logoutUser()">Logout</button>
          <span id="user-avatar" class="user-avatar" style="display:none"><img src="https://ui-avatars.com/api/?name=User" alt="User"/></span>
        </div>
      </div>
      <div class="tablet-navbar-lower">
        <ul class="navbar-links">
          <li><button onclick="window.loadSection('home')">Home</button></li>
          <li><button onclick="window.loadSection('eduinfo')">EduInfo</button></li>
          <li><button onclick="window.loadSection('ecoinfo')">EcoInfo</button></li>
          <li><button onclick="window.loadSection('agroinfo')">AgroInfo</button></li>
          <li><button onclick="window.loadSection('mediinfo')">MediInfo</button></li>
          <li><button onclick="window.loadSection('naviinfo')">NaviInfo</button></li>
          <li><button onclick="window.loadSection('communityinfo')">CommunityInfo</button></li>
          <li><button onclick="window.loadSection('serviinfo')">ServiInfo</button></li>
          <li><button onclick="window.loadSection('aboutinfo')">About</button></li>
        </ul>
      </div>
      <div class="hamburger" id="hamburger">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  `;
  // Wire up auth button events after DOM is in place
  setTimeout(() => {
    const signinBtn = document.getElementById('signin-btn');
    const signupBtn = document.getElementById('signup-btn');
    if (signinBtn) signinBtn.onclick = () => window.loadSection('signin');
    if (signupBtn) signupBtn.onclick = () => window.loadSection('signup');
  }, 0);
  document.getElementById('navbar').innerHTML = ''; // Clear existing content
  document.getElementById('navbar').appendChild(nav);

  // No longer need handleResponsiveNavbar since we're using CSS media queries

  const mobileMenu = document.createElement('div');
  mobileMenu.className = 'mobile-menu';
  mobileMenu.innerHTML = `
    <ul class="mobile-links">
      <li><button onclick="window.loadSection('home'); mobileMenu.classList.remove('show');">Home</button></li>
      <li><button onclick="window.loadSection('eduinfo'); mobileMenu.classList.remove('show');">EduInfo</button></li>
      <li><button onclick="window.loadSection('ecoinfo'); mobileMenu.classList.remove('show');">EcoInfo</button></li>
      <li><button onclick="window.loadSection('agroinfo'); mobileMenu.classList.remove('show');">AgroInfo</button></li>
      <li><button onclick="window.loadSection('mediinfo'); mobileMenu.classList.remove('show');">MediInfo</button></li>
      <li><button onclick="window.loadSection('naviinfo'); mobileMenu.classList.remove('show');">NaviInfo</button></li>
      <li><button onclick="window.loadSection('communityinfo'); mobileMenu.classList.remove('show');">CommunityInfo</button></li>
      <li><button onclick="window.loadSection('serviinfo'); mobileMenu.classList.remove('show');">ServiInfo</button></li>
      <li><button onclick="window.loadSection('aboutinfo'); mobileMenu.classList.remove('show');">About</button></li>
    </ul>
  `;
  document.getElementById('navbar').appendChild(mobileMenu);

  const hamburger = document.getElementById('hamburger');
  const closeBtn = document.createElement('button');
  closeBtn.className = 'mobile-menu-close';
  closeBtn.innerHTML = '&times;';
  closeBtn.onclick = (e) => {
    e.stopPropagation();
    mobileMenu.classList.remove('show');
  };
  mobileMenu.insertBefore(closeBtn, mobileMenu.firstChild);

  hamburger.onclick = (e) => {
    e.stopPropagation();
    mobileMenu.classList.toggle('show');
    hamburger.classList.toggle('active');
  };

  // Close mobile menu when a section is loaded
  window.loadSection = (function() {
    const originalLoadSection = window.loadSection;
    return function(section) {
      if (mobileMenu.classList.contains('show')) {
        mobileMenu.classList.remove('show');
        hamburger.classList.remove('active');
      }
      return originalLoadSection(section);
    };
  })();
  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (mobileMenu.classList.contains('show') && !mobileMenu.contains(e.target) && e.target !== hamburger) {
      mobileMenu.classList.remove('show');
      hamburger.classList.remove('active');
    }
  });
  // Highlight active section
  window.highlightActiveNav = function(section) {
    document.querySelectorAll('.navbar-links button, .mobile-menu button').forEach(btn => {
      btn.classList.remove('active');
      // Match by section key (e.g. 'eduinfo', 'agroinfo', etc.)
      const btnSection = btn.textContent.trim().toLowerCase() + (btn.textContent.trim().toLowerCase().endsWith('info') ? '' : 'info');
      if (
        (section === 'aboutinfo' && btn.textContent.trim() === 'About') ||
        btnSection === section ||
        (section === 'home' && btn.textContent.trim() === 'Home')
      ) {
        btn.classList.add('active');
      }
    });
  };
}

// Export as Navbar global for compatibility with index.html
window.Navbar = {
  render: renderNavbar
};

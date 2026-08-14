// A global variable to store the original PC layout HTML for reliable reversion.
// Use a window-scoped sentinel to avoid redeclaration if the script is loaded twice.
window.__originalPCLayout = window.__originalPCLayout || null;

// Helper: derive the active section from the current browser URL.
// This avoids any reliance on persistent storage so the navbar always
// reflects the live address bar.
function getSectionFromUrl() {
  // First use history state if available, then fall back to the URL path.
  if (window.history && window.history.state && typeof window.history.state.section === 'string') {
    return window.history.state.section.toLowerCase();
  }
  let path = window.location.pathname.replace(/^\/+/, '').toLowerCase();
  if (!path || path === '' || path === 'index.html') return 'home';
  path = path.split('/').pop().split('?')[0].split('#')[0];
  const valid = ['home','eduinfo','dealzinfo','weatherinfo','naviinfo','','serviinfo','communityinfo','settings'];
  return valid.includes(path) ? path : 'home';
}

// Update only the navbar-auth section after backend check completes
function updateNavbarAuthSection() {
  const navbarAuth = document.getElementById('navbar-auth');
  if (!navbarAuth) return;

  let authButtonsHTML;
  if (window.currentUser && window.currentUser.username) {
    console.log('%c✅ updateNavbarAuthSection: Updating for logged-in user', 'color: #10b981;', window.currentUser.username);
    authButtonsHTML = `
      <a href="/pages/profile.html?u=${encodeURIComponent(window.currentUser.username)}" class="navbar-profile-link">
        <span class="navbar-avatar">
          ${window.currentUser.avatar ? `<img src="${window.currentUser.avatar}" alt="avatar"/>` : ''}
        </span>
        <span class="navbar-names">
          <span class="navbar-fullname">${window.currentUser.name || window.currentUser.username}</span>
          <span class="navbar-username-text">@${window.currentUser.username}</span>
        </span>
      </a>
    `;
    navbarAuth.style.display = 'flex';
    navbarAuth.style.alignItems = 'center';
    navbarAuth.style.gap = '0.7rem';
  } else {
    console.log('%c❌ updateNavbarAuthSection: Updating for logged-out user', 'color: #ef4444;');
    authButtonsHTML = `
  <!--<span data-i18n="login_suggestion" class="login-suggestion" style="align-content: center; margin-right: 30px;">Please login for a more personalised experience!</span>-->
      <button id="signin-btn" class="auth-btn" type="button" data-i18n="sign_in">Sign in</button>
      <button id="signup-btn" class="auth-btn" type="button" data-i18n="sign_up">Sign up</button>
    `;
    navbarAuth.style.display = '';
    navbarAuth.style.alignItems = '';
    navbarAuth.style.gap = '';
  }

  navbarAuth.innerHTML = authButtonsHTML;

  // Wire up auth button events if they exist
  const signinBtn = navbarAuth.querySelector('#signin-btn');
  const signupBtn = navbarAuth.querySelector('#signup-btn');
  if (signinBtn) signinBtn.onclick = () => window.location.href = '/pages/auth.html';
  if (signupBtn) signupBtn.onclick = () => window.location.href = '/pages/auth.html';

  // Apply translations
  if (window.applyTranslations) {
    window.applyTranslations(navbarAuth);
  }

  // Update navbar logged-in class
  const navbarEl = document.querySelector('nav.navbar');
  if (navbarEl) {
    navbarEl.classList.toggle('logged-in', !!(window.currentUser && window.currentUser.username));
  }
}

async function fetchWithTimeout(resource, options = {}, timeout = 3000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  const response = await fetch(resource, { ...options, signal: controller.signal });
  clearTimeout(id);
  return response;
}

// Highlight active section helper (invoked after navigation)
window.highlightActiveNav = function(section) {
  // If no section provided, infer from a saved state, history state, or URL.
  if (!section || section === '' || section === 'index.html') {
    section = window.currentSection || window.history.state?.section || getSectionFromUrl();
  }
  if (typeof section === 'string') {
    section = section.toLowerCase();
  }

  // keep current section in memory only
  window.currentSection = section;

  // Helper to match and highlight buttons
  const highlightButton = (btn) => {
    btn.classList.remove('active');
    // Support `data-i18n` on the button or on an inner span (so SVGs are preserved)
    const i18nKey = btn.getAttribute('data-i18n') || btn.querySelector('[data-i18n]')?.getAttribute('data-i18n');
    let btnSection = '';
    if (i18nKey === 'home') btnSection = 'home';
    //else if (i18nKey === 'eduinfo') btnSection = 'eduinfo';
    else if (i18nKey === 'ecoinfo') btnSection = 'ecoinfo';
    else if (i18nKey === 'dealzinfo') btnSection = 'dealzinfo';
    else if (i18nKey === 'weatherinfo') btnSection = 'weatherinfo';
    else if (i18nKey === 'naviinfo') btnSection = 'naviinfo';
    else if (i18nKey === 'communityinfo') btnSection = 'communityinfo';
    else if (i18nKey === 'serviinfo') btnSection = 'serviinfo';
    else if (i18nKey === 'settings') btnSection = 'settings';
    if (btnSection === section) {
      btn.classList.add('active');
    }
  };

  document.querySelectorAll('.navbar-links button, .mobile-links button').forEach(highlightButton);
};

function renderNavbar(isLoading = false) {
  console.log('%c🎨 renderNavbar() called, isLoading:', 'color: #9333ea; font-weight: bold;', isLoading, 'window.currentUser:', window.currentUser);
  
  // Remove existing navbar to prevent duplicates
  const existingNavbar = document.querySelector('nav.navbar');
  if (existingNavbar) {
    existingNavbar.remove();
  }

  const nav = document.createElement('nav');
  nav.className = 'navbar';

  // Create the auth buttons container based on state
  let authButtonsHTML;
  
  if (isLoading) {
    // Keep the auth area hidden while the app verifies the user's signed-in state.
    // Do not render a spinner or placeholder during the check.
    console.log('%c⏳ renderNavbar: Auth check in progress, keeping auth area hidden', 'color: #f59e0b;');
    authButtonsHTML = `
      <div class="navbar-auth" id="navbar-auth" aria-hidden="true" style="display:none !important; visibility:hidden; pointer-events:none;">
      </div>
    `;
  } else if (window.currentUser && window.currentUser.username) {
    console.log('%c✅ renderNavbar: User IS logged in, rendering logged-in navbar', 'color: #10b981;', window.currentUser.username);
    authButtonsHTML = `
      <div class="navbar-auth" id="navbar-auth" style="display:flex;align-items:center;gap:0.7rem;">
        <a href="/pages/profile.html?u=${encodeURIComponent(window.currentUser.username)}" class="navbar-profile-link">
          <span class="navbar-avatar">
            ${window.currentUser.avatar ? `<img src="${window.currentUser.avatar}" alt="avatar"/>` : ''}
          </span>
          <span class="navbar-names">
            <span class="navbar-fullname">${window.currentUser.name || window.currentUser.username}</span>
            <span class="navbar-username-text">@${window.currentUser.username}</span>
          </span>
        </a>
      </div>
    `;
  } else {
    console.log('%c❌ renderNavbar: User NOT logged in, rendering login buttons', 'color: #ef4444;');
    authButtonsHTML = `
      <div class="navbar-auth" id="navbar-auth">
    <!--<span data-i18n="login_suggestion" class="login-suggestion" style="align-content: center; margin-right: 30px;">Please login for a more personalised experience!</span>-->
        <button id="signin-btn" class="auth-btn" type="button" data-i18n="sign_in">Sign in</button>
        <button id="signup-btn" class="auth-btn" type="button" data-i18n="sign_up">Sign up</button>
      </div>
    `;
  }

  const logoHTML = `
    <div class="navbar-logo-area">
      <div class="navbar-logo-placeholder">
        <img src="Data/Images/jippujam.jpg" 
             onerror="this.src='Data/Images/default-logo.jpg';" 
             style="overflow: hidden; object-fit: fill; width: 100%; height: 100%; border-radius: 12px;">
      </div>
    </div>
    <!--<span class="navbar-appname">Yola AI Info Hub</span>-->
    <span class="navbar-appname"><img src="Data/images/app-name-small.png" style="width:100%; height:100%;" ></img></span>
  `;

  // mark navbar element when user is logged in so we can target it with CSS
  const isLoggedIn = window.currentUser && window.currentUser.username;
  nav.classList.toggle('logged-in', !!isLoggedIn);

  nav.innerHTML = `
    <div class="navbar-container">
      <div class="navbar-left">
        ${logoHTML}
      </div>
      <div class="hamburger" id="hamburger">
        <span class="hamburger-line"></span>
        <span class="hamburger-line"></span>
        <span class="hamburger-line"></span>
      </div>
      <div class="navbar-right">
        <div class="navbar-user-section">
          <div class="navbar-username-container" id="navbar-username-container">
            ${authButtonsHTML}
          </div>
        </div>
        <div class="navbar-links-container">
          <ul class="navbar-links">
            <li><button onclick="window.loadSection('home')"><span data-i18n="home">Home</span></button></li>
            <!--<li><button onclick="window.loadSection('eduinfo')"><span data-i18n="eduinfo">EduInfo</span></button></li>-->
            <li><button onclick="window.loadSection('naviinfo')">  
              <svg viewBox="0 0 24 24" width="18" height="20" style="align-self:normal;" fill="currentColor">
                <path d="M3.4 20.4 11.7 3.6a1.6 1.6 0 0 1 2.8 0l8.3 16.8a1.6 1.6 0 0 1-2.1 2.1L13 18.2l-7.7 4.3a1.6 1.6 0 0 1-1.9-2.1Z" transform="rotate(45 12 12)"/>
              </svg>
              <span data-i18n="naviinfo">NaviInfo</span></button></li>
            <li><button onclick="window.loadSection('communityinfo')">
              <!-- =========================================================
                  1. THREE PEOPLE
                  Simple and very clear community icon
                  ========================================================= -->
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none">
                <circle cx="12" cy="7" r="3" fill="currentColor"/>
                <circle cx="5.5" cy="9" r="2.5" fill="currentColor" opacity=".75"/>
                <circle cx="18.5" cy="9" r="2.5" fill="currentColor" opacity=".75"/>
                <path d="M7 20c.3-3.7 2-5.8 5-5.8s4.7 2.1 5 5.8" fill="currentColor"/>
                <path d="M2.5 18c.2-2.5 1.2-3.8 3-3.8 1.3 0 2.2.7 2.7 2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
                <path d="M21.5 18c-.2-2.5-1.2-3.8-3-3.8 -1.3 0-2.2.7-2.7 2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
              </svg>
              <span data-i18n="communityinfo">CommunityInfo</span></button></li>
            <li><button onclick="window.loadSection('ecoinfo')">                
              <!-- =========================================================
                1. ECO / LEAF
                Simple and excellent for an "Eco Info" button
                ========================================================= -->
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none">
                <path d="M20.5 3.5C12 3.8 6.2 6.4 5 12.2c-.8 3.8 1.8 7.3 5.5 7.3 6.2 0 9.2-7.1 10-16Z" fill="currentColor"/>
                <path d="M4 21c2.5-5.5 7-8.5 13-11" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
              </svg>
            <span data-i18n="ecoinfo">EcoInfo</span></button></li>
            <li><button onclick="window.loadSection('serviinfo')">
                <!-- =========================================================
                    11. TOOLBOX
                    Professional / technician services
                    ========================================================= -->
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none">
                  <rect x="3" y="8" width="18" height="11" rx="2" fill="currentColor"/>
                  <path d="M8 8V5.5a1.5 1.5 0 0 1 1.5-1.5h5A1.5 1.5 0 0 1 16 5.5V8" stroke="currentColor" stroke-width="1.8"/>
                  <path d="M3 12h18M10 12v2h4v-2" stroke="#298d29" stroke-width="1.3" fill="#fff"/>
                </svg>
                <span data-i18n="serviinfo">ServiInfo</span></button></li>
            <li><button onclick="window.loadSection('weatherinfo')">                
              <!-- =========================================================
                  12. WEATHER / SUN + CLOUD
                  GOOD GENERAL WEATHER BUTTON
                  ========================================================= -->
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none">
                <!-- Sun -->
                <circle cx="9" cy="8" r="3.2" fill="currentColor"/>
                <path d="M9 2v1.5M9 12.5V14M3 8h1.5M12.5 8H14 M4.8 3.8l1 1M11.2 11.2l1 1" stroke="currentColor" stroke-width="1.3"stroke-linecap="round"/>
                <!-- Cloud -->
                <path d="M7 19h10a4.2 4.2 0 0 0 .5-8.37 A5.7 5.7 0 0 0 7 11.2 A3.9 3.9 0 0 0 7 19Z" fill="currentColor"/>
              </svg>
              <span data-i18n="weatherinfo">WeatherInfo</span></button></li>
            <li><button onclick="window.loadSection('dealzinfo')">  
              <!-- =========================================================
                  7. PRICE CHART — UPWARD
                  Excellent for market prices
                  ========================================================= -->
              <svg viewBox="0 0 24 24" width="20" height="24" fill="none">
                <path d="M4 19V5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
                <path d="M4 19h16" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
                <path d="m6 15 4-4 3 2 6-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="m16 6 3-1v3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span data-i18n="dealzinfo">DealzInfo</span></button></li>
            <li>
              <button onclick="window.loadSection('settings')" aria-label="Settings">
                <span class="nav-icon" aria-hidden="true" style="width: 100%; height: 100%;">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none">
                    <path d="M9.7 3h4.6l.6 2.1c.5.2 1 .5 1.4.8l2-.7 2.3 4-1.7 1.4v1.8l1.7 1.4-2.3 4-2-.7c-.4.3-.9.6-1.4.8L14.3 21H9.7l-.6-2.1c-.5-.2-1-.5-1.4-.8l-2 .7-2.3-4 1.7-1.4v-1.8L3.4 10l2.3-4 2 .7c.4-.3.9-.6 1.4-.8L9.7 3Z" fill="currentColor"/>
                    <circle cx="12" cy="12" r="3.2" fill="#298d29"/>
                  </svg>
                </span>
                <span class="sr-only" data-i18n="settings" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(1px,1px,1px,1px);white-space:nowrap;border:0;padding:0;margin:-1px;">Settings</span>
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  `;

  // Append the navbar to the DOM
  document.body.prepend(nav);

  // Highlight active nav after appending
  window.highlightActiveNav(window.currentSection || window.history.state?.section || getSectionFromUrl());

  // Wire up auth button events after DOM is in place
  setTimeout(() => {
    const signinBtn = document.getElementById('signin-btn');
    const signupBtn = document.getElementById('signup-btn');
    if (signinBtn) signinBtn.onclick = () => window.location.href = '/pages/auth.html';
    if (signupBtn) signupBtn.onclick = () => window.location.href = '/pages/signup.html';
  }, 0);

  // Apply translations to navbar
  if (window.applyTranslations) {
    window.applyTranslations(nav);
  }

  // Store the original PC layout HTML (store on window to avoid redeclaration issues)
  window.__originalPCLayout = nav.innerHTML;

  // Prepare a place to temporarily hold the profile link element when moving to mobile
  window.__navbarProfileNode = window.__navbarProfileNode || null;
  // Call handleResponsiveLayout
  handleResponsiveLayout();

  // Main function to handle all responsive layouts
  function handleResponsiveLayout() {
    if (!window.__originalPCLayout) {
      console.log('handleResponsiveLayout: originalPCLayout not set yet, skipping.');
      return;
    }
    const windowWidth = window.innerWidth;
    const navbarContainer = document.querySelector('.navbar-container');
    
    // Restore to original PC layout before making any changes
    // This is the layout at the time renderNavbar() was called (with current login state)
    const navbarEl = document.querySelector('.navbar');
    if (window.__originalPCLayout && navbarEl) {
      navbarEl.innerHTML = window.__originalPCLayout;
    } else if (!navbarEl) {
      console.warn('handleResponsiveLayout: .navbar element not found, skipping layout update.');
      return;
    }

    // Re-select elements after innerHTML change
    const newNavbarContainer = document.querySelector('.navbar-container');
    const newNavbarLeft = document.querySelector('.navbar-left');
    const newNavbarRight = document.querySelector('.navbar-right');
    const newNavbarAuth = document.querySelector('.navbar-auth');
    const newNavbarLinks = document.querySelector('.navbar-links');
    const newHamburger = document.getElementById('hamburger');
    
    if (!newNavbarLeft || !newNavbarRight || !newNavbarLinks || !newHamburger) {
      console.warn('handleResponsiveLayout: Some navbar elements not found, skipping.');
      return;
    }
    
    // Apply common styles using JS
    newNavbarContainer.style.display = '';
    newNavbarContainer.style.alignItems = '';
    newNavbarContainer.style.padding = '';
    
    newNavbarLeft.style.display = 'flex';
    newNavbarLeft.style.alignItems = 'center';
    
    newNavbarRight.style.display = 'flex';
    newNavbarRight.style.alignItems = 'flex-end';
    newNavbarLinks.style.display = 'flex';

    // Logic for different screen sizes
    if (windowWidth > 1024) {
      // PC View
      newNavbarContainer.style.justifyContent = '';
      newHamburger.style.display = 'none';
      newNavbarRight.style.display = 'flex';
      // If user is signed in, show only username and logout button
      if (window.currentUser && window.currentUser.username) {
        const navbarAuth = document.getElementById('navbar-auth');
        if (navbarAuth) {
          navbarAuth.style.display = 'flex';
          navbarAuth.style.alignItems = 'center';
        }
      }
      // Note: Skip moving elements around - the HTML structure is already correct
      // Just ensure proper display settings for large screens
      const usernameContainer = document.querySelector('.navbar-username-container');
      const navbarAuthEl = document.getElementById('navbar-auth');
      if (usernameContainer) {
        usernameContainer.style.display = window.currentUser && window.currentUser.username ? 'flex' : 'none';
      }
      if (navbarAuthEl) {
        navbarAuthEl.style.display = 'flex';
        navbarAuthEl.style.alignItems = 'center';
      }

      // If we have a stored profile node (from mobile), ensure it's restored into the auth area
      try {
        if (window.__navbarProfileNode) {
          const authArea = document.querySelector('.navbar-auth');
          if (authArea && !authArea.querySelector('.navbar-profile-link')) {
            const node = window.__navbarProfileNode.cloneNode(true);
            authArea.insertAdjacentElement('afterbegin', node);
            // Clear stored node after restoring
            window.__navbarProfileNode = null;
          }
        }
      } catch (e) { console.warn('Could not restore profile link to desktop navbar:', e); }

    } else if (windowWidth >= 701 && windowWidth <= 1024) {
      // Tablet View
      newNavbarContainer.style.flexDirection = 'column';
      newNavbarContainer.style.justifyContent = 'flex-start';
      newNavbarContainer.style.alignItems = 'flex-start';
      const topRow = document.createElement('div');
      topRow.style.display = 'flex';
      topRow.style.justifyContent = 'space-between';
      topRow.style.width = '100%';
      topRow.style.marginBottom = '0.5rem';
      // Move logo and app name to the top row
      topRow.appendChild(newNavbarLeft);
      // Include username container if user is logged in
      const topSection = document.querySelector('.navbar-top-section');
      if (topSection) {
        topSection.style.display = 'flex';
        topSection.style.alignItems = 'center';
        topSection.style.gap = '0.7rem';
        topRow.appendChild(topSection);
      }
      // Move auth buttons to the top row
      topRow.appendChild(newNavbarAuth);
      // The newNavbarLinks element is now the bottom row
      newNavbarLinks.style.width = '';
      newNavbarLinks.style.justifyContent = '';
      // Rebuild the container with the two rows
      newNavbarContainer.innerHTML = '';
      newNavbarContainer.appendChild(topRow);
      newNavbarContainer.appendChild(newNavbarLinks);
      newHamburger.style.display = 'none';
      // Ensure username container is visible if user is logged in
      if (window.currentUser && window.currentUser.username) {
        const usernameContainer = document.getElementById('navbar-username-container');
        if (usernameContainer) usernameContainer.style.display = 'flex';
        const navbarAuth = document.getElementById('navbar-auth');
        if (navbarAuth) navbarAuth.style.display = 'flex';
      }
      
    } else {
      // Mobile View
      newNavbarContainer.style.justifyContent = '';
      newNavbarContainer.style.flexDirection = ''; // Ensure row layout
      newNavbarContainer.style.alignItems = '';

      newNavbarLeft.style.display = 'flex';
      newNavbarLeft.style.alignItems = 'center';

      newNavbarRight.style.display = 'flex';
      newNavbarRight.style.flexDirection = 'column';
      newNavbarRight.style.alignItems = 'flex-end';
      //newNavbarRight.style.marginRight = '10px';

      newNavbarLinks.style.display = 'none'; // Hide navbar links

      // Adjust auth buttons
      newNavbarAuth.style.display = '';
      newNavbarAuth.style.flexDirection = '';
      newNavbarAuth.style.alignItems = '';
      newNavbarAuth.style.marginRight = '';

      // Place hamburger spans below auth buttons
      newHamburger.style.display = '';
      newHamburger.style.flexDirection = ''; // Ensure spans are stacked vertically
      newHamburger.style.alignItems = '';
      newHamburger.style.marginTop = '';
      newHamburger.style.marginLeft = '';

      // Style the hamburger lines
      /*
      const lines = newHamburger.querySelectorAll('.hamburger-line');
      lines.forEach(line => {
          line.style.display = 'block';
          line.style.height = '3px';
          line.style.width = '30px';
          line.style.background = '#fff';
          line.style.borderRadius = '5px';
          line.style.margin = '0';
      });
      */

      // Move profile link into a temporary holder so we can reinsert into mobile menu
      try {
        const profileLink = document.querySelector('.navbar-profile-link');
        if (profileLink && !window.__navbarProfileNode) {
          // Detach and store the node for mobile menu use
          window.__navbarProfileNode = profileLink.cloneNode(true);
          profileLink.remove();
        }
        // Ensure no other profile links remain in the navbar (prevent duplicates)
        document.querySelectorAll('.navbar-profile-link').forEach(n => n.remove());
      } catch (e) {
        console.warn('Could not move profile link for mobile:', e);
      }

      // Clear and rebuild the navbar container
      newNavbarContainer.innerHTML = '';
      newNavbarContainer.appendChild(newNavbarLeft); // Add logo and app name
      const rightContainer = document.createElement('div');
      rightContainer.style.display = 'flex';
      rightContainer.style.flexDirection = 'column';
      rightContainer.style.alignItems = 'flex-end';
      rightContainer.style.marginRight = '10px';
      rightContainer.style.gap = '0.45rem';
      // On mobile we hide the inline auth area (it will appear inside the mobile menu)
      if (newNavbarAuth) {
        try {
          newNavbarAuth.style.display = 'none';
        } catch (e) { /* ignore */ }
      }
      if (!(window.currentUser && window.currentUser.username)) {
        const mobileSignInBtn = document.createElement('button');
        mobileSignInBtn.className = 'auth-btn mobile-signin-btn';
        mobileSignInBtn.type = 'button';
        mobileSignInBtn.textContent = 'Sign in';
        mobileSignInBtn.onclick = () => window.location.href = '/pages/auth.html';
        rightContainer.appendChild(mobileSignInBtn);
      }
      // Only add the hamburger here; profile/auth will be rendered inside the mobile menu
      rightContainer.appendChild(newHamburger); // Add hamburger spans
      newNavbarContainer.appendChild(rightContainer);
    }

    // Add event listener for the hamburger menu toggle (mobile)
    newHamburger.onclick = (e) => {
      e.stopPropagation();
      let mobileMenu = document.querySelector('.mobile-menu');
      if (!mobileMenu) {
        // Create mobile menu overlay
        mobileMenu = document.createElement('div');
        mobileMenu.className = 'mobile-menu';
        
        // Add click outside handler
        const closeOnClickOutside = (event) => {
          if (mobileMenu && !mobileMenu.contains(event.target) && !newHamburger.contains(event.target)) {
            mobileMenu.classList.remove('show');
            setTimeout(() => {
              mobileMenu.remove();
              document.removeEventListener('click', closeOnClickOutside);
            }, 300);
          }
        };
        document.addEventListener('click', closeOnClickOutside);
        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.className = 'mobile-menu-close';
        closeBtn.innerHTML = '&times;';
        closeBtn.onclick = () => {
          mobileMenu.classList.remove('show');
          setTimeout(() => mobileMenu.remove(), 300);
        };
        mobileMenu.appendChild(closeBtn);
        
        // Add username/profile container to mobile menu when screen is small (<=700px)
        if (window.currentUser && window.currentUser.username) {
          // Prefer the detached profile node if it exists (moved earlier for mobile)
          if (window.__navbarProfileNode) {
            const profileWrapper = document.createElement('div');
            //profileWrapper.style.padding = '0.6rem 1rem';
            profileWrapper.style.padding = '0';
            profileWrapper.style.borderBottom = '1px solid #444';
            const node = window.__navbarProfileNode.cloneNode(true);
            // Ensure classes/styles are appropriate for mobile
            const avatarSpan = node.querySelector('.navbar-avatar');
            if (avatarSpan) {
              avatarSpan.style.cssText = `display:inline-flex;width:45px;height:45px;border-radius:50%;overflow:hidden;background:#fff;align-items:center;justify-content:center;flex-shrink:0;border:2px solid #cbd5e1;`;
              const avatarImg = avatarSpan.querySelector('img');
              if (avatarImg) avatarImg.style.cssText = 'width:100%;height:100%;object-fit:cover;';
            }
            const namesSpan = node.querySelector('.navbar-names');
            if (namesSpan) {
              namesSpan.style.cssText = 'display:flex;flex-direction:column;align-items:flex-start;gap:0.2rem;flex:1;';
              const fullnameSpan = namesSpan.querySelector('.navbar-fullname');
              if (fullnameSpan) fullnameSpan.style.cssText = 'font-weight:600;color:#e6eef9;font-size:0.95rem;line-height:1.2;';
              const usernameSpan = namesSpan.querySelector('.navbar-username-text');
              if (usernameSpan) usernameSpan.style.cssText = 'font-weight:700;color:#cbd5e1;font-size:0.95rem;letter-spacing:-0.5px;';
            }
            profileWrapper.appendChild(node);
            mobileMenu.appendChild(profileWrapper);
          } else {
            // Fallback: clone username container if detached node isn't available
            const existingUsernameContainer = document.getElementById('navbar-username-container');
            if (existingUsernameContainer) {
              const userMenuSection = existingUsernameContainer.cloneNode(true);
  
  
  
              userMenuSection.querySelectorAll('.navbar-profile-link').forEach(n => n.remove());
              userMenuSection.style.cssText = 'display:flex;flex-direction:row;align-items:center;padding:1rem;gap:0.7rem;background:#1a202c;margin-bottom:1rem;';
              mobileMenu.appendChild(userMenuSection);
            }
          }
        }
        
        // Note: profile node already appended above when available; avoid duplicate insertion here.
        // Menu links
        const linksList = document.createElement('ul');
        linksList.className = 'mobile-links';

        const mobileMenuIcons = {
          home: '',
          naviinfo: `
            <svg class="nav-icon" viewBox="0 0 24 24" width="18" height="20" fill="currentColor" aria-hidden="true">
              <path d="M3.4 20.4 11.7 3.6a1.6 1.6 0 0 1 2.8 0l8.3 16.8a1.6 1.6 0 0 1-2.1 2.1L13 18.2l-7.7 4.3a1.6 1.6 0 0 1-1.9-2.1Z" transform="rotate(45 12 12)"/>
            </svg>
          `,
          communityinfo: `
            <svg class="nav-icon" viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true">
              <circle cx="12" cy="7" r="3" fill="currentColor"/>
              <circle cx="5.5" cy="9" r="2.5" fill="currentColor" opacity=".75"/>
              <circle cx="18.5" cy="9" r="2.5" fill="currentColor" opacity=".75"/>
              <path d="M7 20c.3-3.7 2-5.8 5-5.8s4.7 2.1 5 5.8" fill="currentColor"/>
              <path d="M2.5 18c.2-2.5 1.2-3.8 3-3.8 1.3 0 2.2.7 2.7 2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
              <path d="M21.5 18c-.2-2.5-1.2-3.8-3-3.8 -1.3 0-2.2.7-2.7 2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
            </svg>
          `,
          ecoinfo: `
            <svg class="nav-icon" viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true">
              <path d="M20.5 3.5C12 3.8 6.2 6.4 5 12.2c-.8 3.8 1.8 7.3 5.5 7.3 6.2 0 9.2-7.1 10-16Z" fill="currentColor"/>
              <path d="M4 21c2.5-5.5 7-8.5 13-11" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
            </svg>
          `,
          serviinfo: `
            <svg class="nav-icon" viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true">
              <rect x="3" y="8" width="18" height="11" rx="2" fill="currentColor"/>
              <path d="M8 8V5.5a1.5 1.5 0 0 1 1.5-1.5h5A1.5 1.5 0 0 1 16 5.5V8" stroke="currentColor" stroke-width="1.8"/>
              <path d="M3 12h18M10 12v2h4v-2" stroke="#298d29" stroke-width="1.3" fill="#fff"/>
            </svg>
          `,
          weatherinfo: `
            <svg class="nav-icon" viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true">
              <circle cx="9" cy="8" r="3.2" fill="currentColor"/>
              <path d="M9 2v1.5M9 12.5V14M3 8h1.5M12.5 8H14 M4.8 3.8l1 1M11.2 11.2l1 1" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
              <path d="M7 19h10a4.2 4.2 0 0 0 .5-8.37 A5.7 5.7 0 0 0 7 11.2 A3.9 3.9 0 0 0 7 19Z" fill="currentColor"/>
            </svg>
          `,
          dealzinfo: `
            <svg class="nav-icon" viewBox="0 0 24 24" width="20" height="24" fill="none" aria-hidden="true">
              <path d="M4 19V5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
              <path d="M4 19h16" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
              <path d="m6 15 4-4 3 2 6-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="m16 6 3-1v3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          `,
          settings: `
            <svg class="nav-icon" viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true">
              <path d="M9.7 3h4.6l.6 2.1c.5.2 1 .5 1.4.8l2-.7 2.3 4-1.7 1.4v1.8l1.7 1.4-2.3 4-2-.7c-.4.3-.9.6-1.4.8L14.3 21H9.7l-.6-2.1c-.5-.2-1-.5-1.4-.8l-2 .7-2.3-4 1.7-1.4v-1.8L3.4 10l2.3-4 2 .7c.4-.3.9-.6 1.4-.8L9.7 3Z" fill="currentColor"/>
              <circle cx="12" cy="12" r="3.2" fill="#298d29"/>
            </svg>
          `
        };

        [
          { name: 'Home', section: 'home', i18n: 'home' },
          { name: 'NaviInfo', section: 'naviinfo', i18n: 'naviinfo' },
          { name: 'CommunityInfo', section: 'communityinfo', i18n: 'communityinfo' },
          { name: 'EcoInfo', section: 'ecoinfo', i18n: 'ecoinfo' },
          { name: 'ServiInfo', section: 'serviinfo', i18n: 'serviinfo' },
          { name: 'WeatherInfo', section: 'weatherinfo', i18n: 'weatherinfo' },
          { name: 'DealzInfo', section: 'dealzinfo', i18n: 'dealzinfo' },
          { name: 'Settings', section: 'settings', i18n: 'settings' }
        ].forEach(link => {
          const li = document.createElement('li');
          const btn = document.createElement('button');
          btn.type = 'button';

          const iconMarkup = mobileMenuIcons[link.section] || '';
          if (iconMarkup) {
            const iconContainer = document.createElement('span');
            iconContainer.className = 'nav-icon-wrap';
            iconContainer.innerHTML = iconMarkup;
            btn.appendChild(iconContainer);
          }

          const textSpan = document.createElement('span');
          textSpan.setAttribute('data-i18n', link.i18n);
          textSpan.textContent = link.name;
          btn.appendChild(textSpan);

          btn.onclick = () => {
            window.highlightActiveNav(link.section);
            window.loadSection(link.section);
            mobileMenu.classList.remove('show');
            setTimeout(() => mobileMenu.remove(), 300);
          };
          li.appendChild(btn);
          linksList.appendChild(li);
        });
        
        // Append links list directly (settings already included above)
        mobileMenu.appendChild(linksList);
        
        document.body.appendChild(mobileMenu);
        window.highlightActiveNav(window.currentSection || window.history.state?.section || getSectionFromUrl());
        setTimeout(() => mobileMenu.classList.add('show'), 10);
      } else {
        window.highlightActiveNav(window.currentSection || window.history.state?.section || getSectionFromUrl());
        mobileMenu.classList.add('show');
      }
    };
    
  }

  // Initial call to set the layout on page load
  handleResponsiveLayout();

  // Listen for window resize events
  window.addEventListener('resize', handleResponsiveLayout);
}

function getStoredNavbarUser() {
  try {
    const storedUser = localStorage.getItem('currentUser');
    if (!storedUser) return null;
    const parsed = JSON.parse(storedUser);
    return parsed && parsed.username ? parsed : null;
  } catch (e) {
    return null;
  }
}

// Export as Navbar global for compatibility
window.Navbar = {
  render: async (force = false) => {
    console.log('%c🎬 window.Navbar.render() called', 'color: #06b6d4; font-weight: bold;', { force });

    let initialUser = window.currentUser || window.__lastUser || getStoredNavbarUser();
    if (initialUser && initialUser.username) {
      window.currentUser = initialUser;
      window.__lastUser = initialUser;
      window.__navbarAuthResolved = true;
    }
    
    const existingNavbar = document.querySelector('nav.navbar');
    const knownUser = !!(window.currentUser && window.currentUser.username) || !!(window.__lastUser && window.__lastUser.username) || !!getStoredNavbarUser();

    if (existingNavbar && !force) {
      console.log('%c⏭️ Navbar.render(): Navbar already in DOM - updating auth section in place', 'color: #94a3b8;');
      if (knownUser || window.__navbarAuthResolved) {
        updateNavbarAuthSection();
      } else {
        window.Navbar._fetchAndUpdateAuth();
      }
      return;
    }
    
    // Render navbar immediately with loading state (NO WAIT)
    console.log('%c🚀 Navbar.render(): Rendering navbar immediately with loading state', 'color: #10b981; font-weight: bold;');
    renderNavbar(true); // true = isLoading
    
    // Verify navbar was actually added to DOM
    if (document.querySelector('nav.navbar')) {
      console.log('%c✨ Navbar rendered to DOM with loading state', 'color: #06b6d4; font-weight: bold;');
    } else {
      console.warn('%c⚠️ Navbar not found in DOM after rendering!', 'color: #f59e0b;');
    }
    
    if (knownUser || window.__navbarAuthResolved) {
      updateNavbarAuthSection();
    } else {
      window.Navbar._fetchAndUpdateAuth();
    }
  },
  
  // Background auth fetch that only updates navbar-auth section
  _fetchAndUpdateAuth: async () => {
    console.log('%c🔄 Navbar._fetchAndUpdateAuth(): Starting background auth check', 'color: #8b5cf6;');
    
    try {
      // Use window.API_BASE if available, otherwise build from current hostname
      const apiBase = window.API_BASE || (function() {
        try {
          const h = window.location.hostname;
          if (!h || h === 'localhost' || h === '127.0.0.1' || h === '::1' || h.startsWith('192.') || h.startsWith('10.')) {
            const endpoint = `http://${h || 'localhost'}:4000`;
            console.log('%c📍 API endpoint:', 'color: #8b5cf6;', endpoint);
            return endpoint;
          }
          return 'https://yolaaiinfohub-backend.onrender.com';
        } catch (e) { 
          console.error('%c⚠️ Error determining API base:', 'color: #f59e0b;', e);
          return 'http://localhost:4000'; 
        }
      })();
      
      const fallbackUser = window.currentUser || window.__lastUser || (() => {
        try {
          return JSON.parse(localStorage.getItem('currentUser') || 'null');
        } catch (e) {
          return null;
        }
      })();

      const response = await fetch(apiBase + '/api/me', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.loggedIn) {
          window.currentUser = {
            username: data.username,
            name: data.name,
            email: data.email,
            phone: data.phone,
            state: data.state,
            lga: data.lga,
            address: data.address,
            profilePicture: data.profilePicture,
            avatar: data.avatar
          };
          window.__lastUser = window.currentUser;
          console.log('%c✅ Navbar._fetchAndUpdateAuth(): User logged in as', 'color: #10b981;', window.currentUser.username);
        } else if (fallbackUser && fallbackUser.username) {
          window.currentUser = fallbackUser;
          window.__lastUser = fallbackUser;
          console.log('%cℹ️ Navbar._fetchAndUpdateAuth(): Preserving cached user while server says logged out', 'color: #f59e0b;', fallbackUser.username);
        } else {
          window.currentUser = null;
          window.__lastUser = null;
          console.log('%c❌ Navbar._fetchAndUpdateAuth(): User not logged in', 'color: #ef4444;');
        }
      } else if (fallbackUser && fallbackUser.username) {
        window.currentUser = fallbackUser;
        window.__lastUser = fallbackUser;
        console.log('%cℹ️ Navbar._fetchAndUpdateAuth(): Preserving cached user after failed auth fetch', 'color: #f59e0b;', fallbackUser.username);
      } else {
        window.currentUser = null;
        window.__lastUser = null;
        console.log('%c⚠️ Navbar._fetchAndUpdateAuth(): Failed to fetch user state', 'color: #f59e0b;');
      }
    } catch (error) {
      console.error('%c❌ Navbar._fetchAndUpdateAuth(): Error checking server:', 'color: #ef4444;', error);
      const fallbackUser = window.currentUser || window.__lastUser || (() => {
        try {
          return JSON.parse(localStorage.getItem('currentUser') || 'null');
        } catch (e) {
          return null;
        }
      })();
      if (fallbackUser && fallbackUser.username) {
        window.currentUser = fallbackUser;
        window.__lastUser = fallbackUser;
      } else {
        window.currentUser = null;
        window.__lastUser = null;
      }
    }
    
    // Update only the navbar-auth section with fetched data
    updateNavbarAuthSection();
    console.log('%c✨ Navbar._fetchAndUpdateAuth(): Auth section updated', 'color: #06b6d4;');
  }
};

// Auto-render navbar on script load if not already rendering
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready before rendering
  const initNavbar = () => {
    console.log('%c📍 Auto-rendering navbar on script load', 'color: #8b5cf6; font-weight: bold;');
    if (window.Navbar && typeof window.Navbar.render === 'function') {
      window.Navbar.render();
    }
  };
  
  // If DOM is already ready, render immediately
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNavbar);
  } else {
    initNavbar();
  }
}
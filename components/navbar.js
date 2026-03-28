// A global variable to store the original PC layout HTML for reliable reversion.
// Use a window-scoped sentinel to avoid redeclaration if the script is loaded twice.
window.__originalPCLayout = window.__originalPCLayout || null;

// Helper: derive the active section from the current browser URL.
// This avoids any reliance on persistent storage so the navbar always
// reflects the live address bar.
function getSectionFromUrl() {
  let path = window.location.pathname.replace(/^\/+/, '').toLowerCase();
  if (!path || path === '' || path === 'index.html') return 'home';
  path = path.split('/').pop().split('?')[0].split('#')[0];
  const valid = ['home','eduinfo','agroinfo','mediinfo','naviinfo','ecoinfo','serviinfo','communityinfo','settings'];
  return valid.includes(path) ? path : 'home';
}

async function fetchWithTimeout(resource, options = {}, timeout = 3000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  const response = await fetch(resource, { ...options, signal: controller.signal });
  clearTimeout(id);
  return response;
}

function renderNavbar() {
  // Note: User state is already set by window.Navbar.render() before this is called
  // No need to make another backend call - use the pre-fetched window.currentUser

  console.log('%c🎨 renderNavbar() called, window.currentUser:', 'color: #9333ea; font-weight: bold;', window.currentUser);
  
  // Remove existing navbar to prevent duplicates
  const existingNavbar = document.querySelector('nav.navbar');
  if (existingNavbar) {
    existingNavbar.remove();
  }

  const nav = document.createElement('nav');
  nav.className = 'navbar';

  // Create the auth buttons container that will be reused
  let authButtonsHTML = `
    <div class="navbar-auth" id="navbar-auth">
      <span data-i18n="login_suggestion" class="login-suggestion" style="align-content: center; margin-right: 30px;">Please login for a more personalised experience!</span> 
      <button id="signin-btn" class="auth-btn" type="button" data-i18n="sign_in">Sign in</button>
      <button id="signup-btn" class="auth-btn" type="button" data-i18n="sign_up">Sign up</button>
    </div>
  `;
  // If user is signed in, show nothing in auth section (navbar-auth)
  if (window.currentUser && window.currentUser.username) {
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
  }

  const logoHTML = `
    <div class="navbar-logo-area">
      <div class="navbar-logo-placeholder">
        <img src="Data/Images/jippujam.jpg" 
             onerror="this.src='Data/Images/default-logo.jpg';" 
             style="overflow: hidden; object-fit: fill; width: 100%; height: 100%; border-radius: 12px;">
      </div>
    </div>
    <span class="navbar-appname">Yola AI Info Hub</span>
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
            <li><button onclick="window.loadSection('home')" data-i18n="home">Home</button></li>
            <li><button onclick="window.loadSection('eduinfo')" data-i18n="eduinfo">EduInfo</button></li>
            <li><button onclick="window.loadSection('ecoinfo')" data-i18n="ecoinfo">EcoInfo</button></li>
            <li><button onclick="window.loadSection('agroinfo')" data-i18n="agroinfo">AgroInfo</button></li>
            <li><button onclick="window.loadSection('mediinfo')" data-i18n="mediinfo">MediInfo</button></li>
            <li><button onclick="window.loadSection('naviinfo')" data-i18n="naviinfo">NaviInfo</button></li>
            <li><button onclick="window.loadSection('communityinfo')" data-i18n="communityinfo">CommunityInfo</button></li>
            <li><button onclick="window.loadSection('serviinfo')" data-i18n="serviinfo">ServiInfo</button></li>
            <li><button onclick="window.loadSection('about')" data-i18n="settings">Settings</button></li>
          </ul>
        </div>
      </div>
    </div>
  `;

  // Append the navbar to the DOM
  document.body.prepend(nav);

  // Wire up auth button events after DOM is in place
  setTimeout(() => {
    const signinBtn = document.getElementById('signin-btn');
    const signupBtn = document.getElementById('signup-btn');
    if (signinBtn) signinBtn.onclick = () => window.location.href = '/pages/signin.html';
    if (signupBtn) signupBtn.onclick = () => window.location.href = '/pages/signup.html';
  }, 0);

  // Apply translations to navbar
  if (window.applyTranslations) {
    window.applyTranslations(nav);
  }

  // Store the original PC layout HTML (store on window to avoid redeclaration issues)
  window.__originalPCLayout = nav.innerHTML;

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
      const lines = newHamburger.querySelectorAll('.hamburger-line');
      lines.forEach(line => {
          line.style.display = 'block';
          line.style.height = '3px';
          line.style.width = '30px';
          line.style.background = '#fff';
          line.style.borderRadius = '5px';
          line.style.margin = '0';
      });

      // Clear and rebuild the navbar container
      newNavbarContainer.innerHTML = '';
      newNavbarContainer.appendChild(newNavbarLeft); // Add logo and app name
      const rightContainer = document.createElement('div');
      rightContainer.style.display = 'flex';
      rightContainer.style.flexDirection = 'column';
      rightContainer.style.alignItems = 'flex-end';
      rightContainer.style.marginRight = '10px';
      rightContainer.appendChild(newNavbarAuth); // Add auth buttons
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
        
        // Add username container to mobile menu if user is logged in
        if (window.currentUser && window.currentUser.username) {
          // Clone the existing navbar-username-container for mobile menu
          const existingUsernameContainer = document.getElementById('navbar-username-container');
          if (existingUsernameContainer) {
            const userMenuSection = existingUsernameContainer.cloneNode(true);
            userMenuSection.style.cssText = `
              display: flex;
              flex-direction: row;
              align-items: center;
              padding: 1rem;
              border-bottom: 1px solid #555;
              gap: 0.7rem;
              background: #1a202c;
              margin-bottom: 1rem;
            `;
            // Ensure avatar styling for mobile
            const avatarSpan = userMenuSection.querySelector('.navbar-avatar');
            if (avatarSpan) {
              avatarSpan.style.cssText = `
                display: inline-flex;
                width: 45px;
                height: 45px;
                border-radius: 50%;
                overflow: hidden;
                background: #fff;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
                border: 2px solid #cbd5e1;
              `;
              const avatarImg = avatarSpan.querySelector('img');
              if (avatarImg) {
                avatarImg.style.cssText = 'width: 100%; height: 100%; object-fit: cover;';
              }
            }
            // Ensure names styling for mobile
            const namesSpan = userMenuSection.querySelector('.navbar-names');
            if (namesSpan) {
              namesSpan.style.cssText = `
                display: flex;
                flex-direction: column;
                align-items: flex-start;
                gap: 0.2rem;
                flex: 1;
              `;
              const fullnameSpan = namesSpan.querySelector('.navbar-fullname');
              if (fullnameSpan) {
                fullnameSpan.style.cssText = 'font-weight: 600; color: #e6eef9; font-size: 0.95rem; line-height: 1.2;';
              }
              const usernameSpan = namesSpan.querySelector('.navbar-username-text');
              if (usernameSpan) {
                usernameSpan.style.cssText = 'font-weight: 700; color: #cbd5e1; font-size: 0.95rem; letter-spacing: 0.5px;';
              }
            }
            mobileMenu.appendChild(userMenuSection);
          }
        }
        
        // Menu links
        const linksList = document.createElement('ul');
        linksList.className = 'mobile-links';
        [
          { name: 'Home', section: 'home', i18n: 'home' },
          { name: 'EduInfo', section: 'eduinfo', i18n: 'eduinfo' },
          { name: 'EcoInfo', section: 'ecoinfo', i18n: 'ecoinfo' },
          { name: 'AgroInfo', section: 'agroinfo', i18n: 'agroinfo' },
          { name: 'MediInfo', section: 'mediinfo', i18n: 'mediinfo' },
          { name: 'NaviInfo', section: 'naviinfo', i18n: 'naviinfo' },
          { name: 'CommunityInfo', section: 'communityinfo', i18n: 'communityinfo' },
          { name: 'ServiInfo', section: 'serviinfo', i18n: 'serviinfo' },
          { name: 'About', section: 'settings', i18n: 'settings' }
        ].forEach(link => {
          const li = document.createElement('li');
          const btn = document.createElement('button');
          btn.setAttribute('data-i18n', link.i18n);
          btn.textContent = link.name;
          // Check if this is the current section (use in-memory or URL fallback)
          const currentSection = window.currentSection || getSectionFromUrl();
          if (
            (currentSection === 'settings' && link.name === 'Settings') ||
            (currentSection === link.section) ||
            (currentSection === 'home' && link.name === 'Home')
          ) {
            btn.classList.add('active');
          }
          btn.onclick = () => {
            window.loadSection(link.section);
            window.highlightActiveNav(link.section);
            mobileMenu.classList.remove('show');
            setTimeout(() => mobileMenu.remove(), 300);
          };
          li.appendChild(btn);
          linksList.appendChild(li);
        });
        
        // Append links list directly (settings already included above)
        mobileMenu.appendChild(linksList);
        
        document.body.appendChild(mobileMenu);
        setTimeout(() => mobileMenu.classList.add('show'), 10);
      } else {
        mobileMenu.classList.add('show');
      }
    };
    
  }

  // Initial call to set the layout on page load
  handleResponsiveLayout();

  // Listen for window resize events
  window.addEventListener('resize', handleResponsiveLayout);

  // Highlight active section helper (invoked after navigation)
  window.highlightActiveNav = function(section) {
    // If no section provided, infer from URL
    if (!section || section === '' || section === 'index.html') {
      section = getSectionFromUrl();
    }

    // keep current section in memory only
    window.currentSection = section;

    // Helper to match and highlight buttons
    const highlightButton = (btn) => {
      btn.classList.remove('active');
      const btnText = btn.textContent.trim();
      const btnSection = btnText.toLowerCase() + (btnText.toLowerCase().endsWith('info') ? '' : (btnText.toLowerCase() === 'settings' ? '' : 'info'));
      if ((section === 'settings' && btnText === 'Settings') || btnSection === section || (section === 'home' && btnText === 'Home')) {
        btn.classList.add('active');
      }
    };

    document.querySelectorAll('.navbar-links button, .mobile-links button').forEach(highlightButton);
  };
}

// Export as Navbar global for compatibility
window.Navbar = {
  render: async (force = false) => {
    console.log('%c🎬 window.Navbar.render() called', 'color: #06b6d4; font-weight: bold;');
    
    // IMPORTANT: Prevent concurrent calls - if already rendering, skip
    if (window.__navbarRenderInProgress) {
      console.log('%c⏭️ Navbar.render(): Already rendering in progress - skipping', 'color: #94a3b8;');
      return;
    }
    
    // Check if navbar already exists in DOM and is complete (unless forced)
    const existingNavbar = document.querySelector('nav.navbar');
    if (existingNavbar && window.__navbarRenderComplete && !force) {
      console.log('%c⏭️ Navbar.render(): Navbar already rendered and in DOM - skipping', 'color: #94a3b8;');
      return;
    }
    
    // Mark as rendering to prevent concurrent calls
    window.__navbarRenderInProgress = true;
    
    // Clear the complete flag so we can render fresh
    window.__navbarRenderComplete = false;
    
    // Clear the force rerender flag if it was set
    window.__forceNavbarRerender = false;
    
    // Fetch current user state from server (SINGLE CALL)
    console.log('%c⏳ Waiting for backend response to verify user...', 'color: #f59e0b; font-weight: bold;');
    try {
      // Use window.API_BASE if available, otherwise build from current hostname
      const apiBase = window.API_BASE || (function() {
        try {
          const h = window.location.hostname;
          if (!h || h === 'localhost' || h === '127.0.0.1' || h === '::1' || h.startsWith('192.') || h.startsWith('10.')) {
            return `http://${h || 'localhost'}:4000`;
          }
          return 'https://yolaaiinfohub-backend.onrender.com';
        } catch (e) { return 'http://localhost:4000'; }
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
          console.log('%c✅ User verified as logged in:', 'color: #10b981; font-weight: bold;', data.username);
        } else {
          // User not logged in according to server
          window.currentUser = null;
          window.__lastUser = null;
          console.log('%c❌ No logged-in user detected.', 'color: #ef4444; font-weight: bold;');
        }
      } else {
        // Error fetching user state from server
        window.currentUser = null;
        window.__lastUser = null;
        console.log('%c⚠️ Navbar.render(): Failed to fetch user state from server', 'color: #f59e0b;');
      }
    } catch (error) {
      console.error('%c❌ Navbar.render(): Error checking server for user state:', 'color: #ef4444;', error);
      window.currentUser = null;
      window.__lastUser = null;
      console.log('%c❌ No logged-in user detected (backend error).', 'color: #ef4444; font-weight: bold;');
    }
    
    // Now render navbar with the fetched user state
    renderNavbar();
    
    // Verify navbar was actually added to DOM before marking complete
    if (document.querySelector('nav.navbar')) {
      window.__navbarRenderComplete = true;
      console.log('%c✨ Navbar render complete and in DOM', 'color: #06b6d4; font-weight: bold;');
    } else {
      console.warn('%c⚠️ Navbar not found in DOM after rendering!', 'color: #f59e0b;');
    }
    
    window.__navbarRenderInProgress = false;
    
    // If auth UI was updated before this script loaded, ensure navbar picks it up
    // Only reapply if currentUser is null but we have a remembered user, or they differ
    if (window.updateAuthUI && window.__lastUser) {
      const current = window.currentUser || null;
      if (!current || (current.username !== window.__lastUser.username)) {
        console.log('%c♻️ window.Navbar.render(): Reapplying __lastUser to updateAuthUI', 'color: #8b5cf6;', window.__lastUser);
        try { window.updateAuthUI(window.__lastUser); } catch (e) { console.error('Error reapplying lastUser:', e); }
        // also ensure navbar login class is in sync
        const navbarEl = document.querySelector('nav.navbar');
        if (navbarEl) navbarEl.classList.add('logged-in');
      } else {
        console.log('%c⏭️ window.Navbar.render(): currentUser already matches __lastUser, skipping reapply', 'color: #94a3b8;');
      }
    }
  }
};

// Auto-render navbar on script load if not already rendering
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready before rendering
  const initNavbar = () => {
    // Only render if not already done and not in progress
    if (!window.__navbarRenderComplete && !window.__navbarRenderInProgress) {
      console.log('%c📍 Auto-rendering navbar on script load', 'color: #8b5cf6; font-weight: bold;');
      if (window.Navbar && typeof window.Navbar.render === 'function') {
        window.Navbar.render();
      }
    } else {
      console.log('%c⏭️ Auto-render skipped: render already in progress or complete', 'color: #94a3b8;');
    }
  };
  
  // If DOM is already ready, render immediately
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNavbar);
  } else {
    setTimeout(initNavbar, 0);
  }
}
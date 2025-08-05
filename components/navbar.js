// A global variable to store the original PC layout HTML for reliable reversion.
let originalPCLayout = null;

function renderNavbar() {
  const nav = document.createElement('nav');
  nav.className = 'navbar';

  // Create the auth buttons container that will be reused
  const authButtonsHTML = `
    <div class="navbar-auth" id="navbar-auth">
      <button id="signin-btn" class="auth-btn" type="button">Sign in</button>
      <button id="signup-btn" class="auth-btn" type="button">Sign up</button>
      <button id="logout-btn" class="auth-btn" style="display:none" onclick="window.logoutUser()">Logout</button>
      <span id="user-avatar" class="user-avatar" style="display:none"><img src="https://ui-avatars.com/api/?name=User" alt="User"/></span>
    </div>
  `;

  const logoHTML = `
    <div class="navbar-logo-area">
      <div class="navbar-logo-placeholder"><img src=Data/Images/jippujam.jpg></div>
    </div>
    <span class="navbar-appname">Yola AI Info Hub</span>
  `;

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
        <div class="navbar-top-section">
          ${authButtonsHTML}
        </div>
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

  // Store the original PC layout HTML to revert to it later
  originalPCLayout = nav.innerHTML;

  // Main function to handle all responsive layouts
  function handleResponsiveLayout() {
    const windowWidth = window.innerWidth;
    const navbarContainer = document.querySelector('.navbar-container');
    
    // Restore to original PC layout before making any changes
    if (originalPCLayout) {
      document.querySelector('.navbar').innerHTML = originalPCLayout;
    }

    // Re-select elements after innerHTML change
    const newNavbarContainer = document.querySelector('.navbar-container');
    const newNavbarLeft = document.querySelector('.navbar-left');
    const newNavbarRight = document.querySelector('.navbar-right');
    const newNavbarAuth = document.querySelector('.navbar-auth');
    const newNavbarLinks = document.querySelector('.navbar-links');
    const newHamburger = document.getElementById('hamburger');
    
    // Apply common styles using JS
    newNavbarContainer.style.display = 'flex';
    newNavbarContainer.style.alignItems = 'center';
    newNavbarContainer.style.padding = '0px';
    
    newNavbarLeft.style.display = 'flex';
    newNavbarLeft.style.alignItems = 'center';
    
    newNavbarRight.style.display = 'flex';
    newNavbarRight.style.alignItems = 'center';
    newNavbarLinks.style.display = 'flex';

    // Logic for different screen sizes
    if (windowWidth > 1150) {
      // PC View
      newNavbarContainer.style.justifyContent = 'space-between';
      newHamburger.style.display = 'none';
      newNavbarRight.style.display = 'flex'; 

    } else if (windowWidth >= 701 && windowWidth <= 1150) {
      // Tablet View
      newNavbarContainer.style.flexDirection = 'column';
      newNavbarContainer.style.justifyContent = 'flex-start';
      newNavbarContainer.style.alignItems = 'flex-start';
      
      const topRow = document.createElement('div');
      topRow.style.display = 'flex';
      topRow.style.justifyContent = 'space-between';
      topRow.style.width = '100%';
      topRow.style.marginBottom = '1rem';
      
      // Move logo and app name to the top row
      topRow.appendChild(newNavbarLeft);
      // Move auth buttons to the top row
      topRow.appendChild(newNavbarAuth);
      
      // The newNavbarLinks element is now the bottom row
      newNavbarLinks.style.width = '100%';
      newNavbarLinks.style.justifyContent = 'space-around';
      
      // Rebuild the container with the two rows
      newNavbarContainer.innerHTML = '';
      newNavbarContainer.appendChild(topRow);
      newNavbarContainer.appendChild(newNavbarLinks);
      
      newHamburger.style.display = 'none';
      
    } else {
      // Mobile View
      newNavbarContainer.style.justifyContent = 'space-between';
      newNavbarContainer.style.flexDirection = 'row'; // Ensure row layout
      newNavbarContainer.style.alignItems = 'center';

      newNavbarLeft.style.display = 'flex';
      newNavbarLeft.style.alignItems = 'center';

      newNavbarRight.style.display = 'flex';
      newNavbarRight.style.flexDirection = 'column';
      newNavbarRight.style.alignItems = 'flex-end';

      newNavbarLinks.style.display = 'none'; // Hide navbar links

      // Adjust auth buttons
      newNavbarAuth.style.display = 'flex';
      newNavbarAuth.style.flexDirection = 'row';
      newNavbarAuth.style.alignItems = 'center';
      newNavbarAuth.style.marginRight = '10px';

      // Place hamburger spans below auth buttons
      newHamburger.style.display = 'flex';
      newHamburger.style.flexDirection = 'column'; // Ensure spans are stacked vertically
      newHamburger.style.alignItems = 'center';
      newHamburger.style.marginTop = '5px';
      newHamburger.style.marginLeft = 'auto';

      // Style the hamburger lines
      const lines = newHamburger.querySelectorAll('.hamburger-line');
      lines.forEach(line => {
          line.style.display = 'block';
          line.style.height = '3px';
          line.style.width = '30px';
          line.style.background = '#333';
          line.style.borderRadius = '5px';
          line.style.margin = '3px 0';
      });

      // Clear and rebuild the navbar container
      newNavbarContainer.innerHTML = '';
      newNavbarContainer.appendChild(newNavbarLeft); // Add logo and app name
      const rightContainer = document.createElement('div');
      rightContainer.style.display = 'flex';
      rightContainer.style.flexDirection = 'column';
      rightContainer.style.alignItems = 'flex-end';
      rightContainer.appendChild(newNavbarAuth); // Add auth buttons
      rightContainer.appendChild(newHamburger); // Add hamburger spans
      newNavbarContainer.appendChild(rightContainer);
    }

    // Add event listener for the hamburger menu toggle
    newHamburger.onclick = (e) => {
        e.stopPropagation();
        const currentDisplay = newNavbarRight.style.display;
        if (currentDisplay === 'none' || currentDisplay === '') {
            newNavbarRight.style.display = 'flex';
            newNavbarRight.style.flexDirection = 'column';
            newNavbarRight.style.position = 'absolute';
            newNavbarRight.style.top = '60px'; // Adjust based on your navbar height
            newNavbarRight.style.right = '10px';
            newNavbarRight.style.backgroundColor = '#fff';
            newNavbarRight.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
            newNavbarRight.style.padding = '1rem';
            newNavbarLinks.style.flexDirection = 'column';
        } else {
            newNavbarRight.style.display = 'none';
        }
    };
    
  }

  // Initial call to set the layout on page load
  handleResponsiveLayout();

  // Listen for window resize events
  window.addEventListener('resize', handleResponsiveLayout);

  // Highlight active section
  window.highlightActiveNav = function(section) {
    document.querySelectorAll('.navbar-links button, .mobile-links button').forEach(btn => {
      btn.classList.remove('active');
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

// Export as Navbar global for compatibility
window.Navbar = {
  render: () => {
    renderNavbar();
  }
};
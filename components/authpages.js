// Signin page component
window.SigninPage = {
  render: function() {
    if (!document.getElementById('signin-page')) {
      window.location.href = 'pages/auth.html#signin';
      return;
    }
    document.getElementById('signin-page').style.display = 'block';
    document.getElementById('signup-page').style.display = 'none';
    document.getElementById('forgot-page').style.display = 'none';
  },
  mount: function() {
    document.getElementById('signin-form').onsubmit = async function(e) {
      e.preventDefault();
      const usernameOrEmail = document.getElementById('signin-username').value.trim();
      const password = document.getElementById('signin-password').value;
      let body;
      if (/^[\w.-]+@[\w.-]+\.[A-Za-z]{2,}$/.test(usernameOrEmail)) {
        body = { email: usernameOrEmail, password };
      } else {
        body = { username: usernameOrEmail, password };
      }
      try {
  const res = await fetch((window.API_BASE || 'http://localhost:4000') + '/api/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify(body)
        });

        if (!res.ok) {
          const errorText = await res.text();
          try {
            const errorJson = JSON.parse(errorText);
            throw new Error(errorJson.error || 'Login failed');
          } catch (e) {
            throw new Error(errorText || 'Login failed');
          }
        }

        const data = await res.json();
        if (data.success) {
          window.updateAuthUI({ username: data.username, name: data.name });
          window.loadSection('home');
        } else {
          throw new Error(data.error || 'Login failed');
        }
      } catch (error) {
        console.error('Login error:', error);
        document.getElementById('signin-error').textContent = error.message || 'Invalid username/password';
      }
    };
  }
};

// Signup page component
window.SignupPage = {
  render: function() {
    if (!document.getElementById('signin-page')) {
      window.location.href = 'pages/auth.html#signup';
      return;
    }
    document.getElementById('signin-page').style.display = 'none';
    document.getElementById('signup-page').style.display = 'block';
    document.getElementById('forgot-page').style.display = 'none';
  },
  mount: function() {
    // Load states and LGAs
    if (!document.getElementById('states-lgas-js')) {
      const script = document.createElement('script');
      script.src = 'components/states-lgas.js';
      script.id = 'states-lgas-js';
      document.body.appendChild(script);
    }

    // Get form elements
    const form = document.getElementById('signup-form');
    const password = document.getElementById('signup-password');
    const confirmPassword = document.getElementById('signup-confirm-password');
    const errorDiv = document.getElementById('signup-error');
    const stateSelect = document.getElementById('signup-state');
    const lgaSelect = document.getElementById('signup-lga');
    const yolaResidentCheckbox = document.getElementById('yola-resident');

    // Password validation function
    function validatePassword(password) {
      const requirements = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[!@#$%^&*]/.test(password)
      };

      // Update UI indicators with specific feedback
      const reqElements = {
        length: document.querySelector('.req-length .icon'),
        uppercase: document.querySelector('.req-uppercase .icon'),
        lowercase: document.querySelector('.req-lowercase .icon'),
        number: document.querySelector('.req-number .icon'),
        special: document.querySelector('.req-special .icon')
      };

      // Update each requirement with visual feedback
      for (const [key, element] of Object.entries(reqElements)) {
        if (element) {
          element.textContent = requirements[key] ? '✅' : '⚪';
          element.parentElement.style.color = requirements[key] ? '#4CAF50' : '#666';
        }
      }

      return Object.values(requirements).every(req => req);
    }

    // Password confirmation validation
    function validatePasswordMatch() {
      const matchStatus = document.getElementById('password-match-status');
      const password = document.getElementById('signup-password').value;
      const confirmPassword = document.getElementById('signup-confirm-password').value;

      if (confirmPassword) {
        if (password === confirmPassword) {
          matchStatus.textContent = '✓ Passwords match';
          matchStatus.style.color = '#4CAF50';
          return true;
        } else {
          matchStatus.textContent = '✕ Passwords do not match';
          matchStatus.style.color = '#f44336';
          return false;
        }
      } else {
        matchStatus.textContent = '';
        return false;
      }
    }

    // Add event listeners for real-time validation
    password.addEventListener('input', function() {
      validatePassword(this.value);
      validatePasswordMatch(); // Also check match when password changes
    });

    confirmPassword.addEventListener('input', validatePasswordMatch);

    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      errorDiv.textContent = ''; // Clear previous errors

      const username = document.getElementById('signup-username').value.trim();
      const email = document.getElementById('signup-email').value.trim();
      const name = document.getElementById('signup-name').value.trim();
      const nin = document.getElementById('signup-nin').value.trim();
      const phone = document.getElementById('signup-phone').value.trim();
      const address = document.getElementById('signup-address').value.trim();
      const state = document.getElementById('signup-state').value;
      const lga = document.getElementById('signup-lga').value;
      const passwordValue = document.getElementById('signup-password').value; // Use a different variable name
      const confirmPasswordValue = document.getElementById('signup-confirm-password').value; // Use a different variable name
      const termsAccepted = document.getElementById('signup-terms').checked;

      // Client-side validation
      if (!username || username.length < 3) {
        errorDiv.textContent = 'Username must be at least 3 characters';
        return;
      }
      if (!email || !email.match(/^[\w.-]+@[\w.-]+\.[A-Za-z]{2,}$/)) {
        errorDiv.textContent = 'Please enter a valid email address';
        return;
      }
      if (!name) {
        errorDiv.textContent = 'Please enter your full name';
        return;
      }

      // NIN validation
      if (!/^[0-9]{11}$/.test(nin)) {
        errorDiv.textContent = 'NIN must be exactly 11 digits';
        document.getElementById('signup-nin').focus();
        return;
      }
      if (!phone || !/^[0-9]+$/.test(phone)) {
        errorDiv.textContent = 'Please enter a valid phone number';
        return;
      }
      if (!address) {
        errorDiv.textContent = 'Please enter your address';
        return;
      }
      if (!state) {
        errorDiv.textContent = 'Please select your state';
        return;
      }
      if (!lga) {
        errorDiv.textContent = 'Please select your LGA';
        return;
      }

      const isPasswordValid = validatePassword(passwordValue);
      const isPasswordMatch = validatePasswordMatch();

      if (!isPasswordValid || !isPasswordMatch) {
        const errors = [];
        if (!isPasswordValid) {
          errors.push('Please meet all password requirements');
        }
        if (!isPasswordMatch) {
          errors.push('Passwords must match');
        }
        errorDiv.innerHTML = errors.join('<br>');
        return;
      }

      if (!termsAccepted) {
        errorDiv.textContent = 'Please accept the terms and conditions';
        return;
      }

      try {
  const res = await fetch((window.API_BASE || 'http://localhost:4000') + '/api/signup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          credentials: 'include',
          mode: 'cors',
          body: JSON.stringify({
            username,
            email,
            name,
            nin,
            phone,
            address,
            state,
            lga,
            password: passwordValue,
            termsAccepted: true
          })
        });

        if (!res.ok) {
          const errorText = await res.text();
          try {
            const errorJson = JSON.parse(errorText);
            const errorMessage = errorJson.error || 'Signup failed';
            // Provide more user-friendly error messages
            if (errorMessage.includes('Email already exists')) {
              throw new Error('This email is already registered. Please try logging in or use a different email.');
            } else if (errorMessage.includes('Username already exists')) {
              throw new Error('This username is already taken. Please choose a different username.');
            } else if (errorMessage.includes('NIN already registered')) {
              throw new Error('This NIN is already registered. Please contact support if you believe this is an error.');
            } else {
              throw new Error(errorMessage);
            }
          } catch (e) {
            throw new Error(errorText || 'Signup failed');
          }
        }

        const data = await res.json();
        if (data.success) {
          window.updateAuthUI({ username: data.username, name: data.name });
          window.loadSection('home');
        } else {
          throw new Error(data.error || 'Signup failed');
        }
      } catch (error) {
        console.error('Signup error:', error);
        document.getElementById('signup-error').textContent = error.message || 'Error during signup';
      }
    });

    // Populate states dropdown
    function populateStates() {
      if (!window.STATES_LGAS) return;
      stateSelect.innerHTML = '<option value="">Select State</option>';
      // Sort states alphabetically
      const sortedStates = Object.keys(window.STATES_LGAS).sort();
      sortedStates.forEach(state => {
        const option = document.createElement('option');
        option.value = state.toLowerCase();
        option.textContent = state;
        stateSelect.appendChild(option);
      });
      // Set Adamawa if yola resident is checked
      if (yolaResidentCheckbox.checked) {
        stateSelect.value = 'adamawa';
        stateSelect.disabled = true;
      }
      updateLGAOptions();
    }

    // Update LGA options based on selected state
    function updateLGAOptions() {
      if (!window.STATES_LGAS) return;

      const selectedState = stateSelect.value;
      lgaSelect.innerHTML = '<option value="">Select LGA</option>';

      if (selectedState && window.STATES_LGAS[selectedState]) {
        // Sort LGAs alphabetically
        const stateLGAs = window.STATES_LGAS[selectedState].sort();
        stateLGAs.forEach(lga => {
          const option = document.createElement('option');
          option.value = lga.toLowerCase().replace(/\s+/g, '-');
          option.textContent = lga;
          lgaSelect.appendChild(option);
        });
      }
      // If Yola resident is checked, pre-select Yola North if it exists
      if (yolaResidentCheckbox.checked && selectedState === 'adamawa') {
        const yolaNorthOption = Array.from(lgaSelect.options).find(option => option.value === 'yola-north');
        if (yolaNorthOption) {
          yolaNorthOption.selected = true;
        }
        lgaSelect.disabled = true;
      } else {
        lgaSelect.disabled = false;
      }
    }

    // Handle state selection change
    stateSelect.addEventListener('change', () => {
      updateLGAOptions();
    });

    // Initialize states dropdown
    // This part should run after states-lgas.js is loaded
    // A better approach would be to ensure states-lgas.js is loaded
    // before attempting to populateStates. For now, we rely on the script
    // being loaded synchronously or quickly.
    const statesLgasScript = document.getElementById('states-lgas-js');
    if (statesLgasScript) {
        statesLgasScript.onload = populateStates;
    } else {
        // Fallback if script is already loaded by the time mount runs
        populateStates();
    }


    // Handle Yola resident checkbox
    yolaResidentCheckbox.addEventListener('change', function() {
      if (this.checked) {
        stateSelect.value = 'adamawa';
        stateSelect.disabled = true;
        lgaSelect.innerHTML = `
          <option value="">Select LGA</option>
          <option value="yola-north">Yola North</option>
          <option value="yola-south">Yola South</option>
        `;
        // Pre-select Yola North by default when Yola Resident is checked
        const yolaNorthOption = Array.from(lgaSelect.options).find(option => option.value === 'yola-north');
        if (yolaNorthOption) {
          yolaNorthOption.selected = true;
        }
        lgaSelect.disabled = true;
      } else {
        stateSelect.disabled = false;
        populateStates(); // Repopulate states and LGAs for all options
        updateLGAOptions(); // Ensure correct LGAs are shown if state was previously Adamawa
      }
    });
  }
};

// Forgot password page
window.ForgotPage = {
  render: function() {
    window.location.href = 'pages/auth.html#forgot';
    document.getElementById('signin-page').style.display = 'none';
    document.getElementById('signup-page').style.display = 'none';
    document.getElementById('forgot-page').style.display = 'block';
  },
  mount: function() {
    document.getElementById('forgot-form').onsubmit = async function(e) {
      e.preventDefault();
      const email = document.getElementById('forgot-email').value.trim();
      const errorDiv = document.getElementById('forgot-error');
      errorDiv.textContent = ''; // Clear previous errors

      if (!email || !email.match(/^[\w.-]+@[\w.-]+\.[A-Za-z]{2,}$/)) {
        errorDiv.style.color = '#e53e3e';
        errorDiv.textContent = 'Please enter a valid email address.';
        return;
      }

      try {
  const res = await fetch((window.API_BASE || 'http://localhost:4000') + '/api/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          errorDiv.style.color = '#3182ce';
          errorDiv.textContent = data.message;
        } else {
          errorDiv.style.color = '#e53e3e';
          throw new Error(data.error || 'Error sending reset link.');
        }
      } catch (error) {
        console.error('Forgot password error:', error);
        errorDiv.textContent = error.message || 'An unexpected error occurred.';
      }
    };
  }
};

// Register these as sections
window.AuthSections = {
  signin: window.SigninPage,
  signup: window.SignupPage,
  forgot: window.ForgotPage
};
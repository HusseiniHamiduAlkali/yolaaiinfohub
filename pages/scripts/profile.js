(function () {
  'use strict';

  function resolveApiBase() {
    if (window.API_BASE) return window.API_BASE.replace(/\/$/, '');
    if (window.__API_BASE__) return window.__API_BASE__.replace(/\/$/, '');
    var host = window.location && window.location.hostname ? window.location.hostname : '';
    if (!host || host === 'localhost' || host === '127.0.0.1' || host === '::1' || host.startsWith('192.') || host.startsWith('10.')) {
      return 'http://localhost:4000';
    }
    return window.location.origin || '';
  }

  function getStoredUser() {
    try {
      return JSON.parse(localStorage.getItem('currentUser') || 'null');
    } catch (err) {
      return null;
    }
  }

  function buildAvatarUrl(user) {
    if (user.profilePicture) return user.profilePicture;
    if (user.avatar) return user.avatar;
    var name = user.name || user.username || 'User';
    return 'https://ui-avatars.com/api/?name=' + encodeURIComponent(name) + '&background=3182ce&color=fff';
  }

  function setText(element, value, fallback) {
    if (!element) return;
    var text = value || fallback || 'Not set';
    element.textContent = text;
    element.classList.toggle('empty', !value);
  }

  function populateProfile(user) {
    if (!user || !user.username) return false;

    var avatarImg = document.getElementById('avatarImg');
    if (avatarImg) {
      avatarImg.src = buildAvatarUrl(user);
    }

    var profileName = document.querySelector('.profile-name');
    var profileRole = document.querySelector('.profile-role');
    if (profileName) profileName.textContent = user.name || user.username;
    if (profileRole) {
      var locationParts = [];
      if (user.lga) locationParts.push(user.lga);
      if (user.state) locationParts.push(user.state);
      profileRole.textContent = 'Community contributor' + (locationParts.length ? ' · ' + locationParts.join(', ') : '');
    }

    var rows = Array.from(document.querySelectorAll('.info-row[data-editable]'));
    rows.forEach(function (row) {
      var key = (row.dataset.name || '').trim().toLowerCase();
      var value = null;
      switch (key) {
        case 'full name':
          value = user.name;
          break;
        case 'username':
          value = user.username;
          break;
        case 'email':
          value = user.email;
          break;
        case 'phone':
          value = user.phone;
          break;
        case 'home address':
          value = user.address;
          break;
        case 'city / state':
          value = [user.lga, user.state].filter(Boolean).join(', ');
          break;
        case 'date of birth':
          value = user.dateOfBirth || user.dob || '';
          break;
        case 'bio':
          value = user.bio || '';
          break;
      }

      var valueEl = row.querySelector('.info-value');
      if (valueEl) {
        setText(valueEl, value, valueEl.textContent.trim());
      }
    });

    return true;
  }

  async function fetchCurrentUser() {
    var apiBase = resolveApiBase();
    if (!apiBase) return null;
    try {
      var response = await fetch(apiBase + '/api/me', {
        credentials: 'include'
      });
      if (!response.ok) return null;
      var data = await response.json();
      if (data && data.loggedIn && data.username) {
        return {
          username: data.username,
          name: data.name,
          email: data.email,
          phone: data.phone,
          state: data.state,
          lga: data.lga,
          address: data.address,
          profilePicture: data.profilePicture,
          avatar: data.avatar,
          dateOfBirth: data.dateOfBirth,
          bio: data.bio
        };
      }
      return null;
    } catch (err) {
      return null;
    }
  }

  function normalizeFieldKey(fieldName) {
    if (!fieldName) return '';
    var key = fieldName.trim().toLowerCase();
    switch (key) {
      case 'full name': return 'name';
      case 'username': return 'username';
      case 'email': return 'email';
      case 'phone': return 'phone';
      case 'home address': return 'address';
      case 'city / state': return 'cityState';
      case 'date of birth': return 'dateOfBirth';
      case 'bio': return 'bio';
      case 'preferred language': return 'settings.language';
      default: return '';
    }
  }

  function parseCityState(rawValue) {
    if (!rawValue) return { state: '', lga: '' };
    var parts = rawValue.split(',').map(function (part) { return part.trim(); }).filter(Boolean);
    if (parts.length === 0) return { state: '', lga: '' };
    if (parts.length === 1) {
      return { state: parts[0], lga: '' };
    }
    return { lga: parts[0], state: parts.slice(1).join(', ') };
  }

  function showStatus(message, isError) {
    var statusEl = document.getElementById('profile-save-status');
    if (!statusEl) {
      statusEl = document.createElement('div');
      statusEl.id = 'profile-save-status';
      statusEl.style.position = 'sticky';
      statusEl.style.top = '1rem';
      statusEl.style.zIndex = '10';
      statusEl.style.marginBottom = '1rem';
      statusEl.style.padding = '0.9rem 1rem';
      statusEl.style.borderRadius = '12px';
      statusEl.style.fontSize = '0.95rem';
      statusEl.style.fontWeight = '600';
      statusEl.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
      statusEl.style.maxWidth = 'calc(100% - 2rem)';
      statusEl.style.backdropFilter = 'blur(12px)';
      statusEl.style.border = '1px solid rgba(255,255,255,0.18)';
      document.querySelector('.profile-card')?.prepend(statusEl);
    }
    statusEl.textContent = message;
    statusEl.style.background = isError ? 'rgba(239, 68, 68, 0.12)' : 'rgba(56, 189, 248, 0.14)';
    statusEl.style.color = isError ? '#b91c1c' : '#0369a1';
    statusEl.style.borderColor = isError ? 'rgba(239, 68, 68, 0.24)' : 'rgba(56, 189, 248, 0.28)';
    window.clearTimeout(profileStatusTimeout);
    profileStatusTimeout = window.setTimeout(function () {
      if (statusEl && statusEl.parentNode) {
        statusEl.parentNode.removeChild(statusEl);
      }
    }, 4500);
  }

  function getUpdatePayload(fieldKey, value) {
    if (!fieldKey) return null;
    var payload = {};
    if (fieldKey === 'cityState') {
      var parsed = parseCityState(value);
      payload.state = parsed.state;
      payload.lga = parsed.lga;
    } else {
      payload[fieldKey] = value;
    }
    return payload;
  }

  function updateLocalUser(newUserData) {
    var user = getStoredUser() || {};
    Object.assign(user, newUserData);
    try {
      localStorage.setItem('currentUser', JSON.stringify(user));
    } catch (err) {
      console.warn('Could not update stored profile data', err);
    }
    populateProfile(user);
    return user;
  }

  async function saveProfileField(fieldName, value, previousValue) {
    var fieldKey = normalizeFieldKey(fieldName);
    if (!fieldKey) {
      return;
    }

    if (fieldKey === 'username') {
      if (!value) {
        showStatus('Username cannot be empty.', true);
        return;
      }
    }

    var payload = getUpdatePayload(fieldKey, value);
    if (!payload || Object.keys(payload).length === 0) {
      return;
    }

    var apiBase = resolveApiBase();
    try {
      var response = await fetch(apiBase + '/api/update-profile', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      var data = await response.json().catch(function () { return {}; });
      if (!response.ok || !data.success) {
        var message = (data && data.error) ? data.error : 'Unable to save profile changes.';
        showStatus('Save failed: ' + message, true);
        revertProfileField(fieldName, previousValue);
        return;
      }
      updateLocalUser(data);
      showStatus('Profile saved successfully.');
    } catch (err) {
      showStatus('Save failed: ' + (err && err.message ? err.message : 'Network error'), true);
      revertProfileField(fieldName, previousValue);
    }
  }

  function revertProfileField(fieldName, previousValue) {
    var rows = Array.from(document.querySelectorAll('.info-row[data-editable]'));
    rows.forEach(function (row) {
      if ((row.dataset.name || '').trim().toLowerCase() === (fieldName || '').trim().toLowerCase()) {
        var valueEl = row.querySelector('.info-value');
        if (valueEl) {
          valueEl.textContent = previousValue || 'Not set';
          valueEl.classList.toggle('empty', !previousValue);
        }
      }
    });
  }

  async function uploadAvatar(file) {
    if (!file) return;
    var apiBase = resolveApiBase();
    var formData = new FormData();
    formData.append('profilePicture', file);
    try {
      var response = await fetch(apiBase + '/api/update-profile', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      var data = await response.json().catch(function () { return {}; });
      if (!response.ok || !data.success) {
        showStatus('Profile picture upload failed.', true);
        return;
      }
      updateLocalUser(data);
      showStatus('Profile picture saved.');
    } catch (err) {
      showStatus('Profile picture upload failed.', true);
    }
  }

  var profileStatusTimeout = null;

  function clearAuthState() {
    try { localStorage.removeItem('currentUser'); } catch (err) { console.warn('Could not clear stored auth data:', err); }
    if (window.updateAuthUI && typeof window.updateAuthUI === 'function') {
      window.updateAuthUI(null);
    }
  }

  async function logoutUser() {
    var confirmed = window.confirm('Are you sure you want to sign out?');
    if (!confirmed) return;

    var apiBase = resolveApiBase();
    try {
      await fetch(apiBase + '/api/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (err) {
      console.warn('Logout request failed:', err);
    }
    clearAuthState();
    window.location.href = '/pages/auth.html#signin';
  }

  window.logoutUser = logoutUser;

  window.onProfileFieldUpdated = function (event) {
    if (!event || !event.field) return;
    saveProfileField(event.field, event.value, event.previousValue);
  };

  function init() {
    var storedUser = getStoredUser();
    var populated = false;

    if (storedUser && storedUser.username) {
      populated = populateProfile(storedUser);
    }

    if (!populated) {
      fetchCurrentUser().then(function (fetchedUser) {
        if (fetchedUser) {
          try {
            localStorage.setItem('currentUser', JSON.stringify(fetchedUser));
          } catch (err) {
            console.warn('Could not persist profile user data', err);
          }
          populateProfile(fetchedUser);
        }
      });
    }

    var avatarInput = document.getElementById('avatarInput');
    if (avatarInput) {
      avatarInput.addEventListener('change', function (e) {
        var file = e.target.files && e.target.files[0];
        if (!file) return;
        uploadAvatar(file);
      });
    }

    var signoutBtn = document.getElementById('profile-signout-btn');
    if (signoutBtn) {
      signoutBtn.addEventListener('click', function () {
        logoutUser();
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

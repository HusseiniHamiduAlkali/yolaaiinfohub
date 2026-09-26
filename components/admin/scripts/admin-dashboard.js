(function () {
  'use strict';

  const localCandidates = [
    'http://localhost:4000', 'http://127.0.0.1:4000',
    'http://localhost:4001', 'http://127.0.0.1:4001',
    'http://localhost:4002', 'http://127.0.0.1:4002',
    'http://localhost:3000', 'http://127.0.0.1:3000'
  ];
  const host = location.hostname;
  const local = !host || ['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(host) || host.startsWith('192.') || host.startsWith('10.');
  const productionApi = window.__API_BASE__ || window.API_BASE_PROD_URL || window.API_BASE_URL || window.BACKEND_URL || 'https://yolaaiinfohub-authentication.onrender.com';
  const initialApi = window.API_BASE || (local ? `http://${host || 'localhost'}:4001` : productionApi);
  const apiCandidates = local ? [...new Set([initialApi, ...localCandidates.filter(candidate => candidate.includes(host || 'localhost'))])] : [initialApi];
  window.API_BASE = initialApi;

  const state = { page: 1, pages: 1, selected: null, searchTimer: null };
  const notice = document.getElementById('notice');
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const formatDate = value => value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Never';
  const setNotice = (message, error = false) => { notice.textContent = message; notice.className = `notice${message ? ' show' : ''}${error ? ' error' : ''}`; };

  async function request(path, options = {}) {
    let lastError;
    for (const base of apiCandidates) {
      try {
        const response = await fetch(base + path, {
          credentials: 'include',
          ...options,
          headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
        });
        const body = await response.json().catch(() => ({}));
        if (response.ok) { window.API_BASE = base; return body; }
        if (response.status === 404 && base !== apiCandidates.at(-1)) { lastError = new Error(body.error || 'API route not found'); continue; }
        const error = new Error(body.error || 'Request failed'); error.status = response.status; throw error;
      } catch (error) {
        if (error.status) throw error;
        lastError = error;
      }
    }
    throw lastError || new Error('Unable to connect to the admin API.');
  }

  function refreshIcons() { if (window.lucide) window.lucide.createIcons(); }

  function renderChart(id, points) {
    const target = document.getElementById(id);
    const max = Math.max(...points.map(point => point.value), 1);
    target.replaceChildren();
    points.forEach(point => {
      const column = document.createElement('div'); column.className = 'chart-col';
      const area = document.createElement('div'); area.className = 'chart-bar-area';
      const bar = document.createElement('div'); bar.className = 'chart-bar'; bar.style.height = `${Math.max(point.value / max * 118, 3)}px`; bar.title = `${point.label}: ${point.value}`;
      const value = document.createElement('span'); value.className = 'chart-value'; value.textContent = String(point.value); bar.appendChild(value);
      const label = document.createElement('span'); label.className = 'chart-label'; label.textContent = point.label; label.title = point.label;
      area.appendChild(bar); column.append(area, label); target.appendChild(column);
    });
    const total = document.createElement('p'); total.className = 'chart-total'; total.textContent = `${points.reduce((sum, point) => sum + point.value, 0).toLocaleString()} total`; target.appendChild(total);
  }

  async function loadSummary() {
    const data = await request('/api/admin/dashboard/summary');
    const totals = data.totals;
    document.getElementById('total-users').textContent = totals.users.toLocaleString();
    document.getElementById('active-users').textContent = totals.activeUsers.toLocaleString();
    document.getElementById('suspended-users').textContent = totals.suspendedUsers.toLocaleString();
    document.getElementById('content-items').textContent = totals.contentItems.toLocaleString();
    renderChart('registration-chart', data.charts.registrations);
    renderChart('activity-chart', data.charts.lastActive);
    const activity = document.getElementById('recent-activity');
    activity.innerHTML = data.recentActivity.length
      ? data.recentActivity.map(user => `<li><strong>${escapeHtml(user.name || user.username)}</strong><span>${escapeHtml(user.email)} · ${escapeHtml(formatDate(user.lastLogin))}</span></li>`).join('')
      : '<li class="empty">No sign-ins recorded yet.</li>';
  }

  async function loadUsers() {
    const params = new URLSearchParams({ page: String(state.page), limit: '20' });
    ['search', 'role', 'status'].forEach(key => {
      const value = document.getElementById(key).value.trim();
      if (value) params.set(key, value);
    });
    const data = await request(`/api/admin/dashboard/users?${params}`);
    state.pages = data.pagination.pages;
    document.getElementById('user-count').textContent = `${data.pagination.total.toLocaleString()} registered user${data.pagination.total === 1 ? '' : 's'}`;
    document.getElementById('users-table').innerHTML = data.users.length
      ? data.users.map(user => `<tr><td><strong>${escapeHtml(user.name || user.username)}</strong><span>@${escapeHtml(user.username)} · ${escapeHtml(user.email)}</span></td><td><span class="badge ${escapeHtml(user.role)}">${escapeHtml(user.role)}</span></td><td><span class="badge ${escapeHtml(user.accountStatus)}">${escapeHtml(user.accountStatus)}</span></td><td>${escapeHtml(formatDate(user.lastLogin))}</td><td><button class="button manage" type="button" data-user="${escapeHtml(JSON.stringify(user))}" aria-label="Manage ${escapeHtml(user.name || user.username)}"><i data-lucide="user-round-cog" aria-hidden="true"></i>Manage</button></td></tr>`).join('')
      : '<tr><td colspan="5" class="empty">No users match these filters.</td></tr>';
    document.getElementById('page-info').textContent = `Page ${data.pagination.page} of ${data.pagination.pages}`;
    document.getElementById('previous').disabled = state.page <= 1;
    document.getElementById('next').disabled = state.page >= state.pages;
    refreshIcons();
  }

  async function boot() {
    try {
      const me = await request('/api/me');
      if (!me.loggedIn) throw Object.assign(new Error('Please sign in with an administrator account.'), { status: 401 });
      if (!['admin', 'content-admin'].includes(me.role) || me.accountStatus !== 'active') throw Object.assign(new Error('This dashboard is available to active administrator accounts only.'), { status: 403 });
      await Promise.all([loadSummary(), loadUsers()]);
      document.getElementById('dashboard').hidden = false;
      setNotice('');
    } catch (error) {
      setNotice(error.message || 'Unable to load dashboard.', true);
      if (error.status === 401) setTimeout(() => { location.href = '/pages/auth.html'; }, 1200);
    }
  }

  document.getElementById('filters').addEventListener('submit', event => {
    event.preventDefault(); state.page = 1; loadUsers().catch(error => setNotice(error.message, true));
  });
  document.getElementById('previous').addEventListener('click', () => { state.page -= 1; loadUsers().catch(error => setNotice(error.message, true)); });
  document.getElementById('next').addEventListener('click', () => { state.page += 1; loadUsers().catch(error => setNotice(error.message, true)); });
  document.getElementById('quick-search').addEventListener('input', event => {
    document.getElementById('search').value = event.target.value;
    state.page = 1;
    clearTimeout(state.searchTimer);
    state.searchTimer = setTimeout(() => loadUsers().catch(error => setNotice(error.message, true)), 250);
  });
  document.getElementById('users-table').addEventListener('click', event => {
    const button = event.target.closest('.manage');
    if (!button) return;
    try { state.selected = JSON.parse(button.dataset.user); }
    catch { setNotice('Unable to load this user record.', true); return; }
    document.getElementById('manage-name').textContent = `Manage ${state.selected.name || state.selected.username}`;
    document.getElementById('manage-email').textContent = state.selected.email;
    document.getElementById('manage-role').value = state.selected.role;
    document.getElementById('manage-status').value = state.selected.accountStatus;
    document.getElementById('manage-user').showModal();
  });
  document.getElementById('manage-form').addEventListener('submit', async event => {
    if (event.submitter?.value === 'cancel') return;
    event.preventDefault();
    const button = document.getElementById('save-user'); button.disabled = true;
    try {
      await request(`/api/admin/dashboard/users/${encodeURIComponent(state.selected.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ role: document.getElementById('manage-role').value, accountStatus: document.getElementById('manage-status').value })
      });
      document.getElementById('manage-user').close(); setNotice('User updated.');
      await Promise.all([loadUsers(), loadSummary()]);
    } catch (error) { setNotice(error.message, true); }
    finally { button.disabled = false; }
  });
  document.getElementById('sign-out').addEventListener('click', async () => {
    try { await request('/api/logout', { method: 'POST' }); }
    catch (error) { setNotice(error.message, true); }
    finally { location.href = '/pages/auth.html'; }
  });

  const sidebar = document.getElementById('sidebar');
  const menuButton = document.getElementById('menu-button');
  const mobileOverlay = document.getElementById('mobile-overlay');
  function closeMenu() { sidebar.classList.remove('open'); mobileOverlay.classList.remove('show'); menuButton.setAttribute('aria-expanded', 'false'); }
  menuButton.addEventListener('click', () => {
    const open = sidebar.classList.toggle('open');
    mobileOverlay.classList.toggle('show', open);
    menuButton.setAttribute('aria-expanded', String(open));
  });
  mobileOverlay.addEventListener('click', closeMenu);
  refreshIcons();
  boot();
}());

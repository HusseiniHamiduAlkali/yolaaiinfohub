(function () {
  const state = { records: [], selected: null };
  const languages = ['en', 'ha', 'ff', 'yo', 'ig', 'pcm', 'ar', 'fr'];
  const $ = id => document.getElementById(id);

  function apiBase() {
    return typeof window.getApiBase === 'function' ? window.getApiBase() : (window.API_BASE || 'http://localhost:4000');
  }

  function setStatus(message, type = '') {
    const element = $('status');
    element.textContent = message || '';
    element.className = `status ${type}`.trim();
  }

  async function request(url, options = {}) {
    const response = await fetch(`${apiBase()}${url}`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
    return data;
  }

  function localizedJson(values) {
    return JSON.stringify(Object.fromEntries(languages.map(language => [language, values?.[language] || '']).filter(([, value]) => value)), null, 2);
  }

  function parseJsonField(id, fallback) {
    const raw = $(id).value.trim();
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') throw new Error(`${id} must contain a JSON object or array`);
    return parsed;
  }

  function clearForm() {
    state.selected = null;
    $('record-id').value = '';
    $('editor-title').textContent = 'New school';
    $('school-form').reset();
    $('published').checked = true;
    $('sort-order').value = '0';
    $('titles-json').value = '';
    $('summaries-json').value = '';
    $('sections-json').value = '';
    $('delete-record').hidden = true;
  }

  function fillForm(record) {
    state.selected = record;
    $('record-id').value = record._id || '';
    $('editor-title').textContent = record.title?.en || 'Edit school';
    $('slug').value = record.slug || '';
    $('image').value = record.image || '';
    $('title-en').value = record.title?.en || '';
    $('summary-en').value = record.summary?.en || '';
    $('tags').value = (record.tags || []).join(', ');
    $('sort-order').value = record.sortOrder || 0;
    $('published').checked = record.published !== false;
    $('titles-json').value = localizedJson(record.title);
    $('summaries-json').value = localizedJson(record.summary);
    $('sections-json').value = JSON.stringify(record.sections || [], null, 2);
    $('delete-record').hidden = false;
  }

  function renderRecords() {
    const container = $('records');
    if (!state.records.length) {
      container.innerHTML = '<p class="muted">No school records found.</p>';
      return;
    }
    container.innerHTML = state.records.map(record => `
      <button class="record ${state.selected?._id === record._id ? 'active' : ''}" data-record-id="${record._id}" type="button">
        <strong>${escapeHtml(record.title?.en || record.slug)}</strong>
        <span>${record.published ? 'Published' : 'Draft'} · ${escapeHtml(record.slug)}</span>
      </button>`).join('');
    container.querySelectorAll('[data-record-id]').forEach(button => {
      button.addEventListener('click', () => {
        const record = state.records.find(item => item._id === button.dataset.recordId);
        if (record) { fillForm(record); renderRecords(); }
      });
    });
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
  }

  async function loadRecords() {
    try {
      const data = await request('/api/admin/content/schools');
      state.records = data.items || [];
      renderRecords();
      setStatus(`Loaded ${state.records.length} school records.`, 'success');
    } catch (error) {
      setStatus(`${error.message}. Log in with a content-admin account first.`, 'error');
      $('records').innerHTML = '<p class="muted">Administrator access is required.</p>';
    }
  }

  $('new-record').addEventListener('click', () => { clearForm(); renderRecords(); });
  $('reset-form').addEventListener('click', () => state.selected ? fillForm(state.selected) : clearForm());
  $('school-form').addEventListener('submit', async event => {
    event.preventDefault();
    try {
      const titles = parseJsonField('titles-json', {});
      const summaries = parseJsonField('summaries-json', {});
      titles.en = $('title-en').value.trim();
      summaries.en = $('summary-en').value.trim();
      const payload = {
        category: 'school',
        slug: $('slug').value.trim(),
        title: titles,
        summary: summaries,
        tagline: { en: '' },
        image: $('image').value.trim(),
        sections: parseJsonField('sections-json', []),
        tags: $('tags').value.split(',').map(value => value.trim()).filter(Boolean),
        published: $('published').checked,
        sortOrder: Number($('sort-order').value) || 0
      };
      const id = $('record-id').value;
      await request(id ? `/api/admin/content/schools/${encodeURIComponent(id)}` : '/api/admin/content/schools', {
        method: id ? 'PUT' : 'POST',
        body: JSON.stringify(payload)
      });
      setStatus('School saved successfully.', 'success');
      await loadRecords();
    } catch (error) {
      setStatus(error.message, 'error');
    }
  });

  $('delete-record').addEventListener('click', async () => {
    const id = $('record-id').value;
    if (!id || !window.confirm('Delete this school record permanently?')) return;
    try {
      await request(`/api/admin/content/schools/${encodeURIComponent(id)}`, { method: 'DELETE' });
      clearForm();
      await loadRecords();
      setStatus('School deleted.', 'success');
    } catch (error) {
      setStatus(error.message, 'error');
    }
  });

  loadRecords();
}());

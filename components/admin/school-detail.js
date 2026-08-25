(function () {
  const languageMap = { en: 'en', ha: 'ha', ff: 'ff', yo: 'yo', ig: 'ig', pcm: 'pcm', ar: 'ar', fr: 'fr' };
  const detailRoot = document.getElementById('school-detail');

  function apiBase() {
    return typeof window.getApiBase === 'function' ? window.getApiBase() : (window.API_BASE || 'http://localhost:4000');
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>'"]/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[character]));
  }

  function renderSchool(school, language) {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.title = `${school.title} | Yola AI Info Hub`;
    detailRoot.innerHTML = `
      <a class="back-button" href="index.html">Back to Education</a>
      <header>
        ${school.image ? `<div class="logo-container"><img src="${escapeHtml(school.image)}" alt="${escapeHtml(school.title)}"></div>` : ''}
        <h1>${escapeHtml(school.title)}</h1>
        ${school.tagline ? `<p>${escapeHtml(school.tagline)}</p>` : ''}
      </header>
      ${school.summary ? `<section><h2>About</h2><p>${escapeHtml(school.summary)}</p></section>` : ''}
      ${(school.sections || []).map(section => `
        <section>
          ${section.heading ? `<h2>${escapeHtml(section.heading)}</h2>` : ''}
          ${section.body ? `<p>${escapeHtml(section.body)}</p>` : ''}
          ${section.items && section.items.length ? `<ul>${section.items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''}
        </section>`).join('')}
      ${school.location && (school.location.address || school.location.lga || school.location.state) ? `
        <section><h2>Location</h2><p>${escapeHtml([school.location.address, school.location.lga, school.location.state].filter(Boolean).join(', '))}</p></section>` : ''}
    `;
  }

  async function loadSchool() {
    const slug = new URLSearchParams(window.location.search).get('slug');
    const language = languageMap[(localStorage.getItem('appLanguage') || 'en').toLowerCase()] || 'en';
    if (!slug) {
      detailRoot.innerHTML = '<p>School not found.</p>';
      return;
    }

    try {
      const response = await fetch(`${apiBase()}/api/content/schools/${encodeURIComponent(slug)}?language=${language}`);
      const data = await response.json();
      if (!response.ok || !data.item) throw new Error(data.error || 'School not found');
      renderSchool(data.item, language);
    } catch (error) {
      detailRoot.innerHTML = `<p>${escapeHtml(error.message || 'Unable to load school details.')}</p><p><a href="index.html">Return to Education</a></p>`;
    }
  }

  loadSchool();
}());

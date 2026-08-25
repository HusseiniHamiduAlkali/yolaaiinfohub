// eduinfo.js

// Load common AI utilities first
if (!window.commonAILoaded) {
  const script = document.createElement('script');
  script.src = 'scripts/commonAI.js';
  script.onload = () => { window.commonAILoaded = true; };
  document.head.appendChild(script);
}

window.renderSection = function() {
    return fetch('templates/edu.html').then(r => r.text()).then(html => {
        document.getElementById('main-content').innerHTML = html;
    loadDatabaseSchools();
        
      // Scroll reveal for service cards in the servi template
      if ('IntersectionObserver' in window) {
        const revealCards = document.querySelectorAll('.section4');
        let lastScrollY = window.scrollY || document.documentElement.scrollTop || 0;
        let scrollDirection = 'down';

        window.addEventListener('scroll', () => {
          const currentY = window.scrollY || document.documentElement.scrollTop || 0;
          if (currentY > lastScrollY) {
            scrollDirection = 'down';
          } else if (currentY < lastScrollY) {
            scrollDirection = 'up';
          }
          lastScrollY = currentY;
        }, { passive: true });

        if (revealCards.length) {
          const cardObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
              if (entry.isIntersecting) {
                entry.target.classList.remove('hiding');
                entry.target.classList.add('showing');
                if (scrollDirection === 'up') {
                  entry.target.classList.add('instant');
                  requestAnimationFrame(() => entry.target.classList.remove('instant'));
                }
              } else if (scrollDirection === 'down') {
                entry.target.classList.add('hiding');
                entry.target.classList.remove('showing');
              }
            });
          }, { threshold: 0.2 });
          revealCards.forEach(card => cardObserver.observe(card));
        }
      }

    }).catch(err => {
        console.error('Failed to load home template:', err);
        document.getElementById('main-content').innerHTML = '<p>Failed to load content.</p>';
    });
};

function escapeSchoolHtml(value) {
  return String(value || '').replace(/[&<>'"]/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[character]));
}

function getSchoolApiBase() {
  return typeof window.getApiBase === 'function' ? window.getApiBase() : (window.API_BASE || 'http://localhost:4000');
}

async function loadDatabaseSchools() {
  const schoolSection = document.querySelector('[data-category="Schools"]');
  if (!schoolSection) return;

  const language = (typeof window.getAppLanguage === 'function' && window.getAppLanguage()) || 'en';
  try {
    const response = await fetch(`${getSchoolApiBase()}/api/content/schools?language=${encodeURIComponent(language)}`, { credentials: 'include' });
    if (!response.ok) return;
    const data = await response.json();
    if (!Array.isArray(data.items) || !data.items.length) return;

    const container = schoolSection.querySelector('.section4-container');
    if (!container) return;
    container.innerHTML = data.items.map(school => `
      <article class="section4" data-school-slug="${escapeSchoolHtml(school.slug)}">
        <div class="img-placeholder section4-with-padding">
          ${school.image ? `<img src="${escapeSchoolHtml(school.image)}" alt="${escapeSchoolHtml(school.title)}" loading="lazy">` : ''}
        </div>
        <div class="card-body">
          <h3>${escapeSchoolHtml(school.title)}</h3>
          <p>${escapeSchoolHtml(school.summary)}</p>
          <a data-i18n="learn_more" href="school.html?slug=${encodeURIComponent(school.slug)}">Learn more →</a>
        </div>
      </article>`).join('');

    schoolSection.dataset.databaseLoaded = 'true';
    if (typeof window.i18n?.applyTranslations === 'function') {
      window.i18n.applyTranslations(schoolSection);
    }
  } catch (error) {
    console.warn('Database schools unavailable; keeping static school cards:', error);
  }
}

// Register Section Initialization
function ensureEduSectionInit() {
  if (typeof window.registerSectionInit === 'function' && typeof window.initEduInfo === 'function') {
    window.registerSectionInit('eduinfo', window.initEduInfo);
  } else {
    setTimeout(ensureEduSectionInit, 100);
  }
}
ensureEduSectionInit();


// Load common AI utilities first
if (!window.commonAILoaded) {
  const script = document.createElement('script');
  script.src = 'scripts/commonAI.js';
  script.onload = () => { window.commonAILoaded = true; };
  document.head.appendChild(script);
}

window.renderServiSection = function() {
  if (typeof ensureNavbarLoaded === 'function') {
    try { ensureNavbarLoaded(); } catch (e) { console.warn('ensureNavbarLoaded() threw:', e); }
  } else {
    console.warn('ensureNavbarLoaded is not defined; continuing without it.');
  }
  if (!document.getElementById('global-css')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'styles/global.css';
    link.id = 'global-css';
    document.head.appendChild(link);
  }

  document.body.removeAttribute('data-servi-directory-init');

  return fetch('templates/servi.html').then(r => r.text()).then(html => {
    document.getElementById('main-content').innerHTML = html;

    if (window.initServiFilters) {
      window.initServiFilters();
    }

    if ('IntersectionObserver' in window) {
      const revealCards = document.querySelectorAll('.section4, .pro-card');
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
    console.error('Failed to load servi template:', err);
    document.getElementById('main-content').innerHTML = '<p>Failed to load content.</p>';
  });
};
// Also expose as the generic renderSection so the SPA router works when this
// script is dynamically injected (at which point it will overwrite any stale value).
window.renderSection = window.renderServiSection;



function initializeServiDirectory() {
  "use strict";

  if (document.body.getAttribute('data-servi-directory-init') === 'true') {
    return true;
  }
  document.body.setAttribute('data-servi-directory-init', 'true');

  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  document.querySelectorAll('.avatar img').forEach(function (img) {
    if (img.dataset.fallbackBound === 'true') return;
    img.dataset.fallbackBound = 'true';
    img.addEventListener('error', function () {
      var holder = img.parentElement;
      var name = holder && holder.getAttribute('data-initials') || (img.alt || '?');
      if (!holder) return;
      holder.textContent = name
        .split(/\s+/).filter(Boolean).slice(0, 2)
        .map(function (w) { return w[0].toUpperCase(); }).join('');
    });
  });

  var joinForm = document.getElementById('joinForm');
  if (joinForm) {
    var success = document.getElementById('joinSuccess');
    joinForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var valid = true;

      joinForm.querySelectorAll('[required]').forEach(function (field) {
        var wrap = field.closest('.form-field');
        var err = wrap ? wrap.querySelector('.form-error') : null;
        var ok = field.checkValidity() && field.value.trim() !== '';
        if (wrap) wrap.classList.toggle('invalid', !ok);
        if (err) err.textContent = ok ? '' : (field.validationMessage || 'This field is required.');
        if (!ok && valid) { field.focus(); }
        if (!ok) valid = false;
      });

      if (!valid) { if (success) success.hidden = true; return; }
      if (success) {
        success.hidden = false;
        success.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      joinForm.reset();
    });

    joinForm.querySelectorAll('input, select, textarea').forEach(function (field) {
      field.addEventListener('input', function () {
        var wrap = field.closest('.form-field');
        if (wrap && wrap.classList.contains('invalid') && field.value.trim() !== '') {
          wrap.classList.remove('invalid');
          var err = wrap.querySelector('.form-error');
          if (err) err.textContent = '';
        }
      });
    });
  }

  var chips = Array.prototype.slice.call(document.querySelectorAll('.chip-rail .chip'));
  var sectionGroups = Array.prototype.slice.call(document.querySelectorAll('.section3'));
  var grid = document.getElementById('proGrid');
  var searchInputs = [document.getElementById('qInput'), document.getElementById('qInputM')].filter(Boolean);
  var areaSelects = [document.getElementById('areaSelect'), document.getElementById('areaSelectM')].filter(Boolean);
  var searchInput = searchInputs[0];
  var areaSelect = areaSelects[0];
  var sortSelect = document.getElementById('sortSelect');
  var ratingSelect = document.getElementById('ratingSelect');
  var openOnly = document.getElementById('openOnly');
  var verifiedOnly = document.getElementById('verifiedOnly');
  var noResults = document.getElementById('noResults');
  var countEl = document.getElementById('resultCount');
  var searchForms = [document.getElementById('searchForm'), document.getElementById('searchFormM')].filter(Boolean);
  var currentCategory = 'All';

  function syncSearchInputs(value) {
    searchInputs.forEach(function (input) {
      input.value = value;
    });
  }

  function syncAreaInputs(value) {
    areaSelects.forEach(function (select) {
      select.value = value;
    });
  }

  function normalizeCategory(value) {
    return (value || 'All').toString().trim();
  }

  function getSearchText(node) {
    if (!node) return '';
    var text = [
      node.getAttribute('data-name') || '',
      node.getAttribute('data-role') || '',
      node.getAttribute('data-tags') || '',
      node.getAttribute('data-area') || '',
      node.getAttribute('data-category') || '',
      node.textContent || ''
    ].join(' ');
    return text.toLowerCase();
  }

  function ensureServiMeta() {
    var categoryNames = chips.map(function (chip) {
      return normalizeCategory(chip.getAttribute('data-filter'));
    }).filter(Boolean);

    sectionGroups.forEach(function (group) {
      var groupCategory = normalizeCategory(group.getAttribute('data-category'));
      if (!groupCategory || groupCategory === 'All') {
        var heading = group.querySelector('.section3-title, h3, h2');
        if (heading && heading.textContent) {
          group.setAttribute('data-category', heading.textContent.trim());
        }
      }

      Array.prototype.slice.call(group.querySelectorAll('.section4')).forEach(function (item) {
        var itemCategory = normalizeCategory(item.getAttribute('data-category'));
        if (!itemCategory || itemCategory === 'All') {
          var fallbackCategory = normalizeCategory(group.getAttribute('data-category'));
          item.setAttribute('data-category', fallbackCategory || categoryNames[0] || 'All');
        }
      });
    });

    if (grid) {
      Array.prototype.slice.call(grid.querySelectorAll('.pro-card')).forEach(function (card) {
        var cardCategory = normalizeCategory(card.getAttribute('data-category'));
        if (!cardCategory || cardCategory === 'All') {
          var inferred = card.getAttribute('data-category') || card.getAttribute('data-role') || 'All';
          card.setAttribute('data-category', inferred);
        }
      });
    }
  }

  function getCardText(card) {
    return getSearchText(card);
  }

  function applySectionFilters() {
    if (!sectionGroups.length) return;

    ensureServiMeta();

    sectionGroups.forEach(function (group) {
      var groupCategory = normalizeCategory(group.getAttribute('data-category'));
      var shouldShowGroup = currentCategory === 'All' || groupCategory === currentCategory;
      var visibleSectionItems = 0;

      Array.prototype.slice.call(group.querySelectorAll('.section4')).forEach(function (item) {
        var itemCategory = normalizeCategory(item.getAttribute('data-category') || groupCategory || 'All');
        var q = (searchInput && searchInput.value ? searchInput.value : '').trim().toLowerCase();
        var chosenArea = areaSelect ? areaSelect.value : 'All';
        var matchesCategory = currentCategory === 'All' || itemCategory === currentCategory;
        var matchesSearch = !q || getSearchText(item).indexOf(q) !== -1;
        var matchesArea = chosenArea === 'All' || normalizeCategory(item.getAttribute('data-area')) === chosenArea;
        var matchesItem = matchesCategory && matchesSearch && matchesArea;

        item.hidden = !matchesItem;
        if (matchesItem) visibleSectionItems += 1;
      });

      group.hidden = !shouldShowGroup || visibleSectionItems === 0;
    });
  }

  function applyProfessionalFilters() {
    if (!grid) return [];

    var cards = Array.prototype.slice.call(grid.querySelectorAll('.pro-card'));
    var q = (searchInput && searchInput.value ? searchInput.value : '').trim().toLowerCase();
    var chosenArea = areaSelect ? areaSelect.value : 'All';
    var minRating = ratingSelect ? parseFloat(ratingSelect.value || '0') : 0;
    var visibleCards = [];

    cards.forEach(function (card) {
      var cardCategory = normalizeCategory(card.getAttribute('data-category'));
      if (!cardCategory || cardCategory === 'All') {
        card.setAttribute('data-category', currentCategory === 'All' ? 'All' : currentCategory);
      }

      var matchesCategory = currentCategory === 'All' || normalizeCategory(card.getAttribute('data-category')) === currentCategory;
      var matchesSearch = !q || getCardText(card).indexOf(q) !== -1;
      var matchesArea = chosenArea === 'All' || normalizeCategory(card.getAttribute('data-area')) === chosenArea;
      var matchesRating = parseFloat(card.getAttribute('data-rating') || '0') >= minRating;
      var matchesOpen = !openOnly || !openOnly.checked || normalizeCategory(card.getAttribute('data-open')) === 'true';
      var matchesVerified = !verifiedOnly || !verifiedOnly.checked || normalizeCategory(card.getAttribute('data-verified')) === 'true';

      var isVisible = matchesCategory && matchesSearch && matchesArea && matchesRating && matchesOpen && matchesVerified;
      card.hidden = !isVisible;
      if (isVisible) visibleCards.push(card);
    });

    if (sortSelect) {
      visibleCards.sort(function (a, b) {
        var mode = sortSelect.value || 'rating';
        if (mode === 'reviews') return parseInt(b.getAttribute('data-reviews') || '0', 10) - parseInt(a.getAttribute('data-reviews') || '0', 10);
        if (mode === 'experience') return parseInt(b.getAttribute('data-exp') || '0', 10) - parseInt(a.getAttribute('data-exp') || '0', 10);
        if (mode === 'newest') return parseInt(b.getAttribute('data-added') || '0', 10) - parseInt(a.getAttribute('data-added') || '0', 10);
        if (mode === 'name') return (a.getAttribute('data-name') || '').localeCompare(b.getAttribute('data-name') || '');
        return parseFloat(b.getAttribute('data-rating') || '0') - parseFloat(a.getAttribute('data-rating') || '0');
      });

      visibleCards.forEach(function (card) {
        grid.appendChild(card);
      });
    }

    if (countEl) {
      countEl.textContent = visibleCards.length + ' professional' + (visibleCards.length === 1 ? '' : 's') + ' found';
    }

    if (noResults) {
      noResults.hidden = visibleCards.length > 0;
    }

    return visibleCards;
  }

  function applyFilters() {
    ensureServiMeta();

    Array.prototype.slice.call(document.querySelectorAll('.pro-card, .section4')).forEach(function (item) {
      item.hidden = true;
    });

    applySectionFilters();
    applyProfessionalFilters();
  }

  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      chips.forEach(function (item) {
        item.setAttribute('aria-selected', 'false');
        item.classList.toggle('active', false);
      });
      chip.setAttribute('aria-selected', 'true');
      chip.classList.add('active');
      currentCategory = chip.getAttribute('data-filter') || 'All';
      applyFilters();
    });
  });

  searchInputs.forEach(function (input) {
    input.addEventListener('input', function () {
      syncSearchInputs(input.value);
      applyFilters();
    });
  });

  areaSelects.forEach(function (select) {
    select.addEventListener('change', function () {
      syncAreaInputs(select.value);
      applyFilters();
    });
  });

  [sortSelect, ratingSelect, openOnly, verifiedOnly].forEach(function (control) {
    if (control) {
      control.addEventListener('change', applyFilters);
    }
  });

  searchForms.forEach(function (form) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      applyFilters();
      var directorySection = document.getElementById('directory');
      if (directorySection) {
        directorySection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  applyFilters();

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (grid && (reduce || !('IntersectionObserver' in window))) {
    Array.prototype.slice.call(grid.querySelectorAll('.pro-card')).forEach(function (card) { card.classList.add('in'); });
  } else if (grid && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    Array.prototype.slice.call(grid.querySelectorAll('.pro-card')).forEach(function (card) { io.observe(card); });
  }

  return true;
}

window.initServiDirectory = initializeServiDirectory;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeServiDirectory);
} else {
  initializeServiDirectory();
}



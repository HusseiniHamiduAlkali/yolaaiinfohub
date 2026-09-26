(function () {
  'use strict';

  function apiBase() {
    return typeof window.getApiBase === 'function'
      ? window.getApiBase()
      : (window.API_BASE || 'http://localhost:4000');
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
    });
  }

  function categoryLabel(category) {
    return String(category || 'Others').replace(/_/g, ' ');
  }

  function groupKey(value) {
    return categoryLabel(value).trim().toLowerCase().replace(/\s+/g, ' ');
  }

  function normalizedCategory(item) {
    var values = [item && item.category, item && item.subcategory]
      .filter(Boolean)
      .map(function (value) { return String(value).trim().toLowerCase(); });
    return values.join(' ');
  }

  function rememberDirectoryPosition() {
    var main = document.getElementById('main-content');
    var windowScroll = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
    var mainScroll = main ? main.scrollTop || 0 : 0;
    sessionStorage.setItem('lastSection', 'naviinfo');
    sessionStorage.setItem('lastScrollMain', String(mainScroll));
    sessionStorage.setItem('lastScrollWindow', String(windowScroll));
    sessionStorage.setItem('lastScroll', String(mainScroll || windowScroll));
  }

  function bindDetailPositionSaving() {
    document.querySelectorAll('a[data-i18n="learn_more"]').forEach(function (link) {
      if (link.dataset.positionBound === 'true') return;
      link.dataset.positionBound = 'true';
      link.addEventListener('click', rememberDirectoryPosition);
    });
  }

  function isRestaurantRecord(item) {
    var searchable = [item && item.slug, item && item.displayName, item && item.category, item && item.subcategory]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    var restaurantSlugs = [
      'items7-restaurant', 'icecream-planet-yola', 'marwa-shawarma-and-grills-yola',
      'mevish-cafe', 'oasis-bakery-yola', 'uptown-exclusive-spot-yola',
      'yahuza-suya-spot-yola', 'chicken-cottage-yola'
    ];

    return restaurantSlugs.indexOf(String(item && item.slug || '').toLowerCase()) !== -1 ||
      /restaurant|cafe|bakery|shawarma|grill|suya|ice[ -]?cream|chicken cottage/.test(searchable);
  }

  function isPrimarySecondarySchool(item) {
    var searchable = [item && item.category, item && item.subcategory, item && item.displayName]
      .filter(Boolean).join(' ').toLowerCase().replace(/[&_/-]+/g, ' ');
    return /\b(schools?|primary|secondary|nursery|elementary|high school|grammar school|academy)\b/.test(searchable) &&
      !/\b(university|college of education|polytechnic|library|knowledge center)\b/.test(searchable);
  }

  function isUniversityRecord(item) {
    var searchable = [item && item.category, item && item.subcategory, item && item.displayName]
      .filter(Boolean).join(' ').toLowerCase().replace(/[&_/-]+/g, ' ');
    return /\b(universities|university|polytechnic|institute of technology)\b/.test(searchable) &&
      !/\b(school|library|knowledge center)\b/.test(searchable);
  }

  function isTechnicalInstitutionRecord(item) {
    var searchable = [item && item.category, item && item.subcategory, item && item.displayName]
      .filter(Boolean).join(' ').toLowerCase().replace(/[&_/-]+/g, ' ');
    return /\b(colleges?|polytechnics?|monotechnics?|college of health|health technology|nursing sciences?|legal studies|institute of technology)\b/.test(searchable) &&
      !/\b(university|primary school|secondary school|nursery|elementary|library|knowledge center)\b/.test(searchable);
  }

  function isLearningHubRecord(item) {
    var searchable = [item && item.category, item && item.subcategory, item && item.displayName]
      .filter(Boolean).join(' ').toLowerCase().replace(/[&_/-]+/g, ' ');
    return /\b(libraries?|library|knowledge centers?|learning centers?|learning hubs?|educational hubs?)\b/.test(searchable);
  }

  function healthcareDetailPage(item) {
    var category = [item && item.category, item && item.subcategory].filter(Boolean).join(' ').toLowerCase().replace(/[&_/-]+/g, ' ');
    var name = String(item && item.displayName || '').toLowerCase();
    var slug = String(item && item.slug || '').toLowerCase();
    var searchable = category + ' ' + name;
    if (/\b(university|universities|college|polytechnic|school|library|learning hub)\b/.test(searchable)) return null;
    if (/\b(pharmacy|pharmacies|chemist)\b/.test(searchable)) return '/components/naviinfo/details/pharmacy-details.html';
    if (/^(specialist-hospital-yola|adamawa-german-hospital-yola|meddy-specialists-clinic-yola|fortland-orthopaedic-hospital-yola|new-boshang-clinic-yola|galbose-specialists-clinic-yola|modibbo-adama-teaching-hospital-mauth-yola)$/.test(slug)) return '/components/naviinfo/details/secondary-healthcare-details.html';
    if (/^(yola-central-dispensary|valli-clinic-jimeta-yola|malamre-phcc-yola|bako-phcc-yola|yolde-pate-phcc-yola|bakari-mbamoi-phcc-yola|adarawo-phcc-yola|nana-asma-u-maternity-yola|karewa-phcc-yola)$/.test(slug)) return '/components/naviinfo/details/primary-healthcare-details.html';
    if (/\b(specialists?|hospital|teaching hospital)\b/.test(searchable)) return '/components/naviinfo/details/secondary-healthcare-details.html';
    if (/\b(phcc|primary healthcare|primary health|dispensary|maternity|clinic)\b/.test(searchable)) return '/components/naviinfo/details/primary-healthcare-details.html';
    if (/\bhealth\b/.test(category)) return '/components/naviinfo/details/primary-healthcare-details.html';
    return null;
  }

  function detailPageForCategory(item) {
    var normalized = normalizedCategory(item);

    if (!normalized) return null;
    if (isRestaurantRecord(item)) {
      return '/components/naviinfo/details/restaurant-details.html';
    }
    var healthcarePage = healthcareDetailPage(item);
    if (healthcarePage) return healthcarePage;
    if (isPrimarySecondarySchool(item)) {
      return '/components/naviinfo/details/primary-secondaryschool-details.html';
    }
    if (isTechnicalInstitutionRecord(item)) {
      return '/components/naviinfo/details/technical-institution-details.html';
    }
    if (isLearningHubRecord(item)) {
      return '/components/naviinfo/details/learning-hub-details.html';
    }
    if (isUniversityRecord(item)) {
      return '/components/naviinfo/details/university-details.html';
    }
    if (normalized === 'educational' || normalized === 'education' || normalized.indexOf('educational') !== -1 || normalized.indexOf('university') !== -1 || normalized.indexOf('college') !== -1 || normalized.indexOf('school') !== -1 || normalized.indexOf('library') !== -1) {
      return '/components/naviinfo/details/education-institution-details.html';
    }
    if (normalized === 'health' || normalized.indexOf('health') !== -1 || normalized.indexOf('hospital') !== -1 || normalized.indexOf('pharmacy') !== -1 || normalized.indexOf('phcc') !== -1 || normalized.indexOf('clinic') !== -1 || normalized.indexOf('specialist') !== -1) {
      return '/components/naviinfo/details/health-facility-details.html';
    }
    if (normalized === 'hotels' || normalized.indexOf('hotel') !== -1 || normalized.indexOf('hospitality') !== -1) {
      return '/components/naviinfo/details/hospitality-details.html';
    }
    return null;
  }

  function cardTemplate(item) {
    var imageHtml = item.image
      ? '<div class="img-placeholder place-img-placeholder"><img src="/' + escapeHtml(item.image).replace(/^\/+/, '') + '" alt="' + escapeHtml(item.displayName) + '" loading="lazy" onerror="this.style.display=\'none\'; this.parentElement.classList.add(\'empty\');" /></div>'
      : '<div class="img-placeholder place-img-placeholder empty"><span>' + escapeHtml((item.displayName || 'Y').slice(0, 2).toUpperCase()) + '</span></div>';

    var detailPage = detailPageForCategory(item);
    var learnMoreHref = detailPage ? detailPage + '?id=' + encodeURIComponent(item.slug) : '/navi/' + encodeURIComponent(item.slug);

    return '<article class="section4 hiding place-article" data-place-id="' + escapeHtml(item.slug) + '" data-lat="' + (item.coordinates && item.coordinates.lat != null ? item.coordinates.lat : '') + '" data-lng="' + (item.coordinates && item.coordinates.lng != null ? item.coordinates.lng : '') + '">' +
      '<div class="place-card-head">' + imageHtml +
      '<div class="card-body" style="padding: 8px !important; justify-content: center;">' +
      '<div class="place-meta"><div class="meta-item"><div class="meta-icon"><i class="fa fa-location-dot"></i></div>' + escapeHtml(item.area || 'Yola, Adamawa State') + '</div>' +
      '<div class="meta-item"><div class="meta-icon"><i class="fa fa-clock"></i></div>' + escapeHtml(item.openingHours || 'Hours vary') + '</div></div></div></div>' +
      '<div class="card-body"><h3>' + escapeHtml(item.displayName) + '</h3>' +
      '<p>' + escapeHtml(item.description || 'Location information for ' + item.displayName + '.') + '</p>' +
      '<div class="place-details-actions"><button class="action-btn map-btn" type="button" data-lat="' + (item.coordinates && item.coordinates.lat != null ? item.coordinates.lat : '') + '" data-lng="' + (item.coordinates && item.coordinates.lng != null ? item.coordinates.lng : '') + '" data-name="' + escapeHtml(item.displayName) + '"><i class="fas fa-route"></i>View on Map</button>' +
      '<a data-i18n="learn_more" href="' + learnMoreHref + '">Learn more →</a></div></div></article>';
  }

  function renderSections(items) {
    var groups = {};
    Array.prototype.forEach.call(document.querySelectorAll('.section3[data-category]'), function (group) {
      var key = groupKey(group.dataset.category || '');
      if (key) groups[key] = group;
      var container = group.querySelector('.section4-container');
      if (container) container.innerHTML = '';
    });

    (items || []).forEach(function (item) {
      var categoryKey = groupKey(item.category || 'Others');
      var subcategoryKey = groupKey(item.subcategory || '');
      var group = groups[subcategoryKey] || groups[categoryKey] || groups.others;
      if (!group) return;
      var container = group.querySelector('.section4-container');
      if (container) container.insertAdjacentHTML('beforeend', cardTemplate(item));
    });

    if (window.initializeSearchHandlers) window.initializeSearchHandlers();
    if (window.initYolaGoogleMap) window.initYolaGoogleMap();
    bindDetailPositionSaving();
  }

  function clearDatabaseBackedGroups() {
    var supportedGroups = [
      'universities', 'colleges', 'schools', 'religious', 'libraries',
      'phccs', 'specialists', 'teaching hospital', 'pharmacies', 'hotels', 'restaurants'
    ];
    Array.prototype.forEach.call(document.querySelectorAll('.section3[data-category]'), function (group) {
      if (supportedGroups.indexOf(groupKey(group.dataset.category || '')) === -1) return;
      var container = group.querySelector('.section4-container');
      if (!container) return;
      container.querySelectorAll('a[data-i18n="learn_more"]').forEach(function (link) {
        link.removeAttribute('href');
        link.setAttribute('aria-disabled', 'true');
        link.classList.add('database-link-pending');
      });
      container.innerHTML = '';
    });
  }

  function load() {
    bindDetailPositionSaving();
    clearDatabaseBackedGroups();
    return fetch(apiBase() + '/api/content/navigation-places?limit=200', { credentials: 'include' })
      .then(function (response) {
        if (!response.ok) throw new Error('Navigation place directory request failed');
        return response.json();
      })
      .then(function (data) {
        renderSections((data && data.items) || []);
        return true;
      })
      .catch(function (error) {
        console.error('Unable to load database-backed NaviInfo directory:', error);
        return false;
      });
  }

  window.loadNaviDirectory = load;
}());

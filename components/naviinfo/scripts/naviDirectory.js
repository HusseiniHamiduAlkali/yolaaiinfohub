(function () {
  'use strict';

  function apiBases() {
    if (Array.isArray(window.API_BASE_CANDIDATES) && window.API_BASE_CANDIDATES.length) {
      return window.API_BASE_CANDIDATES.slice();
    }
    var current = typeof window.getApiBase === 'function' ? window.getApiBase() : (window.API_BASE || '');
    var candidates = [current];
    var host = window.location.hostname || 'localhost';
    if (/^(localhost|127\.0\.0\.1|0\.0\.0\.0|::1)$/.test(host)) {
      [4002, 4001, 4000, 3000].forEach(function (port) { candidates.push('http://' + host + ':' + port); });
    }
    return candidates.filter(function (base, index) { return base && candidates.indexOf(base) === index; });
  }

  function fetchDirectory() {
    var candidates = apiBases();
    var index = 0;
    function tryNext(lastError) {
      if (index >= candidates.length) return Promise.reject(lastError || new Error('Navigation API unavailable'));
      var base = candidates[index++];
      return fetch(base + '/api/content/navigation-places?limit=200', { credentials: 'include' }).then(function (response) {
        if (!response.ok) throw new Error('Navigation place directory request failed');
        if (base) window.API_BASE = base;
        return response.json();
      }).catch(tryNext);
    }
    return tryNext();
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
    var values = [item && item.category, item && item.subcategory, item && item.displayName, item && item.slug]
      .filter(Boolean)
      .map(function (value) { return String(value).trim().toLowerCase().replace(/[&_/-]+/g, ' '); });
    return values.join(' ');
  }

  function bindStaticDetailLinks() {
    document.querySelectorAll('.section3[data-category] article[data-place-id]').forEach(function (article) {
      var group = article.closest('.section3[data-category]');
      var title = article.querySelector('h3');
      var category = group && (group.dataset.detailCategory || group.dataset.category) || '';
      var page = detailPageForCategory({ category: category, subcategory: category, displayName: title && title.textContent, slug: article.dataset.placeId });
      var link = article.querySelector('a[data-i18n="learn_more"]');
      if (!link) return;
      if (!page) {
        link.href = '/navi/' + encodeURIComponent(article.dataset.placeId);
        return;
      }
      var meta = article.querySelectorAll('.place-meta .meta-item');
      var image = article.querySelector('.place-img-placeholder img');
      var description = article.querySelector('.card-body p');
      var params = new URLSearchParams();
      params.set('id', article.dataset.placeId);
      params.set('name', title ? title.textContent.trim() : '');
      params.set('category', category);
      params.set('description', description ? description.textContent.trim() : '');
      params.set('address', meta[0] ? meta[0].textContent.trim() : 'Yola, Adamawa State');
      params.set('area', meta[0] ? meta[0].textContent.trim() : 'Yola');
      params.set('openingHours', meta[1] ? meta[1].textContent.trim() : '');
      params.set('image', image ? image.getAttribute('src') || '' : '');
      if (article.dataset.lat) params.set('lat', article.dataset.lat);
      if (article.dataset.lng) params.set('lng', article.dataset.lng);
      link.href = page + '?' + params.toString();
    });
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
    var searchable = [item && item.slug, item && item.displayName]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    var restaurantSlugs = [
      'items7-restaurant', 'icecream-planet-yola', 'marwa-shawarma-and-grills-yola',
      'aun-hotel-jabbama-restaurant', 'mevish-cafe', 'oasis-bakery-yola', 'uptown-exclusive-spot-yola',
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
    var category = groupKey(item && item.category);

    if (!normalized) return null;
    if (/\b(flights?|airlines?|travel agents?|travel and tours)\b/.test(normalized)) {
      return '/components/naviinfo/details/flight-agents-details.html';
    }
    if (category === 'agents') return null;
    if (/\b(filling stations?|fuel stations?|petrol stations?)\b/.test(normalized)) {
      return '/components/naviinfo/details/filling-stations-details.html';
    }
    if (/\b(banks?|atms?)\b/.test(normalized)) {
      return '/components/naviinfo/details/banks-details.html';
    }
    if (isRestaurantRecord(item)) {
      return '/components/naviinfo/details/restaurant-details.html';
    }
    if (/\b(mosques?|masjids?|islamic centers?|islamic centres?)\b/.test(normalized)) {
      return '/components/naviinfo/details/mosque-details.html';
    }
    if (/\bchurch(es)?\b|\bcathedrals?\b|\bchapels?\b|catholic secreteriat|catholic secretariat/.test(normalized)) {
      return '/components/naviinfo/details/church-details.html';
    }
    if (/\b(judiciary|judicial|courts?)\b/.test(normalized)) {
      return '/components/naviinfo/details/judiciary-details.html';
    }
    if (/\b(commercial centers?|commercial centres?|markets?|shopping complexes?)\b/.test(normalized)) {
      return '/components/naviinfo/details/commercial-center-details.html';
    }
    if (/\b(event centers?|event centres?|event halls?)\b/.test(normalized)) {
      return '/components/naviinfo/details/event-centers.html';
    }
    if (category === 'parks' || category === 'green spaces' || /\b(green spaces?|parks?|recreation)\b/.test(normalized)) {
      return '/components/naviinfo/details/parks-recreation-details.html';
    }
    if (/\b(sports?|spa|wellness|gyms?)\b/.test(normalized)) {
      return '/components/naviinfo/details/sports-spa-details.html';
    }
    if (/\b(iconic structures?|landmarks?|flyovers?|roundabouts?|toll gates?)\b/.test(normalized)) {
      return '/components/naviinfo/details/iconic-structures.html';
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

  function detailHref(page, item) {
    var params = new URLSearchParams();
    params.set('id', item.slug || '');
    params.set('name', item.displayName || '');
    params.set('category', item.subcategory || item.category || 'NaviInfo listing');
    params.set('description', item.description || '');
    params.set('address', item.address || item.area || 'Yola, Adamawa State');
    params.set('area', item.area || 'Yola');
    params.set('openingHours', item.openingHours || '');
    params.set('image', item.image || item.heroImage || '');
    if (item.coordinates && item.coordinates.lat != null) params.set('lat', item.coordinates.lat);
    if (item.coordinates && item.coordinates.lng != null) params.set('lng', item.coordinates.lng);
    return page + '?' + params.toString();
  }

  function cardTemplate(item) {
    var imageHtml = item.image
      ? '<div class="img-placeholder place-img-placeholder"><img src="/' + escapeHtml(item.image).replace(/^\/+/, '') + '" alt="' + escapeHtml(item.displayName) + '" loading="lazy" onerror="this.style.display=\'none\'; this.parentElement.classList.add(\'empty\');" /></div>'
      : '<div class="img-placeholder place-img-placeholder empty"><span>' + escapeHtml((item.displayName || 'Y').slice(0, 2).toUpperCase()) + '</span></div>';

    var detailPage = detailPageForCategory(item);
    var learnMoreHref = detailPage ? detailHref(detailPage, item) : '/navi/' + encodeURIComponent(item.slug);

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
      var key = groupKey(group.dataset.detailCategory || group.dataset.category || '');
      if (key) groups[key] = group;
    });

    (items || []).forEach(function (item) {
      var categoryKey = groupKey(item.category || 'Others');
      var subcategoryKey = groupKey(item.subcategory || '');
      var searchable = normalizedCategory(item);
      var targetKey = /\b(banks?|atms?)\b/.test(searchable) ? 'banks' :
        /\b(filling stations?|fuel stations?|petrol stations?)\b/.test(searchable) ? 'filling stations' :
          /\b(flights?|airlines?|travel agents?|travel and tours)\b/.test(searchable) ? 'flights' :
            /\b(primary healthcare|phccs?)\b/.test(searchable) ? 'phccs' :
              /\b(secondary hospitals?|specialists?)\b/.test(searchable) ? 'specialists' :
                /\b(teaching hospital|tertiary hospital)\b/.test(searchable) ? 'teaching hospital' :
                  isRestaurantRecord(item) ? 'hotels' : '';
      var group = (targetKey && groups[targetKey]) || groups[subcategoryKey] || groups[categoryKey] || groups.others;
      if (!group) return;
      var container = group.querySelector('.section4-container');
      if (!container) return;
      var existing = Array.prototype.find.call(container.querySelectorAll('article[data-place-id]'), function (card) {
        return card.dataset.placeId === item.slug;
      });
      var holder = document.createElement('div');
      holder.innerHTML = cardTemplate(item);
      var nextCard = holder.firstElementChild;
      if (existing) existing.replaceWith(nextCard);
      else container.appendChild(nextCard);
    });

    if (window.initializeSearchHandlers) window.initializeSearchHandlers();
    if (window.initYolaGoogleMap) window.initYolaGoogleMap();
    bindDetailPositionSaving();
  }

  function load() {
    bindDetailPositionSaving();
    bindStaticDetailLinks();
    return fetchDirectory()
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

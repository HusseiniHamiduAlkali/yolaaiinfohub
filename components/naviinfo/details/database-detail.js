(function () {
  'use strict';

  var params = new URLSearchParams(window.location.search);
  var placeId = params.get('id') || params.get('slug');
  var page = location.pathname.toLowerCase();
  var pageType = page.indexOf('flight-agents-details') !== -1 ? 'Travel & flight services' :
    page.indexOf('filling-stations-details') !== -1 ? 'Filling station' : 'Bank & ATM';

  function escapeText(value) {
    return String(value == null ? '' : value).trim();
  }

  function apiBases() {
    if (Array.isArray(window.API_BASE_CANDIDATES) && window.API_BASE_CANDIDATES.length) {
      return window.API_BASE_CANDIDATES.slice();
    }
    var host = location.hostname || 'localhost';
    var current = typeof window.getApiBase === 'function' ? window.getApiBase() : (window.API_BASE || '');
    var candidates = [current];
    if (/^(localhost|127\.0\.0\.1|0\.0\.0\.0|::1)$/.test(host)) {
      [4002, 4001, 4000, 3000].forEach(function (port) {
        candidates.push('http://' + host + ':' + port);
      });
    }
    return candidates.filter(function (base, index) {
      return candidates.indexOf(base) === index;
    });
  }

  function fetchRecord() {
    var bases = apiBases();
    var index = 0;

    function next(lastError) {
      if (index >= bases.length) return Promise.reject(lastError || new Error('Navigation API unavailable'));
      var base = bases[index++];
      return fetch(base + '/api/content/navigation-places/' + encodeURIComponent(placeId), { credentials: 'include' })
        .then(function (response) {
          if (!response.ok) throw new Error(response.status === 404 ? 'Place not found' : 'Navigation API request failed');
          if (base) window.API_BASE = base;
          return response.json();
        })
        .then(function (payload) {
          return payload && payload.item ? payload.item : payload;
        })
        .catch(next);
    }

    return next();
  }

  function make(tag, className, value) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (value != null) node.textContent = value;
    return node;
  }

  function row(container, label, value, href) {
    if (!value) return;
    var item = make('div', 'record-row');
    item.appendChild(make('small', '', label));
    if (href) {
      var link = make('a', '', value);
      link.href = href;
      if (/^https?:/i.test(href)) {
        link.target = '_blank';
        link.rel = 'noopener';
      }
      item.appendChild(link);
    } else {
      item.appendChild(make('span', '', value));
    }
    container.appendChild(item);
  }

  function render(item) {
    var name = escapeText(item.displayName || 'Navigation place');
    var contact = item.contact || {};
    var coordinates = item.coordinates || {};
    var address = escapeText(item.address || item.area || '');
    var services = Array.isArray(item.services) ? item.services : [];
    var tags = Array.isArray(item.tags) ? item.tags : [];
    var hours = escapeText(item.openingHours || '');
    var mapQuery = coordinates.lat != null && coordinates.lng != null
      ? coordinates.lat + ',' + coordinates.lng
      : [name, address].filter(Boolean).join(' ');
    var mapUrl = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(mapQuery);
    var root = make('main', 'record-page');
    var header = make('header', 'record-header');
    var headerInner = make('div', 'record-wrap record-header-inner');
    var brand = make('a', 'record-brand', 'Yola AI Info Hub');
    brand.href = '/';
    var back = make('a', 'record-back', '← NaviInfo directory');
    back.href = '/?section=naviinfo';
    headerInner.append(brand, back);
    header.appendChild(headerInner);
    root.appendChild(header);

    var hero = make('section', 'record-hero');
    var heroInner = make('div', 'record-wrap record-hero-inner');
    var content = make('div', 'record-hero-copy');
    content.appendChild(make('p', 'record-eyebrow', escapeText(item.category || pageType)));
    content.appendChild(make('h1', '', name));
    content.appendChild(make('p', 'record-description', escapeText(item.description || 'More information has not been provided yet.')));
    var badges = make('div', 'record-badges');
    badges.appendChild(make('span', 'record-badge', escapeText(item.area || 'Yola')));
    if (item.status) badges.appendChild(make('span', 'record-badge', escapeText(item.status)));
    if (item.verificationStatus) badges.appendChild(make('span', 'record-badge', item.verificationStatus === 'verified' ? 'Verified' : 'Unverified'));
    content.appendChild(badges);
    var actions = make('div', 'record-actions');
    var directions = make('a', 'record-button record-button-primary', 'Get directions');
    directions.href = mapUrl;
    directions.target = '_blank';
    directions.rel = 'noopener';
    actions.appendChild(directions);
    if (contact.phone) {
      var call = make('a', 'record-button', 'Call');
      call.href = 'tel:' + String(contact.phone).replace(/[^+\d]/g, '');
      actions.appendChild(call);
    }
    if (contact.website) {
      var website = make('a', 'record-button', 'Website');
      website.href = /^https?:\/\//i.test(contact.website) ? contact.website : 'https://' + contact.website;
      website.target = '_blank';
      website.rel = 'noopener';
      actions.appendChild(website);
    }
    content.appendChild(actions);
    heroInner.appendChild(content);

    var imageUrl = escapeText(item.heroImage || item.image || '');
    if (/^(https?:\/\/|\/|Data\/)/i.test(imageUrl)) {
      var imageWrap = make('div', 'record-image-wrap');
      var image = make('img', 'record-image');
      image.src = imageUrl;
      image.alt = name;
      image.loading = 'eager';
      imageWrap.appendChild(image);
      heroInner.appendChild(imageWrap);
    }
    hero.appendChild(heroInner);
    root.appendChild(hero);

    var body = make('div', 'record-wrap record-content');
    var mainColumn = make('div', 'record-main-column');
    var sidebar = make('aside', 'record-sidebar');
    if (services.length || tags.length) {
      var serviceSection = make('section', 'record-section');
      serviceSection.appendChild(make('h2', '', services.length ? 'Services' : 'Highlights'));
      var serviceList = make('ul', 'record-list');
      (services.length ? services : tags).forEach(function (service) {
        serviceList.appendChild(make('li', '', escapeText(service)));
      });
      serviceSection.appendChild(serviceList);
      mainColumn.appendChild(serviceSection);
    }

    var locationSection = make('section', 'record-section');
    locationSection.appendChild(make('h2', '', 'Location'));
    if (address) locationSection.appendChild(make('p', '', address));
    if (coordinates.lat != null && coordinates.lng != null) {
      locationSection.appendChild(make('p', 'record-coordinates', coordinates.lat + ', ' + coordinates.lng));
    }
    var map = make('a', 'record-text-link', 'Open in Google Maps');
    map.href = mapUrl;
    map.target = '_blank';
    map.rel = 'noopener';
    locationSection.appendChild(map);
    mainColumn.appendChild(locationSection);

    if (hours) {
      var hoursSection = make('section', 'record-section');
      hoursSection.appendChild(make('h2', '', 'Opening hours'));
      hoursSection.appendChild(make('p', '', hours));
      sidebar.appendChild(hoursSection);
    }

    var contactSection = make('section', 'record-section');
    contactSection.appendChild(make('h2', '', 'Contact'));
    row(contactSection, 'Phone', escapeText(contact.phone), contact.phone ? 'tel:' + String(contact.phone).replace(/[^+\d]/g, '') : '');
    row(contactSection, 'Email', escapeText(contact.email), contact.email ? 'mailto:' + contact.email : '');
    row(contactSection, 'Website', escapeText(contact.website), contact.website ? (/^https?:\/\//i.test(contact.website) ? contact.website : 'https://' + contact.website) : '');
    if (contactSection.children.length > 1) sidebar.appendChild(contactSection);

    if (Array.isArray(item.galleryImages) && item.galleryImages.length) {
      var gallery = make('section', 'record-section');
      gallery.appendChild(make('h2', '', 'Photos'));
      var galleryGrid = make('div', 'record-gallery');
      item.galleryImages.forEach(function (source, index) {
        var url = escapeText(source);
        if (!/^(https?:\/\/|\/|Data\/)/i.test(url)) return;
        var image = make('img', '', '');
        image.src = url;
        image.alt = escapeText(item.galleryCaptions && item.galleryCaptions[index] || name);
        image.loading = 'lazy';
        galleryGrid.appendChild(image);
      });
      if (galleryGrid.children.length) {
        gallery.appendChild(galleryGrid);
        mainColumn.appendChild(gallery);
      }
    }

    body.append(mainColumn, sidebar);
    root.appendChild(body);
    document.title = name + ' — NaviInfo · Yola AI Info Hub';
    document.body.replaceChildren(root);
  }

  function emptyProfile() {
    if (pageType === 'Travel & flight services') {
      return { name: '', badge: '', location: '', verified: '', rating: '', description: '', svcStrip: [], facts: [], journey: [], destinations: [], tours: [], docs: [], whyUs: [], hours: [], contacts: [], ratingBars: [], reviews: [], faqs: [] };
    }
    if (pageType === 'Filling station') {
      return { name: '', badge: '', location: '', status: '', operating: '', prices: [], priceUpdated: '', availability: [], statusTiles: [], services: [], facilities: [], priceHistory: { days: [], values: [] }, safety: [], facts: [], mapInfo: [], nearby: [], ratingBars: [], reviews: [], contacts: { addr: '', phone: '', email: '' } };
    }
    return { name: '', badge: '', type: '', verified: '', description: '', qaTabs: [], overviewFacts: [], services: [], branch: [], atmFeatures: [], bankingHours: { days: [], customer: [], atm: [] }, branchServices: [], digital: [], security: [], mapInfo: [], contacts: [], nearby: [], faqs: [] };
  }

  function escapeProfile(value) {
    if (typeof value === 'string') {
      return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    if (Array.isArray(value)) return value.map(escapeProfile);
    if (value && typeof value === 'object') {
      var escaped = {};
      Object.keys(value).forEach(function (key) { escaped[key] = escapeProfile(value[key]); });
      return escaped;
    }
    return value;
  }

  function restoreText(id, value) {
    var node = document.getElementById(id);
    if (node) node.textContent = String(value == null ? '' : value);
  }

  function renderFromDatabase(item) {
    var profileKey = pageType === 'Travel & flight services' ? 'flightAgentProfile' :
      pageType === 'Filling station' ? 'fillingStationProfile' : 'bankProfile';
    var profile = Object.assign(emptyProfile(), item[profileKey] || {});
    var name = escapeText(profile.name || item.displayName || 'Navigation place');
    var locationText = escapeText(profile.location || item.address || item.area || '');
    profile.name = name;
    profile.location = locationText;
    profile.description = escapeText(profile.description || item.description || '');
    if (pageType === 'Filling station') {
      profile.contacts = Object.assign({ addr: '', phone: '', email: '' }, profile.contacts || {});
      profile.priceHistory = Object.assign({ days: [], values: [] }, profile.priceHistory || {});
    }
    if (pageType === 'Bank & ATM') {
      profile.bankingHours = Object.assign({ days: [], customer: [], atm: [] }, profile.bankingHours || {});
    }

    var safeProfile = escapeProfile(profile);
    if (typeof window.render !== 'function') throw new Error('Detail template renderer is unavailable');
    window.naviProfileLoaded = true;
    window.DATA = safeProfile;
    window.render(safeProfile);
    document.title = name + ' — NaviInfo · Yola AI Info Hub';

    if (pageType === 'Travel & flight services') {
      restoreText('mbName', name);
      restoreText('agentName', name);
      restoreText('agentLoc', locationText);
      restoreText('agentVer', profile.verified);
      restoreText('agentRating', profile.rating);
      restoreText('aboutText', profile.description);
      restoreText('footName', name);
      restoreText('footCopy', '\u00A9 ' + name);
      restoreText('mapLabel', locationText);
    } else if (pageType === 'Filling station') {
      restoreText('mbName', name);
      restoreText('stName', name);
      restoreText('stLoc', locationText);
      restoreText('dashBadge', profile.badge);
      restoreText('footName', name);
      restoreText('footCopy', '\u00A9 ' + name);
      restoreText('mapLabel', locationText);
      restoreText('priceUpdated', profile.priceUpdated);
    } else {
      restoreText('mbName', name);
      restoreText('mbType', profile.type);
      restoreText('bankName', name);
      restoreText('bankType', profile.type);
      restoreText('bankVerify', profile.verified);
      restoreText('corpLogo', profile.badge);
      restoreText('overviewText', profile.description);
      restoreText('footName', name);
      restoreText('footCopy', '\u00A9 ' + name);
      restoreText('mapLabel', name + ' — Yola Branch');
    }

    var loader = document.getElementById('loader');
    if (loader) loader.classList.add('hidden');
  }

  function renderError(error) {
    var root = make('main', 'record-error');
    var notFound = error && error.message === 'Place not found';
    document.title = (notFound ? 'Place not found' : 'Details unavailable') + ' — NaviInfo';
    root.appendChild(make('h1', '', notFound ? 'Place not found' : 'Details unavailable'));
    root.appendChild(make('p', '', notFound
      ? 'This place could not be found or is not published.'
      : 'We could not load this place right now. Please try again later.'));
    var back = make('a', 'record-button record-button-primary', 'Return to NaviInfo');
    back.href = '/?section=naviinfo';
    root.appendChild(back);
    document.body.replaceChildren(root);
  }

  function addStyles() {
    var style = document.createElement('style');
    style.textContent = '.record-page{min-height:100vh;background:#f3f1e8;color:#172b25;font:16px/1.65 "Plus Jakarta Sans",system-ui,sans-serif}.record-wrap{width:min(1120px,calc(100% - 40px));margin:auto}.record-header{background:#102d26;color:#fff}.record-header-inner{min-height:66px;display:flex;align-items:center;justify-content:space-between;gap:20px}.record-brand,.record-back{color:inherit;text-decoration:none}.record-brand{font-weight:700}.record-back{color:#e5ca7d;font-size:.9rem}.record-hero{background:linear-gradient(130deg,#12392e,#176b55);color:#fff}.record-hero-inner{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(240px,.8fr);gap:36px;align-items:center;padding:54px 0}.record-eyebrow{margin:0 0 8px;color:#e5ca7d;font-size:.76rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase}.record-hero h1{margin:0;font:700 clamp(2rem,5vw,3.7rem)/1.08 Georgia,serif}.record-description{max-width:66ch;color:#e1e9e4}.record-badges,.record-actions{display:flex;gap:9px;flex-wrap:wrap;margin-top:20px}.record-badge{border:1px solid #ffffff4d;border-radius:999px;padding:5px 11px;font-size:.78rem}.record-button{display:inline-flex;align-items:center;justify-content:center;min-height:42px;padding:9px 15px;border:1px solid #b7d2c4;border-radius:8px;color:#15372d;text-decoration:none;font-weight:700;background:#fff}.record-button-primary{border-color:#d3b45b;background:#d3b45b;color:#14271f}.record-image-wrap{height:260px;overflow:hidden;border-radius:12px;background:#ffffff1a}.record-image{width:100%;height:100%;object-fit:cover}.record-content{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(260px,.8fr);gap:22px;padding-top:28px;padding-bottom:60px}.record-main-column,.record-sidebar{display:grid;align-content:start;gap:18px}.record-section{padding:22px;background:#fff;border:1px solid #dce3dc;border-radius:8px}.record-section h2{margin:0 0 12px;color:#164c3b;font:700 1.25rem Georgia,serif}.record-section p{margin:0 0 10px}.record-list{margin:0;padding-left:20px;display:grid;gap:7px}.record-text-link{display:inline-block;margin-top:8px;color:#146448;font-weight:700}.record-coordinates{color:#5b7269;font-size:.85rem}.record-row{display:grid;gap:2px;padding:10px 0;border-top:1px solid #e5ebe5;overflow-wrap:anywhere}.record-row small{color:#60756b;text-transform:uppercase;font-size:.68rem;letter-spacing:.07em}.record-row a{color:#146448}.record-gallery{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.record-gallery img{width:100%;height:150px;object-fit:cover;border-radius:6px}.record-error{min-height:100vh;display:grid;align-content:center;justify-items:center;gap:12px;padding:24px;background:#f3f1e8;color:#172b25;text-align:center;font-family:system-ui,sans-serif}.record-error h1{margin:0;color:#164c3b}.record-error p{max-width:48ch}.record-error .record-button{margin-top:6px}@media(max-width:720px){.record-wrap{width:min(100% - 28px,600px)}.record-hero-inner,.record-content{grid-template-columns:1fr}.record-hero-inner{padding:36px 0;gap:20px}.record-image-wrap{height:210px}.record-content{padding-top:18px;padding-bottom:36px}.record-header-inner{min-height:58px}.record-back{font-size:.8rem}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important}}';
    document.head.appendChild(style);
  }

  if (!placeId) {
    renderError(new Error('Place not found'));
    return;
  }
  fetchRecord().then(renderFromDatabase).catch(renderError);
}());
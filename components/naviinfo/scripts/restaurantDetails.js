(function () {
  'use strict';

  var body = document.body;
  var esc = function (value) {
    var node = document.createElement('div');
    node.textContent = value == null ? '' : String(value);
    return node.innerHTML;
  };

  function apiBases() {
    if (window.API_BASE_CANDIDATES && window.API_BASE_CANDIDATES.length) return window.API_BASE_CANDIDATES.slice();
    if (typeof window.getApiBase === 'function') return [window.getApiBase()];
    if (window.API_BASE) return [window.API_BASE];
    if (/^(localhost|127\.0\.0\.1|0\.0\.0\.0|::1)$/.test(location.hostname)) {
      return [4000, 4001, 4002, 4003, 3000].map(function (port) { return 'http://' + (location.hostname || 'localhost') + ':' + port; });
    }
    return [''];
  }

  function fetchJson(path) {
    var bases = apiBases();
    var index = 0;
    function next(error) {
      if (index >= bases.length) return Promise.reject(error || new Error('API unavailable'));
      var base = bases[index++];
      return fetch(base + path, { credentials: 'include' }).then(function (response) {
        if (!response.ok) throw new Error('API request failed with status ' + response.status);
        return response.json();
      }).catch(next);
    }
    return next();
  }

  function normalize(raw, fallbackId) {
    var item = raw || {};
    var contact = item.contact || {};
    var galleryImages = Array.isArray(item.galleryImages) ? item.galleryImages.filter(Boolean) : [];
    var captions = Array.isArray(item.galleryCaptions) ? item.galleryCaptions.filter(Boolean) : [];
    var menuItems = Array.isArray(item.menuItems) ? item.menuItems.filter(function (menuItem) { return menuItem && (menuItem.name || menuItem.title); }) : [];
    return {
      id: item.slug || item.id || fallbackId || '',
      name: item.displayName || item.name || 'Restaurant',
      category: item.category || item.subcategory || 'Restaurant',
      description: item.description || 'Restaurant information is available from the business directly.',
      area: item.area || 'Yola',
      address: item.address || 'Address not provided.',
      phone: item.phone || contact.phone || '',
      email: item.email || contact.email || '',
      website: item.website || contact.website || '',
      image: item.image || item.heroImage || '',
      heroImage: item.heroImage || item.image || '',
      galleryImages: galleryImages.length ? galleryImages : (item.image ? [item.image] : []),
      galleryCaptions: captions,
      menuItems: menuItems,
      tags: Array.isArray(item.tags) ? item.tags : [],
      services: Array.isArray(item.services) ? item.services : [],
      highlights: Array.isArray(item.highlights) ? item.highlights : (Array.isArray(item.tags) ? item.tags : []),
      hours: item.openingHours || item.hours || 'Opening hours not provided.',
      rating: Number(item.ratingAverage || item.rating || 0),
      reviews: Number(item.reviewCount || item.reviews || 0),
      status: item.status || 'Open',
      verified: item.verificationStatus === 'verified' || item.verified,
      coordinates: item.coordinates || {}
    };
  }

  function imageUrl(value) {
    if (!value) return '';
    return /^(https?:|data:|blob:)/i.test(value) ? value : '/' + String(value).replace(/^\/+/, '');
  }

  function setText(selector, value) {
    var node = document.querySelector(selector);
    if (node) node.textContent = value == null ? '' : value;
  }

  function setImage(selector, source, alt) {
    var image = document.querySelector(selector);
    if (!image || !source) return;
    image.src = imageUrl(source);
    image.alt = alt;
  }

  function renderHours(hours) {
    var list = Array.isArray(hours) ? hours : String(hours || '').split(/[,;\n]+/).filter(Boolean);
    return list.map(function (hour) {
      var parts = String(hour).split(/:\s*/, 2);
      return '<div class="day"><span class="day-name">' + esc(parts[0]) + '</span><span class="day-time">' + esc(parts[1] || hour) + '</span></div>';
    }).join('');
  }

  function renderRecord(record) {
    var image = imageUrl(record.heroImage || record.image);
    var rating = record.rating > 0 ? record.rating.toFixed(1) : 'Not rated';
    var hero = document.querySelector('#hero');
    var about = document.querySelector('#about');
    var visit = document.querySelector('#visit');
    var gallery = document.querySelector('#galleryGrid');
    var tel = String(record.phone || '').replace(/[^0-9+]/g, '');
    var mapQuery = record.coordinates.lat != null && record.coordinates.lng != null ? record.coordinates.lat + ',' + record.coordinates.lng : record.name + ' ' + record.address;
    var galleryList = (record.galleryImages && record.galleryImages.length ? record.galleryImages : [record.image]).map(function (source, index) {
      var safeSource = imageUrl(source);
      if (!safeSource) return '';
      var caption = (record.galleryCaptions && record.galleryCaptions[index]) || record.name;
      return '<div class="gallery-item"><img src="' + esc(safeSource) + '" alt="' + esc(caption) + '"><div class="gallery-overlay"><span>' + esc(caption) + '</span></div></div>';
    }).filter(Boolean).join('') || '<p class="section-intro">No restaurant gallery images are available.</p>';
    var highlightList = (record.highlights && record.highlights.length ? record.highlights : (record.services.length ? record.services : record.tags));

    document.title = record.name + ' - Restaurant details | Yola AI Info Hub';
    setText('.nav-logo', record.name);
    setText('#hero .hero-monogram', record.category + (record.verified ? ' | Verified' : ''));
    setText('#hero h1', record.name);
    setText('#hero .hero-tagline', record.area + ' | ' + record.status);
    setText('#hero .hero-desc', record.description);
    if (hero && image) hero.querySelector('.hero-bg').style.backgroundImage = 'url("' + image.replace(/"/g, '%22') + '")';
    var heroButtons = document.querySelector('#hero .hero-buttons');
    if (heroButtons) heroButtons.innerHTML = '<a href="#visit" class="btn btn-gold">Contact restaurant</a><a href="https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(mapQuery) + '" target="_blank" rel="noopener" class="btn btn-outline">Open in Maps</a>';

    if (about) {
      setText('#about .section-label', 'Restaurant details');
      setText('#about .section-title', 'About ' + record.name);
      setText('#about .section-intro', record.description);
      setText('#about .about-text h3', record.category + ' in ' + record.area);
      var aboutParagraphs = about.querySelectorAll('.about-text p');
      if (aboutParagraphs[0]) aboutParagraphs[0].textContent = record.description;
      if (aboutParagraphs[1]) aboutParagraphs[1].textContent = 'Services: ' + (record.services.length ? record.services.join(', ') : 'Please contact the restaurant for current services and availability.');
      if (aboutParagraphs[2]) aboutParagraphs[2].textContent = 'Highlights: ' + (highlightList.length ? highlightList.join(', ') : 'No additional highlights have been listed.');
      if (aboutParagraphs[3]) aboutParagraphs[3].textContent = record.verified ? 'Verified listing on Yola AI Info Hub.' : 'Information supplied through the Yola AI Info Hub directory.';
      setImage('#about .about-image img', record.heroImage || record.image, record.name);
      var stats = about.querySelectorAll('.stat-item');
      if (stats[0]) stats[0].innerHTML = '<div class="stat-number">' + esc(rating) + '</div><div class="stat-label">Rating</div>';
      if (stats[1]) stats[1].innerHTML = '<div class="stat-number">' + esc(record.reviews || '0') + '</div><div class="stat-label">Reviews</div>';
      if (stats[2]) stats[2].innerHTML = '<div class="stat-number">' + esc(highlightList.length) + '</div><div class="stat-label">Highlights</div>';
      if (stats[3]) stats[3].innerHTML = '<div class="stat-number">' + esc(record.services.length) + '</div><div class="stat-label">Services</div>';
    }

    var menu = document.querySelector('#menu');
    if (menu) {
      setText('#menu .section-label', 'What is listed');
      setText('#menu .section-title', record.menuItems.length ? 'Menu' : 'Services and highlights');
      setText('#menu .section-intro', record.menuItems.length ? 'Menu items supplied with the restaurant listing.' : 'Current information supplied for this restaurant.');
      var menuGrid = document.getElementById('menuGrid');
      if (menuGrid) {
        menuGrid.innerHTML = (record.menuItems.length ? record.menuItems : highlightList.map(function (item) { return { name: item, description: 'Contact the restaurant for current menu options, prices, and availability.' }; })).map(function (item) {
          var name = item.name || item.title || 'Menu item';
          var category = item.category || 'Restaurant special';
          var price = item.price ? (item.currency ? item.currency + ' ' : '') + item.price : '';
          var itemImage = imageUrl(item.image);
          return '<div class="dish-card" data-category="' + esc(category.toLowerCase()) + '">' +
            (itemImage ? '<div class="dish-image"><img src="' + esc(itemImage) + '" alt="' + esc(name) + '" loading="lazy"><span class="dish-tag">' + esc(category) + '</span></div>' : '') +
            '<div class="dish-body"><h3 class="dish-name">' + esc(name) + '</h3><p class="dish-desc">' + esc(item.description || 'Contact the restaurant for current menu options and availability.') + '</p>' +
            ((price || item.calories) ? '<div class="dish-footer">' + (price ? '<span class="dish-price">' + esc(price) + '</span>' : '<span></span>') + (item.calories ? '<span class="dish-calories">' + esc(item.calories) + '</span>' : '') + '</div>' : '') +
            '</div></div>';
        }).join('') || '<p class="section-intro">Menu information is not available in the directory record.</p>';
      }
      menu.querySelectorAll('.menu-filters').forEach(function (node) { node.remove(); });
    }

    var recipes = document.querySelector('#recipes');
    if (recipes) recipes.hidden = true;
    if (gallery) {
      gallery.innerHTML = galleryList;
      setText('#gallery .section-label', 'Restaurant gallery');
      setText('#gallery .section-title', record.name);
      setText('#gallery .section-intro', galleryList.indexOf('<p') === -1 ? 'Images supplied with the directory record.' : 'No gallery images are available yet.');
    }

    var testimonials = document.querySelector('#testimonials');
    if (testimonials) {
      setText('#testimonials .section-label', 'Directory rating');
      setText('#testimonials .section-title', rating + ' out of 5');
      var quote = testimonials.querySelector('.testimonial-quote');
      if (quote) quote.textContent = record.reviews ? record.reviews + ' community review' + (record.reviews === 1 ? '' : 's') + ' recorded for this listing.' : 'Community reviews are not available for this listing yet.';
      var author = testimonials.querySelector('.testimonial-author');
      if (author) author.textContent = record.name;
      var role = testimonials.querySelector('.testimonial-role');
      if (role) role.textContent = record.verified ? 'Verified directory listing' : 'Yola AI Info Hub listing';
    }

    if (visit) {
      setText('#visit .section-label', 'Plan your visit');
      setText('#visit .section-title', 'Contact ' + record.name);
      var infoCards = visit.querySelectorAll('.info-card');
      if (infoCards[0]) infoCards[0].querySelector('p').textContent = record.address;
      if (infoCards[1]) infoCards[1].querySelector('.hours-list').innerHTML = renderHours(record.hours);
      if (infoCards[2]) infoCards[2].querySelector('p').innerHTML = [record.phone && 'Phone: ' + esc(record.phone), record.email && 'Email: ' + esc(record.email), record.website && 'Website: ' + esc(record.website)].filter(Boolean).join('<br>') || 'Contact details are not available.';
      if (infoCards[3]) infoCards[3].querySelector('.map-label').textContent = record.address;
      var form = document.querySelector('.reservation-form');
      if (form) form.innerHTML = '<h3>Get in touch</h3><p class="form-intro">Use the contact details or map link to confirm current menus, opening hours, and availability.</p><a class="btn btn-gold form-submit" href="' + (tel ? 'tel:' + esc(tel) : '#') + '">' + (tel ? 'Call restaurant' : 'Contact details unavailable') + '</a>';
    }
    body.classList.remove('restaurant-page-loading');
  }

  function showMissing() {
    body.classList.remove('restaurant-page-loading');
    var hero = document.querySelector('#hero .hero-content');
    if (hero) hero.innerHTML = '<div class="hero-monogram">Restaurant details</div><h1>Restaurant not found</h1><p class="hero-desc">This restaurant could not be found in the directory.</p><a class="btn btn-gold" href="/?section=naviinfo">Back to directory</a>';
  }

  var id = new URLSearchParams(location.search).get('id');
  if (!id) {
    showMissing();
    return;
  }
  fetchJson('/api/content/navigation-places/' + encodeURIComponent(id)).then(function (payload) {
    renderRecord(normalize(payload && payload.item ? payload.item : payload, id));
  }).catch(showMissing);
}());

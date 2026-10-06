(function () {
  'use strict';

  function apiBases() {
    if (Array.isArray(window.API_BASE_CANDIDATES) && window.API_BASE_CANDIDATES.length) return window.API_BASE_CANDIDATES.slice();
    var current = typeof window.getApiBase === 'function' ? window.getApiBase() : (window.API_BASE || '');
    var candidates = [current];
    var host = location.hostname || 'localhost';
    if (/^(localhost|127\.0\.0\.1|0\.0\.0\.0|::1)$/.test(host)) {
      [4002, 4001, 4000, 3000].forEach(function (port) { candidates.push('http://' + host + ':' + port); });
    }
    return candidates.filter(function (base, index) { return candidates.indexOf(base) === index; });
  }

  function safeImage(value) {
    var source = String(value || '').trim();
    return /^(https?:\/\/|\/|\.\.?\/|Data\/)/i.test(source) ? source : '';
  }

  function hardenDynamicMarkup() {
    if (window.naviMarkupSanitizerInstalled) return;
    window.naviMarkupSanitizerInstalled = true;
    var descriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
    if (!descriptor || !descriptor.set || !descriptor.get) return;

    function sanitize(root) {
      var nodes = [];
      if (root.querySelectorAll) nodes = Array.prototype.slice.call(root.querySelectorAll('*'));
      nodes.forEach(function (node) {
        if (/^(SCRIPT|STYLE|LINK|IFRAME|OBJECT|EMBED|BASE|META|FORM)$/.test(node.tagName)) {
          node.remove();
          return;
        }
        Array.prototype.slice.call(node.attributes || []).forEach(function (attribute) {
          var name = attribute.name.toLowerCase();
          var value = String(attribute.value || '').trim();
          if (/^on/.test(name) || name === 'srcdoc') {
            node.removeAttribute(attribute.name);
            return;
          }
          if (['href', 'src', 'action', 'formaction', 'xlink:href', 'srcset'].indexOf(name) !== -1) {
            var protocol = value.match(/^([a-z][a-z0-9+.-]*):/i);
            if (protocol && !/^(https?|mailto|tel)$/i.test(protocol[1]) && !(name === 'src' && /^data:image\/(png|gif|jpeg|webp);base64,/i.test(value))) {
              node.removeAttribute(attribute.name);
            }
          }
          if (name === 'style' && /(expression\s*\(|url\s*\(\s*['"]?\s*(javascript|vbscript):)/i.test(value)) {
            node.removeAttribute(attribute.name);
          }
        });
      });
    }

    Object.defineProperty(Element.prototype, 'innerHTML', {
      configurable: descriptor.configurable,
      enumerable: descriptor.enumerable,
      get: descriptor.get,
      set: function (value) {
        descriptor.set.call(this, value);
        sanitize(this);
      }
    });
    document.addEventListener('click', function (event) {
      var question = event.target.closest && event.target.closest('.faq-q');
      if (question) {
        var item = question.closest('.faq-item');
        var match = item && item.id.match(/^faq(\d+)$/);
        if (typeof window.toggleFaq === 'function') {
          event.preventDefault();
          window.toggleFaq(match ? Number(match[1]) : question);
        }
        return;
      }

      var galleryItem = event.target.closest && event.target.closest('.gallery-item, .gal-item');
      if (galleryItem && typeof window.openLb === 'function') {
        event.preventDefault();
        if (galleryItem.classList.contains('gallery-item')) {
          var gallery = galleryItem.parentElement;
          window.openLb(Array.prototype.indexOf.call(gallery.children, galleryItem));
        } else {
          var image = galleryItem.querySelector('img');
          window.openLb(image && image.src, image && image.alt || '');
        }
        return;
      }

      var category = event.target.closest && event.target.closest('.cat-chip');
      if (category && typeof window.filterShops === 'function') {
        var categories = Array.prototype.slice.call(category.parentElement.querySelectorAll('.cat-chip'));
        window.filterShops(categories.indexOf(category), category.textContent.trim());
        return;
      }

      var eventType = event.target.closest && event.target.closest('.etype-chip');
      if (eventType && typeof window.filterEvents === 'function') {
        var types = Array.prototype.slice.call(eventType.parentElement.querySelectorAll('.etype-chip'));
        window.filterEvents(types.indexOf(eventType), eventType);
      }
    });
  }

  function unavailable() {
    document.title = 'Listing unavailable — Yola AI Info Hub';
    var page = document.createElement('main');
    page.setAttribute('role', 'alert');
    page.style.cssText = 'max-width:42rem;margin:12vh auto;padding:2rem;font:16px/1.6 system-ui,sans-serif;color:#10231d';
    var heading = document.createElement('h1');
    heading.textContent = 'Listing unavailable';
    var message = document.createElement('p');
    message.textContent = 'This listing is missing, unpublished, or does not have a reviewed detail profile yet.';
    var back = document.createElement('a');
    back.href = '/?section=naviinfo';
    back.textContent = 'Return to NaviInfo';
    page.append(heading, message, back);
    document.body.replaceChildren(page);
  }

  function mergeRecord(item, profile) {
    var data = Object.assign({}, sanitizeProfile(profile));
    var name = item.displayName || profile.name || 'Navigation place';
    data.name = name;
    if (item.description) data.description = item.description;
    var recordImage = safeImage(item.heroImage || item.image);
    if (recordImage) {
      if (Object.prototype.hasOwnProperty.call(data, 'heroImg')) data.heroImg = recordImage;
      if (Object.prototype.hasOwnProperty.call(data, 'heroImage')) data.heroImage = recordImage;
      if (Object.prototype.hasOwnProperty.call(data, 'image')) data.image = recordImage;
    }
    data.address = item.address || data.address || '';
    data.area = item.area || data.area || 'Yola';
    data.openingHours = item.openingHours || data.openingHours || '';
    data.coordinates = item.coordinates || data.coordinates || {};
    data.contact = item.contact || data.contact || {};
    if (Array.isArray(data.contacts)) {
      data.contacts = data.contacts.map(function (contact) {
        var label = String(contact && contact.label || '').toLowerCase();
        var value = contact && contact.value || '';
        if (/address|location/.test(label)) value = data.address;
        else if (/phone|telephone|whatsapp/.test(label)) value = data.contact.phone || '';
        else if (/email/.test(label)) value = data.contact.email || '';
        else if (/website|web site/.test(label)) value = data.contact.website || '';
        return Object.assign({}, contact, { value: value });
      }).filter(function (contact) { return contact.value; });
    }
    data._record = {
      id: item.slug || item.id || '',
      category: item.category || item.subcategory || '',
      displayName: name,
      address: data.address,
      area: data.area,
      coordinates: data.coordinates,
      openingHours: data.openingHours,
      contact: data.contact,
      image: recordImage
    };
    document.title = name + ' — NaviInfo · Yola AI Info Hub';
    return data;
  }

  function fallbackProfile(item, fallback, profileKey) {
    var data = sanitizeProfile(fallback || {});
    var image = safeImage(item.heroImage || item.image);
    var description = item.description || '';
    var emptyArrays = {
      commercialCenterProfile: ['stats', 'edFacts', 'categories', 'shops', 'zones', 'prices', 'facilities', 'hours', 'ratingBars', 'reviews', 'nearby'],
      churchProfile: ['weekStrip', 'worship', 'ministries', 'events', 'community', 'facilities', 'gallery', 'announcements', 'faqs'],
      mosqueProfile: ['quickInfo', 'prayers', 'jumuah', 'facilities', 'education', 'community', 'gallery', 'faqs'],
      judiciaryProfile: ['stats', 'facts', 'divisions', 'caseInfo', 'judges', 'procedures', 'facilities', 'guidance', 'hours', 'nearby', 'faqs'],
      parksRecreationProfile: ['statusPills', 'activities', 'zones', 'facilities', 'events', 'gallery', 'bestTime', 'rules', 'nearby'],
      eventCenterProfile: ['highlights', 'facts', 'halls', 'amenities', 'eventTypes', 'events', 'packages', 'gallery', 'ratings', 'reviews', 'hours', 'nearby', 'faqs'],
      iconicStructureProfile: ['quickInfo', 'highlights', 'milestones', 'zoneSteps', 'facilities', 'galleryImages', 'bestTimes', 'faqs', 'nearby'],
      sportsSpaProfile: ['statusItems', 'facts', 'services', 'zoneSteps', 'pricing', 'trainers', 'weeklySchedule', 'facilities', 'galleryImages', 'hours', 'faqs']
    };
    (emptyArrays[profileKey] || []).forEach(function (key) { data[key] = []; });
    data.name = item.displayName || 'Navigation place';
    data.description = description;
    data.category = item.subcategory || item.category || 'NaviInfo listing';
    data.type = data.category;
    data.status = 'Basic listing information';
    data.badge = data.name.charAt(0).toUpperCase();
    data.heroImg = image;
    data.heroImage = image;
    data.aboutImg = image;
    data.aboutImage = image;
    data.image = image;
    data.address = item.address || '';
    data.area = item.area || 'Yola';
    data.openingHours = item.openingHours || '';
    data.coordinates = item.coordinates || {};
    data.contact = item.contact || {};
    data.aboutParagraphs = description ? [description] : [];
    data.culturalParagraphs = [];
    data.culturalQuote = '';
    data.tagline = '';
    data.priceUpdated = '';
    data.sessionLabel = '';
    data.nextHearing = '';
    data.causeList = '';
    data.seedReviewRequired = true;
    data.seededFromExample = true;
    data.contacts = [];
    if (data.address) data.contacts.push({ label: 'Address', value: data.address, icon: 'Location' });
    if (data.contact.phone) data.contacts.push({ label: 'Phone', value: data.contact.phone, icon: 'Phone' });
    if (data.contact.email) data.contacts.push({ label: 'Email', value: data.contact.email, icon: 'Email' });
    if (data.contact.website) data.contacts.push({ label: 'Website', value: data.contact.website, icon: 'Website' });
    data._profileFallback = true;
    return mergeRecord(item, data);
  }

  function sanitizeProfile(value, key) {
    if (typeof value === 'string') {
      if (/(image|img|src|url|website|mapurl)$/i.test(key || '')) {
        return /^(https?:\/\/|\/|\.\.?\/|Data\/|mailto:|tel:)/i.test(value.trim()) ? value : '';
      }
      return value;
    }
    if (Array.isArray(value)) return value.map(function (item) { return sanitizeProfile(item, key); });
    if (value && typeof value === 'object') {
      var result = {};
      Object.keys(value).forEach(function (childKey) { result[childKey] = sanitizeProfile(value[childKey], childKey); });
      return result;
    }
    return value;
  }

  function fetchRecord(id, adminPreview) {
    var bases = apiBases();
    var index = 0;
    var endpoint = adminPreview
      ? '/api/admin/content/navigation-places/' + encodeURIComponent(id)
      : '/api/content/navigation-places/' + encodeURIComponent(id);
    function next(lastError) {
      if (index >= bases.length) return Promise.reject(lastError || new Error('Navigation API unavailable'));
      var base = bases[index++];
      return fetch(base + endpoint, { credentials: 'include' })
        .then(function (response) {
          if (!response.ok) throw new Error('Navigation record request failed');
          if (base) window.API_BASE = base;
          return response.json();
        })
        .then(function (payload) { return payload && payload.item ? payload.item : payload; })
        .catch(next);
    }
    return next();
  }

  function showDemoNotice(item, profile, adminPreview) {
    if (!(item && item.demoContent || profile && profile.demoContent)) return;
    var banner = document.createElement('aside');
    banner.className = 'navi-demo-notice';
    banner.setAttribute('role', 'note');
    banner.style.cssText = 'position:relative;z-index:10000;padding:.8rem 1rem;background:#fff2cc;border-bottom:1px solid #c28a00;color:#302000;font:600 14px/1.45 system-ui,sans-serif;text-align:center';
    banner.textContent = (item && item.demoNotice) || (profile && profile.demoNotice) || 'Illustrative demo content. Details and images are not verified real-world information.';
    if (adminPreview) banner.textContent += ' Admin preview';
    document.body.prepend(banner);
  }

  function staticRecordFromUrl(id) {
    var params = new URLSearchParams(location.search);
    var name = params.get('name');
    if (!name) return null;
    return {
      slug: id,
      displayName: name,
      category: params.get('category') || 'NaviInfo listing',
      subcategory: params.get('category') || 'NaviInfo listing',
      description: params.get('description') || '',
      address: params.get('address') || '',
      area: params.get('area') || 'Yola',
      openingHours: params.get('openingHours') || '',
      image: safeImage(params.get('image')),
      coordinates: {
        lat: params.has('lat') ? Number(params.get('lat')) : null,
        lng: params.has('lng') ? Number(params.get('lng')) : null
      },
      contact: {}
    };
  }

  window.loadNaviTemplateProfile = function (profileKey, fallback, render) {
    var params = new URLSearchParams(location.search);
    var id = params.get('id') || params.get('slug');
    var adminPreview = params.get('adminPreview') === '1';
    if (!id) {
      if (fallback) render(fallback);
      return Promise.resolve(Boolean(fallback));
    }

    hardenDynamicMarkup();
    return fetchRecord(id, adminPreview).then(function (item) {
      var profile = item && item[profileKey];
      if (!item) throw new Error('Place not found');
      if (!profile || typeof profile !== 'object' || Array.isArray(profile)) {
        var basic = fallbackProfile(item, fallback, profileKey);
        render(basic);
        showDemoNotice(item, basic, adminPreview);
        return true;
      }
      render(mergeRecord(item, profile));
      showDemoNotice(item, profile, adminPreview);
      return true;
    }).catch(function () {
      var staticRecord = staticRecordFromUrl(id);
      if (staticRecord) {
        try {
          render(fallbackProfile(staticRecord, fallback, profileKey));
          return true;
        } catch (error) {
          unavailable();
          return false;
        }
      }
      unavailable();
      return false;
    });
  };
}());
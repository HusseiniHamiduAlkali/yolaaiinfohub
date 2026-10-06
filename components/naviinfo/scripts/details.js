(function () {
  'use strict';

  var key = location.pathname.indexOf('health-facility-details') !== -1 ? 'health' :
    location.pathname.indexOf('hospitality-details') !== -1 ? 'hospitality' : 'education';

  var config = {
    education: {
      title: 'EduInfo',
      section: 'Education'
    },
    health: {
      title: 'HealthInfo',
      section: 'Health'
    },
    hospitality: {
      title: 'StayInfo',
      section: 'Hospitality'
    }
  }[key] || { title: 'EduInfo', section: 'Education' };

  var el = function (id) { return document.getElementById(id); };
  var apiBases = function () {
    if (typeof window.API_BASE_CANDIDATES !== 'undefined' && window.API_BASE_CANDIDATES.length) {
      return window.API_BASE_CANDIDATES.slice();
    }

    if (typeof window.getApiBase === 'function') return [window.getApiBase()];
    if (window.API_BASE) return [window.API_BASE];

    if (/^(localhost|127\.0\.0\.1|0\.0\.0\.0|::1)$/.test(location.hostname)) {
      var host = location.hostname || 'localhost';
      return [4000, 4001, 4002, 4003, 3000].map(function (port) {
        return 'http://' + host + ':' + port;
      });
    }

    return [''];
  };
  var apiUrl = function (path) {
    return apiBases()[0] + path;
  };
  var fetchApiJson = function (path) {
    var candidates = apiBases();
    var index = 0;

    function tryNext(lastError) {
      if (index >= candidates.length) return Promise.reject(lastError || new Error('API unavailable'));
      var base = candidates[index++];
      return fetch(base + path, { credentials: 'include' }).then(function (response) {
        if (response.ok) {
          if (base) window.API_BASE = base;
          return response.json();
        }
        throw new Error('API request failed with status ' + response.status);
      }).catch(tryNext);
    }

    return tryNext();
  };
  var esc = function (s) {
    var d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  };

  function safeNumber(value, fallback) {
    var parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function normalizeRecord(raw, fallbackId) {
    var item = raw || {};
    var demo = item.demoProfile || {};
    var profile = item.hospitalityProfile || {};
    var category = demo.category || profile.category || item.category || item.subcategory || 'Others';
    var contact = profile.contact || item.contact || {};
    var rating = safeNumber(profile.rating, safeNumber(item.ratingAverage, safeNumber(item.rating, 0)));
    var profileReviews = Array.isArray(profile.reviews) ? profile.reviews : [];
    var reviews = profileReviews.length || safeNumber(item.reviewCount, safeNumber(item.reviews, 0));
    var amenities = Array.isArray(profile.amenities) ? profile.amenities : [];
    var textList = function (items) {
      return (Array.isArray(items) ? items : []).map(function (entry) {
        return typeof entry === 'string' ? entry : entry && (entry.name || entry.title || entry.label) || '';
      }).filter(Boolean);
    };
    var demoHighlights = textList(Array.isArray(demo.highlights) ? demo.highlights : []);
    var demoServices = textList([].concat(demo.services || [], demo.facilities || []));
    var tags = demoHighlights.length ? demoHighlights : (Array.isArray(item.tags) && item.tags.length ? item.tags : amenities.length ? amenities : [category]);
    var services = demoServices.length ? demoServices : (Array.isArray(profile.services) && profile.services.length ? profile.services : (Array.isArray(item.services) ? item.services : amenities));
    var lists = [];
    if (services.length) lists.push(['Services', textList(services)]);
    if (Array.isArray(profile.rooms) && profile.rooms.length) lists.push(['Rooms', textList(profile.rooms)]);
    if (tags.length) lists.push(['Highlights', tags]);
    if (!lists.length) lists.push(['Information', [item.description || 'Local listing information available on request.']]);

    var hours = demo.openingHours ? [['Hours', demo.openingHours]] : (Array.isArray(profile.hours) && profile.hours.length ? profile.hours.map(function (row) {
      return Array.isArray(row) ? row : [row.day || 'Hours', row.time || row.hours || ''];
    }) : (Array.isArray(item.hours) && item.hours.length ? item.hours : (
      profile.openingHours || item.openingHours ? [['Hours', profile.openingHours || item.openingHours]] : []
    )));
    if (demo.visitorInfo) lists.push(['Visitor information', [demo.visitorInfo]]);

    return {
      id: item.slug || item.id || fallbackId || '',
      name: item.displayName || profile.name || item.name || 'Listing',
      category: category,
      area: item.area || 'Yola',
      price: profile.priceRange || item.price || '',
      ownership: item.ownership || '',
      rating: rating,
      reviews: reviews,
      status: profile.status || item.businessStatus || 'Open',
      verified: !!(item.verificationStatus === 'verified' || item.verified),
      about: demo.summary || item.description || profile.description || item.about || 'Local listing in Yola, Adamawa State.',
      address: demo.location || profile.address || item.address || 'Address not provided.',
      phone: item.phone || contact.phone || '',
      email: item.email || contact.email || '',
      website: item.website || contact.website || '',
      facts: [
        ['Category', category],
        ['Area', item.area || 'Yola'],
        ['Status', item.status || 'Open'],
        ['Phone', item.phone || contact.phone || 'Not listed']
      ],
      tags: tags,
      lists: lists,
      hours: hours,
      ratingBars: Array.isArray(profile.ratingBars) ? profile.ratingBars : [],
      profileReviews: profileReviews,
      galleryImages: Array.isArray(demo.galleryImages) && demo.galleryImages.length ? demo.galleryImages : (Array.isArray(profile.galleryImages) ? profile.galleryImages : []),
      demoContent: item.demoContent === true,
      demoNotice: item.demoNotice || demo.demoNotice || ''
    };
  }

  function renderRecord(record) {
    if (!record) {
      el('missing').hidden = false;
      return;
    }

    el('found').hidden = false;
    document.title = record.name + ' — ' + config.section + ' · Yola AI Info Hub';
    if (record.demoContent) {
      var demoBanner = document.createElement('aside');
      demoBanner.className = 'navi-demo-notice';
      demoBanner.setAttribute('role', 'note');
      demoBanner.style.cssText = 'padding:.8rem 1rem;margin:0 0 1rem;background:#fff2cc;border:1px solid #c28a00;color:#302000;font-weight:600';
      demoBanner.textContent = record.demoNotice || 'Illustrative demo content. Details and images are not verified real-world information.';
      el('found').prepend(demoBanner);
    }

    if (record.demoContent) {
      var demoBanner = document.createElement('aside');
      demoBanner.className = 'navi-demo-notice';
      demoBanner.setAttribute('role', 'note');
      demoBanner.style.cssText = 'padding:.8rem 1rem;margin:0 0 1rem;background:#fff2cc;border:1px solid #c28a00;color:#302000;font-weight:600';
      demoBanner.textContent = record.demoNotice || 'Illustrative demo content. Details and images are not verified real-world information.';
      el('found').prepend(demoBanner);
    }

    el('crumbCat').textContent = record.category;
    el('name').textContent = record.name;
    el('about').textContent = record.about;
    el('metaArea').textContent = '◉ ' + record.area;
    el('metaRating').textContent = '★ ' + record.rating.toFixed(1) + ' (' + record.reviews + ' reviews)';
    el('metaPrice').textContent = record.price || record.ownership || '';

    var open = record.status !== 'Closed' && record.status !== 'closed';
    var badges = [
      '<span class="pill gold">' + esc(record.category) + '</span>',
      '<span class="pill ' + (open ? 'open' : 'closed') + '">' + esc(record.status || 'Open') + '</span>'
    ];
    if (record.verified) badges.push('<span class="pill">✔ Verified listing</span>');
    badges.push('<span class="pill">◉ ' + esc(record.area) + '</span>');
    el('badges').innerHTML = badges.join('');

    var tel = String(record.phone || '').replace(/[^0-9+]/g, '');
    var actions = [
      '<a class="btn primary" href="tel:' + tel + '">✆ Call</a>',
      '<a class="btn" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(record.name + ' ' + record.address) + '">➤ Directions</a>'
    ];
    if (record.website && record.website !== '—') {
      var website = String(record.website).replace(/^https?:\/\//i, '');
      actions.push('<a class="btn" target="_blank" rel="noopener" href="https://' + esc(website) + '">⌂ Website</a>');
    }
    actions.push('<button class="btn" type="button" id="shareBtn">↗ Share</button>');
    el('actions').innerHTML = actions.join('');

    el('facts').innerHTML = record.facts.map(function (fact) {
      return '<div class="fact"><dt>' + esc(fact[0]) + '</dt><dd>' + esc(fact[1]) + '</dd></div>';
    }).join('');

    el('tags').innerHTML = record.tags.map(function (tag) {
      return '<span class="tag">' + esc(tag) + '</span>';
    }).join('');

    el('listsPanel').innerHTML = record.lists.map(function (list) {
      return '<h2>' + esc(list[0]) + '</h2><ul class="list">' + list[1].map(function (item) {
        return '<li>' + esc(item) + '</li>';
      }).join('') + '</ul>';
    }).join('');

    var initials = record.name.split(/\s+/).filter(Boolean).slice(0, 2).map(function (word) {
      return word[0];
    }).join('').toUpperCase();
    var photos = record.galleryImages.map(function (image) {
      return typeof image === 'string' ? { image: image, caption: record.name } : { image: image.image || image.src || '', caption: image.caption || image.cap || record.name };
    }).filter(function (image) { return /^(https?:\/\/|\/|Data\/|\.\.?\/)/i.test(image.image); });
    el('photos').innerHTML = photos.length ? photos.map(function (image) {
      return '<div class="photo"><img src="' + esc(image.image) + '" alt="' + esc(image.caption) + '" loading="lazy"></div>';
    }).join('') : [0, 1, 2].map(function () {
      return '<div class="photo">' + esc(initials || 'Y') + '</div>';
    }).join('');

    el('reviewSub').textContent = 'Average ' + record.rating.toFixed(1) + ' from ' + record.reviews + ' community ratings.';
    var five = Math.round(record.rating / 5 * 78);
    var four = Math.round((100 - five) * 0.55);
    var three = Math.max(0, 100 - five - four - 6);
    var ratingBars = record.ratingBars.length ? record.ratingBars.map(function (bar) { return [bar.label || '', safeNumber(bar.score, 0)]; }) : [];
    el('bars').innerHTML = ratingBars.map(function (bar) {
      return '<div class="bar"><span>' + esc(bar[0]) + '</span><i><b style="width:' + Math.max(0, Math.min(100, bar[1])) + '%"></b></i><span>' + bar[1] + '%</span></div>';
    }).join('');

    var voices = record.profileReviews;
    el('reviews').innerHTML = voices.map(function (voice) {
      var name = Array.isArray(voice) ? voice[0] : voice.name;
      var stars = Array.isArray(voice) ? voice[1] : voice.stars;
      var text = Array.isArray(voice) ? voice[2] : voice.text;
      var count = Math.max(0, Math.min(5, safeNumber(stars, 0)));
      return '<article class="review"><header><strong>' + esc(name) + '</strong><span class="stars">' + '★'.repeat(count) + '☆'.repeat(5 - count) + '</span></header><p>' + esc(text) + '</p></article>';
    }).join('');

    var rows = [['◉', 'Address', record.address], ['✆', 'Phone', record.phone], ['✉', 'Email', record.email], ['⌂', 'Website', record.website], ['◇', 'Area', record.area]];
    el('contact').innerHTML = rows.filter(function (row) {
      return row[2] && row[2] !== '—';
    }).map(function (row) {
      return '<div class="contact-row"><span class="ico" aria-hidden="true">' + row[0] + '</span><span><small>' + esc(row[1]) + '</small>' + esc(row[2]) + '</span></div>';
    }).join('');

    el('hours').innerHTML = record.hours.map(function (cell) {
      return '<tr><th>' + esc(cell[0]) + '</th><td>' + esc(cell[1]) + '</td></tr>';
    }).join('');

    el('locNote').textContent = record.address + '. Use the directions button above to open the route in your maps app.';

    var share = el('shareBtn');
    if (share) {
      share.addEventListener('click', function () {
        var payload = { title: record.name, text: record.name + ' on Yola AI Info Hub', url: location.href };
        if (navigator.share) {
          navigator.share(payload).catch(function () {});
        } else if (navigator.clipboard) {
          navigator.clipboard.writeText(location.href).then(function () {
            share.textContent = '✓ Link copied';
            setTimeout(function () { share.textContent = '↗ Share'; }, 2000);
          });
        }
      });
    }
  }

  function loadSimilar(category, currentId) {
    return fetchApiJson('/api/content/navigation-places?limit=18')
      .then(function (payload) {
        var items = (payload && payload.items) || [];
        var filtered = items.filter(function (item) {
          var itemCategory = String(item.category || item.subcategory || 'Others');
          return itemCategory.toLowerCase() === String(category || '').toLowerCase() && (item.slug || item.id) !== currentId;
        }).slice(0, 3);

        if (!filtered.length) {
          el('similar').innerHTML = '<p class="sub">No similar listings available right now.</p>';
          return;
        }

        var pagePath = location.pathname;
        el('similar').innerHTML = filtered.map(function (item) {
          var next = normalizeRecord(item, item.slug || item.id || '');
          var page = pagePath.replace(/\/[^/]+$/, '/');
          return '<a class="sim" href="' + page + 'details.html?id=' + encodeURIComponent(next.id) + '"><span class="ico" aria-hidden="true">◇</span><span><b>' + esc(next.name) + '</b><small>' + esc(next.category) + ' · ' + esc(next.area) + ' · ★ ' + next.rating.toFixed(1) + '</small></span></a>';
        }).join('');
      })
      .catch(function () {
        el('similar').innerHTML = '<p class="sub">No similar listings available right now.</p>';
      });
  }

  function loadCurrentRecord() {
    var params = new URLSearchParams(location.search);
    var id = params.get('id');
    if (!id) {
      el('missing').hidden = false;
      return Promise.resolve(false);
    }

    var endpoint = params.get('adminPreview') === '1'
      ? '/api/admin/content/navigation-places/' + encodeURIComponent(id)
      : '/api/content/navigation-places/' + encodeURIComponent(id);
    return fetchApiJson(endpoint)
      .then(function (payload) {
        var record = normalizeRecord(payload && payload.item ? payload.item : payload, id);
        renderRecord(record);
        return record;
      })
      .then(function (record) {
        if (record && record.category) {
          return loadSimilar(record.category, record.id);
        }
        return null;
      })
      .catch(function () {
        el('missing').hidden = false;
        return false;
      });
  }

  el('year').textContent = new Date().getFullYear();
  loadCurrentRecord();
})();

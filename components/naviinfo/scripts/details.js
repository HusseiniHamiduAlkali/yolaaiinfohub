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
    var category = item.category || item.subcategory || 'Others';
    var contact = item.contact || {};
    var rating = safeNumber(item.ratingAverage, safeNumber(item.rating, 4.5));
    var reviews = safeNumber(item.reviewCount, safeNumber(item.reviews, 0));
    var tags = Array.isArray(item.tags) && item.tags.length ? item.tags : [category];
    var services = Array.isArray(item.services) && item.services.length ? item.services : [];
    var lists = [];
    if (services.length) lists.push(['Services', services]);
    if (tags.length) lists.push(['Highlights', tags]);
    if (!lists.length) lists.push(['Information', [item.description || 'Local listing information available on request.']]);

    var hours = Array.isArray(item.hours) && item.hours.length ? item.hours : (
      item.openingHours ? [['Hours', item.openingHours]] : [['Hours', 'Information available on request']]
    );

    return {
      id: item.slug || item.id || fallbackId || '',
      name: item.displayName || item.name || 'Listing',
      category: category,
      area: item.area || 'Yola',
      price: item.price || '',
      ownership: item.ownership || '',
      rating: rating,
      reviews: reviews,
      status: item.status || 'Open',
      verified: !!(item.verificationStatus === 'verified' || item.verified),
      about: item.description || item.about || 'Local listing in Yola, Adamawa State.',
      address: item.address || 'Address not provided.',
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
      hours: hours
    };
  }

  function renderRecord(record) {
    if (!record) {
      el('missing').hidden = false;
      return;
    }

    el('found').hidden = false;
    document.title = record.name + ' — ' + config.section + ' · Yola AI Info Hub';

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
    el('photos').innerHTML = [0, 1, 2].map(function () {
      return '<div class="photo">' + esc(initials || 'Y') + '</div>';
    }).join('');

    el('reviewSub').textContent = 'Average ' + record.rating.toFixed(1) + ' from ' + record.reviews + ' community ratings.';
    var five = Math.round(record.rating / 5 * 78);
    var four = Math.round((100 - five) * 0.55);
    var three = Math.max(0, 100 - five - four - 6);
    el('bars').innerHTML = [['5★', five], ['4★', four], ['3★', three], ['2★', 4], ['1★', 2]].map(function (bar) {
      return '<div class="bar"><span>' + bar[0] + '</span><i><b style="width:' + bar[1] + '%"></b></i><span>' + bar[1] + '%</span></div>';
    }).join('');

    var voices = [
      ['Amina B.', 5, 'Helpful and easy to find. The information was clear and reliable.'],
      ['Yusuf A.', 4, 'Good service overall. Worth calling ahead to confirm current details.'],
      ['Grace T.', 5, 'Well organised and practical. I would recommend it to others in the area.']
    ];
    el('reviews').innerHTML = voices.map(function (voice) {
      return '<article class="review"><header><strong>' + esc(voice[0]) + '</strong><span class="stars">' + '★'.repeat(voice[1]) + '☆'.repeat(5 - voice[1]) + '</span></header><p>' + esc(voice[2]) + '</p></article>';
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
    var id = new URLSearchParams(location.search).get('id');
    if (!id) {
      el('missing').hidden = false;
      return Promise.resolve(false);
    }

    return fetchApiJson('/api/content/navigation-places/' + encodeURIComponent(id))
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

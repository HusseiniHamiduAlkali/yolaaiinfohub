(function () {
  'use strict';

  function apiBase() {
    return typeof window.getApiBase === 'function'
      ? window.getApiBase()
      : (window.API_BASE || 'http://localhost:4000');
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>'"]/g, function (character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character];
    });
  }

  function initials(name) {
    return String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(function (part) {
      return part.charAt(0).toUpperCase();
    }).join('');
  }

  function stars(rating) {
    var rounded = Math.round(Number(rating || 0));
    return Array.from({ length: 5 }, function (_, index) {
      return '<i class="fas fa-star' + (index < rounded ? '' : '-o') + '" aria-hidden="true"></i>';
    }).join('');
  }

  function cardTemplate(item) {
    var rating = Number(item.ratingAverage || 0).toFixed(1);
    var isAvailable = item.availability === 'available';
    var isVerified = item.verificationStatus === 'verified';
    var area = item.areas && item.areas.length ? item.areas[0] : 'Yola';
    var tags = (item.serviceTags || []).slice(0, 4);
    var image = item.image
      ? '<img src="' + escapeHtml(item.image) + '" alt="' + escapeHtml(item.displayName) + '" loading="lazy">'
      : escapeHtml(initials(item.displayName));
    return '<article class="pro-card" data-name="' + escapeHtml(item.displayName) + '" data-role="' + escapeHtml(item.profession) + '" data-category="' + escapeHtml(item.category) + '" data-rating="' + rating + '" data-reviews="' + Number(item.reviewCount || 0) + '" data-exp="' + Number(item.yearsExperience || 0) + '" data-area="' + escapeHtml(area) + '" data-verified="' + isVerified + '" data-open="' + isAvailable + '" data-tags="' + escapeHtml(tags.join(', ')) + '">' +
      '<div class="pro-head"><div class="avatar" data-initials="' + escapeHtml(item.displayName) + '"><div class="img-placeholder">' + image + '</div></div><div class="pro-id"><h3 class="pro-name">' + escapeHtml(item.displayName) + (isVerified ? ' <i class="fas fa-circle-check verified" title="Verified professional" aria-label="Verified"></i>' : '') + '</h3><p class="pro-role">' + escapeHtml(item.profession) + '</p></div></div>' +
      '<span class="badge ' + (isAvailable ? 'badge-open' : 'badge-closed') + '">' + (isAvailable ? 'Available' : 'Busy') + '</span>' +
      '<div class="rating-line"><span class="stars" role="img" aria-label="' + rating + ' out of 5 stars">' + stars(item.ratingAverage) + '</span><span class="rating-value">' + rating + '</span><span>(' + Number(item.reviewCount || 0) + ' reviews)</span></div>' +
      '<div class="pro-meta"><span><i class="fas fa-briefcase" aria-hidden="true"></i> ' + Number(item.yearsExperience || 0) + ' yrs experience</span><span><i class="fas fa-location-dot" aria-hidden="true"></i> ' + escapeHtml(area) + '</span>' + (item.pricing && item.pricing.label ? '<span><i class="fas fa-naira-sign" aria-hidden="true"></i> ' + escapeHtml(item.pricing.label) + '</span>' : '') + '</div>' +
      '<div class="tag-row">' + tags.map(function (tag) { return '<span class="tag">' + escapeHtml(tag) + '</span>'; }).join('') + '</div>' +
      '<div class="pro-actions"><a class="btn btn-primary" href="/servi/' + escapeHtml(item.slug) + '">View profile</a>' + (item.contact && item.contact.phone ? '<a class="btn btn-secondary" href="tel:' + escapeHtml(item.contact.phone) + '">Contact</a>' : '') + '</div></article>';
  }

  function load() {
    var directory = document.getElementById('directory');
    if (!directory || directory.dataset.apiLoaded === 'true') return Promise.resolve(false);
    return fetch(apiBase() + '/api/content/professionals?limit=200', { credentials: 'include' })
      .then(function (response) {
        if (!response.ok) throw new Error('Professional directory request failed');
        return response.json();
      })
      .then(function (data) {
        var groups = {};
        Array.prototype.forEach.call(directory.querySelectorAll('.section3[data-category]'), function (group) {
          groups[group.dataset.category] = group;
          var container = group.querySelector('.section4-container');
          if (container) container.innerHTML = '';
        });
        (data.items || []).forEach(function (item) {
          var group = groups[item.category];
          if (!group) return;
          var container = group.querySelector('.section4-container');
          if (container) container.insertAdjacentHTML('beforeend', cardTemplate(item));
        });
        directory.dataset.apiLoaded = 'true';
        if (window.initServiFilters) window.initServiFilters();
        return true;
      })
      .catch(function (error) {
        console.warn('Using static ServiInfo cards:', error.message);
        return false;
      });
  }

  window.loadServiDirectory = load;
}());
(function () {
  'use strict';

  var page = location.pathname.toLowerCase();
  var mode = page.indexOf('pharmacy-details') !== -1 ? 'pharmacy' : page.indexOf('secondary-healthcare-details') !== -1 ? 'secondaryHospital' : 'primaryCare';
  var $ = function (selector, root) { return (root || document).querySelector(selector); };
  var $$ = function (selector, root) { return Array.prototype.slice.call((root || document).querySelectorAll(selector)); };
  var text = function (value) { return String(value == null ? '' : value); };
  var html = function (value) { return text(value).replace(/[&<>"']/g, function (character) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]; }); };
  var list = function (value) { return Array.isArray(value) ? value : []; };
  var safeImage = function (value) { return /^(https?:\/\/|\/|Data\/)/i.test(text(value)) ? text(value) : ''; };
  var iconNames = 'heart pill file stethoscope refresh truck droplet shield apple thermometer wind baby sparkles scale activity search phone clock siren scissors scan test book brain chair zap snow accessibility parking bus road pin check user'.split(' ');
  var icon = function (name) { return iconNames.indexOf(text(name)) !== -1 ? text(name) : 'heart'; };
  var iconSvg = function (name) { return typeof window.svgIcon === 'function' ? window.svgIcon(icon(name)) : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M7 12h10"/></svg>'; };
  var imageHtml = function (url, alt, className) { var src = safeImage(url); return src ? '<img class="' + className + '" src="' + html(src) + '" alt="' + html(alt) + '" loading="lazy">' : '<div class="' + className + '" aria-hidden="true"></div>'; };
  var stateNode = document.createElement('div');
  stateNode.id = 'healthcare-load-state';
  stateNode.setAttribute('role', 'status');
  stateNode.style.cssText = 'position:relative;z-index:1001;padding:10px 20px;text-align:center;background:#fff7d6;color:#3d3420;font-weight:600';
  stateNode.textContent = 'Loading healthcare details…';
  document.body.insertBefore(stateNode, document.body.firstChild);
  var activeRecord = null;

  function setHero(record, profile) {
    var name = record.displayName || 'Healthcare facility';
    var title = $('h1', $('#hero'));
    if (title) title.textContent = name;
    document.title = name + ' — Yola AI Info Hub';
    var description = $('meta[name="description"]');
    if (description) description.content = text(record.description || profile.tagline || name);
    var type = $('.hero-type');
    if (type) type.textContent = profile.facilityType || (mode === 'pharmacy' ? 'Pharmacy' : mode === 'secondaryHospital' ? 'Secondary Hospital' : 'Primary Healthcare Centre');
    var locationNode = $('.hero-loc');
    if (locationNode) locationNode.innerHTML = (locationNode.querySelector('svg') ? locationNode.querySelector('svg').outerHTML : '') + html(record.address || record.area || 'Yola, Adamawa State');
    var badges = $('.hero-badges');
    if (badges && Array.isArray(profile.heroBadges)) badges.innerHTML = profile.heroBadges.map(function (badge) { return '<span class="badge badge-verified">' + html(badge) + '</span>'; }).join('');
    var phone = record.contact && record.contact.phone;
    if (phone) {
      var digits = text(phone).replace(/[^+0-9]/g, '');
      $$('a[href^="tel:"]').forEach(function (link) { link.href = 'tel:' + digits; });
      $$('a[href*="wa.me/"]').forEach(function (link) { link.href = 'https://wa.me/' + digits.replace(/\D/g, ''); });
      $$('.contact-copy').forEach(function (button) { if (/phone|emergency/i.test(button.closest('.contact-card')?.querySelector('.label')?.textContent || '')) button.dataset.copy = phone; });
    }
    var directions = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(record.coordinates && record.coordinates.lat != null ? record.coordinates.lat + ',' + record.coordinates.lng : record.address || record.displayName);
    $$('a.btn-outline, a.btn-directions').forEach(function (link) { if (/directions/i.test(link.textContent) || link.classList.contains('btn-directions')) link.href = directions; });
  }

  function renderFacts(container, facts) {
    if (!container) return;
    container.innerHTML = list(facts).map(function (fact) { return '<div class="fact-card"><h4>' + html(fact.label) + '</h4><p>' + html(fact.value) + '</p></div>'; }).join('');
  }
  function renderAbout(profile, isHospital) {
    var about = $('#about') || $('#overview');
    if (!about) return;
    var textBlocks = $$('.about-text', about);
    if (textBlocks.length) {
      var paragraphs = list(profile.overview && profile.overview.paragraphs);
      var firstParagraphs = mode === 'pharmacy' ? paragraphs.slice(0, 1) : paragraphs;
      textBlocks[0].innerHTML = firstParagraphs.map(function (paragraph) { return '<p>' + html(paragraph) + '</p>'; }).join('');
      if (mode === 'pharmacy' && textBlocks[1]) textBlocks[1].innerHTML = paragraphs.slice(1).map(function (paragraph) { return '<p>' + html(paragraph) + '</p>'; }).join('');
    }
    renderFacts($('.about-facts', about), profile.overview && profile.overview.facts);
    if (isHospital) {
      var history = $('.about-history', about);
      if (history) history.innerHTML = '<h3>Our History</h3>' + list(profile.overview && profile.overview.history).map(function (item) { return '<p>' + html(item) + '</p>'; }).join('');
    }
    var heading = $('.section-title', about);
    if (heading && profile.overview && profile.overview.heading) heading.textContent = profile.overview.heading;
    var footerNote = profile.footerNote;
    var footerCopy = $('.footer-col:last-child p');
    if (footerCopy && footerNote) footerCopy.textContent = footerNote;
  }
  function renderHours(items, field) {
    var target = $('#hoursTable');
    if (!target) return;
    target.innerHTML = list(items).map(function (row) {
      var emphasized = field === 'hospital' && row.em ? ' highlight' : '';
      var emergency = field === 'hospital' && row.em ? ' emergency' : '';
      return '<div class="hours-row' + emphasized + '"><span class="hours-label">' + html(row.label) + '</span><span class="hours-value' + emergency + '">' + html(row.val) + '</span></div>';
    }).join('');
  }
  function renderFaqs(items) {
    var target = $('#faqList');
    if (!target) return;
    target.innerHTML = list(items).map(function (faq, index) {
      return '<div class="faq-item' + (index === 0 ? ' active' : '') + '"><div class="faq-q" role="button" tabindex="0"><h3>' + html(faq.q) + '</h3><div class="faq-toggle"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></div></div><div class="faq-a"' + (index === 0 ? ' style="max-height:300px"' : '') + '><div class="faq-a-inner"><p>' + html(faq.a) + '</p></div></div></div>';
    }).join('');
  }
  function renderLocation(record, profile) {
    var cards = $$('#location .loc-card');
    if (cards[0]) {
      var address = $('p', cards[0]);
      if (address) address.textContent = record.address || record.area || '';
    }
    if (cards[1]) {
      var paragraphs = $$('p', cards[1]);
      if (paragraphs[0]) paragraphs[0].textContent = profile.location && profile.location.landmark || record.area || '';
      if (paragraphs[1]) paragraphs[1].textContent = record.coordinates && record.coordinates.lat != null ? 'Coordinates: ' + record.coordinates.lat + ', ' + record.coordinates.lng : '';
    }
    var coordinates = record.coordinates || {};
    var mapUrl = profile.location && profile.location.mapUrl;
    var map = $('.location-map iframe');
    if (map) map.src = /^https:\/\//i.test(text(mapUrl)) ? mapUrl : 'https://maps.google.com/maps?q=' + encodeURIComponent(coordinates.lat != null ? coordinates.lat + ',' + coordinates.lng : record.address || record.displayName) + '&output=embed';
    $$('.contact-card').forEach(function (card) {
      var label = text($('.label', card)?.textContent).toLowerCase();
      var link = $('a', card);
      var value = label.indexOf('email') !== -1 ? record.contact && record.contact.email : label.indexOf('website') !== -1 ? record.contact && record.contact.website : label.indexOf('emergency') !== -1 && profile.emergency ? profile.emergency.phone : record.contact && record.contact.phone;
      if (!link || !value) return;
      link.textContent = value;
      link.href = label.indexOf('email') !== -1 ? 'mailto:' + value : label.indexOf('website') !== -1 ? (/^https?:/i.test(value) ? value : 'https://' + value) : 'tel:' + text(value).replace(/[^+\d]/g, '');
      var copy = $('.contact-copy', card);
      if (copy) copy.dataset.copy = value;
    });
  }
  function renderPrimary(profile) {
    window.todayServices = list(profile.todayServices);
    window.coreServices = list(profile.coreServices);
    window.maternalChild = list(profile.maternalChild);
    window.weeklySchedule = list(profile.weeklySchedule);
    window.staff = list(profile.staff);
    window.facilities = list(profile.facilities);
    window.accessibility = list(profile.accessibility);
    window.hoursData = list(profile.hoursData);
    window.faqs = list(profile.faqs);
    var today = $('#todayGrid');
    if (today) today.innerHTML = window.todayServices.map(function (service) { return '<div class="today-item">' + iconSvg('check') + '<span>' + html(service) + '</span></div>'; }).join('');
    window.renderServices = function (filter) {
      var grid = $('#svcGrid');
      if (!grid) return;
      grid.innerHTML = window.coreServices.filter(function (service) { return filter === 'all' || service.cat === filter; }).map(function (service) {
        return '<div class="svc-card"><div class="svc-icon">' + iconSvg(service.icon) + '</div><div><h3>' + html(service.name) + '</h3><p>' + html(service.desc) + '</p></div></div>';
      }).join('');
    };
    window.renderServices('all');
    var maternal = $('#mcGrid');
    if (maternal) maternal.innerHTML = window.maternalChild.map(function (item) { return '<div class="mc-card"><div class="mc-card-head"><div class="mc-icon">' + iconSvg('heart') + '</div><h3>' + html(item.name) + '</h3></div><p>' + html(item.desc) + '</p></div>'; }).join('');
    var schedule = $('#scheduleTabs');
    if (schedule) {
      var labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      schedule.innerHTML = window.weeklySchedule.map(function (item, index) { return '<button class="schedule-tab' + (index === 0 ? ' active' : '') + '" data-day="' + index + '">' + html(labels[index] || item.day) + '</button>'; }).join('');
      window.renderSchedule = function (index) {
        var day = window.weeklySchedule[index];
        if (!day) return;
        window.activeDay = index;
        $$('.schedule-tab').forEach(function (tab, tabIndex) { tab.classList.toggle('active', tabIndex === index); });
        var card = $('#scheduleCard');
        if (card) card.innerHTML = '<h3>' + html(day.day) + '</h3><div class="schedule-list">' + list(day.services).map(function (service) { return '<div class="schedule-row"><div class="s-check">' + iconSvg('check') + '</div><span>' + html(service) + '</span></div>'; }).join('') + '</div>';
      };
      if (window.weeklySchedule.length) window.renderSchedule(0);
    }
    var staffGrid = $('#staffGrid');
    if (staffGrid) staffGrid.innerHTML = window.staff.map(function (item) { return '<div class="staff-card"><div class="staff-img">' + imageHtml(item.img, item.name, '') + '</div><div class="staff-body"><h3>' + html(item.name) + '</h3><p class="staff-role">' + html(item.role) + '</p><p class="staff-qual">' + html(item.qual) + '</p></div></div>'; }).join('');
    var facilitiesGrid = $('#facGrid');
    if (facilitiesGrid) facilitiesGrid.innerHTML = window.facilities.map(function (item) { return '<div class="fac-card"><div class="fac-icon">' + iconSvg(item.icon) + '</div><h3>' + html(item.name) + '</h3><p>' + html(item.desc) + '</p></div>'; }).join('');
    var access = $('#accessList');
    if (access) access.innerHTML = window.accessibility.map(function (item) { return '<div class="access-item"><div class="access-icon">' + iconSvg(item.icon) + '</div><div class="access-info"><h3>' + html(item.name) + '</h3><p>' + html(item.note) + '</p></div></div>'; }).join('');
    renderHours(window.hoursData, 'primary');
    renderFaqs(window.faqs);
  }
  function renderHospital(profile) {
    window.departments = list(profile.departments);
    window.services = list(profile.services);
    window.doctors = list(profile.doctors);
    window.facilities = list(profile.facilities);
    window.galleryImages = list(profile.galleryImages);
    window.hoursData = list(profile.hoursData);
    window.faqs = list(profile.faqs);
    window.renderDepts = function (filter) {
      var grid = $('#deptGrid');
      if (!grid) return;
      grid.innerHTML = window.departments.filter(function (department) { return filter === 'all' || department.cat === filter; }).map(function (department) {
        return '<div class="dept-card" data-cat="' + html(department.cat) + '"><div class="dept-head" role="button" tabindex="0"><div class="dept-icon">' + iconSvg(department.icon) + '</div><div class="dept-info"><h3>' + html(department.name) + '</h3><p>' + html(department.desc) + '</p></div><div class="dept-toggle"><span aria-hidden="true">⌄</span></div></div><div class="dept-detail"><div class="dept-detail-inner"><div class="dept-detail-row"><span>Head:</span><span>' + html(department.head) + '</span></div><div class="dept-detail-row"><span>Tel:</span><a href="tel:' + html(text(department.phone).replace(/[^+0-9]/g, '')) + '">' + html(department.phone) + '</a></div><div class="dept-detail-row"><span>Hours:</span><span>' + html(department.hours) + '</span></div></div></div></div>';
      }).join('');
    };
    window.renderDepts('all');
    var servicesGrid = $('#svcGrid');
    if (servicesGrid) servicesGrid.innerHTML = window.services.map(function (item) { return '<div class="svc-card"><div class="svc-icon">' + iconSvg(item.icon) + '</div><h3>' + html(item.name) + '</h3><p>' + html(item.desc) + '</p></div>'; }).join('');
    var doctors = $('#doctorScroll');
    if (doctors) doctors.innerHTML = window.doctors.map(function (item) { return '<div class="doctor-card"><div class="doctor-img">' + imageHtml(item.img, item.name, '') + '</div><div class="doctor-body"><h3>' + html(item.name) + '</h3><p class="doctor-title">' + html(item.title) + '</p><p class="doctor-qual">' + html(item.qual) + '</p><div class="doctor-meta"><span>' + html(item.dept) + '</span><span class="avail">' + html(item.avail) + '</span></div></div></div>'; }).join('');
    var facilitiesGrid = $('#facGrid');
    if (facilitiesGrid) facilitiesGrid.innerHTML = window.facilities.map(function (item) { return '<div class="fac-card"><div class="fac-icon">' + iconSvg(item.icon) + '</div><h3>' + html(item.name) + '</h3><p>' + html(item.desc) + '</p></div>'; }).join('');
    var gallery = $('#galleryGrid');
    if (gallery) gallery.innerHTML = window.galleryImages.map(function (item, index) { return '<div class="gallery-item" data-gallery-index="' + index + '" role="button" tabindex="0">' + imageHtml(item.src, item.cap, '') + '<div class="gallery-overlay"><span>' + html(item.cap) + '</span></div></div>'; }).join('');
    renderHours(window.hoursData, 'hospital');
    renderFaqs(window.faqs);
    var emergency = profile.emergency || {};
    var call = $('.emergency-call');
    if (call && emergency.phone) { call.href = 'tel:' + text(emergency.phone).replace(/[^+\d]/g, ''); call.lastChild.textContent = ' ' + emergency.phone; }
    var status = $('.emergency-status');
    if (status) status.innerHTML = '<span class="status-dot green"></span><span>' + html(emergency.ambulanceStatus || '') + '</span>';
    var note = $('.emergency-note');
    if (note) note.textContent = emergency.hours || '';
    $$('.info-panel p').forEach(function (paragraph, index) { if (emergency.notices && emergency.notices[index]) paragraph.textContent = emergency.notices[index]; });
    $$('#stats .stat-label').forEach(function (node, index) { if (profile.stats && profile.stats[index]) node.textContent = profile.stats[index].value + ' ' + profile.stats[index].label; });
    var heroImages = $$('#hero .hero-bg img, #hero .hero-img-wrap img');
    heroImages.forEach(function (image, index) { var source = safeImage(window.galleryImages[index] && window.galleryImages[index].src); if (source) image.src = source; image.alt = index ? 'Healthcare facility' : 'Healthcare facility exterior'; });
  }
  function renderPharmacy(profile) {
    window.services = list(profile.services);
    window.medCategories = list(profile.medCategories);
    window.products = list(profile.products);
    window.pharmacists = list(profile.pharmacists);
    window.healthChecks = list(profile.healthChecks);
    window.hoursData = list(profile.hoursData);
    window.faqs = list(profile.faqs);
    var servicesGrid = $('#svcGrid');
    if (servicesGrid) servicesGrid.innerHTML = window.services.map(function (item) { return '<div class="svc-card"><div class="svc-icon">' + iconSvg(item.icon) + '</div><h3>' + html(item.name) + '</h3><p>' + html(item.desc) + '</p></div>'; }).join('');
    var categories = $('#medCatGrid');
    if (categories) categories.innerHTML = window.medCategories.map(function (item) { return '<div class="med-cat" data-scroll-products="true" role="button" tabindex="0"><div class="med-cat-icon">' + iconSvg(item.icon) + '</div><h3>' + html(item.name) + '</h3><p class="count">' + html(item.count) + ' items</p>' + (item.rx ? '<span class="rx-badge">Rx</span>' : '') + '</div>'; }).join('');
    window.renderProducts = function (filter) {
      var grid = $('#prodGrid');
      if (!grid) return;
      var query = text(filter).toLowerCase();
      var matches = window.products.filter(function (product) { return !query || (text(product.name) + ' ' + text(product.cat)).toLowerCase().indexOf(query) !== -1; });
      grid.innerHTML = matches.length ? matches.map(function (product) {
        return '<div class="prod-card" data-product-id="' + html(product.id) + '" role="button" tabindex="0">' + (product.rx ? '<span class="prod-rx">Rx</span>' : '') + '<p class="prod-cat-tag">' + html(product.cat) + '</p><h3>' + html(product.name) + '</h3><p class="prod-desc">' + html(product.desc) + '</p><div class="prod-footer"><span class="prod-price">' + html(product.price) + '</span><span class="prod-avail ' + (product.avail ? 'yes' : 'no') + '">' + (product.avail ? 'In Stock' : 'Out of Stock') + '</span></div></div>';
      }).join('') : '<p style="grid-column:1/-1;text-align:center;padding:40px">No products found matching your search.</p>';
    };
    window.openModal = function (id) {
      var product = window.products.find(function (item) { return item.id === id; });
      if (!product) return;
      var phone = activeRecord && activeRecord.contact && activeRecord.contact.phone || '';
      var body = $('#modalBody');
      if (!body) return;
      body.innerHTML = '<div class="modal-cat">' + html(product.cat) + '</div><h3>' + html(product.name) + '</h3><p class="modal-price">' + html(product.price) + '</p><p class="modal-desc">' + html(product.desc) + '</p><div class="modal-status"><span class="modal-badge ' + (product.avail ? 'avail' : 'unavail') + '">' + (product.avail ? 'In Stock' : 'Out of Stock') + '</span>' + (product.rx ? '<span class="modal-badge rx">Prescription Required</span>' : '') + '</div>' + (phone ? '<div class="modal-actions"><a href="tel:' + html(phone.replace(/[^+0-9]/g, '')) + '" class="btn btn-gold">Call to Order</a></div>' : '');
      $('#modalOverlay').classList.add('open');
      document.body.style.overflow = 'hidden';
    };
    window.renderProducts($('#searchInput') ? $('#searchInput').value : '');
    var pharmacists = $('#pharmGrid');
    if (pharmacists) pharmacists.innerHTML = window.pharmacists.map(function (item) { return '<div class="pharm-card"><div class="pharm-img">' + imageHtml(item.img, item.name, '') + '</div><div class="pharm-body"><h3>' + html(item.name) + '</h3><p class="pharm-role">' + html(item.role) + '</p><p class="pharm-qual">' + html(item.qual) + '</p></div></div>'; }).join('');
    var checks = $('#checkGrid');
    if (checks) checks.innerHTML = window.healthChecks.map(function (item) { return '<div class="check-card"><div class="check-icon">' + iconSvg(item.icon) + '</div><h3>' + html(item.name) + '</h3><p class="check-price">' + html(item.price) + '</p></div>'; }).join('');
    var statusItems = $$('#status .status-item');
    list(profile.statusItems).forEach(function (item, index) { if (statusItems[index]) { var label = $('h4', statusItems[index]), value = $('p', statusItems[index]); if (label) label.textContent = item.label; if (value) value.textContent = item.value; } });
    var delivery = profile.delivery || {};
    var deliveryItems = $$('#delivery .delivery-item p');
    if (deliveryItems[0]) deliveryItems[0].textContent = list(delivery.areas).join(', ');
    if (deliveryItems[1]) deliveryItems[1].textContent = delivery.phone || '';
    if (deliveryItems[2]) deliveryItems[2].textContent = delivery.pickup || delivery.available || '';
    if (deliveryItems[3]) deliveryItems[3].textContent = list(delivery.paymentOptions).join(', ') || delivery.details || '';
    var notice = $('.info-panel p');
    if (notice && profile.medicineNotice) notice.textContent = profile.medicineNotice;
    renderHours(window.hoursData, 'pharmacy');
    renderFaqs(window.faqs);
  }

  function bindDynamicInteractions() {
    window.toggleFaq = function (question) {
      var item = question && question.parentElement;
      if (!item) return;
      var answer = $('.faq-a', item);
      var wasActive = item.classList.contains('active');
      $$('.faq-item.active').forEach(function (active) { active.classList.remove('active'); $('.faq-a', active).style.maxHeight = '0'; });
      if (!wasActive && answer) { item.classList.add('active'); answer.style.maxHeight = answer.scrollHeight + 'px'; }
    };
    window.toggleDept = function (head) {
      var card = head && head.parentElement;
      if (!card) return;
      var details = $('.dept-detail', card);
      var open = card.classList.contains('active');
      $$('.dept-card.active').forEach(function (active) { active.classList.remove('active'); $('.dept-detail', active).style.maxHeight = '0'; });
      if (!open && details) { card.classList.add('active'); details.style.maxHeight = details.scrollHeight + 'px'; }
    };
    window.scrollToProducts = function () { var target = $('#products'); if (target) target.scrollIntoView({ behavior: 'smooth' }); };
    var selectedImage = 0;
    window.openLightbox = function (index) {
      selectedImage = index;
      var image = $('#lightboxImg');
      var item = list(window.galleryImages)[selectedImage];
      if (image && item) { image.src = safeImage(item.src); image.alt = text(item.cap); }
      var box = $('#lightbox');
      if (box) box.classList.add('open');
    };
    var closeLightbox = function () { var box = $('#lightbox'); if (box) box.classList.remove('open'); };
    var previous = $('#lbPrev'), next = $('#lbNext'), close = $('#lightboxClose');
    if (previous) previous.addEventListener('click', function () { var images = list(window.galleryImages); if (images.length) window.openLightbox((selectedImage + images.length - 1) % images.length); });
    if (next) next.addEventListener('click', function () { var images = list(window.galleryImages); if (images.length) window.openLightbox((selectedImage + 1) % images.length); });
    if (close) close.addEventListener('click', closeLightbox);
    document.addEventListener('keydown', function (event) { if (event.key === 'Escape') closeLightbox(); });
    var faqList = $('#faqList');
    if (faqList) faqList.addEventListener('click', function (event) { var question = event.target.closest('.faq-q'); if (question) window.toggleFaq(question); });
    var departmentGrid = $('#deptGrid');
    if (departmentGrid) departmentGrid.addEventListener('click', function (event) { var head = event.target.closest('.dept-head'); if (head) window.toggleDept(head); });
    var productGrid = $('#prodGrid');
    if (productGrid) productGrid.addEventListener('click', function (event) { var card = event.target.closest('[data-product-id]'); if (card) window.openModal(card.dataset.productId); });
    var categoryGrid = $('#medCatGrid');
    if (categoryGrid) categoryGrid.addEventListener('click', function (event) { if (event.target.closest('[data-scroll-products]')) window.scrollToProducts(); });
    var galleryGrid = $('#galleryGrid');
    if (galleryGrid) galleryGrid.addEventListener('click', function (event) { var card = event.target.closest('[data-gallery-index]'); if (card) window.openLightbox(Number(card.dataset.galleryIndex)); });
    [[faqList, '.faq-q', window.toggleFaq], [departmentGrid, '.dept-head', window.toggleDept], [productGrid, '[data-product-id]', function (card) { window.openModal(card.dataset.productId); }], [categoryGrid, '[data-scroll-products]', window.scrollToProducts], [galleryGrid, '[data-gallery-index]', function (card) { window.openLightbox(Number(card.dataset.galleryIndex)); }]].forEach(function (entry) {
      if (!entry[0]) return;
      entry[0].addEventListener('keydown', function (event) {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        var target = event.target.closest(entry[1]);
        if (target) { event.preventDefault(); entry[2](target); }
      });
    });
    $$('.dept-filters .filter-btn').forEach(function (button) { button.addEventListener('click', function () { $$('.dept-filters .filter-btn').forEach(function (item) { item.classList.toggle('active', item === button); }); window.renderDepts(button.dataset.filter || 'all'); }); });
    $$('.svc-filters .filter-btn').forEach(function (button) { button.addEventListener('click', function () { $$('.svc-filters .filter-btn').forEach(function (item) { item.classList.toggle('active', item === button); }); window.renderServices(button.dataset.filter || 'all'); }); });
    var tabs = $('#scheduleTabs');
    if (tabs) tabs.addEventListener('click', function (event) { var button = event.target.closest('.schedule-tab'); if (button) window.renderSchedule(Number(button.dataset.day)); });
    var search = $('#searchInput');
    if (search) search.addEventListener('input', function () { window.renderProducts(search.value); });
    var nav = $('#nav');
    var burger = $('#navBurger');
    var navLinks = $('#navLinks');
    if (burger && navLinks) burger.addEventListener('click', function () { burger.classList.toggle('open'); navLinks.classList.toggle('open'); });
    if (navLinks) navLinks.querySelectorAll('a').forEach(function (link) { link.addEventListener('click', function () { burger && burger.classList.remove('open'); navLinks.classList.remove('open'); }); });
    var backToTop = $('#backToTop');
    var updateScrollState = function () {
      if (nav) nav.classList.toggle('scrolled', window.scrollY > 60);
      if (backToTop) backToTop.classList.toggle('show', window.scrollY > 60);
    };
    window.addEventListener('scroll', updateScrollState, { passive: true });
    updateScrollState();
    if (backToTop) backToTop.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
    var copyAddress = $('#copyAddress');
    if (copyAddress) copyAddress.addEventListener('click', function () {
      var addressCard = $$('#location .loc-card')[0];
      var value = addressCard && $('p', addressCard) ? $('p', addressCard).textContent : '';
      if (navigator.clipboard && value) navigator.clipboard.writeText(value);
      var label = $('#copyLabel');
      if (label) { label.textContent = 'Copied!'; setTimeout(function () { label.textContent = 'Copy address'; }, 1800); }
    });
    document.addEventListener('click', function (event) {
      var copy = event.target.closest('.contact-copy');
      if (copy && navigator.clipboard && copy.dataset.copy) navigator.clipboard.writeText(copy.dataset.copy);
    });
    var share = $('#shareBtn');
    if (share) share.addEventListener('click', function () {
      if (navigator.share) navigator.share({ title: document.title, url: location.href }).catch(function () {});
      else if (navigator.clipboard) navigator.clipboard.writeText(location.href);
    });
    var save = $('#saveBtn');
    if (save) {
      var storageKey = 'navi-healthcare-saved-' + new URLSearchParams(location.search).get('id');
      save.classList.toggle('saved', localStorage.getItem(storageKey) === 'true');
      save.addEventListener('click', function () { var saved = save.classList.toggle('saved'); localStorage.setItem(storageKey, String(saved)); });
    }
    var modalClose = $('#modalClose');
    var modalOverlay = $('#modalOverlay');
    var closeModal = function () { if (modalOverlay) modalOverlay.classList.remove('open'); document.body.style.overflow = ''; };
    if (modalClose) modalClose.addEventListener('click', closeModal);
    if (modalOverlay) modalOverlay.addEventListener('click', function (event) { if (event.target === modalOverlay) closeModal(); });
    document.addEventListener('keydown', function (event) { if (event.key === 'Escape') closeModal(); });
    if ('IntersectionObserver' in window) {
      var revealObserver = new IntersectionObserver(function (entries) { entries.forEach(function (entry) { if (entry.isIntersecting) { entry.target.classList.add('visible'); revealObserver.unobserve(entry.target); } }); }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });
      $$('.reveal').forEach(function (element) { revealObserver.observe(element); });
    } else {
      $$('.reveal').forEach(function (element) { element.classList.add('visible'); });
    }
  }

  function showFailure(message) {
    stateNode.textContent = message;
    stateNode.style.background = '#fde8e7';
    stateNode.style.color = '#722b25';
    var title = $('h1', $('#hero'));
    if (title) title.textContent = 'Healthcare details unavailable';
    var about = $('.about-text', $('#about') || $('#overview'));
    if (about) about.textContent = message;
  }
  function apiBases() {
    var base = typeof window.getApiBase === 'function'
      ? window.getApiBase()
      : (window.API_BASE_URL || window.API_BASE || location.origin);
    return [String(base || location.origin).replace(/\/$/, '')];
  }
  function fetchPlace(slug) {
    var bases = apiBases();
    var sawNotFound = false;
    var attempt = function (index) {
      if (index >= bases.length) return Promise.reject(new Error(sawNotFound ? 'No published healthcare profile was found for this listing.' : 'Unable to reach the healthcare information service.'));
      return fetch(bases[index] + '/api/content/navigation-places/' + encodeURIComponent(slug), { credentials: 'include' }).then(function (response) {
        if (response.status === 404) sawNotFound = true;
        if (!response.ok) return attempt(index + 1);
        return response.json().then(function (data) {
          return data && data.item && data.item.healthcareProfile ? data : attempt(index + 1);
        });
      }).catch(function () { return attempt(index + 1); });
    };
    return attempt(0);
  }
  function load() {
    var slug = new URLSearchParams(location.search).get('id');
    if (!slug) { showFailure('No facility id was provided. Return to Navi and open a healthcare listing.'); return; }
    fetchPlace(slug).then(function (response) {
      var record = response && response.item;
      var profileRoot = record && record.healthcareProfile;
      var profile = profileRoot && profileRoot[mode];
      if (!record || !profile) throw new Error('This listing does not yet have the matching healthcare profile.');
      activeRecord = record;
      setHero(record, profile);
      renderAbout(profile, mode === 'secondaryHospital');
      renderLocation(record, profile);
      if (mode === 'primaryCare') renderPrimary(profile);
      if (mode === 'secondaryHospital') renderHospital(profile);
      if (mode === 'pharmacy') renderPharmacy(profile);
      bindDynamicInteractions();
      stateNode.remove();
    }).catch(function (error) { showFailure(error.message || 'Unable to load healthcare details.'); });
  }
  load();
}());

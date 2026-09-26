(function () {
  'use strict';

  var DEFAULT_CATEGORIES = [
    'Agents',
    'Banks',
    'Commercial_centers',
    'Educational',
    'Filling_Stations',
    'Green_spaces',
    'Health',
    'Hotels',
    'Judiciary',
    'Others',
    'Parks',
    'Religious centers',
    'Sports'
  ];

  var state = { records: [], selected: null };
  var $ = function (id) { return document.getElementById(id); };

  function apiBase() {
    return typeof window.getApiBase === 'function' ? window.getApiBase() : (window.API_BASE_URL || window.API_BASE || window.location.origin);
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, function (character) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character];
    });
  }

  function status(message, type) {
    var node = $('status');
    if (!node) return;
    node.textContent = message;
    node.className = 'status ' + (type || '');
  }

  function request(url, options) {
    return fetch(apiBase() + url, Object.assign({ credentials: 'include', headers: { 'Content-Type': 'application/json' } }, options || {})).then(function (response) {
      return response.json().then(function (data) {
        if (!response.ok) throw new Error(data.error || 'Request failed');
        return data;
      });
    });
  }

  function populateCategoryOptions() {
    var field = $('category');
    if (!field) return;
    var values = DEFAULT_CATEGORIES.slice();
    state.records.forEach(function (record) {
      if (record.category && !values.includes(record.category)) values.push(record.category);
    });
    field.innerHTML = values.map(function (value) {
      return '<option value="' + escapeHtml(value) + '">' + escapeHtml(value) + '</option>';
    }).join('');
  }

  function renderRecords() {
    var filter = $('status-filter').value;
    var records = state.records.filter(function (record) {
      return !filter || record.status === filter;
    });

    var container = $('records');
    if (!container) return;
    container.innerHTML = records.length ? records.map(function (record) {
      return '<button class="record ' + (state.selected && state.selected._id === record._id ? 'active' : '') + '" data-id="' + record._id + '" type="button"><strong>' + escapeHtml(record.displayName || 'Unnamed place') + '</strong><span>' + escapeHtml(record.status || 'draft') + ' · ' + escapeHtml(record.category || 'Others') + '</span></button>';
    }).join('') : '<p class="muted">No listings found.</p>';

    Array.prototype.forEach.call(container.querySelectorAll('[data-id]'), function (button) {
      button.addEventListener('click', function () {
        state.selected = state.records.find(function (record) { return record._id === button.dataset.id; });
        fillForm(state.selected);
        renderRecords();
      });
    });
  }

  function clearForm() {
    state.selected = null;
    $('navi-form').reset();
    $('record-id').value = '';
    $('editor-title').textContent = 'New listing';
    $('record-status').value = 'draft';
    $('verification-status').value = 'unverified';
    $('rating-average').value = '0';
    $('review-count').value = '0';
    $('delete-record').hidden = true;
    $('school-preview').hidden = true;
    $('university-preview').hidden = true;
    $('technical-preview').hidden = true;
    $('learning-preview').hidden = true;
    $('healthcare-preview').hidden = true;
    renderAllProfileEditors({});
  }

  function splitList(value) {
    return String(value || '').split(',').map(function (part) { return part.trim(); }).filter(Boolean);
  }

  function isSchoolRecord(record) {
    var value = [record && record.category, record && record.subcategory, record && record.displayName]
      .filter(Boolean).join(' ').toLowerCase().replace(/[&_/-]+/g, ' ');
    return /\b(primary|secondary|nursery|high school|grammar school)\b/.test(value) &&
      !/\b(university|college|polytechnic|library)\b/.test(value);
  }

  function isUniversityRecord(record) {
    var value = [record && record.category, record && record.subcategory, record && record.displayName]
      .filter(Boolean).join(' ').toLowerCase().replace(/[&_/-]+/g, ' ');
    return /\b(universities|university|polytechnic|institute of technology)\b/.test(value) &&
      !/\b(school|library|knowledge center)\b/.test(value);
  }

  function isTechnicalRecord(record) {
    var value = [record && record.category, record && record.subcategory, record && record.displayName]
      .filter(Boolean).join(' ').toLowerCase().replace(/[&_/-]+/g, ' ');
    return /\b(colleges?|polytechnics?|monotechnics?|college of health|health technology|nursing sciences?|legal studies|institute of technology)\b/.test(value) &&
      !/\b(university|primary school|secondary school|nursery|elementary|library|knowledge center)\b/.test(value);
  }

  function isLearningRecord(record) {
    var value = [record && record.category, record && record.subcategory, record && record.displayName]
      .filter(Boolean).join(' ').toLowerCase().replace(/[&_/-]+/g, ' ');
    return /\b(libraries?|library|knowledge centers?|learning centers?|learning hubs?|educational hubs?)\b/.test(value);
  }

  function isHealthcareRecord(record) {
    var value = [record && record.category, record && record.subcategory, record && record.displayName]
      .filter(Boolean).join(' ').toLowerCase().replace(/[&_/-]+/g, ' ');
    if (/\b(university|universities|college|polytechnic|school|library|learning hub)\b/.test(value)) return false;
    return /\b(health|pharmacy|pharmacies|hospital|phcc|clinic|dispensary|maternity)\b/.test(value);
  }

  function healthcareType(record) {
    var slug = String(record && record.slug || '').toLowerCase();
    var value = [record && record.category, record && record.subcategory, record && record.displayName, slug]
      .filter(Boolean).join(' ').toLowerCase().replace(/[&_/-]+/g, ' ');
    if (/\b(pharmacy|pharmacies|chemist)\b/.test(value)) return 'pharmacy';
    if (/\b(specialist hospital yola|adamawa german hospital|meddy specialists clinic|fortland orthopaedic|new boshang clinic|galbose specialists clinic|modibbo adama teaching hospital)\b/.test(value)) return 'secondaryHospital';
    if (/\b(specialists?|hospital|teaching)\b/.test(value)) return 'secondaryHospital';
    return 'primaryCare';
  }

  function parseMenuItems(value) {
    var text = String(value || '').trim();
    if (!text) return [];
    var parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  }

  var profileConfigs = {
    school: {
      title: 'School profile', description: 'Edit the information shown on the primary and secondary school details page.',
      scalars: [['tagline', 'Tagline', 'textarea'], ['schoolType', 'School type'], ['crest', 'Crest / initials'], ['heroImage', 'Hero image URL/path'], ['mission', 'Mission', 'textarea'], ['vision', 'Vision', 'textarea'], ['stats.students', 'Students'], ['stats.teachers', 'Teachers'], ['stats.years', 'Years established'], ['stats.levels', 'Levels']],
      repeaters: [['levels', 'Levels', [['name', 'Level name'], ['description', 'Description', 'textarea']]], ['subjects', 'Subjects', [['name', 'Subject'], ['icon', 'Icon']]], ['facilities', 'Facilities', [['name', 'Facility'], ['image', 'Image URL/path']]], ['staff', 'Staff', [['name', 'Name'], ['role', 'Role'], ['bio', 'Bio', 'textarea']]], ['fees', 'Fees', [['name', 'Fee name'], ['amount', 'Amount'], ['note', 'Note']]], ['activities', 'Activities', [['name', 'Activity'], ['icon', 'Icon']]], ['calendar', 'Calendar', [['month', 'Month'], ['event', 'Event']]], ['awards', 'Awards', [['name', 'Award'], ['detail', 'Detail'], ['icon', 'Icon']]], ['testimonials', 'Testimonials', [['quote', 'Quote', 'textarea'], ['author', 'Author']]], ['gallery', 'Gallery', [['image', 'Image URL/path'], ['caption', 'Caption']]]]
    },
    university: {
      title: 'University profile', description: 'Edit university information with labeled fields instead of raw JSON.',
      scalars: [['tagline', 'Tagline', 'textarea'], ['institutionType', 'Institution type'], ['logo', 'Logo URL/path'], ['heroImage', 'Hero image URL/path'], ['established', 'Established'], ['stats.students', 'Students'], ['stats.faculties', 'Faculties'], ['stats.programmes', 'Programmes'], ['stats.ranking', 'Ranking'], ['stats.established', 'Established (stats)'], ['story.heading', 'Story heading'], ['story.image', 'Story image URL/path']],
      repeaters: [['story.paragraphs', 'Story paragraphs', [['value', 'Paragraph', 'textarea']]], ['faculties', 'Faculties', [['name', 'Faculty'], ['icon', 'Icon'], ['description', 'Description', 'textarea']]], ['programmes', 'Programmes', [['level', 'Level'], ['description', 'Description', 'textarea'], ['examples', 'Examples (comma separated)']]], ['admissions', 'Admissions steps', [['title', 'Title'], ['description', 'Description', 'textarea']]], ['fees', 'Fees', [['level', 'Level'], ['amount', 'Amount'], ['note', 'Note']]], ['accreditations', 'Accreditations', [['name', 'Name'], ['detail', 'Detail', 'textarea']]], ['gallery', 'Gallery', [['image', 'Image URL/path'], ['caption', 'Caption']]], ['alumni', 'Alumni', [['name', 'Name'], ['field', 'Field'], ['year', 'Year'], ['image', 'Image URL/path']]], ['research', 'Research', [['title', 'Title'], ['description', 'Description', 'textarea']]], ['partnerships', 'Partnerships', [['name', 'Name'], ['detail', 'Detail', 'textarea']]], ['studentLife', 'Student life', [['title', 'Title'], ['image', 'Image URL/path']]]]
    },
    technical: {
      title: 'Technical institution profile', description: 'Edit colleges, polytechnics, monotechnics, nursing, and health-technology details.',
      scalars: [['tagline', 'Tagline', 'textarea'], ['institutionType', 'Institution type'], ['crest', 'Crest / initials'], ['heroImage', 'Hero image URL/path'], ['established', 'Established'], ['stats.programmes', 'Programmes'], ['stats.students', 'Students'], ['stats.accreditation', 'Accreditation summary'], ['overview.heading', 'Overview heading'], ['overview.image', 'Overview image URL/path'], ['industry.heading', 'Industry heading'], ['industry.description', 'Industry description', 'textarea'], ['industry.placement', 'Placement note'], ['brochure', 'Brochure URL'], ['footerNote', 'Footer note', 'textarea']],
      repeaters: [['overview.paragraphs', 'Overview paragraphs', [['value', 'Paragraph', 'textarea']]], ['programmes', 'Programmes', [['level', 'Level'], ['name', 'Programme'], ['duration', 'Duration'], ['entryRoute', 'Entry route', 'textarea']]], ['departments', 'Departments', [['name', 'Department'], ['description', 'Description', 'textarea']]], ['accreditation', 'Accreditation', [['name', 'Name'], ['status', 'Status'], ['detail', 'Detail', 'textarea']]], ['admissions', 'Admissions', [['title', 'Title'], ['description', 'Description', 'textarea']]], ['fees', 'Fees', [['name', 'Fee name'], ['amount', 'Amount'], ['note', 'Note']]], ['facilities', 'Facilities', [['name', 'Facility'], ['image', 'Image URL/path'], ['description', 'Description', 'textarea']]], ['careers', 'Careers', [['stage', 'Stage'], ['title', 'Title'], ['description', 'Description', 'textarea']]], ['services', 'Student services', [['name', 'Service'], ['icon', 'Icon'], ['description', 'Description', 'textarea']]], ['gallery', 'Gallery', [['image', 'Image URL/path'], ['caption', 'Caption']]]]
    },
    learning: {
      title: 'Library / learning hub profile', description: 'Edit libraries, knowledge centres, educational hubs, and community learning spaces.',
      scalars: [['tagline', 'Tagline', 'textarea'], ['institutionType', 'Institution type'], ['logo', 'Logo / initials'], ['heroImage', 'Hero image URL/path'], ['stats.collection', 'Collection size'], ['stats.seats', 'Seats'], ['stats.events', 'Events yearly'], ['stats.openDays', 'Days open'], ['mission.heading', 'Mission heading'], ['footerNote', 'Footer note', 'textarea']],
      repeaters: [['mission.paragraphs', 'Mission paragraphs', [['value', 'Paragraph', 'textarea']]], ['services', 'Services', [['name', 'Service'], ['icon', 'Icon'], ['description', 'Description', 'textarea']]], ['resources', 'Resources', [['count', 'Count'], ['name', 'Name'], ['description', 'Description', 'textarea']]], ['events', 'Events', [['day', 'Day'], ['month', 'Month'], ['tag', 'Tag'], ['title', 'Title'], ['description', 'Description', 'textarea']]], ['membership', 'Membership plans', [['name', 'Name'], ['price', 'Price'], ['description', 'Description', 'textarea'], ['benefits', 'Benefits (comma separated)']]], ['spaces', 'Learning spaces', [['name', 'Name'], ['image', 'Image URL/path'], ['description', 'Description', 'textarea']]], ['hours', 'Opening hours', [['day', 'Day'], ['hours', 'Hours'], ['services', 'Services']]], ['registration', 'Registration steps', [['step', 'Step'], ['title', 'Title'], ['description', 'Description', 'textarea']]], ['digital', 'Digital resources', [['title', 'Title'], ['url', 'URL'], ['description', 'Description', 'textarea']]], ['outreach', 'Outreach initiatives', [['title', 'Title'], ['image', 'Image URL/path'], ['description', 'Description', 'textarea']]], ['gallery', 'Gallery', [['image', 'Image URL/path'], ['caption', 'Caption']]]]
    },
    primaryCare: {
      title: 'Primary healthcare profile', description: 'Edit PHCC and community clinic details.',
      scalars: [['facilityType', 'Facility type'], ['tagline', 'Tagline', 'textarea'], ['overview.heading', 'Overview heading'], ['location.landmark', 'Nearby landmark'], ['location.mapUrl', 'Map URL'], ['footerNote', 'Footer note', 'textarea']],
      repeaters: [['heroBadges', 'Hero badges', [['value', 'Badge']], true], ['stats', 'Statistics', [['label', 'Label'], ['value', 'Value']]], ['overview.paragraphs', 'About paragraphs', [['value', 'Paragraph', 'textarea']], true], ['overview.facts', 'About facts', [['label', 'Label'], ['value', 'Value']]], ['overview.history', 'History paragraphs', [['value', 'Paragraph', 'textarea']], true], ['todayServices', 'Services available today', [['value', 'Service']], true], ['coreServices', 'Core services', [['name', 'Name'], ['desc', 'Description', 'textarea'], ['icon', 'Icon'], ['cat', 'Category']]], ['maternalChild', 'Maternal and child care', [['name', 'Name'], ['desc', 'Description', 'textarea']]], ['weeklySchedule', 'Weekly schedule', [['day', 'Day'], ['services', 'Services (comma separated)']]], ['staff', 'Staff', [['name', 'Name'], ['role', 'Role'], ['qual', 'Qualifications'], ['img', 'Image URL/path']]], ['facilities', 'Facilities', [['name', 'Name'], ['desc', 'Description', 'textarea'], ['icon', 'Icon']]], ['accessibility', 'Accessibility', [['name', 'Name'], ['note', 'Note', 'textarea'], ['icon', 'Icon']]], ['hoursData', 'Hours', [['label', 'Label'], ['val', 'Value']]], ['faqs', 'FAQs', [['q', 'Question', 'textarea'], ['a', 'Answer', 'textarea']]]]
    },
    secondaryHospital: {
      title: 'Hospital profile', description: 'Edit specialist and teaching hospital details.',
      scalars: [['facilityType', 'Facility type'], ['tagline', 'Tagline', 'textarea'], ['overview.heading', 'Overview heading'], ['emergency.phone', 'Emergency phone'], ['emergency.hours', 'Emergency hours'], ['emergency.ambulanceStatus', 'Ambulance status'], ['location.landmark', 'Nearby landmark'], ['location.mapUrl', 'Map URL'], ['footerNote', 'Footer note', 'textarea']],
      repeaters: [['heroBadges', 'Hero badges', [['value', 'Badge']], true], ['stats', 'Statistics', [['label', 'Label'], ['value', 'Value']]], ['overview.paragraphs', 'About paragraphs', [['value', 'Paragraph', 'textarea']], true], ['overview.facts', 'About facts', [['label', 'Label'], ['value', 'Value']]], ['overview.history', 'History paragraphs', [['value', 'Paragraph', 'textarea']], true], ['departments', 'Departments', [['id', 'ID'], ['name', 'Name'], ['icon', 'Icon'], ['cat', 'Category'], ['desc', 'Description', 'textarea'], ['head', 'Department head'], ['phone', 'Phone'], ['hours', 'Hours']]], ['services', 'Services', [['name', 'Name'], ['desc', 'Description', 'textarea'], ['icon', 'Icon']]], ['doctors', 'Doctors', [['name', 'Name'], ['title', 'Title'], ['qual', 'Qualifications'], ['dept', 'Department'], ['avail', 'Availability'], ['img', 'Image URL/path']]], ['facilities', 'Facilities', [['name', 'Name'], ['desc', 'Description', 'textarea'], ['icon', 'Icon']]], ['galleryImages', 'Gallery images', [['src', 'Image URL/path'], ['cap', 'Caption']]], ['emergency.notices', 'Emergency notices', [['value', 'Notice', 'textarea']], true], ['hoursData', 'Hours', [['label', 'Label'], ['val', 'Value'], ['em', 'Emphasis']]], ['faqs', 'FAQs', [['q', 'Question', 'textarea'], ['a', 'Answer', 'textarea']]]]
    },
    pharmacy: {
      title: 'Pharmacy profile', description: 'Edit pharmacy services, catalogue, team, checks and delivery.',
      scalars: [['facilityType', 'Facility type'], ['tagline', 'Tagline', 'textarea'], ['overview.heading', 'Overview heading'], ['delivery.available', 'Delivery availability'], ['delivery.details', 'Delivery details', 'textarea'], ['delivery.phone', 'Delivery phone'], ['delivery.pickup', 'Pickup details'], ['medicineNotice', 'Medicine notice', 'textarea'], ['location.landmark', 'Nearby landmark'], ['location.mapUrl', 'Map URL'], ['footerNote', 'Footer note', 'textarea']],
      repeaters: [['heroBadges', 'Hero badges', [['value', 'Badge']], true], ['statusItems', 'Status information', [['label', 'Label'], ['value', 'Value']]], ['overview.paragraphs', 'Overview paragraphs', [['value', 'Paragraph', 'textarea']], true], ['overview.facts', 'Overview facts', [['label', 'Label'], ['value', 'Value']]], ['services', 'Services', [['name', 'Name'], ['desc', 'Description', 'textarea'], ['icon', 'Icon']]], ['medCategories', 'Medicine categories', [['name', 'Name'], ['count', 'Count'], ['icon', 'Icon'], ['rx', 'Prescription required (yes/no)']]], ['products', 'Products', [['id', 'ID'], ['name', 'Name'], ['cat', 'Category'], ['avail', 'Availability'], ['price', 'Price'], ['desc', 'Description', 'textarea'], ['rx', 'Prescription required (yes/no)']]], ['pharmacists', 'Pharmacists', [['name', 'Name'], ['role', 'Role'], ['qual', 'Qualifications'], ['img', 'Image URL/path']]], ['healthChecks', 'Health checks', [['name', 'Name'], ['price', 'Price'], ['icon', 'Icon']]], ['delivery.areas', 'Delivery areas', [['value', 'Area']], true], ['delivery.paymentOptions', 'Payment options', [['value', 'Payment option']], true], ['hoursData', 'Hours', [['label', 'Label'], ['val', 'Value']]], ['faqs', 'FAQs', [['q', 'Question', 'textarea'], ['a', 'Answer', 'textarea']]]]
    }
  };

  function getPath(object, path) { return path.split('.').reduce(function (value, key) { return value == null ? '' : value[key]; }, object) || ''; }
  function setPath(object, path, value) { var parts = path.split('.'); var target = object; parts.slice(0, -1).forEach(function (key) { target[key] = target[key] || {}; target = target[key]; }); target[parts[parts.length - 1]] = value; }
  function profileInput(label, type, value, path) {
    var wrapper = document.createElement('label'); wrapper.textContent = label;
    var input = document.createElement(type === 'textarea' ? 'textarea' : 'input'); input.value = value == null ? '' : (Array.isArray(value) ? value.join(', ') : value); input.dataset.profilePath = path; input.rows = type === 'textarea' ? 3 : undefined; wrapper.appendChild(input); return wrapper;
  }
  function renderProfileEditor(kind, profile) {
    var config = profileConfigs[kind], container = $('' + kind + '-profile-editor'); if (!container) return;
    container.innerHTML = '<div class="profile-heading"><div><h3>' + config.title + '</h3><p>' + config.description + '</p></div></div>';
    var scalarSection = document.createElement('div'); scalarSection.className = 'profile-section'; scalarSection.innerHTML = '<h4>Basic information</h4>'; var fields = document.createElement('div'); fields.className = 'profile-fields';
    config.scalars.forEach(function (definition) { fields.appendChild(profileInput(definition[1], definition[2] || 'text', getPath(profile, definition[0]), definition[0])); }); scalarSection.appendChild(fields); container.appendChild(scalarSection);
    config.repeaters.forEach(function (definition) { var section = document.createElement('div'); section.className = 'profile-section'; section.dataset.profileRepeater = definition[0]; section.innerHTML = '<h4>' + definition[1] + '</h4>'; var list = document.createElement('div'); list.className = 'profile-repeaters'; list.dataset.profileList = 'true'; section.appendChild(list); var add = document.createElement('button'); add.type = 'button'; add.className = 'button profile-add'; add.textContent = 'Add ' + definition[1].replace(/s$/, '').toLowerCase(); add.addEventListener('click', function () { addProfileItem(list, definition[2], definition[3] ? '' : {}); }); section.appendChild(add); var values = getPath(profile, definition[0]); if (Array.isArray(values)) values.forEach(function (item) { addProfileItem(list, definition[2], item); }); container.appendChild(section); });
  }
  function addProfileItem(list, fields, item) { var card = document.createElement('div'); card.className = 'profile-item'; var head = document.createElement('div'); head.className = 'profile-item-head'; var count = list.children.length + 1; head.innerHTML = '<strong>Item ' + count + '</strong>'; var remove = document.createElement('button'); remove.type = 'button'; remove.className = 'button profile-remove'; remove.textContent = 'Remove'; remove.addEventListener('click', function () { card.remove(); }); head.appendChild(remove); card.appendChild(head); var grid = document.createElement('div'); grid.className = 'profile-fields'; var primitive = !item || typeof item !== 'object'; fields.forEach(function (field) { var value = primitive ? item : item[field[0]]; if (field[0] === 'examples' || field[0] === 'benefits' || field[0] === 'services') value = Array.isArray(value) ? value.join(', ') : value; grid.appendChild(profileInput(field[1], field[2] || (field[0] === 'description' || field[0] === 'desc' || field[0] === 'detail' || field[0] === 'bio' || field[0] === 'note' || field[0] === 'a' || field[0] === 'q' ? 'textarea' : 'text'), value, primitive ? '$value' : field[0])); }); card.appendChild(grid); list.appendChild(card); }
  function readProfileEditor(kind) { var config = profileConfigs[kind], container = $(kind + '-profile-editor'), result = {}; if (!container) return result; config.scalars.forEach(function (definition) { var input = container.querySelector('[data-profile-path="' + definition[0] + '"]'); if (input) setPath(result, definition[0], input.value.trim()); }); config.repeaters.forEach(function (definition) { var section = container.querySelector('[data-profile-repeater="' + definition[0] + '"]'); var values = []; if (section) section.querySelectorAll('[data-profile-list="true"] > .profile-item').forEach(function (card) { var item = {}; card.querySelectorAll('[data-profile-path]').forEach(function (input) { var path = input.dataset.profilePath, value = input.value.trim(); if (path === '$value') { item.$value = value; return; } if (path === 'examples' || path === 'benefits' || path === 'services') value = value.split(',').map(function (part) { return part.trim(); }).filter(Boolean); if (path === 'rx') value = /^(true|yes|1)$/i.test(value); item[path] = value; }); values.push(definition[3] ? item.$value || '' : item); }); setPath(result, definition[0], values); }); return result; }
  function renderAllProfileEditors(record) {
    var active = isHealthcareRecord(record) ? 'healthcare' : isSchoolRecord(record) ? 'school' : isLearningRecord(record) ? 'learning' : isTechnicalRecord(record) ? 'technical' : isUniversityRecord(record) ? 'university' : '';
    ['school', 'university', 'technical', 'learning'].forEach(function (kind) {
      var container = $(kind + '-profile-editor');
      if (container) container.hidden = active !== kind;
      renderProfileEditor(kind, active === kind ? (record[kind === 'school' ? 'schoolProfile' : kind === 'university' ? 'universityProfile' : kind === 'technical' ? 'technicalProfile' : 'learningProfile'] || {}) : {});
    });
    var healthWrap = $('healthcare-profile-wrap');
    var healthProfile = record.healthcareProfile || {};
    if (healthWrap) healthWrap.hidden = active !== 'healthcare';
    $('healthcare-profile-type').value = healthProfile.type || healthcareType(record);
    ['primaryCare', 'secondaryHospital', 'pharmacy'].forEach(function (kind) {
      var container = $(kind + '-profile-editor');
      if (container) container.hidden = $('healthcare-profile-type').value !== kind;
      renderProfileEditor(kind, healthProfile[kind] || {});
    });
  }

  function fillForm(record) {
    $('record-id').value = record._id;
    $('editor-title').textContent = 'Edit ' + (record.displayName || 'place');
    $('display-name').value = record.displayName || '';
    $('slug').value = record.slug || '';
    $('category').value = record.category || 'Others';
    $('subcategory').value = record.subcategory || '';
    $('area').value = record.area || 'Yola';
    $('address').value = record.address || '';
    $('opening-hours').value = record.openingHours || '';
    $('phone').value = record.contact && record.contact.phone ? record.contact.phone : '';
    $('email').value = record.contact && record.contact.email ? record.contact.email : '';
    $('website').value = record.contact && record.contact.website ? record.contact.website : '';
    $('image').value = record.image || record.heroImage || '';
    $('hero-image').value = record.heroImage || record.image || '';
    $('gallery-images').value = (record.galleryImages || []).join(', ');
    $('gallery-captions').value = (record.galleryCaptions || []).join(', ');
    $('menu-items').value = JSON.stringify(record.menuItems || [], null, 2);
    $('highlights').value = (record.highlights || record.tags || []).join(', ');
    $('lat').value = record.coordinates && record.coordinates.lat != null ? record.coordinates.lat : '';
    $('lng').value = record.coordinates && record.coordinates.lng != null ? record.coordinates.lng : '';
    $('record-status').value = record.status || 'draft';
    $('verification-status').value = record.verificationStatus || 'unverified';
    $('rating-average').value = record.ratingAverage != null ? record.ratingAverage : 0;
    $('review-count').value = record.reviewCount != null ? record.reviewCount : 0;
    $('tags').value = (record.tags || []).join(', ');
    $('services').value = (record.services || []).join(', ');
    $('description').value = record.description || '';
    $('school-profile').value = JSON.stringify(record.schoolProfile || {}, null, 2);
    $('university-profile').value = JSON.stringify(record.universityProfile || {}, null, 2);
    $('technical-profile').value = JSON.stringify(record.technicalProfile || {}, null, 2);
    $('learning-profile').value = JSON.stringify(record.learningProfile || {}, null, 2);
    $('healthcare-profile').value = JSON.stringify(record.healthcareProfile || {}, null, 2);
    renderAllProfileEditors(record);
    updateSchoolPreview(record);
    updateUniversityPreview(record);
    updateTechnicalPreview(record);
    updateLearningPreview(record);
    updateHealthcarePreview(record);
    $('delete-record').hidden = false;
  }

  function updateSchoolPreview(record) {
    var link = $('school-preview');
    var school = record || { slug: $('slug').value.trim() };
    if (!link || !isSchoolRecord(school) || !school.slug) {
      if (link) link.hidden = true;
      return;
    }
    link.href = '/components/naviinfo/details/primary-secondaryschool-details.html?id=' + encodeURIComponent(school.slug);
    link.hidden = false;
  }

  function updateUniversityPreview(record) {
    var link = $('university-preview');
    var university = record || { slug: $('slug').value.trim() };
    if (!link || !isUniversityRecord(university) || !university.slug) {
      if (link) link.hidden = true;
      return;
    }
    link.href = '/components/naviinfo/details/university-details.html?id=' + encodeURIComponent(university.slug);
    link.hidden = false;
  }

  function updateTechnicalPreview(record) {
    var link = $('technical-preview');
    var technical = record || { category: $('category').value, subcategory: $('subcategory').value, displayName: $('display-name').value, slug: $('slug').value.trim() };
    if (!link || !isTechnicalRecord(technical) || !technical.slug) {
      if (link) link.hidden = true;
      return;
    }
    link.href = '/components/naviinfo/details/technical-institution-details.html?id=' + encodeURIComponent(technical.slug);
    link.hidden = false;
  }

  function updateLearningPreview(record) {
    var link = $('learning-preview');
    var learning = record || { category: $('category').value, subcategory: $('subcategory').value, displayName: $('display-name').value, slug: $('slug').value.trim() };
    if (!link || !isLearningRecord(learning) || !learning.slug) {
      if (link) link.hidden = true;
      return;
    }
    link.href = '/components/naviinfo/details/learning-hub-details.html?id=' + encodeURIComponent(learning.slug);
    link.hidden = false;
  }

  function updateHealthcarePreview(record) {
    var link = $('healthcare-preview');
    var health = record || { category: $('category').value, subcategory: $('subcategory').value, displayName: $('display-name').value, slug: $('slug').value.trim() };
    if (!link || !isHealthcareRecord(health) || !health.slug) {
      if (link) link.hidden = true;
      return;
    }
    var type = $('healthcare-profile-type') ? $('healthcare-profile-type').value : healthcareType(health);
    var page = type === 'pharmacy' ? 'pharmacy-details.html' : type === 'secondaryHospital' ? 'secondary-healthcare-details.html' : 'primary-healthcare-details.html';
    link.href = '/components/naviinfo/details/' + page + '?id=' + encodeURIComponent(health.slug);
    link.hidden = false;
  }

  function payload() {
    $('school-profile').value = JSON.stringify(readProfileEditor('school'));
    $('university-profile').value = JSON.stringify(readProfileEditor('university'));
    $('technical-profile').value = JSON.stringify(readProfileEditor('technical'));
    $('learning-profile').value = JSON.stringify(readProfileEditor('learning'));
    var healthcareProfile = {
      type: $('healthcare-profile-type').value,
      primaryCare: readProfileEditor('primaryCare'),
      secondaryHospital: readProfileEditor('secondaryHospital'),
      pharmacy: readProfileEditor('pharmacy')
    };
    $('healthcare-profile').value = JSON.stringify(healthcareProfile);
    var schoolProfile = {};
    var profileText = $('school-profile').value.trim();
    if (profileText) {
      schoolProfile = JSON.parse(profileText);
      if (!schoolProfile || Array.isArray(schoolProfile) || typeof schoolProfile !== 'object') {
        throw new Error('School profile must be a JSON object');
      }
    }
    var universityProfile = {};
    var universityProfileText = $('university-profile').value.trim();
    if (universityProfileText) {
      universityProfile = JSON.parse(universityProfileText);
      if (!universityProfile || Array.isArray(universityProfile) || typeof universityProfile !== 'object') {
        throw new Error('University profile must be a JSON object');
      }
    }
    var technicalProfile = {};
    var technicalProfileText = $('technical-profile').value.trim();
    if (technicalProfileText) {
      technicalProfile = JSON.parse(technicalProfileText);
      if (!technicalProfile || Array.isArray(technicalProfile) || typeof technicalProfile !== 'object') {
        throw new Error('Technical profile must be a JSON object');
      }
    }
    var learningProfile = {};
    var learningProfileText = $('learning-profile').value.trim();
    if (learningProfileText) {
      learningProfile = JSON.parse(learningProfileText);
      if (!learningProfile || Array.isArray(learningProfile) || typeof learningProfile !== 'object') {
        throw new Error('Learning profile must be a JSON object');
      }
    }
    return {
      displayName: $('display-name').value.trim(),
      slug: $('slug').value.trim(),
      category: $('category').value,
      subcategory: $('subcategory').value.trim(),
      area: $('area').value.trim() || 'Yola',
      address: $('address').value.trim(),
      description: $('description').value.trim(),
      schoolProfile: schoolProfile,
      universityProfile: universityProfile,
      technicalProfile: technicalProfile,
      learningProfile: learningProfile,
      healthcareProfile: isHealthcareRecord({ category: $('category').value, subcategory: $('subcategory').value, displayName: $('display-name').value }) ? healthcareProfile : undefined,
      coordinates: {
        lat: $('lat').value === '' ? null : Number($('lat').value),
        lng: $('lng').value === '' ? null : Number($('lng').value)
      },
      tags: splitList($('tags').value),
      services: splitList($('services').value),
      highlights: splitList($('highlights').value),
      openingHours: $('opening-hours').value.trim(),
      image: $('image').value.trim(),
      heroImage: $('hero-image').value.trim(),
      galleryImages: splitList($('gallery-images').value),
      galleryCaptions: splitList($('gallery-captions').value),
      menuItems: parseMenuItems($('menu-items').value),
      contact: {
        phone: $('phone').value.trim(),
        email: $('email').value.trim(),
        website: $('website').value.trim()
      },
      status: $('record-status').value,
      verificationStatus: $('verification-status').value,
      ratingAverage: Number($('rating-average').value || 0),
      reviewCount: Number($('review-count').value || 0)
    };
  }

  function loadRecords() {
    return request('/api/admin/content/navigation-places').then(function (data) {
      state.records = data.items || [];
      populateCategoryOptions();
      renderRecords();
      status('Loaded ' + state.records.length + ' listings.', 'success');
    });
  }

  function seedRestaurantMedia(force) {
    if (force && !window.confirm('Replace existing restaurant gallery and menu media with the seed data?')) return;
    var button = force ? $('replace-restaurant-media') : $('seed-restaurant-media');
    if (button) button.disabled = true;
    status(force ? 'Replacing restaurant media...' : 'Filling missing restaurant media...', '');
    request('/api/admin/content/navigation-places/seed-restaurant-media', {
      method: 'POST',
      body: JSON.stringify({ force: force })
    }).then(function (data) {
      status(data.message + ' Updated: ' + data.updated.length + ', skipped: ' + data.skipped.length + ', missing records: ' + data.missing.length + '.', 'success');
      return loadRecords();
    }).catch(function (error) {
      status(error.message, 'error');
    }).finally(function () {
      if (button) button.disabled = false;
    });
  }

  $('seed-restaurant-media').addEventListener('click', function () { seedRestaurantMedia(false); });
  $('replace-restaurant-media').addEventListener('click', function () { seedRestaurantMedia(true); });

  $('approve-pending').addEventListener('click', function () {
    var pending = state.records.filter(function (record) { return record.status === 'pending' || record.status === 'draft'; });
    if (!pending.length) {
      status('There are no pending or draft listings to approve.', 'success');
      return;
    }

    if (!window.confirm('Publish ' + pending.length + ' pending/draft listings?')) return;

    Promise.all(pending.map(function (record) {
      return request('/api/admin/content/navigation-places/' + encodeURIComponent(record._id) + '/moderation', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'published' })
      });
    })).then(function () {
      status('Approved ' + pending.length + ' listings.', 'success');
      return loadRecords();
    }).catch(function (error) {
      status(error.message, 'error');
    });
  });

  $('new-record').addEventListener('click', function () {
    clearForm();
    renderRecords();
  });

  $('reset-form').addEventListener('click', function () {
    if (state.selected) {
      fillForm(state.selected);
    } else {
      clearForm();
    }
  });

  $('status-filter').addEventListener('change', renderRecords);

  $('navi-form').addEventListener('submit', function (event) {
    event.preventDefault();
    var id = $('record-id').value;
    var body;
    try {
      body = payload();
    } catch (error) {
      status('Menu items must be valid JSON: ' + error.message, 'error');
      return;
    }

    request(id ? '/api/admin/content/navigation-places/' + encodeURIComponent(id) : '/api/admin/content/navigation-places', {
      method: id ? 'PUT' : 'POST',
      body: JSON.stringify(body)
    }).then(function () {
      status('Listing saved.', 'success');
      return loadRecords();
    }).catch(function (error) {
      status(error.message, 'error');
    });
  });

  function updatePreviewFromForm() {
    var record = { category: $('category').value, subcategory: $('subcategory').value, slug: $('slug').value.trim() };
    updateSchoolPreview(record);
    updateUniversityPreview(record);
    updateTechnicalPreview(record);
    updateLearningPreview(record);
    updateHealthcarePreview(record);
  }

  $('slug').addEventListener('input', updatePreviewFromForm);
  $('category').addEventListener('change', function () {
    updatePreviewFromForm();
    if (!$('record-id').value) {
      var draft = { category: $('category').value, subcategory: $('subcategory').value, displayName: $('display-name').value };
      if (isHealthcareRecord(draft)) draft.healthcareProfile = { type: healthcareType(draft) };
      renderAllProfileEditors(draft);
    }
  });
  $('subcategory').addEventListener('input', updatePreviewFromForm);
  $('display-name').addEventListener('input', updatePreviewFromForm);
  $('healthcare-profile-type').addEventListener('change', function () {
    ['primaryCare', 'secondaryHospital', 'pharmacy'].forEach(function (kind) {
      $(kind + '-profile-editor').hidden = $('healthcare-profile-type').value !== kind;
    });
    updateHealthcarePreview();
  });

  $('delete-record').addEventListener('click', function () {
    var id = $('record-id').value;
    if (!id || !window.confirm('Delete this navigation place permanently?')) return;

    request('/api/admin/content/navigation-places/' + encodeURIComponent(id), { method: 'DELETE' })
      .then(function () {
        clearForm();
        return loadRecords();
      })
      .then(function () {
        status('Listing deleted.', 'success');
      })
      .catch(function (error) {
        status(error.message, 'error');
      });
  });

  loadRecords().catch(function (error) {
    var message = error.message === 'Content administrator access required'
      ? 'This account is signed in but is not a content-admin. Sign out and use the account created at /admin/setup.html, or ask an existing admin to promote this account.'
      : error.message + '. Sign in with a content-admin account first.';
    status(message, 'error');
  });
}());

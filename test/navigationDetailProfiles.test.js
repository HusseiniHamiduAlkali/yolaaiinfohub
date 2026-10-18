const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const NavigationPlace = require('../server/navigationPlaceModel');
const { slugify } = require('../server/professionalTaxonomy');
const { parseCards, makeProfile, mergeMissing, makePlace } = require('../scripts/initialize-navigation-detail-profiles');
const navigationPlaceImporter = require('../scripts/import-navigation-places');
const templateProfileInitializer = require('../scripts/initialize-navigation-template-profiles');
const demoProfileInitializer = require('../scripts/initialize-navigation-demo-profiles');
const { PROFILE_FIELDS, detailProfileType } = require('../server/navigationProfileTypes');
const { prepareReviewableProfileUpdate, profileFieldsToUnset } = require('../server/navigationProfileSeedPolicy');

const profileFields = {
  flightAgent: 'flightAgentProfile',
  fillingStation: 'fillingStationProfile',
  bank: 'bankProfile'
};

test('catalogs every flight, filling station, and bank card by its stable ID', () => {
  const cards = parseCards();
  const allImportedCards = new Map(navigationPlaceImporter.parseCards().map(function (card) {
    return [card.slug, card];
  }));
  const counts = cards.reduce(function (result, card) {
    result[card.kind] = (result[card.kind] || 0) + 1;
    return result;
  }, {});

  assert.equal(cards.length, 39);
  assert.deepEqual(counts, { flightAgent: 6, fillingStation: 9, bank: 24 });
  assert.equal(new Set(cards.map(function (card) { return card.slug; })).size, 39);
  cards.forEach(function (card) {
    const imported = allImportedCards.get(card.slug);
    assert.ok(imported, card.slug);
    assert.equal(imported.subcategory, card.subcategory, card.slug);
    assert.equal(imported.detailProfileType, card.kind, card.slug);
  });
});

test('template-derived profile values cast through each strict database schema', () => {
  parseCards().forEach(function (card) {
    const field = profileFields[card.kind];
    const profile = makeProfile(card);
    const place = new NavigationPlace({
      slug: card.slug,
      displayName: card.displayName,
      category: card.category,
      [field]: profile
    }).toObject();

    assert.deepEqual(Object.keys(place[field]).sort(), Object.keys(profile).sort(), card.slug);
    if (card.kind === 'flightAgent') {
      assert.equal(place[field].destinations[0].name, profile.destinations[0].name, card.slug);
      assert.equal(place[field].destinations[0].type, profile.destinations[0].type, card.slug);
    }
  });
});

test('flight, filling station, and bank profile seeds create unverified draft records', () => {
  parseCards().forEach(function (card) {
    const place = new NavigationPlace(makePlace(card, makeProfile(card))).toObject();
    assert.equal(place.status, 'draft', card.slug);
    assert.equal(place.verificationStatus, 'unverified', card.slug);
    assert.equal(place.seedReviewRequired, true, card.slug);
    assert.equal(place.subcategory, card.subcategory, card.slug);
    assert.equal(place.detailProfileType, detailProfileType(card), card.slug);
  });
});

test('seed merging fills blanks and preserves existing nonempty administrator values', () => {
  const seeded = {
    name: 'Seeded name',
    description: 'Seeded description',
    facts: [{ label: 'Area', value: 'Yola' }],
    contacts: { phone: '000', email: 'contact@example.invalid' }
  };
  const existing = {
    name: 'Admin edited name',
    description: '',
    facts: [{ label: 'Custom fact', value: 'Preserve this' }],
    contacts: { phone: '', email: 'editor@example.invalid' }
  };

  const merged = mergeMissing(existing, seeded);
  assert.equal(merged.name, 'Admin edited name');
  assert.equal(merged.description, 'Seeded description');
  assert.deepEqual(merged.facts, existing.facts);
  assert.equal(merged.contacts.phone, '000');
  assert.equal(merged.contacts.email, 'editor@example.invalid');
  assert.deepEqual(mergeMissing(merged, seeded), merged);
});

test('sample profile seeding protects published and non-draft records', () => {
  assert.equal(prepareReviewableProfileUpdate({ status: 'published' }, { schoolProfile: {} }), null);
  assert.equal(prepareReviewableProfileUpdate({ status: 'pending' }, { schoolProfile: {} }, { demotePublished: true }), null);
  assert.deepEqual(
    prepareReviewableProfileUpdate({ status: 'draft', verificationStatus: 'verified' }, { schoolProfile: {} }),
    { schoolProfile: {}, seedReviewRequired: true, verificationStatus: 'unverified' }
  );
  assert.deepEqual(
    prepareReviewableProfileUpdate({ status: 'published', verificationStatus: 'verified' }, { schoolProfile: {} }, { demotePublished: true }),
    { schoolProfile: {}, seedReviewRequired: true, status: 'draft', verificationStatus: 'unverified' }
  );
});

test('base importer catalogs 191 active cards and the three selected Green Spaces cards', () => {
  const cards = navigationPlaceImporter.parseCards();
  const inventory = navigationPlaceImporter.summarize(cards);

  assert.equal(inventory.found, 194);
  assert.deepEqual(inventory.duplicateIds, []);
  assert.equal(inventory.counts['Parks and Recreation'], 9);
  assert.equal(cards.filter(function (card) { return card.subcategory === 'Parks and Recreation'; }).length, 9);
  assert.equal(new Set(cards.map(function (card) { return card.slug; })).size, 194);
  assert.ok(cards.some(function (card) { return card.slug === 'benue-valley-reserve'; }));
  assert.ok(cards.some(function (card) { return card.slug === 'yola-community-garden'; }));
  assert.ok(cards.some(function (card) { return card.slug === 'yola-eco-park'; }));
});

test('base importer assigns the same subcategory to cards using the same detail template', () => {
  const source = fs.readFileSync(path.join(__dirname, '../templates/navi.html'), 'utf8');
  const blocks = source.match(/<article\b[^>]*>[\s\S]*?<\/article>/gi) || [];
  const recordsBySlug = new Map(navigationPlaceImporter.parseCards().map(function (card) {
    return [card.slug, card];
  }));
  const subcategoriesByPage = new Map();
  const profileTypesByPage = new Map();

  blocks.forEach(function (block) {
    if (!/href="[^"]*details\/[^"]+\.html(?:[?#][^"]*)?"/i.test(block)) return;
    const page = navigationPlaceImporter.detailPageFromCard(block);
    const placeId = (block.match(/<article\b[^>]*data-place-id="([^"]+)"/i) || [])[1] ||
      (block.match(/href="[^"]*[?&](?:id|slug)=([^&#"]+)/i) || [])[1];
    const imported = placeId && recordsBySlug.get(slugify(decodeURIComponent(placeId)));
    if (!page || !imported) return;
    const configuration = navigationPlaceImporter.detailPageConfigurations[page];
    assert.ok(configuration, page);
    assert.equal(imported.subcategory, configuration.subcategory, imported.slug);
    assert.equal(imported.detailProfileType, configuration.detailProfileType, imported.slug);
    const subcategory = imported.subcategory;
    if (!subcategoriesByPage.has(page)) subcategoriesByPage.set(page, new Set());
    subcategoriesByPage.get(page).add(subcategory);
    if (!profileTypesByPage.has(page)) profileTypesByPage.set(page, new Set());
    profileTypesByPage.get(page).add(imported.detailProfileType);
  });

  assert.ok(subcategoriesByPage.size >= 20);
  subcategoriesByPage.forEach(function (subcategories, page) {
    assert.equal(subcategories.size, 1, page);
    assert.equal(profileTypesByPage.get(page).size, 1, page);
  });
  assert.equal(subcategoriesByPage.get('mosque-details.html').values().next().value, 'Mosques');
  assert.equal(subcategoriesByPage.get('church-details.html').values().next().value, 'Churches');
  assert.equal(subcategoriesByPage.get('iconic-structures.html').values().next().value, 'Iconic Structures');
  assert.equal(subcategoriesByPage.get('primary-healthcare-details.html').values().next().value, 'Primary Healthcare');
  assert.equal(subcategoriesByPage.get('secondary-healthcare-details.html').values().next().value, 'Secondary Healthcare');
});

test('every detail page profile type resolves to a field in the strict Navi schema', () => {
  const pages = navigationPlaceImporter.detailPageConfigurations;
  Object.keys(pages).forEach(function (page) {
    const configuration = pages[page];
    const profileType = configuration.detailProfileType;
    const field = PROFILE_FIELDS[profileType];
    assert.equal(configuration.profileField, field, page);
    if (field) assert.ok(NavigationPlace.schema.path(field), page + ' -> ' + field);
    if (configuration.profileBranch) {
      assert.ok(NavigationPlace.schema.path('healthcareProfile.' + configuration.profileBranch + '.facilityType'), page + ' -> ' + configuration.profileBranch);
    }
  });
  navigationPlaceImporter.parseCards().forEach(function (card) {
    assert.ok(card.subcategory, card.slug + ' has no subcategory');
    assert.ok(Object.prototype.hasOwnProperty.call(PROFILE_FIELDS, card.detailProfileType), card.slug);
  });
});

test('healthcare detail pages use distinct profile branches and cleanup preserves only the matching family', () => {
  const pages = navigationPlaceImporter.detailPageConfigurations;
  assert.equal(pages['primary-healthcare-details.html'].profileBranch, 'primaryCare');
  assert.equal(pages['secondary-healthcare-details.html'].profileBranch, 'secondaryHospital');
  assert.equal(pages['pharmacy-details.html'].profileBranch, 'pharmacy');
  assert.equal(new Set([
    pages['primary-healthcare-details.html'].profileBranch,
    pages['secondary-healthcare-details.html'].profileBranch,
    pages['pharmacy-details.html'].profileBranch
  ]).size, 3);
  const unset = profileFieldsToUnset('schoolProfile');
  assert.equal(Object.hasOwn(unset, 'schoolProfile'), false);
  assert.equal(Object.hasOwn(unset, 'healthcareProfile'), true);
  assert.equal(Object.hasOwn(unset, 'bankProfile'), true);
});

test('template profile merging preserves matching values while pruning unrelated nested fields', () => {
  const template = {
    name: '',
    hero: { image: '', alt: '' },
    sections: [{ title: '', content: '' }]
  };
  const existing = {
    name: 'Administrator-edited name',
    hero: { image: '/uploads/hero.jpg', alt: 'Edited alt text', trackingId: 'remove' },
    sections: [{ title: 'Edited title', content: 'Edited content', internalNote: 'remove' }],
    unrelatedProfileField: 'remove'
  };

  assert.deepEqual(templateProfileInitializer.mergeTemplateProfile(existing, template), {
    name: 'Administrator-edited name',
    hero: { image: '/uploads/hero.jpg', alt: 'Edited alt text' },
    sections: [{ title: 'Edited title', content: 'Edited content' }]
  });
});

test('template profile updates prune mismatched keys and preserve administrator metadata', () => {
  const templates = templateProfileInitializer.makeTemplateProfiles();
  const card = navigationPlaceImporter.parseCards().find(function (candidate) {
    return templateProfileInitializer.profileKind(candidate) === 'mosque';
  });
  const existingProfile = Object.assign({}, templates.mosque, {
    name: 'Administrator-edited mosque name',
    unrelatedField: 'remove',
    demoContent: true,
    demoNotice: 'Keep this review note',
    seededFromExample: false,
    seedReviewRequired: false
  });
  const summary = templateProfileInitializer.prepareProfileUpdates(
    [card],
    [{ slug: card.slug, status: 'draft', mosqueProfile: existingProfile }],
    templates
  );

  assert.equal(summary.updates.length, 1);
  const updated = summary.updates[0].profile;
  assert.equal(updated.name, 'Administrator-edited mosque name');
  assert.equal(updated.unrelatedField, undefined);
  assert.equal(updated.demoContent, true);
  assert.equal(updated.demoNotice, 'Keep this review note');
  assert.equal(updated.seedReviewRequired, false);
});

test('base importer seeds drafts and preserves populated fields and moderation state on rerun', () => {
  const cards = navigationPlaceImporter.parseCards();
  const seeded = cards.find(function (card) { return card.slug === 'benue-valley-reserve'; });
  const existing = Object.assign({}, seeded, {
    displayName: 'Admin-edited place name',
    description: 'Admin-edited description',
    status: 'published',
    verificationStatus: 'verified',
    contact: { phone: '+2348000000000', email: '', website: '' }
  });
  const merged = navigationPlaceImporter.mergeMissing(existing, seeded);

  assert.equal(seeded.status, 'draft');
  assert.equal(seeded.verificationStatus, 'unverified');
  assert.equal(seeded.seedReviewRequired, true);
  assert.equal(merged.displayName, 'Admin-edited place name');
  assert.equal(merged.description, 'Admin-edited description');
  assert.equal(merged.status, 'published');
  assert.equal(merged.verificationStatus, 'verified');
  assert.equal(merged.contact.phone, '+2348000000000');
  assert.equal(navigationPlaceImporter.mergeImportedRecord({ subcategory: 'Old grouping' }, seeded).subcategory, seeded.subcategory);
  assert.deepEqual(navigationPlaceImporter.mergeMissing(merged, seeded), merged);
  assert.deepEqual(navigationPlaceImporter.mergeBaseRecord({ tags: [], displayName: 'Edited' }, { tags: ['seed'], displayName: 'Original' }), { tags: [], displayName: 'Edited' });
});

test('each Navi card resolves to one matching detail profile family or the generic fallback', () => {
  const cards = navigationPlaceImporter.parseCards();
  const types = cards.map(detailProfileType);
  assert.equal(types.length, 194);
  types.forEach(function (type) { assert.ok(Object.prototype.hasOwnProperty.call(PROFILE_FIELDS, type), type); });
  assert.equal(detailProfileType(cards.find(card => card.slug === 'benue-valley-reserve')), 'parksRecreation');
  assert.equal(detailProfileType(cards.find(card => card.slug === 'fresh-air-mass-transit-bus-stops')), 'generic');
  assert.equal(detailProfileType(cards.find(card => card.slug === 'muna-hotel')), 'hospitality');
  assert.equal(detailProfileType(cards.find(card => card.slug === 'items7-restaurant')), 'generic');
  assert.equal(detailProfileType(cards.find(card => card.slug === 'modibbo-adama-teaching-hospital-mauth-yola')), 'healthcare');
  const generic = new NavigationPlace({ slug: 'generic-profile-contract', displayName: 'Generic', category: 'Agents' }).toObject();
  assert.equal(generic.detailProfileType, 'generic');
  assert.equal(generic.schoolProfile, undefined);
  assert.equal(generic.healthcareProfile, undefined);
});

test('all nine venue template profiles cast their declared root fields and nested data', () => {
  const profiles = {
    commercialCenterProfile: { name: 'Market', categories: [{ name: 'Produce' }] },
    churchProfile: { name: 'Church', worship: [{ day: 'Sunday', services: ['10 AM'] }] },
    mosqueProfile: { name: 'Mosque', prayers: [{ name: 'Fajr', time: '5 AM' }] },
    judiciaryProfile: { name: 'Court', sittingDays: { rows: [{ div: 'Civil' }] } },
    parksRecreationProfile: { name: 'Park', activities: [{ name: 'Walking' }] },
    eventCenterProfile: { name: 'Venue', halls: [{ name: 'Main Hall' }] },
    hospitalityProfile: { name: 'Hotel', rooms: [{ name: 'Standard' }] },
    iconicStructureProfile: { name: 'Landmark', milestones: [{ year: '1900' }] },
    sportsSpaProfile: { name: 'Sports Centre', weeklySchedule: [{ day: 'Monday' }] }
  };
  const place = new NavigationPlace(Object.assign({
    slug: 'profile-contract-test',
    displayName: 'Profile contract test',
    category: 'Test'
  }, profiles, {
    commercialCenterProfile: Object.assign({}, profiles.commercialCenterProfile, { unknownRootField: 'discarded' })
  })).toObject();

  Object.keys(profiles).forEach(function (field) {
    assert.deepEqual(place[field], Object.assign({ demoContent: false, demoNotice: '', seededFromExample: false, seedReviewRequired: false }, profiles[field]), field);
  });
  assert.equal(place.commercialCenterProfile.unknownRootField, undefined);
});

test('every specialized card profile preserves its details-page fields and image slots', () => {
  const templates = templateProfileInitializer.makeTemplateProfiles();
  const cards = navigationPlaceImporter.parseCards();
  const checked = {};
  cards.forEach(function (card) {
    const kind = templateProfileInitializer.profileKind(card);
    if (!kind || checked[kind] || !templates[kind]) return;
    const profile = templateProfileInitializer.makeProfile(card, kind, templates);
    const contract = templateProfileInitializer.validateProfileAgainstTemplate(profile, templates[kind]);
    assert.deepEqual(contract.missingFields, [], kind);
    assert.equal(contract.imageSlotsMatch, true, kind);
    const place = new NavigationPlace({ slug: card.slug, displayName: card.displayName, category: card.category, [PROFILE_FIELDS[kind]]: profile }).toObject();
    const castProfile = place[PROFILE_FIELDS[kind]];
    Object.keys(profile).filter(function (key) { return !['seededFromExample', 'seedReviewRequired'].includes(key); }).forEach(function (key) {
      assert.ok(Object.prototype.hasOwnProperty.call(castProfile, key), kind + '.' + key);
    });
    checked[kind] = true;
  });
  assert.deepEqual(Object.keys(checked).sort(), ['church', 'commercialCenter', 'eventCenter', 'iconicStructure', 'judiciary', 'mosque', 'parksRecreation', 'sportsSpa'].sort());
});

test('template-profile initializer maps split religion and lodging categories to page-specific profiles', () => {
  assert.equal(templateProfileInitializer.profileKind({ category: 'Religious Centers', displayName: 'Central Mosque', slug: 'central-mosque' }), 'mosque');
  assert.equal(templateProfileInitializer.profileKind({ category: 'Religious Centers', displayName: 'Community Masjid', slug: 'community-masjid' }), 'mosque');
  assert.equal(templateProfileInitializer.profileKind({ category: 'Religious Centers', displayName: 'Community Church', slug: 'community-church' }), 'church');
  assert.equal(templateProfileInitializer.profileKind({ category: 'Religious Centers', displayName: 'Catholic Secretariat', slug: 'catholic-secretariat' }), 'church');
  assert.equal(templateProfileInitializer.profileKind({ category: 'Hotels and Restaurants', displayName: 'Muna Hotel', slug: 'muna-hotel' }), 'hospitality');
  assert.equal(templateProfileInitializer.profileKind({ category: 'Hotels and Restaurants', displayName: 'Cafe Yola', slug: 'cafe-yola' }), '');
  assert.equal(templateProfileInitializer.profileKind({ category: 'Parks', displayName: 'Option 365 Resort', slug: 'option-365-resort' }), 'parksRecreation');
  assert.equal(templateProfileInitializer.profileKind({ category: 'Agents', displayName: 'Adamawa Sunshine Motor Park', slug: 'adamawa-sunshine-motor-park' }), '');
});

test('template-profile classifier covers the intended 63 card records by family', () => {
  const counts = {};
  navigationPlaceImporter.parseCards().forEach(function (card) {
    const kind = templateProfileInitializer.profileKind(card);
    if (kind) counts[kind] = (counts[kind] || 0) + 1;
  });
  assert.deepEqual(counts, {
    commercialCenter: 9,
    church: 3,
    mosque: 9,
    judiciary: 3,
    parksRecreation: 9,
    eventCenter: 9,
    hospitality: 9,
    iconicStructure: 6,
    sportsSpa: 6
  });
});

test('template-profile examples carry explicit review markers and retain existing profile edits', () => {
  const templates = templateProfileInitializer.makeTemplateProfiles();
  const card = { slug: 'muna-hotel', displayName: 'Muna Hotel', category: 'Hotels', subcategory: 'Hotels', description: 'Hotel listing', address: 'Yola, Adamawa State', area: 'Yola', openingHours: '', image: '', contact: {} };
  const profile = templateProfileInitializer.makeProfile(card, 'hospitality', templates);
  const place = new NavigationPlace({ slug: card.slug, displayName: card.displayName, category: card.category, hospitalityProfile: profile }).toObject();

  assert.equal(profile.seededFromExample, false);
  assert.equal(profile.seedReviewRequired, true);
  assert.equal(place.hospitalityProfile.name, card.displayName);
  assert.equal(place.hospitalityProfile.seedReviewRequired, true);
  const existing = { name: 'Admin-edited name', amenities: ['Verified amenity'] };
  assert.deepEqual(mergeMissing(existing, profile).amenities, existing.amenities);
  assert.equal(mergeMissing(existing, profile).name, 'Admin-edited name');
  assert.deepEqual(templateProfileInitializer.mergeTemplateProfile({ amenities: [] }, profile).amenities, []);
  assert.equal(templateProfileInitializer.prepareProfileUpdates(
    [{ slug: card.slug, displayName: card.displayName, category: card.category, subcategory: card.subcategory, description: card.description, address: card.address, area: card.area, openingHours: card.openingHours, image: card.image, contact: card.contact }],
    [{ slug: card.slug, displayName: card.displayName, category: card.category, status: 'published', hospitalityProfile: Object.assign({}, profile, { seededFromExample: true }) }],
    templates
  ).updates.length, 0);

  const published = { slug: card.slug, displayName: card.displayName, category: card.category, status: 'published' };
  const defaultRun = templateProfileInitializer.prepareProfileUpdates([card], [published], templates);
  assert.deepEqual(defaultRun.publishedSkipped, [card.slug]);
  assert.equal(defaultRun.updates.length, 0);
  const explicitRun = templateProfileInitializer.prepareProfileUpdates([card], [published], templates, { demotePublished: true });
  assert.equal(explicitRun.updates.length, 1);
  assert.equal(explicitRun.updates[0].demote, true);
});

test('template-profile initializer extracts all nine page datasets including array-driven pages', () => {
  const templates = templateProfileInitializer.makeTemplateProfiles();
  ['commercialCenter', 'church', 'mosque', 'judiciary', 'parksRecreation', 'eventCenter', 'iconicStructure', 'sportsSpa'].forEach(function (kind) {
    assert.ok(templates[kind] && typeof templates[kind] === 'object', kind);
  });
  assert.equal(templates.iconicStructure.highlights.length, 5);
  assert.equal(templates.iconicStructure.aboutParagraphs.length, 3);
  assert.equal(templates.iconicStructure.quickInfo[0].title, 'Historic Palace');
  assert.equal(templates.iconicStructure.galleryImages.length, 6);
  assert.equal(templates.sportsSpa.services.length, 9);
  assert.equal(templates.sportsSpa.weeklySchedule.length, 7);
  assert.equal(templates.sportsSpa.facts.length, 4);
  assert.equal(templates.sportsSpa.statusItems.length, 4);
});

test('all-card demo seeder creates 194 generic profiles and 63 specialized demo profiles without publishing', () => {
  const cards = navigationPlaceImporter.parseCards();
  const records = cards.map(function (card) {
    return { slug: card.slug, status: 'published', verificationStatus: 'unverified', demoPublished: false };
  });
  const summary = demoProfileInitializer.buildDemoUpdates(cards, records, templateProfileInitializer.makeTemplateProfiles());

  assert.equal(summary.cardCount, 194);
  assert.equal(summary.genericProfiles, 194);
  assert.equal(summary.specializedProfiles, 63);
  assert.equal(summary.updates.length, 194);
  const eventUpdate = summary.updates.find(function (update) { return update.slug === 'mahmudu-ribadu-square-yola'; });
  assert.equal(eventUpdate.changes.demoProfile.demoContent, true);
  assert.equal(eventUpdate.changes.demoPublished, false);
  assert.equal(eventUpdate.changes.eventCenterProfile.demoContent, true);
  assert.equal(eventUpdate.changes.eventCenterProfile.seedReviewRequired, true);
  assert.equal(Object.prototype.hasOwnProperty.call(eventUpdate.changes, 'status'), false);
});

test('all-card demo seeder skips released demos and preserves existing profile edits', () => {
  const cards = [{ slug: 'test-place', displayName: 'Test Place', category: 'Others', subcategory: 'Others', description: 'Card description', address: 'Yola', area: 'Yola', image: 'Data/Images/test.jpg', tags: ['test'], services: [] }];
  const records = [{ slug: 'test-place', status: 'published', demoContent: true, demoPublished: true, demoProfile: { title: 'Already published demo' } }];
  const summary = demoProfileInitializer.buildDemoUpdates(cards, records, {});
  assert.deepEqual(summary.alreadyReleased, ['test-place']);
  assert.equal(summary.updates.length, 0);
});

require('dotenv').config();

const mongoose = require('mongoose');
const NavigationPlace = require('../server/navigationPlaceModel');
const { parseCards } = require('./import-navigation-places');
const { profileKind, makeTemplateProfiles, makeProfile } = require('./initialize-navigation-template-profiles');

const DEMO_NOTICE = 'Illustrative demo content. Details and images are not verified real-world information.';
const profileFields = {
  commercialCenter: 'commercialCenterProfile', church: 'churchProfile', mosque: 'mosqueProfile',
  judiciary: 'judiciaryProfile', parksRecreation: 'parksRecreationProfile', eventCenter: 'eventCenterProfile',
  hospitality: 'hospitalityProfile', iconicStructure: 'iconicStructureProfile', sportsSpa: 'sportsSpaProfile'
};

function makeGenericDemoProfile(card) {
  const image = card.image || '';
  return {
    title: card.displayName,
    summary: card.description || 'No description was provided in the Navi directory card.',
    category: card.subcategory || card.category || 'NaviInfo listing',
    location: card.address || card.area || 'Yola, Adamawa State',
    openingHours: card.openingHours || '',
    highlights: Array.isArray(card.tags) ? card.tags.slice() : [],
    services: Array.isArray(card.services) ? card.services.slice() : [],
    facilities: [],
    visitorInfo: 'Illustrative starter profile based on the existing Navi card. Confirm details with the listing before relying on them.',
    galleryImages: image ? [{ image: image, caption: 'Illustrative directory image', illustrative: true }] : [],
    faqs: [],
    demoContent: true,
    demoNotice: DEMO_NOTICE
  };
}

function mergeDemoValue(existing, seeded) {
  if (existing === undefined || existing === null || (typeof existing === 'string' && !existing.trim())) return seeded;
  if (Array.isArray(existing)) return existing.length ? existing : seeded;
  if (typeof existing !== 'object' || typeof seeded !== 'object' || !seeded) return existing;
  const merged = Object.assign({}, existing);
  Object.keys(seeded).forEach(function (key) {
    merged[key] = Object.prototype.hasOwnProperty.call(existing, key)
      ? mergeDemoValue(existing[key], seeded[key])
      : seeded[key];
  });
  return merged;
}

function markDemo(profile) {
  const marked = Object.assign({}, profile || {});
  marked.demoContent = true;
  marked.demoNotice = DEMO_NOTICE;
  marked.seededFromExample = true;
  marked.seedReviewRequired = true;
  return marked;
}

function buildDemoUpdates(cards, records, templates) {
  const recordsBySlug = new Map(records.map(function (record) { return [record.slug, record]; }));
  const summary = {
    cardCount: cards.length,
    genericProfiles: 0,
    specializedProfiles: 0,
    missingRecords: [],
    alreadyReleased: [],
    unchanged: [],
    updates: []
  };

  cards.forEach(function (card) {
    const existing = recordsBySlug.get(card.slug);
    if (!existing) {
      summary.missingRecords.push(card.slug);
      return;
    }
    if (existing.demoPublished === true) {
      summary.alreadyReleased.push(card.slug);
      return;
    }

    const changes = {
      demoProfile: markDemo(mergeDemoValue(existing.demoProfile, makeGenericDemoProfile(card))),
      demoContent: true,
      demoPublished: false,
      demoNotice: DEMO_NOTICE,
      seedReviewRequired: true
    };
    summary.genericProfiles += 1;

    const kind = profileKind(card);
    if (kind) {
      const field = profileFields[kind];
      const specialized = markDemo(mergeDemoValue(existing[field], makeProfile(card, kind, templates)));
      changes[field] = specialized;
      summary.specializedProfiles += 1;
    }

    const unchanged = existing.demoContent === true &&
      JSON.stringify(existing.demoProfile || {}) === JSON.stringify(changes.demoProfile) &&
      (!kind || JSON.stringify(existing[profileFields[kind]] || {}) === JSON.stringify(changes[profileFields[kind]]));
    if (unchanged) {
      summary.unchanged.push(card.slug);
      return;
    }
    summary.updates.push({ slug: card.slug, kind: kind || 'generic', changes: changes });
  });
  return summary;
}

async function main() {
  const cards = parseCards();
  const templates = makeTemplateProfiles();
  const write = process.argv.includes('--write');
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required to inspect or seed Navi demo profiles');
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  const records = await NavigationPlace.find({ slug: { $in: cards.map(function (card) { return card.slug; }) } }).lean();
  const summary = buildDemoUpdates(cards, records, templates);
  console.log(JSON.stringify({
    mode: write ? 'write' : 'dry-run',
    cardCount: summary.cardCount,
    genericProfiles: summary.genericProfiles,
    specializedProfiles: summary.specializedProfiles,
    missingRecords: summary.missingRecords,
    alreadyReleased: summary.alreadyReleased,
    unchanged: summary.unchanged,
    updateCount: summary.updates.length,
    updates: summary.updates.map(function (update) { return { slug: update.slug, kind: update.kind }; })
  }, null, 2));

  if (write) {
    for (const update of summary.updates) {
      await NavigationPlace.updateOne({ slug: update.slug, demoPublished: { $ne: true } }, { $set: update.changes });
    }
    console.log('Seeded ' + summary.updates.length + ' Navi demo profiles. They remain hidden from public detail APIs until the admin batch publish action is used.');
  }
  await mongoose.disconnect();
}

if (require.main === module) {
  main().catch(async function (error) {
    console.error(error.message);
    if (mongoose.connection.readyState) await mongoose.disconnect();
    process.exitCode = 1;
  });
}

module.exports = { DEMO_NOTICE, makeGenericDemoProfile, mergeDemoValue, buildDemoUpdates };
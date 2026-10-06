require('dotenv').config({
  path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env'
});

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const mongoose = require('mongoose');
const NavigationPlace = require('../server/navigationPlaceModel');

const root = path.join(__dirname, '..');
const directoryTemplate = fs.readFileSync(path.join(root, 'templates/navi.html'), 'utf8');
const detailTemplates = {
  flightAgent: 'components/naviinfo/details/flight-agents-details.html',
  fillingStation: 'components/naviinfo/details/filling-stations-details.html',
  bank: 'components/naviinfo/details/banks-details.html'
};
const profileFields = {
  flightAgent: 'flightAgentProfile',
  fillingStation: 'fillingStationProfile',
  bank: 'bankProfile'
};

function attributes(tag) {
  const values = {};
  String(tag || '').replace(/([\w-]+)="([^"]*)"/g, function (match, key, value) {
    values[key.toLowerCase()] = value;
    return match;
  });
  return values;
}

function htmlText(value) {
  return String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function profileType(section) {
  const attributesFromSection = attributes(section);
  const sectionCategory = String(attributesFromSection['data-detail-category'] || attributesFromSection['data-category'] || '').toLowerCase().replace(/_/g, ' ');
  if (sectionCategory === 'flights') return 'flightAgent';
  if (sectionCategory === 'filling stations') return 'fillingStation';
  if (sectionCategory === 'banks') return 'bank';
  return '';
}

function parseCards() {
  const cards = [];
  const seen = new Set();
  const cardPattern = /<article\b[^>]*\bdata-place-id="([^"]+)"[^>]*>[\s\S]*?<\/article>/gi;
  let match;

  while ((match = cardPattern.exec(directoryTemplate))) {
    const sectionMatch = directoryTemplate.slice(0, match.index).match(/<div\b[^>]*class="section3"[^>]*>/gi);
    const kind = profileType(sectionMatch && sectionMatch.length ? sectionMatch[sectionMatch.length - 1] : '');
    if (!kind) continue;

    const slug = match[1].trim().toLowerCase();
    const block = match[0];
    const title = htmlText((block.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i) || [])[1]);
    const description = htmlText((block.match(/<p[^>]*>([\s\S]*?)<\/p>/i) || [])[1]);
    const lat = (block.match(/\bdata-lat="([^"]+)"/i) || [])[1];
    const lng = (block.match(/\bdata-lng="([^"]+)"/i) || [])[1];
    const image = (block.match(/<img[^>]+src="([^"]+)"/i) || [])[1] || '';
    const openingHours = htmlText((block.match(/fa-clock[^>]*><\/i>\s*([^<]+)/i) || [])[1]);
    if (!slug || !title || seen.has(slug)) continue;
    seen.add(slug);

    cards.push({
      slug,
      displayName: title,
      category: kind === 'flightAgent' ? 'Agents' : kind === 'fillingStation' ? 'Filling_Stations' : 'Banks',
      subcategory: kind === 'flightAgent' ? 'Flights' : kind === 'fillingStation' ? 'Filling Stations' : 'Banks',
      kind,
      description,
      address: 'Yola, Adamawa State',
      area: 'Yola',
      coordinates: {
        lat: lat && Number.isFinite(Number(lat)) ? Number(lat) : null,
        lng: lng && Number.isFinite(Number(lng)) ? Number(lng) : null
      },
      image,
      openingHours
    });
  }

  return cards;
}

function readTemplateData(file) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const match = source.match(/var DATA=(\{[\s\S]*?\n\});\s*\nfunction render/);
  if (!match) throw new Error('Unable to read template DATA object: ' + file);
  return JSON.parse(JSON.stringify(vm.runInNewContext('(' + match[1] + ')')));
}

const defaults = Object.keys(detailTemplates).reduce(function (result, kind) {
  result[kind] = readTemplateData(detailTemplates[kind]);
  return result;
}, {});

function makeProfile(card) {
  const profile = JSON.parse(JSON.stringify(defaults[card.kind]));
  profile.name = card.displayName;
  if (card.kind !== 'bank') profile.location = card.address;
  if (card.description && card.kind !== 'fillingStation') profile.description = card.description;
  if (card.kind === 'flightAgent') {
    profile.badge = card.displayName.charAt(0).toUpperCase();
    if (profile.facts) {
      profile.facts = profile.facts.map(function (fact) {
        return fact.label === 'Office Location' ? Object.assign({}, fact, { value: card.area + ', Adamawa' }) : fact;
      });
    }
    if (profile.contacts && profile.contacts[0]) profile.contacts[0].value = card.address;
  } else if (card.kind === 'fillingStation') {
    profile.badge = card.displayName.charAt(0).toUpperCase();
    profile.facts = (profile.facts || []).map(function (fact) {
      if (fact.label === 'Station Name') return Object.assign({}, fact, { value: card.displayName });
      if (fact.label === 'Address') return Object.assign({}, fact, { value: card.address });
      return fact;
    });
    profile.mapInfo = (profile.mapInfo || []).map(function (fact) {
      return fact.label === 'Address' ? Object.assign({}, fact, { value: card.address }) : fact;
    });
    if (profile.contacts) profile.contacts.addr = card.address;
  } else {
    profile.badge = card.displayName.charAt(0).toUpperCase();
    profile.branch = (profile.branch || []).map(function (fact) {
      if (fact.label === 'Branch Name') return Object.assign({}, fact, { value: card.displayName });
      if (fact.label === 'Address') return Object.assign({}, fact, { value: card.address });
      return fact;
    });
    profile.overviewFacts = (profile.overviewFacts || []).map(function (fact) {
      return fact.label === 'Location' ? Object.assign({}, fact, { value: card.area + ', Adamawa' }) : fact;
    });
    profile.mapInfo = (profile.mapInfo || []).map(function (fact) {
      return fact.label === 'Address' ? Object.assign({}, fact, { value: card.address }) : fact;
    });
    (profile.contacts || []).forEach(function (section) {
      (section.items || []).forEach(function (contact) {
        if (contact.label === 'Address') contact.value = card.address;
      });
    });
  }
  return profile;
}

function isBlank(value) {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

function mergeMissing(existing, seeded) {
  if (isBlank(existing)) return seeded;
  if (!existing || !seeded || typeof existing !== 'object' || typeof seeded !== 'object' || Array.isArray(existing) || Array.isArray(seeded)) return existing;
  const result = Object.assign({}, existing);
  Object.keys(seeded).forEach(function (key) {
    result[key] = Object.prototype.hasOwnProperty.call(existing, key)
      ? mergeMissing(existing[key], seeded[key])
      : seeded[key];
  });
  return result;
}

function normalizeName(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function makePlace(card, profile) {
  return {
    slug: card.slug,
    displayName: card.displayName,
    category: card.category,
    subcategory: card.subcategory,
    description: card.description || 'Local listing information for ' + card.displayName + '.',
    address: card.address,
    area: card.area,
    coordinates: card.coordinates,
    tags: [card.subcategory],
    services: [],
    highlights: [],
    openingHours: card.openingHours || '',
    image: card.image,
    contact: { phone: '', email: '', website: '' },
    verificationStatus: 'unverified',
    ratingAverage: 0,
    reviewCount: 0,
    status: 'published',
    legacySource: 'templates/navi.html',
    [profileFields[card.kind]]: profile
  };
}

async function main() {
  const cards = parseCards();
  const counts = cards.reduce(function (result, card) {
    result[card.kind] = (result[card.kind] || 0) + 1;
    return result;
  }, {});
  if (cards.length !== 39) {
    throw new Error('Expected 39 category cards, found ' + cards.length + ' (' + JSON.stringify(counts) + ')');
  }
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required to inspect or seed navigation records');

  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  const existingRecords = await NavigationPlace.find({
    $or: [
      { slug: { $in: cards.map(function (card) { return card.slug; }) } },
      { displayName: { $in: cards.map(function (card) { return card.displayName; }) } }
    ]
  }).lean();
  const existingBySlug = new Map(existingRecords.map(function (record) { return [record.slug, record]; }));
  const existingByName = new Map();
  existingRecords.forEach(function (record) {
    const key = normalizeName(record.displayName);
    if (!existingByName.has(key)) existingByName.set(key, []);
    existingByName.get(key).push(record);
  });
  const write = process.argv.includes('--write');
  const summary = { mode: write ? 'write' : 'dry-run', cardCount: cards.length, counts, matched: [], matchedByName: [], ambiguous: [], missing: [], wouldUpdate: [], updated: [], unchanged: [] };

  for (const card of cards) {
    let existing = existingBySlug.get(card.slug);
    if (!existing) {
      const nameMatches = existingByName.get(normalizeName(card.displayName)) || [];
      if (nameMatches.length > 1) {
        summary.ambiguous.push(card.slug);
        continue;
      }
      if (nameMatches.length === 1) {
        existing = nameMatches[0];
        summary.matchedByName.push(card.slug + ' -> ' + existing.slug);
      }
    }
    const key = profileFields[card.kind];
    const profile = mergeMissing(existing && existing[key], makeProfile(card));
    if (!existing) {
      summary.missing.push(card.slug);
      if (write) {
        await NavigationPlace.create(makePlace(card, profile));
        summary.updated.push(card.slug);
      }
      continue;
    }

    summary.matched.push(card.slug);
    if (JSON.stringify(profile) === JSON.stringify(existing[key] || {})) {
      summary.unchanged.push(card.slug);
      continue;
    }
    if (write) {
      await NavigationPlace.updateOne({ _id: existing._id }, { $set: { [key]: profile } }, { runValidators: true });
      summary.updated.push(card.slug);
    } else {
      summary.wouldUpdate.push(card.slug);
    }
  }

  console.log(JSON.stringify(summary, null, 2));
  await mongoose.disconnect();
}

if (require.main === module) {
  main().catch(async function (error) {
    console.error(error.message);
    if (mongoose.connection.readyState) await mongoose.disconnect();
    process.exitCode = 1;
  });
}

module.exports = { parseCards, makeProfile, mergeMissing, makePlace, normalizeName };
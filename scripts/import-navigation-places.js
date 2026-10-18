require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const NavigationPlace = require('../server/navigationPlaceModel');
const { slugify } = require('../server/professionalTaxonomy');
const { PROFILE_FIELDS, detailProfileType } = require('../server/navigationProfileTypes');
const { profileFieldsToUnset } = require('../server/navigationProfileSeedPolicy');

const templatePath = path.join(__dirname, '..', 'templates', 'navi.html');
const template = fs.readFileSync(templatePath, 'utf8');

const detailPageConfigurations = {
  'flight-agents-details.html': { subcategory: 'Flights', detailProfileType: 'flightAgent' },
  'filling-stations-details.html': { subcategory: 'Filling Stations', detailProfileType: 'fillingStation' },
  'parks-recreation-details.html': { subcategory: 'Parks and Recreation', detailProfileType: 'parksRecreation' },
  'commercial-center-details.html': { subcategory: 'Commercial Centers', detailProfileType: 'commercialCenter' },
  'hospitality-details.html': { subcategory: 'Hospitality', detailProfileType: 'hospitality' },
  'restaurant-details.html': { subcategory: 'Restaurants', detailProfileType: 'generic' },
  'mosque-details.html': { subcategory: 'Mosques', detailProfileType: 'mosque' },
  'church-details.html': { subcategory: 'Churches', detailProfileType: 'church' },
  'event-centers.html': { subcategory: 'Event Centers', detailProfileType: 'eventCenter' },
  'banks-details.html': { subcategory: 'Banks', detailProfileType: 'bank' },
  'university-details.html': { subcategory: 'Universities', detailProfileType: 'university' },
  'technical-institution-details.html': { subcategory: 'Technical Institutions', detailProfileType: 'technical' },
  'primary-secondaryschool-details.html': { subcategory: 'Primary and Secondary Schools', detailProfileType: 'school' },
  'learning-hub-details.html': { subcategory: 'Learning Hubs', detailProfileType: 'learning' },
  'primary-healthcare-details.html': { subcategory: 'Primary Healthcare', detailProfileType: 'healthcare', profileBranch: 'primaryCare' },
  'secondary-healthcare-details.html': { subcategory: 'Secondary Healthcare', detailProfileType: 'healthcare', profileBranch: 'secondaryHospital' },
  'pharmacy-details.html': { subcategory: 'Pharmacies', detailProfileType: 'healthcare', profileBranch: 'pharmacy' },
  'judiciary-details.html': { subcategory: 'Judiciary', detailProfileType: 'judiciary' },
  'sports-spa-details.html': { subcategory: 'Sports and Wellness', detailProfileType: 'sportsSpa' },
  'iconic-structures.html': { subcategory: 'Iconic Structures', detailProfileType: 'iconicStructure' }
};
Object.keys(detailPageConfigurations).forEach(function (page) {
  const configuration = detailPageConfigurations[page];
  configuration.profileField = PROFILE_FIELDS[configuration.detailProfileType] || null;
});

function attributes(tag) {
  const values = {};
  String(tag || '').replace(/([\w-]+)="([^"]*)"/g, function (match, key, value) {
    values[key.toLowerCase()] = value;
    return match;
  });
  return values;
}

function detailPageFromCard(block) {
  const href = (String(block || '').match(/<a\b[^>]*href="([^"]*\/details\/[^"]+\.html[^"]*)"/i) || [])[1] || '';
  const match = href.match(/(?:^|\/)details\/([^/?#]+\.html)(?:[?#]|$)/i);
  return match ? match[1].toLowerCase() : '';
}

function subcategoryForDetailPage(page, card, fallback) {
  if (page && detailPageConfigurations[page]) return detailPageConfigurations[page].subcategory;

  const typeSubcategories = {
    flightAgent: 'Flights',
    fillingStation: 'Filling Stations',
    bank: 'Banks',
    commercialCenter: 'Commercial Centers',
    church: 'Churches',
    mosque: 'Mosques',
    judiciary: 'Judiciary',
    parksRecreation: 'Parks and Recreation',
    eventCenter: 'Event Centers',
    hospitality: 'Hospitality',
    iconicStructure: 'Iconic Structures',
    sportsSpa: 'Sports and Wellness',
    school: 'Primary and Secondary Schools',
    university: 'Universities',
    technical: 'Technical Institutions',
    learning: 'Learning Hubs',
    healthcare: 'Healthcare'
  };
  const profileType = detailProfileType(Object.assign({}, card, { subcategory: fallback }));
  return typeSubcategories[profileType] || fallback;
}

function extractText(value) {
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

function getSection(source, index) {
  const pattern = /<div\b[^>]*class="section3"[^>]*>/gi;
  let match;
  let current = null;
  while ((match = pattern.exec(source)) && match.index < index) current = match[0];
  const sectionAttributes = attributes(current);
  const nextSection = source.slice(current ? source.indexOf(current) : 0, index);
  const title = extractText((nextSection.match(/<h3[^>]*class="section3-title"[^>]*>([\s\S]*?)<\/h3>/i) || [])[1]);
  return {
    category: sectionAttributes['data-category'] || 'Others',
    subcategory: sectionAttributes['data-detail-category'] || title || sectionAttributes['data-category'] || 'Others'
  };
}

function parseCard(block, section) {
  const title = extractText((block.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i) || [])[1]);
  if (!title) return null;

  const attributesFromCard = attributes((block.match(/<article\b[^>]*>/i) || [])[0]);
  const linkId = (block.match(/href="[^"]*[?&](?:id|slug)=([^&#"]+)/i) || [])[1];
  const rawId = attributesFromCard['data-place-id'] || (linkId ? decodeURIComponent(linkId) : '') || slugify(title);
  const slug = slugify(rawId);
  const lat = attributesFromCard['data-lat'];
  const lng = attributesFromCard['data-lng'];
  const detailPage = detailPageFromCard(block);
  const pageConfiguration = detailPageConfigurations[detailPage];
  const detailCard = { category: section.category, displayName: title, slug };
  const subcategory = subcategoryForDetailPage(detailPage, detailCard, section.subcategory);
  const image = (block.match(/<img\b[^>]*src="([^"]+)"/i) || [])[1] || '';
  const description = extractText((block.match(/<p[^>]*>([\s\S]*?)<\/p>/i) || [])[1]);
  const openingHours = extractText((block.match(/fa-clock[^>]*><\/i>\s*([^<]+)/i) || [])[1]);

  return {
    slug,
    displayName: title,
    category: section.category,
    subcategory,
    description,
    address: 'Yola, Adamawa State',
    area: 'Yola',
    coordinates: {
      lat: lat && Number.isFinite(Number(lat)) ? Number(lat) : null,
      lng: lng && Number.isFinite(Number(lng)) ? Number(lng) : null
    },
    tags: [section.subcategory],
    services: [],
    highlights: [],
    openingHours,
    image,
    heroImage: image,
    contact: { phone: '', email: '', website: '' },
    verificationStatus: 'unverified',
    ratingAverage: 0,
    reviewCount: 0,
    status: 'draft',
    seedReviewRequired: true,
    legacySource: 'templates/navi.html',
    detailProfileType: pageConfiguration
      ? pageConfiguration.detailProfileType
      : detailProfileType({ category: section.category, subcategory, displayName: title, slug })
  };
}

function parseArticleBlocks(source) {
  const cards = [];
  const articlePattern = /<article\b[^>]*>[\s\S]*?<\/article>/gi;
  let match;
  while ((match = articlePattern.exec(source))) {
    const openTag = (match[0].match(/<article\b[^>]*>/i) || [])[0] || '';
    const cardAttributes = attributes(openTag);
    const hasStableLink = /href="[^"]*[?&](?:id|slug)=[^"#]+/i.test(match[0]);
    // Most cards carry place-article, while the legacy iconic-structure cards
    // only expose their stable ID in the detail link.
    if (!/\bplace-article\b/.test(cardAttributes.class || '') && !hasStableLink) continue;
    if (!cardAttributes['data-place-id'] && !hasStableLink) continue;
    cards.push(parseCard(match[0], getSection(source, match.index)));
  }

  return cards.filter(Boolean);
}

function parseCommentedGreenSpaces(source) {
  const marker = '<div class="section3" data-category="Green_spaces">';
  const greenStart = source.indexOf(marker);
  const commentEnd = source.indexOf('-->', greenStart);
  if (greenStart === -1 || commentEnd === -1 || source.lastIndexOf('<!--', greenStart) === -1) return [];
  const commentedSection = source.slice(greenStart, commentEnd);
  const title = extractText((commentedSection.match(/<h3[^>]*class="section3-title"[^>]*>([\s\S]*?)<\/h3>/i) || [])[1]);
  const section = { category: 'Green_spaces', subcategory: title || 'Green Spaces' };
  const cards = [];
  const articlePattern = /<article\b[^>]*>[\s\S]*?<\/article>/gi;
  let match;
  while ((match = articlePattern.exec(commentedSection))) {
    if (!/href="[^"]*[?&](?:id|slug)=/i.test(match[0])) continue;
    const card = parseCard(match[0], section);
    if (card) cards.push(card);
  }
  return cards;
}

function parseCards(source = template) {
  const withoutComments = source.replace(/<!--[\s\S]*?-->/g, '');
  return parseArticleBlocks(withoutComments).concat(parseCommentedGreenSpaces(source));
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
  const merged = Object.assign({}, existing);
  Object.keys(seeded).forEach(function (key) {
    merged[key] = Object.prototype.hasOwnProperty.call(existing, key)
      ? mergeMissing(existing[key], seeded[key])
      : seeded[key];
  });
  return merged;
}

function mergeBaseRecord(existing, seeded) {
  if (existing === undefined || existing === null || (typeof existing === 'string' && !existing.trim())) return seeded;
  if (Array.isArray(existing)) return existing;
  if (!existing || !seeded || typeof existing !== 'object' || typeof seeded !== 'object') return existing;
  const merged = Object.assign({}, existing);
  Object.keys(seeded).forEach(function (key) {
    merged[key] = Object.prototype.hasOwnProperty.call(existing, key)
      ? mergeBaseRecord(existing[key], seeded[key])
      : seeded[key];
  });
  return merged;
}

function mergeImportedRecord(existing, seeded) {
  const merged = mergeBaseRecord(existing, seeded);
  merged.subcategory = seeded.subcategory;
  return merged;
}

function summarize(records) {
  const counts = {};
  const ids = new Set();
  const duplicateIds = [];
  records.forEach(function (record) {
    counts[record.subcategory] = (counts[record.subcategory] || 0) + 1;
    if (ids.has(record.slug)) duplicateIds.push(record.slug);
    ids.add(record.slug);
  });
  return { found: records.length, counts, duplicateIds };
}

function comparable(value) {
  return JSON.stringify(value == null ? null : value);
}

async function importRecords(records) {
  const results = { inserted: [], enriched: [], metadataUpdated: [], unchanged: [], nameConflicts: [], publishedSkipped: [] };
  for (const record of records) {
    const existing = await NavigationPlace.findOne({ slug: record.slug }).lean();
    if (!existing) {
      const nameMatches = await NavigationPlace.find({ displayName: record.displayName }).select('slug').lean();
      if (nameMatches.length) {
        results.nameConflicts.push({ slug: record.slug, existingSlugs: nameMatches.map(function (item) { return item.slug; }) });
        continue;
      }
      await NavigationPlace.create(record);
      results.inserted.push(record.slug);
      continue;
    }
    if (existing.status === 'published') {
      const metadata = {};
      if (existing.detailProfileType !== record.detailProfileType) metadata.detailProfileType = record.detailProfileType;
      if (existing.subcategory !== record.subcategory) metadata.subcategory = record.subcategory;
      const activeProfile = PROFILE_FIELDS[record.detailProfileType] || null;
      const staleProfiles = profileFieldsToUnset(activeProfile);
      if (Object.keys(metadata).length || Object.keys(staleProfiles).length) {
        await NavigationPlace.updateOne(
          { _id: existing._id },
          { $set: metadata, $unset: staleProfiles }
        );
        results.metadataUpdated.push(record.slug);
      }
      results.publishedSkipped.push(record.slug);
      continue;
    }

    const merged = mergeImportedRecord(existing, record);
    ['status', 'verificationStatus', 'createdBy', 'updatedBy', 'createdAt', 'updatedAt'].forEach(function (field) {
      if (Object.prototype.hasOwnProperty.call(existing, field)) merged[field] = existing[field];
      else delete merged[field];
    });
    const updates = {};
    Object.keys(record).forEach(function (field) {
      if (field === 'status' || field === 'verificationStatus' || field === 'seedReviewRequired') return;
      if (comparable(existing[field]) !== comparable(merged[field])) updates[field] = merged[field];
    });
    if (!Object.keys(updates).length) {
      results.unchanged.push(record.slug);
      continue;
    }
    updates.seedReviewRequired = true;
    await NavigationPlace.updateOne(
      { _id: existing._id },
      {
        $set: updates,
        $unset: profileFieldsToUnset(PROFILE_FIELDS[record.detailProfileType] || null)
      }
    );
    results.enriched.push(record.slug);
  }
  return results;
}

async function main() {
  const records = parseCards();
  const inventory = summarize(records);
  if (inventory.duplicateIds.length) throw new Error('Duplicate stable card IDs: ' + inventory.duplicateIds.join(', '));
  const write = process.argv.includes('--write');
  console.log(JSON.stringify({ mode: write ? 'write' : 'dry-run', ...inventory }, null, 2));
  if (!write) return;
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required when using --write');
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  const results = await importRecords(records);
  console.log(JSON.stringify(results, null, 2));
  await mongoose.disconnect();
}

if (require.main === module) {
  main().catch(async function (error) {
    console.error(error.message);
    if (mongoose.connection.readyState) await mongoose.disconnect();
    process.exitCode = 1;
  });
}

module.exports = {
  parseCards,
  parseCard,
  detailPageFromCard,
  detailPageConfigurations,
  subcategoryForDetailPage,
  mergeMissing,
  mergeBaseRecord,
  mergeImportedRecord,
  summarize,
  importRecords
};

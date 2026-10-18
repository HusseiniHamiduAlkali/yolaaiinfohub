require('dotenv').config();

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const mongoose = require('mongoose');
const NavigationPlace = require('../server/navigationPlaceModel');
const { profileFieldsToUnset } = require('../server/navigationProfileSeedPolicy');
const { parseCards } = require('./import-navigation-places');
const { detailProfileType } = require('../server/navigationProfileTypes');

const root = path.join(__dirname, '..');
const templateFiles = {
  commercialCenter: 'components/naviinfo/details/commercial-center-details.html',
  church: 'components/naviinfo/details/church-details.html',
  mosque: 'components/naviinfo/details/mosque-details.html',
  judiciary: 'components/naviinfo/details/judiciary-details.html',
  parksRecreation: 'components/naviinfo/details/parks-recreation-details.html',
  eventCenter: 'components/naviinfo/details/event-centers.html',
  hospitality: 'components/naviinfo/details/hospitality-details.html',
  iconicStructure: 'components/naviinfo/details/iconic-structures.html',
  sportsSpa: 'components/naviinfo/details/sports-spa-details.html'
};
const profileFields = {
  commercialCenter: 'commercialCenterProfile', church: 'churchProfile', mosque: 'mosqueProfile',
  judiciary: 'judiciaryProfile', parksRecreation: 'parksRecreationProfile', eventCenter: 'eventCenterProfile',
  hospitality: 'hospitalityProfile', iconicStructure: 'iconicStructureProfile', sportsSpa: 'sportsSpaProfile'
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function readDataObject(file) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const match = source.match(/var DATA=(\{[\s\S]*?\n\});\s*\nfunction render/);
  if (!match) return null;
  return clone(vm.runInNewContext('(' + match[1] + ')'));
}

function extractDeclaration(source, name) {
  const match = new RegExp('\\bvar\\s+' + name + '\\s*=').exec(source);
  if (!match) return null;
  let index = match.index + match[0].length;
  const start = index;
  const stack = [];
  let quote = '';
  let escaped = false;
  for (; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = '';
      continue;
    }
    if (character === '"' || character === "'" || character === '`') {
      quote = character;
      continue;
    }
    if (character === '[' || character === '{' || character === '(') stack.push(character);
    else if (character === ']' || character === '}' || character === ')') stack.pop();
    else if (character === ';' && stack.length === 0) break;
  }
  if (index >= source.length) return null;
  return vm.runInNewContext('(' + source.slice(start, index).trim() + ')', {}, { timeout: 1000 });
}

function readPageArrays(file, names) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(function (match) { return match[1]; }).join('\n');
  const result = {};
  names.forEach(function (name) { result[name] = extractDeclaration(scripts, name) || []; });
  return result;
}

function plainText(value) {
  return String(value || '').replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, ' ').replace(/<br\s*\/?\s*>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function sectionParagraphs(file, id) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  const match = html.match(new RegExp('<section[^>]*id="' + id + '"[^>]*>([\\s\\S]*?)<\\/section>', 'i'));
  return match ? [...match[1].matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map(function (paragraph) { return plainText(paragraph[1]); }).filter(Boolean) : [];
}

function sectionFactCards(file, id) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  const match = html.match(new RegExp('<section[^>]*id="' + id + '"[^>]*>([\\s\\S]*?)<\\/section>', 'i'));
  if (!match) return [];
  return [...match[1].matchAll(/<div class="fact-card">\s*<h4>([\s\S]*?)<\/h4>\s*<p>([\s\S]*?)<\/p>\s*<\/div>/gi)].map(function (fact) {
    return { label: plainText(fact[1]), value: plainText(fact[2]) };
  });
}

function sectionImage(file, id) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  const match = html.match(new RegExp('<section[^>]*id="' + id + '"[^>]*>([\\s\\S]*?)<\\/section>', 'i'));
  return match ? ((match[1].match(/<img[^>]+src="([^"]+)"/i) || [])[1] || '') : '';
}

function statusItems(file) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  const match = html.match(/<section id="status"[^>]*>([\s\S]*?)<\/section>/i);
  if (!match) return [];
  return [...match[1].matchAll(/<div class="status-item">[\s\S]*?<h4>([\s\S]*?)<\/h4>\s*<p[^>]*>([\s\S]*?)<\/p>[\s\S]*?<\/div>/gi)].map(function (item) {
    return { label: plainText(item[1]), value: plainText(item[2]) };
  });
}

function iconicQuickInfo(file) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  const match = html.match(/<section id="quick"[^>]*>([\s\S]*?)<\/section>/i);
  if (!match) return [];
  return [...match[1].matchAll(/<span class="quick-item">([\s\S]*?)<\/span>/gi)].map(function (item) {
    return { title: plainText(item[1]), description: '' };
  });
}

function profileKind(card) {
  const searchable = [card.category, card.subcategory, card.displayName, card.slug]
    .filter(Boolean).join(' ').toLowerCase().replace(/[&_/-]+/g, ' ');
  const identity = [card.displayName, card.slug].filter(Boolean).join(' ').toLowerCase().replace(/[&_/-]+/g, ' ');
  const category = String(card.category || '').toLowerCase().replace(/[&_/-]+/g, ' ');
  if (category === 'agents') return '';
  if (/\b(judiciary|judicial|courts?)\b/.test(searchable)) return 'judiciary';
  if (/\b(mosques?|masjids?|islamic centers?|islamic centres?)\b/.test(searchable)) return 'mosque';
  if (/\bchurch(es)?\b|\bcathedrals?\b|\bchapels?\b|catholic secreteriat|catholic secretariat/.test(searchable)) return 'church';
  if (/\b(commercial centers?|commercial centres?|markets?|shopping complexes?)\b/.test(searchable)) return 'commercialCenter';
  if (/\b(event centers?|event centres?|event halls?)\b/.test(searchable)) return 'eventCenter';
  if (/\b(restaurant|cafe|bakery|grill|suya|shawarma|ice ?cream|chicken cottage|exclusive spot)\b/.test(identity)) return '';
  if (/\bparks?\b|\bgreen spaces?\b/.test(category)) return 'parksRecreation';
  if (/\bhotels?\b/.test(category) || /\b(hotels?|lodges?|resorts?|guest houses?)\b/.test(identity) || /\bhospitality\b/.test(searchable)) return 'hospitality';
  if (/\b(green spaces?|parks?|recreation)\b/.test(searchable)) return 'parksRecreation';
  if (/\b(iconic structures?|landmarks?|flyovers?|roundabouts?)\b/.test(searchable)) return 'iconicStructure';
  if (/\b(sports?|spa|wellness|gyms?)\b/.test(searchable)) return 'sportsSpa';
  return '';
}

function makeTemplateProfiles() {
  const result = {};
  Object.keys(templateFiles).forEach(function (kind) {
    result[kind] = readDataObject(templateFiles[kind]);
  });

  const iconic = readPageArrays(templateFiles.iconicStructure, ['highlights', 'milestones', 'zoneSteps', 'facilities', 'galleryImgs', 'bestTimes', 'faqs', 'nearby']);
  result.iconicStructure = {
    name: 'Lamido Palace',
    tagline: 'Heritage · Architecture · Legacy',
    heroImage: sectionImage(templateFiles.iconicStructure, 'hero'),
    aboutImage: sectionImage(templateFiles.iconicStructure, 'about'),
    quickInfo: iconicQuickInfo(templateFiles.iconicStructure),
    aboutParagraphs: sectionParagraphs(templateFiles.iconicStructure, 'about'),
    culturalParagraphs: sectionParagraphs(templateFiles.iconicStructure, 'culture'),
    culturalQuote: plainText((fs.readFileSync(path.join(root, templateFiles.iconicStructure), 'utf8').match(/<div class="cultural-quote[^>]*>([\s\S]*?)<\/div>/i) || [])[1]),
    address: 'Palace Road, Jimeta, Yola, Adamawa State',
    landmark: 'Opposite Central Mosque, Jimeta',
    coordinates: { lat: 9.2035, lng: 12.4955 },
    highlights: iconic.highlights,
    milestones: iconic.milestones,
    zoneSteps: iconic.zoneSteps,
    facilities: iconic.facilities,
    galleryImages: iconic.galleryImgs.map(function (item) { return { image: item.src, caption: item.cap }; }),
    bestTimes: iconic.bestTimes,
    faqs: iconic.faqs,
    nearby: iconic.nearby
  };

  const sports = readPageArrays(templateFiles.sportsSpa, ['services', 'zoneSteps', 'pricing', 'trainers', 'weeklySchedule', 'facilities', 'galleryImgs', 'hoursData', 'faqs']);
  result.sportsSpa = {
    name: 'Yola Sports & Wellness Centre',
    category: 'Sports Complex & SPA',
    type: 'Sports Complex & SPA',
    status: 'Open Now',
    heroImage: sectionImage(templateFiles.sportsSpa, 'hero'),
    aboutImage: sectionImage(templateFiles.sportsSpa, 'about'),
    statusItems: statusItems(templateFiles.sportsSpa),
    aboutParagraphs: sectionParagraphs(templateFiles.sportsSpa, 'about'),
    facts: sectionFactCards(templateFiles.sportsSpa, 'about'),
    address: 'Wellness Avenue, Jimeta, Yola, Adamawa State',
    landmark: 'Near Yola Township Stadium',
    coordinates: { lat: 9.2035, lng: 12.4955 },
    contact: { phone: '+234 803 456 7890', email: '', website: '' },
    services: sports.services,
    zoneSteps: sports.zoneSteps,
    pricing: sports.pricing,
    trainers: sports.trainers,
    weeklySchedule: sports.weeklySchedule,
    facilities: sports.facilities,
    galleryImages: sports.galleryImgs.map(function (item) { return { image: item.src, caption: item.cap }; }),
    hours: sports.hoursData,
    faqs: sports.faqs
  };

  result.hospitality = null;
  return result;
}

function setContactAddress(profile, address) {
  if (!Array.isArray(profile.contacts)) return;
  profile.contacts.forEach(function (contact) {
    if (contact && /address|location/i.test(String(contact.label || ''))) contact.value = address;
  });
}

function makeProfile(card, kind, templates) {
  const source = templates[kind];
  const profile = source ? clone(source) : {};
  profile.name = card.displayName;
  if (Object.prototype.hasOwnProperty.call(profile, 'description') && card.description) profile.description = card.description;
  if (Object.prototype.hasOwnProperty.call(profile, 'heroImg') && card.image) profile.heroImg = card.image;
  if (Object.prototype.hasOwnProperty.call(profile, 'heroImage') && card.image) profile.heroImage = card.image;
  if (kind === 'hospitality') {
    profile.category = card.subcategory;
    profile.description = card.description;
    profile.image = card.image;
    profile.heroImage = card.image;
    profile.address = card.address;
    profile.area = card.area;
    profile.openingHours = card.openingHours;
    profile.contact = card.contact;
    profile.amenities = card.services;
    profile.galleryImages = [];
    profile.galleryCaptions = [];
  }
  if (kind === 'iconicStructure' || kind === 'sportsSpa') {
    profile.address = card.address;
    profile.area = card.area;
    profile.coordinates = card.coordinates;
    profile.contact = card.contact;
    if (card.image) profile.heroImage = card.image;
  }
  setContactAddress(profile, card.address);
  profile.seededFromExample = kind !== 'hospitality';
  profile.seedReviewRequired = true;
  return profile;
}

function hasProfileContent(profile) {
  return Object.keys(profile || {}).some(function (key) {
    if (key === 'seededFromExample' || key === 'seedReviewRequired') return false;
    const value = profile[key];
    if (typeof value === 'string') return Boolean(value.trim());
    if (Array.isArray(value)) return value.length > 0;
    if (value && typeof value === 'object') return Object.keys(value).length > 0;
    return value !== undefined && value !== null && value !== false;
  });
}

function mergeTemplateProfile(existing, seeded) {
  if (seeded === undefined) return existing;
  if (existing === undefined || existing === null) return seeded;
  if (Array.isArray(seeded)) {
    if (!Array.isArray(existing)) return seeded;
    if (!existing.length) return existing;
    const objectTemplate = seeded.find(function (item) { return item && typeof item === 'object' && !Array.isArray(item); });
    if (!objectTemplate) return existing;
    return existing.map(function (item, index) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return item;
      return mergeTemplateProfile(item, seeded[index] && typeof seeded[index] === 'object' ? seeded[index] : objectTemplate);
    });
  }
  if (Array.isArray(existing)) return seeded;
  if (!existing || !seeded || typeof existing !== 'object' || typeof seeded !== 'object') return existing;
  return Object.keys(seeded).reduce(function (merged, key) {
    merged[key] = Object.prototype.hasOwnProperty.call(existing, key)
      ? mergeTemplateProfile(existing[key], seeded[key])
      : seeded[key];
    return merged;
  }, {});
}

function imageSlots(value, path, result) {
  const currentPath = path || '';
  const output = result || [];
  if (Array.isArray(value)) {
    value.forEach(function (item, index) { imageSlots(item, currentPath + '[' + index + ']', output); });
    return output;
  }
  if (!value || typeof value !== 'object') {
    if (typeof value === 'string' && /(?:hero|about)?(?:image|img)|(?:^|\.)(?:src|url)$/.test(currentPath.toLowerCase())) output.push(currentPath);
    return output;
  }
  Object.keys(value).forEach(function (key) { imageSlots(value[key], currentPath ? currentPath + '.' + key : key, output); });
  return output;
}

function validateProfileAgainstTemplate(profile, template) {
  const expectedFields = Object.keys(template || {});
  const actual = profile || {};
  const missingFields = expectedFields.filter(function (field) { return !Object.prototype.hasOwnProperty.call(actual, field); });
  const expectedImages = imageSlots(template || {}, '', []).length;
  const actualImages = imageSlots(actual, '', []).length;
  return {
    missingFields: missingFields,
    expectedImageSlots: expectedImages,
    actualImageSlots: actualImages,
    imageSlotsMatch: expectedImages === actualImages
  };
}

function prepareProfileUpdates(cards, existingRecords, templates, options) {
  const existingBySlug = new Map(existingRecords.map(function (record) { return [record.slug, record]; }));
  const demotePublished = Boolean(options && options.demotePublished);
  const summary = { eligible: 0, missing: [], publishedSkipped: [], skippedExistingProfile: [], updates: [], counts: {} };
  cards.forEach(function (card) {
    const kind = profileKind(card);
    if (!kind) return;
    summary.eligible += 1;
    summary.counts[kind] = (summary.counts[kind] || 0) + 1;
    const existing = existingBySlug.get(card.slug);
    if (!existing) {
      summary.missing.push(card.slug);
      return;
    }
    if (existing.status === 'published' && !demotePublished) {
      summary.publishedSkipped.push(card.slug);
      return;
    }
    const field = profileFields[kind];
    const seeded = makeProfile(card, kind, templates);
    const existingProfile = existing[field];
    if (hasProfileContent(existingProfile) && existingProfile.seedReviewRequired === false) {
      const pruned = mergeTemplateProfile(existingProfile, seeded);
      pruned.demoContent = Boolean(existingProfile.demoContent);
      pruned.demoNotice = existingProfile.demoNotice || '';
      pruned.seededFromExample = kind !== 'hospitality';
      pruned.seedReviewRequired = false;
      if (JSON.stringify(pruned) === JSON.stringify(existingProfile)) {
        summary.skippedExistingProfile.push(card.slug);
        return;
      }
      summary.updates.push({
        slug: card.slug,
        field: field,
        profile: pruned,
        detailProfileType: detailProfileType(card),
        demote: false,
        reviewRequired: false
      });
      return;
    }
    const merged = mergeTemplateProfile(existingProfile, seeded);
    merged.demoContent = Boolean(existingProfile && existingProfile.demoContent);
    merged.demoNotice = existingProfile && existingProfile.demoNotice || '';
    merged.seededFromExample = kind !== 'hospitality';
    merged.seedReviewRequired = true;
    if (JSON.stringify(merged) === JSON.stringify(existing[field] || {})) {
      summary.skippedExistingProfile.push(card.slug);
      return;
    }
    summary.updates.push({ slug: card.slug, field: field, profile: merged, detailProfileType: detailProfileType(card), demote: existing.status === 'published', reviewRequired: true });
  });
  return summary;
}

async function main() {
  const cards = parseCards();
  const templates = makeTemplateProfiles();
  const write = process.argv.includes('--write');
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required to inspect or seed template profiles');
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  const records = await NavigationPlace.find({ slug: { $in: cards.map(function (card) { return card.slug; }) } }).lean();
  const summary = prepareProfileUpdates(cards, records, templates, { demotePublished: process.argv.includes('--demote-published') });
  console.log(JSON.stringify({ mode: write ? 'write' : 'dry-run', ...summary, updates: summary.updates.map(function (item) { return { slug: item.slug, field: item.field, demote: item.demote }; }) }, null, 2));
  if (write) {
    for (const update of summary.updates) {
      const changes = {
        [update.field]: update.profile,
        detailProfileType: update.detailProfileType,
        seedReviewRequired: update.reviewRequired
      };
      if (update.demote) changes.status = 'draft';
      await NavigationPlace.updateOne(
        { slug: update.slug },
        { $set: changes, $unset: profileFieldsToUnset(update.field) }
      );
    }
    console.log('Updated ' + summary.updates.length + ' template profiles; published records receiving sample profile data were moved to draft.');
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

module.exports = { profileKind, makeTemplateProfiles, makeProfile, mergeTemplateProfile, imageSlots, validateProfileAgainstTemplate, prepareProfileUpdates };

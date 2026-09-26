require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const NavigationPlace = require('../server/navigationPlaceModel');
const { slugify } = require('../server/professionalTaxonomy');

const template = fs.readFileSync(path.join(__dirname, '..', 'templates', 'navi.html'), 'utf8');
const write = process.argv.includes('--write');

function extractText(node) {
  return String(node || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseCards() {
  const cards = [];
  const seen = new Map();
  const cardPattern = /<article\s+class="section4[^\"]*\s*place-article[^\"]*"[\s\S]*?<\/article>/gi;
  let match;
  while ((match = cardPattern.exec(template))) {
    const block = match[0];
    const before = template.slice(0, match.index);
    const sectionCategoryMatch = before.match(/<div\b[^>]*class="section3"[^>]*data-category="([^"]+)"[^>]*>/gi);
    const sectionCategory = sectionCategoryMatch && sectionCategoryMatch.length
      ? (sectionCategoryMatch[sectionCategoryMatch.length - 1].match(/data-category="([^"]+)"/i) || [])[1]
      : '';

    const displayName = extractText((block.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i) || [])[1] || '').replace(/^\s+|\s+$/g, '');
    if (!displayName) continue;

    const categoryMatch = block.match(/data-category="([^"]+)"/i) || block.match(/data-filter="([^"]+)"/i);
    const category = (categoryMatch ? categoryMatch[1].trim() : sectionCategory || 'Others').trim() || 'Others';
    const latMatch = block.match(/data-lat="([^"]+)"/i);
    const lngMatch = block.match(/data-lng="([^"]+)"/i);
    const imageMatch = block.match(/<img[^>]+src="([^"]+)"/i);
    const description = extractText((block.match(/<p[^>]*>([\s\S]*?)<\/p>/i) || [])[1] || '');
    const baseSlug = slugify(displayName);
    const count = (seen.get(baseSlug) || 0) + 1;
    seen.set(baseSlug, count);
    const slug = count === 1 ? baseSlug : `${baseSlug}-${count}`;

    cards.push({
      slug,
      displayName,
      category,
      subcategory: category,
      description,
      address: 'Yola, Adamawa State',
      area: 'Yola',
      coordinates: {
        lat: latMatch ? Number(latMatch[1]) : null,
        lng: lngMatch ? Number(lngMatch[1]) : null
      },
      tags: [category],
      services: [],
      openingHours: 'Hours vary',
      image: imageMatch ? imageMatch[1] : '',
      contact: { phone: '', email: '', website: '' },
      verificationStatus: 'unverified',
      ratingAverage: 0,
      reviewCount: 0,
      status: 'published',
      legacySource: 'templates/navi.html'
    });
  }
  return cards;
}

async function main() {
  const records = parseCards();
  console.log(JSON.stringify({ mode: write ? 'write' : 'dry-run', found: records.length }, null, 2));
  if (!write) return;
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required when using --write');
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  let imported = 0;
  for (const record of records) {
    await NavigationPlace.findOneAndUpdate({ slug: record.slug }, { $set: record }, { upsert: true, new: true, setDefaultsOnInsert: true });
    imported += 1;
  }
  console.log('Imported or updated ' + imported + ' navigation place records.');
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

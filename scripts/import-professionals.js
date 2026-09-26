require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Professional = require('../server/professionalModel');
const { categories, normalizeArea, slugify } = require('../server/professionalTaxonomy');

const template = fs.readFileSync(path.join(__dirname, '..', 'templates', 'servi.html'), 'utf8');
const write = process.argv.includes('--write');

function attribute(block, name) {
  const match = block.match(new RegExp('data-' + name + '="([^"]*)"', 'i'));
  return match ? match[1].trim() : '';
}

function content(block, selector) {
  const match = block.match(new RegExp('<' + selector + '[^>]*>([\\s\\S]*?)<\\/' + selector + '>', 'i'));
  return match ? match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '';
}

function parseCards() {
  const cards = [];
  const slugCounts = new Map();
  const cardPattern = /<article\s+class="pro-card[^"]*"[\s\S]*?<\/article>/gi;
  let match;
  while ((match = cardPattern.exec(template))) {
    const block = match[0];
    const displayName = attribute(block, 'name') || content(block, 'h3');
    const category = attribute(block, 'category');
    if (!displayName || !categories.includes(category)) continue;
    const phoneMatch = block.match(/href="tel:([^"?]+)"/i);
    const phone = phoneMatch ? phoneMatch[1] : '';
    const priceMatch = block.match(/fa-naira-sign[^>]*><\/i>\s*([^<]+)/i);
    const priceLabel = priceMatch ? priceMatch[1].replace(/\s+/g, ' ').trim() : '';
    const placeholder = !phone || /8000000000/.test(phone) || Number(attribute(block, 'exp')) === 0;
    const baseSlug = slugify(displayName);
    const count = (slugCounts.get(baseSlug) || 0) + 1;
    slugCounts.set(baseSlug, count);
    const slug = count === 1 ? baseSlug : `${baseSlug}-${count}`;
    cards.push({
      slug, displayName, profession: attribute(block, 'role') || content(block, 'p'),
      category, serviceTags: attribute(block, 'tags').split(',').map(value => value.trim()).filter(Boolean),
      areas: [normalizeArea(attribute(block, 'area') || 'All of Yola')], yearsExperience: Number(attribute(block, 'exp')) || 0,
      pricing: { label: priceLabel }, availability: attribute(block, 'open') === 'true' ? 'available' : 'busy',
      image: (block.match(/<img[^>]+src="([^"]+)"/i) || [])[1] || '',
      contact: { phone }, ratingAverage: Number(attribute(block, 'rating')) || 0, reviewCount: Number(attribute(block, 'reviews')) || 0,
      status: 'published', legacySource: placeholder ? 'templates/servi.html (placeholder contact data)' : 'templates/servi.html'
    });
  }
  return cards;
}

async function main() {
  const records = parseCards();
  console.log(JSON.stringify({ mode: write ? 'write' : 'dry-run', found: records.length, draft: records.filter(record => record.status === 'draft').length }, null, 2));
  if (!write) return;
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required when using --write');
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  let imported = 0;
  for (const record of records) {
    await Professional.findOneAndUpdate({ slug: record.slug }, { $set: record }, { upsert: true, new: true, setDefaultsOnInsert: true });
    imported += 1;
  }
  console.log('Imported or updated ' + imported + ' professional records.');
  await mongoose.disconnect();
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
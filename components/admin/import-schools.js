require('dotenv').config({ path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env' });

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const ContentItem = require('../../server/contentItemModel');

const ROOT = path.join(__dirname, '..');
const LANGUAGE_DIRS = { en: 'En', ar: 'Ar', fr: 'Fr', ha: 'Ha', ff: 'Fu', yo: 'Yo', ig: 'Ig', pcm: 'Pi' };
const writeMode = process.argv.includes('--write');

function stripHtml(value) {
  return String(value || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function slugFromFilename(filename) {
  return filename.replace(/\.html$/i, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function parseHtml(filePath) {
  const html = fs.readFileSync(filePath, 'utf8');
  const title = stripHtml((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1]);
  const sectionMatches = [...html.matchAll(/<section[^>]*>([\s\S]*?)<\/section>/gi)];
  const sections = sectionMatches.map(match => {
    const content = match[1];
    const heading = stripHtml((content.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i) || [])[1]);
    const body = stripHtml((content.match(/<p[^>]*>([\s\S]*?)<\/p>/i) || [])[1]);
    const items = [...content.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
      .map(item => stripHtml(item[1]))
      .filter(Boolean);
    return { heading, body, items };
  });

  return {
    title,
    summary: sections[0]?.body || '',
    tagline: stripHtml((html.match(/<header[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i) || [])[1]),
    image: ((html.match(/<img[^>]+src=["']([^"']+)["']/i) || [])[1] || '').replace(/^(\.\.\/)+/, ''),
    sections
  };
}

function findLanguageFile(languageDir, filename) {
  const candidates = [
    path.join(ROOT, 'details', languageDir, 'Edu', filename),
    path.join(ROOT, 'details', 'Navi', languageDir, 'elementaries', filename),
    path.join(ROOT, 'details', 'Navi', languageDir, 'college', filename),
    path.join(ROOT, 'details', 'Navi', languageDir, 'colleges', filename)
  ];
  return candidates.find(candidate => fs.existsSync(candidate));
}

function localizeRecord(target, language, parsed) {
  target.title = target.title || {};
  target.summary = target.summary || {};
  target.tagline = target.tagline || {};
  target.title[language] = parsed.title;
  target.summary[language] = parsed.summary;
  target.tagline[language] = parsed.tagline;

  parsed.sections.forEach((section, index) => {
    target.sections[index] = target.sections[index] || { heading: {}, body: {}, items: [] };
    target.sections[index].heading = target.sections[index].heading || {};
    target.sections[index].body = target.sections[index].body || {};
    target.sections[index].heading[language] = section.heading;
    target.sections[index].body[language] = section.body;
    target.sections[index].items = target.sections[index].items || [];
    section.items.forEach((item, itemIndex) => {
      target.sections[index].items[itemIndex] = target.sections[index].items[itemIndex] || {};
      target.sections[index].items[itemIndex][language] = item;
    });
  });
}

async function main() {
  const sourceDir = path.join(ROOT, 'details', 'En', 'Edu');
  const files = fs.readdirSync(sourceDir).filter(file => file.endsWith('.html'));
  const records = [];

  for (const filename of files) {
    const englishPath = path.join(sourceDir, filename);
    const record = {
      category: 'school',
      slug: slugFromFilename(filename),
      title: {},
      summary: {},
      tagline: {},
      image: '',
      sections: [],
      tags: ['education', 'school'],
      location: { state: 'Adamawa', lga: 'Yola' },
      published: true
    };
    localizeRecord(record, 'en', parseHtml(englishPath));
    record.image = record.image || parseHtml(englishPath).image;

    for (const [language, directory] of Object.entries(LANGUAGE_DIRS)) {
      if (language === 'en') continue;
      const localizedPath = findLanguageFile(directory, filename);
      if (localizedPath) localizeRecord(record, language, parseHtml(localizedPath));
    }
    records.push(record);
  }

  console.log(`${writeMode ? 'Importing' : 'Dry run:'} ${records.length} school records.`);
  records.forEach(record => {
    const languages = Object.keys(record.title).filter(language => record.title[language]);
    console.log(`- ${record.slug}: ${languages.join(', ')}`);
  });

  if (!writeMode) {
    console.log('No database changes made. Use --write to upsert records.');
    return;
  }

  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required for --write');
  await mongoose.connect(process.env.MONGO_URI);
  for (const record of records) {
    await ContentItem.findOneAndUpdate(
      { category: record.category, slug: record.slug },
      { $set: record },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );
  }
  await mongoose.disconnect();
  console.log(`Upserted ${records.length} school records.`);
}

main().catch(error => {
  console.error('School import failed:', error.message);
  process.exitCode = 1;
});

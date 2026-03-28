const fs = require('fs');

// Read the file
const content = fs.readFileSync('components/i18n.js', 'utf8');

// Find the start of translations
const start = content.indexOf('const translations = {');

// Find the end of translations object
// Find the position before 'const t = translations;'
const endMarker = 'const t = translations;';
const end = content.indexOf(endMarker);

// Extract translations string
const translationsStr = content.substring(start, end);

// Parse using new Function
const fn = new Function('return ' + translationsStr.replace('const translations = ', ''));
const translations = fn();

// Get en keys
const enKeys = Object.keys(translations.en);

// Reorder
for (const lang in translations) {
  if (lang === 'en') continue;
  const newObj = {};
  for (const key of enKeys) {
    newObj[key] = translations[lang][key] || '';
  }
  translations[lang] = newObj;
}

// Stringify
const newTranslationsStr = 'const translations = ' + JSON.stringify(translations, null, 4) + ';';

// Replace
const newContent = content.substring(0, start) + newTranslationsStr + content.substring(end);

// Write
fs.writeFileSync('components/i18n.js', newContent, 'utf8');

console.log('Done');
// Script to add loading="lazy" to all <img> tags in HTML files under templates/ and frontend/pages/.
// Usage: node add-lazy-loading.js

const fs = require('fs');
const path = require('path');

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    // Add loading="lazy" to imgs that don't already have a loading attribute
    const updated = content.replace(/<img\s+([^>]*?)\/?>/gi, (match, attrs) => {
        if (/loading\s*=/.test(attrs)) {
            return match;
        }
        // insert loading="lazy" before closing bracket
        return `<img ${attrs} loading="lazy" />`;
    });
    if (updated !== content) {
        fs.writeFileSync(filePath, updated, 'utf8');
        console.log('Updated', filePath);
    }
}

function walk(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(f => {
        const fp = path.join(dir, f);
        const stat = fs.statSync(fp);
        if (stat.isDirectory()) {
            walk(fp);
        } else if (/\.html$/i.test(f)) {
            processFile(fp);
        }
    });
}

// run for templates and frontend/pages
walk(path.join(__dirname, 'templates'));
walk(path.join(__dirname, 'frontend', 'pages'));
console.log('Done adding lazy loading.');

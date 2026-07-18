#!/usr/bin/env node
/**
 * Generates `details/En/manifest.json` listing all files under `details/*/En`.
 * Run from the repo root: `node tools/generate-details-manifest.js`
 */
const fs = require('fs');
const path = require('path');

const detailsRoot = path.join(__dirname, '..', 'details');
const outManifest = path.join(detailsRoot, 'En', 'manifest.json');

function walk(dir){
  let results = [];
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of list){
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()){
      results = results.concat(walk(full));
    } else if (ent.isFile()){
      // only include files under an `En` folder
      if (full.indexOf(path.sep + 'En' + path.sep) !== -1){
        // produce repo-relative path
        const rel = path.relative(path.join(__dirname, '..'), full).replace(/\\/g, '/');
        results.push(rel);
      }
    }
  }
  return results;
}

try{
  if (!fs.existsSync(detailsRoot)){
    console.error('details folder not found:', detailsRoot);
    process.exit(1);
  }
  const files = walk(detailsRoot);
  const outDir = path.dirname(outManifest);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outManifest, JSON.stringify(files, null, 2), 'utf8');
  console.log('Wrote manifest with', files.length, 'entries to', outManifest);
}catch(e){
  console.error('Error generating manifest:', e);
  process.exit(2);
}

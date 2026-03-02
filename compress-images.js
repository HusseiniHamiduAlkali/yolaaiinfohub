// Batch compress all .jpg, .jpeg, and .png images in-place in Data/Images and subfolders
// Usage:
//   1. Run: npm install sharp
//   2. Run: node compress-images.js

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const IMAGE_DIR = path.join(__dirname, 'Data', 'Images');
const exts = ['.jpg', '.jpeg', '.png'];

function getAllImageFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllImageFiles(filePath));
    } else if (exts.includes(path.extname(file).toLowerCase())) {
      results.push(filePath);
    }
  });
  return results;
}

async function compressImage(file) {
  const ext = path.extname(file).toLowerCase();
  try {
    if (ext === '.jpg' || ext === '.jpeg') {
      await sharp(file)
        .jpeg({ quality: 70, mozjpeg: true })
        .toFile(file + '.tmp');
    } else if (ext === '.png') {
      await sharp(file)
        .png({ quality: 70, compressionLevel: 9 })
        .toFile(file + '.tmp');
    }
    fs.renameSync(file + '.tmp', file);
    console.log('Compressed:', file);
  } catch (e) {
    console.error('Failed:', file, e.message);
  }
}

(async () => {
  const files = getAllImageFiles(IMAGE_DIR);
  console.log('Found', files.length, 'images. Compressing...');
  for (const file of files) {
    await compressImage(file);
  }
  console.log('Done!');
})();

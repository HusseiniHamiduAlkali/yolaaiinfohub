require('dotenv').config();

const mongoose = require('mongoose');
const NavigationPlace = require('../server/navigationPlaceModel');
const media = require('../Data/Images/restaurants/restaurant-media.json');

const force = process.argv.includes('--force');

async function run() {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required');
  await mongoose.connect(process.env.MONGO_URI);

  let updated = 0;
  let skipped = 0;
  for (const entry of media) {
    const existing = await NavigationPlace.findOne({ slug: entry.slug }).select('heroImage galleryImages menuItems');
    if (!existing) {
      skipped += 1;
      console.warn(`Skipped missing restaurant: ${entry.slug}`);
      continue;
    }

    const update = {};
    if (force || !existing.heroImage) update.heroImage = entry.heroImage;
    if (force || !existing.galleryImages?.length) {
      update.galleryImages = entry.galleryImages;
      update.galleryCaptions = entry.galleryCaptions;
    }
    if (force || !existing.menuItems?.length) update.menuItems = entry.menuItems;
    if (!Object.keys(update).length) {
      skipped += 1;
      continue;
    }

    await NavigationPlace.updateOne({ _id: existing._id }, { $set: update });
    updated += 1;
    console.log(`${force ? 'Seeded' : 'Filled'} ${entry.slug}`);
  }

  console.log(`Restaurant media seed complete: ${updated} updated, ${skipped} skipped.`);
  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error('Restaurant media seed failed:', error.message);
  await mongoose.disconnect().catch(() => {});
  process.exitCode = 1;
});

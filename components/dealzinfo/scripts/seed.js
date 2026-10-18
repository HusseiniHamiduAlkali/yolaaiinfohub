import "dotenv/config";

import { connectDb, disconnectDb } from "../server/db.js";
import {
  Announcement,
  Business,
  Commodity,
  Market,
  Price,
  Settings,
  Submission,
} from "../server/models.js";
import {
  ANNOUNCEMENTS,
  BUSINESSES,
  COMMODITIES,
  FEATURED,
  MARKETS,
  SUBMISSIONS,
  buildPriceHistory,
} from "../server/seed-data.js";

const fresh = process.argv.includes("--fresh");

async function upsertAll(Model, rows) {
  if (!rows.length) return 0;
  await Model.bulkWrite(
    rows.map((row) => ({
      updateOne: { filter: { id: row.id }, update: { $set: row }, upsert: true },
    })),
    { ordered: false },
  );
  return rows.length;
}

async function run() {
  await connectDb();
  console.log("Connected to MongoDB");

  if (fresh) {
    console.log("--fresh: clearing existing DealzInfo collections");
    await Promise.all([
      Market.deleteMany({}),
      Commodity.deleteMany({}),
      Price.deleteMany({}),
      Business.deleteMany({}),
      Submission.deleteMany({}),
      Announcement.deleteMany({}),
      Settings.deleteMany({}),
    ]);
  }

  console.log(`Markets: ${await upsertAll(Market, MARKETS)}`);
  console.log(`Commodities: ${await upsertAll(Commodity, COMMODITIES)}`);

  const prices = buildPriceHistory();
  console.log(`Price records: ${await upsertAll(Price, prices)}`);

  console.log(`Businesses: ${await upsertAll(Business, BUSINESSES)}`);
  console.log(`Submissions: ${await upsertAll(Submission, SUBMISSIONS)}`);
  console.log(`Announcements: ${await upsertAll(Announcement, ANNOUNCEMENTS)}`);

  await Settings.findOneAndUpdate(
    { key: "site" },
    { key: "site", featuredMarkets: FEATURED.markets, featuredBusinesses: FEATURED.businesses },
    { upsert: true, setDefaultsOnInsert: true },
  );
  console.log("Featured markets and businesses set");

  await disconnectDb();
  console.log("Seed complete.");
}

run().catch(async (error) => {
  console.error("Seed failed:", error.message);
  await disconnectDb().catch(() => {});
  process.exit(1);
});

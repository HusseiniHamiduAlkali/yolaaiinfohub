// Loads the whole dataset from MongoDB into a plain object so the shared
// analytics helpers (public/js/shared/analytics.js) can run on the server.

import { Announcement, Business, Commodity, Market, Price, Submission } from "./models.js";

export async function loadState({ includeUnapproved = false, includeSubmissions = true } = {}) {
  const [markets, commodities, prices, businesses, announcements, submissions] = await Promise.all([
    Market.find().lean(),
    Commodity.find().lean(),
    Price.find().lean(),
    includeUnapproved ? Business.find().lean() : Business.find({ approved: true }).lean(),
    Announcement.find().lean(),
    includeSubmissions ? Submission.find().lean() : Promise.resolve([]),
  ]);
  const strip = (rows) => rows.map(({ _id, ...rest }) => rest);
  return {
    markets: strip(markets),
    commodities: strip(commodities),
    prices: strip(prices),
    businesses: strip(businesses),
    announcements: strip(announcements),
    submissions: strip(submissions),
  };
}

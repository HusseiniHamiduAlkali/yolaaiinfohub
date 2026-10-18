// Realistic Yola sample dataset used by scripts/seed.js.

function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const iso = (d) => d.toISOString();
const dayMs = 86_400_000;

export const MARKETS = [
  {
    id: "mkt-yola-main",
    name: "Yola Main Market",
    area: "Yola South",
    address: "Atiku Abubakar Way, Yola Town",
    lat: 9.2035,
    lng: 12.4954,
    openingHours: "Mon–Sat, 7:00 AM – 6:00 PM",
    description:
      "The largest general market in Yola Town, trading grains, foodstuff, livestock and household goods.",
    phone: "+2348030000001",
    categories: ["Food", "Grains", "Livestock", "Household"],
    createdAt: "2024-01-10T08:00:00.000Z",
  },
  {
    id: "mkt-jimeta",
    name: "Jimeta Modern Market",
    area: "Jimeta, Yola North",
    address: "Galadima Aminu Way, Jimeta",
    lat: 9.2762,
    lng: 12.4526,
    openingHours: "Daily, 6:30 AM – 7:00 PM",
    description:
      "Busy modern market serving Jimeta and Yola North with foodstuff, fish, textiles and general goods.",
    phone: "+2348030000002",
    categories: ["Food", "Fish", "Household", "Grains"],
    createdAt: "2024-01-10T08:00:00.000Z",
  },
  {
    id: "mkt-kasuwan-tike",
    name: "Kasuwan Tike",
    area: "Yola North",
    address: "Kasuwan Tike Road, Yola North",
    lat: 9.2565,
    lng: 12.4402,
    openingHours: "Mon–Sat, 7:00 AM – 5:30 PM",
    description: "Neighbourhood market known for fresh vegetables, tomatoes, pepper and fruits.",
    categories: ["Food", "Household"],
    createdAt: "2024-02-02T08:00:00.000Z",
  },
  {
    id: "mkt-mubi-road",
    name: "Mubi Road Grains Market",
    area: "Girei",
    address: "Mubi Road, Girei LGA",
    lat: 9.3389,
    lng: 12.5537,
    openingHours: "Tue & Fri, 6:00 AM – 4:00 PM",
    description: "Periodic grains market where farmers from Girei and Song bring bulk produce.",
    categories: ["Grains", "Agricultural Inputs"],
    createdAt: "2024-03-14T08:00:00.000Z",
  },
  {
    id: "mkt-ngurore",
    name: "Ngurore Livestock Market",
    area: "Yola South / Ngurore",
    address: "Ngurore, along Numan Road",
    lat: 9.1478,
    lng: 12.2724,
    openingHours: "Wed & Sun, 6:00 AM – 3:00 PM",
    description: "Regional livestock market trading cattle, sheep, goats and poultry.",
    categories: ["Livestock", "Food"],
    createdAt: "2024-03-14T08:00:00.000Z",
  },
  {
    id: "mkt-numan",
    name: "Numan Central Market",
    area: "Numan",
    address: "Market Road, Numan",
    lat: 9.4646,
    lng: 12.0295,
    openingHours: "Daily, 7:00 AM – 6:00 PM",
    description: "Riverine market with strong fish, rice and vegetable trade along the Benue.",
    categories: ["Fish", "Food", "Grains"],
    createdAt: "2024-04-01T08:00:00.000Z",
  },
];

const COMMODITY_SEEDS = [
  { id: "cmd-rice", name: "Rice (local)", category: "Grains", units: ["kg", "50kg bag", "mudu"], variants: ["Long grain", "Short grain"], icon: "wheat", base: 1850, volatility: 0.02, drift: 0.0009 },
  { id: "cmd-maize", name: "Maize", category: "Grains", units: ["kg", "100kg bag", "mudu"], variants: ["White", "Yellow"], icon: "wheat", base: 780, volatility: 0.025, drift: 0.0006 },
  { id: "cmd-beans", name: "Beans (cowpea)", category: "Grains", units: ["kg", "100kg bag", "mudu"], variants: ["White", "Brown"], icon: "wheat", base: 1420, volatility: 0.022, drift: 0.0011 },
  { id: "cmd-millet", name: "Millet", category: "Grains", units: ["kg", "100kg bag"], variants: [], icon: "wheat", base: 690, volatility: 0.02, drift: 0.0004 },
  { id: "cmd-sorghum", name: "Sorghum (guinea corn)", category: "Grains", units: ["kg", "100kg bag"], variants: [], icon: "wheat", base: 720, volatility: 0.021, drift: 0.0005 },
  { id: "cmd-groundnut", name: "Groundnuts", category: "Food", units: ["kg", "mudu"], variants: ["Shelled", "Unshelled"], icon: "nut", base: 1650, volatility: 0.024, drift: 0.0008 },
  { id: "cmd-garri", name: "Garri", category: "Food", units: ["kg", "paint bucket"], variants: ["White", "Yellow"], icon: "basket", base: 950, volatility: 0.03, drift: 0.0007 },
  { id: "cmd-yam", name: "Yam", category: "Food", units: ["tuber", "kg"], variants: [], icon: "carrot", base: 2400, volatility: 0.035, drift: 0.0006 },
  { id: "cmd-potato", name: "Irish Potatoes", category: "Food", units: ["kg", "basket"], variants: [], icon: "carrot", base: 1200, volatility: 0.03, drift: 0.0004 },
  { id: "cmd-onion", name: "Onions", category: "Food", units: ["kg", "bag"], variants: [], icon: "carrot", base: 1450, volatility: 0.05, drift: -0.0004 },
  { id: "cmd-tomato", name: "Tomatoes", category: "Food", units: ["kg", "basket"], variants: [], icon: "apple", base: 1300, volatility: 0.075, drift: -0.0012 },
  { id: "cmd-pepper", name: "Pepper (dried)", category: "Food", units: ["kg", "mudu"], variants: [], icon: "flame", base: 2600, volatility: 0.055, drift: 0.001 },
  { id: "cmd-vegetables", name: "Leafy Vegetables", category: "Food", units: ["bundle", "kg"], variants: [], icon: "leaf", base: 350, volatility: 0.06, drift: 0.0002 },
  { id: "cmd-cattle", name: "Cattle (medium bull)", category: "Livestock", units: ["head"], variants: [], icon: "beef", base: 520000, volatility: 0.018, drift: 0.0012 },
  { id: "cmd-goat", name: "Goat", category: "Livestock", units: ["head"], variants: [], icon: "beef", base: 68000, volatility: 0.02, drift: 0.001 },
  { id: "cmd-sheep", name: "Sheep (ram)", category: "Livestock", units: ["head"], variants: [], icon: "beef", base: 95000, volatility: 0.022, drift: 0.0013 },
  { id: "cmd-poultry", name: "Live Chicken", category: "Livestock", units: ["bird", "kg"], variants: ["Broiler", "Local"], icon: "egg", base: 7200, volatility: 0.025, drift: 0.0009 },
  { id: "cmd-fish", name: "Fresh Fish (tilapia)", category: "Fish", units: ["kg"], variants: [], icon: "fish", base: 3100, volatility: 0.04, drift: 0.0008 },
  { id: "cmd-cement", name: "Cement", category: "Building Materials", units: ["50kg bag"], variants: [], icon: "brick", base: 9500, volatility: 0.012, drift: 0.0009 },
  { id: "cmd-fertilizer", name: "NPK Fertilizer", category: "Agricultural Inputs", units: ["50kg bag"], variants: [], icon: "sprout", base: 42000, volatility: 0.015, drift: 0.001 },
];

export const COMMODITIES = COMMODITY_SEEDS.map((c) => ({
  id: c.id,
  name: c.name,
  category: c.category,
  units: c.units,
  defaultUnit: c.units[0],
  variants: c.variants,
  icon: c.icon,
  createdAt: "2024-01-10T08:00:00.000Z",
}));

const MARKET_FACTORS = {
  "mkt-yola-main": 1.0,
  "mkt-jimeta": 0.965,
  "mkt-kasuwan-tike": 1.035,
  "mkt-mubi-road": 0.94,
  "mkt-ngurore": 0.98,
  "mkt-numan": 1.01,
};

function marketCarries(market, commodity) {
  if (commodity.category === "Livestock") return ["mkt-ngurore", "mkt-yola-main", "mkt-jimeta"].includes(market.id);
  if (commodity.category === "Fish") return ["mkt-numan", "mkt-jimeta", "mkt-yola-main"].includes(market.id);
  if (commodity.category === "Building Materials") return ["mkt-yola-main", "mkt-jimeta"].includes(market.id);
  if (commodity.category === "Agricultural Inputs") return ["mkt-mubi-road", "mkt-yola-main"].includes(market.id);
  if (commodity.category === "Grains") return market.categories.includes("Grains");
  return market.categories.includes("Food");
}

const SOURCES = ["Market survey", "Trader interview", "Field enumerator", "Community contributor"];
const ENUMERATORS = ["Aisha Bello", "Musa Adamu", "Grace Yakubu", "Ibrahim Sale", "DealzInfo field team"];

function round(value) {
  if (value > 100000) return Math.round(value / 500) * 500;
  if (value > 10000) return Math.round(value / 100) * 100;
  if (value > 1000) return Math.round(value / 5) * 5;
  return Math.round(value);
}

/** ~6 months of history: daily for the last 30 days, every 5 days before that. */
export function buildPriceHistory(now = new Date()) {
  const rand = mulberry32(20260819);
  const records = [];
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 9, 30));

  const offsets = [];
  for (let d = 0; d <= 30; d++) offsets.push(d);
  for (let d = 35; d <= 180; d += 5) offsets.push(d);
  offsets.sort((a, b) => b - a);

  for (const seed of COMMODITY_SEEDS) {
    for (const market of MARKETS) {
      if (!marketCarries(market, seed)) continue;
      const factor = MARKET_FACTORS[market.id] ?? 1;
      const localBias = 0.96 + rand() * 0.08;
      let walk = 1;
      const staleMarket = market.id === "mkt-mubi-road";
      offsets.forEach((offset, index) => {
        const shock = (rand() - 0.5) * 2 * seed.volatility;
        walk = walk * (1 + shock);
        walk = Math.min(1.22, Math.max(0.82, walk));
        const trend = 1 + seed.drift * (180 - offset);
        const price = round(seed.base * factor * localBias * trend * walk);
        const date = new Date(today.getTime() - offset * dayMs + Math.floor(rand() * 5) * 3_600_000);
        const isLatest = index === offsets.length - 1;
        const spread = 0.03 + rand() * 0.04;
        let status = "VERIFIED";
        if (isLatest && staleMarket) status = "OUTDATED";
        else if (isLatest && rand() < 0.12) status = "COMMUNITY SUBMITTED";
        else if (isLatest && rand() < 0.08) status = "PENDING";
        records.push({
          id: `pr-${seed.id}-${market.id}-${offset}`,
          commodityId: seed.id,
          marketId: market.id,
          unit: seed.units[0],
          price,
          minPrice: round(price * (1 - spread)),
          maxPrice: round(price * (1 + spread)),
          date: iso(staleMarket ? new Date(date.getTime() - 4 * dayMs) : date),
          source: SOURCES[Math.floor(rand() * SOURCES.length)],
          submittedBy: ENUMERATORS[Math.floor(rand() * ENUMERATORS.length)],
          status,
          lastVerifiedAt: status === "VERIFIED" ? iso(date) : undefined,
          demo: true,
        });
      });
    }
  }
  return records;
}

export const BUSINESSES = [
  { id: "biz-1", name: "Sabon Gari Grains Depot", category: "Wholesaler", description: "Bulk grains wholesaler supplying rice, maize and millet to retailers across Yola.", area: "Yola South", address: "Beside Yola Main Market, Yola Town", lat: 9.2049, lng: 12.4971, phone: "+2348030000101", whatsapp: "+2348030000101", openingHours: "Mon–Sat, 7:30 AM – 6:00 PM", products: ["Rice", "Maize", "Millet", "Sorghum"], verified: true, approved: true, createdAt: "2024-05-02T08:00:00.000Z" },
  { id: "biz-2", name: "Jimeta Fresh Foods", category: "Grocery Shop", description: "Neighbourhood grocery stocking foodstuff, spices and household essentials.", area: "Jimeta", address: "Galadima Aminu Way, Jimeta", lat: 9.2779, lng: 12.4548, phone: "+2348030000102", whatsapp: "+2348030000102", openingHours: "Daily, 8:00 AM – 8:00 PM", products: ["Garri", "Rice", "Beans", "Spices"], verified: true, approved: true, createdAt: "2024-05-19T08:00:00.000Z" },
  { id: "biz-3", name: "Adamawa Agro Inputs", category: "Agricultural Supplier", description: "Fertilizer, improved seeds, agro-chemicals and small farm tools.", area: "Girei", address: "Mubi Road, Girei", lat: 9.3372, lng: 12.5512, phone: "+2348030000103", openingHours: "Mon–Fri, 8:00 AM – 5:00 PM", products: ["NPK Fertilizer", "Urea", "Maize seed", "Sprayers"], verified: true, approved: true, createdAt: "2024-06-04T08:00:00.000Z" },
  { id: "biz-4", name: "Ngurore Livestock Traders Union", category: "Farmer", description: "Cooperative of cattle, sheep and goat traders operating on market days.", area: "Ngurore", address: "Ngurore Livestock Market", lat: 9.1489, lng: 12.2741, phone: "+2348030000104", whatsapp: "+2348030000104", openingHours: "Wed & Sun, 6:00 AM – 3:00 PM", products: ["Cattle", "Sheep", "Goats"], verified: true, approved: true, createdAt: "2024-06-21T08:00:00.000Z" },
  { id: "biz-5", name: "Benue Fresh Fish Point", category: "Retailer", description: "Fresh and smoked river fish supplied daily from Numan landing sites.", area: "Numan", address: "Market Road, Numan", lat: 9.4661, lng: 12.0311, phone: "+2348030000105", whatsapp: "+2348030000105", openingHours: "Daily, 6:30 AM – 5:00 PM", products: ["Tilapia", "Catfish", "Smoked fish"], verified: false, approved: true, createdAt: "2024-07-08T08:00:00.000Z" },
  { id: "biz-6", name: "Hauwa's Kitchen", category: "Restaurant", description: "Local dishes, tuwo and rice specials with delivery around Jimeta.", area: "Jimeta", address: "Ahmadu Bello Way, Jimeta", lat: 9.2731, lng: 12.4589, phone: "+2348030000106", whatsapp: "+2348030000106", openingHours: "Daily, 9:00 AM – 9:00 PM", products: ["Tuwo", "Jollof rice", "Miyan kuka"], verified: true, approved: true, createdAt: "2024-07-25T08:00:00.000Z" },
  { id: "biz-7", name: "Yola Blocks & Cement", category: "Building Materials", description: "Cement, blocks, iron rods and roofing sheets for small builders.", area: "Yola North", address: "Bekaji, Yola North", lat: 9.2603, lng: 12.4623, phone: "+2348030000107", openingHours: "Mon–Sat, 7:00 AM – 6:00 PM", products: ["Cement", "Blocks", "Rods", "Roofing sheets"], verified: true, approved: true, createdAt: "2024-08-11T08:00:00.000Z" },
  { id: "biz-8", name: "Bekaji Pharmacy", category: "Pharmacy", description: "Registered community pharmacy with prescription and OTC medicines.", area: "Yola North", address: "Bekaji Junction, Yola North", lat: 9.2588, lng: 12.4655, phone: "+2348030000108", openingHours: "Daily, 8:00 AM – 9:00 PM", products: ["Prescription drugs", "OTC medicine", "First aid"], verified: true, approved: true, createdAt: "2024-08-30T08:00:00.000Z" },
  { id: "biz-9", name: "Modibbo Electronics", category: "Electronics Shop", description: "Phones, accessories, solar lamps and small appliance repairs.", area: "Jimeta", address: "Atiku Abubakar Way, Jimeta", lat: 9.2755, lng: 12.4497, phone: "+2348030000109", whatsapp: "+2348030000109", openingHours: "Mon–Sat, 9:00 AM – 7:00 PM", products: ["Phones", "Solar lamps", "Accessories"], verified: false, approved: true, createdAt: "2024-09-15T08:00:00.000Z" },
  { id: "biz-10", name: "Ali Auto Works", category: "Mechanic", description: "General vehicle repairs, diagnostics and roadside recovery.", area: "Yola South", address: "Numan Road, Yola South", lat: 9.1902, lng: 12.4711, phone: "+2348030000110", openingHours: "Mon–Sat, 8:00 AM – 6:00 PM", products: ["Engine repair", "Diagnostics", "Recovery"], verified: false, approved: true, createdAt: "2024-10-02T08:00:00.000Z" },
  { id: "biz-11", name: "Zainab Tailoring House", category: "Tailor", description: "Ready-to-wear and bespoke tailoring for men and women.", area: "Yola Town", address: "Rumde, Yola Town", lat: 9.2088, lng: 12.4869, phone: "+2348030000111", whatsapp: "+2348030000111", openingHours: "Mon–Sat, 9:00 AM – 7:00 PM", products: ["Kaftan", "Uniforms", "Alterations"], verified: true, approved: true, createdAt: "2024-10-20T08:00:00.000Z" },
  { id: "biz-12", name: "Yola Swift Logistics", category: "Transportation", description: "Intra-city haulage of farm produce and market goods.", area: "Jimeta", address: "Kofare, Yola South", lat: 9.2299, lng: 12.4622, phone: "+2348030000112", whatsapp: "+2348030000112", openingHours: "Daily, 6:00 AM – 8:00 PM", products: ["Haulage", "Produce transport", "Market delivery"], verified: false, approved: false, createdAt: "2025-01-14T08:00:00.000Z" },
];

export const ANNOUNCEMENTS = [
  { id: "ann-1", kind: "announcement", title: "Ngurore livestock market day moved to Sunday", body: "Traders should note that the mid-week livestock session now closes by 3:00 PM.", createdAt: "2026-08-16T09:00:00.000Z", featured: true },
  { id: "ann-2", kind: "notice", title: "Grain survey underway in Girei", body: "Field enumerators are collecting bulk grain prices at Mubi Road market this week.", createdAt: "2026-08-12T09:00:00.000Z", featured: false },
  { id: "ann-3", kind: "alert", title: "Demo dataset", body: "All prices currently shown are realistic sample figures for demonstration, not live market rates.", createdAt: "2026-08-10T09:00:00.000Z", featured: true },
];

export const SUBMISSIONS = [
  { id: "sub-1", kind: "price", status: "pending", submittedBy: "Musa Adamu", contact: "+2348030000201", createdAt: "2026-08-18T14:20:00.000Z", note: "Bought this morning at the grain shed.", payload: { commodityId: "cmd-maize", marketId: "mkt-jimeta", unit: "kg", price: 815 } },
  { id: "sub-2", kind: "price", status: "pending", submittedBy: "Grace Yakubu", contact: "grace@example.com", createdAt: "2026-08-18T10:05:00.000Z", note: "Tomato price fell sharply after new supply arrived.", payload: { commodityId: "cmd-tomato", marketId: "mkt-kasuwan-tike", unit: "kg", price: 1080 } },
  { id: "sub-3", kind: "business", status: "pending", submittedBy: "Yola Swift Logistics", contact: "+2348030000112", createdAt: "2026-08-17T16:40:00.000Z", note: "Please list our haulage service.", payload: { name: "Yola Swift Logistics", category: "Transportation", area: "Jimeta", phone: "+2348030000112" } },
  { id: "sub-4", kind: "correction", status: "clarification", submittedBy: "Ibrahim Sale", createdAt: "2026-08-15T12:00:00.000Z", note: "Kasuwan Tike closes at 5:30 PM, not 6:00 PM.", moderatorNote: "Awaiting confirmation from market union.", payload: { marketId: "mkt-kasuwan-tike", field: "openingHours" } },
];

export const FEATURED = {
  markets: ["mkt-yola-main", "mkt-jimeta"],
  businesses: ["biz-1", "biz-3"],
};

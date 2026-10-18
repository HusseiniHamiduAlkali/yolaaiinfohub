import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

// Every document carries a readable string `id`; `_id` is hidden from the API.
const baseOptions = {
  versionKey: false,
  toJSON: {
    virtuals: false,
    transform(_doc, ret) {
      delete ret._id;
      return ret;
    },
  },
};

const marketSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    area: { type: String, default: "Yola" },
    address: { type: String, default: "" },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    openingHours: { type: String, default: "Not provided" },
    description: { type: String, default: "" },
    phone: String,
    categories: { type: [String], default: [] },
    createdAt: { type: String, default: () => new Date().toISOString() },
  },
  baseOptions,
);

const commoditySchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    category: { type: String, default: "Food" },
    units: { type: [String], default: ["kg"] },
    defaultUnit: { type: String, default: "kg" },
    variants: { type: [String], default: [] },
    icon: { type: String, default: "basket" },
    createdAt: { type: String, default: () => new Date().toISOString() },
  },
  baseOptions,
);

const priceSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    commodityId: { type: String, required: true, index: true },
    marketId: { type: String, required: true, index: true },
    unit: { type: String, default: "kg" },
    price: { type: Number, required: true },
    minPrice: Number,
    maxPrice: Number,
    date: { type: String, required: true, index: true },
    source: { type: String, default: "Market survey" },
    submittedBy: { type: String, default: "DealzInfo field team" },
    status: {
      type: String,
      enum: ["VERIFIED", "PENDING", "OUTDATED", "COMMUNITY SUBMITTED"],
      default: "VERIFIED",
    },
    lastVerifiedAt: String,
    demo: { type: Boolean, default: false },
  },
  baseOptions,
);

const businessSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    category: { type: String, default: "Other" },
    description: { type: String, default: "" },
    area: { type: String, default: "Yola" },
    address: { type: String, default: "" },
    lat: { type: Number, default: 9.2035 },
    lng: { type: Number, default: 12.4954 },
    phone: String,
    whatsapp: String,
    openingHours: { type: String, default: "Not provided" },
    products: { type: [String], default: [] },
    verified: { type: Boolean, default: false },
    approved: { type: Boolean, default: false },
    createdAt: { type: String, default: () => new Date().toISOString() },
  },
  baseOptions,
);

const submissionSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    kind: { type: String, enum: ["price", "business", "correction"], required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "clarification"],
      default: "pending",
    },
    submittedBy: { type: String, default: "Anonymous" },
    contact: String,
    note: String,
    moderatorNote: String,
    payload: { type: Schema.Types.Mixed, default: {} },
    createdAt: { type: String, default: () => new Date().toISOString() },
  },
  baseOptions,
);

const announcementSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    kind: { type: String, enum: ["announcement", "notice", "alert"], default: "announcement" },
    title: { type: String, required: true },
    body: { type: String, default: "" },
    featured: { type: Boolean, default: false },
    createdAt: { type: String, default: () => new Date().toISOString() },
  },
  baseOptions,
);

// Single document holding site-wide settings such as featured entities.
const settingsSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, default: "site" },
    featuredMarkets: { type: [String], default: [] },
    featuredBusinesses: { type: [String], default: [] },
  },
  baseOptions,
);

export const Market = models.DealzMarket ?? model("DealzMarket", marketSchema, "markets");
export const Commodity = models.DealzCommodity ?? model("DealzCommodity", commoditySchema, "commodities");
export const Price = models.DealzPrice ?? model("DealzPrice", priceSchema, "prices");
export const Business = models.DealzBusiness ?? model("DealzBusiness", businessSchema, "businesses");
export const Submission = models.DealzSubmission ?? model("DealzSubmission", submissionSchema, "submissions");
export const Announcement = models.DealzAnnouncement ?? model("DealzAnnouncement", announcementSchema, "announcements");
export const Settings = models.DealzSettings ?? model("DealzSettings", settingsSchema, "settings");

export async function getSettings() {
  let doc = await Settings.findOne({ key: "site" });
  if (!doc) doc = await Settings.create({ key: "site" });
  return doc;
}

export function newId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

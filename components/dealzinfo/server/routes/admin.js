import { Router } from "express";
import { z } from "zod";

import { buildQuotes, overviewStats } from "../../public/js/shared/analytics.js";
import {
  Announcement,
  Business,
  Commodity,
  Market,
  Price,
  Submission,
  getSettings,
  newId,
} from "../models.js";
import { loadState } from "../state.js";

const router = Router();
const requireFullAdmin = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Only a full administrator can do this" });
  }
  return next();
};

const bad = (res, error) => res.status(400).json({ error });

/* -------------------------------- dashboard ------------------------------- */

router.get("/overview", async (_req, res, next) => {
  try {
    const state = await loadState({ includeUnapproved: true });
    const quotes = buildQuotes(state);
    res.json({
      stats: overviewStats(state, quotes),
      pending: state.submissions.filter((s) => s.status === "pending").length,
      unapprovedBusinesses: state.businesses.filter((b) => !b.approved).length,
    });
  } catch (error) {
    next(error);
  }
});

/* ------------------------------- submissions ------------------------------ */

router.get("/submissions", async (_req, res, next) => {
  try {
    res.json(await Submission.find().sort({ createdAt: -1 }));
  } catch (error) {
    next(error);
  }
});

const moderateSchema = z.object({
  status: z.enum(["pending", "approved", "rejected", "clarification"]),
  moderatorNote: z.string().trim().max(600).optional(),
});

router.patch("/submissions/:id", async (req, res, next) => {
  try {
    const parsed = moderateSchema.safeParse(req.body);
    if (!parsed.success) return bad(res, "Invalid moderation request");
    const submission = await Submission.findOne({ id: req.params.id });
    if (!submission) return res.status(404).json({ error: "Submission not found" });

    submission.status = parsed.data.status;
    if (parsed.data.moderatorNote !== undefined) submission.moderatorNote = parsed.data.moderatorNote;

    // Approving publishes the submitted content.
    if (parsed.data.status === "approved" && submission.kind === "price") {
      const p = submission.payload ?? {};
      if (p.commodityId && p.marketId && Number(p.price) > 0) {
        const now = new Date().toISOString();
        await Price.create({
          id: newId("pr"),
          commodityId: String(p.commodityId),
          marketId: String(p.marketId),
          unit: p.unit ? String(p.unit) : "kg",
          price: Number(p.price),
          date: now,
          source: "Community submission (approved)",
          submittedBy: submission.submittedBy,
          status: "VERIFIED",
          lastVerifiedAt: now,
        });
      }
    }
    if (parsed.data.status === "approved" && submission.kind === "business") {
      const p = submission.payload ?? {};
      if (p.name) {
        await Business.create({
          id: newId("biz"),
          name: String(p.name),
          category: p.category ? String(p.category) : "Other",
          description: p.description ? String(p.description) : "Community submitted business.",
          area: p.area ? String(p.area) : "Yola",
          address: p.address ? String(p.address) : "",
          lat: Number(p.lat) || 9.2035,
          lng: Number(p.lng) || 12.4954,
          phone: p.phone ? String(p.phone) : undefined,
          whatsapp: p.whatsapp ? String(p.whatsapp) : undefined,
          openingHours: p.openingHours ? String(p.openingHours) : "Not provided",
          products: p.products ? String(p.products).split(",").map((x) => x.trim()).filter(Boolean) : [],
          verified: false,
          approved: true,
          createdAt: new Date().toISOString(),
        });
      }
    }

    await submission.save();
    return res.json(submission.toJSON());
  } catch (error) {
    return next(error);
  }
});

/* --------------------------------- prices --------------------------------- */

const priceSchema = z.object({
  commodityId: z.string().trim().min(1),
  marketId: z.string().trim().min(1),
  unit: z.string().trim().min(1).max(40),
  price: z.coerce.number().positive().max(100_000_000),
  minPrice: z.coerce.number().positive().max(100_000_000).optional(),
  maxPrice: z.coerce.number().positive().max(100_000_000).optional(),
  date: z.string().trim().optional(),
  source: z.string().trim().max(120).optional(),
  status: z.enum(["VERIFIED", "PENDING", "OUTDATED", "COMMUNITY SUBMITTED"]).optional(),
});

router.post("/prices", async (req, res, next) => {
  try {
    const parsed = priceSchema.safeParse(req.body);
    if (!parsed.success) return bad(res, parsed.error.issues[0]?.message ?? "Invalid price");
    const d = parsed.data;
    const [commodity, market] = await Promise.all([
      Commodity.findOne({ id: d.commodityId }),
      Market.findOne({ id: d.marketId }),
    ]);
    if (!commodity || !market) return bad(res, "Unknown commodity or market");
    const date = d.date ? new Date(d.date).toISOString() : new Date().toISOString();
    const created = await Price.create({
      id: newId("pr"),
      ...d,
      date,
      source: d.source || "Admin entry",
      submittedBy: req.user.name,
      status: d.status ?? "VERIFIED",
      lastVerifiedAt: date,
    });
    return res.status(201).json(created.toJSON());
  } catch (error) {
    return next(error);
  }
});

router.delete("/prices/:id", async (req, res, next) => {
  try {
    const result = await Price.deleteOne({ id: req.params.id });
    if (!result.deletedCount) return res.status(404).json({ error: "Price record not found" });
    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

/* --------------------------------- markets -------------------------------- */

const marketSchema = z.object({
  id: z.string().trim().min(2).max(60).optional(),
  name: z.string().trim().min(2).max(160),
  area: z.string().trim().max(120).optional(),
  address: z.string().trim().max(200).optional(),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  openingHours: z.string().trim().max(120).optional(),
  description: z.string().trim().max(600).optional(),
  phone: z.string().trim().max(40).optional(),
  categories: z.array(z.string().trim().max(60)).optional(),
});

router.post("/markets", async (req, res, next) => {
  try {
    const parsed = marketSchema.safeParse(req.body);
    if (!parsed.success) return bad(res, parsed.error.issues[0]?.message ?? "Invalid market");
    const d = parsed.data;
    const id = d.id || newId("mkt");
    const updated = await Market.findOneAndUpdate(
      { id },
      { ...d, id },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    return res.json(updated.toJSON());
  } catch (error) {
    return next(error);
  }
});

router.delete("/markets/:id", requireFullAdmin, async (req, res, next) => {
  try {
    const result = await Market.deleteOne({ id: req.params.id });
    if (!result.deletedCount) return res.status(404).json({ error: "Market not found" });
    await Price.deleteMany({ marketId: req.params.id });
    const settings = await getSettings();
    settings.featuredMarkets = settings.featuredMarkets.filter((m) => m !== req.params.id);
    await settings.save();
    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

/* ------------------------------- commodities ------------------------------ */

const commoditySchema = z.object({
  id: z.string().trim().min(2).max(60).optional(),
  name: z.string().trim().min(2).max(160),
  category: z.string().trim().max(60).optional(),
  units: z.array(z.string().trim().max(40)).min(1),
  variants: z.array(z.string().trim().max(60)).optional(),
  icon: z.string().trim().max(40).optional(),
});

router.post("/commodities", async (req, res, next) => {
  try {
    const parsed = commoditySchema.safeParse(req.body);
    if (!parsed.success) return bad(res, parsed.error.issues[0]?.message ?? "Invalid commodity");
    const d = parsed.data;
    const id = d.id || newId("cmd");
    const updated = await Commodity.findOneAndUpdate(
      { id },
      { ...d, id, defaultUnit: d.units[0] },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    return res.json(updated.toJSON());
  } catch (error) {
    return next(error);
  }
});

router.delete("/commodities/:id", requireFullAdmin, async (req, res, next) => {
  try {
    const result = await Commodity.deleteOne({ id: req.params.id });
    if (!result.deletedCount) return res.status(404).json({ error: "Commodity not found" });
    await Price.deleteMany({ commodityId: req.params.id });
    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

/* ------------------------------- businesses ------------------------------- */

router.get("/businesses", async (_req, res, next) => {
  try {
    res.json(await Business.find().sort({ createdAt: -1 }));
  } catch (error) {
    next(error);
  }
});

const businessFlagsSchema = z.object({
  approved: z.boolean().optional(),
  verified: z.boolean().optional(),
});

router.patch("/businesses/:id", async (req, res, next) => {
  try {
    const parsed = businessFlagsSchema.safeParse(req.body);
    if (!parsed.success) return bad(res, "Invalid business update");
    const business = await Business.findOneAndUpdate({ id: req.params.id }, parsed.data, { new: true });
    if (!business) return res.status(404).json({ error: "Business not found" });
    return res.json(business.toJSON());
  } catch (error) {
    return next(error);
  }
});

router.delete("/businesses/:id", requireFullAdmin, async (req, res, next) => {
  try {
    const result = await Business.deleteOne({ id: req.params.id });
    if (!result.deletedCount) return res.status(404).json({ error: "Business not found" });
    const settings = await getSettings();
    settings.featuredBusinesses = settings.featuredBusinesses.filter((b) => b !== req.params.id);
    await settings.save();
    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

/* --------------------------------- featured ------------------------------- */

router.get("/featured", async (_req, res, next) => {
  try {
    const settings = await getSettings();
    res.json({ markets: settings.featuredMarkets, businesses: settings.featuredBusinesses });
  } catch (error) {
    next(error);
  }
});

router.post("/featured/toggle", async (req, res, next) => {
  try {
    const parsed = z
      .object({ kind: z.enum(["market", "business"]), id: z.string().trim().min(1) })
      .safeParse(req.body);
    if (!parsed.success) return bad(res, "Invalid featured toggle");
    const settings = await getSettings();
    const key = parsed.data.kind === "market" ? "featuredMarkets" : "featuredBusinesses";
    const list = settings[key];
    const index = list.indexOf(parsed.data.id);
    if (index >= 0) list.splice(index, 1);
    else list.push(parsed.data.id);
    settings[key] = list;
    await settings.save();
    return res.json({ markets: settings.featuredMarkets, businesses: settings.featuredBusinesses });
  } catch (error) {
    return next(error);
  }
});

/* ------------------------------ announcements ----------------------------- */

const announcementSchema = z.object({
  id: z.string().trim().max(60).optional(),
  kind: z.enum(["announcement", "notice", "alert"]),
  title: z.string().trim().min(3).max(180),
  body: z.string().trim().max(1200).optional(),
  featured: z.boolean().optional(),
});

router.post("/announcements", async (req, res, next) => {
  try {
    const parsed = announcementSchema.safeParse(req.body);
    if (!parsed.success) return bad(res, parsed.error.issues[0]?.message ?? "Invalid announcement");
    const d = parsed.data;
    const id = d.id || newId("ann");
    const updated = await Announcement.findOneAndUpdate(
      { id },
      { ...d, id },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    return res.json(updated.toJSON());
  } catch (error) {
    return next(error);
  }
});

router.delete("/announcements/:id", async (req, res, next) => {
  try {
    const result = await Announcement.deleteOne({ id: req.params.id });
    if (!result.deletedCount) return res.status(404).json({ error: "Announcement not found" });
    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

export default router;

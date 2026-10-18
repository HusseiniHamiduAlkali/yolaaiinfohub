import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";

import {
  buildAlerts,
  buildQuotes,
  compareAcrossMarkets,
  haversineKm,
  overviewStats,
  trendSeries,
  trendStats,
} from "../../public/js/shared/analytics.js";
import { Announcement, Business, Commodity, Market, Price, Submission, getSettings, newId } from "../models.js";
import { loadState } from "../state.js";

const router = Router();

/* ------------------------------ reference data ----------------------------- */

router.get("/bootstrap", async (_req, res, next) => {
  try {
    const state = await loadState();
    const settings = await getSettings();
    const quotes = buildQuotes(state);
    res.json({
      markets: state.markets,
      commodities: state.commodities,
      businesses: state.businesses,
      announcements: state.announcements.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      featuredMarkets: settings.featuredMarkets,
      featuredBusinesses: settings.featuredBusinesses,
      quotes,
      alerts: buildAlerts(state, quotes),
      stats: overviewStats(state, quotes),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/markets", async (_req, res, next) => {
  try {
    res.json(await Market.find().sort({ name: 1 }));
  } catch (error) {
    next(error);
  }
});

router.get("/markets/:id", async (req, res, next) => {
  try {
    const market = await Market.findOne({ id: req.params.id });
    if (!market) return res.status(404).json({ error: "Market not found" });
    const state = await loadState();
    const quotes = buildQuotes(state).filter((q) => q.market.id === market.id);
    const nearby = state.businesses
      .map((b) => ({ business: b, km: haversineKm(market, b) }))
      .sort((a, b) => a.km - b.km)
      .slice(0, 6);
    return res.json({ market: market.toJSON(), quotes, nearby });
  } catch (error) {
    return next(error);
  }
});

router.get("/commodities", async (_req, res, next) => {
  try {
    res.json(await Commodity.find().sort({ name: 1 }));
  } catch (error) {
    next(error);
  }
});

router.get("/announcements", async (_req, res, next) => {
  try {
    res.json(await Announcement.find().sort({ createdAt: -1 }));
  } catch (error) {
    next(error);
  }
});

/* --------------------------------- prices --------------------------------- */

router.get("/quotes", async (_req, res, next) => {
  try {
    const state = await loadState();
    res.json(buildQuotes(state));
  } catch (error) {
    next(error);
  }
});

router.get("/prices", async (req, res, next) => {
  try {
    const { commodityId, marketId, status } = req.query;
    const limit = Math.min(Number(req.query.limit) || 100, 2000);
    const skip = Math.max(Number(req.query.skip) || 0, 0);
    const filter = {};
    if (commodityId && commodityId !== "all") filter.commodityId = String(commodityId);
    if (marketId && marketId !== "all") filter.marketId = String(marketId);
    if (status && status !== "all") filter.status = String(status);

    const [items, total] = await Promise.all([
      Price.find(filter).sort({ date: -1 }).skip(skip).limit(limit),
      Price.countDocuments(filter),
    ]);
    res.json({ items, total, limit, skip });
  } catch (error) {
    next(error);
  }
});

router.get("/compare/:commodityId", async (req, res, next) => {
  try {
    const state = await loadState();
    const result = compareAcrossMarkets(buildQuotes(state), req.params.commodityId);
    if (!result) return res.status(404).json({ error: "No prices recorded for this commodity yet" });
    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

router.get("/trends", async (req, res, next) => {
  try {
    const commodityId = String(req.query.commodityId ?? "");
    const marketId = String(req.query.marketId ?? "all");
    const days = Math.min(Math.max(Number(req.query.days) || 90, 7), 365);
    if (!commodityId) return res.status(400).json({ error: "commodityId is required" });
    const state = await loadState();
    const points = trendSeries(state, commodityId, marketId, days);
    return res.json({ points, stats: trendStats(points) });
  } catch (error) {
    return next(error);
  }
});

/* ------------------------------- businesses ------------------------------- */

router.get("/businesses", async (_req, res, next) => {
  try {
    res.json(await Business.find({ approved: true }).sort({ name: 1 }));
  } catch (error) {
    next(error);
  }
});

router.get("/businesses/:id", async (req, res, next) => {
  try {
    const business = await Business.findOne({ id: req.params.id, approved: true });
    if (!business) return res.status(404).json({ error: "Business not found" });
    const markets = await Market.find().lean();
    const nearby = markets
      .map(({ _id, ...m }) => ({ market: m, km: haversineKm(business, m) }))
      .sort((a, b) => a.km - b.km)
      .slice(0, 4);
    return res.json({ business: business.toJSON(), nearby });
  } catch (error) {
    return next(error);
  }
});

/* ------------------------------- submissions ------------------------------ */

const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many submissions from this device. Please try again later." },
});

const text = (max) => z.string().trim().max(max);

const submissionSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("price"),
    submittedBy: text(120).min(2, "Tell us who is reporting"),
    contact: text(120).optional(),
    note: text(600).optional(),
    payload: z.object({
      commodityId: text(60).min(1),
      marketId: text(60).min(1),
      unit: text(40).min(1),
      price: z.coerce.number().positive().max(100_000_000),
    }),
  }),
  z.object({
    kind: z.literal("business"),
    submittedBy: text(120).min(2, "Tell us who is submitting"),
    contact: text(120).optional(),
    note: text(600).optional(),
    payload: z.object({
      name: text(160).min(2, "Business name is required"),
      category: text(60).optional(),
      description: text(600).optional(),
      area: text(120).optional(),
      address: text(200).optional(),
      phone: text(40).optional(),
      whatsapp: text(40).optional(),
      openingHours: text(120).optional(),
      products: text(400).optional(),
    }),
  }),
  z.object({
    kind: z.literal("correction"),
    submittedBy: text(120).min(2, "Tell us who is reporting"),
    contact: text(120).optional(),
    note: text(1000).min(5, "Describe the problem"),
    payload: z.object({}).passthrough().optional(),
  }),
]);

router.post("/submissions", submitLimiter, async (req, res, next) => {
  try {
    const parsed = submissionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid submission" });
    }
    const data = parsed.data;

    if (data.kind === "price") {
      const [commodity, market] = await Promise.all([
        Commodity.findOne({ id: data.payload.commodityId }),
        Market.findOne({ id: data.payload.marketId }),
      ]);
      if (!commodity || !market) {
        return res.status(400).json({ error: "Choose a commodity and market from the lists" });
      }
    }

    const created = await Submission.create({
      id: newId("sub"),
      kind: data.kind,
      status: "pending",
      submittedBy: data.submittedBy,
      contact: data.contact || undefined,
      note: data.note || undefined,
      payload: data.payload ?? {},
      createdAt: new Date().toISOString(),
    });

    // Only the reference is returned — submissions stay private until reviewed.
    return res.status(201).json({ ok: true, reference: created.id });
  } catch (error) {
    return next(error);
  }
});

export default router;

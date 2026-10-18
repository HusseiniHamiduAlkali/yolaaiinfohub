// Price analytics shared by the browser pages and the Express server.
// `state` is a plain object: { markets, commodities, prices, businesses, submissions }

import { daysBetween, directionOf } from "./format.js";

export const pairKey = (commodityId, marketId) => `${commodityId}:${marketId}`;

function byDateDesc(a, b) {
  return new Date(b.date).getTime() - new Date(a.date).getTime();
}

export function seriesFor(state, commodityId, marketId) {
  return state.prices
    .filter((p) => p.commodityId === commodityId && p.marketId === marketId)
    .sort(byDateDesc);
}

export function buildQuotes(state, now = new Date()) {
  const commodities = new Map(state.commodities.map((c) => [c.id, c]));
  const markets = new Map(state.markets.map((m) => [m.id, m]));
  const grouped = new Map();
  for (const p of state.prices) {
    const key = pairKey(p.commodityId, p.marketId);
    const list = grouped.get(key);
    if (list) list.push(p);
    else grouped.set(key, [p]);
  }
  const quotes = [];
  for (const list of grouped.values()) {
    list.sort(byDateDesc);
    const record = list[0];
    const commodity = commodities.get(record.commodityId);
    const market = markets.get(record.marketId);
    if (!commodity || !market) continue;
    const previous = list[1];
    const change = previous ? ((record.price - previous.price) / previous.price) * 100 : 0;
    const staleDays = daysBetween(record.date, now);
    quotes.push({
      record,
      previous: previous ?? null,
      change,
      direction: directionOf(change),
      staleDays,
      commodity,
      market,
    });
  }
  return quotes.sort((a, b) => a.commodity.name.localeCompare(b.commodity.name));
}

export function isStale(staleDays) {
  return staleDays >= 3;
}

export function compareAcrossMarkets(quotes, commodityId) {
  const rows = quotes
    .filter((q) => q.commodity.id === commodityId)
    .sort((a, b) => a.record.price - b.record.price);
  if (!rows.length) return null;
  const prices = rows.map((r) => r.record.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const average = prices.reduce((a, b) => a + b, 0) / prices.length;
  return {
    rows,
    cheapest: rows[0],
    priciest: rows[rows.length - 1],
    min,
    max,
    average,
    spread: max - min,
    spreadPercent: min > 0 ? ((max - min) / min) * 100 : 0,
  };
}

export function trendSeries(state, commodityId, marketId, fromDays, now = new Date()) {
  const cutoff = now.getTime() - fromDays * 86_400_000;
  const records = state.prices.filter(
    (p) =>
      p.commodityId === commodityId &&
      (marketId === "all" || p.marketId === marketId) &&
      new Date(p.date).getTime() >= cutoff,
  );
  const buckets = new Map();
  for (const r of records) {
    const day = String(r.date).slice(0, 10);
    const bucket = buckets.get(day);
    if (bucket) bucket.push(r.price);
    else buckets.set(day, [r.price]);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, values]) => ({
      date: day,
      label: new Date(day).toLocaleDateString("en-NG", { day: "numeric", month: "short" }),
      price: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
    }));
}

export function trendStats(points) {
  if (!points.length) return null;
  const prices = points.map((p) => p.price);
  const first = prices[0];
  const last = prices[prices.length - 1];
  const average = prices.reduce((a, b) => a + b, 0) / prices.length;
  const variance = prices.reduce((a, b) => a + (b - average) ** 2, 0) / prices.length;
  return {
    first,
    last,
    high: Math.max(...prices),
    low: Math.min(...prices),
    average,
    change: first > 0 ? ((last - first) / first) * 100 : 0,
    volatility: average > 0 ? (Math.sqrt(variance) / average) * 100 : 0,
    points: points.length,
  };
}

export function buildAlerts(state, quotes, now = new Date()) {
  const alerts = [];
  const movers = [...quotes].sort((a, b) => Math.abs(b.change) - Math.abs(a.change)).slice(0, 6);
  for (const q of movers) {
    if (Math.abs(q.change) < 1) continue;
    alerts.push({
      id: `alert-move-${q.commodity.id}-${q.market.id}`,
      severity: q.change > 0 ? "up" : "down",
      title: `${q.commodity.name} ${q.change > 0 ? "up" : "down"} ${Math.abs(q.change).toFixed(1)}% at ${q.market.name}`,
      detail: `Latest recorded price is ₦${q.record.price.toLocaleString()} per ${q.record.unit}, against ₦${(q.previous?.price ?? q.record.price).toLocaleString()} previously.`,
      commodityId: q.commodity.id,
      marketId: q.market.id,
      createdAt: q.record.date,
    });
  }
  const todays = quotes.filter((q) => q.staleDays === 0).length;
  if (todays) {
    alerts.push({
      id: "alert-updates",
      severity: "info",
      title: `New price updates available for ${todays} commodity records`,
      detail: "Updated within the last 24 hours across the tracked markets.",
      createdAt: now.toISOString(),
    });
  }
  const staleMarkets = new Map();
  for (const q of quotes) {
    if (isStale(q.staleDays)) {
      staleMarkets.set(q.market.name, Math.max(staleMarkets.get(q.market.name) ?? 0, q.staleDays));
    }
  }
  for (const [name, days] of staleMarkets) {
    alerts.push({
      id: `alert-stale-${name}`,
      severity: "stale",
      title: `${name} has not been updated for ${days} days`,
      detail: "Prices from this market are marked outdated until a fresh survey is recorded.",
      createdAt: now.toISOString(),
    });
  }
  return alerts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function overviewStats(state, quotes) {
  const sorted = [...quotes].sort((a, b) => b.change - a.change);
  return {
    markets: state.markets.length,
    commodities: state.commodities.length,
    updatesToday: quotes.filter((q) => q.staleDays === 0).length,
    businesses: state.businesses.filter((b) => b.approved).length,
    biggestIncrease: sorted[0] ?? null,
    biggestDecrease: sorted[sorted.length - 1] ?? null,
    records: state.prices.length,
    pendingSubmissions: (state.submissions ?? []).filter((s) => s.status === "pending").length,
    lastUpdated: quotes.reduce((acc, q) => {
      if (!acc || new Date(q.record.date) > new Date(acc)) return q.record.date;
      return acc;
    }, null),
  };
}

export function haversineKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

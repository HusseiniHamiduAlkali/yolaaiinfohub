import { api } from "../api.js";
import { priceCard } from "../price-card.js";
import { formatDate, formatNaira, formatSignedPercent, relativeDay } from "../shared/format.js";
import { $, clear, el, emptyState, skeletons, toast } from "../ui.js";

const stats = $("#stats");
const latest = $("#latest");
skeletons(stats, 4);
skeletons(latest, 6);

$("#search-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const q = $("#search-input").value.trim();
  if (!q) return;
  const lower = q.toLowerCase();
  if (/market|kasuwa/.test(lower)) window.location.href = `/markets.html?q=${encodeURIComponent(q)}`;
  else if (/shop|store|pharmacy|tailor|mechanic|restaurant|supplier|depot/.test(lower))
    window.location.href = `/businesses.html?q=${encodeURIComponent(q)}`;
  else window.location.href = `/prices.html?q=${encodeURIComponent(q)}`;
});

function stat(label, value, detail) {
  return el("div", { class: "card stat" }, [
    el("p", { class: "label", text: label }),
    el("p", { class: "value", text: value }),
    detail && el("p", { class: "tiny muted", text: detail }),
  ]);
}

try {
  const data = await api.bootstrap();
  const s = data.stats;

  const quick = $("#quick-links");
  for (const c of data.commodities.slice(0, 6)) {
    quick.append(el("a", { class: "chip", href: `/compare.html?commodity=${c.id}`, text: c.name }));
  }

  clear(stats).append(
    stat("Markets tracked", String(s.markets), `${s.commodities} commodities`),
    stat("Updated today", String(s.updatesToday), s.lastUpdated ? `Last: ${relativeDay(s.lastUpdated)}` : ""),
    stat(
      "Biggest rise",
      s.biggestIncrease ? formatSignedPercent(s.biggestIncrease.change) : "—",
      s.biggestIncrease ? `${s.biggestIncrease.commodity.name}, ${s.biggestIncrease.market.name}` : "",
    ),
    stat(
      "Biggest fall",
      s.biggestDecrease ? formatSignedPercent(s.biggestDecrease.change) : "—",
      s.biggestDecrease ? `${s.biggestDecrease.commodity.name}, ${s.biggestDecrease.market.name}` : "",
    ),
  );

  const recent = [...data.quotes].sort((a, b) => b.record.date.localeCompare(a.record.date)).slice(0, 6);
  clear(latest);
  if (!recent.length) latest.append(emptyState("No prices recorded yet"));
  recent.forEach((q) => latest.append(priceCard(q)));

  const alerts = $("#alerts");
  data.alerts.slice(0, 4).forEach((a) =>
    alerts.append(
      el("article", { class: "card" }, [
        el("span", { class: `badge badge-${a.severity === "stale" ? "warn" : a.severity === "info" ? "gold" : a.severity}`, text: a.severity.toUpperCase() }),
        el("h3", { text: a.title, style: "margin-top:.5rem" }),
        el("p", { class: "small muted", text: a.detail }),
      ]),
    ),
  );

  const fm = $("#featured-markets");
  data.markets
    .filter((m) => data.featuredMarkets.includes(m.id))
    .forEach((m) => {
      const count = data.quotes.filter((q) => q.market.id === m.id).length;
      fm.append(
        el("a", { class: "card", href: `/market.html?id=${m.id}` }, [
          el("h3", { text: m.name }),
          el("p", { class: "small muted", text: `${m.area} · ${m.openingHours}` }),
          el("p", { class: "small", text: m.description }),
          el("span", { class: "badge badge-gold", text: `${count} prices tracked` }),
        ]),
      );
    });

  const fb = $("#featured-businesses");
  data.businesses
    .filter((b) => data.featuredBusinesses.includes(b.id))
    .forEach((b) =>
      fb.append(
        el("a", { class: "card", href: `/business.html?id=${b.id}` }, [
          el("div", { class: "card-head" }, [el("h3", { text: b.name }), b.verified && el("span", { class: "badge badge-down", text: "✓ Verified" })]),
          el("p", { class: "small muted", text: `${b.category} · ${b.area}` }),
          el("p", { class: "small", text: b.description }),
        ]),
      ),
    );

  const ann = $("#announcements");
  data.announcements.slice(0, 4).forEach((a) =>
    ann.append(
      el("article", { class: "card" }, [
        el("p", { class: "tiny muted", text: `${a.kind.toUpperCase()} · ${formatDate(a.createdAt)}` }),
        el("h3", { text: a.title }),
        el("p", { class: "small", text: a.body }),
      ]),
    ),
  );
  void formatNaira;
} catch (error) {
  clear(stats).append(el("div", { class: "notice notice-error", text: `Could not load market data: ${error.message}` }));
  clear(latest);
  toast(error.message, "error");
}

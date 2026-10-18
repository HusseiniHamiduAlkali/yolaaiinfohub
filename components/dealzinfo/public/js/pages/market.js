import { api } from "../api.js";
import { priceCard } from "../price-card.js";
import { $, clear, directions, downloadCsv, el, emptyState, param, tel } from "../ui.js";

const id = param("id");
const profile = $("#profile");
let quotes = [];

try {
  if (!id) throw new Error("No market selected");
  const data = await api.market(id);
  const m = data.market;
  quotes = data.quotes;
  document.title = `${m.name} prices and opening hours — DealzInfo`;
  profile.append(
    el("div", { class: "hero" }, [
      el("p", { class: "eyebrow", text: m.area }),
      el("h1", { text: m.name }),
      el("p", { text: m.description }),
      el("p", { class: "small", text: `${m.address} · ${m.openingHours}` }),
      el("div", { class: "chip-row" }, [directions(m.lat, m.lng), tel(m.phone)]),
    ]),
  );
  const grid = $("#prices");
  if (!quotes.length) grid.append(emptyState("No prices recorded here yet"));
  quotes.forEach((q) => grid.append(priceCard(q)));
  const nearby = $("#nearby");
  data.nearby.forEach(({ business: b, km }) =>
    nearby.append(el("a", { class: "card", href: `/business.html?id=${b.id}` }, [el("h3", { text: b.name }), el("p", { class: "small muted", text: `${b.category} · ${km.toFixed(1)} km away` })])),
  );
} catch (error) {
  clear(profile).append(el("div", { class: "notice notice-error", text: error.message }));
}

$("#export").addEventListener("click", () =>
  downloadCsv(`dealzinfo-${id}.csv`, quotes.map((q) => ({ commodity: q.commodity.name, price: q.record.price, unit: q.record.unit, date: q.record.date, status: q.record.status }))),
);

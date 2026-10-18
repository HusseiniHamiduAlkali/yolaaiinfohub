import { api } from "../api.js";
import { priceCard } from "../price-card.js";
import { formatNaira, relativeDay } from "../shared/format.js";
import { $, $$, changeBadge, clear, downloadCsv, el, emptyState, fillSelect, param, setParams, skeletons, statusBadge } from "../ui.js";

const PAGE = 12;
const results = $("#results");
let quotes = [];
let view = "cards";
let shown = PAGE;
skeletons(results, 6);

const q = $("#q");
const market = $("#market");
const category = $("#category");
q.value = param("q");

function filtered() {
  const term = q.value.trim().toLowerCase();
  return quotes.filter(
    (x) =>
      (market.value === "all" || x.market.id === market.value) &&
      (category.value === "all" || x.commodity.category === category.value) &&
      (!term || `${x.commodity.name} ${x.market.name} ${x.commodity.category}`.toLowerCase().includes(term)),
  );
}

function render() {
  const rows = filtered();
  setParams({ q: q.value.trim(), market: market.value === "all" ? "" : market.value, category: category.value === "all" ? "" : category.value });
  $("#result-count").textContent = `${rows.length} prices`;
  clear(results);
  results.className = view === "cards" ? "grid grid-3" : "stack";
  if (!rows.length) {
    results.append(emptyState("No prices match your filters", "Try another market or clear the search."));
    $("#more-wrap").hidden = true;
    return;
  }
  const page = rows.slice(0, shown);
  if (view === "cards") page.forEach((x) => results.append(priceCard(x)));
  else {
    const body = el("tbody");
    page.forEach((x) =>
      body.append(
        el("tr", {}, [
          el("td", {}, [el("strong", { text: x.commodity.name })]),
          el("td", { text: x.market.name }),
          el("td", { class: "num", text: `${formatNaira(x.record.price)} / ${x.record.unit}` }),
          el("td", { class: "num" }, [changeBadge(x.change, x.direction)]),
          el("td", { text: relativeDay(x.record.date) }),
          el("td", {}, [statusBadge(x.record.status)]),
        ]),
      ),
    );
    results.append(
      el("div", { class: "table-scroll" }, [
        el("table", {}, [
          el("thead", {}, [el("tr", {}, ["Commodity", "Market", "Price", "Change", "Updated", "Status"].map((h, i) => el("th", { scope: "col", class: i === 2 || i === 3 ? "num" : "", text: h })))]),
          body,
        ]),
      ]),
    );
  }
  $("#more-wrap").hidden = rows.length <= shown;
}

$$("[data-view]").forEach((b) =>
  b.addEventListener("click", () => {
    view = b.dataset.view;
    $$("[data-view]").forEach((x) => x.classList.toggle("active", x === b));
    render();
  }),
);
[q, market, category].forEach((n) => n.addEventListener("input", () => { shown = PAGE; render(); }));
$("#more").addEventListener("click", () => { shown += PAGE; render(); });
$("#export").addEventListener("click", () =>
  downloadCsv(
    "dealzinfo-prices.csv",
    filtered().map((x) => ({ commodity: x.commodity.name, market: x.market.name, unit: x.record.unit, price: x.record.price, change_percent: x.change.toFixed(1), date: x.record.date, status: x.record.status })),
  ),
);

try {
  const data = await api.bootstrap();
  quotes = data.quotes;
  fillSelect(market, data.markets.map((m) => ({ value: m.id, label: m.name })), { placeholder: "All markets", value: param("market") });
  const cats = [...new Set(data.commodities.map((c) => c.category))].sort();
  fillSelect(category, cats.map((c) => ({ value: c, label: c })), { placeholder: "All categories", value: param("category") });
  render();
} catch (error) {
  clear(results).append(el("div", { class: "notice notice-error", text: error.message }));
}

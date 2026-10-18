import { api } from "../api.js";
import { formatNaira, formatPercent, formatSignedPercent } from "../shared/format.js";
import { $, clear, downloadCsv, el, fillSelect, param, setParams } from "../ui.js";

const commodity = $("#commodity");
const market = $("#market");
const range = $("#range");
let chart = null;
let points = [];

function css(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function stat(label, value) {
  return el("div", { class: "card stat" }, [el("p", { class: "label", text: label }), el("p", { class: "value", text: value })]);
}

async function load() {
  setParams({ commodity: commodity.value, market: market.value, days: range.value });
  const data = await api.trends({ commodityId: commodity.value, marketId: market.value, days: range.value });
  points = data.points;
  const s = data.stats;
  const summary = clear($("#summary"));
  if (s) summary.append(stat("Change", formatSignedPercent(s.change)), stat("High", formatNaira(s.high)), stat("Low", formatNaira(s.low)), stat("Volatility", formatPercent(s.volatility)));

  const rows = clear($("#rows"));
  [...points].reverse().forEach((p, i, arr) => {
    const prev = arr[i + 1];
    const ch = prev ? ((p.price - prev.price) / prev.price) * 100 : 0;
    rows.append(el("tr", {}, [el("td", { text: p.label }), el("td", { class: "num", text: formatNaira(p.price) }), el("td", { class: "num", text: prev ? formatSignedPercent(ch) : "—" })]));
  });

  const name = commodity.options[commodity.selectedIndex]?.text ?? "";
  const where = market.value === "all" ? "all markets" : market.options[market.selectedIndex]?.text;
  $("#chart-title").textContent = `${name} — ${where}`;
  $("#chart-note").textContent = `${points.length} data points. Prices are daily averages of recorded quotes.`;

  if (!window.Chart) return;
  chart?.destroy();
  chart = new window.Chart($("#chart"), {
    type: "line",
    data: {
      labels: points.map((p) => p.label),
      datasets: [{ label: "Average price (₦)", data: points.map((p) => p.price), borderColor: css("--primary"), backgroundColor: "transparent", pointBackgroundColor: css("--gold"), tension: 0.3 }],
    },
    options: {
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => formatNaira(c.parsed.y) } } },
      scales: { y: { ticks: { callback: (v) => formatNaira(v, true), color: css("--muted-foreground") } }, x: { ticks: { color: css("--muted-foreground"), maxTicksLimit: 8 } } },
    },
  });
}

[commodity, market, range].forEach((n) => n.addEventListener("change", load));
$("#export").addEventListener("click", () => downloadCsv("dealzinfo-trend.csv", points.map((p) => ({ date: p.date, average_price: p.price }))));

const [commodities, markets] = await Promise.all([api.commodities(), api.markets()]);
fillSelect(commodity, commodities.map((c) => ({ value: c.id, label: c.name })), { value: param("commodity", commodities[0]?.id) });
fillSelect(market, markets.map((m) => ({ value: m.id, label: m.name })), { placeholder: "All markets", value: param("market", "all") });
range.value = param("days", "30");
load();

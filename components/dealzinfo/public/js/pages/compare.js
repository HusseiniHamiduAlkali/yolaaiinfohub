import { api } from "../api.js";
import { formatNaira, formatPercent, relativeDay } from "../shared/format.js";
import { $, changeBadge, clear, downloadCsv, el, fillSelect, param, setParams, statusBadge } from "../ui.js";

const select = $("#commodity");
let current = null;

function stat(label, value, detail) {
  return el("div", { class: "card stat" }, [el("p", { class: "label", text: label }), el("p", { class: "value", text: value }), detail && el("p", { class: "tiny muted", text: detail })]);
}

async function load() {
  setParams({ commodity: select.value });
  const summary = clear($("#summary"));
  const rows = clear($("#rows"));
  const best = clear($("#best"));
  try {
    current = await api.compare(select.value);
    const c = current;
    summary.append(
      stat("Cheapest", formatNaira(c.min), c.cheapest.market.name),
      stat("Highest", formatNaira(c.max), c.priciest.market.name),
      stat("Average", formatNaira(c.average), `${c.rows.length} markets`),
      stat("Spread", formatNaira(c.spread), `${formatPercent(c.spreadPercent)} difference`),
    );
    best.append(
      el("div", { class: "hero" }, [
        el("p", { class: "eyebrow", text: "Best deal today" }),
        el("h2", { text: `${c.cheapest.commodity.name} is cheapest at ${c.cheapest.market.name}` }),
        el("p", { text: `${formatNaira(c.min)} per ${c.cheapest.record.unit} — save up to ${formatNaira(c.spread)} compared with ${c.priciest.market.name}.` }),
      ]),
    );
    c.rows.forEach((r, i) =>
      rows.append(
        el("tr", {}, [
          el("td", {}, [el("a", { href: `/market.html?id=${r.market.id}`, text: r.market.name }), i === 0 && el("span", { class: "badge badge-gold", text: " Best", style: "margin-left:.4rem" })]),
          el("td", { text: r.market.area }),
          el("td", { class: "num", text: `${formatNaira(r.record.price)} / ${r.record.unit}` }),
          el("td", { class: "num" }, [changeBadge(r.change, r.direction)]),
          el("td", { text: relativeDay(r.record.date) }),
          el("td", {}, [statusBadge(r.record.status)]),
        ]),
      ),
    );
  } catch (error) {
    current = null;
    best.append(el("div", { class: "notice", text: error.message }));
  }
}

select.addEventListener("change", load);
$("#export").addEventListener("click", () =>
  downloadCsv("dealzinfo-compare.csv", (current?.rows ?? []).map((r) => ({ market: r.market.name, area: r.market.area, price: r.record.price, unit: r.record.unit, date: r.record.date, status: r.record.status }))),
);

const commodities = await api.commodities();
fillSelect(select, commodities.map((c) => ({ value: c.id, label: c.name })), { value: param("commodity", commodities[0]?.id) });
load();

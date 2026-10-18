import { api } from "../api.js";
import { formatDateTime, formatNaira } from "../shared/format.js";
import { $, clear, downloadCsv, el, fillSelect, statusBadge, toast } from "../ui.js";

const PAGE = 50;
const commodity = $("#commodity");
const market = $("#market");
const status = $("#status");
const rows = $("#rows");
const more = $("#more");
let skip = 0;
let names = { c: {}, m: {} };

function filters() {
  return { commodityId: commodity.value, marketId: market.value, status: status.value };
}

async function load(reset) {
  if (reset) {
    skip = 0;
    clear(rows);
  }
  const data = await api.prices({ ...filters(), limit: PAGE, skip });
  data.items.forEach((p) =>
    rows.append(
      el("tr", {}, [
        el("td", { class: "nowrap", text: formatDateTime(p.date) }),
        el("td", { text: names.c[p.commodityId] ?? p.commodityId }),
        el("td", { text: names.m[p.marketId] ?? p.marketId }),
        el("td", { class: "num", text: `${formatNaira(p.price)} / ${p.unit}` }),
        el("td", { class: "small", text: `${p.source} — ${p.submittedBy}` }),
        el("td", {}, [statusBadge(p.status)]),
      ]),
    ),
  );
  skip += data.items.length;
  $("#count").textContent = `Showing ${skip} of ${data.total} records`;
  more.hidden = skip >= data.total;
}

[commodity, market, status].forEach((n) => n.addEventListener("change", () => load(true)));
more.addEventListener("click", () => load(false));
$("#export").addEventListener("click", async () => {
  try {
    const data = await api.prices({ ...filters(), limit: 2000, skip: 0 });
    downloadCsv("dealzinfo-history.csv", data.items.map((p) => ({ date: p.date, commodity: names.c[p.commodityId], market: names.m[p.marketId], price: p.price, unit: p.unit, source: p.source, submitted_by: p.submittedBy, status: p.status })));
  } catch (error) {
    toast(error.message, "error");
  }
});

const [cs, ms] = await Promise.all([api.commodities(), api.markets()]);
names = { c: Object.fromEntries(cs.map((c) => [c.id, c.name])), m: Object.fromEntries(ms.map((m) => [m.id, m.name])) };
fillSelect(commodity, cs.map((c) => ({ value: c.id, label: c.name })), { placeholder: "All commodities" });
fillSelect(market, ms.map((m) => ({ value: m.id, label: m.name })), { placeholder: "All markets" });
load(true);

import { api } from "../api.js";
import { getWatchlist, pairKey, toggleWatch } from "../local.js";
import { priceCard } from "../price-card.js";
import { formatNaira } from "../shared/format.js";
import { $, clear, el, emptyState } from "../ui.js";

let data = null;

function render() {
  const w = getWatchlist();
  const pairs = data.quotes.filter((q) => w.pairs.includes(pairKey(q.commodity.id, q.market.id)));
  const businesses = data.businesses.filter((b) => w.businesses.includes(b.id));
  const rising = pairs.filter((q) => q.direction === "up").length;
  const avg = pairs.length ? pairs.reduce((a, q) => a + q.record.price, 0) / pairs.length : 0;

  const stat = (l, v) => el("div", { class: "card stat" }, [el("p", { class: "label", text: l }), el("p", { class: "value", text: v })]);
  clear($("#summary")).append(stat("Prices followed", String(pairs.length)), stat("Rising", String(rising)), stat("Average price", pairs.length ? formatNaira(avg) : "—"), stat("Businesses", String(businesses.length)));

  const pBox = clear($("#pairs"));
  if (!pairs.length) pBox.append(emptyState("You are not following any prices yet", "Tap “Follow” on any price card."));
  pairs.forEach((q) => pBox.append(priceCard(q, { onWatchChange: render })));

  const bBox = clear($("#businesses"));
  if (!businesses.length) bBox.append(emptyState("No businesses followed yet"));
  businesses.forEach((b) =>
    bBox.append(
      el("article", { class: "card stack" }, [
        el("h3", {}, [el("a", { href: `/business.html?id=${b.id}`, text: b.name })]),
        el("p", { class: "small muted", text: `${b.category} · ${b.area}` }),
        el("button", { class: "button button-outline button-sm", type: "button", text: "Remove", onclick: () => { toggleWatch("businesses", b.id); render(); } }),
      ]),
    ),
  );
}

try {
  data = await api.bootstrap();
  render();
} catch (error) {
  $("#pairs").append(el("div", { class: "notice notice-error", text: error.message }));
}

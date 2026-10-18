// Shared price card used on the overview, prices, market and watchlist pages.

import { isWatched, pairKey, toggleWatch } from "./local.js";
import { formatNaira, relativeDay } from "./shared/format.js";
import { changeBadge, el, statusBadge, toast } from "./ui.js";

export function priceCard(quote, { compact = false, onWatchChange } = {}) {
  const key = pairKey(quote.commodity.id, quote.market.id);
  const watchButton = el("button", {
    class: "button button-outline button-sm",
    type: "button",
    "aria-pressed": String(isWatched("pairs", key)),
    text: isWatched("pairs", key) ? "★ Following" : "☆ Follow",
    onclick: () => {
      const added = toggleWatch("pairs", key);
      watchButton.textContent = added ? "★ Following" : "☆ Follow";
      watchButton.setAttribute("aria-pressed", String(added));
      toast(added ? `Following ${quote.commodity.name} at ${quote.market.name}` : "Removed from your watchlist");
      onWatchChange?.(added);
    },
  });

  return el("article", { class: "card card-interactive" }, [
    el("div", { class: "card-head" }, [
      el("div", {}, [
        el("h3", { text: quote.commodity.name }),
        el("p", { class: "small muted", text: `${quote.market.name} · ${quote.market.area}` }),
      ]),
      changeBadge(quote.change, quote.direction),
    ]),
    el("div", { class: "row row-between" }, [
      el("div", {}, [
        el("p", { class: "price", text: formatNaira(quote.record.price) }),
        el("p", { class: "tiny muted", text: `per ${quote.record.unit}` }),
      ]),
      !compact &&
        el("div", { class: "chip-row" }, [
          statusBadge(quote.record.status),
          quote.staleDays >= 3 && el("span", { class: "badge badge-warn", text: `${quote.staleDays} days old` }),
        ]),
    ]),
    el("div", { class: "hairline" }),
    el("div", { class: "row row-between" }, [
      el("p", { class: "tiny muted", text: `Updated ${relativeDay(quote.record.date)}` }),
      el("div", { class: "chip-row" }, [
        watchButton,
        el("a", {
          class: "button button-outline button-sm",
          href: `/trends.html?commodity=${quote.commodity.id}&market=${quote.market.id}`,
          text: "Trend",
        }),
      ]),
    ]),
  ]);
}

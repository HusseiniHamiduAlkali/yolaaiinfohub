import { api } from "../api.js";
import { isWatched, toggleWatch } from "../local.js";
import { $, clear, directions, el, emptyState, param, setParams, skeletons } from "../ui.js";

const results = $("#results");
const q = $("#q");
q.value = param("q");
skeletons(results, 4);
let data = null;

function render() {
  const term = q.value.trim().toLowerCase();
  setParams({ q: q.value.trim() });
  const list = data.markets.filter((m) => !term || `${m.name} ${m.area} ${m.categories.join(" ")} ${m.description}`.toLowerCase().includes(term));
  clear(results);
  if (!list.length) return results.append(emptyState("No markets match your search"));
  for (const m of list) {
    const count = data.quotes.filter((x) => x.market.id === m.id).length;
    const follow = el("button", {
      class: "button button-outline button-sm",
      type: "button",
      text: isWatched("markets", m.id) ? "★ Following" : "☆ Follow",
      onclick: () => (follow.textContent = toggleWatch("markets", m.id) ? "★ Following" : "☆ Follow"),
    });
    results.append(
      el("article", { class: "card stack" }, [
        el("div", { class: "card-head" }, [el("div", {}, [el("h2", { text: m.name }), el("p", { class: "small muted", text: `${m.area} · ${m.address}` })]), el("span", { class: "badge badge-gold", text: `${count} prices` })]),
        el("p", { class: "small", text: m.description }),
        el("p", { class: "small" }, [el("strong", { text: "Hours: " }), m.openingHours]),
        el("div", { class: "chip-row" }, m.categories.map((c) => el("span", { class: "badge", text: c }))),
        el("div", { class: "chip-row" }, [el("a", { class: "button button-sm", href: `/market.html?id=${m.id}`, text: "View prices" }), directions(m.lat, m.lng), follow]),
      ]),
    );
  }
  return undefined;
}

q.addEventListener("input", render);
try {
  data = await api.bootstrap();
  render();
} catch (error) {
  clear(results).append(el("div", { class: "notice notice-error", text: error.message }));
}

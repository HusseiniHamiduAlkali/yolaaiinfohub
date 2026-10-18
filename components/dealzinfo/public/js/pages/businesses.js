import { api } from "../api.js";
import { $, clear, el, emptyState, fillSelect, param, setParams, skeletons, tel, whatsapp } from "../ui.js";

const results = $("#results");
const q = $("#q");
const category = $("#category");
const area = $("#area");
q.value = param("q");
skeletons(results, 6);
let list = [];

function render() {
  const term = q.value.trim().toLowerCase();
  setParams({ q: q.value.trim() });
  const rows = list.filter(
    (b) =>
      (category.value === "all" || b.category === category.value) &&
      (area.value === "all" || b.area === area.value) &&
      (!term || `${b.name} ${b.category} ${b.description} ${b.products.join(" ")}`.toLowerCase().includes(term)),
  );
  $("#result-count").textContent = `${rows.length} businesses`;
  clear(results);
  if (!rows.length) return results.append(emptyState("No businesses match", "Try a different category or area."));
  rows.forEach((b) =>
    results.append(
      el("article", { class: "card stack" }, [
        el("div", { class: "card-head" }, [el("h3", {}, [el("a", { href: `/business.html?id=${b.id}`, text: b.name })]), b.verified && el("span", { class: "badge badge-down", text: "✓ Verified" })]),
        el("p", { class: "small muted", text: `${b.category} · ${b.area}` }),
        el("p", { class: "small", text: b.description }),
        el("div", { class: "chip-row" }, [tel(b.phone), whatsapp(b.whatsapp)]),
      ]),
    ),
  );
  return undefined;
}

[q, category, area].forEach((n) => n.addEventListener("input", render));
try {
  list = await api.businesses();
  fillSelect(category, [...new Set(list.map((b) => b.category))].sort().map((c) => ({ value: c, label: c })), { placeholder: "All categories" });
  fillSelect(area, [...new Set(list.map((b) => b.area))].sort().map((c) => ({ value: c, label: c })), { placeholder: "All areas" });
  render();
} catch (error) {
  clear(results).append(el("div", { class: "notice notice-error", text: error.message }));
}

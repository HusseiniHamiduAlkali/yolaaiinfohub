import { api } from "../api.js";
import { isWatched, toggleWatch } from "../local.js";
import { $, clear, directions, el, param, tel, whatsapp } from "../ui.js";

const profile = $("#profile");
try {
  const id = param("id");
  if (!id) throw new Error("No business selected");
  const { business: b, nearby } = await api.business(id);
  document.title = `${b.name} — ${b.category} in ${b.area} — DealzInfo`;
  const follow = el("button", {
    class: "button button-gold button-sm",
    type: "button",
    text: isWatched("businesses", b.id) ? "★ Following" : "☆ Follow",
    onclick: () => (follow.textContent = toggleWatch("businesses", b.id) ? "★ Following" : "☆ Follow"),
  });
  profile.append(
    el("div", { class: "hero" }, [
      el("p", { class: "eyebrow", text: `${b.category} · ${b.area}` }),
      el("h1", { text: b.name }),
      el("p", { text: b.description }),
      b.verified && el("span", { class: "badge badge-gold", text: "✓ Verified by DealzInfo" }),
    ]),
    el("div", { class: "grid grid-2" }, [
      el("div", { class: "card stack" }, [
        el("h2", { text: "Contact & hours" }),
        el("p", { class: "small", text: b.address || "Address not provided" }),
        el("p", { class: "small", text: b.openingHours }),
        el("div", { class: "chip-row" }, [tel(b.phone), whatsapp(b.whatsapp), directions(b.lat, b.lng), follow]),
      ]),
      el("div", { class: "card stack" }, [el("h2", { text: "Products & services" }), el("div", { class: "chip-row" }, b.products.map((p) => el("span", { class: "badge", text: p })))]),
    ]),
  );
  const box = $("#nearby");
  nearby.forEach(({ market: m, km }) => box.append(el("a", { class: "card", href: `/market.html?id=${m.id}` }, [el("h3", { text: m.name }), el("p", { class: "small muted", text: `${km.toFixed(1)} km away · ${m.openingHours}` })])));
} catch (error) {
  clear(profile).append(el("div", { class: "notice notice-error", text: error.message }));
}

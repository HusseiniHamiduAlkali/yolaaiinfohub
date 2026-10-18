import { api } from "../api.js";
import { getAlertPrefs, getWatchlist, saveAlertPrefs } from "../local.js";
import { relativeDay } from "../shared/format.js";
import { $, clear, el, emptyState, toast } from "../ui.js";

let alerts = [];
const form = $("#prefs");

const toggles = [
  ["inApp", "Show alerts on this site"],
  ["email", "Email me (coming soon)"],
  ["sms", "SMS (coming soon)"],
  ["whatsapp", "WhatsApp (coming soon)"],
  ["bigMoves", "Big price moves"],
  ["newUpdates", "New price updates"],
  ["staleData", "Markets with outdated prices"],
  ["watchlistOnly", "Only items on my watchlist"],
];

function buildForm() {
  const prefs = getAlertPrefs();
  clear(form);
  const grid = el("div", { class: "grid grid-2" });
  for (const [key, label] of toggles) {
    const id = `pref-${key}`;
    grid.append(el("div", { class: "row" }, [el("input", { type: "checkbox", id, name: key, checked: prefs[key] }), el("label", { for: id, text: label, style: "margin:0;color:inherit" })]));
  }
  form.append(
    grid,
    el("div", { class: "grid grid-2" }, [
      el("div", {}, [el("label", { for: "emailAddress", text: "Email address" }), el("input", { type: "email", id: "emailAddress", name: "emailAddress", value: prefs.emailAddress })]),
      el("div", {}, [el("label", { for: "phone", text: "Phone / WhatsApp" }), el("input", { type: "tel", id: "phone", name: "phone", value: prefs.phone })]),
    ]),
    el("p", { class: "tiny muted", text: "Preferences are saved on this device only." }),
    el("div", {}, [el("button", { class: "button", type: "submit", text: "Save preferences" })]),
  );
}

function render() {
  const prefs = getAlertPrefs();
  const w = getWatchlist();
  const box = clear($("#alerts"));
  const list = alerts.filter((a) => {
    if ((a.severity === "up" || a.severity === "down") && !prefs.bigMoves) return false;
    if (a.severity === "info" && !prefs.newUpdates) return false;
    if (a.severity === "stale" && !prefs.staleData) return false;
    if (prefs.watchlistOnly && a.commodityId && !w.pairs.includes(`${a.commodityId}:${a.marketId}`) && !w.commodities.includes(a.commodityId)) return false;
    return true;
  });
  if (!prefs.inApp) return box.append(emptyState("On-site alerts are switched off"));
  if (!list.length) return box.append(emptyState("No alerts right now"));
  list.forEach((a) =>
    box.append(
      el("article", { class: "card stack" }, [
        el("div", { class: "row row-between" }, [el("span", { class: `badge badge-${a.severity === "stale" ? "warn" : a.severity === "info" ? "gold" : a.severity}`, text: a.severity.toUpperCase() }), el("span", { class: "tiny muted", text: relativeDay(a.createdAt) })]),
        el("h3", { text: a.title }),
        el("p", { class: "small muted", text: a.detail }),
        a.commodityId && el("a", { class: "button button-outline button-sm", href: `/compare.html?commodity=${a.commodityId}`, text: "Compare markets" }),
      ]),
    ),
  );
  return undefined;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const fd = new FormData(form);
  const patch = {};
  for (const [key] of toggles) patch[key] = fd.has(key);
  patch.emailAddress = String(fd.get("emailAddress") ?? "");
  patch.phone = String(fd.get("phone") ?? "");
  saveAlertPrefs(patch);
  toast("Alert preferences saved");
  render();
});

buildForm();
try {
  alerts = (await api.bootstrap()).alerts;
  render();
} catch (error) {
  $("#alerts").append(el("div", { class: "notice notice-error", text: error.message }));
}

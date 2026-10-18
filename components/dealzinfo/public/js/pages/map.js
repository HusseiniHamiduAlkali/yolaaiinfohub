import { api } from "../api.js";
import { haversineKm } from "../shared/analytics.js";
import { $, clear, directions, el, escapeHtml } from "../ui.js";

const L = window.L;
const YOLA = [9.2094, 12.4818];
const status = $("#status");

function pin(color) {
  return L.divIcon({ className: "dealz-pin", html: `<span style="background:${color}"></span>`, iconSize: [22, 22], iconAnchor: [11, 11] });
}

const map = L.map("map", { scrollWheelZoom: true }).setView(YOLA, 11);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

const marketLayer = L.layerGroup().addTo(map);
const businessLayer = L.layerGroup().addTo(map);
let markets = [];

function renderNearest(origin) {
  const box = clear($("#nearest"));
  markets
    .map((m) => ({ m, km: haversineKm(origin, m) }))
    .sort((a, b) => a.km - b.km)
    .slice(0, 3)
    .forEach(({ m, km }) =>
      box.append(el("article", { class: "card stack" }, [el("h3", { text: m.name }), el("p", { class: "small muted", text: `${km.toFixed(1)} km · ${m.openingHours}` }), el("div", { class: "chip-row" }, [el("a", { class: "button button-sm", href: `/market.html?id=${m.id}`, text: "Prices" }), directions(m.lat, m.lng)])])),
    );
}

try {
  const [m, b] = await Promise.all([api.markets(), api.businesses()]);
  markets = m;
  m.forEach((x) =>
    L.marker([x.lat, x.lng], { icon: pin("oklch(0.42 0.11 158)"), title: x.name })
      .bindPopup(`<strong>${escapeHtml(x.name)}</strong><br>${escapeHtml(x.area)} · ${escapeHtml(x.openingHours)}<br><a href="market.html?id=${encodeURIComponent(x.id)}">View prices</a>`)
      .addTo(marketLayer),
  );
  b.forEach((x) =>
    L.marker([x.lat, x.lng], { icon: pin("oklch(0.76 0.13 85)"), title: x.name })
      .bindPopup(`<strong>${escapeHtml(x.name)}</strong><br>${escapeHtml(x.category)} · ${escapeHtml(x.area)}<br><a href="business.html?id=${encodeURIComponent(x.id)}">View listing</a>`)
      .addTo(businessLayer),
  );
  renderNearest({ lat: YOLA[0], lng: YOLA[1] });
  status.textContent = "Showing distances from central Yola. Use “Find nearest to me” for your location.";
} catch (error) {
  status.textContent = `Could not load map data: ${error.message}`;
}

function layerToggle(button, layer) {
  button.addEventListener("click", () => {
    const on = button.getAttribute("aria-pressed") !== "true";
    button.setAttribute("aria-pressed", String(on));
    button.classList.toggle("active", on);
    if (on) layer.addTo(map);
    else map.removeLayer(layer);
  });
}
layerToggle($("#toggle-markets"), marketLayer);
layerToggle($("#toggle-businesses"), businessLayer);

$("#locate").addEventListener("click", () => {
  if (!navigator.geolocation) {
    status.textContent = "Your browser does not support location.";
    return;
  }
  status.textContent = "Finding your location…";
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      L.circleMarker([here.lat, here.lng], { radius: 8, color: "#2563eb" }).addTo(map).bindPopup("You are here");
      map.setView([here.lat, here.lng], 12);
      renderNearest(here);
      status.textContent = "Showing markets closest to you.";
    },
    (err) => {
      status.textContent = err.code === 1 ? "Location permission was denied. Distances are from central Yola." : "Could not get your location. Distances are from central Yola.";
    },
    { enableHighAccuracy: false, timeout: 10000 },
  );
});

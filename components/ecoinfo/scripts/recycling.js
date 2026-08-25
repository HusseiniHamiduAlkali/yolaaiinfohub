/* Recycling centre directory with map, material filter and distance sorting. */

import { $, $$, autoInit, escapeHtml, haversineKm, loadJSON, toast } from "./ui.js";

autoInit();

const YOLA = { lat: 9.2035, lon: 12.4954 };
let centres = [];
let user = null;
let map = null;
let layer = null;
let material = new URLSearchParams(location.search).get("material") || "";

function initMap() {
  if (typeof L === "undefined") return;
  map = L.map("map").setView([YOLA.lat, YOLA.lon], 12);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "© OpenStreetMap contributors",
  }).addTo(map);
  layer = L.layerGroup().addTo(map);
}

function matches(c) {
  if (!material) return true;
  const m = material.toLowerCase();
  return c.materials.some((x) => x.includes(m) || m.includes(x)) || c.type.toLowerCase().includes(m);
}

function list() {
  const origin = user || YOLA;
  return centres
    .filter(matches)
    .map((c) => ({ ...c, distance: haversineKm(origin, { lat: c.lat, lon: c.lon }) }))
    .sort((a, b) => a.distance - b.distance);
}

function render() {
  const rows = list();
  $("#count").textContent = `${rows.length} centre${rows.length === 1 ? "" : "s"}${material ? ` accepting “${material}”` : ""}`;
  $("#centres").innerHTML = rows.length
    ? rows
        .map(
          (c) => `<article class="card card-hover" style="padding:22px">
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start">
          <h3 style="margin:0">${escapeHtml(c.name)}</h3>
          <span class="pill ${c.pays ? "pill-gold" : ""}">${c.pays ? "Pays for waste" : "Free drop-off"}</span>
        </div>
        <p class="small muted" style="margin:.35rem 0">${escapeHtml(c.type)} · ${c.distance.toFixed(1)} km away</p>
        <p style="margin:.4rem 0">${escapeHtml(c.address)}</p>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin:.5rem 0">
          ${c.materials.map((m) => `<span class="pill">${escapeHtml(m)}</span>`).join("")}
        </div>
        <p class="small muted" style="margin:.3rem 0">🕒 ${escapeHtml(c.hours)}</p>
        <p class="small" style="margin:.3rem 0">${escapeHtml(c.notes)}</p>
        <div class="hero-actions" style="margin-top:12px">
          <a class="btn btn-emerald btn-sm" href="https://www.openstreetmap.org/?mlat=${c.lat}&mlon=${c.lon}#map=16/${c.lat}/${c.lon}" target="_blank" rel="noopener">Directions</a>
          <a class="btn btn-ghost btn-sm" href="tel:${escapeHtml(c.phone.replace(/\s/g, ""))}">Call</a>
        </div>
      </article>`,
        )
        .join("")
    : '<p class="muted">No centre matches that material yet. Try “all materials”, or report the gap on the community page.</p>';

  if (map && layer) {
    layer.clearLayers();
    rows.forEach((c) =>
      L.marker([c.lat, c.lon])
        .addTo(layer)
        .bindPopup(`<strong>${escapeHtml(c.name)}</strong><br>${escapeHtml(c.type)}<br>${escapeHtml(c.hours)}`),
    );
    if (user) L.circleMarker([user.lat, user.lon], { radius: 8, color: "#c9a84c" }).addTo(layer).bindPopup("You are here");
    if (rows.length) map.fitBounds(rows.map((c) => [c.lat, c.lon]), { padding: [40, 40], maxZoom: 14 });
  }
}

function renderFilters() {
  const materials = [...new Set(centres.flatMap((c) => c.materials))].sort();
  $("#filters").innerHTML =
    `<button class="pill ${material ? "" : "pill-gold"}" data-m="">All materials</button>` +
    materials.map((m) => `<button class="pill ${material === m ? "pill-gold" : ""}" data-m="${escapeHtml(m)}">${escapeHtml(m)}</button>`).join("");
  $$("#filters button").forEach((b) =>
    b.addEventListener("click", () => {
      material = b.dataset.m;
      renderFilters();
      render();
    }),
  );
}

$("#locate")?.addEventListener("click", () => {
  if (!navigator.geolocation) return toast("Geolocation not supported.", "err");
  navigator.geolocation.getCurrentPosition(
    (p) => {
      user = { lat: p.coords.latitude, lon: p.coords.longitude };
      toast("Sorted by distance from you.");
      render();
    },
    () => toast("Could not read your location.", "err"),
    { enableHighAccuracy: true, timeout: 10000 },
  );
});

initMap();
loadJSON("data/recycling-centres.json")
  .then((data) => {
    centres = data;
    renderFilters();
    render();
  })
  .catch(() => toast("Could not load the centre directory.", "err"));

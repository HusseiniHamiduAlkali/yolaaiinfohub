/* Recycling centre directory with map, material filter and distance sorting. */

import { $, $$, autoInit, escapeHtml, haversineKm, loadJSON, toast } from "./ui.js";

autoInit();

const YOLA = { lat: 9.2035, lon: 12.4954 };
let centres = [];
let user = null;
let map = null;
let markers = [];
let material = new URLSearchParams(location.search).get("material") || "";

async function initMap() {
  try {
    await window.YolaGoogleMaps.load();
    map = new google.maps.Map(document.getElementById("map"), {
      center: { lat: YOLA.lat, lng: YOLA.lon },
      zoom: 12,
      mapTypeControl: true,
      fullscreenControl: true,
      streetViewControl: true,
    });
    render();
  } catch (error) {
    toast(error.message || "Google Maps is unavailable.", "err");
  }
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
          <a class="btn btn-emerald btn-sm" href="https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lon}" target="_blank" rel="noopener">Directions</a>
          <a class="btn btn-ghost btn-sm" href="tel:${escapeHtml(c.phone.replace(/\s/g, ""))}">Call</a>
        </div>
      </article>`,
        )
        .join("")
    : '<p class="muted">No centre matches that material yet. Try “all materials”, or report the gap on the community page.</p>';

  if (map) {
    markers.forEach((marker) => marker.setMap(null));
    markers = [];
    rows.forEach((c) =>
      markers.push(new google.maps.Marker({
        map,
        position: { lat: c.lat, lng: c.lon },
        title: c.name,
      })),
    );
    if (user) markers.push(new google.maps.Marker({
      map,
      position: { lat: user.lat, lng: user.lon },
      title: "You are here",
      icon: { path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: "#c9a84c", fillOpacity: 1, strokeColor: "#ffffff", strokeWeight: 2 },
    }));
    if (rows.length) {
      const bounds = new google.maps.LatLngBounds();
      rows.forEach((c) => bounds.extend({ lat: c.lat, lng: c.lon }));
      if (user) bounds.extend({ lat: user.lat, lng: user.lon });
      map.fitBounds(bounds, 40);
    }
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

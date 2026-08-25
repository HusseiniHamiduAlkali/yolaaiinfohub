/* Illegal dumping report: evidence photos, GPS/map location, tracking code. */

import { $, $$, autoInit, compressImage, escapeHtml, fmtDate, store, timeAgo, toast } from "./ui.js";
import { api } from "./api.js";

autoInit();

const YOLA = { lat: 9.2035, lon: 12.4954 };
let photos = [];
let marker = null;
let map = null;
let coords = null;

/* ---------------- map ---------------- */

function initMap() {
  if (typeof L === "undefined") {
    $("#map").innerHTML =
      '<div style="padding:20px" class="muted small">Map library unavailable offline — enter the location description and coordinates manually.</div>';
    return;
  }
  map = L.map("map").setView([YOLA.lat, YOLA.lon], 12);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "© OpenStreetMap contributors",
  }).addTo(map);
  map.on("click", (e) => setCoords(e.latlng.lat, e.latlng.lng));
}

function setCoords(lat, lon) {
  coords = { lat: Number(lat.toFixed(6)), lon: Number(lon.toFixed(6)) };
  $("#lat").value = coords.lat;
  $("#lon").value = coords.lon;
  $("#coord-readout").textContent = `${coords.lat}, ${coords.lon}`;
  if (map) {
    if (marker) marker.setLatLng([lat, lon]);
    else marker = L.marker([lat, lon], { draggable: true }).addTo(map).on("dragend", (e) => {
      const p = e.target.getLatLng();
      setCoords(p.lat, p.lng);
    });
    map.panTo([lat, lon]);
  }
}

$("#locate")?.addEventListener("click", () => {
  if (!navigator.geolocation) return toast("Geolocation is not supported on this device.", "err");
  $("#locate").disabled = true;
  $("#locate").textContent = "Locating…";
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      setCoords(pos.coords.latitude, pos.coords.longitude);
      if (map) map.setView([pos.coords.latitude, pos.coords.longitude], 16);
      toast("Location captured.");
      $("#locate").disabled = false;
      $("#locate").textContent = "Use my location";
    },
    (err) => {
      toast(`Could not get location: ${err.message}`, "err");
      $("#locate").disabled = false;
      $("#locate").textContent = "Use my location";
    },
    { enableHighAccuracy: true, timeout: 12000 },
  );
});

initMap();

/* ---------------- photos ---------------- */

const dz = $("#dropzone");
const fileInput = $("#evidence");
dz?.addEventListener("click", () => fileInput.click());
dz?.addEventListener("dragover", (e) => { e.preventDefault(); dz.classList.add("dragover"); });
dz?.addEventListener("dragleave", () => dz.classList.remove("dragover"));
dz?.addEventListener("drop", (e) => { e.preventDefault(); dz.classList.remove("dragover"); addFiles(e.dataTransfer.files); });
fileInput?.addEventListener("change", (e) => addFiles(e.target.files));

async function addFiles(list) {
  const files = [...list].filter((f) => f.type.startsWith("image/")).slice(0, 4 - photos.length);
  for (const f of files) {
    try {
      photos.push({ name: f.name, dataUrl: await compressImage(f, 1280, 0.8) });
    } catch { toast(`Could not read ${f.name}`, "err"); }
  }
  renderThumbs();
}

function renderThumbs() {
  $("#thumbs").innerHTML = photos
    .map((p, i) => `<div class="thumb"><img src="${p.dataUrl}" alt="${escapeHtml(p.name)}"><button type="button" data-i="${i}" aria-label="Remove">×</button></div>`)
    .join("");
  $$("#thumbs button").forEach((b) =>
    b.addEventListener("click", () => { photos.splice(Number(b.dataset.i), 1); renderThumbs(); }),
  );
}

/* ---------------- validation + submit ---------------- */

function setError(id, message) {
  const node = $(`#err-${id}`);
  const input = $(`#${id}`);
  if (node) node.textContent = message || "";
  if (input) input.setAttribute("aria-invalid", message ? "true" : "false");
  return !message;
}

function makeCode() {
  const rnd = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `YEC-${new Date().getFullYear()}-${rnd}`;
}

$("#report-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = {
    wasteType: $("#wasteType").value,
    severity: ($$('input[name="severity"]:checked')[0] || {}).value || "medium",
    landmark: $("#landmark").value.trim(),
    ward: $("#ward").value,
    description: $("#description").value.trim(),
    reporterName: $("#name").value.trim(),
    reporterPhone: $("#phone").value.trim(),
    anonymous: $("#anonymous").checked,
    lat: coords?.lat ?? null,
    lon: coords?.lon ?? null,
    occurredAt: $("#occurred").value || new Date().toISOString().slice(0, 16),
  };

  let ok = true;
  ok = setError("wasteType", payload.wasteType ? "" : "Choose the type of waste.") && ok;
  ok = setError("landmark", payload.landmark.length >= 4 ? "" : "Give a landmark so the crew can find it.") && ok;
  ok = setError("description", payload.description.length >= 15 ? "" : "Describe the dump in at least 15 characters.") && ok;
  ok = setError("phone", !payload.reporterPhone || /^[0-9+\s-]{7,15}$/.test(payload.reporterPhone) ? "" : "Enter a valid phone number.") && ok;
  if (!$("#consent").checked) { toast("Please confirm the report is accurate.", "err"); ok = false; }
  if (!ok) { toast("Please fix the highlighted fields.", "err"); return; }

  const btn = $("#submit-btn");
  btn.disabled = true;
  btn.textContent = "Submitting…";

  const fd = new FormData();
  Object.entries(payload).forEach(([k, v]) => fd.append(k, v ?? ""));
  photos.forEach((p, i) => fd.append(`photo${i}`, p.dataUrl));

  let saved;
  try {
    saved = await api.createReport(fd);
  } catch (err) {
    saved = { ...payload, code: makeCode(), status: "queued", createdAt: new Date().toISOString(), photos: photos.map((p) => p.dataUrl), offline: true };
    const queue = store.get("report-queue", []);
    queue.unshift(saved);
    store.set("report-queue", queue);
    toast(err.offline ? "Saved on this device — it will be sent when the service is reachable." : err.message, "err");
  }

  const mine = store.get("my-reports", []);
  mine.unshift({ code: saved.code, createdAt: saved.createdAt || new Date().toISOString(), wasteType: payload.wasteType, landmark: payload.landmark, status: saved.status || "submitted" });
  store.set("my-reports", mine.slice(0, 25));

  renderSuccess(saved, payload);
  renderMine();
  btn.disabled = false;
  btn.textContent = "Submit report";
});

function renderSuccess(saved, payload) {
  $("#form-card").classList.add("hidden");
  $("#success").classList.remove("hidden");
  $("#success").innerHTML = `
    <div class="card" style="padding:30px">
      <div class="icon-badge" style="font-size:1.4rem"><i class="fas fa-circle-check" aria-hidden="true"></i></div>
      <h2 style="margin:.4rem 0">Report received — thank you</h2>
      <p>Your tracking code is</p>
      <p class="stat-value" style="letter-spacing:.06em">${escapeHtml(saved.code)}</p>
      <p class="muted small">Save this code. You can check progress any time on this page.</p>
      <ul class="timeline" style="margin-top:22px">
        <li class="done"><div class="t-title">Submitted</div><div class="t-meta">${fmtDate(saved.createdAt || Date.now())}</div></li>
        <li class="current"><div class="t-title">Under review</div><div class="t-meta">An officer verifies the location and evidence</div></li>
        <li><div class="t-title">Crew assigned</div><div class="t-meta">Clean-up scheduled for the ward</div></li>
        <li><div class="t-title">Resolved</div><div class="t-meta">Site cleared and photographed</div></li>
      </ul>
      <div class="hero-actions">
        <button class="btn btn-gold" id="another">Submit another report</button>
        <a class="btn btn-ghost" href="index.html">Back to dashboard</a>
      </div>
      ${saved.offline ? '<p class="help">Stored offline on this device. Reconnect and reopen this page to sync.</p>' : ""}
      <p class="help">Summary: ${escapeHtml(payload.wasteType)} · ${escapeHtml(payload.severity)} severity · ${escapeHtml(payload.landmark)}</p>
    </div>`;
  $("#another").addEventListener("click", () => {
    photos = [];
    coords = null;
    renderThumbs();
    $("#report-form").reset();
    $("#coord-readout").textContent = "not set";
    $("#success").classList.add("hidden");
    $("#form-card").classList.remove("hidden");
    window.scrollTo({ top: $("#form-card").offsetTop - 80, behavior: "smooth" });
  });
}

/* ---------------- my reports + tracking ---------------- */

function renderMine() {
  const mine = store.get("my-reports", []);
  const wrap = $("#my-reports");
  if (!wrap) return;
  wrap.innerHTML = mine.length
    ? mine
        .map(
          (r) => `<div class="card" style="padding:14px 16px;display:flex;justify-content:space-between;gap:14px;align-items:center;flex-wrap:wrap">
            <div>
              <strong>${escapeHtml(r.code)}</strong>
              <div class="small muted">${escapeHtml(r.wasteType)} · ${escapeHtml(r.landmark)} · ${timeAgo(r.createdAt)}</div>
            </div>
            <button class="btn btn-ghost btn-sm" data-code="${escapeHtml(r.code)}">Track</button>
          </div>`,
        )
        .join("")
    : '<p class="muted small">Reports you submit on this device will be listed here.</p>';
  $$("#my-reports button").forEach((b) =>
    b.addEventListener("click", () => {
      $("#track-code").value = b.dataset.code;
      track(b.dataset.code);
    }),
  );
}
renderMine();

$("#track-form")?.addEventListener("submit", (e) => {
  e.preventDefault();
  track($("#track-code").value.trim().toUpperCase());
});

async function track(code) {
  if (!code) return;
  const out = $("#track-result");
  out.innerHTML = '<div class="skeleton" style="height:60px"></div>';
  try {
    const r = await api.trackReport(code);
    const steps = ["submitted", "reviewing", "assigned", "resolved"];
    const idx = Math.max(0, steps.indexOf(r.status));
    out.innerHTML = `<div class="card" style="padding:20px">
      <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px">
        <strong>${escapeHtml(r.code)}</strong>
        <span class="pill ${r.status === "resolved" ? "pill-good" : "pill-fair"}">${escapeHtml(r.status)}</span>
      </div>
      <p class="small muted">${escapeHtml(r.wasteType || "")} · ${escapeHtml(r.landmark || "")}</p>
      <ul class="timeline">${steps
        .map((s, i) => `<li class="${i < idx ? "done" : i === idx ? "current" : ""}"><div class="t-title">${s}</div></li>`)
        .join("")}</ul>
      ${r.officerNote ? `<p><strong>Officer note:</strong> ${escapeHtml(r.officerNote)}</p>` : ""}
    </div>`;
  } catch (err) {
    const local = store.get("my-reports", []).find((r) => r.code === code);
    out.innerHTML = local
      ? `<div class="banner banner-info"><span>📄</span><span>${escapeHtml(code)} is stored on this device with status <strong>${escapeHtml(local.status)}</strong>. Live tracking needs the EcoInfo service.</span></div>`
      : `<div class="banner banner-danger"><span>⚠️</span><span>${escapeHtml(err.message)}</span></div>`;
  }
}

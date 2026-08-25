/* Home dashboard: live snapshot, alerts, quick stats, tips of the day. */

import { $, autoInit, escapeHtml, fmtDate, loadJSON, store, timeAgo, toast } from "./ui.js";
import { aqiBand, describeCode, deriveAlerts, fetchConditions, windDirection } from "./weather.js";

autoInit();

async function loadWeather() {
  try {
    const { data, stale } = await fetchConditions();
    const c = data.current;
    const [desc, icon] = describeCode(c.code);
    const band = aqiBand(data.airQuality.aqi);
    $("#snapshot").innerHTML = `
      <div style="display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap;align-items:flex-start">
        <div>
          <div class="eyebrow" style="color:var(--gold-300)">Yola right now</div>
          <div style="display:flex;align-items:center;gap:12px">
            <span style="font-size:2.6rem">${icon}</span>
            <span class="now-temp">${Math.round(c.temp)}°</span>
          </div>
          <p style="color:rgba(245,240,224,0.85);margin:4px 0 0">${escapeHtml(desc)} · feels ${Math.round(c.feels)}°C</p>
        </div>
        <div style="text-align:right">
          <span class="pill pill-gold">${band.label} air</span>
          <p class="small" style="color:rgba(245,240,224,0.65);margin:8px 0 0">${stale ? "Last saved reading" : `Updated ${fmtDate(c.time, { timeStyle: "short" })}`}</p>
        </div>
      </div>
      <div class="now-grid">
        <div class="now-metric"><div class="k">Wind</div><div class="v">${Math.round(c.wind)} km/h ${windDirection(c.windDir)}</div></div>
        <div class="now-metric"><div class="k">Humidity</div><div class="v">${Math.round(c.humidity)}%</div></div>
        <div class="now-metric"><div class="k">UV index</div><div class="v">${(c.uv ?? 0).toFixed(1)}</div></div>
        <div class="now-metric"><div class="k">Driving</div><div class="v">${escapeHtml(data.clarity.label)}</div></div>
      </div>`;

    const alerts = deriveAlerts(data);
    $("#alerts").innerHTML = alerts
      .map(
        (a) => `<div class="banner ${a.level === "danger" ? "banner-danger" : a.level === "info" ? "banner-info" : ""}">
          <span>${a.icon}</span><span><strong>${escapeHtml(a.title)}</strong> — ${escapeHtml(a.body)}</span></div>`,
      )
      .join("");
  } catch {
    $("#snapshot").innerHTML = '<p style="color:rgba(245,240,224,0.85)">Live conditions are unavailable right now.</p>';
  }
}

async function loadTips() {
  try {
    const { tips } = await loadJSON("data/tips.json");
    const day = new Date().getDate();
    const picks = [tips[day % tips.length], tips[(day + 5) % tips.length], tips[(day + 9) % tips.length]];
    $("#tips").innerHTML = picks
      .map(
        (t) => `<article class="card card-hover" style="padding:22px">
          <span class="pill">${escapeHtml(t.category)}</span>
          <h3 style="margin:.6rem 0 .3rem">${escapeHtml(t.title)}</h3>
          <p class="small muted" style="margin:0">${escapeHtml(t.body)}</p>
        </article>`,
      )
      .join("");
  } catch { /* optional */ }
}

function loadActivity() {
  const mine = store.get("my-reports", []);
  const history = store.get("classify-history", []);
  const items = [
    ...mine.map((r) => ({ at: r.createdAt, text: `Reported ${r.wasteType} at ${r.landmark}`, tag: r.code })),
    ...history.map((h) => ({ at: h.at, text: `Classified ${h.label}`, tag: h.recyclable ? "Recyclable" : "Residual" })),
  ]
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, 5);
  $("#activity").innerHTML = items.length
    ? items
        .map(
          (i) => `<div style="display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid var(--line)">
            <span>${escapeHtml(i.text)}</span>
            <span class="small muted">${escapeHtml(i.tag)} · ${timeAgo(i.at)}</span></div>`,
        )
        .join("")
    : '<p class="muted small">Nothing yet. Classify an item or file a report to get started.</p>';
}

loadWeather();
loadTips();
loadActivity();
setInterval(loadWeather, 10 * 60 * 1000);

$("#sync-queue")?.addEventListener("click", () => {
  const queue = store.get("report-queue", []);
  toast(queue.length ? `${queue.length} report(s) waiting to sync.` : "Nothing queued — everything is synced.");
});

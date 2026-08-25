/* Atmospheric conditions page: current, hourly 24h, chart, air quality, clarity. */

import { $, autoInit, escapeHtml, fmtDate, toast } from "./ui.js";
import {
  aqiBand, describeCode, deriveAlerts, drivingClarity, fetchConditions,
  humidityBand, uvBand, windDirection,
} from "./weather.js";

autoInit();

const state = { data: null };

function toneClass(tone) {
  return `pill pill-${tone}`;
}

function renderCurrent(d) {
  const c = d.current;
  const [desc, icon] = describeCode(c.code);
  $("#now").innerHTML = `
    <div style="display:flex;flex-wrap:wrap;gap:24px;align-items:flex-start;justify-content:space-between">
      <div>
        <div class="eyebrow" style="color:var(--gold-300)">Right now in Yola</div>
        <div style="display:flex;align-items:center;gap:14px">
          <span style="font-size:3rem">${icon}</span>
          <span class="now-temp">${Math.round(c.temp)}°</span>
        </div>
        <p style="color:rgba(245,240,224,0.86);margin:6px 0 0">
          ${escapeHtml(desc)} · feels like ${Math.round(c.feels)}°C
        </p>
        <p class="small" style="color:rgba(245,240,224,0.6);margin:2px 0 0">
          Updated ${fmtDate(c.time, { timeStyle: "short", dateStyle: "medium" })}
        </p>
      </div>
      <div style="text-align:right">
        <p class="small" style="color:rgba(245,240,224,0.7);margin:0">Sunrise ${fmtDate(c.sunrise, { timeStyle: "short" })}</p>
        <p class="small" style="color:rgba(245,240,224,0.7);margin:0">Sunset ${fmtDate(c.sunset, { timeStyle: "short" })}</p>
      </div>
    </div>
    <div class="now-grid">
      ${metric("Wind", `${Math.round(c.wind)} km/h ${windDirection(c.windDir)}`)}
      ${metric("Gusts", `${Math.round(c.gusts)} km/h`)}
      ${metric("Humidity", `${Math.round(c.humidity)}%`)}
      ${metric("UV index", `${(c.uv ?? 0).toFixed(1)}`)}
      ${metric("Cloud cover", `${Math.round(c.cloud)}%`)}
      ${metric("Pressure", `${Math.round(c.pressure)} hPa`)}
      ${metric("Visibility", d.clarity.visibilityKm != null ? `${d.clarity.visibilityKm} km` : "—")}
      ${metric("Rain now", `${(c.precipitation ?? 0).toFixed(1)} mm`)}
    </div>`;
}

function metric(k, v) {
  return `<div class="now-metric"><div class="k">${k}</div><div class="v">${v}</div></div>`;
}

function renderHourly(d) {
  const strip = $("#hourly");
  strip.innerHTML = d.hours
    .map((h, i) => {
      const [, icon] = describeCode(h.code);
      return `<div class="hour ${i === 0 ? "is-now" : ""}">
        <div class="h">${i === 0 ? "Now" : fmtDate(h.time, { hour: "numeric", hour12: true })}</div>
        <div class="i">${icon}</div>
        <div class="t">${Math.round(h.temp)}°</div>
        <div class="w">${Math.round(h.pop)}% 💧</div>
        <div class="w">${Math.round(h.wind)} km/h</div>
      </div>`;
    })
    .join("");
  renderChart(d.hours);
}

function renderChart(hours) {
  const w = 900;
  const h = 220;
  const pad = { t: 18, r: 16, b: 26, l: 32 };
  const temps = hours.map((x) => x.temp);
  const min = Math.floor(Math.min(...temps) - 1);
  const max = Math.ceil(Math.max(...temps) + 1);
  const px = (i) => pad.l + (i * (w - pad.l - pad.r)) / (hours.length - 1);
  const py = (t) => pad.t + ((max - t) * (h - pad.t - pad.b)) / (max - min || 1);

  const line = hours.map((x, i) => `${i ? "L" : "M"}${px(i).toFixed(1)},${py(x.temp).toFixed(1)}`).join(" ");
  const area = `${line} L${px(hours.length - 1).toFixed(1)},${h - pad.b} L${pad.l},${h - pad.b} Z`;
  const maxRain = Math.max(1, ...hours.map((x) => x.rain || 0));
  const bars = hours
    .map((x, i) => {
      const bh = ((x.rain || 0) / maxRain) * 46;
      return bh > 0.5
        ? `<rect class="rain-bar" x="${(px(i) - 5).toFixed(1)}" y="${(h - pad.b - bh).toFixed(1)}" width="10" height="${bh.toFixed(1)}" rx="3"></rect>`
        : "";
    })
    .join("");
  const gridLines = [0, 0.25, 0.5, 0.75, 1]
    .map((f) => {
      const y = pad.t + f * (h - pad.t - pad.b);
      const val = Math.round(max - f * (max - min));
      return `<line class="grid-line" x1="${pad.l}" y1="${y}" x2="${w - pad.r}" y2="${y}"></line>
              <text x="4" y="${y + 3}">${val}°</text>`;
    })
    .join("");
  const labels = hours
    .map((x, i) =>
      i % 4 === 0
        ? `<text x="${px(i)}" y="${h - 6}" text-anchor="middle">${fmtDate(x.time, { hour: "numeric", hour12: true })}</text>`
        : "",
    )
    .join("");

  $("#chart").innerHTML = `
    <svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Temperature and rainfall over the next 24 hours">
      <defs>
        <linearGradient id="tempGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="rgba(23,153,122,0.32)"/>
          <stop offset="100%" stop-color="rgba(23,153,122,0)"/>
        </linearGradient>
      </defs>
      ${gridLines}${bars}
      <path class="temp-area" d="${area}"></path>
      <path class="temp-line" d="${line}"></path>
      ${labels}
    </svg>`;
}

function renderAir(d) {
  const a = d.airQuality;
  const band = aqiBand(a.aqi);
  const rows = [
    ["PM2.5", a.pm25, "µg/m³"],
    ["PM10", a.pm10, "µg/m³"],
    ["Dust", a.dust, "µg/m³"],
    ["Ozone (O₃)", a.o3, "µg/m³"],
    ["Nitrogen dioxide", a.no2, "µg/m³"],
    ["Sulphur dioxide", a.so2, "µg/m³"],
  ];
  $("#air").innerHTML = `
    <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
      <div class="stat"><span class="stat-value">${a.aqi ?? "—"}</span><span class="stat-label">European AQI</span></div>
      <span class="${toneClass(band.tone)}">${band.label}</span>
      ${a.usAqi != null ? `<span class="pill">US AQI ${a.usAqi}</span>` : ""}
    </div>
    <p style="margin-top:10px">${band.advice}</p>
    <div class="grid grid-2" style="gap:10px;margin-top:8px">
      ${rows
        .map(
          ([k, v, u]) =>
            `<div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--line);padding:6px 0">
              <span class="small muted">${k}</span><strong class="small">${v == null ? "—" : v.toFixed(1)} ${u}</strong>
            </div>`,
        )
        .join("")}
    </div>`;
}

function renderClarity(d) {
  const cl = d.clarity;
  const hum = humidityBand(d.current.humidity);
  const uv = uvBand(d.current.uv);
  $("#clarity").innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
      <span class="${toneClass(cl.tone)}">Driving: ${cl.label}</span>
      <span class="small muted">Visibility ${cl.visibilityKm ?? "—"} km</span>
    </div>
    <div class="gauge" style="margin:14px 0">
      <div class="gauge-track"><div class="gauge-fill" style="width:${cl.score}%"></div></div>
      <strong>${cl.score}/100</strong>
    </div>
    <p>${cl.advice}</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
      <span class="${toneClass(hum.tone)}">Humidity ${hum.label}</span>
      <span class="${toneClass(uv.tone)}">UV ${uv.label}</span>
    </div>
    <p class="small muted" style="margin-top:10px">${uv.advice}</p>`;
}

function renderDaily(d) {
  $("#daily").innerHTML = d.daily
    .map((day) => {
      const [desc, icon] = describeCode(day.code);
      return `<div class="card card-hover" style="padding:16px">
        <div class="small muted" style="font-weight:700">${fmtDate(day.date, { weekday: "short", day: "numeric", month: "short" })}</div>
        <div style="font-size:1.6rem">${icon}</div>
        <div style="font-weight:700">${Math.round(day.max)}° <span class="muted">/ ${Math.round(day.min)}°</span></div>
        <div class="small muted">${escapeHtml(desc)}</div>
        <div class="small muted">💧 ${day.rain.toFixed(1)} mm · UV ${Math.round(day.uvMax)}</div>
      </div>`;
    })
    .join("");
}

function renderAlerts(d) {
  const alerts = deriveAlerts(d);
  $("#alerts").innerHTML = alerts
    .map(
      (a) => `<div class="banner ${a.level === "danger" ? "banner-danger" : a.level === "info" ? "banner-info" : ""}">
        <span>${a.icon}</span><span><strong>${escapeHtml(a.title)}</strong><br><span class="small">${escapeHtml(a.body)}</span></span>
      </div>`,
    )
    .join("");
}

async function load() {
  try {
    const { data, stale, error } = await fetchConditions();
    state.data = data;
    renderCurrent(data);
    renderHourly(data);
    renderAir(data);
    renderClarity(data);
    renderDaily(data);
    renderAlerts(data);
    $("#status").textContent = stale
      ? `Showing last saved reading — ${error || "network unavailable"}.`
      : `Live data from Open-Meteo · updated ${fmtDate(Date.now(), { timeStyle: "short" })}`;
  } catch (err) {
    $("#status").textContent = "Could not load live conditions.";
    $("#now").innerHTML = `<p style="color:rgba(245,240,224,0.85)">${escapeHtml(err.message)}</p>`;
    toast("Weather service unreachable. Check your connection.", "err");
  }
}

load();
setInterval(load, 10 * 60 * 1000);
$("#refresh")?.addEventListener("click", () => {
  toast("Refreshing conditions…");
  load();
});

// Recompute clarity when the user tweaks assumptions (dust storm toggle).
$("#dust-sim")?.addEventListener("change", (e) => {
  if (!state.data) return;
  const d = state.data;
  const clarity = e.target.checked
    ? drivingClarity({ visibilityM: 1500, precipitation: 0, dust: 320, pm10: 320 })
    : d.clarity;
  const backup = d.clarity;
  d.clarity = clarity;
  renderClarity(d);
  d.clarity = e.target.checked ? clarity : backup;
});

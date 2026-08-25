/* Community page: eco alerts, clean-up events, leaderboard, pledges. */

import { $, $$, autoInit, escapeHtml, fmtDate, store, timeAgo, toast } from "./ui.js";
import { api } from "./api.js";

autoInit();

/* ---------------- alerts ---------------- */

const FALLBACK_ALERTS = [
  { title: "Harmattan dust advisory", body: "Dust levels rise sharply between 6am and 10am. Limit outdoor exercise and cover market produce.", level: "warn", at: Date.now() - 36e5 * 5 },
  { title: "Drain clearing — Jimeta North", body: "ADSEPA crews clear the Karewa channel this Saturday. Move waste bags away from the channel edge.", level: "info", at: Date.now() - 36e5 * 26 },
  { title: "Buy-back price update", body: "PET bottles now fetch a higher rate per kilogram at the Jimeta hub through the end of the month.", level: "info", at: Date.now() - 36e5 * 50 },
];

async function loadAlerts() {
  let alerts;
  try {
    alerts = await api.alerts();
  } catch {
    alerts = [...store.get("alerts", []), ...FALLBACK_ALERTS];
  }
  $("#alerts").innerHTML = alerts
    .map(
      (a) => `<div class="banner ${a.level === "danger" ? "banner-danger" : a.level === "info" ? "banner-info" : ""}">
        <span>${a.level === "danger" ? "⚠️" : a.level === "info" ? "ℹ️" : "🌬️"}</span>
        <span><strong>${escapeHtml(a.title)}</strong><br><span class="small">${escapeHtml(a.body)} · ${timeAgo(a.at)}</span></span>
      </div>`,
    )
    .join("");
}

/* ---------------- clean-up events ---------------- */

const EVENTS = [
  { name: "Karewa channel clean-up", date: nextWeekday(6, 7), place: "Karewa GRA, Jimeta", host: "Green Yola Volunteers", spots: 40 },
  { name: "Campus plastic drive", date: nextWeekday(3, 10), place: "MAUTECH main gate", host: "MAUTECH Eco Club", spots: 60 },
  { name: "Market sorting workshop", date: nextWeekday(2, 15), place: "Yola Main Market hall", host: "ADSEPA outreach", spots: 25 },
  { name: "Tree planting — Doubeli", date: nextWeekday(6, 21), place: "Doubeli primary school", host: "Adamawa Green Trust", spots: 80 },
];

function nextWeekday(dow, minDays) {
  const d = new Date();
  d.setDate(d.getDate() + minDays);
  while (d.getDay() !== dow) d.setDate(d.getDate() + 1);
  d.setHours(8, 0, 0, 0);
  return d;
}

function renderEvents() {
  const joined = store.get("joined-events", []);
  $("#events").innerHTML = EVENTS.map(
    (e, i) => `<article class="card card-hover" style="padding:22px">
      <div class="eyebrow">${fmtDate(e.date, { weekday: "long", day: "numeric", month: "long" })}</div>
      <h3 style="margin:.5rem 0 .2rem">${escapeHtml(e.name)}</h3>
      <p class="small muted" style="margin:0">${escapeHtml(e.place)} · hosted by ${escapeHtml(e.host)}</p>
      <p class="small" style="margin:.6rem 0">${e.spots - (joined.includes(i) ? 1 : 0)} volunteer spots left · 8:00 AM start</p>
      <button class="btn ${joined.includes(i) ? "btn-ghost" : "btn-gold"} btn-sm" data-i="${i}">
        ${joined.includes(i) ? "You're signed up ✓" : "Join clean-up"}
      </button>
    </article>`,
  ).join("");
  $$("#events button").forEach((b) =>
    b.addEventListener("click", () => {
      const i = Number(b.dataset.i);
      const list = store.get("joined-events", []);
      const next = list.includes(i) ? list.filter((x) => x !== i) : [...list, i];
      store.set("joined-events", next);
      toast(next.includes(i) ? "You're on the volunteer list." : "Sign-up removed.");
      renderEvents();
      renderPoints();
    }),
  );
}

/* ---------------- leaderboard + points ---------------- */

const WARDS = [
  { ward: "Jimeta North", reports: 48, resolved: 41, kg: 3120 },
  { ward: "Doubeli", reports: 39, resolved: 30, kg: 2480 },
  { ward: "Yola Town", reports: 33, resolved: 29, kg: 2255 },
  { ward: "Luggere", reports: 27, resolved: 18, kg: 1610 },
  { ward: "Yolde Pate", reports: 22, resolved: 17, kg: 1490 },
  { ward: "MAUTECH", reports: 19, resolved: 16, kg: 1180 },
];

function renderLeaderboard() {
  const rows = WARDS.map((w) => ({ ...w, score: w.resolved * 10 + Math.round(w.kg / 50) })).sort((a, b) => b.score - a.score);
  const max = rows[0].score;
  $("#leaderboard").innerHTML = rows
    .map(
      (w, i) => `<div style="padding:12px 0;border-bottom:1px solid var(--line)">
        <div style="display:flex;justify-content:space-between;gap:10px">
          <strong>${i + 1}. ${escapeHtml(w.ward)}</strong>
          <span class="small muted">${w.resolved}/${w.reports} cleared · ${w.kg.toLocaleString()} kg diverted</span>
        </div>
        <div class="gauge-track" style="margin-top:8px"><div class="gauge-fill" style="width:${(w.score / max) * 100}%"></div></div>
      </div>`,
    )
    .join("");
}

function renderPoints() {
  const reports = store.get("my-reports", []).length;
  const classifications = store.get("classify-history", []).length;
  const events = store.get("joined-events", []).length;
  const pledges = store.get("pledges", []).length;
  const points = reports * 25 + classifications * 5 + events * 40 + pledges * 15;
  const level = points >= 300 ? "Eco Champion" : points >= 150 ? "Eco Guardian" : points >= 50 ? "Eco Ally" : "Eco Starter";
  $("#points").innerHTML = `
    <div class="stat"><span class="stat-value">${points}</span><span class="stat-label">Your eco points</span></div>
    <span class="pill pill-gold">${level}</span>
    <div class="small muted" style="margin-top:10px">${reports} reports · ${classifications} classifications · ${events} clean-ups · ${pledges} pledges</div>`;
}

/* ---------------- pledges ---------------- */

const PLEDGES = [
  "Sort my household waste into three streams",
  "Stop burning nylon and plastic",
  "Compost kitchen scraps every week",
  "Take batteries and e-waste to the collection point",
  "Report every dump site I find",
  "Plant and water one tree this season",
];

function renderPledges() {
  const mine = store.get("pledges", []);
  $("#pledges").innerHTML = PLEDGES.map(
    (p, i) => `<label class="checkline card" style="padding:14px 16px">
      <input type="checkbox" data-i="${i}" ${mine.includes(i) ? "checked" : ""}> <span>${escapeHtml(p)}</span>
    </label>`,
  ).join("");
  $$("#pledges input").forEach((c) =>
    c.addEventListener("change", () => {
      const i = Number(c.dataset.i);
      const list = store.get("pledges", []);
      store.set("pledges", c.checked ? [...new Set([...list, i])] : list.filter((x) => x !== i));
      renderPoints();
      if (c.checked) toast("Pledge added — thank you!");
    }),
  );
}

loadAlerts();
renderEvents();
renderLeaderboard();
renderPledges();
renderPoints();

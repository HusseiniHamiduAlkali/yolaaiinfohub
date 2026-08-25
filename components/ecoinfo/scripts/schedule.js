/* Collection schedule + personal waste log. */

import { $, $$, autoInit, escapeHtml, loadJSON, store, toast } from "./ui.js";

autoInit();

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
let schedule = null;
let zoneId = store.get("zone", "");

function todayName() {
  return DAYS[new Date().getDay()];
}

function nextDate(dayName) {
  const target = DAYS.indexOf(dayName);
  const now = new Date();
  const diff = (target - now.getDay() + 7) % 7;
  const d = new Date(now);
  d.setDate(now.getDate() + diff);
  d.setHours(6, 0, 0, 0);
  return d;
}

function renderZones() {
  $("#zone").innerHTML =
    '<option value="">Choose your area…</option>' +
    schedule.zones.map((z) => `<option value="${z.id}" ${z.id === zoneId ? "selected" : ""}>${escapeHtml(z.name)} — ${escapeHtml(z.lga)}</option>`).join("");
}

function renderZone() {
  const z = schedule.zones.find((x) => x.id === zoneId);
  const wrap = $("#zone-detail");
  if (!z) {
    wrap.innerHTML = '<p class="muted">Select your area to see collection days and reminders.</p>';
    return;
  }
  const streams = [
    ["General waste", z.general, "🗑️"],
    ["Recyclables", z.recyclables, "♻️"],
    ["Organic / compost", z.organic, "🌱"],
  ];
  const upcoming = streams
    .flatMap(([label, days, icon]) => days.map((d) => ({ label, icon, date: nextDate(d), day: d })))
    .sort((a, b) => a.date - b.date);

  wrap.innerHTML = `
    <div class="card" style="padding:24px">
      <div class="eyebrow">${escapeHtml(z.lga)}</div>
      <h2 style="margin:.2rem 0">${escapeHtml(z.name)}</h2>
      <p class="small muted">Collection window ${escapeHtml(z.window)} · ${escapeHtml(z.crew)}</p>
      <div class="grid grid-3" style="margin-top:16px">
        ${streams
          .map(
            ([label, days, icon]) => `<div class="card" style="padding:16px">
              <div style="font-size:1.4rem">${icon}</div>
              <strong>${label}</strong>
              <div class="small muted">${days.join(", ")}</div>
              ${days.includes(todayName()) ? '<span class="pill pill-gold" style="margin-top:8px">Today</span>' : ""}
            </div>`,
          )
          .join("")}
      </div>
      <h3 style="margin-top:22px">Next pickups</h3>
      <ul class="timeline">
        ${upcoming
          .slice(0, 4)
          .map(
            (u, i) => `<li class="${i === 0 ? "current" : ""}">
              <div class="t-title">${u.icon} ${u.label}</div>
              <div class="t-meta">${u.day}, ${u.date.toLocaleDateString("en-NG", { day: "numeric", month: "short" })} · from ${escapeHtml(z.window.split("–")[0].trim())}</div>
            </li>`,
          )
          .join("")}
      </ul>
      <div class="hero-actions">
        <button class="btn btn-gold" id="remind">Enable pickup reminder</button>
        <button class="btn btn-ghost" id="ics">Add to calendar</button>
      </div>
    </div>`;

  $("#remind").addEventListener("click", async () => {
    if (!("Notification" in window)) return toast("Notifications are not supported here.", "err");
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return toast("Reminder permission declined.", "err");
    store.set("reminder-zone", z.id);
    new Notification("EcoInfo reminders on", { body: `We'll remind you the evening before pickup in ${z.name}.` });
    toast("Reminders enabled on this device.");
  });

  $("#ics").addEventListener("click", () => downloadIcs(z, upcoming.slice(0, 6)));
}

function downloadIcs(zone, events) {
  const stamp = (d) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const body = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Yola EcoInfo//EN",
    ...events.flatMap((e, i) => [
      "BEGIN:VEVENT",
      `UID:eco-${zone.id}-${i}@yolaecoinfo`,
      `DTSTAMP:${stamp(new Date())}`,
      `DTSTART:${stamp(e.date)}`,
      `DTEND:${stamp(new Date(e.date.getTime() + 36e5))}`,
      `SUMMARY:${e.label} collection — ${zone.name}`,
      `DESCRIPTION:Set bins out by 6:00 AM. Window ${zone.window}.`,
      "END:VEVENT",
    ]),
    "END:VCALENDAR",
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([body], { type: "text/calendar" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `ecoinfo-${zone.id}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

function renderTable() {
  $("#all-zones").innerHTML = schedule.zones
    .map(
      (z) => `<tr>
        <td><strong>${escapeHtml(z.name)}</strong><div class="small muted">${escapeHtml(z.lga)}</div></td>
        <td>${z.general.join(", ")}</td>
        <td>${z.recyclables.join(", ")}</td>
        <td>${z.organic.join(", ")}</td>
        <td class="small">${escapeHtml(z.window)}</td>
      </tr>`,
    )
    .join("");
}

/* ---------------- personal waste log ---------------- */

function renderLog() {
  const log = store.get("waste-log", []);
  const total = log.reduce((a, e) => a + Number(e.kg), 0);
  const recycled = log.filter((e) => e.recycled).reduce((a, e) => a + Number(e.kg), 0);
  const rate = total ? Math.round((recycled / total) * 100) : 0;
  $("#log-stats").innerHTML = `
    <div class="stat"><span class="stat-value">${total.toFixed(1)} kg</span><span class="stat-label">Logged waste</span></div>
    <div class="stat"><span class="stat-value">${recycled.toFixed(1)} kg</span><span class="stat-label">Diverted</span></div>
    <div class="stat"><span class="stat-value">${rate}%</span><span class="stat-label">Recycling rate</span></div>`;
  $("#log-list").innerHTML = log.length
    ? log
        .slice(0, 10)
        .map(
          (e) => `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--line)">
            <span>${escapeHtml(e.stream)} · ${Number(e.kg).toFixed(1)} kg</span>
            <span class="small muted">${new Date(e.at).toLocaleDateString("en-NG")} ${e.recycled ? "♻️" : ""}</span></div>`,
        )
        .join("")
    : '<p class="muted small">No entries yet — log a bag to start tracking your household.</p>';
}

$("#log-form")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const kg = Number($("#log-kg").value);
  if (!kg || kg <= 0) return toast("Enter a weight in kilograms.", "err");
  const log = store.get("waste-log", []);
  log.unshift({ at: Date.now(), stream: $("#log-stream").value, kg, recycled: $("#log-recycled").checked });
  store.set("waste-log", log.slice(0, 200));
  renderLog();
  e.target.reset();
  toast("Entry logged.");
});

$("#clear-log")?.addEventListener("click", () => {
  store.remove("waste-log");
  renderLog();
});

loadJSON("data/schedule.json")
  .then((data) => {
    schedule = data;
    $("#provider").textContent = data.provider;
    $("#note").textContent = data.note;
    renderZones();
    renderZone();
    renderTable();
  })
  .catch(() => toast("Could not load the collection schedule.", "err"));

$("#zone")?.addEventListener("change", (e) => {
  zoneId = e.target.value;
  store.set("zone", zoneId);
  renderZone();
});

renderLog();

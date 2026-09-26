/* Admin console: report triage, status/assignment updates, stats, alerts. */

import { $, $$, autoInit, escapeHtml, fmtDate, timeAgo, toast } from "./ui.js";
import { api } from "./api.js";

autoInit();

const STATUSES = ["submitted", "reviewing", "assigned", "resolved", "rejected"];
let reports = [];
let filters = { status: "", severity: "", q: "" };

/* ---------------- data ---------------- */

async function loadReports() {
  const body = $("#rows");
  body.innerHTML = `<tr><td colspan="7"><div class="skeleton" style="height:18px"></div></td></tr>`;
  try {
    reports = await api.adminReports();
  } catch (err) {
    reports = [];
    renderStats();
    $("#rows").innerHTML = `<tr><td colspan="7" class="muted small" style="padding:20px">Unable to load EcoInfo reports. Check the EcoInfo service and administrator API access. ${escapeHtml(err.message)}</td></tr>`;
    toast(err.message, "err");
    return;
  }
  renderStats();
  renderTable();
}

/* ---------------- rendering ---------------- */

function filtered() {
  return reports.filter((r) => {
    if (filters.status && r.status !== filters.status) return false;
    if (filters.severity && r.severity !== filters.severity) return false;
    if (filters.q) {
      const hay = `${r.code} ${r.landmark} ${r.ward} ${r.wasteType} ${r.description}`.toLowerCase();
      if (!hay.includes(filters.q.toLowerCase())) return false;
    }
    return true;
  });
}

function renderStats() {
  const open = reports.filter((r) => !["resolved", "rejected"].includes(r.status));
  const resolved = reports.filter((r) => r.status === "resolved");
  const high = open.filter((r) => r.severity === "high");
  const avgHours = resolved.length
    ? Math.round(
        resolved.reduce((a, r) => a + (new Date(r.resolvedAt || Date.now()) - new Date(r.createdAt)) / 3.6e6, 0) /
          resolved.length,
      )
    : 0;
  $("#stats").innerHTML = [
    ["Open reports", open.length],
    ["High severity", high.length],
    ["Resolved", resolved.length],
    ["Avg. resolution", `${avgHours} h`],
  ]
    .map(
      ([label, value]) =>
        `<div class="card" style="padding:18px"><div class="stat"><span class="stat-value">${value}</span><span class="stat-label">${label}</span></div></div>`,
    )
    .join("");
}

function sevPill(s) {
  const map = { high: "pill-bad", medium: "pill-fair", low: "pill-good" };
  return `<span class="pill ${map[s] || ""}">${escapeHtml(s || "—")}</span>`;
}

function statusPill(s) {
  const map = { resolved: "pill-good", assigned: "pill-fair", reviewing: "pill-fair", rejected: "pill-poor" };
  return `<span class="pill ${map[s] || ""}">${escapeHtml(s)}</span>`;
}

function renderTable() {
  const rows = filtered();
  $("#count").textContent = `${rows.length} of ${reports.length} reports`;
  $("#rows").innerHTML = rows.length
    ? rows
        .map(
          (r) => `<tr>
        <td><strong>${escapeHtml(r.code)}</strong><div class="small muted">${timeAgo(r.createdAt)}</div></td>
        <td>${escapeHtml(r.wasteType || "")}</td>
        <td>${sevPill(r.severity)}</td>
        <td>${escapeHtml(r.landmark || "")}<div class="small muted">${escapeHtml(r.ward || "")}</div></td>
        <td>${statusPill(r.status)}</td>
        <td>${escapeHtml(r.assignee || "—")}</td>
        <td><button class="btn btn-ghost btn-sm" data-id="${r.id}">Open</button></td>
      </tr>`,
        )
        .join("")
    : `<tr><td colspan="7" class="muted small" style="padding:20px">No reports match these filters.</td></tr>`;
  $$("#rows button").forEach((b) => b.addEventListener("click", () => openDetail(Number(b.dataset.id))));
}

function openDetail(id) {
  const r = reports.find((x) => x.id === id);
  if (!r) return;
  const panel = $("#detail");
  panel.classList.remove("hidden");
  panel.innerHTML = `
    <div class="card" style="padding:24px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">
        <div>
          <div class="eyebrow">Report</div>
          <h2 style="margin:.2rem 0">${escapeHtml(r.code)}</h2>
          <p class="small muted">Filed ${fmtDate(r.createdAt)} · ${escapeHtml(r.ward || "unknown ward")}</p>
        </div>
        <button class="btn btn-ghost btn-sm" id="close-detail">Close</button>
      </div>
      <p>${escapeHtml(r.description || "")}</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0">
        ${sevPill(r.severity)} ${statusPill(r.status)} <span class="pill">${escapeHtml(r.wasteType || "")}</span>
      </div>
      ${
        r.photos && r.photos.length
          ? `<div class="thumbs">${r.photos.map((p) => `<div class="thumb"><img src="${p}" alt="Evidence"></div>`).join("")}</div>`
          : '<p class="small muted">No photo evidence attached.</p>'
      }
      <p class="small muted">Location: ${r.lat ? `${Number(r.lat).toFixed(5)}, ${Number(r.lon).toFixed(5)} · <a href="https://www.google.com/maps/search/?api=1&query=${r.lat},${r.lon}" target="_blank" rel="noopener">open map</a>` : "not provided"}</p>

      <div class="grid grid-2" style="margin-top:12px">
        <div class="field">
          <label class="label" for="d-status">Status</label>
          <select class="select" id="d-status">${STATUSES.map((s) => `<option ${s === r.status ? "selected" : ""}>${s}</option>`).join("")}</select>
        </div>
        <div class="field">
          <label class="label" for="d-assignee">Assign crew</label>
          <input class="input" id="d-assignee" value="${escapeHtml(r.assignee || "")}" placeholder="Crew A / contractor name">
        </div>
      </div>
      <div class="field">
        <label class="label" for="d-note">Officer note</label>
        <textarea class="textarea" id="d-note" placeholder="Action taken, findings, follow-up date…">${escapeHtml(r.officerNote || "")}</textarea>
      </div>
      <div class="hero-actions">
        <button class="btn btn-gold" id="save-detail">Save update</button>
        <button class="btn btn-ghost" id="resolve-detail">Mark resolved</button>
      </div>
    </div>`;
  panel.scrollIntoView({ behavior: "smooth", block: "start" });

  $("#close-detail").addEventListener("click", () => panel.classList.add("hidden"));
  $("#save-detail").addEventListener("click", () => save(r, { status: $("#d-status").value }));
  $("#resolve-detail").addEventListener("click", () => save(r, { status: "resolved", resolvedAt: new Date().toISOString() }));
}

async function save(r, extra) {
  const patch = {
    assignee: $("#d-assignee").value.trim(),
    officerNote: $("#d-note").value.trim(),
    ...extra,
  };
  try {
    const updated = await api.updateReport(r.id, patch);
    Object.assign(r, updated);
  } catch (err) {
    toast(err.message, "err");
    return;
  }
  toast(`${r.code} updated → ${r.status}`);
  renderStats();
  renderTable();
  $("#detail").classList.add("hidden");
}

/* ---------------- filters + alerts ---------------- */

$("#f-status")?.addEventListener("change", (e) => { filters.status = e.target.value; renderTable(); });
$("#f-severity")?.addEventListener("change", (e) => { filters.severity = e.target.value; renderTable(); });
$("#f-q")?.addEventListener("input", (e) => { filters.q = e.target.value; renderTable(); });
$("#refresh")?.addEventListener("click", loadReports);

$("#export")?.addEventListener("click", () => {
  const rows = filtered();
  const head = ["code", "wasteType", "severity", "ward", "landmark", "status", "assignee", "createdAt"];
  const csv = [head.join(","), ...rows.map((r) => head.map((k) => `"${String(r[k] ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `ecoinfo-reports-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
});

$("#alert-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = { title: $("#a-title").value.trim(), body: $("#a-body").value.trim(), level: $("#a-level").value };
  if (!payload.title || !payload.body) return toast("Title and message are required.", "err");
  try {
    await api.publishAlert(payload);
    toast("Alert published to the community page.");
  } catch (err) {
    toast(err.message || "Unable to publish alert. The EcoInfo service may be unavailable.", "err");
    return;
  }
  e.target.reset();
});

loadReports();

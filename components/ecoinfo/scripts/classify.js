/* AI waste classifier: photo + description -> disposal guidance.
   Uses the local backend AI when available, otherwise a local rules engine. */

import { $, $$, autoInit, compressImage, escapeHtml, loadJSON, store, toast } from "./ui.js";
import { api } from "./api.js";

autoInit();

let CATEGORIES = [];
let photos = []; // { name, dataUrl }

loadJSON("data/waste-categories.json")
  .then((json) => {
    CATEGORIES = json.categories;
    renderExamples();
  })
  .catch(() => toast("Could not load the local waste knowledge base.", "err"));

/* ---------------- local rules engine (offline fallback) ---------------- */

function scoreCategory(cat, text) {
  const hay = text.toLowerCase();
  let score = 0;
  for (const kw of cat.keywords) {
    if (hay.includes(kw)) score += kw.split(" ").length * 2 + 1;
  }
  if (hay.includes(cat.label.toLowerCase())) score += 4;
  return score;
}

function localClassify(text) {
  const ranked = CATEGORIES.map((c) => ({ cat: c, score: scoreCategory(c, text) }))
    .sort((a, b) => b.score - a.score);
  const best = ranked[0];
  if (!best || best.score === 0) {
    const general = CATEGORIES.find((c) => c.id === "general");
    return { ...toResult(general, 0.35), engine: "local" };
  }
  const confidence = Math.min(0.95, 0.45 + best.score * 0.08);
  const alternatives = ranked.slice(1, 3).filter((r) => r.score > 0).map((r) => r.cat.label);
  return { ...toResult(best.cat, confidence), alternatives, engine: "local" };
}

function toResult(cat, confidence) {
  return {
    label: cat.label,
    material: cat.material,
    recyclable: cat.recyclable,
    biodegradable: cat.biodegradable,
    hazardous: cat.hazardous,
    confidence,
    steps: cat.steps,
    reuse: cat.reuse,
    dropOffMaterial: cat.dropOffMaterial,
  };
}

/* ---------------- photo handling ---------------- */

const dropzone = $("#dropzone");
const fileInput = $("#photos");

dropzone?.addEventListener("click", () => fileInput.click());
dropzone?.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropzone.classList.add("dragover");
});
dropzone?.addEventListener("dragleave", () => dropzone.classList.remove("dragover"));
dropzone?.addEventListener("drop", (e) => {
  e.preventDefault();
  dropzone.classList.remove("dragover");
  addFiles(e.dataTransfer.files);
});
fileInput?.addEventListener("change", (e) => addFiles(e.target.files));

async function addFiles(fileList) {
  const files = [...fileList].filter((f) => f.type.startsWith("image/")).slice(0, 3 - photos.length);
  if (!files.length) return;
  for (const f of files) {
    try {
      const dataUrl = await compressImage(f, 1024, 0.8);
      photos.push({ name: f.name, dataUrl });
    } catch {
      toast(`Could not read ${f.name}`, "err");
    }
  }
  renderThumbs();
}

function renderThumbs() {
  $("#thumbs").innerHTML = photos
    .map(
      (p, i) =>
        `<div class="thumb"><img src="${p.dataUrl}" alt="${escapeHtml(p.name)}"><button type="button" data-i="${i}" aria-label="Remove photo">×</button></div>`,
    )
    .join("");
  $$("#thumbs button").forEach((b) =>
    b.addEventListener("click", () => {
      photos.splice(Number(b.dataset.i), 1);
      renderThumbs();
    }),
  );
}

/* ---------------- submit ---------------- */

$("#classify-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const description = $("#description").value.trim();
  const context = $("#context").value;
  if (!description && photos.length === 0) {
    toast("Add a photo or describe the item first.", "err");
    return;
  }

  const btn = $("#classify-btn");
  btn.disabled = true;
  btn.textContent = "Analysing…";
  $("#result").innerHTML = skeleton();

  let result;
  try {
    result = await api.classify({
      description,
      context,
      images: photos.map((p) => p.dataUrl),
      knownCategories: CATEGORIES.map((c) => ({ id: c.id, label: c.label })),
    });
    result.engine = result.engine || "ai";
  } catch (err) {
    result = localClassify(`${description} ${context}`);
    result.notice = err.offline
      ? "AI service offline — this answer comes from the built-in Yola waste rules."
      : `AI unavailable (${err.message}) — showing rules-engine guidance.`;
  }

  renderResult(result, description);
  saveHistory(result, description);
  btn.disabled = false;
  btn.textContent = "Classify item";
  $("#result").scrollIntoView({ behavior: "smooth", block: "start" });
});

$("#reset-btn")?.addEventListener("click", () => {
  photos = [];
  renderThumbs();
  $("#classify-form").reset();
  $("#result").innerHTML = "";
});

function skeleton() {
  return `<div class="card" style="padding:22px">
    <div class="skeleton" style="height:22px;width:50%"></div>
    <div class="skeleton" style="height:14px;margin-top:12px"></div>
    <div class="skeleton" style="height:14px;margin-top:8px;width:80%"></div>
  </div>`;
}

function yesNo(v, yes, no) {
  return v
    ? `<span class="pill pill-good">${yes}</span>`
    : `<span class="pill pill-poor">${no}</span>`;
}

function renderResult(r, description) {
  const confidence = Math.round((r.confidence ?? 0.6) * 100);
  $("#result").innerHTML = `
    <div class="card" style="padding:26px">
      ${r.notice ? `<div class="banner banner-info"><span>ℹ️</span><span>${escapeHtml(r.notice)}</span></div>` : ""}
      <div class="eyebrow">Classification</div>
      <h2 style="margin:.2rem 0">${escapeHtml(r.label)}</h2>
      <p class="muted" style="margin-top:0">${escapeHtml(r.material || "")}${description ? ` · “${escapeHtml(description)}”` : ""}</p>

      <div style="display:flex;gap:8px;flex-wrap:wrap;margin:14px 0">
        ${yesNo(r.recyclable, "Recyclable", "Not recyclable")}
        ${yesNo(r.biodegradable, "Biodegradable", "Not biodegradable")}
        ${r.hazardous ? '<span class="pill pill-bad">Hazardous — handle with care</span>' : '<span class="pill pill-good">Non-hazardous</span>'}
        <span class="pill">${r.engine === "ai" ? "AI vision" : "Local rules"} · ${confidence}% confident</span>
      </div>

      <div class="gauge"><div class="gauge-track"><div class="gauge-fill" style="width:${confidence}%"></div></div><strong>${confidence}%</strong></div>

      <h3 style="margin-top:22px">How to dispose of it safely</h3>
      <ol style="padding-left:20px;line-height:1.8">
        ${(r.steps || []).map((s) => `<li>${escapeHtml(s)}</li>`).join("")}
      </ol>

      ${
        r.reuse && r.reuse.length
          ? `<h3>Better than disposal — reuse ideas</h3>
             <ul style="padding-left:20px;line-height:1.8">${r.reuse.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ul>`
          : ""
      }

      ${
        r.alternatives && r.alternatives.length
          ? `<p class="small muted">Could also be: ${r.alternatives.map(escapeHtml).join(", ")}</p>`
          : ""
      }

      <div class="hero-actions" style="margin-top:18px">
        <a class="btn btn-emerald" href="recycling.html?material=${encodeURIComponent(r.dropOffMaterial || "")}">Find a drop-off point</a>
        <a class="btn btn-ghost" href="report.html">Report a dump site</a>
      </div>
      ${r.hazardous ? '<p class="error" style="margin-top:14px">Never burn or bury this item. Keep it away from children and water sources.</p>' : ""}
    </div>`;
}

/* ---------------- history ---------------- */

function saveHistory(result, description) {
  const history = store.get("classify-history", []);
  history.unshift({
    at: Date.now(),
    label: result.label,
    description,
    recyclable: result.recyclable,
    hazardous: result.hazardous,
  });
  store.set("classify-history", history.slice(0, 12));
  renderHistory();
}

function renderHistory() {
  const history = store.get("classify-history", []);
  const wrap = $("#history");
  if (!wrap) return;
  if (!history.length) {
    wrap.innerHTML = '<p class="muted small">Your recent classifications will appear here (saved on this device only).</p>';
    return;
  }
  wrap.innerHTML = history
    .map(
      (h) => `<div class="card" style="padding:12px 14px;display:flex;justify-content:space-between;gap:12px;align-items:center">
        <div><strong>${escapeHtml(h.label)}</strong><div class="small muted">${escapeHtml(h.description || "photo only")}</div></div>
        ${h.hazardous ? '<span class="pill pill-bad">Hazardous</span>' : h.recyclable ? '<span class="pill pill-good">Recyclable</span>' : '<span class="pill pill-poor">Residual</span>'}
      </div>`,
    )
    .join("");
}
renderHistory();

$("#clear-history")?.addEventListener("click", () => {
  store.remove("classify-history");
  renderHistory();
  toast("History cleared.");
});

/* ---------------- quick examples ---------------- */

function renderExamples() {
  const wrap = $("#examples");
  if (!wrap) return;
  wrap.innerHTML = CATEGORIES.slice(0, 8)
    .map((c) => `<button type="button" class="pill" data-label="${escapeHtml(c.label)}">${escapeHtml(c.label)}</button>`)
    .join("");
  $$("#examples button").forEach((b) =>
    b.addEventListener("click", () => {
      $("#description").value = b.dataset.label;
      $("#description").focus();
    }),
  );
}

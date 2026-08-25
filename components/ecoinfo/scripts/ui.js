/* Shared UI: header, nav, footer, toasts, small helpers. */

export const NAV_LINKS = [
  { href: "index.html", label: "Dashboard" },
  { href: "atmosphere.html", label: "Atmosphere" },
  { href: "classify.html", label: "AI Classifier" },
  { href: "report.html", label: "Report Dumping" },
  { href: "recycling.html", label: "Recycling" },
  { href: "schedule.html", label: "Schedule" },
  { href: "learn.html", label: "Learn" },
  { href: "community.html", label: "Community" },
];

const BRAND_SVG = `
<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
  <path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11Z" stroke="#f5f0e0" stroke-width="1.7" stroke-linejoin="round"/>
  <circle cx="12" cy="10" r="2.6" fill="#c9a84c"/>
</svg>`;

export function currentPage() {
  const file = location.pathname.split("/").pop();
  return !file || file === "" ? "index.html" : file;
}

export function mountChrome() {
  const nav = document.querySelector("#primary-nav");
  if (!nav) return;

  const toasts = document.createElement("div");
  toasts.className = "toast-wrap";
  toasts.id = "toast-wrap";
  document.body.append(toasts);
}

export function toast(message, kind = "ok", ms = 4200) {
  const wrap = document.getElementById("toast-wrap");
  if (!wrap) return alert(message);
  const el = document.createElement("div");
  el.className = `toast ${kind}`;
  el.setAttribute("role", "status");
  el.textContent = message;
  wrap.append(el);
  setTimeout(() => el.remove(), ms);
}

/* ---------- helpers ---------- */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined && v !== false) node.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    node.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return node;
}

export function escapeHtml(str = "") {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}

export const store = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(`eco:${key}`);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(`eco:${key}`, JSON.stringify(value));
    } catch { /* storage full or blocked */ }
  },
  remove(key) {
    try { localStorage.removeItem(`eco:${key}`); } catch { /* ignore */ }
  },
};

export function fmtDate(value, opts = { dateStyle: "medium", timeStyle: "short" }) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-NG", opts).format(d);
}

export function timeAgo(value) {
  const d = new Date(value);
  const diff = (Date.now() - d.getTime()) / 1000;
  const units = [
    ["year", 31536000], ["month", 2592000], ["day", 86400],
    ["hour", 3600], ["minute", 60], ["second", 1],
  ];
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  for (const [unit, secs] of units) {
    if (Math.abs(diff) >= secs || unit === "second") {
      return rtf.format(-Math.round(diff / secs), unit);
    }
  }
  return "";
}

export function haversineKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export async function loadJSON(path) {
  const res = await fetch(path, { cache: "no-cache" });
  if (!res.ok) throw new Error(`Could not load ${path}`);
  return res.json();
}

/** Resize an image File to a data URL (max edge px, JPEG). */
export function compressImage(file, maxEdge = 1280, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Unsupported image"));
      img.onload = () => {
        const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export function autoInit() {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountChrome, { once: true });
  } else {
    mountChrome();
  }
}

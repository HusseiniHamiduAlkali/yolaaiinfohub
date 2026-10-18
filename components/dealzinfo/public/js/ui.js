// Small DOM helpers used by every page.

import { directionArrow, formatSignedPercent, toCsv } from "./shared/format.js";

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (key === "html") node.innerHTML = value;
    else if (key.startsWith("on") && typeof value === "function") node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value === true ? "" : String(value));
  }
  for (const child of [].concat(children)) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

export const $ = (selector, scope = document) => scope.querySelector(selector);
export const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

export function clear(node) {
  while (node?.firstChild) node.removeChild(node.firstChild);
  return node;
}

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[c]);
}

export function toast(message, variant = "info") {
  let region = document.getElementById("toast-region");
  if (!region) {
    region = el("div", { id: "toast-region", role: "status", "aria-live": "polite" });
    document.body.append(region);
  }
  const node = el("div", { class: `toast ${variant === "error" ? "toast-error" : ""}`, text: message });
  region.append(node);
  setTimeout(() => node.remove(), 4500);
}

export function changeBadge(change, direction) {
  return el("span", {
    class: `badge badge-${direction}`,
    text: `${directionArrow(direction)} ${formatSignedPercent(change)}`,
  });
}

export function statusBadge(status) {
  const map = {
    VERIFIED: "badge-down",
    PENDING: "badge-warn",
    OUTDATED: "badge-warn",
    "COMMUNITY SUBMITTED": "badge-gold",
  };
  return el("span", { class: `badge ${map[status] ?? ""}`, text: status });
}

export function skeletons(container, count = 6) {
  clear(container);
  for (let i = 0; i < count; i++) container.append(el("div", { class: "skeleton" }));
}

export function emptyState(title, detail) {
  return el("div", { class: "empty" }, [el("p", { class: "strong", text: title }), detail && el("p", { class: "small", text: detail })]);
}

export function downloadCsv(filename, rows) {
  if (!rows.length) {
    toast("Nothing to export yet.", "error");
    return;
  }
  const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = el("a", { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function param(name, fallback = "") {
  return new URLSearchParams(window.location.search).get(name) ?? fallback;
}

export function setParams(patch) {
  const url = new URL(window.location.href);
  for (const [key, value] of Object.entries(patch)) {
    if (value === "" || value === null || value === undefined) url.searchParams.delete(key);
    else url.searchParams.set(key, value);
  }
  window.history.replaceState({}, "", url);
}

export function fillSelect(select, options, { placeholder, value } = {}) {
  clear(select);
  if (placeholder) select.append(el("option", { value: "all", text: placeholder }));
  for (const option of options) {
    select.append(el("option", { value: option.value, text: option.label }));
  }
  if (value) select.value = value;
}

export function tel(value) {
  return value ? el("a", { class: "button button-outline button-sm", href: `tel:${value}`, text: `Call ${value}` }) : null;
}

export function whatsapp(value) {
  if (!value) return null;
  const digits = String(value).replace(/[^\d]/g, "");
  return el("a", {
    class: "button button-outline button-sm",
    href: `https://wa.me/${digits}`,
    target: "_blank",
    rel: "noreferrer noopener",
    text: "WhatsApp",
  });
}

export function directions(lat, lng, label = "Get directions") {
  return el("a", {
    class: "button button-outline button-sm",
    href: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
    target: "_blank",
    rel: "noreferrer noopener",
    text: label,
  });
}

/** Font Awesome icon, e.g. icon("chart-line") or icon("whatsapp", "fab"). */
export function icon(name, style = "fas", extra = "") {
  return el("i", { class: `${style} fa-${name} ${extra}`.trim(), "aria-hidden": "true" });
}

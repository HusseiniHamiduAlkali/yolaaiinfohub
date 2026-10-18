// Formatting helpers shared by the browser pages and the Express server.

export function formatNaira(value, compact = false) {
  const n = Number(value) || 0;
  if (compact && n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}m`;
  if (compact && n >= 100_000) return `₦${Math.round(n / 1000)}k`;
  return `₦${n.toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
}

export function formatPercent(value) {
  return `${Math.abs(Number(value) || 0).toFixed(1)}%`;
}

export function formatSignedPercent(value) {
  const n = Number(value) || 0;
  if (Math.abs(n) < 0.05) return "0.0%";
  return `${n > 0 ? "+" : "−"}${Math.abs(n).toFixed(1)}%`;
}

export function directionOf(change) {
  if (change > 0.05) return "up";
  if (change < -0.05) return "down";
  return "flat";
}

export function directionLabel(direction) {
  if (direction === "up") return "Increased";
  if (direction === "down") return "Decreased";
  return "Unchanged";
}

export function directionArrow(direction) {
  if (direction === "up") return "↑";
  if (direction === "down") return "↓";
  return "→";
}

const dtf = new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", year: "numeric" });
const tf = new Intl.DateTimeFormat("en-NG", { hour: "numeric", minute: "2-digit" });

export function formatDate(iso) {
  if (!iso) return "—";
  return dtf.format(new Date(iso));
}

export function formatDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${dtf.format(d)}, ${tf.format(d)}`;
}

export function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function relativeDay(iso, now = new Date()) {
  if (!iso) return "—";
  const d = new Date(iso);
  const days = Math.floor((startOfDay(now).getTime() - startOfDay(d).getTime()) / 86_400_000);
  if (days <= 0) return `Today, ${tf.format(d)}`;
  if (days === 1) return `Yesterday, ${tf.format(d)}`;
  if (days < 7) return `${days} days ago`;
  return formatDate(iso);
}

export function daysBetween(a, b = new Date()) {
  return Math.floor((startOfDay(b).getTime() - startOfDay(new Date(a)).getTime()) / 86_400_000);
}

export function toCsv(rows) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v) => {
    const s = v === undefined || v === null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
}

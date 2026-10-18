// Per-visitor preferences kept in the browser: theme, watchlist, alert settings.

const THEME_KEY = "dealzinfo.theme";
const WATCH_KEY = "dealzinfo.watchlist.v1";
const PREFS_KEY = "dealzinfo.alertprefs.v1";

const DEFAULT_WATCH = { commodities: [], markets: [], businesses: [], pairs: [] };
const DEFAULT_PREFS = {
  inApp: true,
  email: false,
  sms: false,
  whatsapp: false,
  bigMoves: true,
  newUpdates: true,
  staleData: true,
  watchlistOnly: false,
  emailAddress: "",
  phone: "",
};

function read(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return structuredClone(fallback);
    return { ...structuredClone(fallback), ...JSON.parse(raw) };
  } catch {
    return structuredClone(fallback);
  }
}

function write(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage blocked — keep working in memory */
  }
}

/* --------------------------------- theme ---------------------------------- */

export function applyStoredTheme() {
  let dark = false;
  try {
    const stored = window.localStorage.getItem(THEME_KEY);
    dark = stored === "dark";
  } catch {
    dark = false;
  }
  document.documentElement.classList.toggle("dark", dark);
  return dark;
}

export function toggleTheme() {
  const dark = !document.documentElement.classList.contains("dark");
  document.documentElement.classList.toggle("dark", dark);
  try {
    window.localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
  } catch {
    /* ignore */
  }
  return dark;
}

/* ------------------------------- watchlist -------------------------------- */

export function getWatchlist() {
  return read(WATCH_KEY, DEFAULT_WATCH);
}

export function isWatched(kind, id) {
  return getWatchlist()[kind]?.includes(id) ?? false;
}

export function toggleWatch(kind, id) {
  const list = getWatchlist();
  const items = list[kind] ?? [];
  const index = items.indexOf(id);
  if (index >= 0) items.splice(index, 1);
  else items.push(id);
  list[kind] = items;
  write(WATCH_KEY, list);
  return index < 0;
}

export const pairKey = (commodityId, marketId) => `${commodityId}:${marketId}`;

/* ---------------------------- alert preferences --------------------------- */

export function getAlertPrefs() {
  return read(PREFS_KEY, DEFAULT_PREFS);
}

export function saveAlertPrefs(patch) {
  const next = { ...getAlertPrefs(), ...patch };
  write(PREFS_KEY, next);
  return next;
}

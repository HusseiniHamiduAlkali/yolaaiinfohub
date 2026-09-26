/* EcoInfo has its own API process; the Yola account API runs on a separate port. */
const host = typeof window !== "undefined" ? window.location.hostname || "localhost" : "localhost";
const localApi = `http://${host}:4002`;

export const API_BASE = typeof window !== "undefined"
  ? window.ECOINFO_API_BASE || window.ECOINFO_BACKEND_URL || localApi
  : localApi;

export let backendOnline = null; // null = unknown, true/false once probed

async function request(path, { method = "GET", body, headers = {}, timeout = 15000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      credentials: "include",
      signal: ctrl.signal,
      headers: body instanceof FormData ? headers : { "Content-Type": "application/json", ...headers },
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    const data = text ? safeJson(text) : null;
    if (!res.ok) {
      const message = (data && (data.error || data.message)) || `Request failed (${res.status})`;
      throw Object.assign(new Error(message), { status: res.status, data });
    }
    backendOnline = true;
    return data;
  } catch (err) {
    if (err.name === "AbortError") throw new Error("The server took too long to respond.");
    if (err instanceof TypeError) {
      backendOnline = false;
      throw Object.assign(new Error("Backend is offline — running in local/offline mode."), {
        offline: true,
      });
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function safeJson(text) {
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

export const api = {
  health: () => request("/api/health"),

  classify: (payload) => request("/api/classify", { method: "POST", body: payload, timeout: 60000 }),

  createReport: (formData) => request("/api/reports", { method: "POST", body: formData, timeout: 60000 }),
  listReports: (params = {}) => request(`/api/reports?${new URLSearchParams(params)}`),
  trackReport: (code) => request(`/api/reports/${encodeURIComponent(code)}`),

  login: (email, password) => request("/api/auth/login", { method: "POST", body: { email, password } }),
  logout: () => request("/api/auth/logout", { method: "POST" }),
  me: () => request("/api/auth/me"),

  adminReports: (params = {}) => request(`/api/admin/reports?${new URLSearchParams(params)}`),
  updateReport: (id, patch) => request(`/api/admin/reports/${id}`, { method: "PATCH", body: patch }),
  adminStats: () => request("/api/admin/stats"),
  publishAlert: (payload) => request("/api/admin/alerts", { method: "POST", body: payload }),

  centres: () => request("/api/centres"),
  schedule: () => request("/api/schedule"),
  leaderboard: () => request("/api/leaderboard"),
  alerts: () => request("/api/alerts"),
  wasteLog: {
    list: () => request("/api/waste-log"),
    add: (payload) => request("/api/waste-log", { method: "POST", body: payload }),
  },
};

/** Try the backend, fall back to bundled JSON when it is not running. */
export async function withFallback(fn, fallbackPath) {
  try {
    return { data: await fn(), source: "server" };
  } catch (err) {
    if (!fallbackPath) throw err;
    const res = await fetch(fallbackPath, { cache: "no-cache" });
    if (!res.ok) throw err;
    return { data: await res.json(), source: "local" };
  }
}

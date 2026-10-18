// Thin fetch wrapper around the Express JSON API.

function apiBase() {
  return window.getApiBase?.() || window.API_BASE || window.location.origin;
}

async function request(path, options = {}) {
  const response = await fetch(`${apiBase()}${path}`, {
    credentials: "include",
    headers: options.body ? { "Content-Type": "application/json" } : {},
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  let payload = null;
  const text = await response.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }
  if (!response.ok) {
    const error = new Error(payload?.error || `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return payload;
}

export const api = {
  bootstrap: () => request("/api/dealz/bootstrap"),
  markets: () => request("/api/dealz/markets"),
  market: (id) => request(`/api/dealz/markets/${encodeURIComponent(id)}`),
  commodities: () => request("/api/dealz/commodities"),
  quotes: () => request("/api/dealz/quotes"),
  prices: (params = {}) => request(`/api/dealz/prices?${new URLSearchParams(params)}`),
  compare: (commodityId) => request(`/api/dealz/compare/${encodeURIComponent(commodityId)}`),
  trends: (params) => request(`/api/dealz/trends?${new URLSearchParams(params)}`),
  businesses: () => request("/api/dealz/businesses"),
  business: (id) => request(`/api/dealz/businesses/${encodeURIComponent(id)}`),
  announcements: () => request("/api/dealz/announcements"),
  submit: (body) => request("/api/dealz/submissions", { method: "POST", body }),

  auth: {
    me: () => request("/api/me"),
    logout: () => request("/api/logout", { method: "POST" }),
  },

  admin: {
    overview: () => request("/api/dealz/admin/overview"),
    submissions: () => request("/api/dealz/admin/submissions"),
    moderate: (id, body) => request(`/api/dealz/admin/submissions/${id}`, { method: "PATCH", body }),
    addPrice: (body) => request("/api/dealz/admin/prices", { method: "POST", body }),
    deletePrice: (id) => request(`/api/dealz/admin/prices/${id}`, { method: "DELETE" }),
    saveMarket: (body) => request("/api/dealz/admin/markets", { method: "POST", body }),
    deleteMarket: (id) => request(`/api/dealz/admin/markets/${id}`, { method: "DELETE" }),
    saveCommodity: (body) => request("/api/dealz/admin/commodities", { method: "POST", body }),
    businesses: () => request("/api/dealz/admin/businesses"),
    updateBusiness: (id, body) => request(`/api/dealz/admin/businesses/${id}`, { method: "PATCH", body }),
    deleteBusiness: (id) => request(`/api/dealz/admin/businesses/${id}`, { method: "DELETE" }),
    featured: () => request("/api/dealz/admin/featured"),
    toggleFeatured: (kind, id) => request("/api/dealz/admin/featured/toggle", { method: "POST", body: { kind, id } }),
    saveAnnouncement: (body) => request("/api/dealz/admin/announcements", { method: "POST", body }),
    deleteAnnouncement: (id) => request(`/api/dealz/admin/announcements/${id}`, { method: "DELETE" }),
  },
};

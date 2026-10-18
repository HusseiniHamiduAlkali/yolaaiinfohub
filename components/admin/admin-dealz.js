import { api } from "../dealzinfo/public/js/api.js";
import { formatDateTime, formatNaira } from "../dealzinfo/public/js/shared/format.js";
import { $, clear, el, emptyState, toast } from "../dealzinfo/public/js/ui.js";

const app = $("#app");
const status = $("#admin-status");
let user = null;
let ref = { commodities: [], markets: [] };
let tab = "submissions";

const TABS = [
  ["submissions", "Submissions"],
  ["prices", "Prices"],
  ["businesses", "Businesses"],
  ["featured", "Featured"],
  ["announcements", "Announcements"],
];

const btn = (label, onclick, cls = "button-outline") => el("button", { class: `button button-sm ${cls}`, type: "button", text: label, onclick });
const input = (name, label, attrs = {}) => el("label", { class: "dealz-admin-field", for: `a-${name}` }, [label, el("input", { id: `a-${name}`, name, type: "text", ...attrs })]);
const selectField = (name, label, options) => el("label", { class: "dealz-admin-field", for: `a-${name}` }, [label, el("select", { id: `a-${name}`, name }, options.map(([v, l]) => el("option", { value: v, text: l })))]);

function setStatus(message, type = "") {
  status.textContent = message;
  status.className = `status ${type}`.trim();
}

async function run(action, success) {
  try {
    await action();
    if (success) toast(success);
    await renderTab();
  } catch (error) {
    toast(error.message, "error");
    if (error.status === 401) init();
  }
}

/* --------------------------------- login ---------------------------------- */

function renderLogin() {
  clear(app);
  app.append(el("section", { class: "panel dealz-admin-record" }, [
    el("h2", { text: "Administrator sign-in required" }),
    el("p", { text: "Sign in with your existing Yola AI Info Hub administrator account. DealzInfo does not have a separate login." }),
    el("a", { class: "button", href: "/pages/auth.html#signin", text: "Sign in to Yola AI Info Hub" }),
  ]));
}

function renderAccessDenied() {
  clear(app);
  app.append(el("section", { class: "panel dealz-admin-record" }, [
    el("h2", { text: "Administrator access required" }),
    el("p", { text: `You are signed in as ${user.name || user.username}, but this account does not have administrator access.` }),
    el("a", { class: "button button-outline", href: "/pages/auth.html#signin", text: "Switch account" }),
  ]));
}

/* ------------------------------- dashboard -------------------------------- */

async function renderDashboard() {
  clear(app);
  ref = { commodities: await api.commodities(), markets: await api.markets() };
  const tabs = el("div", { class: "dealz-admin-tabs", role: "tablist", "aria-label": "DealzInfo administration" });
  TABS.forEach(([key, label]) =>
    tabs.append(el("button", {
      class: "dealz-admin-tab",
      role: "tab",
      "aria-selected": String(key === tab),
      text: label,
      onclick: async () => {
        tab = key;
        try {
          await renderDashboard();
        } catch (error) {
          setStatus(error.message, "error");
        }
      },
    })),
  );
  app.append(
    el("div", { class: "panel panel-heading dealz-admin-toolbar" }, [
      el("p", { text: `Signed in as ${user.name || user.username} (${user.role})` }),
      btn("Sign out", async () => { await api.auth.logout(); user = null; renderLogin(); }),
    ]),
    el("div", { class: "dealz-admin-stats", id: "admin-stats" }),
    tabs,
    el("div", { id: "panel", class: "dealz-admin-panels" }),
  );
  const o = await api.admin.overview();
  const stat = (l, v) => el("article", { class: "dealz-admin-stat" }, [el("span", { text: l }), el("strong", { text: String(v) })]);
  $("#admin-stats").append(stat("Pending submissions", o.pending), stat("Price records", o.stats.records), stat("Markets", o.stats.markets), stat("Unapproved businesses", o.unapprovedBusinesses));
  await renderTab();
}

async function renderTab() {
  const panel = clear($("#panel"));
  if (!panel) return;
  const name = (list, id) => list.find((x) => x.id === id)?.name ?? id;

  if (tab === "submissions") {
    const subs = await api.admin.submissions();
    if (!subs.length) return panel.append(emptyState("No submissions yet"));
    for (const s of subs) {
      const p = s.payload ?? {};
      const summary =
        s.kind === "price" ? `${name(ref.commodities, p.commodityId)} at ${name(ref.markets, p.marketId)}: ${formatNaira(p.price)} / ${p.unit}` : s.kind === "business" ? `${p.name} (${p.category ?? "Other"})` : s.note;
      const note = el("input", { class: "dealz-admin-note", type: "text", placeholder: "Note to contributor (optional)", value: s.moderatorNote ?? "", "aria-label": "Moderator note" });
      const act = (status, label) => btn(label, () => run(() => api.admin.moderate(s.id, { status, moderatorNote: note.value }), `Marked ${status}`), status === "approved" ? "" : status === "rejected" ? "button-danger" : "button-outline");
      panel.append(
        el("article", { class: "panel dealz-admin-record" }, [
          el("div", { class: "dealz-admin-record-head" }, [el("span", { class: "dealz-admin-badge", text: s.kind.toUpperCase() }), el("span", { class: `dealz-admin-badge ${s.status === "pending" ? "is-pending" : ""}`, text: s.status })]),
          el("p", { class: "strong", text: summary }),
          el("p", { class: "small muted", text: `${s.submittedBy}${s.contact ? ` · ${s.contact}` : ""} · ${formatDateTime(s.createdAt)}` }),
          s.note && s.kind !== "correction" && el("p", { class: "small", text: s.note }),
          note,
          el("div", { class: "dealz-admin-actions" }, [act("approved", "Approve"), act("clarification", "Ask for clarification"), act("rejected", "Reject")]),
        ]),
      );
    }
  }

  if (tab === "prices") {
    const form = el("form", { class: "panel dealz-admin-form" }, [
      el("h2", { text: "Add a price" }),
      el("div", { class: "dealz-admin-fields" }, [
        selectField("commodityId", "Commodity", ref.commodities.map((c) => [c.id, c.name])),
        selectField("marketId", "Market", ref.markets.map((m) => [m.id, m.name])),
        input("unit", "Unit", { value: "kg", required: true }),
        input("price", "Price (₦)", { type: "number", min: "1", required: true }),
        selectField("status", "Status", [["VERIFIED", "Verified"], ["PENDING", "Pending"], ["OUTDATED", "Outdated"]]),
        input("source", "Source", { value: "Market survey" }),
      ]),
      el("div", { class: "form-actions" }, [el("button", { class: "button button-primary", type: "submit", text: "Save price" })]),
    ]);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = Object.fromEntries(new FormData(form));
      run(() => api.admin.addPrice({ ...fd, price: Number(fd.price) }), "Price saved");
    });
    const recent = await api.prices({ limit: 30 });
    const body = el("tbody");
    recent.items.forEach((p) =>
      body.append(el("tr", {}, [
        el("td", { text: formatDateTime(p.date) }),
        el("td", { text: name(ref.commodities, p.commodityId) }),
        el("td", { text: name(ref.markets, p.marketId) }),
        el("td", { class: "num", text: formatNaira(p.price) }),
        el("td", {}, [btn("Delete", () => confirm("Delete this price record?") && run(() => api.admin.deletePrice(p.id), "Deleted"), "button-danger")]),
      ])),
    );
    panel.append(form, el("h2", { text: "Latest records" }), el("div", { class: "dealz-admin-table-wrap" }, [el("table", {}, [el("thead", {}, [el("tr", {}, ["Date", "Commodity", "Market", "Price", ""].map((h) => el("th", { scope: "col", text: h })))]), body])]));
  }

  if (tab === "businesses") {
    const list = await api.admin.businesses();
    list.forEach((b) =>
      panel.append(el("article", { class: "panel dealz-admin-record" }, [
        el("div", {}, [el("p", { class: "strong", text: b.name }), el("p", { class: "small muted", text: `${b.category} · ${b.area} · ${b.approved ? "Approved" : "Awaiting approval"}${b.verified ? " · Verified" : ""}` })]),
        el("div", { class: "dealz-admin-actions" }, [
          btn(b.approved ? "Unpublish" : "Approve", () => run(() => api.admin.updateBusiness(b.id, { approved: !b.approved }), "Updated")),
          btn(b.verified ? "Remove verified" : "Mark verified", () => run(() => api.admin.updateBusiness(b.id, { verified: !b.verified }), "Updated")),
          user.role === "admin" && btn("Delete", () => confirm(`Delete ${b.name}?`) && run(() => api.admin.deleteBusiness(b.id), "Deleted"), "button-danger"),
        ]),
      ])),
    );
  }

  if (tab === "featured") {
    const [f, businesses] = await Promise.all([api.admin.featured(), api.admin.businesses()]);
    const group = (title, kind, items, chosen) =>
      el("section", { class: "panel dealz-admin-record" }, [el("h2", { text: title }), el("div", { class: "dealz-admin-actions" }, items.map((x) => el("button", { class: "dealz-admin-toggle", type: "button", "aria-pressed": String(chosen.includes(x.id)), text: x.name, onclick: () => run(() => api.admin.toggleFeatured(kind, x.id)) })))]);
    panel.append(group("Featured markets", "market", ref.markets, f.markets), group("Featured businesses", "business", businesses.filter((b) => b.approved), f.businesses));
  }

  if (tab === "announcements") {
    const form = el("form", { class: "panel dealz-admin-form" }, [
      el("h2", { text: "Publish a notice" }),
      el("div", { class: "dealz-admin-fields" }, [input("title", "Title", { required: true }), selectField("kind", "Type", [["announcement", "Announcement"], ["notice", "Notice"], ["alert", "Alert"]])]),
      el("label", { class: "dealz-admin-field" }, ["Message", el("textarea", { id: "a-body", name: "body" })]),
      el("label", { class: "dealz-admin-featured" }, [el("input", { type: "checkbox", id: "a-featured", name: "featured" }), "Feature on overview"]),
      el("div", { class: "form-actions" }, [el("button", { class: "button button-primary", type: "submit", text: "Publish" })]),
    ]);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      run(() => api.admin.saveAnnouncement({ title: fd.get("title"), kind: fd.get("kind"), body: fd.get("body"), featured: fd.has("featured") }), "Published");
    });
    panel.append(form);
    (await api.announcements()).forEach((a) =>
      panel.append(el("article", { class: "panel dealz-admin-record" }, [el("div", {}, [el("p", { class: "strong", text: a.title }), el("p", { class: "small muted", text: `${a.kind} · ${formatDateTime(a.createdAt)}` })]), btn("Delete", () => confirm("Delete this notice?") && run(() => api.admin.deleteAnnouncement(a.id), "Deleted"), "button-danger")])),
    );
  }

  return undefined;
}

async function init() {
  try {
    const session = await api.auth.me();
    user = session.loggedIn ? session : null;
  } catch (error) {
    clear(app);
    setStatus(`Could not verify your Yola AI Info Hub sign-in: ${error.message}`, "error");
    return;
  }
  if (user && !["admin", "content-admin"].includes(user.role)) return renderAccessDenied();
  if (!user) return renderLogin();
  try {
    await renderDashboard();
  } catch (error) {
    setStatus(`Could not load DealzInfo administration: ${error.message}`, "error");
  }
}

init();

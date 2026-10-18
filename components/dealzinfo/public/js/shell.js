// Injects the shared header, navigation and footer into every page,
// and decorates headings, buttons, tabs and notices with Font Awesome icons.

import { applyStoredTheme, toggleTheme } from "./local.js";
import { el, icon } from "./ui.js";

applyStoredTheme();

const NAV = [
  { href: "index.html", label: "Overview", icon: "gauge-high", sub: "Today's market pulse across Yola at a glance." },
  { href: "prices.html", label: "Prices", icon: "basket-shopping", sub: "Latest commodity prices from every market." },
  { href: "compare.html", label: "Compare", icon: "scale-balanced", sub: "Find the cheapest market for what you need." },
  { href: "trends.html", label: "Trends", icon: "chart-line", sub: "See how prices have moved over time." },
  { href: "markets.html", label: "Markets", icon: "store", sub: "Every market in Yola and greater Adamawa." },
  { href: "map.html", label: "Map", icon: "map-location-dot", sub: "Markets and businesses near you." },
  { href: "businesses.html", label: "Businesses", icon: "building", sub: "Trusted local businesses and traders." },
  { href: "alerts.html", label: "Alerts", icon: "bell", sub: "Big price moves and updates worth knowing." },
  { href: "watchlist.html", label: "My Watchlist", icon: "star", sub: "The items and places you follow." },
  { href: "history.html", label: "Price History", icon: "clock-rotate-left", sub: "Full record of past prices." },
  { href: "currency.html", label: "Currency", icon: "coins", sub: "Convert between currencies live." },
  { href: "submit.html", label: "Submit Data", icon: "paper-plane", sub: "Share a price, list a business or report a problem." },
  { href: "/components/admin/admin-dealz.html", label: "Admin", icon: "shield-halved", sub: "Manage markets, prices and submissions." },
];
const EXTRA = {
  "/market.html": { icon: "store", sub: "Market details, prices and directions." },
  "/business.html": { icon: "building", sub: "Business details and contacts." },
  "/404.html": { icon: "triangle-exclamation", sub: "We couldn't find that page." },
};

function currentPath() {
  const path = window.location.pathname;
  if (path === "/" || path === "") return "/index.html";
  if (!path.endsWith(".html")) return `${path}.html`;
  return path;
}

function buildHeader() {
  const path = currentPath();
  const active = (href) => {
    if (href === path) return "page";
    if (href === "/markets.html" && path === "/market.html") return "page";
    if (href === "/businesses.html" && path === "/business.html") return "page";
    return null;
  };

  const nav = el("nav", { class: "site-nav", "data-open": "false", "aria-label": "DealzInfo sections" }, [
    el(
      "ul",
      {},
      NAV.map((item) =>
        el("li", {}, [
          el("a", { href: item.href, "aria-current": active(item.href) }, [icon(item.icon), el("span", { text: item.label })]),
        ]),
      ),
    ),
  ]);

  const navToggle = el("button", {
    class: "icon-button nav-toggle",
    type: "button",
    "aria-expanded": "false",
    "aria-label": "Show sections menu",
    onclick: () => {
      const open = nav.getAttribute("data-open") === "true";
      nav.setAttribute("data-open", open ? "false" : "true");
      navToggle.setAttribute("aria-expanded", open ? "false" : "true");
      navToggle.replaceChildren(icon(open ? "bars" : "xmark"));
    },
  }, [icon("bars")]);

  const themeIcon = () => icon(document.documentElement.classList.contains("dark") ? "sun" : "moon");
  const themeButton = el("button", {
    class: "icon-button",
    type: "button",
    "aria-label": "Switch between light and dark mode",
    onclick: () => {
      toggleTheme();
      themeButton.replaceChildren(themeIcon());
    },
  }, [themeIcon()]);

  return el("header", { class: "site-header" }, [
    el("div", { class: "wrap" }, [
      el("div", { class: "header-bar" }, [
        el("a", { class: "brand", href: "index.html" }, [
          el("span", { class: "brand-mark", "aria-hidden": "true" }, [icon("chart-column")]),
          el("span", { class: "brand-text" }, [
            el("strong", { text: "DealzInfo" }),
            el("span", {}, [icon("location-dot"), " Yola Market Pulse"]),
          ]),
        ]),
        el("div", { class: "header-actions" }, [
          el("a", { class: "button button-gold button-sm", href: "submit.html" }, [icon("plus"), el("span", { class: "hide-xs", text: "Submit data" })]),
          themeButton,
          navToggle,
        ]),
      ]),
    ]),
    el("div", { class: "wrap" }, [nav]),
  ]);
}

function buildFooter() {
  const year = new Date().getFullYear();
  const link = (href, ic, text) => el("li", {}, [el("a", { href }, [icon(ic), el("span", { text })])]);
  return el("footer", { class: "site-footer" }, [
    el("div", { class: "wrap" }, [
      el("div", { class: "footer-grid" }, [
        el("div", {}, [
          el("h3", {}, [icon("chart-column"), " DealzInfo — Yola Market Pulse"]),
          el("p", { class: "small", text: "Commodity prices, market comparison and a local business directory for Yola and greater Adamawa." }),
          el("p", { class: "small footer-tag" }, [icon("circle-check"), " Know the price. Find the market. Make the better deal."]),
        ]),
        el("div", {}, [el("h3", {}, [icon("compass"), " Explore"]), el("ul", {}, NAV.slice(1, 7).map((i) => link(i.href, i.icon, i.label)))]),
        el("div", {}, [
          el("h3", {}, [icon("hand-holding-heart"), " Contribute"]),
          el("ul", {}, [
            link("submit.html", "tag", "Report a price"),
            link("submit.html?tab=business", "store", "List your business"),
            link("submit.html?tab=correction", "flag", "Report a problem"),
            link("/components/admin/admin-dealz.html", "shield-halved", "Dealz Admin"),
          ]),
        ]),
      ]),
      el("div", { class: "footer-bottom" }, [
        el("p", {}, [icon("circle-info"), ` © ${year} DealzInfo. Prices are collected from market surveys and community reports — always confirm at the market before trading.`]),
      ]),
    ]),
  ]);
}

document.getElementById("site-header")?.replaceWith(buildHeader());
document.getElementById("site-footer")?.replaceWith(buildFooter());

/* --------------------------- automatic icon polish -------------------------- */

const BUTTON_ICONS = [
  [/sign ?in|log ?in/i, "right-to-bracket"], [/sign ?out|log ?out/i, "right-from-bracket"],
  [/search/i, "magnifying-glass"], [/filter/i, "filter"], [/export|csv|download/i, "file-arrow-down"],
  [/approve/i, "check"], [/reject/i, "xmark"], [/delete|remove/i, "trash-can"],
  [/save|update/i, "floppy-disk"], [/submit|send/i, "paper-plane"], [/add|new/i, "plus"],
  [/edit/i, "pen-to-square"], [/reset|clear/i, "rotate-left"], [/watch|follow/i, "star"],
  [/call/i, "phone"], [/whatsapp/i, "whatsapp", "fab"], [/direction/i, "diamond-turn-right"],
  [/compare/i, "scale-balanced"], [/trend|chart/i, "chart-line"], [/view|open|details|see/i, "arrow-right"],
  [/feature/i, "award"], [/password/i, "key"], [/swap/i, "right-left"], [/copy/i, "copy"],
  [/cancel|close/i, "xmark"], [/map/i, "map-location-dot"], [/price/i, "tag"], [/market/i, "store"],
];
const HEADING_ICONS = [
  [/price/i, "tag"], [/alert/i, "bell"], [/market/i, "store"], [/business/i, "building"],
  [/notice|announce/i, "bullhorn"], [/trend|chart|move/i, "chart-line"], [/compare|cheap/i, "scale-balanced"],
  [/watch/i, "star"], [/history|recent/i, "clock-rotate-left"], [/submission|moderat/i, "inbox"],
  [/user|account|team/i, "users"], [/currenc|rate|exchange/i, "coins"], [/feature/i, "award"],
  [/map|near|location/i, "map-location-dot"], [/setting|prefer/i, "sliders"], [/summary|stat|overview/i, "chart-pie"],
];
const STAT_ICONS = [
  [/market/i, "store"], [/commodit|item/i, "basket-shopping"], [/business/i, "building"], [/alert/i, "bell"],
  [/update|record|price/i, "tag"], [/rise|up/i, "arrow-trend-up"], [/fall|down/i, "arrow-trend-down"],
];
const pick = (list, text) => list.find(([re]) => re.test(text));
const has = (node) => node.querySelector(":scope > i.fas, :scope > i.fab, :scope > i.far, :scope > svg, :scope > img");

function decorateTitle() {
  const path = currentPath();
  const meta = NAV.find((n) => n.href === path) ?? EXTRA[path];
  const h1 = document.querySelector("main h1");
  if (!meta || !h1 || h1.dataset.decorated) return;
  h1.dataset.decorated = "1";
  h1.classList.add("page-title");
  h1.prepend(el("span", { class: "title-badge" }, [icon(meta.icon)]));
  const next = h1.nextElementSibling;
  if (!next || next.tagName !== "P") h1.after(el("p", { class: "page-sub" }, [icon("circle-info"), " ", meta.sub]));
}

function decorate(root) {
  root.querySelectorAll("main .button, main button").forEach((b) => {
    if (b.dataset.ic || has(b) || b.classList.contains("chip") || b.classList.contains("icon-button")) return;
    b.dataset.ic = "1";
    const text = b.textContent.trim();
    const match = text && pick(BUTTON_ICONS, text);
    if (match) b.prepend(icon(match[1], match[2] ?? "fas"), " ");
  });
  root.querySelectorAll("main .tab").forEach((t) => {
    if (t.dataset.ic || has(t)) return;
    t.dataset.ic = "1";
    const m = pick(HEADING_ICONS, t.textContent) ?? [0, "circle"];
    t.prepend(icon(m[1]), " ");
  });
  root.querySelectorAll("main h2, main .card-head h3").forEach((h) => {
    if (h.dataset.ic || has(h)) return;
    h.dataset.ic = "1";
    const m = pick(HEADING_ICONS, h.textContent);
    if (m) h.prepend(el("span", { class: "head-icon" }, [icon(m[1])]));
  });
  root.querySelectorAll("main .stat .label").forEach((l) => {
    if (l.dataset.ic) return;
    l.dataset.ic = "1";
    const m = pick(STAT_ICONS, l.textContent) ?? [0, "chart-simple"];
    l.prepend(icon(m[1]), " ");
  });
  root.querySelectorAll("main .empty").forEach((e) => {
    if (e.dataset.ic) return;
    e.dataset.ic = "1";
    e.prepend(el("div", { class: "empty-icon" }, [icon("box-open")]));
  });
  root.querySelectorAll("main .notice").forEach((n) => {
    if (n.dataset.ic || has(n)) return;
    n.dataset.ic = "1";
    const ic = n.classList.contains("notice-error") ? "circle-exclamation" : n.classList.contains("notice-success") ? "circle-check" : "circle-info";
    n.prepend(icon(ic, "fas", "notice-icon"), " ");
  });
  root.querySelectorAll('main a[href^="tel:"], main a[href*="wa.me"], main a[href*="maps"]').forEach((a) => {
    if (a.dataset.ic || has(a)) return;
    a.dataset.ic = "1";
    const href = a.getAttribute("href");
    a.prepend(href.startsWith("tel:") ? icon("phone") : href.includes("wa.me") ? icon("whatsapp", "fab") : icon("diamond-turn-right"), " ");
  });
  root.querySelectorAll("main .badge-up, main .badge-down, main .badge-flat").forEach((b) => {
    if (b.dataset.ic) return;
    b.dataset.ic = "1";
    b.textContent = b.textContent.replace(/^[▲▼▶■●↑↓→–—\s]+/, "");
    b.prepend(icon(b.classList.contains("badge-up") ? "arrow-trend-up" : b.classList.contains("badge-down") ? "arrow-trend-down" : "minus"), " ");
  });
  root.querySelectorAll("main input[type=search], main input[type=email], main input[type=password]").forEach((i) => {
    if (i.dataset.ic || i.parentElement?.classList.contains("input-icon")) return;
    i.dataset.ic = "1";
    const wrap = el("span", { class: "input-icon" });
    i.replaceWith(wrap);
    wrap.append(icon(i.type === "search" ? "magnifying-glass" : i.type === "email" ? "envelope" : "lock"), i);
  });
}

let queued = false;
const run = () => {
  queued = false;
  observer.disconnect();
  decorateTitle();
  decorate(document);
  observer.observe(document.body, { childList: true, subtree: true });
};
const observer = new MutationObserver(() => {
  if (!queued) {
    queued = true;
    requestAnimationFrame(run);
  }
});
run();

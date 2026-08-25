
function initServiFilters() {
  "use strict";

  var PREVIEW_COUNT = 3;

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  };

  var directory = $("#directory");
  if (!directory || directory.getAttribute("data-servi-filters-init") === "true") return false;
  directory.setAttribute("data-servi-filters-init", "true");

  var chips = $$(".chip-rail .chip", directory);
  var groups = $$(".section3[data-category]", directory);
  var resultCount = $("#resultCount");
  var noResults = $("#noResults");
  var emptyState = $("#emptyState");

  var qInput = $("#qInput");
  var qInputM = $("#qInputM");
  var areaSelect = $("#areaSelect");
  var areaSelectM = $("#areaSelectM");
  var sortSelect = $("#sortSelect");
  var ratingSelect = $("#ratingSelect");
  var openOnly = $("#openOnly");
  var verifiedOnly = $("#verifiedOnly");

  var reduceMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var state = { q: "", area: "All", category: "All" };
  var expanded = {}; // group index -> true when "See all" is open

  /* ---------- read a card into a plain record ---------- */
  function readCard(el, group) {
    var d = el.dataset;
    var text = [
      d.name || "",
      d.role || "",
      d.tags || "",
      d.area || "",
      group.category,
      group.title,
      el.textContent || ""
    ].join(" ").toLowerCase();

    return {
      el: el,
      group: group,
      name: (d.name || "").toLowerCase(),
      area: d.area || "",
      rating: parseFloat(d.rating || "0") || 0,
      reviews: parseInt(d.reviews || "0", 10) || 0,
      exp: parseInt(d.exp || "0", 10) || 0,
      verified: d.verified === "true",
      open: d.open === "true",
      added: parseInt(d.added || "0", 10) || 0,
      text: text
    };
  }

  var model = groups.map(function (groupEl, i) {
    var titleEl = $(".section3-title", groupEl);
    var group = {
      el: groupEl,
      index: i,
      category: groupEl.getAttribute("data-category") || "",
      title: titleEl ? titleEl.textContent.trim() : "",
      container: $(".section4-container", groupEl),
      seeAll: $(".see-all", groupEl),
      cards: []
    };
    group.cards = $$(".pro-card, .section4", groupEl).map(function (el) {
      return readCard(el, group);
    });
    return group;
  });

  /* ---------- filtering ---------- */
  function matches(card) {
    if (state.category !== "All" && card.group.category !== state.category) return false;
    if (state.q && card.text.indexOf(state.q) === -1) return false;
    if (state.area !== "All" && card.area && card.area !== state.area) return false;

    var minRating = ratingSelect ? parseFloat(ratingSelect.value) || 0 : 0;
    if (minRating && card.rating < minRating) return false;
    if (openOnly && openOnly.checked && !card.open) return false;
    if (verifiedOnly && verifiedOnly.checked && !card.verified) return false;
    return true;
  }

  function comparator() {
    var mode = sortSelect ? sortSelect.value : "rating";
    switch (mode) {
      case "reviews":
        return function (a, b) { return b.reviews - a.reviews; };
      case "experience":
        return function (a, b) { return b.exp - a.exp; };
      case "newest":
        return function (a, b) { return b.added - a.added; };
      case "name":
        return function (a, b) { return a.name.localeCompare(b.name); };
      default:
        return function (a, b) {
          return b.rating - a.rating || b.reviews - a.reviews;
        };
    }
  }

  function show(el) {
    el.hidden = false;
    el.classList.remove("hiding");
    if (reduceMotion) {
      el.classList.add("in", "showing");
    } else {
      requestAnimationFrame(function () { el.classList.add("in", "showing"); });
    }
  }

  function hide(el) {
    el.classList.remove("in", "showing");
    el.classList.add("hiding");
    el.hidden = true;
  }

  function apply() {
    var sorter = comparator();
    var total = 0;
    var showingAllCategories = state.category === "All";

    model.forEach(function (group) {
      var visible = group.cards.filter(matches);
      visible.sort(sorter);
      total += visible.length;

      // reorder in the DOM
      if (group.container) {
        visible.forEach(function (card) { group.container.appendChild(card.el); });
      }

      var collapsed = showingAllCategories && !expanded[group.index];
      var limit = collapsed ? PREVIEW_COUNT : visible.length;
      var hiddenOverflow = 0;

      group.cards.forEach(function (card) {
        var rank = visible.indexOf(card);
        if (visible.indexOf(card) === -1 || rank === -1 || rank >= limit) {
          hide(card.el);
          if (visible.indexOf(card) !== -1 && rank >= limit) hiddenOverflow += 1;
        } else {
          show(card.el);
        }
      });

      if (group.seeAll) {
        if (showingAllCategories && hiddenOverflow > 0) {
          group.seeAll.hidden = false;
          group.seeAll.textContent = expanded[group.index]
            ? "Show less"
            : "See all (" + visible.length + ")";
          group.seeAll.setAttribute("aria-expanded", expanded[group.index] ? "true" : "false");
        } else {
          group.seeAll.hidden = true;
        }
      }

      group.el.hidden = visible.length === 0;
    });

    if (resultCount) {
      resultCount.innerHTML =
        "<strong>" + total + "</strong> " + (total === 1 ? "result" : "results");
    }
    if (noResults) noResults.hidden = total !== 0;
    if (emptyState) emptyState.hidden = total !== 0;
  }

  /* ---------- controls ---------- */
  function setQuery(value, source) {
    state.q = (value || "").trim().toLowerCase();
    if (qInput && source !== qInput) qInput.value = value;
    if (qInputM && source !== qInputM) qInputM.value = value;
    apply();
  }

  function setArea(value, source) {
    state.area = value || "All";
    if (areaSelect && source !== areaSelect) areaSelect.value = state.area;
    if (areaSelectM && source !== areaSelectM) areaSelectM.value = state.area;
    apply();
  }

  [qInput, qInputM].forEach(function (input) {
    if (!input) return;
    input.addEventListener("input", function () { setQuery(input.value, input); });
  });

  [areaSelect, areaSelectM].forEach(function (sel) {
    if (!sel) return;
    sel.addEventListener("change", function () { setArea(sel.value, sel); });
  });

  $$("form.search-panel").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (directory.scrollIntoView) directory.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      apply();
    });
  });

  $$(".hint-tag").forEach(function (btn) {
    btn.addEventListener("click", function () {
      setQuery(btn.getAttribute("data-term") || btn.textContent.trim());
    });
  });

  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      chips.forEach(function (c) {
        c.setAttribute("aria-selected", c === chip ? "true" : "false");
        c.classList.toggle("active", c === chip);
      });
      state.category = chip.getAttribute("data-filter") || "All";
      expanded = {};
      apply();
    });
  });

  model.forEach(function (group) {
    if (!group.seeAll) return;
    group.seeAll.addEventListener("click", function () {
      expanded[group.index] = !expanded[group.index];
      apply();
    });
  });

  [sortSelect, ratingSelect].forEach(function (sel) {
    if (sel) sel.addEventListener("change", apply);
  });
  [openOnly, verifiedOnly].forEach(function (box) {
    if (box) box.addEventListener("change", apply);
  });

  var clearBtn = $("#clearBtn");
  if (clearBtn) {
    clearBtn.addEventListener("click", function () { setQuery(""); });
  }

  /* ---------- initials fallback ---------- */
  $$(".avatar[data-initials]").forEach(function (el) {
    if (el.textContent.trim()) return;
    var parts = (el.getAttribute("data-initials") || "").split(/\s+/).filter(Boolean);
    el.textContent = parts.slice(-2).map(function (p) { return p[0]; }).join("").toUpperCase();
  });

  var year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  apply();
  return true;
}

window.initServiFilters = initServiFilters;

if (document.readyState !== "loading") {
  initServiFilters();
} else {
  document.addEventListener("DOMContentLoaded", initServiFilters);
}



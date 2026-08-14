(function () {
    "use strict";

    function initializeServiPage() {
        var yearEl = document.getElementById("year");
        if (yearEl) yearEl.textContent = new Date().getFullYear();

        document.querySelectorAll(".avatar img").forEach(function (img) {
            if (img.dataset.fallbackBound === "true") return;
            img.dataset.fallbackBound = "true";
            img.addEventListener("error", function () {
                var holder = img.parentElement;
                var name = holder && holder.getAttribute("data-initials") || (img.alt || "?");
                if (!holder) return;
                holder.textContent = name
                    .split(/\s+/).filter(Boolean).slice(0, 2)
                    .map(function (w) { return w[0].toUpperCase(); }).join("");
            });
        });

        var joinForm = document.getElementById("joinForm");
        if (joinForm) {
            var success = document.getElementById("joinSuccess");
            joinForm.addEventListener("submit", function (e) {
                e.preventDefault();
                var valid = true;

                joinForm.querySelectorAll("[required]").forEach(function (field) {
                    var wrap = field.closest(".form-field");
                    var err = wrap ? wrap.querySelector(".form-error") : null;
                    var ok = field.checkValidity() && field.value.trim() !== "";
                    if (wrap) wrap.classList.toggle("invalid", !ok);
                    if (err) err.textContent = ok ? "" : (field.validationMessage || "This field is required.");
                    if (!ok && valid) { field.focus(); }
                    if (!ok) valid = false;
                });

                if (!valid) { if (success) success.hidden = true; return; }
                if (success) {
                    success.hidden = false;
                    success.scrollIntoView({ behavior: "smooth", block: "center" });
                }
                joinForm.reset();
            });

            joinForm.querySelectorAll("input, select, textarea").forEach(function (field) {
                field.addEventListener("input", function () {
                    var wrap = field.closest(".form-field");
                    if (wrap && wrap.classList.contains("invalid") && field.value.trim() !== "") {
                        wrap.classList.remove("invalid");
                        var err = wrap.querySelector(".form-error");
                        if (err) err.textContent = "";
                    }
                });
            });
        }

        var grid = document.getElementById("proGrid");
        if (!grid) return false;
        if (grid.dataset.initialized === "true") return true;

        var cards = Array.prototype.slice.call(grid.querySelectorAll(".pro-card"));
        var searchInputs = [document.getElementById("qInput"), document.getElementById("qInputM")].filter(Boolean);
        var areaSelects = [document.getElementById("areaSelect"), document.getElementById("areaSelectM")].filter(Boolean);
        var searchInput = searchInputs[0];
        var areaSelect = areaSelects[0];
        var sortSelect = document.getElementById("sortSelect");
        var ratingSelect = document.getElementById("ratingSelect");
        var openOnly = document.getElementById("openOnly");
        var verifiedOnly = document.getElementById("verifiedOnly");
        var noResults = document.getElementById("noResults");
        var countEl = document.getElementById("resultCount");
        var searchForms = [document.getElementById("searchForm"), document.getElementById("searchFormM")].filter(Boolean);
        var chips = Array.prototype.slice.call(document.querySelectorAll(".chip"));
        var currentCategory = "All";

        function setQuery(value) {
            searchInputs.forEach(function (el) { el.value = value; });
        }

        function setArea(value) {
            areaSelects.forEach(function (el) { el.value = value; });
        }

        function text(card) {
            return (card.dataset.name + " " + card.dataset.role + " " + card.dataset.tags + " " + card.dataset.area).toLowerCase();
        }

        function sortCards(list) {
            var mode = sortSelect ? sortSelect.value : "rating";
            var sorted = list.slice();
            sorted.sort(function (a, b) {
                if (mode === "reviews") return +b.dataset.reviews - +a.dataset.reviews;
                if (mode === "experience") return +b.dataset.exp - +a.dataset.exp;
                if (mode === "newest") return +b.dataset.added - +a.dataset.added;
                if (mode === "name") return a.dataset.name.localeCompare(b.dataset.name);
                return +b.dataset.rating - +a.dataset.rating;
            });
            sorted.forEach(function (c) { grid.appendChild(c); });
        }

        function apply() {
            var q = (searchInput && searchInput.value ? searchInput.value : "").trim().toLowerCase();
            var area = areaSelect ? areaSelect.value : "All";
            var minRating = ratingSelect ? parseFloat(ratingSelect.value) : 0;
            var visible = [];

            cards.forEach(function (card) {
                var ok =
                    (currentCategory === "All" || card.dataset.category === currentCategory) &&
                    (area === "All" || card.dataset.area === area) &&
                    (!q || text(card).indexOf(q) !== -1) &&
                    (parseFloat(card.dataset.rating) >= minRating) &&
                    (!openOnly || !openOnly.checked || card.dataset.open === "true") &&
                    (!verifiedOnly || !verifiedOnly.checked || card.dataset.verified === "true");

                card.hidden = !ok;
                if (ok) visible.push(card);
            });

            sortCards(visible);
            if (noResults) noResults.hidden = visible.length > 0;
            if (countEl) countEl.innerHTML = "<strong>" + visible.length + "</strong> professional" + (visible.length === 1 ? "" : "s") + " found";
        }

        chips.forEach(function (chip) {
            chip.addEventListener("click", function () {
                chips.forEach(function (c) { c.setAttribute("aria-selected", "false"); });
                chip.setAttribute("aria-selected", "true");
                currentCategory = chip.dataset.filter;
                apply();
            });
        });

        document.querySelectorAll(".hint-tag").forEach(function (tag) {
            tag.addEventListener("click", function () {
                setQuery(tag.dataset.term || tag.textContent.trim());
                apply();
                var section = document.getElementById("directory");
                if (section) section.scrollIntoView({ behavior: "smooth", block: "start" });
            });
        });

        searchInputs.forEach(function (el) {
            el.addEventListener("input", function () { setQuery(el.value); apply(); });
        });

        areaSelects.forEach(function (el) {
            el.addEventListener("change", function () { setArea(el.value); apply(); });
        });

        [sortSelect, ratingSelect, openOnly, verifiedOnly].forEach(function (el) {
            if (el) el.addEventListener("change", apply);
        });

        searchForms.forEach(function (form) {
            form.addEventListener("submit", function (e) {
                e.preventDefault();
                apply();
                var section = document.getElementById("directory");
                if (section) section.scrollIntoView({ behavior: "smooth", block: "start" });
            });
        });

        grid.dataset.initialized = "true";
        apply();

        var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reduce || !("IntersectionObserver" in window)) {
            cards.forEach(function (c) { c.classList.add("in"); });
        } else {
            var io = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("in");
                        io.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.08, rootMargin: "0px 0px -40px 0px" });
            cards.forEach(function (c) { io.observe(c); });
        }

        return true;
    }

    window.initServiDirectory = initializeServiPage;

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initializeServiPage);
    } else {
        initializeServiPage();
    }
})();


(function () {
    "use strict";

    // Footer year
    var yearEl = document.getElementById("year");
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());

    var flipCard = document.getElementById("flipCard");
    var frontFace = document.querySelector(".flip-front");
    var backFace = document.querySelector(".flip-back");
    var backPanels = Array.prototype.slice.call(document.querySelectorAll(".flip-back-panel"));

    var reduceMotion = window.matchMedia
        ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
        : false;

    var BACK_MODES = ["signup", "forgot", "reset-sent"];
    var COMPACT_MODES = ["forgot", "reset-sent"];
    var currentMode = "signin";

    function updateFlipCardHeight() {
        if (!flipCard) return;
        var activeFace = flipCard.querySelector(".flip-face[aria-hidden='false']") || frontFace;
        if (!activeFace) return;
        flipCard.style.height = activeFace.scrollHeight + "px";
    }

    var COUNTRIES = [
        "Afghanistan","Albania","Algeria","Andorra","Angola","Antigua and Barbuda","Argentina","Armenia","Australia","Austria",
        "Azerbaijan","Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bhutan","Bolivia",
        "Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria","Burkina Faso","Burundi","Cabo Verde","Cambodia",
        "Cameroon","Canada","Central African Republic","Chad","Chile","China","Colombia","Comoros","Congo (Brazzaville)",
        "Congo (Kinshasa)","Costa Rica","Croatia","Cuba","Cyprus","Czech Republic","Denmark","Djibouti","Dominica",
        "Dominican Republic","Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Eswatini","Ethiopia",
        "Fiji","Finland","France","Gabon","Gambia","Georgia","Germany","Ghana","Greece","Grenada","Guatemala","Guinea",
        "Guinea-Bissau","Guyana","Haiti","Honduras","Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland",
        "Israel","Italy","Ivory Coast","Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kiribati","Kosovo","Kuwait",
        "Kyrgyzstan","Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania","Luxembourg",
        "Madagascar","Malawi","Malaysia","Maldives","Mali","Malta","Marshall Islands","Mauritania","Mauritius","Mexico",
        "Micronesia","Moldova","Monaco","Mongolia","Montenegro","Morocco","Mozambique","Myanmar","Namibia","Nauru","Nepal",
        "Netherlands","New Zealand","Nicaragua","Niger","Nigeria","North Korea","North Macedonia","Norway","Oman","Pakistan",
        "Palau","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal","Qatar","Romania","Russia",
        "Rwanda","Saint Kitts and Nevis","Saint Lucia","Saint Vincent and the Grenadines","Samoa","San Marino",
        "Sao Tome and Principe","Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone","Singapore","Slovakia",
        "Slovenia","Solomon Islands","Somalia","South Africa","South Korea","South Sudan","Spain","Sri Lanka","Sudan",
        "Suriname","Sweden","Switzerland","Syria","Taiwan","Tajikistan","Tanzania","Thailand","Timor-Leste","Togo",
        "Tonga","Trinidad and Tobago","Tunisia","Turkey","Turkmenistan","Tuvalu","Uganda","Ukraine","United Arab Emirates",
        "United Kingdom","United States","Uruguay","Uzbekistan","Vanuatu","Vatican City","Venezuela","Vietnam","Yemen","Zambia","Zimbabwe"
    ];

    function getApiBase() {
        var configuredBase = window.API_BASE || window.__API_BASE__ || "";
        if (configuredBase) return configuredBase.replace(/\/$/, "");

        var host = window.location && window.location.hostname ? window.location.hostname : "";
        if (!host || host === "localhost" || host === "127.0.0.1" || host === "::1" || host.startsWith("192.") || host.startsWith("10.")) {
            return "http://localhost:4000";
        }
        return "https://yolaaiinfohub-backend.onrender.com";
    }

    function storeUserSession(data, fallbackIdentifier) {
        var userData = {
            username: data.username || fallbackIdentifier || "",
            name: data.name || data.username || fallbackIdentifier || "",
            email: data.email || fallbackIdentifier || "",
            phone: data.phone || "",
            state: data.state || "",
            lga: data.lga || "",
            address: data.address || "",
            profilePicture: data.profilePicture || "",
            avatar: data.avatar || ""
        };

        window.currentUser = userData;
        window.__lastUser = userData;
        localStorage.setItem("currentUser", JSON.stringify(userData));
        return userData;
    }

    var googleAuthInitialized = false;

    async function initializeGoogleAuth() {
        if (googleAuthInitialized) return true;
        if (!window.google || !window.google.accounts || !window.google.accounts.id) {
            return false;
        }

        try {
            var response = await fetch(getApiBase() + "/api/auth/google-config", { credentials: "include" });
            var data = await response.json().catch(function () { return {}; });
            if (!data.clientId) return false;

            window.google.accounts.id.initialize({
                client_id: data.clientId,
                callback: handleGoogleCredentialResponse,
                auto_select: false,
                cancel_on_tap_outside: true
            });
            googleAuthInitialized = true;
            return true;
        } catch (error) {
            return false;
        }
    }

    async function handleGoogleCredentialResponse(response) {
        if (!response || !response.credential) return;

        var status = document.querySelector(".flip-back-panel.is-active .form-status") || document.querySelector(".flip-front .form-status");
        showStatus(status, "info", '<i class="fas fa-spinner fa-spin"></i>Signing you in with Google...');

        try {
            var googleResponse = await fetch(getApiBase() + "/api/auth/google", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ credential: response.credential })
            });
            var data = await googleResponse.json().catch(function () { return {}; });

            if (!googleResponse.ok || !data.success) {
                showStatus(status, "error", '<i class="fas fa-triangle-exclamation"></i>' + (data.error || "Google sign-in failed."));
                return;
            }

            storeUserSession(data, data.email || "");
            showStatus(status, "success", '<i class="fas fa-circle-check"></i>Signed in successfully with Google.');
            window.setTimeout(function () {
                window.location.assign("../index.html");
            }, 600);
        } catch (error) {
            showStatus(status, "error", '<i class="fas fa-triangle-exclamation"></i>' + (error && error.message ? error.message : "Google sign-in failed."));
        }
    }

    async function triggerGoogleSignIn(btn) {
        var face = btn ? (btn.closest(".flip-back-panel") || btn.closest(".flip-face")) : null;
        var status = face ? face.querySelector(".form-status") : null;
        var ready = await initializeGoogleAuth();

        if (!ready || !window.google || !window.google.accounts || !window.google.accounts.id) {
            showStatus(status, "error", '<i class="fas fa-triangle-exclamation"></i>Google sign-in is not available right now. Check your internet, if the issue persist try again later!');
            return;
        }

        showStatus(status, "info", '<i class="fas fa-spinner fa-spin"></i>Opening Google sign-in...');
        window.google.accounts.id.prompt();
    }

    function populateStatesSelect() {
        var stateSelect = document.getElementById("su-state");
        if (!stateSelect) return;

        stateSelect.innerHTML = '<option value="">Select state</option>';
        if (!window.STATES_LGAS) return;

        Object.keys(window.STATES_LGAS).sort().forEach(function (state) {
            var option = document.createElement("option");
            option.value = state;
            option.textContent = state;
            stateSelect.appendChild(option);
        });
    }

    function populateCountrySelect() {
        var countrySelect = document.getElementById("su-country");
        if (!countrySelect) return;

        countrySelect.innerHTML = '<option value="">Select country</option>';
        COUNTRIES.forEach(function (country) {
            var option = document.createElement("option");
            option.value = country;
            option.textContent = country;
            countrySelect.appendChild(option);
        });

        var otherOption = document.createElement("option");
        otherOption.value = "Other";
        otherOption.textContent = "Other";
        countrySelect.appendChild(otherOption);
    }

    function updateResidenceFields() {
        var nigerianCheckbox = document.getElementById("su-nigerian");
        var yolaResidentCheckbox = document.getElementById("su-yola-resident");
        var countryField = document.getElementById("country-of-residence-field");
        var stateField = document.getElementById("state-of-residence-field");
        var lgaField = document.getElementById("lga-of-residence-field");
        var countrySelect = document.getElementById("su-country");
        var stateSelect = document.getElementById("su-state");
        var lgaSelect = document.getElementById("su-lga");

        if (!countryField || !stateField || !lgaField) return;

        var isNigerian = !!(nigerianCheckbox && nigerianCheckbox.checked);
        var isYolaResident = !!(yolaResidentCheckbox && yolaResidentCheckbox.checked);
        var showCountryField = !isNigerian;
        var showStateLga = !isYolaResident && (isNigerian || (countrySelect && countrySelect.value === "Nigeria"));

        countryField.style.display = showCountryField ? "" : "none";
        stateField.style.display = showStateLga ? "" : "none";
        lgaField.style.display = showStateLga ? "" : "none";

        if (countrySelect) countrySelect.disabled = !showCountryField;
        if (stateSelect) stateSelect.disabled = !showStateLga;
        if (lgaSelect) lgaSelect.disabled = !showStateLga;

        if (showStateLga && stateSelect && lgaSelect && window.updateLGAOptions) {
            window.updateLGAOptions(stateSelect, lgaSelect);
        } else if (lgaSelect) {
            lgaSelect.innerHTML = '<option value="">Select LGA</option>';
        }
    }

    function panelFor(mode) {
        for (var i = 0; i < backPanels.length; i++) {
            if (backPanels[i].getAttribute("data-panel") === mode) return backPanels[i];
        }
        return null;
    }

    function activatePanel(mode) {
        backPanels.forEach(function (panel) {
            var active = panel.getAttribute("data-panel") === mode;
            panel.classList.toggle("is-active", active);
            panel.setAttribute("aria-hidden", active ? "false" : "true");
        });
    }

    function focusFirstField(mode) {
        var scope = mode === "signin" ? frontFace : panelFor(mode);
        if (!scope) return;
        var field = scope.querySelector("input:not([type=checkbox]), button.btn");
        if (field) {
            try { field.focus({ preventScroll: true }); } catch (err) { field.focus(); }
        }
    }

    function setMode(mode, updateUrl) {
        if (BACK_MODES.indexOf(mode) === -1) mode = "signin";
        var flipped = mode !== "signin";
        var wasFlipped = flipCard.classList.contains("is-flipped");
        var swapping = flipped && wasFlipped && mode !== currentMode;

        function apply() {
            // Keep the current back panel mounted while flipping back to sign in.
            flipCard.classList.toggle("is-flipped", flipped);
            flipCard.classList.toggle("is-compact", COMPACT_MODES.indexOf(mode) !== -1);
            if (frontFace) frontFace.setAttribute("aria-hidden", flipped ? "true" : "false");
            if (backFace) backFace.setAttribute("aria-hidden", flipped ? "false" : "true");
        }

        if (swapping && !reduceMotion) {
            // Half-flip out, swap the panel at the edge, half-flip back in.
            flipCard.classList.add("is-swapping");
            window.setTimeout(function () {
                activatePanel(mode);
                flipCard.classList.toggle("is-compact", COMPACT_MODES.indexOf(mode) !== -1);
                updateFlipCardHeight();
            }, 250);
            window.setTimeout(function () {
                flipCard.classList.remove("is-swapping");
                focusFirstField(mode);
            }, 520);
        } else {
            if (flipped) activatePanel(mode);
            apply();
            updateFlipCardHeight();
            if (updateUrl) {
                window.setTimeout(function () { focusFirstField(mode); }, reduceMotion ? 0 : 500);
            }
        }

        currentMode = mode;

        if (updateUrl && window.history && window.history.replaceState) {
            var url = new URL(window.location.href);
            url.searchParams.set("mode", mode);
            window.history.replaceState({}, "", url.toString());
        }
    }

    // Init from ?mode=
    var initialMode = new URLSearchParams(window.location.search).get("mode");
    setMode(BACK_MODES.indexOf(initialMode) !== -1 ? initialMode : "signin", false);
    updateFlipCardHeight();

    populateCountrySelect();
    populateStatesSelect();
    updateResidenceFields();

    var nigerianCheckbox = document.getElementById("su-nigerian");
    var yolaResidentCheckbox = document.getElementById("su-yola-resident");
    var countrySelect = document.getElementById("su-country");
    var stateSelect = document.getElementById("su-state");
    var lgaSelect = document.getElementById("su-lga");

    if (nigerianCheckbox) {
        nigerianCheckbox.addEventListener("change", updateResidenceFields);
    }
    if (yolaResidentCheckbox) {
        yolaResidentCheckbox.addEventListener("change", updateResidenceFields);
    }
    if (countrySelect) {
        countrySelect.addEventListener("change", updateResidenceFields);
    }
    if (stateSelect) {
        stateSelect.addEventListener("change", function () {
            if (window.updateLGAOptions && lgaSelect) {
                window.updateLGAOptions(stateSelect, lgaSelect);
            }
        });
    }

    window.addEventListener("resize", updateFlipCardHeight);

    // Switch links (delegated so every panel works)
    document.addEventListener("click", function (e) {
        var link = e.target.closest ? e.target.closest("[data-flip]") : null;
        if (!link) return;
        e.preventDefault();
        setMode(link.getAttribute("data-flip"), true);
    });

    // Password toggles
    document.querySelectorAll(".password-toggle").forEach(function (btn) {
        btn.addEventListener("click", function () {
            var input = document.getElementById(btn.getAttribute("data-target"));
            if (!input) return;
            var showing = input.type === "text";
            input.type = showing ? "password" : "text";
            btn.setAttribute("aria-label", showing ? "Show password" : "Hide password");
            var icon = btn.querySelector("i");
            if (icon) {
                icon.classList.toggle("fa-eye", showing);
                icon.classList.toggle("fa-eye-slash", !showing);
            }
        });
    });

    function showStatus(el, kind, html) {
        if (!el) return;
        el.className = "form-status is-visible is-" + kind;
        el.innerHTML = html;
    }
    function clearStatus(el) {
        if (!el) return;
        el.className = "form-status";
        el.innerHTML = "";
    }
    function setInvalid(input, invalid) {
        if (!input) return;
        input.classList.toggle("is-invalid", !!invalid);
    }
    function isEmail(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    }
    function isPhone(v) {
        if (!/^[0-9+\-\s()]+$/.test(v)) return false;
        var digits = v.replace(/\D/g, "");
        return digits.length >= 10 && digits.length <= 15;
    }

    // SSO buttons
    document.querySelectorAll(".sso-btn").forEach(function (btn) {
        btn.addEventListener("click", function (e) {
            var provider = btn.getAttribute("data-sso") || "Provider";
            var face = btn.closest(".flip-back-panel") || btn.closest(".flip-face");
            var status = face ? face.querySelector(".form-status") : null;

            if (provider === "Google") {
                e.preventDefault();
                triggerGoogleSignIn(btn);
                return;
            }

            if (status) {
                showStatus(status, "info", '<i class="fas fa-circle-info"></i>' + provider + " sign-in is configured as a placeholder. Add your provider credentials to the environment variables to enable it.");
            }
        });
    });

    // Sign in submit
    var signinForm = document.getElementById("signinForm");
    if (signinForm) {
        signinForm.addEventListener("submit", async function (e) {
            e.preventDefault();
            var status = document.getElementById("signinStatus");
            var identifier = document.getElementById("si-email");
            var password = document.getElementById("si-password");
            var errors = [];

            setInvalid(identifier, false); setInvalid(password, false);
            if (!identifier.value.trim()) { setInvalid(identifier, true); errors.push("Enter your email or username."); }
            if (password.value.length < 8) { setInvalid(password, true); errors.push("Password must be at least 8 characters."); }

            if (errors.length) {
                showStatus(status, "error", '<i class="fas fa-triangle-exclamation"></i>' + errors.join('<br>'));
                return;
            }

            showStatus(status, "info", '<i class="fas fa-spinner fa-spin"></i>Signing you in...');

            try {
                var payload = { password: password.value };
                var raw = identifier.value.trim();
                if (raw.indexOf("@") !== -1) payload.email = raw; else payload.username = raw;

                var response = await fetch(getApiBase() + "/api/login", {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });
                var data = await response.json().catch(function () { return {}; });

                if (!response.ok || !data.success) {
                    var errorMessage = data.error || data.message || "Unable to sign in right now.";
                    if (response.status === 403 && data.requiresEmailVerification) {
                        errorMessage = data.message || data.error || 'Please verify your email before signing in. Check your inbox for the verification link or code.';
                    } else if (response.status === 400) {
                        if (errorMessage.toLowerCase().includes('password')) {
                            errorMessage = 'Incorrect password. Please try again.';
                        }
                    }
                    showStatus(status, "error", '<i class="fas fa-triangle-exclamation"></i>' + errorMessage);
                    return;
                }

                var userData = storeUserSession(data, raw);
                if (window.updateAuthUI && typeof window.updateAuthUI === "function") {
                    window.updateAuthUI(userData);
                }

                showStatus(status, "success", '<i class="fas fa-circle-check"></i>Signed in successfully.');
                window.setTimeout(function () {
                    window.location.assign("../index.html");
                }, 600);
            } catch (error) {
                showStatus(status, "error", '<i class="fas fa-triangle-exclamation"></i>' + (error && error.message ? error.message : "Unable to sign in right now."));
            }
        });
    }

    // Sign up submit
    var signupForm = document.getElementById("signupForm");
    if (signupForm) {
        signupForm.addEventListener("submit", async function (e) {
            e.preventDefault();
            var status = document.getElementById("signupStatus");
            var name = document.getElementById("su-name");
            var email = document.getElementById("su-email");
            var username = document.getElementById("su-username");
            var nin = document.getElementById("su-nin");
            var phone = document.getElementById("su-phone");
            var address = document.getElementById("su-address");
            var pw = document.getElementById("su-password");
            var confirm = document.getElementById("su-confirm");
            var terms = document.getElementById("su-terms");
            var termsRow = document.getElementById("su-terms-row");
            var nigerianCheckbox = document.getElementById("su-nigerian");
            var yolaResidentCheckbox = document.getElementById("su-yola-resident");
            var countrySelect = document.getElementById("su-country");
            var stateSelect = document.getElementById("su-state");
            var lgaSelect = document.getElementById("su-lga");
            var errors = [];

            setInvalid(name, false); setInvalid(email, false); setInvalid(username, false);
            setInvalid(nin, false); setInvalid(phone, false); setInvalid(address, false);
            setInvalid(pw, false); setInvalid(confirm, false);
            if (countrySelect) setInvalid(countrySelect, false);
            if (stateSelect) setInvalid(stateSelect, false);
            if (lgaSelect) setInvalid(lgaSelect, false);
            termsRow.classList.remove("is-invalid");

            if (!name.value.trim()) { setInvalid(name, true); errors.push("Enter your full name."); }
            if (!isEmail(email.value.trim())) { setInvalid(email, true); errors.push("Enter a valid email."); }
            if (!username.value.trim()) { setInvalid(username, true); errors.push("Choose a username."); }
            if (!/^[0-9]{11}$/.test(nin.value.trim())) { setInvalid(nin, true); errors.push("NIN must be exactly 11 digits."); }
            // Phone is optional - no validation needed
            if (!address.value.trim()) { setInvalid(address, true); errors.push("Enter your address."); }
            if (pw.value.length < 8) { setInvalid(pw, true); errors.push("Password must be at least 8 characters."); }
            else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/.test(pw.value)) {
                setInvalid(pw, true); errors.push("Password must include uppercase, lowercase, a number, and a special character.");
            }
            if (confirm.value !== pw.value || !confirm.value) {
                setInvalid(confirm, true); errors.push("Passwords do not match.");
            }

            var isNigerian = !!(nigerianCheckbox && nigerianCheckbox.checked);
            var isYolaResident = !!(yolaResidentCheckbox && yolaResidentCheckbox.checked);
            var showCountryField = !isNigerian;
            var showStateLga = !isYolaResident && (isNigerian || (countrySelect && countrySelect.value === "Nigeria"));

            if (showCountryField && countrySelect && !countrySelect.value) {
                setInvalid(countrySelect, true);
                errors.push("Select your country of residence.");
            }
            if (showStateLga && stateSelect && !stateSelect.value) {
                setInvalid(stateSelect, true);
                errors.push("Select your state of residence.");
            }
            if (showStateLga && lgaSelect && !lgaSelect.value) {
                setInvalid(lgaSelect, true);
                errors.push("Select your local government area of residence.");
            }
            if (!terms.checked) { termsRow.classList.add("is-invalid"); errors.push("Please accept the terms to continue."); }

            if (errors.length) {
                showStatus(status, "error", '<i class="fas fa-triangle-exclamation"></i>' + errors.join('<br>'));
                return;
            }

            showStatus(status, "info", '<i class="fas fa-spinner fa-spin"></i>Creating your account...');

            try {
                var payload = {
                    username: username.value.trim(),
                    email: email.value.trim(),
                    name: name.value.trim(),
                    nin: nin.value.trim().replace(/\s+/g, ''),
                    password: pw.value,
                    phone: phone.value.trim(),
                    address: address.value.trim(),
                    state: stateSelect && stateSelect.value ? stateSelect.value : "N/A",
                    lga: lgaSelect && lgaSelect.value ? lgaSelect.value : "N/A",
                    termsAccepted: !!terms.checked
                };

                if (countrySelect) payload.country = countrySelect.value;

                var response = await fetch(getApiBase() + "/api/signup", {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });
                var data = await response.json().catch(function () { return {}; });

                if (!response.ok || !data.success) {
                    var errorMessage = data.error || data.message || "Unable to create your account right now.";
                    showStatus(status, "error", '<i class="fas fa-triangle-exclamation"></i>' + errorMessage);
                    return;
                }

                var userData = {
                    username: data.username || payload.username,
                    name: data.name || payload.name,
                    email: payload.email,
                    phone: payload.phone,
                    state: payload.state,
                    lga: payload.lga,
                    address: payload.address,
                    profilePicture: "",
                    avatar: ""
                };

                window.currentUser = userData;
                window.__lastUser = userData;
                localStorage.setItem("currentUser", JSON.stringify(userData));

                showStatus(status, "success", '<i class="fas fa-circle-check"></i>Account created successfully. Please verify your email before signing in.');
                window.setTimeout(function () {
                    window.location.assign("../pages/verify-email.html?email=" + encodeURIComponent(payload.email));
                }, 600);
            } catch (error) {
                showStatus(status, "error", '<i class="fas fa-triangle-exclamation"></i>' + (error && error.message ? error.message : "Unable to create your account right now."));
            }
        });
    }

    /* ============================================================
       Forgot password
       ============================================================ */
    var forgotForm = document.getElementById("forgotForm");
    var fpInput = document.getElementById("fp-identifier");
    var fpLabel = document.getElementById("fp-label");
    var fpNote = document.getElementById("fp-note");
    var forgotStatus = document.getElementById("forgotStatus");
    var sentDest = document.getElementById("sentDest");
    var resendBtn = document.getElementById("resendBtn");
    var resendLabel = document.getElementById("resendLabel");
    var method = "email";

    function setMethod(next) {
        method = next === "phone" ? "phone" : "email";
        document.querySelectorAll(".reset-toggle-btn").forEach(function (btn) {
            var active = btn.getAttribute("data-method") === method;
            btn.classList.toggle("is-active", active);
            btn.setAttribute("aria-pressed", active ? "true" : "false");
        });
        if (!fpInput) return;
        setInvalid(fpInput, false);
        clearStatus(forgotStatus);
        fpInput.value = "";
        if (method === "email") {
            fpInput.type = "email";
            fpInput.autocomplete = "email";
            fpInput.placeholder = "you@example.com";
            fpLabel.innerHTML = 'Email address <span class="required">*</span>';
            fpNote.textContent = "If an account matches this email, a password reset link will arrive within a few minutes. The link expires in 30 minutes.";
        } else {
            fpInput.type = "tel";
            fpInput.autocomplete = "tel";
            fpInput.placeholder = "+234 8xx xxx xxxx";
            fpLabel.innerHTML = 'Phone number <span class="required">*</span>';
            fpNote.textContent = "If an account matches this number, we'll text you a reset token. The token expires in 30 minutes.";
        }
    }

    document.querySelectorAll(".reset-toggle-btn").forEach(function (btn) {
        btn.addEventListener("click", function () {
            setMethod(btn.getAttribute("data-method"));
        });
    });

    function maskDestination(value) {
        if (method === "email") {
            var parts = value.split("@");
            var user = parts[0] || "";
            var visible = user.slice(0, 2);
            return visible + "•".repeat(Math.max(user.length - 2, 2)) + "@" + (parts[1] || "");
        }
        var digits = value.replace(/\s+/g, "");
        return digits.slice(0, 4) + "•".repeat(Math.max(digits.length - 7, 3)) + digits.slice(-3);
    }

    if (forgotForm) {
        forgotForm.addEventListener("submit", async function (e) {
            e.preventDefault();
            var value = fpInput.value.trim();
            setInvalid(fpInput, false);

            var error = "";
            if (!value) {
                error = method === "email" ? "Enter your email address." : "Enter your phone number.";
            } else if (method === "email" && !isEmail(value)) {
                error = "Enter a valid email.";
            } else if (method === "phone" && !isPhone(value)) {
                error = "Enter a valid phone number (10–15 digits).";
            }

            if (error) {
                setInvalid(fpInput, true);
                showStatus(forgotStatus, "error", '<i class="fas fa-triangle-exclamation"></i>' + error);
                return;
            }

            showStatus(forgotStatus, "info", '<i class="fas fa-spinner fa-spin"></i>Preparing your recovery request...');

            try {
                var response = await fetch(getApiBase() + "/api/forgot-password", {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(method === "email" ? { email: value } : { phone: value })
                });
                var data = await response.json().catch(function () { return {}; });

                if (!response.ok || !data.success) {
                    var errorMessage = data.error || data.message || "Unable to create your account right now.";
                    showStatus(status, "error", '<i class="fas fa-triangle-exclamation"></i>' + errorMessage);
                    return;
                }

                clearStatus(forgotStatus);
                if (sentDest) sentDest.textContent = maskDestination(value);
                clearStatus(document.getElementById("sentStatus"));
                startResendCooldown();
                setMode("reset-sent", true);
            } catch (error) {
                showStatus(forgotStatus, "error", '<i class="fas fa-triangle-exclamation"></i>' + (error && error.message ? error.message : "Unable to process your request right now."));
            }
        });
    }

    var cooldownTimer = null;
    function startResendCooldown() {
        if (!resendBtn) return;
        var remaining = 30;
        resendBtn.disabled = true;
        resendLabel.textContent = "Resend in " + remaining + "s";
        window.clearInterval(cooldownTimer);
        cooldownTimer = window.setInterval(function () {
            remaining -= 1;
            if (remaining <= 0) {
                window.clearInterval(cooldownTimer);
                resendBtn.disabled = false;
                resendLabel.textContent = "Resend link";
                return;
            }
            resendLabel.textContent = "Resend in " + remaining + "s";
        }, 1000);
    }

    if (resendBtn) {
        resendBtn.addEventListener("click", async function () {
            var value = fpInput.value.trim();
            if (!value) {
                showStatus(document.getElementById("sentStatus"), "error", '<i class="fas fa-triangle-exclamation"></i>Enter an email or phone number first.');
                return;
            }

            try {
                var response = await fetch(getApiBase() + "/api/forgot-password", {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(method === "email" ? { email: value } : { phone: value })
                });
                var data = await response.json().catch(function () { return {}; });

                if (!response.ok || !data.success) {
                    showStatus(document.getElementById("sentStatus"), "error", '<i class="fas fa-triangle-exclamation"></i>' + (data.error || "Unable to resend the recovery request."));
                    return;
                }

                showStatus(document.getElementById("sentStatus"), "success", '<i class="fas fa-circle-check"></i>Recovery request sent again.');
                startResendCooldown();
            } catch (error) {
                showStatus(document.getElementById("sentStatus"), "error", '<i class="fas fa-triangle-exclamation"></i>' + (error && error.message ? error.message : "Unable to resend the recovery request."));
            }
        });
    }
})();



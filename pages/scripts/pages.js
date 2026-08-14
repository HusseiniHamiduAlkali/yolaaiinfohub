
/* Yola AI Info Hub — shared page behaviors
   Used by profile.html, password-reset.html, terms.html */

(function () {
    'use strict';

    // Footer year
    const yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    /* ========== Profile: inline edit ========== */
    document.querySelectorAll('.info-row[data-editable]').forEach((row) => {
        const editBtn = row.querySelector('.edit-btn');
        const valueEl = row.querySelector('.info-value');
        if (!editBtn || !valueEl) return;

        const type = row.dataset.type || 'text';
        const name = row.dataset.name || 'field';

        editBtn.addEventListener('click', () => enterEdit(row, valueEl, type, name));
    });

    function enterEdit(row, valueEl, type, name) {
        if (row.classList.contains('editing')) return;
        row.classList.add('editing');
        const currentText = valueEl.classList.contains('empty') ? '' : valueEl.textContent.trim();

        let input;
        if (type === 'textarea') {
            input = document.createElement('textarea');
            input.className = 'info-textarea';
            input.rows = 3;
        } else if (type === 'select') {
            input = document.createElement('select');
            input.className = 'info-select';
            (row.dataset.options || '').split('|').forEach((opt) => {
                if (!opt) return;
                const o = document.createElement('option');
                o.value = opt;
                o.textContent = opt;
                if (opt === currentText) o.selected = true;
                input.appendChild(o);
            });
        } else {
            input = document.createElement('input');
            input.className = 'info-input';
            input.type = type;
        }
        if (input.tagName !== 'SELECT') input.value = currentText;
        input.setAttribute('aria-label', name);

        const editBtn = row.querySelector('.edit-btn');
        editBtn.style.display = 'none';
        valueEl.replaceWith(input);

        const actions = document.createElement('div');
        actions.className = 'row-actions';
        actions.innerHTML = `
            <button type="button" class="icon-btn save" aria-label="Save"><i class="fas fa-check"></i></button>
            <button type="button" class="icon-btn cancel" aria-label="Cancel"><i class="fas fa-xmark"></i></button>
        `;
        editBtn.after(actions);
        input.focus();
        if (input.select) input.select();

        actions.querySelector('.save').addEventListener('click', () => commit(input.value));
        actions.querySelector('.cancel').addEventListener('click', () => commit(currentText, true));
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && type !== 'textarea') { e.preventDefault(); commit(input.value); }
            if (e.key === 'Escape') commit(currentText, true);
        });

        function commit(newValue, cancelled) {
            const value = (newValue || '').trim();
            const restored = document.createElement('span');
            restored.className = 'info-value' + (value ? '' : ' empty');
            restored.textContent = value || 'Not set';
            input.replaceWith(restored);
            actions.remove();
            editBtn.style.display = '';
            row.classList.remove('editing');
            row.querySelector('.info-value').addEventListener('click', () => {}, { once: true });
            if (!cancelled && typeof window.onProfileFieldUpdated === 'function') {
                window.onProfileFieldUpdated({
                    field: name,
                    value: value,
                    previousValue: currentText,
                    type: type,
                    row: row
                });
            }
        }
    }

    /* ========== Profile: avatar picker ========== */
    const avatarInput = document.getElementById('avatarInput');
    const avatarImg = document.getElementById('avatarImg');
    if (avatarInput && avatarImg) {
        avatarInput.addEventListener('change', (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (evt) => { avatarImg.src = evt.target.result; };
            reader.readAsDataURL(file);
        });
    }

    /* ========== Password reset ========== */
    function getApiBase() {
        const configuredBase = (window.API_BASE || window.__API_BASE__ || '').replace(/\/$/, '');
        if (configuredBase) return configuredBase;

        const host = window.location && window.location.hostname ? window.location.hostname : '';
        if (!host || host === 'localhost' || host === '127.0.0.1' || host === '::1' || host.startsWith('192.') || host.startsWith('10.')) {
            return 'http://localhost:4000';
        }

        return 'https://yolaaiinfohub-backend.onrender.com';
    }

    document.querySelectorAll('.field-suffix-btn[data-toggle-password]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const target = document.getElementById(btn.dataset.togglePassword);
            if (!target) return;
            const icon = btn.querySelector('i');
            if (target.type === 'password') {
                target.type = 'text';
                if (icon) { icon.classList.remove('fa-eye'); icon.classList.add('fa-eye-slash'); }
                btn.setAttribute('aria-label', 'Hide password');
            } else {
                target.type = 'password';
                if (icon) { icon.classList.remove('fa-eye-slash'); icon.classList.add('fa-eye'); }
                btn.setAttribute('aria-label', 'Show password');
            }
        });
    });

    const newPw = document.getElementById('newPassword');
    const confirmPw = document.getElementById('confirmPassword');
    const meterBar = document.querySelector('.pw-meter-bar');
    const meterLabel = document.querySelector('.pw-meter-label span:last-child');
    const rules = document.querySelectorAll('.pw-rules li');
    const confirmError = document.getElementById('confirmError');

    function evaluate(pw) {
        const checks = {
            len: pw.length >= 8,
            upper: /[A-Z]/.test(pw),
            num: /\d/.test(pw),
            sym: /[^A-Za-z0-9]/.test(pw),
        };
        let score = 0;
        Object.values(checks).forEach((v) => { if (v) score++; });
        return { score, checks };
    }

    if (newPw && meterBar) {
        const labels = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'];
        newPw.addEventListener('input', () => {
            const { score, checks } = evaluate(newPw.value);
            meterBar.dataset.strength = score;
            if (meterLabel) meterLabel.textContent = newPw.value ? labels[score] : '—';
            rules.forEach((li) => {
                const key = li.dataset.rule;
                if (checks[key]) li.classList.add('ok'); else li.classList.remove('ok');
            });
            checkMatch();
        });
    }

    function checkMatch() {
        if (!newPw || !confirmPw || !confirmError) return;
        if (!confirmPw.value) { confirmError.textContent = ''; confirmPw.classList.remove('is-invalid'); return; }
        if (newPw.value !== confirmPw.value) {
            confirmError.innerHTML = '<i class="fas fa-circle-exclamation"></i> Passwords do not match';
            confirmPw.classList.add('is-invalid');
        } else {
            confirmError.textContent = '';
            confirmPw.classList.remove('is-invalid');
        }
    }
    if (confirmPw) confirmPw.addEventListener('input', checkMatch);

    const pwForm = document.getElementById('passwordForm');
    if (pwForm) {
        pwForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const alert = document.getElementById('formAlert');
            const params = new URLSearchParams(window.location.search);
            const token = params.get('token');
            const email = params.get('email');
            const { score } = evaluate(newPw.value);
            if (!token || !email) {
                showAlert(alert, 'error', 'This reset link is missing the verification token. Please request a fresh link.');
                return;
            }
            if (score < 3) {
                showAlert(alert, 'error', 'Please choose a stronger password (at least 8 characters with mixed case and a number).');
                return;
            }
            if (newPw.value !== confirmPw.value) {
                showAlert(alert, 'error', 'New passwords do not match.');
                return;
            }

            try {
                const apiBase = getApiBase();
                const response = await fetch(`${apiBase}/api/reset-password`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, token, password: newPw.value })
                });
                const data = await response.json().catch(() => ({}));
                if (!response.ok || !data.success) {
                    showAlert(alert, 'error', data.error || 'Unable to reset your password right now.');
                    return;
                }
                showAlert(alert, 'success', 'Password updated successfully. You can now sign in with your new password.');
                pwForm.reset();
                if (meterBar) meterBar.dataset.strength = 0;
                if (meterLabel) meterLabel.textContent = '—';
                rules.forEach((li) => li.classList.remove('ok'));
            } catch (error) {
                showAlert(alert, 'error', error && error.message ? error.message : 'Unable to reset your password right now.');
            }
        });
    }

    function showAlert(el, kind, msg) {
        if (!el) return;
        el.className = 'form-alert show ' + kind;
        const icon = kind === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation';
        el.innerHTML = `<i class="fas ${icon}"></i><span>${msg}</span>`;
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    /* ========== Terms: TOC toggle + active link ========== */
    const tocWrap = document.querySelector('.toc-wrap');
    const tocToggle = document.querySelector('.toc-toggle');
    if (tocWrap && tocToggle) {
        tocToggle.addEventListener('click', () => {
            const open = tocWrap.classList.toggle('open');
            tocToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        });
    }

    const tocLinks = document.querySelectorAll('.toc-list a');
    if (tocLinks.length && 'IntersectionObserver' in window) {
        const map = new Map();
        tocLinks.forEach((a) => {
            const id = a.getAttribute('href').slice(1);
            const target = document.getElementById(id);
            if (target) map.set(target, a);
        });
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    tocLinks.forEach((l) => l.classList.remove('active'));
                    const link = map.get(entry.target);
                    if (link) link.classList.add('active');
                }
            });
        }, { rootMargin: '-30% 0px -60% 0px', threshold: 0 });
        map.forEach((_, section) => observer.observe(section));
    }

    tocLinks.forEach((a) => {
        a.addEventListener('click', () => {
            if (window.innerWidth < 900 && tocWrap) {
                tocWrap.classList.remove('open');
                tocToggle && tocToggle.setAttribute('aria-expanded', 'false');
            }
        });
    });
})();






/* Yola AI Info Hub — shared JS for Terms / Privacy / Help pages */
(function () {
    'use strict';

    // Footer year
    var yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    /* -------- TOC (Terms + Privacy) -------- */
    var tocWrap = document.querySelector('.toc-wrap');
    if (tocWrap) {
        var toggle = tocWrap.querySelector('.toc-toggle');
        if (toggle) {
            toggle.addEventListener('click', function () {
                tocWrap.classList.toggle('is-open');
                var expanded = tocWrap.classList.contains('is-open');
                toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
            });
        }

        var tocLinks = Array.prototype.slice.call(tocWrap.querySelectorAll('.toc-list a'));
        var sectionMap = {};
        tocLinks.forEach(function (link) {
            var id = link.getAttribute('href');
            if (id && id.charAt(0) === '#') {
                var el = document.getElementById(id.slice(1));
                if (el) sectionMap[id.slice(1)] = link;
            }
            // Close mobile TOC after tap
            link.addEventListener('click', function () {
                if (window.matchMedia('(max-width: 599px)').matches) {
                    tocWrap.classList.remove('is-open');
                }
            });
        });

        var sections = Object.keys(sectionMap).map(function (id) { return document.getElementById(id); });
        if ('IntersectionObserver' in window && sections.length) {
            var setActive = function (id) {
                tocLinks.forEach(function (a) { a.classList.remove('is-active'); });
                if (sectionMap[id]) sectionMap[id].classList.add('is-active');
            };
            var observer = new IntersectionObserver(function (entries) {
                var visible = entries
                    .filter(function (e) { return e.isIntersecting; })
                    .sort(function (a, b) { return b.intersectionRatio - a.intersectionRatio; });
                if (visible.length) setActive(visible[0].target.id);
            }, { rootMargin: '-100px 0px -60% 0px', threshold: [0, 0.25, 0.6, 1] });
            sections.forEach(function (s) { observer.observe(s); });
        }
    }

    /* -------- FAQ accordion + search (Help) -------- */
    var faqItems = Array.prototype.slice.call(document.querySelectorAll('.faq-item'));
    faqItems.forEach(function (item) {
        var btn = item.querySelector('.faq-question');
        if (!btn) return;
        btn.addEventListener('click', function () {
            var open = item.classList.toggle('is-open');
            btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        });
    });

    var search = document.getElementById('faqSearch');
    var empty = document.getElementById('faqEmpty');
    if (search) {
        var groups = Array.prototype.slice.call(document.querySelectorAll('.faq-group'));
        search.addEventListener('input', function () {
            var q = search.value.trim().toLowerCase();
            var anyMatch = false;
            groups.forEach(function (group) {
                var items = Array.prototype.slice.call(group.querySelectorAll('.faq-item'));
                var groupHas = false;
                items.forEach(function (item) {
                    if (!q) {
                        item.style.display = '';
                        groupHas = true;
                        return;
                    }
                    var text = item.textContent.toLowerCase();
                    var match = text.indexOf(q) !== -1;
                    item.style.display = match ? '' : 'none';
                    if (match) { groupHas = true; anyMatch = true; }
                });
                group.style.display = (!q || groupHas) ? '' : 'none';
            });
            if (empty) {
                if (q && !anyMatch) empty.classList.add('is-shown');
                else empty.classList.remove('is-shown');
            }
        });
    }

    /* -------- Category chips (Help) -------- */
    var chips = Array.prototype.slice.call(document.querySelectorAll('.chip[data-target]'));
    chips.forEach(function (chip) {
        chip.addEventListener('click', function () {
            var id = chip.getAttribute('data-target');
            var el = document.getElementById(id);
            if (!el) return;
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            el.classList.add('is-highlighted');
            setTimeout(function () { el.classList.remove('is-highlighted'); }, 1400);
        });
    });
})();



/* Learn page: eco tips library, carbon footprint calculator, quiz. */

import { $, $$, autoInit, escapeHtml, loadJSON, store, toast } from "./ui.js";

autoInit();

let TIPS = [];
let FACTORS = {};
let category = "All";

loadJSON("data/tips.json")
  .then((d) => {
    TIPS = d.tips;
    FACTORS = d.carbonFactors;
    renderFilters();
    renderTips();
  })
  .catch(() => toast("Could not load the eco library.", "err"));

function renderFilters() {
  const cats = ["All", ...new Set(TIPS.map((t) => t.category))];
  $("#tip-filters").innerHTML = cats
    .map((c) => `<button class="pill ${c === category ? "pill-gold" : ""}" data-c="${escapeHtml(c)}">${escapeHtml(c)}</button>`)
    .join("");
  $$("#tip-filters button").forEach((b) =>
    b.addEventListener("click", () => {
      category = b.dataset.c;
      renderFilters();
      renderTips();
    }),
  );
}

function renderTips() {
  const rows = TIPS.filter((t) => category === "All" || t.category === category);
  $("#tips").innerHTML = rows
    .map(
      (t) => `<article class="card card-hover" style="padding:22px">
        <div style="display:flex;justify-content:space-between;gap:8px">
          <span class="pill">${escapeHtml(t.category)}</span>
          <span class="pill ${t.impact === "High" ? "pill-good" : "pill-fair"}">${escapeHtml(t.impact)} impact</span>
        </div>
        <h3 style="margin:.7rem 0 .3rem">${escapeHtml(t.title)}</h3>
        <p class="small muted" style="margin:0">${escapeHtml(t.body)}</p>
      </article>`,
    )
    .join("");
}

/* ---------------- carbon calculator ---------------- */

$("#carbon-form")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const v = (id) => Number($(`#${id}`).value || 0);
  const items = [
    ["Grid electricity", v("kwh") * FACTORS.gridElectricityKgPerKwh],
    ["Generator fuel", v("petrol") * FACTORS.generatorPetrolKgPerLitre],
    ["Car travel", v("carKm") * FACTORS.carPetrolKgPerKm],
    ["Motorcycle / keke", v("bikeKm") * FACTORS.motorcycleKgPerKm],
    ["Cooking gas", v("lpg") * FACTORS.lpgKgPerKg],
    ["Firewood / charcoal", v("firewood") * FACTORS.firewoodKgPerKg],
    ["Waste to dump", v("wasteKg") * FACTORS.wasteLandfillKgPerKg],
    ["Waste burned", v("burnKg") * FACTORS.wasteBurnedKgPerKg],
    ["Water use", v("water") * FACTORS.waterKgPerM3],
  ].filter(([, kg]) => kg > 0);

  const total = items.reduce((a, [, kg]) => a + kg, 0);
  const trees = total * 12 / FACTORS.treeAbsorptionKgPerYear;
  const vsAvg = FACTORS.nigeriaAverageMonthlyKg
    ? Math.round(((total - FACTORS.nigeriaAverageMonthlyKg) / FACTORS.nigeriaAverageMonthlyKg) * 100)
    : 0;
  const max = Math.max(...items.map(([, kg]) => kg), 1);

  store.set("carbon-last", { total, at: Date.now() });

  $("#carbon-result").innerHTML = `
    <div class="card" style="padding:26px">
      <div class="eyebrow">Your monthly footprint</div>
      <p class="stat-value" style="font-size:2.4rem;margin:.2rem 0">${total.toFixed(1)} kg CO₂e</p>
      <p class="muted small">${vsAvg >= 0 ? `${vsAvg}% above` : `${Math.abs(vsAvg)}% below`} the Nigerian household average (${FACTORS.nigeriaAverageMonthlyKg} kg/month).</p>
      <p>Offsetting a full year would take about <strong>${Math.ceil(trees)}</strong> mature trees.</p>
      <div style="margin-top:18px">
        ${items
          .sort((a, b) => b[1] - a[1])
          .map(
            ([label, kg]) => `<div style="margin-bottom:10px">
              <div style="display:flex;justify-content:space-between" class="small"><span>${label}</span><strong>${kg.toFixed(1)} kg</strong></div>
              <div class="gauge-track"><div class="gauge-fill" style="width:${(kg / max) * 100}%"></div></div>
            </div>`,
          )
          .join("")}
      </div>
      <h3 style="margin-top:20px">Biggest wins for you</h3>
      <ul style="padding-left:20px;line-height:1.8">
        ${suggestions(items, total).map((s) => `<li>${escapeHtml(s)}</li>`).join("")}
      </ul>
    </div>`;
  $("#carbon-result").scrollIntoView({ behavior: "smooth", block: "nearest" });
});

function suggestions(items, total) {
  const sorted = [...items].sort((a, b) => b[1] - a[1]);
  const out = [];
  const top = sorted[0]?.[0];
  if (top === "Generator fuel") out.push("Batch your generator runs and consider a solar + battery hybrid for lighting and phone charging.");
  if (top === "Grid electricity") out.push("Swap remaining bulbs for LEDs and unplug idle appliances — standby load is often 5–10% of a bill.");
  if (top === "Waste burned") out.push("Burning waste is your largest source. Separate recyclables and compost organics instead — it cuts this to near zero.");
  if (top === "Car travel") out.push("Combine errands into one trip and share rides where possible; each avoided 100 km saves about 19 kg CO₂e.");
  if (top === "Firewood / charcoal") out.push("An improved cookstove or LPG cuts both emissions and indoor smoke exposure sharply.");
  const waste = items.find(([l]) => l === "Waste to dump");
  if (waste && waste[1] > 5) out.push("Divert half your waste to recycling and composting to cut that line by roughly 45%.");
  if (total > 250) out.push("You are well above the local average — pick the top two lines above and target a 20% cut this month.");
  if (!out.length) out.push("Your footprint is already lean. Log your waste on the schedule page to keep the trend going.");
  return out;
}

/* ---------------- quiz ---------------- */

const QUIZ = [
  { q: "Which of these should never go into your household bin?", a: ["Banana peels", "Used batteries", "Paper wrappers"], correct: 1, why: "Batteries leach acid and heavy metals — take them to the e-waste point." },
  { q: "What is the best thing to do with pure water sachets?", a: ["Burn them", "Bundle and take to a plastic buy-back hub", "Bury them"], correct: 1, why: "Burning nylon releases dioxins; buy-back hubs pay per kilogram." },
  { q: "Roughly what share of household waste in Yola is organic?", a: ["About 10%", "About half", "Almost none"], correct: 1, why: "Around half is food and garden waste — ideal for composting." },
  { q: "When is dust haze worst in Yola?", a: ["Peak of the rains", "Harmattan season", "It never varies"], correct: 1, why: "Harmattan brings Saharan dust that pushes PM10 far above safe levels." },
  { q: "Why should waste be kept out of drainage channels?", a: ["It looks untidy", "It causes flash flooding", "It is illegal only for shops"], correct: 1, why: "Blocked drains are the leading cause of flash flooding in Jimeta." },
];

let qIndex = 0;
let qScore = 0;

function renderQuiz() {
  const wrap = $("#quiz");
  if (!wrap) return;
  if (qIndex >= QUIZ.length) {
    wrap.innerHTML = `<div class="card" style="padding:26px;text-align:center">
      <div class="eyebrow" style="justify-content:center">Result</div>
      <p class="stat-value">${qScore}/${QUIZ.length}</p>
      <p class="muted">${qScore === QUIZ.length ? "Perfect — you are an EcoInfo champion." : "Good effort. Review the tips above and try again."}</p>
      <button class="btn btn-gold" id="quiz-restart">Play again</button>
    </div>`;
    $("#quiz-restart").addEventListener("click", () => { qIndex = 0; qScore = 0; renderQuiz(); });
    return;
  }
  const item = QUIZ[qIndex];
  wrap.innerHTML = `<div class="card" style="padding:26px">
    <div class="small muted">Question ${qIndex + 1} of ${QUIZ.length}</div>
    <h3 style="margin:.4rem 0 1rem">${escapeHtml(item.q)}</h3>
    <div class="grid" style="gap:10px">
      ${item.a.map((a, i) => `<button class="btn btn-ghost" data-i="${i}" style="justify-content:flex-start">${escapeHtml(a)}</button>`).join("")}
    </div>
    <p class="help" id="quiz-why"></p>
  </div>`;
  $$("#quiz [data-i]").forEach((b) =>
    b.addEventListener("click", () => {
      const ok = Number(b.dataset.i) === item.correct;
      if (ok) qScore += 1;
      $("#quiz-why").textContent = `${ok ? "Correct — " : "Not quite — "}${item.why}`;
      $$("#quiz [data-i]").forEach((x) => (x.disabled = true));
      setTimeout(() => { qIndex += 1; renderQuiz(); }, 1600);
    }),
  );
}
renderQuiz();

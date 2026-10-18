const CURRENCIES = [
  ["NGN","Nigerian Naira","Nigeria","ng","₦"],["USD","US Dollar","United States","us","$"],
  ["GBP","British Pound","United Kingdom","gb","£"],["EUR","Euro","European Union","eu","€"],
  ["XAF","CFA Franc","Cameroon","cm","FCFA"],["SAR","Saudi Riyal","Saudi Arabia","sa","﷼"],
  ["AED","UAE Dirham","United Arab Emirates","ae","د.إ"],["CNY","Chinese Yuan","China","cn","¥"],
  ["GHS","Ghana Cedi","Ghana","gh","₵"],["ZAR","South African Rand","South Africa","za","R"],
  ["CAD","Canadian Dollar","Canada","ca","C$"],["INR","Indian Rupee","India","in","₹"],
].map(([code,name,country,flag,symbol])=>({code,name,country,flag,symbol}));
let rates = {USD:1,NGN:1530,GBP:0.78,EUR:0.92,XAF:603,SAR:3.75,AED:3.67,CNY:7.2,GHS:15.5,ZAR:18.2,CAD:1.37,INR:83.5};
let active = JSON.parse(localStorage.getItem("dealz.fx.active") || "null") || ["NGN","USD","GBP","EUR","XAF","SAR"];
let source = { code: "NGN", raw: "10000" };
const grid = document.getElementById("fx");
const fmt = (n) => isFinite(n) ? n.toLocaleString("en-NG",{maximumFractionDigits: Math.abs(n)>=1?2:4}) : "";
const usd = () => { const v = parseFloat(String(source.raw).replace(/,/g,"")); return isNaN(v) ? NaN : v / rates[source.code]; };
const esc = (s) => s.replace(/[&<>"]/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]);

function render() {
  localStorage.setItem("dealz.fx.active", JSON.stringify(active));
  const cards = active.map((code) => {
    const c = CURRENCIES.find((x) => x.code === code);
    return `<div class="card fx-card${source.code===code?" is-source":""}" data-code="${code}">
      <div class="fx-head"><img src="https://flagcdn.com/w80/${c.flag}.png" alt="Flag of ${esc(c.country)}" loading="lazy">
      <div class="fx-name"><strong>${code}</strong> <span class="muted">${c.symbol}</span><div class="small muted">${esc(c.name)} · ${esc(c.country)}</div></div>
      ${active.length>2?`<button class="button button-ghost button-sm" data-remove="${code}" aria-label="Remove ${esc(c.name)}">✕</button>`:""}</div>
      <label class="sr-only" for="fx-${code}">Amount in ${esc(c.name)}</label>
      <input class="fx-input" id="fx-${code}" inputmode="decimal" data-input="${code}">
      ${code!=="NGN"?`<p class="small muted">1 ${code} = ₦<span data-rate="${code}"></span></p>`:""}</div>`;
  }).join("");
  const rest = CURRENCIES.filter((c) => !active.includes(c.code));
  grid.innerHTML = cards + (rest.length ? `<div class="fx-add"><p class="small muted" style="grid-column:1/-1">Add a currency</p>${rest.map((c)=>`<button class="button button-outline button-sm" data-add="${c.code}"><img src="https://flagcdn.com/w40/${c.flag}.png" alt="">${c.code}</button>`).join("")}</div>` : "");
  update();
}
function update() {
  const base = usd();
  grid.querySelectorAll("[data-input]").forEach((el) => {
    const code = el.dataset.input;
    if (code === source.code) { if (document.activeElement !== el) el.value = source.raw; }
    else el.value = fmt(base * rates[code]);
    el.closest(".fx-card").classList.toggle("is-source", code === source.code);
  });
  grid.querySelectorAll("[data-rate]").forEach((el) => { el.textContent = fmt(rates.NGN / rates[el.dataset.rate]); });
}
grid.addEventListener("input", (e) => {
  const code = e.target.dataset.input; if (!code) return;
  e.target.value = e.target.value.replace(/[^\d.,]/g, "");
  source = { code, raw: e.target.value }; update();
});
grid.addEventListener("focusin", (e) => {
  const code = e.target.dataset?.input; if (!code || code === source.code) return;
  source = { code, raw: e.target.value.replace(/,/g, "") }; e.target.value = source.raw; update();
});
grid.addEventListener("click", (e) => {
  const add = e.target.closest("[data-add]"), rm = e.target.closest("[data-remove]");
  if (add) { active.push(add.dataset.add); render(); }
  if (rm) { const code = rm.dataset.remove; if (source.code === code) { const next = active.find((x)=>x!==code); source = { code: next, raw: fmt(usd()*rates[next]).replace(/,/g,"") }; } active = active.filter((x)=>x!==code); render(); }
});
async function loadRates() {
  const label = document.getElementById("updated");
  try {
    const j = await (await fetch("https://open.er-api.com/v6/latest/USD")).json();
    if (j && j.rates) { rates = { ...rates, ...j.rates }; label.textContent = "Rates updated " + new Date(j.time_last_update_utc).toLocaleString(); }
  } catch { label.textContent = "Showing sample rates (offline)"; }
  update();
}
document.getElementById("refresh").addEventListener("click", loadRates);
render(); loadRates();

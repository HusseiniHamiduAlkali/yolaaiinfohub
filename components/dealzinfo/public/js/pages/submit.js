import { api } from "../api.js";
import { $, $$, clear, el, param, setParams } from "../ui.js";

const form = $("#form");
const result = $("#result");
let tab = param("tab", "price");
let commodities = [];
let markets = [];

const CATEGORIES = ["Grocery Shop", "Food Vendor", "Farmer", "Agricultural Supplier", "Wholesaler", "Retailer", "Restaurant", "Tailor", "Mechanic", "Electronics Shop", "Building Materials", "Pharmacy", "Transportation", "Freelancer", "Other"];

function field(name, label, input) {
  input.id = `f-${name}`;
  input.name = name;
  return el("div", { class: "field" }, [el("label", { for: input.id, text: label }), input]);
}
const text = (attrs = {}) => el("input", { type: "text", ...attrs });
const select = (options, attrs = {}) => el("select", attrs, options.map((o) => el("option", { value: o.value, text: o.label })));

function buildForm() {
  setParams({ tab });
  $$("[data-tab]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === tab)));
  clear(form);
  clear(result);
  const who = [field("submittedBy", "Your name *", text({ required: true, maxlength: 120 })), field("contact", "Phone or email (optional)", text({ maxlength: 120 }))];

  if (tab === "price") {
    const cSel = select(commodities.map((c) => ({ value: c.id, label: c.name })), { required: true });
    const unit = select([]);
    const syncUnits = () => {
      const c = commodities.find((x) => x.id === cSel.value);
      clear(unit);
      (c?.units ?? ["kg"]).forEach((u) => unit.append(el("option", { value: u, text: u })));
    };
    cSel.addEventListener("change", syncUnits);
    form.append(
      el("div", { class: "grid grid-2" }, [
        field("commodityId", "Commodity *", cSel),
        field("marketId", "Market *", select(markets.map((m) => ({ value: m.id, label: m.name })), { required: true })),
        field("unit", "Unit *", unit),
        field("price", "Price in Naira *", el("input", { type: "number", min: "1", step: "1", required: true, inputmode: "numeric" })),
        ...who,
      ]),
      field("note", "Notes (optional)", el("textarea", { maxlength: 600 })),
    );
    syncUnits();
  } else if (tab === "business") {
    form.append(
      el("div", { class: "grid grid-2" }, [
        field("name", "Business name *", text({ required: true, maxlength: 160 })),
        field("category", "Category", select(CATEGORIES.map((c) => ({ value: c, label: c })))),
        field("area", "Area", text({ placeholder: "Jimeta, Yola Town…" })),
        field("address", "Address", text()),
        field("phone", "Phone", el("input", { type: "tel" })),
        field("whatsapp", "WhatsApp", el("input", { type: "tel" })),
        field("openingHours", "Opening hours", text({ placeholder: "Mon–Sat, 8 AM – 6 PM" })),
        field("products", "Products / services (comma separated)", text()),
        ...who,
      ]),
      field("description", "Short description", el("textarea", { maxlength: 600 })),
    );
  } else {
    form.append(el("div", { class: "grid grid-2" }, who), field("note", "What is wrong? *", el("textarea", { required: true, maxlength: 1000 })));
  }
  form.append(el("div", {}, [el("button", { class: "button button-gold", type: "submit", text: "Send for review" })]));
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const fd = Object.fromEntries(new FormData(form));
  const base = { kind: tab, submittedBy: fd.submittedBy?.trim(), contact: fd.contact?.trim() || undefined, note: fd.note?.trim() || undefined };
  let body;
  if (tab === "price") body = { ...base, payload: { commodityId: fd.commodityId, marketId: fd.marketId, unit: fd.unit, price: Number(fd.price) } };
  else if (tab === "business") {
    const { submittedBy, contact, note, ...payload } = fd;
    body = { ...base, payload };
  } else body = { ...base, payload: {} };

  const button = form.querySelector("button[type=submit]");
  button.disabled = true;
  clear(result);
  try {
    const res = await api.submit(body);
    result.append(el("div", { class: "notice notice-success", text: `Thank you! Your submission (ref ${res.reference}) will be reviewed before it is published.` }));
    form.reset();
  } catch (error) {
    result.append(el("div", { class: "notice notice-error", text: error.message }));
  } finally {
    button.disabled = false;
  }
});

$$("[data-tab]").forEach((b) => b.addEventListener("click", () => { tab = b.dataset.tab; buildForm(); }));

[commodities, markets] = await Promise.all([api.commodities(), api.markets()]);
if (!["price", "business", "correction"].includes(tab)) tab = "price";
buildForm();

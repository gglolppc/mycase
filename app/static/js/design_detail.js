import { models } from "./models.js";

const brandSelect = document.getElementById("brand-select");
const modelSelect = document.getElementById("model-select");

const openBtn = document.getElementById("open-order-modal");
const modal = document.getElementById("order-modal");
const overlay = document.getElementById("order-modal-overlay");
const closeBtn = document.getElementById("order-modal-close");

const personalTextInput = document.getElementById("personal-text");

// payload inputs
const payloadBrand = document.getElementById("payload-brand");
const payloadModel = document.getElementById("payload-model");
const payloadPersonal = document.getElementById("payload-personal");
const summaryModel = document.getElementById("summary-model");

function humanizeModel(model) {
  if (!model) return "";
  let s = model.replaceAll("_", " ");

  s = s.replace(/\biphone\b/i, "iPhone");
  s = s.replace(/\bredmi\b/i, "Redmi");
  s = s.replace(/\bpoco\b/i, "Poco");
  s = s.replace(/\boppo\b/i, "Oppo");

  s = s.replace(/\ba(\d+)/gi, "A$1");
  s = s.replace(/\bs(\d+)/gi, "S$1");
  s = s.replace(/\bm(\d+)/gi, "M$1");

  s = s.replace(/\bpro\b/gi, "Pro")
    .replace(/\bmax\b/gi, "Max")
    .replace(/\bplus\b/gi, "Plus")
    .replace(/\bultra\b/gi, "Ultra")
    .replace(/\bfe\b/gi, "FE")
    .replace(/\bse\b/gi, "SE");

  s = s.replace(/\b4g\b/gi, "4G").replace(/\b5g\b/gi, "5G");
  return s;
}

function fillModels(brandKey) {
  modelSelect.innerHTML = '<option value="">Alege modelul</option>';

  const list = models?.[brandKey] || [];
  for (const m of list) {
    const opt = document.createElement("option");
    opt.value = m;                   // raw key for backend
    opt.textContent = humanizeModel(m); // pretty for UI
    modelSelect.appendChild(opt);
  }

  modelSelect.disabled = !brandKey;
}

brandSelect.addEventListener("change", () => fillModels(brandSelect.value));
fillModels(brandSelect.value);

// ---- modal helpers ----
function openModal() {
  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  modal.classList.add("hidden");
  document.body.style.overflow = "";
}

function requireSelection() {
  if (!brandSelect.value) {
    brandSelect.focus();
    brandSelect.classList.add("ring-4", "ring-red-500/30");
    setTimeout(() => brandSelect.classList.remove("ring-4", "ring-red-500/30"), 600);
    return false;
  }
  if (!modelSelect.value) {
    modelSelect.focus();
    modelSelect.classList.add("ring-4", "ring-red-500/30");
    setTimeout(() => modelSelect.classList.remove("ring-4", "ring-red-500/30"), 600);
    return false;
  }
  return true;
}

openBtn.addEventListener("click", () => {
  if (!requireSelection()) return;

  // fill payload for POST /order/ready
  payloadBrand.value = brandSelect.value;
  payloadModel.value = modelSelect.value;
  payloadPersonal.value = (personalTextInput?.value || "").trim();

  // update summary
  summaryModel.textContent = `${brandSelect.options[brandSelect.selectedIndex].text} / ${humanizeModel(modelSelect.value)}`;

  openModal();
});

// close actions
overlay.addEventListener("click", closeModal);
closeBtn.addEventListener("click", closeModal);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !modal.classList.contains("hidden")) closeModal();
});

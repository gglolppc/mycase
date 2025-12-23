import {
  createCanvasThermos,
  setCanvasTheme,
  setThermosOverlay,
  setDefaultVerticalText,
  addImageToCanvasSmall,
  clearDesignThermos,
  exportCanvasPng,
  keepTextOnTop,
} from './canvas.js';

import { setupThermosOrderForm } from './submit.js';

// ---------- helpers ----------
async function waitForFonts(fonts) {
  await Promise.all(fonts.map(({ label }) => document.fonts.load(`16px "${label}"`)));
  await document.fonts.ready;
}





export async function initThermos() {
  const DOM = {
    size500: document.getElementById('termos-500'),
    size750: document.getElementById('termos-750'),
    termosPreview: document.getElementById('termos-preview'),

    colorsWrap: document.getElementById('termos-colors'),

    termosText: document.getElementById('termos-text'),
    fontSelector: document.getElementById('font-selector-termos'),
    textColor: document.getElementById('text-color-termos'),

    thumbnails: document.getElementById('thumbnails-termos'),
    uploadInput: document.getElementById('upload-termos'),

    // desktop
    clearCanvasBtn: document.getElementById('clear-canvas-termos'),
    orderBtn: document.getElementById('order-btn-termos'),

    // ✅ mobile (добавили)
    mobileClearBtn: document.getElementById('mobile-clear-termos'),
    mobileOrderBtn: document.getElementById('mobile-order-termos'),

    priceValue: document.getElementById('price-value-termos'),

    cancelOrder: document.getElementById('cancel-order'),
    orderFormModal: document.getElementById('order-form'),
    form: document.getElementById('order-form-el'),
    toast: document.getElementById('toast'),
    submitOrderBtn: document.getElementById('submit-order-btn'),
    submitText: document.getElementById('submit-text'),
    loadingText: document.getElementById('loading-text'),
  };

  const STATIC_BASE = window.STATIC_BASE || '/static/';
  const { canvas } = createCanvasThermos();

  const state = {
    uploadedFiles: [],
    currentOverlay: null,
    defaultTextObj: null,
    selectedColor: 'black',

    // ✅ чтобы тема не перетирала цвет, если юзер сам выбрал
    userPickedTextColor: false,
  };

  // --- keep text always on top
  const keep = () => keepTextOnTop(canvas, state);
  canvas.on('object:added', keep);
  canvas.on('object:modified', keep);

  const colorSets = {
    '500': [
      { key: 'black', hex: '#111827' },
      { key: 'grey', hex: '#5e5c5b' },
      { key: 'light_blue', hex: '#a5ccd9' },
      { key: 'pink', hex: '#d69d99' },
      { key: 'orange', hex: '#ea580c' },
      { key: 'red', hex: '#af3036' },
      { key: 'mint', hex: '#9ad9a7' },
      { key: 'blue', hex: '#26415e' },
      { key: 'yellow', hex: '#eeee5d' },
      { key: 'dark_green', hex: '#305f43' },
    ],
    '750': [
      { key: 'black-matte', hex: '#1f2933' },
      { key: 'graphite', hex: '#4b5563' },
      { key: 'red', hex: '#c81e1e' },
      { key: 'orange', hex: '#ea580c' },
      { key: 'beige', hex: '#e6d3b1' },
      { key: 'mint', hex: '#cde8df' },
      { key: 'green', hex: '#0f766e' },
      { key: 'pink', hex: '#f2a1b3' },
      { key: 'blue', hex: '#1e3a8a' },
      { key: 'purple', hex: '#7c6fb0' },
    ],
  };

  const fonts = [
    { label: 'Roboto Slab', value: 'Roboto Slab, serif' },
    { label: 'Montserrat', value: 'Montserrat, sans-serif' },
    { label: 'Oswald', value: 'Oswald, sans-serif' },
    { label: 'Pacifico', value: 'Pacifico, cursive' },
    { label: 'Exo 2', value: 'Exo 2, sans-serif' },
    { label: 'Caveat', value: 'Caveat, cursive' },
    { label: 'Advent Pro', value: 'Advent Pro, sans-serif' },
    { label: 'Amatic SC', value: 'Amatic SC, cursive' },
    { label: 'Russo One', value: 'Russo One, sans-serif' },
    { label: 'Marck Script', value: 'Marck Script, cursive' },
    { label: 'Rampart One', value: 'Rampart One, cursive' },
    { label: 'Rubik Dirt', value: 'Rubik Dirt, cursive' },
    { label: 'Great Vibes', value: 'Great Vibes, cursive' },
  ];

  function showToast(msg, type = 'success') {
    DOM.toast.textContent = msg;
    DOM.toast.classList.remove('border-green-500', 'border-red-500');
    DOM.toast.classList.add(type === 'error' ? 'border-red-500' : 'border-green-500');
    DOM.toast.classList.remove('opacity-0');
    setTimeout(() => DOM.toast.classList.add('opacity-0'), 3500);
  }

  // ✅ Единственный источник темы — класс "dark" на <html>
  function syncThemeToCanvas({ forceText = false } = {}) {
    const isDark = document.documentElement.classList.contains('dark');
    setCanvasTheme(canvas, isDark);

    // если текст уже есть — делаем читабельным (если юзер не выбирал цвет)
    if (
      state.defaultTextObj &&
      (forceText || !state.userPickedTextColor) &&
      !state.defaultTextObj.__userColorSet
    ) {
      const next = isDark ? '#ffffff' : '#ffffff';
      state.defaultTextObj.set({ fill: next });

      // синхроним пикер, чтобы UI не врал
      if (DOM.textColor) DOM.textColor.value = next;
    }

    canvas.requestRenderAll();
  }

  function currentSize() {
    return DOM.size750.checked ? '750' : '500';
  }

  function updatePrice() {
    DOM.priceValue.textContent = currentSize() === '500' ? '320' : '380';
  }

  function updatePreviewThumb() {
    const size = currentSize();
    DOM.termosPreview.src = `${STATIC_BASE}assets/termos-previews/${size}.png`;
  }

  function renderColors() {
    const size = currentSize();
    const colors = colorSets[size] || [];

    DOM.colorsWrap.innerHTML = '';
    if (!colors.length) return;

    if (!colors.some((c) => c.key === state.selectedColor)) {
      state.selectedColor = colors[0].key;
    }

    colors.forEach((c) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className =
        'w-9 h-9 rounded-full border-2 border-white/60 shadow-md hover:scale-110 transition';
      btn.style.background = c.hex;

      if (c.key === state.selectedColor) {
        btn.classList.add('ring-4', 'ring-purple-500/40');
      }

      btn.addEventListener('click', () => {
        state.selectedColor = c.key;
        renderColors();
        setThermosOverlay({ canvas, state, size, color: state.selectedColor, STATIC_BASE });
        keep();
      });

      DOM.colorsWrap.appendChild(btn);
    });
  }

  function ensureDefaultText() {
    const txt = DOM.termosText.value || 'NUMELE';

    // ✅ если юзер не выбирал цвет — авто-цвет от темы
    const isDark = document.documentElement.classList.contains('dark');
    const autoColor = isDark ? '#ffffff' : '#111827';

    const chosen =
      (state.userPickedTextColor || state.defaultTextObj?.__userColorSet)
        ? DOM.textColor.value
        : autoColor;

    // синхроним пикер, чтобы не врал
    if (!(state.userPickedTextColor || state.defaultTextObj?.__userColorSet)) {
      DOM.textColor.value = autoColor;
    }

    if (!state.defaultTextObj) {
      setDefaultVerticalText({
        canvas,
        state,
        text: txt,
        fontFamily: DOM.fontSelector.value,
        fill: chosen,
      });
      keep();

      // ✅ сразу после создания — синхроним тему (фон + текст)
      syncThemeToCanvas({ forceText: true });
      return;
    }

    state.defaultTextObj.set({
      text: txt,
      fontFamily: DOM.fontSelector.value,
      fill: chosen,
    });

    keep();
    canvas.requestRenderAll();
  }

  function applyOverlayAndDefaults() {
    const size = currentSize();

    updatePrice();
    updatePreviewThumb();
    renderColors();

    setThermosOverlay({ canvas, state, size, color: state.selectedColor, STATIC_BASE });

    // ✅ сначала текст (с правильным цветом), потом тема
    ensureDefaultText();
    syncThemeToCanvas({ forceText: false });
  }

  // ---------- fonts selector ----------
  DOM.fontSelector.innerHTML = '';
  fonts.forEach((f) => {
    const opt = document.createElement('option');
    opt.value = f.value;
    opt.textContent = f.label;
    DOM.fontSelector.appendChild(opt);
  });

  await waitForFonts(fonts);

  // ✅ theme sync (один раз, без дубля)
  syncThemeToCanvas();
  window.addEventListener('theme:changed', () => syncThemeToCanvas({ forceText: false }));

  // ---------- events ----------
  DOM.size500.addEventListener('change', () => {
    applyOverlayAndDefaults();
  });
  DOM.size750.addEventListener('change', () => {
    applyOverlayAndDefaults();
  });

  DOM.termosText.addEventListener('input', ensureDefaultText);
  DOM.fontSelector.addEventListener('change', ensureDefaultText);

  DOM.textColor.addEventListener('input', () => {
    state.userPickedTextColor = true;
    if (state.defaultTextObj) state.defaultTextObj.__userColorSet = true;
    ensureDefaultText();
  });

  DOM.uploadInput.addEventListener('change', (e) => {
    [...e.target.files].forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const fileId = Date.now() + Math.random().toString(16).slice(2);
        state.uploadedFiles.push({ fileId, file });

        const wrapper = document.createElement('div');
        wrapper.className =
          'relative aspect-square rounded-xl overflow-hidden shadow-md border border-black/10 dark:border-white/10';
        wrapper.dataset.fileId = fileId;

        const img = document.createElement('img');
        img.src = ev.target.result;
        img.className = 'w-full h-full object-cover cursor-pointer';
        img.onclick = () => {
          addImageToCanvasSmall(canvas, state, ev.target.result);
          keep();
        };

        const del = document.createElement('button');
        del.className =
          'absolute top-1 right-1 bg-red-500 text-white w-7 h-7 rounded-full flex items-center justify-center shadow';
        del.innerHTML = '×';
        del.onclick = (ev2) => {
          ev2.stopPropagation();
          wrapper.remove();
          state.uploadedFiles = state.uploadedFiles.filter((f) => f.fileId !== fileId);
        };

        wrapper.append(img, del);
        DOM.thumbnails.appendChild(wrapper);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  });

  // =========================
  // ✅ ONLY CHANGE: make both buttons work
  // =========================

  const handleClear = () => {
    clearDesignThermos({ canvas, state });
    applyOverlayAndDefaults();
  };

  [DOM.clearCanvasBtn, DOM.mobileClearBtn]
    .filter(Boolean)
    .forEach((btn) => btn.addEventListener('click', handleClear));

  const handleOrderOpen = () => {
    if (!state.currentOverlay) return showToast('Alege termosul!', 'error');
    DOM.orderFormModal.classList.remove('hidden');
  };

  // =========================
    // MODAL CLOSE HANDLERS
    // =========================

    // клик по фону (вне окна)
    DOM.orderFormModal.addEventListener('click', (e) => {
      // если клик именно по оверлею, а не по содержимому
      if (e.target === DOM.orderFormModal) {
        DOM.orderFormModal.classList.add('hidden');
      }
    });

    // Esc — закрыть
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !DOM.orderFormModal.classList.contains('hidden')) {
        DOM.orderFormModal.classList.add('hidden');
      }
    });


  [DOM.orderBtn, DOM.mobileOrderBtn]
    .filter(Boolean)
    .forEach((btn) => btn.addEventListener('click', handleOrderOpen));

  // ---------- resetApp ----------
  const resetApp = () => {
    DOM.form.reset();
    DOM.orderFormModal.classList.add('hidden');
    DOM.thumbnails.innerHTML = '';
    state.uploadedFiles = [];

    state.userPickedTextColor = false;

    DOM.size750.checked = true;
    state.selectedColor = 'black-matte';
    DOM.termosText.value = 'Numele tau';
    DOM.fontSelector.value = 'Montserrat, sans-serif';

    // ✅ дефолтный цвет зависит от темы
    DOM.textColor.value = document.documentElement.classList.contains('dark') ? '#ffffff' : '#111827';

    canvas.clear();
    state.currentOverlay = null;
    state.defaultTextObj = null;

    applyOverlayAndDefaults();
  };

  setupThermosOrderForm({
    DOM,
    state,
    canvas,
    showToast,
    exportCanvasPng,
    resetApp,
  });

  // ---------- INIT DEFAULT ----------
  DOM.size750.checked = true;
  state.selectedColor = 'black-matte';
  DOM.termosText.value = 'Numele tau';
  DOM.fontSelector.value = 'Montserrat, sans-serif';

  // ✅ дефолтный цвет зависит от темы
  DOM.textColor.value = document.documentElement.classList.contains('dark') ? '#ffffff' : '#111827';

  applyOverlayAndDefaults();
}

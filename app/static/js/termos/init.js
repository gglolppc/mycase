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
  // Подгружаем именно семейства, чтобы Fabric не рисовал fallback
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

    clearCanvasBtn: document.getElementById('clear-canvas-termos'),
    orderBtn: document.getElementById('order-btn-termos'),

    priceValue: document.getElementById('price-value-termos'),

    cancelOrder: document.getElementById('cancel-order'),
    orderFormModal: document.getElementById('order-form'),
    form: document.getElementById('order-form-el'),
    toast: document.getElementById('toast'),
    submitOrderBtn: document.getElementById('submit-order-btn'),
    submitText: document.getElementById('submit-text'),
    loadingText: document.getElementById('loading-text'),

    themeToggle: document.getElementById('theme-toggle'),
    themeIcon: document.getElementById('theme-icon'),
  };

  const STATIC_BASE = window.STATIC_BASE || '/static/';
  const { canvas } = createCanvasThermos();

  const state = {
    uploadedFiles: [],
    currentOverlay: null,
    defaultTextObj: null,
    selectedColor: 'black',
  };

  // всегда держим текст выше всего
  const keep = () => keepTextOnTop(canvas, state);
  canvas.on('object:added', keep);
  canvas.on('object:modified', keep);
  canvas.on('selection:created', keep);
  canvas.on('selection:updated', keep);

  const colorSets = {
    '500': [
      { key: 'black', hex: '#111827' },
      { key: 'grey', hex: '#5e5c5b' },
      { key: 'light_blue', hex: '#a5ccd9' },
      { key: 'pink', hex: '#d69d99' },
      { key: 'orange', hex: '#ea580c' }, // я поставил оранжевый реально оранжевый
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

  function applyTheme(isDark) {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    setCanvasTheme(canvas, isDark);

    if (DOM.themeIcon) {
      DOM.themeIcon.classList.remove('fa-moon', 'fa-sun');
      DOM.themeIcon.classList.add(isDark ? 'fa-sun' : 'fa-moon');
    }
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

    // если выбранный цвет не существует в этом размере — берем первый
    if (!colors.some((c) => c.key === state.selectedColor)) {
      state.selectedColor = colors[0].key;
    }

    colors.forEach((c) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'w-9 h-9 rounded-full border-2 border-white/60 shadow-md hover:scale-110 transition';
      btn.style.background = c.hex;

      if (c.key === state.selectedColor) {
        btn.classList.add('ring-4', 'ring-purple-500/40');
      }

      btn.addEventListener('click', () => {
        state.selectedColor = c.key;
        renderColors();
        setThermosOverlay({ canvas, state, size, color: state.selectedColor, STATIC_BASE });
        // и текст обратно наверх
        keep();
      });

      DOM.colorsWrap.appendChild(btn);
    });
  }

  function ensureDefaultText() {
    const txt = DOM.termosText.value || 'NUMELE';

    if (!state.defaultTextObj) {
      setDefaultVerticalText({
        canvas,
        state,
        text: txt,
        fontFamily: DOM.fontSelector.value,
        fill: DOM.textColor.value,
      });
      keep();
      return;
    }

    state.defaultTextObj.set({
      text: txt,
      fontFamily: DOM.fontSelector.value,
      fill: DOM.textColor.value,
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

    // после overlay гарантируем дефолт-текст (и что он сверху)
    ensureDefaultText();
  }

  // ---------- fonts selector ----------
  DOM.fontSelector.innerHTML = '';
  fonts.forEach((f) => {
    const opt = document.createElement('option');
    opt.value = f.value;     // важно: value = "Montserrat, sans-serif"
    opt.textContent = f.label;
    DOM.fontSelector.appendChild(opt);
  });

  // 🔥 ждём загрузку шрифтов до первого рендера текста
  await waitForFonts(fonts);

  // ---------- theme init ----------
  const saved = localStorage.getItem('theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(saved ? saved === 'dark' : prefersDark);

  DOM.themeToggle?.addEventListener('click', () => {
    const isDarkNow = document.documentElement.classList.contains('dark');
    applyTheme(!isDarkNow);
    // тема поменялась — просто перерендер
    canvas.requestRenderAll();
  });

  // ---------- events ----------
  DOM.size500.addEventListener('change', applyOverlayAndDefaults);
  DOM.size750.addEventListener('change', applyOverlayAndDefaults);

  DOM.termosText.addEventListener('input', ensureDefaultText);
  DOM.fontSelector.addEventListener('change', ensureDefaultText);
  DOM.textColor.addEventListener('input', ensureDefaultText);

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

  DOM.clearCanvasBtn.addEventListener('click', () => {
    clearDesignThermos({ canvas, state });
    applyOverlayAndDefaults();
  });

  DOM.orderBtn.addEventListener('click', () => {
    if (!state.currentOverlay) return showToast('Alege termosul!', 'error');
    DOM.orderFormModal.classList.remove('hidden');
  });

  const resetApp = () => {
    DOM.form.reset();
    DOM.orderFormModal.classList.add('hidden');
    DOM.thumbnails.innerHTML = '';
    state.uploadedFiles = [];

    // дефолты
    DOM.size750.checked = true;                 // ты в конце так и делал
    state.selectedColor = 'black-matte';        // чтобы подходило под 750, иначе будет авто-первый
    DOM.termosText.value = 'Numele tau';
    DOM.textColor.value = '#ffffff';
    DOM.fontSelector.value = 'Montserrat, sans-serif'; // ✅ важно

    canvas.clear();
    state.currentOverlay = null;
    state.defaultTextObj = null;

    const isDark = document.documentElement.classList.contains('dark');
    setCanvasTheme(canvas, isDark);

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
  state.selectedColor = 'black-matte'; // чтобы совпало с 750
  DOM.termosText.value = 'Numele tau';
  DOM.textColor.value = '#ffffff';
  DOM.fontSelector.value = 'Montserrat, sans-serif'; // ✅ важно

  applyOverlayAndDefaults();
}

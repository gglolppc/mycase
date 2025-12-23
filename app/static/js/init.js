// static/js/init.js

import { models } from './models.js';
import { setupFabricControls } from './controls.js';
import {
  createCanvas,
  addImageToCanvas,
  setPhoneOverlay,
  clearDesign,
  exportCanvasPng,
  setupResponsiveCanvas,
  setCanvasTheme,
} from './canvas.js';
import { setupOrderForm } from './submit.js';
import { bindActionButtons, setupModalClose } from './events.js';

export function init() {
  const DOM = {
    brandSelect: document.getElementById('brand-select'),
    modelSelect: document.getElementById('model-select'),
    thumbnails: document.getElementById('thumbnails'),
    uploadInput: document.getElementById('upload'),
    addTextBtn: document.getElementById('add-text'),
    fontSelector: document.getElementById('font-selector'),
    colorPicker: document.getElementById('color-picker'),
    stylePanel: document.getElementById('text-style-panel'),

    saveBtn: document.getElementById('save'),
    clearCanvasBtn: document.getElementById('clear-canvas'),
    orderBtn: document.getElementById('order-btn'),

    cancelOrder: document.getElementById('cancel-order'),
    orderFormModal: document.getElementById('order-form'),
    form: document.getElementById('order-form-el'),
    toast: document.getElementById('toast'),

    submitOrderBtn: document.getElementById('submit-order-btn'),
    submitText: document.getElementById('submit-text'),
    loadingText: document.getElementById('loading-text'),

    canvasContainerSource: document.getElementById('canvas-container-source'),

    // theme
    themeToggle: document.getElementById('theme-toggle'),
    themeIcon: document.getElementById('theme-icon'),
  };

  const { canvas, defaultText } = createCanvas();

  const state = {
    uploadedFiles: [],
    currentOverlay: null,
    selectedText: null,
    defaultText,
  };
  setupFabricControls(canvas, DOM, state);
  // responsive
  if (DOM.canvasContainerSource) {
    setupResponsiveCanvas(canvas, state, DOM.canvasContainerSource);
  } else {
    console.error('Контейнер #canvas-container-source не найден. Адаптивность не работает.');
    setupResponsiveCanvas(canvas, state);
  }

  function syncThemeToCanvas() {
      const isDark = document.documentElement.classList.contains('dark');
      setCanvasTheme(canvas, state, isDark);
    }

    // 1) применить при старте
    syncThemeToCanvas();

    // 2) реагировать на клик по глобальной кнопке
    window.addEventListener('theme:changed', syncThemeToCanvas);

  // -------- toast --------
  function showToast(msg, type = 'success') {
    DOM.toast.textContent = msg;
    DOM.toast.classList.remove('border-green-500', 'border-red-500');
    DOM.toast.classList.add(type === 'error' ? 'border-red-500' : 'border-green-500');
    DOM.toast.classList.remove('opacity-0');
    setTimeout(() => DOM.toast.classList.add('opacity-0'), 4000);
  }

  // -------- бренды/модели --------
  DOM.brandSelect.addEventListener('change', () => {
    const brand = DOM.brandSelect.value;
    DOM.modelSelect.innerHTML = '<option value="">Alege modelul</option>';

    if (models[brand]) {
      models[brand].forEach((m) => {
        const opt = document.createElement('option');
        opt.value = m;
        opt.textContent = m.replace(/_/g, ' ').toUpperCase();
        DOM.modelSelect.appendChild(opt);
      });
    }

    canvas.clear();
    canvas.add(defaultText);
    state.currentOverlay = null;

    // вернуть корректный фон канваса после clear()
    const isDark = document.documentElement.classList.contains('dark');
    setCanvasTheme(canvas, state, isDark);
  });

  DOM.modelSelect.addEventListener('change', () => {
    const STATIC_BASE_GLOBAL = window.STATIC_BASE || '/static/';

    setPhoneOverlay({
      canvas,
      state,
      brand: DOM.brandSelect.value,
      model: DOM.modelSelect.value,
      STATIC_BASE: STATIC_BASE_GLOBAL
    });

    // после setPhoneOverlay canvas.clear() — снова применим фон
    const isDark = document.documentElement.classList.contains('dark');
    setCanvasTheme(canvas, state, isDark);
  });

  // -------- загрузка фото + превью --------
  DOM.uploadInput.addEventListener('change', (e) => {
    [...e.target.files].forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const fileId = Date.now() + Math.random().toString(16).slice(2);
        state.uploadedFiles.push({ fileId, file });

        const wrapper = document.createElement('div');
        wrapper.className = 'relative aspect-square rounded-xl overflow-hidden shadow-md';
        wrapper.dataset.fileId = fileId;

        const img = document.createElement('img');
        img.src = ev.target.result;
        img.className = 'w-full h-full object-cover cursor-pointer';

        // подсказка: "нажми чтобы добавить"
        const hint = document.createElement('div');
        hint.className = 'thumb-hint';
        hint.textContent = 'Click';

        const ring = document.createElement('div');
        ring.className = 'thumb-ring';

        wrapper.append(img, ring, hint);

        // убираем подсказку после первого клика
        let usedOnce = false;

        img.onclick = () => {
          addImageToCanvas(canvas, ev.target.result);

          if (!usedOnce) {
            usedOnce = true;
            hint.remove();
            ring.remove();
          }
        };

        // (опционально) если не кликнули — через 6 секунд подсказка исчезнет сама
        setTimeout(() => {
          if (!usedOnce) {
            hint.remove();
            ring.remove();
          }
        }, 6000);


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


  // -------- действия (clear/save/order) --------
  const handleClear = () => {
    clearDesign({ canvas, state, stylePanelEl: DOM.stylePanel });

    // clearDesign может менять содержимое — снова фон темы
    const isDark = document.documentElement.classList.contains('dark');
    setCanvasTheme(canvas, state, isDark);
  };

  const handleSave = async () => {
    if (!DOM.modelSelect.value) return showToast('Alege modelul telefonului!', 'error');

    const dataURL = await exportCanvasPng(canvas, state, { outWidth: 420 });

    const a = document.createElement('a');
    a.href = dataURL;
    a.download = 'mycase-design.png';
    a.click();
  };

  const handleOrder = () => {
    if (!state.currentOverlay) return showToast('Creează designul mai întâi!', 'error');
    DOM.orderFormModal.classList.remove('hidden');
  };

  DOM.clearCanvasBtn.addEventListener('click', handleClear);
  DOM.saveBtn.addEventListener('click', handleSave);
  DOM.orderBtn.addEventListener('click', handleOrder);
  bindActionButtons({ handleClear, handleSave, handleOrder });

  // -------- submit --------
  const resetApp = () => {
    DOM.form.reset();
    DOM.orderFormModal.classList.add('hidden');

    canvas.clear();
    canvas.add(defaultText);

    DOM.brandSelect.value = '';
    DOM.modelSelect.innerHTML = '<option value="">Alege modelul</option>';
    DOM.thumbnails.innerHTML = '';

    state.uploadedFiles = [];
    state.currentOverlay = null;
    state.selectedText = null;

    // фон темы после reset
    const isDark = document.documentElement.classList.contains('dark');
    setCanvasTheme(canvas, state, isDark);
  };

  setupOrderForm({
    DOM,
    state,
    canvas,
    showToast,
    exportCanvasPng,
    resetApp,
  });

  setupModalClose(DOM);

  // fonts selector
  ['Poppins, sans-serif', 'Inter, sans-serif', 'Roboto Slab, serif', 'Arial, sans-serif'].forEach((f) => {
    const opt = document.createElement('option');
    opt.value = f;
    opt.textContent = f.split(',')[0];
    DOM.fontSelector.appendChild(opt);
  });
}

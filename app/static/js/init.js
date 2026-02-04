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
    // scale UI
    scalePanel: document.getElementById('scale-panel'),
    scaleSlider: document.getElementById('scale-slider'),

    // text UI
    textInput: document.getElementById('text-input'),
    fontBtn: document.getElementById('font-btn'),
    colorBtn: document.getElementById('color-btn'),
    fontSelector: document.getElementById('font-selector'),
    colorPicker: document.getElementById('color-picker'),
    stylePanel: document.getElementById('text-style-panel'),
    addTextBtn: document.getElementById('add-text'),

    // selectors
    brandSelect: document.getElementById('brand-select'),
    modelSelect: document.getElementById('model-select'),

    // upload / thumbs
    thumbnails: document.getElementById('thumbnails'),
    uploadInput: document.getElementById('upload'),

    // actions
    saveBtn: document.getElementById('save'),
    clearCanvasBtn: document.getElementById('clear-canvas'),
    orderBtn: document.getElementById('order-btn'),

    // modal / form
    cancelOrder: document.getElementById('cancel-order'),
    orderFormModal: document.getElementById('order-form'),
    form: document.getElementById('order-form-el'),
    toast: document.getElementById('toast'),

    submitOrderBtn: document.getElementById('submit-order-btn'),
    submitText: document.getElementById('submit-text'),
    loadingText: document.getElementById('loading-text'),

    // canvas container for responsive
    canvasContainerSource: document.getElementById('canvas-container-source'),

    // actual canvas element
    canvasEl: document.getElementById('phone-canvas'),

    // theme
    themeToggle: document.getElementById('theme-toggle'),
    themeIcon: document.getElementById('theme-icon'),
  };

  const { canvas, defaultText } = createCanvas();

  const state = {
    uploadedFiles: [],
    currentOverlayObj: null,
    selectedText: null,
    defaultText,
  };

  setupFabricControls(canvas, DOM, state);

  // ---------------- Theme sync ----------------
  function syncThemeToCanvas() {
    const isDark = document.documentElement.classList.contains('dark');
    setCanvasTheme(canvas, state, isDark);
  }
  syncThemeToCanvas();
  window.addEventListener('theme:changed', syncThemeToCanvas);

  // ---------------- Responsive canvas ----------------
  if (DOM.canvasContainerSource) {
    setupResponsiveCanvas(canvas, state, DOM.canvasContainerSource);
  } else {
    console.error('Контейнер #canvas-container-source не найден. Адаптивность не работает.');
    setupResponsiveCanvas(canvas, state);
  }

  // ---------------- Keep overlay always on top ----------------
  function keepOverlayOnTop() {
    if (state.currentOverlayObj) state.currentOverlayObj.moveTo(999999);
  }
  canvas.on('object:added', keepOverlayOnTop);
  canvas.on('selection:created', keepOverlayOnTop);
  canvas.on('selection:updated', keepOverlayOnTop);
  canvas.on('object:modified', keepOverlayOnTop);

  // ---------------- Scale overlay UI (always visible, enabled only when selection) ----------------
  function canScaleObject(obj) {
    if (!obj) return false;
    if (obj === state.currentOverlayObj) return false;
    if (obj === state.defaultText) return false;
    return true;
  }

  function updateScalePanelState(enabled) {
      if (!DOM.scalePanel || !DOM.scaleSlider) return;

      // Показываем/скрываем саму панель
      DOM.scalePanel.classList.toggle('hidden', !enabled);

      // Управляем доступностью ползунка
      DOM.scaleSlider.disabled = !enabled;

      // Визуальные эффекты и курсор
      DOM.scalePanel.classList.toggle('opacity-40', !enabled);
      DOM.scalePanel.classList.toggle('opacity-100', enabled);
      DOM.scaleSlider.style.cursor = enabled ? 'pointer' : 'not-allowed';
    }

  // делаем панель крупнее и выше — прямо из JS, чтобы не плясать с tailwind классами
  function applyScalePanelSizing() {
    if (!DOM.scalePanel || !DOM.scaleSlider) return;

    // поднять выше, сделать заметнее
    DOM.scalePanel.style.bottom = '18px'; // выше чем было
    DOM.scalePanel.style.padding = '12px 14px';
    DOM.scalePanel.style.borderRadius = '28px';

    // увеличить "толщину" ползунка
    DOM.scaleSlider.style.width = '100%';
    DOM.scaleSlider.style.height = '34px'; // увеличивает область тапа

    // подгоняем ширину под ВИДИМУЮ ширину canvas на странице
    // чтобы на мобиле не обрезало и совпадало с канвасом
    if (DOM.canvasEl) {
      const rect = DOM.canvasEl.getBoundingClientRect();
      const w = Math.max(240, Math.floor(rect.width * 0.85)); // защита от нуля
      DOM.scalePanel.style.width = `${w}px`;
      DOM.scalePanel.style.left = '50%';
      DOM.scalePanel.style.transform = 'translateX(-50%)';
    }
  }

  // следим за ресайзом/ориентацией/адаптивом
  window.addEventListener('resize', () => {
    applyScalePanelSizing();
  });

  // если у тебя setupResponsiveCanvas меняет размер после загрузки — дёрнем чуть позже
  setTimeout(() => applyScalePanelSizing(), 100);
  setTimeout(() => applyScalePanelSizing(), 400);
  setTimeout(() => applyScalePanelSizing(), 900);

    function showScalePanel() {
      if (!DOM.scalePanel || !DOM.scaleSlider) return;
      DOM.scalePanel.classList.remove('hidden');
      DOM.scaleSlider.disabled = false;     // <-- важно
    }

    function hideScalePanel() {
      if (!DOM.scalePanel || !DOM.scaleSlider) return;
      DOM.scalePanel.classList.add('hidden');
      DOM.scaleSlider.disabled = true;      // <-- важно
    }

  // ---------------- Scale math ----------------
  function getUniformScale(obj) {
    return obj?.scaleX || 1;
  }

  function ensureBaseScale(obj) {
    if (!obj) return;
    if (!obj.myBaseScale || obj.myBaseScale <= 0) {
      obj.myBaseScale = getUniformScale(obj);
    }
  }

    function syncSliderToObject(obj) {
        if (!DOM.scaleSlider) return;
        ensureBaseScale(obj);

        const pct = Math.round((getUniformScale(obj) / obj.myBaseScale) * 100);
        // Изменяем диапазон зажима (clamping)
        const clamped = Math.max(10, Math.min(300, pct));
        DOM.scaleSlider.value = String(clamped);
    }

    canvas.on('selection:created', () => {
      const obj = canvas.getActiveObject();
      if (canScaleObject(obj)) {
        updateScalePanelState(true); // Включаем и показываем
        syncSliderToObject(obj);
      } else {
        updateScalePanelState(false); // Выключаем
      }
    });

    canvas.on('selection:updated', () => {
      const obj = canvas.getActiveObject();
      if (canScaleObject(obj)) {
        updateScalePanelState(true);
        syncSliderToObject(obj);
      } else {
        updateScalePanelState(false);
      }
    });

    canvas.on('selection:cleared', () => {
      updateScalePanelState(false);
    });

  if (DOM.scaleSlider) {
    // ты хотел "чуть увеличить" — диапазон 100..200
    DOM.scaleSlider.min = '20';
    DOM.scaleSlider.max = '200';
    DOM.scaleSlider.step = '1';
    DOM.scaleSlider.value = '100';

    DOM.scaleSlider.addEventListener('input', () => {
        const obj = canvas.getActiveObject();
        if (!canScaleObject(obj)) return;

        ensureBaseScale(obj);

        let pct = parseInt(DOM.scaleSlider.value, 10);
        if (!Number.isFinite(pct)) pct = 100;

        // Позволяем pct опускаться до 10 и подниматься до 300
        pct = Math.max(10, Math.min(300, pct));

        const newScale = obj.myBaseScale * (pct / 100);

        obj.set({ scaleX: newScale, scaleY: newScale });
        obj.setCoords();
        keepOverlayOnTop();
        canvas.requestRenderAll();
    });
  }

  // ---------------- Toast ----------------
  function showToast(msg, type = 'success') {
    DOM.toast.textContent = msg;
    DOM.toast.classList.remove('border-green-500', 'border-red-500');
    DOM.toast.classList.add(type === 'error' ? 'border-red-500' : 'border-green-500');
    DOM.toast.classList.remove('opacity-0');
    setTimeout(() => DOM.toast.classList.add('opacity-0'), 4000);
  }

  // ---------------- Brand / Model ----------------
  DOM.brandSelect?.addEventListener('change', () => {
    const brand = DOM.brandSelect.value;

    DOM.modelSelect.innerHTML = '<option value="">Telefon</option>';
    if (models[brand]) {
      models[brand].forEach((m) => {
        const opt = document.createElement('option');
        opt.value = m;
        opt.textContent = m.replace(/_/g, ' ').replace(/\b\w/g, (s) => s.toUpperCase());
        DOM.modelSelect.appendChild(opt);
      });
    }

    canvas.clear();
    canvas.add(defaultText);

    state.currentOverlayObj = null;
    state.selectedText = null;

    updateScalePanelState(false);

    syncThemeToCanvas();
    applyScalePanelSizing();
  });

  DOM.modelSelect?.addEventListener('change', () => {
    const STATIC_BASE_GLOBAL = window.STATIC_BASE || '/static/';

    setPhoneOverlay({
      canvas,
      state,
      brand: DOM.brandSelect.value,
      model: DOM.modelSelect.value,
      STATIC_BASE: STATIC_BASE_GLOBAL,
    });

    syncThemeToCanvas();
    keepOverlayOnTop();
    applyScalePanelSizing();
  });

  // ---------------- Upload + thumbnails ----------------
  DOM.uploadInput?.addEventListener('change', (e) => {
    const files = [...(e.target.files || [])];

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const fileId = Date.now() + Math.random().toString(16).slice(2);
        const isFirstImage = state.uploadedFiles.length === 0;

        state.uploadedFiles.push({ fileId, file });

        if (isFirstImage) {
          addImageToCanvas(canvas, ev.target.result, true);
          keepOverlayOnTop();
        }

        const wrapper = document.createElement('div');
        wrapper.className = 'relative aspect-square rounded-xl overflow-hidden shadow-md';
        wrapper.dataset.fileId = fileId;

        const img = document.createElement('img');
        img.src = ev.target.result;
        img.className = 'w-full h-full object-cover cursor-pointer';

        const hint = document.createElement('div');
        hint.className = 'thumb-hint';
        hint.textContent = 'Click';

        const ring = document.createElement('div');
        ring.className = 'thumb-ring';

        let usedOnce = false;

        img.onclick = () => {
          addImageToCanvas(canvas, ev.target.result);
          keepOverlayOnTop();

          if (!usedOnce) {
            usedOnce = true;
            hint.remove();
            ring.remove();
          }

          applyScalePanelSizing();
        };

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

        wrapper.append(img, ring, hint, del);
        DOM.thumbnails.appendChild(wrapper);
      };

      reader.readAsDataURL(file);
    });

    e.target.value = '';
  });

  // ---------------- Actions ----------------
  const handleClear = () => {
    clearDesign({ canvas, state, stylePanelEl: DOM.stylePanel });
    hideScalePanel();
    syncThemeToCanvas();
    keepOverlayOnTop();
    applyScalePanelSizing();
  };

  const handleSave = async () => {
    if (!DOM.modelSelect.value) return showToast(window.__t('toast.choose_phone_model'), 'error');

    const dataURL = await exportCanvasPng(canvas, state, { outWidth: 420 });
    const a = document.createElement('a');
    a.href = dataURL;
    a.download = 'mycase-design.png';
    a.click();
  };

  const handleOrder = () => {
    if (!state.currentOverlayObj) {
      return showToast(window.__t('toast.choose_phone_model_first'), 'error');
    }

    const objects = canvas
      .getObjects()
      .filter((o) => o !== state.currentOverlayObj && o !== state.defaultText);

    if (objects.length === 0) {
      return showToast(window.__t('toast.add_photo_or_text_case'), 'error');
    }

    DOM.orderFormModal.classList.remove('hidden');
  };

  DOM.clearCanvasBtn?.addEventListener('click', handleClear);
  DOM.saveBtn?.addEventListener('click', handleSave);
  DOM.orderBtn?.addEventListener('click', handleOrder);
  bindActionButtons({ handleClear, handleSave, handleOrder });

  // ---------------- Reset after submit ----------------
  const resetApp = () => {
    DOM.form?.reset();
    DOM.orderFormModal?.classList.add('hidden');

    canvas.clear();
    canvas.add(defaultText);

    DOM.brandSelect.value = '';
    DOM.modelSelect.innerHTML = '<option value="">Telefon</option>';
    DOM.thumbnails.innerHTML = '';

    state.uploadedFiles = [];
    state.currentOverlayObj = null;
    state.selectedText = null;

    hideScalePanel();
    syncThemeToCanvas();
    applyScalePanelSizing();
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

  // ---------------- Fonts list ----------------
  if (DOM.fontSelector) {
    ['Poppins, sans-serif', 'Inter, sans-serif', 'Roboto Slab, serif', 'Arial, sans-serif'].forEach((f) => {
      const opt = document.createElement('option');
      opt.value = f;
      opt.textContent = f.split(',')[0];
      DOM.fontSelector.appendChild(opt);
    });
  }
}

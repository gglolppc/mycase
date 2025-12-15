// static/js/init.js

import { models } from './models.js';
import {
  createCanvas,
  addImageToCanvas,
  setPhoneOverlay,
  clearDesign,
  exportCanvasPng,
  setupResponsiveCanvas,
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

    // 🔥 НОВОЕ: Элемент-источник ширины, который мы добавили в HTML
    canvasContainerSource: document.getElementById('canvas-container-source'),
  };

  const { canvas, defaultText } = createCanvas();

  const state = {
    uploadedFiles: [],
    currentOverlay: null,
    selectedText: null,
    defaultText,
  };

  // 🔥 ИЗМЕНЕНИЕ: Передаём canvasContainerSource в функцию
  if (DOM.canvasContainerSource) {
      setupResponsiveCanvas(canvas, state, DOM.canvasContainerSource);
  } else {
      console.error('Контейнер #canvas-container-source не найден. Адаптивность не работает.');
      setupResponsiveCanvas(canvas, state); // Запасной вариант, если не найдено
  }


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
  });

  DOM.modelSelect.addEventListener('change', () => {
    // 🔥 ВАЖНО: STATIC_BASE не определен в init.js, он определен в HTML.
    // Предполагая, что ты его импортируешь или передашь.
    // Для рабочего кода нужно либо импортировать STATIC_BASE, либо
    // передать его из main.js, где он доступен глобально.
    // Пока что используем глобальный объект, как он объявлен в HTML.
    const STATIC_BASE_GLOBAL = window.STATIC_BASE || '/static/';

    setPhoneOverlay({
      canvas,
      state,
      brand: DOM.brandSelect.value,
      model: DOM.modelSelect.value,
      STATIC_BASE: STATIC_BASE_GLOBAL // <-- Передача STATIC_BASE
    });
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
        img.onclick = () => addImageToCanvas(canvas, ev.target.result);

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

  // -------- текст (минимально оставил как было) --------
  DOM.addTextBtn.addEventListener('click', () => {
    const text = new fabric.Textbox('Scrie textul aici', {
      left: canvas.width / 2,
      top: 150,
      originX: 'center',
      fontSize: 40,
      fill: '#000000',
      fontFamily: 'Poppins, sans-serif',
      width: 300,
    });
    canvas.add(text);
    canvas.setActiveObject(text);
  });

  // -------- действия (clear/save/order) --------
  const handleClear = () => clearDesign({ canvas, state, stylePanelEl: DOM.stylePanel });

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

  // верхние кнопки + нижняя панель через data-action
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

  // fonts selector (если нужен)
  ['Poppins, sans-serif', 'Inter, sans-serif', 'Roboto Slab, serif', 'Arial, sans-serif'].forEach((f) => {
    const opt = document.createElement('option');
    opt.value = f;
    opt.textContent = f.split(',')[0];
    DOM.fontSelector.appendChild(opt);
  });
}
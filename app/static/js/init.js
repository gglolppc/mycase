// static/js/init.js
import { models } from './models.js';
import { createCanvas, addImageToCanvas, setPhoneOverlay, clearDesign, exportCanvasPng } from './canvas.js';
import { setupFabricControls } from './controls.js';
import { bindUploadInput, showToast as baseShowToast, populateFontSelector } from './ui.js';
import { bindActionButtons, setupModalClose } from './events.js';
import { setupOrderForm } from './submit.js';

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
  };

  const { canvas, defaultText } = createCanvas();

  const state = {
    uploadedFiles: [],
    currentOverlay: null,
    selectedText: null,
    defaultText,
  };

  const showToast = (msg, type) => baseShowToast(DOM, msg, type);

  // Бренд/модель
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
    const brand = DOM.brandSelect.value;
    const model = DOM.modelSelect.value;
    setPhoneOverlay({ canvas, state, brand, model });
  });

  // Управление канвасом, текст
  setupFabricControls(canvas, DOM, state);

  // Загрузка фото + превью
  bindUploadInput(DOM, state, (dataURL) => addImageToCanvas(canvas, dataURL));

  // Шрифты
  populateFontSelector(DOM);

  // Очистка дизайна
  const handleClear = () => {
    clearDesign({ canvas, state, stylePanelEl: DOM.stylePanel });
  };

  // Сохранение PNG
  const handleSave = async () => {
    if (!DOM.modelSelect.value) {
      showToast('Alege modelul telefonului!', 'error');
      return;
    }

    const dataURL = await exportCanvasPng(canvas, state);

    const link = document.createElement('a');
    link.href = dataURL;
    link.download = 'mycase-design.png';
    link.click();
  };

  // Открытие формы заказа
  const handleOrder = () => {
    if (!state.currentOverlay) {
      showToast('Creează designul mai întâi!', 'error');
      return;
    }
    DOM.orderFormModal.classList.remove('hidden');
  };

  // Привязка к верхним кнопкам (для надёжности)
  DOM.clearCanvasBtn.addEventListener('click', handleClear);
  DOM.saveBtn.addEventListener('click', handleSave);
  DOM.orderBtn.addEventListener('click', handleOrder);

  // Привязка ко всем кнопкам с data-action (включая нижнюю панель)
  bindActionButtons({ handleClear, handleSave, handleOrder });

  // Логика формы заказа
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
}

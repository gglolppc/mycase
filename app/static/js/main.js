import { models } from './models.js';

document.addEventListener("DOMContentLoaded", () => {
  const uploadedFiles = [];
  const canvas = new fabric.Canvas('phone-canvas');
  canvas.preserveObjectStacking = true;
  let currentOverlay;
  let selectedText = null;
  const fontSelector = document.getElementById("font-selector");
  const colorPicker = document.getElementById("color-picker");
  const stylePanel = document.getElementById("text-style-panel");
  const deleteImg = new Image();
  deleteImg.src = "https://img.icons8.com/ios-glyphs/30/000000/delete-sign.png";

  fabric.Object.prototype.controls.deleteControl = new fabric.Control({
    x: 0.5,
    y: -0.5,
    offsetY: -16,
    offsetX: 16,
    cursorStyle: 'pointer',
    mouseUpHandler: function (eventData, transform) {
      const target = transform.target;
      const canvas = target.canvas;
      canvas.remove(target);
      canvas.requestRenderAll();
    },
    render: function (ctx, left, top) {
      const size = 24;
      ctx.save();
      ctx.translate(left, top);
      ctx.drawImage(deleteImg, -size / 2, -size / 2, size, size);
      ctx.restore();
    },
    cornerSize: 24
  });

  const brandSelect = document.getElementById('brand-select');
  const modelSelect = document.getElementById('model-select');
  const thumbnails = document.getElementById('thumbnails');
  const orderBtn = document.getElementById("order-btn");
  const cancelOrder = document.getElementById("cancel-order");
  const orderForm = document.getElementById("order-form");
  const form = document.getElementById('order-form-el');

  let defaultText = new fabric.Text("Выберите модель телефона", {
    left: canvas.width / 2,
    top: canvas.height / 2,
    originX: "center",
    originY: "center",
    fontSize: 20,
    fill: "#888",
    selectable: false,
    evented: false
  });

  canvas.add(defaultText);

  // Функция для управления z-индексом: текст всегда поверх изображений, оверлей сверху
  function bringTextToFront() {
    const objects = canvas.getObjects();
    const texts = objects.filter(obj => obj.type === 'textbox');
    const images = objects.filter(obj => obj.type === 'image' && obj !== currentOverlay);

    let zIndex = 0;
    images.forEach(img => canvas.moveTo(img, zIndex++));
    texts.forEach(text => canvas.moveTo(text, zIndex++));
    if (currentOverlay) canvas.moveTo(currentOverlay, zIndex);
    canvas.renderAll();
  }

  brandSelect.onchange = function () {
    const brand = this.value;
    modelSelect.innerHTML = '<option value="">Модель</option>';
    if (models[brand]) {
      models[brand].forEach(model => {
        const opt = document.createElement('option');
        opt.value = model;
        opt.textContent = model.replace(/_/g, ' ').toUpperCase();
        modelSelect.appendChild(opt);
      });
    }
  };

  modelSelect.onchange = function () {
    const brand = brandSelect.value;
    const model = this.value;
    canvas.clear();
    if (brand && model) {
      const overlayPath = `${STATIC_BASE}assets/phone-mocks/${brand}/${model}.png`;
      fabric.Image.fromURL(overlayPath, function (img) {
        img.set({
          selectable: false,
          evented: false,
          left: 0,
          top: 0,
          scaleX: canvas.width / img.width,
          scaleY: canvas.height / img.height
        });
        canvas.setOverlayImage(img, canvas.renderAll.bind(canvas));
        currentOverlay = img;
        bringTextToFront();
      });
    } else {
      canvas.add(defaultText);
    }
  };

  document.getElementById('upload').onchange = function (e) {
    const files = e.target.files;
    [...files].forEach(file => {
      uploadedFiles.push(file);
      const reader = new FileReader();
      reader.onload = function (event) {
        const img = document.createElement('img');
        img.src = event.target.result;
        img.className = "w-28 rounded shadow cursor-pointer hover:opacity-80 transition";
        img.onclick = () => addToCanvas(event.target.result);
        thumbnails.appendChild(img);
      };
      reader.readAsDataURL(file);
    });

  };

  function addToCanvas(dataURL) {
    fabric.Image.fromURL(dataURL, function (img) {
      img.scaleToWidth(200);
      img.set({ left: 80, top: 80 });
      canvas.add(img);
      bringTextToFront();
    });
  }

  document.getElementById('add-text').onclick = function () {
    const text = new fabric.Textbox("TEXT", {
      left: 150,
      top: 100,
      fontSize: 35,
      fill: '#000',
      fontFamily: 'Arial',
      hasControls: true,
      hasBorders: true
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    bringTextToFront();
  };

  // При выборе объекта текст остается поверх и доступен
  canvas.on('selection:created', function (e) {
    bringTextToFront();
    updateTextControls(e);
  });

  canvas.on('selection:updated', function (e) {
    bringTextToFront();
    updateTextControls(e);
  });

  canvas.on('selection:cleared', () => {
    stylePanel.classList.add('hidden');
    selectedText = null;
  });

  // Добавить обработчик клика на канвас, чтобы текст оставался доступным
  canvas.on('mouse:down', function (e) {
    if (!e.target || e.target.type === 'image') {
      // Если кликнули на изображение или пустое место, поднимаем текст
      bringTextToFront();
      // Проверяем, есть ли текст под курсором, и делаем его активным
      const pointer = canvas.getPointer(e.e);
      const objects = canvas.getObjects().filter(obj => obj.type === 'textbox');
      for (let obj of objects) {
        if (obj.containsPoint(pointer)) {
          canvas.setActiveObject(obj);
          updateTextControls();
          break;
        }
      }
    }
  });

  function updateTextControls(e) {
    const active = canvas.getActiveObject();
    if (active && active.type === 'textbox') {
      selectedText = active;
      fontSelector.value = active.fontFamily || 'Arial';
      colorPicker.value = active.fill || '#000000';
      stylePanel.classList.remove('hidden');
    } else {
      stylePanel.classList.add('hidden');
      selectedText = null;
    }
  }

  fontSelector.onchange = function () {
    if (selectedText) {
      selectedText.set({ fontFamily: this.value });
      canvas.renderAll();
    }
  };

  colorPicker.oninput = function () {
    if (selectedText) {
      selectedText.set({ fill: this.value });
      canvas.renderAll();
    }
  };

  document.getElementById('save').onclick = function () {
    const dataURL = canvas.toDataURL({ format: 'png' });
    const a = document.createElement("a");
    a.href = dataURL;
    a.download = "chehol-design.png";
    a.click();
  };

  document.getElementById('clear-canvas').onclick = function () {
    const objectsToRemove = canvas.getObjects().filter(obj => obj !== currentOverlay);
    objectsToRemove.forEach(obj => canvas.remove(obj));
    canvas.renderAll();
  };

  if (orderBtn && cancelOrder && orderForm) {
    orderBtn.addEventListener("click", () => orderForm.classList.remove("hidden"));
    cancelOrder.addEventListener("click", () => orderForm.classList.add("hidden"));
  }

  function showToast(message, color = 'bg-green-600') {
    const toast = document.getElementById("toast");
    const inner = toast.firstElementChild;
    inner.textContent = message;
    inner.className = `px-8 py-4 rounded-xl shadow-lg max-w-sm text-center text-white ${color}`;
    toast.classList.remove("opacity-0", "pointer-events-none");
    setTimeout(() => {
      toast.classList.add("opacity-0", "pointer-events-none");
    }, 3000);
  }

  form.onsubmit = async function (e) {
    e.preventDefault();
    const formData = new FormData(form);
    formData.append("brand", brandSelect.value);
    formData.append("model", modelSelect.value);

    const dataURL = canvas.toDataURL("image/png");
    const blob = await (await fetch(dataURL)).blob();
    formData.append("design_image", blob, "design.png");

    uploadedFiles.forEach(file => formData.append("files", file));

    const res = await fetch("/order", { method: "POST", body: formData });

    if (res.ok) {
      showToast("Заказ получен! Мы скоро свяжемся с вами 📞", 'bg-green-600');
      form.reset();
      canvas.clear();
      thumbnails.innerHTML = "";
      canvas.add(defaultText);
      orderForm.classList.add('hidden');
    } else {
      const error = await res.json();
      if (res.status === 422 && Array.isArray(error.detail)) {
        const field = error.detail[0].loc?.[1] || "неизвестно";
        const msg = error.detail[0].msg;
        showToast(`Ошибка в поле "${field}": ${msg}`, 'bg-red-600');
      } else {
        showToast("Ошибка при отправке заказа 😔", 'bg-red-600');
      }
    }
  };
});
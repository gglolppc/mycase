import { models } from './models.js';

document.addEventListener("DOMContentLoaded", () => {
    // ----------------------------------------------------------------------
    // 1. Инициализация и переменные
    // ----------------------------------------------------------------------
    let uploadedFiles = []; // Массив объектов { fileId, file }
    const canvas = new fabric.Canvas('phone-canvas', {
        preserveObjectStacking: true,
    });

    let currentOverlay = null;
    let selectedText = null;

    // Элементы DOM
    const DOM = {
        fontSelector: document.getElementById("font-selector"),
        colorPicker: document.getElementById("color-picker"),
        textColorIndicatorInner: document.querySelector('#text-color-indicator div'),
        stylePanel: document.getElementById("text-style-panel"),
        brandSelect: document.getElementById('brand-select'),
        modelSelect: document.getElementById('model-select'),
        thumbnails: document.getElementById('thumbnails'),
        orderBtn: document.getElementById("order-btn"),
        cancelOrder: document.getElementById("cancel-order"),
        orderFormModal: document.getElementById("order-form"),
        form: document.getElementById('order-form-el'),
        uploadInput: document.getElementById('upload'),
        addTextBtn: document.getElementById('add-text'),
        saveBtn: document.getElementById('save'),
        clearCanvasBtn: document.getElementById('clear-canvas'),
    };

    // Дефолтный текст
    const defaultText = new fabric.Text("Выберите модель телефона", {
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

    // ----------------------------------------------------------------------
    // 2. Вспомогательные функции Canvas
    // ----------------------------------------------------------------------

    /** Рисует красный круг с белым крестиком для удаления */
    function renderDeleteControl(ctx, left, top) {
        const size = 20;
        ctx.save();
        ctx.translate(left, top);

        ctx.beginPath();
        ctx.arc(0, 0, size / 2, 0, Math.PI * 2, false);
        ctx.fillStyle = '#dc3545';
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-5, -5);
        ctx.lineTo(5, 5);
        ctx.moveTo(5, -5);
        ctx.lineTo(-5, 5);
        ctx.stroke();

        ctx.restore();
    }

    /** Устанавливает кастомный контрол удаления */
    function initializeDeleteControl() {
        fabric.Object.prototype.controls.deleteControl = new fabric.Control({
            x: 0.5,
            y: -0.5,
            offsetY: -16,
            offsetX: 16,
            cursorStyle: 'pointer',
            mouseUpHandler: function (eventData, transform) {
                const target = transform.target;
                target.canvas.remove(target);
                target.canvas.requestRenderAll();
                if (target.type === 'textbox') {
                    DOM.stylePanel.classList.add('hidden');
                    selectedText = null;
                }
            },
            render: renderDeleteControl,
            cornerSize: 24
        });

        fabric.Object.prototype.hasControls = true;
        fabric.Object.prototype.setControlsVisibility({
            mt: false, mb: false, ml: false, mr: false,
        });
    }

    function deleteActiveObject() {
        const activeObject = canvas.getActiveObject();
        if (activeObject) {
            canvas.remove(activeObject);
            canvas.discardActiveObject();
            canvas.renderAll();
            if (activeObject.type === 'textbox') {
                DOM.stylePanel.classList.add('hidden');
                selectedText = null;
            }
        }
    }

    function bringTextAndOverlayToFront() {
        const objects = canvas.getObjects();
        const texts = objects.filter(obj => obj.type === 'textbox');
        const images = objects.filter(obj => obj.type !== 'textbox' && obj !== currentOverlay && obj !== defaultText);

        let zIndex = 0;
        images.forEach(img => canvas.moveTo(img, zIndex++));
        texts.forEach(text => canvas.moveTo(text, zIndex++));

        if (currentOverlay) {
             canvas.moveTo(currentOverlay, zIndex);
        }
        canvas.renderAll();
    }

    function addToCanvas(dataURL) {
        fabric.Image.fromURL(dataURL, function (img) {
            const scale = Math.min(canvas.width / img.width * 0.8, canvas.height / img.height * 0.8);
            img.scale(scale);
            img.set({
                left: canvas.width / 2,
                top: canvas.height / 2,
                originX: 'center',
                originY: 'center',
            });
            canvas.add(img);
            bringTextAndOverlayToFront();
            canvas.setActiveObject(img);
        }, { crossOrigin: 'anonymous' });
    }

    function updateTextControls() {
        const active = canvas.getActiveObject();
        if (active && active.type === 'textbox') {
            selectedText = active;
            DOM.fontSelector.value = active.fontFamily || 'Poppins, sans-serif';
            const fillColor = active.fill || '#000000';
            DOM.colorPicker.value = fillColor;
            DOM.textColorIndicatorInner.style.backgroundColor = fillColor;
            DOM.stylePanel.classList.remove('hidden');
        } else {
            DOM.stylePanel.classList.add('hidden');
            selectedText = null;
        }
    }

    // ----------------------------------------------------------------------
    // 3. Обработчики событий Canvas
    // ----------------------------------------------------------------------

    function setupCanvasEvents() {
        canvas.on('selection:created', () => {
            bringTextAndOverlayToFront();
            updateTextControls();
        });
        canvas.on('selection:updated', () => {
            bringTextAndOverlayToFront();
            updateTextControls();
        });
        canvas.on('selection:cleared', () => {
            DOM.stylePanel.classList.add('hidden');
            selectedText = null;
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Delete' || e.key === 'Backspace') {
                const activeObject = canvas.getActiveObject();
                if (activeObject && activeObject.type === 'textbox' && activeObject.isEditing) return;
                deleteActiveObject();
                e.preventDefault();
            }
        });
    }

    // ----------------------------------------------------------------------
    // 4. Обработчики событий DOM
    // ----------------------------------------------------------------------

    function setupModelSelectors() {
        DOM.brandSelect.onchange = function () {
            const brand = this.value;
            DOM.modelSelect.innerHTML = '<option value="">Модель</option>';
            if (models[brand]) {
                models[brand].forEach(model => {
                    const opt = document.createElement('option');
                    opt.value = model;
                    opt.textContent = model.replace(/_/g, ' ').toUpperCase();
                    DOM.modelSelect.appendChild(opt);
                });
            }
            DOM.modelSelect.value = '';
            canvas.clear();
            canvas.add(defaultText);
            currentOverlay = null;
            canvas.setBackgroundColor(null, canvas.renderAll.bind(canvas));
        };

        DOM.modelSelect.onchange = function () {
            const brand = DOM.brandSelect.value;
            const model = this.value;
            canvas.clear();
            currentOverlay = null;

            if (brand && model) {
                canvas.remove(defaultText);
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
                    canvas.setBackgroundColor('#F8F9FA', canvas.renderAll.bind(canvas));
                    currentOverlay = img;
                    bringTextAndOverlayToFront();
                }, { crossOrigin: 'anonymous' });
            } else {
                canvas.add(defaultText);
                canvas.setBackgroundColor(null, canvas.renderAll.bind(canvas));
            }
        };
    }

    function setupFileUpload() {
        const createThumbnail = (dataURL, file) => {
            const fileId = Date.now() + Math.random();

            const thumbWrapper = document.createElement('div');
            thumbWrapper.className = "relative w-full aspect-square cursor-pointer";
            thumbWrapper.dataset.fileId = fileId;

            const img = document.createElement('img');
            img.src = dataURL;
            img.className = "w-full h-full object-cover rounded-md shadow transition duration-300 hover:opacity-80";
            img.onclick = () => addToCanvas(dataURL);

            const deleteBtn = document.createElement('button');
            deleteBtn.className = "delete-thumbnail-btn absolute z-10 w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-700 transition duration-200";
            deleteBtn.innerHTML = '<i class="fas fa-times text-xs"></i>';
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                thumbWrapper.remove();
                uploadedFiles = uploadedFiles.filter(f => f.fileId !== fileId);
                showToast("Фото удалено", 'error');
            };

            thumbWrapper.appendChild(img);
            thumbWrapper.appendChild(deleteBtn);
            DOM.thumbnails.appendChild(thumbWrapper);

            return { fileId, element: thumbWrapper };
        };

        DOM.uploadInput.onchange = function (e) {
            const files = e.target.files;
            [...files].forEach(file => {
                const reader = new FileReader();
                reader.onload = function (event) {
                    const { fileId } = createThumbnail(event.target.result, file);
                    uploadedFiles.push({ fileId, file });
                };
                reader.readAsDataURL(file);
            });
            this.value = '';
        };
    }

    function setupCanvasControls() {
        DOM.addTextBtn.onclick = function () {
            const text = new fabric.Textbox("Напиши свой текст", {
                left: canvas.width / 2,
                top: 100,
                originX: 'center',
                fontSize: 35,
                fill: '#000000',
                fontFamily: 'Poppins, sans-serif',
                width: 280,
            });
            canvas.add(text);
            canvas.setActiveObject(text);
            bringTextAndOverlayToFront();
            updateTextControls();
        };

        DOM.saveBtn.onclick = function () {
            if (!DOM.modelSelect.value) {
                showToast("Выберите модель телефона!", 'error');
                return;
            }
            canvas.setOverlayImage(null, canvas.renderAll.bind(canvas));
            setTimeout(() => {
                const dataURL = canvas.toDataURL({ format: 'png', backgroundColor: null });
                const a = document.createElement("a");
                a.href = dataURL;
                a.download = "chehol-design.png";
                a.click();
                if (currentOverlay) {
                    canvas.setOverlayImage(currentOverlay, canvas.renderAll.bind(canvas));
                }
            }, 50);
        };

        DOM.clearCanvasBtn.onclick = function () {
            const objectsToRemove = canvas.getObjects().filter(obj => obj !== currentOverlay && obj !== defaultText);
            objectsToRemove.forEach(obj => canvas.remove(obj));
            if (!DOM.modelSelect.value) canvas.add(defaultText);
            DOM.stylePanel.classList.add('hidden');
            canvas.renderAll();
        };
    }

    function setupTextStyling() {
        DOM.fontSelector.onchange = function () {
            if (selectedText) {
                selectedText.set({ fontFamily: this.value });
                canvas.renderAll();
            }
        };
        DOM.colorPicker.oninput = function () {
            if (selectedText) {
                const color = this.value;
                selectedText.set({ fill: color });
                DOM.textColorIndicatorInner.style.backgroundColor = color;
                canvas.renderAll();
            }
        };
    }

    function setupOrderModal() {
        if (DOM.orderBtn && DOM.cancelOrder && DOM.orderFormModal) {
            DOM.orderBtn.addEventListener("click", () => {
                if (!currentOverlay) {
                    showToast("Сначала создайте дизайн!", 'error');
                    return;
                }
                DOM.orderFormModal.classList.remove("hidden");
            });
            DOM.cancelOrder.addEventListener("click", () => DOM.orderFormModal.classList.add("hidden"));
        }
    }

    // Отображение уведомлений с цветом бордера (success=зеленый, error=красный)
    function showToast(message, type = 'success') {
        const toast = document.getElementById("toast");
        const inner = toast.firstElementChild;
        inner.textContent = message;

        const borderColor = type === 'error' ? 'border-red-500' : 'border-green-500';
        inner.className = `bg-white text-text-dark px-8 py-4 rounded-xl shadow-2xl max-w-sm text-center font-bold border-t-4 ${borderColor}`;

        toast.classList.remove("opacity-0", "pointer-events-none");
        setTimeout(() => {
            toast.classList.add("opacity-0", "pointer-events-none");
        }, 3000);
    }

    // ВОССТАНОВЛЕННАЯ ЛОГИКА ОТПРАВКИ ФОРМЫ
    function setupFormSubmission() {
        DOM.form.onsubmit = async function (e) {
            e.preventDefault();

            if (!DOM.modelSelect.value || !currentOverlay) {
                 showToast("Ошибка: Выберите модель телефона!", 'error');
                 return;
            }

            const formData = new FormData(DOM.form);
            formData.append("brand", DOM.brandSelect.value);
            formData.append("model", DOM.modelSelect.value);

            // 1. Убираем оверлей для создания чистого PNG
            canvas.setOverlayImage(null, canvas.renderAll.bind(canvas));
            await new Promise(resolve => setTimeout(resolve, 50));

            // 2. Создаем Blob изображения
            const dataURL = canvas.toDataURL({ format: 'image/png' });
            const blob = await (await fetch(dataURL)).blob();
            formData.append("design_image", blob, "design.png");

            // 3. Возвращаем оверлей
            if (currentOverlay) {
                canvas.setOverlayImage(currentOverlay, canvas.renderAll.bind(canvas));
            }

            // 4. Добавляем загруженные файлы
            uploadedFiles.forEach(item => formData.append("files", item.file));

            try {
                // 5. Отправляем на сервер
                const res = await fetch("/order", { method: "POST", body: formData });

                if (res.ok) {
                    showToast("Заказ получен! Мы скоро свяжемся с вами 📞", 'success');

                    // Сброс интерфейса
                    DOM.form.reset();
                    DOM.orderFormModal.classList.add('hidden');
                    canvas.clear();
                    canvas.add(defaultText);
                    DOM.brandSelect.value = '';
                    DOM.modelSelect.innerHTML = '<option value="">Модель</option>';
                    DOM.thumbnails.innerHTML = "";
                    uploadedFiles = [];
                } else {
                    // Обработка ошибок валидации (как в старом коде)
                    const error = await res.json();
                    if (res.status === 422 && Array.isArray(error.detail)) {
                        const field = error.detail[0].loc?.[1] || "неизвестно";
                        const msg = error.detail[0].msg;
                        showToast(`Ошибка в поле "${field}": ${msg}`, 'error');
                    } else {
                        showToast("Ошибка при отправке заказа 😔", 'error');
                    }
                }
            } catch (err) {
                console.error(err);
                showToast("Ошибка сети. Попробуйте позже.", 'error');
            }
        };
    }

    // ----------------------------------------------------------------------
    // 5. Точка входа
    // ----------------------------------------------------------------------

    initializeDeleteControl();
    setupCanvasEvents();
    setupModelSelectors();
    setupFileUpload();
    setupCanvasControls();
    setupTextStyling();
    setupOrderModal();
    setupFormSubmission(); // Запускаем реальную отправку

    document.fonts.ready.then(() => {
        canvas.renderAll();
    });
});
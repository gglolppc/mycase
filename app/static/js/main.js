import { models } from './models.js';

document.addEventListener("DOMContentLoaded", () => {
    let uploadedFiles = [];
    const canvas = new fabric.Canvas('phone-canvas', { preserveObjectStacking: true });
    let currentOverlay = null;
    let selectedText = null;

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
    };

    const defaultText = new fabric.Text("Alege modelul telefonului", {
        left: canvas.width / 2, top: canvas.height / 2,
        originX: "center", originY: "center",
        fontSize: 24, fill: "#aaa", selectable: false, evented: false
    });
    canvas.add(defaultText);

    // Кастомный контрол удаления
    fabric.Object.prototype.controls.deleteControl = new fabric.Control({
        x: 0.5, y: -0.5, offsetY: -20, offsetX: 20,
        cursorStyle: 'pointer',
        mouseUpHandler: (eventData, transform) => {
            const target = transform.target;
            canvas.remove(target);
            if (target.type === 'textbox') {
                DOM.stylePanel.classList.add('hidden');
                selectedText = null;
            }
            canvas.renderAll();
        },
        render: (ctx, left, top) => {
            ctx.save();
            ctx.translate(left, top);
            ctx.beginPath();
            ctx.arc(0, 0, 12, 0, Math.PI * 2);
            ctx.fillStyle = '#ef4444';
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#fff';
            ctx.moveTo(-6, -6); ctx.lineTo(6, 6);
            ctx.moveTo(6, -6); ctx.lineTo(-6, 6);
            ctx.stroke();
            ctx.restore();
        },
        cornerSize: 28
    });

    // Анимация добавления объектов
    function addWithAnimation(obj) {
        obj.set({ opacity: 0 });
        canvas.add(obj);
        obj.animate('opacity', 1, { duration: 400, onChange: canvas.renderAll.bind(canvas) });
        canvas.setActiveObject(obj);
    }

    function addToCanvas(dataURL) {
        fabric.Image.fromURL(dataURL, (img) => {
            const scale = Math.min((canvas.width * 0.85) / img.width, (canvas.height * 0.85) / img.height);
            img.scale(scale);
            img.set({ left: canvas.width / 2, top: canvas.height / 2, originX: 'center', originY: 'center' });
            addWithAnimation(img);
        }, { crossOrigin: 'anonymous' });
    }

    // Модель и оверлей
    DOM.brandSelect.onchange = () => {
        const brand = DOM.brandSelect.value;
        DOM.modelSelect.innerHTML = '<option value="">Alege modelul</option>';
        if (models[brand]) {
            models[brand].forEach(m => {
                const opt = document.createElement('option');
                opt.value = m; opt.textContent = m.replace(/_/g, ' ').toUpperCase();
                DOM.modelSelect.appendChild(opt);
            });
        }
        canvas.clear(); canvas.add(defaultText); currentOverlay = null;
    };

    DOM.modelSelect.onchange = () => {
        const brand = DOM.brandSelect.value;
        const model = DOM.modelSelect.value;
        canvas.clear();
        if (brand && model) {
            canvas.remove(defaultText);
            const path = `${STATIC_BASE}assets/phone-mocks/${brand}/${model}.png`;
            fabric.Image.fromURL(path, (img) => {
                img.set({ selectable: false, evented: false, left: 0, top: 0,
                    scaleX: canvas.width / img.width, scaleY: canvas.height / img.height });
                canvas.setOverlayImage(img, canvas.renderAll.bind(canvas));
                currentOverlay = img;
            }, { crossOrigin: 'anonymous' });
        } else {
            canvas.add(defaultText);
        }
    };

    // Загрузка фото
    DOM.uploadInput.onchange = (e) => {
        [...e.target.files].forEach(file => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const fileId = Date.now();
                uploadedFiles.push({ fileId, file });

                const wrapper = document.createElement('div');
                wrapper.className = 'relative aspect-square rounded-xl overflow-hidden shadow-md';
                wrapper.dataset.fileId = fileId;

                const img = document.createElement('img');
                img.src = ev.target.result;
                img.className = 'w-full h-full object-cover cursor-pointer';
                img.onclick = () => addToCanvas(ev.target.result);

                const del = document.createElement('button');
                del.className = 'absolute top-1 right-1 bg-red-500 text-white w-7 h-7 rounded-full flex items-center justify-center shadow';
                del.innerHTML = '×';
                del.onclick = (ev) => {
                    ev.stopPropagation();
                    wrapper.remove();
                    uploadedFiles = uploadedFiles.filter(f => f.fileId !== fileId);
                };

                wrapper.append(img, del);
                DOM.thumbnails.appendChild(wrapper);
            };
            reader.readAsDataURL(file);
        });
        e.target.value = '';
    };

    // Текст
    DOM.addTextBtn.onclick = () => {
        const text = new fabric.Textbox("Scrie textul aici", {
            left: canvas.width / 2, top: 150, originX: 'center',
            fontSize: 40, fill: '#000000', fontFamily: 'Poppins, sans-serif', width: 300
        });
        addWithAnimation(text);
    };

    // Стили текста
    canvas.on('selection:created', () => updateTextControls());
    canvas.on('selection:updated', () => updateTextControls());
    canvas.on('selection:cleared', () => DOM.stylePanel.classList.add('hidden'));

    function updateTextControls() {
        const obj = canvas.getActiveObject();
        if (obj && obj.type === 'textbox') {
            selectedText = obj;
            DOM.fontSelector.value = obj.fontFamily || 'Poppins, sans-serif';
            DOM.colorPicker.value = obj.fill || '#000000';
            DOM.stylePanel.classList.remove('hidden');
        }
    }

    DOM.fontSelector.onchange = () => selectedText?.set('fontFamily', DOM.fontSelector.value) && canvas.renderAll();
    DOM.colorPicker.oninput = () => {
        if (selectedText) {
            selectedText.set('fill', DOM.colorPicker.value);
            canvas.renderAll();
        }
    };

    // Кнопки
    DOM.clearCanvasBtn.onclick = () => {
        canvas.getObjects().filter(o => o !== currentOverlay && o !== defaultText).forEach(o => canvas.remove(o));
        DOM.stylePanel.classList.add('hidden');
    };

    DOM.saveBtn.onclick = () => {
        if (!DOM.modelSelect.value) return showToast("Alege modelul telefonului!", 'error');
        canvas.setOverlayImage(null, canvas.renderAll.bind(canvas));
        setTimeout(() => {
            const link = document.createElement('a');
            link.href = canvas.toDataURL('image/png');
            link.download = 'mycase-design.png';
            link.click();
            if (currentOverlay) canvas.setOverlayImage(currentOverlay, canvas.renderAll.bind(canvas));
        }, 100);
    };

    // Заказ
    DOM.orderBtn.onclick = () => {
        if (!currentOverlay) return showToast("Creează designul mai întâi!", 'error');
        DOM.orderFormModal.classList.remove('hidden');
    };
    DOM.cancelOrder.onclick = () => DOM.orderFormModal.classList.add('hidden');

            // Закрытие модального окна по Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !DOM.orderFormModal.classList.contains('hidden')) {
                DOM.orderFormModal.classList.add('hidden');
                // Опционально: сброс формы при закрытии
                // DOM.form.reset();
            }
        });
        // Закрытие по клику на overlay
        DOM.orderFormModal.addEventListener('click', (e) => {
            if (e.target === DOM.orderFormModal) {
                DOM.orderFormModal.classList.add('hidden');
            }
        });

    DOM.form.onsubmit = async (e) => {
    e.preventDefault();

    if (!currentOverlay) {
        showToast("Creează designul mai întâi!", 'error');
        return;
    }

    // Получаем элементы кнопки
    const submitBtn = document.getElementById('submit-order-btn');
    const submitText = document.getElementById('submit-text');
    const loadingText = document.getElementById('loading-text');

    // Отключаем кнопку и показываем лоадер (защита от дублей)
    submitBtn.disabled = true;
    submitText.classList.add('hidden');
    loadingText.classList.remove('hidden');

    const formData = new FormData(DOM.form);
    formData.append("brand", DOM.brandSelect.value);
    formData.append("model", DOM.modelSelect.value);

    // Экспорт дизайна с overlay (полный чехол)
    await new Promise(r => setTimeout(r, 100));
    const dataURL = canvas.toDataURL({ format: 'png' });
    const blob = await (await fetch(dataURL)).blob();
    formData.append("design_image", blob, "design.png");

    // Исходные фото
    uploadedFiles.forEach(i => formData.append("files", i.file));

    try {
        const res = await fetch("/order", { method: "POST", body: formData });

        if (res.ok) {
            showToast("Comandă primită! Te vom contacta în curând 📞", 'success');

            // Сброс всего
            DOM.form.reset();
            DOM.orderFormModal.classList.add('hidden');
            canvas.clear();
            canvas.add(defaultText);
            DOM.brandSelect.value = '';
            DOM.modelSelect.innerHTML = '<option value="">Alege modelul</option>';
            DOM.thumbnails.innerHTML = '';
            uploadedFiles = [];
        } else {
            showToast("Eroare la trimitere. Încearcă din nou.", 'error');
        }
    } catch (err) {
        console.error(err);
        showToast("Eroare rețea. Verifică conexiunea.", 'error');
    } finally {
        // В любом случае возвращаем кнопку в исходное состояние
        submitBtn.disabled = false;
        submitText.classList.remove('hidden');
        loadingText.classList.add('hidden');
    }
};

    function showToast(msg, type = 'success') {
        const toast = document.getElementById('toast');
        toast.textContent = msg;
        toast.classList.remove('border-green-500', 'border-red-500');
        toast.classList.add(type === 'error' ? 'border-red-500' : 'border-green-500');
        toast.classList.remove('opacity-0');
        setTimeout(() => toast.classList.add('opacity-0'), 4000);
    }

    // Заполняем селект шрифтов
    ["Poppins, sans-serif", "Inter, sans-serif", "Roboto Slab, serif", "Arial, sans-serif"].forEach(f => {
        const opt = document.createElement('option');
        opt.value = f; opt.textContent = f.split(',')[0];
        DOM.fontSelector.appendChild(opt);
    });
});


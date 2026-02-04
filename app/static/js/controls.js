// static/js/controls.js
const rotateImg = new Image();
rotateImg.src = '/static/icons/rotate.png';

fabric.Object.prototype.controls.mtr = new fabric.Control({
  x: 0,
  y: -0.5,
  offsetY: -32,      // отодвигаем от объекта
  cursorStyle: 'crosshair',

  actionHandler: fabric.controlsUtils.rotationWithSnapping,

  render: function (ctx, left, top, styleOverride, fabricObject) {
    const size = 28;

    ctx.save();
    ctx.translate(left, top);
    ctx.rotate(fabric.util.degreesToRadians(fabricObject.angle));
    ctx.drawImage(rotateImg, -size / 2, -size / 2, size, size);
    ctx.restore();
  }
});

export function setupFabricControls(canvas, DOM, state) {
  if (!canvas) throw new Error('setupFabricControls: canvas is required');

  fabric.Object.prototype.controls.mtr.withConnection = false;
  fabric.Object.prototype.controls.mtr.cursorStyle = 'grab';
  fabric.Object.prototype.controls.mtr.touchSizeX = 44;
  fabric.Object.prototype.controls.mtr.touchSizeY = 44;

  // ---------------- Helpers ----------------
  const isTextObject = (obj) =>
    !!obj && (obj.type === 'textbox' || obj.type === 'i-text' || obj.type === 'text');

  const getIsDark = () => document.documentElement.classList.contains('dark');

  const syncUiFromSelectedText = () => {
    const obj = canvas.getActiveObject();
    if (!isTextObject(obj)) {
      state.selectedText = null;
      return;
    }

    state.selectedText = obj;
    if (DOM.fontSelector) DOM.fontSelector.value = obj.fontFamily || 'Poppins, sans-serif';
    if (DOM.colorPicker) DOM.colorPicker.value = obj.fill || '#000000';
  };

  const ensureDeleteControl = (obj) => {
    if (!obj) return;
    if (!obj.controls) obj.controls = {};
    obj.controls.deleteControl = deleteControl;
    if (isTextObject(obj)) obj.set({ padding: obj.padding ?? 12 });
  };

  // ---------------- Delete Control (X) ----------------
  const deleteControl = new fabric.Control({
    x: 0.5,
    y: -0.5,
    offsetY: -20,
    offsetX: 20,
    cursorStyle: 'pointer',
    mouseUpHandler: (_eventData, transform) => {
      const target = transform?.target;
      if (!target) return;

      canvas.remove(target);

      if (isTextObject(target)) {
        state.selectedText = null;
      }

      canvas.discardActiveObject();
      canvas.requestRenderAll();
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
      ctx.beginPath();
      ctx.moveTo(-6, -6);
      ctx.lineTo(6, 6);
      ctx.moveTo(6, -6);
      ctx.lineTo(-6, 6);
      ctx.stroke();

      ctx.restore();
    },
    cornerSize: 28,
  });

  // Прописываем deleteControl в базовые прототипы (важно для текста)
  fabric.Object.prototype.controls.deleteControl = deleteControl;
  if (fabric.Text?.prototype?.controls) fabric.Text.prototype.controls.deleteControl = deleteControl;
  if (fabric.IText?.prototype?.controls) fabric.IText.prototype.controls.deleteControl = deleteControl;
  if (fabric.Textbox?.prototype?.controls) fabric.Textbox.prototype.controls.deleteControl = deleteControl;

  // Для уже существующих объектов
  canvas.getObjects().forEach(ensureDeleteControl);
  canvas.requestRenderAll();

  // И для новых объектов тоже
  canvas.on('object:added', (opt) => ensureDeleteControl(opt?.target));

  // ---------------- Selection sync ----------------
  canvas.on('selection:created', syncUiFromSelectedText);
  canvas.on('selection:updated', syncUiFromSelectedText);
  canvas.on('selection:cleared', syncUiFromSelectedText);

  // Иногда при клике Fabric может “переиспользовать” controls — подстрахуем
  canvas.on('mouse:down', (opt) => {
    const t = opt?.target;
    if (!t) return;
    ensureDeleteControl(t);
    canvas.requestRenderAll();
  });

  // ---------------- Add Text (from input) ----------------
  if (DOM.addTextBtn) {
    DOM.addTextBtn.addEventListener('click', () => {
      const txt = (DOM.textInput?.value || 'Scrie textul aici').trim() || 'Scrie textul aici';

      const chosenFont = DOM.fontSelector?.value || 'Poppins, sans-serif';
      const chosenColor =
        DOM.colorPicker?.value ||
        (getIsDark() ? '#ffffff' : '#000000');

      const text = new fabric.Textbox(txt, {
          left: canvas.width / 2,
          top: 150,
          originX: 'center',
          fontSize: 40,
          fill: chosenColor,
          fontFamily: chosenFont,
          width: 300,
          padding: 12,

          // Курсор при наведении (когда не выбран)
          hoverCursor: 'pointer',

          // Курсор при наведении на уже выделенный объект
          moveCursor: 'grab',

          hasControls: false,
          hasBorders: false,
        });

      ensureDeleteControl(text);

      text.set({ hoverCursor: 'text' });
      text.on('changed', () => canvas.requestRenderAll());

      // лёгкая анимация появления
      text.set({ opacity: 0 });
      canvas.add(text);
      text.animate('opacity', 1, {
        duration: 350,
        onChange: canvas.renderAll.bind(canvas),
      });

      canvas.setActiveObject(text);
      syncUiFromSelectedText();
    });
  }

  // ---------------- Font / Color change ----------------
  if (DOM.fontSelector) {
    DOM.fontSelector.addEventListener('change', () => {
      if (!state.selectedText) return;
      state.selectedText.set('fontFamily', DOM.fontSelector.value);
      canvas.requestRenderAll();
    });
  }

  if (DOM.colorPicker) {
    DOM.colorPicker.addEventListener('input', () => {
      if (!state.selectedText) return;
      state.selectedText.set('fill', DOM.colorPicker.value);
      canvas.requestRenderAll();
    });
  }

  // Иконки (приятный UX): палитра открывает color picker, шрифт — фокус на селект
  DOM.colorBtn?.addEventListener('click', () => DOM.colorPicker?.click());
  DOM.fontBtn?.addEventListener('click', () => DOM.fontSelector?.focus());

  // ---------------- Delete key ----------------
  const isTextEditing = () => {
    const obj = canvas.getActiveObject();
    return !!obj && obj.isEditing === true;
  };

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Delete' && e.key !== 'Backspace') return;

    // если редактируем текст — не удаляем объект
    if (isTextEditing()) return;

    const active = canvas.getActiveObject();
    if (!active) return;

    e.preventDefault();
    canvas.remove(active);

    if (isTextObject(active)) state.selectedText = null;

    canvas.discardActiveObject();
    canvas.requestRenderAll();
  });

  // ---------------- Touch gestures (pinch scale + rotate) ----------------
  let lastTouchDistance = null;
  let lastTouchAngle = null;

  canvas.on('touch:gesture', (opt) => {
    const e = opt?.e;
    const target = canvas.getActiveObject();
    if (!target || !e || !e.touches || e.touches.length !== 2) return;

    e.preventDefault();

    const t1 = e.touches[0];
    const t2 = e.touches[1];

    const dx = t2.clientX - t1.clientX;
    const dy = t2.clientY - t1.clientY;

    const distance = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    // SCALE
    if (lastTouchDistance) {
      let scale = target.scaleX * (distance / lastTouchDistance);
      scale = Math.max(0.1, Math.min(scale, 10));
      target.scale(scale);
    }

    // ROTATE
    if (lastTouchAngle !== null) {
      const delta = angle - lastTouchAngle;
      target.rotate((target.angle || 0) + (delta * 180) / Math.PI);
    }

    lastTouchDistance = distance;
    lastTouchAngle = angle;

    target.setCoords();
    canvas.requestRenderAll();
  });

  const resetTouch = () => {
    lastTouchDistance = null;
    lastTouchAngle = null;
  };

  canvas.on('touch:drag', resetTouch);
  canvas.on('touch:orientation', resetTouch);
}

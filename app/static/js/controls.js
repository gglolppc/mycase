// static/js/controls.js

export function setupFabricControls(canvas, DOM, state) {
  // ---------- DELETE CONTROL (X) ----------
  const deleteControl = new fabric.Control({
    x: 0.5,
    y: -0.5,
    offsetY: -20,
    offsetX: 20,
    cursorStyle: 'pointer',
    mouseUpHandler: (_eventData, transform) => {
      const target = transform.target;
      if (!target) return;

      canvas.remove(target);

      if (target.type === 'textbox' || target.type === 'i-text' || target.type === 'text') {
        DOM.stylePanel?.classList.add('hidden');
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

  // 1) Прописали в базовый Object
  fabric.Object.prototype.controls.deleteControl = deleteControl;

  // 2) ВАЖНО: текстовые прототипы часто имеют свои controls и не берут из Object
  if (fabric.Text?.prototype?.controls) fabric.Text.prototype.controls.deleteControl = deleteControl;
  if (fabric.IText?.prototype?.controls) fabric.IText.prototype.controls.deleteControl = deleteControl;
  if (fabric.Textbox?.prototype?.controls) fabric.Textbox.prototype.controls.deleteControl = deleteControl;

  // 3) На всякий: применим к уже существующим объектам на канвасе
  canvas.getObjects().forEach((obj) => {
    if (obj && obj.controls) obj.controls.deleteControl = deleteControl;
    if (obj && (obj.type === 'textbox' || obj.type === 'i-text' || obj.type === 'text')) {
      obj.set({ padding: obj.padding ?? 12 });
    }
  });
  canvas.requestRenderAll();

  // ---------- TEXT STYLE PANEL ----------
  function isTextObject(obj) {
    return obj && (obj.type === 'textbox' || obj.type === 'i-text' || obj.type === 'text');
  }

  function updateTextControls() {
    const obj = canvas.getActiveObject();

    if (isTextObject(obj)) {
      state.selectedText = obj;

      if (DOM.fontSelector) DOM.fontSelector.value = obj.fontFamily || 'Poppins, sans-serif';
      if (DOM.colorPicker) DOM.colorPicker.value = obj.fill || '#000000';
      DOM.stylePanel?.classList.remove('hidden');
    } else {
      DOM.stylePanel?.classList.add('hidden');
      state.selectedText = null;
    }
  }

  canvas.on('selection:created', updateTextControls);
  canvas.on('selection:updated', updateTextControls);
  canvas.on('selection:cleared', updateTextControls);

  // Чтобы при клике на объект заново пересчитались контролы (иногда нужно для текста)
  canvas.on('mouse:down', (opt) => {
    const t = opt?.target;
    if (!t) return;

    if (t.controls) t.controls.deleteControl = deleteControl;
    if (isTextObject(t)) t.set({ padding: t.padding ?? 12 });

    canvas.requestRenderAll();
  });

  // ---------- ADD TEXT ----------
  if (DOM.addTextBtn) {
    DOM.addTextBtn.addEventListener('click', () => {
      const isDark = document.documentElement.classList.contains('dark');

      const text = new fabric.Textbox('Scrie textul aici', {
        left: canvas.width / 2,
        top: 150,
        originX: 'center',
        fontSize: 40,
        fill: isDark ? '#ffffff' : '#000000',
        fontFamily: 'Poppins, sans-serif',
        width: 300,
        padding: 12, // место под крестик
      });

      // Гарантируем, что именно этот текст точно имеет deleteControl
      if (text.controls) text.controls.deleteControl = deleteControl;

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
      updateTextControls();
    });
  }

  // ---------- FONT / COLOR ----------
  if (DOM.fontSelector) {
    DOM.fontSelector.addEventListener('change', () => {
      if (state.selectedText) {
        state.selectedText.set('fontFamily', DOM.fontSelector.value);
        canvas.requestRenderAll();
      }
    });
  }

  if (DOM.colorPicker) {
    DOM.colorPicker.addEventListener('input', () => {
      if (state.selectedText) {
        state.selectedText.set('fill', DOM.colorPicker.value);
        canvas.requestRenderAll();
      }
    });
  }
    // ---------- DELETE KEY ----------
  function isTextEditing() {
    const obj = canvas.getActiveObject();
    return obj && obj.isEditing === true;
  }

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Delete' && e.key !== 'Backspace') return;

    // если редактируем текст — не удаляем объект
    if (isTextEditing()) return;

    const active = canvas.getActiveObject();
    if (!active) return;

    e.preventDefault();

    canvas.remove(active);

    if (active.type === 'textbox' || active.type === 'i-text' || active.type === 'text') {
      DOM.stylePanel?.classList.add('hidden');
      state.selectedText = null;
    }

    canvas.discardActiveObject();
    canvas.requestRenderAll();
  });

}

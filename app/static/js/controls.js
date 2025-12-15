// static/js/controls.js

export function setupFabricControls(canvas, DOM, state) {
  // Кастомный контрол удаления для всех объектов
  fabric.Object.prototype.controls.deleteControl = new fabric.Control({
    x: 0.5,
    y: -0.5,
    offsetY: -20,
    offsetX: 20,
    cursorStyle: 'pointer',
    mouseUpHandler: (eventData, transform) => {
      const target = transform.target;
      canvas.remove(target);

      if (target.type === 'textbox') {
        DOM.stylePanel.classList.add('hidden');
        state.selectedText = null;
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
      ctx.moveTo(-6, -6);
      ctx.lineTo(6, 6);
      ctx.moveTo(6, -6);
      ctx.lineTo(-6, 6);
      ctx.stroke();
      ctx.restore();
    },
    cornerSize: 28,
  });

  // Добавление текста
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

    text.bringToFront();
    text.set({ hoverCursor: 'text' });

    text.dirty = true;

    text.on('changed', () => {
      canvas.requestRenderAll();
    });

    // через анимацию
    text.set({ opacity: 0 });
    canvas.add(text);
    text.animate('opacity', 1, {
      duration: 400,
      onChange: canvas.renderAll.bind(canvas),
    });
    canvas.setActiveObject(text);
  });

  // Обновление панели стилей
  function updateTextControls() {
    const obj = canvas.getActiveObject();

    if (obj && obj.type === 'textbox') {
      state.selectedText = obj;
      DOM.fontSelector.value = obj.fontFamily || 'Poppins, sans-serif';
      DOM.colorPicker.value = obj.fill || '#000000';
      DOM.stylePanel.classList.remove('hidden');
    }
  }

  canvas.on('selection:created', updateTextControls);
  canvas.on('selection:updated', updateTextControls);
  canvas.on('selection:cleared', () => {
    DOM.stylePanel.classList.add('hidden');
    state.selectedText = null;
  });

  // Смена шрифта
  DOM.fontSelector.addEventListener('change', () => {
    if (state.selectedText) {
      state.selectedText.set('fontFamily', DOM.fontSelector.value);
      canvas.requestRenderAll();
    }
  });

  // Смена цвета
  DOM.colorPicker.addEventListener('input', () => {
    if (state.selectedText) {
      state.selectedText.set('fill', DOM.colorPicker.value);
      canvas.requestRenderAll();
    }
  });
}

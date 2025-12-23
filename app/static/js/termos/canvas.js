export const BASE_W = 420;
export const BASE_H = 780;

export function createCanvasThermos() {
  const canvas = new fabric.Canvas('termos-canvas', {
    preserveObjectStacking: true,
    width: BASE_W,
    height: BASE_H,
  });

  canvas.setBackgroundColor('#ffffff', canvas.renderAll.bind(canvas));
  return { canvas };
}

export function setCanvasTheme(canvas, isDark) {
  canvas.setBackgroundColor(isDark ? '#2f2f2f' : '#ffffff', canvas.renderAll.bind(canvas));
}

export function makeVerticalText(str) {
  return (str || '').toString().split('').join('\n');
}

export function keepTextOnTop(canvas, state) {
  if (!state?.defaultTextObj) return;

  // Поднимаем текст над всеми объектами canvas (картинки и т.д.)
  state.defaultTextObj.bringToFront();

  // Если выбран другой объект — возвращаем выбор обратно на текст (опционально)
  // canvas.setActiveObject(state.defaultTextObj);

  canvas.requestRenderAll();
}

export function setThermosOverlay({ canvas, state, size, color, STATIC_BASE }) {
  const path = `${STATIC_BASE}assets/termos-mocks/${size}/${color}.png`;

  fabric.Image.fromURL(
    path,
    (img) => {
      img.set({
        selectable: false,
        evented: false,
        left: 0,
        top: 0,
      });

      // Растягиваем под размер canvas
      const scaleX = canvas.getWidth() / img.width;
      const scaleY = canvas.getHeight() / img.height;
      img.scaleX = scaleX;
      img.scaleY = scaleY;

      // ✅ ВАЖНО: background, а не overlay
      canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));

      state.currentOverlay = img;

      // текст поверх всего (картинок и фона)
      keepTextOnTop(canvas, state);
    },
    { crossOrigin: 'anonymous' }
  );
}


export function setDefaultVerticalText({ canvas, state, text, fontFamily, fill }) {
      if (state.defaultTextObj) {
        canvas.remove(state.defaultTextObj);
      }

      const t = new fabric.IText(text, { // Меняем Textbox на IText
          left: canvas.getWidth() / 2.1,
          top: canvas.getHeight() / 1.85,
          originX: 'center',
          originY: 'center',
          angle: 90,
          fontSize: 75,
          fill: fill || '#ffffff',
          fontFamily: fontFamily || 'Montserrat, sans-serif',
          editable: true,
          // width: 260, // Больше не нужно, IText сам определит ширину
          textAlign: 'center',
        });

      t.bringToFront();
      canvas.add(t);
      state.defaultTextObj = t;
      keepTextOnTop(canvas, state);
      canvas.setActiveObject(t);
      canvas.requestRenderAll();

    }



export function addImageToCanvasSmall(canvas, state, dataURL) {
  fabric.Image.fromURL(
    dataURL,
    (img) => {
      const max = 200;
      const scale = Math.min(max / img.width, max / img.height, 1);

      img.scale(scale);
      img.set({
        left: canvas.width / 2,
        top: canvas.height / 2,
        originX: 'center',
        originY: 'center',
      });

      canvas.add(img);
      canvas.setActiveObject(img);

      // ✅ после добавления картинки — текст наверх
      keepTextOnTop(canvas, state);
    },
    { crossOrigin: 'anonymous' }
  );
}


export function clearDesignThermos({ canvas, state }) {
  canvas.getObjects().forEach((o) => canvas.remove(o));
  state.defaultTextObj = null;
  canvas.requestRenderAll();
}

export async function exportCanvasPng(canvas, state, { outWidth = BASE_W } = {}) {
  const prevOverlay = state.currentOverlay;
  if (prevOverlay) canvas.setOverlayImage(null, canvas.renderAll.bind(canvas));

  await new Promise((r) => setTimeout(r, 80));

  const multiplier = outWidth / canvas.getWidth();
  const dataURL = canvas.toDataURL({ format: 'png', multiplier });

  if (prevOverlay) canvas.setOverlayImage(prevOverlay, canvas.renderAll.bind(canvas));
  return dataURL;
}

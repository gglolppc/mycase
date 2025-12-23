// static/js/canvas.js

export const BASE_W = 420;
export const BASE_H = 780;

/**
 * Инициализирует и возвращает экземпляр Fabric.js Canvas.
 * @returns {{canvas: fabric.Canvas, defaultText: fabric.Text}}
 */
export function createCanvas() {
  const canvas = new fabric.Canvas('phone-canvas', {
    preserveObjectStacking: true,
    selection: true,
    allowTouchScrolling: false,
    fireRightClick: true,
    stopContextMenu: true,
    width: BASE_W,
    height: BASE_H,
  });

  // дефолтный фон (светлая тема по умолчанию)
  canvas.setBackgroundColor('#ffffff', canvas.renderAll.bind(canvas));

  const defaultText = new fabric.Text('Alege modelul telefonului', {
    left: BASE_W / 2,
    top: BASE_H / 2,
    originX: 'center',
    originY: 'center',
    fontSize: 24,
    fill: '#9ca3af',
    selectable: false,
    evented: false,
  });

  canvas.add(defaultText);
  return { canvas, defaultText };
}

/**
 * Тема канваса: фон + дефолтный текст.
 * В dark — фон темно-серый (как ты просил).
 */
export function setCanvasTheme(canvas, state, isDark) {
  const bg = isDark ? '#2f2f2f' : '#ffffff';
  canvas.setBackgroundColor(bg, canvas.renderAll.bind(canvas));

  if (state?.defaultText) {
    state.defaultText.set({ fill: isDark ? '#9ca3af' : '#9ca3af' });
  }

  canvas.requestRenderAll();
}

/**
 * Добавляет объект на канвас с анимацией плавного появления.
 */
function addWithAnimation(canvas, obj) {
  obj.set({ opacity: 0 });
  canvas.add(obj);
  obj.animate('opacity', 1, {
    duration: 400,
    onChange: canvas.renderAll.bind(canvas),
  });
  canvas.setActiveObject(obj);
}

/**
 * Добавляет изображение на канвас, масштабируя его под размеры.
 */
export function addImageToCanvas(canvas, dataURL) {
  fabric.Image.fromURL(
    dataURL,
    (img) => {
      const scale = Math.min((canvas.width * 0.85) / img.width, (canvas.height * 0.85) / img.height);
      img.scale(scale);
      img.set({
        left: canvas.width / 2,
        top: canvas.height / 2,
        originX: 'center',
        originY: 'center',
        selectable: true,
        evented: true,
        padding: 12,
        cornerSize: 12,
        transparentCorners: false,
      });
      addWithAnimation(canvas, img);
    },
    { crossOrigin: 'anonymous' },
  );
}

/**
 * Устанавливает или удаляет изображение оверлея (макет телефона).
 */
export function setPhoneOverlay({ canvas, state, brand, model, STATIC_BASE }) {
  canvas.clear();

  if (!brand || !model) {
    canvas.add(state.defaultText);
    state.currentOverlay = null;
    canvas.renderAll();
    return;
  }

  canvas.remove(state.defaultText);

  const path = `${STATIC_BASE}assets/phone-mocks/${brand}/${model}.png`;

  fabric.Image.fromURL(
    path,
    (img) => {
      const imgWidth = img.width;
      const imgHeight = img.height;

      img.set({
        selectable: false,
        evented: false,
        left: 0,
        top: 0,
        scaleX: canvas.width / imgWidth,
        scaleY: canvas.height / imgHeight,
        originalWidth: imgWidth,
        originalHeight: imgHeight,
        excludeFromExport: false, // 🔥 ВАЖНО
      });

      canvas.setOverlayImage(img, canvas.renderAll.bind(canvas));
      state.currentOverlay = img;
    },
    { crossOrigin: 'anonymous' },
  );
}

/**
 * Очищает дизайн (все объекты, кроме дефолтного текста).
 */
export function clearDesign({ canvas, state, stylePanelEl }) {
  canvas
    .getObjects()
    .filter((o) => o !== state.defaultText)
    .forEach((o) => canvas.remove(o));

  if (!state.currentOverlay) {
    canvas.add(state.defaultText);
    state.defaultText.set({ left: canvas.width / 2, top: canvas.height / 2 });
  }

  if (stylePanelEl) stylePanelEl.classList.add('hidden');
  canvas.renderAll();
}

// ----------- RESPONSIVE (через Fabric, не через CSS) -----------

function scaleAllObjects(canvas, sx, sy) {
  canvas.getObjects().forEach((obj) => {
    obj.scaleX *= sx;
    obj.scaleY *= sy;
    obj.left *= sx;
    obj.top *= sy;
    obj.setCoords();
  });
}

/**
 * Настраивает адаптивность канваса, привязываясь к ширине контейнера.
 */
export function setupResponsiveCanvas(
  canvas,
  state,
  containerEl,
  { baseW = BASE_W, baseH = BASE_H } = {}
) {
  let lastW = canvas.getWidth();
  let lastH = canvas.getHeight();

  function resize() {
    if (!containerEl) return;

    const cw = containerEl.clientWidth;
    const targetW = Math.min(baseW, cw);
    const targetH = Math.round(targetW * (baseH / baseW));

    if (targetW <= 0 || targetH <= 0) return;
    if (targetW === lastW && targetH === lastH) return;

    const sx = targetW / lastW;
    const sy = targetH / lastH;

    canvas.setWidth(targetW);
    canvas.setHeight(targetH);

    scaleAllObjects(canvas, sx, sy);

    if (state.defaultText) {
      state.defaultText.set({ left: canvas.width / 2, top: canvas.height / 2 });
    }

    if (state.currentOverlay) {
      const originalW = state.currentOverlay.originalWidth || baseW;
      const originalH = state.currentOverlay.originalHeight || baseH;

      state.currentOverlay.set({
        left: 0,
        top: 0,
        scaleX: canvas.width / originalW,
        scaleY: canvas.height / originalH,
      });
      canvas.setOverlayImage(state.currentOverlay, canvas.renderAll.bind(canvas));
    }

    canvas.requestRenderAll();

    lastW = targetW;
    lastH = targetH;
  }

  resize();
  window.addEventListener('resize', resize);
  return { resize };
}

// ----------- EXPORT (всегда 420×780) -----------

export async function exportCanvasPng(canvas, state, { outWidth = BASE_W } = {}) {
  const prevOverlay = state.currentOverlay;



  await new Promise((r) => setTimeout(r, 80));

  const multiplier = outWidth / canvas.getWidth();
  const dataURL = canvas.toDataURL({ format: 'png', multiplier });

  if (prevOverlay) canvas.setOverlayImage(prevOverlay, canvas.renderAll.bind(canvas));

  return dataURL;
}

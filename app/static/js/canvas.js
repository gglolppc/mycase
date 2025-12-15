// static/js/canvas.js



export const BASE_W = 420;
export const BASE_H = 780;

/**
 * Инициализирует и возвращает экземпляр Fabric.js Canvas.
 * @returns {{canvas: fabric.Canvas, defaultText: fabric.Text}}
 */
export function createCanvas() {
  // Важно: Инициализируем canvas по ID, но не устанавливаем его окончательные размеры.
  // Размеры будут установлены функцией setupResponsiveCanvas.
  const canvas = new fabric.Canvas('phone-canvas', {
    preserveObjectStacking: true,
    // Устанавливаем базовые размеры, которые будут умножаться на масштаб
    width: BASE_W,
    height: BASE_H,
  });

  const defaultText = new fabric.Text('Alege modelul telefonului', {
    left: BASE_W / 2, // Используем базовый размер для центра
    top: BASE_H / 2,
    originX: 'center',
    originY: 'center',
    fontSize: 24,
    fill: '#aaa',
    selectable: false,
    evented: false,
  });

  canvas.add(defaultText);

  return { canvas, defaultText };
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
      // Масштабируем изображение, чтобы оно поместилось в 85% канваса
      const scale = Math.min((canvas.width * 0.85) / img.width, (canvas.height * 0.85) / img.height);
      img.scale(scale);
      img.set({
        left: canvas.width / 2,
        top: canvas.height / 2,
        originX: 'center',
        originY: 'center',
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
      // Размеры изображения оверлея
      const imgWidth = img.width;
      const imgHeight = img.height;

      img.set({
        selectable: false,
        evented: false,
        left: 0,
        top: 0,
        // Масштабируем оверлей до текущих размеров канваса
        scaleX: canvas.width / imgWidth,
        scaleY: canvas.height / imgHeight,
        // Сохраняем оригинальные размеры оверлея для пересчёта при ресайзе
        originalWidth: imgWidth,
        originalHeight: imgHeight,
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
    .filter((o) => o !== state.defaultText) // overlay не в objects
    .forEach((o) => canvas.remove(o));

  // вернуть дефолтный текст если нет оверлея
  if (!state.currentOverlay) {
    canvas.add(state.defaultText);
    state.defaultText.set({ left: canvas.width / 2, top: canvas.height / 2 });
  }

  if (stylePanelEl) stylePanelEl.classList.add('hidden');
  canvas.renderAll();
}

// ----------- RESPONSIVE (через Fabric, не через CSS) -----------

/**
 * Пересчитывает масштаб всех объектов на канвасе.
 */
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
 * * @param {fabric.Canvas} canvas Экземпляр Fabric.js канваса.
 * @param {object} state Объект состояния (с defaultText и currentOverlay).
 * @param {HTMLElement} containerEl Элемент, от которого берётся ширина (НОВЫЙ ПАРАМЕТР).
 * @param {object} options Базовые размеры.
 */
export function setupResponsiveCanvas(
  canvas,
  state,
  containerEl, // <--- НОВЫЙ ПАРАМЕТР: Элемент-источник ширины
  { baseW = BASE_W, baseH = BASE_H } = {}
) {
  let lastW = canvas.getWidth();
  let lastH = canvas.getHeight();

  function resize() {
    // 1. Проверяем наличие контейнера
    if (!containerEl) return;

    // 2. Определяем целевую ширину по ширине контейнера (clientWidth)
    const cw = containerEl.clientWidth;

    // Новая ширина - это минимум из базовой ширины или ширины контейнера
    const targetW = Math.min(baseW, cw);

    // Новая высота, сохраняющая пропорции
    const targetH = Math.round(targetW * (baseH / baseW));

    if (targetW <= 0 || targetH <= 0) return;
    if (targetW === lastW && targetH === lastH) return;

    const sx = targetW / lastW;
    const sy = targetH / lastH;

    canvas.setWidth(targetW);
    canvas.setHeight(targetH);

    scaleAllObjects(canvas, sx, sy);

    // Центр дефолтного текста (если он есть)
    if (state.defaultText) {
      state.defaultText.set({ left: canvas.width / 2, top: canvas.height / 2 });
    }

    // Рескейл оверлея
    if (state.currentOverlay) {
      // Используем оригинальные размеры оверлея для точного масштабирования
      const originalW = state.currentOverlay.originalWidth || baseW;
      const originalH = state.currentOverlay.originalHeight || baseH;

      state.currentOverlay.set({
        left: 0,
        top: 0,
        // Пересчитываем scaleX/Y относительно оригинальных размеров оверлея и НОВОЙ ширины канваса
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

/**
 * Экспортирует изображение канваса в PNG с заданным разрешением (по умолчанию 420x780).
 */
export async function exportCanvasPng(canvas, state, { outWidth = BASE_W } = {}) {
  const prevOverlay = state.currentOverlay;

  // 1. Временно убираем оверлей, чтобы экспортировать только дизайн
  if (prevOverlay) canvas.setOverlayImage(null, canvas.renderAll.bind(canvas));

  // 2. Ждём рендера
  await new Promise((r) => setTimeout(r, 80));

  // 3. Экспортируем с нужным множителем (всегда до BASE_W)
  const multiplier = outWidth / canvas.getWidth();
  const dataURL = canvas.toDataURL({ format: 'png', multiplier });

  // 4. Возвращаем оверлей обратно
  if (prevOverlay) canvas.setOverlayImage(prevOverlay, canvas.renderAll.bind(canvas));

  return dataURL;
}
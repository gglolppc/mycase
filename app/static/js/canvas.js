// static/js/canvas.js

export const BASE_W = 420;
export const BASE_H = 780;

export function createCanvas() {
  const canvas = new fabric.Canvas('phone-canvas', { preserveObjectStacking: true });

  // Сразу базовый размер (важно для расчётов)
  canvas.setWidth(BASE_W);
  canvas.setHeight(BASE_H);

  const defaultText = new fabric.Text('Alege modelul telefonului', {
    left: canvas.width / 2,
    top: canvas.height / 2,
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

function addWithAnimation(canvas, obj) {
  obj.set({ opacity: 0 });
  canvas.add(obj);
  obj.animate('opacity', 1, {
    duration: 400,
    onChange: canvas.renderAll.bind(canvas),
  });
  canvas.setActiveObject(obj);
}

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
      });
      addWithAnimation(canvas, img);
    },
    { crossOrigin: 'anonymous' },
  );
}

export function setPhoneOverlay({ canvas, state, brand, model }) {
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
      img.set({
        selectable: false,
        evented: false,
        left: 0,
        top: 0,
        scaleX: canvas.width / img.width,
        scaleY: canvas.height / img.height,
      });

      canvas.setOverlayImage(img, canvas.renderAll.bind(canvas));
      state.currentOverlay = img;
    },
    { crossOrigin: 'anonymous' },
  );
}

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

function scaleAllObjects(canvas, sx, sy) {
  canvas.getObjects().forEach((obj) => {
    obj.scaleX *= sx;
    obj.scaleY *= sy;
    obj.left *= sx;
    obj.top *= sy;
    obj.setCoords();
  });
}

export function setupResponsiveCanvas(canvas, state, { baseW = BASE_W, baseH = BASE_H } = {}) {
  let lastW = canvas.getWidth();
  let lastH = canvas.getHeight();

  function resize() {
    const el = document.getElementById('phone-canvas');
    if (!el) return;

    const container = el.parentElement;
    if (!container) return;

    // контейнер уже с паддингами, поэтому чуть запас
    const cw = container.clientWidth;
    const targetW = Math.min(baseW, Math.floor(cw - 2));
    const targetH = Math.round(targetW * (baseH / baseW));

    if (targetW <= 0 || targetH <= 0) return;
    if (targetW === lastW && targetH === lastH) return;

    const sx = targetW / lastW;
    const sy = targetH / lastH;

    canvas.setWidth(targetW);
    canvas.setHeight(targetH);

    scaleAllObjects(canvas, sx, sy);

    // центр дефолтного текста (если он есть)
    if (state.defaultText) {
      state.defaultText.set({ left: canvas.width / 2, top: canvas.height / 2 });
    }

    // рескейл оверлея
    if (state.currentOverlay) {
      state.currentOverlay.set({
        left: 0,
        top: 0,
        scaleX: canvas.width / state.currentOverlay.width,
        scaleY: canvas.height / state.currentOverlay.height,
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

  if (prevOverlay) canvas.setOverlayImage(null, canvas.renderAll.bind(canvas));
  await new Promise((r) => setTimeout(r, 80));

  const multiplier = outWidth / canvas.getWidth();
  const dataURL = canvas.toDataURL({ format: 'png', multiplier });

  if (prevOverlay) canvas.setOverlayImage(prevOverlay, canvas.renderAll.bind(canvas));
  return dataURL;
}

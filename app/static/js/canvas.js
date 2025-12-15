// static/js/canvas.js
export function createCanvas() {
  const canvas = new fabric.Canvas('phone-canvas', { preserveObjectStacking: true });

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
      const scale = Math.min(
        (canvas.width * 0.85) / img.width,
        (canvas.height * 0.85) / img.height,
      );
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
    .filter((o) => o !== state.currentOverlay && o !== state.defaultText)
    .forEach((o) => canvas.remove(o));

  if (stylePanelEl) {
    stylePanelEl.classList.add('hidden');
  }

  canvas.renderAll();
}

export async function exportCanvasPng(canvas, state) {
  // временно убираем overlay, чтобы сохранить чистый принт
  const prevOverlay = state.currentOverlay;

  if (prevOverlay) {
    canvas.setOverlayImage(null, canvas.renderAll.bind(canvas));
  }

  await new Promise((r) => setTimeout(r, 100));

  const dataURL = canvas.toDataURL('image/png');

  if (prevOverlay) {
    canvas.setOverlayImage(prevOverlay, canvas.renderAll.bind(canvas));
  }

  return dataURL;
}

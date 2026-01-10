// static/js/submit.js

export function setupOrderForm({ DOM, state, canvas, showToast, exportCanvasPng, resetApp }) {
  DOM.cancelOrder.addEventListener('click', () => {
    DOM.orderFormModal.classList.add('hidden');
  });

  DOM.form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!state.currentOverlayObj) {
      showToast(window.__t('toast.create_first'), 'error');
      return;
    }

    const submitBtn = DOM.submitOrderBtn;
    const submitText = DOM.submitText;
    const loadingText = DOM.loadingText;

    submitBtn.disabled = true;
    submitText.classList.add('hidden');
    loadingText.classList.remove('hidden');

    const formData = new FormData(DOM.form);
    formData.append('brand', DOM.brandSelect.value);
    formData.append('model', DOM.modelSelect.value);

    // Экспорт дизайна с overlay уже на канвасе
    await new Promise((r) => setTimeout(r, 100));
    const dataURL = await exportCanvasPng(canvas, state, { outWidth: 420 });
    const blob = await (await fetch(dataURL)).blob();
    formData.append('design_image', blob, 'design.png');

    // Исходные фото
    state.uploadedFiles.forEach((i) => formData.append('files', i.file));

    try {
      const res = await fetch('/order', { method: 'POST', body: formData });

      if (res.ok) {
        showToast(window.__t('toast.order_received'), 'success');
        resetApp();
      } else {
        showToast(window.__t('toast.send_error'), 'error');
      }
    } catch (err) {
      console.error(err);
      showToast(window.__t('toast.network_error'), 'error');
    } finally {
      submitBtn.disabled = false;
      submitText.classList.remove('hidden');
      loadingText.classList.add('hidden');
    }
  });
}

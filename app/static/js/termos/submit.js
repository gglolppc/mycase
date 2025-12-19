export function setupThermosOrderForm({ DOM, state, canvas, showToast, exportCanvasPng, resetApp }) {
  DOM.cancelOrder.addEventListener('click', () => DOM.orderFormModal.classList.add('hidden'));

  DOM.form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!state.currentOverlay) {
      showToast('Alege termosul mai întâi!', 'error');
      return;
    }

    DOM.submitOrderBtn.disabled = true;
    DOM.submitText.classList.add('hidden');
    DOM.loadingText.classList.remove('hidden');

    const formData = new FormData(DOM.form);

    formData.append('termos_size', DOM.size500.checked ? '500' : '750');
    formData.append('termos_color', state.selectedColor || 'black');
    const canvasText =
      state.defaultTextObj?.text?.replace(/\n/g, '') || 'Numele tau';

    formData.append('termos_text', canvasText);
    formData.append('termos_font', DOM.fontSelector.value || 'Poppins, sans-serif');
    formData.append('termos_text_color', DOM.textColor.value || '#ffffff');

    await new Promise((r) => setTimeout(r, 80));
    const dataURL = await exportCanvasPng(canvas, state, { outWidth: 420 });
    const blob = await (await fetch(dataURL)).blob();
    formData.append('design_image', blob, 'design.png');

    state.uploadedFiles.forEach((i) => formData.append('files', i.file));

    try {
      const res = await fetch('/order-termos', { method: 'POST', body: formData });

      if (res.ok) {
        showToast('Comandă primită! 📦', 'success');
        resetApp();
      } else {
        showToast('Eroare la trimitere. Încearcă din nou.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Eroare rețea. Verifică internetul.', 'error');
    } finally {
      DOM.submitOrderBtn.disabled = false;
      DOM.submitText.classList.remove('hidden');
      DOM.loadingText.classList.add('hidden');
    }
  });
}

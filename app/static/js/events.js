// static/js/events.js

export function bindActionButtons({ handleClear, handleSave, handleOrder }) {
  // все кнопки где есть data-action="clear/save/order"
  document.querySelectorAll('[data-action="clear"]').forEach((btn) => {
    btn.addEventListener('click', handleClear);
  });

  document.querySelectorAll('[data-action="save"]').forEach((btn) => {
    btn.addEventListener('click', handleSave);
  });

  document.querySelectorAll('[data-action="order"]').forEach((btn) => {
    btn.addEventListener('click', handleOrder);
  });
}

export function setupModalClose(DOM) {
  // ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !DOM.orderFormModal.classList.contains('hidden')) {
      DOM.orderFormModal.classList.add('hidden');
    }
  });

  // клик по оверлею
  DOM.orderFormModal.addEventListener('click', (e) => {
    if (e.target === DOM.orderFormModal) {
      DOM.orderFormModal.classList.add('hidden');
    }
  });
}

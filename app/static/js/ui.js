// static/js/ui.js

export function bindUploadInput(DOM, state, addToCanvas) {
  DOM.uploadInput.addEventListener('change', (e) => {
    const files = [...e.target.files];

    files.forEach((file) => {
      const reader = new FileReader();

      reader.onload = (ev) => {
        const fileId = Date.now() + Math.random().toString(16).slice(2);
        state.uploadedFiles.push({ fileId, file });

        const wrapper = document.createElement('div');
        wrapper.className = 'relative aspect-square rounded-xl overflow-hidden shadow-md';
        wrapper.dataset.fileId = fileId;

        const img = document.createElement('img');
        img.src = ev.target.result;
        img.className = 'w-full h-full object-cover cursor-pointer';
        img.onclick = () => addToCanvas(ev.target.result);

        const del = document.createElement('button');
        del.className =
          'absolute top-1 right-1 bg-red-500 text-white w-7 h-7 rounded-full flex items-center justify-center shadow';
        del.innerHTML = '×';
        del.onclick = (ev2) => {
          ev2.stopPropagation();
          wrapper.remove();
          state.uploadedFiles = state.uploadedFiles.filter((f) => f.fileId !== fileId);
        };

        wrapper.append(img, del);
        DOM.thumbnails.appendChild(wrapper);
      };

      reader.readAsDataURL(file);
    });

    e.target.value = '';
  });
}

export function showToast(DOM, msg, type = 'success') {
  const toast = DOM.toast;
  toast.textContent = msg;
  toast.classList.remove('border-green-500', 'border-red-500');
  toast.classList.add(type === 'error' ? 'border-red-500' : 'border-green-500');
  toast.classList.remove('opacity-0');

  setTimeout(() => {
    toast.classList.add('opacity-0');
  }, 4000);
}

export function populateFontSelector(DOM) {
  const fonts = ['Poppins, sans-serif', 'Inter, sans-serif', 'Roboto Slab, serif', 'Arial, sans-serif'];

  fonts.forEach((f) => {
    const opt = document.createElement('option');
    opt.value = f;
    opt.textContent = f.split(',')[0];
    DOM.fontSelector.appendChild(opt);
  });
}

// static/js/theme.js
(() => {
  const html = document.documentElement;
  const btn = document.getElementById('theme-toggle');
  const icon = document.getElementById('theme-icon');

  const applyIcon = () => {
    if (!icon) return;
    const isDark = html.classList.contains('dark');
    icon.classList.toggle('fa-moon', !isDark);
    icon.classList.toggle('fa-sun', isDark);
  };

  // Инициализация иконки (сам класс dark выставляется ранним скриптом в <head>)
  applyIcon();

  if (!btn) return;

  btn.addEventListener('click', () => {
    const isDark = html.classList.toggle('dark');

    try {
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
    } catch (e) {}

    applyIcon();

    // ✅ событие — ТОЛЬКО здесь
    window.dispatchEvent(new CustomEvent('theme:changed', { detail: { isDark } }));
  });
})();

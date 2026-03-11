/**
 * Dark Mode Toggle
 * Uses a single icon button (#themeToggle) — moon = go dark, sun = go light
 */

function updateToggleIcon(isDark) {
  const toggle = document.getElementById('themeToggle');
  if (!toggle) return;
  const icon = toggle.querySelector('i');
  if (icon) {
    icon.className = isDark ? 'fa fa-sun-o' : 'fa fa-moon-o';
  }
  toggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
}

function initDarkMode() {
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = savedTheme === 'dark' || (!savedTheme && prefersDark);

  if (isDark) {
    document.documentElement.classList.add('dark-mode');
  } else {
    document.documentElement.classList.remove('dark-mode');
  }

  updateToggleIcon(isDark);
}

function toggleDarkMode() {
  const isDark = document.documentElement.classList.contains('dark-mode');
  if (isDark) {
    document.documentElement.classList.remove('dark-mode');
    localStorage.setItem('theme', 'light');
  } else {
    document.documentElement.classList.add('dark-mode');
    localStorage.setItem('theme', 'dark');
  }
  updateToggleIcon(!isDark);
}

function attachToggle() {
  const toggle = document.getElementById('themeToggle');
  if (toggle) {
    toggle.addEventListener('click', toggleDarkMode);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    initDarkMode();
    attachToggle();
  });
} else {
  initDarkMode();
  attachToggle();
}

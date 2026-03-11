/**
 * Dark Mode Toggle
 * Handles dark mode switching and persistence
 */

// Initialize dark mode on page load
function initDarkMode() {
  // Check for saved theme preference or default to light mode
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  // Use saved theme, or system preference, or default to light
  const isDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
  
  // Apply theme
  if (isDark) {
    document.documentElement.classList.add('dark-mode');
    const toggle = document.getElementById('darkModeSwitch');
    if (toggle) {
      toggle.checked = true;
    }
  } else {
    document.documentElement.classList.remove('dark-mode');
    const toggle = document.getElementById('darkModeSwitch');
    if (toggle) {
      toggle.checked = false;
    }
  }
}

// Toggle dark mode
function toggleDarkMode() {
  const isDark = document.documentElement.classList.contains('dark-mode');
  
  if (isDark) {
    document.documentElement.classList.remove('dark-mode');
    localStorage.setItem('theme', 'light');
  } else {
    document.documentElement.classList.add('dark-mode');
    localStorage.setItem('theme', 'dark');
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    initDarkMode();
    
    // Add event listener to toggle switch
    const toggle = document.getElementById('darkModeSwitch');
    if (toggle) {
      toggle.addEventListener('change', toggleDarkMode);
    }
  });
} else {
  // DOM is already ready
  initDarkMode();
  
  // Add event listener to toggle switch
  const toggle = document.getElementById('darkModeSwitch');
  if (toggle) {
    toggle.addEventListener('change', toggleDarkMode);
  }
}


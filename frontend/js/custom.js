/**
 * Custom JavaScript for menu toggle and other interactions
 */

(function() {
  'use strict';

  // Mobile Menu Toggle
  function initMobileMenu() {
    const hamburger = document.querySelector('.hamburger.menu_mm');
    const menu = document.querySelector('.menu.menu_mm');
    const menuClose = document.querySelector('.menu_close_container');
    const menuCloseBtn = document.querySelector('.menu_close');

    if (!hamburger || !menu) {
      return;
    }

    // Open menu when hamburger is clicked
    hamburger.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      menu.classList.add('active');
      // Prevent body scroll when menu is open
      document.body.style.overflow = 'hidden';
    });

    // Close menu when close button is clicked
    if (menuClose) {
      menuClose.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        menu.classList.remove('active');
        document.body.style.overflow = '';
      });
    }

    if (menuCloseBtn) {
      menuCloseBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        menu.classList.remove('active');
        document.body.style.overflow = '';
      });
    }

    // Close menu when clicking outside
    document.addEventListener('click', function(e) {
      if (menu && menu.classList.contains('active')) {
        // Check if click is outside menu and hamburger
        if (!menu.contains(e.target) && !hamburger.contains(e.target)) {
          menu.classList.remove('active');
          document.body.style.overflow = '';
        }
      }
    });

    // Close menu on escape key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && menu && menu.classList.contains('active')) {
        menu.classList.remove('active');
        document.body.style.overflow = '';
      }
    });
  }

  // Search Panel Toggle + Submit
  function initSearchPanel() {
    const searchButton = document.querySelector('.search_button');
    const searchPanel = document.querySelector('.header_search_container');

    if (!searchButton || !searchPanel) {
      return;
    }

    // On the search results page, hide the nav search icon since the page has its own bar
    if (window.location.pathname === '/search') {
      if (searchButton) searchButton.style.display = 'none';
      searchPanel.classList.remove('active');
      return;
    }

    searchButton.addEventListener('click', function(e) {
      e.preventDefault();
      searchPanel.classList.toggle('active');
      
      if (searchPanel.classList.contains('active')) {
        const searchInput = searchPanel.querySelector('.search_input');
        if (searchInput) {
          setTimeout(function() { searchInput.focus(); }, 100);
        }
      }
    });

    // Close search panel when clicking outside
    document.addEventListener('click', function(e) {
      if (searchPanel && searchPanel.classList.contains('active')) {
        if (!searchPanel.contains(e.target) && !searchButton.contains(e.target)) {
          searchPanel.classList.remove('active');
        }
      }
    });

    // Wire all search forms (header panel + mobile menu) to navigate to /search?q=
    document.querySelectorAll('.header_search_form').forEach(function(form) {
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        var input = form.querySelector('.search_input');
        var q = input ? input.value.trim() : '';
        if (q.length > 0) {
          window.location.href = '/search?q=' + encodeURIComponent(q);
        } else {
          if (input) input.focus();
        }
      });
    });

    // Also allow pressing Enter in any search input that might not be in a form
    document.querySelectorAll('.search_input').forEach(function(input) {
      input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          var q = input.value.trim();
          if (q.length > 0) {
            window.location.href = '/search?q=' + encodeURIComponent(q);
          }
        }
      });
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      initMobileMenu();
      initSearchPanel();
    });
  } else {
    // DOM is already ready
    initMobileMenu();
    initSearchPanel();
  }

})();

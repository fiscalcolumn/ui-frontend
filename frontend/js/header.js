/**
 * Header Component
 * Uses static site data for header configuration
 * Categories are still fetched from Strapi API as they are dynamic
 */

// Cache configuration for categories only
const HEADER_CACHE_TTL = 1000; // 1 second in milliseconds (for testing - easy cache refresh)
const HEADER_CACHE_KEYS = {
  CATEGORIES: 'fc_categories_data'
};

// Shared categories cache (in-memory)
let categoriesCache = null;
let categoriesPromise = null;

// Get header data from static site data
function getHeaderData() {
  return window.SITE_DATA?.header || {
    logoText: "Fin24x",
    logo: null
  };
}

/**
 * Get cached data from localStorage with TTL check
 * @param {string} key - Cache key
 * @returns {object|null} - Cached data or null if expired/missing
 */
function getCachedData(key) {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    
    const { data, timestamp } = JSON.parse(cached);
    
    // Don't return null or invalid cached data
    if (!data || data === null) {
      localStorage.removeItem(key);
      return null;
    }
    
    const now = Date.now();
    
    // Check if cache is still valid (within TTL)
    if (now - timestamp < HEADER_CACHE_TTL) {
      return data;
    }
    
    // Cache expired, remove it
    localStorage.removeItem(key);
    return null;
  } catch (error) {
    console.error('Error reading cache:', error);
    // Remove corrupted cache
    try {
      localStorage.removeItem(key);
    } catch (e) {
      // Ignore removal errors
    }
    return null;
  }
}

/**
 * Store data in localStorage with timestamp
 * @param {string} key - Cache key
 * @param {object} data - Data to cache
 */
function setCachedData(key, data) {
  try {
    const cacheObject = {
      data: data,
      timestamp: Date.now()
    };
    localStorage.setItem(key, JSON.stringify(cacheObject));
  } catch (error) {
    console.error('Error writing cache:', error);
    // If storage is full, try to clear old cache
    try {
      Object.values(HEADER_CACHE_KEYS).forEach(k => {
        if (k !== key) localStorage.removeItem(k);
      });
      localStorage.setItem(key, JSON.stringify({ data: data, timestamp: Date.now() }));
    } catch (e) {
      console.error('Failed to clear cache:', e);
    }
  }
}

// Export function to get header data (for other scripts) - now returns static data
window.getHeaderData = async function() {
  return getHeaderData();
};

// Fetch categories from Strapi (with localStorage + in-memory caching)
async function fetchCategories() {
  // If already fetching, return the same promise
  if (categoriesPromise) {
    return categoriesPromise;
  }
  
  // Check in-memory cache first
  if (categoriesCache) {
    return categoriesCache;
  }
  
  // Check localStorage cache
  const cachedCategories = getCachedData(HEADER_CACHE_KEYS.CATEGORIES);
  if (cachedCategories) {
    categoriesCache = cachedCategories;
    return categoriesCache;
  }
  
  // Fetch categories
  categoriesPromise = (async () => {
    try {
      const response = await fetch(getApiUrl('/categories?sort=order:asc&filters[enabled][$eq]=true'));
      if (!response.ok) {
        throw new Error(`Failed to fetch categories: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      categoriesCache = data.data || [];
      
      // Only store in localStorage if data is valid (not empty array)
      if (categoriesCache && categoriesCache.length > 0) {
        setCachedData(HEADER_CACHE_KEYS.CATEGORIES, categoriesCache);
      }
      
      categoriesPromise = null; // Clear promise after completion
      return categoriesCache;
    } catch (error) {
      console.error('Error fetching categories:', error);
      categoriesPromise = null; // Clear promise on error
      return [];
    }
  })();
  
  return categoriesPromise;
}

// Render header navigation links with dropdown (using categories)
function renderNavigationLinks(categories, currentPage = '') {
  if (!categories || categories.length === 0) {
    return '<li><a href="/">Home</a></li>';
  }


  // Categories are already filtered and sorted by the API query
  // Show first 5 categories in main nav
  const mainCategories = categories.slice(0, 5);
  // Rest go in dropdown
  const dropdownCategories = categories.slice(5);


  let html = '';
  
  // Render main navigation links (using category name as label and slug as URL)
  mainCategories.forEach(category => {
    const url = `/${category.slug}`;
    const isActive = currentPage === url ? 'class="active"' : '';
    html += `<li ${isActive}><a href="${url}">${category.name || ''}</a></li>`;
  });

  // Render dropdown if there are remaining categories
  if (dropdownCategories.length > 0) {
    html += `<li class="dropdown">
      <a href="#" class="dropdown-toggle">
        More <i class="fa fa-chevron-down" aria-hidden="true"></i>
      </a>
      <ul class="dropdown-menu">
        ${dropdownCategories.map(category => {
          const url = `/${category.slug}`;
          const isActive = currentPage === url ? 'class="active"' : '';
          return `<li ${isActive}><a href="${url}">${category.name || ''}</a></li>`;
        }).join('')}
      </ul>
    </li>`;
  }

  return html;
}

// Render mobile menu navigation links (using categories)
function renderMobileMenuLinks(categories) {
  let html = '<li class="menu_mm"><a href="/">Home</a></li>';
  
  if (categories && categories.length > 0) {
    // Categories are already filtered and sorted by the API query
    // Show all categories in mobile menu
    html += categories.map(category => {
      const url = `/${category.slug}`;
      return `<li class="menu_mm"><a href="${url}">${category.name || ''}</a></li>`;
    }).join('');
  }
  
  return html;
}

// Render logo - shows both image and text side by side
function renderLogo(logoText, logoImage) {
  let logoHTML = '<a href="/" class="d-flex flex-row align-items-center">';
  
  // Add logo image if available
  if (logoImage && logoImage.url) {
    // Use relative path directly (no API URL needed for static assets)
    const imageUrl = logoImage.url.startsWith('http') ? logoImage.url : logoImage.url;
    logoHTML += `<img src="${imageUrl}" alt="${logoImage.alternativeText || logoText || 'Logo'}" class="logo_image" style="max-height: 50px; margin-right: 10px;">`;
  }
  
  // Add logo text if available
  if (logoText) {
    // Split logo text if it contains numbers (e.g., "Fin24x" -> "Fin<span>24x</span>")
    const parts = logoText.split(/(\d+)/);
    if (parts.length > 1) {
      // Combine all parts after the first (number + any text after number)
      const numberAndAfter = parts.slice(1).join('');
      logoHTML += `<div class="logo_text">${parts[0]}<span>${numberAndAfter}</span></div>`;
    } else {
      logoHTML += `<div class="logo_text">${logoText}</div>`;
    }
  } else if (!logoImage || !logoImage.url) {
    // Fallback if neither image nor text is available
    logoHTML += '<div class="logo_text">Fin<span>24x</span></div>';
  }
  
  logoHTML += '</a>';
  return logoHTML;
}

// Normalize URL for comparison
function normalizeUrl(url) {
  if (!url) return '/';
  // Remove trailing slash except for root
  url = url.trim();
  if (url === '' || url === '/') return '/';
  // Ensure it starts with /
  if (!url.startsWith('/')) url = '/' + url;
  // Remove trailing slash
  if (url.length > 1 && url.endsWith('/')) {
    url = url.slice(0, -1);
  }
  return url;
}

// Update active state in navigation without re-rendering
function updateActiveNavLink(currentPage) {
  const headerContainer = document.querySelector('.header');
  if (!headerContainer) return;
  
  const normalizedCurrentPage = normalizeUrl(currentPage);
  
  const mainNav = headerContainer.querySelector('.main_nav');
  if (!mainNav) return;
  
  // Remove active class from all links
  const allLinks = mainNav.querySelectorAll('li');
  allLinks.forEach(li => {
    li.classList.remove('active');
    const link = li.querySelector('a');
    if (link) {
      const href = normalizeUrl(link.getAttribute('href'));
      // Check if current page matches this link
      if (href === normalizedCurrentPage) {
        li.classList.add('active');
      }
    }
  });
  
  // Also update dropdown links
  const dropdownLinks = mainNav.querySelectorAll('.dropdown-menu li');
  dropdownLinks.forEach(li => {
    li.classList.remove('active');
    const link = li.querySelector('a');
    if (link) {
      const href = normalizeUrl(link.getAttribute('href'));
      if (href === normalizedCurrentPage) {
        li.classList.add('active');
      }
    }
  });
}

// Render header component
async function renderHeader(currentPage = '') {
  const headerContainer = document.querySelector('.header');
  if (!headerContainer) {
    console.error('Header container not found');
    return;
  }

  // Get header data from static site data
  const headerData = getHeaderData();
  
  // Fetch categories separately (still from API as they are dynamic)
  const categories = await fetchCategories();

  // Get containers
  const logoContainer = headerContainer.querySelector('.logo_container');
  const mainNav = headerContainer.querySelector('.main_nav');
  const mobileMenuNav = document.querySelector('.menu_nav ul.menu_mm');

  // Render logo
  if (logoContainer && headerData) {
    logoContainer.innerHTML = renderLogo(headerData.logoText, headerData.logo);
  }

  // Render main navigation
  if (mainNav) {
    mainNav.innerHTML = renderNavigationLinks(categories, currentPage);
  }

  // Render mobile menu navigation
  if (mobileMenuNav) {
    mobileMenuNav.innerHTML = renderMobileMenuLinks(categories);
  }

  // Handle dropdown toggle (click and hover) - use setTimeout to ensure DOM is ready
  setTimeout(function() {
    const dropdownToggle = headerContainer.querySelector('.dropdown-toggle');
    const dropdown = headerContainer.querySelector('.dropdown');
    const dropdownMenu = dropdown ? dropdown.querySelector('.dropdown-menu') : null;
    
    if (dropdownToggle && dropdownMenu) {
      // Prevent navigation on click
      dropdownToggle.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const dropdown = dropdownToggle.closest('.dropdown');
        const dropdownMenu = dropdown ? dropdown.querySelector('.dropdown-menu') : null;
        
        // Toggle dropdown on click
        const isOpen = dropdown.classList.contains('active') || (dropdownMenu && dropdownMenu.classList.contains('active'));
        if (isOpen) {
          dropdown.classList.remove('active');
          if (dropdownMenu) {
            dropdownMenu.style.display = 'none';
            dropdownMenu.classList.remove('active');
          }
          dropdownToggle.classList.remove('active');
        } else {
          dropdown.classList.add('active');
          if (dropdownMenu) {
            dropdownMenu.style.display = 'block';
            dropdownMenu.classList.add('active');
          }
          dropdownToggle.classList.add('active');
        }
      });

      // Close dropdown when clicking outside
      document.addEventListener('click', function(e) {
        if (dropdown && !dropdown.contains(e.target)) {
          dropdown.classList.remove('active');
          const menu = dropdown.querySelector('.dropdown-menu');
          if (menu) {
            menu.style.display = 'none';
            menu.classList.remove('active');
          }
          const toggle = dropdown.querySelector('.dropdown-toggle');
          if (toggle) {
            toggle.classList.remove('active');
          }
        }
      });
    }
  }, 100);
}

// Initialize header when DOM is ready
function initHeader() {
  // Get current page from URL path
  const path = window.location.pathname;
  const currentPage = normalizeUrl(path);
  
  renderHeader(currentPage);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initHeader);
} else {
  // DOM is already ready
  initHeader();
}


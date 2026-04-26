/**
 * Header Component
 * Uses static site data for header configuration
 * Categories are still fetched from Strapi API as they are dynamic
 */

const HEADER_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const HEADER_CACHE_KEYS = {
  CATEGORIES: 'fc_categories_data',
  CONFIG:     'fc_header_config'
};

const DEFAULT_CATEGORY_COUNT = 6;

let categoriesCache = null;
let categoriesPromise = null;
let headerConfigCache = null;
let headerConfigPromise = null;

function _getHeaderData() {
  return window.SITE_DATA?.header || {
    logoText: "FiscalColumn",
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
    
    if (!data || data === null) {
      localStorage.removeItem(key);
      return null;
    }
    
    const now = Date.now();
    
    if (now - timestamp < HEADER_CACHE_TTL) {
      return data;
    }
    
    localStorage.removeItem(key);
    return null;
  } catch (error) {
    console.error('Error reading cache:', error);
    try {
      localStorage.removeItem(key);
    } catch (e) {
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

window.getHeaderData = async function() {
  return _getHeaderData();
};

// Fetch categories from Strapi (with localStorage + in-memory caching)
async function fetchCategories() {
  if (categoriesPromise) {
    return categoriesPromise;
  }
  
  if (categoriesCache) {
    return categoriesCache;
  }
  
  const cachedCategories = getCachedData(HEADER_CACHE_KEYS.CATEGORIES);
  if (cachedCategories) {
    categoriesCache = cachedCategories.filter(c => c.enabled !== false);
    return categoriesCache;
  }
  
  categoriesPromise = (async () => {
    try {
      const response = await fetch(getApiUrl('/categories?sort=order:asc&filters[enabled][$eq]=true'));
      if (!response.ok) {
        throw new Error(`Failed to fetch categories: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      categoriesCache = (data.data || []).filter(c => c.enabled !== false);
      
      if (categoriesCache && categoriesCache.length > 0) {
        setCachedData(HEADER_CACHE_KEYS.CATEGORIES, categoriesCache);
      }
      
      categoriesPromise = null;
      return categoriesCache;
    } catch (error) {
      console.error('Error fetching categories:', error);
      categoriesPromise = null;
      return [];
    }
  })();
  
  return categoriesPromise;
}

// Fetch header config from Strapi: categorycount + headerbrandbar pills
async function fetchHeaderConfig() {
  if (headerConfigPromise) return headerConfigPromise;
  if (headerConfigCache)   return headerConfigCache;

  const cached = getCachedData(HEADER_CACHE_KEYS.CONFIG);
  if (cached) {
    headerConfigCache = cached;
    return headerConfigCache;
  }

  headerConfigPromise = (async () => {
    try {
      const response = await fetch(getApiUrl('/header?populate[brandbar]=true'));
      if (!response.ok) throw new Error(`Header config fetch failed: ${response.status}`);
      const json = await response.json();
      const d = json.data || {};
      headerConfigCache = {
        logoText: d.logoText || null,
        categoryCount: typeof d.categorycount === 'number' ? d.categorycount : DEFAULT_CATEGORY_COUNT,
        pills: Array.isArray(d.brandbar)
          ? d.brandbar
              .filter(p => p.displayname && p.brandurl)
              .sort((a, b) => (parseInt(a.order) || 0) - (parseInt(b.order) || 0))
          : []
      };
      setCachedData(HEADER_CACHE_KEYS.CONFIG, headerConfigCache);
    } catch (err) {
      console.error('Error fetching header config:', err);
      headerConfigCache = { logoText: null, categoryCount: DEFAULT_CATEGORY_COUNT, pills: [] };
    }
    headerConfigPromise = null;
    return headerConfigCache;
  })();

  return headerConfigPromise;
}

// Render header navigation links with dropdown (using categories)
function renderNavigationLinks(categories, currentPage = '', categoryCount = DEFAULT_CATEGORY_COUNT) {
  if (!categories || categories.length === 0) {
    return '<li><a href="/">Home</a></li>';
  }

  const mainCategories = categories.slice(0, categoryCount);
  const dropdownCategories = categories.slice(categoryCount);

  let html = '';
  mainCategories.forEach(category => {
    const url = `/${category.slug}`;
    const isActive = currentPage === url ? 'class="active"' : '';
    html += `<li ${isActive}><a href="${url}">${category.name || ''}</a></li>`;
  });

  if (dropdownCategories.length > 0) {
    html += `<li class="dropdown">
      <a href="#" class="dropdown-toggle">
        <i class="fa fa-bars" aria-hidden="true"></i>
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

// Render logo — FC badge mark + editorial stacked wordmark
function renderLogo(logoText, logoImage) {
  // If a custom image logo is explicitly set by CMS, honour it
  if (logoImage && logoImage.url) {
    return `
      <a href="/" class="d-flex flex-row align-items-center">
        <img src="${logoImage.url}" alt="${logoImage.alternativeText || logoText || 'Logo'}" class="logo_image">
        ${logoText ? `<div class="logo_text">${logoText}</div>` : ''}
      </a>`;
  }

  const name = (logoText || 'Fiscal Column').replace(/^the\s+/i, '').trim();
  return `
    <a href="/" class="logo-masthead" aria-label="The Fiscal Column — Home">
      <span class="logo-badge" aria-hidden="true">FC</span>
      <span class="logo-wordmark">
        <span class="logo-eyebrow">The</span>
        <span class="logo-name">${name}</span>
      </span>
    </a>`;
}

// Normalize URL for comparison
function normalizeUrl(url) {
  if (!url) return '/';
  url = url.trim();
  if (url === '' || url === '/') return '/';
  if (!url.startsWith('/')) url = '/' + url;
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
  
  const allLinks = mainNav.querySelectorAll('li');
  allLinks.forEach(li => {
    li.classList.remove('active');
    const link = li.querySelector('a');
    if (link) {
      const href = normalizeUrl(link.getAttribute('href'));
          if (href === normalizedCurrentPage) {
        li.classList.add('active');
      }
    }
  });
  
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

  const headerData = _getHeaderData();

  // Fetch config and categories in parallel
  const [headerConfig, categories] = await Promise.all([
    fetchHeaderConfig(),
    fetchCategories()
  ]);

  const logoContainer     = headerContainer.querySelector('.logo_container');
  const mainNav           = headerContainer.querySelector('.main_nav');
  const brandPillsEl      = headerContainer.querySelector('.brand-rate-btns');
  const mobileMenuNav     = document.querySelector('.menu_nav ul.menu_mm');

  if (logoContainer) {
    const logoText = headerConfig.logoText || headerData.logoText;
    logoContainer.innerHTML = renderLogo(logoText, headerData.logo);
  }

  if (mainNav) {
    mainNav.innerHTML = renderNavigationLinks(categories, currentPage, headerConfig.categoryCount);
  }

  if (brandPillsEl) {
    brandPillsEl.innerHTML = headerConfig.pills
      .map(p => {
        const url  = p.brandurl.startsWith('/') ? p.brandurl : '/' + p.brandurl;
        const name = (p.displayname || '').toLowerCase();
        const icon = name.includes('gold')       ? 'fa-sun-o'
                   : name.includes('silver')     ? 'fa-moon-o'
                   : name.includes('calc')       ? 'fa-calculator'
                   : name.includes('rate')       ? 'fa-line-chart'
                   : name.includes('news')       ? 'fa-newspaper-o'
                   : name.includes('market')     ? 'fa-bar-chart'
                   :                              'fa-link';
        const iconColor = p.brandcolor ? ` style="color:${p.brandcolor}"` : '';
        return `<a href="${url}" class="brand-rate-btn">
          <i class="fa ${icon} brand-rate-icon"${iconColor} aria-hidden="true"></i>${p.displayname}
        </a>`;
      })
      .join('');
  }

  if (mobileMenuNav) {
    mobileMenuNav.innerHTML = renderMobileMenuLinks(categories);
  }

  setTimeout(function() {
    const dropdownToggle = headerContainer.querySelector('.dropdown-toggle');
    const dropdown = headerContainer.querySelector('.dropdown');
    const dropdownMenu = dropdown ? dropdown.querySelector('.dropdown-menu') : null;
    
    if (dropdownToggle && dropdownMenu) {
      dropdownToggle.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const dropdown = dropdownToggle.closest('.dropdown');
        const dropdownMenu = dropdown ? dropdown.querySelector('.dropdown-menu') : null;
        
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

function initHeader() {
  const path = window.location.pathname;
  const currentPage = normalizeUrl(path);
  
  renderHeader(currentPage);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initHeader);
} else {
  initHeader();
}


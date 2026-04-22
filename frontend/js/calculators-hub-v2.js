/**
 * Calculators Hub V2 — Hybrid Professional Design
 * Enhanced with Bento Grid, Clean List, and Stats
 */

const TRENDING_SLUGS = [
  'sip-calculator',
  'emi-calculator',
  'income-tax-calculator',
  'ppf-calculator',
  'gst-calculator',
  'hra-calculator',
];

const POPULAR_QUICK_LINKS = [
  { label: 'SIP', slug: 'sip-calculator', icon: 'fa-line-chart' },
  { label: 'EMI', slug: 'emi-calculator', icon: 'fa-calculator' },
  { label: 'Income Tax', slug: 'income-tax-calculator', icon: 'fa-file-text-o' },
  { label: 'PPF', slug: 'ppf-calculator', icon: 'fa-bank' },
  { label: 'GST', slug: 'gst-calculator', icon: 'fa-percent' },
];

class CalculatorsHubV2 {
  constructor() {
    this.allCalculators = [];
    this.allCategories = [];
    this.activeCategory = 'all';
  }

  async init() {
    this.updatePageMeta();
    await this.loadData();
    this.renderQuickLinks();
    this.renderCategoryPills();
    this.renderFeaturedBento();
    this.renderCategoryList();
    this.initSearch();
    this.initFilters();
    this.updateStats();
  }

  updatePageMeta() {
    const siteUrl = window.ENV?.SITE_URL || window.location.origin;
    const canonicalUrl = `${siteUrl}/calculator`;

    const el = document.getElementById('canonical-url');
    if (el) el.setAttribute('href', canonicalUrl);

    const ogUrl = document.getElementById('og-url');
    if (ogUrl) ogUrl.setAttribute('content', canonicalUrl);

    const schema = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "Free Financial Calculators for India",
      "description": "Free online calculators for India — SIP, EMI, PPF, Income Tax, GST, HRA and 36+ more.",
      "url": canonicalUrl,
      "breadcrumb": {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": siteUrl },
          { "@type": "ListItem", "position": 2, "name": "Calculators", "item": canonicalUrl }
        ]
      }
    };

    const schemaEl = document.getElementById('schema-main');
    if (schemaEl) schemaEl.textContent = JSON.stringify(schema);
  }

  async loadData() {
    try {
      const [calcsRes, catsRes] = await Promise.all([
        fetch(getApiUrl('/calculators?filters[enableCalculator][$ne]=false&populate[calculatorcategory]=true&pagination[pageSize]=100&sort=order:asc&status=published')),
        fetch(getApiUrl('/calculator-category-types?pagination[pageSize]=50&sort=order:asc&status=published')),
      ]);

      const calcsData = await calcsRes.json();
      const catsData = await catsRes.json();

      this.allCalculators = calcsData.data || [];
      this.allCategories = catsData.data || [];

      console.log(`[Hub V2] Loaded ${this.allCalculators.length} calculators, ${this.allCategories.length} categories`);
    } catch (err) {
      console.error('Failed to load calculator data:', err);
      this.allCalculators = [];
      this.allCategories = [];
    }
  }

  renderQuickLinks() {
    const container = document.getElementById('ch-quick-links');
    if (!container) return;

    const linksHtml = POPULAR_QUICK_LINKS.map(link => `
      <a href="/calculator/${link.slug}" class="ch-quick-link">
        <i class="fa ${link.icon}"></i>
        ${link.label}
      </a>
    `).join('');

    container.innerHTML = `
      <span class="ch-quick-label">Popular:</span>
      ${linksHtml}
    `;
  }

  renderCategoryPills() {
    const container = document.getElementById('ch-category-pills');
    if (!container) return;

    const pills = this.allCategories.map(cat => {
      const catInfo = this.getCategoryInfo(cat.calculatorcategory);
      return `
        <button class="ch-pill" data-category="${cat.documentId}">
          <i class="fa ${catInfo.icon}"></i>
          <span>${this.formatCatName(cat.calculatorcategory)}</span>
        </button>
      `;
    }).join('');

    container.innerHTML = `
      <button class="ch-pill active" data-category="all">
        <i class="fa fa-th"></i>
        <span>All Calculators</span>
      </button>
      ${pills}
    `;
  }

  renderFeaturedBento() {
    const container = document.getElementById('ch-bento-grid');
    if (!container) return;

    // Get trending calculators
    let trending = TRENDING_SLUGS
      .map(slug => this.allCalculators.find(c => c.slug === slug))
      .filter(Boolean);

    if (trending.length === 0) {
      trending = this.allCalculators.slice(0, 6);
    } else {
      trending = trending.slice(0, 6);
    }

    if (trending.length === 0) {
      container.innerHTML = this.emptyStateHtml('No calculators found', 'Check back soon');
      return;
    }

    const html = trending.map((calc, idx) => {
      const isFeatured = idx < 2; // First 2 are featured (larger)
      const color = calc.iconColor || this.getCategoryInfo(calc.calculatorcategory?.calculatorcategory).color;
      const icon = calc.icon || 'fa-calculator';

      return `
        <a href="/calculator/${calc.slug}"
           class="ch-bento-card ${isFeatured ? 'featured' : ''}"
           style="--card-color: ${color}; --icon-bg: ${color}15; --icon-color: ${color}">
          <div>
            <div class="ch-bento-card-header">
              <div class="ch-bento-icon">
                <i class="fa ${icon}"></i>
              </div>
              <div>
                <h3 class="ch-bento-title">${calc.title}</h3>
              </div>
            </div>
            ${calc.excerpt ? `<p class="ch-bento-desc">${calc.excerpt}</p>` : ''}
          </div>
          <div class="ch-bento-footer">
            <span class="ch-bento-badge">
              <i class="fa fa-fire" style="color: ${color}"></i>
              Trending
            </span>
            <div class="ch-bento-arrow">
              <i class="fa fa-arrow-right"></i>
            </div>
          </div>
        </a>
      `;
    }).join('');

    container.innerHTML = html;
  }

  renderCategoryList() {
    const container = document.getElementById('ch-categories-container');
    if (!container) return;

    if (this.allCalculators.length === 0) {
      container.innerHTML = this.emptyStateHtml('No calculators found', 'Check back soon — we are adding more calculators.');
      return;
    }

    // Group calculators by category
    const groups = {};
    const uncategorized = [];

    this.allCalculators.forEach(calc => {
      const cat = calc.calculatorcategory;
      if (cat && cat.documentId) {
        if (!groups[cat.documentId]) {
          groups[cat.documentId] = { meta: cat, calcs: [] };
        }
        groups[cat.documentId].calcs.push(calc);
      } else {
        uncategorized.push(calc);
      }
    });

    // Sort by category order
    const sortedCatIds = this.allCategories.map(c => c.documentId);
    const orderedGroups = sortedCatIds.map(id => groups[id]).filter(Boolean);

    if (uncategorized.length > 0) {
      orderedGroups.push({
        meta: { calculatorcategory: 'Other', documentId: 'other' },
        calcs: uncategorized
      });
    }

    const html = orderedGroups.map(group => {
      const catDocId = group.meta.documentId;
      const catName = this.formatCatName(group.meta.calculatorcategory);
      const catInfo = this.getCategoryInfo(group.meta.calculatorcategory);

      const calcsHtml = group.calcs.map(calc => this.renderCalcItem(calc)).join('');

      return `
        <div class="ch-category-section" data-cat-id="${catDocId}">
          <div class="ch-category-header">
            <div class="ch-category-icon" style="background: ${catInfo.color}15; color: ${catInfo.color}">
              <i class="fa ${catInfo.icon}"></i>
            </div>
            <h2 class="ch-category-name">${catName}</h2>
            <span class="ch-category-count">${group.calcs.length}</span>
          </div>
          <div class="ch-calc-list">
            ${calcsHtml}
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = html;
  }

  renderCalcItem(calc) {
    const color = calc.iconColor || this.getCategoryInfo(calc.calculatorcategory?.calculatorcategory).color;
    const icon = calc.icon || 'fa-calculator';

    return `
      <a href="/calculator/${calc.slug}"
         class="ch-calc-item"
         style="--card-color: ${color}; --icon-bg: ${color}15; --icon-color: ${color}">
        <div class="ch-calc-icon">
          <i class="fa ${icon}"></i>
        </div>
        <div class="ch-calc-content">
          <h3 class="ch-calc-name">${calc.title}</h3>
          ${calc.excerpt ? `<p class="ch-calc-desc">${calc.excerpt}</p>` : ''}
        </div>
        <div class="ch-calc-arrow">
          <i class="fa fa-arrow-right"></i>
        </div>
      </a>
    `;
  }

  initSearch() {
    const input = document.getElementById('ch-search-input');
    const dropdown = document.getElementById('ch-search-dropdown');
    if (!input || !dropdown) return;

    // Search on input
    input.addEventListener('input', () => {
      const query = input.value.trim().toLowerCase();

      if (!query) {
        dropdown.classList.remove('open');
        return;
      }

      const matches = this.allCalculators.filter(c =>
        c.title.toLowerCase().includes(query) ||
        (c.excerpt || '').toLowerCase().includes(query) ||
        (c.slug || '').toLowerCase().includes(query)
      ).slice(0, 8);

      if (matches.length === 0) {
        dropdown.innerHTML = `
          <div class="ch-search-no-results">
            <i class="fa fa-search"></i>
            <br>
            No calculators found for "${query}"
          </div>
        `;
      } else {
        dropdown.innerHTML = matches.map(c => {
          const color = c.iconColor || this.getCategoryInfo(c.calculatorcategory?.calculatorcategory).color;
          const icon = c.icon || 'fa-calculator';
          const catName = c.calculatorcategory ? this.formatCatName(c.calculatorcategory.calculatorcategory) : '';

          return `
            <a href="/calculator/${c.slug}" class="ch-search-result">
              <div class="ch-search-result-icon" style="background: ${color}15; color: ${color}">
                <i class="fa ${icon}"></i>
              </div>
              <div class="ch-search-result-info">
                <div class="ch-search-result-name">${c.title}</div>
                ${catName ? `<div class="ch-search-result-cat">${catName}</div>` : ''}
              </div>
              <i class="fa fa-chevron-right" style="color: var(--ch-text-tertiary); font-size: 12px"></i>
            </a>
          `;
        }).join('');
      }

      dropdown.classList.add('open');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.ch-search-box')) {
        dropdown.classList.remove('open');
      }
    });

    // Close on Escape
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        dropdown.classList.remove('open');
        input.blur();
      }
    });

    // ⌘K / Ctrl+K shortcut
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        input.focus();
        input.select();
      }
    });
  }

  initFilters() {
    const pillsContainer = document.getElementById('ch-category-pills');
    if (!pillsContainer) return;

    pillsContainer.addEventListener('click', (e) => {
      const pill = e.target.closest('.ch-pill');
      if (!pill) return;

      // Update active state
      pillsContainer.querySelectorAll('.ch-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');

      // Apply filter
      const catId = pill.dataset.category;
      this.activeCategory = catId;
      this.applyFilter(catId);

      // Scroll to top of content
      const main = document.querySelector('.ch-main');
      if (main) {
        main.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  applyFilter(catId) {
    const featuredSection = document.getElementById('ch-featured-section');
    const categorySections = document.querySelectorAll('.ch-category-section');

    if (catId === 'all') {
      // Show all
      if (featuredSection) featuredSection.style.display = '';
      categorySections.forEach(section => {
        section.classList.remove('hidden');
      });
    } else {
      // Hide featured, show only selected category
      if (featuredSection) featuredSection.style.display = 'none';
      categorySections.forEach(section => {
        if (section.dataset.catId === catId) {
          section.classList.remove('hidden');
        } else {
          section.classList.add('hidden');
        }
      });
    }
  }

  updateStats() {
    const statEl = document.getElementById('ch-stat-calculators');
    if (statEl && this.allCalculators.length > 0) {
      statEl.textContent = `${this.allCalculators.length}+`;
    }
  }

  getCategoryInfo(name) {
    const n = (name || '').toLowerCase();

    if (n.includes('loan') || n.includes('finance') || n.includes('credit')) {
      return { icon: 'fa-bank', color: '#3B82F6' };
    }
    if (n.includes('investment') || n.includes('saving')) {
      return { icon: 'fa-line-chart', color: '#10B981' };
    }
    if (n.includes('tax') || n.includes('government') || n.includes('scheme')) {
      return { icon: 'fa-file-text-o', color: '#F59E0B' };
    }
    if (n.includes('health') || n.includes('fitness')) {
      return { icon: 'fa-heartbeat', color: '#EF4444' };
    }
    if (n.includes('retirement')) {
      return { icon: 'fa-calendar-check-o', color: '#8B5CF6' };
    }
    if (n.includes('home') || n.includes('property') || n.includes('real')) {
      return { icon: 'fa-home', color: '#F97316' };
    }
    if (n.includes('salary') || n.includes('business') || n.includes('work')) {
      return { icon: 'fa-briefcase', color: '#6366F1' };
    }
    if (n.includes('education') || n.includes('student')) {
      return { icon: 'fa-graduation-cap', color: '#14B8A6' };
    }

    return { icon: 'fa-calculator', color: '#0066FF' };
  }

  formatCatName(name) {
    if (!name) return 'Other';
    return name.replace(/\b\w/g, l => l.toUpperCase());
  }

  emptyStateHtml(title, description) {
    return `
      <div class="ch-empty-state">
        <div class="ch-empty-icon">
          <i class="fa fa-calculator"></i>
        </div>
        <h3 class="ch-empty-title">${title}</h3>
        <p class="ch-empty-desc">${description}</p>
      </div>
    `;
  }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  const hub = new CalculatorsHubV2();
  hub.init();
});

/**
 * Calculators Hub Page
 * Fetches all calculators + categories from Strapi and renders the hub page.
 */

const TRENDING_SLUGS = [
  'sip-calculator',
  'emi-calculator',
  'income-tax-calculator',
  'ppf-calculator',
  'gst-calculator',
  'hra-calculator',
  'fd-calculator',
  'sukanya-samriddhi-calculator',
];

const POPULAR_SEARCH_TAGS = [
  { label: 'SIP', slug: 'sip-calculator' },
  { label: 'EMI', slug: 'emi-calculator' },
  { label: 'GST', slug: 'gst-calculator' },
  { label: 'Income Tax', slug: 'income-tax-calculator' },
  { label: 'PPF', slug: 'ppf-calculator' },
  { label: 'HRA', slug: 'hra-calculator' },
  { label: 'BMI', slug: 'bmi-calculator' },
];

class CalculatorsHub {
  constructor() {
    this.allCalculators = [];
    this.allCategories = [];
    this.activeCategory = 'all';
  }

  async init() {
    this.updatePageMeta();
    await this.loadData();
    this.renderPopularTags();
    this.renderCategoryFilter();
    this.renderTrending();
    this.renderAllByCategory();
    this.initSearch();
    this.initCategoryFilter();
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
      "description": "Free online calculators for India — SIP, EMI, PPF, Income Tax, GST, HRA and 30+ more.",
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
      console.log(`[Hub] Loaded ${this.allCalculators.length} calculators, ${this.allCategories.length} categories`);
    } catch (err) {
      console.error('Failed to load calculator data:', err);
      this.allCalculators = [];
      this.allCategories = [];
    }
  }

  renderPopularTags() {
    const container = document.getElementById('ch-popular-tags');
    if (!container) return;
    const tagsHtml = POPULAR_SEARCH_TAGS.map(t =>
      `<a href="/calculator/${t.slug}" class="ch-popular-tag">${t.label}</a>`
    ).join('');
    container.innerHTML = `<span class="ch-tag-label">Popular:</span> ${tagsHtml}`;
  }

  renderCategoryFilter() {
    const container = document.getElementById('ch-category-filter');
    if (!container) return;
    const pills = this.allCategories.map(cat =>
      `<button class="ch-filter-pill" data-category="${cat.documentId}">${this.formatCatName(cat.calculatorcategory)}</button>`
    ).join('');
    container.innerHTML = `<button class="ch-filter-pill active" data-category="all">All</button>${pills}`;
  }

  renderTrending() {
    const container = document.getElementById('ch-trending-grid');
    if (!container) return;

    const trending = TRENDING_SLUGS
      .map(slug => this.allCalculators.find(c => c.slug === slug))
      .filter(Boolean);

    if (trending.length === 0) {
      const top8 = this.allCalculators.slice(0, 8);
      this.renderTrendingCards(top8, container);
    } else {
      this.renderTrendingCards(trending, container);
    }
  }

  renderTrendingCards(calcs, container) {
    if (!calcs.length) {
      container.innerHTML = '<p style="color:#888;text-align:center;padding:20px;">No calculators found.</p>';
      return;
    }
    container.innerHTML = calcs.map(calc => {
      const color = calc.iconColor || '#14bdee';
      const icon = calc.icon || 'fa-calculator';
      return `
        <a href="/calculator/${calc.slug}" class="ch-trending-card" style="--card-color: ${color}">
          <div class="ch-trending-card-icon" style="background: ${color}18; color: ${color}">
            <i class="fa ${icon}"></i>
          </div>
          <div class="ch-trending-card-info">
            <div class="ch-trending-card-name">${calc.title}</div>
            <div class="ch-trending-card-desc">${calc.excerpt || 'Calculate now'}</div>
          </div>
          <i class="fa fa-chevron-right ch-trending-card-arrow"></i>
        </a>
      `;
    }).join('');
  }

  renderAllByCategory() {
    const container = document.getElementById('ch-categories-container');
    if (!container) return;

    if (!this.allCalculators.length) {
      container.innerHTML = this.noResultsHtml('No calculators found.', 'Check back soon — we are adding more calculators.');
      return;
    }

    // Group calculators by calculatorcategory
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

    // Sort categories by order from allCategories
    const sortedCatIds = this.allCategories.map(c => c.documentId);
    const orderedGroups = [
      ...sortedCatIds.map(id => groups[id]).filter(Boolean),
    ];
    if (uncategorized.length) {
      orderedGroups.push({ meta: { calculatorcategory: 'Other', documentId: 'other' }, calcs: uncategorized });
    }

    const html = orderedGroups.map(group => {
      const catDocId = group.meta.documentId;
      const catName = this.formatCatName(group.meta.calculatorcategory);
      const catInfo = this.getCategoryInfo(group.meta.calculatorcategory);

      const cardsHtml = group.calcs.map(calc => this.calcCardHtml(calc)).join('');

      return `
        <div class="ch-category-group" data-cat-id="${catDocId}" id="cat-group-${catDocId}">
          <div class="ch-category-group-header">
            <div class="ch-category-group-icon" style="background: ${catInfo.color}18; color: ${catInfo.color}">
              <i class="fa ${catInfo.icon}"></i>
            </div>
            <span class="ch-category-group-name">${catName}</span>
            <span class="ch-category-group-count">${group.calcs.length} calculators</span>
          </div>
          <div class="ch-calc-grid">${cardsHtml}</div>
        </div>
      `;
    }).join('');

    container.innerHTML = html;
  }

  calcCardHtml(calc) {
    const color = calc.iconColor || '#14bdee';
    const icon = calc.icon || 'fa-calculator';
    return `
      <a href="/calculator/${calc.slug}" class="ch-calc-card" style="--card-color: ${color}">
        <div class="ch-calc-card-icon" style="background: ${color}18; color: ${color}">
          <i class="fa ${icon}"></i>
        </div>
        <div class="ch-calc-card-body">
          <div class="ch-calc-card-name">${calc.title}</div>
          ${calc.excerpt ? `<div class="ch-calc-card-desc">${calc.excerpt}</div>` : ''}
        </div>
        <i class="fa fa-chevron-right ch-calc-card-arrow"></i>
      </a>
    `;
  }

  initSearch() {
    const input = document.getElementById('ch-search-input');
    const dropdown = document.getElementById('ch-search-dropdown');
    if (!input || !dropdown) return;

    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      if (!q) { dropdown.classList.remove('open'); return; }

      const matches = this.allCalculators.filter(c =>
        c.title.toLowerCase().includes(q) ||
        (c.excerpt || '').toLowerCase().includes(q) ||
        (c.slug || '').toLowerCase().includes(q)
      ).slice(0, 8);

      if (!matches.length) {
        dropdown.innerHTML = `<div class="ch-search-no-results"><i class="fa fa-search"></i><br>No calculators found for "${q}"</div>`;
      } else {
        dropdown.innerHTML = matches.map(c => {
          const color = c.iconColor || '#14bdee';
          const catName = c.calculatorcategory ? this.formatCatName(c.calculatorcategory.calculatorcategory) : '';
          return `
            <a href="/calculator/${c.slug}" class="ch-search-result">
              <div class="ch-search-result-icon" style="background: ${color}18; color: ${color}">
                <i class="fa ${c.icon || 'fa-calculator'}"></i>
              </div>
              <div class="ch-search-result-info">
                <div class="ch-search-result-name">${c.title}</div>
                ${catName ? `<div class="ch-search-result-cat">${catName}</div>` : ''}
              </div>
              <i class="fa fa-chevron-right" style="color:#ccc;font-size:0.75rem"></i>
            </a>
          `;
        }).join('');
      }
      dropdown.classList.add('open');
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.ch-search-box')) {
        dropdown.classList.remove('open');
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { dropdown.classList.remove('open'); input.blur(); }
    });
  }

  initCategoryFilter() {
    const filterContainer = document.getElementById('ch-category-filter');
    if (!filterContainer) return;

    filterContainer.addEventListener('click', (e) => {
      const pill = e.target.closest('.ch-filter-pill');
      if (!pill) return;

      filterContainer.querySelectorAll('.ch-filter-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');

      const catId = pill.dataset.category;
      this.activeCategory = catId;
      this.applyFilter(catId);
    });
  }

  applyFilter(catId) {
    const groups = document.querySelectorAll('.ch-category-group');
    const trendingSection = document.getElementById('ch-trending-section');

    if (catId === 'all') {
      groups.forEach(g => g.classList.remove('hidden'));
      if (trendingSection) trendingSection.style.display = '';
    } else {
      if (trendingSection) trendingSection.style.display = 'none';
      groups.forEach(g => {
        g.classList.toggle('hidden', g.dataset.catId !== catId);
      });
    }
  }

  getCategoryInfo(name) {
    const n = (name || '').toLowerCase();
    if (n.includes('loan') || n.includes('finance') || n.includes('credit')) return { icon: 'fa-bank', color: '#2196f3' };
    if (n.includes('investment') || n.includes('saving')) return { icon: 'fa-line-chart', color: '#4caf50' };
    if (n.includes('tax') || n.includes('government') || n.includes('scheme')) return { icon: 'fa-file-text-o', color: '#ff9800' };
    if (n.includes('health') || n.includes('fitness')) return { icon: 'fa-heartbeat', color: '#e91e63' };
    if (n.includes('retirement')) return { icon: 'fa-calendar-check-o', color: '#9c27b0' };
    if (n.includes('home') || n.includes('property') || n.includes('real')) return { icon: 'fa-home', color: '#795548' };
    if (n.includes('salary') || n.includes('business') || n.includes('work')) return { icon: 'fa-briefcase', color: '#607d8b' };
    if (n.includes('education') || n.includes('student')) return { icon: 'fa-graduation-cap', color: '#00bcd4' };
    return { icon: 'fa-calculator', color: '#14bdee' };
  }

  formatCatName(name) {
    if (!name) return 'Other';
    return name.replace(/\b\w/g, l => l.toUpperCase());
  }

  formatViews(views) {
    if (views >= 1e6) return (views / 1e6).toFixed(1) + 'M';
    if (views >= 1e3) return (views / 1e3).toFixed(1) + 'K';
    return views.toString();
  }

  noResultsHtml(title, sub) {
    return `<div class="ch-no-results"><i class="fa fa-calculator"></i><h3>${title}</h3><p>${sub}</p></div>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new CalculatorsHub().init();
});

/**
 * Calculator Page Manager
 * Fetches calculator data and loads appropriate calculator logic
 */

class CalculatorPageManager {
  constructor() {
    this.mainContainer = document.getElementById('calculator-main');
    this.belowContainer = document.getElementById('calc-below-sections');
    this.calculator = null;
  }

  async init() {
    const slug = this.getSlugFromUrl();

    if (!slug) {
      this.showError('Calculator not found');
      return;
    }

    try {
      this.calculator = await this.fetchCalculator(slug);

      if (!this.calculator) {
        this.showError('Calculator not found');
        return;
      }

      // Check if calculator is enabled
      if (this.calculator.enableCalculator === false) {
        this.showError('This calculator is currently unavailable');
        return;
      }

      // Increment view count and update the calculator's view count
      const updatedViews = await this.incrementViewCount();
      if (updatedViews !== null) {
        this.calculator.views = updatedViews;
      } else {
        // If increment failed, at least show current views + 1
        this.calculator.views = (this.calculator.views || 0) + 1;
      }

      this.updatePageMeta();
      this.renderCalculator();
      this.renderBelowSections();

    } catch (error) {
      console.error('Error loading calculator:', error);
      this.showError('Failed to load calculator');
    }
  }

  /**
   * Get slug from URL path (/calculator/:slug)
   */
  getSlugFromUrl() {
    const path = window.location.pathname;
    const parts = path.split('/').filter(p => p);
    // Expect: ['calculators', 'sip-calculator']
    return parts.length >= 2 ? parts[1] : null;
  }

  /**
   * Fetch calculator by slug
   */
  async fetchCalculator(slug) {
    const url = getApiUrl(
      `/calculators?filters[slug][$eq]=${slug}&populate[featuredImage]=true&populate[faqs]=true&populate[category]=true&populate[calculatorcategory]=true`
    );
    const response = await fetch(url);
    const data = await response.json();
    return data.data && data.data.length > 0 ? data.data[0] : null;
  }

  /**
   * Increment view count for the current calculator
   * @returns {Promise<number|null>} The new view count, or null if failed
   */
  async incrementViewCount() {
    if (!this.calculator?.documentId) return null;
    
    try {
      const url = getApiUrl(`/calculators/${this.calculator.documentId}/view`);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const result = await response.json();
        return result.data?.views || null;
      }
      return null;
    } catch (error) {
      console.error('Failed to increment view count:', error);
      return null;
    }
  }

  /**
   * Update page meta tags (SEO)
   */
  updatePageMeta() {
    const title = this.calculator.metaTitle || this.calculator.title;
    const description = this.calculator.metaDescription || this.calculator.excerpt || '';
    const url = window.location.href;

    // Page Title
    document.title = `${title} | FiscalColumn`;
    const pageTitleEl = document.getElementById('page-title');
    if (pageTitleEl) pageTitleEl.textContent = `${title} | FiscalColumn`;
    
    // Meta Description
    const metaDesc = document.getElementById('meta-description');
    if (metaDesc) metaDesc.setAttribute('content', description);

    // Canonical URL
    const canonicalEl = document.getElementById('canonical-url');
    if (canonicalEl) canonicalEl.setAttribute('href', url);

    // Open Graph Tags
    this.setMetaContent('og-url', url);
    this.setMetaContent('og-title', title);
    this.setMetaContent('og-description', description);

    // Twitter Card Tags
    this.setMetaContent('twitter-title', title);
    this.setMetaContent('twitter-description', description);

    // JSON-LD Breadcrumb Schema
    const breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": window.location.origin },
        { "@type": "ListItem", "position": 2, "name": "Calculators", "item": `${window.location.origin}/calculator` },
        { "@type": "ListItem", "position": 3, "name": this.calculator.title, "item": url }
      ]
    };
    const schemaBreadcrumbEl = document.getElementById('schema-breadcrumb');
    if (schemaBreadcrumbEl) schemaBreadcrumbEl.textContent = JSON.stringify(breadcrumbSchema);

    // Update visible breadcrumb
    document.getElementById('breadcrumb-calculator').textContent = this.calculator.title;
  }

  /**
   * Helper to set meta tag content by ID
   */
  setMetaContent(id, content) {
    const el = document.getElementById(id);
    if (el) el.setAttribute('content', content);
  }

  /**
   * Render the calculator header + pre-defined two-panel widget
   */
  renderCalculator() {
    const icon = this.calculator.icon || 'fa-calculator';
    const views = this.calculator.views || 0;

    this.mainContainer.innerHTML = `
      <div class="calculator-header">
        <div class="calculator-icon" style="background-color: rgba(32,91,122,0.12); color: #205b7a;">
          <i class="fa ${icon}"></i>
        </div>
        <div class="calculator-header-content">
          <div class="calculator-title-row">
            <h1 class="calculator-title">${this.calculator.title}</h1>
            <div class="calculator-meta">
              <span><i class="fa fa-eye"></i> ${Utils.formatViews(views)} views</span>
            </div>
          </div>
        </div>
      </div>

      <div class="calc-two-panel" id="calculator-widget">
        <div class="calc-panel-inputs" id="calc-input-section">
          <div class="calculator-loading">
            <div class="spinner"></div>
            <p>Loading...</p>
          </div>
        </div>
        <div class="calc-panel-results" id="calc-output-section">
          <div class="calc-output-placeholder">
            <i class="fa fa-pie-chart"></i>
            <p>Results will appear here</p>
          </div>
        </div>
      </div>
    `;

    this.loadCalculatorWidget();
  }

  /**
   * Render all below-fold sections: trending, related, FAQs, disclaimer, about
   */
  async renderBelowSections() {
    if (!this.belowContainer) return;

    const [trendingCalcs, relatedCalcs] = await Promise.all([
      this.fetchTrendingCalculators(),
      this.fetchRelatedCalculators(),
    ]);

    const faqsHtml = this.renderFAQs(this.calculator.faqs || []);
    const descriptionHtml = this.formatMarkdown(this.calculator.description || '');
    const howToUseHtml = this.formatMarkdown(this.calculator.howToUse || '');
    const formulaHtml = this.formatMarkdown(this.calculator.formulaExplanation || '');

    this.belowContainer.innerHTML = `
      ${this.buildTrendingHtml(trendingCalcs)}
      ${this.buildRelatedHtml(relatedCalcs)}
      ${faqsHtml ? `<div class="calc-section-card">${faqsHtml}</div>` : ''}
      ${this.calculator.disclaimer ? `
        <div class="calc-section-card calc-disclaimer-card">
          <i class="fa fa-info-circle"></i>
          <p>${this.calculator.disclaimer}</p>
        </div>
      ` : ''}
      ${descriptionHtml || howToUseHtml || formulaHtml ? `
        <div class="calc-section-card calc-about-card">
          ${descriptionHtml ? `
            <div class="calculator-section">
              <h2>About This Calculator</h2>
              <div class="calculator-content">${descriptionHtml}</div>
            </div>` : ''}
          ${howToUseHtml ? `
            <div class="calculator-section">
              <div class="calculator-content">${howToUseHtml}</div>
            </div>` : ''}
          ${formulaHtml ? `
            <div class="calculator-section">
              <div class="calculator-content">${formulaHtml}</div>
            </div>` : ''}
        </div>
      ` : ''}
    `;
  }

  /**
   * Fetch trending calculators (isTrending = true)
   */
  async fetchTrendingCalculators() {
    try {
      const url = getApiUrl(
        `/calculators?filters[isTrending][$eq]=true&filters[enableCalculator][$ne]=false&pagination[limit]=6&sort=order:asc`
      );
      const response = await fetch(url);
      const data = await response.json();
      return (data.data || []).filter(c => c.slug !== this.calculator.slug);
    } catch (e) {
      return [];
    }
  }

  /**
   * Fetch related calculators from the same category
   */
  async fetchRelatedCalculators() {
    const catDocId = this.calculator.calculatorcategory?.documentId;
    if (!catDocId) return [];
    try {
      const url = getApiUrl(
        `/calculators?filters[calculatorcategory][documentId][$eq]=${catDocId}&filters[slug][$ne]=${this.calculator.slug}&filters[enableCalculator][$ne]=false&populate[calculatorcategory]=true&pagination[limit]=10&sort=order:asc`
      );
      const response = await fetch(url);
      const data = await response.json();
      return data.data || [];
    } catch (e) {
      return [];
    }
  }

  /**
   * Vibrant-but-balanced accent palette — alternating hues so adjacent
   * tiles always differ in tone. Each tile uses its accent for background tint,
   * border, icon, and hover glow.
   */
  getTileAccent(index) {
    const accents = [
      '#3b82f6', // blue
      '#f97316', // orange
      '#10b981', // emerald
      '#8b5cf6', // violet
      '#ec4899', // pink
      '#14b8a6', // teal
      '#f59e0b', // amber
      '#6366f1', // indigo
      '#ef4444', // red
      '#84cc16', // lime
      '#06b6d4', // cyan
      '#d946ef', // fuchsia
    ];
    return accents[index % accents.length];
  }

  /**
   * Build a single calculator tile (square, icon-driven)
   */
  buildTileHtml(c, accent) {
    const icon = c.icon || 'fa-calculator';
    const cat = this.formatCategoryName(c.calculatorcategory?.calculatorcategory || 'Calculator');
    return `
      <a href="/calculator/${c.slug}" class="calc-tile" style="--tile-accent: ${accent};">
        <div class="calc-tile-icon">
          <i class="fa ${icon}"></i>
        </div>
        <div class="calc-tile-body">
          <div class="calc-tile-title">${c.title}</div>
          <div class="calc-tile-sub">${cat}</div>
        </div>
        <div class="calc-tile-cta">
          <span>Open</span>
          <i class="fa fa-arrow-right"></i>
        </div>
      </a>
    `;
  }

  /**
   * Build trending calculators section HTML
   */
  buildTrendingHtml(calcs) {
    if (!calcs.length) return '';
    const tiles = calcs.map((c, i) => this.buildTileHtml(c, this.getTileAccent(i))).join('');
    return `
      <hr class="calc-section-divider" />
      <div class="calc-section-card calc-trending-section">
        <h3 class="calc-section-title">Trending Calculators</h3>
        <div class="calc-tile-row">${tiles}</div>
      </div>
    `;
  }

  /**
   * Build related calculators tile row + view-all button
   */
  buildRelatedHtml(calcs) {
    const catName = this.formatCategoryName(
      this.calculator.calculatorcategory?.calculatorcategory || ''
    );

    if (!calcs.length) {
      return `
        <div class="calc-section-card calc-related-section">
          <h3 class="calc-section-title">Related Calculators</h3>
          <p class="calc-no-related">No other calculators in this category.</p>
        </div>
      `;
    }

    const tiles = calcs.map((c, i) => this.buildTileHtml(c, this.getTileAccent(i + 2))).join('');

    return `
      <div class="calc-section-card calc-related-section">
        <div class="calc-section-title-row">
          <h3 class="calc-section-title calc-section-title--inline">
            Related Calculators
            ${catName ? `<span class="calc-title-category">${catName}</span>` : ''}
          </h3>
          <a href="/calculator" class="calc-view-all-link">
            <i class="fa fa-th-large"></i> View All
          </a>
        </div>
        <div class="calc-tile-row">${tiles}</div>
      </div>
    `;
  }

  /**
   * Move .calc-results from the input section into the pre-defined output section
   */
  restructureWidget() {
    const inputSection = document.getElementById('calc-input-section');
    const outputSection = document.getElementById('calc-output-section');
    if (!inputSection || !outputSection) return;

    const form = inputSection.querySelector('.calc-form');
    if (!form) return;
    const results = form.querySelector('.calc-results');
    if (!results) return;

    // Detach results from form (leaving only inputs + button in input section)
    form.removeChild(results);

    // Clean up any inline display/spacing overrides
    results.style.removeProperty('display');
    results.style.removeProperty('margin-top');
    results.style.removeProperty('border-top');
    results.style.removeProperty('padding-top');

    // Place results in the pre-built output section
    outputSection.innerHTML = '';
    outputSection.appendChild(results);
  }

  /**
   * Get calculator registration type from slug
   * Maps URL slug to calculator registration type used in registerCalculator()
   */
  getCalculatorTypeFromSlug(slug) {
    if (!slug) return null;
    
    // Map slug to registration type
    // This maps the URL slug to the type used in registerCalculator(type, CalculatorClass)
    const slugToTypeMap = {
      // Finance & Loans
      'emi-calculator': 'emi',
      'home-loan-emi-calculator': 'home-loan-emi',
      'car-loan-emi-calculator': 'car-loan-emi',
      'personal-loan-emi-calculator': 'personal-loan-emi',
      'loan-eligibility-calculator': 'loan-eligibility',
      'loan-prepayment-calculator': 'loan-prepayment',
      'credit-card-calculator': 'credit-card',
      'education-loan-emi-calculator': 'education-loan-emi',
      // Investment & Savings
      'sip-calculator': 'sip',
      'lumpsum-calculator': 'lumpsum',
      'step-up-sip-calculator': 'step-up-sip',
      'fd-calculator': 'fd',
      'rd-calculator': 'rd',
      'compound-interest-calculator': 'compound-interest',
      'simple-interest-calculator': 'simple-interest',
      'nsc-calculator': 'nsc',
      // Tax & Government Schemes
      'income-tax-calculator': 'income-tax',
      'gst-calculator': 'gst',
      'hra-calculator': 'hra',
      'tds-calculator': 'tds',
      'ppf-calculator': 'ppf',
      'nps-calculator': 'nps',
      'sukanya-samriddhi-calculator': 'sukanya-samriddhi',
      'epf-calculator': 'epf',
      // Retirement & Planning
      'retirement-calculator': 'retirement',
      'gratuity-calculator': 'gratuity',
      // Health & Fitness
      'bmi-calculator': 'bmi',
      'bmr-calculator': 'bmr',
      'calorie-calculator': 'calorie',
      'walk-calorie-burn-calculator': 'walk-calorie-burn',
      'ideal-weight-calculator': 'ideal-weight',
      'child-height-calculator': 'child-height',
      'diabetes-risk-calculator': 'diabetes-risk',
      // Salary & Business
      'take-home-salary-calculator': 'take-home-salary',
      // Home & Property
      'rent-vs-buy-calculator': 'rent-vs-buy',
    };
    
    // Check if there's a mapping for this slug
    if (slugToTypeMap[slug]) {
      return slugToTypeMap[slug];
    }
    
    // Default: try removing '-calculator' suffix if present
    if (slug.endsWith('-calculator')) {
      return slug.replace('-calculator', '');
    }
    
    // Fallback: use slug as-is
    return slug;
  }

  /**
   * Get script filename from calculator slug
   */
  getCalculatorScriptPath(slug) {
    if (!slug) return null;
    
    // Map slug (from URL) to actual script filename
    // Add new calculators here if slug doesn't match filename
    const slugToFileMap = {
      'walk-calorie-burn-calculator': 'walk-calorie-calculator.js',
    };
    
    // Check if there's a mapping for this slug
    if (slugToFileMap[slug]) {
      return slugToFileMap[slug];
    }
    
    // Default: slug matches filename pattern, just add .js extension
    return `${slug}.js`;
  }

  /**
   * Get versioned script URL for cache busting
   */
  getVersionedScriptUrl(src) {
    const version = window.ENV?.APP_VERSION || Date.now();
    const separator = src.includes('?') ? '&' : '?';
    return `${src}${separator}v=${version}`;
  }

  /**
   * Dynamically load a script and return a Promise
   */
  loadScript(src) {
    return new Promise((resolve, reject) => {
      // Add version for cache busting
      const versionedSrc = this.getVersionedScriptUrl(src);
      
      // Check if script is already loaded (check both versioned and unversioned)
      const existingScript = document.querySelector(`script[src="${src}"], script[src="${versionedSrc}"], script[src^="${src}?"]`);
      if (existingScript) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = versionedSrc;
      script.async = true;
      
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script: ${versionedSrc}`));
      
      document.head.appendChild(script);
    });
  }

  /**
   * Load the specific calculator widget based on calculator slug
   */
  async loadCalculatorWidget() {
    // Render calculator inputs into the pre-defined input section
    const inputSection = document.getElementById('calc-input-section');
    const slug = this.calculator.slug;

    // Get calculator type from slug (maps to registration type)
    const calcType = this.getCalculatorTypeFromSlug(slug);

    if (!calcType) {
      inputSection.innerHTML = `
        <div class="calculator-coming-soon">
          <i class="fa fa-wrench"></i>
          <h3>Calculator Not Found</h3>
          <p>Calculator slug "${slug}" is not supported.</p>
        </div>
      `;
      return;
    }

    // First check if calculator is already registered (might be pre-loaded)
    let CalculatorClass = getCalculator(calcType);

    if (!CalculatorClass) {
      const scriptPath = this.getCalculatorScriptPath(slug);

      if (!scriptPath) {
        inputSection.innerHTML = `
          <div class="calculator-coming-soon">
            <i class="fa fa-wrench"></i>
            <h3>Calculator Not Found</h3>
            <p>Calculator script for "${slug}" not found.</p>
          </div>
        `;
        return;
      }

      try {
        inputSection.innerHTML = `
          <div class="calculator-loading">
            <div class="spinner"></div>
            <p>Loading calculator...</p>
          </div>
        `;

        await this.loadScript(`/js/calculators/${scriptPath}`);
        await new Promise(resolve => setTimeout(resolve, 100));
        CalculatorClass = getCalculator(calcType);
      } catch (error) {
        console.error('Error loading calculator script:', error);
        inputSection.innerHTML = `
          <div class="calculator-coming-soon">
            <i class="fa fa-exclamation-triangle"></i>
            <h3>Error Loading Calculator</h3>
            <p>Failed to load calculator script. Please try refreshing the page.</p>
          </div>
        `;
        return;
      }
    }
    
    if (CalculatorClass) {
      const calculator = new CalculatorClass(inputSection);
      calculator.render();
      // Initialize slider progress bars + move results to output section
      setTimeout(() => {
        CalculatorUtils.initSliderProgress();
        this.restructureWidget();
      }, 80);
    } else {
      console.error(`Calculator type "${calcType}" not found in registry after loading script.`);
      inputSection.innerHTML = `
        <div class="calculator-coming-soon">
          <i class="fa fa-wrench"></i>
          <h3>Coming Soon</h3>
          <p>This calculator is being developed. Check back soon!</p>
        </div>
      `;
    }
  }

  /**
   * Render FAQs accordion
   */
  renderFAQs(faqs) {
    if (!faqs || faqs.length === 0) return '';

    const faqItems = faqs.map((faq, index) => `
      <div class="faq-item">
        <button class="faq-question" data-index="${index}">
          <span>${faq.question}</span>
          <i class="fa fa-chevron-down"></i>
        </button>
        <div class="faq-answer" id="faq-answer-${index}">
          <p>${faq.answer}</p>
        </div>
      </div>
    `).join('');

    // Add event listener after rendering
    setTimeout(() => {
      document.querySelectorAll('.faq-question').forEach(btn => {
        btn.addEventListener('click', () => {
          const index = btn.dataset.index;
          const answer = document.getElementById(`faq-answer-${index}`);
          const isOpen = answer.classList.contains('open');
          
          // Close all
          document.querySelectorAll('.faq-answer').forEach(a => a.classList.remove('open'));
          document.querySelectorAll('.faq-question').forEach(q => q.classList.remove('active'));
          
          // Open clicked if was closed
          if (!isOpen) {
            answer.classList.add('open');
            btn.classList.add('active');
          }
        });
      });
    }, 100);

    return `
      <div class="calculator-section calculator-faqs">
        <h2>Frequently Asked Questions</h2>
        <div class="faq-list">${faqItems}</div>
      </div>
    `;
  }


  /**
   * Format markdown to HTML
   */
  formatMarkdown(content) {
    if (!content) return '';
    
    if (typeof marked !== 'undefined') {
      marked.setOptions({ breaks: true, gfm: true });
      return marked.parse(content);
    }
    
    // Fallback
    return content.replace(/\n/g, '<br>');
  }

  /**
   * Format category name for display
   */
  formatCategoryName(category) {
    if (!category) return 'Calculator';
    // Capitalize each word
    return category
      .split(/[\s&]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' & ')
      .replace(/ & & /g, ' & ');
  }

  /**
   * Show error state
   */
  showError(message) {
    document.title = 'Calculator Not Found | FiscalColumn';
    
    this.mainContainer.innerHTML = `
      <div class="calculator-error">
        <i class="fa fa-exclamation-circle"></i>
        <h2>Calculator Not Found</h2>
        <p>${message}</p>
        <a href="/calculator" class="btn-back">
          <i class="fa fa-arrow-left"></i> Back to Calculators
        </a>
      </div>
    `;
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  const manager = new CalculatorPageManager();
  manager.init();
});


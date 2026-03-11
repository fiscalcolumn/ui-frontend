/**
 * Calculator Page Manager
 * Fetches calculator data and loads appropriate calculator logic
 */

class CalculatorPageManager {
  constructor() {
    this.mainContainer = document.getElementById('calculator-main');
    this.sidebarContainer = document.getElementById('calculator-sidebar');
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
      this.renderSidebar();

    } catch (error) {
      console.error('Error loading calculator:', error);
      this.showError('Failed to load calculator');
    }
  }

  /**
   * Get slug from URL path (/calculators/:slug)
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
        { "@type": "ListItem", "position": 2, "name": "Calculators", "item": `${window.location.origin}/calculators` },
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
   * Render the calculator
   */
  renderCalculator() {
    const icon = this.calculator.icon || 'fa-calculator';
    const iconColor = this.calculator.iconColor || '#14bdee';
    const views = this.calculator.views || 0;
    
    // Format description
    const descriptionHtml = this.formatMarkdown(this.calculator.description || '');
    const howToUseHtml = this.formatMarkdown(this.calculator.howToUse || '');
    const formulaHtml = this.formatMarkdown(this.calculator.formulaExplanation || '');
    
    // Render FAQs
    const faqsHtml = this.renderFAQs(this.calculator.faqs || []);

    this.mainContainer.innerHTML = `
      <div class="calculator-header">
        <div class="calculator-icon" style="background-color: ${iconColor}20; color: ${iconColor};">
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

      <div class="calculator-widget" id="calculator-widget">
        <!-- Calculator widget will be loaded here -->
        <div class="calculator-loading">
          <div class="spinner"></div>
          <p>Loading calculator...</p>
        </div>
      </div>

      ${this.calculator.disclaimer ? `
      <div class="calculator-disclaimer">
        <i class="fa fa-info-circle"></i>
        <p>${this.calculator.disclaimer}</p>
      </div>
      ` : ''}

      ${descriptionHtml ? `
      <div class="calculator-section">
        <h2>About This Calculator</h2>
        <div class="calculator-content">${descriptionHtml}</div>
      </div>
      ` : ''}

      ${howToUseHtml ? `
      <div class="calculator-section">
        <div class="calculator-content">${howToUseHtml}</div>
      </div>
      ` : ''}

      ${formulaHtml ? `
      <div class="calculator-section">
        <div class="calculator-content">${formulaHtml}</div>
      </div>
      ` : ''}

      ${faqsHtml}
    `;

    // Load the specific calculator widget
    this.loadCalculatorWidget();
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
      'sip-calculator': 'sip',
      'bmi-calculator': 'bmi',
      'bmr-calculator': 'bmr',
      'calorie-calculator': 'calorie',
      'walk-calorie-burn-calculator': 'walk-calorie-burn',
      'emi-calculator': 'emi',
      'home-loan-emi-calculator': 'home-loan-emi',
      'car-loan-emi-calculator': 'car-loan-emi',
      'personal-loan-emi-calculator': 'personal-loan-emi',
      'fd-calculator': 'fd',
      'rd-calculator': 'rd',
      'ppf-calculator': 'ppf',
      'nps-calculator': 'nps',
      'compound-interest-calculator': 'compound-interest',
      'simple-interest-calculator': 'simple-interest',
      'retirement-calculator': 'retirement',
      'loan-eligibility-calculator': 'loan-eligibility',
      'loan-prepayment-calculator': 'loan-prepayment',
      'income-tax-calculator': 'income-tax',
      'gratuity-calculator': 'gratuity',
      'ideal-weight-calculator': 'ideal-weight',
      'child-height-calculator': 'child-height',
      'diabetes-risk-calculator': 'diabetes-risk'
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
   * Maps URL slug to actual JavaScript filename
   * Location: FiscalColumn-frontend/frontend/js/calculator-page.js (line ~234)
   */
  getCalculatorScriptPath(slug) {
    if (!slug) return null;
    
    // Map slug (from URL) to actual script filename
    // Add new calculators here if slug doesn't match filename
    const slugToFileMap = {
      'walk-calorie-burn-calculator': 'walk-calorie-calculator.js' // Slug mismatch example
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
    const widgetContainer = document.getElementById('calculator-widget');
    const slug = this.calculator.slug;
    
    // Get calculator type from slug (maps to registration type)
    const calcType = this.getCalculatorTypeFromSlug(slug);
    
    if (!calcType) {
      widgetContainer.innerHTML = `
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
      // Calculator not registered yet, need to load script dynamically
      const scriptPath = this.getCalculatorScriptPath(slug);
      
      if (!scriptPath) {
        widgetContainer.innerHTML = `
          <div class="calculator-coming-soon">
            <i class="fa fa-wrench"></i>
            <h3>Calculator Not Found</h3>
            <p>Calculator script for "${slug}" not found.</p>
          </div>
        `;
        return;
      }

      try {
        // Show loading state
        widgetContainer.innerHTML = `
          <div class="calculator-loading">
            <div class="spinner"></div>
            <p>Loading calculator...</p>
          </div>
        `;

        // Load the calculator script
        await this.loadScript(`/js/calculators/${scriptPath}`);
        
        // Wait a bit for the script to register itself
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Try to get the calculator class again using the mapped type
        CalculatorClass = getCalculator(calcType);
      } catch (error) {
        console.error('Error loading calculator script:', error);
        widgetContainer.innerHTML = `
          <div class="calculator-coming-soon">
            <i class="fa fa-exclamation-triangle"></i>
            <h3>Error Loading Calculator</h3>
            <p>Failed to load calculator script. Please try refreshing the page.</p>
            <p style="font-size: 0.9em; color: #666; margin-top: 10px;">Error: ${error.message}</p>
          </div>
        `;
        return;
      }
    }
    
    if (CalculatorClass) {
      const calculator = new CalculatorClass(widgetContainer);
      calculator.render();
      // Initialize slider progress bars
      setTimeout(() => CalculatorUtils.initSliderProgress(), 50);
    } else {
      // Fallback - show coming soon
      console.error(`Calculator type "${calcType}" not found in registry after loading script.`);
      widgetContainer.innerHTML = `
        <div class="calculator-coming-soon">
          <i class="fa fa-wrench"></i>
          <h3>Coming Soon</h3>
          <p>This calculator is being developed. Check back soon!</p>
          <p style="font-size: 0.9em; color: #666; margin-top: 10px;">Type: ${calcType}, Slug: ${slug}</p>
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
   * Render sidebar with related calculators
   */
  async renderSidebar() {
    // Get the calculator category from the relation
    const calculatorCategoryDocId = this.calculator.calculatorcategory?.documentId;
    const calculatorCategoryName = this.calculator.calculatorcategory?.calculatorcategory;
    
    if (!calculatorCategoryDocId) {
      // If no category, show generic sidebar
      this.sidebarContainer.innerHTML = `
        <div class="sidebar-section sidebar-cta">
          <h3 class="sidebar-title">All Calculators</h3>
          <p>Browse our full collection of financial and health calculators.</p>
          <a href="/calculators" class="sidebar-btn">
            <i class="fa fa-th-large"></i> View All Calculators
          </a>
        </div>
      `;
      return;
    }

    // Fetch ALL enabled calculators from same calculatorcategory (excluding current and disabled)
    // Filter by the calculatorcategory relation's documentId
    const url = getApiUrl(
      `/calculators?filters[calculatorcategory][documentId][$eq]=${calculatorCategoryDocId}&filters[slug][$ne]=${this.calculator.slug}&filters[enableCalculator][$ne]=false&populate[calculatorcategory]=true&pagination[limit]=100&sort=order:asc`
    );
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      const categoryCalculators = data.data || [];

      const categoryName = this.formatCategoryName(calculatorCategoryName || '');
      const relatedHtml = categoryCalculators.length > 0 ? categoryCalculators.map(calc => `
        <a href="/calculators/${calc.slug}" class="sidebar-calc-item">
          <div class="sidebar-calc-icon" style="color: ${calc.iconColor || '#14bdee'}">
            <i class="fa ${calc.icon || 'fa-calculator'}"></i>
          </div>
          <div class="sidebar-calc-info">
            <span class="sidebar-calc-title">${calc.title}</span>
          </div>
          <i class="fa fa-chevron-right sidebar-calc-arrow"></i>
        </a>
      `).join('') : '<p class="no-related">No other calculators in this category</p>';

      this.sidebarContainer.innerHTML = `
        <div class="sidebar-section sidebar-related">
          <h3 class="sidebar-title">${categoryName} Calculators <span class="calc-count">(${categoryCalculators.length})</span></h3>
          <div class="sidebar-calc-list sidebar-calc-scroll">
            ${relatedHtml}
          </div>
        </div>

        <div class="sidebar-section sidebar-ad">
          <div class="sidebar-ad-box">
            <span class="ad-label">Advertisement</span>
            <div class="ad-placeholder">
              <i class="fa fa-bullhorn"></i>
              <span>Ad Space</span>
            </div>
          </div>
        </div>

        <div class="sidebar-section sidebar-cta">
          <h3 class="sidebar-title">All Calculators</h3>
          <p>Browse our full collection of financial and health calculators.</p>
          <a href="/calculators" class="sidebar-btn">
            <i class="fa fa-th-large"></i> View All Calculators
          </a>
        </div>

        <div class="sidebar-section sidebar-ad">
          <div class="sidebar-ad-box">
            <span class="ad-label">Advertisement</span>
            <div class="ad-placeholder">
              <i class="fa fa-bullhorn"></i>
              <span>Ad Space</span>
            </div>
          </div>
        </div>
      `;
    } catch (error) {
      console.error('Error loading sidebar calculators:', error);
      // Show fallback sidebar on error
      this.sidebarContainer.innerHTML = `
        <div class="sidebar-section sidebar-cta">
          <h3 class="sidebar-title">All Calculators</h3>
          <p>Browse our full collection of financial and health calculators.</p>
          <a href="/calculators" class="sidebar-btn">
            <i class="fa fa-th-large"></i> View All Calculators
          </a>
        </div>
      `;
    }
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
   * Format views count (e.g., 1500 -> 1.5K)
   */

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
        <a href="/calculators" class="btn-back">
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


/**
 * Rate Page Manager
 * Handles gold/silver rate pages with dynamic data
 */

class RatePageManager {
  constructor() {
    this.mainContainer = document.getElementById('rate-main');
    this.sidebarContainer = document.getElementById('rate-sidebar');
    this.metalType = null; // 'gold' or 'silver'
    this.city = null; // city name or 'india' for national
    this.category = null; // 'gold-rates', 'silver-rates', 'commodities'
    this.currentRate = null;
    this.historicalRates = [];
    this.chart = null;
  }

  async init() {
    // Parse URL to extract metal type and city
    const urlPath = window.location.pathname;
    const parts = urlPath.split('/').filter(p => p);
    
    // Expected: ['gold-rates', 'gold-rate-today'] or ['gold-rates', 'gold-rate-today-in-mumbai']
    if (parts.length < 2) {
      this.showError('Invalid rate page URL');
      return;
    }

    this.category = parts[0]; // 'gold-rates', 'silver-rates', 'commodities'
    const pageSlug = parts[1]; // 'gold-rate-today' or 'gold-rate-today-in-mumbai'

    // Determine metal type from category
    if (this.category === 'gold-rates') {
      this.metalType = 'gold';
    } else if (this.category === 'silver-rates') {
      this.metalType = 'silver';
    } else {
      this.metalType = 'gold'; // Default
    }

    // Extract city from page slug
    // Pattern: {metal}-rate-today-in-{city}
    const cityMatch = pageSlug.match(/-in-(.+)$/);
    if (cityMatch) {
      this.city = cityMatch[1].replace(/-/g, ' '); // Convert 'mumbai' to 'Mumbai'
      // Capitalize first letter of each word
      this.city = this.city.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
    } else {
      this.city = 'India'; // Default to India for national rates
    }

    try {
      await this.loadRateData();
      this.updatePageMeta();
      this.renderRatePage();
      this.renderSidebar();
    } catch (error) {
      console.error('Error loading rate page:', error);
      this.showError('Failed to load rate data');
    }
  }

  /**
   * Load current and historical rate data
   */
  async loadRateData() {
    // First, get the metal
    const metalRes = await fetch(getApiUrl(`/metals?filters[slug][$eq]=${this.metalType}`));
    const metalData = await metalRes.json();
    const metal = metalData.data?.[0];
    
    if (!metal) {
      throw new Error('Metal not found');
    }

    // Get city (or India as country)
    let city = null;
    if (this.city !== 'India') {
      const cityRes = await fetch(getApiUrl(`/cities?filters[name][$eq]=${this.city}&populate[country]=true`));
      const cityData = await cityRes.json();
      city = cityData.data?.[0];
    }

    // Get latest rate for this metal and city
    const today = new Date().toISOString().split('T')[0];
    let rateFilter = `filters[metal][slug][$eq]=${this.metalType}&filters[date][$eq]=${today}&sort=date:desc`;
    
    if (city) {
      rateFilter += `&filters[city][name][$eq]=${this.city}`;
    } else {
      // For India, get rates where city is in India
      rateFilter += `&filters[city][country][code][$eq]=IN`;
    }

    const rateRes = await fetch(getApiUrl(`/daily-rates?${rateFilter}&populate[metal]=true&populate[city][populate][state][populate][country]=true&pagination[limit]=1`));
    const rateData = await rateRes.json();
    this.currentRate = rateData.data?.[0];

    // Get historical rates (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateFrom = thirtyDaysAgo.toISOString().split('T')[0];
    
    let historicalFilter = `filters[metal][slug][$eq]=${this.metalType}&filters[date][$gte]=${dateFrom}&sort=date:desc`;
    if (city) {
      historicalFilter += `&filters[city][name][$eq]=${this.city}`;
    } else {
      historicalFilter += `&filters[city][country][code][$eq]=IN`;
    }

    const historicalRes = await fetch(getApiUrl(`/daily-rates?${historicalFilter}&populate[metal]=true&populate[city]=true&pagination[limit]=30`));
    const historicalData = await historicalRes.json();
    this.historicalRates = historicalData.data || [];
  }

  /**
   * Update page meta tags (SEO)
   */
  updatePageMeta() {
    const metalName = this.metalType === 'gold' ? 'Gold' : 'Silver';
    const location = this.city === 'India' ? 'India' : `${this.city}, India`;
    const title = `${metalName} Rate Today in ${location} | FiscalColumn`;
    const description = `Check today's ${metalName.toLowerCase()} rate in ${location}. Get live ${metalName.toLowerCase()} prices, historical trends, and MCX reference rates.`;
    const url = window.location.href;

    // Page Title
    document.title = title;
    const pageTitleEl = document.getElementById('page-title');
    if (pageTitleEl) pageTitleEl.textContent = title;
    
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
        { "@type": "ListItem", "position": 2, "name": `${metalName} Rates`, "item": `${window.location.origin}/${this.category}` },
        { "@type": "ListItem", "position": 3, "name": title, "item": url }
      ]
    };
    const schemaBreadcrumbEl = document.getElementById('schema-breadcrumb');
    if (schemaBreadcrumbEl) schemaBreadcrumbEl.textContent = JSON.stringify(breadcrumbSchema);
    
    // Update visible breadcrumb
    document.getElementById('breadcrumb-category').textContent = `${metalName} Rates`;
    document.getElementById('breadcrumb-page').textContent = `${metalName} Rate Today${this.city !== 'India' ? ` in ${this.city}` : ''}`;
  }

  /**
   * Helper to set meta tag content by ID
   */
  setMetaContent(id, content) {
    const el = document.getElementById(id);
    if (el) el.setAttribute('content', content);
  }

  /**
   * Render the main rate page content
   */
  renderRatePage() {
    if (!this.currentRate) {
      this.mainContainer.innerHTML = `
        <div class="rate-error">
          <i class="fa fa-exclamation-circle"></i>
          <h2>Rate Data Not Available</h2>
          <p>Today's rate data for ${this.metalType} in ${this.city} is not available yet. Please check back later.</p>
        </div>
      `;
      return;
    }

    const rate = this.currentRate.rate;
    const purity = this.formatPurity(this.currentRate.purity);
    const unit = this.formatUnit(this.currentRate.unit);
    const mcxRate = this.currentRate.mcxReferenceRate;
    const date = new Date(this.currentRate.date).toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Calculate other purities for gold (if 24k)
    let otherPurities = '';
    if (this.metalType === 'gold' && this.currentRate.purity === 'twenty-four-k') {
      const rate22k = (rate * 22 / 24).toFixed(2);
      const rate18k = (rate * 18 / 24).toFixed(2);
      otherPurities = `
        <div class="purity-breakdown">
          <div class="purity-item">
            <span class="purity-label">22K ${this.metalType === 'gold' ? 'Gold' : 'Silver'}</span>
            <span class="purity-value">₹${Utils.formatNumber(rate22k)}/${unit}</span>
          </div>
          <div class="purity-item">
            <span class="purity-label">18K ${this.metalType === 'gold' ? 'Gold' : 'Silver'}</span>
            <span class="purity-value">₹${Utils.formatNumber(rate18k)}/${unit}</span>
          </div>
        </div>
      `;
    }

    this.mainContainer.innerHTML = `
      <div class="rate-header">
        <h1 class="rate-title">${this.metalType === 'gold' ? 'Gold' : 'Silver'} Rate Today in ${this.city}</h1>
        <p class="rate-date"><i class="fa fa-calendar"></i> ${date}</p>
      </div>

      <div class="rate-display-card">
        <div class="rate-main-value">
          <div class="rate-label">Current Rate (${purity})</div>
          <div class="rate-amount">₹${Utils.formatNumber(rate)}</div>
          <div class="rate-unit">per ${unit}</div>
        </div>
        ${mcxRate ? `
        <div class="rate-mcx">
          <span class="mcx-label">MCX Reference</span>
          <span class="mcx-value">₹${Utils.formatNumber(mcxRate)}</span>
        </div>
        ` : ''}
      </div>

      ${otherPurities}

      ${this.historicalRates.length > 0 ? `
      <div class="rate-chart-section">
        <h3 class="section-title">Price Trend (Last 30 Days)</h3>
        <div class="chart-container">
          <canvas id="rateChart"></canvas>
        </div>
      </div>
      ` : ''}

      <div class="rate-info-section">
        <h3 class="section-title">About ${this.metalType === 'gold' ? 'Gold' : 'Silver'} Rates</h3>
        <div class="rate-info-content">
          <p>${this.metalType === 'gold' ? 'Gold' : 'Silver'} rates vary by location due to local demand, transportation costs, and state taxes. The rates shown are indicative and may vary at actual jewelry stores.</p>
          <p><strong>Note:</strong> Rates are updated daily and reflect market prices. Always verify rates with local dealers before making purchases.</p>
        </div>
      </div>
    `;

    // Render chart if historical data available
    if (this.historicalRates.length > 0) {
      setTimeout(() => this.renderChart(), 100);
    }
  }

  /**
   * Render historical price chart
   */
  renderChart() {
    const ctx = document.getElementById('rateChart');
    if (!ctx) return;

    // Sort rates by date (ascending)
    const sortedRates = [...this.historicalRates].sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );

    const labels = sortedRates.map(r => {
      const date = new Date(r.date);
      return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    });
    const rates = sortedRates.map(r => parseFloat(r.rate));

    if (this.chart) {
      this.chart.destroy();
    }

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: `${this.metalType === 'gold' ? 'Gold' : 'Silver'} Rate`,
          data: rates,
          borderColor: this.metalType === 'gold' ? '#FFD700' : '#C0C0C0',
          backgroundColor: this.metalType === 'gold' ? 'rgba(255, 215, 0, 0.1)' : 'rgba(192, 192, 192, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: this.metalType === 'gold' ? '#FFD700' : '#C0C0C0'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => `₹${Utils.formatNumber(context.raw)}`
            }
          }
        },
        scales: {
          x: { 
            grid: { display: false },
            ticks: { maxTicksLimit: 10 }
          },
          y: {
            beginAtZero: false,
            ticks: {
              callback: (value) => `₹${Utils.formatNumber(value)}`
            }
          }
        }
      }
    });
  }

  /**
   * Render sidebar with city comparison
   */
  async renderSidebar() {
    // Fetch rates for major cities
    const today = new Date().toISOString().split('T')[0];
    const majorCities = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad'];
    
    const cityRates = [];
    for (const cityName of majorCities) {
      if (cityName === this.city) continue; // Skip current city
      
      const res = await fetch(getApiUrl(
        `/daily-rates?filters[metal][slug][$eq]=${this.metalType}&filters[city][name][$eq]=${cityName}&filters[date][$eq]=${today}&populate[city]=true&pagination[limit]=1`
      ));
      const data = await res.json();
      if (data.data?.[0]) {
        cityRates.push({
          city: cityName,
          rate: data.data[0].rate,
          unit: data.data[0].unit
        });
      }
    }

    const cityListHtml = cityRates.length > 0 ? cityRates.map(item => `
      <div class="city-rate-item">
        <span class="city-name">${item.city}</span>
        <span class="city-rate">₹${Utils.formatNumber(item.rate)}/${this.formatUnit(item.unit)}</span>
      </div>
    `).join('') : '<p class="no-data">Rate data for other cities coming soon</p>';

    this.sidebarContainer.innerHTML = `
      <div class="sidebar-section">
        <h3 class="sidebar-title">${this.metalType === 'gold' ? 'Gold' : 'Silver'} Rates in Major Cities</h3>
        <div class="city-rates-list">
          ${cityListHtml}
        </div>
      </div>

      <div class="sidebar-section">
        <h3 class="sidebar-title">Quick Links</h3>
        <div class="quick-links">
          <a href="/${this.category}/gold-rate-today" class="quick-link">${this.metalType === 'gold' ? 'Gold' : 'Silver'} Rate Today (India)</a>
          <a href="/${this.category === 'gold-rates' ? 'silver-rates' : 'gold-rates'}/gold-rate-today" class="quick-link">
            ${this.metalType === 'gold' ? 'Silver' : 'Gold'} Rate Today
          </a>
        </div>
      </div>
    `;
  }

  /**
   * Format purity enum to display text
   */
  formatPurity(purity) {
    const purityMap = {
      'twenty-four-k': '24K',
      'twenty-two-k': '22K',
      'eighteen-k': '18K',
      'fourteen-k': '14K',
      'pure': 'Pure'
    };
    return purityMap[purity] || purity;
  }

  /**
   * Format unit enum to display text
   */
  formatUnit(unit) {
    const unitMap = {
      'one-gram': '1g',
      'ten-gram': '10g',
      'one-kg': '1kg',
      'one-oz': '1oz',
      'one-tola': '1 Tola'
    };
    return unitMap[unit] || unit;
  }

  /**
   * Format number with Indian numbering system
   */

  /**
   * Show error state
   */
  showError(message) {
    document.title = 'Rate Page Error | FiscalColumn';
    
    this.mainContainer.innerHTML = `
      <div class="rate-error">
        <i class="fa fa-exclamation-circle"></i>
        <h2>Error</h2>
        <p>${message}</p>
        <a href="/${this.category}" class="btn-back">
          <i class="fa fa-arrow-left"></i> Back to ${this.metalType === 'gold' ? 'Gold' : 'Silver'} Rates
        </a>
      </div>
    `;
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  const manager = new RatePageManager();
  manager.init();
});


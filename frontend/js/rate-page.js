/**
 * Rate Page — Gold / Silver
 * Works with /gold-rate and /silver-rate
 *
 * NOTE on Strapi v5 deep filtering:
 *   filters[metal][name][$eq]=Gold does NOT work for oneToOne relations without
 *   a bidirectional inverse in Strapi v5 — the filter is silently ignored.
 *   We therefore fetch with populate=* and filter client-side by record.metal.name.
 */

const METAL_CONFIG = {
  gold: {
    name:       'Gold',
    color:      '#D4A017',
    colorLight: 'rgba(212,160,23,0.12)',
    icon:       '🥇',
    unitLabel:  '10g',
    // Derived purity ratios from 24K base
    purities: [
      { label: '24K', ratio: 1,       desc: '99.9% Pure' },
      { label: '22K', ratio: 22/24,   desc: '91.7% Pure' },
      { label: '20K', ratio: 20/24,   desc: '83.3% Pure' },
      { label: '18K', ratio: 18/24,   desc: '75.0% Pure' },
      { label: '14K', ratio: 14/24,   desc: '58.3% Pure' },
    ],
    // Multipliers relative to per-10g base
    weights: [
      { label: '1 Gram',   mult: 0.1   },
      { label: '10 Gram',  mult: 1     },
      { label: '100 Gram', mult: 10    },
      { label: '1 Kg',     mult: 100   },
      { label: '1 Tola',   mult: 1.166 },
      { label: '1 Ounce',  mult: 3.11  },
    ],
  },
  silver: {
    name:       'Silver',
    color:      '#6B7280',
    colorLight: 'rgba(107,114,128,0.12)',
    icon:       '🥈',
    unitLabel:  'kg',
    purities: [
      { label: '999', ratio: 1,         desc: '99.9% Pure'     },
      { label: '925', ratio: 925/999,   desc: '92.5% Sterling' },
      { label: '900', ratio: 900/999,   desc: '90.0% Coin'     },
      { label: '800', ratio: 800/999,   desc: '80.0% German'   },
    ],
    weights: [
      { label: '1 Gram',   mult: 0.001  },
      { label: '10 Gram',  mult: 0.01   },
      { label: '100 Gram', mult: 0.1    },
      { label: '1 Kg',     mult: 1      },
      { label: '1 Tola',   mult: 0.01166 },
      { label: '1 Ounce',  mult: 0.0311  },
    ],
  },
};

class RatePageManager {
  constructor() {
    this.heroSlot   = document.getElementById('rate-hero-slot');
    this.mainEl     = document.getElementById('rate-main');
    this.metal      = null;
    this.allRates   = [];   // [{date, buyingRate}] sorted asc, already metal-identified
    this.todayRate  = null;
    this.yestRate   = null;
    this.chart           = null;
    this.activeRange     = '1Y';
    this.activePurityIdx = 0;
    this.states          = [];
    this.jewellers       = [];
    this.taxes           = [];
    this.articles        = [];
    this.cities          = [];
    // Detect city slug from URL: /gold-rate/mumbai → 'mumbai'
    const urlParts = window.location.pathname.split('/').filter(Boolean);
    this.citySlug  = urlParts.length >= 2 ? urlParts[1] : null;
    this.cityName  = this.citySlug
      ? this.citySlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      : null;
  }

  // ── Boot ────────────────────────────────────────────────────────────────────
  async init() {
    this.metal = window.location.pathname.includes('silver')
      ? METAL_CONFIG.silver
      : METAL_CONFIG.gold;

    document.documentElement.style.setProperty('--mc',  this.metal.color);
    document.documentElement.style.setProperty('--mcl', this.metal.colorLight);

    try {
      // Parallel: all data fetched together
      await Promise.all([
        this.fetchLatestRates(),
        this.fetchHistoricalRange(365),
        this.fetchStates(),
        this.fetchJewellers(),
        this.fetchTaxes(),
        this.fetchCategoryArticles(),
        this.fetchAllCities(),
      ]);
      this.render();
      this.updatePageMeta();
    } catch (err) {
      console.error(err);
      this.mainEl.innerHTML = `<div class="rp-error">
        <i class="fa fa-exclamation-circle"></i>
        <h2>Could not load rate data</h2>
        <p>${err.message}</p>
        <a href="/" class="rp-btn">Go to Homepage</a>
      </div>`;
    }
  }

  // ── API ──────────────────────────────────────────────────────────────────────

  /**
   * Latest rates: fetch the last 4 records WITH populate=* (1 API call, tiny payload)
   * and filter client-side by metal.name.
   * (Strapi v5 deep relation filter is broken for oneToOne — silently returns all records.)
   */
  async fetchLatestRates() {
    const url = getApiUrl(`/daily-rates?sort=date:desc&pagination[limit]=4&populate=*`);
    const res  = await fetch(url);
    const json = await res.json();
    const mine = (json.data || []).filter(r => r.metal?.name === this.metal.name);

    const byDate = {};
    mine.forEach(r => { if (!byDate[r.date]) byDate[r.date] = r; });
    const dates = Object.keys(byDate).sort().reverse();
    this.todayRate = byDate[dates[0]] || null;
    this.yestRate  = byDate[dates[1]] || null;
  }

  /**
   * Historical rates: fetch WITHOUT populate (lean payload).
   * For each date there are exactly 2 records (one gold, one silver).
   * We group by date and pick using buyingRate sort:
   *   - Gold (per 10g) is ALWAYS the lower-priced record in INR.
   *   - Silver (per kg) is ALWAYS the higher-priced record in INR.
   * This is validated by the seeded data across the full 2016-2026 range.
   * Only fetch the range needed for the current activeRange button (lazy-load).
   */
  async fetchHistoricalRange(days) {
    const fromDate = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];

    // Return from cache if already loaded far enough back
    if (this.allRates.length > 0 && this.allRates[0].date <= fromDate) return;

    this.allRates = [];
    let page = 1, hasMore = true;

    while (hasMore) {
      const url = getApiUrl(
        `/daily-rates?filters[date][$gte]=${fromDate}` +
        `&sort=date:asc&pagination[page]=${page}&pagination[pageSize]=100`
      );
      const res  = await fetch(url);
      const json = await res.json();
      const rows = json.data || [];

      // Group this page by date, pick the correct metal by price rank
      const byDate = {};
      rows.forEach(r => {
        if (!byDate[r.date]) byDate[r.date] = [];
        byDate[r.date].push(r);
      });

      Object.keys(byDate).sort().forEach(date => {
        const recs = byDate[date].sort((a, b) => a.buyingRate - b.buyingRate);
        // Gold = lowest price (per 10g); Silver = highest price (per kg)
        const rec = this.metal.name === 'Gold' ? recs[0] : recs[recs.length - 1];
        if (rec) this.allRates.push({ date, buyingRate: parseFloat(rec.buyingRate) });
      });

      const pag = json.meta?.pagination;
      hasMore = pag ? page < pag.pageCount : false;
      page++;
    }

    // Ensure chronological order
    this.allRates.sort((a, b) => a.date.localeCompare(b.date));
  }

  rangeDays() {
    return { '1W': 7, '1M': 30, '3M': 90, '1Y': 365, '3Y': 1095, '5Y': 1825 }[this.activeRange] || 365;
  }

  async fetchStates() {
    try {
      const url = getApiUrl('/states?sort=name:asc&pagination[pageSize]=100');
      const res  = await fetch(url);
      if (!res.ok) { this.states = []; return; }
      const json = await res.json();
      this.states = (json.data || []).map(s => s.name || s.attributes?.name).filter(Boolean);
    } catch { this.states = []; }
  }

  async fetchTaxes() {
    try {
      const url = getApiUrl(
        `/metal-taxes?filters[metal][name][$eq]=${this.metal.name}` +
        `&filters[isActive][$eq]=true&sort=displayOrder:asc` +
        `&pagination[pageSize]=20&populate[metal]=true`
      );
      const res  = await fetch(url);
      if (!res.ok) { this.taxes = []; return; }
      const json = await res.json();
      // Filter client-side too (Strapi v5 deep filter may not work for manyToOne)
      this.taxes = (json.data || []).filter(t =>
        !t.metal || t.metal.name === this.metal.name
      );
    } catch { this.taxes = []; }
  }

  async fetchCategoryArticles() {
    try {
      const catSlug = this.metal.name === 'Gold' ? 'gold-rate' : 'silver-rate';
      const url = getApiUrl(
        `/articles?filters[category][slug][$eq]=${catSlug}` +
        `&sort=publishedAt:desc&pagination[limit]=10` +
        `&populate[image]=true&populate[category]=true&populate[author][populate][photo]=true`
      );
      const res  = await fetch(url);
      if (!res.ok) { this.articles = []; return; }
      const json = await res.json();
      this.articles = json.data || [];
    } catch { this.articles = []; }
  }

  async fetchAllCities() {
    try {
      const url = getApiUrl(`/cities?sort=name:asc&pagination[pageSize]=200&fields[0]=name&fields[1]=slug`);
      const res  = await fetch(url);
      if (!res.ok) { this.cities = []; return; }
      const json = await res.json();
      this.cities = json.data || [];
    } catch { this.cities = []; }
  }

  async fetchJewellers() {
    try {
      const url = getApiUrl(
        `/jewellers?filters[isActive][$eq]=true&sort[0]=order:asc&sort[1]=name:asc` +
        `&pagination[pageSize]=20&populate[logo]=true&populate[metalUrls][populate][metal]=true`
      );
      const res  = await fetch(url);
      if (!res.ok) { this.jewellers = []; return; }
      const json = await res.json();
      this.jewellers = json.data || [];
    } catch { this.jewellers = []; }
  }

  // Pick the best URL for the current metal from a jeweller's metalUrls array
  jewellерUrl(jeweller) {
    const metalUrls = jeweller.metalUrls || [];
    // Try to find a URL specific to this metal
    const match = metalUrls.find(mu => mu.metal?.name === this.metal.name);
    if (match) return match.url;
    // Fall back to first URL, then website
    if (metalUrls.length > 0) return metalUrls[0].url;
    return jeweller.website || null;
  }

  async fetchCitiesForState(stateName) {
    try {
      const url = getApiUrl(
        `/cities?filters[state][name][$eq]=${encodeURIComponent(stateName)}` +
        `&sort=name:asc&pagination[pageSize]=100`
      );
      const res  = await fetch(url);
      if (!res.ok) return [];
      const json = await res.json();
      return (json.data || []).map(c => c.name || c.attributes?.name).filter(Boolean);
    } catch { return []; }
  }

  // ── Formatters ───────────────────────────────────────────────────────────────
  fmt(n) {
    return '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  }

  changeHtml(today, yest) {
    if (!today || !yest || yest === 0) return '';
    const diff = today - yest;
    const pct  = ((diff / yest) * 100).toFixed(2);
    const cls  = diff >= 0 ? 'rp-up' : 'rp-dn';
    const icon = diff >= 0 ? '▲' : '▼';
    const sign = diff >= 0 ? '+' : '';
    return `<span class="${cls}">${icon} ${sign}${this.fmt(diff)} (${sign}${pct}%) </span>`;
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  render() {
    const mc         = this.metal;
    const base       = parseFloat(this.todayRate?.buyingRate || 0);
    const yestBase   = parseFloat(this.yestRate?.buyingRate  || 0);
    const ap         = mc.purities[this.activePurityIdx];
    const dispPrice  = Math.round(base * ap.ratio);

    const dateStr = this.todayRate?.date
      ? new Date(this.todayRate.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
      : '—';

    // ── Hero (full-width slot) ──
    const purityTabs = mc.purities.map((p, i) => `
      <button class="rp-purity-tab ${i === 0 ? 'active' : ''}" data-idx="${i}">
        ${p.label}<span>${p.desc}</span>
      </button>`).join('');

    this.heroSlot.innerHTML = `
      <div class="rp-hero">
        <div class="container">
          <div class="rp-hero-top">
            <div class="rp-hero-left">
              <span class="rp-metal-icon">${mc.icon}</span>
              <div>
                <h1 class="rp-title">${mc.name} Rate Today</h1>
                <p class="rp-date"><i class="fa fa-clock-o"></i>  ${dateStr}</p>
              </div>
            </div>
            <div class="rp-hero-right">
              <div class="rp-price-main" id="rp-price-main">${base ? this.fmt(dispPrice) : '—'}</div>
              <div class="rp-price-unit" id="rp-price-unit">per ${mc.unitLabel} · ${ap.label}</div>
              <div class="rp-change" id="rp-change">${this.changeHtml(base, yestBase)}</div>
            </div>
          </div>
          <div class="rp-purity-tabs" id="rp-purity-tabs">${purityTabs}</div>
        </div>
      </div>`;

    // ── Price Table ──
    const tableHeaders = mc.weights.map(w => `<th>${w.label}</th>`).join('');
    const tableRows    = mc.purities.map(p =>
      `<tr>
        <td class="rp-table-purity">${p.label} <small>${p.desc}</small></td>
        ${mc.weights.map(w => `<td>${base ? this.fmt(Math.round(base * p.ratio * w.mult)) : '—'}</td>`).join('')}
      </tr>`
    ).join('');

    // ── State dropdown ──
    const stateOpts = this.states.length
      ? this.states.map(s => `<option value="${s}">${s}</option>`).join('')
      : '<option disabled>No states loaded — enable public access in Strapi Admin</option>';

    this.mainEl.innerHTML = `

      <!-- Section 1 (default bg): Check Rate by City | Popular Jewellers -->
      <div class="rp-section">
        <div class="container">
          <div class="rp-loc-tax-row">

            <div class="rp-card rp-location-card">
              <h2 class="rp-section-title"><i class="fa fa-map-marker"></i> Check Rate by City</h2>
              <div class="rp-location-selects">
                <div class="rp-select-wrap">
                  <label>State</label>
                  <select class="rp-select" id="rp-state-select">
                    <option value="">All India Average</option>
                    ${stateOpts}
                  </select>
                </div>
                <div class="rp-select-wrap">
                  <label>City</label>
                  <select class="rp-select" id="rp-city-select" disabled>
                    <option value="">Select State first</option>
                  </select>
                </div>
              </div>
              <div class="rp-location-result" id="rp-location-result">
                <div class="rp-loc-price">${base ? this.fmt(dispPrice) : '—'}</div>
                <div class="rp-loc-label">All India · ${ap.label} · per ${mc.unitLabel}</div>
              </div>
              <p class="rp-location-note"><i class="fa fa-info-circle"></i> City-specific rates are coming soon. Currently showing national average.</p>
            </div>

            <div class="rp-card rp-jewellers-col">
              <h2 class="rp-section-title">Buy from Popular Jewellers</h2>
              <p class="rp-jewellers-desc">Check live ${mc.name} rates from trusted jewellers.</p>
              <div class="rp-jewellers-list">${this.renderJewellers()}</div>
            </div>

          </div>
        </div>
      </div>

      <!-- Section 2 (alt bg): Price by Weight | Taxes -->
      <div class="rp-section rp-section--alt">
        <div class="container">
          <div class="rp-table-jeweller-row">

            <div class="rp-card rp-table-col">
              <h2 class="rp-section-title">${mc.name} Price by Weight — ${dateStr}</h2>
              <div class="rp-table-wrap">
                <table class="rp-price-table">
                  <thead><tr><th>Purity</th>${tableHeaders}</tr></thead>
                  <tbody>${tableRows}</tbody>
                </table>
              </div>
              <p class="rp-table-note"><i class="fa fa-info-circle"></i> Rates are indicative. Actual prices may vary at local jewellers due to taxes and making charges.</p>
            </div>

            <div class="rp-card rp-tax-card">
              <h2 class="rp-section-title">🧾 Taxes on ${mc.name} in India</h2>
              <div class="rp-tax-list">${this.renderTaxInfo()}</div>
              <p class="rp-tax-note"><i class="fa fa-info-circle"></i> Tax rates are as per latest government notification. Consult a tax advisor for personal guidance.</p>
            </div>

          </div>
        </div>
      </div>

      <!-- Section 3 (default bg): Historical Chart -->
      <div class="rp-section">
        <div class="container">
          <div class="rp-card rp-chart-card">
            <div class="rp-chart-header">
              <h2 class="rp-section-title">Historical Price Trend</h2>
              <div class="rp-range-btns">
                ${['1W','1M','3M','1Y','3Y','5Y'].map(r =>
                  `<button class="rp-range-btn ${r === '1Y' ? 'active' : ''}" data-range="${r}">${r}</button>`
                ).join('')}
              </div>
            </div>
            <div class="rp-chart-stats" id="rp-chart-stats"></div>
            <div class="rp-chart-wrap"><canvas id="rp-chart"></canvas></div>
          </div>
        </div>
      </div>

      <!-- Section 4 (alt bg): Articles carousel -->
      <div class="rp-section rp-section--alt">
        <div class="container">
          ${this.renderArticlesSection()}
        </div>
      </div>

      <!-- Section 5 (default bg): Cities -->
      <div class="rp-section">
        <div class="container">
          ${this.renderCitiesSection()}
        </div>
      </div>
    `;

    this.bindPurityTabs();
    this.bindRangeButtons();
    this.bindLocationSelectors();
    setTimeout(() => this.renderChart(), 100);
  }

  // ── Articles (Layout A — matches homepage style) ──────────────────────────────
  renderArticlesSection() {
    if (!this.articles.length) return '';
    const base = window.API_CONFIG?.BASE_URL || '';
    const mc   = this.metal;

    const cards = this.articles.map(a => {
      const imgUrl  = a.image?.url ? `${base}${a.image.url}` : null;
      const excerpt = a.excerpt || '';
      const author  = a.author;
      const photoUrl = author?.photo?.url ? `${base}${author.photo.url}` : null;
      const initial  = (author?.name || 'A').charAt(0).toUpperCase();
      const avatar   = photoUrl
        ? `<img src="${photoUrl}" alt="${author.name}" class="rc-author-avatar">`
        : `<span class="rc-author-initial">${initial}</span>`;
      const authorHtml = author
        ? `<div class="rc-author">${avatar}<span class="rc-author-name">${author.name}</span></div>`
        : '';
      const artUrl = `/${a.category?.slug || 'article'}/${a.slug}`;

      return `
        <a href="${artUrl}" class="carousel-card rca-card">
          <div class="rca-card-image">
            ${imgUrl ? `<img src="${imgUrl}" alt="${a.title}" loading="lazy">` : `<div class="rca-no-img"></div>`}
          </div>
          <h4 class="rca-card-title">${a.title}</h4>
          ${excerpt ? `<p class="rca-card-excerpt">${excerpt}</p>` : ''}
          ${authorHtml}
        </a>`;
    }).join('');

    return `
      <div class="hp-section-header">
        <h3 class="hp-section-title">
          <a href="/${mc.name.toLowerCase()}-rate">${mc.name.toUpperCase()} RATES NEWS &amp; UPDATES</a>
        </h3>
      </div>
      <div class="hp-carousel">${cards}</div>`;
  }

  // ── Cities Grid ───────────────────────────────────────────────────────────────
  renderCitiesSection() {
    if (!this.cities.length) return '';
    const metal    = this.metal.name.toLowerCase();
    const basePath = `/${metal}-rate`;
    const PER_ROW  = 10;

    const items = this.cities.map(c => {
      const slug     = c.slug || c.name.toLowerCase().replace(/\s+/g, '-');
      const isActive = this.citySlug === slug;
      return `<a href="${basePath}/${slug}" class="rp-city-link${isActive ? ' rp-city-link--active' : ''}">${c.name.toUpperCase()}</a>`;
    });

    // Chunk into rows of PER_ROW
    const rows = [];
    for (let i = 0; i < items.length; i += PER_ROW) {
      rows.push(items.slice(i, i + PER_ROW).join('<span class="rp-city-pipe">|</span>'));
    }
    const rowsHtml = rows.map(r => `<div class="rp-cities-row">${r}</div>`).join('');

    return `
      <div class="rp-cities-section">
        <div class="rp-cities-header">
          <span class="rp-cities-label"><i class="fa fa-map-marker"></i> ${this.metal.name.toUpperCase()} RATE BY CITY</span>
        </div>
        ${rowsHtml}
      </div>`;
  }

  // ── Jewellers ─────────────────────────────────────────────────────────────────
  renderJewellers() {
    if (!this.jewellers.length) {
      return `<p class="rp-jewellers-empty">No jeweller listings yet.</p>`;
    }
    const base    = window.API_CONFIG?.BASE_URL || '';
    const mc      = this.metal;

    return this.jewellers.map(j => {
      const logoUrl = j.logo?.url ? `${base}${j.logo.url}` : null;
      const link    = this.jewellерUrl(j);
      const initial = j.name.charAt(0).toUpperCase();

      const logoInner = logoUrl
        ? `<img src="${logoUrl}" alt="${j.name}" class="rp-jwl-logo" loading="lazy">`
        : `<div class="rp-jwl-initial">${initial}</div>`;

      const logoHtml = j.website
        ? `<a href="${j.website}" target="_blank" rel="noopener noreferrer" class="rp-jwl-img-wrap" title="Visit ${j.name}">${logoInner}</a>`
        : `<div class="rp-jwl-img-wrap">${logoInner}</div>`;

      const scopeBadge = j.scope !== 'national'
        ? `<span class="rp-jwl-badge">${j.scope}</span>` : '';

      const btnHtml = link
        ? `<a href="${link}" target="_blank" rel="noopener noreferrer" class="rp-jwl-btn">
            View ${mc.name} Prices <i class="fa fa-external-link"></i>
           </a>`
        : `<span class="rp-jwl-btn rp-jwl-btn--na">No link available</span>`;

      return `
        <div class="rp-jwl-card">
          ${logoHtml}
          <div class="rp-jwl-info">
            <div class="rp-jwl-name">${j.name} ${scopeBadge}</div>
            ${btnHtml}
          </div>
        </div>`;
    }).join('');
  }

  // ── Tax Info ──────────────────────────────────────────────────────────────────
  renderTaxInfo() {
    if (!this.taxes.length) {
      return `<p class="rp-jewellers-empty">No tax data available.</p>`;
    }

    const govLabel = { central: 'Central', state: 'State', both: 'Central + State' };

    return this.taxes.map(t => `
      <div class="rp-tax-row">
        <div class="rp-tax-label">
          ${t.taxName}
          <span class="rp-tax-gov rp-tax-gov--${t.governmentLevel}">${govLabel[t.governmentLevel] || ''}</span>
        </div>
        <div class="rp-tax-right">
          <span class="rp-tax-rate">${t.taxValue}</span>
        </div>
      </div>`).join('');
  }

  // ── Purity Tabs ──────────────────────────────────────────────────────────────
  bindPurityTabs() {
    document.querySelectorAll('.rp-purity-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        this.activePurityIdx = parseInt(btn.dataset.idx);
        document.querySelectorAll('.rp-purity-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const mc    = this.metal;
        const p     = mc.purities[this.activePurityIdx];
        const base  = parseFloat(this.todayRate?.buyingRate || 0);
        const price = Math.round(base * p.ratio);

        document.getElementById('rp-price-main').textContent = this.fmt(price);
        document.getElementById('rp-price-unit').textContent = `per ${mc.unitLabel} · ${p.label}`;

        const locPrice = document.querySelector('.rp-loc-price');
        const locLabel = document.querySelector('.rp-loc-label');
        if (locPrice) locPrice.textContent = this.fmt(price);
        if (locLabel) locLabel.textContent = `All India · ${p.label} · per ${mc.unitLabel}`;
      });
    });
  }

  // ── Chart ─────────────────────────────────────────────────────────────────────
  filteredRates() {
    const from = new Date(Date.now() - this.rangeDays() * 86400000);
    return this.allRates.filter(r => new Date(r.date) >= from);
  }

  sampleData(rates, maxPts = 300) {
    if (rates.length <= maxPts) return rates;
    const step = Math.ceil(rates.length / maxPts);
    return rates.filter((_, i) => i % step === 0 || i === rates.length - 1);
  }

  renderChart() {
    const ctx = document.getElementById('rp-chart');
    if (!ctx) return;

    const mc    = this.metal;
    const rates = this.sampleData(this.filteredRates());

    if (rates.length === 0) {
      ctx.closest('.rp-chart-wrap').innerHTML =
        '<p class="rp-no-data">No historical data available for this period.</p>';
      return;
    }

    const labels = rates.map(r => {
      const d = new Date(r.date);
      if (['1W','1M','3M'].includes(this.activeRange))
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      return d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    });
    const values = rates.map(r => r.buyingRate);

    const min  = Math.min(...values);
    const max  = Math.max(...values);
    const diff = values[values.length - 1] - values[0];
    const pct  = ((diff / values[0]) * 100).toFixed(1);
    const statsEl = document.getElementById('rp-chart-stats');
    if (statsEl) {
      statsEl.innerHTML = `
        <span>High: <strong>${this.fmt(max)}</strong></span>
        <span>Low: <strong>${this.fmt(min)}</strong></span>
        <span>Period Change: <strong class="${diff >= 0 ? 'rp-up' : 'rp-dn'}">${diff >= 0 ? '+' : ''}${pct}%</strong></span>
      `;
    }

    if (this.chart) this.chart.destroy();

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data: values,
          borderColor: mc.color,
          backgroundColor: (c) => {
            const g = c.chart.ctx.createLinearGradient(0, 0, 0, 300);
            g.addColorStop(0, mc.colorLight);
            g.addColorStop(1, 'rgba(255,255,255,0)');
            return g;
          },
          borderWidth: 2.5,
          fill: true,
          tension: 0.3,
          pointRadius: rates.length > 60 ? 0 : 3,
          pointHoverRadius: 5,
          pointBackgroundColor: mc.color,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1a2332',
            titleColor: '#ccc',
            bodyColor: '#fff',
            padding: 12,
            callbacks: {
              label: ctx2 => ` ${this.fmt(ctx2.raw)} per ${mc.unitLabel}`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { maxTicksLimit: 8, color: '#888', font: { size: 11 } }
          },
          y: {
            beginAtZero: false,
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: {
              color: '#888',
              font: { size: 11 },
              callback: v => v >= 100000 ? '₹' + (v/100000).toFixed(1) + 'L'
                          : v >= 1000   ? '₹' + (v/1000).toFixed(0)   + 'K'
                          : '₹' + v
            }
          }
        }
      }
    });
  }

  bindRangeButtons() {
    document.querySelectorAll('.rp-range-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        this.activeRange = btn.dataset.range;
        document.querySelectorAll('.rp-range-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const days = this.rangeDays();
        // Lazy-load if we don't have enough history yet
        const haveFrom = this.allRates.length > 0
          ? new Date(this.allRates[0].date)
          : new Date();
        const needFrom = new Date(Date.now() - days * 86400000);
        if (needFrom < haveFrom) {
          btn.textContent = '…';
          await this.fetchHistoricalRange(days);
          btn.textContent = this.activeRange;
        }

        this.renderChart();
      });
    });
  }

  // ── Location ──────────────────────────────────────────────────────────────────
  bindLocationSelectors() {
    const stateEl  = document.getElementById('rp-state-select');
    const cityEl   = document.getElementById('rp-city-select');
    const resultEl = document.getElementById('rp-location-result');
    if (!stateEl) return;

    stateEl.addEventListener('change', async () => {
      const stateName = stateEl.value;
      if (!stateName) {
        cityEl.innerHTML = '<option>Select State first</option>';
        cityEl.disabled  = true;
        return;
      }

      cityEl.innerHTML = '<option>Loading…</option>';
      cityEl.disabled  = true;

      const cities = await this.fetchCitiesForState(stateName);
      if (cities.length > 0) {
        cityEl.innerHTML = `<option value="">All cities in ${stateName}</option>` +
          cities.map(c => `<option value="${c}">${c}</option>`).join('');
        cityEl.disabled = false;
      } else {
        cityEl.innerHTML = '<option>No cities found</option>';
      }

      if (resultEl) {
        const mc    = this.metal;
        const base  = parseFloat(this.todayRate?.buyingRate || 0);
        const p     = mc.purities[this.activePurityIdx];
        resultEl.innerHTML = `
          <div class="rp-loc-price">${this.fmt(Math.round(base * p.ratio))}</div>
          <div class="rp-loc-label">${stateName} · ${p.label} · per ${mc.unitLabel}</div>
          <div class="rp-loc-coming">City rates coming soon</div>`;
      }
    });
  }

  // ── Page Meta ─────────────────────────────────────────────────────────────────
  updatePageMeta() {
    const mc       = this.metal;
    const price    = this.todayRate ? this.fmt(parseFloat(this.todayRate.buyingRate)) : '';
    const cityPart = this.cityName ? ` in ${this.cityName}` : ' in India';
    const title    = `${mc.name} Rate Today${cityPart} ${price} | FiscalColumn`;
    const desc     = `Today's ${mc.name} rate${cityPart}: ${price} per ${mc.unitLabel}. Purity-wise prices (${mc.purities.map(p=>p.label).join(', ')}), historical chart, and city rates.`;

    document.title = title;
    document.getElementById('meta-description')?.setAttribute('content', desc);
    document.getElementById('og-title')?.setAttribute('content', title);
    document.getElementById('og-description')?.setAttribute('content', desc);
    document.getElementById('twitter-title')?.setAttribute('content', title);
    document.getElementById('twitter-description')?.setAttribute('content', desc);

    const metalBase = `/${mc.name.toLowerCase()}-rate`;
    const canonical = this.citySlug
      ? `${window.location.origin}${metalBase}/${this.citySlug}`
      : `${window.location.origin}${metalBase}`;
    document.getElementById('canonical-url')?.setAttribute('href', canonical);
    document.getElementById('og-url')?.setAttribute('content', canonical);

    // Update hero title and date line if city-specific
    if (this.cityName) {
      const titleEl = document.querySelector('.rp-title');
      if (titleEl) titleEl.textContent = `${mc.name} Rate Today in ${this.cityName}`;
    }

    const catEl  = document.getElementById('breadcrumb-category');
    const pageEl = document.getElementById('breadcrumb-page');
    if (catEl)  { catEl.textContent = `${mc.name} Rates`; catEl.href = metalBase; }
    if (pageEl) pageEl.textContent = this.cityName
      ? `${mc.name} Rate in ${this.cityName}`
      : `${mc.name} Rate Today`;
  }
}

document.addEventListener('DOMContentLoaded', () => new RatePageManager().init());

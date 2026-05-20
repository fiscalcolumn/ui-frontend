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
      { label: '1 Gram',   mult: 0.001   },
      { label: '10 Gram',  mult: 0.01    },
      { label: '100 Gram', mult: 0.1     },
      { label: '1 Tola',   mult: 0.01166 },
      { label: '1 Ounce',  mult: 0.0311  },
    ],
  },
};

const POPULAR_CITIES = [
  { name: 'Mumbai',     slug: 'mumbai'     },
  { name: 'New Delhi',  slug: 'new-delhi'  },
  { name: 'Bengaluru',  slug: 'bengaluru'  },
  { name: 'Chennai',    slug: 'chennai'    },
  { name: 'Hyderabad',  slug: 'hyderabad'  },
  { name: 'Kolkata',    slug: 'kolkata'    },
  { name: 'Pune',       slug: 'pune'       },
  { name: 'Ahmedabad',  slug: 'ahmedabad'  },
  { name: 'Jaipur',     slug: 'jaipur'     },
  { name: 'Lucknow',    slug: 'lucknow'    },
  { name: 'Chandigarh', slug: 'chandigarh' },
  { name: 'Surat',      slug: 'surat'      },
];

// Escapes a value for safe insertion into HTML text content and attributes
const esc = s => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

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
    this.otherMetalRate  = null;
    // Detect city slug from URL: /gold-rate-today/mumbai → 'mumbai'
    const urlParts = window.location.pathname.split('/').filter(Boolean);
    this.citySlug  = urlParts.length >= 2 ? urlParts[1] : null;
    this.cityName  = this.citySlug
      ? this.citySlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      : null;
  }

  get isGold() { return this.metal.name === 'Gold'; }

  // ── Boot ────────────────────────────────────────────────────────────────────
  async init() {
    this.metal = window.location.pathname.toLowerCase().includes('silver')
      ? METAL_CONFIG.silver
      : METAL_CONFIG.gold;

    document.documentElement.style.setProperty('--mc',  this.metal.color);
    document.documentElement.style.setProperty('--mcl', this.metal.colorLight);

    try {
      // Parallel: all data fetched together
      await Promise.all([
        this.fetchLatestRates(),
        this.fetchOtherMetalRate(),
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
        <p>${esc(err.message)}</p>
        <a href="/" class="rp-btn">Go to Homepage</a>
      </div>`;
    }
  }

  // ── API helpers ──────────────────────────────────────────────────────────────

  // Fetches a single Strapi endpoint, returning json.data or fallback on any error.
  async apiFetch(path, fallback = []) {
    try {
      const res = await fetch(getApiUrl(path));
      if (!res.ok) return fallback;
      const json = await res.json();
      return json.data ?? fallback;
    } catch { return fallback; }
  }

  // Walks all pagination pages for a given base path, returning a flat array of all records.
  async fetchAllPages(basePath) {
    const allRows = [];
    let page = 1, hasMore = true;
    while (hasMore) {
      const res  = await fetch(getApiUrl(`${basePath}&pagination[page]=${page}&pagination[pageSize]=100`));
      const json = await res.json();
      allRows.push(...(json.data || []));
      const pag = json.meta?.pagination;
      hasMore = pag ? page < pag.pageCount : false;
      page++;
    }
    return allRows;
  }

  // ── API ──────────────────────────────────────────────────────────────────────

  /**
   * Latest rates: fetch the last 4 records WITH populate=* (1 API call, tiny payload)
   * and filter client-side by metal.name.
   * (Strapi v5 deep relation filter is broken for oneToOne — silently returns all records.)
   */
  async fetchLatestRates() {
    const url  = getApiUrl(`/daily-rates?sort=date:desc&pagination[limit]=4&populate=*`);
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
   * Fetch the latest rate for the OTHER metal (needed for the Gold:Silver ratio widget).
   */
  async fetchOtherMetalRate() {
    const otherName = this.isGold ? 'Silver' : 'Gold';
    try {
      const url  = getApiUrl(`/daily-rates?sort=date:desc&pagination[limit]=4&populate=*`);
      const res  = await fetch(url);
      const json = await res.json();
      const mine = (json.data || []).filter(r => r.metal?.name === otherName);
      const byDate = {};
      mine.forEach(r => { if (!byDate[r.date]) byDate[r.date] = r; });
      const dates = Object.keys(byDate).sort().reverse();
      this.otherMetalRate = byDate[dates[0]] || null;
    } catch { this.otherMetalRate = null; }
  }

  /**
   * Historical rates: fetch WITHOUT populate (lean payload).
   * For each date there are exactly 2 records (one gold, one silver).
   * We group by date and pick using buyingRate sort:
   *   - Gold (per 10g) is ALWAYS the lower-priced record in INR.
   *   - Silver (per kg) is ALWAYS the higher-priced record in INR.
   * This is validated by the seeded data across the full 2016-2026 range.
   */
  async fetchHistoricalRange(days) {
    const fromDate = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
    if (this.allRates.length > 0 && this.allRates[0].date <= fromDate) return;

    const rows = await this.fetchAllPages(
      `/daily-rates?filters[date][$gte]=${fromDate}&sort=date:asc`
    );

    // Group by date, pick correct metal by price rank
    const byDate = {};
    rows.forEach(r => { (byDate[r.date] ??= []).push(r); });

    this.allRates = Object.keys(byDate).sort().map(date => {
      const sorted = byDate[date].sort((a, b) => a.buyingRate - b.buyingRate);
      const rec    = this.isGold ? sorted[0] : sorted[sorted.length - 1];
      return rec ? { date, buyingRate: parseFloat(rec.buyingRate) } : null;
    }).filter(Boolean);
  }

  rangeDays() {
    return { '1W': 7, '1M': 30, '3M': 90, '1Y': 365, '3Y': 1095, '5Y': 1825 }[this.activeRange] || 365;
  }

  async fetchStates() {
    const data  = await this.apiFetch('/states?sort=name:asc&pagination[pageSize]=100');
    this.states = data.map(s => s.name || s.attributes?.name).filter(Boolean);
  }

  async fetchTaxes() {
    const data  = await this.apiFetch(
      `/metal-taxes?filters[metal][name][$eq]=${this.metal.name}` +
      `&filters[isActive][$eq]=true&sort=displayOrder:asc` +
      `&pagination[pageSize]=20&populate[metal]=true`
    );
    // Filter client-side too (Strapi v5 deep filter may not work for manyToOne)
    this.taxes = data.filter(t => !t.metal || t.metal.name === this.metal.name);
  }

  async fetchCategoryArticles() {
    const catSlug    = this.isGold ? 'gold-rate' : 'silver-rate';
    this.articles    = await this.apiFetch(
      `/articles?filters[category][slug][$eq]=${catSlug}` +
      `&sort=publishedAt:desc&pagination[limit]=10` +
      `&populate[image]=true&populate[category]=true&populate[author][populate][photo]=true`
    );
  }

  async fetchAllCities() {
    this.cities = await this.apiFetch(
      `/cities?sort=name:asc&pagination[pageSize]=200&fields[0]=name&fields[1]=slug`
    );
  }

  async fetchJewellers() {
    this.jewellers = await this.apiFetch(
      `/jewellers?filters[isActive][$eq]=true&sort[0]=order:asc&sort[1]=name:asc` +
      `&pagination[pageSize]=20&populate[logo]=true&populate[metalUrls][populate][metal]=true`
    );
  }

  async fetchCitiesForState(stateName) {
    const data = await this.apiFetch(
      `/cities?filters[state][name][$eq]=${encodeURIComponent(stateName)}` +
      `&sort=name:asc&pagination[pageSize]=100`
    );
    return data.map(c => c.name || c.attributes?.name).filter(Boolean);
  }

  // Pick the best URL for the current metal from a jeweller's metalUrls array
  jewellerUrl(jeweller) {
    const metalUrls = jeweller.metalUrls || [];
    const match = metalUrls.find(mu => mu.metal?.name === this.metal.name);
    if (match) return match.url;
    if (metalUrls.length > 0) return metalUrls[0].url;
    return jeweller.website || null;
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
    const mc        = this.metal;
    const base      = parseFloat(this.todayRate?.buyingRate || 0);
    const yestBase  = parseFloat(this.yestRate?.buyingRate  || 0);
    const ap        = mc.purities[this.activePurityIdx];
    const dispPrice = Math.round(base * ap.ratio);

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

    this.mainEl.innerHTML = `

      <!-- Section 1: Popular Jewellers | Taxes -->
      <div class="rp-section">
        <div class="container">
          <div class="rp-loc-tax-row">

            <div class="rp-card rp-jewellers-col">
              <h2 class="rp-section-title">Buy from Popular Jewellers</h2>
              <p class="rp-jewellers-desc">Check live ${mc.name} rates from trusted jewellers.</p>
              <div class="rp-jewellers-list">${this.renderJewellers()}</div>
            </div>

            <div class="rp-card rp-tax-card">
              <h2 class="rp-section-title">Taxes on ${mc.name} in India</h2>
              <div class="rp-tax-list">${this.renderTaxInfo()}</div>
              <p class="rp-tax-note"><i class="fa fa-info-circle"></i> Tax rates are as per latest government notification. Consult a tax advisor for personal guidance.</p>
              <a href="/${mc.name.toLowerCase()}-taxes" class="rp-tax-learn-more">
                See full breakdown &amp; cost calculator <i class="fa fa-arrow-right"></i>
              </a>
            </div>

          </div>
        </div>
      </div>

      <!-- Section 2 (alt bg): Gold:Silver Ratio | Purity Calculator -->
      <div class="rp-section rp-section--alt">
        <div class="container">
          <div class="rp-tools-row">

            <div class="rp-card rp-ratio-col">
              <h2 class="rp-section-title">Gold vs Silver — Today's Comparison</h2>
              ${this.renderRatioWidget()}
            </div>

            <div class="rp-card rp-calc-col">
              <h2 class="rp-section-title">How much will it cost?</h2>
              ${this.renderPurityCalculator()}
            </div>

          </div>
        </div>
      </div>

      <!-- Section 3: Historical Chart -->
      <div class="rp-section">
        <div class="container">
          <h2 class="rp-section-title">Historical Price Trend</h2>
          <div class="rp-chart-layout">

            <!-- Left: Stats Panel -->
            <div class="rp-chart-stats-panel" id="rp-chart-stats">
              <div class="rp-csp-loading">Loading…</div>
            </div>

            <!-- Right: Range buttons + canvas -->
            <div class="rp-chart-right">
              <div class="rp-range-btns">
                ${['1W','1M','3M','1Y','3Y','5Y'].map(r =>
                  `<button class="rp-range-btn ${r === '1Y' ? 'active' : ''}" data-range="${r}">${r}</button>`
                ).join('')}
              </div>
              <div class="rp-chart-wrap"><canvas id="rp-chart"></canvas></div>
            </div>

          </div>
        </div>
      </div>

      <!-- Section 4 (alt bg): Price by Weight Table — full width -->
      <div class="rp-section rp-section--alt">
        <div class="container">
          <div class="rp-card">
            <h2 class="rp-section-title">${mc.name} Price by Weight — ${dateStr}</h2>
            <div class="rp-table-wrap">
              <table class="rp-price-table">
                <thead><tr><th>Purity</th>${tableHeaders}</tr></thead>
                <tbody>${tableRows}</tbody>
              </table>
            </div>
            <p class="rp-table-note"><i class="fa fa-info-circle"></i> Rates are indicative. Actual prices may vary due to taxes and making charges.</p>
            <p class="rp-table-note rp-table-note--conversions"><i class="fa fa-info-circle"></i>1 Tola = 11.664 g &nbsp;|&nbsp; 1 Troy Ounce = 31.103 g</p>
          </div>
        </div>
      </div>

      <!-- Section 5 (alt bg): Articles carousel — omitted if no articles loaded -->
      ${this.articles.length ? `
      <div class="rp-section rp-section--alt">
        <div class="container">
          ${this.renderArticlesSection()}
        </div>
      </div>` : ''}

      <!-- Section 6: City Finder -->
      <div class="rp-section">
        <div class="container">
          ${this.renderCityFinderSection()}
        </div>
      </div>
    `;

    this.bindEvents();
  }

  // ── Gold : Silver Ratio ───────────────────────────────────────────────────────
  renderRatioWidget() {
    const goldRate   = this.isGold ? this.todayRate   : this.otherMetalRate;
    const silverRate = this.isGold ? this.otherMetalRate : this.todayRate;

    if (!goldRate || !silverRate) {
      return `<p class="rp-jewellers-empty">Ratio data unavailable.</p>`;
    }

    const goldPerGram   = parseFloat(goldRate.buyingRate)   / 10;
    const silverPerGram = parseFloat(silverRate.buyingRate) / 1000;
    const ratio         = (goldPerGram / silverPerGram).toFixed(1);
    const ratioNum      = parseFloat(ratio);
    const ratioInt      = Math.round(ratioNum);

    // Track covers ratio range 50–120
    const pct = Math.min(100, Math.max(0, ((ratioNum - 50) / 70) * 100)).toFixed(1);

    let statusClass, signalLabel, signalClass, plainMeaning, investorNote;
    if (ratioNum < 65) {
      statusClass   = 'rp-ratio--low';
      signalLabel   = 'Silver is costly vs Gold';
      signalClass   = 'rp-ratio-signal--low';
      plainMeaning  = 'Silver is priced high relative to gold right now — it takes fewer grams of silver to match gold\'s value than usual.';
      investorNote  = 'Historically, when the ratio is this low, silver tends to become relatively cheaper over time.';
    } else if (ratioNum <= 85) {
      statusClass   = 'rp-ratio--normal';
      signalLabel   = 'Ratio is in normal range';
      signalClass   = 'rp-ratio-signal--normal';
      plainMeaning  = 'Gold and silver are priced roughly in line with their long-term historical relationship.';
      investorNote  = 'No strong signal either way. This is the typical range seen over the past decade.';
    } else {
      statusClass   = 'rp-ratio--high';
      signalLabel   = 'Silver is cheap vs Gold';
      signalClass   = 'rp-ratio-signal--high';
      plainMeaning  = 'Silver is priced low relative to gold right now — you need more grams of silver than usual to match the value of 1 gram of gold.';
      investorNote  = 'Historically, when the ratio is this high, silver has often caught up to gold over time.';
    }

    return `
      <div class="rp-ratio-widget ${statusClass}">

        <!-- Lead question -->
        <div class="rp-ratio-lead">
          <span class="rp-ratio-lead-q">How much silver equals 1 gram of gold today?</span>
          <div class="rp-ratio-answer">
            <span class="rp-ratio-number">${ratioInt}</span>
            <span class="rp-ratio-answer-unit">grams of silver</span>
          </div>
          <span class="rp-ratio-signal ${signalClass}">${signalLabel}</span>
        </div>

        <!-- Plain English explanation -->
        <p class="rp-ratio-plain">${plainMeaning}</p>

        <!-- Historical track -->
        <div class="rp-ratio-track-wrap">
          <div class="rp-ratio-track-header">
            <span class="rp-ratio-track-label">Where does today sit historically?</span>
            <span class="rp-ratio-track-ratio">Ratio: ${ratio}:1</span>
          </div>
          <div class="rp-ratio-track">
            <div class="rp-ratio-zone rp-ratio-zone--low"    style="width:21.4%"></div>
            <div class="rp-ratio-zone rp-ratio-zone--normal" style="width:28.6%"></div>
            <div class="rp-ratio-zone rp-ratio-zone--high"   style="width:50%"></div>
            <div class="rp-ratio-cursor" style="left:${pct}%"></div>
          </div>
          <div class="rp-ratio-track-labels">
            <span>50 <em>Silver costly</em></span>
            <span>65</span>
            <span>85</span>
            <span>120+ <em>Silver cheap</em></span>
          </div>
        </div>

        <!-- Investor note -->
        <div class="rp-ratio-investor-note">
          <i class="fa fa-lightbulb-o"></i> ${investorNote}
        </div>

        <!-- Prices -->
        <div class="rp-ratio-prices">
          <div class="rp-ratio-price-item">
            <span class="rp-ratio-price-label">Gold (24K)</span>
            <span class="rp-ratio-price-val">${this.fmt(Math.round(goldPerGram))}<small>/g</small></span>
          </div>
          <div class="rp-ratio-price-sep"></div>
          <div class="rp-ratio-price-item">
            <span class="rp-ratio-price-label">Silver (999)</span>
            <span class="rp-ratio-price-val">${this.fmt(Math.round(silverPerGram))}<small>/g</small></span>
          </div>
        </div>
      </div>`;
  }

  // ── Purity Price Calculator ───────────────────────────────────────────────────
  renderPurityCalculator() {
    const mc         = this.metal;
    const base       = parseFloat(this.todayRate?.buyingRate || 0);
    const perGram    = mc.name === 'Gold' ? base / 10 : base / 1000;
    const initPurity = mc.purities[0];
    const initRate   = base ? this.fmt(Math.round(perGram * initPurity.ratio)) : '—';
    const initPrice  = base ? this.fmt(Math.round(perGram * initPurity.ratio * 1)) : '—';

    const purityOpts = mc.purities.map((p, i) =>
      `<option value="${p.ratio}"${i === 0 ? ' selected' : ''}>${p.label} — ${p.desc}</option>`
    ).join('');

    const presets = [1, 2, 5, 10, 50, 100];

    return `
      <div class="rp-calc-widget">

        <div class="rp-calc-field">
          <label class="rp-calc-label">Purity</label>
          <select id="rp-calc-purity" class="rp-select">${purityOpts}</select>
        </div>

        <div class="rp-calc-field">
          <label class="rp-calc-label">Weight</label>
          <div class="rp-calc-preset-row">
            ${presets.map((w, i) =>
              `<button class="rp-calc-preset${i === 0 ? ' active' : ''}" data-weight="${w}">${w}g</button>`
            ).join('')}
          </div>
          <div class="rp-calc-input-wrap">
            <input type="number" id="rp-calc-weight" class="rp-calc-input"
                   value="1" min="0.01" step="0.5" placeholder="or enter custom">
            <span class="rp-calc-unit">g</span>
          </div>
        </div>

        <div class="rp-calc-output">
          <div class="rp-calc-formula" id="rp-calc-formula">1g × ${initRate}/g</div>
          <div class="rp-calc-price" id="rp-calc-price">${initPrice}</div>
          <div class="rp-calc-meta" id="rp-calc-meta">${initPurity.label} · buying rate</div>
        </div>

        <p class="rp-calc-note"><i class="fa fa-info-circle"></i> Based on today's buying rate. Actual price may vary.</p>
      </div>`;
  }

  // ── Articles ──────────────────────────────────────────────────────────────────
  renderArticlesSection() {
    if (!this.articles.length) return '';
    const base = window.API_CONFIG?.BASE_URL || '';
    const mc   = this.metal;

    const cards = this.articles.map(a => {
      const imgUrl   = a.image?.url ? `${base}${esc(a.image.url)}` : null;
      const author   = a.author;
      const photoUrl = author?.photo?.url ? `${base}${esc(author.photo.url)}` : null;
      const initial  = esc((author?.name || 'A').charAt(0).toUpperCase());
      const avatar   = photoUrl
        ? `<img loading="lazy" src="${photoUrl}" alt="${esc(author.name)}" class="rc-author-avatar">`
        : `<span class="rc-author-initial">${initial}</span>`;
      const authorHtml = author
        ? `<div class="rc-author">${avatar}<span class="rc-author-name">${esc(author.name)}</span></div>`
        : '';
      const artUrl = `/${esc(a.category?.slug || 'article')}/${esc(a.slug)}`;

      return `
        <a href="${artUrl}" class="carousel-card rca-card">
          <div class="rca-card-image">
            ${imgUrl ? `<img loading="lazy" src="${imgUrl}" alt="${esc(a.title)}">` : `<div class="rca-no-img"></div>`}
          </div>
          <h4 class="rca-card-title">${esc(a.title)}</h4>
          ${a.excerpt ? `<p class="rca-card-excerpt">${esc(a.excerpt)}</p>` : ''}
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

  // ── City Finder ───────────────────────────────────────────────────────────────
  renderCityFinderSection() {
    const metal    = this.metal.name.toLowerCase();
    const basePath = `/${metal}-rate-today`;

    const popularChips = POPULAR_CITIES.map(c => {
      const isActive = this.citySlug === c.slug;
      return `<a href="${basePath}/${c.slug}" class="rp-cgrid-item${isActive ? ' rp-cgrid-item--active' : ''}">${esc(c.name)}</a>`;
    }).join('');

    const stateOpts = this.states.length
      ? this.states.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join('')
      : '<option disabled>No states available</option>';

    return `
      <div class="rp-city-finder">
        <h2 class="rp-section-title"><i class="fa fa-map-marker"></i> ${this.metal.name} Rate by City</h2>

        <span class="rp-popular-label">Popular Cities</span>
        <div class="rp-city-grid">${popularChips}</div>

        <div class="rp-cf-divider"><span>or find your city</span></div>

        <div class="rp-cf-row">
          <div class="rp-select-wrap">
            <label>State</label>
            <select class="rp-select" id="rp-cf-state">
              <option value="">Select State</option>
              ${stateOpts}
            </select>
          </div>
          <div class="rp-select-wrap">
            <label>City</label>
            <select class="rp-select" id="rp-cf-city" disabled>
              <option value="">Select State first</option>
            </select>
          </div>
          <button class="rp-cf-btn" id="rp-cf-go" disabled>
            View Rate <i class="fa fa-arrow-right"></i>
          </button>
        </div>
      </div>`;
  }

  // ── Jewellers ─────────────────────────────────────────────────────────────────
  renderJewellers() {
    if (!this.jewellers.length) {
      return `<p class="rp-jewellers-empty">No jeweller listings yet.</p>`;
    }
    const base = window.API_CONFIG?.BASE_URL || '';
    const mc   = this.metal;

    return this.jewellers.map(j => {
      const logoUrl = j.logo?.url ? `${base}${esc(j.logo.url)}` : null;
      const link    = this.jewellerUrl(j);
      const initial = esc(j.name.charAt(0).toUpperCase());

      const logoInner = logoUrl
        ? `<img loading="lazy" src="${logoUrl}" alt="${esc(j.name)}" class="rp-jwl-logo">`
        : `<div class="rp-jwl-initial">${initial}</div>`;

      const logoHtml = j.website
        ? `<a href="${esc(j.website)}" target="_blank" rel="noopener noreferrer" class="rp-jwl-img-wrap" title="Visit ${esc(j.name)}">${logoInner}</a>`
        : `<div class="rp-jwl-img-wrap">${logoInner}</div>`;

      const scopeBadge = j.scope !== 'national'
        ? `<span class="rp-jwl-badge">${esc(j.scope)}</span>` : '';

      const btnHtml = link
        ? `<a href="${esc(link)}" target="_blank" rel="noopener noreferrer" class="rp-jwl-btn">
            View ${mc.name} Prices <i class="fa fa-external-link"></i>
           </a>`
        : `<span class="rp-jwl-btn rp-jwl-btn--na">No link available</span>`;

      return `
        <div class="rp-jwl-card">
          ${logoHtml}
          <div class="rp-jwl-info">
            <div class="rp-jwl-name">${esc(j.name)} ${scopeBadge}</div>
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
          ${esc(t.taxName)}
          <span class="rp-tax-gov rp-tax-gov--${esc(t.governmentLevel)}">${govLabel[t.governmentLevel] || ''}</span>
        </div>
        <div class="rp-tax-right">
          <span class="rp-tax-rate">${esc(t.taxValue)}</span>
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

  renderChartStats(rates, values) {
    const statsEl = document.getElementById('rp-chart-stats');
    if (!statsEl) return;

    const mc    = this.metal;
    const min   = Math.min(...values);
    const max   = Math.max(...values);
    const first = values[0];
    const last  = values[values.length - 1];
    const diff  = last - first;
    const pct   = ((diff / first) * 100).toFixed(2);
    const isUp  = diff >= 0;
    const upDn  = isUp ? 'rp-up' : 'rp-dn';
    const arrow = isUp ? '▲' : '▼';
    const fmtDate = d => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

    statsEl.innerHTML = `
      <div class="rp-csp-price">${this.fmt(last)}</div>
      <div class="rp-csp-change ${upDn}">${arrow} ${isUp ? '+' : ''}${pct}% <span>this period</span></div>
      <div class="rp-csp-divider"></div>
      <div class="rp-csp-row"><span class="rp-csp-label">HIGH</span><span class="rp-csp-val rp-up">${this.fmt(max)}</span></div>
      <div class="rp-csp-row"><span class="rp-csp-label">LOW</span><span class="rp-csp-val rp-dn">${this.fmt(min)}</span></div>
      <div class="rp-csp-row"><span class="rp-csp-label">CHANGE</span><span class="rp-csp-val ${upDn}">${isUp ? '+' : ''}${this.fmt(Math.abs(Math.round(diff)))}</span></div>
      <div class="rp-csp-divider"></div>
      <div class="rp-csp-row"><span class="rp-csp-label">FROM</span><span class="rp-csp-val">${fmtDate(rates[0].date)}</span></div>
      <div class="rp-csp-row"><span class="rp-csp-label">TO</span><span class="rp-csp-val">${fmtDate(rates[rates.length - 1].date)}</span></div>
      <div class="rp-csp-divider"></div>
      <div class="rp-csp-unit">Per ${mc.unitLabel} · ${mc.purities[this.activePurityIdx]?.label || ''}</div>
    `;
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

    const dates  = rates.map(r => new Date(r.date));
    const values = rates.map(r => r.buyingRate);

    this.renderChartStats(rates, values);

    const labels = dates.map(d => {
      if (['1W','1M','3M'].includes(this.activeRange))
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      return d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    });

    const brightColor = this.isGold ? '#F59E0B' : '#3B82F6';
    const isDark      = document.documentElement.classList.contains('dark-mode');
    const gridColor   = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
    const tickColor   = isDark ? '#666' : '#999';

    if (this.chart) this.chart.destroy();

    const lastDotPlugin = {
      id: 'lastDot',
      afterDatasetsDraw(chart) {
        const ds = chart.data.datasets[0];
        if (!ds?.data?.length) return;
        const meta   = chart.getDatasetMeta(0);
        const lastPt = meta.data[meta.data.length - 1];
        if (!lastPt) return;
        const { x, y } = lastPt.getProps(['x', 'y'], true);
        const c3 = chart.ctx;
        c3.save();
        c3.beginPath();
        c3.arc(x, y, 5, 0, Math.PI * 2);
        c3.fillStyle = ds.borderColor;
        c3.fill();
        c3.strokeStyle = '#fff';
        c3.lineWidth = 2;
        c3.stroke();
        c3.restore();
      }
    };

    this.chart = new Chart(ctx, {
      plugins: [lastDotPlugin],
      type: 'line',
      data: {
        labels,
        datasets: [{
          data: values,
          borderColor: brightColor,
          backgroundColor: (c) => {
            const g = c.chart.ctx.createLinearGradient(0, 0, 0, c.chart.height);
            g.addColorStop(0, this.isGold ? 'rgba(245,158,11,0.25)' : 'rgba(59,130,246,0.25)');
            g.addColorStop(1, 'rgba(255,255,255,0)');
            return g;
          },
          borderWidth: 2.5,
          fill: true,
          tension: 0.35,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: brightColor,
          pointHoverBorderColor: '#fff',
          pointHoverBorderWidth: 2,
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
            titleColor: '#aaa',
            bodyColor: '#fff',
            padding: 14,
            cornerRadius: 8,
            displayColors: false,
            callbacks: {
              title: items => {
                const d = dates[items[0].dataIndex];
                return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
              },
              label: ctx2 => ` ${this.fmt(ctx2.raw)} per ${mc.unitLabel}`
            }
          },
        },
        scales: {
          x: {
            grid: { display: false },
            border: { display: true, color: gridColor },
            ticks: {
              maxTicksLimit: 7,
              color: tickColor,
              font: { size: 11 },
              maxRotation: 0,
              minRotation: 0,
            }
          },
          y: {
            position: 'left',
            beginAtZero: false,
            grid: { color: gridColor, drawBorder: false },
            border: { display: false },
            ticks: {
              color: tickColor,
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

        const days     = this.rangeDays();
        const haveFrom = this.allRates.length > 0 ? new Date(this.allRates[0].date) : new Date();
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
  updateLocPrice(location) {
    const mc    = this.metal;
    const base  = parseFloat(this.todayRate?.buyingRate || 0);
    const p     = mc.purities[this.activePurityIdx];
    const priceEl   = document.getElementById('rp-loc-price');
    const labelEl   = document.getElementById('rp-loc-label');
    const contextEl = document.getElementById('rp-loc-context');
    const headingEl = document.getElementById('rp-loc-heading');
    if (priceEl)   priceEl.textContent   = base ? this.fmt(Math.round(base * p.ratio)) : '—';
    if (labelEl)   labelEl.textContent   = `${p.label} · per ${mc.unitLabel}`;
    if (contextEl) contextEl.textContent = location;
    if (headingEl) headingEl.textContent = location === 'All India' ? 'Check Rate by City' : `Rate in ${location}`;
  }

  bindLocationSelectors() {
    const stateEl = document.getElementById('rp-state-select');
    const cityEl  = document.getElementById('rp-city-select');
    if (!stateEl) return;

    const loadCitiesForState = async (stateName, autoSelectFirst = false) => {
      cityEl.innerHTML = '<option>Loading…</option>';
      cityEl.disabled  = true;

      const cities = await this.fetchCitiesForState(stateName);
      if (cities.length > 0) {
        cityEl.innerHTML = cities.map((c, i) =>
          `<option value="${esc(c)}"${i === 0 && autoSelectFirst ? ' selected' : ''}>${esc(c)}</option>`
        ).join('');
        cityEl.disabled = false;
        if (autoSelectFirst) this.updateLocPrice(`${cities[0]}, ${stateName}`);
      } else {
        cityEl.innerHTML = '<option value="">No cities found</option>';
      }
    };

    if (stateEl.value) loadCitiesForState(stateEl.value, true);

    stateEl.addEventListener('change', async () => {
      const stateName = stateEl.value;
      if (!stateName) {
        cityEl.innerHTML = '<option value="">Select State first</option>';
        cityEl.disabled  = true;
        this.updateLocPrice('All India');
        return;
      }
      await loadCitiesForState(stateName, true);
    });

    cityEl.addEventListener('change', () => {
      const cityName  = cityEl.value;
      const stateName = stateEl.value;
      this.updateLocPrice(cityName ? `${cityName}, ${stateName}` : stateName);
    });
  }

  // ── City Finder ──────────────────────────────────────────────────────────────
  bindCityFinder() {
    const stateEl = document.getElementById('rp-cf-state');
    const cityEl  = document.getElementById('rp-cf-city');
    const goBtn   = document.getElementById('rp-cf-go');
    if (!stateEl) return;

    const basePath = `/${this.metal.name.toLowerCase()}-rate-today`;

    stateEl.addEventListener('change', async () => {
      const stateName = stateEl.value;
      cityEl.innerHTML = '<option>Loading…</option>';
      cityEl.disabled  = true;
      goBtn.disabled   = true;

      if (!stateName) {
        cityEl.innerHTML = '<option value="">Select State first</option>';
        return;
      }

      const cities = await this.fetchCitiesForState(stateName);
      if (cities.length > 0) {
        cityEl.innerHTML = `<option value="">Select City</option>` +
          cities.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
        cityEl.disabled = false;
      } else {
        cityEl.innerHTML = '<option value="">No cities found</option>';
      }
    });

    cityEl.addEventListener('change', () => {
      goBtn.disabled = !cityEl.value;
    });

    goBtn.addEventListener('click', () => {
      if (!cityEl.value) return;
      const slug = cityEl.value.toLowerCase().replace(/\s+/g, '-');
      window.location.href = `${basePath}/${slug}`;
    });
  }

  // ── Purity Calculator interactivity ──────────────────────────────────────────
  bindCalculator() {
    const weightEl  = document.getElementById('rp-calc-weight');
    const purityEl  = document.getElementById('rp-calc-purity');
    const priceEl   = document.getElementById('rp-calc-price');
    const formulaEl = document.getElementById('rp-calc-formula');
    const metaEl    = document.getElementById('rp-calc-meta');
    const presetBtns = document.querySelectorAll('.rp-calc-preset');
    if (!weightEl || !purityEl) return;

    const mc      = this.metal;
    const base    = parseFloat(this.todayRate?.buyingRate || 0);
    const perGram = mc.name === 'Gold' ? base / 10 : base / 1000;

    const setActivePreset = (val) => {
      presetBtns.forEach(b => b.classList.toggle('active', parseFloat(b.dataset.weight) === val));
    };

    const update = () => {
      const weight   = parseFloat(weightEl.value) || 0;
      const ratio    = parseFloat(purityEl.value) || 1;
      const pLabel   = purityEl.options[purityEl.selectedIndex]?.text.split(' — ')[0] || '';
      const ratePerG = Math.round(perGram * ratio);

      if (!base || weight <= 0) {
        priceEl.textContent   = '—';
        formulaEl.textContent = '';
        metaEl.textContent    = 'Enter a weight above';
        return;
      }

      priceEl.textContent   = this.fmt(Math.round(ratePerG * weight));
      formulaEl.textContent = `${weight}g × ${this.fmt(ratePerG)}/g`;
      metaEl.textContent    = `${pLabel} · buying rate`;
    };

    // Preset buttons
    presetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const w = parseFloat(btn.dataset.weight);
        weightEl.value = w;
        setActivePreset(w);
        update();
      });
    });

    // Typing a custom weight clears the active preset
    weightEl.addEventListener('input', () => {
      setActivePreset(parseFloat(weightEl.value));
      update();
    });

    purityEl.addEventListener('change', update);
    update();
  }

  bindEvents() {
    this.bindPurityTabs();
    this.bindRangeButtons();
    this.bindCityFinder();
    this.bindCalculator();
    setTimeout(() => this.renderChart(), 100);
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

    const metalBase = `/${mc.name.toLowerCase()}-rate-today`;
    const canonical = this.citySlug
      ? `${window.location.origin}${metalBase}/${this.citySlug}`
      : `${window.location.origin}${metalBase}`;
    document.getElementById('canonical-url')?.setAttribute('href', canonical);
    document.getElementById('og-url')?.setAttribute('content', canonical);

    // Update hero title if city-specific
    if (this.cityName) {
      const titleEl = document.querySelector('.rp-title');
      if (titleEl) titleEl.textContent = `${mc.name} Rate Today in ${this.cityName}`;
    }

    const catEl  = document.getElementById('breadcrumb-category');
    const pageEl = document.getElementById('breadcrumb-page');
    if (catEl)  { catEl.textContent = `${mc.name} Rate Today`; catEl.href = metalBase; }
    if (pageEl) pageEl.textContent = this.cityName
      ? `${mc.name} Rate in ${this.cityName}`
      : `${mc.name} Rate Today`;
  }
}

document.addEventListener('DOMContentLoaded', () => new RatePageManager().init());

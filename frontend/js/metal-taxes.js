/**
 * Metal Taxes Page — /gold-taxes and /silver-taxes
 * Shows tax breakdown for buying gold/silver in India + a total-cost calculator.
 */

const esc = s => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Static descriptions for each known tax — shown if API has no description field.
const TAX_DESCRIPTIONS = {
  'gst on gold purchase':  'Goods and Services Tax at 3% is levied on the value of gold you purchase. It applies uniformly across all states in India.',
  'gst on silver purchase': 'Goods and Services Tax at 3% is levied on the value of silver you purchase. It applies uniformly across all states in India.',
  'gst on making charges': 'Jewellery making charges attract a separate GST at 5%. Making charges cover the labour and design cost and can range from ₹200 to ₹2,000+ per gram depending on the design.',
  'basic customs (import) duty': 'India imports most of its gold from abroad. A 6% customs duty is charged on imported gold, making it a major reason why Indian gold prices are higher than international rates.',
  'agriculture infrastructure & development cess (aidc)': 'Introduced in February 2021, AIDC is a 5% cess on gold imports. Revenue is earmarked for agriculture and rural infrastructure development.',
};

const METAL_CONFIG = {
  Gold: {
    color: '#D4A017', colorLight: 'rgba(212,160,23,0.10)',
    icon: '🥇', unitLabel: '10g',
    purities: [
      { label: '24K', ratio: 1,       desc: '99.9% Pure' },
      { label: '22K', ratio: 22/24,   desc: '91.7% Pure' },
      { label: '20K', ratio: 20/24,   desc: '83.3% Pure' },
      { label: '18K', ratio: 18/24,   desc: '75.0% Pure' },
      { label: '14K', ratio: 14/24,   desc: '58.3% Pure' },
    ],
  },
  Silver: {
    color: '#6B7280', colorLight: 'rgba(107,114,128,0.10)',
    icon: '🥈', unitLabel: 'kg',
    purities: [
      { label: '999', ratio: 1,         desc: '99.9% Pure' },
      { label: '925', ratio: 925/999,   desc: '92.5% Sterling' },
      { label: '900', ratio: 900/999,   desc: '90.0% Coin' },
      { label: '800', ratio: 800/999,   desc: '80.0% German' },
    ],
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────
// getApiUrl() is defined globally by config.js (loaded before this script)

function fmt(n) {
  return '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function parseTaxPct(val) {
  if (val == null) return 0;
  const match = String(val).match(/[\d.]+/);
  return match ? parseFloat(match[0]) / 100 : 0;
}

function taxDesc(tax) {
  // Prefer API description if available
  if (tax.description) return tax.description;
  const key = (tax.taxName || '').toLowerCase();
  return TAX_DESCRIPTIONS[key] || 'This tax applies to the purchase of this metal in India.';
}

// ── Page Manager ─────────────────────────────────────────────────────────────

class MetalTaxesPage {
  constructor() {
    this.heroEl    = document.getElementById('mt-hero');
    this.mainEl    = document.getElementById('mt-main');
    this.isGold    = !window.location.pathname.toLowerCase().includes('silver');
    this.metalName = this.isGold ? 'Gold' : 'Silver';
    this.mc        = METAL_CONFIG[this.metalName];
    this.taxes     = [];
    this.todayRate = null;
  }

  // ── Boot ──────────────────────────────────────────────────────────────────

  async init() {
    document.documentElement.style.setProperty('--mc',  this.mc.color);
    document.documentElement.style.setProperty('--mcl', this.mc.colorLight);

    try {
      await Promise.all([this.fetchTaxes(), this.fetchLatestRate()]);
      this.render();
      this.updateMeta();
      this.bindCalculator();
    } catch (err) {
      console.error(err);
      this.mainEl.innerHTML = `<div class="rp-error container" style="margin:60px auto">
        <i class="fa fa-exclamation-circle"></i>
        <h2>Could not load tax data</h2>
        <p>${esc(err.message)}</p>
        <a href="/${this.metalName.toLowerCase()}-rate-today" class="rp-btn">Back to ${this.metalName} Rate</a>
      </div>`;
    }
  }

  // ── API ───────────────────────────────────────────────────────────────────

  async fetchTaxes() {
    try {
      const url  = getApiUrl(
        `/metal-taxes?filters[metal][name][$eq]=${this.metalName}` +
        `&filters[isActive][$eq]=true&sort=displayOrder:asc` +
        `&pagination[pageSize]=30&populate[metal]=true`
      );
      const res  = await fetch(url);
      const json = await res.json();
      this.taxes = (json.data || []).filter(t => !t.metal || t.metal.name === this.metalName);
    } catch { this.taxes = []; }
  }

  async fetchLatestRate() {
    try {
      const url  = getApiUrl(`/daily-rates?sort=date:desc&pagination[limit]=4&populate=*`);
      const res  = await fetch(url);
      const json = await res.json();
      const rows = (json.data || []).filter(r => r.metal?.name === this.metalName);
      const byDate = {};
      rows.forEach(r => { if (!byDate[r.date]) byDate[r.date] = r; });
      const dates = Object.keys(byDate).sort().reverse();
      this.todayRate = byDate[dates[0]] || null;
    } catch { this.todayRate = null; }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  render() {
    const mn      = this.metalName;
    const mc      = this.mc;
    const base    = parseFloat(this.todayRate?.buyingRate || 0);
    const perGram = mn === 'Gold' ? base / 10 : base / 1000;
    const dateStr = this.todayRate?.date
      ? new Date(this.todayRate.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
      : '';

    // ── Hero ──
    this.heroEl.innerHTML = `
      <div class="rp-hero">
        <div class="container">
          <div class="rp-hero-top">
            <div class="rp-hero-left">
              <span class="rp-metal-icon">${mc.icon}</span>
              <div>
                <h1 class="rp-title">Taxes on ${mn} in India</h1>
                <p class="rp-date"><i class="fa fa-clock-o"></i> ${dateStr || 'Latest rates'}</p>
              </div>
            </div>
            <div class="rp-hero-right">
              <a href="/${mn.toLowerCase()}-rate-today" class="mt-back-link">
                <i class="fa fa-arrow-left"></i> Back to ${mn} Rate
              </a>
            </div>
          </div>
        </div>
      </div>`;

    // ── Tax detail cards ──
    const govLabel = { central: 'Central Govt', state: 'State Govt', both: 'Central + State' };
    const govClass = { central: 'rp-tax-gov--central', state: 'rp-tax-gov--state', both: 'rp-tax-gov--both' };

    const taxCards = this.taxes.length ? this.taxes.map(t => {
      const pct         = parseTaxPct(t.taxValue);
      const example     = base && pct ? fmt(Math.round(perGram * pct * 10)) : null;
      const isMaking    = /making/i.test(t.taxName || '');
      const exampleNote = example
        ? (isMaking ? `On ₹500 making charges → <strong>${fmt(Math.round(500 * pct))}</strong>` : `On 10g of ${mn} → <strong>${example}</strong>`)
        : '';

      return `
        <div class="mt-tax-card">
          <div class="mt-tax-card-header">
            <div class="mt-tax-name-row">
              <span class="mt-tax-name">${esc(t.taxName)}</span>
              <span class="rp-tax-gov ${govClass[t.governmentLevel] || ''}">${govLabel[t.governmentLevel] || ''}</span>
            </div>
            <span class="mt-tax-rate-badge">${esc(t.taxValue)}</span>
          </div>
          <p class="mt-tax-desc">${esc(taxDesc(t))}</p>
          ${exampleNote ? `<div class="mt-tax-example"><i class="fa fa-calculator"></i> Example: ${exampleNote}</div>` : ''}
        </div>`;
    }).join('') : `<p class="rp-jewellers-empty">No tax data available for ${mn}.</p>`;

    // ── Calculator ──
    const purityOpts = mc.purities.map((p, i) =>
      `<option value="${p.ratio}"${i === 0 ? ' selected' : ''}>${p.label} — ${p.desc}</option>`
    ).join('');

    const presets = [1, 2, 5, 10, 50, 100];

    // Split taxes into metal-value taxes vs making-charge taxes
    const metalTaxes  = this.taxes.filter(t => !/making/i.test(t.taxName || ''));
    const makingTaxes = this.taxes.filter(t => /making/i.test(t.taxName || ''));

    const initRows = this.buildBreakdownRows(perGram, mc.purities[0].ratio, mc.purities[0].label, 1, 0);

    this.mainEl.innerHTML = `

      <!-- Section 1 (alt): Tax breakdown cards -->
      <div class="rp-section rp-section--alt">
        <div class="container">
          <h2 class="rp-section-title">What taxes apply when buying ${mn}?</h2>
          <div class="mt-tax-grid">${taxCards}</div>
          <p class="mt-tax-summary-note">
            <i class="fa fa-info-circle"></i>
            Combined tax load on ${mn} purchase (excluding making charges):
            <strong>${this.taxes.filter(t => !/making/i.test(t.taxName)).reduce((s, t) => s + parseTaxPct(t.taxValue), 0) * 100 | 0}%</strong>
            of the metal value.
          </p>
        </div>
      </div>

      <!-- Section 2: All-In Cost Calculator -->
      <div class="rp-section">
        <div class="container">
          <h2 class="rp-section-title">What will you actually pay?</h2>
          <p class="mt-calc-intro">Enter your purchase details to see a full cost breakdown — metal price, each tax, and the grand total.</p>

          <div class="mt-calc-wrapper">

            <!-- Controls bar -->
            <div class="mt-calc-controls">
              <div class="mt-ctrl-row">

                <div class="mt-ctrl-group">
                  <label class="mt-ctrl-label">Purity</label>
                  <select id="mt-purity" class="rp-select">${purityOpts}</select>
                </div>

                <div class="mt-ctrl-divider"></div>

                <div class="mt-ctrl-group">
                  <label class="mt-ctrl-label">Weight</label>
                  <div class="mt-ctrl-weight-row">
                    <div class="rp-calc-preset-row">
                      ${presets.map((w, i) =>
                        `<button class="rp-calc-preset${i === 0 ? ' active' : ''}" data-weight="${w}">${w}g</button>`
                      ).join('')}
                    </div>
                    <div class="rp-calc-input-wrap">
                      <input type="number" id="mt-weight" class="rp-calc-input"
                             value="1" min="0.01" step="0.5" placeholder="or enter custom">
                      <span class="rp-calc-unit">g</span>
                    </div>
                  </div>
                </div>

                ${makingTaxes.length ? `
                <div class="mt-ctrl-divider"></div>
                <div class="mt-ctrl-group">
                  <label class="mt-ctrl-label">Making Charges <span class="mt-optional">(optional)</span></label>
                  <div class="rp-calc-input-wrap">
                    <input type="number" id="mt-making" class="rp-calc-input"
                           value="" min="0" max="50" step="0.5" placeholder="e.g. 10">
                    <span class="rp-calc-unit">%</span>
                  </div>
                  <p class="mt-making-hint">% of metal value · Typical: 5–15%</p>
                </div>` : ''}

              </div>
            </div>

            <!-- Breakdown panel (full width) -->
            <div class="mt-breakdown" id="mt-breakdown">${initRows}</div>

          </div>
        </div>
      </div>

      <!-- Section 3 (alt): How to minimise tax -->
      <div class="rp-section rp-section--alt">
        <div class="container">
          <h2 class="rp-section-title">Frequently Asked Questions</h2>
          <div class="mt-faq-list">
            ${this.renderFaqs()}
          </div>
        </div>
      </div>
    `;
  }

  // ── Breakdown rows HTML ──────────────────────────────────────────────────

  buildBreakdownRows(perGram, purityRatio, pLabel, weight, makingPct) {
    if (!perGram || weight <= 0) {
      return `<div class="mt-breakdown-empty">Enter a weight above to see your cost breakdown</div>`;
    }

    const basePrice   = perGram * purityRatio * weight;
    const totalMaking = basePrice * (makingPct / 100);

    const metalTaxes  = this.taxes.filter(t => !/making/i.test(t.taxName || ''));
    const makingTaxes = this.taxes.filter(t => /making/i.test(t.taxName || ''));

    const metalTaxLines = metalTaxes.map(t => ({
      name: t.taxName, val: t.taxValue,
      pct:  parseTaxPct(t.taxValue),
      amt:  basePrice * parseTaxPct(t.taxValue),
    }));
    const makingTaxLines = makingTaxes.map(t => ({
      name: t.taxName, val: t.taxValue,
      pct:  parseTaxPct(t.taxValue),
      amt:  totalMaking * parseTaxPct(t.taxValue),
    }));

    const metalTaxTotal  = metalTaxLines.reduce((s, l) => s + l.amt, 0);
    const makingTaxTotal = makingTaxLines.reduce((s, l) => s + l.amt, 0);
    const totalTaxes     = metalTaxTotal + makingTaxTotal;
    const grandTotal     = basePrice + totalTaxes + totalMaking;

    // Proportion bar widths
    const barMetal  = ((basePrice  / grandTotal) * 100).toFixed(1);
    const barTax    = ((totalTaxes / grandTotal) * 100).toFixed(1);
    const barMaking = ((totalMaking / grandTotal) * 100).toFixed(1);
    const taxPctOfMetal = basePrice ? ((metalTaxTotal / basePrice) * 100).toFixed(1) : 0;

    const line = (name, val, cls, pct = '') => `
      <div class="mt-bd-line ${cls}">
        <span class="mt-bd-line-name">
          ${esc(name)}
          ${pct ? `<span class="mt-bd-line-pct">${pct}</span>` : ''}
        </span>
        <span class="mt-bd-line-val">${val}</span>
      </div>`;

    return `
      <!-- Summary stats -->
      <div class="mt-bd-summary">
        <div class="mt-bd-stat">
          <span class="mt-bd-stat-label">Metal Cost</span>
          <span class="mt-bd-stat-val">${fmt(Math.round(basePrice))}</span>
          <span class="mt-bd-stat-sub">${pLabel} · ${weight}g</span>
        </div>
        <div class="mt-bd-sep">+</div>
        <div class="mt-bd-stat">
          <span class="mt-bd-stat-label">Total Taxes</span>
          <span class="mt-bd-stat-val mt-bd-stat-val--tax">${fmt(Math.round(totalTaxes))}</span>
          <span class="mt-bd-stat-sub">${taxPctOfMetal}% of metal cost</span>
        </div>
        <div class="mt-bd-sep">=</div>
        <div class="mt-bd-stat mt-bd-stat--total">
          <span class="mt-bd-stat-label">You Pay</span>
          <span class="mt-bd-stat-val mt-bd-stat-val--total">${fmt(Math.round(grandTotal))}</span>
          <span class="mt-bd-stat-sub">all taxes included</span>
        </div>
      </div>

      <!-- Proportion bar -->
      <div class="mt-bd-bar-wrap">
        <div class="mt-bd-bar">
          <div class="mt-bd-bar-metal"  style="width:${barMetal}%"></div>
          <div class="mt-bd-bar-tax"    style="width:${barTax}%"></div>
          ${totalMaking > 0 ? `<div class="mt-bd-bar-making" style="width:${barMaking}%"></div>` : ''}
        </div>
        <div class="mt-bd-bar-legend">
          <span><span class="mt-bd-legend-dot mt-bd-legend-dot--metal"></span>Metal ${fmt(Math.round(basePrice))}</span>
          <span><span class="mt-bd-legend-dot mt-bd-legend-dot--tax"></span>Taxes ${fmt(Math.round(totalTaxes))}</span>
          ${totalMaking > 0 ? `<span><span class="mt-bd-legend-dot mt-bd-legend-dot--making"></span>Making ${fmt(Math.round(totalMaking))}</span>` : ''}
        </div>
      </div>

      <!-- Line items -->
      <div class="mt-bd-lines">
        ${line(`Base ${this.metalName} Price (${pLabel} · ${weight}g)`, fmt(Math.round(basePrice)), 'mt-bd-line--base')}
        ${metalTaxLines.map(t => line(t.name, `+ ${fmt(Math.round(t.amt))}`, 'mt-bd-line--tax', t.val)).join('')}
        ${line('Total Tax on Metal', fmt(Math.round(metalTaxTotal)), 'mt-bd-line--subtotal')}
        ${totalMaking > 0 ? line(`Making Charges (${makingPct}% of ${fmt(Math.round(basePrice))})`, fmt(Math.round(totalMaking)), 'mt-bd-line--making') : ''}
        ${makingTaxLines.map(t => line(t.name, `+ ${fmt(Math.round(t.amt))}`, 'mt-bd-line--making-tax', t.val)).join('')}
      </div>

      <div class="mt-bd-total-line">
        <span class="mt-bd-total-line-label">Estimated Total Cost</span>
        <span class="mt-bd-total-line-val">${fmt(Math.round(grandTotal))}</span>
      </div>
      <p class="mt-bd-disclaimer">Indicative only. Actual price may vary by jeweller and design.</p>
    `;
  }

  // ── Bind calculator ───────────────────────────────────────────────────────

  bindCalculator() {
    const weightEl    = document.getElementById('mt-weight');
    const purityEl    = document.getElementById('mt-purity');
    const makingEl    = document.getElementById('mt-making');
    const breakdownEl = document.getElementById('mt-breakdown');
    const presetBtns  = document.querySelectorAll('.rp-calc-preset');
    if (!weightEl || !purityEl || !breakdownEl) return;

    const base    = parseFloat(this.todayRate?.buyingRate || 0);
    const perGram = this.metalName === 'Gold' ? base / 10 : base / 1000;

    const setActivePreset = (val) => {
      presetBtns.forEach(b => b.classList.toggle('active', parseFloat(b.dataset.weight) === val));
    };

    const update = () => {
      const weight      = parseFloat(weightEl.value) || 0;
      const purityRatio = parseFloat(purityEl.value) || 1;
      const pLabel      = purityEl.options[purityEl.selectedIndex]?.text.split(' — ')[0] || '';
      const makingPct   = parseFloat(makingEl?.value) || 0;
      breakdownEl.innerHTML = this.buildBreakdownRows(perGram, purityRatio, pLabel, weight, makingPct);
    };

    presetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        weightEl.value = btn.dataset.weight;
        setActivePreset(parseFloat(btn.dataset.weight));
        update();
      });
    });

    weightEl.addEventListener('input', () => {
      setActivePreset(parseFloat(weightEl.value));
      update();
    });
    purityEl.addEventListener('change', update);
    if (makingEl) makingEl.addEventListener('input', update);
    update();
  }

  // ── FAQs ──────────────────────────────────────────────────────────────────

  renderFaqs() {
    const mn = this.metalName;
    const faqs = [
      {
        q: `What is the total tax on ${mn} purchase in India?`,
        a: `When buying ${mn.toLowerCase()} jewellery, you typically pay 3% GST on the metal value, 6% customs duty (already built into the price), 5% AIDC cess (also pre-included), and 5% GST on making charges. The total effective tax on the metal value alone is around 14%.`,
      },
      {
        q: `Is GST on ${mn} refundable?`,
        a: `No. GST paid on ${mn.toLowerCase()} purchases is not refundable for individuals. It is a consumption tax. Businesses that buy ${mn.toLowerCase()} for manufacturing may be able to claim input tax credit in certain cases.`,
      },
      {
        q: `Why is Indian ${mn} price higher than international price?`,
        a: `India imports almost all its ${mn.toLowerCase()}. The customs duty (6%) and AIDC (5%) are levied on imports, which adds approximately 11% to the international price before retail markups, making charges, and GST.`,
      },
      {
        q: `Are there any taxes on selling ${mn}?`,
        a: `There is no GST on selling ${mn.toLowerCase()} back to a jeweller or dealer. However, capital gains tax applies on profits — Short Term Capital Gains (held < 24 months) are taxed at your income tax slab, and Long Term Capital Gains (held ≥ 24 months) at 20% with indexation benefit.`,
      },
      {
        q: `Does ${mn} price on websites include taxes?`,
        a: `The rate shown on this page (and most price trackers) is the MCX or import-linked wholesale rate. Retail prices from jewellers will be higher and include customs duty, AIDC, GST, making charges, and the jeweller's margin.`,
      },
    ];

    return faqs.map((f, i) => `
      <div class="mt-faq-item">
        <button class="mt-faq-q" data-idx="${i}" aria-expanded="false">
          ${esc(f.q)}
          <i class="fa fa-chevron-down mt-faq-icon"></i>
        </button>
        <div class="mt-faq-a" id="mt-faq-a-${i}" hidden>${esc(f.a)}</div>
      </div>`
    ).join('');
  }

  // ── Page meta ─────────────────────────────────────────────────────────────

  updateMeta() {
    const mn    = this.metalName;
    const title = `Taxes on ${mn} in India — GST, Customs Duty & More | FiscalColumn`;
    const desc  = `Complete guide to taxes on ${mn.toLowerCase()} purchase in India. GST (3%), customs duty (6%), AIDC (5%), making charges GST (5%) — with a cost calculator.`;

    document.title = title;
    document.getElementById('meta-description')?.setAttribute('content', desc);
    document.getElementById('og-title')?.setAttribute('content', title);
    document.getElementById('og-description')?.setAttribute('content', desc);
    document.getElementById('twitter-title')?.setAttribute('content', title);
    document.getElementById('twitter-description')?.setAttribute('content', desc);

    const canonical = `${window.location.origin}/${mn.toLowerCase()}-taxes`;
    document.getElementById('canonical-url')?.setAttribute('href', canonical);
    document.getElementById('og-url')?.setAttribute('content', canonical);

    const rateLink = document.getElementById('breadcrumb-rate');
    const pageCrumb = document.getElementById('breadcrumb-page');
    if (rateLink) { rateLink.textContent = `${mn} Rate Today`; rateLink.href = `/${mn.toLowerCase()}-rate-today`; }
    if (pageCrumb) pageCrumb.textContent = `Taxes on ${mn}`;

    // FAQ accordion
    document.querySelectorAll('.mt-faq-q').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx     = btn.dataset.idx;
        const ansEl   = document.getElementById(`mt-faq-a-${idx}`);
        const isOpen  = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', String(!isOpen));
        ansEl.hidden  = isOpen;
        btn.querySelector('.mt-faq-icon')?.classList.toggle('fa-chevron-up', !isOpen);
        btn.querySelector('.mt-faq-icon')?.classList.toggle('fa-chevron-down', isOpen);
      });
    });
  }
}

document.addEventListener('DOMContentLoaded', () => new MetalTaxesPage().init());

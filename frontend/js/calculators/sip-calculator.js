/**
 * SIP Calculator with Growth Chart
 */

class SIPCalculator {
  constructor(container) {
    this.container = container;
    this.monthlyInvestment = 50000;
    this.expectedReturn = 12;
    this.timePeriod = 10;
    this.chart = null;
  }

  render() {
    this.container.innerHTML = `
      <div class="calc-form sip-form">
        <div class="sip-sliders">
          ${CalculatorUtils.createSlider('sip-monthly', 'Monthly investment', 500, 500000, this.monthlyInvestment, 500, '', '₹')}
          ${CalculatorUtils.createSlider('sip-return', 'Expected return, per year', 1, 30, this.expectedReturn, 0.5, '%', '')}
          ${CalculatorUtils.createSlider('sip-years', 'How long you stay invested', 1, 40, this.timePeriod, 1, ' years', '')}
          <p class="sip-hint">Click a number if you would rather type it.</p>
        </div>

        <div class="calc-results sip-results" id="sip-results">
          <div class="sip-summary-card">
            <div class="sip-stats">
              <div class="sip-stat">
                <span class="sip-stat-label">You invest</span>
                <span class="sip-stat-value" id="sip-invested">₹0</span>
              </div>
              <div class="sip-stat">
                <span class="sip-stat-label">Estimated return</span>
                <span class="sip-stat-value" id="sip-returns">₹0</span>
              </div>
            </div>
            <div class="sip-chart-wrap">
              <div class="sip-chart">
                <canvas id="sip-chart" aria-label="Split of money invested and estimated return"></canvas>
              </div>
              <div class="sip-legend">
                <span><i class="sip-dot sip-dot-invested"></i> You invest</span>
                <span><i class="sip-dot sip-dot-gain"></i> Estimated return</span>
              </div>
            </div>
          </div>

          <section class="sip-compare" aria-label="Same investment at different returns">
            <h2 class="sip-compare-title">Same amount, different returns</h2>
            <p class="sip-compare-lead" id="sip-compare-lead"></p>
            <div id="sip-compare-list"></div>
            <p class="sip-note" id="sip-summary"></p>
          </section>
        </div>
      </div>
    `;

    this.bindEvents();
    this.calculate();
  }

  bindEvents() {
    document.querySelector('.calculator-page-container')?.classList.add('calc-modern');
    this.addRangeLabels();
    setTimeout(() => {
      this.chart && this.chart.resize();
      ['sip-monthly', 'sip-return', 'sip-years'].forEach(id => {
        const slider = document.getElementById(id);
        if (slider) this.paintSlider(slider);
      });
    }, 180);

    document.getElementById('sip-monthly').addEventListener('input', (e) => {
      this.monthlyInvestment = parseFloat(e.target.value);
      document.getElementById('sip-monthly-value').textContent = CalculatorUtils.formatIndianNumber(this.monthlyInvestment);
    });

    document.getElementById('sip-return').addEventListener('input', (e) => {
      this.expectedReturn = parseFloat(e.target.value);
      document.getElementById('sip-return-value').textContent = this.expectedReturn.toFixed(1);
    });

    document.getElementById('sip-years').addEventListener('input', (e) => {
      this.timePeriod = parseInt(e.target.value);
      document.getElementById('sip-years-value').textContent = this.timePeriod;
    });

    ['sip-monthly', 'sip-return', 'sip-years'].forEach(id => {
      const slider = document.getElementById(id);
      const onMove = () => {
        this.calculate();
        requestAnimationFrame(() => this.paintSlider(slider));
      };
      slider.addEventListener('input', onMove);
      slider.addEventListener('change', onMove);
    });

    this.themeObserver = new MutationObserver(() => {
      ['sip-monthly', 'sip-return', 'sip-years'].forEach(id => {
        const slider = document.getElementById(id);
        if (slider) this.paintSlider(slider);
      });
      if (this.chart) this.chart.destroy();
      this.chart = null;
      this.renderChart(this.lastInvested || 0, this.lastGained || 0);
    });
    this.themeObserver.observe(document.documentElement, { attributeFilter: ['class'] });
  }

  isDark() {
    return document.documentElement.classList.contains('dark-mode');
  }

  paintSlider(slider) {
    const min = parseFloat(slider.min);
    const max = parseFloat(slider.max);
    const val = parseFloat(slider.value);
    const percent = max === min ? 0 : ((val - min) / (max - min)) * 100;
    const isDark = this.isDark();
    const track = isDark ? '#3A4454' : '#E4E7EC';
    slider.style.background = `linear-gradient(to right, #1A73E8 ${percent}%, ${track} ${percent}%)`;
  }

  calculate() {
    const P = this.monthlyInvestment;
    const r = this.expectedReturn / 100 / 12;
    const n = this.timePeriod * 12;

    const futureValue = CalculatorUtils.sipFutureValue(P, r, n);
    const totalInvested = P * n;
    const wealthGained = Math.max(0, futureValue - totalInvested);
    this.lastInvested = totalInvested;
    this.lastGained = wealthGained;

    const gainShare = futureValue > 0 ? Math.round((wealthGained / futureValue) * 100) : 0;

    document.getElementById('sip-invested').textContent = CalculatorUtils.formatCurrency(totalInvested);
    document.getElementById('sip-returns').textContent = CalculatorUtils.formatCurrency(wealthGained);
    document.getElementById('sip-summary').textContent =
      'This is a projection, not a promise. Mutual fund returns move with the market.';

    this.renderChart(totalInvested, wealthGained, gainShare);
    this.renderCompare();
  }

  addRangeLabels() {
    const format = {
      'sip-monthly': (n) => this.moneyEnd(n),
      'sip-return': (n) => `${n}%`,
      'sip-years': (n) => `${n} ${n === 1 ? 'year' : 'years'}`,
    };
    Object.entries(format).forEach(([id, fmt]) => {
      const slider = document.getElementById(id);
      if (!slider || slider.parentElement.querySelector('.sip-range')) return;
      const row = document.createElement('div');
      row.className = 'sip-range';
      const min = document.createElement('span');
      const max = document.createElement('span');
      min.textContent = fmt(parseFloat(slider.min));
      max.textContent = fmt(parseFloat(slider.max));
      row.append(min, max);
      slider.after(row);
    });
  }

  moneyEnd(n) {
    if (n >= 1e7) return `₹${n / 1e7} Cr`;
    if (n >= 1e5) return `₹${n / 1e5} L`;
    return `₹${CalculatorUtils.formatIndianNumber(n)}`;
  }

  renderCompare() {
    const list = document.getElementById('sip-compare-list');
    const lead = document.getElementById('sip-compare-lead');
    if (!list || !lead) return;

    const yearsLabel = `${this.timePeriod} ${this.timePeriod === 1 ? 'year' : 'years'}`;
    lead.textContent = `${CalculatorUtils.formatCurrency(this.monthlyInvestment)} every month for ${yearsLabel}. Only the yearly return changes.`;

    const rates = [8, 10, 12];
    if (!rates.some(rate => Math.abs(rate - this.expectedReturn) < 0.05)) {
      rates.push(this.expectedReturn);
    }
    rates.sort((a, b) => a - b);

    list.replaceChildren();
    const months = this.timePeriod * 12;
    rates.forEach(rate => {
      const futureValue = CalculatorUtils.sipFutureValue(this.monthlyInvestment, rate / 100 / 12, months);
      const gained = Math.max(0, futureValue - this.monthlyInvestment * months);
      const yours = Math.abs(rate - this.expectedReturn) < 0.05;
      const rateText = Number.isInteger(rate) ? String(rate) : rate.toFixed(1);

      const row = document.createElement('div');
      row.className = 'sip-compare-row' + (yours ? ' is-yours' : '');

      const rateEl = document.createElement('div');
      rateEl.className = 'sip-compare-rate';
      const rateNum = document.createElement('strong');
      rateNum.textContent = `${rateText}%`;
      rateEl.appendChild(rateNum);
      if (yours) {
        const tag = document.createElement('span');
        tag.className = 'sip-compare-tag';
        tag.textContent = 'Your rate';
        rateEl.appendChild(tag);
      }

      const maturity = document.createElement('div');
      maturity.className = 'sip-compare-figure';
      const maturityLabel = document.createElement('span');
      maturityLabel.textContent = 'Value';
      const maturityValue = document.createElement('strong');
      maturityValue.textContent = CalculatorUtils.formatCurrency(futureValue);
      maturity.append(maturityLabel, maturityValue);

      const gain = document.createElement('div');
      gain.className = 'sip-compare-figure';
      const gainLabel = document.createElement('span');
      gainLabel.textContent = 'Return';
      const gainValue = document.createElement('strong');
      gainValue.textContent = CalculatorUtils.formatCurrency(gained);
      gain.append(gainLabel, gainValue);

      row.append(rateEl, maturity, gain);
      list.appendChild(row);
    });
  }

  renderChart(totalInvested, wealthGained, gainShare) {
    const canvas = document.getElementById('sip-chart');
    if (!canvas || typeof Chart === 'undefined') return;
    const total = totalInvested + wealthGained;
    if (gainShare == null) {
      gainShare = total > 0 ? Math.round((wealthGained / total) * 100) : 0;
    }

    const isDark = this.isDark();
    const center = {
      display: true,
      label: 'Total',
      value: CalculatorUtils.formatCurrency(total),
      labelColor: isDark ? '#9AA0A6' : '#5F6368',
      valueColor: isDark ? '#E8EAED' : '#202124',
      labelFontSize: 13,
      valueFontSize: 18,
    };

    if (this.chart) {
      this.chart.data.datasets[0].data = [totalInvested, wealthGained];
      this.chart.options.plugins.doughnutCenterText = center;
      this.chart.update();
      return;
    }

    this.chart = new Chart(canvas.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: ['You invest', 'Estimated return'],
        datasets: [{
          data: [totalInvested, wealthGained],
          backgroundColor: ['rgba(26, 115, 232, 0.72)', 'rgba(15, 157, 88, 0.72)'],
          borderWidth: 0,
          hoverOffset: 4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '52%',
        plugins: {
          legend: { display: false },
          doughnutCenterText: center,
          tooltip: {
            backgroundColor: isDark ? '#202124' : '#FFFFFF',
            titleColor: isDark ? '#E8EAED' : '#202124',
            bodyColor: isDark ? '#E8EAED' : '#202124',
            borderColor: isDark ? '#3C4043' : '#E4E7EC',
            borderWidth: 1,
            padding: 12,
            boxPadding: 6,
            callbacks: {
              label: (context) => ` ${context.label}: ${CalculatorUtils.formatCurrency(context.raw)}`,
            },
          },
        },
      },
    });
  }
}

registerCalculator('sip', SIPCalculator);

/**
 * Lump Sum (One-Time) Investment Calculator
 */
class LumpsumCalculator {
  constructor(container) {
    this.container = container;
    this.investment = 500000;
    this.expectedReturn = 12;
    this.timePeriod = 10;
    this.chart = null;
  }

  render() {
    this.container.innerHTML = `
      <div class="calc-form">
        ${CalculatorUtils.createSlider('ls-amount', 'One-Time Investment', 1000, 10000000, this.investment, 1000, '', '₹')}
        ${CalculatorUtils.createSlider('ls-return', 'Expected Return Rate (p.a.)', 1, 30, this.expectedReturn, 0.5, '%', '')}
        ${CalculatorUtils.createSlider('ls-years', 'Investment Period', 1, 40, this.timePeriod, 1, ' years', '')}

        <div style="text-align:center; margin-top:10px;">
          <button class="calc-btn" id="ls-calculate">
            <i class="fa fa-calculator"></i> Calculate Returns
          </button>
        </div>

        <div class="calc-results" id="ls-results" style="display:none;">
          <h4 class="calc-results-title">Lump Sum Returns</h4>
          <div class="calc-results-grid">
            <div class="calc-result-box" style="border-color:#3498db">
              <div class="calc-result-label">Amount Invested</div>
              <div class="calc-result-value" id="ls-invested" style="color:#3498db">₹0</div>
            </div>
            <div class="calc-result-box" style="border-color:#27ae60">
              <div class="calc-result-label">Wealth Gained</div>
              <div class="calc-result-value" id="ls-returns" style="color:#27ae60">₹0</div>
            </div>
            <div class="calc-result-box" style="border-color:#9b59b6">
              <div class="calc-result-label">Total Value</div>
              <div class="calc-result-value" id="ls-total" style="color:#9b59b6">₹0</div>
            </div>
          </div>
          <div class="calc-results-grid" style="margin-top:10px; grid-template-columns:1fr 1fr;">
            <div class="calc-result-box" style="border-color:#f39c12">
              <div class="calc-result-label">CAGR</div>
              <div class="calc-result-value" id="ls-cagr" style="color:#f39c12; font-size:1.4rem">0%</div>
            </div>
            <div class="calc-result-box" style="border-color:#e74c3c">
              <div class="calc-result-label">Times Your Money</div>
              <div class="calc-result-value" id="ls-multiple" style="color:#e74c3c; font-size:1.4rem">1x</div>
            </div>
          </div>

          <div class="calc-chart-container">
            <h5 class="calc-chart-title">Investment Growth Over Time</h5>
            <div class="calc-chart-wrapper"><canvas id="ls-chart"></canvas></div>
          </div>
        </div>
      </div>
    `;
    this.bindEvents();
    this.calculate();
  }

  bindEvents() {
    this.mount();
    CalculatorUtils.bindModern([
      { id: 'ls-amount', display: (n) => CalculatorUtils.formatIndianNumber(n), end: CalculatorUtils.moneyEnd },
      { id: 'ls-return', display: (n) => n.toFixed(1), end: (n) => n + '%' },
      { id: 'ls-years', display: (n) => String(n), end: (n) => n + ' yr' },
    ], () => this.calculate(), () => this.chart);
  }

  mount() {
    CalculatorUtils.adoptModern(this.container, {
      hint: 'A one-time amount, compounded once a year at the rate you choose.',
      tiles: [
        { id: 'ls-invested', label: 'You invest' },
        { id: 'ls-returns', label: 'Estimated return' },
      ],
      canvasId: 'ls-chart',
      legend: ['You invest', 'Estimated return'],
      compareTitle: 'Same amount, different returns',
      leadId: 'ls-compare-lead',
      listId: 'ls-compare-list',
    });
  }

  calculate() {
    this.investment = parseFloat(document.getElementById('ls-amount').value) || 0;
    this.expectedReturn = parseFloat(document.getElementById('ls-return').value) || 0;
    this.timePeriod = parseFloat(document.getElementById('ls-years').value) || 0;
    const P = this.investment;
    const t = this.timePeriod;
    const futureValue = P * Math.pow(1 + this.expectedReturn / 100, t);
    const wealthGained = futureValue - P;
    const rates = CalculatorUtils.ratesInRange(this.expectedReturn, 1, 30, [8, 10, 12]);
    this.chart = CalculatorUtils.paintGrowth(this.chart, {
      investedId: 'ls-invested',
      gainId: 'ls-returns',
      canvasId: 'ls-chart',
      invested: P,
      gained: wealthGained,
      centerLabel: 'Total',
      listId: 'ls-compare-list',
      leadId: 'ls-compare-lead',
      lead: CalculatorUtils.formatCurrency(P) + ' once, for ' + t + ' years. Only the yearly return changes.',
      rows: rates.map(rate => {
        const future = P * Math.pow(1 + rate / 100, t);
        const yours = Math.abs(rate - this.expectedReturn) < 0.05;
        return {
          primary: rate + '%',
          tag: yours ? 'Your rate' : '',
          yours,
          figures: [
            { label: 'Return', value: CalculatorUtils.formatCurrency(future - P) },
            { label: 'Total', value: CalculatorUtils.formatCurrency(future) },
          ],
        };
      }),
    });
  }

  renderChart(P, r, t) {
    const labels = [];
    const invested = [];
    const total = [];
    for (let y = 0; y <= t; y++) {
      labels.push(y === 0 ? 'Start' : `Yr ${y}`);
      invested.push(P);
      total.push(P * Math.pow(1 + r, y));
    }

    const ctx = document.getElementById('ls-chart').getContext('2d');
    if (this.chart) this.chart.destroy();

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Amount Invested',
            data: invested,
            borderColor: '#3498db',
            backgroundColor: 'rgba(52,152,219,0.1)',
            borderWidth: 1.5,
            borderDash: [6, 4],
            fill: true,
            tension: 0,
            pointRadius: 0,
          },
          {
            label: 'Total Value',
            data: total,
            borderColor: '#9b59b6',
            backgroundColor: 'rgba(155,89,182,0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: { label: c => `${c.dataset.label}: ${CalculatorUtils.formatCurrency(c.raw)}` },
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11 } } },
          y: {
            beginAtZero: false,
            ticks: { font: { size: 11 }, callback: v => CalculatorUtils.formatChartAxis(v) },
            grid: { color: 'rgba(0,0,0,0.05)' },
          },
        },
      },
    });
  }
}

registerCalculator('lumpsum', LumpsumCalculator);

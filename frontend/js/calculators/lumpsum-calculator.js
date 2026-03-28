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
    [['ls-amount', 'investment'], ['ls-return', 'expectedReturn'], ['ls-years', 'timePeriod']].forEach(([id, field]) => {
      document.getElementById(id).addEventListener('input', e => {
        this[field] = parseFloat(e.target.value) || 0;
        document.getElementById(`${id}-value`).textContent = CalculatorUtils.formatIndianNumber(this[field]);
        CalculatorUtils.updateSliderProgress(e.target);
      });
      document.getElementById(id).addEventListener('change', () => this.calculate());
    });
    document.getElementById('ls-calculate').addEventListener('click', () => this.calculate());
    setTimeout(() => CalculatorUtils.initSliderProgress(), 50);
  }

  calculate() {
    const P = this.investment;
    const r = this.expectedReturn / 100;
    const t = this.timePeriod;

    const futureValue = P * Math.pow(1 + r, t);
    const wealthGained = futureValue - P;
    const multiple = futureValue / P;

    document.getElementById('ls-results').style.display = 'block';
    document.getElementById('ls-invested').textContent = CalculatorUtils.formatCurrency(P);
    document.getElementById('ls-returns').textContent = CalculatorUtils.formatCurrency(wealthGained);
    document.getElementById('ls-total').textContent = CalculatorUtils.formatCurrency(futureValue);
    document.getElementById('ls-cagr').textContent = `${this.expectedReturn.toFixed(1)}%`;
    document.getElementById('ls-multiple').textContent = `${multiple.toFixed(1)}x`;

    this.renderChart(P, r, t);
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

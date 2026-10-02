/**
 * Compound Interest Calculator with Growth Chart
 */

class CompoundInterestCalculator {
  constructor(container) {
    this.container = container;
    this.principal = 500000;
    this.rate = 8;
    this.time = 10;
    this.chart = null;
  }

  render() {
    this.container.innerHTML = `
      <div class="calc-form">
        ${CalculatorUtils.createSlider('ci-principal', 'Principal Amount', 10000, 10000000, this.principal, 10000, '', '₹')}
        ${CalculatorUtils.createSlider('ci-rate', 'Annual Interest Rate', 1, 20, this.rate, 0.5, '%', '')}
        ${CalculatorUtils.createSlider('ci-time', 'Time Period', 1, 30, this.time, 1, ' years', '')}
        
        <div style="text-align: center; margin-top: 10px;">
          <button class="calc-btn" id="ci-calculate">
            <i class="fa fa-calculator"></i> Calculate Growth
          </button>
        </div>

        <div class="calc-results" id="ci-results" style="display: none;">
          <h4 class="calc-results-title">Compound Interest Details</h4>
          <div class="calc-results-grid">
            <div class="calc-result-box" style="border-color: #3498db">
              <div class="calc-result-label">Principal Amount</div>
              <div class="calc-result-value" id="ci-principal-result" style="color: #3498db">₹0</div>
            </div>
            <div class="calc-result-box" style="border-color: #27ae60">
              <div class="calc-result-label">Interest Earned</div>
              <div class="calc-result-value" id="ci-interest" style="color: #27ae60">₹0</div>
            </div>
            <div class="calc-result-box" style="border-color: #9b59b6">
              <div class="calc-result-label">Total Amount</div>
              <div class="calc-result-value" id="ci-total" style="color: #9b59b6">₹0</div>
            </div>
          </div>

          <div class="calc-chart-container">
            <h5 class="calc-chart-title">Compound vs Simple Interest Growth</h5>
            <div class="calc-chart-wrapper">
              <canvas id="ci-chart"></canvas>
            </div>
            <div class="calc-chart-legend">
              <div class="calc-legend-item">
                <span class="calc-legend-dot" style="background: #27ae60"></span>
                <span>Compound Interest</span>
              </div>
              <div class="calc-legend-item">
                <span class="calc-legend-dot" style="background: #e74c3c"></span>
                <span>Simple Interest</span>
              </div>
              <div class="calc-legend-item">
                <span class="calc-legend-dot" style="background: #3498db"></span>
                <span>Principal</span>
              </div>
            </div>
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
      { id: 'ci-principal', display: (n) => CalculatorUtils.formatIndianNumber(n), end: CalculatorUtils.moneyEnd },
      { id: 'ci-rate', display: (n) => n.toFixed(1), end: (n) => n + '%' },
      { id: 'ci-time', display: (n) => String(n), end: (n) => n + ' yr' },
    ], () => this.calculate(), () => this.chart);
  }

  mount() {
    CalculatorUtils.adoptModern(this.container, {
      hint: 'This compounds every month. Simple interest on the same amount is shown beside it.',
      tiles: [
        { id: 'ci-principal-result', label: 'You invest' },
        { id: 'ci-interest', label: 'Compound interest' },
      ],
      canvasId: 'ci-chart',
      legend: ['You invest', 'Compound interest'],
      compareTitle: 'Same amount, simple and compound',
      leadId: 'ci-compare-lead',
      listId: 'ci-compare-list',
    });
  }

  calculate() {
    this.principal = parseFloat(document.getElementById('ci-principal').value) || 0;
    this.rate = parseFloat(document.getElementById('ci-rate').value) || 0;
    this.time = parseInt(document.getElementById('ci-time').value, 10) || 0;
    const P = this.principal;
    const t = this.time;
    const n = 12;
    const total = P * Math.pow(1 + (this.rate / 100) / n, n * t);
    const interest = total - P;
    const simpleInterest = (P * this.rate * t) / 100;
    const rates = CalculatorUtils.ratesInRange(this.rate, 1, 20, [6, 8, 10]);
    const rows = [{
      primary: 'Simple',
      tag: 'Same rate',
      yours: false,
      figures: [
        { label: 'Interest', value: CalculatorUtils.formatCurrency(simpleInterest) },
        { label: 'Total', value: CalculatorUtils.formatCurrency(P + simpleInterest) },
      ],
    }];
    rates.forEach(rate => {
      const rowTotal = P * Math.pow(1 + (rate / 100) / n, n * t);
      const yours = Math.abs(rate - this.rate) < 0.05;
      rows.push({
        primary: rate + '%',
        tag: yours ? 'Your rate' : '',
        yours,
        figures: [
          { label: 'Interest', value: CalculatorUtils.formatCurrency(rowTotal - P) },
          { label: 'Total', value: CalculatorUtils.formatCurrency(rowTotal) },
        ],
      });
    });
    this.chart = CalculatorUtils.paintGrowth(this.chart, {
      investedId: 'ci-principal-result',
      gainId: 'ci-interest',
      canvasId: 'ci-chart',
      invested: P,
      gained: interest,
      centerLabel: 'Total',
      listId: 'ci-compare-list',
      leadId: 'ci-compare-lead',
      lead: CalculatorUtils.formatCurrency(P) + ' for ' + t + ' years. Compound rows use monthly compounding.',
      rows,
    });
  }

  renderChart() {
    const years = this.time;
    const labels = [];
    const principalData = [];
    const compoundData = [];
    const simpleData = [];

    const P = this.principal;
    const r = this.rate / 100;

    for (let year = 0; year <= years; year++) {
      labels.push(year === 0 ? 'Start' : `Year ${year}`);
      principalData.push(P);
      compoundData.push(P * Math.pow(1 + r / 12, 12 * year));
      simpleData.push(P + (P * r * year));
    }

    const ctx = document.getElementById('ci-chart').getContext('2d');
    if (this.chart) this.chart.destroy();

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Compound Interest',
            data: compoundData,
            borderColor: '#27ae60',
            backgroundColor: 'rgba(39, 174, 96, 0.1)',
            borderWidth: 1.5,
            fill: true,
            tension: 0.4,
            pointRadius: 2,
            pointBackgroundColor: '#27ae60'
          },
          {
            label: 'Simple Interest',
            data: simpleData,
            borderColor: '#e74c3c',
            borderWidth: 1,
            fill: false,
            borderDash: [5, 5],
            pointRadius: 2,
            pointBackgroundColor: '#e74c3c'
          },
          {
            label: 'Principal',
            data: principalData,
            borderColor: '#3498db',
            borderWidth: 1,
            fill: false,
            pointRadius: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => `${context.dataset.label}: ${CalculatorUtils.formatCurrency(context.raw)}`
            }
          }
        },
        scales: {
          x: { grid: { display: false } },
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => CalculatorUtils.formatChartAxis(value)
            }
          }
        }
      }
    });
  }
}

registerCalculator('compound-interest', CompoundInterestCalculator);

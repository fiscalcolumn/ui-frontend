/**
 * Simple Interest Calculator with Chart
 */

class SimpleInterestCalculator {
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
        ${CalculatorUtils.createSlider('si-principal', 'Principal Amount', 10000, 10000000, this.principal, 10000, '', '₹')}
        ${CalculatorUtils.createSlider('si-rate', 'Annual Interest Rate', 1, 20, this.rate, 0.5, '%', '')}
        ${CalculatorUtils.createSlider('si-time', 'Time Period', 1, 30, this.time, 1, ' years', '')}
        
        <div style="text-align: center; margin-top: 10px;">
          <button class="calc-btn" id="si-calculate">
            <i class="fa fa-calculator"></i> Calculate Interest
          </button>
        </div>

        <div class="calc-results" id="si-results" style="display: none;">
          <h4 class="calc-results-title">Simple Interest Details</h4>
          <div class="calc-results-grid">
            <div class="calc-result-box" style="border-color: #3498db">
              <div class="calc-result-label">Principal Amount</div>
              <div class="calc-result-value" id="si-principal-result" style="color: #3498db">₹0</div>
            </div>
            <div class="calc-result-box" style="border-color: #27ae60">
              <div class="calc-result-label">Interest Earned</div>
              <div class="calc-result-value" id="si-interest" style="color: #27ae60">₹0</div>
            </div>
            <div class="calc-result-box" style="border-color: #9b59b6">
              <div class="calc-result-label">Total Amount</div>
              <div class="calc-result-value" id="si-total" style="color: #9b59b6">₹0</div>
            </div>
          </div>

          <div class="calc-chart-container">
            <h5 class="calc-chart-title">Interest Growth Over Time</h5>
            <div class="calc-chart-wrapper">
              <canvas id="si-chart"></canvas>
            </div>
            <div class="calc-chart-legend">
              <div class="calc-legend-item">
                <span class="calc-legend-dot" style="background: #3498db"></span>
                <span>Principal</span>
              </div>
              <div class="calc-legend-item">
                <span class="calc-legend-dot" style="background: #27ae60"></span>
                <span>Total Value</span>
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
      { id: 'si-principal', display: (n) => CalculatorUtils.formatIndianNumber(n), end: CalculatorUtils.moneyEnd },
      { id: 'si-rate', display: (n) => n.toFixed(1), end: (n) => n + '%' },
      { id: 'si-time', display: (n) => String(n), end: (n) => n + ' yr' },
    ], () => this.calculate(), () => this.chart);
  }

  mount() {
    CalculatorUtils.adoptModern(this.container, {
      hint: 'Interest is charged only on the original amount, once a year.',
      tiles: [
        { id: 'si-principal-result', label: 'You invest' },
        { id: 'si-interest', label: 'Interest' },
      ],
      canvasId: 'si-chart',
      legend: ['You invest', 'Interest'],
      compareTitle: 'Same amount, different rates',
      leadId: 'si-compare-lead',
      listId: 'si-compare-list',
    });
  }

  calculate() {
    this.principal = parseFloat(document.getElementById('si-principal').value) || 0;
    this.rate = parseFloat(document.getElementById('si-rate').value) || 0;
    this.time = parseInt(document.getElementById('si-time').value, 10) || 0;
    const P = this.principal;
    const t = this.time;
    const interest = (P * this.rate * t) / 100;
    const rates = CalculatorUtils.ratesInRange(this.rate, 1, 20, [6, 8, 10]);
    this.chart = CalculatorUtils.paintGrowth(this.chart, {
      investedId: 'si-principal-result',
      gainId: 'si-interest',
      canvasId: 'si-chart',
      invested: P,
      gained: interest,
      centerLabel: 'Total',
      listId: 'si-compare-list',
      leadId: 'si-compare-lead',
      lead: CalculatorUtils.formatCurrency(P) + ' for ' + t + ' years. Only the yearly rate changes.',
      rows: rates.map(rate => {
        const rowInterest = (P * rate * t) / 100;
        const yours = Math.abs(rate - this.rate) < 0.05;
        return {
          primary: rate + '%',
          tag: yours ? 'Your rate' : '',
          yours,
          figures: [
            { label: 'Interest', value: CalculatorUtils.formatCurrency(rowInterest) },
            { label: 'Total', value: CalculatorUtils.formatCurrency(P + rowInterest) },
          ],
        };
      }),
    });
  }

  renderChart() {
    const years = this.time;
    const labels = [];
    const principalData = [];
    const totalData = [];

    const P = this.principal;
    const r = this.rate / 100;

    for (let year = 0; year <= years; year++) {
      labels.push(year === 0 ? 'Start' : `Year ${year}`);
      principalData.push(P);
      totalData.push(P + (P * r * year));
    }

    const ctx = document.getElementById('si-chart').getContext('2d');
    if (this.chart) this.chart.destroy();

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Total Value',
            data: totalData,
            borderColor: '#27ae60',
            backgroundColor: 'rgba(39, 174, 96, 0.1)',
            borderWidth: 1.5,
            fill: true,
            tension: 0,
            pointRadius: 2,
            pointBackgroundColor: '#27ae60'
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

registerCalculator('simple-interest', SimpleInterestCalculator);

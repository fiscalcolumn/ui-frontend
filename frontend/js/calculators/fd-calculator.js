/**
 * FD Calculator with Growth Chart
 */

class FDCalculator {
  constructor(container) {
    this.container = container;
    this.principal = 500000;
    this.interestRate = 7;
    this.tenure = 5;
    this.compounding = 4;
    this.chart = null;
  }

  render() {
    this.container.innerHTML = `
      <div class="calc-form">
        ${CalculatorUtils.createSlider('fd-principal', 'Principal Amount', 10000, 10000000, this.principal, 10000, '', '₹')}
        ${CalculatorUtils.createSlider('fd-rate', 'Interest Rate (p.a.)', 1, 15, this.interestRate, 0.1, '%', '')}
        ${CalculatorUtils.createSlider('fd-tenure', 'Tenure', 1, 10, this.tenure, 1, ' years', '')}
        
        <div style="text-align: center; margin-top: 10px;">
          <button class="calc-btn" id="fd-calculate">
            <i class="fa fa-calculator"></i> Calculate Maturity
          </button>
        </div>

        <div class="calc-results" id="fd-results" style="display: none;">
          <h4 class="calc-results-title">FD Maturity Details</h4>
          <div class="calc-results-grid">
            <div class="calc-result-box" style="border-color: #3498db">
              <div class="calc-result-label">Principal Amount</div>
              <div class="calc-result-value" id="fd-principal-display" style="color: #3498db">₹0</div>
            </div>
            <div class="calc-result-box" style="border-color: #27ae60">
              <div class="calc-result-label">Interest Earned</div>
              <div class="calc-result-value" id="fd-interest" style="color: #27ae60">₹0</div>
            </div>
            <div class="calc-result-box" style="border-color: #9b59b6">
              <div class="calc-result-label">Maturity Amount</div>
              <div class="calc-result-value" id="fd-maturity" style="color: #9b59b6">₹0</div>
            </div>
          </div>

          <div class="calc-chart-container">
            <h5 class="calc-chart-title">FD Growth Over Time</h5>
            <div class="calc-chart-wrapper">
              <canvas id="fd-chart"></canvas>
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
      { id: 'fd-principal', display: (n) => CalculatorUtils.formatIndianNumber(n), end: CalculatorUtils.moneyEnd },
      { id: 'fd-rate', display: (n) => n.toFixed(1), end: (n) => n + '%' },
      { id: 'fd-tenure', display: (n) => String(n), end: (n) => n + ' yr' },
    ], () => this.calculate(), () => this.chart);
  }

  mount() {
    CalculatorUtils.adoptModern(this.container, {
      hint: 'Interest is compounded every quarter. That frequency stays fixed.',
      tiles: [
        { id: 'fd-principal-display', label: 'You invest' },
        { id: 'fd-interest', label: 'Interest' },
      ],
      canvasId: 'fd-chart',
      legend: ['You invest', 'Interest'],
      compareTitle: 'Same deposit, different rates',
      leadId: 'fd-compare-lead',
      listId: 'fd-compare-list',
    });
  }

  calculate() {
    this.principal = parseFloat(document.getElementById('fd-principal').value) || 0;
    this.interestRate = parseFloat(document.getElementById('fd-rate').value) || 0;
    this.tenure = parseInt(document.getElementById('fd-tenure').value, 10) || 0;
    const P = this.principal;
    const n = this.compounding;
    const t = this.tenure;
    const maturityAmount = CalculatorUtils.compoundInterest(P, this.interestRate / 100, n, t);
    const interest = maturityAmount - P;
    const rates = CalculatorUtils.ratesInRange(this.interestRate, 1, 15, [6, 7, 8]);
    this.chart = CalculatorUtils.paintGrowth(this.chart, {
      investedId: 'fd-principal-display',
      gainId: 'fd-interest',
      canvasId: 'fd-chart',
      invested: P,
      gained: interest,
      centerLabel: 'Maturity',
      listId: 'fd-compare-list',
      leadId: 'fd-compare-lead',
      lead: CalculatorUtils.formatCurrency(P) + ' for ' + t + ' years, compounded quarterly. Only the yearly rate changes.',
      rows: rates.map(rate => {
        const maturity = CalculatorUtils.compoundInterest(P, rate / 100, n, t);
        const yours = Math.abs(rate - this.interestRate) < 0.05;
        return {
          primary: rate + '%',
          tag: yours ? 'Your rate' : '',
          yours,
          figures: [
            { label: 'Interest', value: CalculatorUtils.formatCurrency(maturity - P) },
            { label: 'Maturity', value: CalculatorUtils.formatCurrency(maturity) },
          ],
        };
      }),
    });
  }

  renderChart() {
    const years = this.tenure;
    const labels = [];
    const principalData = [];
    const totalData = [];

    const P = this.principal;
    const r = this.interestRate / 100;
    const n = this.compounding;

    for (let year = 0; year <= years; year++) {
      labels.push(year === 0 ? 'Start' : `Year ${year}`);
      principalData.push(P);
      const total = CalculatorUtils.compoundInterest(P, r, n, year);
      totalData.push(total);
    }

    const ctx = document.getElementById('fd-chart').getContext('2d');

    if (this.chart) {
      this.chart.destroy();
    }

    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Principal',
            data: principalData,
            backgroundColor: 'rgba(52, 152, 219, 0.8)',
            borderColor: '#3498db',
            borderWidth: 1,
            borderRadius: 4
          },
          {
            label: 'Total Value',
            data: totalData,
            backgroundColor: 'rgba(39, 174, 96, 0.8)',
            borderColor: '#27ae60',
            borderWidth: 1,
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            callbacks: {
              label: (context) => `${context.dataset.label}: ${CalculatorUtils.formatCurrency(context.raw)}`
            }
          }
        },
        scales: {
          x: { grid: { display: false } },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0, 0, 0, 0.05)' },
            ticks: {
              callback: (value) => CalculatorUtils.formatChartAxis(value)
            }
          }
        }
      }
    });
  }
}

registerCalculator('fd', FDCalculator);

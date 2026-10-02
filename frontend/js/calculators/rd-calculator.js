/**
 * RD Calculator with Growth Chart
 */

class RDCalculator {
  constructor(container) {
    this.container = container;
    this.monthlyDeposit = 10000;
    this.interestRate = 7;
    this.tenure = 5;
    this.chart = null;
  }

  render() {
    this.container.innerHTML = `
      <div class="calc-form">
        ${CalculatorUtils.createSlider('rd-monthly', 'Monthly Deposit', 500, 100000, this.monthlyDeposit, 500, '', '₹')}
        ${CalculatorUtils.createSlider('rd-rate', 'Interest Rate (p.a.)', 4, 10, this.interestRate, 0.1, '%', '')}
        ${CalculatorUtils.createSlider('rd-tenure', 'Tenure', 1, 10, this.tenure, 1, ' years', '')}
        
        <div style="text-align: center; margin-top: 10px;">
          <button class="calc-btn" id="rd-calculate">
            <i class="fa fa-calculator"></i> Calculate Maturity
          </button>
        </div>

        <div class="calc-results" id="rd-results" style="display: none;">
          <h4 class="calc-results-title">RD Maturity Details</h4>
          <div class="calc-results-grid">
            <div class="calc-result-box" style="border-color: #3498db">
              <div class="calc-result-label">Total Deposited</div>
              <div class="calc-result-value" id="rd-deposited" style="color: #3498db">₹0</div>
            </div>
            <div class="calc-result-box" style="border-color: #27ae60">
              <div class="calc-result-label">Interest Earned</div>
              <div class="calc-result-value" id="rd-interest" style="color: #27ae60">₹0</div>
            </div>
            <div class="calc-result-box" style="border-color: #9b59b6">
              <div class="calc-result-label">Maturity Amount</div>
              <div class="calc-result-value" id="rd-maturity" style="color: #9b59b6">₹0</div>
            </div>
          </div>

          <div class="calc-chart-container">
            <h5 class="calc-chart-title">RD Growth Over Time</h5>
            <div class="calc-chart-wrapper">
              <canvas id="rd-chart"></canvas>
            </div>
            <div class="calc-chart-legend">
              <div class="calc-legend-item">
                <span class="calc-legend-dot" style="background: #3498db"></span>
                <span>Amount Deposited</span>
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
      { id: 'rd-monthly', display: (n) => CalculatorUtils.formatIndianNumber(n), end: CalculatorUtils.moneyEnd },
      { id: 'rd-rate', display: (n) => n.toFixed(1), end: (n) => n + '%' },
      { id: 'rd-tenure', display: (n) => String(n), end: (n) => n + ' yr' },
    ], () => this.calculate(), () => this.chart);
  }

  mount() {
    CalculatorUtils.adoptModern(this.container, {
      hint: 'Each monthly deposit earns interest compounded every quarter.',
      tiles: [
        { id: 'rd-deposited', label: 'You deposit' },
        { id: 'rd-interest', label: 'Interest' },
      ],
      canvasId: 'rd-chart',
      legend: ['You deposit', 'Interest'],
      compareTitle: 'Same deposit, different rates',
      leadId: 'rd-compare-lead',
      listId: 'rd-compare-list',
    });
  }

  calculateRDMaturity(P, r, months) {
    const quarterlyRate = r / 4;
    let maturity = 0;
    for (let i = 1; i <= months; i++) {
      maturity += P * Math.pow(1 + quarterlyRate, (months - i + 1) / 3);
    }
    return maturity;
  }

  calculate() {
    this.monthlyDeposit = parseFloat(document.getElementById('rd-monthly').value) || 0;
    this.interestRate = parseFloat(document.getElementById('rd-rate').value) || 0;
    this.tenure = parseInt(document.getElementById('rd-tenure').value, 10) || 0;
    const P = this.monthlyDeposit;
    const n = this.tenure * 12;
    const maturity = this.calculateRDMaturity(P, this.interestRate / 100, n);
    const deposited = P * n;
    const interest = maturity - deposited;
    const rates = CalculatorUtils.ratesInRange(this.interestRate, 4, 10, [6, 7, 8]);
    this.chart = CalculatorUtils.paintGrowth(this.chart, {
      investedId: 'rd-deposited',
      gainId: 'rd-interest',
      canvasId: 'rd-chart',
      invested: deposited,
      gained: interest,
      centerLabel: 'Maturity',
      listId: 'rd-compare-list',
      leadId: 'rd-compare-lead',
      lead: `${CalculatorUtils.formatCurrency(P)} every month for ${this.tenure} years. Only the yearly rate changes.`,
      rows: rates.map(rate => {
        const rowMaturity = this.calculateRDMaturity(P, rate / 100, n);
        const yours = Math.abs(rate - this.interestRate) < 0.05;
        return {
          primary: `${rate}%`,
          tag: yours ? 'Your rate' : '',
          yours,
          figures: [
            { label: 'Interest', value: CalculatorUtils.formatCurrency(rowMaturity - deposited) },
            { label: 'Maturity', value: CalculatorUtils.formatCurrency(rowMaturity) },
          ],
        };
      }),
    });
  }

  renderChart() {
    const years = this.tenure;
    const labels = [];
    const depositedData = [];
    const totalData = [];

    const P = this.monthlyDeposit;
    const r = this.interestRate / 100;

    for (let year = 0; year <= years; year++) {
      labels.push(year === 0 ? 'Start' : `Year ${year}`);
      const months = year * 12;
      depositedData.push(P * months);
      totalData.push(months === 0 ? 0 : this.calculateRDMaturity(P, r, months));
    }

    const ctx = document.getElementById('rd-chart').getContext('2d');
    if (this.chart) this.chart.destroy();

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Amount Deposited',
            data: depositedData,
            borderColor: '#3498db',
            backgroundColor: 'rgba(52, 152, 219, 0.1)',
            borderWidth: 1.5,
            fill: true,
            tension: 0.4,
            pointRadius: 2,
            pointBackgroundColor: '#3498db'
          },
          {
            label: 'Total Value',
            data: totalData,
            borderColor: '#27ae60',
            backgroundColor: 'rgba(39, 174, 96, 0.1)',
            borderWidth: 1.5,
            fill: true,
            tension: 0.4,
            pointRadius: 2,
            pointBackgroundColor: '#27ae60'
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

registerCalculator('rd', RDCalculator);

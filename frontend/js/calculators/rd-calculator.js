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
    document.getElementById('rd-monthly').addEventListener('input', (e) => {
      this.monthlyDeposit = parseFloat(e.target.value);
      document.getElementById('rd-monthly-value').textContent = CalculatorUtils.formatIndianNumber(this.monthlyDeposit);
    });
    document.getElementById('rd-rate').addEventListener('input', (e) => {
      this.interestRate = parseFloat(e.target.value);
      document.getElementById('rd-rate-value').textContent = this.interestRate.toFixed(1);
    });
    document.getElementById('rd-tenure').addEventListener('input', (e) => {
      this.tenure = parseInt(e.target.value);
      document.getElementById('rd-tenure-value').textContent = this.tenure;
    });
    document.getElementById('rd-calculate').addEventListener('click', () => this.calculate());
    ['rd-monthly', 'rd-rate', 'rd-tenure'].forEach(id => {
      document.getElementById(id).addEventListener('change', () => this.calculate());
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
    const P = this.monthlyDeposit;
    const r = this.interestRate / 100;
    const n = this.tenure * 12;
    
    const maturity = this.calculateRDMaturity(P, r, n);
    const deposited = P * n;
    const interest = maturity - deposited;

    document.getElementById('rd-results').style.display = 'block';
    document.getElementById('rd-deposited').textContent = CalculatorUtils.formatCurrency(deposited);
    document.getElementById('rd-interest').textContent = CalculatorUtils.formatCurrency(interest);
    document.getElementById('rd-maturity').textContent = CalculatorUtils.formatCurrency(maturity);

    this.renderChart();
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

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
    document.getElementById('fd-principal').addEventListener('input', (e) => {
      this.principal = parseFloat(e.target.value);
      document.getElementById('fd-principal-value').textContent = CalculatorUtils.formatIndianNumber(this.principal);
    });

    document.getElementById('fd-rate').addEventListener('input', (e) => {
      this.interestRate = parseFloat(e.target.value);
      document.getElementById('fd-rate-value').textContent = this.interestRate.toFixed(1);
    });

    document.getElementById('fd-tenure').addEventListener('input', (e) => {
      this.tenure = parseInt(e.target.value);
      document.getElementById('fd-tenure-value').textContent = this.tenure;
    });

    document.getElementById('fd-calculate').addEventListener('click', () => this.calculate());

    ['fd-principal', 'fd-rate', 'fd-tenure'].forEach(id => {
      document.getElementById(id).addEventListener('change', () => this.calculate());
    });
  }

  calculate() {
    const P = this.principal;
    const r = this.interestRate / 100;
    const n = this.compounding;
    const t = this.tenure;

    const maturityAmount = CalculatorUtils.compoundInterest(P, r, n, t);
    const interest = maturityAmount - P;

    document.getElementById('fd-results').style.display = 'block';
    document.getElementById('fd-principal-display').textContent = CalculatorUtils.formatCurrency(P);
    document.getElementById('fd-interest').textContent = CalculatorUtils.formatCurrency(interest);
    document.getElementById('fd-maturity').textContent = CalculatorUtils.formatCurrency(maturityAmount);

    this.renderChart();
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

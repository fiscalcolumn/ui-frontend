/**
 * PPF Calculator with Growth Chart
 */

class PPFCalculator {
  constructor(container) {
    this.container = container;
    this.yearlyInvestment = 150000;
    this.interestRate = 7.1;
    this.tenure = 15;
    this.chart = null;
  }

  render() {
    this.container.innerHTML = `
      <div class="calc-form">
        ${CalculatorUtils.createSlider('ppf-yearly', 'Yearly Investment', 500, 150000, this.yearlyInvestment, 500, '', '₹')}
        ${CalculatorUtils.createSlider('ppf-rate', 'Interest Rate (p.a.)', 5, 10, this.interestRate, 0.1, '%', '')}
        ${CalculatorUtils.createSlider('ppf-tenure', 'Investment Period', 15, 50, this.tenure, 5, ' years', '')}
        
        <div style="text-align: center; margin-top: 10px;">
          <button class="calc-btn" id="ppf-calculate">
            <i class="fa fa-calculator"></i> Calculate Maturity
          </button>
        </div>

        <div class="calc-results" id="ppf-results" style="display: none;">
          <h4 class="calc-results-title">PPF Maturity Details</h4>
          <div class="calc-results-grid">
            <div class="calc-result-box" style="border-color: #3498db">
              <div class="calc-result-label">Total Investment</div>
              <div class="calc-result-value" id="ppf-invested" style="color: #3498db">₹0</div>
            </div>
            <div class="calc-result-box" style="border-color: #27ae60">
              <div class="calc-result-label">Interest Earned</div>
              <div class="calc-result-value" id="ppf-interest" style="color: #27ae60">₹0</div>
            </div>
            <div class="calc-result-box" style="border-color: #9b59b6">
              <div class="calc-result-label">Maturity Value</div>
              <div class="calc-result-value" id="ppf-maturity" style="color: #9b59b6">₹0</div>
            </div>
          </div>

          <div class="calc-chart-container">
            <h5 class="calc-chart-title">PPF Growth Over Time</h5>
            <div class="calc-chart-wrapper">
              <canvas id="ppf-chart"></canvas>
            </div>
            <div class="calc-chart-legend">
              <div class="calc-legend-item">
                <span class="calc-legend-dot" style="background: #3498db"></span>
                <span>Amount Invested</span>
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
    document.getElementById('ppf-yearly').addEventListener('input', (e) => {
      this.yearlyInvestment = parseFloat(e.target.value);
      document.getElementById('ppf-yearly-value').textContent = CalculatorUtils.formatIndianNumber(this.yearlyInvestment);
    });
    document.getElementById('ppf-rate').addEventListener('input', (e) => {
      this.interestRate = parseFloat(e.target.value);
      document.getElementById('ppf-rate-value').textContent = this.interestRate.toFixed(1);
    });
    document.getElementById('ppf-tenure').addEventListener('input', (e) => {
      this.tenure = parseInt(e.target.value);
      document.getElementById('ppf-tenure-value').textContent = this.tenure;
    });
    document.getElementById('ppf-calculate').addEventListener('click', () => this.calculate());
    ['ppf-yearly', 'ppf-rate', 'ppf-tenure'].forEach(id => {
      document.getElementById(id).addEventListener('change', () => this.calculate());
    });
  }

  calculate() {
    const P = this.yearlyInvestment;
    const r = this.interestRate / 100;
    const n = this.tenure;
    
    let maturity = 0;
    for (let i = 0; i < n; i++) {
      maturity = (maturity + P) * (1 + r);
    }
    const invested = P * n;
    const interest = maturity - invested;

    document.getElementById('ppf-results').style.display = 'block';
    document.getElementById('ppf-invested').textContent = CalculatorUtils.formatCurrency(invested);
    document.getElementById('ppf-interest').textContent = CalculatorUtils.formatCurrency(interest);
    document.getElementById('ppf-maturity').textContent = CalculatorUtils.formatCurrency(maturity);

    this.renderChart();
  }

  renderChart() {
    const years = this.tenure;
    const labels = [];
    const investedData = [];
    const totalData = [];

    const P = this.yearlyInvestment;
    const r = this.interestRate / 100;

    let runningTotal = 0;
    for (let year = 0; year <= years; year++) {
      labels.push(year === 0 ? 'Start' : `Y${year}`);
      investedData.push(P * year);
      if (year > 0) {
        runningTotal = (runningTotal + P) * (1 + r);
      }
      totalData.push(runningTotal);
    }

    const ctx = document.getElementById('ppf-chart').getContext('2d');
    if (this.chart) this.chart.destroy();

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Amount Invested',
            data: investedData,
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

registerCalculator('ppf', PPFCalculator);

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
      <div class="calc-form">
        ${CalculatorUtils.createSlider('sip-monthly', 'Monthly Investment', 500, 100000, this.monthlyInvestment, 500, '', '₹')}
        ${CalculatorUtils.createSlider('sip-return', 'Expected Return Rate (p.a.)', 1, 30, this.expectedReturn, 0.5, '%', '')}
        ${CalculatorUtils.createSlider('sip-years', 'Investment Period', 1, 40, this.timePeriod, 1, ' years', '')}
        
        <div style="text-align: center; margin-top: 1px;">
          <button class="calc-btn" id="sip-calculate">
            <i class="fa fa-calculator"></i> Calculate Returns
          </button>
        </div>

        <div class="calc-results" id="sip-results" style="display: none;">
          <h4 class="calc-results-title">Your SIP Returns</h4>
          <div class="calc-results-grid">
            <div class="calc-result-box" style="border-color: #3498db">
              <div class="calc-result-label">Total Investment</div>
              <div class="calc-result-value" id="sip-invested" style="color: #3498db">₹0</div>
            </div>
            <div class="calc-result-box" style="border-color: #27ae60">
              <div class="calc-result-label">Wealth Gained</div>
              <div class="calc-result-value" id="sip-returns" style="color: #27ae60">₹0</div>
            </div>
            <div class="calc-result-box" style="border-color: #9b59b6">
              <div class="calc-result-label">Total Value</div>
              <div class="calc-result-value" id="sip-total" style="color: #9b59b6">₹0</div>
            </div>
          </div>

          <div class="calc-chart-container">
            <h5 class="calc-chart-title">Investment Growth Over Time</h5>
            <div class="calc-chart-wrapper">
              <canvas id="sip-chart"></canvas>
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

    document.getElementById('sip-calculate').addEventListener('click', () => this.calculate());

    ['sip-monthly', 'sip-return', 'sip-years'].forEach(id => {
      document.getElementById(id).addEventListener('change', () => this.calculate());
    });
  }

  calculate() {
    const P = this.monthlyInvestment;
    const r = this.expectedReturn / 100 / 12;
    const n = this.timePeriod * 12;

    const futureValue = CalculatorUtils.sipFutureValue(P, r, n);
    const totalInvested = P * n;
    const wealthGained = futureValue - totalInvested;

    // Show results
    document.getElementById('sip-results').style.display = 'block';
    document.getElementById('sip-invested').textContent = CalculatorUtils.formatCurrency(totalInvested);
    document.getElementById('sip-returns').textContent = CalculatorUtils.formatCurrency(wealthGained);
    document.getElementById('sip-total').textContent = CalculatorUtils.formatCurrency(futureValue);

    // Generate chart data
    this.renderChart();
  }

  renderChart() {
    const years = this.timePeriod;
    const labels = [];
    const investedData = [];
    const totalData = [];

    const P = this.monthlyInvestment;
    const r = this.expectedReturn / 100 / 12;

    for (let year = 0; year <= years; year++) {
      labels.push(year === 0 ? 'Start' : `Year ${year}`);
      const months = year * 12;
      const invested = P * months;
      const total = months === 0 ? 0 : CalculatorUtils.sipFutureValue(P, r, months);
      investedData.push(invested);
      totalData.push(total);
    }

    const ctx = document.getElementById('sip-chart').getContext('2d');

    if (this.chart) {
      this.chart.destroy();
    }

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
        interaction: {
          intersect: false,
          mode: 'index'
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            titleFont: { size: 14, weight: 'bold' },
            bodyFont: { size: 13 },
            callbacks: {
              label: (context) => {
                return `${context.dataset.label}: ${CalculatorUtils.formatCurrency(context.raw)}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              font: { size: 11 },
              maxRotation: 45
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            },
            ticks: {
              font: { size: 11 },
              callback: (value) => CalculatorUtils.formatChartAxis(value)
            }
          }
        }
      }
    });
  }
}

registerCalculator('sip', SIPCalculator);

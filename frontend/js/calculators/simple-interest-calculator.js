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
    document.getElementById('si-principal').addEventListener('input', (e) => {
      this.principal = parseFloat(e.target.value);
      document.getElementById('si-principal-value').textContent = CalculatorUtils.formatIndianNumber(this.principal);
    });
    document.getElementById('si-rate').addEventListener('input', (e) => {
      this.rate = parseFloat(e.target.value);
      document.getElementById('si-rate-value').textContent = this.rate.toFixed(1);
    });
    document.getElementById('si-time').addEventListener('input', (e) => {
      this.time = parseInt(e.target.value);
      document.getElementById('si-time-value').textContent = this.time;
    });
    document.getElementById('si-calculate').addEventListener('click', () => this.calculate());
    ['si-principal', 'si-rate', 'si-time'].forEach(id => {
      document.getElementById(id).addEventListener('change', () => this.calculate());
    });
  }

  calculate() {
    const P = this.principal;
    const r = this.rate;
    const t = this.time;

    const interest = (P * r * t) / 100;
    const total = P + interest;

    document.getElementById('si-results').style.display = 'block';
    document.getElementById('si-principal-result').textContent = CalculatorUtils.formatCurrency(P);
    document.getElementById('si-interest').textContent = CalculatorUtils.formatCurrency(interest);
    document.getElementById('si-total').textContent = CalculatorUtils.formatCurrency(total);

    this.renderChart();
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

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
    document.getElementById('ci-principal').addEventListener('input', (e) => {
      this.principal = parseFloat(e.target.value);
      document.getElementById('ci-principal-value').textContent = CalculatorUtils.formatIndianNumber(this.principal);
    });
    document.getElementById('ci-rate').addEventListener('input', (e) => {
      this.rate = parseFloat(e.target.value);
      document.getElementById('ci-rate-value').textContent = this.rate.toFixed(1);
    });
    document.getElementById('ci-time').addEventListener('input', (e) => {
      this.time = parseInt(e.target.value);
      document.getElementById('ci-time-value').textContent = this.time;
    });
    document.getElementById('ci-calculate').addEventListener('click', () => this.calculate());
    ['ci-principal', 'ci-rate', 'ci-time'].forEach(id => {
      document.getElementById(id).addEventListener('change', () => this.calculate());
    });
  }

  calculate() {
    const P = this.principal;
    const r = this.rate / 100;
    const t = this.time;
    const n = 12; // Monthly compounding

    const total = P * Math.pow(1 + r / n, n * t);
    const interest = total - P;

    document.getElementById('ci-results').style.display = 'block';
    document.getElementById('ci-principal-result').textContent = CalculatorUtils.formatCurrency(P);
    document.getElementById('ci-interest').textContent = CalculatorUtils.formatCurrency(interest);
    document.getElementById('ci-total').textContent = CalculatorUtils.formatCurrency(total);

    this.renderChart();
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

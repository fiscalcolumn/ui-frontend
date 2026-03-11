/**
 * EMI Calculator with Amortization Chart
 */

class EMICalculator {
  constructor(container) {
    this.container = container;
    this.loanAmount = 1000000;
    this.interestRate = 10;
    this.tenure = 60; // months
    this.chart = null;
  }

  render() {
    this.container.innerHTML = `
      <div class="calc-form">
        ${CalculatorUtils.createSlider('emi-amount', 'Loan Amount', 50000, 10000000, this.loanAmount, 50000, '', '₹')}
        ${CalculatorUtils.createSlider('emi-rate', 'Interest Rate', 5, 20, this.interestRate, 0.25, '%', '')}
        ${CalculatorUtils.createSlider('emi-tenure', 'Loan Tenure', 12, 360, this.tenure, 12, ' months', '')}
        
        <div style="text-align: center; margin-top: 10px;">
          <button class="calc-btn" id="emi-calculate">
            <i class="fa fa-calculator"></i> Calculate EMI
          </button>
        </div>

        <div class="calc-results" id="emi-results" style="display: none;">
          <h4 class="calc-results-title">Loan Summary</h4>
          <div class="calc-results-grid">
            <div class="calc-result-box" style="border-color: #3F51B5">
              <div class="calc-result-label">Monthly EMI</div>
              <div class="calc-result-value" id="emi-monthly" style="color: #3F51B5">₹0</div>
            </div>
            <div class="calc-result-box" style="border-color: #FF5722">
              <div class="calc-result-label">Total Interest</div>
              <div class="calc-result-value" id="emi-interest" style="color: #FF5722">₹0</div>
            </div>
            <div class="calc-result-box" style="border-color: #4CAF50">
              <div class="calc-result-label">Total Payment</div>
              <div class="calc-result-value" id="emi-total" style="color: #4CAF50">₹0</div>
            </div>
          </div>

          <div class="calc-chart-container">
            <h5 class="calc-chart-title">Principal vs Interest Breakdown</h5>
            <div class="calc-chart-wrapper">
              <canvas id="emi-chart"></canvas>
            </div>
            <div class="calc-chart-legend">
              <div class="calc-legend-item">
                <span class="calc-legend-dot" style="background: #3F51B5"></span>
                <span>Principal</span>
              </div>
              <div class="calc-legend-item">
                <span class="calc-legend-dot" style="background: #FF5722"></span>
                <span>Interest</span>
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
    const sliders = ['emi-amount', 'emi-rate', 'emi-tenure'];
    sliders.forEach(id => {
      document.getElementById(id).addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        const valueEl = document.getElementById(`${id}-value`);
        if (id === 'emi-amount') {
          valueEl.textContent = CalculatorUtils.formatIndianNumber(val);
        } else if (id === 'emi-rate') {
          valueEl.textContent = val.toFixed(2);
        } else {
          valueEl.textContent = val;
        }
      });
      document.getElementById(id).addEventListener('change', () => this.calculate());
    });
    document.getElementById('emi-calculate').addEventListener('click', () => this.calculate());
  }

  calculate() {
    this.loanAmount = parseFloat(document.getElementById('emi-amount').value);
    this.interestRate = parseFloat(document.getElementById('emi-rate').value);
    this.tenure = parseInt(document.getElementById('emi-tenure').value);

    const monthlyRate = this.interestRate / 12 / 100;
    const emi = this.loanAmount * monthlyRate * Math.pow(1 + monthlyRate, this.tenure) / 
                (Math.pow(1 + monthlyRate, this.tenure) - 1);
    
    const totalPayment = emi * this.tenure;
    const totalInterest = totalPayment - this.loanAmount;

    document.getElementById('emi-results').style.display = 'block';
    document.getElementById('emi-monthly').textContent = CalculatorUtils.formatCurrency(emi);
    document.getElementById('emi-interest').textContent = CalculatorUtils.formatCurrency(totalInterest);
    document.getElementById('emi-total').textContent = CalculatorUtils.formatCurrency(totalPayment);

    this.renderChart(totalInterest);
  }

  renderChart(totalInterest) {
    const ctx = document.getElementById('emi-chart').getContext('2d');
    if (this.chart) this.chart.destroy();

    this.chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Principal', 'Interest'],
        datasets: [{
          data: [this.loanAmount, totalInterest],
          backgroundColor: ['#3F51B5', '#FF5722'],
          borderWidth: 0,
          hoverOffset: 10
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.raw;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percent = ((value / total) * 100).toFixed(1);
                return `${context.label}: ${CalculatorUtils.formatCurrency(value)} (${percent}%)`;
              }
            }
          }
        }
      }
    });
  }
}

registerCalculator('emi', EMICalculator);


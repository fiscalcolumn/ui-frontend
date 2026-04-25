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
            <div class="calc-result-box" style="border-color: #205b7a">
              <div class="calc-result-label">Monthly EMI</div>
              <div class="calc-result-value" id="emi-monthly" style="color: #205b7a">₹0</div>
            </div>
            <div class="calc-result-box" style="border-color: #a2bbcf">
              <div class="calc-result-label">Total Interest</div>
              <div class="calc-result-value" id="emi-interest" style="color: #a2bbcf">₹0</div>
            </div>
            <div class="calc-result-box" style="border-color: #4CAF50">
              <div class="calc-result-label">Total Payment</div>
              <div class="calc-result-value" id="emi-total" style="color: #4CAF50">₹0</div>
            </div>
          </div>

          <div class="calc-chart-container">
            <h5 class="calc-chart-title">Payment Breakdown</h5>
            <div class="calc-chart-wrapper">
              <canvas id="emi-chart"></canvas>
            </div>
            <div class="donut-legend" id="emi-legend"></div>
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

    if (this.chart) this.chart.destroy();
    this.chart = CalculatorUtils.createDoughnutChart('emi-chart', 'emi-legend', {
      labels: ['Principal', 'Interest'],
      values: [this.loanAmount, totalInterest],
      colors: ['#205b7a', '#e8724a'],
      centerLabel: 'Total Payment',
      centerValue: CalculatorUtils.formatCurrency(totalPayment),
    });
  }
}

registerCalculator('emi', EMICalculator);

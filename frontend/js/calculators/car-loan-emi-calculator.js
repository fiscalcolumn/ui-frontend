/**
 * Car Loan EMI Calculator
 */

class CarLoanEMICalculator {
  constructor(container) {
    this.container = container;
    this.carPrice = 800000;
    this.downPayment = 200000;
    this.interestRate = 9;
    this.tenure = 60; // 5 years
    this.chart = null;
  }

  render() {
    this.container.innerHTML = `
      <div class="calc-form">
        ${CalculatorUtils.createSlider('cl-price', 'Car On-Road Price', 200000, 5000000, this.carPrice, 50000, '', '₹')}
        ${CalculatorUtils.createSlider('cl-down', 'Down Payment', 50000, 2000000, this.downPayment, 25000, '', '₹')}
        ${CalculatorUtils.createSlider('cl-rate', 'Interest Rate', 7, 15, this.interestRate, 0.25, '%', '')}
        ${CalculatorUtils.createSlider('cl-tenure', 'Loan Tenure', 12, 84, this.tenure, 12, ' months', '')}
        
        <div style="text-align: center; margin-top: 10px;">
          <button class="calc-btn" id="cl-calculate">
            <i class="fa fa-car"></i> Calculate Car Loan EMI
          </button>
        </div>

        <div class="calc-results" id="cl-results" style="display: none;">
          <h4 class="calc-results-title">Car Loan Summary</h4>
          
          <div class="car-loan-summary">
            <div class="loan-pill">
              <span>Loan Amount:</span>
              <strong id="cl-loan-amount">₹6,00,000</strong>
            </div>
          </div>

          <div class="calc-results-grid">
            <div class="calc-result-box" style="border-color: #205b7a">
              <div class="calc-result-label">Monthly EMI</div>
              <div class="calc-result-value" id="cl-emi" style="color: #205b7a">₹0</div>
            </div>
            <div class="calc-result-box" style="border-color: #a2bbcf">
              <div class="calc-result-label">Total Interest</div>
              <div class="calc-result-value" id="cl-interest" style="color: #a2bbcf">₹0</div>
            </div>
            <div class="calc-result-box" style="border-color: #4caf8a">
              <div class="calc-result-label">Total Payment</div>
              <div class="calc-result-value" id="cl-total" style="color: #4caf8a">₹0</div>
            </div>
          </div>

          <div class="calc-chart-container">
            <h5 class="calc-chart-title">Payment Breakdown</h5>
            <div class="calc-chart-wrapper" style="height: 250px;">
              <canvas id="cl-chart"></canvas>
            </div>
            <div class="donut-legend" id="cl-legend"></div>
          </div>
        </div>
      </div>
      <style>
        .car-loan-summary {
          text-align: center;
          margin-bottom: 20px;
        }
        .loan-pill {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: linear-gradient(135deg, #e8f2f8, #d0e3ee);
          padding: 10px 22px;
          border-radius: 50px;
          font-size: 0.95rem;
          border: 1px solid rgba(32,91,122,0.15);
        }
        .loan-pill strong { color: #205b7a; font-size: 1.2rem; font-weight: 700; }
        .dark-mode .loan-pill { background: rgba(32,91,122,0.15); border-color: rgba(162,187,207,0.2); }
        .dark-mode .loan-pill span { color: #8B949E; }
        .dark-mode .loan-pill strong { color: #a2bbcf; }
      </style>
    `;
    this.bindEvents();
    this.calculate();
  }

  bindEvents() {
    const sliders = ['cl-price', 'cl-down', 'cl-rate', 'cl-tenure'];
    sliders.forEach(id => {
      document.getElementById(id).addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        const valueEl = document.getElementById(`${id}-value`);
        if (id === 'cl-price' || id === 'cl-down') {
          valueEl.textContent = CalculatorUtils.formatIndianNumber(val);
        } else if (id === 'cl-rate') {
          valueEl.textContent = val.toFixed(2);
        } else {
          valueEl.textContent = val;
        }
      });
      document.getElementById(id).addEventListener('change', () => this.calculate());
    });
    document.getElementById('cl-calculate').addEventListener('click', () => this.calculate());
  }

  calculate() {
    this.carPrice = parseFloat(document.getElementById('cl-price').value);
    this.downPayment = parseFloat(document.getElementById('cl-down').value);
    this.interestRate = parseFloat(document.getElementById('cl-rate').value);
    this.tenure = parseInt(document.getElementById('cl-tenure').value);

    const loanAmount = this.carPrice - this.downPayment;
    const monthlyRate = this.interestRate / 12 / 100;
    const emi = loanAmount * monthlyRate * Math.pow(1 + monthlyRate, this.tenure) / 
                (Math.pow(1 + monthlyRate, this.tenure) - 1);
    
    const totalPayment = emi * this.tenure;
    const totalInterest = totalPayment - loanAmount;

    document.getElementById('cl-results').style.display = 'block';
    document.getElementById('cl-loan-amount').textContent = CalculatorUtils.formatCurrency(loanAmount);
    document.getElementById('cl-emi').textContent = CalculatorUtils.formatCurrency(emi);
    document.getElementById('cl-interest').textContent = CalculatorUtils.formatCurrency(totalInterest);
    document.getElementById('cl-total').textContent = CalculatorUtils.formatCurrency(totalPayment);

    this.renderChart(loanAmount, totalInterest, this.downPayment);
  }

  renderChart(loanAmount, totalInterest, downPayment) {
    if (this.chart) this.chart.destroy();
    this.chart = CalculatorUtils.createDoughnutChart('cl-chart', 'cl-legend', {
      labels: ['Down Payment', 'Principal', 'Interest'],
      values: [downPayment, loanAmount, totalInterest],
      colors: ['#4caf8a', '#205b7a', '#e8724a'],
      centerLabel: 'Total Cost',
      centerValue: CalculatorUtils.formatCurrency(this.carPrice + totalInterest),
    });
  }
}

registerCalculator('car-loan-emi', CarLoanEMICalculator);


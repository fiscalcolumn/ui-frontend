/**
 * Personal Loan EMI Calculator
 */

class PersonalLoanEMICalculator {
  constructor(container) {
    this.container = container;
    this.loanAmount = 500000;
    this.interestRate = 14;
    this.tenure = 36; // 3 years
    this.chart = null;
  }

  render() {
    this.container.innerHTML = `
      <div class="calc-form">
        ${CalculatorUtils.createSlider('pl-amount', 'Loan Amount', 50000, 4000000, this.loanAmount, 25000, '', '₹')}
        ${CalculatorUtils.createSlider('pl-rate', 'Interest Rate', 10, 24, this.interestRate, 0.5, '%', '')}
        ${CalculatorUtils.createSlider('pl-tenure', 'Loan Tenure', 12, 60, this.tenure, 6, ' months', '')}
        
        <div style="text-align: center; margin-top: 10px;">
          <button class="calc-btn" id="pl-calculate">
            <i class="fa fa-user"></i> Calculate Personal Loan EMI
          </button>
        </div>

        <div class="calc-results" id="pl-results" style="display: none;">
          <h4 class="calc-results-title">Personal Loan Summary</h4>
          
          <div class="calc-results-grid">
            <div class="calc-result-box" style="border-color: #673AB7">
              <div class="calc-result-label">Monthly EMI</div>
              <div class="calc-result-value" id="pl-emi" style="color: #673AB7">₹0</div>
            </div>
            <div class="calc-result-box" style="border-color: #E91E63">
              <div class="calc-result-label">Total Interest</div>
              <div class="calc-result-value" id="pl-interest" style="color: #E91E63">₹0</div>
            </div>
            <div class="calc-result-box" style="border-color: #00BCD4">
              <div class="calc-result-label">Total Payment</div>
              <div class="calc-result-value" id="pl-total" style="color: #00BCD4">₹0</div>
            </div>
          </div>

          <div class="pl-breakdown">
            <div class="breakdown-item">
              <span class="breakdown-label">Interest as % of Principal</span>
              <span class="breakdown-value" id="pl-percent">23%</span>
            </div>
            <div class="breakdown-item">
              <span class="breakdown-label">Effective Annual Rate</span>
              <span class="breakdown-value" id="pl-effective">15.2%</span>
            </div>
          </div>

          <div class="calc-chart-container">
            <h5 class="calc-chart-title">Payment Breakdown</h5>
            <div class="calc-chart-wrapper" style="height: 220px;">
              <canvas id="pl-chart"></canvas>
            </div>
            <div class="donut-legend" id="pl-legend"></div>
          </div>
        </div>
      </div>
      <style>
        .pl-breakdown {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin: 20px 0;
        }
        .breakdown-item {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 10px;
          text-align: center;
        }
        .breakdown-label {
          display: block;
          font-size: 0.85rem;
          color: #666;
          margin-bottom: 5px;
        }
        .breakdown-value {
          font-size: 1.4rem;
          font-weight: 700;
          color: #205b7a;
        }
        .dark-mode .breakdown-item { background: #1C2128; }
        .dark-mode .breakdown-label { color: #6E7681; }
        .dark-mode .breakdown-value { color: #a2bbcf; }
        @media (max-width: 576px) {
          .pl-breakdown {
            grid-template-columns: 1fr;
          }
        }
      </style>
    `;
    this.bindEvents();
    this.calculate();
  }

  bindEvents() {
    const sliders = ['pl-amount', 'pl-rate', 'pl-tenure'];
    sliders.forEach(id => {
      document.getElementById(id).addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        const valueEl = document.getElementById(`${id}-value`);
        if (id === 'pl-amount') {
          valueEl.textContent = CalculatorUtils.formatIndianNumber(val);
        } else if (id === 'pl-rate') {
          valueEl.textContent = val.toFixed(1);
        } else {
          valueEl.textContent = val;
        }
      });
      document.getElementById(id).addEventListener('change', () => this.calculate());
    });
    document.getElementById('pl-calculate').addEventListener('click', () => this.calculate());
  }

  calculate() {
    this.loanAmount = parseFloat(document.getElementById('pl-amount').value);
    this.interestRate = parseFloat(document.getElementById('pl-rate').value);
    this.tenure = parseInt(document.getElementById('pl-tenure').value);

    const monthlyRate = this.interestRate / 12 / 100;
    const emi = this.loanAmount * monthlyRate * Math.pow(1 + monthlyRate, this.tenure) / 
                (Math.pow(1 + monthlyRate, this.tenure) - 1);
    
    const totalPayment = emi * this.tenure;
    const totalInterest = totalPayment - this.loanAmount;
    const interestPercent = ((totalInterest / this.loanAmount) * 100).toFixed(1);
    
    // Effective annual rate
    const effectiveRate = (Math.pow(1 + monthlyRate, 12) - 1) * 100;

    document.getElementById('pl-results').style.display = 'block';
    document.getElementById('pl-emi').textContent = CalculatorUtils.formatCurrency(emi);
    document.getElementById('pl-interest').textContent = CalculatorUtils.formatCurrency(totalInterest);
    document.getElementById('pl-total').textContent = CalculatorUtils.formatCurrency(totalPayment);
    document.getElementById('pl-percent').textContent = `${interestPercent}%`;
    document.getElementById('pl-effective').textContent = `${effectiveRate.toFixed(1)}%`;

    this.renderChart(totalInterest, totalPayment);
  }

  renderChart(totalInterest, totalPayment) {
    if (this.chart) this.chart.destroy();
    this.chart = CalculatorUtils.createDoughnutChart('pl-chart', 'pl-legend', {
      labels: ['Principal', 'Interest'],
      values: [this.loanAmount, totalInterest],
      colors: ['#205b7a', '#e8724a'],
      centerLabel: 'Total Payment',
      centerValue: CalculatorUtils.formatCurrency(totalPayment),
    });
  }
}

registerCalculator('personal-loan-emi', PersonalLoanEMICalculator);


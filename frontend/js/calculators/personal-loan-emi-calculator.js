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
    this.mount();
    CalculatorUtils.bindModern([
      { id: 'pl-amount', display: (n) => CalculatorUtils.formatIndianNumber(n), end: CalculatorUtils.moneyEnd },
      { id: 'pl-rate', display: (n) => n.toFixed(1), end: (n) => `${n}%` },
      { id: 'pl-tenure', display: (n) => String(n), end: (n) => `${n} months` },
    ], () => this.calculate(), () => this.chart);
  }

  mount() {
    CalculatorUtils.adoptModern(this.container, {
      hint: 'The estimate updates as you move a slider.',
      tiles: [
        { id: 'pl-principal', label: 'Principal' },
        { id: 'pl-interest', label: 'Total interest' },
      ],
      canvasId: 'pl-chart',
      legend: ['Principal', 'Interest'],
      compareTitle: 'Same loan, different rates',
      leadId: 'pl-compare-lead',
      listId: 'pl-compare-list',
    });
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

    document.getElementById('pl-principal').textContent = CalculatorUtils.formatCurrency(this.loanAmount);
    document.getElementById('pl-interest').textContent = CalculatorUtils.formatCurrency(totalInterest);
    this.chart = CalculatorUtils.modernDoughnut(
      this.chart, 'pl-chart',
      [this.loanAmount, Math.max(0, totalInterest)],
      'EMI',
      CalculatorUtils.formatCurrency(emi)
    );
    const rateSlider = document.getElementById('pl-rate');
    const rates = CalculatorUtils.ratesInRange(this.interestRate, parseFloat(rateSlider.min), parseFloat(rateSlider.max), [12, 14, 18]);
    CalculatorUtils.fillCompare('pl-compare-list', 'pl-compare-lead',
      `${CalculatorUtils.formatCurrency(this.loanAmount)} over ${this.tenure} months. Only the yearly rate changes.`,
      rates.map(rate => {
        const rowEmi = CalculatorUtils.calculateEMI(this.loanAmount, rate / 12 / 100, this.tenure);
        const yours = Math.abs(rate - this.interestRate) < 0.05;
        return {
          primary: `${Number.isInteger(rate) ? rate : rate.toFixed(1)}%`,
          tag: yours ? 'Your rate' : '',
          yours,
          figures: [
            { label: 'EMI', value: CalculatorUtils.formatCurrency(rowEmi) },
            { label: 'Interest', value: CalculatorUtils.formatCurrency(rowEmi * this.tenure - this.loanAmount) },
          ],
        };
      })
    );
    void interestPercent;
    void effectiveRate;
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


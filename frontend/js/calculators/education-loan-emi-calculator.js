/**
 * Education Loan EMI Calculator — India
 */
class EducationLoanEMICalculator {
  constructor(container) {
    this.container = container;
    this.loanAmount = 1000000;
    this.interestRate = 10.5;
    this.courseDuration = 2; // moratorium years
    this.repaymentTenure = 84; // months after moratorium
    this.chart = null;
  }

  render() {
    this.container.innerHTML = `
      <div class="calc-form">
        <div style="background:linear-gradient(135deg,#00bcd418,#2196f318); border-radius:10px; padding:12px 16px; margin-bottom:18px; font-size:0.85rem;">
          <i class="fa fa-info-circle" style="color:#00bcd4"></i>
          Education loans have a <strong>moratorium period</strong> (course duration + 1 year) during which only simple interest accrues. Repayment begins after moratorium.
        </div>

        ${CalculatorUtils.createSlider('edu-amount', 'Loan Amount (₹)', 100000, 5000000, this.loanAmount, 50000, '', '₹')}
        ${CalculatorUtils.createSlider('edu-rate', 'Annual Interest Rate (%)', 6, 18, this.interestRate, 0.25, '%', '')}
        ${CalculatorUtils.createSlider('edu-course', 'Course Duration (years)', 1, 5, this.courseDuration, 1, ' yrs', '')}
        ${CalculatorUtils.createSlider('edu-repay', 'Repayment Tenure (months)', 12, 180, this.repaymentTenure, 12, ' months', '')}

        <div style="text-align:center; margin-top:10px;">
          <button class="calc-btn" id="edu-calculate">
            <i class="fa fa-graduation-cap"></i> Calculate
          </button>
        </div>

        <div class="calc-results" id="edu-results" style="display:none;">
          <h4 class="calc-results-title">Education Loan Summary</h4>
          <div class="calc-results-grid">
            <div class="calc-result-box" style="border-color:#3F51B5">
              <div class="calc-result-label">Monthly EMI</div>
              <div class="calc-result-value" id="edu-emi" style="color:#3F51B5">₹0</div>
              <div class="calc-result-sublabel">after moratorium</div>
            </div>
            <div class="calc-result-box" style="border-color:#FF5722">
              <div class="calc-result-label">Interest During Course</div>
              <div class="calc-result-value" id="edu-course-interest" style="color:#FF5722">₹0</div>
            </div>
            <div class="calc-result-box" style="border-color:#4CAF50">
              <div class="calc-result-label">Total Amount Paid</div>
              <div class="calc-result-value" id="edu-total" style="color:#4CAF50">₹0</div>
            </div>
          </div>
          <div class="calc-results-grid" style="margin-top:10px; grid-template-columns:1fr 1fr;">
            <div class="calc-result-box" style="border-color:#9c27b0">
              <div class="calc-result-label">Principal + Accrued Interest</div>
              <div class="calc-result-value" id="edu-principal-repay" style="color:#9c27b0; font-size:1.3rem">₹0</div>
              <div class="calc-result-sublabel">amount at start of repayment</div>
            </div>
            <div class="calc-result-box" style="border-color:#ff9800">
              <div class="calc-result-label">Total Interest Paid</div>
              <div class="calc-result-value" id="edu-total-interest" style="color:#ff9800; font-size:1.3rem">₹0</div>
            </div>
          </div>
        </div>
      </div>
    `;
    this.bindEvents();
    this.calculate();
  }

  bindEvents() {
    this.mount();
    CalculatorUtils.bindModern([
      { id: 'edu-amount', display: (n) => CalculatorUtils.formatIndianNumber(n), end: CalculatorUtils.moneyEnd },
      { id: 'edu-rate', display: (n) => n.toFixed(2), end: (n) => `${n}%` },
      { id: 'edu-course', display: (n) => String(n), end: (n) => `${n} yrs` },
      { id: 'edu-repay', display: (n) => String(n), end: (n) => `${n} months` },
    ], () => this.calculate(), () => this.chart);
  }

  mount() {
    CalculatorUtils.adoptModern(this.container, {
      hint: 'Repayment starts after the course plus one year. Interest during that pause is simple interest.',
      tiles: [
        { id: 'edu-course-interest', label: 'Interest during course' },
        { id: 'edu-total-interest', label: 'Total interest' },
      ],
      canvasId: 'edu-chart',
      legend: ['Amount borrowed', 'Interest'],
      compareTitle: 'Same loan, different rates',
      leadId: 'edu-compare-lead',
      listId: 'edu-compare-list',
    });
  }

  quote(amount, annualPercent, courseYears, repayMonths) {
    const annualRate = annualPercent / 100;
    const moratoriumYears = courseYears + 1;
    const simpleInterest = amount * annualRate * moratoriumYears;
    const principalAtRepayStart = amount + simpleInterest;
    const emi = CalculatorUtils.calculateEMI(principalAtRepayStart, annualRate / 12, repayMonths);
    const totalInterest = simpleInterest + (emi * repayMonths - principalAtRepayStart);
    return { emi, simpleInterest, totalInterest };
  }

  calculate() {
    this.loanAmount = parseFloat(document.getElementById('edu-amount').value) || 0;
    this.interestRate = parseFloat(document.getElementById('edu-rate').value) || 0;
    this.courseDuration = parseFloat(document.getElementById('edu-course').value) || 0;
    this.repaymentTenure = parseFloat(document.getElementById('edu-repay').value) || 0;

    const quote = this.quote(this.loanAmount, this.interestRate, this.courseDuration, this.repaymentTenure);
    document.getElementById('edu-course-interest').textContent = CalculatorUtils.formatCurrency(quote.simpleInterest);
    document.getElementById('edu-total-interest').textContent = CalculatorUtils.formatCurrency(quote.totalInterest);
    this.chart = CalculatorUtils.modernDoughnut(
      this.chart, 'edu-chart',
      [this.loanAmount, Math.max(0, quote.totalInterest)],
      'EMI',
      CalculatorUtils.formatCurrency(quote.emi)
    );

    const rateSlider = document.getElementById('edu-rate');
    const rates = CalculatorUtils.ratesInRange(this.interestRate, parseFloat(rateSlider.min), parseFloat(rateSlider.max), [8, 10.5, 12]);
    CalculatorUtils.fillCompare('edu-compare-list', 'edu-compare-lead',
      `${CalculatorUtils.formatCurrency(this.loanAmount)}, ${this.courseDuration} year course, then ${this.repaymentTenure} months of repayment.`,
      rates.map(rate => {
        const row = this.quote(this.loanAmount, rate, this.courseDuration, this.repaymentTenure);
        const yours = Math.abs(rate - this.interestRate) < 0.05;
        return {
          primary: `${Number.isInteger(rate) ? rate : rate.toFixed(2)}%`,
          tag: yours ? 'Your rate' : '',
          yours,
          figures: [
            { label: 'EMI', value: CalculatorUtils.formatCurrency(row.emi) },
            { label: 'Interest', value: CalculatorUtils.formatCurrency(row.totalInterest) },
          ],
        };
      })
    );
  }
}

registerCalculator('education-loan-emi', EducationLoanEMICalculator);

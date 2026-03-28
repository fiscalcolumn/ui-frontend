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
    [['edu-amount', 'loanAmount'], ['edu-rate', 'interestRate'], ['edu-course', 'courseDuration'], ['edu-repay', 'repaymentTenure']].forEach(([id, field]) => {
      document.getElementById(id).addEventListener('input', e => {
        this[field] = parseFloat(e.target.value) || 0;
        document.getElementById(`${id}-value`).textContent = CalculatorUtils.formatIndianNumber(this[field]);
        CalculatorUtils.updateSliderProgress(e.target);
      });
      document.getElementById(id).addEventListener('change', () => this.calculate());
    });
    document.getElementById('edu-calculate').addEventListener('click', () => this.calculate());
    setTimeout(() => CalculatorUtils.initSliderProgress(), 50);
  }

  calculate() {
    const P = this.loanAmount;
    const annualRate = this.interestRate / 100;
    const moratoriumYears = this.courseDuration + 1; // course + 1 year
    const moratoriumMonths = moratoriumYears * 12;
    const repayMonths = this.repaymentTenure;

    // Simple interest during moratorium
    const simpleInterest = P * annualRate * moratoriumYears;
    const principalAtRepayStart = P + simpleInterest;

    // EMI calculation on inflated principal
    const monthlyRate = annualRate / 12;
    const emi = CalculatorUtils.calculateEMI(principalAtRepayStart, monthlyRate, repayMonths);
    const totalRepaid = emi * repayMonths;
    const totalInterestDuringRepayment = totalRepaid - principalAtRepayStart;
    const totalPaid = simpleInterest + totalRepaid;

    document.getElementById('edu-results').style.display = 'block';
    document.getElementById('edu-emi').textContent = CalculatorUtils.formatCurrency(emi);
    document.getElementById('edu-course-interest').textContent = CalculatorUtils.formatCurrency(simpleInterest);
    document.getElementById('edu-total').textContent = CalculatorUtils.formatCurrency(totalPaid);
    document.getElementById('edu-principal-repay').textContent = CalculatorUtils.formatCurrency(principalAtRepayStart);
    document.getElementById('edu-total-interest').textContent = CalculatorUtils.formatCurrency(simpleInterest + totalInterestDuringRepayment);
  }
}

registerCalculator('education-loan-emi', EducationLoanEMICalculator);

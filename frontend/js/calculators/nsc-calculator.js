/**
 * NSC (National Savings Certificate) Calculator — India
 * Post Office savings scheme with guaranteed returns
 */
class NSCCalculator {
  constructor(container) {
    this.container = container;
    this.investment = 100000;
    this.NSC_RATE = 7.7; // FY 2024-25 Q1
    this.TENURE = 5; // Fixed 5 years
  }

  render() {
    this.container.innerHTML = `
      <div class="calc-form">
        <div style="background:linear-gradient(135deg,#ff980018,#4caf5018); border-radius:10px; padding:12px 16px; margin-bottom:18px; font-size:0.85rem;">
          <i class="fa fa-info-circle" style="color:#ff9800"></i>
          <strong>NSC Interest Rate: ${this.NSC_RATE}% p.a.</strong> (Q1 FY 2024-25). Fixed 5-year tenure. Interest compounded annually but taxable each year. Interest for years 1–4 re-invested automatically. Eligible for <strong>Section 80C</strong> deduction.
        </div>

        ${CalculatorUtils.createSlider('nsc-invest', 'Investment Amount (₹)', 1000, 5000000, this.investment, 1000, '', '₹')}

        <div style="text-align:center; margin-top:10px;">
          <button class="calc-btn" id="nsc-calculate">
            <i class="fa fa-calculator"></i> Calculate Maturity
          </button>
        </div>

        <div class="calc-results" id="nsc-results" style="display:none;">
          <h4 class="calc-results-title">NSC Maturity Details</h4>
          <div class="calc-results-grid">
            <div class="calc-result-box" style="border-color:#2196f3">
              <div class="calc-result-label">Amount Invested</div>
              <div class="calc-result-value" id="nsc-invested" style="color:#2196f3">₹0</div>
            </div>
            <div class="calc-result-box" style="border-color:#4caf50">
              <div class="calc-result-label">Interest Earned</div>
              <div class="calc-result-value" id="nsc-interest" style="color:#4caf50">₹0</div>
            </div>
            <div class="calc-result-box" style="border-color:#9c27b0">
              <div class="calc-result-label">Maturity Value</div>
              <div class="calc-result-value" id="nsc-maturity" style="color:#9c27b0">₹0</div>
            </div>
          </div>

          <div style="margin-top:16px;" id="nsc-yearly-table"></div>
        </div>
      </div>
    `;
    this.bindEvents();
    this.calculate();
  }

  bindEvents() {
    document.getElementById('nsc-invest').addEventListener('input', e => {
      this.investment = parseFloat(e.target.value) || 0;
      document.getElementById('nsc-invest-value').textContent = CalculatorUtils.formatIndianNumber(this.investment);
      CalculatorUtils.updateSliderProgress(e.target);
    });
    document.getElementById('nsc-invest').addEventListener('change', () => this.calculate());
    document.getElementById('nsc-calculate').addEventListener('click', () => this.calculate());
    setTimeout(() => CalculatorUtils.initSliderProgress(), 50);
  }

  calculate() {
    const P = this.investment;
    const rate = this.NSC_RATE / 100;
    let balance = P;
    const rows = [];

    for (let y = 1; y <= this.TENURE; y++) {
      const interest = balance * rate;
      balance += interest;
      rows.push({ year: y, openingBalance: balance - interest, interest, closingBalance: balance });
    }

    const maturityValue = balance;
    const totalInterest = maturityValue - P;

    document.getElementById('nsc-results').style.display = 'block';
    document.getElementById('nsc-invested').textContent = CalculatorUtils.formatCurrency(P);
    document.getElementById('nsc-interest').textContent = CalculatorUtils.formatCurrency(totalInterest);
    document.getElementById('nsc-maturity').textContent = CalculatorUtils.formatCurrency(maturityValue);

    document.getElementById('nsc-yearly-table').innerHTML = `
      <table style="width:100%; border-collapse:collapse; font-size:0.85rem;">
        <thead><tr style="background:#f5f5f5;">
          <th style="padding:8px 12px; text-align:left; border-bottom:1px solid #e0e0e0;">Year</th>
          <th style="padding:8px 12px; text-align:right; border-bottom:1px solid #e0e0e0;">Opening Balance</th>
          <th style="padding:8px 12px; text-align:right; border-bottom:1px solid #e0e0e0;">Interest Earned</th>
          <th style="padding:8px 12px; text-align:right; border-bottom:1px solid #e0e0e0;">Closing Balance</th>
        </tr></thead>
        <tbody>
          ${rows.map((r, i) => `
            <tr style="${i === rows.length - 1 ? 'background:#f9f9f9; font-weight:700;' : ''}">
              <td style="padding:7px 12px; border-bottom:1px solid #f5f5f5;">Year ${r.year}</td>
              <td style="padding:7px 12px; border-bottom:1px solid #f5f5f5; text-align:right;">${CalculatorUtils.formatCurrency(r.openingBalance, 2)}</td>
              <td style="padding:7px 12px; border-bottom:1px solid #f5f5f5; text-align:right; color:#4caf50;">${CalculatorUtils.formatCurrency(r.interest, 2)}</td>
              <td style="padding:7px 12px; border-bottom:1px solid #f5f5f5; text-align:right;">${CalculatorUtils.formatCurrency(r.closingBalance, 2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }
}

registerCalculator('nsc', NSCCalculator);

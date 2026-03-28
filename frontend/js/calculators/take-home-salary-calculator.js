/**
 * Take-Home Salary Calculator — India
 * New Tax Regime (FY 2024-25)
 */
class TakeHomeSalaryCalculator {
  constructor(container) {
    this.container = container;
    this.ctc = 1200000;
    this.taxRegime = 'new';
    this.pfContribution = 'yes';
    this.gratuity = 'yes';
    this.professionalTax = 2400; // annual, state varies
  }

  render() {
    this.container.innerHTML = `
      <div class="calc-form">
        ${CalculatorUtils.createSlider('ths-ctc', 'Annual CTC (₹)', 200000, 10000000, this.ctc, 10000, '', '₹')}

        <div class="calc-input-group">
          <label>Tax Regime</label>
          <div class="calc-radio-group">
            <label class="calc-radio-label">
              <input type="radio" name="ths-regime" value="new" checked>
              <span>New Regime (Default FY 2024-25)</span>
            </label>
            <label class="calc-radio-label">
              <input type="radio" name="ths-regime" value="old">
              <span>Old Regime</span>
            </label>
          </div>
        </div>

        <div class="calc-input-group">
          <label>PF Contribution</label>
          <div class="calc-radio-group">
            <label class="calc-radio-label">
              <input type="radio" name="ths-pf" value="yes" checked>
              <span>Yes (12% of Basic)</span>
            </label>
            <label class="calc-radio-label">
              <input type="radio" name="ths-pf" value="no">
              <span>No</span>
            </label>
          </div>
        </div>

        <div style="text-align:center; margin-top:10px;">
          <button class="calc-btn" id="ths-calculate">
            <i class="fa fa-calculator"></i> Calculate Take-Home Salary
          </button>
        </div>

        <div class="calc-results" id="ths-results" style="display:none;">
          <h4 class="calc-results-title">Salary Breakdown (Annual)</h4>
          <div class="calc-results-grid">
            <div class="calc-result-box" style="border-color:#2196f3">
              <div class="calc-result-label">Gross Salary</div>
              <div class="calc-result-value" id="ths-gross" style="color:#2196f3">₹0</div>
            </div>
            <div class="calc-result-box" style="border-color:#ff5722">
              <div class="calc-result-label">Total Deductions</div>
              <div class="calc-result-value" id="ths-deductions" style="color:#ff5722">₹0</div>
            </div>
            <div class="calc-result-box" style="border-color:#4caf50">
              <div class="calc-result-label">Take-Home (Annual)</div>
              <div class="calc-result-value" id="ths-annual" style="color:#4caf50">₹0</div>
            </div>
          </div>
          <div class="calc-results-grid" style="margin-top:10px; grid-template-columns:1fr;">
            <div class="calc-result-box" style="border-color:#9c27b0; background:linear-gradient(135deg,#9c27b008,#00968808);">
              <div class="calc-result-label">Monthly In-Hand Salary</div>
              <div class="calc-result-value" id="ths-monthly" style="color:#9c27b0; font-size:1.9rem">₹0</div>
            </div>
          </div>

          <div style="margin-top:16px;" id="ths-breakdown-table"></div>
        </div>
      </div>
    `;
    this.bindEvents();
    this.calculate();
  }

  bindEvents() {
    document.getElementById('ths-ctc').addEventListener('input', e => {
      this.ctc = parseFloat(e.target.value) || 0;
      document.getElementById('ths-ctc-value').textContent = CalculatorUtils.formatIndianNumber(this.ctc);
      CalculatorUtils.updateSliderProgress(e.target);
    });
    document.getElementById('ths-ctc').addEventListener('change', () => this.calculate());
    document.querySelectorAll('input[name="ths-regime"]').forEach(r =>
      r.addEventListener('change', e => { this.taxRegime = e.target.value; this.calculate(); })
    );
    document.querySelectorAll('input[name="ths-pf"]').forEach(r =>
      r.addEventListener('change', e => { this.pfContribution = e.target.value; this.calculate(); })
    );
    document.getElementById('ths-calculate').addEventListener('click', () => this.calculate());
    setTimeout(() => CalculatorUtils.initSliderProgress(), 50);
  }

  calculate() {
    const ctc = this.ctc;
    const basic = ctc * 0.40;
    const hra = basic * 0.50;
    const specialAllowance = ctc * 0.45 - hra - (this.gratuity === 'yes' ? ctc * 0.0481 : 0);
    const gratuityDeduct = this.gratuity === 'yes' ? ctc * 0.0481 : 0;

    const gross = ctc - gratuityDeduct;

    const pfDeduct = this.pfContribution === 'yes' ? Math.min(basic * 0.12, 21600) : 0; // capped at 1800/month
    const professionalTax = this.professionalTax;

    // Taxable income
    const standardDeduction = this.taxRegime === 'new' ? 75000 : 50000;
    const taxableIncome = Math.max(0, gross - pfDeduct - standardDeduction - professionalTax);

    const tax = this.calculateTax(taxableIncome, this.taxRegime);
    const cess = tax * 0.04;
    const totalTax = tax + cess;

    const totalDeductions = pfDeduct + professionalTax + totalTax;
    const annualTakeHome = gross - totalDeductions;
    const monthlyTakeHome = annualTakeHome / 12;

    document.getElementById('ths-results').style.display = 'block';
    document.getElementById('ths-gross').textContent = CalculatorUtils.formatCurrency(gross);
    document.getElementById('ths-deductions').textContent = CalculatorUtils.formatCurrency(totalDeductions);
    document.getElementById('ths-annual').textContent = CalculatorUtils.formatCurrency(annualTakeHome);
    document.getElementById('ths-monthly').textContent = CalculatorUtils.formatCurrency(monthlyTakeHome);

    document.getElementById('ths-breakdown-table').innerHTML = `
      <table style="width:100%; border-collapse:collapse; font-size:0.85rem;">
        <thead><tr style="background:#f5f5f5;">
          <th style="padding:8px 12px; text-align:left; border-bottom:1px solid #e0e0e0;">Component</th>
          <th style="padding:8px 12px; text-align:right; border-bottom:1px solid #e0e0e0;">Annual</th>
          <th style="padding:8px 12px; text-align:right; border-bottom:1px solid #e0e0e0;">Monthly</th>
        </tr></thead>
        <tbody>
          ${this.row('CTC', ctc)}
          ${this.row('Basic', basic)}
          ${this.row('HRA', hra)}
          ${this.row('Gratuity (deducted from CTC)', -gratuityDeduct, 'negative')}
          ${this.row('Gross Salary', gross, 'highlight')}
          ${this.row('Employee PF Deduction', -pfDeduct, 'negative')}
          ${this.row('Professional Tax', -professionalTax, 'negative')}
          ${this.row(`Income Tax (${this.taxRegime === 'new' ? 'New' : 'Old'} Regime) + 4% Cess`, -totalTax, 'negative')}
          ${this.row('Net Take-Home Salary', annualTakeHome, 'bold-green')}
        </tbody>
      </table>
    `;
  }

  row(label, val, style = '') {
    const monthly = val / 12;
    const color = style === 'negative' ? '#e53935' : style === 'bold-green' ? '#2e7d32' : style === 'highlight' ? '#1565c0' : '#222';
    const fw = (style === 'highlight' || style === 'bold-green') ? '700' : '400';
    const bg = style === 'bold-green' ? 'background:#e8f5e9;' : style === 'highlight' ? 'background:#e3f2fd;' : '';
    return `<tr style="${bg}">
      <td style="padding:7px 12px; border-bottom:1px solid #f5f5f5; font-weight:${fw}; color:${color};">${label}</td>
      <td style="padding:7px 12px; border-bottom:1px solid #f5f5f5; text-align:right; font-weight:${fw}; color:${color};">${CalculatorUtils.formatCurrency(Math.abs(val))}</td>
      <td style="padding:7px 12px; border-bottom:1px solid #f5f5f5; text-align:right; font-weight:${fw}; color:${color};">${CalculatorUtils.formatCurrency(Math.abs(monthly))}</td>
    </tr>`;
  }

  calculateTax(income, regime) {
    if (regime === 'new') {
      // New regime FY 2024-25 (rebate u/s 87A up to 7L)
      if (income <= 300000) return 0;
      if (income <= 700000) {
        let tax = 0;
        if (income > 300000) tax += Math.min(income - 300000, 300000) * 0.05;
        if (income > 600000) tax += (income - 600000) * 0.10;
        return income <= 700000 ? 0 : tax; // 87A rebate
      }
      let tax = 0;
      if (income > 300000) tax += 15000;
      if (income > 600000) tax += Math.min(income - 600000, 300000) * 0.10;
      if (income > 900000) tax += Math.min(income - 900000, 300000) * 0.15;
      if (income > 1200000) tax += Math.min(income - 1200000, 300000) * 0.20;
      if (income > 1500000) tax += (income - 1500000) * 0.30;
      return tax;
    } else {
      // Old regime
      if (income <= 250000) return 0;
      let tax = 0;
      if (income > 250000) tax += Math.min(income - 250000, 250000) * 0.05;
      if (income > 500000) tax += Math.min(income - 500000, 500000) * 0.20;
      if (income > 1000000) tax += (income - 1000000) * 0.30;
      if (income <= 500000) tax = 0; // 87A rebate
      return tax;
    }
  }
}

registerCalculator('take-home-salary', TakeHomeSalaryCalculator);

/**
 * HRA Calculator — India
 * Calculates HRA exemption under Section 10(13A) of Income Tax Act
 */
class HRACalculator {
  constructor(container) {
    this.container = container;
    this.basicSalary = 50000;
    this.daAmount = 0;
    this.hraReceived = 20000;
    this.rentPaid = 18000;
    this.city = 'metro';
  }

  render() {
    this.container.innerHTML = `
      <div class="calc-form">
        ${CalculatorUtils.createSlider('hra-basic', 'Basic Salary (Monthly) ₹', 10000, 300000, this.basicSalary, 1000, '', '₹')}
        ${CalculatorUtils.createSlider('hra-da', 'Dearness Allowance — DA (Monthly) ₹', 0, 100000, this.daAmount, 500, '', '₹')}
        ${CalculatorUtils.createSlider('hra-received', 'HRA Received (Monthly) ₹', 1000, 150000, this.hraReceived, 500, '', '₹')}
        ${CalculatorUtils.createSlider('hra-rent', 'Actual Rent Paid (Monthly) ₹', 1000, 200000, this.rentPaid, 500, '', '₹')}

        <div class="calc-input-group">
          <label>City Type</label>
          <div class="calc-radio-group">
            <label class="calc-radio-label">
              <input type="radio" name="hra-city" value="metro" checked>
              <span>Metro (Mumbai, Delhi, Kolkata, Chennai) — 50%</span>
            </label>
            <label class="calc-radio-label">
              <input type="radio" name="hra-city" value="nonmetro">
              <span>Non-Metro — 40%</span>
            </label>
          </div>
        </div>

        <div style="text-align:center; margin-top:10px;">
          <button class="calc-btn" id="hra-calculate">
            <i class="fa fa-calculator"></i> Calculate HRA Exemption
          </button>
        </div>

        <div class="calc-results" id="hra-results" style="display:none;">
          <h4 class="calc-results-title">HRA Exemption (Monthly)</h4>
          <div class="calc-results-grid">
            <div class="calc-result-box" style="border-color:#4caf50">
              <div class="calc-result-label">HRA Exempt (Monthly)</div>
              <div class="calc-result-value" id="hra-exempt-monthly" style="color:#4caf50">₹0</div>
            </div>
            <div class="calc-result-box" style="border-color:#9c27b0">
              <div class="calc-result-label">HRA Exempt (Yearly)</div>
              <div class="calc-result-value" id="hra-exempt-yearly" style="color:#9c27b0">₹0</div>
            </div>
            <div class="calc-result-box" style="border-color:#ff5722">
              <div class="calc-result-label">Taxable HRA (Monthly)</div>
              <div class="calc-result-value" id="hra-taxable" style="color:#ff5722">₹0</div>
            </div>
          </div>

          <div style="margin-top:16px; background:#f9f9f9; border-radius:8px; padding:14px; font-size:0.85rem;" id="hra-breakdown">
          </div>
        </div>
      </div>
    `;
    this.bindEvents();
    this.calculate();
  }

  bindEvents() {
    const sliders = ['hra-basic', 'hra-da', 'hra-received', 'hra-rent'];
    const fields = ['basicSalary', 'daAmount', 'hraReceived', 'rentPaid'];
    sliders.forEach((id, i) => {
      document.getElementById(id).addEventListener('input', e => {
        this[fields[i]] = parseFloat(e.target.value) || 0;
        document.getElementById(`${id}-value`).textContent = CalculatorUtils.formatIndianNumber(this[fields[i]]);
        CalculatorUtils.updateSliderProgress(e.target);
      });
    });
    document.querySelectorAll('input[name="hra-city"]').forEach(r =>
      r.addEventListener('change', e => { this.city = e.target.value; this.calculate(); })
    );
    document.getElementById('hra-calculate').addEventListener('click', () => this.calculate());
    sliders.forEach(id => {
      document.getElementById(id).addEventListener('change', () => this.calculate());
    });
    setTimeout(() => CalculatorUtils.initSliderProgress(), 50);
  }

  calculate() {
    const basic = this.basicSalary;
    const da = this.daAmount;
    const hraReceived = this.hraReceived;
    const rent = this.rentPaid;
    const cityPct = this.city === 'metro' ? 0.5 : 0.4;

    // HRA exemption = minimum of:
    const a = hraReceived;                           // Actual HRA received
    const b = (basic + da) * cityPct;               // 50% / 40% of Basic+DA
    const c = Math.max(0, rent - 0.1 * (basic + da)); // Actual rent - 10% of Basic+DA

    const exempt = Math.min(a, b, c);
    const taxable = hraReceived - exempt;

    document.getElementById('hra-results').style.display = 'block';
    document.getElementById('hra-exempt-monthly').textContent = CalculatorUtils.formatCurrency(exempt, 0);
    document.getElementById('hra-exempt-yearly').textContent = CalculatorUtils.formatCurrency(exempt * 12, 0);
    document.getElementById('hra-taxable').textContent = CalculatorUtils.formatCurrency(taxable, 0);

    document.getElementById('hra-breakdown').innerHTML = `
      <p style="font-weight:700; margin-bottom:10px;">How is HRA Exemption Calculated?</p>
      <p>HRA Exemption = <strong>Minimum</strong> of the following 3 values:</p>
      <table style="width:100%; border-collapse:collapse; margin-top:8px;">
        <tr style="${a <= b && a <= c ? 'background:#e8f5e9; font-weight:700' : ''}">
          <td style="padding:6px 0;">1. Actual HRA received</td>
          <td style="text-align:right; padding:6px 0;">${CalculatorUtils.formatCurrency(a, 0)}</td>
        </tr>
        <tr style="${b <= a && b <= c ? 'background:#e8f5e9; font-weight:700' : ''}">
          <td style="padding:6px 0;">2. ${this.city === 'metro' ? '50' : '40'}% of (Basic + DA)</td>
          <td style="text-align:right; padding:6px 0;">${CalculatorUtils.formatCurrency(b, 0)}</td>
        </tr>
        <tr style="${c <= a && c <= b ? 'background:#e8f5e9; font-weight:700' : ''}">
          <td style="padding:6px 0;">3. Rent paid − 10% of (Basic + DA)</td>
          <td style="text-align:right; padding:6px 0;">${CalculatorUtils.formatCurrency(c, 0)}</td>
        </tr>
        <tr style="border-top:2px solid #4caf50; font-weight:700; color:#4caf50;">
          <td style="padding:8px 0;">✓ HRA Exemption (Minimum)</td>
          <td style="text-align:right; padding:8px 0;">${CalculatorUtils.formatCurrency(exempt, 0)}</td>
        </tr>
      </table>
    `;
  }
}

registerCalculator('hra', HRACalculator);

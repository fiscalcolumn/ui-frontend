/**
 * GST Calculator — India
 * Calculate GST amount (add/remove) for any rate
 */
class GSTCalculator {
  constructor(container) {
    this.container = container;
    this.amount = 10000;
    this.gstRate = 18;
    this.mode = 'add'; // 'add' or 'remove'
  }

  render() {
    this.container.innerHTML = `
      <div class="calc-form">
        <div class="calc-input-group">
          <label>GST Mode</label>
          <div class="calc-radio-group">
            <label class="calc-radio-label">
              <input type="radio" name="gst-mode" value="add" checked>
              <span>Add GST (Exclusive → Inclusive)</span>
            </label>
            <label class="calc-radio-label">
              <input type="radio" name="gst-mode" value="remove">
              <span>Remove GST (Inclusive → Exclusive)</span>
            </label>
          </div>
        </div>

        <div class="calc-input-group">
          <label for="gst-amount">Amount (₹)</label>
          <div class="calc-input-wrapper">
            <input type="number" id="gst-amount" class="calc-input" value="${this.amount}" min="0" placeholder="Enter amount">
          </div>
        </div>

        <div class="calc-input-group">
          <label>GST Rate</label>
          <div class="calc-radio-group" style="flex-wrap:wrap; gap:8px;">
            ${[0, 0.1, 0.25, 1, 1.5, 3, 5, 6, 7.5, 12, 18, 28].map(r =>
              `<label class="calc-radio-label">
                <input type="radio" name="gst-rate" value="${r}" ${r === 18 ? 'checked' : ''}>
                <span>${r}%</span>
              </label>`
            ).join('')}
          </div>
        </div>

        <div style="text-align:center; margin-top:10px;">
          <button class="calc-btn" id="gst-calculate">
            <i class="fa fa-calculator"></i> Calculate GST
          </button>
        </div>

        <div class="calc-results" id="gst-results" style="display:none;">
          <h4 class="calc-results-title">GST Breakdown</h4>
          <div class="calc-results-grid">
            <div class="calc-result-box" style="border-color:#2196f3">
              <div class="calc-result-label" id="gst-orig-label">Original Amount</div>
              <div class="calc-result-value" id="gst-orig" style="color:#2196f3">₹0</div>
            </div>
            <div class="calc-result-box" style="border-color:#ff9800">
              <div class="calc-result-label">GST Amount</div>
              <div class="calc-result-value" id="gst-amount-result" style="color:#ff9800">₹0</div>
              <div class="calc-result-sublabel" id="gst-breakdown"></div>
            </div>
            <div class="calc-result-box" style="border-color:#4caf50">
              <div class="calc-result-label" id="gst-final-label">Total Amount</div>
              <div class="calc-result-value" id="gst-final" style="color:#4caf50">₹0</div>
            </div>
          </div>

          <div class="gst-detail-table" id="gst-detail-table" style="margin-top:16px;"></div>
        </div>
      </div>
    `;

    this.bindEvents();
    this.calculate();
  }

  bindEvents() {
    document.querySelectorAll('input[name="gst-mode"]').forEach(r =>
      r.addEventListener('change', e => { this.mode = e.target.value; this.calculate(); })
    );
    document.querySelectorAll('input[name="gst-rate"]').forEach(r =>
      r.addEventListener('change', e => { this.gstRate = parseFloat(e.target.value); this.calculate(); })
    );
    document.getElementById('gst-amount').addEventListener('input', e => {
      this.amount = parseFloat(e.target.value) || 0;
    });
    document.getElementById('gst-calculate').addEventListener('click', () => this.calculate());
  }

  calculate() {
    const amt = this.amount || parseFloat(document.getElementById('gst-amount').value) || 0;
    const rate = this.gstRate / 100;
    let baseAmount, gstAmount, totalAmount;

    if (this.mode === 'add') {
      baseAmount = amt;
      gstAmount = amt * rate;
      totalAmount = amt + gstAmount;
    } else {
      totalAmount = amt;
      baseAmount = amt / (1 + rate);
      gstAmount = amt - baseAmount;
    }

    const cgst = gstAmount / 2;
    const sgst = gstAmount / 2;

    document.getElementById('gst-results').style.display = 'block';
    document.getElementById('gst-orig').textContent = CalculatorUtils.formatCurrency(baseAmount, 2);
    document.getElementById('gst-amount-result').textContent = CalculatorUtils.formatCurrency(gstAmount, 2);
    document.getElementById('gst-final').textContent = CalculatorUtils.formatCurrency(totalAmount, 2);

    document.getElementById('gst-orig-label').textContent = this.mode === 'add' ? 'Original Amount' : 'Pre-GST Amount';
    document.getElementById('gst-final-label').textContent = this.mode === 'add' ? 'Total (with GST)' : 'Total Paid';

    const rows = [
      ['Pre-GST Amount', CalculatorUtils.formatCurrency(baseAmount, 2)],
      [`CGST @ ${this.gstRate / 2}%`, CalculatorUtils.formatCurrency(cgst, 2)],
      [`SGST/UTGST @ ${this.gstRate / 2}%`, CalculatorUtils.formatCurrency(sgst, 2)],
      [`Total GST @ ${this.gstRate}%`, CalculatorUtils.formatCurrency(gstAmount, 2)],
      ['Total Amount (with GST)', CalculatorUtils.formatCurrency(totalAmount, 2)],
    ];

    document.getElementById('gst-detail-table').innerHTML = `
      <table style="width:100%; border-collapse:collapse; font-size:0.88rem;">
        <thead>
          <tr style="background:#f5f5f5;">
            <th style="padding:8px 12px; text-align:left; border-bottom:1px solid #e0e0e0;">Description</th>
            <th style="padding:8px 12px; text-align:right; border-bottom:1px solid #e0e0e0;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((r, i) => `
            <tr style="${i === rows.length - 1 ? 'font-weight:700; background:#f9f9f9' : ''}">
              <td style="padding:8px 12px; border-bottom:1px solid #f0f0f0;">${r[0]}</td>
              <td style="padding:8px 12px; border-bottom:1px solid #f0f0f0; text-align:right;">${r[1]}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }
}

registerCalculator('gst', GSTCalculator);

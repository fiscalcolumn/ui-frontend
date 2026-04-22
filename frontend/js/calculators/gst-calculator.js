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
          <label for="gst-rate-input">GST Rate (%)</label>
          <div class="gst-rate-wrapper">
            <div class="calc-input-wrapper">
              <input type="number" id="gst-rate-input" class="calc-input" value="${this.gstRate}"
                     min="0" max="100" step="0.01" placeholder="e.g. 18">
              <span class="calc-input-unit">%</span>
            </div>
            <div class="gst-quick-rates">
              <span class="gst-rate-label">Quick:</span>
              ${[0, 5, 12, 18, 28].map(r =>
                `<button type="button" class="gst-quick-btn${r === this.gstRate ? ' active' : ''}" data-rate="${r}">${r}%</button>`
              ).join('')}
            </div>
          </div>
        </div>

        <button class="calc-btn" id="gst-calculate">
          <i class="fa fa-calculator"></i> Calculate GST
        </button>

        <div class="calc-results" id="gst-results" style="display:none;">
          <h4 class="calc-results-title">GST Breakdown</h4>
          <div class="calc-results-grid">
            <div class="calc-result-box" style="border-color:#2196f3">
              <div class="calc-result-label" id="gst-orig-label">Original Amount</div>
              <div class="calc-result-value" id="gst-orig" style="color:#2196f3">₹0</div>
            </div>
            <div class="calc-result-box" style="border-color:#f59e0b">
              <div class="calc-result-label">GST Amount</div>
              <div class="calc-result-value" id="gst-amount-result" style="color:#f59e0b">₹0</div>
            </div>
            <div class="calc-result-box" style="border-color:#10B981">
              <div class="calc-result-label" id="gst-final-label">Total Amount</div>
              <div class="calc-result-value" id="gst-final" style="color:#10B981">₹0</div>
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

    const rateInput = document.getElementById('gst-rate-input');
    rateInput.addEventListener('input', e => {
      this.gstRate = parseFloat(e.target.value) || 0;
      this.syncQuickButtons();
      this.calculate();
    });

    document.getElementById('gst-amount').addEventListener('input', e => {
      this.amount = parseFloat(e.target.value) || 0;
    });

    document.querySelectorAll('.gst-quick-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const rate = parseFloat(btn.dataset.rate);
        this.gstRate = rate;
        rateInput.value = rate;
        this.syncQuickButtons();
        this.calculate();
      });
    });

    document.getElementById('gst-calculate').addEventListener('click', () => this.calculate());
  }

  syncQuickButtons() {
    document.querySelectorAll('.gst-quick-btn').forEach(btn => {
      btn.classList.toggle('active', parseFloat(btn.dataset.rate) === this.gstRate);
    });
  }

  calculate() {
    const amt = parseFloat(document.getElementById('gst-amount').value) || 0;
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
          <tr>
            <th style="padding:9px 14px; text-align:left; border-bottom:2px solid var(--calc-border); color:var(--calc-slate-light); font-size:0.75rem; text-transform:uppercase; letter-spacing:0.4px;">Description</th>
            <th style="padding:9px 14px; text-align:right; border-bottom:2px solid var(--calc-border); color:var(--calc-slate-light); font-size:0.75rem; text-transform:uppercase; letter-spacing:0.4px;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((r, i) => `
            <tr style="${i === rows.length - 1 ? 'font-weight:700;' : ''}">
              <td style="padding:9px 14px; border-bottom:1px solid var(--calc-border-soft); color:${i === rows.length - 1 ? 'var(--calc-slate)' : 'var(--calc-slate-light)'};">${r[0]}</td>
              <td style="padding:9px 14px; border-bottom:1px solid var(--calc-border-soft); text-align:right; color:${i === rows.length - 1 ? '#10B981' : 'var(--calc-slate)'};">${r[1]}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }
}

registerCalculator('gst', GSTCalculator);

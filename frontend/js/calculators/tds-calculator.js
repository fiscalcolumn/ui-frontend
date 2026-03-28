/**
 * TDS Calculator — India
 * Tax Deducted at Source rates as per Income Tax Act
 */
class TDSCalculator {
  constructor(container) {
    this.container = container;
    this.selectedSection = '194C';
    this.amount = 100000;
    this.panAvailable = 'yes';

    this.TDS_SECTIONS = [
      { section: '194A', description: 'Interest (Bank/FD)', threshold: 40000, individual: 10, noTan: 20 },
      { section: '194B', description: 'Lottery / Game Winnings', threshold: 10000, individual: 30, noTan: 30 },
      { section: '194C', description: 'Payment to Contractor', threshold: 30000, individual: 1, company: 2, noTan: 20 },
      { section: '194D', description: 'Insurance Commission', threshold: 15000, individual: 5, noTan: 20 },
      { section: '194H', description: 'Commission / Brokerage', threshold: 15000, individual: 5, noTan: 20 },
      { section: '194I', description: 'Rent (Land/Building)', threshold: 240000, individual: 10, noTan: 20 },
      { section: '194J', description: 'Professional / Technical Fees', threshold: 30000, individual: 10, noTan: 20 },
      { section: '194N', description: 'Cash Withdrawal (above 1Cr)', threshold: 10000000, individual: 2, noTan: 2 },
      { section: '192', description: 'Salary', threshold: 0, note: 'As per applicable income tax slab' },
    ];
  }

  render() {
    const sectionOptions = this.TDS_SECTIONS.map(s =>
      `<option value="${s.section}" ${s.section === this.selectedSection ? 'selected' : ''}>${s.section} — ${s.description}</option>`
    ).join('');

    this.container.innerHTML = `
      <div class="calc-form">
        <div class="calc-input-group">
          <label for="tds-section">TDS Section</label>
          <select id="tds-section" class="calc-select">${sectionOptions}</select>
        </div>

        ${CalculatorUtils.createSlider('tds-amount', 'Payment Amount (₹)', 1000, 10000000, this.amount, 1000, '', '₹')}

        <div class="calc-input-group">
          <label>PAN Available?</label>
          <div class="calc-radio-group">
            <label class="calc-radio-label">
              <input type="radio" name="tds-pan" value="yes" checked>
              <span>Yes — Normal TDS Rate</span>
            </label>
            <label class="calc-radio-label">
              <input type="radio" name="tds-pan" value="no">
              <span>No PAN — Higher rate (20% or actual, whichever is higher)</span>
            </label>
          </div>
        </div>

        <div style="text-align:center; margin-top:10px;">
          <button class="calc-btn" id="tds-calculate">
            <i class="fa fa-calculator"></i> Calculate TDS
          </button>
        </div>

        <div class="calc-results" id="tds-results" style="display:none;">
          <h4 class="calc-results-title">TDS Calculation</h4>
          <div class="calc-results-grid">
            <div class="calc-result-box" style="border-color:#2196f3">
              <div class="calc-result-label">Gross Payment</div>
              <div class="calc-result-value" id="tds-gross" style="color:#2196f3">₹0</div>
            </div>
            <div class="calc-result-box" style="border-color:#ff5722">
              <div class="calc-result-label">TDS Deducted</div>
              <div class="calc-result-value" id="tds-deducted" style="color:#ff5722">₹0</div>
              <div class="calc-result-sublabel" id="tds-rate-label"></div>
            </div>
            <div class="calc-result-box" style="border-color:#4caf50">
              <div class="calc-result-label">Net Payment</div>
              <div class="calc-result-value" id="tds-net" style="color:#4caf50">₹0</div>
            </div>
          </div>
          <div id="tds-note" style="margin-top:14px; background:#fff8e1; border-left:4px solid #ff9800; padding:10px 14px; border-radius:6px; font-size:0.83rem;"></div>
        </div>
      </div>
    `;
    this.bindEvents();
    this.calculate();
  }

  bindEvents() {
    document.getElementById('tds-section').addEventListener('change', e => {
      this.selectedSection = e.target.value;
      this.calculate();
    });
    document.getElementById('tds-amount').addEventListener('input', e => {
      this.amount = parseFloat(e.target.value) || 0;
      document.getElementById('tds-amount-value').textContent = CalculatorUtils.formatIndianNumber(this.amount);
      CalculatorUtils.updateSliderProgress(e.target);
    });
    document.getElementById('tds-amount').addEventListener('change', () => this.calculate());
    document.querySelectorAll('input[name="tds-pan"]').forEach(r =>
      r.addEventListener('change', e => { this.panAvailable = e.target.value; this.calculate(); })
    );
    document.getElementById('tds-calculate').addEventListener('click', () => this.calculate());
    setTimeout(() => CalculatorUtils.initSliderProgress(), 50);
  }

  calculate() {
    const section = this.TDS_SECTIONS.find(s => s.section === this.selectedSection);
    if (!section) return;

    const amount = this.amount;
    let tdsRate;
    let note = '';

    if (section.note) {
      document.getElementById('tds-results').style.display = 'block';
      document.getElementById('tds-gross').textContent = CalculatorUtils.formatCurrency(amount);
      document.getElementById('tds-deducted').textContent = 'As per slab';
      document.getElementById('tds-net').textContent = 'Varies';
      document.getElementById('tds-rate-label').textContent = '';
      document.getElementById('tds-note').textContent = section.note;
      return;
    }

    if (amount < section.threshold) {
      note = `⚠️ No TDS applicable. Payment (${CalculatorUtils.formatCurrency(amount)}) is below the threshold of ${CalculatorUtils.formatCurrency(section.threshold)}.`;
      document.getElementById('tds-results').style.display = 'block';
      document.getElementById('tds-gross').textContent = CalculatorUtils.formatCurrency(amount);
      document.getElementById('tds-deducted').textContent = '₹0';
      document.getElementById('tds-net').textContent = CalculatorUtils.formatCurrency(amount);
      document.getElementById('tds-rate-label').textContent = '0% (below threshold)';
      document.getElementById('tds-note').textContent = note;
      return;
    }

    if (this.panAvailable === 'no') {
      const normalRate = (section.individual || section.company || 0);
      tdsRate = Math.max(20, normalRate);
      note = `⚠️ No PAN: TDS @ ${tdsRate}% (higher of 20% or applicable rate). Provide PAN to reduce deduction.`;
    } else {
      tdsRate = section.individual || section.company || 0;
    }

    const tdsAmount = amount * tdsRate / 100;
    const netAmount = amount - tdsAmount;

    document.getElementById('tds-results').style.display = 'block';
    document.getElementById('tds-gross').textContent = CalculatorUtils.formatCurrency(amount);
    document.getElementById('tds-deducted').textContent = CalculatorUtils.formatCurrency(tdsAmount, 2);
    document.getElementById('tds-net').textContent = CalculatorUtils.formatCurrency(netAmount, 2);
    document.getElementById('tds-rate-label').textContent = `${tdsRate}% under Section ${section.section}`;
    document.getElementById('tds-note').textContent = note || `TDS @ ${tdsRate}% deducted under Section ${section.section} — ${section.description}. Threshold: ${CalculatorUtils.formatCurrency(section.threshold)}`;
  }
}

registerCalculator('tds', TDSCalculator);

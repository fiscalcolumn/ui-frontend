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
    this.mount();
    CalculatorUtils.bindModern([
      { id: 'tds-amount', display: (n) => CalculatorUtils.formatIndianNumber(n), end: CalculatorUtils.moneyEnd },
    ], () => this.calculate(), () => this.chart);
  }

  mount() {
    CalculatorUtils.adoptModern(this.container, {
      hint: 'The rate depends on the section and on whether a PAN is available.',
      tiles: [
        { id: 'tds-gross', label: 'Payment' },
        { id: 'tds-deducted', label: 'TDS' },
      ],
      canvasId: 'tds-chart',
      legend: ['You receive', 'TDS'],
      compareTitle: 'With a PAN and without one',
      leadId: 'tds-compare-lead',
      listId: 'tds-compare-list',
    });
  }

  calculate() {
    const sectionEl = document.getElementById('tds-section');
    const panEl = document.querySelector('input[name="tds-pan"]:checked');
    if (sectionEl) this.selectedSection = sectionEl.value;
    if (panEl) this.panAvailable = panEl.value;
    this.amount = parseFloat(document.getElementById('tds-amount').value) || 0;
    const section = this.TDS_SECTIONS.find(s => s.section === this.selectedSection);
    if (!section) return;

    const amount = this.amount;
    const rateFor = (pan) => {
      if (section.note) return null;
      if (amount < section.threshold) return 0;
      const normal = section.individual || section.company || 0;
      if (pan === 'no') return Math.max(20, normal);
      return normal;
    };
    const present = (tdsRate, lead) => {
      const deducted = tdsRate == null ? 0 : amount * tdsRate / 100;
      const net = amount - deducted;
      document.getElementById('tds-gross').textContent = CalculatorUtils.formatCurrency(amount);
      document.getElementById('tds-deducted').textContent = tdsRate == null ? 'As per slab' : CalculatorUtils.formatCurrency(deducted, 2);
      this.chart = CalculatorUtils.modernDoughnut(
        this.chart, 'tds-chart',
        [Math.max(0, net), Math.max(0, deducted)],
        'You get',
        tdsRate == null ? 'Slab' : CalculatorUtils.formatCurrency(net, 2)
      );
      CalculatorUtils.fillCompare('tds-compare-list', 'tds-compare-lead', lead, ['yes', 'no'].map(pan => {
        const rate = rateFor(pan);
        const cut = rate == null ? null : amount * rate / 100;
        return {
          primary: pan === 'yes' ? 'With PAN' : 'No PAN',
          tag: pan === this.panAvailable ? 'Your plan' : '',
          yours: pan === this.panAvailable,
          figures: [
            { label: 'Rate', value: rate == null ? 'Slab' : rate + '%' },
            { label: 'TDS', value: cut == null ? 'Varies' : CalculatorUtils.formatCurrency(cut, 2) },
          ],
        };
      }));
    };

    if (section.note) {
      present(null, section.note);
      return;
    }
    const lead = 'Section ' + section.section + ', ' + section.description + '. Threshold ' + CalculatorUtils.formatCurrency(section.threshold) + '.';
    if (amount < section.threshold) {
      present(0, 'No TDS. The payment is below ' + CalculatorUtils.formatCurrency(section.threshold) + '.');
      return;
    }
    present(rateFor(this.panAvailable), this.panAvailable === 'no' ? lead + ' Without a PAN the rate is at least 20%.' : lead);
  }
}

registerCalculator('tds', TDSCalculator);

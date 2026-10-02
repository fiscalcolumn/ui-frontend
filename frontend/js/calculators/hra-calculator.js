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
        </div>
      </div>
    `;
    this.bindEvents();
    this.calculate();
  }

  mount() {
    CalculatorUtils.adoptModern(this.container, {
      hint: 'The exemption is the smallest of the three tests. Metro cities use 50% of basic plus DA. Other cities use 40%.',
      tiles: [
        { id: 'hra-exempt-monthly', label: 'Exempt this month' },
        { id: 'hra-taxable', label: 'Taxable this month' },
      ],
      canvasId: 'hra-chart',
      legend: ['Exempt', 'Taxable'],
      compareTitle: 'The three tests',
      leadId: 'hra-compare-lead',
      listId: 'hra-compare-list',
    });
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
    this.mount();
    CalculatorUtils.bindModern([
      { id: 'hra-basic', display: (n) => CalculatorUtils.formatIndianNumber(n), end: CalculatorUtils.moneyEnd },
      { id: 'hra-da', display: (n) => CalculatorUtils.formatIndianNumber(n), end: CalculatorUtils.moneyEnd },
      { id: 'hra-received', display: (n) => CalculatorUtils.formatIndianNumber(n), end: CalculatorUtils.moneyEnd },
      { id: 'hra-rent', display: (n) => CalculatorUtils.formatIndianNumber(n), end: CalculatorUtils.moneyEnd },
    ], () => this.calculate(), () => this.chart);
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

    const tests = [
      { primary: 'HRA received', value: a },
      { primary: (this.city === 'metro' ? '50%' : '40%') + ' of basic + DA', value: b },
      { primary: 'Rent minus 10%', value: c },
    ];
    this.chart = CalculatorUtils.paintGrowth(this.chart, {
      investedId: 'hra-exempt-monthly',
      gainId: 'hra-taxable',
      canvasId: 'hra-chart',
      invested: exempt,
      gained: Math.max(0, taxable),
      centerLabel: 'A year',
      centerValue: CalculatorUtils.formatCurrency(exempt * 12, 0),
      listId: 'hra-compare-list',
      leadId: 'hra-compare-lead',
      lead: 'Exemption this month is ' + CalculatorUtils.formatCurrency(exempt, 0) + ', the smallest of the three.',
      rows: tests.map(test => ({
        primary: test.primary,
        tag: test.value === exempt ? 'The limit' : '',
        yours: test.value === exempt,
        figures: [
          { label: 'Monthly', value: CalculatorUtils.formatCurrency(test.value, 0) },
          { label: 'Yearly', value: CalculatorUtils.formatCurrency(test.value * 12, 0) },
        ],
      })),
    });
  }
}

registerCalculator('hra', HRACalculator);

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

  mount() {
    CalculatorUtils.adoptModern(this.container, {
      hint: 'NSC grows at 7.7% a year for 5 years. Interest is added back each year.',
      tiles: [
        { id: 'nsc-invested', label: 'You invest' },
        { id: 'nsc-interest', label: 'Interest' },
      ],
      canvasId: 'nsc-chart',
      legend: ['You invest', 'Interest'],
      compareTitle: 'Year by year',
      leadId: 'nsc-compare-lead',
      listId: 'nsc-compare-list',
    });
  }

  bindEvents() {
    document.getElementById('nsc-invest').addEventListener('input', e => {
      this.investment = parseFloat(e.target.value) || 0;
      document.getElementById('nsc-invest-value').textContent = CalculatorUtils.formatIndianNumber(this.investment);
      CalculatorUtils.updateSliderProgress(e.target);
    });
    document.getElementById('nsc-invest').addEventListener('change', () => this.calculate());
    this.mount();
    CalculatorUtils.bindModern([
      { id: 'nsc-invest', display: (n) => CalculatorUtils.formatIndianNumber(n), end: CalculatorUtils.moneyEnd },
    ], () => this.calculate(), () => this.chart);
  }

  calculate() {
    this.investment = parseFloat(document.getElementById('nsc-invest').value) || 0;
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
    this.chart = CalculatorUtils.paintGrowth(this.chart, {
      investedId: 'nsc-invested',
      gainId: 'nsc-interest',
      canvasId: 'nsc-chart',
      invested: P,
      gained: totalInterest,
      centerLabel: 'Maturity',
      listId: 'nsc-compare-list',
      leadId: 'nsc-compare-lead',
      lead: CalculatorUtils.formatCurrency(P) + ' at 7.7% a year. The rate and the 5-year term are fixed.',
      rows: rows.map(row => ({
        primary: 'Year ' + row.year,
        tag: row.year === this.TENURE ? 'Maturity' : '',
        yours: row.year === this.TENURE,
        figures: [
          { label: 'Interest', value: CalculatorUtils.formatCurrency(row.interest) },
          { label: 'Balance', value: CalculatorUtils.formatCurrency(row.closingBalance) },
        ],
      })),
    });
  }
}

registerCalculator('nsc', NSCCalculator);

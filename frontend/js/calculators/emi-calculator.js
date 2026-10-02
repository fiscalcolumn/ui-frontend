/**
 * EMI Calculator with Amortization Chart
 */

class EMICalculator {
  constructor(container) {
    this.container = container;
    this.loanAmount = 1000000;
    this.interestRate = 10;
    this.tenure = 60; // months
    this.chart = null;
  }

  render() {
    this.container.innerHTML = `
      <div class="calc-form sip-form">
        <div class="sip-sliders">
          ${CalculatorUtils.createSlider('emi-amount', 'Loan Amount', 50000, 10000000, this.loanAmount, 50000, '', '₹')}
          ${CalculatorUtils.createSlider('emi-rate', 'Interest Rate', 5, 20, this.interestRate, 0.25, '%', '')}
          ${CalculatorUtils.createSlider('emi-tenure', 'Loan Tenure', 12, 360, this.tenure, 12, ' months', '')}
          <p class="sip-hint">The estimate updates as you move a slider.</p>
        </div>
        <div class="calc-results sip-results">
          <div class="sip-summary-card">
            <div class="sip-stats">
              <div class="sip-stat"><span class="sip-stat-label">Principal</span><span class="sip-stat-value" id="emi-principal">—</span></div>
              <div class="sip-stat"><span class="sip-stat-label">Total interest</span><span class="sip-stat-value" id="emi-interest">—</span></div>
            </div>
            <div class="sip-chart-wrap">
              <div class="sip-chart"><canvas id="emi-chart" aria-label="Principal and interest in the total payment"></canvas></div>
              <div class="sip-legend">
                <span><i class="sip-dot sip-dot-invested"></i> Principal</span>
                <span><i class="sip-dot sip-dot-gain"></i> Interest</span>
              </div>
            </div>
          </div>
          <section class="sip-compare" aria-label="Same loan at different rates">
            <h2 class="sip-compare-title">Same loan, different rates</h2>
            <p class="sip-compare-lead" id="emi-compare-lead"></p>
            <div id="emi-compare-list"></div>
          </section>
        </div>
      </div>
    `;
    this.bindEvents();
    this.calculate();
  }

  bindEvents() {
    CalculatorUtils.bindModern([
      { id: 'emi-amount', display: (n) => CalculatorUtils.formatIndianNumber(n), end: CalculatorUtils.moneyEnd },
      { id: 'emi-rate', display: (n) => n.toFixed(2), end: (n) => `${n}%` },
      { id: 'emi-tenure', display: (n) => String(n), end: (n) => `${n} months` },
    ], () => this.calculate(), () => this.chart);
  }

  emiFor(principal, annualPercent, months) {
    return CalculatorUtils.calculateEMI(principal, annualPercent / 12 / 100, months);
  }

  calculate() {
    this.loanAmount = parseFloat(document.getElementById('emi-amount').value);
    this.interestRate = parseFloat(document.getElementById('emi-rate').value);
    this.tenure = parseInt(document.getElementById('emi-tenure').value, 10);

    const emi = this.emiFor(this.loanAmount, this.interestRate, this.tenure);
    const totalInterest = emi * this.tenure - this.loanAmount;

    document.getElementById('emi-principal').textContent = CalculatorUtils.formatCurrency(this.loanAmount);
    document.getElementById('emi-interest').textContent = CalculatorUtils.formatCurrency(totalInterest);
    this.chart = CalculatorUtils.modernDoughnut(
      this.chart, 'emi-chart',
      [this.loanAmount, Math.max(0, totalInterest)],
      'EMI',
      CalculatorUtils.formatCurrency(emi)
    );

    const slider = document.getElementById('emi-rate');
    const rates = CalculatorUtils.ratesInRange(this.interestRate, parseFloat(slider.min), parseFloat(slider.max), [8, 10, 12]);
    CalculatorUtils.fillCompare(
      'emi-compare-list',
      'emi-compare-lead',
      `${CalculatorUtils.formatCurrency(this.loanAmount)} over ${this.tenure} months. Only the yearly rate changes.`,
      rates.map(rate => {
        const rowEmi = this.emiFor(this.loanAmount, rate, this.tenure);
        const yours = Math.abs(rate - this.interestRate) < 0.05;
        return {
          primary: `${Number.isInteger(rate) ? rate : rate.toFixed(2)}%`,
          tag: yours ? 'Your rate' : '',
          yours,
          figures: [
            { label: 'EMI', value: CalculatorUtils.formatCurrency(rowEmi) },
            { label: 'Interest', value: CalculatorUtils.formatCurrency(rowEmi * this.tenure - this.loanAmount) },
          ],
        };
      })
    );
  }
}

registerCalculator('emi', EMICalculator);

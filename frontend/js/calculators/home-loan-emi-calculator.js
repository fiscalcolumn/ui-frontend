/**
 * Home Loan EMI Calculator
 */

class HomeLoanEMICalculator {
  constructor(container) {
    this.container = container;
    this.propertyValue = 5000000;
    this.downPayment = 1000000;
    this.interestRate = 8.5;
    this.tenure = 240; // 20 years in months
    this.chart = null;
  }

  render() {
    this.container.innerHTML = `
      <div class="calc-form sip-form">
        <div class="sip-sliders">
        ${CalculatorUtils.createSlider('hl-property', 'Property Value', 1000000, 50000000, this.propertyValue, 100000, '', '₹')}
        ${CalculatorUtils.createSlider('hl-down', 'Down Payment', 100000, 10000000, this.downPayment, 100000, '', '₹')}
        ${CalculatorUtils.createSlider('hl-rate', 'Interest Rate', 6, 14, this.interestRate, 0.1, '%', '')}
        ${CalculatorUtils.createSlider('hl-tenure', 'Loan Tenure', 60, 360, this.tenure, 12, ' months', '')}
        
        <p class="sip-hint">Loan amount is the property value minus the down payment.</p>
        </div>

        <div class="calc-results sip-results" id="hl-results">
          <div class="sip-summary-card">
            <div class="sip-stats">
              <div class="sip-stat"><span class="sip-stat-label">Loan amount</span><span class="sip-stat-value" id="hl-loan-amount">—</span></div>
              <div class="sip-stat"><span class="sip-stat-label">Total interest</span><span class="sip-stat-value" id="hl-interest">—</span></div>
            </div>
            <div class="sip-chart-wrap">
              <div class="sip-chart"><canvas id="hl-chart" aria-label="Loan amount and interest"></canvas></div>
              <div class="sip-legend"><span><i class="sip-dot sip-dot-invested"></i> Loan</span><span><i class="sip-dot sip-dot-gain"></i> Interest</span></div>
            </div>
          </div>
          <section class="sip-compare" aria-label="Same home loan at different rates">
            <h2 class="sip-compare-title">Same loan, different rates</h2>
            <p class="sip-compare-lead" id="hl-compare-lead"></p>
            <div id="hl-compare-list"></div>
          </section>
        </div>
      </div>
    `;
    this.bindEvents();
    this.calculate();
  }

  bindEvents() {
    CalculatorUtils.bindModern([
      { id: 'hl-property', display: (n) => CalculatorUtils.formatIndianNumber(n), end: CalculatorUtils.moneyEnd },
      { id: 'hl-down', display: (n) => CalculatorUtils.formatIndianNumber(n), end: CalculatorUtils.moneyEnd },
      { id: 'hl-rate', display: (n) => n.toFixed(1), end: (n) => `${n}%` },
      { id: 'hl-tenure', display: (n) => String(n), end: (n) => `${n} months` },
    ], () => this.calculate(), () => this.chart);
  }

  quote(loanAmount, annualPercent, months) {
    if (loanAmount <= 0 || months <= 0) return { emi: 0, interest: 0 };
    const emi = CalculatorUtils.calculateEMI(loanAmount, annualPercent / 12 / 100, months);
    return { emi, interest: emi * months - loanAmount };
  }

  calculate() {
    this.propertyValue = parseFloat(document.getElementById('hl-property').value);
    this.downPayment = parseFloat(document.getElementById('hl-down').value);
    this.interestRate = parseFloat(document.getElementById('hl-rate').value);
    this.tenure = parseInt(document.getElementById('hl-tenure').value, 10);

    const loanAmount = Math.max(0, this.propertyValue - this.downPayment);
    const quote = this.quote(loanAmount, this.interestRate, this.tenure);

    document.getElementById('hl-loan-amount').textContent = CalculatorUtils.formatCurrency(loanAmount);
    document.getElementById('hl-interest').textContent = CalculatorUtils.formatCurrency(quote.interest);
    this.chart = CalculatorUtils.modernDoughnut(
      this.chart, 'hl-chart',
      [loanAmount, Math.max(0, quote.interest)],
      'EMI',
      CalculatorUtils.formatCurrency(quote.emi)
    );

    const slider = document.getElementById('hl-rate');
    const rates = CalculatorUtils.ratesInRange(this.interestRate, parseFloat(slider.min), parseFloat(slider.max), [8, 10, 12]);
    CalculatorUtils.fillCompare(
      'hl-compare-list',
      'hl-compare-lead',
      `${CalculatorUtils.formatCurrency(loanAmount)} over ${this.tenure} months. Only the yearly rate changes.`,
      rates.map(rate => {
        const row = this.quote(loanAmount, rate, this.tenure);
        const yours = Math.abs(rate - this.interestRate) < 0.05;
        return {
          primary: `${Number.isInteger(rate) ? rate : rate.toFixed(1)}%`,
          tag: yours ? 'Your rate' : '',
          yours,
          figures: [
            { label: 'EMI', value: CalculatorUtils.formatCurrency(row.emi) },
            { label: 'Interest', value: CalculatorUtils.formatCurrency(row.interest) },
          ],
        };
      })
    );
  }

}

registerCalculator('home-loan-emi', HomeLoanEMICalculator);


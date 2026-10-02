/**
 * Credit Card Interest / Payoff Calculator
 */
class CreditCardCalculator {
  constructor(container) {
    this.container = container;
    this.balance = 50000;
    this.interestRate = 3.5; // monthly %
    this.minPayment = 5;     // % of balance
    this.extraPayment = 5000;
    this.payMode = 'full';
    this.chart = null;
  }

  render() {
    this.container.innerHTML = `
      <div class="calc-form">
        ${CalculatorUtils.createSlider('cc-balance', 'Outstanding Balance (₹)', 1000, 1000000, this.balance, 1000, '', '₹')}
        ${CalculatorUtils.createSlider('cc-rate', 'Monthly Interest Rate (%)', 1, 5, this.interestRate, 0.1, '% /month', '')}
        <div class="calc-input-group cc-pay-choice">
          <label>How will you pay this bill?</label>
          <div class="calc-radio-group">
            <label class="calc-radio-label">
              <input type="radio" name="cc-mode" value="full" checked>
              <span>Pay the full bill</span>
            </label>
            <label class="calc-radio-label">
              <input type="radio" name="cc-mode" value="fixed">
              <span>Pay a fixed amount</span>
            </label>
            <label class="calc-radio-label">
              <input type="radio" name="cc-mode" value="minimum">
              <span>Pay only the minimum</span>
            </label>
          </div>
        </div>
        ${CalculatorUtils.createSlider('cc-min', 'Minimum due, as a share of the balance', 1, 20, this.minPayment, 1, '%', '')}
        ${CalculatorUtils.createSlider('cc-extra', 'Amount you pay each month', 500, 200000, this.extraPayment, 500, '', '₹')}

        <div style="text-align:center; margin-top:10px;">
          <button class="calc-btn" id="cc-calculate">
            <i class="fa fa-credit-card"></i> Calculate Payoff
          </button>
        </div>

        <div class="calc-results" id="cc-results" style="display:none;">
          <h4 class="calc-results-title">Payoff Summary</h4>
          <div class="calc-results-grid">
            <div class="calc-result-box" style="border-color:#e53935">
              <div class="calc-result-label">Months to Pay Off</div>
              <div class="calc-result-value" id="cc-months" style="color:#e53935">—</div>
            </div>
            <div class="calc-result-box" style="border-color:#ff9800">
              <div class="calc-result-label">Total Interest Paid</div>
              <div class="calc-result-value" id="cc-total-interest" style="color:#ff9800">₹0</div>
            </div>
            <div class="calc-result-box" style="border-color:#9c27b0">
              <div class="calc-result-label">Total Amount Paid</div>
              <div class="calc-result-value" id="cc-total-paid" style="color:#9c27b0">₹0</div>
            </div>
          </div>
          <div id="cc-savings-box" style="display:none; margin-top:10px;" class="calc-result-box" style="border-color:#4caf50">
          </div>

          <div class="calc-chart-container">
            <h5 class="calc-chart-title">Balance Over Time</h5>
            <div class="calc-chart-wrapper"><canvas id="cc-chart"></canvas></div>
          </div>
        </div>
      </div>
    `;
    this.bindEvents();
    this.calculate();
  }

  bindEvents() {
    this.mount();
    CalculatorUtils.bindModern([
      { id: 'cc-balance', display: (n) => CalculatorUtils.formatIndianNumber(n), end: CalculatorUtils.moneyEnd },
      { id: 'cc-rate', display: (n) => n.toFixed(1), end: (n) => `${n}%` },
      { id: 'cc-min', display: (n) => String(n), end: (n) => `${n}%` },
      { id: 'cc-extra', display: (n) => CalculatorUtils.formatIndianNumber(n), end: CalculatorUtils.moneyEnd },
    ], () => this.calculate(), () => this.chart);
    this.syncPayChoice();
    document.querySelectorAll('input[name="cc-mode"]').forEach(input => {
      input.addEventListener('change', () => {
        this.syncPayChoice();
        this.calculate();
      });
    });
  }

  syncPayChoice() {
    const selected = document.querySelector('input[name="cc-mode"]:checked');
    this.payMode = selected ? selected.value : 'full';
    const fixed = document.getElementById('cc-extra-group');
    const minimum = document.getElementById('cc-min-group');
    if (fixed) fixed.hidden = this.payMode !== 'fixed';
    if (minimum) minimum.hidden = this.payMode !== 'minimum';
  }

  mount() {
    CalculatorUtils.adoptModern(this.container, {
      hint: 'Paying the full bill by the due date keeps the interest at zero. The rate is the monthly rate on the card.',
      tiles: [
        { id: 'cc-total-interest', label: 'Interest paid' },
        { id: 'cc-total-paid', label: 'Total paid' },
      ],
      canvasId: 'cc-chart',
      legend: ['Balance', 'Interest'],
      compareTitle: 'What each way of paying costs',
      leadId: 'cc-compare-lead',
      listId: 'cc-compare-list',
    });
  }

  calculate() {
    this.balance = parseFloat(document.getElementById('cc-balance').value) || 0;
    this.interestRate = parseFloat(document.getElementById('cc-rate').value) || 0;
    this.minPayment = parseFloat(document.getElementById('cc-min').value) || 0;
    this.extraPayment = parseFloat(document.getElementById('cc-extra').value) || 0;
    const rate = this.interestRate / 100;
    const minPct = this.minPayment / 100;
    const fixedPayment = this.extraPayment;
    const mode = this.payMode || 'full';

    const paidInFull = () => ({
      months: 1, totalPaid: this.balance, totalInterest: 0, infinite: false, full: true,
    });

    const simulatePayment = (paymentOf) => {
      let balance = this.balance;
      let totalPaid = 0;
      let totalInterest = 0;
      let months = 0;
      const MAX_MONTHS = 600;

      while (balance > 0.01 && months < MAX_MONTHS) {
        const interest = balance * rate;
        const payment = Math.min(balance + interest, paymentOf(balance, interest));
        if (payment <= interest && balance > 1) {
          return { months, totalPaid, totalInterest, infinite: true, full: false };
        }
        totalPaid += payment;
        totalInterest += interest;
        balance = Math.max(0, balance + interest - payment);
        months++;
      }
      return { months, totalPaid, totalInterest, infinite: months >= MAX_MONTHS, full: false };
    };

    const minimum = simulatePayment((balance) => Math.max(100, balance * minPct));
    const fixed = fixedPayment >= this.balance
      ? paidInFull()
      : simulatePayment(() => fixedPayment);
    const chosen = mode === 'full' ? paidInFull() : mode === 'fixed' ? fixed : minimum;

    const timeLabel = (row) => {
      if (!row || row.infinite) return 'Never';
      if (row.full) return 'This month';
      const years = Math.floor(row.months / 12);
      const months = row.months % 12;
      return years > 0 ? `${years}y ${months}m` : `${months} mo`;
    };
    const interestLabel = (row) => {
      if (!row || row.infinite) return 'Keeps growing';
      return CalculatorUtils.formatCurrency(row.totalInterest);
    };

    document.getElementById('cc-total-interest').textContent = interestLabel(chosen);
    document.getElementById('cc-total-paid').textContent = chosen.infinite ? '—' : CalculatorUtils.formatCurrency(chosen.totalPaid);
    this.chart = CalculatorUtils.modernDoughnut(
      this.chart, 'cc-chart',
      [this.balance, chosen.infinite ? this.balance : Math.max(0, chosen.totalInterest)],
      chosen.full ? 'Interest' : 'Payoff',
      chosen.full ? '₹0' : timeLabel(chosen)
    );

    const lead = mode === 'full'
      ? `${CalculatorUtils.formatCurrency(this.balance)} paid in full. Interest on this bill is zero.`
      : `${CalculatorUtils.formatCurrency(this.balance)} at ${this.interestRate}% a month. Paying the bill in full keeps the interest at zero.`;

    CalculatorUtils.fillCompare('cc-compare-list', 'cc-compare-lead', lead, [
      {
        primary: 'Full bill',
        tag: mode === 'full' ? 'Your plan' : '',
        yours: mode === 'full',
        figures: [
          { label: 'Time', value: 'This month' },
          { label: 'Interest', value: '₹0' },
        ],
      },
      {
        primary: `₹${CalculatorUtils.formatIndianNumber(fixedPayment)}`,
        tag: mode === 'fixed' ? 'Your plan' : '',
        yours: mode === 'fixed',
        figures: [
          { label: 'Time', value: timeLabel(fixed) },
          { label: 'Interest', value: interestLabel(fixed) },
        ],
      },
      {
        primary: `Min ${this.minPayment}%`,
        tag: mode === 'minimum' ? 'Your plan' : '',
        yours: mode === 'minimum',
        figures: [
          { label: 'Time', value: timeLabel(minimum) },
          { label: 'Interest', value: interestLabel(minimum) },
        ],
      },
    ]);
  }

  renderChart(balances) {
    const ctx = document.getElementById('cc-chart').getContext('2d');
    if (this.chart) this.chart.destroy();
    const labels = balances.map((_, i) => i === 0 ? 'Start' : `M${i}`);

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Outstanding Balance',
          data: balances,
          borderColor: '#e53935',
          backgroundColor: 'rgba(229,57,53,0.08)',
          borderWidth: 2,
          fill: true,
          tension: 0.3,
          pointRadius: 0,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: { label: c => `Balance: ${CalculatorUtils.formatCurrency(c.raw)}` },
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10 }, maxTicksLimit: 12 } },
          y: {
            beginAtZero: true,
            ticks: { font: { size: 10 }, callback: v => CalculatorUtils.formatChartAxis(v) },
            grid: { color: 'rgba(0,0,0,0.05)' },
          },
        },
      },
    });
  }
}

registerCalculator('credit-card', CreditCardCalculator);

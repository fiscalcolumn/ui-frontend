/**
 * Credit Card Interest / Payoff Calculator
 */
class CreditCardCalculator {
  constructor(container) {
    this.container = container;
    this.balance = 50000;
    this.interestRate = 3.5; // monthly %
    this.minPayment = 5;     // % of balance
    this.extraPayment = 0;
    this.chart = null;
  }

  render() {
    this.container.innerHTML = `
      <div class="calc-form">
        ${CalculatorUtils.createSlider('cc-balance', 'Outstanding Balance (₹)', 1000, 1000000, this.balance, 1000, '', '₹')}
        ${CalculatorUtils.createSlider('cc-rate', 'Monthly Interest Rate (%)', 1, 5, this.interestRate, 0.1, '% /month', '')}
        ${CalculatorUtils.createSlider('cc-min', 'Minimum Payment (% of balance)', 1, 20, this.minPayment, 1, '%', '')}
        ${CalculatorUtils.createSlider('cc-extra', 'Extra Monthly Payment (₹)', 0, 50000, this.extraPayment, 500, '', '₹')}

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
    [['cc-balance', 'balance'], ['cc-rate', 'interestRate'], ['cc-min', 'minPayment'], ['cc-extra', 'extraPayment']].forEach(([id, field]) => {
      document.getElementById(id).addEventListener('input', e => {
        this[field] = parseFloat(e.target.value) || 0;
        document.getElementById(`${id}-value`).textContent = CalculatorUtils.formatIndianNumber(this[field]);
        CalculatorUtils.updateSliderProgress(e.target);
      });
      document.getElementById(id).addEventListener('change', () => this.calculate());
    });
    document.getElementById('cc-calculate').addEventListener('click', () => this.calculate());
    setTimeout(() => CalculatorUtils.initSliderProgress(), 50);
  }

  calculate() {
    const rate = this.interestRate / 100;
    const minPct = this.minPayment / 100;
    const extra = this.extraPayment;

    const simulate = (withExtra) => {
      let balance = this.balance;
      let totalPaid = 0;
      let totalInterest = 0;
      let months = 0;
      const balances = [balance];
      const MAX_MONTHS = 600;

      while (balance > 0.01 && months < MAX_MONTHS) {
        const interest = balance * rate;
        const minPay = Math.max(100, balance * minPct);
        const payment = Math.min(balance + interest, minPay + (withExtra ? extra : 0));
        totalPaid += payment;
        totalInterest += interest;
        balance = balance + interest - payment;
        months++;
        balances.push(Math.max(0, balance));
      }
      return { months, totalPaid, totalInterest, balances, infinite: months >= MAX_MONTHS };
    };

    const result = simulate(true);
    const baseResult = extra > 0 ? simulate(false) : null;

    document.getElementById('cc-results').style.display = 'block';

    if (result.infinite) {
      document.getElementById('cc-months').textContent = '∞';
      document.getElementById('cc-months').style.color = '#e53935';
      document.getElementById('cc-total-interest').textContent = 'Never payoff!';
    } else {
      const y = Math.floor(result.months / 12);
      const m = result.months % 12;
      document.getElementById('cc-months').textContent = y > 0 ? `${y}y ${m}m` : `${m} months`;
    }

    document.getElementById('cc-total-interest').textContent = CalculatorUtils.formatCurrency(result.totalInterest);
    document.getElementById('cc-total-paid').textContent = CalculatorUtils.formatCurrency(result.totalPaid);

    if (baseResult && !baseResult.infinite && !result.infinite) {
      const savedMonths = baseResult.months - result.months;
      const savedInterest = baseResult.totalInterest - result.totalInterest;
      const box = document.getElementById('cc-savings-box');
      box.style.display = 'block';
      box.style.borderColor = '#4caf50';
      box.innerHTML = `
        <div class="calc-result-label">💡 Extra ₹${CalculatorUtils.formatIndianNumber(extra)}/month saves you</div>
        <div class="calc-result-value" style="color:#4caf50; font-size:1.3rem">${CalculatorUtils.formatCurrency(savedInterest)} interest</div>
        <div class="calc-result-sublabel">Pay off ${savedMonths} months sooner</div>
      `;
    }

    this.renderChart(result.balances);
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

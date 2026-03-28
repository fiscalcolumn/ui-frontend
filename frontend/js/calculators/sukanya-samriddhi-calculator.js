/**
 * Sukanya Samriddhi Yojana (SSY) Calculator — India
 * Government savings scheme for girl child under PMABY
 */
class SukanyaSamriddhiCalculator {
  constructor(container) {
    this.container = container;
    this.yearlyDeposit = 50000;
    this.girlAge = 1;
    this.chart = null;
    this.SSY_RATE = 8.2; // Current rate (FY 2024-25)
    this.LOCK_IN_YEARS = 21;
    this.DEPOSIT_YEARS = 15;
  }

  render() {
    this.container.innerHTML = `
      <div class="calc-form">
        <div style="background:linear-gradient(135deg,#e91e6318,#9c27b018); border-radius:10px; padding:12px 16px; margin-bottom:18px; font-size:0.85rem;">
          <i class="fa fa-info-circle" style="color:#e91e63"></i>
          <strong>Sukanya Samriddhi Yojana</strong> — Interest Rate: <strong>${this.SSY_RATE}% p.a.</strong> (Q1 FY 2024-25, compounded annually). 
          Deposit for <strong>15 years</strong>, account matures after <strong>21 years</strong> from opening.
        </div>

        ${CalculatorUtils.createSlider('ssy-deposit', 'Yearly Deposit ₹', 250, 150000, this.yearlyDeposit, 250, '', '₹')}
        ${CalculatorUtils.createSlider('ssy-age', "Girl Child's Age (years)", 0, 10, this.girlAge, 1, ' yrs', '')}

        <div style="text-align:center; margin-top:10px;">
          <button class="calc-btn" id="ssy-calculate">
            <i class="fa fa-calculator"></i> Calculate Maturity
          </button>
        </div>

        <div class="calc-results" id="ssy-results" style="display:none;">
          <h4 class="calc-results-title">SSY Maturity Summary</h4>
          <div class="calc-results-grid">
            <div class="calc-result-box" style="border-color:#2196f3">
              <div class="calc-result-label">Total Deposited</div>
              <div class="calc-result-value" id="ssy-invested" style="color:#2196f3">₹0</div>
            </div>
            <div class="calc-result-box" style="border-color:#4caf50">
              <div class="calc-result-label">Interest Earned</div>
              <div class="calc-result-value" id="ssy-interest" style="color:#4caf50">₹0</div>
            </div>
            <div class="calc-result-box" style="border-color:#9c27b0">
              <div class="calc-result-label">Maturity Value</div>
              <div class="calc-result-value" id="ssy-maturity" style="color:#9c27b0">₹0</div>
            </div>
          </div>

          <div class="calc-results-grid" style="margin-top:10px; grid-template-columns:1fr 1fr;">
            <div class="calc-result-box" style="border-color:#ff9800">
              <div class="calc-result-label">Maturity Year</div>
              <div class="calc-result-value" id="ssy-year" style="color:#ff9800; font-size:1.4rem">—</div>
            </div>
            <div class="calc-result-box" style="border-color:#e91e63">
              <div class="calc-result-label">Girl's Age at Maturity</div>
              <div class="calc-result-value" id="ssy-age-maturity" style="color:#e91e63; font-size:1.4rem">—</div>
            </div>
          </div>

          <div class="calc-chart-container">
            <h5 class="calc-chart-title">Account Growth Over Years</h5>
            <div class="calc-chart-wrapper">
              <canvas id="ssy-chart"></canvas>
            </div>
          </div>
        </div>
      </div>
    `;
    this.bindEvents();
    this.calculate();
  }

  bindEvents() {
    document.getElementById('ssy-deposit').addEventListener('input', e => {
      this.yearlyDeposit = parseFloat(e.target.value) || 0;
      document.getElementById('ssy-deposit-value').textContent = CalculatorUtils.formatIndianNumber(this.yearlyDeposit);
      CalculatorUtils.updateSliderProgress(e.target);
    });
    document.getElementById('ssy-age').addEventListener('input', e => {
      this.girlAge = parseInt(e.target.value) || 0;
      document.getElementById('ssy-age-value').textContent = this.girlAge;
      CalculatorUtils.updateSliderProgress(e.target);
    });
    document.getElementById('ssy-calculate').addEventListener('click', () => this.calculate());
    ['ssy-deposit', 'ssy-age'].forEach(id => {
      document.getElementById(id).addEventListener('change', () => this.calculate());
    });
    setTimeout(() => CalculatorUtils.initSliderProgress(), 50);
  }

  calculate() {
    const rate = this.SSY_RATE / 100;
    const depositYears = this.DEPOSIT_YEARS;
    const totalYears = this.LOCK_IN_YEARS;
    const yearly = this.yearlyDeposit;

    let balance = 0;
    let totalDeposited = 0;
    const yearlyData = [{ year: 0, deposited: 0, balance: 0 }];

    for (let y = 1; y <= totalYears; y++) {
      if (y <= depositYears) {
        balance += yearly;
        totalDeposited += yearly;
      }
      balance = balance * (1 + rate);
      yearlyData.push({ year: y, deposited: totalDeposited, balance: Math.round(balance) });
    }

    const maturityValue = Math.round(balance);
    const interestEarned = maturityValue - totalDeposited;
    const maturityYear = new Date().getFullYear() + totalYears;
    const ageAtMaturity = this.girlAge + totalYears;

    document.getElementById('ssy-results').style.display = 'block';
    document.getElementById('ssy-invested').textContent = CalculatorUtils.formatCurrency(totalDeposited);
    document.getElementById('ssy-interest').textContent = CalculatorUtils.formatCurrency(interestEarned);
    document.getElementById('ssy-maturity').textContent = CalculatorUtils.formatCurrency(maturityValue);
    document.getElementById('ssy-year').textContent = maturityYear;
    document.getElementById('ssy-age-maturity').textContent = `${ageAtMaturity} yrs`;

    this.renderChart(yearlyData, depositYears);
  }

  renderChart(data, depositYears) {
    const ctx = document.getElementById('ssy-chart').getContext('2d');
    if (this.chart) this.chart.destroy();

    const labels = data.map(d => `Yr ${d.year}`);
    const deposited = data.map(d => d.deposited);
    const balance = data.map(d => d.balance);

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Amount Deposited',
            data: deposited,
            borderColor: '#2196f3',
            backgroundColor: 'rgba(33,150,243,0.08)',
            borderWidth: 1.5,
            fill: true,
            tension: 0.3,
            pointRadius: 1,
          },
          {
            label: 'Account Balance',
            data: balance,
            borderColor: '#9c27b0',
            backgroundColor: 'rgba(156,39,176,0.08)',
            borderWidth: 2,
            fill: true,
            tension: 0.3,
            pointRadius: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: 'bottom' },
          tooltip: {
            callbacks: {
              label: ctx => `${ctx.dataset.label}: ${CalculatorUtils.formatCurrency(ctx.raw)}`,
            },
          },
          annotation: {},
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10 } } },
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

registerCalculator('sukanya-samriddhi', SukanyaSamriddhiCalculator);

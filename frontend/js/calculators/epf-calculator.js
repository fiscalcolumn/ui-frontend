/**
 * EPF / PF Calculator — India
 * Employee Provident Fund under EPFO
 */
class EPFCalculator {
  constructor(container) {
    this.container = container;
    this.basicSalary = 30000;
    this.currentAge = 28;
    this.retirementAge = 58;
    this.existingBalance = 0;
    this.salaryGrowth = 5;
    this.chart = null;
    this.EPF_RATE = 8.25; // FY 2023-24 rate
    this.EMPLOYER_EPS = 8.33; // % of basic to EPS
    this.EMPLOYER_EPF = 3.67; // % of basic to EPF
    this.EMPLOYEE_CONTRIBUTION = 12; // % of basic
  }

  render() {
    this.container.innerHTML = `
      <div class="calc-form">
        <div style="background:linear-gradient(135deg,#ff980018,#ff572218); border-radius:10px; padding:12px 16px; margin-bottom:18px; font-size:0.85rem;">
          <i class="fa fa-info-circle" style="color:#ff9800"></i>
          <strong>EPFO Interest Rate: ${this.EPF_RATE}%</strong> p.a. (FY 2023-24). Employee contributes 12% of Basic+DA. Employer contributes 12% (3.67% to EPF, 8.33% to EPS).
        </div>

        ${CalculatorUtils.createSlider('epf-basic', 'Monthly Basic + DA (₹)', 5000, 200000, this.basicSalary, 1000, '', '₹')}
        ${CalculatorUtils.createSlider('epf-age', 'Current Age', 18, 57, this.currentAge, 1, ' yrs', '')}
        ${CalculatorUtils.createSlider('epf-retire', 'Retirement Age', 50, 60, this.retirementAge, 1, ' yrs', '')}
        ${CalculatorUtils.createSlider('epf-existing', 'Existing EPF Balance (₹)', 0, 5000000, this.existingBalance, 10000, '', '₹')}
        ${CalculatorUtils.createSlider('epf-growth', 'Annual Salary Growth (%)', 0, 15, this.salaryGrowth, 0.5, '%', '')}

        <div style="text-align:center; margin-top:10px;">
          <button class="calc-btn" id="epf-calculate">
            <i class="fa fa-calculator"></i> Calculate EPF Corpus
          </button>
        </div>

        <div class="calc-results" id="epf-results" style="display:none;">
          <h4 class="calc-results-title">EPF Retirement Corpus</h4>
          <div class="calc-results-grid">
            <div class="calc-result-box" style="border-color:#ff9800">
              <div class="calc-result-label">Employee Contribution</div>
              <div class="calc-result-value" id="epf-emp-contrib" style="color:#ff9800">₹0</div>
            </div>
            <div class="calc-result-box" style="border-color:#2196f3">
              <div class="calc-result-label">Employer Contribution</div>
              <div class="calc-result-value" id="epf-er-contrib" style="color:#2196f3">₹0</div>
            </div>
            <div class="calc-result-box" style="border-color:#4caf50">
              <div class="calc-result-label">Interest Earned</div>
              <div class="calc-result-value" id="epf-interest" style="color:#4caf50">₹0</div>
            </div>
          </div>
          <div class="calc-results-grid" style="margin-top:10px; grid-template-columns:1fr;">
            <div class="calc-result-box" style="border-color:#9c27b0; background:linear-gradient(135deg,#9c27b008,#e91e6308);">
              <div class="calc-result-label">Total EPF Corpus at Retirement</div>
              <div class="calc-result-value" id="epf-total" style="color:#9c27b0; font-size:1.8rem">₹0</div>
              <div class="calc-result-sublabel" id="epf-years-label"></div>
            </div>
          </div>

          <div class="calc-chart-container">
            <h5 class="calc-chart-title">Corpus Growth Over Years</h5>
            <div class="calc-chart-wrapper"><canvas id="epf-chart"></canvas></div>
          </div>
        </div>
      </div>
    `;
    this.bindEvents();
    this.calculate();
  }

  bindEvents() {
    const map = [
      ['epf-basic', 'basicSalary'],
      ['epf-age', 'currentAge'],
      ['epf-retire', 'retirementAge'],
      ['epf-existing', 'existingBalance'],
      ['epf-growth', 'salaryGrowth'],
    ];
    map.forEach(([id, field]) => {
      document.getElementById(id).addEventListener('input', e => {
        this[field] = parseFloat(e.target.value) || 0;
        document.getElementById(`${id}-value`).textContent = CalculatorUtils.formatIndianNumber(this[field]);
        CalculatorUtils.updateSliderProgress(e.target);
      });
      document.getElementById(id).addEventListener('change', () => this.calculate());
    });
    document.getElementById('epf-calculate').addEventListener('click', () => this.calculate());
    setTimeout(() => CalculatorUtils.initSliderProgress(), 50);
  }

  calculate() {
    const years = Math.max(1, this.retirementAge - this.currentAge);
    const rate = this.EPF_RATE / 100;
    const salaryGrowth = this.salaryGrowth / 100;
    const empPct = this.EMPLOYEE_CONTRIBUTION / 100;
    const erPct = this.EMPLOYER_EPF / 100; // employer's EPF portion only

    let balance = this.existingBalance;
    let totalEmpContrib = 0;
    let totalErContrib = 0;
    let basic = this.basicSalary;
    const yearlyData = [{ year: 0, balance }];

    for (let y = 1; y <= years; y++) {
      const monthlyEmp = basic * empPct;
      const monthlyEr = basic * erPct;
      const yearlyEmp = monthlyEmp * 12;
      const yearlyEr = monthlyEr * 12;

      balance = (balance + yearlyEmp + yearlyEr) * (1 + rate);
      totalEmpContrib += yearlyEmp;
      totalErContrib += yearlyEr;

      basic = basic * (1 + salaryGrowth);
      yearlyData.push({ year: y, balance: Math.round(balance) });
    }

    const totalContrib = totalEmpContrib + totalErContrib;
    const interestEarned = balance - totalContrib - this.existingBalance;

    document.getElementById('epf-results').style.display = 'block';
    document.getElementById('epf-emp-contrib').textContent = CalculatorUtils.formatCurrency(totalEmpContrib);
    document.getElementById('epf-er-contrib').textContent = CalculatorUtils.formatCurrency(totalErContrib);
    document.getElementById('epf-interest').textContent = CalculatorUtils.formatCurrency(Math.max(0, interestEarned));
    document.getElementById('epf-total').textContent = CalculatorUtils.formatCurrency(balance);
    document.getElementById('epf-years-label').textContent = `Over ${years} years at ${this.EPF_RATE}% p.a.`;

    this.renderChart(yearlyData);
  }

  renderChart(data) {
    const ctx = document.getElementById('epf-chart').getContext('2d');
    if (this.chart) this.chart.destroy();

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map(d => `Yr ${d.year}`),
        datasets: [{
          label: 'EPF Balance',
          data: data.map(d => d.balance),
          borderColor: '#ff9800',
          backgroundColor: 'rgba(255,152,0,0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 1,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: { label: c => `EPF Balance: ${CalculatorUtils.formatCurrency(c.raw)}` },
          },
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

registerCalculator('epf', EPFCalculator);

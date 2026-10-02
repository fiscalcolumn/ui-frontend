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

  mount() {
    CalculatorUtils.adoptModern(this.container, {
      hint: 'You put in 12% of basic pay. The employer puts 3.67% into EPF. The balance earns 8.25% a year.',
      tiles: [
        { id: 'epf-emp-contrib', label: 'Contributed' },
        { id: 'epf-interest', label: 'Interest' },
      ],
      canvasId: 'epf-chart',
      legend: ['Contributed', 'Interest'],
      compareTitle: 'Same salary, different yearly raises',
      leadId: 'epf-compare-lead',
      listId: 'epf-compare-list',
    });
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
    this.mount();
    CalculatorUtils.bindModern([
      { id: 'epf-basic', display: (n) => CalculatorUtils.formatIndianNumber(n), end: CalculatorUtils.moneyEnd },
      { id: 'epf-age', display: (n) => String(n), end: (n) => n + ' yr' },
      { id: 'epf-retire', display: (n) => String(n), end: (n) => n + ' yr' },
      { id: 'epf-existing', display: (n) => CalculatorUtils.formatIndianNumber(n), end: CalculatorUtils.moneyEnd },
      { id: 'epf-growth', display: (n) => n.toFixed(1), end: (n) => n + '%' },
    ], () => this.calculate(), () => this.chart);
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

    const contributed = totalContrib + this.existingBalance;
    const run = (growthPercent) => {
      let nextBalance = this.existingBalance;
      let emp = 0;
      let er = 0;
      let pay = this.basicSalary;
      const growth = growthPercent / 100;
      for (let y = 1; y <= years; y++) {
        const yearlyEmp = pay * empPct * 12;
        const yearlyEr = pay * erPct * 12;
        nextBalance = (nextBalance + yearlyEmp + yearlyEr) * (1 + rate);
        emp += yearlyEmp;
        er += yearlyEr;
        pay = pay * (1 + growth);
      }
      return { balance: nextBalance, interest: nextBalance - emp - er - this.existingBalance };
    };
    const growths = [0, 5, 10];
    if (!growths.some(growth => Math.abs(growth - this.salaryGrowth) < 0.05)) growths.push(this.salaryGrowth);
    growths.sort((a, b) => a - b);
    this.chart = CalculatorUtils.paintGrowth(this.chart, {
      investedId: 'epf-emp-contrib',
      gainId: 'epf-interest',
      canvasId: 'epf-chart',
      invested: contributed,
      gained: Math.max(0, interestEarned),
      centerLabel: 'Balance',
      centerValue: CalculatorUtils.formatCurrency(balance),
      listId: 'epf-compare-list',
      leadId: 'epf-compare-lead',
      lead: CalculatorUtils.formatCurrency(this.basicSalary) + ' basic pay, from age ' + this.currentAge + ' to ' + this.retirementAge + '. Only the yearly raise changes.',
      rows: growths.map(growth => {
        const row = run(growth);
        const yours = Math.abs(growth - this.salaryGrowth) < 0.05;
        return {
          primary: growth + '%',
          tag: yours ? 'Your raise' : '',
          yours,
          figures: [
            { label: 'Interest', value: CalculatorUtils.formatCurrency(Math.max(0, row.interest)) },
            { label: 'Balance', value: CalculatorUtils.formatCurrency(row.balance) },
          ],
        };
      }),
    });
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

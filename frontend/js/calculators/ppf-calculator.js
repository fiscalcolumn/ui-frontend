/**
 * PPF Calculator with Growth Chart
 */

class PPFCalculator {
  constructor(container) {
    this.container = container;
    this.yearlyInvestment = 150000;
    this.interestRate = 7.1;
    this.tenure = 15;
    this.chart = null;
  }

  render() {
    this.container.innerHTML = `
      <div class="calc-form">
        ${CalculatorUtils.createSlider('ppf-yearly', 'Yearly Investment', 500, 150000, this.yearlyInvestment, 500, '', '₹')}
        ${CalculatorUtils.createSlider('ppf-rate', 'Interest Rate (p.a.)', 5, 10, this.interestRate, 0.1, '%', '')}
        ${CalculatorUtils.createSlider('ppf-tenure', 'Investment Period', 15, 50, this.tenure, 5, ' years', '')}
        
        <div style="text-align: center; margin-top: 10px;">
          <button class="calc-btn" id="ppf-calculate">
            <i class="fa fa-calculator"></i> Calculate Maturity
          </button>
        </div>

        <div class="calc-results" id="ppf-results" style="display: none;">
          <h4 class="calc-results-title">PPF Maturity Details</h4>
          <div class="calc-results-grid">
            <div class="calc-result-box" style="border-color: #3498db">
              <div class="calc-result-label">Total Investment</div>
              <div class="calc-result-value" id="ppf-invested" style="color: #3498db">₹0</div>
            </div>
            <div class="calc-result-box" style="border-color: #27ae60">
              <div class="calc-result-label">Interest Earned</div>
              <div class="calc-result-value" id="ppf-interest" style="color: #27ae60">₹0</div>
            </div>
            <div class="calc-result-box" style="border-color: #9b59b6">
              <div class="calc-result-label">Maturity Value</div>
              <div class="calc-result-value" id="ppf-maturity" style="color: #9b59b6">₹0</div>
            </div>
          </div>

          <div class="calc-chart-container">
            <h5 class="calc-chart-title">PPF Growth Over Time</h5>
            <div class="calc-chart-wrapper">
              <canvas id="ppf-chart"></canvas>
            </div>
            <div class="calc-chart-legend">
              <div class="calc-legend-item">
                <span class="calc-legend-dot" style="background: #3498db"></span>
                <span>Amount Invested</span>
              </div>
              <div class="calc-legend-item">
                <span class="calc-legend-dot" style="background: #27ae60"></span>
                <span>Total Value</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    this.bindEvents();
    this.calculate();
  }

  bindEvents() {
    document.getElementById('ppf-yearly').addEventListener('input', (e) => {
      this.yearlyInvestment = parseFloat(e.target.value);
      document.getElementById('ppf-yearly-value').textContent = CalculatorUtils.formatIndianNumber(this.yearlyInvestment);
    });
    document.getElementById('ppf-rate').addEventListener('input', (e) => {
      this.interestRate = parseFloat(e.target.value);
      document.getElementById('ppf-rate-value').textContent = this.interestRate.toFixed(1);
    });
    document.getElementById('ppf-tenure').addEventListener('input', (e) => {
      this.tenure = parseInt(e.target.value);
      document.getElementById('ppf-tenure-value').textContent = this.tenure;
    });
    this.mount();
    CalculatorUtils.bindModern([
      { id: 'ppf-yearly', display: (n) => CalculatorUtils.formatIndianNumber(n), end: CalculatorUtils.moneyEnd },
      { id: 'ppf-rate', display: (n) => n.toFixed(1), end: (n) => n + '%' },
      { id: 'ppf-tenure', display: (n) => String(n), end: (n) => n + ' yr' },
    ], () => this.calculate(), () => this.chart);
  }

  mount() {
    CalculatorUtils.adoptModern(this.container, {
      hint: 'A deposit goes in once a year, and that year’s balance earns the rate you chose.',
      tiles: [
        { id: 'ppf-invested', label: 'You deposit' },
        { id: 'ppf-interest', label: 'Interest' },
      ],
      canvasId: 'ppf-chart',
      legend: ['You deposit', 'Interest'],
      compareTitle: 'Same deposit, different rates',
      leadId: 'ppf-compare-lead',
      listId: 'ppf-compare-list',
    });
  }

  calculate() {
    const P = this.yearlyInvestment;
    const r = this.interestRate / 100;
    const n = this.tenure;
    
    let maturity = 0;
    for (let i = 0; i < n; i++) {
      maturity = (maturity + P) * (1 + r);
    }
    const invested = P * n;
    const interest = maturity - invested;

    const rates = CalculatorUtils.ratesInRange(this.interestRate, 5, 10, [7, 7.1, 8]);
    const quote = (rate) => {
      let value = 0;
      const yearlyRate = rate / 100;
      for (let i = 0; i < n; i++) value = (value + P) * (1 + yearlyRate);
      return { interest: value - P * n, maturity: value };
    };
    this.chart = CalculatorUtils.paintGrowth(this.chart, {
      investedId: 'ppf-invested',
      gainId: 'ppf-interest',
      canvasId: 'ppf-chart',
      invested: invested,
      gained: interest,
      centerLabel: 'Maturity',
      listId: 'ppf-compare-list',
      leadId: 'ppf-compare-lead',
      lead: CalculatorUtils.formatCurrency(P) + ' each year for ' + n + ' years. Only the yearly rate changes.',
      rows: rates.map(rate => {
        const row = quote(rate);
        const yours = Math.abs(rate - this.interestRate) < 0.05;
        return {
          primary: rate + '%',
          tag: yours ? 'Your rate' : '',
          yours,
          figures: [
            { label: 'Interest', value: CalculatorUtils.formatCurrency(row.interest) },
            { label: 'Maturity', value: CalculatorUtils.formatCurrency(row.maturity) },
          ],
        };
      }),
    });
  }

  renderChart() {
    const years = this.tenure;
    const labels = [];
    const investedData = [];
    const totalData = [];

    const P = this.yearlyInvestment;
    const r = this.interestRate / 100;

    let runningTotal = 0;
    for (let year = 0; year <= years; year++) {
      labels.push(year === 0 ? 'Start' : `Y${year}`);
      investedData.push(P * year);
      if (year > 0) {
        runningTotal = (runningTotal + P) * (1 + r);
      }
      totalData.push(runningTotal);
    }

    const ctx = document.getElementById('ppf-chart').getContext('2d');
    if (this.chart) this.chart.destroy();

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Amount Invested',
            data: investedData,
            borderColor: '#3498db',
            backgroundColor: 'rgba(52, 152, 219, 0.1)',
            borderWidth: 1.5,
            fill: true,
            tension: 0.4,
            pointRadius: 2,
            pointBackgroundColor: '#3498db'
          },
          {
            label: 'Total Value',
            data: totalData,
            borderColor: '#27ae60',
            backgroundColor: 'rgba(39, 174, 96, 0.1)',
            borderWidth: 1.5,
            fill: true,
            tension: 0.4,
            pointRadius: 2,
            pointBackgroundColor: '#27ae60'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => `${context.dataset.label}: ${CalculatorUtils.formatCurrency(context.raw)}`
            }
          }
        },
        scales: {
          x: { grid: { display: false } },
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => CalculatorUtils.formatChartAxis(value)
            }
          }
        }
      }
    });
  }
}

registerCalculator('ppf', PPFCalculator);

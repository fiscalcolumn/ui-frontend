/**
 * Step-Up SIP Calculator
 * SIP where investment amount increases each year by a fixed percentage
 */
class StepUpSIPCalculator {
  constructor(container) {
    this.container = container;
    this.monthlyInvestment = 10000;
    this.stepUpPercent = 10;
    this.expectedReturn = 12;
    this.timePeriod = 15;
    this.chart = null;
  }

  render() {
    this.container.innerHTML = `
      <div class="calc-form">
        ${CalculatorUtils.createSlider('sus-monthly', 'Monthly SIP (Year 1)', 500, 200000, this.monthlyInvestment, 500, '', '₹')}
        ${CalculatorUtils.createSlider('sus-step', 'Annual Step-Up (%)', 1, 50, this.stepUpPercent, 1, '%', '')}
        ${CalculatorUtils.createSlider('sus-return', 'Expected Return (p.a.)', 1, 30, this.expectedReturn, 0.5, '%', '')}
        ${CalculatorUtils.createSlider('sus-years', 'Investment Period', 1, 40, this.timePeriod, 1, ' years', '')}

        <div style="text-align:center; margin-top:10px;">
          <button class="calc-btn" id="sus-calculate">
            <i class="fa fa-calculator"></i> Calculate
          </button>
        </div>

        <div class="calc-results" id="sus-results" style="display:none;">
          <h4 class="calc-results-title">Step-Up SIP Returns</h4>
          <div class="calc-results-grid">
            <div class="calc-result-box" style="border-color:#3498db">
              <div class="calc-result-label">Total Invested</div>
              <div class="calc-result-value" id="sus-invested" style="color:#3498db">₹0</div>
            </div>
            <div class="calc-result-box" style="border-color:#27ae60">
              <div class="calc-result-label">Wealth Gained</div>
              <div class="calc-result-value" id="sus-returns" style="color:#27ae60">₹0</div>
            </div>
            <div class="calc-result-box" style="border-color:#9b59b6">
              <div class="calc-result-label">Total Value</div>
              <div class="calc-result-value" id="sus-total" style="color:#9b59b6">₹0</div>
            </div>
          </div>
          <div class="calc-results-grid" style="margin-top:10px; grid-template-columns:1fr 1fr;">
            <div class="calc-result-box" style="border-color:#e74c3c">
              <div class="calc-result-label">SIP in Final Year</div>
              <div class="calc-result-value" id="sus-final-sip" style="color:#e74c3c; font-size:1.3rem">₹0</div>
            </div>
            <div class="calc-result-box" style="border-color:#f39c12">
              <div class="calc-result-label">vs Regular SIP Gain</div>
              <div class="calc-result-value" id="sus-vs-regular" style="color:#f39c12; font-size:1.3rem">₹0</div>
              <div class="calc-result-sublabel">extra vs same monthly SIP</div>
            </div>
          </div>

          <div class="calc-chart-container">
            <h5 class="calc-chart-title">Year-wise Growth</h5>
            <div class="calc-chart-wrapper"><canvas id="sus-chart"></canvas></div>
          </div>
        </div>
      </div>
    `;
    this.bindEvents();
    this.calculate();
  }

  bindEvents() {
    [['sus-monthly', 'monthlyInvestment'], ['sus-step', 'stepUpPercent'], ['sus-return', 'expectedReturn'], ['sus-years', 'timePeriod']].forEach(([id, field]) => {
      document.getElementById(id).addEventListener('input', e => {
        this[field] = parseFloat(e.target.value) || 0;
        document.getElementById(`${id}-value`).textContent = CalculatorUtils.formatIndianNumber(this[field]);
        CalculatorUtils.updateSliderProgress(e.target);
      });
      document.getElementById(id).addEventListener('change', () => this.calculate());
    });
    document.getElementById('sus-calculate').addEventListener('click', () => this.calculate());
    setTimeout(() => CalculatorUtils.initSliderProgress(), 50);
  }

  calculate() {
    const r = this.expectedReturn / 100 / 12;
    const stepUp = this.stepUpPercent / 100;
    const years = this.timePeriod;
    let totalInvested = 0;
    let futureValue = 0;
    let monthlyAmount = this.monthlyInvestment;
    const yearlyData = [];

    for (let y = 0; y < years; y++) {
      const months = 12;
      for (let m = 0; m < months; m++) {
        totalInvested += monthlyAmount;
        futureValue = (futureValue + monthlyAmount) * (1 + r);
      }
      yearlyData.push({ year: y + 1, invested: totalInvested, total: futureValue, sip: monthlyAmount });
      monthlyAmount = monthlyAmount * (1 + stepUp);
    }

    // Regular SIP comparison (same initial SIP, no step-up)
    const rr = r;
    const n = years * 12;
    const regularFV = CalculatorUtils.sipFutureValue(this.monthlyInvestment, rr, n);
    const extraGain = futureValue - regularFV;
    const finalSip = yearlyData.length ? yearlyData[yearlyData.length - 1].sip : monthlyAmount;

    document.getElementById('sus-results').style.display = 'block';
    document.getElementById('sus-invested').textContent = CalculatorUtils.formatCurrency(totalInvested);
    document.getElementById('sus-returns').textContent = CalculatorUtils.formatCurrency(futureValue - totalInvested);
    document.getElementById('sus-total').textContent = CalculatorUtils.formatCurrency(futureValue);
    document.getElementById('sus-final-sip').textContent = CalculatorUtils.formatCurrency(finalSip);
    document.getElementById('sus-vs-regular').textContent = '+' + CalculatorUtils.formatCurrency(Math.max(0, extraGain));

    this.renderChart(yearlyData);
  }

  renderChart(data) {
    const ctx = document.getElementById('sus-chart').getContext('2d');
    if (this.chart) this.chart.destroy();

    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.map(d => `Yr ${d.year}`),
        datasets: [
          {
            label: 'Invested',
            data: data.map(d => d.invested),
            backgroundColor: 'rgba(52,152,219,0.7)',
            borderRadius: 4,
          },
          {
            label: 'Total Value',
            data: data.map(d => d.total),
            backgroundColor: 'rgba(155,89,182,0.7)',
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: 'bottom' },
          tooltip: {
            callbacks: { label: c => `${c.dataset.label}: ${CalculatorUtils.formatCurrency(c.raw)}` },
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

registerCalculator('step-up-sip', StepUpSIPCalculator);

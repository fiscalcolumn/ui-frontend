/**
 * NPS Calculator with Growth Chart
 */

class NPSCalculator {
  constructor(container) {
    this.container = container;
    this.currentAge = 30;
    this.monthlyContribution = 10000;
    this.expectedReturn = 10;
    this.chart = null;
  }

  render() {
    this.container.innerHTML = `
      <div class="calc-form">
        ${CalculatorUtils.createSlider('nps-age', 'Current Age', 18, 55, this.currentAge, 1, ' years', '')}
        ${CalculatorUtils.createSlider('nps-monthly', 'Monthly Contribution', 500, 50000, this.monthlyContribution, 500, '', '₹')}
        ${CalculatorUtils.createSlider('nps-return', 'Expected Return (p.a.)', 8, 14, this.expectedReturn, 0.5, '%', '')}
        
        <div style="text-align: center; margin-top: 10px;">
          <button class="calc-btn" id="nps-calculate">
            <i class="fa fa-calculator"></i> Calculate Pension
          </button>
        </div>

        <div class="calc-results" id="nps-results" style="display: none;">
          <h4 class="calc-results-title">NPS Retirement Benefits</h4>
          <div class="calc-results-grid">
            <div class="calc-result-box" style="border-color: #3498db">
              <div class="calc-result-label">Total Corpus at 60</div>
              <div class="calc-result-value" id="nps-corpus" style="color: #3498db">₹0</div>
            </div>
            <div class="calc-result-box" style="border-color: #27ae60">
              <div class="calc-result-label">Lump Sum (60%)</div>
              <div class="calc-result-value" id="nps-lumpsum" style="color: #27ae60">₹0</div>
            </div>
            <div class="calc-result-box" style="border-color: #9b59b6">
              <div class="calc-result-label">Est. Monthly Pension</div>
              <div class="calc-result-value" id="nps-pension" style="color: #9b59b6">₹0</div>
            </div>
          </div>

          <div class="calc-chart-container">
            <h5 class="calc-chart-title">NPS Corpus Growth Until Retirement</h5>
            <div class="calc-chart-wrapper">
              <canvas id="nps-chart"></canvas>
            </div>
            <div class="calc-chart-legend">
              <div class="calc-legend-item">
                <span class="calc-legend-dot" style="background: #3498db"></span>
                <span>Your Contributions</span>
              </div>
              <div class="calc-legend-item">
                <span class="calc-legend-dot" style="background: #27ae60"></span>
                <span>Total Corpus</span>
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
    document.getElementById('nps-age').addEventListener('input', (e) => {
      this.currentAge = parseInt(e.target.value);
      document.getElementById('nps-age-value').textContent = this.currentAge;
    });
    document.getElementById('nps-monthly').addEventListener('input', (e) => {
      this.monthlyContribution = parseFloat(e.target.value);
      document.getElementById('nps-monthly-value').textContent = CalculatorUtils.formatIndianNumber(this.monthlyContribution);
    });
    document.getElementById('nps-return').addEventListener('input', (e) => {
      this.expectedReturn = parseFloat(e.target.value);
      document.getElementById('nps-return-value').textContent = this.expectedReturn.toFixed(1);
    });
    this.mount();
    CalculatorUtils.bindModern([
      { id: 'nps-age', display: (n) => String(n), end: (n) => n + ' yr' },
      { id: 'nps-monthly', display: (n) => CalculatorUtils.formatIndianNumber(n), end: CalculatorUtils.moneyEnd },
      { id: 'nps-return', display: (n) => n.toFixed(1), end: (n) => n + '%' },
    ], () => this.calculate(), () => this.chart);
  }

  mount() {
    CalculatorUtils.adoptModern(this.container, {
      hint: 'Contributions run until age 60. 60% can be taken out, and 40% buys an annuity at 6%.',
      tiles: [
        { id: 'nps-lumpsum', label: 'Lump sum, 60%' },
        { id: 'nps-pension', label: 'Pension a month' },
      ],
      canvasId: 'nps-chart',
      legend: ['You contribute', 'Estimated return'],
      compareTitle: 'Same contribution, different returns',
      leadId: 'nps-compare-lead',
      listId: 'nps-compare-list',
    });
  }

  calculate() {
    const yearsToRetirement = 60 - this.currentAge;
    const months = yearsToRetirement * 12;
    const monthlyRate = this.expectedReturn / 100 / 12;

    const corpus = CalculatorUtils.sipFutureValue(this.monthlyContribution, monthlyRate, months);
    const lumpSum = corpus * 0.6;
    const annuityCorpus = corpus * 0.4;
    const monthlyPension = (annuityCorpus * 0.06) / 12;

    const contributed = this.monthlyContribution * months;
    const rates = CalculatorUtils.ratesInRange(this.expectedReturn, 8, 14, [8, 10, 12]);
    const quote = (rate) => {
      const value = CalculatorUtils.sipFutureValue(this.monthlyContribution, rate / 100 / 12, months);
      return { lumpSum: value * 0.6, pension: (value * 0.4 * 0.06) / 12 };
    };
    document.getElementById('nps-lumpsum').textContent = CalculatorUtils.formatCurrency(lumpSum);
    document.getElementById('nps-pension').textContent = CalculatorUtils.formatCurrency(monthlyPension);
    this.chart = CalculatorUtils.modernDoughnut(
      this.chart, 'nps-chart',
      [Math.max(0, contributed), Math.max(0, corpus - contributed)],
      'Corpus',
      CalculatorUtils.formatCurrency(corpus)
    );
    CalculatorUtils.fillCompare(
      'nps-compare-list',
      'nps-compare-lead',
      CalculatorUtils.formatCurrency(this.monthlyContribution) + ' a month from age ' + this.currentAge + ' to 60. Only the yearly return changes.',
      rates.map(rate => {
        const row = quote(rate);
        const yours = Math.abs(rate - this.expectedReturn) < 0.05;
        return {
          primary: rate + '%',
          tag: yours ? 'Your rate' : '',
          yours,
          figures: [
            { label: 'Lump sum', value: CalculatorUtils.formatCurrency(row.lumpSum) },
            { label: 'Pension', value: CalculatorUtils.formatCurrency(row.pension) },
          ],
        };
      })
    );
  }

  renderChart() {
    const yearsToRetirement = 60 - this.currentAge;
    const labels = [];
    const contributionData = [];
    const corpusData = [];

    const P = this.monthlyContribution;
    const monthlyRate = this.expectedReturn / 100 / 12;

    for (let year = 0; year <= yearsToRetirement; year++) {
      labels.push(`Age ${this.currentAge + year}`);
      const months = year * 12;
      contributionData.push(P * months);
      corpusData.push(months === 0 ? 0 : CalculatorUtils.sipFutureValue(P, monthlyRate, months));
    }

    const ctx = document.getElementById('nps-chart').getContext('2d');
    if (this.chart) this.chart.destroy();

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Your Contributions',
            data: contributionData,
            borderColor: '#3498db',
            backgroundColor: 'rgba(52, 152, 219, 0.1)',
            borderWidth: 1.5,
            fill: true,
            tension: 0.4,
            pointRadius: 2,
            pointBackgroundColor: '#3498db'
          },
          {
            label: 'Total Corpus',
            data: corpusData,
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
          x: { 
            grid: { display: false },
            ticks: { maxTicksLimit: 10 }
          },
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

registerCalculator('nps', NPSCalculator);

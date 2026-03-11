/**
 * Retirement Calculator with Growth Chart
 */

class RetirementCalculator {
  constructor(container) {
    this.container = container;
    this.currentAge = 30;
    this.retirementAge = 60;
    this.monthlyExpenses = 50000;
    this.inflation = 6;
    this.expectedReturn = 12;
    this.chart = null;
  }

  render() {
    this.container.innerHTML = `
      <div class="calc-form">
        ${CalculatorUtils.createSlider('ret-age', 'Current Age', 20, 55, this.currentAge, 1, ' years', '')}
        ${CalculatorUtils.createSlider('ret-retire', 'Retirement Age', 45, 70, this.retirementAge, 1, ' years', '')}
        ${CalculatorUtils.createSlider('ret-expenses', 'Current Monthly Expenses', 10000, 500000, this.monthlyExpenses, 5000, '', '₹')}
        ${CalculatorUtils.createSlider('ret-inflation', 'Expected Inflation', 3, 10, this.inflation, 0.5, '%', '')}
        ${CalculatorUtils.createSlider('ret-return', 'Expected Return (Pre-Retirement)', 6, 18, this.expectedReturn, 0.5, '%', '')}
        
        <div style="text-align: center; margin-top: 10px;">
          <button class="calc-btn" id="ret-calculate">
            <i class="fa fa-calculator"></i> Plan My Retirement
          </button>
        </div>

        <div class="calc-results" id="ret-results" style="display: none;">
          <h4 class="calc-results-title">Retirement Planning Summary</h4>
          <div class="calc-results-grid">
            <div class="calc-result-box" style="border-color: #e74c3c">
              <div class="calc-result-label">Monthly Expenses at Retirement</div>
              <div class="calc-result-value" id="ret-future-exp" style="color: #e74c3c">₹0</div>
            </div>
            <div class="calc-result-box" style="border-color: #9b59b6">
              <div class="calc-result-label">Corpus Required</div>
              <div class="calc-result-value" id="ret-corpus" style="color: #9b59b6">₹0</div>
            </div>
            <div class="calc-result-box" style="border-color: #27ae60">
              <div class="calc-result-label">Monthly SIP Needed</div>
              <div class="calc-result-value" id="ret-sip" style="color: #27ae60">₹0</div>
            </div>
          </div>

          <div class="calc-chart-container">
            <h5 class="calc-chart-title">Wealth Accumulation Journey</h5>
            <div class="calc-chart-wrapper">
              <canvas id="ret-chart"></canvas>
            </div>
            <div class="calc-chart-legend">
              <div class="calc-legend-item">
                <span class="calc-legend-dot" style="background: #3498db"></span>
                <span>Your Investments</span>
              </div>
              <div class="calc-legend-item">
                <span class="calc-legend-dot" style="background: #27ae60"></span>
                <span>Corpus Growth</span>
              </div>
              <div class="calc-legend-item">
                <span class="calc-legend-dot" style="background: #9b59b6; border: 2px dashed #9b59b6; background: transparent;"></span>
                <span>Target Corpus</span>
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
    const sliders = ['ret-age', 'ret-retire', 'ret-expenses', 'ret-inflation', 'ret-return'];
    sliders.forEach(id => {
      document.getElementById(id).addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        const valueEl = document.getElementById(`${id}-value`);
        if (id === 'ret-expenses') {
          valueEl.textContent = CalculatorUtils.formatIndianNumber(val);
        } else if (id.includes('inflation') || id.includes('return')) {
          valueEl.textContent = val.toFixed(1);
        } else {
          valueEl.textContent = val;
        }
      });
      document.getElementById(id).addEventListener('change', () => this.calculate());
    });
    document.getElementById('ret-calculate').addEventListener('click', () => this.calculate());
  }

  calculate() {
    this.currentAge = parseInt(document.getElementById('ret-age').value);
    this.retirementAge = parseInt(document.getElementById('ret-retire').value);
    this.monthlyExpenses = parseFloat(document.getElementById('ret-expenses').value);
    this.inflation = parseFloat(document.getElementById('ret-inflation').value) / 100;
    this.expectedReturn = parseFloat(document.getElementById('ret-return').value) / 100;

    // Validate: retirement age must be greater than current age
    if (this.retirementAge <= this.currentAge) {
      document.getElementById('ret-results').style.display = 'block';
      document.getElementById('ret-future-exp').textContent = '—';
      document.getElementById('ret-corpus').textContent = '—';
      document.getElementById('ret-sip').textContent = '—';
      return;
    }

    const yearsToRetirement = this.retirementAge - this.currentAge;
    const yearsInRetirement = 25; // Assume 25 years post-retirement
    
    // Calculate future monthly expenses adjusted for inflation
    const futureMonthlyExpenses = this.monthlyExpenses * Math.pow(1 + this.inflation, yearsToRetirement);
    const annualExpenses = futureMonthlyExpenses * 12;

    // Post-retirement: assume conservative 7% returns
    const postRetirementReturn = 0.07;
    // Real return = (1 + nominal) / (1 + inflation) - 1
    const realReturn = (1 + postRetirementReturn) / (1 + this.inflation) - 1;
    
    // Calculate corpus needed using present value of annuity formula
    // Corpus = Annual Expense × [(1 - (1 + r)^-n) / r]
    let corpus;
    if (realReturn <= 0.001) {
      // If real return is very low or negative, use simple multiplication
      corpus = annualExpenses * yearsInRetirement;
    } else {
      corpus = annualExpenses * ((1 - Math.pow(1 + realReturn, -yearsInRetirement)) / realReturn);
    }

    // Calculate monthly SIP needed to reach corpus
    const preReturnMonthly = this.expectedReturn / 12;
    const months = yearsToRetirement * 12;
    
    let sipNeeded;
    if (preReturnMonthly <= 0 || months <= 0) {
      sipNeeded = corpus / Math.max(months, 1);
    } else {
      // SIP Future Value formula inverted: P = FV / [((1+r)^n - 1) / r × (1+r)]
      const fvFactor = ((Math.pow(1 + preReturnMonthly, months) - 1) / preReturnMonthly) * (1 + preReturnMonthly);
      sipNeeded = corpus / fvFactor;
    }

    // Ensure no negative values
    this.targetCorpus = Math.max(0, corpus);
    this.sipNeeded = Math.max(0, sipNeeded);

    document.getElementById('ret-results').style.display = 'block';
    document.getElementById('ret-future-exp').textContent = CalculatorUtils.formatCurrency(futureMonthlyExpenses);
    document.getElementById('ret-corpus').textContent = CalculatorUtils.formatCurrency(this.targetCorpus);
    document.getElementById('ret-sip').textContent = CalculatorUtils.formatCurrency(this.sipNeeded);

    this.renderChart();
  }

  renderChart() {
    const yearsToRetirement = this.retirementAge - this.currentAge;
    const labels = [];
    const investedData = [];
    const corpusData = [];
    const targetLine = [];

    const monthlyRate = this.expectedReturn / 12;

    for (let year = 0; year <= yearsToRetirement; year++) {
      labels.push(`Age ${this.currentAge + year}`);
      const months = year * 12;
      investedData.push(this.sipNeeded * months);
      corpusData.push(months === 0 ? 0 : CalculatorUtils.sipFutureValue(this.sipNeeded, monthlyRate, months));
      targetLine.push(this.targetCorpus);
    }

    const ctx = document.getElementById('ret-chart').getContext('2d');
    if (this.chart) this.chart.destroy();

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Your Investments',
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
            label: 'Corpus Growth',
            data: corpusData,
            borderColor: '#27ae60',
            backgroundColor: 'rgba(39, 174, 96, 0.1)',
            borderWidth: 1.5,
            fill: true,
            tension: 0.4,
            pointRadius: 2,
            pointBackgroundColor: '#27ae60'
          },
          {
            label: 'Target Corpus',
            data: targetLine,
            borderColor: '#9b59b6',
            borderWidth: 1,
            borderDash: [5, 5],
            fill: false,
            pointRadius: 0
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

registerCalculator('retirement', RetirementCalculator);

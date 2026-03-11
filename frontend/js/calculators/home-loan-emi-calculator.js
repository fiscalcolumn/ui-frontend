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
      <div class="calc-form">
        ${CalculatorUtils.createSlider('hl-property', 'Property Value', 1000000, 50000000, this.propertyValue, 100000, '', '₹')}
        ${CalculatorUtils.createSlider('hl-down', 'Down Payment', 100000, 10000000, this.downPayment, 100000, '', '₹')}
        ${CalculatorUtils.createSlider('hl-rate', 'Interest Rate', 6, 14, this.interestRate, 0.1, '%', '')}
        ${CalculatorUtils.createSlider('hl-tenure', 'Loan Tenure', 60, 360, this.tenure, 12, ' months', '')}
        
        <div style="text-align: center; margin-top: 10px;">
          <button class="calc-btn" id="hl-calculate">
            <i class="fa fa-home"></i> Calculate Home Loan EMI
          </button>
        </div>

        <div class="calc-results" id="hl-results" style="display: none;">
          <h4 class="calc-results-title">Home Loan Summary</h4>
          
          <div class="loan-summary-box">
            <div class="loan-amount-display">
              <span class="loan-label">Loan Amount</span>
              <span class="loan-value" id="hl-loan-amount">₹40,00,000</span>
            </div>
          </div>

          <div class="calc-results-grid">
            <div class="calc-result-box" style="border-color: #009688">
              <div class="calc-result-label">Monthly EMI</div>
              <div class="calc-result-value" id="hl-emi" style="color: #009688">₹0</div>
            </div>
            <div class="calc-result-box" style="border-color: #FF5722">
              <div class="calc-result-label">Total Interest</div>
              <div class="calc-result-value" id="hl-interest" style="color: #FF5722">₹0</div>
            </div>
            <div class="calc-result-box" style="border-color: #3F51B5">
              <div class="calc-result-label">Total Payment</div>
              <div class="calc-result-value" id="hl-total" style="color: #3F51B5">₹0</div>
            </div>
          </div>

          <div class="calc-chart-container">
            <h5 class="calc-chart-title">Year-wise Principal & Interest</h5>
            <div class="calc-chart-wrapper">
              <canvas id="hl-chart"></canvas>
            </div>
            <div class="calc-chart-legend">
              <div class="calc-legend-item">
                <span class="calc-legend-dot" style="background: #009688"></span>
                <span>Principal Paid</span>
              </div>
              <div class="calc-legend-item">
                <span class="calc-legend-dot" style="background: #FF5722"></span>
                <span>Interest Paid</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>
        .loan-summary-box {
          background: linear-gradient(135deg, #e0f2f1, #b2dfdb);
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 20px;
          text-align: center;
        }
        .loan-amount-display {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        .loan-label {
          font-size: 0.9rem;
          color: #00695c;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .loan-value {
          font-size: 2rem;
          font-weight: 700;
          color: #009688;
        }
        .dark-mode .loan-summary-box {
          background: linear-gradient(135deg, rgba(0, 150, 136, 0.15), rgba(0, 150, 136, 0.25));
        }
        .dark-mode .loan-label {
          color: #80cbc4;
        }
        .dark-mode .loan-value {
          color: #4db6ac;
        }
      </style>
    `;
    this.bindEvents();
    this.calculate();
  }

  bindEvents() {
    const sliders = ['hl-property', 'hl-down', 'hl-rate', 'hl-tenure'];
    sliders.forEach(id => {
      document.getElementById(id).addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        const valueEl = document.getElementById(`${id}-value`);
        if (id === 'hl-property' || id === 'hl-down') {
          valueEl.textContent = CalculatorUtils.formatIndianNumber(val);
        } else if (id === 'hl-rate') {
          valueEl.textContent = val.toFixed(1);
        } else {
          valueEl.textContent = val;
        }
      });
      document.getElementById(id).addEventListener('change', () => this.calculate());
    });
    document.getElementById('hl-calculate').addEventListener('click', () => this.calculate());
  }

  calculate() {
    this.propertyValue = parseFloat(document.getElementById('hl-property').value);
    this.downPayment = parseFloat(document.getElementById('hl-down').value);
    this.interestRate = parseFloat(document.getElementById('hl-rate').value);
    this.tenure = parseInt(document.getElementById('hl-tenure').value);

    const loanAmount = this.propertyValue - this.downPayment;
    const monthlyRate = this.interestRate / 12 / 100;
    const emi = loanAmount * monthlyRate * Math.pow(1 + monthlyRate, this.tenure) / 
                (Math.pow(1 + monthlyRate, this.tenure) - 1);
    
    const totalPayment = emi * this.tenure;
    const totalInterest = totalPayment - loanAmount;

    document.getElementById('hl-results').style.display = 'block';
    document.getElementById('hl-loan-amount').textContent = CalculatorUtils.formatCurrency(loanAmount);
    document.getElementById('hl-emi').textContent = CalculatorUtils.formatCurrency(emi);
    document.getElementById('hl-interest').textContent = CalculatorUtils.formatCurrency(totalInterest);
    document.getElementById('hl-total').textContent = CalculatorUtils.formatCurrency(totalPayment);

    this.renderChart(loanAmount, monthlyRate, emi);
  }

  renderChart(loanAmount, monthlyRate, emi) {
    const years = Math.ceil(this.tenure / 12);
    const labels = [];
    const principalData = [];
    const interestData = [];
    
    let balance = loanAmount;
    let yearPrincipal = 0;
    let yearInterest = 0;
    
    for (let month = 1; month <= this.tenure; month++) {
      const interestPayment = balance * monthlyRate;
      const principalPayment = emi - interestPayment;
      balance -= principalPayment;
      
      yearPrincipal += principalPayment;
      yearInterest += interestPayment;
      
      if (month % 12 === 0 || month === this.tenure) {
        labels.push(`Year ${Math.ceil(month / 12)}`);
        principalData.push(yearPrincipal);
        interestData.push(yearInterest);
        yearPrincipal = 0;
        yearInterest = 0;
      }
    }

    const ctx = document.getElementById('hl-chart').getContext('2d');
    if (this.chart) this.chart.destroy();

    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Principal',
            data: principalData,
            backgroundColor: '#009688',
            borderRadius: 4
          },
          {
            label: 'Interest',
            data: interestData,
            backgroundColor: '#FF5722',
            borderRadius: 4
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
            stacked: true,
            grid: { display: false }
          },
          y: { 
            stacked: true,
            ticks: {
              callback: (value) => CalculatorUtils.formatChartAxis(value)
            }
          }
        }
      }
    });
  }
}

registerCalculator('home-loan-emi', HomeLoanEMICalculator);


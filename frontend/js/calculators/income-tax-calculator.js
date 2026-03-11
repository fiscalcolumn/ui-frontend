/**
 * Income Tax Calculator with Comparison Chart
 */

class IncomeTaxCalculator {
  constructor(container) {
    this.container = container;
    this.income = 1500000;
    this.deductions80C = 150000;
    this.deductions80D = 25000;
    this.otherDeductions = 50000;
    this.chart = null;
  }

  render() {
    this.container.innerHTML = `
      <div class="calc-form">
        ${CalculatorUtils.createSlider('tax-income', 'Annual Gross Income', 300000, 10000000, this.income, 50000, '', '₹')}
        ${CalculatorUtils.createSlider('tax-80c', 'Section 80C Deductions', 0, 150000, this.deductions80C, 10000, '', '₹')}
        ${CalculatorUtils.createSlider('tax-80d', 'Section 80D (Health Insurance)', 0, 100000, this.deductions80D, 5000, '', '₹')}
        ${CalculatorUtils.createSlider('tax-other', 'Other Deductions (HRA, LTA, etc.)', 0, 500000, this.otherDeductions, 10000, '', '₹')}
        
        <div style="text-align: center; margin-top: 10px;">
          <button class="calc-btn" id="tax-calculate">
            <i class="fa fa-calculator"></i> Compare Tax Regimes
          </button>
        </div>

        <div class="calc-results" id="tax-results" style="display: none;">
          <h4 class="calc-results-title">Tax Comparison - Old vs New Regime</h4>
          <div class="calc-results-grid" style="grid-template-columns: repeat(2, 1fr);">
            <div class="calc-result-box" style="border-color: #e74c3c">
              <div class="calc-result-label">Old Regime Tax</div>
              <div class="calc-result-value" id="tax-old" style="color: #e74c3c">₹0</div>
              <div class="calc-result-sublabel" id="tax-old-taxable">Taxable: ₹0</div>
            </div>
            <div class="calc-result-box" style="border-color: #27ae60">
              <div class="calc-result-label">New Regime Tax</div>
              <div class="calc-result-value" id="tax-new" style="color: #27ae60">₹0</div>
              <div class="calc-result-sublabel" id="tax-new-taxable">Taxable: ₹0</div>
            </div>
          </div>
          
          <div class="tax-recommendation" id="tax-recommendation"></div>

          <div class="calc-chart-container">
            <h5 class="calc-chart-title">Tax Breakdown Comparison</h5>
            <div class="calc-chart-wrapper" style="height: 250px;">
              <canvas id="tax-chart"></canvas>
            </div>
          </div>
        </div>
      </div>
      <style>
        .tax-recommendation {
          margin-top: 20px;
          padding: 18px 25px;
          background: linear-gradient(135deg, #e8f7fc, #d4f1f9);
          border-radius: 10px;
          text-align: center;
          font-weight: 600;
          font-size: 1.1rem;
          color: #0a7d9c;
        }
      </style>
    `;
    this.bindEvents();
    this.calculate();
  }

  bindEvents() {
    ['tax-income', 'tax-80c', 'tax-80d', 'tax-other'].forEach(id => {
      document.getElementById(id).addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        document.getElementById(`${id}-value`).textContent = CalculatorUtils.formatIndianNumber(value);
      });
      document.getElementById(id).addEventListener('change', () => this.calculate());
    });
    document.getElementById('tax-calculate').addEventListener('click', () => this.calculate());
  }

  calculateOldRegimeTax(taxableIncome) {
    let tax = 0;
    if (taxableIncome <= 250000) return 0;
    if (taxableIncome <= 500000) return (taxableIncome - 250000) * 0.05;
    tax = 12500; // Tax on 2.5L to 5L
    if (taxableIncome <= 1000000) return tax + (taxableIncome - 500000) * 0.20;
    tax += 100000; // Tax on 5L to 10L
    return tax + (taxableIncome - 1000000) * 0.30;
  }

  calculateNewRegimeTax(income) {
    const taxableIncome = Math.max(0, income - 75000); // Standard deduction
    let tax = 0;
    
    if (taxableIncome <= 300000) return 0;
    if (taxableIncome <= 700000) return (taxableIncome - 300000) * 0.05;
    tax = 20000;
    if (taxableIncome <= 1000000) return tax + (taxableIncome - 700000) * 0.10;
    tax += 30000;
    if (taxableIncome <= 1200000) return tax + (taxableIncome - 1000000) * 0.15;
    tax += 30000;
    if (taxableIncome <= 1500000) return tax + (taxableIncome - 1200000) * 0.20;
    tax += 60000;
    return tax + (taxableIncome - 1500000) * 0.30;
  }

  calculate() {
    this.income = parseFloat(document.getElementById('tax-income').value);
    this.deductions80C = parseFloat(document.getElementById('tax-80c').value);
    this.deductions80D = parseFloat(document.getElementById('tax-80d').value);
    this.otherDeductions = parseFloat(document.getElementById('tax-other').value);

    const totalDeductions = this.deductions80C + this.deductions80D + this.otherDeductions + 50000;
    const oldTaxableIncome = Math.max(0, this.income - totalDeductions);
    const newTaxableIncome = Math.max(0, this.income - 75000);

    const oldTax = this.calculateOldRegimeTax(oldTaxableIncome);
    const newTax = this.calculateNewRegimeTax(this.income);

    // Add 4% cess
    const oldTaxWithCess = oldTax * 1.04;
    const newTaxWithCess = newTax * 1.04;

    document.getElementById('tax-results').style.display = 'block';
    document.getElementById('tax-old').textContent = CalculatorUtils.formatCurrency(oldTaxWithCess);
    document.getElementById('tax-new').textContent = CalculatorUtils.formatCurrency(newTaxWithCess);
    document.getElementById('tax-old-taxable').textContent = `Taxable: ${CalculatorUtils.formatCurrency(oldTaxableIncome)}`;
    document.getElementById('tax-new-taxable').textContent = `Taxable: ${CalculatorUtils.formatCurrency(newTaxableIncome)}`;

    const savings = Math.abs(oldTaxWithCess - newTaxWithCess);
    const recommendation = oldTaxWithCess < newTaxWithCess 
      ? `💡 Old Regime saves you ${CalculatorUtils.formatCurrency(savings)} per year`
      : `💡 New Regime saves you ${CalculatorUtils.formatCurrency(savings)} per year`;
    document.getElementById('tax-recommendation').textContent = recommendation;

    this.renderChart(oldTaxWithCess, newTaxWithCess, oldTaxableIncome, newTaxableIncome);
  }

  renderChart(oldTax, newTax, oldTaxable, newTaxable) {
    const ctx = document.getElementById('tax-chart').getContext('2d');
    if (this.chart) this.chart.destroy();

    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Old Regime', 'New Regime'],
        datasets: [
          {
            label: 'Tax Payable',
            data: [oldTax, newTax],
            backgroundColor: ['rgba(231, 76, 60, 0.8)', 'rgba(39, 174, 96, 0.8)'],
            borderColor: ['#e74c3c', '#27ae60'],
            borderWidth: 1,
            borderRadius: 8
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
              label: (context) => `Tax: ${CalculatorUtils.formatCurrency(context.raw)}`
            }
          }
        },
        scales: {
          x: { grid: { display: false } },
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => {
                if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
                return `₹${(value / 1000).toFixed(0)}K`;
              }
            }
          }
        }
      }
    });
  }
}

registerCalculator('income-tax', IncomeTaxCalculator);

/**
 * Gratuity Calculator
 */

class GratuityCalculator {
  constructor(container) {
    this.container = container;
    this.basicSalary = 75000;
    this.yearsOfService = 15;
  }

  render() {
    this.container.innerHTML = `
      <div class="calc-form">
        ${CalculatorUtils.createSlider('gratuity-salary', 'Last Drawn Basic Salary + DA', 10000, 500000, this.basicSalary, 5000, '', '₹')}
        ${CalculatorUtils.createSlider('gratuity-years', 'Years of Service', 5, 40, this.yearsOfService, 1, ' years', '')}
        
        <div style="text-align: center; margin-top: 10px;">
          <button class="calc-btn" id="gratuity-calculate">
            <i class="fa fa-calculator"></i> Calculate Gratuity
          </button>
        </div>

        <div class="calc-results" id="gratuity-results" style="display: none;">
          <h4 class="calc-results-title">Gratuity Calculation</h4>
          <div class="calc-results-grid" style="grid-template-columns: repeat(2, 1fr);">
            <div class="calc-result-box result-highlight" style="border-color: #27ae60">
              <div class="calc-result-label">Gratuity Amount</div>
              <div class="calc-result-value" id="gratuity-amount" style="color: #27ae60; font-size: 2rem;">₹0</div>
            </div>
            <div class="calc-result-box" style="border-color: #3498db">
              <div class="calc-result-label">Tax-Free Limit</div>
              <div class="calc-result-value" style="color: #3498db">₹20,00,000</div>
              <div class="calc-result-sublabel">Under current rules</div>
            </div>
          </div>

          <div class="gratuity-formula">
            <h5>Formula Used</h5>
            <p>Gratuity = (Last Salary × 15 × Years of Service) ÷ 26</p>
            <p class="formula-note">
              <strong>Your calculation:</strong> 
              (<span id="formula-salary">₹0</span> × 15 × <span id="formula-years">0</span>) ÷ 26 = <span id="formula-result">₹0</span>
            </p>
          </div>
        </div>
      </div>
      <style>
        .gratuity-formula {
          margin-top: 25px;
          padding: 20px;
          background: #f8f9fa;
          border-radius: 10px;
          text-align: center;
        }
        .gratuity-formula h5 {
          margin: 0 0 10px;
          font-size: 1rem;
          color: #1a1a2e;
        }
        .gratuity-formula p {
          margin: 0;
          font-size: 1.1rem;
          color: #555;
          font-family: monospace;
        }
        .formula-note {
          margin-top: 15px !important;
          padding-top: 15px;
          border-top: 1px dashed #ddd;
          font-size: 0.95rem !important;
        }
        .result-highlight {
          background: linear-gradient(135deg, #f0fff4, #e6ffed);
        }
      </style>
    `;
    this.bindEvents();
    this.calculate();
  }

  mount() {
    CalculatorUtils.adoptModern(this.container, {
      hint: 'Gratuity is last basic pay plus DA, times 15, times the years of service, divided by 26.',
      tiles: [
        { id: 'gratuity-amount', label: 'Gratuity' },
        { id: 'formula-result', label: 'Per year of service' },
      ],
      canvasId: 'gratuity-chart',
      legend: ['Gratuity', 'Monthly pay'],
      compareTitle: 'Same salary, different years of service',
      leadId: 'gratuity-compare-lead',
      listId: 'gratuity-compare-list',
    });
  }

  bindEvents() {
    document.getElementById('gratuity-salary').addEventListener('input', (e) => {
      this.basicSalary = parseFloat(e.target.value);
      document.getElementById('gratuity-salary-value').textContent = CalculatorUtils.formatIndianNumber(this.basicSalary);
    });
    document.getElementById('gratuity-years').addEventListener('input', (e) => {
      this.yearsOfService = parseInt(e.target.value);
      document.getElementById('gratuity-years-value').textContent = this.yearsOfService;
    });
    this.mount();
    CalculatorUtils.bindModern([
      { id: 'gratuity-salary', display: (n) => CalculatorUtils.formatIndianNumber(n), end: CalculatorUtils.moneyEnd },
      { id: 'gratuity-years', display: (n) => String(n), end: (n) => n + ' yr' },
    ], () => this.calculate(), () => this.chart);
    ['gratuity-salary', 'gratuity-years'].forEach(id => {
      document.getElementById(id).addEventListener('change', () => this.calculate());
    });
  }

  calculate() {
    // Gratuity = (Last Drawn Salary × 15 × Years of Service) / 26
    this.basicSalary = parseFloat(document.getElementById('gratuity-salary').value) || 0;
    this.yearsOfService = parseInt(document.getElementById('gratuity-years').value, 10) || 0;
    const gratuity = (this.basicSalary * 15 * this.yearsOfService) / 26;
    const perYear = this.yearsOfService > 0 ? gratuity / this.yearsOfService : 0;
    const years = [10, 15, 20, 25];
    if (!years.includes(this.yearsOfService)) years.push(this.yearsOfService);
    years.sort((a, b) => a - b);
    document.getElementById('gratuity-amount').textContent = CalculatorUtils.formatCurrency(gratuity);
    document.getElementById('formula-result').textContent = CalculatorUtils.formatCurrency(perYear);
    this.chart = CalculatorUtils.modernDoughnut(
      this.chart, 'gratuity-chart',
      [gratuity, this.basicSalary],
      'Gratuity',
      CalculatorUtils.formatCurrency(gratuity)
    );
    CalculatorUtils.fillCompare(
      'gratuity-compare-list',
      'gratuity-compare-lead',
      CalculatorUtils.formatCurrency(this.basicSalary) + ' last drawn. Only the years of service change.',
      years.map(year => {
        const amount = (this.basicSalary * 15 * year) / 26;
        const yours = year === this.yearsOfService;
        return {
          primary: year + ' yr',
          tag: yours ? 'Your service' : '',
          yours,
          figures: [
            { label: 'Gratuity', value: CalculatorUtils.formatCurrency(amount) },
            { label: 'A year', value: CalculatorUtils.formatCurrency(amount / year) },
          ],
        };
      })
    );
    return;
    document.getElementById('formula-salary').textContent = CalculatorUtils.formatCurrency(this.basicSalary);
    document.getElementById('formula-years').textContent = this.yearsOfService;
    document.getElementById('formula-result').textContent = CalculatorUtils.formatCurrency(gratuity);
  }
}

registerCalculator('gratuity', GratuityCalculator);

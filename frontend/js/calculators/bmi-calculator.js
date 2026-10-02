/**
 * BMI Calculator with Visual Gauge
 */

class BMICalculator {
  constructor(container) {
    this.container = container;
    this.weight = 70;
    this.height = 170;
  }

  render() {
    this.container.innerHTML = `
      <div class="calc-form">
        ${CalculatorUtils.createSlider('bmi-weight', 'Your Weight', 30, 200, this.weight, 1, ' kg', '')}
        ${CalculatorUtils.createSlider('bmi-height', 'Your Height', 100, 220, this.height, 1, ' cm', '')}
        
        <div style="text-align: center; margin-top: 10px;">
          <button class="calc-btn" id="bmi-calculate">
            <i class="fa fa-calculator"></i> Calculate BMI
          </button>
        </div>

        <div class="calc-results" id="bmi-results" style="display: none;">
          <div class="bmi-display">
            <div class="bmi-score" id="bmi-score">0</div>
            <div class="bmi-category" id="bmi-category">Normal</div>
          </div>
          
          <div class="bmi-gauge">
            <div class="bmi-gauge-track">
              <div class="bmi-gauge-section underweight"></div>
              <div class="bmi-gauge-section normal"></div>
              <div class="bmi-gauge-section overweight"></div>
              <div class="bmi-gauge-section obese"></div>
            </div>
            <div class="bmi-gauge-marker" id="bmi-marker"></div>
            <div class="bmi-gauge-labels">
              <span>Underweight<br>&lt;18.5</span>
              <span>Normal<br>18.5-24.9</span>
              <span>Overweight<br>25-29.9</span>
              <span>Obese<br>&gt;30</span>
            </div>
          </div>

          <div class="bmi-info">
            <h5>Healthy Weight Range for Your Height</h5>
            <p id="bmi-healthy-range"></p>
          </div>
        </div>
      </div>
      <style>
        .bmi-display {
          text-align: center;
          padding: 30px;
          background: #f8f9fa;
          border-radius: 12px;
          margin-bottom: 25px;
        }
        .bmi-score {
          font-size: 4rem;
          font-weight: 700;
          line-height: 1;
          margin-bottom: 10px;
        }
        .bmi-category {
          font-size: 1.3rem;
          font-weight: 600;
        }
        .bmi-gauge {
          position: relative;
          padding: 20px 0 50px;
        }
        .bmi-gauge-track {
          display: flex;
          height: 20px;
          border-radius: 10px;
          overflow: hidden;
        }
        .bmi-gauge-section {
          flex: 1;
        }
        .bmi-gauge-section.underweight { background: #3498db; }
        .bmi-gauge-section.normal { background: #27ae60; }
        .bmi-gauge-section.overweight { background: #f39c12; }
        .bmi-gauge-section.obese { background: #e74c3c; }
        .bmi-gauge-marker {
          position: absolute;
          top: 10px;
          width: 4px;
          height: 40px;
          background: #1a1a2e;
          border-radius: 2px;
          transform: translateX(-50%);
          transition: left 0.5s ease;
        }
        .bmi-gauge-marker::before {
          content: '';
          position: absolute;
          top: -8px;
          left: 50%;
          transform: translateX(-50%);
          border: 8px solid transparent;
          border-bottom-color: #1a1a2e;
        }
        .bmi-gauge-labels {
          display: flex;
          justify-content: space-around;
          margin-top: 10px;
          font-size: 0.75rem;
          color: #666;
          text-align: center;
        }
        .bmi-info {
          margin-top: 20px;
          padding: 20px;
          background: #e8f7fc;
          border-radius: 10px;
          text-align: center;
        }
        .bmi-info h5 {
          margin: 0 0 10px;
          font-size: 1rem;
          color: #0a7d9c;
        }
        .bmi-info p {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 600;
          color: #14bdee;
        }
      </style>
    `;
    this.bindEvents();
    this.calculate();
  }

  mount() {
    CalculatorUtils.adoptModern(this.container, {
      hint: 'BMI is your weight divided by your height in metres, squared.',
      tiles: [
        { id: 'bmi-score', label: 'BMI' },
        { id: 'bmi-category', label: 'Category' },
      ],
      canvasId: 'bmi-chart',
      legend: ['Your weight', 'Outside the healthy band'],
      compareTitle: 'Weight bands for this height',
      leadId: 'bmi-compare-lead',
      listId: 'bmi-compare-list',
    });
  }

  bindEvents() {
    document.getElementById('bmi-weight').addEventListener('input', (e) => {
      this.weight = parseFloat(e.target.value);
      document.getElementById('bmi-weight-value').textContent = this.weight;
    });
    document.getElementById('bmi-height').addEventListener('input', (e) => {
      this.height = parseFloat(e.target.value);
      document.getElementById('bmi-height-value').textContent = this.height;
    });
    this.mount();
    CalculatorUtils.bindModern([
      { id: 'bmi-weight', display: (n) => String(n), end: (n) => n + ' kg' },
      { id: 'bmi-height', display: (n) => String(n), end: (n) => n + ' cm' },
    ], () => this.calculate(), () => this.chart);
    ['bmi-weight', 'bmi-height'].forEach(id => {
      document.getElementById(id).addEventListener('change', () => this.calculate());
    });
  }

  calculate() {
    this.weight = parseFloat(document.getElementById('bmi-weight').value) || 0;
    this.height = parseFloat(document.getElementById('bmi-height').value) || 0;
    const bmi = CalculatorUtils.calculateBMI(this.weight, this.height);
    const category = CalculatorUtils.getBMICategory(bmi);
    const heightM = this.height / 100;
    const minWeight = 18.5 * heightM * heightM;
    const maxWeight = 24.9 * heightM * heightM;
    const above = Math.max(0, this.weight - maxWeight);
    const below = Math.max(0, minWeight - this.weight);
    const slices = above > 0 ? [maxWeight, above] : below > 0 ? [this.weight, below] : [this.weight, 0];
    document.getElementById('bmi-score').textContent = bmi.toFixed(1);
    document.getElementById('bmi-category').textContent = category.category;
    this.chart = CalculatorUtils.modernDoughnut(this.chart, 'bmi-chart', slices, 'BMI', bmi.toFixed(1), false);
    const kg = (score) => (score * heightM * heightM).toFixed(1) + ' kg';
    const bands = [
      { name: 'Underweight', from: kg(15), to: kg(18.5) },
      { name: 'Normal', from: kg(18.5), to: kg(24.9) },
      { name: 'Overweight', from: kg(25), to: kg(29.9) },
      { name: 'Obese', from: kg(30), to: 'and above' },
    ];
    CalculatorUtils.fillCompare(
      'bmi-compare-list',
      'bmi-compare-lead',
      'A healthy BMI is 18.5 to 24.9, about ' + minWeight.toFixed(1) + ' to ' + maxWeight.toFixed(1) + ' kg at this height.',
      bands.map(band => ({
        primary: band.name,
        tag: band.name === category.category ? 'You' : '',
        yours: band.name === category.category,
        figures: [
          { label: 'From', value: band.from },
          { label: 'To', value: band.to },
        ],
      }))
    );
    return;
  }
}

registerCalculator('bmi', BMICalculator);

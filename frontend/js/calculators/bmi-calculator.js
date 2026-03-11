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

  bindEvents() {
    document.getElementById('bmi-weight').addEventListener('input', (e) => {
      this.weight = parseFloat(e.target.value);
      document.getElementById('bmi-weight-value').textContent = this.weight;
    });
    document.getElementById('bmi-height').addEventListener('input', (e) => {
      this.height = parseFloat(e.target.value);
      document.getElementById('bmi-height-value').textContent = this.height;
    });
    document.getElementById('bmi-calculate').addEventListener('click', () => this.calculate());
    ['bmi-weight', 'bmi-height'].forEach(id => {
      document.getElementById(id).addEventListener('change', () => this.calculate());
    });
  }

  calculate() {
    const bmi = CalculatorUtils.calculateBMI(this.weight, this.height);
    const category = CalculatorUtils.getBMICategory(bmi);

    document.getElementById('bmi-results').style.display = 'block';
    document.getElementById('bmi-score').textContent = bmi.toFixed(1);
    document.getElementById('bmi-score').style.color = category.color;
    document.getElementById('bmi-category').textContent = category.category;
    document.getElementById('bmi-category').style.color = category.color;

    // Position the marker (BMI 15-40 range mapped to 0-100%)
    const markerPos = Math.min(100, Math.max(0, ((bmi - 15) / 25) * 100));
    document.getElementById('bmi-marker').style.left = `${markerPos}%`;

    // Calculate healthy weight range
    const heightM = this.height / 100;
    const minWeight = 18.5 * heightM * heightM;
    const maxWeight = 24.9 * heightM * heightM;
    document.getElementById('bmi-healthy-range').textContent = 
      `${minWeight.toFixed(1)} kg - ${maxWeight.toFixed(1)} kg`;
  }
}

registerCalculator('bmi', BMICalculator);

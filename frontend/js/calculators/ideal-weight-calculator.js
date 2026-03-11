/**
 * Ideal Weight Calculator
 */

class IdealWeightCalculator {
  constructor(container) {
    this.container = container;
    this.height = 170;
    this.gender = 'male';
  }

  render() {
    this.container.innerHTML = `
      <div class="calc-form">
        ${CalculatorUtils.createSlider('iw-height', 'Your Height', 140, 210, this.height, 1, ' cm', '')}
        
        <div class="calc-input-card">
          <label>Gender</label>
          <div class="gender-toggle" id="iw-gender-toggle">
            <button type="button" class="gender-btn active" data-value="male">
              <i class="fa fa-male"></i> Male
            </button>
            <button type="button" class="gender-btn" data-value="female">
              <i class="fa fa-female"></i> Female
            </button>
          </div>
          <input type="hidden" id="iw-gender" value="male">
        </div>
        
        <div style="text-align: center; margin-top: 10px;">
          <button class="calc-btn" id="iw-calculate">
            <i class="fa fa-calculator"></i> Calculate Ideal Weight
          </button>
        </div>

        <div class="calc-results" id="iw-results" style="display: none;">
          <h4 class="calc-results-title">Ideal Weight Range</h4>
          
          <div class="iw-main-result">
            <div class="iw-range" id="iw-bmi-range">55 - 70 kg</div>
            <div class="iw-label">Based on Healthy BMI (18.5 - 24.9)</div>
          </div>

          <div class="iw-methods">
            <h5>Different Calculation Methods</h5>
            <div class="iw-method-row">
              <span class="method-name">Robinson Formula</span>
              <span class="method-value" id="iw-robinson">0 kg</span>
            </div>
            <div class="iw-method-row">
              <span class="method-name">Miller Formula</span>
              <span class="method-value" id="iw-miller">0 kg</span>
            </div>
            <div class="iw-method-row">
              <span class="method-name">Devine Formula</span>
              <span class="method-value" id="iw-devine">0 kg</span>
            </div>
            <div class="iw-method-row">
              <span class="method-name">Hamwi Formula</span>
              <span class="method-value" id="iw-hamwi">0 kg</span>
            </div>
          </div>
        </div>
      </div>
      <style>
        .iw-main-result {
          text-align: center;
          padding: 30px;
          background: linear-gradient(135deg, #e8f7fc, #d4f1f9);
          border-radius: 12px;
          margin-bottom: 25px;
        }
        .iw-range {
          font-size: 2.5rem;
          font-weight: 700;
          color: #14bdee;
        }
        .iw-label {
          margin-top: 8px;
          color: #0a7d9c;
          font-size: 0.95rem;
        }
        .iw-methods {
          background: #fff;
          border-radius: 10px;
          padding: 20px;
          border: 1px solid #e8e8e8;
        }
        .iw-methods h5 {
          margin: 0 0 15px;
          font-size: 1rem;
          color: #1a1a2e;
          text-align: center;
        }
        .iw-method-row {
          display: flex;
          justify-content: space-between;
          padding: 12px 0;
          border-bottom: 1px solid #f0f0f0;
        }
        .iw-method-row:last-child {
          border-bottom: none;
        }
        .method-name {
          color: #555;
        }
        .method-value {
          font-weight: 600;
          color: #27ae60;
        }
        /* Toggle button styles moved to calculator.css */
      </style>
    `;
    this.bindEvents();
    this.calculate();
  }

  bindEvents() {
    document.getElementById('iw-height').addEventListener('input', (e) => {
      this.height = parseInt(e.target.value);
      document.getElementById('iw-height-value').textContent = this.height;
    });
    
    // Gender toggle buttons
    document.querySelectorAll('#iw-gender-toggle .gender-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#iw-gender-toggle .gender-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('iw-gender').value = btn.dataset.value;
        this.gender = btn.dataset.value;
        this.calculate();
      });
    });
    document.getElementById('iw-calculate').addEventListener('click', () => this.calculate());
    document.getElementById('iw-height').addEventListener('change', () => this.calculate());
  }

  calculate() {
    this.height = parseInt(document.getElementById('iw-height').value);
    this.gender = document.getElementById('iw-gender').value || 'male';
    
    const heightInches = this.height / 2.54;
    const heightOver5Ft = Math.max(0, heightInches - 60);
    const heightM = this.height / 100;

    let robinson, miller, devine, hamwi;
    
    if (this.gender === 'male') {
      robinson = 52 + 1.9 * heightOver5Ft;
      miller = 56.2 + 1.41 * heightOver5Ft;
      devine = 50 + 2.3 * heightOver5Ft;
      hamwi = 48 + 2.7 * heightOver5Ft;
    } else {
      robinson = 49 + 1.7 * heightOver5Ft;
      miller = 53.1 + 1.36 * heightOver5Ft;
      devine = 45.5 + 2.3 * heightOver5Ft;
      hamwi = 45.5 + 2.2 * heightOver5Ft;
    }

    const minWeight = 18.5 * heightM * heightM;
    const maxWeight = 24.9 * heightM * heightM;

    document.getElementById('iw-results').style.display = 'block';
    document.getElementById('iw-bmi-range').textContent = `${minWeight.toFixed(1)} - ${maxWeight.toFixed(1)} kg`;
    document.getElementById('iw-robinson').textContent = `${robinson.toFixed(1)} kg`;
    document.getElementById('iw-miller').textContent = `${miller.toFixed(1)} kg`;
    document.getElementById('iw-devine').textContent = `${devine.toFixed(1)} kg`;
    document.getElementById('iw-hamwi').textContent = `${hamwi.toFixed(1)} kg`;
  }
}

registerCalculator('ideal-weight', IdealWeightCalculator);

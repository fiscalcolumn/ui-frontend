/**
 * BMR Calculator
 */

class BMRCalculator {
  constructor(container) {
    this.container = container;
    this.age = 30;
    this.weight = 70;
    this.height = 170;
    this.gender = 'male';
  }

  render() {
    this.container.innerHTML = `
      <div class="calc-form">
        ${CalculatorUtils.createSlider('bmr-age', 'Your Age', 15, 80, this.age, 1, ' years', '')}
        ${CalculatorUtils.createSlider('bmr-weight', 'Your Weight', 40, 150, this.weight, 1, ' kg', '')}
        ${CalculatorUtils.createSlider('bmr-height', 'Your Height', 140, 210, this.height, 1, ' cm', '')}
        
        <div class="calc-input-card">
          <label>Gender</label>
          <div class="gender-toggle" id="bmr-gender-toggle">
            <button type="button" class="gender-btn active" data-value="male">
              <i class="fa fa-male"></i> Male
            </button>
            <button type="button" class="gender-btn" data-value="female">
              <i class="fa fa-female"></i> Female
            </button>
          </div>
          <input type="hidden" id="bmr-gender" value="male">
        </div>
        
        <div style="text-align: center; margin-top: 10px;">
          <button class="calc-btn" id="bmr-calculate">
            <i class="fa fa-calculator"></i> Calculate BMR
          </button>
        </div>

        <div class="calc-results" id="bmr-results" style="display: none;">
          <div class="bmr-display">
            <div class="bmr-score" id="bmr-value">0</div>
            <div class="bmr-unit">calories/day</div>
            <p class="bmr-desc">This is the number of calories your body burns at complete rest</p>
          </div>

          <div class="bmr-activity-table">
            <h5>Daily Calorie Needs by Activity Level</h5>
            <div class="activity-row">
              <span class="activity-label">Sedentary (little exercise)</span>
              <span class="activity-value" id="bmr-sedentary">0 cal</span>
            </div>
            <div class="activity-row">
              <span class="activity-label">Light (1-3 days/week)</span>
              <span class="activity-value" id="bmr-light">0 cal</span>
            </div>
            <div class="activity-row">
              <span class="activity-label">Moderate (3-5 days/week)</span>
              <span class="activity-value" id="bmr-moderate">0 cal</span>
            </div>
            <div class="activity-row">
              <span class="activity-label">Active (6-7 days/week)</span>
              <span class="activity-value" id="bmr-active">0 cal</span>
            </div>
            <div class="activity-row">
              <span class="activity-label">Very Active (athlete)</span>
              <span class="activity-value" id="bmr-very-active">0 cal</span>
            </div>
          </div>
        </div>
      </div>
      <style>
        .bmr-display {
          text-align: center;
          padding: 30px;
          background: linear-gradient(135deg, #e8f7fc, #d4f1f9);
          border-radius: 12px;
          margin-bottom: 25px;
        }
        .bmr-score {
          font-size: 3.5rem;
          font-weight: 700;
          color: #14bdee;
          line-height: 1;
        }
        .bmr-unit {
          font-size: 1.2rem;
          color: #0a7d9c;
          margin-top: 5px;
        }
        .bmr-desc {
          margin: 15px 0 0;
          font-size: 0.9rem;
          color: #666;
        }
        .bmr-activity-table {
          background: #fff;
          border-radius: 10px;
          padding: 20px;
          border: 1px solid #e8e8e8;
        }
        .bmr-activity-table h5 {
          margin: 0 0 15px;
          font-size: 1rem;
          color: #1a1a2e;
          text-align: center;
        }
        .activity-row {
          display: flex;
          justify-content: space-between;
          padding: 12px 0;
          border-bottom: 1px solid #f0f0f0;
        }
        .activity-row:last-child {
          border-bottom: none;
        }
        .activity-label {
          color: #555;
          font-size: 0.95rem;
        }
        .activity-value {
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
    ['bmr-age', 'bmr-weight', 'bmr-height'].forEach(id => {
      document.getElementById(id).addEventListener('input', (e) => {
        document.getElementById(`${id}-value`).textContent = e.target.value;
      });
      document.getElementById(id).addEventListener('change', () => this.calculate());
    });
    
    // Gender toggle buttons
    document.querySelectorAll('#bmr-gender-toggle .gender-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#bmr-gender-toggle .gender-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('bmr-gender').value = btn.dataset.value;
        this.calculate();
      });
    });
    document.getElementById('bmr-calculate').addEventListener('click', () => this.calculate());
  }

  calculate() {
    this.age = parseInt(document.getElementById('bmr-age').value);
    this.weight = parseFloat(document.getElementById('bmr-weight').value);
    this.height = parseInt(document.getElementById('bmr-height').value);
    this.gender = document.getElementById('bmr-gender').value || 'male';

    const bmr = CalculatorUtils.calculateBMR(this.weight, this.height, this.age, this.gender);

    document.getElementById('bmr-results').style.display = 'block';
    document.getElementById('bmr-value').textContent = Math.round(bmr);
    document.getElementById('bmr-sedentary').textContent = `${Math.round(bmr * 1.2)} cal`;
    document.getElementById('bmr-light').textContent = `${Math.round(bmr * 1.375)} cal`;
    document.getElementById('bmr-moderate').textContent = `${Math.round(bmr * 1.55)} cal`;
    document.getElementById('bmr-active').textContent = `${Math.round(bmr * 1.725)} cal`;
    document.getElementById('bmr-very-active').textContent = `${Math.round(bmr * 1.9)} cal`;
  }
}

registerCalculator('bmr', BMRCalculator);

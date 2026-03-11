/**
 * Daily Calorie Calculator
 */

class CalorieCalculator {
  constructor(container) {
    this.container = container;
    this.age = 30;
    this.weight = 70;
    this.height = 170;
    this.gender = 'male';
    this.activity = '1.55';
  }

  render() {
    this.container.innerHTML = `
      <div class="calc-form">
        ${CalculatorUtils.createSlider('cal-age', 'Your Age', 15, 80, this.age, 1, ' years', '')}
        ${CalculatorUtils.createSlider('cal-weight', 'Your Weight', 40, 150, this.weight, 1, ' kg', '')}
        ${CalculatorUtils.createSlider('cal-height', 'Your Height', 140, 210, this.height, 1, ' cm', '')}
        
        <div class="calc-input-card">
          <label>Gender</label>
          <div class="gender-toggle" id="cal-gender-toggle">
            <button type="button" class="gender-btn active" data-value="male">
              <i class="fa fa-male"></i> Male
            </button>
            <button type="button" class="gender-btn" data-value="female">
              <i class="fa fa-female"></i> Female
            </button>
          </div>
          <input type="hidden" id="cal-gender" value="male">
        </div>

        ${CalculatorUtils.createSelect('cal-activity', 'Activity Level', [
          { value: '1.2', label: 'Sedentary (little or no exercise)' },
          { value: '1.375', label: 'Light (exercise 1-3 days/week)' },
          { value: '1.55', label: 'Moderate (exercise 3-5 days/week)' },
          { value: '1.725', label: 'Active (exercise 6-7 days/week)' },
          { value: '1.9', label: 'Very Active (hard exercise daily)' }
        ], '1.55')}
        
        <div style="text-align: center; margin-top: 10px;">
          <button class="calc-btn" id="cal-calculate">
            <i class="fa fa-calculator"></i> Calculate Calories
          </button>
        </div>

        <div class="calc-results" id="cal-results" style="display: none;">
          <div class="cal-bmr">
            <span>Your BMR (Base Metabolic Rate):</span>
            <strong id="cal-bmr">1,650 cal/day</strong>
          </div>

          <div class="cal-goals-3">
            <div class="cal-goal-card maintain">
              <div class="goal-icon">⚖️</div>
              <div class="goal-title">Maintain Weight</div>
              <div class="goal-value" id="cal-maintain">2,200 cal</div>
              <div class="goal-desc">Daily calories to stay the same</div>
            </div>
            <div class="cal-goal-card loss">
              <div class="goal-icon">📉</div>
              <div class="goal-title">Weight Loss</div>
              <div class="goal-value" id="cal-loss">1,700 cal</div>
              <div class="goal-desc">-500 cal/day = ~0.5 kg/week</div>
            </div>
            <div class="cal-goal-card gain">
              <div class="goal-icon">📈</div>
              <div class="goal-title">Weight Gain</div>
              <div class="goal-value" id="cal-gain">2,700 cal</div>
              <div class="goal-desc">+500 cal/day = ~0.5 kg/week</div>
            </div>
          </div>
        </div>
      </div>
      <style>
        /* Toggle button styles moved to calculator.css */

        .cal-bmr {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px 25px;
          border-radius: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 1rem;
          color: rgba(255,255,255,0.9);
          margin-bottom: 20px;
        }
        .cal-bmr strong {
          color: #fff;
          font-size: 1.3rem;
        }
        .cal-goals-3 {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
        }
        .cal-goal-card {
          padding: 20px 15px;
          border-radius: 12px;
          text-align: center;
        }
        .cal-goal-card.maintain {
          background: linear-gradient(135deg, #e8f7fc, #d4f1f9);
          border: 1px solid #b8e6f5;
        }
        .cal-goal-card.loss {
          background: #fef3f2;
          border: 1px solid #fee4e2;
        }
        .cal-goal-card.gain {
          background: #f0fdf4;
          border: 1px solid #dcfce7;
        }
        .goal-icon {
          font-size: 1.5rem;
          margin-bottom: 8px;
        }
        .goal-title {
          font-weight: 600;
          color: #1a1a2e;
          margin-bottom: 8px;
          font-size: 0.95rem;
        }
        .goal-value {
          font-size: 1.3rem;
          font-weight: 700;
          margin-bottom: 6px;
        }
        .cal-goal-card.maintain .goal-value { color: #14bdee; }
        .cal-goal-card.loss .goal-value { color: #dc2626; }
        .cal-goal-card.gain .goal-value { color: #16a34a; }
        .goal-desc {
          font-size: 0.75rem;
          color: #888;
        }
        @media (max-width: 768px) {
          .cal-goals-3 {
            grid-template-columns: 1fr;
          }
        }
        /* Dark mode */
        .dark-mode .cal-bmr {
          background: linear-gradient(135deg, #4c51bf 0%, #6b46c1 100%);
        }
        .dark-mode .cal-goal-card.maintain {
          background: rgba(20, 189, 238, 0.1);
          border-color: rgba(20, 189, 238, 0.3);
        }
        .dark-mode .cal-goal-card.loss {
          background: rgba(220, 38, 38, 0.1);
          border-color: rgba(220, 38, 38, 0.3);
        }
        .dark-mode .cal-goal-card.gain {
          background: rgba(22, 163, 74, 0.1);
          border-color: rgba(22, 163, 74, 0.3);
        }
        .dark-mode .goal-title {
          color: var(--text-primary);
        }
        .dark-mode .goal-desc {
          color: var(--text-secondary);
        }
      </style>
    `;
    this.bindEvents();
    this.calculate();
  }

  bindEvents() {
    ['cal-age', 'cal-weight', 'cal-height'].forEach(id => {
      document.getElementById(id).addEventListener('input', (e) => {
        document.getElementById(`${id}-value`).textContent = e.target.value;
      });
      document.getElementById(id).addEventListener('change', () => this.calculate());
    });
    
    // Gender toggle buttons
    document.querySelectorAll('.gender-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.gender-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('cal-gender').value = btn.dataset.value;
        this.calculate();
      });
    });
    
    document.getElementById('cal-activity').addEventListener('change', () => this.calculate());
    document.getElementById('cal-calculate').addEventListener('click', () => this.calculate());
  }

  calculate() {
    this.age = parseInt(document.getElementById('cal-age').value);
    this.weight = parseFloat(document.getElementById('cal-weight').value);
    this.height = parseInt(document.getElementById('cal-height').value);
    this.gender = document.getElementById('cal-gender').value;
    this.activity = parseFloat(document.getElementById('cal-activity').value);

    const bmr = CalculatorUtils.calculateBMR(this.weight, this.height, this.age, this.gender);
    const maintenance = bmr * this.activity;
    const loss = maintenance - 500;
    const gain = maintenance + 500;

    document.getElementById('cal-results').style.display = 'block';
    document.getElementById('cal-maintain').textContent = `${CalculatorUtils.formatIndianNumber(Math.round(maintenance))} cal`;
    document.getElementById('cal-loss').textContent = `${CalculatorUtils.formatIndianNumber(Math.round(loss))} cal`;
    document.getElementById('cal-gain').textContent = `${CalculatorUtils.formatIndianNumber(Math.round(gain))} cal`;
    document.getElementById('cal-bmr').textContent = `${CalculatorUtils.formatIndianNumber(Math.round(bmr))} cal/day`;
  }
}

registerCalculator('calorie', CalorieCalculator);

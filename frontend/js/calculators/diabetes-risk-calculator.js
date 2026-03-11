/**
 * Diabetes Risk Calculator
 */

class DiabetesRiskCalculator {
  constructor(container) {
    this.container = container;
    this.age = 40;
    this.bmi = 25;
    this.waist = 90;
    this.familyHistory = 'no';
    this.highBP = 'no';
    this.physicalActivity = 'yes';
  }

  render() {
    this.container.innerHTML = `
      <div class="calc-form">
        ${CalculatorUtils.createSlider('dr-age', 'Your Age', 20, 80, this.age, 1, ' years', '')}
        ${CalculatorUtils.createSlider('dr-bmi', 'Your BMI', 15, 45, this.bmi, 0.5, '', '')}
        ${CalculatorUtils.createSlider('dr-waist', 'Waist Circumference', 60, 150, this.waist, 1, ' cm', '')}
        
        <div class="calc-input-card">
          <label>Family History of Diabetes</label>
          <div class="toggle-buttons" id="dr-family-toggle">
            <button type="button" class="toggle-btn active" data-value="no">No</button>
            <button type="button" class="toggle-btn" data-value="yes">Yes (Parents/Siblings)</button>
          </div>
          <input type="hidden" id="dr-family" value="no">
        </div>
        
        <div class="calc-input-card">
          <label>High Blood Pressure?</label>
          <div class="toggle-buttons" id="dr-bp-toggle">
            <button type="button" class="toggle-btn active" data-value="no">No</button>
            <button type="button" class="toggle-btn" data-value="yes">Yes</button>
          </div>
          <input type="hidden" id="dr-bp" value="no">
        </div>
        
        <div class="calc-input-card">
          <label>Regular Physical Activity?</label>
          <div class="toggle-buttons" id="dr-activity-toggle">
            <button type="button" class="toggle-btn active" data-value="yes">Yes (30+ minutes/day)</button>
            <button type="button" class="toggle-btn" data-value="no">No</button>
          </div>
          <input type="hidden" id="dr-activity" value="yes">
        </div>
        
        <div style="text-align: center; margin-top: 10px;">
          <button class="calc-btn" id="dr-calculate">
            <i class="fa fa-heartbeat"></i> Assess My Risk
          </button>
        </div>

        <div class="calc-results" id="dr-results" style="display: none;">
          <div class="dr-display" id="dr-display">
            <div class="dr-score" id="dr-score">5</div>
            <div class="dr-level" id="dr-level">Moderate Risk</div>
          </div>
          
          <div class="dr-gauge">
            <div class="dr-gauge-bar">
              <div class="dr-gauge-fill" id="dr-fill"></div>
            </div>
            <div class="dr-gauge-labels">
              <span>Low</span>
              <span>Moderate</span>
              <span>High</span>
              <span>Very High</span>
            </div>
          </div>

          <div class="dr-recommendations" id="dr-recommendations"></div>
        </div>
      </div>
      <style>
        .dr-display {
          text-align: center;
          padding: 35px;
          border-radius: 12px;
          margin-bottom: 20px;
          transition: background 0.3s;
        }
        .dr-score {
          font-size: 4rem;
          font-weight: 700;
          line-height: 1;
        }
        .dr-level {
          font-size: 1.4rem;
          font-weight: 600;
          margin-top: 10px;
        }
        .dr-gauge {
          margin-bottom: 25px;
        }
        .dr-gauge-bar {
          height: 16px;
          background: linear-gradient(to right, #27ae60 0%, #f39c12 40%, #e67e22 66%, #e74c3c 100%);
          border-radius: 8px;
          position: relative;
          overflow: hidden;
        }
        .dr-gauge-fill {
          position: absolute;
          top: 0;
          left: 0;
          height: 100%;
          width: 4px;
          background: #1a1a2e;
          border-radius: 2px;
          transition: left 0.5s;
        }
        .dr-gauge-labels {
          display: flex;
          justify-content: space-between;
          margin-top: 8px;
          font-size: 0.8rem;
          color: #666;
        }
        .dr-recommendations {
          background: #f8f9fa;
          border-radius: 10px;
          padding: 20px;
        }
        .dr-recommendations h5 {
          margin: 0 0 12px;
          font-size: 1rem;
          color: #1a1a2e;
        }
        .dr-recommendations ul {
          margin: 0;
          padding-left: 20px;
        }
        .dr-recommendations li {
          margin-bottom: 8px;
          color: #555;
        }
        /* Toggle button styles moved to calculator.css */
      </style>
    `;
    this.bindEvents();
    this.calculate();
  }

  bindEvents() {
    ['dr-age', 'dr-bmi', 'dr-waist'].forEach(id => {
      document.getElementById(id).addEventListener('input', (e) => {
        document.getElementById(`${id}-value`).textContent = 
          id === 'dr-bmi' ? parseFloat(e.target.value).toFixed(1) : e.target.value;
      });
      document.getElementById(id).addEventListener('change', () => this.calculate());
    });
    
    // Toggle buttons for Family History
    document.querySelectorAll('#dr-family-toggle .toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#dr-family-toggle .toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('dr-family').value = btn.dataset.value;
        this.calculate();
      });
    });
    
    // Toggle buttons for High Blood Pressure
    document.querySelectorAll('#dr-bp-toggle .toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#dr-bp-toggle .toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('dr-bp').value = btn.dataset.value;
        this.calculate();
      });
    });
    
    // Toggle buttons for Physical Activity
    document.querySelectorAll('#dr-activity-toggle .toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#dr-activity-toggle .toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('dr-activity').value = btn.dataset.value;
        this.calculate();
      });
    });
    
    document.getElementById('dr-calculate').addEventListener('click', () => this.calculate());
  }

  calculate() {
    this.age = parseInt(document.getElementById('dr-age').value);
    this.bmi = parseFloat(document.getElementById('dr-bmi').value);
    this.waist = parseInt(document.getElementById('dr-waist').value);
    this.familyHistory = document.getElementById('dr-family').value || 'no';
    this.highBP = document.getElementById('dr-bp').value || 'no';
    this.physicalActivity = document.getElementById('dr-activity').value || 'yes';

    let score = 0;

    // Age scoring (max 7 points)
    if (this.age >= 45 && this.age < 55) score += 3;
    else if (this.age >= 55 && this.age < 65) score += 5;
    else if (this.age >= 65) score += 7;

    // BMI scoring (max 7 points)
    if (this.bmi >= 25 && this.bmi < 30) score += 2;
    else if (this.bmi >= 30 && this.bmi < 35) score += 4;
    else if (this.bmi >= 35) score += 7;

    // Waist scoring (max 5 points)
    if (this.waist >= 90 && this.waist < 100) score += 3;
    else if (this.waist >= 100) score += 5;

    // Other factors
    if (this.familyHistory === 'yes') score += 5; // Family history (max 5)
    if (this.highBP === 'yes') score += 3; // High BP (max 3)
    if (this.physicalActivity === 'no') score += 3; // No activity (max 3)

    const maxScore = 30; // Total: 7 + 7 + 5 + 5 + 3 + 3 = 30
    const percentage = (score / maxScore) * 100;

    let level, bgColor, recommendations;
    // Risk thresholds adjusted for maxScore of 30
    if (score <= 10) {
      level = 'Low Risk';
      bgColor = '#e8f7ec';
      recommendations = `
        <h5>✅ Great News!</h5>
        <p>Your diabetes risk is currently low. Keep up the healthy lifestyle!</p>
        <ul>
          <li>Continue regular physical activity</li>
          <li>Maintain a balanced diet</li>
          <li>Annual health check-ups recommended</li>
        </ul>
      `;
    } else if (score <= 16) {
      level = 'Slightly Elevated';
      bgColor = '#fef3e0';
      recommendations = `
        <h5>⚠️ Slightly Elevated - Take Action</h5>
        <ul>
          <li>Get your blood sugar tested regularly</li>
          <li>Aim for 30 minutes of daily exercise</li>
          <li>Reduce sugar and refined carbs intake</li>
          <li>Maintain a healthy weight</li>
        </ul>
      `;
    } else if (score <= 22) {
      level = 'Moderate Risk';
      bgColor = '#ede4e4';
      recommendations = `
        <h5>🔴 Moderate Risk - Consult a Doctor</h5>
        <ul>
          <li>Schedule a doctor's appointment soon</li>
          <li>Get HbA1c test done</li>
          <li>Start lifestyle modifications immediately</li>
          <li>Monitor your diet closely</li>
          <li>Consider a diabetes prevention program</li>
        </ul>
      `;
    } else if (score <= 27) {
      level = 'High Risk';
      bgColor = '#fdeae8';
      recommendations = `
        <h5>🔴 High Risk - Consult a Doctor</h5>
        <ul>
          <li>Schedule a doctor's appointment soon</li>
          <li>Get HbA1c test done</li>
          <li>Start lifestyle modifications immediately</li>
          <li>Monitor your diet closely</li>
          <li>Consider a diabetes prevention program</li>
        </ul>
      `;
    }  
    else {
      level = 'Very High Risk';
      bgColor = '#fce8e8';
      recommendations = `
        <h5>🚨 Very High Risk - Immediate Action Needed</h5>
        <ul>
          <li><strong>Consult a doctor immediately</strong></li>
          <li>Get complete diabetes screening</li>
          <li>Start a structured diet plan</li>
          <li>Begin a supervised exercise program</li>
          <li>Regular blood sugar monitoring required</li>
        </ul>
      `;
    }

    const display = document.getElementById('dr-display');
    display.style.background = bgColor;

    document.getElementById('dr-results').style.display = 'block';
    document.getElementById('dr-score').textContent = score;
    document.getElementById('dr-level').textContent = level;
    document.getElementById('dr-fill').style.left = `${percentage}%`;
    document.getElementById('dr-recommendations').innerHTML = recommendations;
  }
}

registerCalculator('diabetes-risk', DiabetesRiskCalculator);

/**
 * Walk Calorie Burn Calculator
 */

class WalkCalorieCalculator {
  constructor(container) {
    this.container = container;
    this.weight = 70;
    this.duration = 30;
    this.speed = 5;
    this.incline = 0;
  }

  render() {
    this.container.innerHTML = `
      <div class="calc-form">
        ${CalculatorUtils.createSlider('walk-weight', 'Your Weight', 40, 150, this.weight, 1, ' kg', '')}
        ${CalculatorUtils.createSlider('walk-duration', 'Walking Duration', 5, 120, this.duration, 5, ' min', '')}
        ${CalculatorUtils.createSlider('walk-speed', 'Walking Speed', 3, 8, this.speed, 0.5, ' km/h', '')}
        ${CalculatorUtils.createSlider('walk-incline', 'Incline / Gradient', 0, 15, this.incline, 1, '%', '')}
        
        <div style="text-align: center; margin-top: 10px;">
          <button class="calc-btn" id="walk-calculate">
            <i class="fa fa-fire"></i> Calculate Calories Burned
          </button>
        </div>

        <div class="calc-results" id="walk-results" style="display: none;">
          <div class="walk-main">
            <div class="walk-calories" id="walk-calories">250</div>
            <div class="walk-label">Calories Burned</div>
          </div>

          <div class="walk-stats">
            <div class="walk-stat">
              <div class="stat-icon">📏</div>
              <div class="stat-value" id="walk-distance">2.5 km</div>
              <div class="stat-label">Distance</div>
            </div>
            <div class="walk-stat">
              <div class="stat-icon">👟</div>
              <div class="stat-value" id="walk-steps">~3,300</div>
              <div class="stat-label">Est. Steps</div>
            </div>
            <div class="walk-stat">
              <div class="stat-icon">🔥</div>
              <div class="stat-value" id="walk-met">3.5</div>
              <div class="stat-label">MET Value</div>
            </div>
          </div>

        </div>
      </div>
      <style>
        .walk-main {
          text-align: center;
          padding: 35px;
          background: linear-gradient(135deg, #fef3e0, #fed7aa);
          border-radius: 12px;
          margin-bottom: 20px;
        }
        .walk-calories {
          font-size: 4rem;
          font-weight: 700;
          color: #ea580c;
          line-height: 1;
        }
        .walk-label {
          margin-top: 10px;
          color: #c2410c;
          font-size: 1.1rem;
          font-weight: 500;
        }
        .walk-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
          margin-bottom: 20px;
        }
        .walk-stat {
          background: #fff;
          border: 1px solid #e8e8e8;
          border-radius: 10px;
          padding: 20px;
          text-align: center;
        }
        .stat-icon {
          font-size: 1.5rem;
          margin-bottom: 8px;
        }
        .stat-value {
          font-size: 1.3rem;
          font-weight: 700;
          color: #1a1a2e;
        }
        .stat-label {
          font-size: 0.85rem;
          color: #888;
          margin-top: 5px;
        }
        @media (max-width: 576px) {
          .walk-stats {
            grid-template-columns: 1fr;
          }
        }
      </style>
    `;
    this.bindEvents();
    this.calculate();
  }

  bindEvents() {
    document.getElementById('walk-weight').addEventListener('input', (e) => {
      this.weight = parseFloat(e.target.value);
      document.getElementById('walk-weight-value').textContent = this.weight;
    });
    document.getElementById('walk-duration').addEventListener('input', (e) => {
      this.duration = parseInt(e.target.value);
      document.getElementById('walk-duration-value').textContent = this.duration;
    });
    document.getElementById('walk-speed').addEventListener('input', (e) => {
      this.speed = parseFloat(e.target.value);
      document.getElementById('walk-speed-value').textContent = this.speed.toFixed(1);
    });
    document.getElementById('walk-incline').addEventListener('input', (e) => {
      this.incline = parseInt(e.target.value);
      document.getElementById('walk-incline-value').textContent = this.incline;
    });
    document.getElementById('walk-calculate').addEventListener('click', () => this.calculate());
    ['walk-weight', 'walk-duration', 'walk-speed', 'walk-incline'].forEach(id => {
      document.getElementById(id).addEventListener('change', () => this.calculate());
    });
  }

  getMET(speed, incline) {
    // Base MET for walking speed
    let baseMET;
    if (speed < 3.5) baseMET = 2.0;
    else if (speed < 4.5) baseMET = 3.0;
    else if (speed < 5.5) baseMET = 3.5;
    else if (speed < 6.5) baseMET = 4.3;
    else baseMET = 5.0;
    
    // Add incline bonus (roughly 0.5 MET per 5% incline)
    const inclineBonus = (incline / 5) * 0.5;
    
    return baseMET + inclineBonus;
  }

  calculate() {
    const met = this.getMET(this.speed, this.incline);
    const durationHours = this.duration / 60;
    const calories = Math.round(met * this.weight * durationHours);
    
    // Calculate distance from duration and speed
    const distance = this.speed * durationHours;
    
    // Estimate steps (average stride ~0.75m, reduced slightly on incline)
    const strideLength = 0.75 - (this.incline * 0.01); // Shorter strides on incline
    const steps = Math.round((distance * 1000) / strideLength);

    document.getElementById('walk-results').style.display = 'block';
    document.getElementById('walk-calories').textContent = CalculatorUtils.formatIndianNumber(calories);
    document.getElementById('walk-distance').textContent = `${distance.toFixed(1)} km`;
    document.getElementById('walk-steps').textContent = `~${CalculatorUtils.formatIndianNumber(steps)}`;
    document.getElementById('walk-met').textContent = met.toFixed(1);
  }
}

registerCalculator('walk-calorie-burn', WalkCalorieCalculator);

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

  mount() {
    CalculatorUtils.adoptModern(this.container, {
      hint: 'Calories use a walking intensity for your speed, plus a little more for the slope.',
      tiles: [
        { id: 'walk-calories', label: 'Calories' },
        { id: 'walk-distance', label: 'Distance' },
      ],
      canvasId: 'walk-chart',
      legend: ['A slower walk', 'Extra at your pace'],
      compareTitle: 'Same time, different speeds',
      leadId: 'walk-compare-lead',
      listId: 'walk-compare-list',
    });
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
    this.mount();
    CalculatorUtils.bindModern([
      { id: 'walk-weight', display: (n) => String(n), end: (n) => n + ' kg' },
      { id: 'walk-duration', display: (n) => String(n), end: (n) => n + ' min' },
      { id: 'walk-speed', display: (n) => n.toFixed(1), end: (n) => n + ' km/h' },
      { id: 'walk-incline', display: (n) => String(n), end: (n) => n + '%' },
    ], () => this.calculate(), () => this.chart);
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

  quoteWalk(speed) {
    const met = this.getMET(speed, this.incline);
    const hours = this.duration / 60;
    const calories = Math.round(met * this.weight * hours);
    const distance = speed * hours;
    const stride = 0.75 - (this.incline * 0.01);
    const steps = Math.round((distance * 1000) / stride);
    return { met, calories, distance, steps };
  }

  calculate() {
    this.weight = parseFloat(document.getElementById('walk-weight').value) || 0;
    this.duration = parseInt(document.getElementById('walk-duration').value, 10) || 0;
    this.speed = parseFloat(document.getElementById('walk-speed').value) || 0;
    this.incline = parseInt(document.getElementById('walk-incline').value, 10) || 0;
    const chosen = this.quoteWalk(this.speed);
    const met = chosen.met;
    const calories = chosen.calories;
    const distance = chosen.distance;
    const steps = chosen.steps;
    
    document.getElementById('walk-calories').textContent = CalculatorUtils.formatIndianNumber(calories);
    document.getElementById('walk-distance').textContent = distance.toFixed(1) + ' km';
    const speeds = [4, 5, 6.5];
    if (!speeds.some(speed => Math.abs(speed - this.speed) < 0.05)) speeds.push(this.speed);
    speeds.sort((a, b) => a - b);
    const slower = this.quoteWalk(Math.max(3, this.speed - 1));
    this.chart = CalculatorUtils.modernDoughnut(
      this.chart, 'walk-chart',
      [slower.calories, Math.max(0, calories - slower.calories)],
      'Burned',
      calories + ' cal',
      false
    );
    CalculatorUtils.fillCompare(
      'walk-compare-list',
      'walk-compare-lead',
      this.duration + ' minutes at ' + this.weight + ' kg, incline ' + this.incline + '%. About ' + CalculatorUtils.formatIndianNumber(steps) + ' steps.',
      speeds.map(speed => {
        const row = this.quoteWalk(speed);
        const yours = Math.abs(speed - this.speed) < 0.05;
        return {
          primary: speed + ' km/h',
          tag: yours ? 'Your pace' : '',
          yours,
          figures: [
            { label: 'Calories', value: row.calories + ' cal' },
            { label: 'Distance', value: row.distance.toFixed(1) + ' km' },
          ],
        };
      })
    );
    return;
    document.getElementById('walk-distance').textContent = `${distance.toFixed(1)} km`;
    document.getElementById('walk-steps').textContent = `~${CalculatorUtils.formatIndianNumber(steps)}`;
    document.getElementById('walk-met').textContent = met.toFixed(1);
  }
}

registerCalculator('walk-calorie-burn', WalkCalorieCalculator);

/**
 * Child Height Calculator
 */

class ChildHeightCalculator {
  constructor(container) {
    this.container = container;
    this.fatherHeight = 175;
    this.motherHeight = 162;
    this.childGender = 'male';
  }

  render() {
    this.container.innerHTML = `
      <div class="calc-form">
        ${CalculatorUtils.createSlider('ch-father', "Father's Height", 150, 200, this.fatherHeight, 1, ' cm', '')}
        ${CalculatorUtils.createSlider('ch-mother', "Mother's Height", 140, 190, this.motherHeight, 1, ' cm', '')}
        
        <div class="calc-input-card">
          <label>Child's Gender</label>
          <div class="gender-toggle" id="ch-gender-toggle">
            <button type="button" class="gender-btn active" data-value="male">
              <i class="fa fa-male"></i> Boy
            </button>
            <button type="button" class="gender-btn" data-value="female">
              <i class="fa fa-female"></i> Girl
            </button>
          </div>
          <input type="hidden" id="ch-gender" value="male">
        </div>
        
        <div style="text-align: center; margin-top: 10px;">
          <button class="calc-btn" id="ch-calculate">
            <i class="fa fa-child"></i> Predict Adult Height
          </button>
        </div>

        <div class="calc-results" id="ch-results" style="display: none;">
          <div class="ch-main-result">
            <div class="ch-height" id="ch-predicted">170 cm</div>
            <div class="ch-range" id="ch-range">160 - 180 cm</div>
            <div class="ch-label">Predicted Adult Height Range (±10cm)</div>
          </div>

          <div class="ch-info">
            <h5>📊 How It Works</h5>
            <p>This calculator uses the <strong>Mid-Parental Height Method</strong>:</p>
            <ul>
              <li><strong>Boys:</strong> (Father's height + Mother's height + 13) ÷ 2</li>
              <li><strong>Girls:</strong> (Father's height + Mother's height - 13) ÷ 2</li>
            </ul>
            <p class="ch-note">*Actual height depends on nutrition, health, genetics, and other factors.</p>
          </div>
        </div>
      </div>
      <style>
        .ch-main-result {
          text-align: center;
          padding: 35px;
          background: linear-gradient(135deg, #fff3e0, #ffe0b2);
          border-radius: 12px;
          margin-bottom: 25px;
        }
        .ch-height {
          font-size: 3.5rem;
          font-weight: 700;
          color: #e67e22;
          line-height: 1;
        }
        .ch-range {
          font-size: 1.3rem;
          color: #d35400;
          margin-top: 10px;
        }
        .ch-label {
          margin-top: 10px;
          color: #a04000;
          font-size: 0.9rem;
        }
        .ch-info {
          background: #fff;
          border-radius: 10px;
          padding: 20px;
          border: 1px solid #e8e8e8;
        }
        .ch-info h5 {
          margin: 0 0 12px;
          font-size: 1.05rem;
          color: #1a1a2e;
        }
        .ch-info p {
          margin: 0 0 10px;
          color: #555;
          font-size: 0.95rem;
        }
        .ch-info ul {
          margin: 10px 0;
          padding-left: 20px;
        }
        .ch-info li {
          margin-bottom: 8px;
          color: #555;
        }
        .ch-note {
          font-style: italic;
          color: #888 !important;
          font-size: 0.85rem !important;
        }
        /* Toggle button styles moved to calculator.css */
      </style>
    `;
    this.bindEvents();
    this.calculate();
  }

  mount() {
    CalculatorUtils.adoptModern(this.container, {
      hint: 'Adult height is the average of the parents, plus 13 cm for a boy or minus 13 cm for a girl. The real range is about 10 cm either side.',
      tiles: [
        { id: 'ch-predicted', label: 'Expected' },
        { id: 'ch-range', label: 'Likely range' },
      ],
      canvasId: 'ch-chart',
      legend: ['Father', 'Mother'],
      compareTitle: 'Same parents, boy or girl',
      leadId: 'ch-compare-lead',
      listId: 'ch-compare-list',
    });
  }

  bindEvents() {
    document.getElementById('ch-father').addEventListener('input', (e) => {
      this.fatherHeight = parseInt(e.target.value);
      document.getElementById('ch-father-value').textContent = this.fatherHeight;
    });
    document.getElementById('ch-mother').addEventListener('input', (e) => {
      this.motherHeight = parseInt(e.target.value);
      document.getElementById('ch-mother-value').textContent = this.motherHeight;
    });
    
    // Gender toggle buttons
    document.querySelectorAll('#ch-gender-toggle .gender-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#ch-gender-toggle .gender-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('ch-gender').value = btn.dataset.value;
        this.childGender = btn.dataset.value;
        this.calculate();
      });
    });
    this.mount();
    CalculatorUtils.bindModern([
      { id: 'ch-father', display: (n) => String(n), end: (n) => n + ' cm' },
      { id: 'ch-mother', display: (n) => String(n), end: (n) => n + ' cm' },
    ], () => this.calculate(), () => this.chart);
    ['ch-father', 'ch-mother'].forEach(id => {
      document.getElementById(id).addEventListener('change', () => this.calculate());
    });
  }

  calculate() {
    this.fatherHeight = parseInt(document.getElementById('ch-father').value);
    this.motherHeight = parseInt(document.getElementById('ch-mother').value);
    this.childGender = document.getElementById('ch-gender').value || 'male';

    let predictedHeight;
    if (this.childGender === 'male') {
      predictedHeight = (this.fatherHeight + this.motherHeight + 13) / 2;
    } else {
      predictedHeight = (this.fatherHeight + this.motherHeight - 13) / 2;
    }

    const boy = (this.fatherHeight + this.motherHeight + 13) / 2;
    const girl = (this.fatherHeight + this.motherHeight - 13) / 2;
    const shown = this.childGender === 'male' ? boy : girl;
    document.getElementById('ch-predicted').textContent = Math.round(shown) + ' cm';
    document.getElementById('ch-range').textContent = Math.round(shown - 10) + ' – ' + Math.round(shown + 10) + ' cm';
    this.chart = CalculatorUtils.modernDoughnut(
      this.chart, 'ch-chart',
      [this.fatherHeight, this.motherHeight],
      'Adult',
      Math.round(shown) + ' cm',
      false
    );
    CalculatorUtils.fillCompare('ch-compare-list', 'ch-compare-lead',
      'Parents are ' + this.fatherHeight + ' cm and ' + this.motherHeight + ' cm.',
      [
        { primary: 'Boy', tag: this.childGender === 'male' ? 'Your child' : '', yours: this.childGender === 'male', figures: [{ label: 'Expected', value: Math.round(boy) + ' cm' }, { label: 'Range', value: Math.round(boy - 10) + '–' + Math.round(boy + 10) }] },
        { primary: 'Girl', tag: this.childGender !== 'male' ? 'Your child' : '', yours: this.childGender !== 'male', figures: [{ label: 'Expected', value: Math.round(girl) + ' cm' }, { label: 'Range', value: Math.round(girl - 10) + '–' + Math.round(girl + 10) }] },
      ]
    );
    return;
    document.getElementById('ch-predicted').textContent = `${predictedHeight.toFixed(0)} cm`;
    document.getElementById('ch-range').textContent = `${(predictedHeight - 10).toFixed(0)} - ${(predictedHeight + 10).toFixed(0)} cm`;
  }
}

registerCalculator('child-height', ChildHeightCalculator);

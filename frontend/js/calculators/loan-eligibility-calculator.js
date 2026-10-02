/**
 * Loan Eligibility Calculator
 */

class LoanEligibilityCalculator {
  constructor(container) {
    this.container = container;
    this.monthlyIncome = 100000;
    this.existingEMI = 0;
    this.interestRate = 9;
    this.tenure = 240; // 20 years
    this.foirPercent = 50;
  }

  render() {
    this.container.innerHTML = `
      <div class="calc-form">
        ${CalculatorUtils.createSlider('le-income', 'Monthly Net Income', 25000, 1000000, this.monthlyIncome, 5000, '', '₹')}
        ${CalculatorUtils.createSlider('le-emi', 'Existing Monthly EMIs', 0, 200000, this.existingEMI, 1000, '', '₹')}
        ${CalculatorUtils.createSlider('le-rate', 'Expected Interest Rate', 6, 15, this.interestRate, 0.25, '%', '')}
        ${CalculatorUtils.createSlider('le-tenure', 'Loan Tenure', 60, 360, this.tenure, 12, ' months', '')}
        ${CalculatorUtils.createSlider('le-foir', 'FOIR (EMI Limit %)', 30, 60, this.foirPercent, 5, '%', '')}
        
        <div style="text-align: center; margin-top: 10px;">
          <button class="calc-btn" id="le-calculate">
            <i class="fa fa-check-circle"></i> Check Eligibility
          </button>
        </div>

        <div class="calc-results" id="le-results" style="display: none;">
          <div class="eligibility-main">
            <div class="eligible-amount">
              <span class="eligible-label">You Are Eligible For</span>
              <div class="eligible-value" id="le-eligible">₹55,00,000</div>
              <span class="eligible-sub">Maximum Loan Amount</span>
            </div>
          </div>

          <div class="eligibility-details">
            <div class="detail-row">
              <span class="detail-label">Maximum EMI Capacity</span>
              <span class="detail-value" id="le-max-emi">₹50,000</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Available for New EMI</span>
              <span class="detail-value" id="le-available-emi">₹50,000</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Expected Monthly EMI</span>
              <span class="detail-value" id="le-expected-emi">₹49,500</span>
            </div>
          </div>

          <div class="eligibility-tip">
            <i class="fa fa-lightbulb-o"></i>
            <p id="le-tip">Tip: You can increase eligibility by adding a co-applicant's income or choosing a longer tenure.</p>
          </div>
        </div>
      </div>
      <style>
        .eligibility-main {
          background: linear-gradient(135deg, #e8f5e9, #c8e6c9);
          border-radius: 16px;
          padding: 30px;
          text-align: center;
          margin-bottom: 20px;
        }
        .eligible-label {
          display: block;
          font-size: 0.9rem;
          color: #2e7d32;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 10px;
        }
        .eligible-value {
          font-size: 3rem;
          font-weight: 700;
          color: #1b5e20;
          line-height: 1;
        }
        .eligible-sub {
          display: block;
          font-size: 0.85rem;
          color: #388e3c;
          margin-top: 8px;
        }
        .eligibility-details {
          background: #f8f9fa;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 20px;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 12px 0;
          border-bottom: 1px solid #eee;
        }
        .detail-row:last-child {
          border-bottom: none;
        }
        .detail-label {
          color: #666;
        }
        .detail-value {
          font-weight: 600;
          color: #1a1a2e;
        }
        .eligibility-tip {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 15px;
          background: #e3f2fd;
          border-radius: 10px;
        }
        .eligibility-tip i {
          color: #1976d2;
          font-size: 1.2rem;
          margin-top: 2px;
        }
        .eligibility-tip p {
          margin: 0;
          font-size: 0.9rem;
          color: #1565c0;
        }
        .dark-mode .eligibility-main {
          background: linear-gradient(135deg, rgba(76, 175, 80, 0.15), rgba(76, 175, 80, 0.25));
        }
        .dark-mode .eligible-label,
        .dark-mode .eligible-sub {
          color: #81c784;
        }
        .dark-mode .eligible-value {
          color: #4caf50;
        }
        .dark-mode .eligibility-details {
          background: var(--bg-tertiary);
        }
        .dark-mode .detail-row {
          border-bottom-color: var(--border-color);
        }
        .dark-mode .detail-label {
          color: var(--text-secondary);
        }
        .dark-mode .detail-value {
          color: var(--text-primary);
        }
        .dark-mode .eligibility-tip {
          background: rgba(25, 118, 210, 0.15);
        }
        .dark-mode .eligibility-tip i,
        .dark-mode .eligibility-tip p {
          color: #64b5f6;
        }
      </style>
    `;
    this.bindEvents();
    this.calculate();
  }

  bindEvents() {
    this.mount();
    CalculatorUtils.bindModern([
      { id: 'le-income', display: (n) => CalculatorUtils.formatIndianNumber(n), end: CalculatorUtils.moneyEnd },
      { id: 'le-emi', display: (n) => CalculatorUtils.formatIndianNumber(n), end: CalculatorUtils.moneyEnd },
      { id: 'le-rate', display: (n) => n.toFixed(2), end: (n) => `${n}%` },
      { id: 'le-tenure', display: (n) => String(n), end: (n) => `${n} months` },
      { id: 'le-foir', display: (n) => String(n), end: (n) => `${n}%` },
    ], () => this.calculate(), () => this.chart);
  }

  mount() {
    CalculatorUtils.adoptModern(this.container, {
      hint: 'Eligibility uses your income, existing EMIs, and the share of income a lender will allow for EMIs.',
      tiles: [
        { id: 'le-max-emi', label: 'Maximum EMI' },
        { id: 'le-available-emi', label: 'Available for a new EMI' },
      ],
      canvasId: 'le-chart',
      legend: ['Existing EMIs', 'Room for a new EMI'],
      compareTitle: 'Same income, different tenures',
      leadId: 'le-compare-lead',
      listId: 'le-compare-list',
    });
  }

  calculate() {
    this.monthlyIncome = parseFloat(document.getElementById('le-income').value);
    this.existingEMI = parseFloat(document.getElementById('le-emi').value);
    this.interestRate = parseFloat(document.getElementById('le-rate').value);
    this.tenure = parseInt(document.getElementById('le-tenure').value);
    this.foirPercent = parseInt(document.getElementById('le-foir').value);

    // Calculate maximum EMI capacity
    const maxEMI = (this.monthlyIncome * this.foirPercent) / 100;
    const availableEMI = maxEMI - this.existingEMI;
    
    // Calculate eligible loan amount using reverse EMI formula
    const monthlyRate = this.interestRate / 12 / 100;
    let eligibleAmount = 0;
    
    if (availableEMI > 0 && monthlyRate > 0) {
      eligibleAmount = availableEMI * (Math.pow(1 + monthlyRate, this.tenure) - 1) / 
                       (monthlyRate * Math.pow(1 + monthlyRate, this.tenure));
    }
    
    // Calculate expected EMI for eligible amount
    const expectedEMI = eligibleAmount * monthlyRate * Math.pow(1 + monthlyRate, this.tenure) / 
                        (Math.pow(1 + monthlyRate, this.tenure) - 1);

    const room = Math.max(0, availableEMI);
    const used = Math.min(this.existingEMI, maxEMI);
    document.getElementById('le-max-emi').textContent = CalculatorUtils.formatCurrency(maxEMI);
    document.getElementById('le-available-emi').textContent = CalculatorUtils.formatCurrency(room);
    this.chart = CalculatorUtils.modernDoughnut(
      this.chart, 'le-chart',
      [used, room],
      'Eligible',
      CalculatorUtils.formatCurrency(Math.max(0, eligibleAmount))
    );
    const tenureSlider = document.getElementById('le-tenure');
    const tenures = CalculatorUtils.ratesInRange(this.tenure, parseFloat(tenureSlider.min), parseFloat(tenureSlider.max), [120, 180, 240]);
    const eligibleFor = (months) => {
      const monthlyRate = this.interestRate / 12 / 100;
      if (room <= 0 || monthlyRate <= 0) return 0;
      return room * (Math.pow(1 + monthlyRate, months) - 1) / (monthlyRate * Math.pow(1 + monthlyRate, months));
    };
    CalculatorUtils.fillCompare('le-compare-list', 'le-compare-lead',
      `${CalculatorUtils.formatCurrency(this.monthlyIncome)} a month at ${this.interestRate}% and ${this.foirPercent}% of income for EMIs.`,
      tenures.map(months => {
        const yours = Math.abs(months - this.tenure) < 0.5;
        return {
          primary: `${months / 12} yr`,
          tag: yours ? 'Your tenure' : '',
          yours,
          figures: [
            { label: 'Eligible', value: CalculatorUtils.formatCurrency(eligibleFor(months)) },
            { label: 'EMI room', value: CalculatorUtils.formatCurrency(room) },
          ],
        };
      })
    );

    // Dynamic tip
    let tip = 'Tip: ';
    if (this.existingEMI > 0) {
      tip += 'Clearing existing loans will increase your eligibility. ';
    }
    if (this.tenure < 240) {
      tip += 'Choosing a longer tenure can increase loan amount. ';
    }
    if (this.foirPercent < 50) {
      tip += 'Some lenders allow higher FOIR for salaried professionals.';
    }
    if (tip === 'Tip: ') {
      tip = 'Tip: Add a co-applicant to combine incomes and increase eligibility.';
    }
    const tipEl = document.getElementById('le-tip');
    if (tipEl) tipEl.textContent = tip;
  }
}

registerCalculator('loan-eligibility', LoanEligibilityCalculator);


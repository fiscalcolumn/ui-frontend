/**
 * Loan Prepayment Calculator
 */

class LoanPrepaymentCalculator {
  constructor(container) {
    this.container = container;
    this.outstanding = 3000000;
    this.interestRate = 8.5;
    this.remainingTenure = 180; // 15 years
    this.prepaymentAmount = 500000;
  }

  render() {
    this.container.innerHTML = `
      <div class="calc-form">
        ${CalculatorUtils.createSlider('lp-outstanding', 'Outstanding Loan Balance', 100000, 10000000, this.outstanding, 50000, '', '₹')}
        ${CalculatorUtils.createSlider('lp-rate', 'Interest Rate', 6, 15, this.interestRate, 0.25, '%', '')}
        ${CalculatorUtils.createSlider('lp-tenure', 'Remaining Tenure', 12, 300, this.remainingTenure, 12, ' months', '')}
        ${CalculatorUtils.createSlider('lp-prepay', 'Prepayment Amount', 10000, 5000000, this.prepaymentAmount, 10000, '', '₹')}
        
        <div style="text-align: center; margin-top: 10px;">
          <button class="calc-btn" id="lp-calculate">
            <i class="fa fa-fast-forward"></i> Calculate Savings
          </button>
        </div>

        <div class="calc-results" id="lp-results" style="display: none;">
          <div class="savings-highlight">
            <div class="savings-icon">💰</div>
            <div class="savings-info">
              <span class="savings-label">You Will Save</span>
              <div class="savings-value" id="lp-savings">₹8,50,000</div>
              <span class="savings-sub">in interest payments</span>
            </div>
          </div>

          <div class="prepay-comparison">
            <div class="comparison-box before">
              <h5>Before Prepayment</h5>
              <div class="comp-row">
                <span>Current EMI</span>
                <strong id="lp-old-emi">₹29,000</strong>
              </div>
              <div class="comp-row">
                <span>Remaining Tenure</span>
                <strong id="lp-old-tenure">180 months</strong>
              </div>
              <div class="comp-row">
                <span>Total Interest</span>
                <strong id="lp-old-interest">₹22,00,000</strong>
              </div>
            </div>
            <div class="comparison-arrow">
              <i class="fa fa-arrow-right"></i>
            </div>
            <div class="comparison-box after">
              <h5>After Prepayment</h5>
              <div class="comp-row">
                <span>Same EMI</span>
                <strong id="lp-new-emi">₹29,000</strong>
              </div>
              <div class="comp-row">
                <span>New Tenure</span>
                <strong id="lp-new-tenure" class="highlight">132 months</strong>
              </div>
              <div class="comp-row">
                <span>Total Interest</span>
                <strong id="lp-new-interest" class="highlight">₹13,50,000</strong>
              </div>
            </div>
          </div>

          <div class="tenure-saved">
            <i class="fa fa-clock-o"></i>
            <span>Tenure Reduced by <strong id="lp-tenure-saved">48 months (4 years)</strong></span>
          </div>
        </div>
      </div>
      <style>
        .savings-highlight {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 20px;
          background: linear-gradient(135deg, #fff8e1, #ffecb3);
          border-radius: 16px;
          padding: 30px;
          margin-bottom: 25px;
        }
        .savings-icon {
          font-size: 3rem;
        }
        .savings-info {
          text-align: left;
        }
        .savings-label {
          display: block;
          font-size: 0.85rem;
          color: #f57c00;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .savings-value {
          font-size: 2.5rem;
          font-weight: 700;
          color: #e65100;
          line-height: 1.2;
        }
        .savings-sub {
          font-size: 0.9rem;
          color: #ff8f00;
        }
        .prepay-comparison {
          display: flex;
          align-items: stretch;
          gap: 15px;
          margin-bottom: 20px;
        }
        .comparison-box {
          flex: 1;
          padding: 20px;
          border-radius: 12px;
        }
        .comparison-box.before {
          background: #ffebee;
          border: 1px solid #ffcdd2;
        }
        .comparison-box.after {
          background: #e8f5e9;
          border: 1px solid #c8e6c9;
        }
        .comparison-box h5 {
          margin: 0 0 15px;
          font-size: 0.9rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .comparison-box.before h5 { color: #c62828; }
        .comparison-box.after h5 { color: #2e7d32; }
        .comp-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          font-size: 0.9rem;
        }
        .comp-row span { color: #666; }
        .comp-row strong { color: #1a1a2e; }
        .comp-row strong.highlight { color: #2e7d32; }
        .comparison-arrow {
          display: flex;
          align-items: center;
          color: #4CAF50;
          font-size: 1.5rem;
        }
        .tenure-saved {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 15px;
          background: #e3f2fd;
          border-radius: 10px;
          color: #1565c0;
          font-size: 1rem;
        }
        .tenure-saved strong {
          color: #0d47a1;
        }
        .dark-mode .savings-highlight {
          background: linear-gradient(135deg, rgba(255, 152, 0, 0.15), rgba(255, 152, 0, 0.25));
        }
        .dark-mode .savings-label,
        .dark-mode .savings-sub {
          color: #ffb74d;
        }
        .dark-mode .savings-value {
          color: #ffa726;
        }
        .dark-mode .comparison-box.before {
          background: rgba(198, 40, 40, 0.1);
          border-color: rgba(198, 40, 40, 0.3);
        }
        .dark-mode .comparison-box.after {
          background: rgba(46, 125, 50, 0.1);
          border-color: rgba(46, 125, 50, 0.3);
        }
        .dark-mode .comparison-box h5 {
          color: inherit;
        }
        .dark-mode .comparison-box.before h5 { color: #ef5350; }
        .dark-mode .comparison-box.after h5 { color: #66bb6a; }
        .dark-mode .comp-row span { color: var(--text-secondary); }
        .dark-mode .comp-row strong { color: var(--text-primary); }
        .dark-mode .comp-row strong.highlight { color: #66bb6a; }
        .dark-mode .tenure-saved {
          background: rgba(25, 118, 210, 0.15);
        }
        .dark-mode .tenure-saved,
        .dark-mode .tenure-saved strong {
          color: #64b5f6;
        }
        @media (max-width: 768px) {
          .prepay-comparison {
            flex-direction: column;
          }
          .comparison-arrow {
            transform: rotate(90deg);
            justify-content: center;
          }
        }
      </style>
    `;
    this.bindEvents();
    this.calculate();
  }

  bindEvents() {
    this.mount();
    CalculatorUtils.bindModern([
      { id: 'lp-outstanding', display: (n) => CalculatorUtils.formatIndianNumber(n), end: CalculatorUtils.moneyEnd },
      { id: 'lp-rate', display: (n) => n.toFixed(2), end: (n) => `${n}%` },
      { id: 'lp-tenure', display: (n) => String(n), end: (n) => `${n} months` },
      { id: 'lp-prepay', display: (n) => CalculatorUtils.formatIndianNumber(n), end: CalculatorUtils.moneyEnd },
    ], () => this.calculate(), () => this.chart);
  }

  mount() {
    CalculatorUtils.adoptModern(this.container, {
      hint: 'The EMI stays the same. The prepayment shortens how long you keep paying.',
      tiles: [
        { id: 'lp-old-interest', label: 'Interest before' },
        { id: 'lp-new-interest', label: 'Interest after' },
      ],
      canvasId: 'lp-chart',
      legend: ['Interest saved', 'Interest still due'],
      compareTitle: 'Before and after this prepayment',
      leadId: 'lp-compare-lead',
      listId: 'lp-compare-list',
    });
  }

  calculate() {
    this.outstanding = parseFloat(document.getElementById('lp-outstanding').value);
    this.interestRate = parseFloat(document.getElementById('lp-rate').value);
    this.remainingTenure = parseInt(document.getElementById('lp-tenure').value);
    this.prepaymentAmount = parseFloat(document.getElementById('lp-prepay').value);

    const monthlyRate = this.interestRate / 12 / 100;
    
    // Current EMI calculation
    const currentEMI = this.outstanding * monthlyRate * Math.pow(1 + monthlyRate, this.remainingTenure) / 
                       (Math.pow(1 + monthlyRate, this.remainingTenure) - 1);
    
    const oldTotalPayment = currentEMI * this.remainingTenure;
    const oldTotalInterest = oldTotalPayment - this.outstanding;
    
    // After prepayment - new principal
    const newPrincipal = this.outstanding - this.prepaymentAmount;
    
    // Keep same EMI, calculate new tenure
    // n = -log(1 - P*r/EMI) / log(1+r)
    let newTenure = 0;
    if (newPrincipal > 0 && currentEMI > newPrincipal * monthlyRate) {
      newTenure = Math.ceil(
        -Math.log(1 - (newPrincipal * monthlyRate) / currentEMI) / Math.log(1 + monthlyRate)
      );
    }
    
    const newTotalPayment = currentEMI * newTenure;
    const newTotalInterest = newTotalPayment - newPrincipal;
    
    const interestSaved = oldTotalInterest - newTotalInterest;
    const tenureSaved = this.remainingTenure - newTenure;
    const yearsSaved = Math.floor(tenureSaved / 12);
    const monthsSaved = tenureSaved % 12;

    const saved = Math.max(0, interestSaved);
    const stillDue = Math.max(0, newTotalInterest);
    document.getElementById('lp-old-interest').textContent = CalculatorUtils.formatCurrency(oldTotalInterest);
    document.getElementById('lp-new-interest').textContent = CalculatorUtils.formatCurrency(stillDue);
    this.chart = CalculatorUtils.modernDoughnut(this.chart, 'lp-chart', [saved, stillDue], 'Saved', CalculatorUtils.formatCurrency(saved));
    let tenureSavedText = `${tenureSaved} months`;
    if (yearsSaved > 0) {
      tenureSavedText = `${yearsSaved} year${yearsSaved > 1 ? 's' : ''}${monthsSaved > 0 ? ` ${monthsSaved} months` : ''}`;
    }
    CalculatorUtils.fillCompare('lp-compare-list', 'lp-compare-lead',
      `Paying ${CalculatorUtils.formatCurrency(this.prepaymentAmount)} now. Tenure drops by ${tenureSavedText}.`,
      [
        {
          primary: 'Before',
          figures: [
            { label: 'EMI', value: CalculatorUtils.formatCurrency(currentEMI) },
            { label: 'Tenure', value: `${this.remainingTenure} mo` },
          ],
        },
        {
          primary: 'After',
          tag: 'This plan',
          yours: true,
          figures: [
            { label: 'EMI', value: CalculatorUtils.formatCurrency(currentEMI) },
            { label: 'Tenure', value: `${newTenure} mo` },
          ],
        },
      ]
    );
  }
}

registerCalculator('loan-prepayment', LoanPrepaymentCalculator);


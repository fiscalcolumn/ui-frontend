/**
 * Rent vs Buy Calculator — India
 * Helps decide whether renting or buying a home is financially better
 */
class RentVsBuyCalculator {
  constructor(container) {
    this.container = container;
    this.homePrice = 8000000;
    this.downPayment = 20;
    this.loanRate = 8.5;
    this.loanTenure = 20;
    this.monthlyRent = 25000;
    this.rentGrowth = 8;
    this.propertyGrowth = 7;
    this.investmentReturn = 12;
    this.years = 15;
    this.chart = null;
  }

  render() {
    this.container.innerHTML = `
      <div class="calc-form">
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:10px;">
          <div>
            <h4 style="font-size:0.9rem; font-weight:700; color:#1565c0; margin-bottom:12px; padding-bottom:6px; border-bottom:2px solid #1565c020;">🏠 Buying Scenario</h4>
            ${CalculatorUtils.createSlider('rvb-price', 'Home Price (₹)', 1000000, 50000000, this.homePrice, 100000, '', '₹')}
            ${CalculatorUtils.createSlider('rvb-down', 'Down Payment (%)', 5, 50, this.downPayment, 1, '%', '')}
            ${CalculatorUtils.createSlider('rvb-rate', 'Home Loan Rate (%)', 6, 15, this.loanRate, 0.25, '%', '')}
            ${CalculatorUtils.createSlider('rvb-tenure', 'Loan Tenure (years)', 5, 30, this.loanTenure, 1, ' yrs', '')}
            ${CalculatorUtils.createSlider('rvb-growth', 'Property Appreciation (%)', 0, 15, this.propertyGrowth, 0.5, '%', '')}
          </div>
          <div>
            <h4 style="font-size:0.9rem; font-weight:700; color:#c62828; margin-bottom:12px; padding-bottom:6px; border-bottom:2px solid #c6282820;">🏢 Renting Scenario</h4>
            ${CalculatorUtils.createSlider('rvb-rent', 'Monthly Rent (₹)', 5000, 200000, this.monthlyRent, 1000, '', '₹')}
            ${CalculatorUtils.createSlider('rvb-rent-growth', 'Annual Rent Increase (%)', 0, 15, this.rentGrowth, 0.5, '%', '')}
            ${CalculatorUtils.createSlider('rvb-invest-return', 'Investment Return (p.a. %)', 6, 20, this.investmentReturn, 0.5, '%', '')}
          </div>
        </div>

        ${CalculatorUtils.createSlider('rvb-years', 'Comparison Period (years)', 5, 30, this.years, 1, ' years', '')}

        <div style="text-align:center; margin-top:10px;">
          <button class="calc-btn" id="rvb-calculate">
            <i class="fa fa-balance-scale"></i> Compare Rent vs Buy
          </button>
        </div>

        <div class="calc-results" id="rvb-results" style="display:none;">
          <div id="rvb-verdict" style="margin-bottom:16px;"></div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:14px;">
            <div style="background:#e3f2fd; border-radius:10px; padding:14px;">
              <h4 style="font-size:0.85rem; font-weight:700; color:#1565c0; margin-bottom:10px;">🏠 Buying Costs</h4>
              <div id="rvb-buy-details" style="font-size:0.82rem;"></div>
              <div class="calc-result-box" style="border-color:#1565c0; margin-top:10px;">
                <div class="calc-result-label">Net Worth After ${this.years} Years</div>
                <div class="calc-result-value" id="rvb-buy-networth" style="color:#1565c0">₹0</div>
              </div>
            </div>
            <div style="background:#ffebee; border-radius:10px; padding:14px;">
              <h4 style="font-size:0.85rem; font-weight:700; color:#c62828; margin-bottom:10px;">🏢 Renting Costs</h4>
              <div id="rvb-rent-details" style="font-size:0.82rem;"></div>
              <div class="calc-result-box" style="border-color:#c62828; margin-top:10px;">
                <div class="calc-result-label">Net Worth After ${this.years} Years</div>
                <div class="calc-result-value" id="rvb-rent-networth" style="color:#c62828">₹0</div>
              </div>
            </div>
          </div>

          <div class="calc-chart-container">
            <h5 class="calc-chart-title">Net Worth Comparison Over Time</h5>
            <div class="calc-chart-wrapper"><canvas id="rvb-chart"></canvas></div>
          </div>
        </div>
      </div>
    `;
    this.bindEvents();
    this.calculate();
  }

  mount() {
    document.querySelector('.calculator-page-container')?.classList.add('calc-rvb');
    CalculatorUtils.adoptModern(this.container, {
      hint: 'Buying keeps the home and the loan. Renting invests the down payment and whatever is left after rent, each month, at the return you chose.',
      tiles: [
        { id: 'rvb-buy-networth', label: 'If you buy' },
        { id: 'rvb-rent-networth', label: 'If you rent' },
      ],
      canvasId: 'rvb-chart',
      legend: ['Buying', 'Renting'],
      compareTitle: 'Wealth after these years',
      leadId: 'rvb-compare-lead',
      listId: 'rvb-compare-list',
    });
    this.layoutBoard();
  }

  layoutBoard() {
    const form = this.container.querySelector('.sip-form');
    if (!form || form.querySelector('.rvb-board')) return;
    const rentInput = document.getElementById('rvb-rent');
    const buyInput = document.getElementById('rvb-price');
    const summary = form.querySelector('.sip-summary-card');
    const compare = form.querySelector('.sip-compare');
    if (!rentInput || !buyInput || !summary || !compare) return;

    const rentCol = rentInput.closest('.calc-input-compact').parentElement;
    const buyCol = buyInput.closest('.calc-input-compact').parentElement;
    const rentTitle = rentCol.querySelector('h4');
    const buyTitle = buyCol.querySelector('h4');
    if (rentTitle) rentTitle.textContent = 'Rent scenario';
    if (buyTitle) buyTitle.textContent = 'Buy scenario';

    const rentCard = document.createElement('section');
    rentCard.className = 'rvb-card';
    rentCard.appendChild(rentCol);

    const buyCard = document.createElement('section');
    buyCard.className = 'rvb-card';
    buyCard.appendChild(buyCol);

    const resultTitle = document.createElement('h2');
    resultTitle.className = 'sip-compare-title';
    resultTitle.textContent = 'Result';
    summary.prepend(resultTitle);
    summary.classList.add('rvb-output');

    const years = document.getElementById('rvb-years-group');
    const wealthTitle = compare.querySelector('.sip-compare-title');
    if (years && wealthTitle) wealthTitle.after(years);

    const hint = form.querySelector('.sip-hint');
    const note = document.createElement('p');
    note.className = 'rvb-note';
    note.textContent = hint ? hint.textContent : '';

    const board = document.createElement('div');
    board.className = 'rvb-board';
    board.append(rentCard, buyCard, summary, compare);
    if (note.textContent) board.appendChild(note);
    form.replaceChildren(board);
  }

  bindEvents() {
    const map = [
      ['rvb-price','homePrice'], ['rvb-down','downPayment'], ['rvb-rate','loanRate'],
      ['rvb-tenure','loanTenure'], ['rvb-growth','propertyGrowth'],
      ['rvb-rent','monthlyRent'], ['rvb-rent-growth','rentGrowth'],
      ['rvb-invest-return','investmentReturn'], ['rvb-years','years'],
    ];
    map.forEach(([id, field]) => {
      document.getElementById(id).addEventListener('input', e => {
        this[field] = parseFloat(e.target.value) || 0;
        document.getElementById(`${id}-value`).textContent = CalculatorUtils.formatIndianNumber(this[field]);
        CalculatorUtils.updateSliderProgress(e.target);
      });
      document.getElementById(id).addEventListener('change', () => this.calculate());
    });
    this.mount();
    CalculatorUtils.bindModern([
      { id: 'rvb-price', display: (n) => CalculatorUtils.formatIndianNumber(n), end: CalculatorUtils.moneyEnd },
      { id: 'rvb-down', display: (n) => String(n), end: (n) => n + '%' },
      { id: 'rvb-rate', display: (n) => n.toFixed(2), end: (n) => n + '%' },
      { id: 'rvb-tenure', display: (n) => String(n), end: (n) => n + ' yr' },
      { id: 'rvb-growth', display: (n) => n.toFixed(1), end: (n) => n + '%' },
      { id: 'rvb-rent', display: (n) => CalculatorUtils.formatIndianNumber(n), end: CalculatorUtils.moneyEnd },
      { id: 'rvb-rent-growth', display: (n) => n.toFixed(1), end: (n) => n + '%' },
      { id: 'rvb-invest-return', display: (n) => n.toFixed(1), end: (n) => n + '%' },
      { id: 'rvb-years', display: (n) => String(n), end: (n) => n + ' yr' },
    ], () => this.calculate(), () => this.chart);
    setTimeout(() => CalculatorUtils.initSliderProgress(), 50);
  }

  calculate() {
    const T = this.years;
    const price = this.homePrice;
    const downAmt = price * this.downPayment / 100;
    const loanAmt = price - downAmt;
    const monthlyRate = this.loanRate / 100 / 12;
    const loanMonths = this.loanTenure * 12;
    const emi = CalculatorUtils.calculateEMI(loanAmt, monthlyRate, loanMonths);

    // -- Buying scenario --
    const futurePropertyValue = price * Math.pow(1 + this.propertyGrowth / 100, T);
    let outstandingLoan = loanAmt;
    let totalInterestPaid = 0;
    let totalEmiPaid = 0;
    const buyNetWorthByYear = [];

    for (let y = 1; y <= T; y++) {
      for (let m = 0; m < 12; m++) {
        const interest = outstandingLoan * monthlyRate;
        const principal = Math.min(emi - interest, outstandingLoan);
        outstandingLoan = Math.max(0, outstandingLoan - principal);
        totalInterestPaid += interest;
        totalEmiPaid += emi;
        if (outstandingLoan <= 0) break;
      }
      const pvFuture = price * Math.pow(1 + this.propertyGrowth / 100, y);
      buyNetWorthByYear.push(pvFuture - Math.max(0, outstandingLoan));
    }

    const buyNetWorth = futurePropertyValue - Math.max(0, outstandingLoan);

    // -- Renting scenario — invest the difference --
    const invRate = this.investmentReturn / 100 / 12;
    let rentInvestmentValue = 0;
    const rentNetWorthByYear = [];
    let monthlyRentNow = this.monthlyRent;
    let totalRentPaid = 0;

    for (let y = 1; y <= T; y++) {
      for (let m = 0; m < 12; m++) {
        // Monthly saving = EMI + maintenance (~0.5% annual of property/12) - rent
        const maintenance = price * 0.005 / 12;
        const monthlyEmiWithMaint = emi + maintenance;
        const saving = Math.max(0, monthlyEmiWithMaint - monthlyRentNow);
        rentInvestmentValue = (rentInvestmentValue + saving + (y === 1 && m === 0 ? downAmt : 0)) * (1 + invRate);
        totalRentPaid += monthlyRentNow;
      }
      rentNetWorthByYear.push(rentInvestmentValue);
      monthlyRentNow *= (1 + this.rentGrowth / 100);
    }

    const diff = buyNetWorth - rentInvestmentValue;
    const buyWins = diff > 0;

    document.getElementById('rvb-buy-networth').textContent = CalculatorUtils.formatCurrency(buyNetWorth);
    document.getElementById('rvb-rent-networth').textContent = CalculatorUtils.formatCurrency(rentInvestmentValue);
    const tied = Math.abs(diff) < 1;
    const ahead = tied ? 'They come out about the same' : (buyWins ? 'Buying' : 'Renting') + ' is ahead by ' + CalculatorUtils.formatCurrency(Math.abs(diff));
    this.chart = CalculatorUtils.modernDoughnut(
      this.chart, 'rvb-chart',
      [Math.max(0, buyNetWorth), Math.max(0, rentInvestmentValue)],
      'Ahead',
      CalculatorUtils.formatCurrency(Math.abs(diff))
    );
    CalculatorUtils.fillCompare('rvb-compare-list', 'rvb-compare-lead',
      ahead + ' after ' + T + ' years. EMI is ' + CalculatorUtils.formatCurrency(emi) + ' and the down payment is ' + CalculatorUtils.formatCurrency(downAmt) + '.',
      [
        {
          primary: 'Buy',
          tag: !tied && buyWins ? 'Ahead' : '',
          yours: !tied && buyWins,
          figures: [
            { label: 'Wealth', value: CalculatorUtils.formatCurrency(buyNetWorth) },
            { label: 'EMI', value: CalculatorUtils.formatCurrency(emi) },
          ],
        },
        {
          primary: 'Rent',
          tag: !tied && !buyWins ? 'Ahead' : '',
          yours: !tied && !buyWins,
          figures: [
            { label: 'Wealth', value: CalculatorUtils.formatCurrency(rentInvestmentValue) },
            { label: 'Rent paid', value: CalculatorUtils.formatCurrency(totalRentPaid) },
          ],
        },
      ]
    );
    return;

    document.getElementById('rvb-verdict').innerHTML = `
      <div style="background:${buyWins ? '#e8f5e9' : '#fff8e1'}; border-radius:10px; padding:14px 18px; border-left:4px solid ${buyWins ? '#4caf50' : '#ff9800'}; font-size:0.9rem;">
        <strong>${buyWins ? '🏠 Buying is better' : '🏢 Renting is better'}</strong> over ${T} years in this scenario.
        ${buyWins
          ? `<br>Buying creates <strong>${CalculatorUtils.formatCurrency(Math.abs(diff))}</strong> more wealth than renting.`
          : `<br>Renting and investing the savings creates <strong>${CalculatorUtils.formatCurrency(Math.abs(diff))}</strong> more wealth than buying.`}
        <br><em style="color:#888; font-size:0.8rem;">This is an estimate. Actual results depend on location, market conditions, and personal tax situation.</em>
      </div>
    `;

    document.getElementById('rvb-buy-details').innerHTML = `
      Down Payment: <strong>${CalculatorUtils.formatCurrency(downAmt)}</strong><br>
      Monthly EMI: <strong>${CalculatorUtils.formatCurrency(emi)}</strong><br>
      Total EMI Paid: <strong>${CalculatorUtils.formatCurrency(totalEmiPaid)}</strong><br>
      Property Value in ${T} yrs: <strong>${CalculatorUtils.formatCurrency(futurePropertyValue)}</strong>
    `;

    document.getElementById('rvb-rent-details').innerHTML = `
      Starting Rent: <strong>${CalculatorUtils.formatCurrency(this.monthlyRent)}</strong>/month<br>
      Total Rent Paid: <strong>${CalculatorUtils.formatCurrency(totalRentPaid)}</strong><br>
      Investment Corpus: <strong>${CalculatorUtils.formatCurrency(rentInvestmentValue)}</strong><br>
      (Down payment + monthly savings invested @ ${this.investmentReturn}%)
    `;

    this.renderChart(buyNetWorthByYear, rentNetWorthByYear, T);
  }

  renderChart(buyData, rentData, years) {
    const ctx = document.getElementById('rvb-chart').getContext('2d');
    if (this.chart) this.chart.destroy();
    const labels = Array.from({ length: years }, (_, i) => `Yr ${i + 1}`);

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Buy — Net Worth',
            data: buyData,
            borderColor: '#1565c0',
            backgroundColor: 'rgba(21,101,192,0.07)',
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: 2,
          },
          {
            label: 'Rent — Investment Value',
            data: rentData,
            borderColor: '#c62828',
            backgroundColor: 'rgba(198,40,40,0.07)',
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: 'bottom' },
          tooltip: {
            callbacks: { label: c => `${c.dataset.label}: ${CalculatorUtils.formatCurrency(c.raw)}` },
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10 } } },
          y: {
            ticks: { font: { size: 10 }, callback: v => CalculatorUtils.formatChartAxis(v) },
            grid: { color: 'rgba(0,0,0,0.05)' },
          },
        },
      },
    });
  }
}

registerCalculator('rent-vs-buy', RentVsBuyCalculator);

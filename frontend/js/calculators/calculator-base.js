/**
 * Calculator Base Utilities
 * Shared functions for all calculators
 */

const CalculatorUtils = {
  /**
   * Format number as Indian currency
   * Handles very large numbers (crores, arab, kharab)
   */
  formatCurrency(num, decimals = 0) {
    if (isNaN(num) || num === null || num === undefined) return '₹0';
    if (!isFinite(num)) return '₹∞';
    
    // Handle very large numbers with abbreviations
    if (Math.abs(num) >= 1e12) {
      return '₹' + (num / 1e12).toFixed(2) + ' Kharab';
    }
    if (Math.abs(num) >= 1e9) {
      return '₹' + (num / 1e9).toFixed(2) + ' Arab';
    }
    if (Math.abs(num) >= 1e7) {
      return '₹' + (num / 1e7).toFixed(2) + ' Cr';
    }
    if (Math.abs(num) >= 1e5) {
      return '₹' + (num / 1e5).toFixed(2) + ' L';
    }
    
    const formatted = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(num);
    return formatted;
  },

  /**
   * Format number with Indian number system (lakhs, crores)
   * Handles very large numbers
   */
  formatIndianNumber(num, decimals = 0) {
    if (isNaN(num) || num === null || num === undefined) return '0';
    if (!isFinite(num)) return '∞';
    
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(num);
  },
  
  /**
   * Format large number with abbreviation (L, Cr, Arab)
   */
  formatLargeNumber(num) {
    if (isNaN(num) || !isFinite(num)) return '0';
    
    if (Math.abs(num) >= 1e12) {
      return (num / 1e12).toFixed(2) + ' Kharab';
    }
    if (Math.abs(num) >= 1e9) {
      return (num / 1e9).toFixed(2) + ' Arab';
    }
    if (Math.abs(num) >= 1e7) {
      return (num / 1e7).toFixed(2) + ' Cr';
    }
    if (Math.abs(num) >= 1e5) {
      return (num / 1e5).toFixed(2) + ' L';
    }
    if (Math.abs(num) >= 1e3) {
      return (num / 1e3).toFixed(2) + ' K';
    }
    return num.toFixed(0);
  },

  /**
   * Format number for chart axis (shorter format)
   */
  formatChartAxis(value) {
    if (isNaN(value) || !isFinite(value)) return '₹0';
    
    if (value >= 1e12) return `₹${(value / 1e12).toFixed(1)}Kh`;
    if (value >= 1e9) return `₹${(value / 1e9).toFixed(1)}Ar`;
    if (value >= 1e7) return `₹${(value / 1e7).toFixed(1)}Cr`;
    if (value >= 1e5) return `₹${(value / 1e5).toFixed(1)}L`;
    if (value >= 1e3) return `₹${(value / 1e3).toFixed(0)}K`;
    return `₹${value}`;
  },

  /**
   * Format number as percentage
   */
  formatPercent(num, decimals = 1) {
    if (isNaN(num)) return '0%';
    return num.toFixed(decimals) + '%';
  },

  /**
   * Parse currency string to number
   */
  parseCurrency(str) {
    if (typeof str === 'number') return str;
    return parseFloat(str.replace(/[₹,]/g, '')) || 0;
  },

  /**
   * Calculate compound interest
   * P = Principal, r = rate (decimal), n = compounding frequency, t = time in years
   * Uses logarithmic calculation for very large exponents to prevent overflow
   */
  compoundInterest(P, r, n, t) {
    if (P <= 0 || t <= 0) return P;
    if (r <= 0) return P;
    
    const exponent = n * t;
    const base = 1 + r / n;
    
    // For very large exponents, use log-based calculation
    if (exponent > 1000) {
      const logResult = Math.log(P) + exponent * Math.log(base);
      if (logResult > 700) return Infinity; // Would overflow
      return Math.exp(logResult);
    }
    
    return P * Math.pow(base, exponent);
  },

  /**
   * Calculate SIP future value
   * P = monthly investment, r = monthly rate, n = total months
   * Handles large periods safely
   */
  sipFutureValue(P, r, n) {
    if (P <= 0 || n <= 0) return 0;
    if (r === 0 || r <= 0) return P * n;
    
    // For very long periods, use iterative approach to avoid overflow
    if (n > 600) {
      // Use logarithmic approach
      const growthFactor = Math.pow(1 + r, n);
      if (!isFinite(growthFactor)) {
        // Calculate in chunks for very long periods
        let total = 0;
        const chunkSize = 120; // 10 years
        for (let i = 0; i < n; i += chunkSize) {
          const months = Math.min(chunkSize, n - i);
          const remaining = n - i - months;
          const chunkValue = P * ((Math.pow(1 + r, months) - 1) / r) * (1 + r);
          total += chunkValue * Math.pow(1 + r, remaining);
        }
        return total;
      }
      return P * ((growthFactor - 1) / r) * (1 + r);
    }
    
    return P * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
  },

  /**
   * Calculate EMI
   * P = Principal, r = monthly rate, n = total months
   */
  calculateEMI(P, r, n) {
    if (r === 0) return P / n;
    return P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
  },

  /**
   * Calculate BMI
   */
  calculateBMI(weightKg, heightCm) {
    const heightM = heightCm / 100;
    return weightKg / (heightM * heightM);
  },

  /**
   * Get BMI category
   */
  getBMICategory(bmi) {
    if (bmi < 18.5) return { category: 'Underweight', color: '#3498db' };
    if (bmi < 25) return { category: 'Normal', color: '#27ae60' };
    if (bmi < 30) return { category: 'Overweight', color: '#f39c12' };
    return { category: 'Obese', color: '#e74c3c' };
  },

  /**
   * Calculate BMR using Mifflin-St Jeor formula
   */
  calculateBMR(weightKg, heightCm, age, gender) {
    const base = (10 * weightKg) + (6.25 * heightCm) - (5 * age);
    return gender === 'male' ? base + 5 : base - 161;
  },

  /**
   * Calculate calories burned walking
   * MET values: slow (2.0), moderate (3.0), brisk (3.5), fast (4.3), very fast (5.0)
   */
  calculateWalkingCalories(weightKg, distanceKm, speedKmh) {
    let met = 3.0; // default moderate
    if (speedKmh < 3.5) met = 2.0;
    else if (speedKmh < 4.5) met = 3.0;
    else if (speedKmh < 5.5) met = 3.5;
    else if (speedKmh < 6.5) met = 4.3;
    else met = 5.0;
    
    const durationHours = distanceKm / speedKmh;
    return met * weightKg * durationHours;
  },

  /**
   * Create a range slider input with value display (compact version)
   */
  createSlider(id, label, min, max, value, step, unit = '', prefix = '') {
    const fmtMin = this.formatIndianNumber(min);
    const fmtMax = this.formatIndianNumber(max);
    return `
      <div class="calc-input-group calc-input-compact" id="${id}-group">
        <div class="calc-input-header">
          <label for="${id}">${label}</label>
          <div class="calc-slider-value-inline" id="${id}-chip" title="Click to type a value">
            <span class="prefix">${prefix}</span><span id="${id}-value" contenteditable="true" inputmode="decimal" spellcheck="false" data-min="${min}" data-max="${max}" data-step="${step}">${this.formatIndianNumber(value)}</span><span class="unit">${unit}</span>
          </div>
        </div>
        <input type="range" id="${id}" class="calc-slider"
               min="${min}" max="${max}" value="${value}" step="${step}">
        <div class="calc-field-error" id="${id}-error">
          Enter a value between ${prefix}${fmtMin}${unit} and ${prefix}${fmtMax}${unit}
        </div>
      </div>
    `;
  },

  /**
   * Create a number input field
   */
  createNumberInput(id, label, value, placeholder = '', unit = '') {
    return `
      <div class="calc-input-group">
        <label for="${id}">${label}</label>
        <div class="calc-input-wrapper">
          <input type="number" id="${id}" class="calc-input" 
                 value="${value}" placeholder="${placeholder}">
          ${unit ? `<span class="calc-input-unit">${unit}</span>` : ''}
        </div>
      </div>
    `;
  },

  /**
   * Create a select dropdown
   */
  createSelect(id, label, options, selected = '') {
    const optionsHtml = options.map(opt => 
      `<option value="${opt.value}" ${opt.value === selected ? 'selected' : ''}>${opt.label}</option>`
    ).join('');
    
    return `
      <div class="calc-input-group">
        <label for="${id}">${label}</label>
        <select id="${id}" class="calc-select">${optionsHtml}</select>
      </div>
    `;
  },

  /**
   * Create radio button group
   */
  createRadioGroup(name, label, options, selected = '') {
    const optionsHtml = options.map(opt => `
      <label class="calc-radio-label">
        <input type="radio" name="${name}" value="${opt.value}" 
               ${opt.value === selected ? 'checked' : ''}>
        <span>${opt.label}</span>
      </label>
    `).join('');
    
    return `
      <div class="calc-input-group">
        <label>${label}</label>
        <div class="calc-radio-group">${optionsHtml}</div>
      </div>
    `;
  },

  /**
   * Create result display box
   */
  createResultBox(label, value, color = '#205b7a', sublabel = '') {
    return `
      <div class="calc-result-box" style="border-color: ${color}">
        <div class="calc-result-label">${label}</div>
        <div class="calc-result-value" style="color: ${color}">${value}</div>
        ${sublabel ? `<div class="calc-result-sublabel">${sublabel}</div>` : ''}
      </div>
    `;
  },

  /**
   * Animate number from 0 to target
   */
  animateValue(elementId, start, end, duration = 500) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const startTime = performance.now();
    const update = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const current = start + (end - start) * progress;
      element.textContent = this.formatIndianNumber(Math.round(current));
      if (progress < 1) {
        requestAnimationFrame(update);
      }
    };
    requestAnimationFrame(update);
  },

  /**
   * Update slider track progress color
   */
  updateSliderProgress(slider) {
    const min = parseFloat(slider.min);
    const max = parseFloat(slider.max);
    const val = parseFloat(slider.value);
    const percent = ((val - min) / (max - min)) * 100;
    const isDark = document.body.classList.contains('dark-mode');
    const trackColor = isDark ? '#30363D' : '#cfdee9';
    slider.style.background = `linear-gradient(to right, #205b7a ${percent}%, ${trackColor} ${percent}%)`;
  },

  /**
   * Initialize all sliders on the page to show progress.
   * Also wires up the contenteditable value box so users can type precise values.
   */
  initSliderProgress() {
    document.querySelectorAll('.calc-slider').forEach(slider => {
      this.updateSliderProgress(slider);
      slider.addEventListener('input', () => this.updateSliderProgress(slider));

      // Wire up the editable value span → slider sync
      const valueSpan = document.getElementById(slider.id + '-value');
      if (!valueSpan || valueSpan.contentEditable !== 'true') return;

      // Clicking anywhere in the wrapper (padding included) focuses the span
      const wrapper = valueSpan.closest('.calc-slider-value-inline');
      if (wrapper) {
        wrapper.addEventListener('click', () => valueSpan.focus());
      }

      // Select all text when focused for easy overtyping
      valueSpan.addEventListener('focus', () => {
        requestAnimationFrame(() => {
          const range = document.createRange();
          range.selectNodeContents(valueSpan);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        });
      });

      // Only allow numeric input and control keys
      valueSpan.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); valueSpan.blur(); return; }
        if (e.key === 'Escape') { valueSpan.blur(); return; }
        // Allow: digits, dot, backspace, delete, arrows, tab, home, end
        const allowed = /^[0-9.]$/.test(e.key) ||
          ['Backspace','Delete','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Tab','Home','End'].includes(e.key) ||
          (e.ctrlKey || e.metaKey); // allow ctrl/cmd shortcuts
        if (!allowed) e.preventDefault();
      });

      // On blur, parse value, validate, update slider + fire recalc
      valueSpan.addEventListener('blur', () => {
        const raw = valueSpan.textContent.replace(/[^0-9.]/g, '');
        let val = parseFloat(raw);
        if (isNaN(val)) { val = parseFloat(slider.value); }

        const min   = parseFloat(slider.min);
        const max   = parseFloat(slider.max);
        const chip  = document.getElementById(slider.id + '-chip');
        const error = document.getElementById(slider.id + '-error');

        // Allow any typed value — only clamp the SLIDER position (not the displayed value)
        // Show an inline error if out of range, but still calculate with clamped value.
        const clamped = Math.min(max, Math.max(min, val));
        const outOfRange = val < min || val > max;

        if (error) {
          error.classList.toggle('visible', outOfRange);
        }
        if (chip) {
          chip.classList.toggle('has-error', outOfRange);
        }

        // Display the typed value exactly, update the slider to the nearest valid position
        valueSpan.textContent = this.formatIndianNumber(val);
        slider.value = clamped;
        this.updateSliderProgress(slider);

        // Fire events so the calculator recalculates with the clamped value
        slider.dispatchEvent(new Event('input', { bubbles: true }));
        slider.dispatchEvent(new Event('change', { bubbles: true }));
      });

      // Clear error as soon as user starts typing again
      valueSpan.addEventListener('focus', () => {
        const chip  = document.getElementById(slider.id + '-chip');
        const error = document.getElementById(slider.id + '-error');
        if (chip)  chip.classList.remove('has-error');
        if (error) error.classList.remove('visible');
      });
    });

    // Re-sync slider colors when dark mode toggles
    const observer = new MutationObserver(() => {
      document.querySelectorAll('.calc-slider').forEach(s => this.updateSliderProgress(s));
    });
    observer.observe(document.body, { attributeFilter: ['class'] });
  }
};

// ── Doughnut Center-Text Plugin ───────────────────────────────────
// Registered globally so it's available for all calculator charts
if (typeof Chart !== 'undefined') {
  Chart.register({
    id: 'doughnutCenterText',
    afterDraw(chart) {
      const opts = chart.config?.options?.plugins?.doughnutCenterText;
      if (!opts?.display) return;
      const { ctx, chartArea } = chart;
      if (!chartArea) return;
      const cx = (chartArea.left + chartArea.right) / 2;
      const cy = (chartArea.top + chartArea.bottom) / 2;
      ctx.save();
      // Small label above center
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.font = '500 11px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = opts.labelColor || '#6b8fa4';
      ctx.fillText(opts.label || '', cx, cy);
      // Bold value below center
      ctx.textBaseline = 'top';
      ctx.font = `bold ${opts.valueFontSize || 17}px system-ui, -apple-system, sans-serif`;
      ctx.fillStyle = opts.valueColor || '#1a3545';
      ctx.fillText(opts.value || '', cx, cy + 4);
      ctx.restore();
    }
  });
}

// ── Shared Doughnut Chart Factory ─────────────────────────────────
// Creates a styled donut with center text + static legend below
CalculatorUtils.createDoughnutChart = function(canvasId, legendContainerId, { labels, values, colors, centerLabel, centerValue }) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');

  const chart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderWidth: 3,
        borderColor: document.body.classList.contains('dark-mode') ? '#161B22' : '#fff',
        hoverOffset: 0,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      animation: { animateRotate: true, duration: 600 },
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
        doughnutCenterText: {
          display: true,
          label: centerLabel || 'Total',
          value: centerValue || '',
          labelColor: '#6b8fa4',
          valueColor: document.body.classList.contains('dark-mode') ? '#C9D1D9' : '#1a3545',
        }
      }
    }
  });

  // Render static legend
  const legendEl = document.getElementById(legendContainerId);
  if (legendEl) {
    legendEl.innerHTML = labels.map((label, i) => `
      <div class="donut-legend-item">
        <span class="donut-legend-dot" style="background:${colors[i]}"></span>
        <div class="donut-legend-info">
          <span class="donut-legend-name">${label}</span>
          <span class="donut-legend-val">${CalculatorUtils.formatCurrency(values[i])}</span>
        </div>
      </div>
    `).join('');
  }

  return chart;
};

// Calculator registry - maps calculatorType to calculator class
const CalculatorRegistry = {};

/**
 * Register a calculator
 */
function registerCalculator(type, calculatorClass) {
  CalculatorRegistry[type] = calculatorClass;
}

/**
 * Get calculator by type
 */
function getCalculator(type) {
  return CalculatorRegistry[type] || null;
}


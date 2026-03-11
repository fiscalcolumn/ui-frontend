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
    return `
      <div class="calc-input-group calc-input-compact">
        <div class="calc-input-header">
          <label for="${id}">${label}</label>
          <div class="calc-slider-value-inline">
            <span class="prefix">${prefix}</span><span id="${id}-value">${this.formatIndianNumber(value)}</span><span class="unit">${unit}</span>
          </div>
        </div>
        <input type="range" id="${id}" class="calc-slider" 
               min="${min}" max="${max}" value="${value}" step="${step}">
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
  createResultBox(label, value, color = '#14bdee', sublabel = '') {
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
    const trackColor = isDark ? '#3a3a4a' : '#e0e0e0';
    slider.style.background = `linear-gradient(to right, #14bdee ${percent}%, ${trackColor} ${percent}%)`;
  },

  /**
   * Initialize all sliders on the page to show progress
   */
  initSliderProgress() {
    document.querySelectorAll('.calc-slider').forEach(slider => {
      this.updateSliderProgress(slider);
      slider.addEventListener('input', () => this.updateSliderProgress(slider));
    });

    // Listen for dark mode changes
    const darkModeSwitch = document.getElementById('darkModeSwitch');
    if (darkModeSwitch) {
      darkModeSwitch.addEventListener('change', () => {
        setTimeout(() => {
          document.querySelectorAll('.calc-slider').forEach(slider => {
            this.updateSliderProgress(slider);
          });
        }, 50);
      });
    }
  }
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


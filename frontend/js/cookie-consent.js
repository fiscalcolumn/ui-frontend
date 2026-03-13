/**
 * Cookie Consent Banner
 * DPDP Act (India) & GDPR compliant
 * Stores choice in localStorage under 'fc_cookie_consent'
 * Values: 'all' | 'essential' | null (not yet decided)
 */
(function () {
  const STORAGE_KEY   = 'fc_cookie_consent';
  const STORAGE_DATE  = 'fc_cookie_consent_date';
  const BANNER_ID     = 'fc-cookie-banner';
  const EXPIRY_DAYS   = 180; // re-ask after 6 months

  function getConsent() {
    try {
      const value = localStorage.getItem(STORAGE_KEY);
      if (!value) return null;

      const savedDate = localStorage.getItem(STORAGE_DATE);
      if (savedDate) {
        const ageMs   = Date.now() - new Date(savedDate).getTime();
        const ageDays = ageMs / (1000 * 60 * 60 * 24);
        if (ageDays > EXPIRY_DAYS) {
          // Consent expired — clear and re-ask
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(STORAGE_DATE);
          return null;
        }
      }
      return value;
    } catch { return null; }
  }

  function setConsent(value) {
    try {
      localStorage.setItem(STORAGE_KEY, value);
      localStorage.setItem(STORAGE_DATE, new Date().toISOString());
    } catch {}
  }

  function hideBanner() {
    const banner = document.getElementById(BANNER_ID);
    if (banner) {
      banner.classList.add('fc-cookie--hiding');
      setTimeout(() => banner.remove(), 350);
    }
  }

  function acceptAll() {
    setConsent('all');
    hideBanner();
    // Fire event so analytics scripts can initialise
    window.dispatchEvent(new CustomEvent('cookieConsent', { detail: { level: 'all' } }));
  }

  function acceptEssential() {
    setConsent('essential');
    hideBanner();
    window.dispatchEvent(new CustomEvent('cookieConsent', { detail: { level: 'essential' } }));
  }

  function showBanner() {
    const banner = document.createElement('div');
    banner.id = BANNER_ID;
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Cookie consent');
    banner.setAttribute('aria-live', 'polite');

    banner.innerHTML = `
      <div class="fc-cookie__inner">
        <div class="fc-cookie__icon">🍪</div>
        <div class="fc-cookie__text">
          <strong>We value your privacy</strong>
          <p>We use cookies to improve your experience, serve personalised content, and analyse site traffic.
          By clicking <em>Accept All</em> you consent to all cookies. You can choose <em>Essential Only</em>
          to allow only cookies necessary for the site to function.
          <a href="/privacy-policy" class="fc-cookie__link">Learn more</a></p>
        </div>
        <div class="fc-cookie__actions">
          <button class="fc-cookie__btn fc-cookie__btn--secondary" id="fc-cookie-essential">Essential Only</button>
          <button class="fc-cookie__btn fc-cookie__btn--primary" id="fc-cookie-accept">Accept All</button>
        </div>
      </div>
    `;

    document.body.appendChild(banner);

    // Small delay so CSS transition plays
    requestAnimationFrame(() => {
      requestAnimationFrame(() => banner.classList.add('fc-cookie--visible'));
    });

    document.getElementById('fc-cookie-accept').addEventListener('click', acceptAll);
    document.getElementById('fc-cookie-essential').addEventListener('click', acceptEssential);
  }

  // Expose helpers globally so other scripts can check consent
  window.CookieConsent = {
    get: getConsent,
    hasAll: () => getConsent() === 'all',
    hasEssential: () => !!getConsent(),
  };

  // Only show if user hasn't decided yet
  if (!getConsent()) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', showBanner);
    } else {
      showBanner();
    }
  }
})();

/**
 * Footer Component — fetches all content from Strapi Footer API
 */

const FOOTER_CACHE_KEY = 'fc_footer_data';
const FOOTER_CACHE_TTL = 5 * 60 * 1000;

function getCachedFooter() {
  try {
    const raw = sessionStorage.getItem(FOOTER_CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > FOOTER_CACHE_TTL) { sessionStorage.removeItem(FOOTER_CACHE_KEY); return null; }
    return data;
  } catch { return null; }
}

function setCachedFooter(data) {
  try { sessionStorage.setItem(FOOTER_CACHE_KEY, JSON.stringify({ data, ts: Date.now() })); } catch {}
}

function getStaticFallback() {
  const s = window.SITE_DATA?.footer || {};
  return {
    logoText:      s.logoText      || 'FiscalColumn',
    description:   s.description   || '',
    socialLinks:   s.socialLinks   || [],
    contactInfo:   null,
    mobileTitle:   'Download Our App',
    appDownloads:  s.appDownloads  || [],
    leftLinks:     s.leftLinks     || [],
    rightLinks:    s.rightLinks    || [],
    copyrightText: s.copyrightText || `© ${new Date().getFullYear()} FiscalColumn. All rights reserved.`
  };
}

async function fetchFooterData() {
  const cached = getCachedFooter();
  if (cached) return cached;

  try {
    if (typeof getApiUrl !== 'function') return getStaticFallback();

    const url = getApiUrl(
      '/footer' +
      '?populate[socialLinks]=true' +
      '&populate[contactInfo]=true' +
      '&populate[appDownloads]=true' +
      '&populate[quickLinksColumn1]=true' +
      '&populate[quickLinksColumn2]=true'
    );

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Footer API ${res.status}`);

    const json = await res.json();
    const d    = json.data || {};

    const toLinks = arr =>
      Array.isArray(arr)
        ? arr.filter(l => l.label && l.url).map(l => ({ label: l.label, url: l.url }))
        : [];

    const toAppDownloads = arr =>
      Array.isArray(arr)
        ? arr.map(a => ({
            platform: a.platform,
            url:      a.url || '#',
            image:    BADGE_IMAGES[a.platform] || null,
            label:    a.platform === 'google-play' ? 'Get it on Google Play' : 'Download on the App Store'
          })).filter(a => a.image)
        : [];

    const data = {
      logoText:      d.logoText      || getStaticFallback().logoText,
      description:   d.description   || '',
      socialLinks:   Array.isArray(d.socialLinks) ? d.socialLinks : [],
      contactInfo:   d.contactInfo   || null,
      mobileTitle:   d.mobileTitle   || 'Download Our App',
      appDownloads:  toAppDownloads(d.appDownloads),
      leftLinks:     toLinks(d.quickLinksColumn1),
      rightLinks:    toLinks(d.quickLinksColumn2),
      copyrightText: d.copyrightText || getStaticFallback().copyrightText
    };

    setCachedFooter(data);
    return data;

  } catch (err) {
    console.warn('Footer API failed, using static fallback:', err.message);
    return getStaticFallback();
  }
}

// --- Render helpers ---

const SOCIAL_ICONS = {
  facebook:  'fa-facebook',
  twitter:   'fa-twitter',
  instagram: 'fa-instagram',
  linkedin:  'fa-linkedin',
  youtube:   'fa-youtube-play',
  tiktok:    'fa-tiktok',
  google:    'fa-google-plus'
};

function renderSocialLinks(links) {
  if (!links || links.length === 0) return '';
  return links.map(l => {
    const icon = SOCIAL_ICONS[l.platform] || 'fa-link';
    return `<li>
      <a href="${l.url || '#'}" target="_blank" rel="noopener noreferrer" aria-label="${l.platform}">
        <i class="fa ${icon}" aria-hidden="true"></i>
      </a>
    </li>`;
  }).join('');
}

function renderContactInfo(info) {
  if (!info) return '';
  const lines = [];
  if (info.email)   lines.push(`<div class="footer-contact-line"><i class="fa fa-envelope-o"></i><a href="mailto:${info.email}">${info.email}</a></div>`);
  if (info.phone)   lines.push(`<div class="footer-contact-line"><i class="fa fa-phone"></i><a href="tel:${info.phone}">${info.phone}</a></div>`);
  if (info.address) lines.push(`<div class="footer-contact-line"><i class="fa fa-map-marker"></i><span>${info.address}</span></div>`);
  return lines.join('');
}

const BADGE_IMAGES = {
  'google-play': 'https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg',
  'app-store':   'https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg'
};

function renderAppBadges(appDownloads) {
  if (!appDownloads || appDownloads.length === 0) return '';
  return appDownloads.map(app => {
    const img = app.image || BADGE_IMAGES[app.platform];
    if (!img) return '';
    const label = app.label || (app.platform === 'google-play' ? 'Get it on Google Play' : 'Download on the App Store');
    // Always point to the coming-soon page until real app links are available
    return `<a href="/app" class="footer-badge-link">
      <img src="${img}" alt="${label}" class="footer-badge-img">
    </a>`;
  }).join('');
}

function renderNavLinks(links) {
  if (!links || links.length === 0) return '';
  return links.map(link => {
    let url = link.url || '#';
    if (url !== '#' && !url.startsWith('http') && !url.startsWith('/')) url = '/' + url;
    return `<li><a href="${url}">${link.label}</a></li>`;
  }).join('');
}

// --- Main render ---

function initSubscribeForm() {
  const form  = document.getElementById('footer-subscribe-form');
  const input = document.getElementById('footer-subscribe-email');
  const msg   = document.getElementById('footer-subscribe-msg');
  if (!form || !input || !msg) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.className = 'footer-subscribe-msg';
    msg.textContent = '';

    const email = input.value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      msg.textContent = 'Please enter a valid email address.';
      msg.classList.add('footer-subscribe-msg--error');
      return;
    }

    const btn = form.querySelector('.footer-subscribe-btn');
    btn.disabled = true;
    btn.textContent = 'Subscribing...';

    try {
      const apiBase = window.API_CONFIG?.BASE_URL || 'http://localhost:1337';
      const res = await fetch(`${apiBase}/api/subscriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { email, source: 'footer' } }),
      });
      const json = await res.json();

      if (res.ok) {
        const text = json.message === 'already_subscribed'
          ? 'You\'re already subscribed!'
          : 'Thank you for subscribing!';
        msg.textContent = text;
        msg.classList.add('footer-subscribe-msg--success');
        input.value = '';
      } else {
        msg.textContent = json.error?.message || 'Something went wrong. Please try again.';
        msg.classList.add('footer-subscribe-msg--error');
      }
    } catch {
      msg.textContent = 'Network error. Please try again.';
      msg.classList.add('footer-subscribe-msg--error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Subscribe';
    }
  });
}

async function renderFooter() {
  const footer = document.querySelector('.footer');
  if (!footer) return;

  footer.style.opacity = '0';

  const data = await fetchFooterData();

  // Info bar — col 1
  const brandTextEl  = footer.querySelector('.footer-brand-text');
  const brandDescEl  = footer.querySelector('.footer-brand-desc');
  const socialListEl = footer.querySelector('.footer-social-list');

  if (brandTextEl) {
    const name = (data.logoText || 'Fiscal Column').replace(/^the\s+/i, '').trim();
    brandTextEl.innerHTML = `
      <a href="/" class="footer-logo-masthead" aria-label="The Fiscal Column — Home">
        <span class="footer-logo-eyebrow">The</span>
        <span class="footer-logo-name">${name}</span>
      </a>`;
  }
  if (brandDescEl)  brandDescEl.textContent  = data.description;
  if (socialListEl) {
    socialListEl.innerHTML = renderSocialLinks(data.socialLinks);
    // Append RSS feed link
    const rssItem = document.createElement('li');
    rssItem.innerHTML = `<a href="/feed.xml" target="_blank" rel="noopener noreferrer" aria-label="RSS Feed" title="Subscribe via RSS">
      <i class="fa fa-rss" aria-hidden="true"></i>
    </a>`;
    socialListEl.appendChild(rssItem);
  }

  // Info bar — col 2: Newsletter subscribe form
  initSubscribeForm();

  // Info bar — col 3
  const mobileTitleEl = footer.querySelector('.footer-mobile-title');
  const badgesEl      = footer.querySelector('.footer-app-badges');

  if (mobileTitleEl) mobileTitleEl.textContent = data.mobileTitle;
  if (badgesEl)      badgesEl.innerHTML        = renderAppBadges(data.appDownloads);

  // Links bar
  const leftEl  = footer.querySelector('.footer-nav-left');
  const rightEl = footer.querySelector('.footer-nav-right');
  if (leftEl)  leftEl.innerHTML  = renderNavLinks(data.leftLinks);
  if (rightEl) rightEl.innerHTML = renderNavLinks(data.rightLinks);

  // Copyright
  const crEl = footer.querySelector('.cr_text');
  if (crEl) crEl.textContent = data.copyrightText;

  footer.style.transition = 'opacity 0.2s ease';
  footer.style.opacity    = '1';
}

function initFooter() { renderFooter(); }

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initFooter);
} else {
  initFooter();
}

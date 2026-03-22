/**
 * Static Page Manager
 * Fetches and renders static pages from Strapi with rich, page-specific UI.
 */

class StaticPageManager {
  constructor() {
    this.pageContainer = document.getElementById('page-content');
    this.page = null;
  }

  async init() {
    const slug = this.getSlugFromUrl();
    if (!slug) { this.showError('Page not found'); return; }

    try {
      this.page = await this.fetchPage(slug);
      if (!this.page) { this.showError('Page not found'); return; }
      this.updatePageMeta();
      this.renderPage();
    } catch (err) {
      console.error('Error loading page:', err);
      this.showError('Failed to load page');
    }
  }

  getSlugFromUrl() {
    return window.location.pathname.replace(/^\/|\/$/g, '') || null;
  }

  async fetchPage(slug) {
    const url = getApiUrl(`/static-pages?filters[slug][$eq]=${slug}&populate[featuredImage]=true`);
    const res  = await fetch(url);
    const data = await res.json();
    return data.data?.length ? data.data[0] : null;
  }

  // ── SEO / Meta ──────────────────────────────────────────────────────────────

  updatePageMeta() {
    const title = this.page.metaTitle || this.page.title;
    const desc  = this.page.metaDescription || this.page.excerpt || '';
    const url   = window.location.href;
    const img   = this.page.featuredImage?.url
      ? `${API_CONFIG.BASE_URL}${this.page.featuredImage.url}`
      : `${window.location.origin}/images/og-default.jpg`;

    document.title = `${title} | FiscalColumn`;
    const setId = (id, v) => { const el = document.getElementById(id); if (el) el.setAttribute('content', v); };
    document.getElementById('page-title')?.setAttribute && (document.getElementById('page-title').textContent = document.title);
    document.getElementById('meta-description')?.setAttribute('content', desc);
    document.getElementById('canonical-url')?.setAttribute('href', url);
    setId('og-url', url); setId('og-title', title); setId('og-description', desc); setId('og-image', img);
    setId('twitter-title', title); setId('twitter-description', desc);

    const schema = {
      "@context": "https://schema.org", "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": window.location.origin },
        { "@type": "ListItem", "position": 2, "name": this.page.title, "item": url }
      ]
    };
    const schemaEl = document.getElementById('schema-breadcrumb');
    if (schemaEl) schemaEl.textContent = JSON.stringify(schema);

    const bc = document.getElementById('breadcrumb-page');
    if (bc) bc.textContent = this.page.title;
  }

  // ── Router ───────────────────────────────────────────────────────────────────

  renderPage() {
    const slug = this.getSlugFromUrl();
    switch (slug) {
      case 'about-us':           return this.renderAbout();
      case 'editorial-process':  return this.renderEditorialProcess();
      case 'newsletter':         return this.renderNewsletter();
      case 'advertise':          return this.renderAdvertise();
      case 'contact-us':         return this.renderContact();
      case 'privacy-policy':
      case 'terms-of-use':
      case 'disclaimer':         return this.renderLegal();
      default:                   return this.renderDefault();
    }
  }

  // ── Shared helpers ───────────────────────────────────────────────────────────

  md(content) {
    if (!content) return '';
    if (typeof marked !== 'undefined') {
      marked.setOptions({ breaks: true, gfm: true, mangle: false, headerIds: false });
      return marked.parse(content);
    }
    return content.split('\n\n').map(p => `<p>${p}</p>`).join('');
  }

  removeFirstHeading(html) {
    return html.replace(/<h[12][^>]*>.*?<\/h[12]>/i, '');
  }

  pageHeader(subtitle = '') {
    const hasImage = this.page.featuredImage?.url;
    const imageUrl = hasImage ? `${API_CONFIG.BASE_URL}${this.page.featuredImage.url}` : '';
    const desc     = subtitle || this.page.excerpt || '';

    const fallbackIcons = {
      about:   { icon: 'fa-info-circle',  color: '#b8860b' },
      legal:   { icon: 'fa-file-text-o',  color: '#4a6fa5' },
      contact: { icon: 'fa-envelope-o',   color: '#2a9d8f' },
      general: { icon: 'fa-newspaper-o',  color: '#6c757d' },
    };
    const fb = fallbackIcons[this.page.pageType] || fallbackIcons.general;

    return `
      <div class="sp-info-bar">
        <div class="container">
          <div class="sp-info-content">
            <div class="sp-info-avatar">
              ${hasImage
                ? `<img loading="lazy" src="${imageUrl}" alt="${this.page.title}" class="sp-info-img">`
                : `<div class="sp-info-icon-circle" style="background:${fb.color}">
                     <i class="fa ${fb.icon}"></i>
                   </div>`
              }
            </div>
            <div class="sp-info-text">
              <h1 class="sp-info-title">${this.page.title}</h1>
              ${desc ? `<p class="sp-info-desc">${desc}</p>` : ''}
            </div>
          </div>
        </div>
      </div>`;
  }

  // ── About Us ─────────────────────────────────────────────────────────────────

  renderAbout() {
    const covers = [
      { icon: 'fa-gem',         label: 'Precious Metals',   desc: 'Live and historical gold & silver rates across cities and purities' },
      { icon: 'fa-line-chart',  label: 'Stock Market',      desc: 'Nifty, Sensex, sectoral analysis, and stock picks' },
      { icon: 'fa-pie-chart',   label: 'Mutual Funds',      desc: 'SIP calculators, fund comparisons, and NAV tracking' },
      { icon: 'fa-file-text-o', label: 'Taxation',          desc: 'ITR guides, GST updates, and tax-saving investment ideas' },
      { icon: 'fa-wallet',      label: 'Personal Finance',  desc: 'Budgeting, emergency funds, and CIBIL score tips' },
      { icon: 'fa-building-o',  label: 'Real Estate',       desc: 'Property prices, RERA updates, and REIT analysis' },
      { icon: 'fa-rocket',      label: 'IPO Insights',      desc: 'GMP, allotment status, and listing day performance' },
    ];

    const coverCards = covers.map(c => `
      <div class="sp-cover-card">
        <i class="fa ${c.icon} sp-cover-icon"></i>
        <div class="sp-cover-label">${c.label}</div>
        <div class="sp-cover-desc">${c.desc}</div>
      </div>`).join('');

    const principles = [
      { icon: 'fa-shield',       label: 'Independence',    desc: 'Editorial decisions are never influenced by advertisers.' },
      { icon: 'fa-check-circle', label: 'Accuracy',        desc: 'Every article is fact-checked before publication.' },
      { icon: 'fa-eye',          label: 'Transparency',    desc: 'Sponsored content is always clearly labelled.' },
      { icon: 'fa-graduation-cap', label: 'Education First', desc: 'We inform, never advise on specific investments.' },
    ];

    const principleCards = principles.map(p => `
      <div class="sp-principle-card">
        <i class="fa ${p.icon} sp-principle-icon"></i>
        <div>
          <div class="sp-principle-label">${p.label}</div>
          <div class="sp-principle-desc">${p.desc}</div>
        </div>
      </div>`).join('');

    this.pageContainer.innerHTML = `
      ${this.pageHeader()}
      <div class="container sp-body-container">

        <div class="sp-section">
          <h2 class="sp-section-heading">What We Cover</h2>
          <div class="sp-cover-grid">${coverCards}</div>
        </div>

        <div class="sp-section sp-section--alt">
          <h2 class="sp-section-heading">Our Principles</h2>
          <div class="sp-principles-grid">${principleCards}</div>
        </div>

        <div class="sp-section sp-mission-block">
          <div class="sp-mission-quote">"Make financial information accessible, accurate, and actionable for every Indian."</div>
          <div class="sp-mission-sub">FiscalColumn is run by finance journalists, data analysts, and technology professionals passionate about better financial decisions.</div>
        </div>

      </div>
    `;
  }

  // ── Editorial Process ─────────────────────────────────────────────────────────

  renderEditorialProcess() {
    const steps = [
      {
        num: '01', icon: 'fa-lightbulb-o', label: 'Topic Selection',
        desc: 'Our editors identify topics based on current market events, regulatory changes, reader queries, and data-driven gaps in financial literacy.'
      },
      {
        num: '02', icon: 'fa-search', label: 'Research',
        desc: 'Writers use primary sources — SEBI, RBI, Income Tax Department, MCX, NSE/BSE circulars — and reputed secondary sources for every article.'
      },
      {
        num: '03', icon: 'fa-pencil', label: 'Writing',
        desc: 'Content is written by finance professionals following plain-language principles: complex concepts made clear without sacrificing accuracy.'
      },
      {
        num: '04', icon: 'fa-check-square-o', label: 'Editorial Review',
        desc: 'A senior editor reviews every article for factual accuracy, SEBI compliance, clarity, and absence of misleading claims or unverified projections.'
      },
      {
        num: '05', icon: 'fa-upload', label: 'Publication & Updates',
        desc: 'Articles are published with a clear date. If new data changes existing content, it\'s updated promptly with the revision date noted.'
      },
    ];

    const stepHtml = steps.map((s, i) => `
      <div class="sp-step">
        <div class="sp-step-left">
          <div class="sp-step-num">${s.num}</div>
          ${i < steps.length - 1 ? '<div class="sp-step-line"></div>' : ''}
        </div>
        <div class="sp-step-body">
          <div class="sp-step-header">
            <i class="fa ${s.icon} sp-step-icon"></i>
            <span class="sp-step-label">${s.label}</span>
          </div>
          <p class="sp-step-desc">${s.desc}</p>
        </div>
      </div>`).join('');

    const principles = [
      { label: 'Independence',   desc: 'Advertisers never influence editorial decisions.' },
      { label: 'Transparency',   desc: 'Sponsored content is always clearly disclosed.' },
      { label: 'Accuracy',       desc: 'Errors are corrected promptly and openly.' },
      { label: 'No Advice',      desc: 'Content is informational, never investment advice.' },
    ];

    this.pageContainer.innerHTML = `
      ${this.pageHeader()}
      <div class="container sp-body-container">

        <div class="sp-section">
          <h2 class="sp-section-heading">How Every Article is Made</h2>
          <div class="sp-steps">${stepHtml}</div>
        </div>

        <div class="sp-section sp-section--alt">
          <h2 class="sp-section-heading">Our Editorial Principles</h2>
          <div class="sp-ep-principles">
            ${principles.map(p => `
              <div class="sp-ep-principle">
                <div class="sp-ep-label">${p.label}</div>
                <div class="sp-ep-desc">${p.desc}</div>
              </div>`).join('')}
          </div>
        </div>

        <div class="sp-corrections-note">
          <i class="fa fa-envelope-o"></i>
          Spotted an error? Email <a href="mailto:editorial@fiscalcolumn.com">editorial@fiscalcolumn.com</a> — we take corrections seriously and respond within one business day.
        </div>

      </div>
    `;
  }

  // ── Newsletter ───────────────────────────────────────────────────────────────

  renderNewsletter() {
    const benefits = [
      { icon: 'fa-line-chart',   label: 'Weekly Market Wrap',   desc: 'Nifty, Sensex, and sectoral performance every Friday — one crisp summary.' },
      { icon: 'fa-gem',          label: 'Gold & Silver Alerts',  desc: 'Precious metals price movements and trends, explained in plain language.' },
      { icon: 'fa-newspaper-o',  label: 'Top Story of the Week', desc: 'One deep-dive article handpicked by our editorial team.' },
      { icon: 'fa-calendar',     label: 'Tax Calendar',          desc: 'Never miss an ITR, GST, or advance tax deadline again.' },
      { icon: 'fa-rocket',       label: 'IPO Watch',             desc: 'Upcoming IPOs, GMP data, and allotment results — concise and timely.' },
      { icon: 'fa-lightbulb-o',  label: 'Finance Tip of the Week', desc: 'One actionable personal finance tip you can apply immediately.' },
    ];

    this.pageContainer.innerHTML = `
      ${this.pageHeader()}
      <div class="container sp-body-container">

        <div class="sp-nl-trust">
          <span><i class="fa fa-check"></i> Free, always</span>
          <span><i class="fa fa-check"></i> One email per week, every Friday</span>
          <span><i class="fa fa-check"></i> Unsubscribe anytime</span>
        </div>

        <div class="sp-nl-form-wrap">
          <!-- Tabs -->
          <div class="sp-nl-tabs" role="tablist">
            <button class="sp-nl-tab active" id="tab-subscribe"   data-tab="subscribe"   role="tab" aria-selected="true">Subscribe</button>
            <button class="sp-nl-tab"        id="tab-unsubscribe" data-tab="unsubscribe" role="tab" aria-selected="false">Unsubscribe</button>
          </div>

          <!-- Subscribe panel -->
          <div class="sp-nl-panel" id="panel-subscribe">
            <div class="sp-nl-form-label">Enter your email to subscribe</div>
            <form class="sp-nl-form" id="sp-subscribe-form" novalidate>
              <input type="email" id="sp-subscribe-email" class="sp-nl-input" placeholder="yourname@email.com" autocomplete="email" required>
              <button type="submit" class="sp-nl-btn">Subscribe Free</button>
            </form>
            <p class="sp-nl-privacy">No spam. One email per week. Read our <a href="/privacy-policy">Privacy Policy</a>.</p>
            <p class="sp-nl-msg" id="sp-subscribe-msg" aria-live="polite"></p>
          </div>

          <!-- Unsubscribe panel -->
          <div class="sp-nl-panel sp-nl-panel--hidden" id="panel-unsubscribe">
            <div class="sp-nl-form-label">Enter your email to unsubscribe</div>
            <form class="sp-nl-form" id="sp-unsubscribe-form" novalidate>
              <input type="email" id="sp-unsubscribe-email" class="sp-nl-input" placeholder="yourname@email.com" autocomplete="email" required>
              <button type="submit" class="sp-nl-btn sp-nl-btn--unsub">Unsubscribe</button>
            </form>
            <p class="sp-nl-privacy">We'll set your subscription to inactive immediately. You can re-subscribe anytime.</p>
            <p class="sp-nl-msg" id="sp-unsubscribe-msg" aria-live="polite"></p>
          </div>
        </div>

        <div class="sp-section">
          <h2 class="sp-section-heading">What's Inside Every Edition</h2>
          <div class="sp-nl-benefits">
            ${benefits.map(b => `
              <div class="sp-nl-benefit">
                <i class="fa ${b.icon} sp-nl-benefit-icon"></i>
                <div>
                  <div class="sp-nl-benefit-label">${b.label}</div>
                  <div class="sp-nl-benefit-desc">${b.desc}</div>
                </div>
              </div>`).join('')}
          </div>
        </div>

      </div>
    `;

    this._initSubscribeForm('sp-subscribe-form', 'sp-subscribe-email', 'sp-subscribe-msg');
    this._initUnsubscribeForm('sp-unsubscribe-form', 'sp-unsubscribe-email', 'sp-unsubscribe-msg');
    this._initNlTabs();
  }

  _initSubscribeForm(formId, inputId, msgId) {
    const form  = document.getElementById(formId);
    const input = document.getElementById(inputId);
    const msg   = document.getElementById(msgId);
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      msg.className = 'sp-nl-msg';
      msg.textContent = '';
      const email = input.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        msg.textContent = 'Please enter a valid email address.';
        msg.classList.add('sp-nl-msg--error');
        return;
      }
      const btn = form.querySelector('button');
      btn.disabled = true; btn.textContent = 'Subscribing…';
      try {
        const apiBase = window.API_CONFIG?.BASE_URL || 'http://localhost:1337';
        const res = await fetch(`${apiBase}/api/subscriptions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: { email, source: 'newsletter-page' } })
        });
        const json = await res.json();
        if (res.ok) {
          msg.textContent = json.message === 'already_subscribed' ? 'You\'re already subscribed!' : 'Thank you! Check your inbox.';
          msg.classList.add('sp-nl-msg--success');
          input.value = '';
        } else {
          msg.textContent = json.error?.message || 'Something went wrong. Please try again.';
          msg.classList.add('sp-nl-msg--error');
        }
      } catch {
        msg.textContent = 'Network error. Please try again.';
        msg.classList.add('sp-nl-msg--error');
      } finally {
        btn.disabled = false; btn.textContent = 'Subscribe Free';
      }
    });
  }

  _initNlTabs() {
    const tabs   = document.querySelectorAll('.sp-nl-tab');
    const panels = document.querySelectorAll('.sp-nl-panel');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.tab;
        tabs.forEach(t   => { t.classList.toggle('active', t.dataset.tab === target); t.setAttribute('aria-selected', t.dataset.tab === target); });
        panels.forEach(p => p.classList.toggle('sp-nl-panel--hidden', p.id !== `panel-${target}`));
      });
    });
  }

  async _initUnsubscribeForm(formId, inputId, msgId) {
    const form  = document.getElementById(formId);
    const input = document.getElementById(inputId);
    const msg   = document.getElementById(msgId);
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      msg.className = 'sp-nl-msg';
      msg.textContent = '';

      const email = input.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        msg.textContent = 'Please enter a valid email address.';
        msg.classList.add('sp-nl-msg--error');
        return;
      }

      const btn = form.querySelector('button');
      btn.disabled = true;
      btn.textContent = 'Processing…';

      try {
        const apiBase = window.API_CONFIG?.BASE_URL || 'http://localhost:1337';

        // Step 1: find the subscription by email
        const findRes  = await fetch(`${apiBase}/api/subscriptions?filters[email][$eq]=${encodeURIComponent(email)}`);
        const findJson = await findRes.json();

        if (!findRes.ok) {
          msg.textContent = findJson.error?.message || 'Unable to look up subscription. Please try again.';
          msg.classList.add('sp-nl-msg--error');
          return;
        }

        const record = findJson.data?.[0];

        if (!record) {
          msg.textContent = 'No subscription found for this email address.';
          msg.classList.add('sp-nl-msg--error');
          return;
        }

        if (record.subscribed === false) {
          msg.textContent = 'This email is already unsubscribed.';
          msg.classList.add('sp-nl-msg--error');
          return;
        }

        // Step 2: update subscribed → false
        const updateRes = await fetch(`${apiBase}/api/subscriptions/${record.documentId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: { subscribed: false, unsubscribedAt: new Date().toISOString() } })
        });

        if (updateRes.ok) {
          msg.textContent = 'You have been successfully unsubscribed. We\'re sorry to see you go!';
          msg.classList.add('sp-nl-msg--success');
          input.value = '';
        } else {
          const errJson = await updateRes.json();
          msg.textContent = errJson.error?.message || 'Something went wrong. Please try again.';
          msg.classList.add('sp-nl-msg--error');
        }
      } catch {
        msg.textContent = 'Network error. Please try again.';
        msg.classList.add('sp-nl-msg--error');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Unsubscribe';
      }
    });
  }

  // ── Advertise ────────────────────────────────────────────────────────────────

  renderAdvertise() {
    const stats = [
      { value: '25–45', label: 'Core Age Group' },
      { value: 'Urban', label: 'Audience Profile' },
      { value: 'Finance', label: 'Primary Interest' },
      { value: 'High',   label: 'Purchase Intent' },
    ];

    const options = [
      { icon: 'fa-desktop',    label: 'Display Advertising',   desc: 'Banner and native ad placements across the homepage, gold rate page, silver rate page, and article pages.' },
      { icon: 'fa-star-o',     label: 'Category Sponsorship',  desc: 'Exclusive sponsorship of a content category — Mutual Funds, IPO Insights, Taxation — with prominent brand visibility.' },
      { icon: 'fa-envelope-o', label: 'Newsletter Sponsorship', desc: 'Featured placement in our weekly newsletter reaching thousands of engaged subscribers.' },
      { icon: 'fa-handshake-o', label: 'Content Partnerships', desc: 'Co-branded research reports, market analyses, or educational guides with your organisation.' },
    ];

    const who = ['Stockbrokers & trading platforms', 'Mutual fund distributors & AMCs', 'Banks & NBFCs', 'Insurance companies', 'Tax advisory & CA firms', 'Real estate developers', 'Gold & jewellery brands', 'Fintech apps & platforms'];

    this.pageContainer.innerHTML = `
      ${this.pageHeader()}
      <div class="container sp-body-container">

        <div class="sp-section sp-adv-stats-row">
          ${stats.map(s => `
            <div class="sp-adv-stat">
              <div class="sp-adv-stat-value">${s.value}</div>
              <div class="sp-adv-stat-label">${s.label}</div>
            </div>`).join('')}
        </div>

        <div class="sp-section">
          <h2 class="sp-section-heading">Advertising Options</h2>
          <div class="sp-adv-options">
            ${options.map(o => `
              <div class="sp-adv-option">
                <i class="fa ${o.icon} sp-adv-option-icon"></i>
                <div class="sp-adv-option-label">${o.label}</div>
                <div class="sp-adv-option-desc">${o.desc}</div>
              </div>`).join('')}
          </div>
        </div>

        <div class="sp-section sp-section--alt">
          <h2 class="sp-section-heading">Who Should Advertise?</h2>
          <div class="sp-adv-who">
            ${who.map(w => `<div class="sp-adv-who-item"><i class="fa fa-check sp-adv-who-icon"></i>${w}</div>`).join('')}
          </div>
        </div>

        <div class="sp-adv-cta">
          <div class="sp-adv-cta-text">Ready to reach India's investors?</div>
          <a href="mailto:ads@fiscalcolumn.com" class="sp-adv-cta-btn">
            <i class="fa fa-envelope-o"></i> ads@fiscalcolumn.com
          </a>
          <div class="sp-adv-cta-note">We respond to all advertising enquiries within 2 business days.</div>
        </div>

      </div>
    `;
  }

  // ── Contact Us ───────────────────────────────────────────────────────────────

  renderContact() {
    const departments = [
      { icon: 'fa-bullhorn',    label: 'Advertising',      email: 'ads@fiscalcolumn.com',          desc: 'For advertising enquiries, media kits, and sponsorship opportunities.', link: { label: 'View advertising options', href: '/advertise' } },
      { icon: 'fa-newspaper-o', label: 'Editorial',         email: 'editorial@fiscalcolumn.com',    desc: 'For story tips, content corrections, or editorial feedback.',            link: { label: 'Our editorial process', href: '/editorial-process' } },
      { icon: 'fa-envelope-o',  label: 'Newsletter',        email: 'newsletter@fiscalcolumn.com',   desc: 'For newsletter-related enquiries or to manage your subscription.',       link: { label: 'Subscribe for free', href: '/newsletter' } },
      { icon: 'fa-comments-o',  label: 'General Inquiries', email: this.page.contactEmail || 'hello@fiscalcolumn.com', desc: 'Have other questions? Our team is happy to help.', link: null },
    ];

    const contentHtml = this.removeFirstHeading(this.md(this.page.content));

    this.pageContainer.innerHTML = `
      ${this.pageHeader()}
      <div class="container sp-body-container">
        <div class="cus-section">
          <div class="cus-grid">
            ${departments.map(d => `
              <div class="cus-card">
                <div class="cus-card-top">
                  <i class="fa ${d.icon} cus-icon"></i>
                  <span class="cus-label">${d.label}</span>
                </div>
                <a href="mailto:${d.email}" class="cus-email">${d.email}</a>
                <p class="cus-desc">${d.desc}</p>
                ${d.link ? `<a href="${d.link.href}" class="cus-link">${d.link.label} <i class="fa fa-arrow-right"></i></a>` : ''}
              </div>`).join('')}
          </div>
        </div>
        <div class="static-page-body">${contentHtml}</div>
      </div>
    `;
  }

  // ── Legal Pages ───────────────────────────────────────────────────────────────

  renderLegal() {
    let contentHtml = this.removeFirstHeading(this.md(this.page.content));

    // Inject IDs into h3 headings for anchor links
    let tocIdx = 0;
    contentHtml = contentHtml.replace(/<h3([^>]*)>/g, () => `<h3 id="sec-${++tocIdx}">`);

    // Extract TOC entries
    const headings = [...(this.page.content?.matchAll(/^### (.+)$/mg) || [])].map((m, i) => ({
      id: `sec-${i + 1}`, label: m[1]
    }));

    const lastUpdated = this.page.content?.match(/\*\*Last updated:\s*([^*]+)\*\*/)?.[1]?.trim() || '';

    this.pageContainer.innerHTML = `
      ${this.pageHeader()}

      <div class="container sp-body-container">
        ${lastUpdated ? `<div class="sp-legal-updated"><i class="fa fa-clock-o"></i> Last updated: ${lastUpdated}</div>` : ''}

        <div class="sp-legal-layout">
          <!-- TOC sidebar -->
          <aside class="sp-legal-toc">
            <div class="sp-toc-title">On this page</div>
            <ul class="sp-toc-list">
              ${headings.map(h => `<li><a href="#${h.id}" class="sp-toc-link">${h.label}</a></li>`).join('')}
            </ul>
          </aside>

          <!-- Content -->
          <div class="sp-legal-content static-page-body">
            ${contentHtml}
          </div>
        </div>
      </div>
    `;

    this._initTocHighlight();
  }

  _initTocHighlight() {
    const links   = document.querySelectorAll('.sp-toc-link');
    const targets = [...document.querySelectorAll('.sp-legal-content h3[id]')];
    if (!links.length || !targets.length) return;

    // header is 90px brand bar + 75px nav bar = 165px fixed
    const HEADER_H = 185;
    const onScroll = () => {
      let active = targets[0]?.id;
      targets.forEach(t => { if (t.getBoundingClientRect().top <= HEADER_H) active = t.id; });
      links.forEach(l => l.classList.toggle('active', l.getAttribute('href') === `#${active}`));
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    links.forEach(l => l.addEventListener('click', e => {
      e.preventDefault();
      const target = document.getElementById(l.getAttribute('href').slice(1));
      if (target) {
        const y = target.getBoundingClientRect().top + window.scrollY - HEADER_H - 8;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }));
  }

  // ── Default fallback ──────────────────────────────────────────────────────────

  renderDefault() {
    const contentHtml = this.removeFirstHeading(this.md(this.page.content));
    this.pageContainer.innerHTML = `
      ${this.pageHeader()}
      <div class="container sp-body-container">
        <div class="static-page-body">${contentHtml}</div>
      </div>
    `;
  }

  removeFirstHeading(html) {
    return html.replace(/<h[12][^>]*>.*?<\/h[12]>/i, '');
  }

  slugToTitle(slug) {
    return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  showError(message) {
    const slug  = this.getSlugFromUrl() || '';
    const title = this.slugToTitle(slug) || 'Page Not Found';
    document.title = `${title} | FiscalColumn`;
    const bc = document.getElementById('breadcrumb-page');
    if (bc) bc.textContent = title;
    this.pageContainer.innerHTML = `
      <div class="static-page-error">
        <h1>Page Not Found</h1>
        <p>${message}</p>
        <a href="/" class="btn-home"><i class="fa fa-home"></i> Back to Home</a>
      </div>`;
  }
}

document.addEventListener('DOMContentLoaded', () => new StaticPageManager().init());

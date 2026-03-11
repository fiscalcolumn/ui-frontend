/**
 * Static Page Manager
 * Fetches and renders static pages from Strapi (About Us, Privacy Policy, etc.)
 */

class StaticPageManager {
  constructor() {
    this.pageContainer = document.getElementById('page-content');
    this.page = null;
  }

  async init() {
    const slug = this.getSlugFromUrl();

    if (!slug) {
      this.showError('Page not found');
      return;
    }

    try {
      this.page = await this.fetchPage(slug);

      if (!this.page) {
        this.showError('Page not found');
        return;
      }

      this.updatePageMeta();
      this.renderPage();

    } catch (error) {
      console.error('Error loading page:', error);
      this.showError('Failed to load page');
    }
  }

  /**
   * Get slug from URL path
   */
  getSlugFromUrl() {
    const path = window.location.pathname;
    // Remove leading and trailing slashes
    const slug = path.replace(/^\/|\/$/g, '');
    return slug || null;
  }

  /**
   * Fetch page by slug
   */
  async fetchPage(slug) {
    const url = getApiUrl(
      `/static-pages?filters[slug][$eq]=${slug}&populate[featuredImage]=true`
    );
    const response = await fetch(url);
    const data = await response.json();
    return data.data && data.data.length > 0 ? data.data[0] : null;
  }

  /**
   * Update page meta tags (SEO)
   */
  updatePageMeta() {
    const title = this.page.metaTitle || this.page.title;
    const description = this.page.metaDescription || this.page.excerpt || '';
    const url = window.location.href;
    const imageUrl = this.page.featuredImage?.url 
      ? `${API_CONFIG.BASE_URL}${this.page.featuredImage.url}` 
      : `${window.location.origin}/images/og-default.jpg`;

    // Page Title
    document.title = `${title} | FiscalColumn`;
    const pageTitleEl = document.getElementById('page-title');
    if (pageTitleEl) pageTitleEl.textContent = `${title} | FiscalColumn`;
    
    // Meta Description
    const metaDesc = document.getElementById('meta-description');
    if (metaDesc) metaDesc.setAttribute('content', description);

    // Canonical URL
    const canonicalEl = document.getElementById('canonical-url');
    if (canonicalEl) canonicalEl.setAttribute('href', url);

    // Open Graph Tags
    this.setMetaContent('og-url', url);
    this.setMetaContent('og-title', title);
    this.setMetaContent('og-description', description);
    this.setMetaContent('og-image', imageUrl);

    // Twitter Card Tags
    this.setMetaContent('twitter-title', title);
    this.setMetaContent('twitter-description', description);

    // JSON-LD Breadcrumb Schema
    const breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": window.location.origin
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": this.page.title,
          "item": url
        }
      ]
    };
    const schemaBreadcrumbEl = document.getElementById('schema-breadcrumb');
    if (schemaBreadcrumbEl) schemaBreadcrumbEl.textContent = JSON.stringify(breadcrumbSchema);

    // Update visible breadcrumb
    const breadcrumbPage = document.getElementById('breadcrumb-page');
    if (breadcrumbPage) breadcrumbPage.textContent = this.page.title;
  }

  /**
   * Helper to set meta tag content by ID
   */
  setMetaContent(id, content) {
    const el = document.getElementById(id);
    if (el) el.setAttribute('content', content);
  }

  /**
   * Render the page content
   */
  renderPage() {
    const hasImage = this.page.featuredImage?.url;
    const imageUrl = hasImage ? `${API_CONFIG.BASE_URL}${this.page.featuredImage.url}` : '';

    // Format content and remove the first H1 (since we show title separately)
    let contentHtml = this.formatContent(this.page.content);
    contentHtml = this.removeFirstH1(contentHtml);

    // Build contact section if it's a contact page
    let contactSectionHtml = '';
    if (this.page.pageType === 'contact') {
      contactSectionHtml = this.renderContactSection();
    }

    this.pageContainer.innerHTML = `
      <h1 class="static-page-title">${this.page.title}</h1>
      
      <div class="static-page-separator"></div>
      
      ${hasImage ? `
      <div class="static-page-image">
        <img src="${imageUrl}" alt="${this.page.title}">
      </div>
      ` : ''}

      <div class="static-page-body">
        ${contentHtml}
      </div>

      ${contactSectionHtml}
    `;
  }

  /**
   * Remove the first H1 tag from HTML content (to avoid duplicate title)
   */
  removeFirstH1(html) {
    // Remove first <h1>...</h1> tag
    return html.replace(/<h1[^>]*>.*?<\/h1>/i, '');
  }

  /**
   * Render contact section for contact pages
   */
  renderContactSection() {
    const email = this.page.contactEmail;
    const phone = this.page.contactPhone;
    const address = this.page.contactAddress;

    if (!email && !phone && !address) return '';

    return `
      <div class="contact-info-section">
        <h2>Get in Touch</h2>
        <div class="contact-info-grid">
          ${email ? `
          <div class="contact-info-item">
            <i class="fa fa-envelope"></i>
            <div>
              <strong>Email</strong>
              <a href="mailto:${email}">${email}</a>
            </div>
          </div>
          ` : ''}
          ${phone ? `
          <div class="contact-info-item">
            <i class="fa fa-phone"></i>
            <div>
              <strong>Phone</strong>
              <a href="tel:${phone}">${phone}</a>
            </div>
          </div>
          ` : ''}
          ${address ? `
          <div class="contact-info-item">
            <i class="fa fa-map-marker"></i>
            <div>
              <strong>Address</strong>
              <p>${address}</p>
            </div>
          </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  /**
   * Format content (Markdown to HTML)
   */
  formatContent(content) {
    if (!content) return '<p>No content available.</p>';
    
    // Check if marked library is available
    if (typeof marked !== 'undefined') {
      marked.setOptions({
        breaks: true,
        gfm: true,
        headerIds: true,
        mangle: false,
      });
      return marked.parse(content);
    }
    
    // Fallback: If content is already HTML, return as is
    if (content.includes('<p>') || content.includes('<div>')) {
      return content;
    }
    
    // Fallback: wrap in paragraphs
    return content.split('\n\n').map(p => `<p>${p}</p>`).join('');
  }

  /**
   * Show error state
   */
  showError(message) {
    document.title = 'Page Not Found | FiscalColumn';
    
    this.pageContainer.innerHTML = `
      <div class="static-page-error">
        <h1>Page Not Found</h1>
        <p>${message}</p>
        <a href="/" class="btn-home">
          <i class="fa fa-home"></i> Back to Home
        </a>
      </div>
    `;
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  const manager = new StaticPageManager();
  manager.init();
});


/**
 * Shared Utility Functions
 * Common functions used across multiple pages
 */

const Utils = {
  formatDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  },

  formatDateLong(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric'
    });
  },

  formatViews(views) {
    if (!views || views === 0) return '0';
    if (views >= 1000000) return (views / 1000000).toFixed(1) + 'M';
    if (views >= 1000) return (views / 1000).toFixed(1) + 'K';
    return views.toString();
  },

  truncateText(text, maxLength) {
    if (!text) return '';
    const stripped = text.replace(/<[^>]*>/g, '');
    if (stripped.length <= maxLength) return stripped;
    return stripped.substring(0, maxLength).trim() + '...';
  },

  formatNumber(num) {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  },

  calculateReadingTime(content) {
    if (!content) return 3;
    const words = content.replace(/<[^>]*>/g, '').split(/\s+/).length;
    return Math.max(1, Math.ceil(words / 200));
  },

  calculateReadingTimeString(content) {
    return `${this.calculateReadingTime(content)} min read`;
  },

  getReadTime(article) {
    return article.minutesToread || this.calculateReadingTime(article.content) || 3;
  },

  formatSlugAsTitle(slug) {
    return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  },

  /** Resolve a Strapi/Cloudinary image URL — returns null if no URL */
  resolveImgUrl(url) {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    const base = window.API_CONFIG?.BASE_URL || '';
    return base + url;
  },

  renderFeaturedArticle(article) {
    const imgUrl = this.resolveImgUrl(article.image?.url);
    const imageHtml = imgUrl
      ? `<div class="featured-image"><img loading="lazy" src="${imgUrl}" alt="${article.title}"></div>`
      : '';
    const categoryName = article.category?.name || 'Article';
    const readTime = article.minutesToread || 3;
    const excerpt = article.excerpt || this.truncateText(article.content, 200);

    return `
      <div class="featured-article">
        ${imageHtml}
        <div class="featured-content">
          <div class="featured-category">${categoryName}</div>
          <h2 class="featured-title">
            <a href="/${article.category?.slug || 'article'}/${article.slug}">${article.title}</a>
          </h2>
          <p class="featured-excerpt">${excerpt}</p>
          <div class="featured-meta">
            <span>${readTime} min read</span>
            <span class="separator">•</span>
            <span>${this.formatDate(article.publishedDate)}</span>
          </div>
        </div>
      </div>
    `;
  },

  renderArticleCard(article) {
    const imgUrl = this.resolveImgUrl(article.image?.url);
    const imageHtml = imgUrl
      ? `<div class="article-card-thumb"><img loading="lazy" src="${imgUrl}" alt="${article.title}"></div>`
      : '<div class="article-card-thumb"><div class="article-card-thumb-placeholder"></div></div>';
    const categoryName = article.category?.name || 'Article';
    const readTime = article.minutesToread || 3;
    const excerpt = article.excerpt || this.truncateText(article.content, 80);

    return `
      <div class="article-card">
        ${imageHtml}
        <div class="article-card-content">
          <div class="article-card-category">${categoryName}</div>
          <h3 class="article-card-title">
            <a href="/${article.category?.slug || 'article'}/${article.slug}">${article.title}</a>
          </h3>
          <p class="article-card-excerpt">${excerpt}</p>
          <div class="article-card-meta">
            <span>${readTime} min read</span>
            <span class="separator">•</span>
            <span>${this.formatDate(article.publishedDate)}</span>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Render pagination into DOM elements.
   * @param {object} opts
   * @param {HTMLElement} opts.container      - Wrapper element to show/hide
   * @param {HTMLElement} opts.listEl         - <ul> element for page items
   * @param {number}      opts.currentPage
   * @param {number}      opts.totalItems
   * @param {number}      opts.pageSize
   * @param {string}      [opts.displayStyle] - CSS display value when visible (default: 'block')
   * @param {function}    opts.onPageChange   - Called with new page number on click
   */
  renderPagination({ container, listEl, currentPage, totalItems, pageSize, displayStyle = 'block', onPageChange }) {
    const totalPages = Math.ceil(totalItems / pageSize);

    if (totalPages <= 1) {
      container.style.display = 'none';
      return;
    }

    container.style.display = displayStyle;

    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    let html = `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
      <a class="page-link" href="#" data-page="${currentPage - 1}"><i class="fa fa-chevron-left"></i></a>
    </li>`;

    if (startPage > 1) {
      html += `<li class="page-item"><a class="page-link" href="#" data-page="1">1</a></li>`;
      if (startPage > 2) html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
    }

    for (let i = startPage; i <= endPage; i++) {
      html += `<li class="page-item ${i === currentPage ? 'active' : ''}">
        <a class="page-link" href="#" data-page="${i}">${i}</a>
      </li>`;
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
      html += `<li class="page-item"><a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a></li>`;
    }

    html += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
      <a class="page-link" href="#" data-page="${currentPage + 1}"><i class="fa fa-chevron-right"></i></a>
    </li>`;

    listEl.innerHTML = html;

    listEl.querySelectorAll('.page-link[data-page]').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        const page = parseInt(link.dataset.page);
        if (page >= 1 && page <= totalPages && page !== currentPage) {
          onPageChange(page);
        }
      });
    });
  }
};

window.Utils = Utils;

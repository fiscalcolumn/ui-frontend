/**
 * Tag Page Manager
 * Fetches and renders articles for a specific tag with tag group, similar tags, and related tags
 */

class TagPageManager {
  constructor() {
    this.articlesContainer = document.getElementById('articles-container');
    this.paginationContainer = document.getElementById('pagination-container');
    this.pagination = document.getElementById('pagination');
    this.currentPage = 1;
    this.pageSize = 11;
    this.tag = null;
    this.totalArticles = 0;
  }

  /**
   * Initialize the tag page
   */
  async init() {
    // Get tag slug from URL
    const slug = this.getTagSlug();
    
    if (!slug) {
      window.location.href = '/';
      return;
    }

    // Immediately set a formatted slug as title (before API loads)
    const formattedSlug = this.formatSlugAsTitle(slug);
    document.title = `${formattedSlug} - FiscalColumn`;
    document.getElementById('breadcrumb-tag').textContent = formattedSlug;
    document.getElementById('tag-title').textContent = formattedSlug;

    try {
      // Fetch tag details with relations
      this.tag = await this.fetchTag(slug);
      
      if (!this.tag) {
        window.location.href = '/';
        return;
      }

      // Update page with actual tag info
      this.updateTagInfo();
      
      // Render similar and related tags
      this.renderSimilarTags();
      this.renderRelatedTags();
      
      // Fetch and render articles
      await this.loadArticles();
      
    } catch (error) {
      console.error('Error loading tag:', error);
      // Redirect to home page on error
      window.location.href = '/';
    }
  }

  /**
   * Format slug as readable title (e.g., "stock-market" → "Stock Market")
   */
  formatSlugAsTitle(slug) {
    return slug
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Get tag slug from URL path
   */
  getTagSlug() {
    const path = window.location.pathname;
    // URL format: /tag/slug
    const match = path.match(/\/tag\/(.+)/);
    return match ? match[1].replace(/\/$/, '') : null;
  }

  /**
   * Fetch tag details by slug with relations
   */
  async fetchTag(slug) {
    const url = getApiUrl(`/tags?filters[slug][$eq]=${slug}&populate[tagGroup]=true&populate[similarTags]=true&populate[relatedTags]=true`);
    const response = await fetch(url);
    const data = await response.json();
    return data.data && data.data.length > 0 ? data.data[0] : null;
  }

  /**
   * Fetch articles for the tag
   */
  async fetchArticles(page = 1) {
    const start = (page - 1) * this.pageSize;
    const url = getApiUrl(
      `/articles?populate[category]=true&populate[image]=true&populate[tags]=true&filters[tags][documentId][$eq]=${this.tag.documentId}&pagination[start]=${start}&pagination[limit]=${this.pageSize}&sort=publishedDate:desc`
    );
    const response = await fetch(url);
    const data = await response.json();
    
    this.totalArticles = data.meta?.pagination?.total || 0;
    return data.data || [];
  }

  /**
   * Update page with tag information
   */
  updateTagInfo() {
    // Update page title and meta
    document.title = `${this.tag.name} - FiscalColumn`;
    document.getElementById('tag-title').textContent = this.tag.name;
    document.getElementById('breadcrumb-tag').textContent = this.tag.name;
    
    // Update meta description
    if (this.tag.description) {
      document.getElementById('meta-description').setAttribute('content', this.tag.description);
    }
    
    // Update related tags count
    const relatedCount = this.tag.relatedTags?.length || 0;
    if (relatedCount > 0) {
      document.getElementById('tag-related-count').style.display = 'inline';
      document.getElementById('related-count').textContent = relatedCount;
    }
  }

  /**
   * Render similar tags
   */
  renderSimilarTags() {
    const similarTags = this.tag.similarTags || [];
    if (similarTags.length === 0) return;
    
    document.getElementById('tags-section').style.display = 'block';
    document.getElementById('similar-tags-container').style.display = 'block';
    
    const container = document.getElementById('similar-tags-row');
    container.innerHTML = similarTags.map(tag => `
      <a href="/tag/${tag.slug}" class="tag-pill similar">
        <i class="fa fa-tag"></i>
        ${tag.name}
      </a>
    `).join('');
  }

  /**
   * Render related tags in sidebar
   */
  renderRelatedTags() {
    const relatedTags = this.tag.relatedTags || [];
    if (relatedTags.length === 0) return;
    
    const sidebar = document.getElementById('related-tags-sidebar');
    const container = document.getElementById('sidebar-tags-list');
    
    if (!sidebar || !container) return;
    
    sidebar.style.display = 'block';
    
    container.innerHTML = relatedTags.map(tag => `
      <a href="/tag/${tag.slug}" class="sidebar-tag-item">
        <div class="sidebar-tag-icon">
          <i class="fa fa-tag"></i>
        </div>
        <span class="sidebar-tag-name">${tag.name}</span>
        <i class="fa fa-chevron-right sidebar-tag-arrow"></i>
      </a>
    `).join('');
  }

  /**
   * Load and render articles
   */
  async loadArticles() {
    // Show loading
    this.articlesContainer.innerHTML = `
      <div class="loading-container">
        <div class="spinner"></div>
        <p>Loading articles...</p>
      </div>
    `;

    const articles = await this.fetchArticles(this.currentPage);
    
    // Update article count
    document.getElementById('tag-article-count').innerHTML = `
      <i class="fa fa-newspaper-o"></i> ${this.totalArticles} article${this.totalArticles !== 1 ? 's' : ''}
    `;
    
    if (articles.length === 0) {
      // Hide featured article wrapper but keep sidebar visible if there are related tags
      const featuredWrapper = document.getElementById('featured-article-wrapper');
      if (featuredWrapper) {
        featuredWrapper.innerHTML = `
          <div class="no-articles">
            <h3>No articles found</h3>
            <p>There are no articles with this tag yet.</p>
          </div>
        `;
      }
      this.articlesContainer.innerHTML = '';
      this.paginationContainer.style.display = 'none';
      return;
    }

    // Render featured article in sidebar layout
    const featuredArticle = articles[0];
    const gridArticles = articles.slice(1);
    
    // Featured article in wrapper (left side)
    const featuredWrapper = document.getElementById('featured-article-wrapper');
    if (featuredWrapper) {
      featuredWrapper.innerHTML = this.renderFeaturedArticle(featuredArticle);
    }
    
    // Articles grid (below)
    if (gridArticles.length > 0) {
      this.articlesContainer.innerHTML = `<div class="articles-grid">
        ${gridArticles.map(article => this.renderArticleCard(article)).join('')}
      </div>`;
    } else {
      this.articlesContainer.innerHTML = '';
    }
    
    // Render pagination
    this.renderPagination();
  }

  /**
   * Render featured article (image on top, content below)
   */
  renderFeaturedArticle(article) {
    const hasImage = article.image?.url;
    const imageHtml = hasImage 
      ? `<div class="featured-image"><img src="${API_CONFIG.BASE_URL}${article.image.url}" alt="${article.title}"></div>`
      : '';
    
    const categoryName = article.category?.name || 'Article';
    const readTime = article.minutesToread || 3;
    const excerpt = article.excerpt || Utils.truncateText(article.content, 200);

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
            <span>${Utils.formatDate(article.publishedDate)}</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render a single article card
   */
  renderArticleCard(article) {
    const hasImage = article.image?.url;
    const imageHtml = hasImage 
      ? `<div class="article-card-thumb"><img src="${API_CONFIG.BASE_URL}${article.image.url}" alt="${article.title}"></div>`
      : '<div class="article-card-thumb"><div class="article-card-thumb-placeholder"></div></div>';
    
    const categoryName = article.category?.name || 'Article';
    const readTime = article.minutesToread || 3;
    const excerpt = article.excerpt || Utils.truncateText(article.content, 80);

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
            <span>${Utils.formatDate(article.publishedDate)}</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Format date to readable string
   */
  /**
   * Render pagination
   */
  renderPagination() {
    const totalPages = Math.ceil(this.totalArticles / this.pageSize);
    
    if (totalPages <= 1) {
      this.paginationContainer.style.display = 'none';
      return;
    }

    this.paginationContainer.style.display = 'block';
    
    let html = '';
    
    // Previous button
    html += `
      <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
        <a class="page-link" href="#" data-page="${this.currentPage - 1}">
          <i class="fa fa-chevron-left"></i>
        </a>
      </li>
    `;
    
    // Page numbers
    const startPage = Math.max(1, this.currentPage - 2);
    const endPage = Math.min(totalPages, this.currentPage + 2);
    
    if (startPage > 1) {
      html += `<li class="page-item"><a class="page-link" href="#" data-page="1">1</a></li>`;
      if (startPage > 2) {
        html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
      }
    }
    
    for (let i = startPage; i <= endPage; i++) {
      html += `
        <li class="page-item ${i === this.currentPage ? 'active' : ''}">
          <a class="page-link" href="#" data-page="${i}">${i}</a>
        </li>
      `;
    }
    
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
      }
      html += `<li class="page-item"><a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a></li>`;
    }
    
    // Next button
    html += `
      <li class="page-item ${this.currentPage === totalPages ? 'disabled' : ''}">
        <a class="page-link" href="#" data-page="${this.currentPage + 1}">
          <i class="fa fa-chevron-right"></i>
        </a>
      </li>
    `;
    
    this.pagination.innerHTML = html;
    
    // Add click handlers
    this.pagination.querySelectorAll('.page-link[data-page]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = parseInt(link.dataset.page);
        if (page >= 1 && page <= totalPages && page !== this.currentPage) {
          this.currentPage = page;
          this.loadArticles();
          // Scroll to articles section
          document.getElementById('articles-container').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  /**
   * Truncate text and strip HTML
   */

  /**
   * Show error message
   */
  showError(message) {
    document.getElementById('tag-title').textContent = 'Error';
    document.getElementById('tag-description').textContent = message;
    document.getElementById('tag-article-count').innerHTML = '';
    this.articlesContainer.innerHTML = `
      <div class="no-articles">
        <h3>${message}</h3>
        <p><a href="/">Return to homepage</a></p>
      </div>
    `;
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  const manager = new TagPageManager();
  manager.init();
});

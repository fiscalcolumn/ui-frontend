/**
 * Tag Group Page Manager
 * Fetches a tag group by slug, shows its tags, article count, and all articles
 * that belong to any tag within the group.
 */

class TagGroupPageManager {
  constructor() {
    this.articlesContainer = document.getElementById('articles-container');
    this.paginationContainer = document.getElementById('pagination-container');
    this.pagination = document.getElementById('pagination');
    this.currentPage = 1;
    this.pageSize = 11;
    this.group = null;
    this.totalArticles = 0;
  }

  async init() {
    const slug = this.getGroupSlug();

    if (!slug) {
      window.location.href = '/tags';
      return;
    }

    // Immediate placeholder from slug
    const formatted = this.formatSlug(slug);
    document.title = `${formatted} - FiscalColumn`;
    document.getElementById('breadcrumb-group').textContent = formatted;
    document.getElementById('group-name').textContent = formatted;

    try {
      this.group = await this.fetchGroup(slug);

      if (!this.group) {
        this.showNotFound();
        return;
      }

      this.updateGroupInfo();
      await this.loadArticles();

    } catch (err) {
      console.error('Error loading tag group:', err);
      this.showNotFound();
    }
  }

  getGroupSlug() {
    const match = window.location.pathname.match(/\/tag-group\/(.+)/);
    return match ? match[1].replace(/\/$/, '') : null;
  }

  formatSlug(slug) {
    return slug
      .split('-')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  async fetchGroup(slug) {
    const url = getApiUrl(
      `/tag-groups?filters[slug][$eq]=${slug}&populate[tags]=true&pagination[limit]=1`
    );
    const res = await fetch(url);
    const data = await res.json();
    return data.data && data.data.length > 0 ? data.data[0] : null;
  }

  async fetchArticles(page = 1) {
    const start = (page - 1) * this.pageSize;
    const url = getApiUrl(
      `/articles?populate[category]=true&populate[image]=true&populate[tags]=true` +
      `&filters[tags][tagGroup][slug][$eq]=${this.group.slug}` +
      `&pagination[start]=${start}&pagination[limit]=${this.pageSize}` +
      `&sort=publishedDate:desc`
    );
    const res = await fetch(url);
    const data = await res.json();
    this.totalArticles = data.meta?.pagination?.total || 0;
    return data.data || [];
  }

  updateGroupInfo() {
    const name = this.group.name || '';
    const desc = this.group.description || '';
    const tags = this.group.tags || [];

    document.title = `${name} - FiscalColumn`;
    document.getElementById('breadcrumb-group').textContent = name;
    document.getElementById('group-name').textContent = name;

    if (desc) {
      const descEl = document.getElementById('group-desc');
      descEl.textContent = desc;
      descEl.style.display = 'block';
      document.getElementById('meta-description').setAttribute('content', desc);
    }

    // Tag count (will update after article load for article count)
    document.getElementById('group-tag-count').innerHTML =
      `<i class="fa fa-tags"></i> ${tags.length} tag${tags.length !== 1 ? 's' : ''}`;

    // Render tag pills with | separators
    const tagsRow = document.getElementById('group-tags-row');
    if (tags.length > 0) {
      tagsRow.innerHTML = tags.map((tag, i) => `
        <a href="/tag/${tag.slug}" class="tg-tag-pill">
          <i class="fa fa-tag"></i> ${tag.name}
        </a>${i < tags.length - 1 ? '<span class="tg-tag-sep">|</span>' : ''}
      `).join('');
    }
  }

  async loadArticles() {
    this.articlesContainer.innerHTML = `
      <div class="loading-container">
        <div class="spinner"></div>
        <p>Loading articles...</p>
      </div>
    `;

    const articles = await this.fetchArticles(this.currentPage);

    // Update article count now that we have the total
    document.getElementById('group-article-count').innerHTML =
      `<i class="fa fa-newspaper-o"></i> ${this.totalArticles} article${this.totalArticles !== 1 ? 's' : ''}`;

    if (articles.length === 0) {
      const featuredWrapper = document.getElementById('featured-article-wrapper');
      if (featuredWrapper) {
        featuredWrapper.innerHTML = `
          <div class="no-articles">
            <h3>No articles found</h3>
            <p>There are no articles in this topic yet.</p>
          </div>
        `;
      }
      this.articlesContainer.innerHTML = '';
      this.paginationContainer.style.display = 'none';
      return;
    }

    const [featured, ...rest] = articles;

    const featuredWrapper = document.getElementById('featured-article-wrapper');
    if (featuredWrapper) {
      featuredWrapper.innerHTML = this.renderFeaturedArticle(featured);
    }

    if (rest.length > 0) {
      this.articlesContainer.innerHTML = `
        <div class="articles-grid">
          ${rest.map(a => this.renderArticleCard(a)).join('')}
        </div>
      `;
    } else {
      this.articlesContainer.innerHTML = '';
    }

    this.renderPagination();
  }

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

  renderPagination() {
    const totalPages = Math.ceil(this.totalArticles / this.pageSize);

    if (totalPages <= 1) {
      this.paginationContainer.style.display = 'none';
      return;
    }

    this.paginationContainer.style.display = 'block';
    let html = '';

    html += `
      <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
        <a class="page-link" href="#" data-page="${this.currentPage - 1}">
          <i class="fa fa-chevron-left"></i>
        </a>
      </li>
    `;

    const startPage = Math.max(1, this.currentPage - 2);
    const endPage = Math.min(totalPages, this.currentPage + 2);

    if (startPage > 1) {
      html += `<li class="page-item"><a class="page-link" href="#" data-page="1">1</a></li>`;
      if (startPage > 2) html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
    }

    for (let i = startPage; i <= endPage; i++) {
      html += `
        <li class="page-item ${i === this.currentPage ? 'active' : ''}">
          <a class="page-link" href="#" data-page="${i}">${i}</a>
        </li>
      `;
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
      html += `<li class="page-item"><a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a></li>`;
    }

    html += `
      <li class="page-item ${this.currentPage === totalPages ? 'disabled' : ''}">
        <a class="page-link" href="#" data-page="${this.currentPage + 1}">
          <i class="fa fa-chevron-right"></i>
        </a>
      </li>
    `;

    this.pagination.innerHTML = html;

    this.pagination.querySelectorAll('.page-link[data-page]').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        const page = parseInt(link.dataset.page);
        if (page >= 1 && page <= totalPages && page !== this.currentPage) {
          this.currentPage = page;
          this.loadArticles();
          document.getElementById('articles-container').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  showNotFound() {
    document.getElementById('group-name').textContent = 'Topic Not Found';
    this.articlesContainer.innerHTML = `
      <div class="no-articles">
        <h3>Topic not found</h3>
        <p><a href="/tags">Browse all topics</a></p>
      </div>
    `;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const manager = new TagGroupPageManager();
  manager.init();
});

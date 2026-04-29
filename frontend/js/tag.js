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

    const formattedSlug = Utils.formatSlugAsTitle(slug);
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
    const name = this.tag.name;
    const slug = this.tag.slug;
    const desc = this.tag.description || '';
    const group = this.tag.tagGroup;
    const pageUrl = `${window.location.origin}/tag/${slug}`;
    const metaTitle = `${name} | FiscalColumn`;
    const metaDesc = desc.length > 160 ? desc.slice(0, 157) + '...' : desc || `Articles tagged ${name} on FiscalColumn`;

    // Title + basic meta
    document.title = metaTitle;
    const pageTitleEl = document.getElementById('page-title');
    if (pageTitleEl) pageTitleEl.textContent = metaTitle;
    document.getElementById('meta-description').setAttribute('content', metaDesc);

    // Canonical
    const canonicalEl = document.getElementById('canonical-url');
    if (canonicalEl) canonicalEl.setAttribute('href', pageUrl);

    // OG + Twitter
    const setMeta = (id, val) => { const el = document.getElementById(id); if (el) el.setAttribute('content', val); };
    setMeta('og-url', pageUrl);
    setMeta('og-title', metaTitle);
    setMeta('og-description', metaDesc);
    setMeta('twitter-title', metaTitle);
    setMeta('twitter-description', metaDesc);

    const origin = window.location.origin;
    const crumbs = [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
      { '@type': 'ListItem', position: 2, name: 'Topics', item: `${origin}/tags` }
    ];
    if (group && group.slug) {
      crumbs.push({ '@type': 'ListItem', position: 3, name: group.name || group.slug, item: `${origin}/tag-group/${group.slug}` });
      crumbs.push({ '@type': 'ListItem', position: 4, name: name, item: pageUrl });
    } else {
      crumbs.push({ '@type': 'ListItem', position: 3, name: name, item: pageUrl });
    }
    const breadcrumbEl = document.getElementById('schema-breadcrumb');
    if (breadcrumbEl) breadcrumbEl.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: crumbs });

    // DOM updates
    document.getElementById('tag-title').textContent = name;
    document.getElementById('breadcrumb-tag').textContent = name;

    // Inject group breadcrumb item if tag belongs to a group
    if (group && group.slug) {
      const tagCrumb = document.getElementById('breadcrumb-tag');
      const groupCrumb = document.createElement('li');
      groupCrumb.className = 'breadcrumb-item';
      groupCrumb.innerHTML = `<a href="/tag-group/${group.slug}">${group.name || group.slug}</a>`;
      tagCrumb.parentNode.insertBefore(groupCrumb, tagCrumb);
    }

    // Description
    if (desc) {
      const descEl = document.getElementById('tag-desc');
      descEl.textContent = desc;
      descEl.style.display = 'block';
    }
  }

  /**
   * Render similar tags as pipe-separated links in info bar
   */
  renderSimilarTags() {
    const tags = this.tag.similarTags || [];
    if (tags.length === 0) return;

    const section = document.getElementById('similar-tags-section');
    const row = document.getElementById('similar-tags-row');
    section.style.display = 'flex';

    row.innerHTML = tags.map((tag, i) =>
      `<a href="/tag/${tag.slug}" class="ti-tag-link">${tag.name.toUpperCase()}</a>${i < tags.length - 1 ? '<span class="ti-tag-sep">|</span>' : ''}`
    ).join('');
  }

  /**
   * Render related tags as pipe-separated links in info bar
   */
  renderRelatedTags() {
    const tags = this.tag.relatedTags || [];
    if (tags.length === 0) return;

    const section = document.getElementById('related-tags-section');
    const row = document.getElementById('related-tags-row');
    section.style.display = 'flex';

    row.innerHTML = tags.map((tag, i) =>
      `<a href="/tag/${tag.slug}" class="ti-tag-link">${tag.name.toUpperCase()}</a>${i < tags.length - 1 ? '<span class="ti-tag-sep">|</span>' : ''}`
    ).join('');
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

    const featuredArticle = articles[0];
    const gridArticles = articles.slice(1);
    
    const featuredWrapper = document.getElementById('featured-article-wrapper');
    if (featuredWrapper) {
      featuredWrapper.innerHTML = Utils.renderFeaturedArticle(featuredArticle);
    }

    this.articlesContainer.innerHTML = gridArticles.length > 0
      ? `<div class="articles-grid">${gridArticles.map(a => Utils.renderArticleCard(a)).join('')}</div>`
      : '';

    Utils.renderPagination({
      container: this.paginationContainer,
      listEl: this.pagination,
      currentPage: this.currentPage,
      totalItems: this.totalArticles,
      pageSize: this.pageSize,
      onPageChange: page => {
        this.currentPage = page;
        this.loadArticles();
        document.getElementById('articles-container').scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

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

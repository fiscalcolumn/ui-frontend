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
    const formatted = Utils.formatSlugAsTitle(slug);
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
    const slug = this.group.slug || '';
    const desc = this.group.description || '';
    const tags = this.group.tags || [];
    const pageUrl = `${window.location.origin}/tag-group/${slug}`;
    const metaTitle = `${name} | FiscalColumn`;
    const metaDesc = desc.length > 160 ? desc.slice(0, 157) + '...' : desc || `Articles in ${name} topic group on FiscalColumn`;

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
    const breadcrumbEl = document.getElementById('schema-breadcrumb');
    if (breadcrumbEl) breadcrumbEl.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
        { '@type': 'ListItem', position: 2, name: 'Topics', item: `${origin}/tags` },
        { '@type': 'ListItem', position: 3, name: name, item: pageUrl }
      ]
    });

    // DOM updates
    document.getElementById('breadcrumb-group').textContent = name;
    document.getElementById('group-name').textContent = name;

    if (desc) {
      const descEl = document.getElementById('group-desc');
      descEl.textContent = desc;
      descEl.style.display = 'block';
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
      featuredWrapper.innerHTML = Utils.renderFeaturedArticle(featured);
    }

    this.articlesContainer.innerHTML = rest.length > 0
      ? `<div class="articles-grid">${rest.map(a => Utils.renderArticleCard(a)).join('')}</div>`
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

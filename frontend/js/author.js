/**
 * Author Page Manager
 * Fetches and renders all articles written by a specific author
 */

class AuthorPageManager {
  constructor() {
    this.articlesContainer = document.getElementById('articles-container');
    this.paginationContainer = document.getElementById('pagination-container');
    this.pagination = document.getElementById('pagination');
    this.currentPage = 1;
    this.pageSize = 11;
    this.author = null;
    this.totalArticles = 0;
  }

  async init() {
    const slug = this.getAuthorSlug();

    if (!slug) {
      window.location.href = '/';
      return;
    }

    const formattedName = Utils.formatSlugAsTitle(slug);
    document.title = `${formattedName} - FiscalColumn`;
    document.getElementById('breadcrumb-author').textContent = formattedName;
    document.getElementById('author-name').textContent = formattedName;
    document.getElementById('author-avatar-initial').textContent = formattedName.charAt(0).toUpperCase();

    try {
      this.author = await this.fetchAuthor(slug);

      if (!this.author) {
        this.showError('Author not found');
        return;
      }

      this.updateAuthorInfo();
      await this.loadArticles();

    } catch (error) {
      console.error('Error loading author page:', error);
      this.showError('Failed to load author');
    }
  }

  getAuthorSlug() {
    const path = window.location.pathname;
    const match = path.match(/\/author\/(.+)/);
    return match ? match[1].replace(/\/$/, '') : null;
  }

  async fetchAuthor(slug) {
    const url = getApiUrl(`/authors?filters[slug][$eq]=${slug}&populate[photo]=true`);
    const response = await fetch(url);
    const data = await response.json();
    return data.data && data.data.length > 0 ? data.data[0] : null;
  }

  async fetchArticles(page = 1) {
    const start = (page - 1) * this.pageSize;
    const url = getApiUrl(
      `/articles?populate[category]=true&populate[image]=true&populate[tags]=true&filters[author][documentId][$eq]=${this.author.documentId}&pagination[start]=${start}&pagination[limit]=${this.pageSize}&sort=publishedDate:desc`
    );
    const response = await fetch(url);
    const data = await response.json();
    this.totalArticles = data.meta?.pagination?.total || 0;
    return data.data || [];
  }

  updateAuthorInfo() {
    const name = this.author.name || Utils.formatSlugAsTitle(this.getAuthorSlug());
    const slug = this.author.slug || this.getAuthorSlug();
    const imgBase = window.API_CONFIG?.BASE_URL || '';
    const photoUrl = this.author.photo?.url ? `${imgBase}${this.author.photo.url}` : null;
    const bio = this.author.bio || '';
    const pageUrl = `${window.location.origin}/author/${slug}`;
    const ogImage = photoUrl || '/images/og-default.jpg';
    const metaTitle = `${name} | FiscalColumn`;
    const metaDesc = bio.length > 160 ? bio.slice(0, 157) + '...' : bio || `Articles by ${name} on FiscalColumn`;

    // Title + basic meta
    document.title = metaTitle;
    const pageTitleEl = document.getElementById('page-title');
    if (pageTitleEl) pageTitleEl.textContent = metaTitle;
    document.getElementById('meta-description').setAttribute('content', metaDesc);

    // Canonical
    const canonicalEl = document.getElementById('canonical-url');
    if (canonicalEl) canonicalEl.setAttribute('href', pageUrl);

    // OG
    const setMeta = (id, val) => { const el = document.getElementById(id); if (el) el.setAttribute('content', val); };
    setMeta('og-url', pageUrl);
    setMeta('og-title', metaTitle);
    setMeta('og-description', metaDesc);
    setMeta('og-image', ogImage);
    setMeta('twitter-title', metaTitle);
    setMeta('twitter-description', metaDesc);
    setMeta('twitter-image', ogImage);

    const breadcrumbEl = document.getElementById('schema-breadcrumb');
    if (breadcrumbEl) breadcrumbEl.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${window.location.origin}/` },
        { '@type': 'ListItem', position: 2, name: 'Authors', item: `${window.location.origin}/author` },
        { '@type': 'ListItem', position: 3, name: name, item: pageUrl }
      ]
    });

    const profileEl = document.getElementById('schema-profile');
    if (profileEl) profileEl.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'ProfilePage',
      name: metaTitle,
      url: pageUrl,
      mainEntity: {
        '@type': 'Person',
        name,
        description: bio || undefined,
        image: ogImage !== '/images/og-default.jpg' ? ogImage : undefined,
        url: pageUrl
      }
    });

    // DOM updates
    document.getElementById('author-name').textContent = name;
    document.getElementById('breadcrumb-author').textContent = name;

    const avatarEl = document.getElementById('author-avatar-svg');
    if (photoUrl && avatarEl) {
      const img = document.createElement('img');
      img.src = photoUrl;
      img.alt = name;
      img.className = 'author-profile-photo';
      avatarEl.replaceWith(img);
    } else {
      const initial = name.charAt(0).toUpperCase();
      document.getElementById('author-avatar-initial').textContent = initial;
    }

    if (this.author.designation) {
      const el = document.getElementById('author-designation');
      el.textContent = this.author.designation;
      el.style.display = 'block';
    }
    if (bio) {
      const el = document.getElementById('author-bio');
      el.textContent = bio;
      el.style.display = 'block';
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

    // Update article count
    document.getElementById('author-article-count').innerHTML = `
      <i class="fa fa-newspaper-o"></i> ${this.totalArticles} article${this.totalArticles !== 1 ? 's' : ''}
    `;

    if (articles.length === 0) {
      const featuredWrapper = document.getElementById('featured-article-wrapper');
      if (featuredWrapper) {
        featuredWrapper.innerHTML = `
          <div class="no-articles">
            <h3>No articles yet</h3>
            <p>This author hasn't published any articles.</p>
          </div>
        `;
      }
      this.articlesContainer.innerHTML = '';
      this.paginationContainer.style.display = 'none';
      return;
    }

    const featuredWrapper = document.getElementById('featured-article-wrapper');
    if (featuredWrapper) {
      featuredWrapper.innerHTML = Utils.renderFeaturedArticle(articles[0]);
    }

    const gridArticles = articles.slice(1);
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

  showError(message) {
    document.getElementById('author-name').textContent = 'Author Not Found';
    this.articlesContainer.innerHTML = `
      <div class="no-articles">
        <h3>${message}</h3>
        <p><a href="/">Return to homepage</a></p>
      </div>
    `;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const manager = new AuthorPageManager();
  manager.init();
});

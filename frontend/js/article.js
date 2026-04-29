/**
 * Article Page - Dynamic content loader
 * Fetches article content from Strapi based on URL: /{category}/{article-slug}
 */

class ArticlePageManager {
  constructor() {
    this.articleContainer = document.getElementById('article-content');
    this.sidebarContainer = document.getElementById('article-sidebar');
    this.article = null;
    this.categories = [];
  }

  async init() {
    const { categorySlug, articleSlug } = this.getSlugsFromUrl();

    if (!articleSlug) {
      this.showError('Article not found');
      return;
    }

    try {
      // Fetch article and sidebar data in parallel
      const [article, latestArticles, tags] = await Promise.all([
        this.fetchArticle(articleSlug),
        this.fetchLatestArticles(),
        this.fetchPopularTags()
      ]);

      this.article = article;

      if (!this.article) {
        this.showError('Article not found');
        return;
      }

      // Increment view count and update the article's view count
      const updatedViews = await this.incrementViewCount();
      if (updatedViews !== null) {
        this.article.views = updatedViews;
      } else {
        // If increment failed, at least show current views + 1
        this.article.views = (this.article.views || 0) + 1;
      }

      // Fetch related articles from the same category (after we know the category)
      const relatedArticles = await this.fetchRelatedArticles();

      // Update page
      this.updatePageMeta();
      this.renderArticle();
      this.renderSidebar(latestArticles, relatedArticles, tags);

    } catch (error) {
      console.error('Error loading article:', error);
      this.showError('Failed to load article');
    }
  }

  /**
   * Extract category and article slugs from URL
   */
  getSlugsFromUrl() {
    const path = window.location.pathname;
    const parts = path.split('/').filter(p => p);
    
    return {
      categorySlug: parts[0] || null,
      articleSlug: parts[1] || null
    };
  }

  /**
   * Fetch article by slug
   */
  async fetchArticle(slug) {
    const url = getApiUrl(
      `/articles?filters[slug][$eq]=${slug}&populate[category]=true&populate[image]=true&populate[tags]=true&populate[author][populate][photo]=true`
    );
    const response = await fetch(url);
    const data = await response.json();
    return data.data && data.data.length > 0 ? data.data[0] : null;
  }

  /**
   * Fetch latest articles for sidebar (10 articles, show 5 with scroll)
   */
  async fetchLatestArticles() {
    const url = getApiUrl('/articles?populate[image]=true&populate[category]=true&pagination[limit]=10&sort=publishedDate:desc');
    const response = await fetch(url);
    const data = await response.json();
    return data.data || [];
  }

  /**
   * Fetch related articles from the same category (5 articles, excluding current)
   */
  async fetchRelatedArticles() {
    if (!this.article?.category?.documentId) return [];
    
    try {
      const categoryDocId = this.article.category.documentId;
      const currentArticleId = this.article.documentId;
      
      const url = getApiUrl(
        `/articles?populate[image]=true&populate[category]=true&filters[category][documentId][$eq]=${categoryDocId}&filters[documentId][$ne]=${currentArticleId}&pagination[limit]=5&sort=publishedDate:desc`
      );
      const response = await fetch(url);
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Failed to fetch related articles:', error);
      return [];
    }
  }

  /**
   * Increment view count for the current article
   * @returns {Promise<number|null>} The new view count, or null if failed
   */
  async incrementViewCount() {
    if (!this.article?.documentId) return null;
    
    try {
      const url = getApiUrl(`/articles/${this.article.documentId}/view`);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const result = await response.json();
        return result.data?.views || null;
      }
      return null;
    } catch (error) {
      console.error('Failed to increment view count:', error);
      return null;
    }
  }

  /**
   * Fetch tags for sidebar
   */
  async fetchPopularTags() {
    try {
      const url = getApiUrl('/tags?sort=name:asc&pagination[pageSize]=20');
      const response = await fetch(url);
      if (!response.ok) return [];
      const data = await response.json();
      return data.data || [];
    } catch (e) {
      return [];
    }
  }

  /**
   * Update page title and meta (SEO)
   */
  updatePageMeta() {
    const title = this.article.title;
    const description = this.article.excerpt || Utils.truncateText(this.article.content, 160);
    const url = window.location.href;
    const imageUrl = this.article.image?.url
      ? Utils.resolveImgUrl(this.article.image.url)
      : `${window.location.origin}/images/default-og.jpg`;
    const author = this.article.author?.name || this.article.author || 'FiscalColumn';
    const publishDate = this.article.publishedDate;
    const category = this.article.category;

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
    this.setMetaContent('twitter-url', url);
    this.setMetaContent('twitter-title', title);
    this.setMetaContent('twitter-description', description);
    this.setMetaContent('twitter-image', imageUrl);

    // JSON-LD Article Schema
    const articleSchema = {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": title,
      "description": description,
      "image": imageUrl,
      "author": {
        "@type": "Person",
        "name": author
      },
      "publisher": {
        "@type": "Organization",
        "name": "FiscalColumn",
        "logo": {
          "@type": "ImageObject",
          "url": `${window.location.origin}/images/logo.png`
        }
      },
      "datePublished": publishDate,
      "dateModified": this.article.updatedAt || publishDate,
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": url
      }
    };
    const schemaArticleEl = document.getElementById('schema-article');
    if (schemaArticleEl) schemaArticleEl.textContent = JSON.stringify(articleSchema);

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
          "name": category?.name || "Articles",
          "item": `${window.location.origin}/${category?.slug || 'articles'}`
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": title,
          "item": url
        }
      ]
    };
    const schemaBreadcrumbEl = document.getElementById('schema-breadcrumb');
    if (schemaBreadcrumbEl) schemaBreadcrumbEl.textContent = JSON.stringify(breadcrumbSchema);

    // Update visible breadcrumb
    const categoryLink = document.getElementById('breadcrumb-category-link');
    const articleBreadcrumb = document.getElementById('breadcrumb-article');
    
    if (category) {
      categoryLink.textContent = category.name;
      categoryLink.href = `/${category.slug}`;
    }
    
    articleBreadcrumb.textContent = Utils.truncateText(title, 40);
  }

  /**
   * Helper to set meta tag content by ID
   */
  setMetaContent(id, content) {
    const el = document.getElementById(id);
    if (el) el.setAttribute('content', content);
  }

  /**
   * Render article content
   */
  renderArticle() {
    const hasImage = this.article.image?.url;
    const imageUrl = hasImage ? Utils.resolveImgUrl(this.article.image.url) : '';
    const publishDate = Utils.formatDateLong(this.article.publishedDate);
    const authorObj = this.article.author;
    const author = authorObj?.name || (typeof authorObj === 'string' ? authorObj : 'Admin');
    const authorSlug = authorObj?.slug || null;
    const views = this.article.views || 0;
    const readTime = this.article.minutesToread || 3;
    const category = this.article.category;

    const shareUrl = encodeURIComponent(window.location.href);
    const shareTitle = encodeURIComponent(this.article.title);

    const tagsHtml = this.article.tags?.length > 0
      ? this.article.tags.map(tag => `<a href="/tag/${tag.slug}">${tag.name}</a>`).join('<span class="tag-sep">,</span>')
      : '';

    const authorInitial = author.charAt(0).toUpperCase();
    const authorPhotoUrl = Utils.resolveImgUrl(authorObj?.photo?.url);
    const authorAvatarSvg = authorPhotoUrl
      ? `<img loading="lazy" src="${authorPhotoUrl}" alt="${author}" class="author-avatar-img" width="32" height="32">`
      : `<svg class="author-avatar-svg" width="32" height="32" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="18" cy="18" r="18" fill="#1a2332"/>
      <text x="18" y="23" text-anchor="middle" font-size="15" font-weight="700" font-family="DM Sans, sans-serif" fill="#ffffff">${authorInitial}</text>
    </svg>`;
    const authorNameHtml = authorSlug
      ? `<a href="/author/${authorSlug}" class="meta-author">${author}</a>`
      : `<span class="meta-author">${author}</span>`;

    this.articleContainer.innerHTML = `

      <!-- ── ARTICLE HEADER ── -->
      <h1 class="article-title">${this.article.title}</h1>

      <div class="article-meta-bar">
        ${authorAvatarSvg}
        ${authorNameHtml}
        <span class="meta-sep">|</span>
        <span class="meta-date">${publishDate}</span>
        <span class="meta-sep">|</span>
        <span class="meta-views"><i class="fa fa-eye"></i> ${Utils.formatViews(views)} views</span>
        <span class="meta-sep">|</span>
        <span class="meta-read"><i class="fa fa-clock-o"></i> ${readTime} min read</span>
      </div>

      <!-- ── FEATURED IMAGE ── -->
      ${hasImage ? `
      <div class="article-featured-image">
        <img loading="eager" fetchpriority="high" src="${imageUrl}" alt="${this.article.title}">
      </div>` : ''}

      <!-- ── DESCRIPTION / EXCERPT ── -->
      ${this.article.excerpt ? `
      <p class="article-subtitle">${this.article.excerpt}</p>` : ''}

      <!-- ── TAGS + SHARE ── -->
      <div class="article-tags-share-bar">
        ${tagsHtml ? `
        <div class="article-tags-footer">
          <span class="tags-label">Tags:</span>
          ${tagsHtml}
        </div>` : '<div></div>'}
        <div class="article-share">
          <span class="share-label">Share:</span>
          <div class="share-buttons">
            <a href="https://www.facebook.com/sharer/sharer.php?u=${shareUrl}" target="_blank" class="share-btn"><i class="fa fa-facebook"></i></a>
            <a href="https://twitter.com/intent/tweet?url=${shareUrl}&text=${shareTitle}" target="_blank" class="share-btn"><i class="fa fa-twitter"></i></a>
            <a href="https://www.linkedin.com/shareArticle?mini=true&url=${shareUrl}&title=${shareTitle}" target="_blank" class="share-btn"><i class="fa fa-linkedin"></i></a>
            <a href="mailto:?subject=${shareTitle}&body=${shareUrl}" class="share-btn"><i class="fa fa-envelope"></i></a>
          </div>
        </div>
      </div>

      <!-- ── ADVERTISEMENT ── -->
      <div class="article-inline-ad">
        <div class="inline-ad-box"><span>Advertisement</span></div>
      </div>

      <!-- ── ARTICLE BODY ── -->
      <div class="article-body">
        ${this.formatContent(this.article.content)}
      </div>
    `;
  }

  /**
   * Format content - handle HTML or plain text
   */
  formatContent(content) {
    if (!content) return '<p>No content available.</p>';
    
    let html = '';
    
    // Check if marked library is available
    if (typeof marked !== 'undefined') {
      // Configure marked options
      marked.setOptions({
        breaks: true,        // Convert \n to <br>
        gfm: true,           // GitHub Flavored Markdown
        headerIds: true,     // Add IDs to headers
        mangle: false,       // Don't mangle email addresses
      });
      
      // Parse Markdown to HTML
      html = marked.parse(content);
    } else if (content.includes('<p>') || content.includes('<div>')) {
      // Fallback: If content is already HTML, use as is
      html = content;
    } else {
      // Fallback: wrap in paragraphs
      html = content.split('\n\n').map(p => `<p>${p}</p>`).join('');
    }
    
    return html;
  }

  /**
   * Render sidebar: Related (same category) + Latest articles
   */
  renderSidebar(latestArticles, relatedArticles, tags) {
    const category = this.article?.category;
    const catName = category?.name || '';
    const catSlug = category?.slug || '';

    const relatedSection = relatedArticles.length > 0 ? `
      <div class="sidebar-section">
        <h3 class="sb-section-title">More in ${catName}</h3>
        <div class="sb-article-list">
          ${relatedArticles.map(a => this.renderSidebarArticle(a)).join('')}
        </div>
        ${catSlug ? `<a href="/${catSlug}" class="sb-more-link">More from ${catName} <i class="fa fa-chevron-right"></i></a>` : ''}
      </div>
    ` : '';

    const latestSection = latestArticles.length > 0 ? `
      <div class="sidebar-section">
        <h3 class="sb-section-title">Latest</h3>
        <div class="sb-article-list sb-article-list--scrollable">
          ${latestArticles.map(a => this.renderSidebarArticle(a)).join('')}
        </div>
      </div>
    ` : '';

    this.sidebarContainer.innerHTML = relatedSection + latestSection;
  }

  /**
   * Render a single sidebar article item
   */
  renderSidebarArticle(article) {
    const thumbUrl = Utils.resolveImgUrl(article.image?.url);
    const thumbHtml = thumbUrl
      ? `<img loading="lazy" src="${thumbUrl}" alt="${article.title}">`
      : '<div class="sb-article-thumb-placeholder"></div>';
    const categorySlug = article.category?.slug || 'article';
    const categoryName = article.category?.name || '';
    const readTime = article.minutesToread || Utils.calculateReadingTime(article.content) || 3;
    const date = Utils.formatDate(article.publishedDate);
    const meta = [
      `${readTime} min read`,
      date
    ].filter(Boolean).join(' • ');

    return `
      <div class="sb-article-item">
        <div class="sb-article-body">
          ${categoryName ? `<div class="sb-article-category">${categoryName}</div>` : ''}
          <h4 class="sb-article-title">
            <a href="/${categorySlug}/${article.slug}">${article.title}</a>
          </h4>
          <div class="sb-article-meta">${meta}</div>
        </div>
        <div class="sb-article-thumb">
          <a href="/${categorySlug}/${article.slug}">${thumbHtml}</a>
        </div>
      </div>
    `;
  }

  /**
   * Show error message
   */
  showError(message) {
    document.title = 'Article Not Found - FiscalColumn';
    this.articleContainer.innerHTML = `
      <div class="article-error">
        <i class="fa fa-exclamation-circle"></i>
        <h2>Article Not Found</h2>
        <p>${message}</p>
        <div class="error-actions">
          <a href="/" class="error-btn primary">Go to Homepage</a>
          <a href="javascript:history.back()" class="error-btn secondary">Go Back</a>
        </div>
      </div>
    `;
    this.sidebarContainer.style.display = 'none';
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  const manager = new ArticlePageManager();
  manager.init();
});

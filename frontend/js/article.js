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

      // Fetch related articles
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
    Utils.setMetaContent('og-url', url);
    Utils.setMetaContent('og-title', title);
    Utils.setMetaContent('og-description', description);
    Utils.setMetaContent('og-image', imageUrl);

    // Twitter Card Tags
    Utils.setMetaContent('twitter-url', url);
    Utils.setMetaContent('twitter-title', title);
    Utils.setMetaContent('twitter-description', description);
    Utils.setMetaContent('twitter-image', imageUrl);

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
      categoryLink.href = `/${encodeURIComponent(category.slug || '')}`;
    }
    
    articleBreadcrumb.textContent = Utils.truncateText(title, 40);
  }

  /**
   * Helper to set meta tag content by ID
   */

  /**
   * Render article content
   */
  renderArticle() {
    const hasImage = this.article.image?.url;
    const imageUrl = hasImage ? Utils.safeUrl(Utils.resolveImgUrl(this.article.image.url)) : '';
    const publishDate = Utils.formatDateLong(this.article.publishedDate);
    const authorObj = this.article.author;
    const author = authorObj?.name || (typeof authorObj === 'string' ? authorObj : 'Admin');
    const authorSlug = authorObj?.slug || null;
    const views = this.article.views || 0;
    const readTime = Number(this.article.minutesToRead) || 3;

    const shareUrl = encodeURIComponent(window.location.href);
    const shareTitle = encodeURIComponent(this.article.title);
    const titleText = Utils.escapeHtml(this.article.title);
    const authorText = Utils.escapeHtml(author);
    const authorHref = authorSlug ? `/author/${encodeURIComponent(authorSlug)}` : '';

    const tagsHtml = this.article.tags?.length > 0
      ? this.article.tags.map(tag => `<a href="/tag/${encodeURIComponent(tag.slug || '')}">${Utils.escapeHtml(tag.name)}</a>`).join('<span class="tag-sep">,</span>')
      : '';

    const authorInitial = Utils.escapeHtml(author.charAt(0).toUpperCase());
    const authorPhotoUrl = Utils.safeUrl(Utils.resolveImgUrl(authorObj?.photo?.url));
    const authorAvatarSvg = authorPhotoUrl
      ? `<img loading="lazy" src="${Utils.escapeHtml(authorPhotoUrl)}" alt="${authorText}" class="author-avatar-img" width="32" height="32">`
      : `<svg class="author-avatar-svg" width="32" height="32" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="18" cy="18" r="18" fill="#1a2332"/>
      <text x="18" y="23" text-anchor="middle" font-size="15" font-weight="700" font-family="DM Sans, sans-serif" fill="#ffffff">${authorInitial}</text>
    </svg>`;
    const authorNameHtml = authorHref
      ? `<a href="${authorHref}" class="meta-author">${authorText}</a>`
      : `<span class="meta-author">${authorText}</span>`;

    this.articleContainer.innerHTML = `

      <!-- ── ARTICLE HEADER ── -->
      <h1 class="article-title">${titleText}</h1>

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
      ${imageUrl ? `
      <div class="article-featured-image">
        <img loading="eager" fetchpriority="high" src="${Utils.escapeHtml(imageUrl)}" alt="${titleText}">
      </div>` : ''}

      <!-- ── DESCRIPTION / EXCERPT ── -->
      ${this.article.excerpt ? `
      <p class="article-subtitle">${Utils.escapeHtml(this.article.excerpt)}</p>` : ''}

      <!-- ── TAGS + SHARE ── -->
      <div class="article-tags-share-bar">
        ${tagsHtml ? `
        <div class="article-tags-footer">
          ${tagsHtml}
        </div>` : '<div></div>'}
        <div class="article-share">
          <div class="share-buttons">
            <a href="https://www.facebook.com/sharer/sharer.php?u=${shareUrl}" target="_blank" rel="noopener noreferrer" aria-label="facebook" class="share-btn"><i class="fa fa-facebook"></i></a>
            <a href="https://twitter.com/intent/tweet?url=${shareUrl}&text=${shareTitle}" target="_blank" rel="noopener noreferrer" aria-label="twitter" class="share-btn"><i class="fa fa-twitter"></i></a>
            <a href="https://www.linkedin.com/shareArticle?mini=true&url=${shareUrl}&title=${shareTitle}" target="_blank" rel="noopener noreferrer" aria-label="linkedin" class="share-btn"><i class="fa fa-linkedin"></i></a>
            <a href="mailto:?subject=${shareTitle}&body=${shareUrl}" aria-label="email" class="share-btn"><i class="fa fa-envelope"></i></a>
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

      <!-- ── AUTHOR BIO ── -->
      ${authorObj ? (() => {
        const bioAvatarHtml = authorPhotoUrl
          ? `<img src="${Utils.escapeHtml(authorPhotoUrl)}" alt="${authorText}" class="author-bio-photo">`
          : `<svg class="author-bio-avatar-svg" width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <circle cx="32" cy="32" r="32" fill="#1a2332"/>
              <text x="32" y="41" text-anchor="middle" font-size="26" font-weight="700" font-family="DM Sans, sans-serif" fill="#ffffff">${authorInitial}</text>
            </svg>`;
        const twitterHref = Utils.safeUrl(authorObj.twitter);
        const linkedinHref = Utils.safeUrl(authorObj.linkedin);
        const twitterLink  = twitterHref  ? `<a href="${Utils.escapeHtml(twitterHref)}"  target="_blank" rel="noopener noreferrer" class="author-bio-social" aria-label="Twitter"><i class="fa fa-twitter"></i></a>`  : '';
        const linkedinLink = linkedinHref ? `<a href="${Utils.escapeHtml(linkedinHref)}" target="_blank" rel="noopener noreferrer" class="author-bio-social" aria-label="LinkedIn"><i class="fa fa-linkedin"></i></a>` : '';
        const designation = authorObj.designation ? Utils.escapeHtml(authorObj.designation) : '';
        const bio = authorObj.bio ? Utils.escapeHtml(authorObj.bio) : '';
        return `
        <div class="author-bio">
          <div class="author-bio-avatar">${bioAvatarHtml}</div>
          <div class="author-bio-content">
            <p class="author-bio-label">Written by</p>
            <div class="author-bio-name-row">
              ${authorHref
                ? `<a href="${authorHref}" class="author-bio-name">${authorText}</a>`
                : `<span class="author-bio-name">${authorText}</span>`}
              ${designation ? `<span class="author-bio-designation">${designation}</span>` : ''}
            </div>
            ${bio ? `<p class="author-bio-desc">${bio}</p>` : ''}
            <div class="author-bio-footer">
              <div class="author-bio-socials">${twitterLink}${linkedinLink}</div>
              ${authorHref ? `<a href="${authorHref}" class="author-bio-more">More articles <i class="fa fa-long-arrow-right"></i></a>` : ''}
            </div>
          </div>
        </div>`;
      })() : ''}
    `;
  }

  /**
   * Format content - handle HTML or plain text
   */
  formatContent(content) {
    if (!content) return '<p>No content available.</p>';
    
    let html = '';

    if (typeof marked !== 'undefined') {
      marked.setOptions({
        breaks: true,
        gfm: true,
        headerIds: true,
        mangle: false,
      });
      html = marked.parse(content);
    } else {
      html = String(content).split('\n\n').map(p => `<p>${Utils.escapeHtml(p)}</p>`).join('');
    }

    return Utils.sanitizeHtml(html);
  }

  /**
   * Render sidebar: Related (same category) + Latest articles
   */
  renderSidebar(latestArticles, relatedArticles, tags) {
    const category = this.article?.category;
    const catName = Utils.escapeHtml(category?.name || '');
    const catSlug = category?.slug ? encodeURIComponent(category.slug) : '';

    const relatedSection = relatedArticles.length > 0 ? `
      <div class="sidebar-section">
        <h3 class="sb-section-title">More in ${catName}</h3>
        <div class="sb-article-list">
          ${relatedArticles.map(a => this.renderSidebarArticle(a, false)).join('')}
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
  renderSidebarArticle(article, showCategory = true) {
    const thumbUrl = Utils.safeUrl(Utils.resolveImgUrl(article.image?.url));
    const titleText = Utils.escapeHtml(article.title);
    const categorySlug = encodeURIComponent(article.category?.slug || 'article');
    const articleSlug = encodeURIComponent(article.slug || '');
    const href = '/' + categorySlug + '/' + articleSlug;
    const categoryName = Utils.escapeHtml(article.category?.name || '');
    const readTime = Number(article.minutesToRead) || Utils.calculateReadingTime(article.content) || 3;
    const date = Utils.formatDate(article.publishedDate);
    const meta = [readTime + ' min read', date].filter(Boolean).join(' \u00b7 ');
    const categoryHtml = (showCategory && categoryName)
      ? '<div class="sb-article-category">' + categoryName + '</div>'
      : '';
    const thumbHtml = thumbUrl
      ? '<div class="sb-article-thumb"><img loading="lazy" src="' + Utils.escapeHtml(thumbUrl) + '" alt="' + titleText + '"></div>'
      : '';

    return '<a class="sb-article-item" href="' + href + '">'
      + '<div class="sb-article-body">' + categoryHtml
      + '<h4 class="sb-article-title">' + titleText + '</h4>'
      + '<div class="sb-article-meta">' + meta + '</div></div>'
      + thumbHtml + '</a>';
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
        <p>${Utils.escapeHtml(message)}</p>
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

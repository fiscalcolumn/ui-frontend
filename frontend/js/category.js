/**
 * Category Page Manager
 * Fetches and renders articles for a specific category
 */

class CategoryPageManager {
  constructor() {
    this.articlesContainer = document.getElementById('articles-container');
    this.paginationContainer = document.getElementById('pagination-container');
    this.pagination = document.getElementById('pagination');
    this.currentPage = 1;
    this.pageSize = 30;
    this.cardsLimit = 6; // Articles 2-7 shown as cards (after featured)
    this.category = null;
    this.totalArticles = 0;
  }

  /**
   * Initialize the category page
   */
  async init() {
    // Get category slug from URL
    const slug = this.getCategorySlug();
    
    if (!slug) {
      this.showError('Category not found');
      return;
    }

    const formattedSlug = Utils.formatSlugAsTitle(slug);
    document.title = `${formattedSlug} - FiscalColumn`;
    document.getElementById('breadcrumb-category').textContent = formattedSlug;

    try {
      // Fetch category details
      this.category = await this.fetchCategory(slug);
      
      if (!this.category) {
        this.showError('Category not found');
        return;
      }

      // Update page with actual category info
      this.updateCategoryInfo();
      
      // categorycontenttype is a flat string field in Strapi v5
      this.contentType = (typeof this.category.categorycontenttype === 'string'
        ? this.category.categorycontenttype
        : 'articles'
      ).toLowerCase().trim();

      if (this.contentType === 'calculators') {
        await this.loadCalculators();
      } else {
        await this.loadArticles();
      }
      
      // Load related categories if any
      await this.loadRelatedCategories();
      
      // Load related tags from tag groups
      this.loadRelatedTags();
      
    } catch (error) {
      console.error('Error loading category:', error);
      this.showError('Failed to load category');
    }
  }

  /**
   * Fetch all calculators (exclude disabled ones)
   * When category contentType is 'calculators', load all calculators regardless of category
   * Populate calculatorcategory relation to group by category type
   */
  async fetchCalculators() {
    const url = getApiUrl(
      `/calculators?populate[category]=true&populate[featuredImage]=true&populate[calculatorcategory]=true&filters[enableCalculator][$ne]=false&sort=order:asc`
    );
    const response = await fetch(url);
    const data = await response.json();
    
    return data.data || [];
  }

  /**
   * Load and render calculators
   */
  async loadCalculators() {
    // Show loading
    this.articlesContainer.innerHTML = `
      <div class="loading-container">
        <div class="spinner"></div>
        <p>Loading calculators...</p>
      </div>
    `;

    try {
      const calculators = await this.fetchCalculators();
    
    if (calculators.length === 0) {
      this.articlesContainer.innerHTML = `
        <div class="no-articles">
          <h3>No calculators found</h3>
          <p>Calculators are coming soon.</p>
        </div>
      `;
      this.paginationContainer.style.display = 'none';
      return;
    }

    // Group calculators by calculatorcategory relation
    // Each calculator has calculatorcategory (oneToOne relation) with calculatorcategory (string) and order (integer)
    const categoryGroups = {};
    
    calculators.forEach((calc, index) => {
      const categoryType = calc.calculatorcategory;
      
      if (!categoryType) {
        // Put calculators without category type in "Other" group
        const catKey = 'other';
        if (!categoryGroups[catKey]) {
          categoryGroups[catKey] = {
            categoryType: {
              calculatorcategory: 'Other',
              order: 9999 // Put "Other" at the end
            },
            calculators: []
          };
        }
        categoryGroups[catKey].calculators.push(calc);
        return;
      }
      
      // Use the calculatorcategory string field as the key
      const catKey = categoryType.calculatorcategory || 'other';
      
      if (!categoryGroups[catKey]) {
        categoryGroups[catKey] = {
          categoryType: categoryType,
          calculators: []
        };
      }
      categoryGroups[catKey].calculators.push(calc);
    });


    Object.keys(categoryGroups).forEach(catKey => {
      categoryGroups[catKey].calculators.sort((a, b) => {
        const orderA = a.order || 0;
        const orderB = b.order || 0;
        return orderA - orderB;
      });
    });

    const sortedCategoryKeys = Object.keys(categoryGroups).sort((a, b) => {
      const orderA = categoryGroups[a].categoryType.order || 0;
      const orderB = categoryGroups[b].categoryType.order || 0;
      return orderA - orderB;
    });

    const defaultConfig = {
      icon: 'fa-calculator',
      desc: 'Useful calculators for your daily needs'
    };

    let html = '';

    // Render each category section with scrollable grid (2x3 visible) + ad layout
    sortedCategoryKeys.forEach((catKey, index) => {
      const categoryData = categoryGroups[catKey];
      const calcs = categoryData.calculators;
      const categoryType = categoryData.categoryType;
      
      // Use category type name for title
      const categoryName = categoryType.calculatorcategory || 'Other';
      const categoryTitle = this.formatCategoryTitle(categoryName) + ' Calculators';
      
      // Default icon - can be extended if category type has icon field
      const config = {
        ...defaultConfig,
        title: categoryTitle
      };

      const gridId = `calc-grid-${catKey.replace(/\s+/g, '-').toLowerCase()}`;

      html += `
        <div class="calculator-section">
          <div class="calculator-section-header">
            <h2 class="calculator-section-title">
              <i class="fa ${config.icon}"></i> ${config.title}
            </h2>
            <p class="calculator-section-desc">${config.desc}</p>
          </div>
          
          <!-- Main Layout: Scrollable Grid + Ad Sidebar -->
          <div class="calculator-main-layout">
            <div class="calculator-grid-area">
              <div class="calculator-grid-scroll" id="${gridId}">
                <div class="calculator-grid-track">
                  ${calcs.map(calc => this.renderCalculatorCard(calc)).join('')}
                </div>
              </div>
            </div>
            <div class="calculator-ad-sidebar">
              <div class="calc-ad-box">
                <span class="ad-label">Advertisement</span>
                <div class="ad-placeholder">
                  <i class="fa fa-bullhorn"></i>
                  <span>Ad Space</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    });

    this.articlesContainer.innerHTML = html;
    this.paginationContainer.style.display = 'none';
    
    } catch (error) {
      console.error('Error loading calculators:', error);
      this.articlesContainer.innerHTML = `
        <div class="no-articles">
          <h3>Error loading calculators</h3>
          <p>Please try again later.</p>
        </div>
      `;
      this.paginationContainer.style.display = 'none';
    }
  }

  /**
   * Calculator grid scrolling is now handled by native browser scroll
   * Navigation buttons have been removed for cleaner UI
   */

  /**
   * Format category name to title case
   */
  formatCategoryTitle(category) {
    if (!category) return 'Other';
    return category
      .split(/[\s&]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' & ')
      .replace(/ & & /g, ' & ');
  }

  /**
   * Render a single calculator card
   */
  renderCalculatorCard(calculator) {
    const icon = calculator.icon || 'fa-calculator';
    const iconColor = calculator.iconColor || '#14bdee';
    const excerpt = calculator.excerpt || '';
    const isPopular = calculator.isPopular;
    const isFeatured = calculator.isFeatured;

    return `
      <a href="/calculator/${calculator.slug}" class="calculator-card ${isFeatured ? 'featured' : ''}">
        <div class="calculator-card-icon" style="background-color: ${iconColor}20; color: ${iconColor};">
          <i class="fa ${icon}"></i>
        </div>
        <div class="calculator-card-content">
          <h3 class="calculator-card-title">${calculator.title}</h3>
          <p class="calculator-card-excerpt">${excerpt}</p>
        </div>
       
        ${isFeatured && !isPopular ? '<span class="calculator-badge featured">Featured</span>' : ''}
      </a>
    `;
  }

  /**
   * Load and render related tags from tag groups
   */
  loadRelatedTags() {
    const tagGroups = this.category.relatedtaggroups;
    
    if (!tagGroups || tagGroups.length === 0) {
      return;
    }

    const container = document.getElementById('category-tags-container');
    if (!container) return;

    // Collect all tags from all tag groups (limit to 20)
    let allTags = [];
    for (const group of tagGroups) {
      if (group.tags && group.tags.length > 0) {
        allTags = allTags.concat(group.tags);
      }
    }

    // Remove duplicates and limit to 20
    const uniqueTags = allTags.filter((tag, index, self) => 
      index === self.findIndex(t => t.slug === tag.slug)
    ).slice(0, 20);

    if (uniqueTags.length === 0) {
      return;
    }

    container.style.display = 'block';
    container.innerHTML = `
      <div class="container">
        <div class="popular-tags-section">
          <span class="popular-tags-label"><i class="fa fa-bolt"></i> TRENDING</span>
          <span class="popular-tags-pipe">|</span>
          ${uniqueTags.map(tag => `<a href="/tag/${tag.slug}" class="popular-tag-link">${tag.name.toUpperCase()}</a>`).join('<span class="popular-tags-pipe">|</span>')}
        </div>
      </div>
    `;
  }

  /**
   * Load and render related categories with their articles
   */
  async loadRelatedCategories() {
    const relatedCategories = this.category.relatedcategories;
    
    // If no related categories, don't show anything
    if (!relatedCategories || relatedCategories.length === 0) {
      return;
    }

    const relatedContainer = document.getElementById('related-categories-container');
    if (!relatedContainer) return;

    let html = '';
    let sectionIndex = 0;

    // Round-robin between Layout A (grid cards) and Layout B (featured + sidebar)
    for (const relatedCat of relatedCategories) {
      const articles = await this.fetchArticlesForCategory(relatedCat.documentId, 10);
      
      if (articles.length > 0) {
        if (sectionIndex % 2 === 0) {
          html += this.renderLayoutA(relatedCat, articles);
        } else {
          html += this.renderLayoutB(relatedCat, articles);
        }
        sectionIndex++;
      }
    }

    relatedContainer.innerHTML = html;

    // Initialize carousel scroll functionality
    this.initCarouselScrolling();
  }

  // ─── Shared helpers ────────────────────────────────────────────────────────

  rcSectionHeader(category) {
    return `
      <div class="hp-section-header">
        <h3 class="hp-section-title">
          <a href="/${category.slug}">${category.name.toUpperCase()}</a>
        </h3>
      </div>`;
  }

  rcAuthorHtml(article) {
    const imgBase = window.API_CONFIG?.BASE_URL || '';
    const author = article.author;
    if (!author) return '';
    const photoUrl = author.photo?.url ? `${imgBase}${author.photo.url}` : null;
    const initial = (author.name || 'A').charAt(0).toUpperCase();
    const avatar = photoUrl
      ? `<img loading="lazy" src="${photoUrl}" alt="${author.name}" class="rc-author-avatar">`
      : `<span class="rc-author-initial">${initial}</span>`;
    return `<div class="rc-author">${avatar}<span class="rc-author-name">${author.name}</span></div>`;
  }

  rcCategoryBadge(article) {
    const name = article.category?.name || '';
    return name ? `<span class="rc-category-badge">${name.toUpperCase()}</span>` : '';
  }

  rcImageUrl(article) {
    const imgBase = window.API_CONFIG?.BASE_URL || '';
    return article.image?.url ? `${imgBase}${article.image.url}` : null;
  }

  rcArticleUrl(article) {
    return `/${article.category?.slug || 'article'}/${article.slug}`;
  }

  rcDateAuthor(article) {
    const parts = [];
    if (article.author?.name) parts.push(`<span class="rcb-meta-author">${article.author.name}</span>`);
    if (article.publishedDate) parts.push(`<span class="rcb-meta-date">${Utils.formatDate(article.publishedDate)}</span>`);
    return parts.join('<span class="rcb-meta-sep"> | </span>');
  }

  // ─── Layout A: 4-column editorial grid ─────────────────────────────────────

  renderLayoutA(category, articles) {
    return `
      <div class="related-category-section rcs-layout-a">
        <div class="container">
          ${this.rcSectionHeader(category)}
          <div class="rca-grid">
            ${articles.slice(0, 4).map(a => this.renderLayoutACard(a)).join('')}
          </div>
        </div>
      </div>`;
  }

  renderLayoutACard(article) {
    const imgUrl = this.rcImageUrl(article);
    const excerpt = article.excerpt || Utils.truncateText(article.content, 80);
    return `
      <a href="${this.rcArticleUrl(article)}" class="rca-card">
        <div class="rca-card-image">
          ${imgUrl
            ? `<img loading="lazy" src="${imgUrl}" alt="${article.title}">`
            : `<div class="rca-no-img"></div>`}
        </div>
        ${this.rcCategoryBadge(article)}
        <h4 class="rca-card-title">${article.title}</h4>
        ${excerpt ? `<p class="rca-card-excerpt">${excerpt}</p>` : ''}
        ${this.rcAuthorHtml(article)}
      </a>`;
  }

  // ─── Layout B: Large featured + 3 sidebar items ─────────────────────────────

  renderLayoutB(category, articles) {
    const featured = articles[0];
    const sidebar = articles.slice(1, 4);
    const featuredMeta = this.rcDateAuthor(featured);
    return `
      <div class="related-category-section rcs-layout-b">
        <div class="container">
          ${this.rcSectionHeader(category)}
          <div class="rcb-grid">
            <a href="${this.rcArticleUrl(featured)}" class="rcb-featured">
              <div class="rcb-featured-image">
                ${this.rcImageUrl(featured)
                  ? `<img loading="lazy" src="${this.rcImageUrl(featured)}" alt="${featured.title}">`
                  : `<div class="rca-no-img"></div>`}
              </div>
              ${this.rcCategoryBadge(featured)}
              <h3 class="rcb-featured-title">${featured.title}</h3>
              <p class="rcb-featured-excerpt">${featured.excerpt || Utils.truncateText(featured.content, 100)}</p>
              ${featuredMeta ? `<div class="rcb-meta">${featuredMeta}</div>` : ''}
            </a>
            <div class="rcb-sidebar">
              ${sidebar.map(a => this.renderLayoutBItem(a)).join('')}
            </div>
          </div>
        </div>
      </div>`;
  }

  renderLayoutBItem(article) {
    const imgUrl = this.rcImageUrl(article);
    const meta = this.rcDateAuthor(article);
    const excerpt = article.excerpt || Utils.truncateText(article.content, 60);
    return `
      <a href="${this.rcArticleUrl(article)}" class="rcb-item">
        <div class="rcb-item-image">
          ${imgUrl
            ? `<img loading="lazy" src="${imgUrl}" alt="${article.title}">`
            : `<div class="rca-no-img"></div>`}
        </div>
        <div class="rcb-item-content">
          ${this.rcCategoryBadge(article)}
          <h4 class="rcb-item-title">${article.title}</h4>
          ${excerpt ? `<p class="rcb-item-excerpt">${excerpt}</p>` : ''}
          ${meta ? `<div class="rcb-meta">${meta}</div>` : ''}
        </div>
      </a>`;
  }

  /**
   * Initialize carousel scrolling functionality
   */
  initCarouselScrolling() {
    document.querySelectorAll('.carousel-nav').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const carouselId = btn.dataset.carousel;
        const carousel = document.getElementById(carouselId);
        if (!carousel) return;

        const cardWidth = carousel.querySelector('.carousel-card')?.offsetWidth || 280;
        const gap = 20; // Gap between cards
        const scrollAmount = cardWidth + gap; // Scroll by 1 card

        if (btn.classList.contains('carousel-prev')) {
          carousel.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
        } else {
          carousel.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
      });
    });
  }

  /**
   * Get category slug from URL path
   */
  getCategorySlug() {
    const path = window.location.pathname;
    // Remove leading slash and get the slug
    const slug = path.replace(/^\//, '').replace(/\/$/, '');
    return slug || null;
  }

  /**
   * Fetch category details by slug (with related categories, toparticle, populartags, and categorycontenttype)
   */
  async fetchCategory(slug) {
    // Note: categorycontenttype is an enum (scalar) — it returns automatically, do NOT populate it
    const url = getApiUrl(`/categories?filters[slug][$eq]=${slug}&populate[relatedcategories]=true&populate[relatedtaggroups][populate][tags]=true&populate[categoryImage]=true&populate[toparticle][populate][category]=true&populate[toparticle][populate][image]=true&populate[populartags]=true`);
    const response = await fetch(url);
    const data = await response.json();
    const category = data.data && data.data.length > 0 ? data.data[0] : null;
    return category;
  }

  /**
   * Fetch articles for a specific category (for related categories)
   */
  async fetchArticlesForCategory(categoryDocumentId, limit = 10) {
    const url = getApiUrl(
      `/articles?populate[category]=true&populate[image]=true&populate[author][populate][photo]=true&filters[category][documentId][$eq]=${categoryDocumentId}&pagination[limit]=${limit}&sort=publishedDate:desc`
    );
    const response = await fetch(url);
    const data = await response.json();
    return data.data || [];
  }

  /**
   * Fetch articles for the category
   */
  async fetchArticles(page = 1) {
    const start = (page - 1) * this.pageSize;
    const url = getApiUrl(
      `/articles?populate[category]=true&populate[image]=true&populate[tags]=true&filters[category][documentId][$eq]=${this.category.documentId}&pagination[start]=${start}&pagination[limit]=${this.pageSize}&sort=publishedDate:desc`
    );
    const response = await fetch(url);
    const data = await response.json();
    
    this.totalArticles = data.meta?.pagination?.total || 0;
    return data.data || [];
  }

  /**
   * Update page with category information (SEO)
   */
  updateCategoryInfo() {
    const name = this.category.name;
    const description = this.category.description || `Latest ${name} news, updates, and articles on FiscalColumn`;
    const url = window.location.href;

    // Page Title
    document.title = `${name} | FiscalColumn`;
    const pageTitleEl = document.getElementById('page-title');
    if (pageTitleEl) pageTitleEl.textContent = `${name} | FiscalColumn`;
    
    // Meta Description
    const metaDesc = document.getElementById('meta-description');
    if (metaDesc) metaDesc.setAttribute('content', description);

    // Canonical URL
    const canonicalEl = document.getElementById('canonical-url');
    if (canonicalEl) canonicalEl.setAttribute('href', url);

    // Use categoryImage if available, otherwise fallback
    const categoryImageUrl = this.category.categoryImage?.url;
    const ogImage = categoryImageUrl 
      ? `${API_CONFIG.BASE_URL}${categoryImageUrl}`
      : `${window.location.origin}/images/og-category.jpg`;

    // Open Graph Tags
    this.setMetaContent('og-url', url);
    this.setMetaContent('og-title', `${name} | FiscalColumn`);
    this.setMetaContent('og-description', description);
    this.setMetaContent('og-image', ogImage);

    // Twitter Card Tags
    this.setMetaContent('twitter-title', `${name} | FiscalColumn`);
    this.setMetaContent('twitter-description', description);
    this.setMetaContent('twitter-image', ogImage);

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
          "name": name,
          "item": url
        }
      ]
    };
    const schemaBreadcrumbEl = document.getElementById('schema-breadcrumb');
    if (schemaBreadcrumbEl) schemaBreadcrumbEl.textContent = JSON.stringify(breadcrumbSchema);
    
    // Update visible breadcrumb
    document.getElementById('breadcrumb-category').textContent = name;
  }

  /**
   * Helper to set meta tag content by ID
   */
  setMetaContent(id, content) {
    const el = document.getElementById(id);
    if (el) el.setAttribute('content', content);
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
    
    // Get toparticle from category if it exists
    // Handle different possible structures: toparticle could be an object or have data property
    let toparticle = this.category?.toparticle;
    if (toparticle && toparticle.data) {
      toparticle = toparticle.data;
    }
    
    // If toparticle exists and is valid, filter it out from regular articles to avoid duplication
    let filteredArticles = articles;
    if (toparticle && (toparticle.documentId || toparticle.id)) {
      const toparticleId = toparticle.documentId || toparticle.id;
      filteredArticles = articles.filter(article => {
        const articleId = article.documentId || article.id;
        return articleId !== toparticleId;
      });
    }
    
    if (filteredArticles.length === 0 && !toparticle) {
      this.articlesContainer.innerHTML = `
        <div class="no-articles">
          <h3>No articles found</h3>
          <p>There are no articles in this category yet.</p>
        </div>
      `;
      this.paginationContainer.style.display = 'none';
      return;
    }

    // Determine featured article: toparticle if exists and valid, otherwise first article
    const featuredArticle = (toparticle && toparticle.title) ? toparticle : filteredArticles[0];
    
    // Adjust article slicing based on whether we have toparticle
    const startIndex = toparticle ? 0 : 1;
    const cardArticles = filteredArticles.slice(startIndex, startIndex + this.cardsLimit);
    const remainingArticles = filteredArticles.slice(startIndex + this.cardsLimit);
    
    // For split section: 5 for list (left), 3 for mini cards (right)
    const listArticles = remainingArticles.slice(0, 5);
    const miniCardArticles = remainingArticles.slice(5, 8);
    const extraArticles = remainingArticles.slice(8);

    let html = '';
    
    // Render featured article (toparticle or first article)
    html += this.renderFeaturedArticle(featuredArticle);
    
    // Render popular tags below the first article if they exist
    // Handle different possible structures: populartags could be an array or have data property
    let populartags = this.category?.populartags;
    if (populartags && populartags.data && Array.isArray(populartags.data)) {
      populartags = populartags.data;
    }
    if (populartags && Array.isArray(populartags) && populartags.length > 0) {
      html += this.renderPopularTags(populartags);
    }
    
    // Render card articles in 2-column grid
    if (cardArticles.length > 0) {
      html += `<div class="articles-cards-section">
        <div class="articles-cards-grid">
          ${cardArticles.map(article => this.renderArticleCard(article)).join('')}
        </div>
      </div>`;
    }
    
    // Render split section: 5 list items (left) + 3 mini cards (right)
    if (listArticles.length > 0 || miniCardArticles.length > 0) {
      html += `<div class="articles-split-section">
        <div class="split-list-column">
          ${listArticles.map(article => this.renderArticleListItem(article)).join('')}
        </div>
        <div class="split-grid-column">
          ${miniCardArticles.map(article => this.renderMiniCard(article)).join('')}
        </div>
      </div>`;
    }
    
    // Render extra articles as cards
    if (extraArticles.length > 0) {
      html += `<div class="articles-extra-section">
        ${extraArticles.map(article => this.renderArticleCard(article)).join('')}
      </div>`;
    }

    this.articlesContainer.innerHTML = html;
    
    // Render pagination
    this.renderPagination();
  }

  /**
   * Render featured article (first article or toparticle - large layout)
   */
  renderFeaturedArticle(article) {
    if (!article || !article.title) {
      return '';
    }
    
    // Handle image URL - check different possible structures
    let imageUrl = null;
    if (article.image) {
      if (typeof article.image === 'string') {
        imageUrl = article.image;
      } else if (article.image.url) {
        imageUrl = article.image.url;
      } else if (article.image.data?.attributes?.url) {
        imageUrl = article.image.data.attributes.url;
      } else if (article.image.data?.[0]?.attributes?.url) {
        imageUrl = article.image.data[0].attributes.url;
      }
    }
    
    const hasImage = !!imageUrl;
    const categoryName = article.category?.name || this.category?.name || '';
    const initial = categoryName.charAt(0).toUpperCase() || article.title.charAt(0).toUpperCase();
    const imageHtml = hasImage
      ? `<div class="featured-image"><img loading="lazy" src="${API_CONFIG.BASE_URL}${imageUrl}" alt="${article.title}"></div>`
      : `<div class="featured-image featured-image--placeholder">
           <div class="featured-placeholder-inner">
             <span class="featured-placeholder-initial">${initial}</span>
             <span class="featured-placeholder-label">${categoryName}</span>
           </div>
         </div>`;
    
    const excerpt = article.excerpt || Utils.truncateText(article.content || '', 250);
    const readTime = Utils.getReadTime(article);
    const categorySlug = article.category?.slug || this.category?.slug || 'article';
    return `
      <div class="featured-article">
        ${imageHtml}
        <div class="featured-content">
          <div class="featured-category">${article.category?.name || this.category?.name || 'Article'}</div>
          <h1 class="featured-title">
            <a href="/${categorySlug}/${article.slug}">${article.title}</a>
          </h1>
          <p class="featured-excerpt">${excerpt}</p>
          <div class="featured-meta">
            <span class="read-time">${readTime} min read</span>
            <span class="separator">•</span>
            <span class="date">${Utils.formatDate(article.publishedDate || article.createdAt)}</span>
          </div>
        </div>
      </div>
    `;
  }

  articlePlaceholder(wrapperClass, article) {
    const letter = (article.category?.name || article.title || '?').charAt(0).toUpperCase();
    return `
      <div class="${wrapperClass} article-img-placeholder">
        <span class="article-placeholder-letter">${letter}</span>
      </div>`;
  }

  renderArticleCard(article) {
    const hasImage = article.image?.url;
    const imageHtml = hasImage
      ? `<div class="card-thumb"><img loading="lazy" src="${API_CONFIG.BASE_URL}${article.image.url}" alt="${article.title}"></div>`
      : this.articlePlaceholder('card-thumb', article);
    
    const readTime = Utils.getReadTime(article);
    const excerpt = article.excerpt || Utils.truncateText(article.content, 80);

    return `
      <div class="article-card-horizontal">
        ${imageHtml}
        <div class="card-content">
          <div class="card-category">${this.category?.name || 'Article'}</div>
          <h3 class="card-title">
            <a href="/${article.category?.slug || 'article'}/${article.slug}">${article.title}</a>
          </h3>
          <p class="card-excerpt">${excerpt}</p>
          <div class="card-meta">
            <span>${readTime} min read</span>
            <span class="separator">•</span>
            <span>${Utils.formatDate(article.publishedDate)}</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render popular tags section (displayed below the first article)
   */
  renderPopularTags(tags) {
    if (!tags || tags.length === 0) return '';
    
    const tagItems = tags.map(tag => {
      // Handle different tag structures
      let tagName, tagSlug;
      if (typeof tag === 'string') {
        tagName = tag;
        tagSlug = tag.toLowerCase().replace(/\s+/g, '-');
      } else {
        tagName = tag.name || tag.title || '';
        tagSlug = tag.slug || tag.name?.toLowerCase().replace(/\s+/g, '-') || '';
      }
      
      if (!tagName || !tagSlug) return '';
      
      return `<a href="/tag/${encodeURIComponent(tagSlug)}" class="popular-tag-link">${tagName.toUpperCase()}</a>`;
    }).filter(Boolean);

    if (!tagItems.length) return '';

    return `
      <div class="popular-tags-section">
        <span class="popular-tags-label"><i class="fa fa-fire"></i> POPULAR TOPICS</span>
        <span class="popular-tags-pipe">|</span>
        ${tagItems.join('<span class="popular-tags-pipe">|</span>')}
      </div>
    `;
  }

  /**
   * Render article list item (no image, for split section left)
   */
  renderArticleListItem(article) {
    const date = article.publishedDate 
      ? Utils.formatDate(article.publishedDate)
      : '';

    return `
      <div class="article-list-item">
        <h4 class="article-list-title">
          <a href="/${article.category?.slug || 'article'}/${article.slug}">${article.title}</a>
        </h4>
        <div class="article-list-meta">
          <span>${Utils.getReadTime(article)} min read</span>
          <span class="separator">|</span>
          <span>${Utils.formatDate(article.publishedDate)}</span>
        </div>
      </div>
    `;
  }

  /**
   * Render mini card (horizontal with image, for split section right)
   */
  renderMiniCard(article) {
    const hasImage = article.image?.url;
    const imageHtml = hasImage
      ? `<div class="mini-card-image"><img loading="lazy" src="${API_CONFIG.BASE_URL}${article.image.url}" alt="${article.title}"></div>`
      : this.articlePlaceholder('mini-card-image', article);
    
    const excerpt = article.excerpt || Utils.truncateText(article.content, 60);
    const readTime = Utils.getReadTime(article);

    return `
      <div class="mini-card">
        ${imageHtml}
        <div class="mini-card-content">
          <div class="mini-card-category">${this.category?.name || 'Article'}</div>
          <h4 class="mini-card-title">
            <a href="/${article.category?.slug || 'article'}/${article.slug}">${article.title}</a>
          </h4>
          <p class="mini-card-excerpt">${excerpt}</p>
          <div class="mini-card-meta">
            <span>${readTime} min read</span>
            <span class="separator">•</span>
            <span>${Utils.formatDate(article.publishedDate)}</span>
          </div>
        </div>
      </div>
    `;
  }

  renderPagination() {
    Utils.renderPagination({
      container: this.paginationContainer,
      listEl: this.pagination,
      currentPage: this.currentPage,
      totalItems: this.totalArticles,
      pageSize: this.pageSize,
      displayStyle: 'flex',
      onPageChange: page => {
        this.currentPage = page;
        if (this.contentType === 'calculators') this.loadCalculators();
        else this.loadArticles();
        window.scrollTo({ top: 300, behavior: 'smooth' });
      }
    });
  }

  /**
   * Show error message
   */
  async showError(message) {
    document.title = 'Page Not Found - FiscalColumn';

    this.articlesContainer.innerHTML = `
      <div class="loading-container">
        <div class="spinner"></div>
        <p>Loading...</p>
      </div>
    `;

    try {
      const articlesRes = await fetch(
        getApiUrl('/articles?populate[image]=true&populate[author][populate][photo]=true&populate[category]=true&pagination[limit]=8&sort=publishedDate:desc')
      );
      const articlesData = await articlesRes.json();
      const latestArticles = articlesData.data || [];

      this.renderErrorPage(latestArticles);

    } catch (error) {
      console.error('Error loading error page data:', error);
      this.articlesContainer.innerHTML = `
        <div class="error-container-simple">
          <h2>Page Not Found</h2>
          <p>${message}</p>
          <div class="error-hero-actions">
            <a href="/" class="error-btn primary"><i class="fa fa-home"></i> Home Page</a>
            <a href="javascript:history.back()" class="error-btn secondary"><i class="fa fa-arrow-left"></i> Go Back</a>
          </div>
        </div>
      `;
    }
  }

  /**
   * Render clean not-found page: hero + Latest Articles Layout A grid
   */
  renderErrorPage(articles) {
    const latestArticlesHtml = articles.length > 0
      ? articles.map(a => this.renderLayoutACard(a)).join('')
      : '<p style="color:#888;text-align:center;grid-column:1/-1;">No articles found.</p>';

    this.articlesContainer.innerHTML = `
      <div class="error-page-wrapper">

        <!-- Hero -->
        <div class="error-hero">
          <h1 class="error-hero-title">Sorry, we couldn't find what you're&nbsp;looking&nbsp;for.</h1>
          <p class="error-hero-sub">Don't worry — we're still <em>here</em>. Try heading home or browsing our latest articles below.</p>
          <div class="error-hero-actions">
            <a href="/" class="error-btn primary"><i class="fa fa-home"></i> Home Page</a>
            <a href="javascript:history.back()" class="error-btn secondary"><i class="fa fa-arrow-left"></i> Go Back</a>
          </div>
        </div>

        <!-- Latest Articles -->
        <div class="error-articles-section">
          <div class="error-section-header">
            <h2 class="error-section-title">Latest Articles</h2>
          </div>
          <div class="rca-grid">
            ${latestArticlesHtml}
          </div>
        </div>

      </div>
    `;
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  const manager = new CategoryPageManager();
  manager.init();
});


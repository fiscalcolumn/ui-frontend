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
    this.pageSize = 21;
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

    // Immediately set a formatted slug as title (before API loads)
    const formattedSlug = this.formatSlugAsTitle(slug);
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
      
      // Store contentType as instance variable for use in pagination and other methods
      // Try multiple possible paths for the contentType value
      const contentTypeValue = this.category.categorycontenttype?.categorycontenttype 
        || this.category.categorycontenttype?.data?.attributes?.categorycontenttype
        || this.category.categorycontenttype?.attributes?.categorycontenttype
        || null;
      
      this.contentType = contentTypeValue || 'articles';
      
      // Normalize the comparison (case-insensitive, trimmed)
      const normalizedContentType = String(this.contentType).toLowerCase().trim();
      
      if (normalizedContentType === 'calculator') {
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
    console.log('🔢 Fetching calculators from:', url);
    const response = await fetch(url);
    console.log('🔢 Calculators API response status:', response.status);
    const data = await response.json();
    console.log('🔢 Number of calculators:', data.data?.length || 0);
    
    // Debug: Check if calculatorcategory is populated
    if (data.data && data.data.length > 0) {
      console.log('🔢 First calculator structure:', data.data[0]);
      console.log('🔢 First calculator calculatorcategory:', data.data[0].calculatorcategory);
    }
    
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
    console.log('🔢 Grouping calculators. Total:', calculators.length);
    const categoryGroups = {};
    
    calculators.forEach((calc, index) => {
      console.log(`🔢 Calculator ${index + 1}:`, {
        title: calc.title,
        calculatorcategory: calc.calculatorcategory,
        order: calc.order
      });
      
      // Get category type from relation
      const categoryType = calc.calculatorcategory;
      
      if (!categoryType) {
        console.warn(`⚠️ Calculator "${calc.title}" has no calculatorcategory relation`);
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
      console.log(`🔢 Grouping "${calc.title}" under category: "${catKey}"`);
      
      if (!categoryGroups[catKey]) {
        categoryGroups[catKey] = {
          categoryType: categoryType,
          calculators: []
        };
      }
      categoryGroups[catKey].calculators.push(calc);
    });
    
    console.log('🔢 Category groups created:', Object.keys(categoryGroups));
    console.log('🔢 Category groups details:', categoryGroups);

    // Sort calculators within each group by order field
    Object.keys(categoryGroups).forEach(catKey => {
      categoryGroups[catKey].calculators.sort((a, b) => {
        const orderA = a.order || 0;
        const orderB = b.order || 0;
        return orderA - orderB;
      });
    });

    // Sort category groups by the order field in calculatorcategory
    const sortedCategoryKeys = Object.keys(categoryGroups).sort((a, b) => {
      const orderA = categoryGroups[a].categoryType.order || 0;
      const orderB = categoryGroups[b].categoryType.order || 0;
      return orderA - orderB;
    });

    // Default config for categories
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
    
    // Grid scrolling is now handled by native browser scroll (no navigation buttons)
    } catch (error) {
      console.error('❌ Error loading calculators:', error);
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
      <a href="/calculators/${calculator.slug}" class="calculator-card ${isFeatured ? 'featured' : ''}">
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
        <div class="category-tags-header">
          <span class="category-tags-title">TOP SEARCHES:</span>
        </div>
        <div class="category-tags-list">
          ${uniqueTags.map(tag => `<a href="/tag/${tag.slug}" class="category-tag-pill">${tag.name}</a>`).join('')}
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

    // For each related category, fetch articles and render carousel
    for (const relatedCat of relatedCategories) {
      const articles = await this.fetchArticlesForCategory(relatedCat.documentId, 10);
      
      if (articles.length > 0) {
        html += this.renderRelatedCategoryCarousel(relatedCat, articles);
      }
    }

    relatedContainer.innerHTML = html;

    // Initialize carousel scroll functionality
    this.initCarouselScrolling();
  }

  /**
   * Render a related category carousel section
   */
  renderRelatedCategoryCarousel(category, articles) {
    const carouselId = `carousel-${category.slug}`;
    
    return `
      <div class="related-category-section">
        <div class="container">
          <div class="related-category-header">
            <h3 class="related-category-title">${category.name}</h3>
            <a href="/${category.slug}" class="related-category-link">View All <i class="fa fa-arrow-right"></i></a>
          </div>
          <div class="related-carousel-wrapper">
            <button class="carousel-nav carousel-prev" data-carousel="${carouselId}" aria-label="Previous">
              <i class="fa fa-chevron-left"></i>
            </button>
            <div class="related-carousel" id="${carouselId}">
              <div class="carousel-track">
                ${articles.map(article => this.renderCarouselCard(article, category)).join('')}
              </div>
            </div>
            <button class="carousel-nav carousel-next" data-carousel="${carouselId}" aria-label="Next">
              <i class="fa fa-chevron-right"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render a vertical card for the carousel
   */
  renderCarouselCard(article, category) {
    const hasImage = article.image?.url;
    const imageHtml = hasImage 
      ? `<img src="${API_CONFIG.BASE_URL}${article.image.url}" alt="${article.title}">`
      : '<div class="carousel-card-placeholder"></div>';
    
    const excerpt = article.excerpt || Utils.truncateText(article.content, 60);
    const readTime = Utils.getReadTime(article);

    return `
      <div class="carousel-card">
        <div class="carousel-card-image">
          ${imageHtml}
        </div>
        <div class="carousel-card-content">
          <h4 class="carousel-card-title">
            <a href="/${article.category?.slug || 'article'}/${article.slug}">${article.title}</a>
          </h4>
          <p class="carousel-card-excerpt">${excerpt}</p>
          <div class="carousel-card-meta">
            <span>${readTime} min read</span>
            <span class="separator">•</span>
            <span>${Utils.formatDate(article.publishedDate)}</span>
          </div>
        </div>
      </div>
    `;
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
   * Format slug as readable title (e.g., "latest-news" → "Latest News")
   */
  formatSlugAsTitle(slug) {
    return slug
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
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
    const url = getApiUrl(`/categories?filters[slug][$eq]=${slug}&populate[relatedcategories]=true&populate[relatedtaggroups][populate][tags]=true&populate[categoryImage]=true&populate[toparticle][populate][category]=true&populate[toparticle][populate][image]=true&populate[populartags]=true&populate[categorycontenttype]=true`);
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
      `/articles?populate[category]=true&populate[image]=true&populate[tags]=true&filters[category][documentId][$eq]=${categoryDocumentId}&pagination[limit]=${limit}&sort=publishedDate:desc`
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
    const imageHtml = hasImage 
      ? `<div class="featured-image"><img src="${API_CONFIG.BASE_URL}${imageUrl}" alt="${article.title}"></div>`
      : '';
    
    const excerpt = article.excerpt || Utils.truncateText(article.content || '', 250);
    const readTime = Utils.getReadTime(article);
    // Tags removed to avoid crowding
    const tagsHtml = '';
    
    // Get category slug - prefer article's category, fallback to current category
    const categorySlug = article.category?.slug || this.category?.slug || 'article';

    return `
      <div class="featured-article">
        <div class="featured-content">
          <div class="featured-category">${article.category?.name || this.category?.name || 'Article'}</div>
          <h1 class="featured-title">
            <a href="/${categorySlug}/${article.slug}">${article.title}</a>
          </h1>
          <p class="featured-excerpt">${excerpt}</p>
          ${tagsHtml}
          <div class="featured-meta">
            <span class="read-time">${readTime} min read</span>
            <span class="separator">•</span>
            <span class="date">${Utils.formatDate(article.publishedDate || article.createdAt)}</span>
          </div>
        </div>
        ${imageHtml}
      </div>
    `;
  }

  /**
   * Render a single article card (horizontal with thumbnail)
   */
  renderArticleCard(article) {
    const hasImage = article.image?.url;
    const imageHtml = hasImage 
      ? `<div class="card-thumb"><img src="${API_CONFIG.BASE_URL}${article.image.url}" alt="${article.title}"></div>`
      : '<div class="card-thumb card-thumb-placeholder"></div>';
    
    const readTime = Utils.getReadTime(article);
    const excerpt = article.excerpt || Utils.truncateText(article.content, 80);
    // Tags removed to avoid crowding
    const tagsHtml = '';

    return `
      <div class="article-card-horizontal">
        ${imageHtml}
        <div class="card-content">
          <div class="card-category">${this.category?.name || 'Article'}</div>
          <h3 class="card-title">
            <a href="/${article.category?.slug || 'article'}/${article.slug}">${article.title}</a>
          </h3>
          <p class="card-excerpt">${excerpt}</p>
          ${tagsHtml}
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
   * Render tags as clickable links
   */
  renderTags(tags, limit = 3) {
    if (!tags || tags.length === 0) return '';
    
    const displayTags = tags.slice(0, limit);
    const remaining = tags.length - limit;
    
    let html = '<div class="article-tags">';
    html += displayTags.map(tag => 
      `<a href="/tag/${tag.slug}" class="article-tag">${tag.name}</a>`
    ).join('');
    
    if (remaining > 0) {
      html += `<span class="article-tags-more">+${remaining}</span>`;
    }
    
    html += '</div>';
    return html;
  }

  /**
   * Render popular tags section (displayed below the first article)
   */
  renderPopularTags(tags) {
    if (!tags || tags.length === 0) return '';
    
    const tagsHtml = tags.map(tag => {
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
      
      return `<a href="/tag/${encodeURIComponent(tagSlug)}" class="popular-tag-link">${tagName}</a>`;
    }).filter(Boolean).join('');
    
    if (!tagsHtml) return '';
    
    return `
      <div class="popular-tags-section">
        <span class="popular-tags-header">
          <i class="fa fa-tags"></i>
          <span>Popular Topics</span>
        </span>
        ${tagsHtml}
      </div>
    `;
  }

  /**
   * Get read time from article
   */

  /**
   * Format date to readable string
   */

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
      ? `<div class="mini-card-image"><img src="${API_CONFIG.BASE_URL}${article.image.url}" alt="${article.title}"></div>`
      : '<div class="mini-card-image mini-card-placeholder"></div>';
    
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

  /**
   * Render pagination
   */
  renderPagination() {
    const totalPages = Math.ceil(this.totalArticles / this.pageSize);
    
    if (totalPages <= 1) {
      this.paginationContainer.style.display = 'none';
      return;
    }

    this.paginationContainer.style.display = 'flex';
    
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
          // Check contentType to call appropriate load function
          if (this.contentType === 'calculators') {
            this.loadCalculators();
          } else {
            this.loadArticles();
          }
          // Scroll to top of articles
          window.scrollTo({ top: 300, behavior: 'smooth' });
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
  async showError(message) {
    // Update page title
    document.title = 'Page Not Found - FiscalColumn';
    
    // Show loading initially
    this.articlesContainer.innerHTML = `
      <div class="loading-container">
        <div class="spinner"></div>
        <p>Loading...</p>
      </div>
    `;
    
    try {
      // Fetch header for CategoryNotFound image, and PopularTag for tags
      const [headerRes, popularTagRes] = await Promise.all([
        fetch(getApiUrl('/header?populate=CategoryNotFound')),
        fetch(getApiUrl('/popular-tag?populate[tags][populate][articles][populate]=image'))
      ]);
      
      const headerData = await headerRes.json();
      const popularTagData = await popularTagRes.json();
      
      // Get the not found image URL - handle different Strapi v5 media structures
      const notFoundImage = headerData.data?.CategoryNotFound;
      let imageUrl = 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'800\' height=\'600\'%3E%3Crect fill=\'%23f0f0f0\' width=\'800\' height=\'600\'/%3E%3Ctext fill=\'%23999\' font-family=\'sans-serif\' font-size=\'24\' x=\'50%25\' y=\'50%25\' text-anchor=\'middle\'%3E404 Not Found%3C/text%3E%3C/svg%3E';
      
      if (notFoundImage) {
        // Handle different possible structures
        let url = null;
        if (notFoundImage.url) {
          url = notFoundImage.url;
        } else if (notFoundImage.data?.attributes?.url) {
          url = notFoundImage.data.attributes.url;
        } else if (notFoundImage.data?.[0]?.attributes?.url) {
          url = notFoundImage.data[0].attributes.url;
        } else if (notFoundImage.data?.url) {
          url = notFoundImage.data.url;
        }
        
        if (url) {
          imageUrl = getApiUrl('').replace('/api', '') + url;
        }
      }
      
      // Get popular tags
      const popularTags = popularTagData.data?.tags || [];
      
      // Collect articles from popular tags (unique, top 20)
      const articlesMap = new Map();
      for (const tag of popularTags) {
        if (tag.articles) {
          for (const article of tag.articles) {
            if (!articlesMap.has(article.documentId)) {
              articlesMap.set(article.documentId, article);
            }
          }
        }
      }
      const topArticles = Array.from(articlesMap.values()).slice(0, 10);
      
      // Fetch articles from Latest News and Market News categories
      const [latestNewsRes, marketNewsRes] = await Promise.all([
        fetch(getApiUrl('/articles?filters[category][slug]=latest-news&populate=image&pagination[limit]=6&sort=publishedDate:desc')),
        fetch(getApiUrl('/articles?filters[category][slug]=market-news&populate=image&pagination[limit]=6&sort=publishedDate:desc'))
      ]);
      
      const latestNewsData = await latestNewsRes.json();
      const marketNewsData = await marketNewsRes.json();
      
      const latestNewsArticles = latestNewsData.data || [];
      const marketNewsArticles = marketNewsData.data || [];
      
      // Render the error page layout
      this.renderErrorPage(imageUrl, message, popularTags, topArticles, latestNewsArticles, marketNewsArticles);
      
      // Initialize carousels
      this.initErrorCarousels();
      
    } catch (error) {
      console.error('Error loading error page data:', error);
      // Fallback to simple error
      this.articlesContainer.innerHTML = `
        <div class="error-container-simple">
          <h2>Page Not Found</h2>
          <p>${message}</p>
          <div class="error-actions">
            <a href="/" class="error-btn primary">Go to Homepage</a>
            <a href="javascript:history.back()" class="error-btn secondary">Go Back</a>
          </div>
        </div>
      `;
    }
  }

  /**
   * Render the full error page with image, popular tags sidebar, and articles
   */
  renderErrorPage(imageUrl, message, popularTags, articles, latestNewsArticles, marketNewsArticles) {
    // Build popular tags HTML
    const popularTagsHtml = popularTags.length > 0 ? popularTags.map(tag => `
      <a href="/tag/${tag.slug}" class="popular-tag-item">
        <div class="popular-tag-icon"><i class="fa fa-tag"></i></div>
        <span class="popular-tag-name">${tag.name}</span>
        <i class="fa fa-chevron-right popular-tag-arrow"></i>
      </a>
    `).join('') : '<p class="no-tags">No popular tags available</p>';
    
    // Build trending articles HTML (horizontal cards, 2 per row)
    const trendingArticlesHtml = articles.length > 0 ? articles.map(article => 
      this.renderErrorHorizontalCard(article)
    ).join('') : '';
    
    // Build Latest News carousel cards
    const latestNewsHtml = latestNewsArticles.length > 0 ? latestNewsArticles.map(article => 
      this.renderErrorCarouselCard(article)
    ).join('') : '';
    
    // Build Market News carousel cards
    const marketNewsHtml = marketNewsArticles.length > 0 ? marketNewsArticles.map(article => 
      this.renderErrorCarouselCard(article)
    ).join('') : '';
    
    // Main layout
    this.articlesContainer.innerHTML = `
      <div class="error-page-wrapper">
        <div class="error-page-split">
          <!-- Left side: Image background with buttons -->
          <div class="error-left-section" style="background-image: url('${imageUrl}');">
            <div class="error-page-actions">
              <a href="/" class="error-btn primary">
                <i class="fa fa-home"></i> Home Page
              </a>
              <a href="javascript:history.back()" class="error-btn secondary">
                <i class="fa fa-arrow-left"></i> Go Back
              </a>
            </div>
          </div>
          
          <!-- Right side: Popular Tags (35%) -->
          <div class="error-right-section">
            <div class="popular-tags-sidebar">
              <div class="popular-tags-header">
                <i class="fa fa-link"></i> <span>Popular Topics</span>
              </div>
              <div class="popular-tags-divider"></div>
              <div class="popular-tags-list">
                ${popularTagsHtml}
              </div>
            </div>
          </div>
        </div>
        
        ${articles.length > 0 ? `
        <!-- Trending Articles Section -->
        <div class="error-category-section">
          <div class="error-section-header">
            <h3 class="error-section-title">Trending Articles</h3>
          </div>
          <div class="error-articles-grid-2col">
            ${trendingArticlesHtml}
          </div>
        </div>
        ` : ''}
        
        ${latestNewsArticles.length > 0 ? `
        <!-- Latest News Carousel Section -->
        <div class="error-carousel-section">
          <div class="error-section-header">
            <h3 class="error-section-title">Latest News</h3>
            <a href="/latest-news" class="error-section-link">View All <i class="fa fa-arrow-right"></i></a>
          </div>
          <div class="error-carousel-wrapper">
            <button class="error-carousel-nav error-carousel-prev" data-carousel="latest-news">
              <i class="fa fa-chevron-left"></i>
            </button>
            <div class="error-carousel-container" id="latest-news-carousel">
              ${latestNewsHtml}
            </div>
            <button class="error-carousel-nav error-carousel-next" data-carousel="latest-news">
              <i class="fa fa-chevron-right"></i>
            </button>
          </div>
        </div>
        ` : ''}
        
        ${marketNewsArticles.length > 0 ? `
        <!-- Market News Carousel Section -->
        <div class="error-carousel-section alt-bg">
          <div class="error-section-header">
            <h3 class="error-section-title">Market News</h3>
            <a href="/market-news" class="error-section-link">View All <i class="fa fa-arrow-right"></i></a>
          </div>
          <div class="error-carousel-wrapper">
            <button class="error-carousel-nav error-carousel-prev" data-carousel="market-news">
              <i class="fa fa-chevron-left"></i>
            </button>
            <div class="error-carousel-container" id="market-news-carousel">
              ${marketNewsHtml}
            </div>
            <button class="error-carousel-nav error-carousel-next" data-carousel="market-news">
              <i class="fa fa-chevron-right"></i>
            </button>
          </div>
        </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Render a horizontal article card for error page (Trending Articles)
   */
  renderErrorHorizontalCard(article) {
    const imageUrl = article.image?.url 
      ? getApiUrl('').replace('/api', '') + article.image.url 
      : '';
    const readTime = Utils.getReadTime(article);
    const date = article.publishedDate ? Utils.formatDate(article.publishedDate) : '';
    const excerpt = article.excerpt || '';
    
    return `
      <div class="error-horizontal-card">
        <div class="error-card-image">
          <a href="/${article.category?.slug || 'article'}/${article.slug}">
            ${imageUrl ? `<img src="${imageUrl}" alt="${article.title}">` : '<div class="error-card-placeholder"></div>'}
          </a>
        </div>
        <div class="error-card-content">
          <h4 class="error-card-title">
            <a href="/${article.category?.slug || 'article'}/${article.slug}">${article.title}</a>
          </h4>
          ${excerpt ? `<p class="error-card-excerpt">${excerpt}</p>` : ''}
          <div class="error-card-meta">
            <span><i class="fa fa-clock-o"></i> ${readTime} min read</span>
            ${date ? `<span><i class="fa fa-calendar"></i> ${date}</span>` : ''}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render a vertical carousel card for error page (Latest News / Market News)
   */
  renderErrorCarouselCard(article) {
    const imageUrl = article.image?.url 
      ? getApiUrl('').replace('/api', '') + article.image.url 
      : '';
    const readTime = Utils.getReadTime(article);
    const date = article.publishedDate ? Utils.formatDate(article.publishedDate) : '';
    const excerpt = article.excerpt || '';
    
    return `
      <div class="error-carousel-card">
        <div class="error-carousel-card-image">
          <a href="/${article.category?.slug || 'article'}/${article.slug}">
            ${imageUrl ? `<img src="${imageUrl}" alt="${article.title}">` : '<div class="no-image"></div>'}
          </a>
        </div>
        <div class="error-carousel-card-content">
          <h4 class="error-carousel-card-title">
            <a href="/${article.category?.slug || 'article'}/${article.slug}">${article.title}</a>
          </h4>
          ${excerpt ? `<p class="error-carousel-card-excerpt">${excerpt}</p>` : ''}
          <div class="error-carousel-card-meta">
            <span>${readTime} min read</span>
            ${date ? `<span>• ${date}</span>` : ''}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Initialize carousel scrolling for error page
   */
  initErrorCarousels() {
    document.querySelectorAll('.error-carousel-nav').forEach(btn => {
      btn.addEventListener('click', () => {
        const carouselId = btn.dataset.carousel;
        const container = document.getElementById(`${carouselId}-carousel`);
        if (!container) return;
        
        const card = container.querySelector('.error-carousel-card');
        if (!card) return;
        
        const cardWidth = card.offsetWidth + 20; // card width + gap
        const direction = btn.classList.contains('error-carousel-next') ? 1 : -1;
        
        container.scrollBy({
          left: direction * cardWidth,
          behavior: 'smooth'
        });
      });
    });
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  const manager = new CategoryPageManager();
  manager.init();
});


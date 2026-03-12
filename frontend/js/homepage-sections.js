/**
 * Homepage Sections Manager
 * Fetches sections from Strapi and dynamically renders them
 */

class HomepageSectionsManager {
  constructor() {
    this.sectionsContainer = document.getElementById('homepage-sections-container');
  }

  /** Resolve a Strapi image URL to an absolute URL, falling back to the local placeholder */
  imgUrl(url) {
    if (!url) return '/images/placeholder-article.svg';
    if (url.startsWith('http')) return url;
    const base = window.API_CONFIG?.BASE_URL || 'http://localhost:1337';
    return base + url;
  }

  /** Returns 'img-placeholder' class string when no real image exists */
  imgClass(url) {
    return url ? '' : 'img-placeholder';
  }

  /**
   * Initialize - fetch and render all sections
   */
  async init() {
    try {
      const sections = await this.fetchSections();
      
      if (sections && sections.length > 0) {
        await this.renderSections(sections);
      } else {
        this.renderNoSectionsMessage();
      }
    } catch (error) {
      console.error('Error loading sections:', error);
      this.renderErrorMessage();
    }
  }

  /**
   * Fetch all enabled homepage sections with their categories and style relations
   */
  async fetchSections() {
    const url = getApiUrl('/homepage-sections?populate[category]=true&filters[enabled][$eq]=true&sort=order:asc');
    const response = await fetch(url);
    const data = await response.json();
    return data.data || [];
  }

  /**
   * Fetch articles for a specific category
   */
  async fetchArticlesByCategory(categoryDocumentId, limit = 5) {
    const url = getApiUrl(`/articles?populate[category]=true&populate[image]=true&populate[author][populate][photo]=true&filters[category][documentId][$eq]=${categoryDocumentId}&pagination[limit]=${limit}&sort=publishedDate:desc`);
    const response = await fetch(url);
    const data = await response.json();
    return data.data || [];
  }

  /**
   * Render all sections
   */
  async renderSections(sections) {
    this.sectionsContainer.innerHTML = '';
    let browseInserted  = false;
    let renderedCount   = 0;

    // Pre-fetch browse categories once
    const allCategories = await this.fetchCategoriesWithImages();

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      const category = section.category;
      
      if (!category) continue;

      const sectionType = section.sectionStyle || 'article-list';
      const itemsToShow = section.itemsToShow || 5;
      const isCarousel  = sectionType === 'news-grid';
      const limit       = isCarousel ? 10 : itemsToShow;

      const articles = await this.fetchArticlesByCategory(category.documentId, limit);

      // Skip sections with no articles (don't count them toward placement)
      if (!articles || articles.length === 0) continue;

      const bgClass = renderedCount % 2 === 0 ? '' : 'section-alt-bg';

      let sectionHtml = '';
      switch (sectionType) {
        case 'news-grid':
          sectionHtml = this.renderNewsSection(section, articles, bgClass, renderedCount, category);
          break;
        case 'featured-banner':
          sectionHtml = this.renderGridWithDateSection(section, articles, bgClass, renderedCount, category);
          break;
        case 'calculator-grid':
          sectionHtml = this.renderGridVerticalSection(section, articles, bgClass, renderedCount, category);
          break;
        case 'article-list':
        default:
          sectionHtml = this.renderGridSection(section, articles, bgClass, renderedCount, category);
          break;
      }

      this.sectionsContainer.innerHTML += sectionHtml;
      renderedCount++;

      // Insert "Browse by Category" after the FIRST section that has content
      if (!browseInserted && allCategories.length > 0) {
        browseInserted = true;
        this.sectionsContainer.innerHTML += this.renderBrowseByCategory(allCategories);
      }
    }

    this.initCarouselScrolling();
  }

  async fetchCategoriesWithImages() {
    try {
      const url = getApiUrl('/categories?populate[categoryImage]=true&filters[enabled][$eq]=true&sort=order:asc');
      const res  = await fetch(url);
      const data = await res.json();
      return data.data || [];
    } catch { return []; }
  }

  // Palette cycles for categories without an image
  getCategoryColor(index) {
    const palettes = [
      { bg: '#3d5a80', text: '#ffffff' },
      { bg: '#6b4226', text: '#ffffff' },
      { bg: '#2d6a4f', text: '#ffffff' },
      { bg: '#7b2d8b', text: '#ffffff' },
      { bg: '#b5451b', text: '#ffffff' },
      { bg: '#1a5276', text: '#ffffff' },
      { bg: '#6c6f22', text: '#ffffff' },
      { bg: '#4a235a', text: '#ffffff' },
    ];
    return palettes[index % palettes.length];
  }

  renderBrowseByCategory(categories) {
    const apiBase = window.API_CONFIG?.BASE_URL || 'http://localhost:1337';
    const cards = categories.map((cat, idx) => {
      const label = (cat.displayname || cat.name || '').toUpperCase();
      const initial = label.charAt(0);

      if (cat.categoryImage?.url) {
        const imgUrl = cat.categoryImage.url.startsWith('http')
          ? cat.categoryImage.url
          : apiBase + cat.categoryImage.url;
        return `
          <a href="/${cat.slug}" class="browse-cat-card">
            <img src="${imgUrl}" alt="${label}" loading="lazy">
            <div class="browse-cat-label">${label}</div>
          </a>`;
      }

      // No image — colored tile with category initial
      const { bg, text } = this.getCategoryColor(idx);
      return `
        <a href="/${cat.slug}" class="browse-cat-card browse-cat-no-img" style="background:${bg}">
          <div class="browse-cat-initial" style="color:${text}">${initial}</div>
          <div class="browse-cat-label browse-cat-label-solid">${label}</div>
        </a>`;
    }).join('');

    return `
      <div class="browse-by-category-section">
        <div class="container">
          <div class="browse-cat-header">BROWSE BY CATEGORY</div>
          <div class="browse-cat-grid">${cards}</div>
        </div>
      </div>`;
  }

  /**
   * No-op — carousels now use native CSS overflow scroll; no JS buttons needed.
   */
  initCarouselScrolling() {}

  /**
   * Render News Section (Large post + small posts)
   */
  renderNewsSection(section, articles, bgClass, index, category) {
    const featured = articles[0];
    const sideArticles = articles.slice(1, 4);
    const categoryUrl = category?.slug ? `/${category.slug}` : '#';
    const sectionTitle = category?.displayname || category?.name || 'News';

    if (!featured) return '';

    const imgBase = window.API_CONFIG?.BASE_URL || '';

    const featuredImgUrl = featured.image?.url ? `${imgBase}${featured.image.url}` : null;
    const featuredExcerpt = featured.excerpt || Utils.truncateText(featured.content, 100);
    const featuredUrl = `/${featured.category?.slug || 'article'}/${featured.slug}`;

    const makeMeta = (a) => {
      const parts = [];
      if (a.author?.name) parts.push(`<span class="rcb-meta-author">${a.author.name}</span>`);
      if (a.publishedDate) parts.push(`<span class="rcb-meta-date">${Utils.formatDate(a.publishedDate)}</span>`);
      return parts.length ? `<div class="rcb-meta">${parts.join('<span class="rcb-meta-sep"> | </span>')}</div>` : '';
    };

    const sideItemsHtml = sideArticles.map(a => {
      const imgUrl = a.image?.url ? `${imgBase}${a.image.url}` : null;
      const url = `/${a.category?.slug || 'article'}/${a.slug}`;
      const excerpt = a.excerpt || Utils.truncateText(a.content, 60);
      return `
        <a href="${url}" class="rcb-item">
          <div class="rcb-item-image">
            ${imgUrl ? `<img src="${imgUrl}" alt="${a.title}">` : `<div class="rca-no-img"></div>`}
          </div>
          <div class="rcb-item-content">
            <h4 class="rcb-item-title">${a.title}</h4>
            ${excerpt ? `<p class="rcb-item-excerpt">${excerpt}</p>` : ''}
            ${makeMeta(a)}
          </div>
        </a>`;
    }).join('');

    return `
      <div class="content-section section-${index + 1} ${bgClass}">
        <div class="container">
          <div class="hp-section-header">
            <h2 class="hp-section-title"><a href="${categoryUrl}">${sectionTitle}</a></h2>
          </div>
          <div class="rcb-grid">
            <a href="${featuredUrl}" class="rcb-featured">
              <div class="rcb-featured-image">
                ${featuredImgUrl
                  ? `<img src="${featuredImgUrl}" alt="${featured.title}">`
                  : `<div class="rca-no-img"></div>`}
              </div>
              <h3 class="rcb-featured-title">${featured.title}</h3>
              <p class="rcb-featured-excerpt">${featuredExcerpt}</p>
              ${makeMeta(featured)}
            </a>
            <div class="rcb-sidebar">
              ${sideItemsHtml}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render Grid Section (Cards layout)
   */
  renderGridSection(section, articles, bgClass, index, category) {
    const categoryUrl = category?.slug ? `/${category.slug}` : '#';
    const sectionTitle = category?.displayname || category?.name || 'Articles';
    
    return `
      <div class="courses content-section section-${index + 1} ${bgClass}">
        <div class="container">
          <div class="row">
            <div class="col">
              <div class="hp-section-header">
                <h2 class="hp-section-title"><a href="${categoryUrl}">${sectionTitle}</a></h2>
              </div>
            </div>
          </div>
          <div class="row courses_row">
            ${articles.slice(0, 6).map(article => this.renderGridCard(article)).join('')}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render Grid Vertical Section (Carousel - native CSS horizontal scroll, 4 visible)
   */
  renderGridVerticalSection(section, articles, bgClass, index, category) {
    const categoryUrl = category?.slug ? `/${category.slug}` : '#';
    const sectionTitle = category?.displayname || category?.name || 'Articles';
    
    return `
      <div class="related-category-section content-section section-${index + 1} ${bgClass}">
        <div class="container">
          <div class="hp-section-header">
            <h3 class="hp-section-title"><a href="${categoryUrl}">${sectionTitle}</a></h3>
          </div>
          <div class="hp-carousel">
            ${articles.slice(0, 10).map(article => this.renderCarouselCard(article)).join('')}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render Grid with Date Section (Carousel with date badges — native CSS horizontal scroll, 4 visible)
   */
  renderGridWithDateSection(section, articles, bgClass, index, category) {
    const categoryUrl = category?.slug ? `/${category.slug}` : '#';
    const sectionTitle = category?.displayname || category?.name || 'Articles';

    return `
      <div class="related-category-section content-section section-${index + 1} ${bgClass}">
        <div class="container">
          <div class="hp-section-header">
            <h3 class="hp-section-title"><a href="${categoryUrl}">${sectionTitle}</a></h3>
          </div>
          <div class="hp-carousel">
            ${articles.slice(0, 10).map(article => this.renderCarouselCard(article)).join('')}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render Large News Post
   */
  renderLargeNewsPost(article) {
    return `
      <a href="/${article.category?.slug || 'article'}/${article.slug}" class="news-featured-card">
        <img src="${this.imgUrl(article.image?.url)}" class="${this.imgClass(article.image?.url)}" alt="${article.title}">
        <div class="news-featured-overlay">
          <h3 class="news-featured-title">${article.title}</h3>
          <div class="news-featured-meta">
            <span>${article.author || 'Admin'}</span>
            <span class="separator">|</span>
            <span>${Utils.formatDate(article.publishedDate)}</span>
          </div>
        </div>
      </a>
    `;
  }

  /**
   * Render Small News Post
   */
  renderSmallNewsPost(article) {
    return `
      <div class="news-side-item">
        <a href="/${article.category?.slug || 'article'}/${article.slug}" class="news-side-title">${article.title}</a>
        <div class="news-side-meta">
          <span>${article.author || 'Admin'}</span>
          <span class="separator">|</span>
          <span>${Utils.formatDate(article.publishedDate)}</span>
        </div>
      </div>
    `;
  }

  /**
   * Render Grid Card (Horizontal layout - image left, content right)
   */
  renderGridCard(article) {
    const imageHtml = `<div class="grid-card-image"><img src="${this.imgUrl(article.image?.url)}" class="${this.imgClass(article.image?.url)}" alt="${article.title}"></div>`;

    return `
      <div class="col-lg-6 col-md-6 grid_card_col">
        <div class="grid-card-horizontal">
          ${imageHtml}
          <div class="grid-card-content">
            <h3 class="grid-card-title"><a href="/${article.category?.slug || 'article'}/${article.slug}">${article.title}</a></h3>
            <div class="grid-card-meta">
              <span>${article.minutesToread || 3} min read</span>
              <span class="separator">•</span>
              <span>${Utils.formatDate(article.publishedDate)}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render Carousel Card — editorial grid style (matches category page Layout A, no badge)
   */
  renderCarouselCard(article) {
    const imgUrl = article.image?.url ? this.imgUrl(article.image.url) : null;
    const excerpt = article.excerpt || Utils.truncateText(article.content, 80);
    const url = `/${article.category?.slug || 'article'}/${article.slug}`;
    const author = article.author;
    const photoUrl = author?.photo?.url ? this.imgUrl(author.photo.url) : null;
    const authorHtml = author ? `
      <div class="rc-author">
        ${photoUrl
          ? `<img src="${photoUrl}" alt="${author.name}" class="rc-author-avatar">`
          : `<span class="rc-author-initial">${(author.name || 'A').charAt(0).toUpperCase()}</span>`}
        <span class="rc-author-name">${author.name}</span>
      </div>` : '';

    return `
      <a href="${url}" class="carousel-card rca-card">
        <div class="rca-card-image">
          ${imgUrl
            ? `<img src="${imgUrl}" alt="${article.title}">`
            : `<div class="rca-no-img"></div>`}
        </div>
        <h4 class="rca-card-title">${article.title}</h4>
        ${excerpt ? `<p class="rca-card-excerpt">${excerpt}</p>` : ''}
        ${authorHtml}
      </a>
    `;
  }

  /**
   * Render Carousel Card with Date Badge
   */
  renderCarouselCardWithDate(article) {
    const inner = `<img src="${this.imgUrl(article.image?.url)}" class="${this.imgClass(article.image?.url)}" alt="${article.title}">`;

    const date = new Date(article.publishedDate);
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleString('en', { month: 'short' });

    return `
      <a href="/${article.category?.slug || 'article'}/${article.slug}" class="carousel-card cwdate-card">
        ${inner}
        <div class="carousel-card-date-badge">
          <span class="date-day">${day}</span>
          <span class="date-month">${month}</span>
        </div>
        <div class="cwdate-overlay">
          <h4 class="cwdate-title">${article.title}</h4>
          <div class="cwdate-meta">
            <span>${article.minutesToread || 3} min read</span>
            <span class="separator">•</span>
            <span>${Utils.formatDate(article.publishedDate)}</span>
          </div>
        </div>
      </a>
    `;
  }

  /**
   * Render no sections message
   */
  renderNoSectionsMessage() {
    this.sectionsContainer.innerHTML = `
      <div class="container py-5">
        <div class="alert alert-info text-center">
          No sections available. Please configure homepage sections in the admin panel.
        </div>
      </div>
    `;
  }

  /**
   * Render error message
   */
  renderErrorMessage() {
    this.sectionsContainer.innerHTML = `
      <div class="container py-5">
        <div class="alert alert-danger text-center">
          Unable to load sections. Please check if the server is running.
        </div>
      </div>
    `;
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  const manager = new HomepageSectionsManager();
  manager.init();
});


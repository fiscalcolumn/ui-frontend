/**
 * Homepage Sections Manager
 * Fetches sections from Strapi and dynamically renders them
 */

class HomepageSectionsManager {
  constructor() {
    this.sectionsContainer = document.getElementById('homepage-sections-container');
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
      console.error('❌ Error loading sections:', error);
      this.renderErrorMessage();
    }
  }

  /**
   * Fetch all enabled homepage sections with their categories and style relations
   */
  async fetchSections() {
    const url = getApiUrl('/homepage-sections?populate[category]=true&populate[homepagesectionstyle]=true&filters[enabled][$eq]=true&sort=order:asc');
    const response = await fetch(url);
    const data = await response.json();
    return data.data || [];
  }

  /**
   * Fetch articles for a specific category
   */
  async fetchArticlesByCategory(categoryDocumentId, limit = 5) {
    const url = getApiUrl(`/articles?populate[category]=true&populate[image]=true&populate[tags]=true&filters[category][documentId][$eq]=${categoryDocumentId}&pagination[limit]=${limit}&sort=publishedDate:desc`);
    const response = await fetch(url);
    const data = await response.json();
    return data.data || [];
  }

  /**
   * Render all sections
   */
  async renderSections(sections) {
    this.sectionsContainer.innerHTML = '';
    
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      const category = section.category;
      
      if (!category) {
        continue;
      }

      // Get sectionType and itemsToShow from homepagesectionstyle relation
      const sectionStyle = section.homepagesectionstyle;
      const sectionType = sectionStyle?.sectionstyle || 'grid';
      const itemsToShow = sectionStyle?.itemtoshow || 5;

      // Determine article limit - carousel sections get 10 items
      const isCarousel = sectionType === 'grid-vertical' || sectionType === 'grid-with-date';
      const limit = isCarousel ? 10 : itemsToShow;

      // Fetch articles for this category
      const articles = await this.fetchArticlesByCategory(category.documentId, limit);
      
      // Determine background class (alternate grey/white)
      const bgClass = i % 2 === 0 ? '' : 'section-alt-bg';
      
      // Render based on section type
      let sectionHtml = '';
      switch (sectionType) {
        case 'news':
          sectionHtml = this.renderNewsSection(section, articles, bgClass, i, category);
          break;
        case 'grid-with-date':
          sectionHtml = this.renderGridWithDateSection(section, articles, bgClass, i, category);
          break;
        case 'grid-vertical':
          sectionHtml = this.renderGridVerticalSection(section, articles, bgClass, i, category);
          break;
        case 'grid':
        default:
          sectionHtml = this.renderGridSection(section, articles, bgClass, i, category);
          break;
      }
      
      this.sectionsContainer.innerHTML += sectionHtml;
    }

    // Initialize carousel scrolling after all sections are rendered
    this.initCarouselScrolling();
  }

  /**
   * Initialize carousel scrolling functionality (same as category page)
   */
  initCarouselScrolling() {
    document.querySelectorAll('.carousel-nav').forEach(btn => {
      btn.addEventListener('click', () => {
        const carouselId = btn.dataset.carousel;
        const carousel = document.getElementById(carouselId);
        if (!carousel) return;

        const cardWidth = carousel.querySelector('.carousel-card')?.offsetWidth || 280;
        const gap = 20;
        const scrollAmount = cardWidth + gap;

        if (btn.classList.contains('carousel-prev')) {
          carousel.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
        } else {
          carousel.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
      });
    });
  }

  /**
   * Render News Section (Large post + small posts)
   */
  renderNewsSection(section, articles, bgClass, index, category) {
    const mainArticle = articles[0];
    const sideArticles = articles.slice(1, 6);
    const categoryUrl = category?.slug ? `/${category.slug}` : '#';
    // Use category.displayname instead of section.title
    const sectionTitle = category?.displayname || category?.name || 'News';

    return `
      <div class="news content-section section-${index + 1} ${bgClass}">
        <div class="container">
          <div class="row">
            <div class="col">
              <div class="section_title_container d-flex flex-row align-items-center justify-content-between">
                <h2 class="section_title mb-0">${sectionTitle}</h2>
                <div class="courses_button trans_200"><a href="${categoryUrl}">${section.buttonText || 'view all'}</a></div>
              </div>
            </div>
          </div>
          <div class="row news_row">
            <div class="col-lg-7 news_col">
              ${mainArticle ? this.renderLargeNewsPost(mainArticle) : '<div class="no-articles">No articles available</div>'}
            </div>
            <div class="col-lg-5 news_col">
              <div class="news_posts_small">
                ${sideArticles.map(article => this.renderSmallNewsPost(article)).join('')}
              </div>
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
    // Use category.displayname instead of section.title
    const sectionTitle = category?.displayname || category?.name || 'Articles';
    
    return `
      <div class="courses content-section section-${index + 1} ${bgClass}">
        <div class="container">
          <div class="row">
            <div class="col">
              <div class="section_title_container d-flex flex-row align-items-center justify-content-between">
                <h2 class="section_title mb-0">${sectionTitle}</h2>
                <div class="courses_button trans_200"><a href="${categoryUrl}">${section.buttonText || 'view all'}</a></div>
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
   * Render Grid Vertical Section (Carousel - same as category page)
   */
  renderGridVerticalSection(section, articles, bgClass, index, category) {
    const categoryUrl = category?.slug ? `/${category.slug}` : '#';
    const carouselId = `carousel-vertical-${index}`;
    // Use category.displayname instead of section.title
    const sectionTitle = category?.displayname || category?.name || 'Articles';
    
    return `
      <div class="related-category-section content-section section-${index + 1} ${bgClass}">
        <div class="container">
          <div class="related-category-header">
            <h3 class="related-category-title">${sectionTitle}</h3>
            <a href="${categoryUrl}" class="related-category-link">${section.buttonText || 'View All'} <i class="fa fa-arrow-right"></i></a>
          </div>
          <div class="related-carousel-wrapper">
            <button class="carousel-nav carousel-prev" data-carousel="${carouselId}" aria-label="Previous">
              <i class="fa fa-chevron-left"></i>
            </button>
            <div class="related-carousel" id="${carouselId}">
              <div class="carousel-track">
                ${articles.slice(0, 10).map(article => this.renderCarouselCard(article)).join('')}
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
   * Render Grid with Date Section (Carousel with date badges)
   */
  renderGridWithDateSection(section, articles, bgClass, index, category) {
    const categoryUrl = category?.slug ? `/${category.slug}` : '#';
    const carouselId = `carousel-date-${index}`;
    // Use category.displayname instead of section.title
    const sectionTitle = category?.displayname || category?.name || 'Articles';
    
    return `
      <div class="related-category-section content-section section-${index + 1} ${bgClass}">
        <div class="container">
          <div class="related-category-header">
            <h3 class="related-category-title">${sectionTitle}</h3>
            <a href="${categoryUrl}" class="related-category-link">${section.buttonText || 'View All'} <i class="fa fa-arrow-right"></i></a>
          </div>
          <div class="related-carousel-wrapper">
            <button class="carousel-nav carousel-prev" data-carousel="${carouselId}" aria-label="Previous">
              <i class="fa fa-chevron-left"></i>
            </button>
            <div class="related-carousel" id="${carouselId}">
              <div class="carousel-track">
                ${articles.slice(0, 10).map(article => this.renderCarouselCardWithDate(article)).join('')}
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
   * Render Large News Post
   */
  renderLargeNewsPost(article) {
    const hasImage = article.image?.url;
    const imageHtml = hasImage 
      ? `<div class="news_post_image"><img src="${API_CONFIG.BASE_URL}${article.image.url}" alt="${article.title}"></div>`
      : '';
    
    return `
      <div class="news_post_large_container">
        <div class="news_post_large">
          ${imageHtml}
          <div class="news_post_large_title"><a href="/${article.category?.slug || 'article'}/${article.slug}">${article.title}</a></div>
          <div class="news_post_meta">
            <ul>
              <li><a href="#">${article.author || 'Admin'}</a></li>
              <li><a href="#">${Utils.formatDate(article.publishedDate)}</a></li>
            </ul>
          </div>
          <div class="news_post_text">
            <p>${article.excerpt || Utils.truncateText(article.content, 150)}</p>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render Small News Post
   */
  renderSmallNewsPost(article) {
    return `
      <div class="news_post_small">
        <div class="news_post_small_title"><a href="/${article.category?.slug || 'article'}/${article.slug}">${article.title}</a></div>
        <div class="news_post_meta">
          <ul>
            <li><a href="#">${article.author || 'Admin'}</a></li>
            <li><a href="#">${Utils.formatDate(article.publishedDate)}</a></li>
          </ul>
        </div>
      </div>
    `;
  }

  /**
   * Render Grid Card (Horizontal layout - image left, content right)
   */
  renderGridCard(article) {
    const hasImage = article.image?.url;
    const imageHtml = hasImage 
      ? `<div class="grid-card-image"><img src="${API_CONFIG.BASE_URL}${article.image.url}" alt="${article.title}"></div>`
      : '<div class="grid-card-image grid-card-placeholder"></div>';
    
    const categoryName = article.category?.name || 'Article';
    
    return `
      <div class="col-lg-6 col-md-6 grid_card_col">
        <div class="grid-card-horizontal">
          ${imageHtml}
          <div class="grid-card-content">
            <h3 class="grid-card-title"><a href="/${article.category?.slug || 'article'}/${article.slug}">${article.title}</a></h3>
            <p class="grid-card-excerpt">${article.excerpt || Utils.truncateText(article.content, 80)}</p>
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
   * Render Carousel Card (same structure as category page)
   */
  renderCarouselCard(article) {
    const hasImage = article.image?.url;
    const imageHtml = hasImage 
      ? `<img src="${API_CONFIG.BASE_URL}${article.image.url}" alt="${article.title}">`
      : '<div class="carousel-card-placeholder"></div>';
    
    return `
      <div class="carousel-card">
        <div class="carousel-card-image">
          ${imageHtml}
        </div>
        <div class="carousel-card-content">
          <h4 class="carousel-card-title">
            <a href="/${article.category?.slug || 'article'}/${article.slug}">${article.title}</a>
          </h4>
          <p class="carousel-card-excerpt">${article.excerpt || Utils.truncateText(article.content, 60)}</p>
          <div class="carousel-card-meta">
            <span>${article.minutesToread || 3} min read</span>
            <span class="separator">•</span>
            <span>${Utils.formatDate(article.publishedDate)}</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render Carousel Card with Date Badge
   */
  renderCarouselCardWithDate(article) {
    const hasImage = article.image?.url;
    const imageHtml = hasImage 
      ? `<img src="${API_CONFIG.BASE_URL}${article.image.url}" alt="${article.title}">`
      : '<div class="carousel-card-placeholder"></div>';
    
    const date = new Date(article.publishedDate);
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleString('en', { month: 'short' });
    
    return `
      <div class="carousel-card carousel-card-with-date">
        <div class="carousel-card-image">
          ${imageHtml}
          <div class="carousel-card-date-badge">
            <span class="date-day">${day}</span>
            <span class="date-month">${month}</span>
          </div>
        </div>
        <div class="carousel-card-content">
          <h4 class="carousel-card-title">
            <a href="/${article.category?.slug || 'article'}/${article.slug}">${article.title}</a>
          </h4>
          <p class="carousel-card-excerpt">${article.excerpt || Utils.truncateText(article.content, 60)}</p>
          <div class="carousel-card-meta">
            <span>${article.minutesToread || 3} min read</span>
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


/**
 * Homepage Sections Manager
 * Fetches sections from Strapi and dynamically renders them
 */

class HomepageSectionsManager {
  constructor() {
    this.sectionsContainer = document.getElementById('homepage-sections-container');
  }

  /** Resolve a Strapi image URL to an absolute URL. Returns null if no URL provided. */
  imgUrl(url) {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    const base = window.API_CONFIG?.BASE_URL || 'http://localhost:1337';
    return base + url;
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
      console.log(`[HomepageSections] section "${section.category?.name}" → sectionStyle = "${section.sectionStyle}" (resolved: "${sectionType}"`);
      const itemsToShow = section.itemsToShow || 5;
    const isScrollRow     = sectionType === 'scroll-row' || sectionType === 'calculator-grid';
    const isEditorialHero = sectionType === 'editorial-hero';
    const isMediaPortal   = sectionType === 'media-editorial-layout';
    const limit           = isScrollRow ? 10 : isEditorialHero ? 7 : isMediaPortal ? 8 : itemsToShow;

      const articles = await this.fetchArticlesByCategory(category.documentId, limit);

      // Skip sections with no articles (don't count them toward placement)
      if (!articles || articles.length === 0) continue;

      const bgClass = renderedCount % 2 === 0 ? '' : 'section-alt-bg';

      let sectionHtml = '';
      switch (sectionType) {
        case 'lead-story':
          sectionHtml = this.renderNewsSection(section, articles, bgClass, renderedCount, category);
          break;
        case 'digest':
          sectionHtml = this.renderDigestSection(section, articles, bgClass, renderedCount, category);
          break;
        case 'scroll-row':
        case 'calculator-grid':
          sectionHtml = this.renderCarouselSection(section, articles, bgClass, renderedCount, category);
          break;
        case 'editorial-hero':
          sectionHtml = this.renderEditorialHeroSection(section, articles, bgClass, renderedCount, category);
          break;
        case 'media-editorial-layout':
          sectionHtml = this.renderMediaPortalSection(section, articles, bgClass, renderedCount, category);
          break;
        case 'mosaic':
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

        // Insert header_article_2 (if set) after Browse by Category
        const article2 = window.headerArticle2;
        if (article2) {
          this.sectionsContainer.innerHTML += this.renderMidArticle(article2);
        }
      }
    }

    this.initCarouselScrolling();
  }

  /**
   * Render the mid-page featured article (header_article_2)
   * Layout: image 60% left / content 40% right
   */
  renderMidArticle(article) {
    const categorySlug = article.category?.slug || 'news';
    const categoryName = article.category?.name  || 'Latest News';
    const url          = `/${categorySlug}/${article.slug}`;
    const imageUrl     = this.imgUrl(article.image?.url);
    const date         = article.publishedDate || article.createdAt;
    const formattedDate = date ? Utils.formatDate(date) : '';
    const readingTime  = Utils.calculateReadingTimeString(article.content || article.excerpt || '');

    // Author
    const author   = article.author;
    const photoUrl = this.imgUrl(author?.photo?.url);
    const authorHtml = author?.name ? `
      <div class="ha-author">
        ${photoUrl
          ? `<img loading="lazy" src="${photoUrl}" alt="${author.name}" class="ha-author-avatar">`
          : `<div class="ha-author-avatar ha-author-initial">${author.name.charAt(0)}</div>`}
        <span class="ha-author-name">${author.name}</span>
      </div>` : '';

    return `
      <div class="mid-article-section">
        <div class="container">
          <a href="${url}" class="ha-wrapper ha-layout-b">
            <div class="ha-image">
              ${imageUrl
                ? `<img loading="lazy" src="${imageUrl}" alt="${article.title}">`
                : '<div class="ha-img-placeholder"></div>'}
            </div>
            <div class="ha-content">
              <div class="ha-category">${categoryName.toUpperCase()}</div>
              <h2 class="ha-title">${article.title || ''}</h2>
              <p class="ha-excerpt">${article.excerpt || ''}</p>
              <div class="ha-footer">
                ${authorHtml}
                <div class="ha-meta">
                  <span>${readingTime}</span>
                  ${formattedDate ? `<span class="ha-sep">·</span><span>${formattedDate}</span>` : ''}
                </div>
              </div>
            </div>
          </a>
        </div>
      </div>`;
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
    const cards = categories.map((cat, idx) => {
      const label = (cat.displayname || cat.name || '').toUpperCase();
      const initial = label.charAt(0);

      if (cat.categoryImage?.url) {
        const imgUrl = this.imgUrl(cat.categoryImage.url);
        return `
          <a href="/${cat.slug}" class="browse-cat-card">
            <img loading="lazy" src="${imgUrl}" alt="${label}">
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

    const featuredImgUrl = this.imgUrl(featured.image?.url);
    const featuredExcerpt = featured.excerpt || Utils.truncateText(featured.content, 100);
    const featuredUrl = `/${featured.category?.slug || 'article'}/${featured.slug}`;

    const makeMeta = (a) => {
      const parts = [];
      if (a.author?.name) parts.push(`<span class="rcb-meta-author">${a.author.name}</span>`);
      if (a.publishedDate) parts.push(`<span class="rcb-meta-date">${Utils.formatDate(a.publishedDate)}</span>`);
      return parts.length ? `<div class="rcb-meta">${parts.join('<span class="rcb-meta-sep"> | </span>')}</div>` : '';
    };

    const sideItemsHtml = sideArticles.map(a => {
      const imgUrl = this.imgUrl(a.image?.url);
      const url = `/${a.category?.slug || 'article'}/${a.slug}`;
      const excerpt = a.excerpt || Utils.truncateText(a.content, 60);
      return `
        <a href="${url}" class="rcb-item">
          <div class="rcb-item-image">
            ${imgUrl ? `<img loading="lazy" src="${imgUrl}" alt="${a.title}">` : `<div class="rca-no-img"></div>`}
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
                  ? `<img loading="lazy" src="${featuredImgUrl}" alt="${featured.title}">`
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
    const five = articles.slice(0, 5);

    // Bento layout: tile 1 (wide top-left), 2+3 (small top-right), 4 (small bottom-left), 5 (wide bottom-right)
    const sizes = ['bento-1', 'bento-2', 'bento-3', 'bento-4', 'bento-5'];
    const tilesHtml = five.map((article, i) => this.renderBentoTile(article, sizes[i])).join('');

    return `
      <div class="content-section section-${index + 1} ${bgClass}">
        <div class="container">
          <div class="hp-section-header">
            <h2 class="hp-section-title"><a href="${categoryUrl}">${sectionTitle}</a></h2>
          </div>
          <div class="bento-grid">
            ${tilesHtml}
          </div>
        </div>
      </div>
    `;
  }

  renderBentoTile(article, sizeClass) {
    const imgUrl = this.imgUrl(article.image?.url);
    const url = `/${article.category?.slug || 'article'}/${article.slug}`;
    const excerpt = article.excerpt || Utils.truncateText(article.content, 90);
    const author = article.author;
    const photoUrl = this.imgUrl(author?.photo?.url);
    const isLarge = sizeClass === 'bento-1' || sizeClass === 'bento-5';

    const avatarHtml = author ? `
      <div class="bento-avatar" title="${author.name || ''}">
        ${photoUrl
          ? `<img loading="lazy" src="${photoUrl}" alt="${author.name}">`
          : `<span>${(author.name || 'A').charAt(0).toUpperCase()}</span>`}
      </div>` : '';

    return `
      <a href="${url}" class="bento-tile ${sizeClass}">
        ${imgUrl
          ? `<img loading="lazy" src="${imgUrl}" alt="${article.title}" class="bento-img">`
          : `<div class="bento-no-img"></div>`}
        <div class="bento-overlay">
          <div class="bento-body">
            <h4 class="bento-title">${article.title}</h4>
            ${isLarge && excerpt ? `<p class="bento-excerpt">${excerpt}</p>` : ''}
          </div>
          <div class="bento-footer">
            ${avatarHtml}
            <span class="bento-date">${Utils.formatDate(article.publishedDate)}</span>
          </div>
        </div>
      </a>`;
  }

  /**
   * Digest — 2-column grid (4 rows × 2 cols = 8 articles), image + text
   * Used for sectionStyle: 'digest'
   */
  renderDigestSection(section, articles, bgClass, index, category) {
    const categoryUrl  = category?.slug ? `/${category.slug}` : '#';
    const sectionTitle = category?.displayname || category?.name || 'Articles';

    const items = articles.slice(0, 8).map(a => {
      const url     = `/${a.category?.slug || 'article'}/${a.slug}`;
      const imgUrl  = this.imgUrl(a.image?.url);
      const author  = a.author?.name || '';
      const read    = a.minutesToread || Utils.calculateReadingTime(a.content) || 3;
      const date    = Utils.formatDate(a.publishedDate);
      const excerpt = a.excerpt || Utils.truncateText(a.content, 70);
      return `
        <a href="${url}" class="dg-item">
          <div class="dg-thumb">
            ${imgUrl ? `<img loading="lazy" src="${imgUrl}" alt="${a.title}">` : '<div class="dg-no-img"></div>'}
          </div>
          <div class="dg-body">
            <h4 class="dg-title">${a.title}</h4>
            ${excerpt ? `<p class="dg-excerpt">${excerpt}</p>` : ''}
            <div class="dg-meta">
              ${author ? `<span class="dg-author">${author}</span><span class="dg-sep">·</span>` : ''}
              <span>${date}</span>
              <span class="dg-sep">·</span>
              <span>${read} min read</span>
            </div>
          </div>
        </a>`;
    }).join('');

    return `
      <div class="content-section dg-section section-${index + 1} ${bgClass}">
        <div class="container">
          <div class="hp-section-header">
            <h2 class="hp-section-title"><a href="${categoryUrl}">${sectionTitle}</a></h2>
          </div>
          <div class="dg-list">${items}</div>
        </div>
      </div>`;
  }

  /**
   * Render Editorial Hero Section — FT/Bloomberg-style layout
   *   Top:    Featured article text (left 1/3) + hero image (right 2/3)
   *   Bottom: 3-column text-only article grid with thin dividers
   */
  renderEditorialHeroSection(section, articles, bgClass, index, category) {
    const featured = articles[0];
    if (!featured) return '';

    const categoryUrl  = category?.slug ? `/${category.slug}` : '#';
    const sectionTitle = category?.displayname || category?.name || 'News';
    const featuredUrl  = `/${featured.category?.slug || 'article'}/${featured.slug}`;
    const imgUrl       = this.imgUrl(featured.image?.url);
    const excerpt      = featured.excerpt || Utils.truncateText(featured.content, 140);
    const author       = featured.author?.name || '';
    const date         = featured.publishedDate ? Utils.formatDate(featured.publishedDate) : '';
    const meta         = [author, date].filter(Boolean).join(' · ');

    const gridItems = articles.slice(1, 7).map(a => {
      const url     = `/${a.category?.slug || 'article'}/${a.slug}`;
      const catName = (a.category?.name || '').toUpperCase();
      const aAuthor = a.author?.name || '';
      const aDate   = a.publishedDate ? Utils.formatDate(a.publishedDate) : '';
      const aMeta   = [aAuthor, aDate].filter(Boolean).join(' · ');
      return `
        <a href="${url}" class="eh-grid-item">
          ${catName ? `<span class="eh-grid-cat">${catName}</span>` : ''}
          <h4 class="eh-grid-title">${a.title}</h4>
          ${aMeta ? `<p class="eh-grid-meta">${aMeta}</p>` : ''}
        </a>`;
    }).join('');

    return `
      <div class="content-section eh-section section-${index + 1} ${bgClass}">
        <div class="container">
          <div class="hp-section-header">
            <h2 class="hp-section-title"><a href="${categoryUrl}">${sectionTitle}</a></h2>
          </div>
          <div class="eh-hero">
            <a href="${featuredUrl}" class="eh-featured-text">
              <h3 class="eh-featured-title">${featured.title}</h3>
              ${excerpt ? `<p class="eh-featured-excerpt">${excerpt}</p>` : ''}
              ${meta    ? `<p class="eh-featured-meta">${meta}</p>`       : ''}
            </a>
            <a href="${featuredUrl}" class="eh-featured-image">
              ${imgUrl
                ? `<img loading="lazy" src="${imgUrl}" alt="${featured.title}">`
                : '<div class="eh-img-placeholder"></div>'}
            </a>
          </div>
          ${gridItems ? `<div class="eh-grid">${gridItems}</div>` : ''}
        </div>
      </div>`;
  }

  /**
   * Render Media Portal Section — 3-column layout
   *   Left  (1fr):   3 text-only article snippets stacked with dividers
   *   Center(1.8fr):  TOP — hero article with large image
   *                   BOTTOM — second article with thumbnail image on the left
   *   Right (1fr):   1 medium article (image + text) + 2 mini thumbnail articles
   *
   * Articles: [0]=center hero, [1-3]=left stack, [4]=right-top,
   *           [5-6]=right-mini, [7]=center sub-article  (8 total)
   */
  renderMediaPortalSection(section, articles, bgClass, index, category) {
    if (!articles.length) return '';

    const categoryUrl  = category?.slug ? `/${category.slug}` : '#';
    const sectionTitle = category?.displayname || category?.name || 'News';

    const hero       = articles[0];
    const leftItems  = articles.slice(1, 4);
    const rightTop   = articles[4] || null;
    const rightMini  = articles.slice(5, 7);
    const subArticle = articles[7] || null;

    // ── Helper: meta line ─────────────────────────────────────────
    const meta = (a) => {
      const parts = [];
      if (a.author?.name)  parts.push(`<span class="mp-meta-author">${a.author.name}</span>`);
      if (a.publishedDate) parts.push(`<span>${Utils.formatDate(a.publishedDate)}</span>`);
      if (a.minutesToread) parts.push(`<span>${a.minutesToread} min read</span>`);
      return parts.length
        ? `<p class="mp-meta">${parts.join('<span class="mp-meta-sep"> · </span>')}</p>`
        : '';
    };

    // ── Left: text-only stack ─────────────────────────────────────
    const leftHtml = leftItems.map((a, i) => {
      const url     = `/${a.category?.slug || 'article'}/${a.slug}`;
      const catName = (a.category?.name || '').toUpperCase();
      const excerpt = a.excerpt || Utils.truncateText(a.content, 80);
      const isLast  = i === leftItems.length - 1;
      return `
        <a href="${url}" class="mp-list-item${isLast ? ' mp-list-item--last' : ''}">
          ${catName ? `<span class="mp-list-cat">${catName}</span>` : ''}
          <h4 class="mp-list-title">${a.title}</h4>
          ${excerpt ? `<p class="mp-list-excerpt">${excerpt}</p>` : ''}
          ${meta(a)}
        </a>`;
    }).join('');

    // ── Center top: hero ──────────────────────────────────────────
    const heroUrl     = `/${hero.category?.slug || 'article'}/${hero.slug}`;
    const heroImg     = this.imgUrl(hero.image?.url);
    const heroCat     = (hero.category?.name || '').toUpperCase();
    const heroExcerpt = hero.excerpt || Utils.truncateText(hero.content, 120);

    // ── Center bottom: sub-article (image left) ───────────────────
    const subHtml = subArticle ? (() => {
      const url     = `/${subArticle.category?.slug || 'article'}/${subArticle.slug}`;
      const img     = this.imgUrl(subArticle.image?.url);
      const catName = (subArticle.category?.name || '').toUpperCase();
      const excerpt = subArticle.excerpt || Utils.truncateText(subArticle.content, 90);
      return `
        <a href="${url}" class="mp-sub">
          <div class="mp-sub-image">
            ${img
              ? `<img loading="lazy" src="${img}" alt="${subArticle.title}">`
              : '<div class="mp-img-placeholder"></div>'}
          </div>
          <div class="mp-sub-body">
            ${catName ? `<span class="mp-sub-cat">${catName}</span>` : ''}
            <h4 class="mp-sub-title">${subArticle.title}</h4>
            ${excerpt ? `<p class="mp-sub-excerpt">${excerpt}</p>` : ''}
            ${meta(subArticle)}
          </div>
        </a>`;
    })() : '';

    // ── Right: medium top + two minis ────────────────────────────
    const rightTopHtml = rightTop ? (() => {
      const url     = `/${rightTop.category?.slug || 'article'}/${rightTop.slug}`;
      const img     = this.imgUrl(rightTop.image?.url);
      const catName = (rightTop.category?.name || '').toUpperCase();
      const excerpt = rightTop.excerpt || Utils.truncateText(rightTop.content, 80);
      return `
        <a href="${url}" class="mp-right-top">
          <div class="mp-right-top-image">
            ${img
              ? `<img loading="lazy" src="${img}" alt="${rightTop.title}">`
              : '<div class="mp-img-placeholder"></div>'}
          </div>
          ${catName ? `<span class="mp-right-cat">${catName}</span>` : ''}
          <h4 class="mp-right-title">${rightTop.title}</h4>
          ${excerpt ? `<p class="mp-right-excerpt">${excerpt}</p>` : ''}
          ${meta(rightTop)}
        </a>`;
    })() : '';

    const rightMiniHtml = rightMini.map(a => {
      const url = `/${a.category?.slug || 'article'}/${a.slug}`;
      const img = this.imgUrl(a.image?.url);
      return `
        <a href="${url}" class="mp-mini">
          <div class="mp-mini-image">
            ${img
              ? `<img loading="lazy" src="${img}" alt="${a.title}">`
              : '<div class="mp-img-placeholder"></div>'}
          </div>
          <div class="mp-mini-body">
            <h5 class="mp-mini-title">${a.title}</h5>
            ${meta(a)}
          </div>
        </a>`;
    }).join('');

    return `
      <div class="content-section mp-section section-${index + 1} ${bgClass}">
        <div class="container">
          <div class="hp-section-header">
            <h2 class="hp-section-title"><a href="${categoryUrl}">${sectionTitle}</a></h2>
          </div>
          <div class="mp-layout">

            <!-- Left: text stack -->
            <div class="mp-left">${leftHtml}</div>

            <!-- Center: hero + sub-article -->
            <div class="mp-center-col">
              <a href="${heroUrl}" class="mp-center">
                <div class="mp-center-image">
                  ${heroImg
                    ? `<img loading="eager" src="${heroImg}" alt="${hero.title}">`
                    : '<div class="mp-img-placeholder"></div>'}
                </div>
                ${heroCat ? `<span class="mp-center-cat">${heroCat}</span>` : ''}
                <h3 class="mp-center-title">${hero.title}</h3>
                ${heroExcerpt ? `<p class="mp-center-excerpt">${heroExcerpt}</p>` : ''}
                ${meta(hero)}
              </a>
              ${subHtml}
            </div>

            <!-- Right: medium + minis -->
            <div class="mp-right">
              ${rightTopHtml}
              ${rightMiniHtml ? `<div class="mp-right-bottom">${rightMiniHtml}</div>` : ''}
            </div>

          </div>
        </div>
      </div>`;
  }

  /**
   * Render Carousel Section (native CSS horizontal scroll, 4 visible)
   * Used for both 'scroll-row' and 'calculator-grid' section styles.
   */
  renderCarouselSection(section, articles, bgClass, index, category) {
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
          ? `<img loading="lazy" src="${photoUrl}" alt="${author.name}" class="rc-author-avatar">`
          : `<span class="rc-author-initial">${(author.name || 'A').charAt(0).toUpperCase()}</span>`}
        <span class="rc-author-name">${author.name}</span>
      </div>` : '';

    return `
      <a href="${url}" class="carousel-card rca-card">
        <div class="rca-card-image">
          ${imgUrl
            ? `<img loading="lazy" src="${imgUrl}" alt="${article.title}">`
            : `<div class="rca-no-img"></div>`}
        </div>
        <h4 class="rca-card-title">${article.title}</h4>
        ${excerpt ? `<p class="rca-card-excerpt">${excerpt}</p>` : ''}
        ${authorHtml}
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


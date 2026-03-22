/**
 * Header Article Component
 * Fetches header_article (shown above homepage sections) and
 * header_article_2 (shown after the first category section, via window).
 */

const HA_POPULATE =
  'populate[header_article][populate][image]=true' +
  '&populate[header_article][populate][category]=true' +
  '&populate[header_article][populate][author][populate][photo]=true' +
  '&populate[header_article_2][populate][image]=true' +
  '&populate[header_article_2][populate][category]=true' +
  '&populate[header_article_2][populate][author][populate][photo]=true';

async function fetchHeaderArticles() {
  try {
    const res = await fetch(getApiUrl(`/header?${HA_POPULATE}`));
    if (!res.ok) throw new Error('Failed to fetch header');
    const data = await res.json();
    return data.data;
  } catch (err) {
    console.error('Error fetching header articles:', err);
    return null;
  }
}

/** Build author HTML (avatar + name) */
function haAuthorHtml(author) {
  if (!author?.name) return '';
  const photoUrl = author.photo?.url
    ? `${getApiUrl('').replace('/api', '')}${author.photo.url}`
    : '';
  return `
    <div class="ha-author">
      ${photoUrl
        ? `<img loading="lazy" src="${photoUrl}" alt="${author.name}" class="ha-author-avatar">`
        : `<div class="ha-author-avatar ha-author-initial">${author.name.charAt(0)}</div>`}
      <span class="ha-author-name">${author.name}</span>
    </div>`;
}

/** Build the inner HTML for an article card */
function haCardHtml(article, layout = 'ha-layout-a') {
  const categorySlug = article.category?.slug || 'news';
  const categoryName = article.category?.name  || 'Latest News';
  const url          = `/${categorySlug}/${article.slug}`;
  const imageUrl     = article.image?.url
    ? `${getApiUrl('').replace('/api', '')}${article.image.url}`
    : '';
  const date         = article.publishedDate || article.createdAt;
  const formattedDate = date ? Utils.formatDate(date) : '';
  const readingTime  = Utils.calculateReadingTimeString(article.content || article.excerpt || '');

  return `
    <a href="${url}" class="ha-wrapper ${layout}">
      <div class="ha-image">
        ${imageUrl
          ? `<img loading="eager" fetchpriority="high" src="${imageUrl}" alt="${article.title}">`
          : '<div class="ha-img-placeholder"></div>'}
      </div>
      <div class="ha-content">
        <div class="ha-category">${categoryName.toUpperCase()}</div>
        <h2 class="ha-title" role="heading" aria-level="2">${article.title || ''}</h2>
        <p class="ha-excerpt">${article.excerpt || ''}</p>
        <div class="ha-footer">
          ${haAuthorHtml(article.author)}
          <div class="ha-meta">
            <span>${readingTime}</span>
            ${formattedDate ? `<span class="ha-sep">·</span><span>${formattedDate}</span>` : ''}
          </div>
        </div>
      </div>
    </a>`;
}

async function renderHeaderArticle() {
  const container = document.getElementById('header-article-section');
  if (!container) return;

  const headerData = await fetchHeaderArticles();
  const article1   = headerData?.header_article;
  const article2   = headerData?.header_article_2;

  // Expose article2 for homepage-sections.js to inject after first section
  window.headerArticle2 = article2 || null;

  if (!article1) {
    container.style.display = 'none';
    return;
  }

  container.classList.add('loaded');
  container.innerHTML = `<div class="container">${haCardHtml(article1, 'ha-layout-a')}</div>`;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderHeaderArticle);
} else {
  renderHeaderArticle();
}

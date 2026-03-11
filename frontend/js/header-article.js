/**
 * Header Article Component
 * Fetches and renders the header article below the market ticker
 * The header API now returns all article data needed
 */

// Fetch header with populated header_article (reuse shared header data)
async function fetchHeaderWithArticle() {
  // Use shared header data if available
  if (window.getHeaderData) {
    return await window.getHeaderData();
  }
  
  // Fallback if header.js hasn't loaded yet
  try {
    const response = await fetch(getApiUrl('/header?populate=*'));
    if (!response.ok) {
      throw new Error('Failed to fetch header');
    }
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error fetching header:', error);
    return null;
  }
}

// Format date for display
function formatHeaderArticleDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

// Calculate reading time (approximate)
// calculateReadingTime moved to Utils

// Render header article
async function renderHeaderArticle() {
  const container = document.getElementById('header-article-section');
  if (!container) {
    console.error('Header article container not found');
    return;
  }

  const headerData = await fetchHeaderWithArticle();
  const article = headerData?.header_article;
  
  if (!article) {
    // Hide the section if no article is set
    container.style.display = 'none';
    return;
  }

  // Build article URL
  const categorySlug = article.category?.slug || 'news';
  const articleUrl = `/${categorySlug}/${article.slug}`;

  // Get image URL
  const imageUrl = article.image?.url 
    ? `${getApiUrl('').replace('/api', '')}${article.image.url}`
    : '/images/default-article.jpg';

  // Format date and reading time
  const formattedDate = formatHeaderArticleDate(article.publishedDate || article.createdAt);
  const readingTime = Utils.calculateReadingTimeString(article.content || article.excerpt);

  // Render the header article
  container.innerHTML = `
    <div class="container">
      <div class="header-article-wrapper">
        <div class="header-article-content">
          <div class="header-article-label">LATEST NEWS</div>
          <h2 class="header-article-title">
            <a href="${articleUrl}">${article.title || 'No Title'}</a>
          </h2>
          <p class="header-article-excerpt">${article.excerpt || ''}</p>
          <div class="header-article-meta">
            <span class="header-article-reading-time">${readingTime}</span>
            <span class="header-article-separator">•</span>
            <span class="header-article-date">${formattedDate}</span>
          </div>
        </div>
        <div class="header-article-image">
          <a href="${articleUrl}">
            <img src="${imageUrl}" alt="${article.title || 'Article Image'}" loading="lazy">
          </a>
        </div>
      </div>
    </div>
  `;
}

// Initialize header article when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderHeaderArticle);
} else {
  renderHeaderArticle();
}

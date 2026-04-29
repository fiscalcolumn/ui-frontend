/**
 * Authors List Page
 * Fetches all authors, counts their articles, and renders a sorted grid.
 * Sort order: admin first, then by article count descending.
 */

class AuthorsListManager {
  async init() {
    try {
      const authors = await this.fetchAllAuthors();
      const withCounts = await this.attachArticleCounts(authors);
      const sorted = this.sortAuthors(withCounts);
      this.render(sorted);
    } catch (err) {
      console.error('Error loading authors:', err);
      document.getElementById('authors-container').innerHTML =
        '<p style="color:#888;text-align:center;padding:40px 0;">Failed to load authors.</p>';
    }
  }

  async fetchAllAuthors() {
    const url = getApiUrl('/authors?pagination[limit]=100&sort=name:asc&populate[photo]=true');
    const res = await fetch(url);
    const data = await res.json();
    return data.data || [];
  }

  // Fetch article count for each author in parallel
  async attachArticleCounts(authors) {
    const counts = await Promise.all(
      authors.map(async (author) => {
        try {
          const url = getApiUrl(
            `/articles?filters[author][documentId][$eq]=${author.documentId}&pagination[limit]=1`
          );
          const res = await fetch(url);
          const data = await res.json();
          return { ...author, articleCount: data.meta?.pagination?.total || 0 };
        } catch {
          return { ...author, articleCount: 0 };
        }
      })
    );
    return counts;
  }

  sortAuthors(authors) {
    return authors.sort((a, b) => {
      // "admin" always first (case-insensitive)
      const aIsAdmin = (a.name || '').toLowerCase() === 'admin';
      const bIsAdmin = (b.name || '').toLowerCase() === 'admin';
      if (aIsAdmin && !bIsAdmin) return -1;
      if (!aIsAdmin && bIsAdmin) return 1;
      // Then by article count descending
      return (b.articleCount || 0) - (a.articleCount || 0);
    });
  }

  render(authors) {
    const container = document.getElementById('authors-container');
    const subtitle = document.getElementById('authors-subtitle');

    subtitle.textContent = `${authors.length} author${authors.length !== 1 ? 's' : ''}`;

    if (authors.length === 0) {
      container.innerHTML = '<p style="color:#888;text-align:center;padding:40px 0;">No authors found.</p>';
      return;
    }

    container.innerHTML = `<div class="authors-grid">${authors.map(a => this.renderCard(a)).join('')}</div>`;

  }

  renderCard(author) {
    const name = author.name || 'Unknown';
    const slug = author.slug || '';
    const designation = author.designation || '';
    const count = author.articleCount || 0;
    const initial = name.charAt(0).toUpperCase();
    const photoUrl = Utils.resolveImgUrl(author.photo?.url);
    const colors = ['#c0392b', '#0d7fa8', '#2e7d32', '#6a1b9a', '#bf360c', '#004d40', '#b8860b'];
    const colorIndex = name.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % colors.length;
    const fill = colors[colorIndex];

    const avatarHtml = photoUrl
      ? `<img loading="lazy" src="${photoUrl}" alt="${name}" class="author-avatar-img">`
      : `<svg viewBox="0 0 140 140" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <circle cx="70" cy="70" r="70" fill="${fill}"/>
          <text x="70" y="93" text-anchor="middle" font-size="58" font-weight="700" font-family="DM Sans, sans-serif" fill="#ffffff">${initial}</text>
        </svg>`;

    const socialLinks = [
      author.twitter  ? `<a href="${author.twitter}" target="_blank" rel="noopener"><i class="fa fa-twitter"></i></a>` : '',
      author.facebook ? `<a href="${author.facebook}" target="_blank" rel="noopener"><i class="fa fa-facebook"></i></a>` : '',
      author.linkedin ? `<a href="${author.linkedin}" target="_blank" rel="noopener"><i class="fa fa-linkedin"></i></a>` : '',
    ].filter(Boolean).join('');

    return `
      <div class="author-tile">
        <div class="author-avatar-wrap" onclick="window.location='/author/${slug}'">
          ${avatarHtml}
          ${socialLinks ? `<div class="author-avatar-socials">${socialLinks}</div>` : ''}
        </div>
        <a href="/author/${slug}" class="author-tile-name">${name}</a>
        ${designation ? `<div class="author-tile-designation">${designation}</div>` : ''}
        <span class="author-tile-count">
          <i class="fa fa-newspaper-o"></i>
          ${count} article${count !== 1 ? 's' : ''}
        </span>
      </div>
    `;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const manager = new AuthorsListManager();
  manager.init();
});

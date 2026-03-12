/**
 * Tags Listing Page Manager
 * Image cards with palette colours — 5 per row, wrapping grid.
 */

class TagsListManager {
  constructor() {
    this.container = document.getElementById('tags-listing-container');
  }

  async init() {
    try {
      const [tagGroups, allTags] = await Promise.all([
        this.fetchTagGroups(),
        this.fetchAllTags()
      ]);
      this.render(tagGroups, allTags);
    } catch (err) {
      console.error('Error loading tags:', err);
      this.container.innerHTML = `
        <div class="tl-error">
          <i class="fa fa-exclamation-circle"></i>
          <p>Failed to load topics. Please try again later.</p>
        </div>
      `;
    }
  }

  async fetchTagGroups() {
    const url = getApiUrl('/tag-groups?populate[tags]=true&populate[image]=true&sort=name:asc&pagination[limit]=100');
    const res = await fetch(url);
    const data = await res.json();
    return data.data || [];
  }

  async fetchAllTags() {
    const url = getApiUrl('/tags?populate[tagGroup]=true&sort=name:asc&pagination[limit]=200');
    const res = await fetch(url);
    const data = await res.json();
    return data.data || [];
  }

  render(tagGroups, allTags) {
    if (tagGroups.length === 0 && allTags.length === 0) {
      this.container.innerHTML = `
        <div class="tl-empty">
          <i class="fa fa-tags"></i>
          <p>No topics found.</p>
        </div>
      `;
      return;
    }

    const groupedTagIds = new Set();
    tagGroups.forEach(g => (g.tags || []).forEach(t => groupedTagIds.add(t.documentId || t.id)));
    const ungroupedTags = allTags.filter(t => !groupedTagIds.has(t.documentId || t.id) && !t.tagGroup);

    let html = '';

    if (tagGroups.length > 0) {
      html += `<div class="tl-grid">`;
      tagGroups.forEach(group => { html += this.renderGroupCard(group); });
      html += `</div>`;
    }

    if (ungroupedTags.length > 0) {
      html += this.renderUngroupedSection(ungroupedTags);
    }

    if (tagGroups.length === 0 && allTags.length > 0) {
      html = this.renderUngroupedSection(allTags, 'All Tags');
    }

    this.container.innerHTML = html;
  }

  renderGroupCard(group) {
    const name = group.name || 'Untitled';
    const slug = group.slug || '';
    const tags = group.tags || [];
    const tagCount = tags.length;
    const groupUrl = slug ? `/tag-group/${slug}` : '#';

    // Palette colours — cycle deterministically by group name
    const palette = ['#cfe2d9', '#e2cfd9', '#cfe2e2', '#e2d9cf', '#cfd9e2'];
    const palIdx = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % palette.length;
    const fallbackColor = palette[palIdx];

    const imgBase = window.API_CONFIG?.BASE_URL || '';
    const imageUrl = group.image?.url ? `${imgBase}${group.image.url}` : null;

    const bgStyle = imageUrl
      ? `background-image: url('${imageUrl}'); background-size: cover; background-position: center;`
      : `background-color: ${fallbackColor};`;

    return `
      <a href="${groupUrl}" class="tl-card" style="${bgStyle}">
        <div class="tl-card-overlay"></div>
        <div class="tl-card-body">
          <div class="tl-card-name">${name.toUpperCase()}</div>
          <div class="tl-card-count">${tagCount} tag${tagCount !== 1 ? 's' : ''}</div>
        </div>
      </a>
    `;
  }

  renderUngroupedSection(tags, title = 'Other Topics') {
    const pillsHtml = tags.map(tag => `
      <a href="/tag/${tag.slug}" class="tl-tag-pill">
        <i class="fa fa-tag"></i> ${tag.name}
      </a>
    `).join('');

    return `
      <div class="tl-ungrouped-section">
        <div class="tl-section-title">${title}</div>
        <div class="tl-pills-row">${pillsHtml}</div>
      </div>
    `;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new TagsListManager().init();
});

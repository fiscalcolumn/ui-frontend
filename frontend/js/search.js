/**
 * Search Page Manager
 *
 * Layout:
 *   Top  — search bar + result summary
 *   Left — sidebar: Tag Groups + Tags + Categories (links, not filters)
 *   Right — article list (icon · title · excerpt · arrow), paginated
 *
 * Logic:
 *   1. Read ?q= and ?page= from URL
 *   2. Parallel fetch: categories, tag-groups, tags, articles
 *   3. Exact name/slug match on page 1 → redirect immediately
 *   4. Otherwise render two-column layout
 */

const SR_PAGE_SIZE = 20;

class SearchPageManager {
  constructor() {
    this.query         = '';
    this.currentPage   = 1;
    this.totalArticles = 0;

    this.resultsEl   = document.getElementById('sr-results');
    this.loadingEl   = document.getElementById('sr-loading');
    this.summaryEl   = document.getElementById('sr-result-summary');
    this.inputEl     = document.getElementById('sr-search-input');
    this.formEl      = document.getElementById('sr-search-form');
  }

  // ── Bootstrap ─────────────────────────────────────────────────────────────

  init() {
    const params     = new URLSearchParams(window.location.search);
    this.query       = (params.get('q') || '').trim();
    this.currentPage = Math.max(1, parseInt(params.get('page') || '1', 10));

    if (this.inputEl && this.query) this.inputEl.value = this.query;

    if (this.formEl) {
      this.formEl.addEventListener('submit', e => {
        e.preventDefault();
        const q = (this.inputEl?.value || '').trim();
        if (q) window.location.href = `/search?q=${encodeURIComponent(q)}`;
      });
    }

    // Breadcrumb
    const bcEl = document.getElementById('breadcrumb-search');
    if (bcEl) bcEl.textContent = this.query ? `"${this.query}"` : 'Search';

    // Page title
    if (this.query) {
      document.title = `"${this.query}" — Search | FiscalColumn`;
    }

    if (!this.query) {
      this._showEmpty('Type anything to start searching.');
      return;
    }

    this._runSearch();
  }

  // ── API helpers ───────────────────────────────────────────────────────────

  async _get(path) {
    const url = getApiUrl(path);
    const res = await fetch(url);
    if (!res.ok) { console.warn(`[Search] API ${res.status}: ${url}`); return []; }
    const data = await res.json();
    return data.data || [];
  }

  _fetchCategories(q) {
    return this._get(
      `/categories?filters[name][$containsi]=${encodeURIComponent(q)}` +
      `&filters[enabled][$eq]=true&sort=name:asc&pagination[limit]=20`
    );
  }

  _fetchTagGroups(q) {
    return this._get(
      `/tag-groups?filters[name][$containsi]=${encodeURIComponent(q)}` +
      `&sort=order:asc,name:asc&pagination[limit]=20`
    );
  }

  _fetchTags(q) {
    return this._get(
      `/tags?filters[name][$containsi]=${encodeURIComponent(q)}` +
      `&populate[tagGroup]=true&sort=name:asc&pagination[limit]=40`
    );
  }

  async _fetchArticles(q, page = 1) {
    const start = (page - 1) * SR_PAGE_SIZE;
    const url = getApiUrl(
      `/articles` +
      `?filters[$or][0][title][$containsi]=${encodeURIComponent(q)}` +
      `&filters[$or][1][excerpt][$containsi]=${encodeURIComponent(q)}` +
      `&populate[category]=true&populate[image]=true` +
      `&sort=publishedDate:desc` +
      `&pagination[start]=${start}&pagination[limit]=${SR_PAGE_SIZE}`
    );
    const res = await fetch(url);
    if (!res.ok) { console.warn(`[Search] API ${res.status}: ${url}`); return []; }
    const data = await res.json();
    this.totalArticles = data.meta?.pagination?.total || 0;
    return data.data || [];
  }

  // ── Exact-match ───────────────────────────────────────────────────────────

  _exactMatch(items, q) {
    const norm  = q.toLowerCase().trim();
    const slugQ = norm.replace(/\s+/g, '-');
    return items.find(item =>
      (item.name || '').toLowerCase() === norm ||
      (item.slug || '') === slugQ
    ) || null;
  }

  // ── Search orchestration ──────────────────────────────────────────────────

  async _runSearch() {
    this._showLoading(true);
    try {
      const [categories, tagGroups, tags, articles] = await Promise.all([
        this._fetchCategories(this.query),
        this._fetchTagGroups(this.query),
        this._fetchTags(this.query),
        this._fetchArticles(this.query, this.currentPage),
      ]);

      // Exact-match redirects only on page 1
      if (this.currentPage === 1) {
        const ec = this._exactMatch(categories, this.query);
        if (ec) { window.location.replace(`/${ec.slug}`); return; }
        const eg = this._exactMatch(tagGroups, this.query);
        if (eg) { window.location.replace(`/tag-group/${eg.slug}`); return; }
        const et = this._exactMatch(tags, this.query);
        if (et) { window.location.replace(`/tag/${et.slug}`); return; }
      }

      this._showLoading(false);
      this._render({ categories, tagGroups, tags, articles });

    } catch (err) {
      console.error('Search error:', err);
      this._showLoading(false);
      this._showError('Something went wrong. Please try again.');
    }
  }

  // ── Main render ───────────────────────────────────────────────────────────

  _render({ categories, tagGroups, tags, articles }) {
    const hasTopics   = categories.length + tagGroups.length + tags.length > 0;
    const hasArticles = articles.length > 0 || this.totalArticles > 0;

    if (!hasTopics && !hasArticles) {
      this._showEmpty(`No results for <strong>${this._esc(this.query)}</strong>. Try a different keyword.`);
      this._setSummary('No results found.');
      return;
    }

    // Summary line
    const parts = [];
    if (this.totalArticles) parts.push(`${this.totalArticles} article${this.totalArticles !== 1 ? 's' : ''}`);
    const topicCount = categories.length + tagGroups.length + tags.length;
    if (topicCount) parts.push(`${topicCount} topic${topicCount !== 1 ? 's' : ''}`);
    this._setSummary(
      parts.length
        ? `${parts.join(' and ')} for <strong>"${this._esc(this.query)}"</strong>`
        : ''
    );

    // Sidebar always shows when there are matching topics (all pages)
    const sidebar = hasTopics
      ? this._renderSidebar({ categories, tagGroups, tags })
      : '';

    const main = this._renderMain(articles);

    this.resultsEl.innerHTML = `
      <div class="sr-layout${sidebar ? '' : ' sr-layout--no-sidebar'}">
        ${sidebar ? `<aside class="sr-sidebar">${sidebar}</aside>` : ''}
        <div class="sr-main">${main}</div>
      </div>`;
  }

  // ── Sidebar ───────────────────────────────────────────────────────────────

  _renderSidebar({ categories, tagGroups, tags }) {
    const sections = [];

    if (categories.length > 0) {
      const links = categories.map(c => `
        <a href="/${c.slug}" class="sr-side-link">
          <i class="fa fa-folder-o"></i>
          <span>${this._esc(c.name)}</span>
        </a>`).join('');
      sections.push(`
        <div class="sr-side-section">
          <div class="sr-side-heading">Categories</div>
          ${links}
        </div>`);
    }

    // Tag groups and tags use identical link-with-icon style
    if (tagGroups.length > 0) {
      const links = tagGroups.map(g => `
        <a href="/tag-group/${g.slug}" class="sr-side-link">
          <i class="fa fa-tags"></i>
          <span>${this._esc(g.name)}</span>
        </a>`).join('');
      sections.push(`
        <div class="sr-side-section">
          <div class="sr-side-heading">Topic Groups</div>
          ${links}
        </div>`);
    }

    if (tags.length > 0) {
      const links = tags.map(t => `
        <a href="/tag/${t.slug}" class="sr-side-link">
          <i class="fa fa-tag"></i>
          <span>${this._esc(t.name)}</span>
        </a>`).join('');
      sections.push(`
        <div class="sr-side-section">
          <div class="sr-side-heading">Topics</div>
          ${links}
        </div>`);
    }

    return sections.join('');
  }

  // ── Main: article list + pagination ───────────────────────────────────────

  _renderMain(articles) {
    if (articles.length === 0 && this.currentPage === 1) {
      return `
        <div class="sr-empty">
          <div class="sr-empty-icon"><i class="fa fa-newspaper-o"></i></div>
          <p class="sr-empty-msg">No articles found for <strong>${this._esc(this.query)}</strong>.</p>
        </div>`;
    }

    const rows = articles.map(a => this._renderListItem(a)).join('');
    const pag  = this._renderPagination();

    return `
      <div class="sr-article-list">${rows}</div>
      ${pag}`;
  }

  // ── Article list row ──────────────────────────────────────────────────────

  _renderListItem(article) {
    const hasImg  = article.image?.url;
    const imgUrl  = hasImg ? `${API_CONFIG.BASE_URL}${article.image.url}` : '';
    const cat     = article.category?.name || 'Article';
    const catSlug = article.category?.slug || 'article';
    const href    = `/${catSlug}/${article.slug}`;
    const excerpt = article.excerpt || Utils.truncateText(article.content || '', 120);
    const rt      = article.minutesToread || Utils.calculateReadingTime(article.content || '');
    const date    = Utils.formatDate(article.publishedDate);

    const thumb = hasImg
      ? `<img loading="lazy" src="${imgUrl}" alt="${this._esc(article.title)}">`
      : `<div class="sr-row-thumb-empty"></div>`;

    return `
      <a href="${href}" class="sr-row">
        <div class="sr-row-thumb">${thumb}</div>
        <div class="sr-row-body">
          <span class="sr-row-cat">${this._esc(cat)}</span>
          <h3 class="sr-row-title">${this._esc(article.title)}</h3>
          ${excerpt ? `<p class="sr-row-excerpt">${this._esc(excerpt)}</p>` : ''}
          <div class="sr-row-meta">
            <span>${rt} min read</span>
            <span class="sr-meta-sep">·</span>
            <span>${date}</span>
          </div>
        </div>
      </a>`;
  }

  // ── Pagination ────────────────────────────────────────────────────────────

  _renderPagination() {
    const totalPages = Math.ceil(this.totalArticles / SR_PAGE_SIZE);
    if (totalPages <= 1) return '';

    const q   = encodeURIComponent(this.query);
    const cur = this.currentPage;
    const href = p => `/search?q=${q}&page=${p}`;

    // Window of page numbers around current
    const spread = 2;
    let start = Math.max(1, cur - spread);
    let end   = Math.min(totalPages, cur + spread);
    if (end - start < spread * 2) {
      start = Math.max(1, end - spread * 2);
      end   = Math.min(totalPages, start + spread * 2);
    }
    const range = [];
    for (let p = start; p <= end; p++) range.push(p);

    const prev = cur > 1
      ? `<a href="${href(cur - 1)}" class="sr-pg-btn" aria-label="Previous"><i class="fa fa-chevron-left"></i> Prev</a>`
      : `<span class="sr-pg-btn sr-pg-btn--off"><i class="fa fa-chevron-left"></i> Prev</span>`;

    const next = cur < totalPages
      ? `<a href="${href(cur + 1)}" class="sr-pg-btn" aria-label="Next">Next <i class="fa fa-chevron-right"></i></a>`
      : `<span class="sr-pg-btn sr-pg-btn--off">Next <i class="fa fa-chevron-right"></i></span>`;

    const nums =
      (start > 1 ? `<span class="sr-pg-ellipsis">…</span>` : '') +
      range.map(p => p === cur
        ? `<span class="sr-pg-num sr-pg-num--active">${p}</span>`
        : `<a href="${href(p)}" class="sr-pg-num">${p}</a>`
      ).join('') +
      (end < totalPages ? `<span class="sr-pg-ellipsis">…</span>` : '');

    return `
      <nav class="sr-pagination" aria-label="Pages">
        <span class="sr-pg-info">Page ${cur} of ${totalPages}</span>
        <div class="sr-pg-controls">
          ${prev}${nums}${next}
        </div>
      </nav>`;
  }

  // ── States ────────────────────────────────────────────────────────────────

  _showLoading(show) {
    if (this.loadingEl) this.loadingEl.style.display = show ? 'flex' : 'none';
  }

  _setSummary(html) {
    if (this.summaryEl) this.summaryEl.innerHTML = html;
  }

  _showEmpty(msg) {
    this._setSummary('');
    this.resultsEl.innerHTML = `
      <div class="sr-empty">
        <div class="sr-empty-icon"><i class="fa fa-search"></i></div>
        <p class="sr-empty-msg">${msg}</p>
        <a href="/" class="sr-empty-link"><i class="fa fa-home"></i> Back to Home</a>
      </div>`;
  }

  _showError(msg) {
    this.resultsEl.innerHTML = `
      <div class="sr-empty sr-empty--error">
        <div class="sr-empty-icon"><i class="fa fa-exclamation-triangle"></i></div>
        <p class="sr-empty-msg">${msg}</p>
      </div>`;
  }

  // ── Utility ───────────────────────────────────────────────────────────────

  _esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

document.addEventListener('DOMContentLoaded', () => new SearchPageManager().init());

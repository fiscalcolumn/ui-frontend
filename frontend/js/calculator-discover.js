/**
 * Trending list + category wheel, and the related-calculator card row.
 * Built with DOM APIs so titles and excerpts stay text, not markup.
 */
const CalculatorDiscover = {
  categoryMeta(name) {
    const n = (name || '').toLowerCase();
    if (n.includes('loan') || n.includes('finance') || n.includes('credit')) return { icon: 'fa-bank', color: '#3B82F6' };
    if (n.includes('investment') || n.includes('saving')) return { icon: 'fa-line-chart', color: '#10B981' };
    if (n.includes('tax') || n.includes('government') || n.includes('scheme')) return { icon: 'fa-file-text-o', color: '#F59E0B' };
    if (n.includes('health') || n.includes('fitness')) return { icon: 'fa-heartbeat', color: '#EF4444' };
    if (n.includes('retirement')) return { icon: 'fa-calendar-check-o', color: '#8B5CF6' };
    if (n.includes('home') || n.includes('property') || n.includes('real')) return { icon: 'fa-home', color: '#F97316' };
    if (n.includes('salary') || n.includes('business')) return { icon: 'fa-briefcase', color: '#6366F1' };
    if (n.includes('education')) return { icon: 'fa-graduation-cap', color: '#14B8A6' };
    return { icon: 'fa-calculator', color: '#1A73E8' };
  },

  safeIcon(icon) {
    return /^fa-[a-z0-9-]+$/i.test(icon || '') ? icon : 'fa-calculator';
  },

  safeSlug(slug) {
    return /^[a-z0-9-]+$/i.test(slug || '') ? slug : '';
  },

  label(name) {
    if (!name) return 'Calculator';
    return name.replace(/\b\w/g, letter => letter.toUpperCase());
  },

  tint(hex, alpha) {
    const raw = String(hex || '').replace('#', '');
    const full = raw.length === 3 ? raw.split('').map(ch => ch + ch).join('') : raw;
    const value = parseInt(full, 16);
    if (!/^[0-9a-f]{6}$/i.test(full) || !Number.isFinite(value)) return 'rgba(26,115,232,' + alpha + ')';
    const red = (value >> 16) & 255;
    const green = (value >> 8) & 255;
    const blue = value & 255;
    return 'rgba(' + red + ',' + green + ',' + blue + ',' + alpha + ')';
  },

  iconPlate(icon, color) {
    const plate = document.createElement('span');
    plate.className = 'calc-icon-plate';
    plate.style.background = this.tint(color, 0.14);
    plate.style.color = color || '#1A73E8';
    const glyph = document.createElement('i');
    glyph.className = 'fa ' + this.safeIcon(icon);
    plate.appendChild(glyph);
    return plate;
  },

  mountTrending(calcs, catalog) {
    const mount = document.getElementById('calc-trending-mount');
    if (!mount || !calcs.length) return;

    const section = document.createElement('section');
    section.className = 'calc-section-card trend-section';

    const layout = document.createElement('div');
    layout.className = 'trend-layout';

    const listCol = document.createElement('div');
    const heading = document.createElement('h3');
    heading.className = 'calc-section-title discover-title';
    heading.textContent = 'Trending calculators';
    const list = document.createElement('div');
    list.className = 'trend-list';

    calcs.forEach(calc => {
      const slug = this.safeSlug(calc.slug);
      if (!slug) return;
      const link = document.createElement('a');
      link.className = 'trend-item';
      link.href = '/calculator/' + slug;

      const category = calc.calculatorcategory && calc.calculatorcategory.calculatorcategory;
      const meta = this.categoryMeta(category);
      link.appendChild(this.iconPlate(calc.icon || meta.icon, calc.iconColor || meta.color));

      const copy = document.createElement('span');
      copy.className = 'trend-copy';
      const title = document.createElement('strong');
      title.textContent = calc.title || 'Calculator';
      const sub = document.createElement('span');
      sub.textContent = calc.excerpt || this.label(category);
      copy.append(title, sub);

      const count = document.createElement('span');
      count.className = 'trend-count';
      const views = Number(calc.views) || 0;
      count.textContent = typeof Utils !== 'undefined' ? Utils.formatViews(views) : String(views);

      link.append(copy, count);
      list.appendChild(link);
    });

    listCol.append(heading, list);
    layout.appendChild(listCol);

    const categories = (catalog && catalog.categories) || [];
    if (categories.length) {
      layout.appendChild(this.buildWheel(categories, catalog.total || 0));
    }

    section.appendChild(layout);
    mount.replaceChildren(section);
  },

  buildWheel(categories, total) {
    const wrap = document.createElement('div');
    wrap.className = 'trend-wheel';
    const heading = document.createElement('h3');
    heading.className = 'trend-wheel-title discover-title';
    heading.textContent = 'Browse by category';

    const ring = document.createElement('div');
    ring.className = 'trend-ring';

    const hub = document.createElement('a');
    hub.className = 'trend-hub';
    hub.href = '/calculator';
    const figure = document.createElement('strong');
    figure.textContent = typeof Utils !== 'undefined' ? Utils.formatViews(total) : String(total);
    const caption = document.createElement('span');
    caption.textContent = 'Calculators';
    hub.append(figure, caption);

    const shown = categories.slice(0, 8);
    shown.forEach((category, index) => {
      const name = category.calculatorcategory || '';
      const meta = this.categoryMeta(name);
      const orbit = document.createElement('a');
      orbit.className = 'trend-orbit';
      const catId = /^[A-Za-z0-9]+$/.test(category.documentId || '') ? category.documentId : '';
      orbit.href = catId ? '/calculator#cat-' + catId : '/calculator';
      orbit.style.setProperty('--i', String(index));
      orbit.style.setProperty('--n', String(shown.length));
      orbit.style.background = this.tint(meta.color, 0.4);
      orbit.style.color = meta.color;
      const icon = document.createElement('i');
      icon.className = 'fa ' + this.safeIcon(meta.icon);
      const nameLabel = document.createElement('span');
      nameLabel.className = 'trend-orbit-name';
      nameLabel.textContent = this.label(name);
      orbit.append(icon, nameLabel);
      ring.appendChild(orbit);
    });

    ring.appendChild(hub);
    wrap.append(heading, ring);
    return wrap;
  },

  mountRelated(calcs, categoryName) {
    const mount = document.getElementById('calc-related-mount');
    if (!mount) return;

    const section = document.createElement('section');
    section.className = 'calc-section-card related-section';

    const head = document.createElement('div');
    head.className = 'calc-section-title-row';
    const heading = document.createElement('h3');
    heading.className = 'calc-section-title calc-section-title--inline discover-title';
    heading.textContent = 'Related calculators';
    if (categoryName) {
      const chip = document.createElement('span');
      chip.className = 'calc-title-category';
      chip.textContent = categoryName;
      heading.appendChild(chip);
    }
    const viewAll = document.createElement('a');
    viewAll.className = 'calc-view-all-link';
    viewAll.href = '/calculator';
    viewAll.textContent = 'View all';
    head.append(heading, viewAll);

    if (!calcs.length) {
      const empty = document.createElement('p');
      empty.className = 'calc-no-related';
      empty.textContent = 'No other calculators in this category.';
      section.append(head, empty);
      mount.replaceChildren(section);
      return;
    }

    const row = document.createElement('div');
    row.className = 'related-row';

    calcs.slice(0, 8).forEach(calc => {
      const slug = this.safeSlug(calc.slug);
      if (!slug) return;
      const card = document.createElement('a');
      card.className = 'related-card';
      card.href = '/calculator/' + slug;

      const category = calc.calculatorcategory && calc.calculatorcategory.calculatorcategory;
      const meta = this.categoryMeta(category);
      const bubble = this.iconPlate(calc.icon || meta.icon, calc.iconColor || meta.color);
      bubble.classList.add('related-icon');

      const title = document.createElement('strong');
      title.textContent = calc.title || 'Calculator';
      const sub = document.createElement('span');
      sub.textContent = calc.excerpt || this.label(category);

      sub.className = 'related-excerpt';
      card.append(bubble, title, sub);
      row.appendChild(card);
    });

    section.append(head, row);
    mount.replaceChildren(section);
  },

  mountTaggedArticles(articles, tagSlug, calculatorTitle) {
    const mount = document.getElementById('calc-tagged-articles-mount');
    if (!mount || !articles || !articles.length) {
      if (mount) mount.replaceChildren();
      return;
    }

    const section = document.createElement('section');
    section.className = 'calc-section-card calc-tag-articles';

    const heading = document.createElement('h3');
    heading.className = 'calc-section-title discover-title';
    const label = calculatorTitle
      ? 'Guides for ' + calculatorTitle.replace(/\s+Calculator$/i, '')
      : 'Related guides';
    heading.textContent = label;

    const grid = document.createElement('div');
    grid.className = 'calc-tag-grid';

    articles.slice(0, 6).forEach(article => {
      const catSlug = this.safeSlug(article.category && article.category.slug) || 'article';
      const artSlug = this.safeSlug(article.slug);
      if (!artSlug) return;

      const card = document.createElement('a');
      card.className = 'calc-tag-card';
      card.href = '/' + catSlug + '/' + artSlug;

      const media = document.createElement('div');
      media.className = 'calc-tag-media';
      const imgUrl = typeof Utils !== 'undefined'
        ? Utils.safeUrl(Utils.resolveImgUrl(article.image && article.image.url))
        : '';
      if (imgUrl) {
        const img = document.createElement('img');
        img.loading = 'lazy';
        img.src = imgUrl;
        img.alt = article.title || '';
        media.appendChild(img);
      } else {
        const placeholder = document.createElement('div');
        placeholder.className = 'calc-tag-media-empty';
        const letter = ((article.category && article.category.name) || article.title || 'A').charAt(0);
        placeholder.textContent = letter.toUpperCase();
        media.appendChild(placeholder);
      }

      const body = document.createElement('div');
      body.className = 'calc-tag-body';

      if (article.category && article.category.name) {
        const cat = document.createElement('span');
        cat.className = 'calc-tag-cat';
        cat.textContent = article.category.name;
        body.appendChild(cat);
      }

      const title = document.createElement('strong');
      title.className = 'calc-tag-title';
      title.textContent = article.title || 'Article';
      body.appendChild(title);

      if (article.excerpt) {
        const excerpt = document.createElement('p');
        excerpt.className = 'calc-tag-excerpt';
        excerpt.textContent = typeof Utils !== 'undefined'
          ? Utils.truncateText(article.excerpt, 110)
          : article.excerpt;
        body.appendChild(excerpt);
      }

      const meta = document.createElement('span');
      meta.className = 'calc-tag-meta';
      const minutes = Number(article.minutesToRead)
        || (typeof Utils !== 'undefined' ? Utils.getReadTime(article) : 3);
      const date = typeof Utils !== 'undefined' ? Utils.formatDate(article.publishedDate) : '';
      meta.textContent = [minutes + ' min read', date].filter(Boolean).join(' · ');
      body.appendChild(meta);

      card.append(media, body);
      grid.appendChild(card);
    });

    if (!grid.childElementCount) {
      mount.replaceChildren();
      return;
    }

    section.append(heading, grid);

    if (tagSlug && this.safeSlug(tagSlug)) {
      const more = document.createElement('a');
      more.className = 'calc-view-all-link calc-tag-more';
      more.href = '/tag/' + this.safeSlug(tagSlug);
      more.textContent = 'View all';
      section.appendChild(more);
    }

    mount.replaceChildren(section);
  },
};

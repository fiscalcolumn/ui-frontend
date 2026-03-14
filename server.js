require('dotenv').config({ path: `.env.${process.env.NODE_ENV || 'development'}` });

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();

// Environment Configuration
const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = process.env.PORT || 3000;
const SITE_URL = process.env.SITE_URL || 'http://localhost:3000';
const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const STRAPI_API_PATH = process.env.STRAPI_API_PATH || '/api';
const TRUST_PROXY = process.env.TRUST_PROXY === 'true';

// Trust proxy for production (behind reverse proxy)
if (TRUST_PROXY) {
  app.set('trust proxy', 1);
}

// Security Headers (Production)
if (NODE_ENV === 'production') {
  app.use((req, res, next) => {
    // Security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    
    // HTTPS enforcement in production
    if (req.header('x-forwarded-proto') !== 'https' && SITE_URL.startsWith('https')) {
      return res.redirect(`https://${req.get('host')}${req.url}`);
    }
    
    next();
  });
}

// Generate app version for cache busting
// Priority: 1) VERSION file, 2) APP_VERSION env var, 3) timestamp
let APP_VERSION = Date.now();
try {
  const versionFile = path.join(__dirname, 'VERSION');
  if (fs.existsSync(versionFile)) {
    const versionContent = fs.readFileSync(versionFile, 'utf8').trim();
    if (versionContent) {
      APP_VERSION = versionContent;
    }
  }
} catch (error) {
  console.warn('Could not read VERSION file, using timestamp:', error.message);
}
// Allow env var to override file (useful for testing)
APP_VERSION = process.env.APP_VERSION || APP_VERSION;

// Serve config.js endpoint (easier than injecting into HTML)
app.get('/config.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.send(`window.ENV = {
  NODE_ENV: '${NODE_ENV}',
  STRAPI_URL: '${STRAPI_URL || 'http://localhost:1337'}',
  STRAPI_API_PATH: '${STRAPI_API_PATH || '/api'}',
  SITE_URL: '${SITE_URL || 'http://localhost:3000'}',
  APP_VERSION: '${APP_VERSION}'
};`);
});

// Helper function to add version query params to script tags in HTML (cache busting)
function addVersionToScripts(htmlContent) {
  return htmlContent.replace(
    /<script\s+src=["']([^"']+)["']/g,
    (match, src) => {
      // Skip external URLs (CDN) and config.js (already has version logic)
      if (src.startsWith('http') || src.startsWith('//') || src === '/config.js') {
        return match;
      }
      // Skip if already has version parameter
      if (src.includes('?v=') || src.includes('&v=')) {
        return match;
      }
      const separator = src.includes('?') ? '&' : '?';
      return `<script src="${src}${separator}v=${APP_VERSION}"`;
    }
  );
}

// Helper function to send HTML file with versioned script tags
function sendVersionedHtml(res, filePath) {
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).send('Error loading page');
    }
    const processedHtml = addVersionToScripts(data);
    res.setHeader('Content-Type', 'text/html');
    res.send(processedHtml);
  });
}

// Serve static files from the frontend directory
// This MUST come AFTER the env injection middleware
app.use(express.static(path.join(__dirname, 'frontend'), {
  maxAge: NODE_ENV === 'production' ? '1y' : '0', // Cache static assets in production
  etag: true,
  lastModified: true
}));

// Robots.txt
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send(`User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
Feed: ${SITE_URL}/feed.xml
`);
});

// Sitemap cache (in-memory cache with TTL)
let sitemapCache = {
  xml: null,
  timestamp: null,
  ttl: 60 * 60 * 1000 // 1 hour cache
};

/**
 * Fetch all items with pagination support
 */
async function fetchAllItems(endpoint, limit = 100) {
  let allItems = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    try {
      // Handle query string properly
      const separator = endpoint.includes('?') ? '&' : '?';
      const url = `${STRAPI_URL}${STRAPI_API_PATH}${endpoint}${separator}pagination[page]=${page}&pagination[pageSize]=${limit}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        console.error(`HTTP error fetching ${endpoint}: ${response.status} ${response.statusText}`);
        console.error(`URL: ${url}`);
        hasMore = false;
        break;
      }
      
      const data = await response.json();
      
      if (data.data && Array.isArray(data.data)) {
        allItems = allItems.concat(data.data);
        
        // Check if there are more pages
        const pagination = data.meta?.pagination;
        if (pagination && pagination.page < pagination.pageCount) {
          page++;
        } else {
          hasMore = false;
        }
      } else {
        console.warn(`Unexpected response format for ${endpoint}:`, data);
        hasMore = false;
      }
    } catch (error) {
      console.error(`Error fetching ${endpoint}:`, error.message);
      console.error(`URL: ${STRAPI_URL}${STRAPI_API_PATH}${endpoint}`);
      hasMore = false;
    }
  }

  return allItems;
}

/**
 * Generate sitemap XML dynamically from Strapi
 */
async function generateSitemap() {
  try {
    // Fetch all content types in parallel
    const [categories, articles, staticPages, calculators, tags, tagGroups, authors, metals, cities] = await Promise.all([
      fetchAllItems('/categories', 100),
      fetchAllItems('/articles?populate[category]=true&sort=publishedDate:desc', 100),
      fetchAllItems('/static-pages', 100),
      fetchAllItems('/calculators?filters[enableCalculator][$ne]=false', 100),
      fetchAllItems('/tags', 100),
      fetchAllItems('/tag-groups', 100),
      fetchAllItems('/authors', 100),
      fetchAllItems('/metals', 50),
      fetchAllItems('/cities', 500)
    ]);

    // Log counts for debugging
    console.log(`Sitemap generation: ${categories.length} categories, ${articles.length} articles, ${staticPages.length} static pages, ${calculators.length} calculators, ${tags.length} tags, ${tagGroups.length} tag groups, ${authors.length} authors, ${metals.length} metals, ${cities.length} cities`);

    // Build sitemap XML
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Homepage -->
  <url>
    <loc>${SITE_URL}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <!-- Authors listing -->
  <url>
    <loc>${SITE_URL}/author</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <!-- Topics listing -->
  <url>
    <loc>${SITE_URL}/tags</loc>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>
`;

    // Add categories
    for (const cat of categories) {
      if (cat.slug) {
        xml += `  <url>
    <loc>${SITE_URL}/${encodeURIComponent(cat.slug)}</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
`;
      }
    }

    // Add articles
    for (const article of articles) {
      if (article.slug && article.publishedAt) {
        const categorySlug = article.category?.slug || 'article';
        const lastmod = article.updatedAt ? article.updatedAt.split('T')[0] : new Date().toISOString().split('T')[0];
        xml += `  <url>
    <loc>${SITE_URL}/${encodeURIComponent(categorySlug)}/${encodeURIComponent(article.slug)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>
`;
      }
    }

    // Add static pages
    for (const page of staticPages) {
      if (page.slug) {
        const lastmod = page.updatedAt ? page.updatedAt.split('T')[0] : new Date().toISOString().split('T')[0];
        xml += `  <url>
    <loc>${SITE_URL}/${encodeURIComponent(page.slug)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
`;
      }
    }

    // Add calculators
    for (const calc of calculators) {
      if (calc.slug) {
        const lastmod = calc.updatedAt ? calc.updatedAt.split('T')[0] : new Date().toISOString().split('T')[0];
        xml += `  <url>
    <loc>${SITE_URL}/calculators/${encodeURIComponent(calc.slug)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
`;
      }
    }

    // Add tag pages
    for (const tag of tags) {
      if (tag.slug) {
        xml += `  <url>
    <loc>${SITE_URL}/tag/${encodeURIComponent(tag.slug)}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
  </url>
`;
      }
    }

    // Add tag group pages
    for (const group of tagGroups) {
      if (group.slug) {
        xml += `  <url>
    <loc>${SITE_URL}/tag-group/${encodeURIComponent(group.slug)}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
  </url>
`;
      }
    }

    // Add author profile pages
    for (const author of authors) {
      if (author.slug) {
        xml += `  <url>
    <loc>${SITE_URL}/author/${encodeURIComponent(author.slug)}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
`;
      }
    }

    // Add rate pages
    // Gold rates
    xml += `  <url>
    <loc>${SITE_URL}/gold-rates/gold-rate-today</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
`;

    // Silver rates
    xml += `  <url>
    <loc>${SITE_URL}/silver-rates/silver-rate-today</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
`;

    // City-specific rate pages for gold
    for (const city of cities) {
      if (city.slug && city.state) {
        const citySlug = city.slug.toLowerCase().replace(/\s+/g, '-');
        xml += `  <url>
    <loc>${SITE_URL}/gold-rates/gold-rate-today-in-${encodeURIComponent(citySlug)}</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
`;
        xml += `  <url>
    <loc>${SITE_URL}/silver-rates/silver-rate-today-in-${encodeURIComponent(citySlug)}</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
`;
      }
    }

    xml += `</urlset>`;

    return xml;
  } catch (error) {
    console.error('Sitemap generation error:', error);
    throw error;
  }
}

// Sitemap.xml endpoint with caching
app.get('/sitemap.xml', async (req, res) => {
  try {
    // Check cache
    const now = Date.now();
    if (sitemapCache.xml && sitemapCache.timestamp && (now - sitemapCache.timestamp) < sitemapCache.ttl) {
      res.type('application/xml');
      res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
      return res.send(sitemapCache.xml);
    }

    // Generate new sitemap
    const xml = await generateSitemap();
    
    // Update cache
    sitemapCache.xml = xml;
    sitemapCache.timestamp = now;

    res.type('application/xml');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.send(xml);
  } catch (error) {
    console.error('Sitemap generation error:', error);
    res.status(500).send('Error generating sitemap');
  }
});

/**
 * Generate RSS 2.0 Feed from latest articles
 */
async function generateFeed() {
  const articles = await fetchAllItems(
    '/articles?populate[category]=true&populate[author]=true&populate[image]=true&sort=publishedDate:desc',
    50
  );

  const escapeXml = (str = '') =>
    String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

  const items = articles.map(article => {
    const categorySlug = article.category?.slug || 'article';
    const articleSlug  = article.slug || '';
    const link         = `${SITE_URL}/${categorySlug}/${articleSlug}`;
    const pubDate      = article.publishedDate
      ? new Date(article.publishedDate).toUTCString()
      : new Date(article.publishedAt || Date.now()).toUTCString();
    const author       = article.author?.name || 'FiscalColumn';
    const category     = article.category?.name || '';
    const excerpt      = escapeXml(article.excerpt || '');
    const imageUrl     = article.image?.url
      ? `${STRAPI_URL}${article.image.url}`
      : '';

    const enclosure = imageUrl
      ? `\n    <enclosure url="${escapeXml(imageUrl)}" type="image/jpeg" length="0"/>`
      : '';

    return `
  <item>
    <title>${escapeXml(article.title)}</title>
    <link>${escapeXml(link)}</link>
    <guid isPermaLink="true">${escapeXml(link)}</guid>
    <pubDate>${pubDate}</pubDate>
    <author>${escapeXml(author)}</author>
    <category>${escapeXml(category)}</category>
    <description>${excerpt}</description>${enclosure}
  </item>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:media="http://search.yahoo.com/mrss/"
  xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>FiscalColumn – Personal Finance &amp; Market Insights</title>
    <link>${SITE_URL}</link>
    <description>In-depth articles on personal finance, gold &amp; silver rates, banking, investing, and market trends in India.</description>
    <language>en-in</language>
    <copyright>Copyright ${new Date().getFullYear()} FiscalColumn</copyright>
    <managingEditor>hello@fiscalcolumn.com (FiscalColumn)</managingEditor>
    <webMaster>hello@fiscalcolumn.com (FiscalColumn)</webMaster>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <ttl>60</ttl>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
    <image>
      <url>${SITE_URL}/favicon-32x32.png</url>
      <title>FiscalColumn</title>
      <link>${SITE_URL}</link>
    </image>
${items}
  </channel>
</rss>`;
}

// RSS Feed cache
let feedCache = { xml: null, timestamp: null, ttl: 60 * 60 * 1000 }; // 1 hour

// RSS Feed endpoint
app.get('/feed.xml', async (req, res) => {
  try {
    const now = Date.now();
    if (feedCache.xml && feedCache.timestamp && (now - feedCache.timestamp) < feedCache.ttl) {
      res.type('application/rss+xml');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.send(feedCache.xml);
    }

    const xml = await generateFeed();
    feedCache.xml = xml;
    feedCache.timestamp = now;

    res.type('application/rss+xml');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(xml);
  } catch (error) {
    console.error('RSS feed generation error:', error);
    res.status(500).send('Error generating RSS feed');
  }
});

// Home page
app.get('/', (req, res) => {
  sendVersionedHtml(res, path.join(__dirname, 'frontend', 'index.html'));
});

// App coming soon page
app.get('/app', (req, res) => {
  sendVersionedHtml(res, path.join(__dirname, 'frontend', 'coming-soon.html'));
});

// Rate pages - /gold-rate, /silver-rate (short canonical URLs)
app.get('/gold-rate', (req, res) => {
  sendVersionedHtml(res, path.join(__dirname, 'frontend', 'rate-page.html'));
});
app.get('/silver-rate', (req, res) => {
  sendVersionedHtml(res, path.join(__dirname, 'frontend', 'rate-page.html'));
});

// Tags listing - /tags
app.get('/tags', (req, res) => {
  sendVersionedHtml(res, path.join(__dirname, 'frontend', 'tags.html'));
});

// Tag group detail - /tag-group/:slug
app.get('/tag-group/:slug', (req, res) => {
  sendVersionedHtml(res, path.join(__dirname, 'frontend', 'tag-group.html'));
});

// Tag detail - /tag/:slug
app.get('/tag/:slug', (req, res) => {
  sendVersionedHtml(res, path.join(__dirname, 'frontend', 'tag.html'));
});

// Authors listing - /author
app.get('/author', (req, res) => {
  sendVersionedHtml(res, path.join(__dirname, 'frontend', 'authors.html'));
});

// Author profile - /author/:slug
app.get('/author/:slug', (req, res) => {
  sendVersionedHtml(res, path.join(__dirname, 'frontend', 'author.html'));
});

// Static pages — add slugs here when you create a new static page in Strapi
const STATIC_PAGE_SLUGS = [
  'about-us',
  'contact-us',
  'privacy-policy',
  'terms-of-use',
  'disclaimer',
  'copyright-notification',
  'newsletter',
  'advertise',
  'editorial-process'
];

STATIC_PAGE_SLUGS.forEach(slug => {
  app.get(`/${slug}`, (req, res) => {
    sendVersionedHtml(res, path.join(__dirname, 'frontend', 'static-page.html'));
  });
});

// Calculator pages - /calculators/:slug
app.get('/calculators/:slug', (req, res) => {
  sendVersionedHtml(res, path.join(__dirname, 'frontend', 'calculator.html'));
});

// Rate pages - /gold-rates/gold-rate-today, /gold-rates/gold-rate-today-in-mumbai, etc.
app.get('/gold-rates/:page', (req, res) => {
  sendVersionedHtml(res, path.join(__dirname, 'frontend', 'rate-page.html'));
});

app.get('/silver-rates/:page', (req, res) => {
  sendVersionedHtml(res, path.join(__dirname, 'frontend', 'rate-page.html'));
});

app.get('/commodities/:page', (req, res) => {
  sendVersionedHtml(res, path.join(__dirname, 'frontend', 'rate-page.html'));
});

// Article pages - /:category/:article-slug
app.get('/:category/:article', (req, res, next) => {
  const { category, article } = req.params;
  
  // Skip if it looks like a file request (has extension)
  if (category.includes('.') || article.includes('.')) {
    return next();
  }
  
  // Skip rate page categories (handled by rate page routes above)
  if (category === 'gold-rates' || category === 'silver-rates' || category === 'commodities') {
    return next();
  }
  
  // Serve article page
  sendVersionedHtml(res, path.join(__dirname, 'frontend', 'article.html'));
});

// Category pages - serve category.html for any slug that looks like a category
// This should be last to avoid catching other routes
app.get('/:slug', (req, res, next) => {
  const slug = req.params.slug;
  
  // Skip if it looks like a file request (has extension)
  if (slug.includes('.')) {
    return next();
  }
  
  // Serve category page for category slugs
  sendVersionedHtml(res, path.join(__dirname, 'frontend', 'category.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: NODE_ENV === 'production' ? 'Internal Server Error' : err.message
  });
});

// 404 handler
app.use((req, res) => {
  sendVersionedHtml(res, path.join(__dirname, 'frontend', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Frontend server running on port ${PORT}`);
});

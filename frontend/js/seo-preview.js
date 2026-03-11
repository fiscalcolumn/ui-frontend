/**
 * SEO Preview Tool
 * Shows how your page will appear on Google, Facebook, and Twitter
 * Usage: Call window.showSEOPreview() in browser console
 */

window.showSEOPreview = function() {
  // Gather all SEO data
  const seoData = {
    title: document.title,
    description: document.querySelector('meta[name="description"]')?.content || 'Not set',
    canonical: document.querySelector('link[rel="canonical"]')?.href || 'Not set',
    ogTitle: document.querySelector('meta[property="og:title"]')?.content || 'Not set',
    ogDescription: document.querySelector('meta[property="og:description"]')?.content || 'Not set',
    ogImage: document.querySelector('meta[property="og:image"]')?.content || 'Not set',
    ogUrl: document.querySelector('meta[property="og:url"]')?.content || 'Not set',
    twitterTitle: document.querySelector('meta[name="twitter:title"]')?.content || 'Not set',
    twitterDescription: document.querySelector('meta[name="twitter:description"]')?.content || 'Not set',
    twitterImage: document.querySelector('meta[name="twitter:image"]')?.content || 'Not set',
    schema: []
  };

  // Gather schema data
  document.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
    try {
      if (script.textContent.trim()) {
        seoData.schema.push(JSON.parse(script.textContent));
      }
    } catch (e) {}
  });

  // Remove existing preview if any
  const existing = document.getElementById('seo-preview-overlay');
  if (existing) existing.remove();

  // Create overlay
  const overlay = document.createElement('div');
  overlay.id = 'seo-preview-overlay';
  overlay.innerHTML = `
    <style>
      #seo-preview-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.9);
        z-index: 99999;
        overflow-y: auto;
        padding: 20px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      .seo-preview-container {
        max-width: 800px;
        margin: 0 auto;
      }
      .seo-preview-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 30px;
      }
      .seo-preview-header h2 {
        color: #fff;
        margin: 0;
        font-size: 24px;
      }
      .seo-preview-close {
        background: #ff4444;
        color: #fff;
        border: none;
        padding: 10px 20px;
        border-radius: 5px;
        cursor: pointer;
        font-size: 14px;
      }
      .seo-preview-section {
        background: #fff;
        border-radius: 10px;
        padding: 20px;
        margin-bottom: 20px;
      }
      .seo-preview-section h3 {
        margin: 0 0 15px 0;
        color: #333;
        font-size: 16px;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .seo-preview-section h3 .icon {
        width: 24px;
        height: 24px;
      }
      
      /* Google Preview */
      .google-preview {
        font-family: Arial, sans-serif;
      }
      .google-preview .title {
        color: #1a0dab;
        font-size: 20px;
        line-height: 1.3;
        margin-bottom: 3px;
        text-decoration: none;
        display: block;
      }
      .google-preview .url {
        color: #006621;
        font-size: 14px;
        margin-bottom: 3px;
      }
      .google-preview .description {
        color: #545454;
        font-size: 14px;
        line-height: 1.5;
      }

      /* Facebook Preview */
      .facebook-preview {
        border: 1px solid #ddd;
        border-radius: 3px;
        overflow: hidden;
        max-width: 500px;
      }
      .facebook-preview .image {
        width: 100%;
        height: 260px;
        background: #f0f0f0;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #999;
        font-size: 14px;
        overflow: hidden;
      }
      .facebook-preview .image img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .facebook-preview .content {
        padding: 12px;
        background: #f2f3f5;
      }
      .facebook-preview .domain {
        color: #606770;
        font-size: 12px;
        text-transform: uppercase;
      }
      .facebook-preview .title {
        color: #1d2129;
        font-size: 16px;
        font-weight: 600;
        margin: 5px 0;
        line-height: 1.3;
      }
      .facebook-preview .description {
        color: #606770;
        font-size: 14px;
        line-height: 1.4;
      }

      /* Twitter Preview */
      .twitter-preview {
        border: 1px solid #e1e8ed;
        border-radius: 14px;
        overflow: hidden;
        max-width: 500px;
      }
      .twitter-preview .image {
        width: 100%;
        height: 250px;
        background: #f0f0f0;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #999;
        font-size: 14px;
        overflow: hidden;
      }
      .twitter-preview .image img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .twitter-preview .content {
        padding: 12px;
      }
      .twitter-preview .title {
        color: #0f1419;
        font-size: 15px;
        font-weight: 700;
        margin-bottom: 4px;
      }
      .twitter-preview .description {
        color: #536471;
        font-size: 15px;
        line-height: 1.4;
      }
      .twitter-preview .domain {
        color: #536471;
        font-size: 15px;
        margin-top: 4px;
      }

      /* Schema Preview */
      .schema-preview {
        background: #1e1e1e;
        color: #d4d4d4;
        padding: 15px;
        border-radius: 5px;
        font-family: 'Courier New', monospace;
        font-size: 12px;
        overflow-x: auto;
        white-space: pre-wrap;
        max-height: 200px;
        overflow-y: auto;
      }
      
      /* Status badges */
      .status-ok { color: #22c55e; }
      .status-warning { color: #f59e0b; }
      .status-error { color: #ef4444; }
      
      .meta-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
      }
      .meta-table th {
        text-align: left;
        padding: 8px;
        background: #f5f5f5;
        border-bottom: 1px solid #ddd;
      }
      .meta-table td {
        padding: 8px;
        border-bottom: 1px solid #eee;
        word-break: break-all;
      }
      .meta-table td:first-child {
        font-weight: 600;
        width: 150px;
        color: #666;
      }
    </style>
    
    <div class="seo-preview-container">
      <div class="seo-preview-header">
        <h2>🔍 SEO Preview Tool</h2>
        <button class="seo-preview-close" onclick="document.getElementById('seo-preview-overlay').remove()">✕ Close</button>
      </div>

      <!-- Google Preview -->
      <div class="seo-preview-section">
        <h3><span style="color:#4285f4">G</span><span style="color:#ea4335">o</span><span style="color:#fbbc05">o</span><span style="color:#4285f4">g</span><span style="color:#34a853">l</span><span style="color:#ea4335">e</span> Search Result Preview</h3>
        <div class="google-preview">
          <a class="title">${seoData.title}</a>
          <div class="url">${window.location.href}</div>
          <div class="description">${seoData.description.substring(0, 160)}${seoData.description.length > 160 ? '...' : ''}</div>
        </div>
      </div>

      <!-- Facebook Preview -->
      <div class="seo-preview-section">
        <h3><span style="color:#1877f2">📘</span> Facebook / LinkedIn Share Preview</h3>
        <div class="facebook-preview">
          <div class="image">
            ${seoData.ogImage && seoData.ogImage !== 'Not set' 
              ? `<img src="${seoData.ogImage}" onerror="this.parentElement.innerHTML='Image not found: ${seoData.ogImage}'">`
              : 'No og:image set'}
          </div>
          <div class="content">
            <div class="domain">${window.location.hostname}</div>
            <div class="title">${seoData.ogTitle}</div>
            <div class="description">${seoData.ogDescription.substring(0, 100)}${seoData.ogDescription.length > 100 ? '...' : ''}</div>
          </div>
        </div>
      </div>

      <!-- Twitter Preview -->
      <div class="seo-preview-section">
        <h3><span style="color:#1da1f2">🐦</span> Twitter / X Share Preview</h3>
        <div class="twitter-preview">
          <div class="image">
            ${seoData.twitterImage && seoData.twitterImage !== 'Not set' 
              ? `<img src="${seoData.twitterImage}" onerror="this.parentElement.innerHTML='Image not found'">`
              : 'No twitter:image set'}
          </div>
          <div class="content">
            <div class="title">${seoData.twitterTitle}</div>
            <div class="description">${seoData.twitterDescription.substring(0, 100)}${seoData.twitterDescription.length > 100 ? '...' : ''}</div>
            <div class="domain">${window.location.hostname}</div>
          </div>
        </div>
      </div>

      <!-- All Meta Tags -->
      <div class="seo-preview-section">
        <h3>📋 All SEO Meta Tags</h3>
        <table class="meta-table">
          <tr><th>Tag</th><th>Value</th><th>Status</th></tr>
          <tr>
            <td>Title</td>
            <td>${seoData.title}</td>
            <td class="${seoData.title.length > 10 ? 'status-ok' : 'status-error'}">${seoData.title.length > 10 ? '✓' : '✗'} ${seoData.title.length} chars</td>
          </tr>
          <tr>
            <td>Description</td>
            <td>${seoData.description.substring(0, 80)}...</td>
            <td class="${seoData.description.length > 50 ? 'status-ok' : 'status-warning'}">${seoData.description.length} chars</td>
          </tr>
          <tr>
            <td>Canonical URL</td>
            <td>${seoData.canonical}</td>
            <td class="${seoData.canonical !== 'Not set' ? 'status-ok' : 'status-error'}">${seoData.canonical !== 'Not set' ? '✓' : '✗'}</td>
          </tr>
          <tr>
            <td>og:title</td>
            <td>${seoData.ogTitle}</td>
            <td class="${seoData.ogTitle !== 'Not set' ? 'status-ok' : 'status-error'}">${seoData.ogTitle !== 'Not set' ? '✓' : '✗'}</td>
          </tr>
          <tr>
            <td>og:description</td>
            <td>${seoData.ogDescription.substring(0, 60)}...</td>
            <td class="${seoData.ogDescription !== 'Not set' ? 'status-ok' : 'status-error'}">${seoData.ogDescription !== 'Not set' ? '✓' : '✗'}</td>
          </tr>
          <tr>
            <td>og:image</td>
            <td>${seoData.ogImage}</td>
            <td class="${seoData.ogImage !== 'Not set' ? 'status-ok' : 'status-warning'}">${seoData.ogImage !== 'Not set' ? '✓' : '⚠'}</td>
          </tr>
          <tr>
            <td>twitter:title</td>
            <td>${seoData.twitterTitle}</td>
            <td class="${seoData.twitterTitle !== 'Not set' ? 'status-ok' : 'status-error'}">${seoData.twitterTitle !== 'Not set' ? '✓' : '✗'}</td>
          </tr>
        </table>
      </div>

      <!-- Schema Markup -->
      <div class="seo-preview-section">
        <h3>📊 JSON-LD Schema Markup (${seoData.schema.length} found)</h3>
        ${seoData.schema.length > 0 
          ? seoData.schema.map(s => `<div class="schema-preview">${JSON.stringify(s, null, 2)}</div>`).join('')
          : '<p style="color:#999">No schema markup found</p>'
        }
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
};


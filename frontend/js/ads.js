/**
 * Ad Management System
 * Handles ad injection and display across the website
 */

// Ad configuration - you can manage this from Strapi or keep it here
const adConfig = {
  // Enable/disable ads
  enabled: true,
  
  // Ad placements
  placements: {
    headerBanner: {
      enabled: false, // Banner ad in header
      size: '728x90', // Leaderboard
      selector: '.ad-header-banner'
    },
    betweenSections: {
      enabled: true, // Ads between content sections
      size: '728x90', // Leaderboard or 300x250 for sidebar
      frequency: 2, // Show ad after every N sections
      selector: '.ad-between-sections'
    },
    sidebar: {
      enabled: true, // Sidebar ads (for blog pages)
      size: '300x250', // Medium Rectangle
      selector: '.ad-sidebar'
    },
    inContent: {
      enabled: true, // In-content ads
      size: '300x250', // Medium Rectangle
      selector: '.ad-in-content'
    },
    footer: {
      enabled: false, // Footer banner
      size: '728x90', // Leaderboard
      selector: '.ad-footer'
    }
  }
};

// Ad code templates - Replace with your actual ad codes
const adTemplates = {
  // Google AdSense example (replace with your actual ad code)
  googleAdSense: (adSlot, adSize) => {
    return `
      <div class="ad-container ad-${adSize}">
        <ins class="adsbygoogle"
             style="display:block"
             data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
             data-ad-slot="${adSlot}"
             data-ad-format="auto"
             data-full-width-responsive="true"></ins>
        <script>
          (adsbygoogle = window.adsbygoogle || []).push({});
        </script>
      </div>
    `;
  },
  
  // Direct ad code (for any ad network)
  direct: (adCode) => {
    return `
      <div class="ad-container">
        ${adCode}
      </div>
    `;
  },
  
  // Placeholder for development
  placeholder: (size) => {
    const [width, height] = size.split('x');
    return `
      <div class="ad-container ad-placeholder" style="width: ${width}px; height: ${height}px; background: #f0f0f0; border: 2px dashed #ccc; display: flex; align-items: center; justify-content: center; margin: 20px auto;">
        <div style="text-align: center; color: #999;">
          <div style="font-size: 14px; font-weight: bold;">Ad Space</div>
          <div style="font-size: 12px;">${size}</div>
        </div>
      </div>
    `;
  }
};

// Inject ad between sections
function injectBetweenSectionAds() {
  if (!adConfig.enabled || !adConfig.placements.betweenSections.enabled) {
    return;
  }

  const sections = document.querySelectorAll('.content-section');
  const frequency = adConfig.placements.betweenSections.frequency || 2;
  const adSize = adConfig.placements.betweenSections.size || '728x90';

  sections.forEach((section, index) => {
    // Insert ad after every N sections (starting from section 2)
    if ((index + 1) % frequency === 0 && index > 0) {
      const adHTML = `
        <div class="ad-between-sections-wrapper">
          <div class="container">
            <div class="ad-between-sections">
              ${adTemplates.placeholder(adSize)}
              <!-- Replace above with: ${adTemplates.googleAdSense('1234567890', adSize)} -->
            </div>
          </div>
        </div>
      `;
      
      // Insert ad after current section
      section.insertAdjacentHTML('afterend', adHTML);
    }
  });
}

// Inject header banner ad
function injectHeaderBannerAd() {
  if (!adConfig.enabled || !adConfig.placements.headerBanner.enabled) {
    return;
  }

  const header = document.querySelector('.header');
  if (header) {
    const adHTML = `
      <div class="ad-header-banner-wrapper">
        <div class="container">
          <div class="ad-header-banner">
            ${adTemplates.placeholder(adConfig.placements.headerBanner.size)}
            <!-- Replace above with your ad code -->
          </div>
        </div>
      </div>
    `;
    header.insertAdjacentHTML('afterend', adHTML);
  }
}

// Inject sidebar ads (for blog pages)
function injectSidebarAds() {
  if (!adConfig.enabled || !adConfig.placements.sidebar.enabled) {
    return;
  }

  const sidebarSelectors = ['.sidebar', '.blog_sidebar'];
  sidebarSelectors.forEach(selector => {
    const sidebar = document.querySelector(selector);
    if (sidebar) {
      const adHTML = `
        <div class="ad-sidebar">
          ${adTemplates.placeholder(adConfig.placements.sidebar.size)}
          <!-- Replace above with your ad code -->
        </div>
      `;
      sidebar.insertAdjacentHTML('afterbegin', adHTML);
    }
  });
}

// Inject in-content ads (within article content)
function injectInContentAds() {
  if (!adConfig.enabled || !adConfig.placements.inContent.enabled) {
    return;
  }

  // Find article content areas
  const contentSelectors = ['.news_post_text', '.blog_post_text', '.article_content'];
  contentSelectors.forEach(selector => {
    const contentBlocks = document.querySelectorAll(selector);
    contentBlocks.forEach((block, index) => {
      // Insert ad after first paragraph in every 3rd content block
      if (index % 3 === 0 && block.querySelector('p')) {
        const firstP = block.querySelector('p');
        const adHTML = `
          <div class="ad-in-content">
            ${adTemplates.placeholder(adConfig.placements.inContent.size)}
            <!-- Replace above with your ad code -->
          </div>
        `;
        firstP.insertAdjacentHTML('afterend', adHTML);
      }
    });
  });
}

// Inject footer ad
function injectFooterAd() {
  if (!adConfig.enabled || !adConfig.placements.footer.enabled) {
    return;
  }

  const footer = document.querySelector('.footer');
  if (footer) {
    const adHTML = `
      <div class="ad-footer-wrapper">
        <div class="container">
          <div class="ad-footer">
            ${adTemplates.placeholder(adConfig.placements.footer.size)}
            <!-- Replace above with your ad code -->
          </div>
        </div>
      </div>
    `;
    footer.insertAdjacentHTML('beforebegin', adHTML);
  }
}

// Initialize all ads
function initAds() {
  if (!adConfig.enabled) {
    return;
  }

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      injectHeaderBannerAd();
      injectBetweenSectionAds();
      injectSidebarAds();
      injectInContentAds();
      injectFooterAd();
    });
  } else {
    injectHeaderBannerAd();
    injectBetweenSectionAds();
    injectSidebarAds();
    injectInContentAds();
    injectFooterAd();
  }
}

// Initialize ads
initAds();

// Export functions for manual ad injection if needed
window.adManager = {
  injectBetweenSectionAds,
  injectHeaderBannerAd,
  injectSidebarAds,
  injectInContentAds,
  injectFooterAd,
  adTemplates,
  adConfig
};


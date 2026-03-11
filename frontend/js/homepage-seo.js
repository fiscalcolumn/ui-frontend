/**
 * Homepage SEO - Sets default metatags from static site data
 */

(function() {
  try {
    const seoData = window.SITE_DATA?.seo;
    if (!seoData) return;

    const siteUrl = seoData.siteUrl || window.location.origin;
    
    // Update OG image from static data
    if (seoData.defaultImage) {
      const ogImageUrl = seoData.defaultImage.startsWith('http') 
        ? seoData.defaultImage 
        : `${siteUrl}${seoData.defaultImage}`;
      
      // Update OG image
      let ogImage = document.querySelector('meta[property="og:image"]');
      if (!ogImage) {
        ogImage = document.createElement('meta');
        ogImage.setAttribute('property', 'og:image');
        document.head.appendChild(ogImage);
      }
      ogImage.setAttribute('content', ogImageUrl);
      
      // Update Twitter image
      let twitterImage = document.querySelector('meta[name="twitter:image"]');
      if (!twitterImage) {
        twitterImage = document.createElement('meta');
        twitterImage.setAttribute('name', 'twitter:image');
        document.head.appendChild(twitterImage);
      }
      twitterImage.setAttribute('content', ogImageUrl);
    }

    // Update site name
    if (seoData.siteName) {
      let ogSiteName = document.querySelector('meta[property="og:site_name"]');
      if (!ogSiteName) {
        ogSiteName = document.createElement('meta');
        ogSiteName.setAttribute('property', 'og:site_name');
        document.head.appendChild(ogSiteName);
      }
      ogSiteName.setAttribute('content', seoData.siteName);
    }

    // Update default title if not already set
    if (seoData.defaultTitle && !document.title) {
      document.title = seoData.defaultTitle;
    }

    // Update default description if not already set
    if (seoData.defaultDescription) {
      let metaDescription = document.querySelector('meta[name="description"]');
      if (!metaDescription) {
        metaDescription = document.createElement('meta');
        metaDescription.setAttribute('name', 'description');
        document.head.appendChild(metaDescription);
      }
      if (!metaDescription.getAttribute('content')) {
        metaDescription.setAttribute('content', seoData.defaultDescription);
      }
    }

    // Update Twitter card
    if (seoData.twitterHandle) {
      let twitterCard = document.querySelector('meta[name="twitter:card"]');
      if (!twitterCard) {
        twitterCard = document.createElement('meta');
        twitterCard.setAttribute('name', 'twitter:card');
        document.head.appendChild(twitterCard);
      }
      twitterCard.setAttribute('content', 'summary_large_image');

      let twitterSite = document.querySelector('meta[name="twitter:site"]');
      if (!twitterSite) {
        twitterSite = document.createElement('meta');
        twitterSite.setAttribute('name', 'twitter:site');
        document.head.appendChild(twitterSite);
      }
      twitterSite.setAttribute('content', seoData.twitterHandle);
    }
  } catch (error) {
    console.error('Could not set SEO metatags:', error);
  }
})();


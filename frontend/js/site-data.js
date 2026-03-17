/**
 * Site Data - Static configuration for header, footer, and metatags
 */

const SITE_DATA = {
  // Header Configuration
  header: {
    logoText: "FiscalColumn",
    logo: null,
    // Note: Categories are fetched from API as they change frequently
  },

  // Footer Configuration
  footer: {
    leftLinks: [
      { label: "About Us",          url: "/about-us" },
      { label: "Newsletter",        url: "/newsletter" },
      { label: "Advertise",         url: "/advertise" },
      { label: "Editorial Process", url: "/editorial-process" }
    ],
    rightLinks: [
      { label: "Privacy Policy", url: "/privacy-policy" },
      { label: "Terms of Use",   url: "/terms-of-use" },
      { label: "Disclaimer",     url: "/disclaimer" },
      { label: "Contact Us",     url: "/contact-us" }
    ],
    copyrightText: `© ${new Date().getFullYear()} FiscalColumn. All rights reserved.`,
    appDownloads: [
      { platform: "google-play", url: "https://play.google.com" },
      { platform: "app-store",   url: "https://apps.apple.com" }
    ]
  },

  // SEO Metatags Configuration
  seo: {
    siteName: "FiscalColumn",
    defaultTitle: "FiscalColumn - Gold & Silver Rates, Market News & Financial Calculators",
    defaultDescription: "Get live gold and silver rates in India, latest market news, investment tips, and financial calculators. Your trusted source for commodity prices and financial insights.",
    defaultImage: "/images/og-image.png",
    twitterHandle: "@fiscalcolumn",
    siteUrl: "https://fiscalcolumn.com"
  }
};

if (typeof window !== 'undefined') {
  window.SITE_DATA = SITE_DATA;
}

/**
 * Site Data - Static configuration for header, footer, and metatags
 */

const SITE_DATA = {
  // Header Configuration
  header: {
    logoText: "FiscalColumn",
    logo: {
      url: "/images/logo.png",
      alternativeText: "FiscalColumn Logo"
    },
    // Note: Categories are fetched from API as they change frequently
  },

  // Footer Configuration
  footer: {
    logoText: "FiscalColumn",
    logo: {
      url: "/images/logo.png",
      alternativeText: "FiscalColumn Logo"
    },
    description: "Your trusted source for gold & silver rates, financial news, investment insights, and calculators. Stay informed with the latest updates from the business and economy world.",
    socialLinks: [
      {
        platform: "facebook",
        url: "https://facebook.com/fiscalcolumn"
      },
      {
        platform: "twitter",
        url: "https://twitter.com/fiscalcolumn"
      },
      {
        platform: "linkedin",
        url: "https://linkedin.com/company/fiscalcolumn"
      },
      {
        platform: "instagram",
        url: "https://instagram.com/fiscalcolumn"
      }
    ],
    contactInfo: {
      email: "contact@fiscalcolumn.com",
      phone: "",
      address: ""
    },
    quickLinksTitle: "Quick Links",
    quickLinksColumn1: [
      {
        label: "About Us",
        url: "/about-us"
      },
      {
        label: "Contact Us",
        url: "/contact-us"
      },
      {
        label: "Privacy Policy",
        url: "/privacy-policy"
      },
      {
        label: "Terms of Use",
        url: "/terms-of-use"
      }
    ],
    quickLinksColumn2: [
      {
        label: "Disclaimer",
        url: "/disclaimer"
      },
      {
        label: "Copyright",
        url: "/copyright-notification"
      },
      {
        label: "Gold Rate Today",
        url: "/gold-rates/gold-rate-today"
      },
      {
        label: "Silver Rate Today",
        url: "/silver-rates/silver-rate-today"
      }
    ],
    mobileTitle: "Download Our App",
    appDownloads: [],
    copyrightText: `© ${new Date().getFullYear()} FiscalColumn. All rights reserved.`,
    bottomLinks: [
      {
        label: "Privacy Policy",
        url: "/privacy-policy"
      },
      {
        label: "Terms of Use",
        url: "/terms-of-use"
      },
      {
        label: "Disclaimer",
        url: "/disclaimer"
      }
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

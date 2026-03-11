/**
 * Footer Component
 * Uses static site data for footer configuration
 */

function getFooterData() {
  return window.SITE_DATA?.footer || {
    logoText: "FiscalColumn",
    logo: null,
    description: "",
    socialLinks: [],
    contactInfo: null,
    quickLinksTitle: "Quick Links",
    quickLinksColumn1: [],
    quickLinksColumn2: [],
    mobileTitle: "Download Our App",
    appDownloads: [],
    copyrightText: "©2026 FiscalColumn.com All rights reserved.",
    bottomLinks: []
  };
}


// Render social links
function renderSocialLinks(socialLinks) {
  if (!socialLinks || socialLinks.length === 0) {
    return '';
  }

  const iconMap = {
    'facebook': 'fa-facebook',
    'twitter': 'fa-twitter',
    'instagram': 'fa-instagram',
    'linkedin': 'fa-linkedin',
    'youtube': 'fa-youtube',
    'tiktok': 'fa-tiktok',
    'google': 'fa-google-plus'
  };

  return socialLinks.map(link => {
    const iconClass = iconMap[link.platform] || 'fa-link';
    return `<li><a href="${link.url || '#'}" target="_blank" rel="noopener noreferrer"><i class="fa ${iconClass}" aria-hidden="true"></i></a></li>`;
  }).join('');
}

// Render footer links
function renderFooterLinks(links) {
  if (!links || links.length === 0) {
    return '';
  }

  return links.map(link => {
    let url = link.url || '#';
    
    if (url !== '#' && !url.startsWith('http') && !url.startsWith('/')) {
      url = '/' + url;
    }
    
    return `<li><a href="${url}">${link.label || ''}</a></li>`;
  }).join('');
}

// Render app download buttons
function renderAppDownloads(appDownloads) {
  if (!appDownloads || appDownloads.length === 0) {
    console.warn('No app downloads provided');
    return '';
  }

  return appDownloads.map((app) => {
    let imageUrl = '';
    let imageAlt = app.platform || 'App Download';
    
    // Get image URL from static data
    if (app.badgeImage) {
      if (app.badgeImage.url) {
        imageUrl = app.badgeImage.url;
      } else if (typeof app.badgeImage === 'string') {
        imageUrl = app.badgeImage;
      }
    }
    
    // Render image tag if URL exists
    if (imageUrl) {
      return `<div class="footer_image"><a href="${app.url || '#'}" target="_blank" rel="noopener noreferrer"><img src="${imageUrl}" alt="${imageAlt}" style="max-width: 150px; height: auto; display: block;"></a></div>`;
    } else {
      console.warn('No image URL resolved for app:', app.platform);
      return '';
    }
  }).join('');
}

// Render contact info
function renderContactInfo(contactInfo) {
  if (!contactInfo) {
    return '';
  }

  let html = '<ul>';
  if (contactInfo.email) {
    html += `<li>Email: ${contactInfo.email}</li>`;
  }
  if (contactInfo.phone) {
    html += `<li>Phone: ${contactInfo.phone}</li>`;
  }
  if (contactInfo.address) {
    html += `<li>${contactInfo.address}</li>`;
  }
  html += '</ul>';
  return html;
}

// Render footer logo
function renderFooterLogo(logoText, logoImage) {
  if (logoImage && logoImage.url) {
    const imageUrl = logoImage.url.startsWith('http') ? logoImage.url : logoImage.url;
    return `<a href="/"><img src="${imageUrl}" alt="${logoImage.alternativeText || logoText || 'Logo'}" style="max-height: 50px;"></a>`;
  }
  
  if (logoText) {
    return `<a href="/"><div class="footer_logo_text">${logoText}</div></a>`;
  }
  
  return '<a href="/"><div class="footer_logo_text">FiscalColumn</div></a>';
}

// Render footer component
async function renderFooter() {
  const footerContainer = document.querySelector('.footer');
  if (!footerContainer) {
    console.error('Footer container (.footer) not found in DOM');
    return;
  }

  footerContainer.style.opacity = '0';
  footerContainer.style.visibility = 'hidden';
  
  const footerData = getFooterData();
  
  if (!footerData) {
    console.warn('Footer data not available, using fallback');
    // Show footer even if data is not available
    footerContainer.style.opacity = '1';
    footerContainer.style.visibility = 'visible';
    return;
  }

  const footerAbout = footerContainer.querySelector('.footer_about');
  const logoContainer = footerAbout ? footerAbout.querySelector('.footer_logo_container') : null;
  const aboutText = footerAbout ? footerAbout.querySelector('.footer_about_text') : null;

  if (footerAbout) {
    if (logoContainer) {
      logoContainer.innerHTML = renderFooterLogo(footerData.logoText, footerData.logo);
    }

    if (aboutText && footerData.description) {
      aboutText.innerHTML = `<p>${footerData.description}</p>`;
    }

    const socialContainer = footerAbout.querySelector('.footer_social ul');
    if (socialContainer && footerData.socialLinks) {
      socialContainer.innerHTML = renderSocialLinks(footerData.socialLinks);
    }
  }

  const footerContact = footerContainer.querySelector('.footer_contact');
  if (footerContact && footerData.contactInfo) {
    const contactInfoContainer = footerContact.querySelector('.footer_contact_info');
    if (contactInfoContainer) {
      contactInfoContainer.innerHTML = renderContactInfo(footerData.contactInfo);
    }
  }

  const footerLinks = footerContainer.querySelector('.footer_links');
  if (footerLinks) {
    const linksTitle = footerLinks.querySelector('.footer_title');
    if (linksTitle && footerData.quickLinksTitle) {
      linksTitle.textContent = footerData.quickLinksTitle;
    }

    const linksContainer = footerLinks.querySelector('.footer_links_container ul');
    if (linksContainer) {
          const allLinks = [
        ...(footerData.quickLinksColumn1 || []),
        ...(footerData.quickLinksColumn2 || [])
      ];
      linksContainer.innerHTML = renderFooterLinks(allLinks);
    }
  }

  const footerMobile = footerContainer.querySelector('.footer_mobile');
  if (footerMobile) {
    const mobileTitle = footerMobile.querySelector('.footer_title');
    if (mobileTitle && footerData.mobileTitle) {
      mobileTitle.textContent = footerData.mobileTitle;
    }

    const mobileContent = footerMobile.querySelector('.footer_mobile_content');
    if (mobileContent) {
      if (footerData.appDownloads && footerData.appDownloads.length > 0) {
        const renderedContent = renderAppDownloads(footerData.appDownloads);
        mobileContent.innerHTML = renderedContent;
      } else {
        console.warn('No app downloads data found in footer');
        mobileContent.innerHTML = '';
      }
    } else {
      console.error('Mobile content container not found');
    }
  } else {
    console.error('Footer Mobile section not found in DOM');
  }

  const copyrightRow = footerContainer.querySelector('.copyright_row');
  if (copyrightRow && footerData.bottomLinks) {
    const crLinks = copyrightRow.querySelector('.cr_list');
    if (crLinks) {
      crLinks.innerHTML = renderFooterLinks(footerData.bottomLinks);
    }
  }

  if (footerData.copyrightText) {
    const crText = footerContainer.querySelector('.cr_text');
    if (crText) {
      crText.innerHTML = footerData.copyrightText;
    }
  }

  footerContainer.style.opacity = '1';
  footerContainer.style.visibility = 'visible';
  footerContainer.style.transition = 'opacity 0.2s ease-in-out';
}

function initFooter() {
  renderFooter();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initFooter);
} else {
  initFooter();
}


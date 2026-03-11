/**
 * Shared Utility Functions
 * Common functions used across multiple pages
 */

const Utils = {
  /**
   * Format date - short format (May 5, 2018)
   */
  formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  },

  /**
   * Format date - long format (May 5, 2018)
   */
  formatDateLong(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  },

  /**
   * Format views count (e.g., 1500 -> 1.5K, 1500000 -> 1.5M)
   */
  formatViews(views) {
    if (!views || views === 0) return '0';
    if (views >= 1000000) {
      return (views / 1000000).toFixed(1) + 'M';
    } else if (views >= 1000) {
      return (views / 1000).toFixed(1) + 'K';
    }
    return views.toString();
  },

  /**
   * Truncate text and strip HTML tags
   */
  truncateText(text, maxLength) {
    if (!text) return '';
    const stripped = text.replace(/<[^>]*>/g, '');
    if (stripped.length <= maxLength) return stripped;
    return stripped.substring(0, maxLength).trim() + '...';
  },

  /**
   * Format number with Indian numbering system
   */
  formatNumber(num) {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  },

  /**
   * Calculate reading time from content
   * Returns number of minutes
   */
  calculateReadingTime(content) {
    if (!content) return 3;
    const text = content.replace(/<[^>]*>/g, '');
    const words = text.split(/\s+/).length;
    const minutes = Math.ceil(words / 200); // Average reading speed: 200 words per minute
    return Math.max(1, minutes);
  },

  /**
   * Calculate reading time and return formatted string
   */
  calculateReadingTimeString(content) {
    const minutes = this.calculateReadingTime(content);
    return `${minutes} min read`;
  },

  /**
   * Get read time from article or calculate it
   */
  getReadTime(article) {
    return article.minutesToread || this.calculateReadingTime(article.content) || 3;
  }
};

// Make Utils available globally
window.Utils = Utils;

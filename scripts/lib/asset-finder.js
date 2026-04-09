// scripts/lib/asset-finder.js
// Collect and categorize all asset URLs from multiple extraction sources.

/**
 * Union all asset URL sources, deduplicate, and filter invalid entries.
 * @param {{ elementorBackgrounds, cssUrls, computedBackgrounds, htmlSrcs, mediaUrls }} sources
 */
export function collectAssetUrls({ elementorBackgrounds, cssUrls, computedBackgrounds, htmlSrcs, mediaUrls }) {
  const all = [...elementorBackgrounds, ...cssUrls, ...computedBackgrounds, ...htmlSrcs, ...mediaUrls];
  return [...new Set(all.filter((u) => u && typeof u === 'string' && !u.startsWith('data:')))];
}

/**
 * Categorize an asset URL as 'favicon' | 'font' | 'logo' | 'image'
 */
export function categorizeAsset(url) {
  const lower = url.toLowerCase();
  if (/favicon\.ico|apple-touch-icon|favicon-\d+|\.ico$/.test(lower)) return 'favicon';
  if (/\.(woff2?|ttf|otf|eot)($|\?)/.test(lower)) return 'font';
  if (/\/logo[^/]*\.(png|svg|jpg|webp)/.test(lower)) return 'logo';
  return 'image';
}

/**
 * Resolve a URL (possibly relative) against a base URL.
 */
export function resolveUrl(url, base) {
  if (/^https?:\/\//.test(url)) return url;
  return new URL(url, base).href;
}

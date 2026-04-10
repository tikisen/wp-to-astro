// scripts/lib/qa-manifest.js

/**
 * Convert a URL pathname to the screenshot filename slug used by screenshot.js.
 * Matches the exact logic in scripts/screenshot.js.
 * e.g. '/' → 'index', '/about/' → 'about_', '/services/web/' → 'services_web_'
 * @param {string} pathname
 * @returns {string}
 */
export function buildSlug(pathname) {
  return pathname.replace(/\//g, '_').replace(/^_/, '') || 'index';
}

/**
 * Build the comparison manifest from a sitemap and Astro base URL.
 * @param {Array<{url: string}>} sitemap
 * @param {string} astroBaseUrl - e.g. 'http://localhost:4321'
 * @returns {Array<{slug: string, wpUrl: string, astroUrl: string, original: string, generated: string}>}
 */
export function buildManifest(sitemap, astroBaseUrl) {
  const base = astroBaseUrl.replace(/\/$/, '');
  return sitemap.map(({ url }) => {
    const { pathname } = new URL(url);
    const slug = buildSlug(pathname);
    return {
      slug,
      wpUrl: url,
      astroUrl: `${base}${pathname}`,
      original: `extraction/screenshots/${slug}.png`,
      generated: `qa/screenshots/${slug}.png`,
    };
  });
}

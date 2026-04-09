// scripts/lib/parse-css.js
// Pure CSS/HTML parsing utilities. No file I/O.

/**
 * Extract all CSS custom properties declared in :root.
 * Returns { '--var-name': 'value' }
 */
export function extractCustomProperties(cssText) {
  const props = {};
  const rootMatch = cssText.match(/:root\s*\{([^}]+)\}/s);
  if (!rootMatch) return props;
  for (const line of rootMatch[1].split(';')) {
    const m = line.match(/\s*(--[\w-]+)\s*:\s*(.+)/);
    if (m) props[m[1].trim()] = m[2].trim();
  }
  return props;
}

/**
 * Extract all url(...) values from CSS, stripping quotes.
 * Returns string[]
 */
export function extractUrls(cssText) {
  const urls = new Set();
  for (const match of cssText.matchAll(/url\(\s*['"]?([^'"\)]+?)['"]?\s*\)/g)) {
    const url = match[1].trim();
    if (url && !url.startsWith('data:')) urls.add(url);
  }
  return [...urls];
}

/**
 * Extract @font-face blocks. Returns [{ family, weight, src }]
 */
export function extractFontFaces(cssText) {
  const faces = [];
  for (const block of cssText.matchAll(/@font-face\s*\{([^}]+)\}/gs)) {
    const body = block[1];
    const familyMatch = body.match(/font-family\s*:\s*['"]?([^'";]+)['"]?/);
    const weightMatch = body.match(/font-weight\s*:\s*([^;]+)/);
    const srcMatch = body.match(/src\s*:\s*([^;]+)/);
    if (familyMatch && srcMatch) {
      faces.push({
        family: familyMatch[1].trim(),
        weight: weightMatch?.[1]?.trim() ?? '400',
        src: srcMatch[1].trim(),
      });
    }
  }
  return faces;
}

/**
 * Extract Google Fonts stylesheet URLs from HTML <link> tags.
 * Returns string[]
 */
export function extractGoogleFontsUrls(htmlText) {
  const urls = [];
  for (const m of htmlText.matchAll(/<link[^>]+href=["']([^"']*fonts\.googleapis\.com[^"']*)["'][^>]*>/gi)) {
    urls.push(m[1]);
  }
  return urls;
}

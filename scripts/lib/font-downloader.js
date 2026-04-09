// scripts/lib/font-downloader.js
// Download Google Fonts and self-hosted fonts to a local directory.

import { createWriteStream, mkdirSync } from 'fs';
import { join, basename } from 'path';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

/**
 * Fetch a Google Fonts CSS URL and extract all .woff2 download URLs.
 * @param {string} googleFontsCssUrl
 */
export async function resolveGoogleFontUrls(googleFontsCssUrl) {
  const res = await fetch(googleFontsCssUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0' }, // needed to get woff2 format
  });
  if (!res.ok) throw new Error(`Failed to fetch Google Fonts CSS: ${res.status}`);
  const css = await res.text();
  const urls = [];
  for (const m of css.matchAll(/url\(([^)]+)\)/g)) {
    const url = m[1].replace(/['"]/g, '').trim();
    if (url.includes('.woff2')) urls.push(url);
  }
  return urls;
}

/**
 * Download a single file to destDir. Returns local path.
 */
export async function downloadFile(url, destDir) {
  mkdirSync(destDir, { recursive: true });
  const filename = basename(new URL(url).pathname);
  const destPath = join(destDir, filename);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download ${url}: ${res.status}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(destPath));
  return destPath;
}

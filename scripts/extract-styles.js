#!/usr/bin/env node
// scripts/extract-styles.js
// Downloads all stylesheets, extracts design tokens, downloads fonts (Google + self-hosted).
// Writes extraction/styles/, extraction/fonts/, extraction/font-declarations.css

import { mkdirSync, writeFileSync, readFileSync } from 'fs';
import { basename } from 'path';
import { extractCustomProperties, extractUrls, extractFontFaces, extractGoogleFontsUrls } from './lib/parse-css.js';
import { resolveGoogleFontUrls, downloadFile } from './lib/font-downloader.js';

const siteUrl = process.env.WP_SITE_URL;
if (!siteUrl) { console.error('Missing WP_SITE_URL'); process.exit(1); }

mkdirSync('extraction/styles', { recursive: true });
mkdirSync('extraction/fonts', { recursive: true });

const homeRes = await fetch(siteUrl);
const homeHtml = await homeRes.text();

const stylesheetUrls = [];
for (const m of homeHtml.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["']/gi)) {
  stylesheetUrls.push(new URL(m[1], siteUrl).href);
}
for (const m of homeHtml.matchAll(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']stylesheet["']/gi)) {
  stylesheetUrls.push(new URL(m[1], siteUrl).href);
}
const uniqueStylesheets = [...new Set(stylesheetUrls)];
console.log(`Found ${uniqueStylesheets.length} stylesheets`);

let allCss = '';
for (const url of uniqueStylesheets) {
  try {
    const res = await fetch(url);
    if (!res.ok) continue;
    const css = await res.text();
    const filename = `extraction/styles/${basename(new URL(url).pathname) || 'style.css'}`;
    writeFileSync(filename, css);
    allCss += '\n' + css;
    console.log(`  ✓ ${url}`);
  } catch (err) {
    console.warn(`  ✗ ${url}: ${err.message}`);
  }
}

const customProperties = extractCustomProperties(allCss);
const fontFaces = extractFontFaces(allCss);

const googleFontsUrls = extractGoogleFontsUrls(homeHtml);
const woff2Urls = [];
for (const gfUrl of googleFontsUrls) {
  const resolved = await resolveGoogleFontUrls(gfUrl);
  woff2Urls.push(...resolved);
}

const selfHostedFontUrls = [];
for (const face of fontFaces) {
  const urls = extractUrls(face.src);
  selfHostedFontUrls.push(...urls.map((u) => ({ url: new URL(u, siteUrl).href, family: face.family, weight: face.weight })));
}

const localFontFaces = [];
for (const url of [...new Set(woff2Urls)]) {
  try {
    const localPath = await downloadFile(url, 'extraction/fonts');
    const filename = basename(localPath);
    const family = url.match(/family=([^:&]+)/)?.[1]?.replace(/\+/g, ' ') ?? 'Unknown';
    localFontFaces.push(`@font-face {\n  font-family: '${family}';\n  src: url('/fonts/${filename}') format('woff2');\n  font-display: swap;\n}`);
    console.log(`  ✓ font: ${filename}`);
  } catch (err) {
    console.warn(`  ✗ font ${url}: ${err.message}`);
  }
}
for (const { url, family, weight } of selfHostedFontUrls) {
  try {
    const localPath = await downloadFile(url, 'extraction/fonts');
    const filename = basename(localPath);
    localFontFaces.push(`@font-face {\n  font-family: '${family}';\n  font-weight: ${weight};\n  src: url('/fonts/${filename}') format('woff2');\n  font-display: swap;\n}`);
    console.log(`  ✓ font: ${filename}`);
  } catch (err) {
    console.warn(`  ✗ font ${url}: ${err.message}`);
  }
}

writeFileSync('extraction/font-declarations.css', localFontFaces.join('\n\n'));
writeFileSync('extraction/design-tokens.json', JSON.stringify({
  customProperties,
  fontFamilies: [...new Set([...fontFaces.map(f => f.family)])],
}, null, 2));

console.log(`Wrote extraction/font-declarations.css (${localFontFaces.length} font faces)`);
console.log(`Wrote extraction/design-tokens.json`);

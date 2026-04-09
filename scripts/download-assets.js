#!/usr/bin/env node
// scripts/download-assets.js
// Downloads all images, backgrounds, logo, and favicon from all extraction sources.
// Reads: extraction/wp-data.json, extraction/styles/, extraction/computed-styles.json, extraction/crawl/
// Writes: extraction/assets/, extraction/logo/, extraction/favicon/, extraction/asset-map.json

import { mkdirSync, writeFileSync, readFileSync, readdirSync } from 'fs';
import { join, basename } from 'path';
import { collectAssetUrls, categorizeAsset, resolveUrl } from './lib/asset-finder.js';
import { extractUrls } from './lib/parse-css.js';
import { extractBackgroundImages } from './lib/parse-elementor.js';
import { downloadFile } from './lib/font-downloader.js';

const siteUrl = process.env.WP_SITE_URL;
if (!siteUrl) { console.error('Missing WP_SITE_URL'); process.exit(1); }

['extraction/assets', 'extraction/logo', 'extraction/favicon'].forEach(d => mkdirSync(d, { recursive: true }));

const wpData = JSON.parse(readFileSync('extraction/wp-data.json', 'utf8'));
const computedStyles = JSON.parse(readFileSync('extraction/computed-styles.json', 'utf8'));

// 1. Elementor background images
const elementorBackgrounds = [];
for (const page of [...wpData.pages, ...wpData.posts]) {
  if (page.meta?._elementor_data) {
    try {
      const data = JSON.parse(page.meta._elementor_data);
      elementorBackgrounds.push(...extractBackgroundImages(data));
    } catch { /* skip */ }
  }
}

// 2. URLs from downloaded CSS files
const cssUrls = [];
for (const file of readdirSync('extraction/styles')) {
  const css = readFileSync(join('extraction/styles', file), 'utf8');
  cssUrls.push(...extractUrls(css).map(u => resolveUrl(u, siteUrl)));
}

// 3. Computed background-image values from Playwright
const computedBackgrounds = [];
for (const pageStyles of Object.values(computedStyles)) {
  for (const styles of Object.values(pageStyles)) {
    const bg = styles['background-image'];
    if (bg && bg !== 'none') {
      for (const m of bg.matchAll(/url\(["']?([^"'\)]+)["']?\)/g)) {
        computedBackgrounds.push(resolveUrl(m[1], siteUrl));
      }
    }
  }
}

// 4. Image src values from crawl markdown
const htmlSrcs = [];
for (const file of readdirSync('extraction/crawl')) {
  const md = readFileSync(join('extraction/crawl', file), 'utf8');
  for (const m of md.matchAll(/!\[.*?\]\(([^)]+)\)/g)) {
    htmlSrcs.push(resolveUrl(m[1], siteUrl));
  }
}

// 5. WP media library URLs
const mediaUrls = wpData.media.map(m => m.source_url).filter(Boolean);

// 6. Logo and favicon
const logoUrl = wpData.siteInfo?.logo?.url ?? wpData.siteInfo?.site_logo_url;
const faviconUrl = `${siteUrl}/favicon.ico`;

const allUrls = collectAssetUrls({ elementorBackgrounds, cssUrls, computedBackgrounds, htmlSrcs, mediaUrls });
if (logoUrl) allUrls.push(logoUrl);
allUrls.push(faviconUrl);

console.log(`Downloading ${allUrls.length} assets...`);

const assetMap = {};
let downloaded = 0, skipped = 0;

for (const url of allUrls) {
  const category = categorizeAsset(url);
  const destDir = category === 'favicon' ? 'extraction/favicon'
    : category === 'logo' ? 'extraction/logo'
    : category === 'font' ? 'extraction/fonts'
    : 'extraction/assets';

  try {
    const localPath = await downloadFile(url, destDir);
    assetMap[url] = localPath;
    downloaded++;
  } catch (err) {
    console.warn(`  ✗ ${url}: ${err.message}`);
    skipped++;
  }
}

writeFileSync('extraction/asset-map.json', JSON.stringify(assetMap, null, 2));
console.log(`Downloaded ${downloaded} assets, skipped ${skipped}`);
console.log('Wrote extraction/asset-map.json');

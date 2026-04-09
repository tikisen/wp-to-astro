#!/usr/bin/env node
// scripts/screenshot.js
// Full-page screenshots + computed styles via Playwright.
// Reads extraction/sitemap.json, writes extraction/screenshots/ and extraction/computed-styles.json.

import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { chromium } from 'playwright';

const sitemap = JSON.parse(readFileSync('extraction/sitemap.json', 'utf8'));
mkdirSync('extraction/screenshots', { recursive: true });

const STYLE_SELECTORS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a', 'button', 'nav', 'footer', '.hero', '.cta'];
const STYLE_PROPS = ['font-family', 'font-size', 'font-weight', 'color', 'background-color', 'padding', 'margin', 'border-radius', 'line-height'];

const browser = await chromium.launch();
const allComputedStyles = {};

console.log(`Taking screenshots of ${sitemap.length} pages...`);

for (const { url } of sitemap) {
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    const urlPath = new URL(url).pathname.replace(/\//g, '_').replace(/^_/, '') || 'index';
    await page.screenshot({ path: `extraction/screenshots/${urlPath}.png`, fullPage: true });

    const styles = {};
    for (const selector of STYLE_SELECTORS) {
      try {
        const el = page.locator(selector).first();
        const count = await el.count();
        if (!count) continue;
        const computed = await el.evaluate((node, props) => {
          const cs = window.getComputedStyle(node);
          return Object.fromEntries(props.map((p) => [p, cs.getPropertyValue(p)]));
        }, STYLE_PROPS);
        styles[selector] = computed;
      } catch { /* element not found */ }
    }
    allComputedStyles[url] = styles;
    console.log(`  ✓ ${url}`);
  } catch (err) {
    console.warn(`  ✗ ${url}: ${err.message}`);
  } finally {
    await page.close();
  }
}

await browser.close();
writeFileSync('extraction/computed-styles.json', JSON.stringify(allComputedStyles, null, 2));
console.log(`Wrote extraction/computed-styles.json`);

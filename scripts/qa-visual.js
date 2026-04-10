#!/usr/bin/env node
// scripts/qa-visual.js
// Screenshots each page of the running Astro dev/preview server and writes
// qa/comparison-manifest.json pairing originals with new shots for Claude to compare.
//
// Usage: ASTRO_URL=http://localhost:4321 node --env-file=.env scripts/qa-visual.js
// The Astro site must already be running before this script is called.

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { chromium } from 'playwright';
import { buildManifest } from './lib/qa-manifest.js';

const ASTRO_URL = process.env.ASTRO_URL || 'http://localhost:4321';

if (!existsSync('extraction/sitemap.json')) {
  console.error('ERROR: extraction/sitemap.json not found — run npm run extract-wp first');
  process.exit(1);
}

const sitemap = JSON.parse(readFileSync('extraction/sitemap.json', 'utf8'));
const manifest = buildManifest(sitemap, ASTRO_URL);

mkdirSync('qa/screenshots', { recursive: true });

const browser = await chromium.launch();
console.log(`Screenshotting ${manifest.length} pages at ${ASTRO_URL}...`);

for (const entry of manifest) {
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  try {
    await page.goto(entry.astroUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.screenshot({ path: entry.generated, fullPage: true });
    entry.status = existsSync(entry.original) ? 'pending' : 'no-original';
    console.log(`  ✓ ${entry.astroUrl} → ${entry.generated}`);
  } catch (err) {
    entry.status = 'error';
    entry.error = err.message;
    console.warn(`  ✗ ${entry.astroUrl}: ${err.message}`);
  } finally {
    await page.close();
  }
}

await browser.close();
writeFileSync('qa/comparison-manifest.json', JSON.stringify(manifest, null, 2));

const pending = manifest.filter(e => e.status === 'pending').length;
const errors = manifest.filter(e => e.status === 'error').length;
const noOriginal = manifest.filter(e => e.status === 'no-original').length;

console.log(`\nWrote qa/comparison-manifest.json`);
console.log(`  ${pending} pages ready for comparison`);
if (noOriginal) console.log(`  ${noOriginal} pages skipped (no original screenshot)`);
if (errors) console.log(`  ${errors} pages errored`);
console.log(`\nNext: Read qa/comparison-manifest.json and compare image pairs.`);

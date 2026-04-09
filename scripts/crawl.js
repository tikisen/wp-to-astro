#!/usr/bin/env node
// scripts/crawl.js
// Full-site crawl via Firecrawl SDK. Writes extraction/crawl/ and extraction/sitemap.json.
// Requires: FIRECRAWL_API_KEY and WP_SITE_URL in env.

import { mkdirSync, writeFileSync } from 'fs';

const siteUrl = process.env.WP_SITE_URL;
const apiKey = process.env.FIRECRAWL_API_KEY;

if (!siteUrl || !apiKey) {
  console.error('Missing WP_SITE_URL or FIRECRAWL_API_KEY');
  process.exit(1);
}

mkdirSync('extraction/crawl', { recursive: true });

console.log(`Crawling ${siteUrl}...`);

const { FirecrawlApp } = await import('@mendable/firecrawl-js');
const app = new FirecrawlApp({ apiKey });

const result = await app.crawlUrl(siteUrl, {
  limit: 200,
  scrapeOptions: { formats: ['markdown', 'html'] },
});

if (!result.success) {
  console.error('Crawl failed:', result.error);
  process.exit(1);
}

const pages = result.data ?? [];
console.log(`  Crawled ${pages.length} pages`);

const sitemap = [];

for (const page of pages) {
  const url = new URL(page.metadata?.sourceURL ?? page.url ?? '');
  const slug = url.pathname.replace(/\//g, '_').replace(/^_/, '') || 'index';
  const filename = `extraction/crawl/${slug}.md`;
  writeFileSync(filename, page.markdown ?? '');
  sitemap.push({ url: page.metadata?.sourceURL ?? page.url, path: filename });
}

writeFileSync('extraction/sitemap.json', JSON.stringify(sitemap, null, 2));
console.log(`Wrote ${pages.length} markdown files + extraction/sitemap.json`);

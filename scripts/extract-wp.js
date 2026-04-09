#!/usr/bin/env node
// scripts/extract-wp.js
// Pulls all content from a WordPress site via the REST API (authenticated).
// Writes extraction/wp-data.json

import { writeFileSync, mkdirSync } from 'fs';
import { createClient, fetchAll } from './lib/wp-api.js';

const siteUrl = process.env.WP_SITE_URL;
const appPassword = process.env.WP_APP_PASSWORD;

if (!siteUrl || !appPassword) {
  console.error('Missing WP_SITE_URL or WP_APP_PASSWORD in environment');
  process.exit(1);
}

mkdirSync('extraction', { recursive: true });
const client = createClient(siteUrl, appPassword);

console.log(`Extracting from ${siteUrl}...`);

// Site identity
const siteInfo = await client.get('/');
console.log(`  Site: ${siteInfo.name}`);

// Content
const [pages, posts, media] = await Promise.all([
  fetchAll(client, '/wp/v2/pages?context=edit'),
  fetchAll(client, '/wp/v2/posts?context=edit'),
  fetchAll(client, '/wp/v2/media'),
]);
console.log(`  Pages: ${pages.length}, Posts: ${posts.length}, Media: ${media.length}`);

// Elementor globals (may 404 if Elementor not installed — catch gracefully)
let elementorColors = [], elementorTypography = [], elementorKit = null;
try {
  elementorColors = await client.get('/elementor/v1/globals/colors');
  elementorTypography = await client.get('/elementor/v1/globals/typography');
  const kits = await fetchAll(client, '/elementor/v1/kits');
  if (kits.length) elementorKit = kits[0];
  console.log(`  Elementor globals: ${Object.keys(elementorColors).length} colors`);
} catch {
  console.log('  Elementor globals API not available — skipping');
}

// FSE Global Styles (block themes)
let globalStyles = null;
try {
  const gsRef = await client.get('/wp/v2/global-styles/themes/' + siteInfo.stylesheet);
  globalStyles = gsRef;
  console.log('  FSE global styles: found');
} catch {
  console.log('  FSE global styles: not available');
}

// Gravity Forms
let gravityForms = [];
try {
  gravityForms = await fetchAll(client, '/gf/v2/forms');
  console.log(`  Gravity Forms: ${gravityForms.length}`);
} catch {
  console.log('  Gravity Forms API not available — skipping');
}

// Menus
let menus = [];
try {
  menus = await client.get('/wp/v2/menus');
} catch {
  console.log('  Menus API not available');
}

const output = {
  siteInfo,
  pages,
  posts,
  media,
  menus,
  elementorColors,
  elementorTypography,
  elementorKit,
  globalStyles,
  gravityForms,
  extractedAt: new Date().toISOString(),
};

writeFileSync('extraction/wp-data.json', JSON.stringify(output, null, 2));
console.log('Wrote extraction/wp-data.json');

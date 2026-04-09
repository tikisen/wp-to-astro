#!/usr/bin/env node
// scripts/component-inventory.js
// Parses all Elementor JSON to build component inventory and spacing scale.
// Reads: extraction/wp-data.json
// Writes: extraction/component-inventory.json, extraction/spacing-scale.json, extraction/seo-opportunities.md

import { readFileSync, writeFileSync } from 'fs';
import { extractWidgetTypes, inferSpacingScale, extractForms } from './lib/parse-elementor.js';

const wpData = JSON.parse(readFileSync('extraction/wp-data.json', 'utf8'));

const widgetFrequency = {};
const allPageData = [];
const allForms = [];
const seoOpportunities = [];

for (const item of [...wpData.pages, ...wpData.posts]) {
  if (!item.meta?._elementor_data) continue;
  let data;
  try { data = JSON.parse(item.meta._elementor_data); } catch { continue; }
  allPageData.push(data);

  const types = extractWidgetTypes(data);
  for (const t of types) widgetFrequency[t] = (widgetFrequency[t] ?? 0) + 1;

  const forms = extractForms(data);
  if (forms.length) allForms.push({ pageId: item.id, pageSlug: item.slug, forms });

  if (types.includes('slides') || types.includes('carousel')) {
    seoOpportunities.push(`- **${item.slug}**: Contains slider/carousel — review for content buried in slides that could be standalone SEO pages`);
  }
}

const sortedWidgets = Object.entries(widgetFrequency)
  .sort((a, b) => b[1] - a[1])
  .map(([type, count]) => ({ type, count }));

const spacingScale = inferSpacingScale(allPageData);

writeFileSync('extraction/component-inventory.json', JSON.stringify({
  widgets: sortedWidgets,
  forms: allForms,
  totalPages: wpData.pages.length,
  totalPosts: wpData.posts.length,
}, null, 2));

writeFileSync('extraction/spacing-scale.json', JSON.stringify(spacingScale, null, 2));

const seoMd = `# SEO Content Architecture Opportunities\n\nGenerated during wp-to-astro migration. Review these before launch.\n\n${seoOpportunities.join('\n') || '- No specific opportunities detected — review screenshots manually'}\n\n## Checklist\n- [ ] Review each page screenshot for content buried in sliders or accordion sections\n- [ ] Consider standalone pages for any major keyword topic currently in-page only\n- [ ] Check for missing /about, /contact, /services standalone pages\n`;

writeFileSync('extraction/seo-opportunities.md', seoMd);

console.log(`Widget types found: ${sortedWidgets.length}`);
console.log(`Top widgets: ${sortedWidgets.slice(0, 5).map(w => `${w.type}(${w.count})`).join(', ')}`);
console.log(`Forms found: ${allForms.length}`);
console.log('Wrote extraction/component-inventory.json, spacing-scale.json, seo-opportunities.md');

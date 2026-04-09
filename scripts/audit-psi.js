#!/usr/bin/env node
// scripts/audit-psi.js
// Fetches all URLs from the live sitemap and audits each with the Google PSI API.
// Exits non-zero if any URL fails Core Web Vitals thresholds.
// Uses Node 22 native fetch — no extra dependencies.

import { writeFileSync, mkdirSync } from 'fs';

const PSI_API_KEY = process.env.PSI_API_KEY;
if (!process.env.PSI_SITE_URL) {
  console.error('Error: PSI_SITE_URL environment variable is required (e.g. https://mysite.pages.dev)');
  process.exit(1);
}
const PSI_SITE_URL = process.env.PSI_SITE_URL.replace(/\/$/, '');

if (!PSI_API_KEY) {
  console.error('Error: PSI_API_KEY environment variable is required');
  process.exit(1);
}

const THRESHOLDS = {
  LCP_MS: 2500,
  CLS: 0.1,
  INP_MS: 200,
};

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.text();
}

function extractLocs(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].trim());
}

async function getSitemapUrls() {
  const indexXml = await fetchText(`${PSI_SITE_URL}/sitemap-index.xml`);
  const sitemapUrls = extractLocs(indexXml);
  const pageUrls = [];
  for (const sitemapUrl of sitemapUrls) {
    // Replace domain in sitemap URL with PSI_SITE_URL domain
    // (sitemap may contain production domain even when testing staging)
    const sitemapPath = new URL(sitemapUrl).pathname;
    const resolvedUrl = `${PSI_SITE_URL}${sitemapPath}`;
    const xml = await fetchText(resolvedUrl);
    const urls = extractLocs(xml).map(u => {
      const path = new URL(u).pathname;
      return `${PSI_SITE_URL}${path}`;
    });
    pageUrls.push(...urls);
  }
  return pageUrls;
}

async function auditUrl(url) {
  const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile&key=${PSI_API_KEY}`;
  const res = await fetch(apiUrl);
  if (!res.ok) {
    const body = (await res.text()).slice(0, 200);
    throw new Error(`PSI API error for ${url}: ${res.status} ${body}`);
  }
  return res.json();
}

function checkThresholds(data) {
  const failures = [];
  const metrics = data.loadingExperience?.metrics;
  const lhr = data.lighthouseResult?.audits;
  const hasFieldData = !!(metrics && Object.keys(metrics).length > 0);

  if (hasFieldData) {
    const lcp = metrics.LARGEST_CONTENTFUL_PAINT_MS?.percentile;
    const cls = metrics.CUMULATIVE_LAYOUT_SHIFT_SCORE?.percentile;
    const inp = metrics.INTERACTION_TO_NEXT_PAINT?.percentile;

    if (lcp !== undefined && lcp > THRESHOLDS.LCP_MS) {
      failures.push(`LCP ${lcp}ms > ${THRESHOLDS.LCP_MS}ms (field data)`);
    }
    if (cls !== undefined && cls > THRESHOLDS.CLS) {
      failures.push(`CLS ${cls} > ${THRESHOLDS.CLS} (field data)`);
    }
    if (inp !== undefined && inp > THRESHOLDS.INP_MS) {
      failures.push(`INP ${inp}ms > ${THRESHOLDS.INP_MS}ms (field data)`);
    }
  } else if (lhr) {
    // Fall back to lab data when CrUX field data is unavailable
    // INP is interaction-based and requires real users — not available in lab data
    const lcp = lhr['largest-contentful-paint']?.numericValue;
    const cls = lhr['cumulative-layout-shift']?.numericValue;

    if (lcp !== undefined && lcp > THRESHOLDS.LCP_MS) {
      failures.push(`LCP ${Math.round(lcp)}ms > ${THRESHOLDS.LCP_MS}ms (lab data)`);
    }
    if (cls !== undefined && cls > THRESHOLDS.CLS) {
      failures.push(`CLS ${cls.toFixed(3)} > ${THRESHOLDS.CLS} (lab data)`);
    }
  }

  return { failures, hasFieldData };
}

async function main() {
  console.log(`\nPSI Audit — ${PSI_SITE_URL}\n`);

  let urls;
  try {
    urls = await getSitemapUrls();
  } catch (err) {
    console.error(`Failed to fetch sitemap: ${err.message}`);
    process.exit(1);
  }

  console.log(`Found ${urls.length} URL(s) in sitemap\n`);

  const results = [];
  let anyFailed = false;

  for (const url of urls) {
    process.stdout.write(`  ${url} ... `);
    try {
      const data = await auditUrl(url);
      const { failures, hasFieldData } = checkThresholds(data);
      results.push({ url, failures, hasFieldData });

      if (failures.length > 0) {
        console.log('FAIL');
        failures.forEach(f => console.log(`    ✗ ${f}`));
        anyFailed = true;
      } else {
        const note = hasFieldData ? '' : ' (lab data only — no CrUX field data yet)';
        console.log(`PASS${note}`);
      }
    } catch (err) {
      console.log(`ERROR: ${err.message}`);
      results.push({ url, error: err.message });
      anyFailed = true;
    }
  }

  mkdirSync('.lighthouseci', { recursive: true });
  const outPath = '.lighthouseci/psi-results.json';
  writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`\nFull results saved to ${outPath}`);

  if (anyFailed) {
    console.log('\n✗ PSI audit failed — see failures above');
    process.exit(1);
  } else {
    console.log('\n✓ PSI audit passed');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

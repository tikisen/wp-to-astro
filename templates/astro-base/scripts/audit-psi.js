#!/usr/bin/env node
/**
 * PageSpeed Insights Audit
 * Usage: node --env-file=.env scripts/audit-psi.js
 *        PSI_SITE_URL=https://example.com node scripts/audit-psi.js
 *
 * Thresholds: performance ≥80, accessibility ≥90, best-practices ≥90, SEO ≥90
 *             LCP <2.5s, CLS <0.1, INP <200ms
 */

import { readFileSync } from 'fs';

const THRESHOLDS = {
  performance: 80,
  accessibility: 90,
  'best-practices': 90,
  seo: 90,
};
const CWV_THRESHOLDS = {
  lcp: 2500,   // ms
  cls: 0.1,
  inp: 200,    // ms
};

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

function pass(label, val) { return `${GREEN}✓${RESET} ${label}: ${BOLD}${val}${RESET}`; }
function fail(label, val, threshold) { return `${RED}✗${RESET} ${label}: ${BOLD}${val}${RESET} ${RED}(need ${threshold})${RESET}`; }

function getSiteUrl() {
  if (process.env.PSI_SITE_URL) return process.env.PSI_SITE_URL;
  try {
    const config = readFileSync('./astro.config.mjs', 'utf8');
    const match = config.match(/site:\s*['"]([^'"]+)['"]/);
    if (match) return match[1];
  } catch {}
  throw new Error('No SITE_URL found. Set PSI_SITE_URL in .env or add site: to astro.config.mjs');
}

async function runPSI(url, strategy) {
  const apiKey = process.env.PSI_API_KEY || '';
  const endpoint = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=${strategy}${apiKey ? `&key=${apiKey}` : ''}`;
  const res = await fetch(endpoint);
  if (!res.ok) throw new Error(`PSI API error ${res.status}: ${await res.text()}`);
  return res.json();
}

function extractMetrics(data) {
  const cats = data.lighthouseResult?.categories ?? {};
  const audits = data.lighthouseResult?.audits ?? {};
  return {
    scores: {
      performance: Math.round((cats.performance?.score ?? 0) * 100),
      accessibility: Math.round((cats.accessibility?.score ?? 0) * 100),
      'best-practices': Math.round((cats['best-practices']?.score ?? 0) * 100),
      seo: Math.round((cats.seo?.score ?? 0) * 100),
    },
    cwv: {
      lcp: audits['largest-contentful-paint']?.numericValue ?? null,
      cls: audits['cumulative-layout-shift']?.numericValue ?? null,
      inp: audits['interaction-to-next-paint']?.numericValue ?? null,
    },
  };
}

function printResults(label, metrics) {
  let failures = 0;
  console.log(`\n${BOLD}── ${label} ──${RESET}`);

  for (const [cat, threshold] of Object.entries(THRESHOLDS)) {
    const val = metrics.scores[cat];
    if (val >= threshold) {
      console.log(`  ${pass(cat, val)}`);
    } else {
      console.log(`  ${fail(cat, val, `≥${threshold}`)}`);
      failures++;
    }
  }

  console.log(`  ${YELLOW}Core Web Vitals:${RESET}`);
  const { lcp, cls, inp } = metrics.cwv;

  if (lcp !== null) {
    const lcpS = (lcp / 1000).toFixed(2) + 's';
    lcp <= CWV_THRESHOLDS.lcp
      ? console.log(`  ${pass('LCP', lcpS)}`)
      : (console.log(`  ${fail('LCP', lcpS, '<2.5s')}`), failures++);
  }
  if (cls !== null) {
    cls <= CWV_THRESHOLDS.cls
      ? console.log(`  ${pass('CLS', cls.toFixed(3))}`)
      : (console.log(`  ${fail('CLS', cls.toFixed(3), '<0.1')}`), failures++);
  }
  if (inp !== null) {
    const inpMs = Math.round(inp) + 'ms';
    inp <= CWV_THRESHOLDS.inp
      ? console.log(`  ${pass('INP', inpMs)}`)
      : (console.log(`  ${fail('INP', inpMs, '<200ms')}`), failures++);
  }

  return failures;
}

async function main() {
  const siteUrl = getSiteUrl();
  console.log(`\n${BOLD}PageSpeed Insights Audit${RESET}`);
  console.log(`Site: ${YELLOW}${siteUrl}${RESET}`);
  console.log('Running mobile + desktop... (this takes ~30s each)');

  let totalFailures = 0;

  for (const strategy of ['mobile', 'desktop']) {
    try {
      const data = await runPSI(siteUrl, strategy);
      const metrics = extractMetrics(data);
      totalFailures += printResults(strategy.charAt(0).toUpperCase() + strategy.slice(1), metrics);
    } catch (err) {
      console.error(`\n${RED}Error running ${strategy}: ${err.message}${RESET}`);
      totalFailures++;
    }
  }

  console.log(`\n${totalFailures === 0
    ? `${GREEN}${BOLD}All checks passed.${RESET}`
    : `${RED}${BOLD}${totalFailures} check(s) failed.${RESET}`
  }\n`);

  process.exit(totalFailures > 0 ? 1 : 0);
}

main().catch(err => { console.error(err); process.exit(1); });

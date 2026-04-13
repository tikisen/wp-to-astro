#!/usr/bin/env bash
# Lighthouse Audit Script
# Usage: bash scripts/audit-lhci.sh [URL]
#        npm run audit:lhci
#
# Thresholds: performance ≥80, accessibility ≥90, best-practices ≥90, SEO ≥90
#             LCP <2.5s, CLS <0.1, INP <200ms

set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

# ── Resolve site URL ──────────────────────────────────────────────────────────
SITE_URL="${1:-${PSI_SITE_URL:-}}"
if [ -z "$SITE_URL" ]; then
  if [ -f "astro.config.mjs" ]; then
    SITE_URL=$(grep -oP "site:\s*['\"]\\K[^'\"]*" astro.config.mjs | head -1)
  fi
fi
if [ -z "$SITE_URL" ]; then
  echo -e "${RED}Error: No site URL found. Set PSI_SITE_URL in .env, pass as argument, or add site: to astro.config.mjs${NC}"
  exit 1
fi

echo -e "\n${BOLD}Lighthouse Audit${NC}"
echo -e "Site: ${YELLOW}${SITE_URL}${NC}"

# ── Check for lighthouse ──────────────────────────────────────────────────────
if ! command -v lighthouse &> /dev/null && ! npx --yes lighthouse --version &> /dev/null 2>&1; then
  echo -e "${RED}Error: lighthouse not found. Run: npm install -g lighthouse${NC}"
  exit 1
fi

LIGHTHOUSE="npx --yes lighthouse"

# ── Thresholds ────────────────────────────────────────────────────────────────
PERF_MIN=80
A11Y_MIN=90
BP_MIN=90
SEO_MIN=90
LCP_MAX=2500  # ms
CLS_MAX=0.1
INP_MAX=200   # ms

FAILURES=0

run_strategy() {
  local STRATEGY="$1"
  local OUTFILE="/tmp/lhci-${STRATEGY}.json"

  echo -e "\nRunning ${STRATEGY}..."
  $LIGHTHOUSE "$SITE_URL" \
    --output=json \
    --output-path="$OUTFILE" \
    --only-categories=performance,accessibility,best-practices,seo \
    --form-factor="$STRATEGY" \
    --chrome-flags="--headless --no-sandbox" \
    --quiet 2>/dev/null || {
    echo -e "${RED}✗ Lighthouse failed for ${STRATEGY}${NC}"
    FAILURES=$((FAILURES + 1))
    return
  }

  echo -e "\n${BOLD}── ${STRATEGY^} ──${NC}"

  check_score() {
    local KEY="$1" MIN="$2" LABEL="$3"
    local VAL
    VAL=$(node -e "const d=require('${OUTFILE}');const s=d.categories['${KEY}']?.score;console.log(s!=null?Math.round(s*100):'N/A')" 2>/dev/null)
    if [ "$VAL" = "N/A" ]; then
      echo -e "  ${YELLOW}? ${LABEL}: N/A${NC}"
      return
    fi
    if [ "$VAL" -ge "$MIN" ]; then
      echo -e "  ${GREEN}✓${NC} ${LABEL}: ${BOLD}${VAL}${NC}"
    else
      echo -e "  ${RED}✗${NC} ${LABEL}: ${BOLD}${VAL}${NC} ${RED}(need ≥${MIN})${NC}"
      FAILURES=$((FAILURES + 1))
    fi
  }

  check_score "performance"    "$PERF_MIN" "Performance"
  check_score "accessibility"  "$A11Y_MIN" "Accessibility"
  check_score "best-practices" "$BP_MIN"   "Best Practices"
  check_score "seo"            "$SEO_MIN"  "SEO"

  echo -e "  ${YELLOW}Core Web Vitals:${NC}"

  node -e "
    const d = require('$(echo $OUTFILE)');
    const audits = d.audits;
    const lcp = audits['largest-contentful-paint']?.numericValue;
    const cls = audits['cumulative-layout-shift']?.numericValue;
    const inp = audits['interaction-to-next-paint']?.numericValue;
    const G = '\x1b[32m', R = '\x1b[31m', B = '\x1b[1m', NC = '\x1b[0m';
    let f = 0;
    if (lcp != null) {
      const v = (lcp/1000).toFixed(2)+'s';
      lcp <= ${LCP_MAX} ? console.log('  '+G+'✓'+NC+' LCP: '+B+v+NC) : (console.log('  '+R+'✗'+NC+' LCP: '+B+v+NC+' '+R+'(need <2.5s)'+NC), f++);
    }
    if (cls != null) {
      const v = cls.toFixed(3);
      cls <= ${CLS_MAX} ? console.log('  '+G+'✓'+NC+' CLS: '+B+v+NC) : (console.log('  '+R+'✗'+NC+' CLS: '+B+v+NC+' '+R+'(need <0.1)'+NC), f++);
    }
    if (inp != null) {
      const v = Math.round(inp)+'ms';
      inp <= ${INP_MAX} ? console.log('  '+G+'✓'+NC+' INP: '+B+v+NC) : (console.log('  '+R+'✗'+NC+' INP: '+B+v+NC+' '+R+'(need <200ms)'+NC), f++);
    }
    process.exit(f);
  " || FAILURES=$((FAILURES + $?))
}

# Load .env if present
if [ -f ".env" ]; then
  set -o allexport
  source .env
  set +o allexport
fi

run_strategy "mobile"
run_strategy "desktop"

echo ""
if [ "$FAILURES" -eq 0 ]; then
  echo -e "${GREEN}${BOLD}All checks passed.${NC}\n"
else
  echo -e "${RED}${BOLD}${FAILURES} check(s) failed.${NC}\n"
  exit 1
fi

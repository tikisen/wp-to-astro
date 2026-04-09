# [SITE_NAME] — Astro + Cloudflare Pages

Migrated from WordPress by wp-to-astro toolkit.

## Stack
- Astro 6 + Tailwind 4 (CSS-first, no config file needed for basic use)
- Cloudflare Pages (hosting)
- Notion CMS (blog posts — edit posts in Notion, trigger a Pages rebuild to publish)

## Development
- `npm run dev` — local dev server at localhost:4321
- `npm run build` — production build to dist/
- `npm run preview` — preview production build

## Deployment
- Push to `main` → Cloudflare Pages auto-builds and deploys
- Push to `staging` → staging.SITE_NAME.pages.dev

## Content
- Blog posts: Notion database (see NOTION_BLOG_DB_ID in .env)
- Static pages: src/pages/*.astro

## Audit
- `npm run audit:lhci` — Lighthouse CI (local, opens report)
- `npm run audit:psi` — PageSpeed Insights (requires PSI_API_KEY)
- Thresholds: performance ≥0.80, a11y/best-practices/SEO ≥0.90

## SEO
- Sitemap auto-generated at /sitemap-index.xml
- Edit Layout.astro for global meta/OG/LD+JSON
- robots.txt: public/robots.txt

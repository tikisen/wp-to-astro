# wp-to-astro

Reusable toolkit for migrating WordPress/Elementor sites to Astro + Cloudflare Pages.

## Structure
- `scripts/lib/` — Pure utility modules (testable, no side effects)
- `scripts/*.js` — Orchestration scripts (read env, call lib, write to extraction/)
- `templates/astro-base/` — Base Astro+Tailwind scaffold copied per migration
- `tests/` — Vitest unit tests for lib modules

## Running a migration
1. Copy `.env.example` to `.env`, fill in values for the target site
2. Run `npm run extract:all` to populate `extraction/`
3. Claude reads `extraction/` and generates the Astro project

## Tests
`npm test` — runs all unit tests in tests/

## Node version
Node 22+ required. Uses native fetch and --env-file flag.

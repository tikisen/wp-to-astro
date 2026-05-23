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

## Subagent orchestration

Claude runs this migration as an orchestrator + subagents. Never do multi-file reads or multi-file writes inline — dispatch subagents.

**Parallel patterns:**

- **Reading extraction data** — 3 parallel Explore subagents: site structure, design tokens, screenshots
- **Building pages** — one subagent per logical page group; orchestrator reconciles shared tokens and nav
- **QA fixes** — one subagent per failing page, all in parallel; orchestrator re-runs `qa:visual` after all complete
- **Video scraping** — Explore subagent fetches raw page HTML, extracts YouTube/Vimeo IDs by DOM position, returns mapping table; orchestrator applies it to `.astro` files
- **Repo + deploy wiring** — single subagent for git init → GitHub → CF Pages → deploy.yml → secrets

Every subagent prompt must end with: *"Return concise summaries with file paths, key decisions, and relevant excerpts. No raw file dumps."*

## Tests
`npm test` — runs all unit tests in tests/

## Node version
Node 22+ required. Uses native fetch and --env-file flag.

## Secrets discipline (post-Phase-4 — authoritative)

This repo uses `op://` references in `.env.template` resolved at runtime by `op run --env-file=.env.template -- <cmd>`. Plaintext `.env*` files are not permitted. For rotation, deploys, new credentials, or leak response → `~/.claude/skills/secrets.md`. Cloud env-store mappings (GHA / Vercel / CF Pages) live under `tikisen/.config/{gha,vercel,cf}-mappings/`. Notion runbook: search Resources DB for "Secrets-to-1Password Pipeline" (RES-52). Bundled `* Env` 1P items are archived; any older docs referencing them are stale.

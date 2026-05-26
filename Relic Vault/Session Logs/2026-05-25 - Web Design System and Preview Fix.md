---
status: active
authority: support
scope: operations
read_after:
  - "[[50 - Session Log Index]]"
depends_on:
  - "[[50 - Session Log Index]]"
supersedes: []
session_date: 2026-05-25
source_file: "Relic Vault/Session Logs/2026-05-25 - Web Design System and Preview Fix.md"
---

# 2026-05-25 - Web Design System and Preview Fix

Backlink: [[50 - Session Log Index]]

## Accomplished

- Implemented the first-pass web design-system foundation from [[35 - Web Design Wireframe]].
- Added local Relic fonts, wordmark asset, Sanctum shell styling, Stage fallback styling, and shared CSS primitives.
- Added `/app` Supabase env guarding so missing preview config redirects to sign-in instead of crashing.
- Started the preview server at `http://127.0.0.1:3000`.

## Changed

- Vault: [[02 - Source Map]], [[04 - Final Contradiction Pass]], [[35 - Web Design Wireframe]].
- Web: `apps/web/app/globals.css`, `apps/web/components/SanctumShell.tsx`, `apps/web/components/EntityCard.tsx`, Stage page, auth/data env guard tests.
- Operations: [[50 - Session Log Index]] and this session log.

## Verified

- `node scripts/verify-repo.mjs`
- `node apps/web/node_modules/vitest/vitest.mjs run --root apps/web --config vitest.config.ts`
- `node apps/web/node_modules/typescript/bin/tsc --noEmit -p apps/web/tsconfig.json`
- `node apps/web/node_modules/next/dist/bin/next build apps/web`
- Browser check: `/app` redirects to sign-in with a Supabase config message when env is missing.

## Follow-Ups

- Add real local Supabase env values before testing authenticated flows.
- Add a favicon to remove the current `/favicon.ico` 404 noise.

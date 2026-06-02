---
status: active
authority: support
scope: session-log
read_after:
  - "[[50 - Session Log Index]]"
depends_on:
  - "[[00 - Start Here]]"
supersedes: []
last_audited: 2026-06-02
source_file: "Relic Vault/Session Logs/2026-06-02 - Relic Web Draft Prep Stage Integration.md"
---

# 2026-06-02 - Relic Web Draft Prep Stage Integration

Backlink: [[50 - Session Log Index]]

## Accomplished

- Audited the Relic Web Draft export against the runtime web app and identified Prepare and Stage as the remaining core-loop integration gaps.
- Added backend-wired Figma draft adapters for the Prepare packet workspace and focused Stage surface.
- Moved the existing Prepare and Stage routes onto those adapters while preserving current Supabase loaders and server actions.
- Added Playwright configuration support for an overrideable base URL and local artifact output.
- Added a skipped-by-default authenticated Playwright loop that can exercise sign-up/sign-in, blank saga creation, dashboard, Prepare, Ready for Stage, and Stage controls.

## Files Changed

- `apps/web/components/relic-draft/PrepareWorkspaceDraft.tsx`
- `apps/web/components/relic-draft/StageRuntimeDraft.tsx`
- `apps/web/app/app/w/[workspaceId]/world/[worldId]/saga/[sagaId]/sessions/[sessionId]/prep/page.tsx`
- `apps/web/app/app/w/[workspaceId]/world/[worldId]/saga/[sagaId]/sessions/[sessionId]/stage/page.tsx`
- `apps/web/app/globals.css`
- `apps/web/playwright.config.ts`
- `apps/web/tests/figma-route-adapters.test.tsx`
- `apps/web/tests/e2e/authenticated-loop.spec.ts`

## Verification

- `npx pnpm@10.11.0 --filter @relic/web lint`
- `npx pnpm@10.11.0 --filter @relic/web test`
- `npx pnpm@10.11.0 --filter @relic/web build`
- `npx pnpm@10.11.0 verify`
- Playwright public smoke: passed.
- Playwright authenticated loop with local Supabase and `RELIC_E2E_AUTH=1`: passed after resetting/restarting the local Supabase stack.

## Follow-ups

- For manual testing, run the web app with local Supabase public URL and public auth key values in the environment.
- Sign-up currently may return to sign-in in the local Auth flow; the authenticated Playwright loop handles this by signing in with the newly created account before continuing.
- AI assist buttons remain disabled per the accepted AI runtime boundary.

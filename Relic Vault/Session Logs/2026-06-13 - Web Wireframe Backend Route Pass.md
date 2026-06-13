---
status: active
authority: support
scope: session-log
read_after:
  - "[[50 - Session Log Index]]"
depends_on:
  - "[[00 - Start Here]]"
supersedes: []
last_audited: 2026-06-13
source_file: "Relic Vault/Session Logs/2026-06-13 - Web Wireframe Backend Route Pass.md"
---

# Web Wireframe Backend Route Pass

Linked from [[50 - Session Log Index]].

## Accomplished

- Analyzed the new standalone Claude Design web wireframes against the active vault authority and current Next/Supabase architecture.
- Added an implementation plan at `docs/superpowers/plans/2026-06-12-relic-web-wireframe-implementation.md`.
- Wired backend-backed web actions for Stage recording consent, dice rolls, and Saga export requests.
- Added data loaders for Stage packets and Saga export status/download responses.
- Added missing web routes for Relic Guide, Saga export, session review, new-saga continuation, workspace settings fallback, and world settings fallback.
- Renamed user-facing app AI affordances from Loom to Relic Guide and wired shell Guide/Create controls to real routes.
- Added a session schedule migration for `session_number` and `planned_date`, plus automatic numbering for new sessions.
- Continued the web replacement pass by wiring Home to thread carry-forward data, adding empty-Saga Home actions, and upgrading Review into grouped affected-record trust sections with confidence context and rejection notes.
- Replaced raw Settings usage JSON with human-readable quota meters from the existing usage summary RPC.
- Updated Library to default to an all-record overview with type filters/counts while preserving manual create/detail links.
- Extended session creation to accept/display planned dates through the scoped session RPC, matching the prep contract fields.

## Changed

- Web app: server actions, data loaders, Sanctum shell, Stage route/component, settings, sessions list, and route tests.
- Web app continuation: Saga Home route/dashboard and Approval Queue grouping/detail layout.
- Web app continuation: Settings usage presentation.
- Web app continuation: Library overview route.
- Web app continuation: session create/list planned-date support.
- Supabase continuation: session creation migration now accepts optional planned date while preserving existing callers.
- Supabase continuation: explicit execute grants added for the new planned-date `create_session` overload.
- Supabase: new migration `20260612222000_session_schedule_contract.sql`.
- Tests: expanded action RPC-boundary tests, route coverage tests, and shell assertions.

## Verification

- Passed: `tsc --noEmit --incremental false` in `apps/web`.
- Passed: full web Vitest suite with runner config loader: 8 files, 20 tests.
- Passed: `git diff --check` on touched app/docs/Supabase paths.
- Passed after continuation: `tsc --noEmit --incremental false`.
- Passed after continuation: full web Vitest suite with runner config loader: 8 files, 20 tests.
- Passed after continuation: `git diff --check` on touched app/session-log paths.
- Passed after Settings continuation: `tsc --noEmit --incremental false`.
- Passed after Settings continuation: full web Vitest suite with runner config loader: 8 files, 20 tests.
- Passed after Settings continuation: `git diff --check` on touched app/session-log paths.
- Passed after Library continuation: `tsc --noEmit --incremental false`.
- Passed after Library continuation: full web Vitest suite with runner config loader: 8 files, 20 tests.
- Passed after Library continuation: `git diff --check` on touched app/session-log paths.
- Passed after planned-date continuation: `tsc --noEmit --incremental false`.
- Passed after planned-date continuation: full web Vitest suite with runner config loader: 8 files, 21 tests.
- Passed after planned-date continuation: `git diff --check` on touched app/Supabase/session-log paths.
- Passed after RPC grant fix: `tsc --noEmit --incremental false`.
- Passed after RPC grant fix: full web Vitest suite with runner config loader: 8 files, 21 tests.
- Passed after RPC grant fix: `git diff --check` on touched app/Supabase/session-log paths.
- Passed inside `scripts/verify-backend-baseline.mjs`: script tests and `verify-repo` before the baseline reached package-manager execution.
- Passed: `verify-repo`.
- Passed: narrow Obsidian link check for touched vault notes.
- Reviewed: narrow stale/version scan for touched vault notes; only existing historical `v0.4` session-log title appeared in the index.
- Blocked: `next build` could not run because `.next/trace` writes were denied by the sandbox; the escalated rerun was rejected by the approval reviewer due the environment usage limit.
- Blocked: full `scripts/verify-backend-baseline.mjs` completion because its internal `npx pnpm@10.11.0 --filter @relic/web test` hit registry/cache permission errors; the escalated rerun was rejected by the approval reviewer due the environment usage limit.
- Blocked: local Supabase CLI tests could not run because `supabase` was not available on PATH or in the repo.

## Follow-ups

- Run `next build`, local Supabase database tests, and browser/Playwright route QA once the environment allows build output and Supabase CLI access.
- Continue the visual replacement pass for Home, Library, Threads, Prepare, Review, Export, Settings, and Stage polish against the new wireframe direction.
- Decide whether the remaining vault/history references to Loom should be renamed in active design notes, or retained as historical design-source terminology.

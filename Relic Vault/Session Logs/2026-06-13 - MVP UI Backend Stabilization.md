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
source_file: "Relic Vault/Session Logs/2026-06-13 - MVP UI Backend Stabilization.md"
---

# MVP UI Backend Stabilization

Linked from [[50 - Session Log Index]].

## Accomplished

- Ran Playwright-backed QA over the current web MVP loop and expanded the authenticated e2e path through Saga creation, Library create/detail, Thread objective round-trip, Prep, Stage start/live flow, consent, quick capture, Quick Stub, marked moments, dice, and Stage search.
- Fixed missing real headings on Saga Home, entity detail, and Thread detail surfaces so the UI is accessible to role-based navigation and tests.
- Corrected Stage live-state labels and made the Stage search input expose a search role.
- Added an app icon to remove the missing favicon request during browser QA.
- Restored thread objective round-trip by preserving `objectives_log` in web entity normalization and rendering objective text instead of raw JSON.
- Sent Stage search through `surface = 'stage'` instead of the generic Sanctum surface.
- Hardened backend Stage contracts: only one session per Saga can be `started` or `in_progress`, and Quick Stub now requires a started or in-progress session.
- Added a session-scoped Review read RPC so session review only returns drafts linked to sources from that session.
- Fixed `append_thread_objective` ambiguity by qualifying table columns in the RPC.
- Made Playwright e2e start its own local Next dev server on a configurable port.
- Re-checked the Codex Chrome Extension after install; the extension was installed and enabled, but the native messaging registry key was missing, so Chrome bridge QA remained unavailable and Playwright stayed the browser path.

## Changed

- Web app: data loaders, actions, Thread detail route, Stage route/component, dashboard/entity headings, Playwright config, app icon, and authenticated e2e test.
- Supabase: migrations for UI contract hardening, session-scoped review drafts, and thread objective RPC qualification.
- Supabase tests: deterministic job runtime fixture cleanup, Stage/session contract coverage, session-scoped review coverage, thread objective append coverage, and access-control allowlist update.

## Verification

- Passed: `npx pnpm@10.11.0 --filter @relic/web test` - 8 files, 21 tests.
- Passed: `npx pnpm@10.11.0 --filter @relic/web lint`.
- Passed: `npx pnpm@10.11.0 --filter @relic/web build`.
- Passed: `RELIC_E2E_AUTH=1 PLAYWRIGHT_PORT=3001 npx pnpm@10.11.0 --filter @relic/web test:e2e` - 2 Playwright tests.
- Passed: `supabase test db` - 11 files, 261 pgTAP tests.
- Passed: `node scripts/verify-repo.mjs`.

## Follow-ups

- Reinstall or repair the Codex Chrome plugin/native host from the Codex plugin UI before relying on Chrome bridge QA.
- Keep AI creation, prep generation, Guide answers, and live provider workers disabled/manual until [[43 - AI Runtime Implementation Plan]] is accepted.
- Larger MVP gaps remain for full Approval Queue edit-and-approve, quota hard-stop coverage, hybrid retrieval, transcription/provider workers, and richer Library provenance/relationship surfaces.

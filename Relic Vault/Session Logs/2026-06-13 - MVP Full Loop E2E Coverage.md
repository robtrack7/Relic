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
source_file: "Relic Vault/Session Logs/2026-06-13 - MVP Full Loop E2E Coverage.md"
---

# MVP Full Loop E2E Coverage

Linked from [[50 - Session Log Index]].

## Accomplished

- Expanded the authenticated Playwright MVP walkthrough from a narrow Saga-to-Stage smoke test into a broader full-loop regression.
- Covered sign-up/sign-in fallback, blank Saga creation, Sanctum navigation, all editable manual canon entity types, Thread objective persistence, Library, Search, Settings, Export, Review, Session prep, Stage readiness, live controls, consent, quick capture, Quick Stub, marked moments, dice persistence, Stage search, session end, and manual entity edit persistence.
- Verified Chrome DevTools against the local public page: no console warnings/errors/issues and all initial page/network requests returned 200.
- Confirmed no backend or frontend wiring fixes were needed after the expanded walkthrough; failures encountered during iteration were test selector assumptions, not product defects.

## Changed

- `apps/web/tests/e2e/authenticated-loop.spec.ts`

## Verification

- Passed: `npx pnpm@10.11.0 --filter @relic/web test` - 8 files, 21 tests.
- Passed: `npx pnpm@10.11.0 --filter @relic/web lint`.
- Passed: `npx pnpm@10.11.0 --filter @relic/web build`.
- Passed: `RELIC_E2E_AUTH=1 playwright test --project=chromium` - 2 Playwright tests.
- Passed: `npm run test:supabase` - 11 files, 261 pgTAP tests.
- Passed: `node scripts/verify-repo.mjs`.

## Follow-ups

- Keep this e2e as the MVP regression gate for future UI/backend changes.
- Broaden Approval Queue e2e coverage once seeded pending draft creation is exposed through an approved UI path.

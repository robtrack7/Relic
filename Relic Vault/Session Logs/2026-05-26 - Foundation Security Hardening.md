---
status: active
authority: support
scope: operations
read_after:
  - "[[50 - Session Log Index]]"
depends_on:
  - "[[45 - Security Findings Register]]"
supersedes: []
session_date: 2026-05-26
source_file: "Relic Vault/Session Logs/2026-05-26 - Foundation Security Hardening.md"
---

# 2026-05-26 - Foundation Security Hardening

Backlink: [[50 - Session Log Index]]

## Accomplished

- Added foundation security hardening for the audit findings tracked in [[45 - Security Findings Register]].
- Moved current web write flows and protected read flows behind scoped Supabase RPCs.
- Added direct-write grant hardening, fail-closed active-Saga checks, draft resolution RPC, and session junction validation.
- Added regression tests for RPC-mediated server actions.

## Changed

- Vault: [[45 - Security Findings Register]], [[00 - Start Here]], [[02 - Source Map]], [[50 - Session Log Index]].
- Supabase: `supabase/migrations/20260526155312_foundation_security_hardening.sql`, `supabase/tests/foundation.sql`.
- Web: `apps/web/app/actions.ts`, `apps/web/lib/data.ts`, `apps/web/app/app/new-saga/page.tsx`, `apps/web/tests/security-actions.test.ts`.

## Verified

- `node scripts/verify-repo.mjs`
- `node apps/web/node_modules/vitest/vitest.mjs run --root apps/web --config vitest.config.ts`
- `node apps/web/node_modules/typescript/bin/tsc --noEmit -p apps/web/tsconfig.json`
- `node apps/web/node_modules/next/dist/bin/next build apps/web`
- `supabase db reset --yes`
- `npm run test:supabase`
- Obsidian link check.
- Stale terminology scan.
- Registry/memory task mapping check.

## Follow-Ups

- Extend scoped trigger validation to relationship/source tables before those write paths become user-facing.
- Revisit security-definer RPC placement if Relic moves to a dedicated exposed API schema.

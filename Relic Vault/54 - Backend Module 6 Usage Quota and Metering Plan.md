---
status: active
authority: secondary
scope: planning
read_after:
  - "[[00 - Start Here]]"
  - "[[46 - Backend Audit and Module Plan]]"
  - "[[25 - Pricing and Rate Limits]]"
depends_on:
  - "[[20 - Entity and Canon Schema]]"
  - "[[21 - Tech Architecture]]"
  - "[[25 - Pricing and Rate Limits]]"
  - "[[46 - Backend Audit and Module Plan]]"
supersedes: []
last_audited: 2026-06-01
source_file: "Relic Vault/54 - Backend Module 6 Usage Quota and Metering Plan.md"
---

# Backend Module 6 Usage Quota and Metering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every cost-driving backend action preflightable, chargeable exactly once, and visible through a Workspace usage read model before AI/transcription/storage workers are wired.

**Architecture:** Keep `check_quota_preflight` as the pre-work guard and add a scoped, idempotent `record_usage_event` RPC as the post-work ledger writer. The function appends `usage_events`, updates the current monthly rollup in one transaction, skips human quota impact for provider failures without usable output, and returns the event id. `get_workspace_usage_summary` becomes the read model for Settings/upgrade surfaces.

**Tech Stack:** Supabase PostgreSQL, pgTAP, `usage_events`, `usage_monthly_rollups`, `quota_overrides`, `workspaces.usage_limits`, existing RPC boundary tests.

---

## Current Usage Backend Observed

Verified during Module 6 planning on 2026-06-01:

- `usage_events`, `usage_monthly_rollups`, `quota_overrides`, and `workspaces.usage_limits` already exist.
- `check_quota_preflight` blocks/warns metered work and never blocks manual edit/approval work.
- `get_workspace_usage_summary` currently returns limits plus raw current rollup only.
- There is no shared usage writer that enforces idempotency and updates rollups.
- Failed provider-call semantics are not yet represented in code.

## Implementation Status

Implemented on 2026-06-01 in `supabase/migrations/20260601231000_usage_metering.sql`.

- `record_usage_event` now provides a scoped, idempotent ledger writer for browser-callable and worker-facing usage events.
- Duplicate idempotency keys return the original event id and do not mutate monthly rollups again.
- Successful metered work updates AI credit/call, transcription second, storage byte, import, and export rollups.
- Provider failures with `metadata.user_charge=false` preserve internal cost metadata without consuming human-facing quota.
- `get_workspace_usage_summary` now returns meter rows with effective limits, remaining values, severities, reset timestamps, and active quota override support.
- Verification: `npm run test:supabase` passed with 126 tests, `npx pnpm@10.11.0 --filter @relic/web test` passed with 14 tests, and `npm run backend:baseline:reset` completed with `RELIC_BACKEND_BASELINE_OK` on 2026-06-01.

## Files

- Create: `supabase/tests/usage_quota.sql`
- Create: `supabase/migrations/<timestamp>_usage_metering.sql`
- Modify: `supabase/tests/access_control.sql`
- Modify: `supabase/security/rpc-boundary.md`
- Modify: `Relic Vault/46 - Backend Audit and Module Plan.md`
- Modify: `Relic Vault/02 - Source Map.md`
- Modify: `Relic Vault/04 - Final Contradiction Pass.md`

## Task 1: Add Failing Usage and Quota Tests

**Files:**

- Create: `supabase/tests/usage_quota.sql`

- [x] **Step 1: Seed usage fixtures**

Create one GM, Workspace, World, Saga, usage limits, and a current monthly rollup.

- [x] **Step 2: Prove preflight warnings and overrides**

Assert:

- `warn_70`, `warn_90`, and `blocked` severities match current usage plus requested units.
- Manual actions are never blocked.
- Active quota overrides replace the plan limit until expiry.

- [x] **Step 3: Prove idempotent usage event charging**

Assert `record_usage_event(...)`:

- Inserts exactly one `usage_events` row for an idempotency key.
- Returns the same event id on repeated calls with the same idempotency key.
- Updates rollups exactly once for AI credits/calls, transcription seconds, storage bytes, imports, and exports.

- [x] **Step 4: Prove provider failure rules**

Assert provider failures with `metadata.user_charge=false` and `cost_estimate_usd` write an internal cost event but do not increment human-facing rollup fields.

- [x] **Step 5: Prove usage summary shape**

Assert `get_workspace_usage_summary` returns `usage_limits`, `current_rollup`, `meters`, and `reset_at`, with remaining values computed from limits/overrides/rollups.

## Task 2: Implement Metering RPC

**Files:**

- Create: `supabase/migrations/<timestamp>_usage_metering.sql`

- [x] **Step 1: Add `record_usage_event` RPC**

Create `public.record_usage_event(workspace_id, world_id, saga_id, event_kind, units, unit_type, idempotency_key, metadata)` as a `security definer` function with fixed `search_path`. It must validate workspace access and optional world/saga scope.

- [x] **Step 2: Add rollup update helper**

Create an internal helper that upserts the current monthly row and increments only the human-facing fields that apply to the event.

- [x] **Step 3: Implement failure semantics**

If `metadata.user_charge=false`, write `usage_events` but do not increment human-facing rollup fields. Preserve `cost_estimate_usd`, provider, model, tokens, audio seconds, storage bytes, and AI credits on the event row when supplied.

- [x] **Step 4: Keep idempotency exact**

On duplicate `idempotency_key`, return the existing event id and do not mutate the rollup.

## Task 3: Improve Usage Summary

**Files:**

- Modify in new migration: `public.get_workspace_usage_summary(...)`

- [x] **Step 1: Add meter rows**

Return meter objects for AI credits, transcription seconds, storage bytes, imports, and exports. Each row should include limit key, used, limit, remaining, severity, and reset timestamp.

- [x] **Step 2: Respect overrides**

Use active `quota_overrides` values in the summary so Settings shows the same effective caps as preflight.

## Task 4: Verify Module 6

**Files:**

- Modify: vault status notes

- [x] **Step 1: Run focused SQL tests**

Run:

```powershell
npm run test:supabase
```

- [x] **Step 2: Run web tests**

Run:

```powershell
npx pnpm@10.11.0 --filter @relic/web test
```

- [x] **Step 3: Run full backend baseline**

Run:

```powershell
npm run backend:baseline:reset
```

- [x] **Step 4: Update vault status**

Record passing verification in this plan and [[46 - Backend Audit and Module Plan]].

## Done Criteria

- Metered work is blocked or warned before starting.
- Manual viewing, editing, and approval are never quota blocked.
- Successful metered work charges exactly once.
- Failed provider work follows Pricing spec charging rules.
- Usage summary can power rough Settings/upgrade UI without raw token exposure.
- `npm run backend:baseline:reset` passes.

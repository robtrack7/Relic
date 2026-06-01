---
status: active
authority: secondary
scope: planning
read_after:
  - "[[00 - Start Here]]"
  - "[[46 - Backend Audit and Module Plan]]"
  - "[[48 - Backend Module 1 Access Control Plan]]"
depends_on:
  - "[[20 - Entity and Canon Schema]]"
  - "[[21 - Tech Architecture]]"
  - "[[24 - Approval Queue]]"
  - "[[45 - Security Findings Register]]"
  - "[[46 - Backend Audit and Module Plan]]"
supersedes: []
last_audited: 2026-06-01
source_file: "Relic Vault/49 - Backend Module 2 Canon Write Path Plan.md"
---

# Backend Module 2 Canon Write Path Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make direct GM canon mutations provenance-safe before the Approval Queue commit backend is expanded in Module 3.

**Architecture:** Keep Module 2 focused on direct GM writes. Manual `create_entity`, `update_entity`, and `archive_entity` RPCs will write synthetic `sources` rows and append-only `canon_audit` rows in the same transaction as the entity change. Update/archive paths will require `expected_version` to block blind writes. Approval-draft commit behavior remains Module 3, but Module 2 should leave reusable helpers where it reduces duplicate audit/source code.

**Tech Stack:** Supabase PostgreSQL, pgTAP, security-definer RPCs already allowlisted by [[48 - Backend Module 1 Access Control Plan]], Next.js server actions for expected-version form forwarding.

---

## Current Canon Write Path Observed

Verified during Module 2 planning on 2026-06-01:

- `create_entity`, `update_entity`, and `archive_entity` validate Workspace/World/Saga access through `assert_saga_access`.
- Direct GM entity writes currently mutate canonical tables without inserting `sources` rows or `canon_audit` rows.
- `update_entity` does not enforce `expected_version`, so blind overwrites are possible.
- `archive_entity` does not enforce `expected_version`, so stale archive submissions are possible.
- `create_entity` accepts `entity_type = 'note'`, but `public.entity_type` does not include `note`, while `canon_audit.entity_type` is typed as `public.entity_type`. Module 2 must either align the enum or explicitly exclude notes from audited manual canon writes. The implementation should align the enum so the existing note RPC path can be audited.
- Module 2 implementation verified `npm run test:supabase` and web unit tests on 2026-06-01 after adding `20260601173429_canon_write_path.sql`: passed.
- Module 2 final verification ran `npm run backend:baseline:reset` on 2026-06-01: passed.

## Files

- Create: `supabase/tests/canon_write_path.sql`
- Create: `supabase/migrations/<timestamp>_canon_write_path.sql`
- Modify: `supabase/tests/access_control.sql`
- Modify: `supabase/security/rpc-boundary.md`
- Modify: `apps/web/app/actions.ts`
- Modify: `apps/web/app/app/w/[workspaceId]/world/[worldId]/saga/[sagaId]/entities/[entityType]/[entityId]/page.tsx`
- Modify or add web action tests if expected-version payloads need coverage.
- Modify: `Relic Vault/46 - Backend Audit and Module Plan.md`
- Modify: `Relic Vault/02 - Source Map.md`
- Modify: `Relic Vault/04 - Final Contradiction Pass.md`

## Task 1: Add Failing Canon Write Tests

**Files:**

- Create: `supabase/tests/canon_write_path.sql`

- [x] **Step 1: Seed scoped fixtures**

Create two authenticated users, two Workspaces, two Worlds, and sibling Sagas. Reuse the fixed UUID style from `foundation.sql` to keep failures readable.

- [x] **Step 2: Prove manual create provenance**

Assert `create_entity`:

- Inserts the canonical row.
- Inserts one synthetic `sources` row with `kind='gm_instruction'`.
- Inserts one `canon_audit` row with `actor_kind='gm'`, `from_state is null`, `to_state='canon'`, and the source ID in `source_ids`.

- [x] **Step 3: Prove manual update conflict behavior**

Assert `update_entity`:

- Rejects when `payload.expected_version` is missing.
- Rejects when `payload.expected_version` differs from the live row `updated_at`.
- Succeeds when `payload.expected_version` matches.
- Writes a synthetic source and audit row for the successful update.

- [x] **Step 4: Prove manual archive conflict behavior**

Assert `archive_entity`:

- Rejects stale `expected_version`.
- Succeeds with the live version.
- Writes a synthetic source and audit row with `to_state='archived'`.

- [x] **Step 5: Prove audit append-only behavior**

Assert authenticated direct updates/deletes against `canon_audit` are denied.

## Task 2: Implement the Canon Write Migration

**Files:**

- Create: `supabase/migrations/<timestamp>_canon_write_path.sql`

- [x] **Step 1: Create migration**

Use:

```powershell
supabase migration new canon_write_path
```

- [x] **Step 2: Align entity typing for notes**

Add `note` to `public.entity_type` if it is not present, then update scoped entity helpers that need to recognize notes.

- [x] **Step 3: Add reusable write helpers**

Add small security-definer helpers for:

- Reading a scoped canonical row version/state.
- Enforcing `expected_version`.
- Inserting manual `gm_instruction` sources.
- Inserting `canon_audit` rows.

Keep comments short and focused on invariants/failure modes.

- [x] **Step 4: Replace manual write RPC bodies**

Update `create_entity`, `update_entity`, and `archive_entity` so source and audit writes happen in the same transaction as the canonical row mutation.

- [x] **Step 5: Update grants and access-control catalogs**

If new helper functions need authenticated execution for RLS or direct RPC use, update `20260601171914_access_control_boundary.sql` style grants in the new migration and `supabase/tests/access_control.sql`. Internal helper functions should not be directly callable by browser roles unless policy evaluation needs them.

## Task 3: Forward Expected Versions From Server Actions

**Files:**

- Modify: `apps/web/app/actions.ts`
- Modify: entity detail page
- Modify or add: web action tests

- [x] **Step 1: Add hidden `expectedVersion` fields**

Forward the loaded entity `updated_at` value for update and archive forms.

- [x] **Step 2: Include expected version in RPC input**

For `update_entity`, put `expected_version` into the JSON payload. For `archive_entity`, pass the expected version as the new RPC argument if the migration adds one.

- [x] **Step 3: Test action payloads**

Update web unit tests or add focused tests so the server actions prove expected-version values are forwarded instead of trusting client-controlled IDs alone.

## Task 4: Verify Module 2

**Files:**

- Modify: vault status notes

- [x] **Step 1: Run focused SQL tests**

Run:

```powershell
npm run test:supabase
```

- [x] **Step 2: Run full backend baseline**

Run:

```powershell
npm run backend:baseline:reset
```

- [x] **Step 3: Update vault status**

Record the passing verification in this plan and [[46 - Backend Audit and Module Plan]].

## Done Criteria

- Manual create/update/archive writes produce synthetic `sources` rows.
- Manual create/update/archive writes produce append-only `canon_audit` rows.
- Update/archive reject missing or stale `expected_version`.
- Notes are either included in the audited canon path or explicitly rejected; preferred implementation is inclusion by aligning `entity_type`.
- Existing access-control and foundation tests still pass.
- `npm run backend:baseline:reset` passes.

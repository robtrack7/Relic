---
status: active
authority: secondary
scope: planning
read_after:
  - "[[00 - Start Here]]"
  - "[[46 - Backend Audit and Module Plan]]"
  - "[[49 - Backend Module 2 Canon Write Path Plan]]"
depends_on:
  - "[[20 - Entity and Canon Schema]]"
  - "[[21 - Tech Architecture]]"
  - "[[24 - Approval Queue]]"
  - "[[45 - Security Findings Register]]"
  - "[[46 - Backend Audit and Module Plan]]"
supersedes: []
last_audited: 2026-06-01
source_file: "Relic Vault/51 - Backend Module 3 Approval Queue Plan.md"
---

# Backend Module 3 Approval Queue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Review surface the MVP trust gate: approving a draft must apply the canon mutation and write audit/provenance in one transaction, while rejection and merge decisions must not silently mutate canon.

**Architecture:** Extend the existing `update_draft_state` RPC into a real approval/disposition RPC while preserving the current web call shape for rough UI. Module 2 already created manual source/audit helpers; Module 3 should add approval-specific helpers or generalized versions where needed. The first implementation will support create, update, and archive-request approval, rejection with enum tags/text, and merge identity decisions that only mark the source draft merged. Full generated merge-target update drafts can be added behind the same tests if the payload shape is present.

**Tech Stack:** Supabase PostgreSQL, pgTAP, `drafts`/`draft_sources`/`sources`, existing `update_draft_state` RPC allowlist, web Review server action.

---

## Current Approval Backend Observed

Verified during Module 3 planning on 2026-06-01:

- `update_draft_state` currently changes `drafts.state`, `rejection_note`, and timestamps only.
- `approved` does not apply `drafts.proposed_payload` or `committed_payload` to canon.
- `archive_request` approval does not archive the target entity.
- `rejected` correctly avoids canon mutation but does not write enum-backed rejection tags from the current UI.
- `merged` only changes state today. That matches the "identity decision only" part of the spec, but it does not yet enqueue a target update draft.
- `get_pending_drafts` reads pending drafts through a scoped RPC.
- Module 3 implementation verified `npm run test:supabase` and web unit tests on 2026-06-01 after adding `20260601174516_approval_queue_commit.sql`: passed.
- Module 3 final verification ran `npm run backend:baseline:reset` on 2026-06-01: passed. The baseline runner tolerated the local Supabase CLI post-reset restart 502 only after migrations/seed replayed and SQL tests passed.

## Files

- Create: `supabase/tests/approval_queue.sql`
- Create: `supabase/migrations/<timestamp>_approval_queue_commit.sql`
- Modify: `supabase/tests/access_control.sql` if new internal security-definer helpers are added.
- Modify: `supabase/security/rpc-boundary.md`
- Modify: `apps/web/app/actions.ts`
- Modify: Review page if rejection tags, edit payload, or merge target fields are surfaced.
- Modify: `Relic Vault/46 - Backend Audit and Module Plan.md`
- Modify: `Relic Vault/02 - Source Map.md`
- Modify: `Relic Vault/04 - Final Contradiction Pass.md`

## Task 1: Add Failing Approval Queue Tests

**Files:**

- Create: `supabase/tests/approval_queue.sql`

- [x] **Step 1: Seed draft fixtures**

Seed scoped users, Workspace/World/Saga, source rows, target canon rows, and drafts for:

- create approval
- update approval
- stale update conflict
- archive request approval
- rejection
- merge identity decision

- [x] **Step 2: Prove approval commits canon**

Assert `update_draft_state(..., 'approved')`:

- Creates canon rows for `change_kind='create'`.
- Updates target rows for `change_kind='update'`.
- Archives target rows for `change_kind='archive_request'`.
- Sets `drafts.state='approved'`, `committed_payload`, `resolved_at`, and `updated_at`.
- Writes one `canon_audit` row with `actor_kind='gm_via_ai_approval'`, `draft_id`, and `source_ids` from `draft_sources`.

- [x] **Step 3: Prove conflict behavior**

Assert stale update/archive approvals fail when `draft.expected_version` does not match live target `updated_at`, and the draft remains pending.

- [x] **Step 4: Prove rejection behavior**

Assert rejection sets `state='rejected'`, stores rejection note/tags when provided, and writes no canon audit row.

- [x] **Step 5: Prove merge behavior**

Assert merge marks the source draft `merged` and stores `merge_target_id`, but does not mutate canon directly.

## Task 2: Implement Approval Commit Migration

**Files:**

- Create: `supabase/migrations/<timestamp>_approval_queue_commit.sql`

- [x] **Step 1: Create migration**

Use:

```powershell
supabase migration new approval_queue_commit
```

- [x] **Step 2: Add approval helper functions**

Implemented inline in the replacement `update_draft_state` body for this milestone:

- Loading and locking a draft.
- Collecting `draft_sources.source_id`.
- Applying create/update/archive payloads to canon.
- Writing approval audit rows.
- Leaving a pending draft untouched on conflict.

- [x] **Step 3: Replace `update_draft_state` body**

Keep the current RPC name/signature for rough UI compatibility, but implement:

- `approved`: commit canon for create/update/archive_request.
- `rejected`: no canon mutation, optional note/tag handling.
- `merged`: state change and `merge_target_id` capture only.
- `superseded`: state change only for conflict cleanup.

- [x] **Step 4: Update security catalogs**

Any new security-definer helper must have fixed `search_path`, no direct browser execute grant, and a documented reason in `supabase/tests/access_control.sql` and `supabase/security/rpc-boundary.md`.

## Task 3: Update Review Server Action

**Files:**

- Modify: `apps/web/app/actions.ts`
- Modify if needed: Review page
- Modify or add web action tests

- [x] **Step 1: Preserve current rough UI actions**

Keep current approve/reject/merged buttons working against `update_draft_state`.

- [x] **Step 2: Forward optional fields**

Support rejection tags, edit payload, and merge target IDs when the UI begins sending them. Do not require the rough UI to expose all controls yet.

- [x] **Step 3: Test action payloads**

Add a focused web unit test if action shape changes.

## Task 4: Verify Module 3

**Files:**

- Modify: vault status notes

- [x] **Step 1: Run focused tests**

Run:

```powershell
npm run test:supabase
npx pnpm@10.11.0 --filter @relic/web test
```

- [x] **Step 2: Run full backend baseline**

Run:

```powershell
npm run backend:baseline:reset
```

- [x] **Step 3: Update vault status**

Record the passing verification in this plan and [[46 - Backend Audit and Module Plan]].

## Done Criteria

- Approve applies create/update/archive-request drafts to canon in one transaction.
- Edit-and-approve is represented by `committed_payload` and `gm_edit_diff` when provided.
- Rejection never writes canon audit.
- Merge does not silently mutate canon.
- Conflicting updates/archives leave drafts pending.
- Approval audit rows include `draft_id`, `actor_kind='gm_via_ai_approval'`, and cited `source_ids`.
- `npm run backend:baseline:reset` passes.

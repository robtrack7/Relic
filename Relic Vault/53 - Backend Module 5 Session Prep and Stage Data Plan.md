---
status: active
authority: secondary
scope: planning
read_after:
  - "[[00 - Start Here]]"
  - "[[46 - Backend Audit and Module Plan]]"
  - "[[31 - Session Prep Flow]]"
  - "[[32 - Stage UX Flow]]"
depends_on:
  - "[[20 - Entity and Canon Schema]]"
  - "[[21 - Tech Architecture]]"
  - "[[31 - Session Prep Flow]]"
  - "[[32 - Stage UX Flow]]"
  - "[[46 - Backend Audit and Module Plan]]"
supersedes: []
last_audited: 2026-06-01
source_file: "Relic Vault/53 - Backend Module 5 Session Prep and Stage Data Plan.md"
---

# Backend Module 5 Session Prep and Stage Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make manual Session Prep and Stage writes reliable enough that the rough UI can exercise the full Prepare -> Stage -> capture -> end-session path without hidden backend permissiveness.

**Architecture:** Replace the permissive session/Stage RPC bodies with transaction-safe versions that enforce lifecycle transitions, prep locking, scoped references, and post-session queue creation. Add focused read/write RPCs for Stage packet loading, dice history, recording consent, and ended-session undo/finalization while preserving current rough UI RPC names where possible.

**Tech Stack:** Supabase PostgreSQL, pgTAP, existing `sessions`, `session_pinned_entities`, `session_active_threads`, `notes`, `sources`, `session_marked_moments`, `dice_rolls`, `consent_log`, and `pipeline_runs`.

---

## Current Session and Stage Backend Observed

Verified during Module 5 planning on 2026-06-01:

- `set_session_status` currently allows broad direct status updates and sets only `started_at`/`ended_at`.
- `update_session_prep` updates prep fields and rewrites pins/active threads, but does not enforce prep lock or Ready-for-Stage minimums.
- Pinned entity and active thread trigger validators exist, but the RPC should fail transactionally before partial packet rewrites survive invalid input.
- `quick_capture` inserts a note, but it does not write a `sources` row, session timestamp metadata, or post-session evidence linkage.
- `quick_stub` creates an entity row, but it does not write a synthetic source/audit row through the Module 2 provenance helpers.
- `mark_moment` exists, but there is no tested recording-state/offset behavior.
- `dice_rolls` and `consent_log` tables exist, but no scoped RPC currently owns them.
- There is no Stage packet read model that returns the session, pins, active threads, captures, consent state, dice history, and marked moments in one scoped call.

## Implementation Status

Implemented on 2026-06-01 in `supabase/migrations/20260601222000_session_stage_backend.sql`.

- Session lifecycle transitions now reject invalid jumps and set packet/live/end timestamps.
- Ready-for-Stage validates packet minimums, locks the packet timestamp, and clears pending prep suggestions.
- Prep updates reject live/undo-locked sessions and preserve scoped pin/thread validation transactionally.
- Quick captures write note-backed source rows; quick stubs write canon source/audit provenance; marked moments require an active Stage session.
- Consent, dice history, and Stage packet read-model RPCs are available to authenticated clients.
- Ending a session creates one queued `pipeline_runs` row for later post-session processing.
- Verification: `npm run test:supabase` passed with 107 tests, `npx pnpm@10.11.0 --filter @relic/web test` passed with 14 tests, and `npm run backend:baseline:reset` completed with `RELIC_BACKEND_BASELINE_OK` on 2026-06-01.

## Files

- Create: `supabase/tests/session_stage.sql`
- Create: `supabase/migrations/<timestamp>_session_stage_backend.sql`
- Modify: `supabase/tests/access_control.sql`
- Modify: `supabase/security/rpc-boundary.md`
- Modify: `apps/web/app/actions.ts` only if rough UI actions need to call new RPCs.
- Modify: `Relic Vault/46 - Backend Audit and Module Plan.md`
- Modify: `Relic Vault/02 - Source Map.md`
- Modify: `Relic Vault/04 - Final Contradiction Pass.md`

## Task 1: Add Failing Session and Stage Tests

**Files:**

- Create: `supabase/tests/session_stage.sql`

- [x] **Step 1: Seed session fixtures**

Create one user, Workspace, World, Saga, two sessions, valid/invalid entities, active thread candidates, and a prior ended session with pipeline state for start-warning coverage.

- [x] **Step 2: Prove lifecycle transitions**

Assert valid transitions:

- `planned -> ready` only through Ready-for-Stage validation.
- `ready -> started`.
- `started -> in_progress`.
- `in_progress -> ended_pending_undo`.
- `ended_pending_undo -> in_progress` for undo.
- `ended_pending_undo -> ended` for finalization.

Assert invalid jumps fail and do not mutate timestamps or create pipeline rows.

- [x] **Step 3: Prove prep transactions and locking**

Assert `update_session_prep`:

- Rewrites session fields, pins, and active threads atomically.
- Rejects pins from sibling Sagas or non-existent entities.
- Rejects active threads outside the active Saga.
- Rejects prep edits when status is `in_progress` or `ended_pending_undo`.
- Allows prep edits in `planned`, `ready`, and `started`.

- [x] **Step 4: Prove Ready-for-Stage minimums**

Assert Ready fails unless the session has a title and at least one of objective, opening scene, scene notes, checklist item, pin, or active thread. On success it sets `status='ready'`, `packet_locked_at`, and clears `pending_prep_suggestions`.

- [x] **Step 5: Prove Stage writes**

Assert:

- `quick_capture` writes a `quick_capture` note plus a `sources.kind='note'` row with `session_id`.
- Quick captures are allowed during `started`/`in_progress` and rejected for unrelated/ended sessions.
- `quick_stub` creates `is_stub=true`, writes a synthetic source/audit row, and does not enqueue AI work.
- `mark_moment` writes session-scoped moments only for started/in-progress sessions.

- [x] **Step 6: Prove consent and dice RPCs**

Assert:

- `record_session_consent` appends `consent_log` and updates `sessions.consent_state`.
- `record_dice_roll` writes scoped dice history with total/breakdown and validates expression payload shape.
- Dice history is returned newest-first by the Stage packet read model.

- [x] **Step 7: Prove Stage packet read model**

Assert `get_stage_packet(workspace_id, world_id, saga_id, session_id)` returns one JSON object containing the session row, pinned entities in order, active threads, quick captures, marked moments, dice history, consent state, and start-session warning metadata.

## Task 2: Implement Session Lifecycle RPCs

**Files:**

- Create: `supabase/migrations/<timestamp>_session_stage_backend.sql`

- [x] **Step 1: Add lifecycle helper**

Create an internal helper that validates allowed status transitions and computes timestamp side effects. Keep status changes through `set_session_status` for rough UI compatibility, but make direct invalid jumps fail.

- [x] **Step 2: Add Ready-for-Stage helper**

Implement a dedicated `ready_session_for_stage(...)` RPC or treat `set_session_status(..., 'ready')` as the ready action. It must validate packet minimums, set `packet_locked_at`, and clear `pending_prep_suggestions`.

- [x] **Step 3: Add end-session finalization**

When finalizing `ended_pending_undo -> ended`, set `ended_at` and create exactly one `pipeline_runs` row with inputs summary for manual Stage data. Undo must return to `in_progress` without creating a pipeline row.

## Task 3: Harden Prep Writes

**Files:**

- Modify in new migration: `public.update_session_prep(...)`

- [x] **Step 1: Enforce prep lock**

Reject prep writes when the session status is `in_progress` or `ended_pending_undo`. Keep `ended` restricted to retrospective fields only unless a later module explicitly opens those fields.

- [x] **Step 2: Keep packet rewrite atomic**

Update session fields and replace pins/active threads inside one RPC transaction. If any pin/thread validation fails, no prior pins or session field edits should persist.

- [x] **Step 3: Preserve scoped reference validation**

Reuse existing trigger validators where possible and add preflight checks only when they improve error clarity.

## Task 4: Implement Stage Write and Read RPCs

**Files:**

- Modify in new migration: `public.quick_capture(...)`
- Modify in new migration: `public.quick_stub(...)`
- Modify in new migration: `public.mark_moment(...)`
- Create in new migration: `public.record_session_consent(...)`
- Create in new migration: `public.record_dice_roll(...)`
- Create in new migration: `public.get_stage_packet(...)`

- [x] **Step 1: Source-backed quick captures**

Create quick-capture notes and source rows in one transaction. Store the session link on `sources.session_id`; use relative offset where available.

- [x] **Step 2: Provenance-backed quick stubs**

Route quick stubs through Module 2 source/audit behavior so they are citeable and visible to post-session processing as GM-authored canon.

- [x] **Step 3: Scoped marked moments**

Ensure marked moments can only be written for the active session and carry optional label/offset.

- [x] **Step 4: Consent and dice**

Add scoped RPCs for consent decisions and dice history. These are Stage data, not canon.

- [x] **Step 5: Stage packet**

Return one JSON payload shaped for rough UI smoke testing. The UI can keep using existing smaller read RPCs until it is ready to switch.

## Task 5: Verify Module 5

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

- Invalid status transitions are rejected at the backend.
- Prep writes preserve valid scoped references only and are blocked while live/undo-locked.
- Ready-for-Stage validates packet minimums.
- Stage writes do not trigger AI during `in_progress`.
- Quick captures, quick stubs, marked moments, dice rolls, and consent are scoped and citeable where appropriate.
- Stage packet read model can feed a rough UI smoke test.
- Ending a session creates one post-session pipeline row for later processing.
- `npm run backend:baseline:reset` passes.

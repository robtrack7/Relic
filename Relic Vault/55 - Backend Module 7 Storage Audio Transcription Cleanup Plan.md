---
status: active
authority: secondary
scope: planning
read_after:
  - "[[00 - Start Here]]"
  - "[[46 - Backend Audit and Module Plan]]"
  - "[[20 - Entity and Canon Schema]]"
  - "[[21 - Tech Architecture]]"
depends_on:
  - "[[20 - Entity and Canon Schema]]"
  - "[[21 - Tech Architecture]]"
  - "[[25 - Pricing and Rate Limits]]"
  - "[[32 - Stage UX Flow]]"
  - "[[46 - Backend Audit and Module Plan]]"
  - "[[54 - Backend Module 6 Usage Quota and Metering Plan]]"
supersedes: []
last_audited: 2026-06-01
source_file: "Relic Vault/55 - Backend Module 7 Storage Audio Transcription Cleanup Plan.md"
---

# Backend Module 7 Storage Audio Transcription Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the file/audio/transcript substrate safe and testable before a rough UI records audio, uploads chunks, edits transcripts, or surfaces cleanup/export states.

**Architecture:** Keep direct binary upload/download in Supabase Storage under Storage RLS, but move every relational side effect behind scoped RPCs or internal helpers. Browser clients receive deterministic storage paths and register completed chunks through `register_audio_chunk`; provider workers later write transcript results through internal helpers. Transcript edits are GM-facing RPCs with segment-boundary invariants. Cleanup remains job-backed and idempotent so Module 8 can supply dispatchers without changing the database contract.

**Tech Stack:** Supabase PostgreSQL, Storage RLS, pgTAP, `audio_chunks`, `transcripts`, `sources`, `pipeline_runs`, `internal.transcription_jobs`, `internal.cleanup_jobs`, `internal.export_jobs`, Module 6 `record_usage_event`.

---

## Current Storage and Transcript Backend Observed

Verified during Module 7 planning on 2026-06-01:

- Storage buckets `audio`, `attachments`, and `exports` exist and are private.
- Storage object policies validate the first path segments through `storage_path_allowed`.
- Public user-data table writes are blocked for browser roles, so audio chunk metadata needs a scoped RPC.
- `audio_chunks`, `transcripts`, `pipeline_runs`, `internal.transcription_jobs`, `internal.cleanup_jobs`, and `internal.export_jobs` already exist.
- There is no tested RPC for deterministic audio path construction, chunk registration, transcription enqueue/result handling, transcript editing, transcript deletion, or cleanup job idempotency.
- Module 8 still owns Edge Function dispatch, scoped JWT issuance, job claiming, retries, provider calls, and actual Storage object deletion.

## Implementation Status

Implemented on 2026-06-01 in `supabase/migrations/20260601234500_storage_audio_transcription.sql`.

- Deterministic audio upload target and chunk registration RPCs now validate Workspace / World / Saga / Session scope and exact Storage path shape.
- Audio chunk registration is idempotent, moves `started` sessions to `in_progress`, and meters storage bytes once through Module 6 usage events.
- Transcription enqueue creates one pending transcript and one internal transcription job per Session.
- Internal transcription result helpers complete or fail transcripts, update job state, and surface transcript failure in `pipeline_runs.inputs_summary`.
- Transcript editing preserves segment boundaries, freezes `original_segments` on first edit, leaves `sources.raw_excerpt` untouched, and exposes citation drift context.
- Audio cleanup, Saga cleanup, and expired export cleanup now enqueue idempotent internal cleanup jobs for Module 8 workers.
- Verification: `npm run test:supabase` passed with 161 tests, `npx pnpm@10.11.0 --filter @relic/web test` passed with 14 tests, and `npm run backend:baseline:reset` completed with `RELIC_BACKEND_BASELINE_OK` on 2026-06-01.

## Files

- Create: `supabase/tests/storage_audio_transcription.sql`
- Create: `supabase/migrations/<timestamp>_storage_audio_transcription.sql`
- Modify: `supabase/tests/access_control.sql`
- Modify: `supabase/security/rpc-boundary.md`
- Modify: `Relic Vault/46 - Backend Audit and Module Plan.md`
- Modify: `Relic Vault/02 - Source Map.md`
- Modify: `Relic Vault/04 - Final Contradiction Pass.md`

## Task 1: Add Failing Storage, Audio, and Transcript Tests

**Files:**

- Create: `supabase/tests/storage_audio_transcription.sql`

- [x] **Step 1: Seed scoped session fixtures**

Create two users with separate Workspace / World / Saga / Session rows so same-saga success and cross-saga failure can be proven.

- [x] **Step 2: Prove audio path and chunk registration rules**

Assert:

- `get_audio_upload_target(...)` returns `audio/<workspace>/<world>/<saga>/<session>/<sequence>.<ext>` metadata.
- `register_audio_chunk(...)` accepts only a path matching the supplied Workspace / World / Saga / Session / sequence.
- Cross-Workspace or sibling-Saga chunk registration fails.
- Duplicate `(session_id, sequence)` registration is idempotent and does not create duplicate rows.
- First recorded chunk can move a `started` session to `in_progress`.

- [x] **Step 3: Prove transcription enqueue/result contracts**

Assert:

- `enqueue_transcription_job(...)` creates one pending transcript row and one pending `internal.transcription_jobs` row per session.
- Re-enqueue with the same session returns the existing job.
- Completing a transcription writes segments, duration, model, language, and marks the job complete.
- Failing a transcription writes `transcripts.state='failed'`, records a failure reason, and leaves audio chunks recoverable.

- [x] **Step 4: Prove transcript edit invariants**

Assert `update_transcript_segments(...)`:

- Allows text changes and soft deletes only.
- Preserves `start` and `end` values.
- Rejects added, removed, or reordered segments.
- Copies `original_segments` only on the first edit and updates `edited_at` on every edit.
- Does not mutate `sources.raw_excerpt`.

- [x] **Step 5: Prove cleanup and retention queues**

Assert:

- Completed transcription enqueues one audio cleanup job only when `sagas.audio_retention='delete_after_transcription'`.
- Saga deletion/soft deletion enqueues one saga cleanup job.
- Expired export cleanup is idempotent.
- Cleanup jobs preserve enough scope/path payload for Module 8 workers.

## Task 2: Implement Audio Path and Chunk RPCs

**Files:**

- Create: `supabase/migrations/<timestamp>_storage_audio_transcription.sql`

- [x] **Step 1: Add deterministic path builder**

Create `public.get_audio_upload_target(workspace_id, world_id, saga_id, session_id, sequence, extension, bytes)` as a scoped `security definer` read RPC that returns bucket, storage path, max bytes, sequence, and expected content extension.

- [x] **Step 2: Add chunk registration**

Create `public.register_audio_chunk(...)` as a scoped write RPC. It validates path shape, active Saga access, session scope/status, sequence, allowed extension, byte count, duration, and idempotency.

- [x] **Step 3: Meter storage bytes**

Call Module 6 `record_usage_event` from chunk registration for successful first-time registrations. Duplicate registrations must not double-charge.

## Task 3: Implement Transcription Contracts

**Files:**

- Modify in new migration.

- [x] **Step 1: Add enqueue helper**

Create a scoped `public.enqueue_transcription_job(...)` RPC for browser/retry UI and an internal helper that creates the pending transcript plus `internal.transcription_jobs` row exactly once.

- [x] **Step 2: Add result helpers**

Create internal helpers for Module 8 workers:

- `internal.complete_transcription_job(...)`
- `internal.fail_transcription_job(...)`

They must update transcript state, job state, `pipeline_runs.inputs_summary`, and preserve recoverable audio on failure.

- [x] **Step 3: Enqueue cleanup on completion**

When a transcript becomes complete and the Saga retention mode is `delete_after_transcription`, enqueue exactly one `internal.cleanup_jobs` row with `job_kind='audio'`.

## Task 4: Implement Transcript Editing and Source Drift Read Model

**Files:**

- Modify in new migration.

- [x] **Step 1: Add transcript edit RPC**

Create `public.update_transcript_segments(...)` as a scoped GM-facing RPC. It must enforce same segment count/order/bounds and only allow `text` and `deleted` changes.

- [x] **Step 2: Preserve citation audit**

The edit RPC must never update `sources.raw_excerpt`. Add or update a read helper such as `public.get_transcript_source_context(...)` so the UI can compare frozen citation text with the current segment text.

**C4 implementation note (2026-07-21):** `get_transcript_source_context(source_id)` is now internal-only. Browser surfaces call `get_draft_source_context(workspace_id, world_id, saga_id, draft_id)`, which verifies the exact draft junction and Session/transcript scope before returning display-safe frozen/current evidence and drift state. This prevents arbitrary source-ID probing and identifier leakage.

- [x] **Step 3: Queue re-embedding marker**

If transcript text changes, expose a small internal job marker or pipeline flag that Module 8 can use to re-embed edited transcript chunks later. Do not perform provider work in Module 7.

## Task 5: Implement Cleanup Job Idempotency

**Files:**

- Modify in new migration.

- [x] **Step 1: Add cleanup idempotency keys**

Add an idempotency key to `internal.cleanup_jobs` and `internal.export_jobs` where needed so audio, saga, and export cleanup can safely retry.

- [x] **Step 2: Add cleanup enqueue helpers**

Create internal helpers for `audio`, `saga`, and expired `exports` cleanup. Helpers should upsert jobs and include storage prefixes/paths in payloads; Module 8 performs actual Storage deletion.

- [x] **Step 3: Add saga cleanup trigger**

Queue saga cleanup when a Saga is soft-deleted, while continuing to block deletion during `in_progress` / `ended_pending_undo` sessions.

## Task 6: Verify Module 7

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

- Audio upload metadata cannot cross Workspace / World / Saga / Session boundaries.
- Audio chunk registration is idempotent and quota-metered once.
- Transcription jobs produce transcript rows or explicit failure state.
- Transcript edits preserve frozen citations and expose drift context.
- Audio cleanup, saga cleanup, and expired export cleanup are idempotent job contracts.
- Module 8 can add Edge workers without changing these database contracts.
- `npm run backend:baseline:reset` passes.

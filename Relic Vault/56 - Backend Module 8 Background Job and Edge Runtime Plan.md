---
status: active
authority: secondary
scope: planning
read_after:
  - "[[00 - Start Here]]"
  - "[[21 - Tech Architecture]]"
  - "[[22 - Memory and Retrieval]]"
  - "[[46 - Backend Audit and Module Plan]]"
depends_on:
  - "[[20 - Entity and Canon Schema]]"
  - "[[21 - Tech Architecture]]"
  - "[[22 - Memory and Retrieval]]"
  - "[[46 - Backend Audit and Module Plan]]"
  - "[[52 - Backend Module 4 Retrieval and Embeddings Plan]]"
  - "[[55 - Backend Module 7 Storage Audio Transcription Cleanup Plan]]"
supersedes: []
last_audited: 2026-06-01
source_file: "Relic Vault/56 - Backend Module 8 Background Job and Edge Runtime Plan.md"
---

# Backend Module 8 Background Job and Edge Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the async backbone shared by embeddings, transcription, cleanup, export, notifications, and later AI runtime work without introducing provider-specific AI behavior yet.

**Architecture:** Add database job-runtime contracts for claim/complete/retry/dead-letter behavior and scaffold Supabase Edge Functions around a small shared runtime. `issue-scoped-jwt` is the only function allowed to hold the JWT secret. Worker functions use internal service-to-service auth, claim jobs with `SKIP LOCKED`, and re-enter user-data paths with scoped user identity unless a service-role exception is explicitly documented for post-delete cleanup. Logs and errors must be operator-useful without exposing secrets or prompt/user content.

**Tech Stack:** Supabase PostgreSQL, `internal.*` job queues, pgTAP, Supabase Edge Functions (Deno), shared function utilities, repo verification scripts.

---

## Current Runtime Backend Observed

Verified during Module 8 planning on 2026-06-01:

- `supabase/functions` contains only `.gitkeep`.
- Internal queue tables exist for embeddings, transcription, cleanup, exports, stale-pipeline warnings, notifications, and dead letters.
- Module 4 adds embedding enqueue/materialization helpers but no generic worker claim/retry/dead-letter runtime.
- Module 7 adds transcription and cleanup contracts but no Edge dispatcher.
- There is no scoped JWT issuer, shared Edge auth utility, worker runtime scaffold, or tests proving internal-token enforcement.

## Implementation Status

Implemented on 2026-06-02 in `supabase/migrations/20260601235500_job_runtime.sql` and `supabase/functions/`.

- Internal queue tables now have normalized scheduling, lock, attempt, and idempotency metadata where needed.
- Claim helpers for embedding, transcription, cleanup, export, and notification jobs mark due work `running` with `FOR UPDATE SKIP LOCKED` semantics.
- Generic completion, retry, dead-letter, failure-surfacing, and stalled-job watchdog helpers are covered by pgTAP.
- `issue-scoped-jwt` is the only Edge Function that reads `SUPABASE_JWT_SECRET`; shared helpers enforce internal bearer auth and scoped-client issuance.
- Dispatcher stubs exist for embeddings, transcription, cleanup, export, notifications, and transcript re-embedding without provider-specific work.
- Source-safety tests verify the Edge Function tree, secret hygiene, shared runtime usage, and scoped-JWT secret isolation.
- Verification: `npm run test:supabase` passed with 193 tests, `npm run test:scripts` passed with 7 tests, `npm run verify` passed, `npx pnpm@10.11.0 --filter @relic/web test` passed with 14 tests, and `npm run backend:baseline:reset` completed with `RELIC_BACKEND_BASELINE_OK`.

## Files

- Create: `Relic Vault/56 - Backend Module 8 Background Job and Edge Runtime Plan.md`
- Create: `supabase/tests/job_runtime.sql`
- Create: `supabase/migrations/<timestamp>_job_runtime.sql`
- Create: `supabase/functions/_shared/*.ts`
- Create: `supabase/functions/issue-scoped-jwt/index.ts`
- Create: dispatcher stubs under `supabase/functions/*/index.ts` for runtime-owned workers.
- Create or modify: script tests for function source safety if needed.
- Modify: `Relic Vault/46 - Backend Audit and Module Plan.md`
- Modify: `Relic Vault/02 - Source Map.md`
- Modify: `Relic Vault/04 - Final Contradiction Pass.md`

## Task 1: Add Failing Job Runtime Tests

**Files:**

- Create: `supabase/tests/job_runtime.sql`

- [x] **Step 1: Seed queue fixtures**

Create representative pending jobs for embedding, transcription, cleanup, export, and notification queues.

- [x] **Step 2: Prove claim semantics**

Assert claim helpers:

- Select only due `pending` jobs.
- Mark claimed jobs `running`.
- Set `started_at` / `updated_at` where available.
- Increment attempts only on retry/failure, not on claim.
- Use `FOR UPDATE SKIP LOCKED` behavior where concurrent claims do not return the same job.

- [x] **Step 3: Prove retry and backoff semantics**

Assert transient failure helpers:

- Return jobs to `pending`.
- Increment `attempts`.
- Set next schedule/debounce time according to queue-specific retry policy.
- Preserve a sanitized failure reason.

- [x] **Step 4: Prove dead-letter semantics**

Assert exhausted jobs:

- Move to `failed`.
- Insert one `internal.dead_letter_jobs` row with job table, job id, payload, and sanitized failure reason.
- Do not duplicate dead-letter rows on repeated failure handling.

- [x] **Step 5: Prove GM-visible state updates**

Assert transcription, cleanup/export, and pipeline-facing failures surface to the relevant product row where the UI can show retry/failure state.

## Task 2: Implement Database Job Runtime Contracts

**Files:**

- Create: `supabase/migrations/<timestamp>_job_runtime.sql`

- [x] **Step 1: Normalize queue metadata**

Add missing `scheduled_at`, `started_at`, `updated_at`, `max_attempts`, `locked_by`, and `locked_at` columns where needed without changing existing public contracts.

- [x] **Step 2: Add queue-specific claim helpers**

Create internal claim helpers for:

- `internal.claim_embedding_job(worker_id text)`
- `internal.claim_transcription_job(worker_id text)`
- `internal.claim_cleanup_job(worker_id text)`
- `internal.claim_export_job(worker_id text)`
- `internal.claim_notification_job(worker_id text)`

Use queue-specific due-time columns and `FOR UPDATE SKIP LOCKED`.

- [x] **Step 3: Add completion/failure helpers**

Create internal helpers that complete, retry, or dead-letter jobs with queue-specific attempt limits and backoff curves from [[21 - Tech Architecture]].

- [x] **Step 4: Add stalled-job watchdog**

Create an internal function to reset stale `running` jobs to `pending` when `locked_at` exceeds the queue's timeout threshold.

## Task 3: Scaffold Edge Function Runtime

**Files:**

- Create shared files under `supabase/functions/_shared/`.
- Create `supabase/functions/issue-scoped-jwt/index.ts`.
- Create dispatcher stubs.

- [x] **Step 1: Shared internal auth**

Add a helper that checks `Authorization: Bearer <INTERNAL_TOKEN>` and returns typed errors without logging token values.

- [x] **Step 2: Scoped JWT issuer**

Implement `issue-scoped-jwt` as the only function that reads `SUPABASE_JWT_SECRET`. It validates internal auth, requires `gm_user_id` and `purpose`, returns a short-lived authenticated JWT, and never grants service-role claims.

- [x] **Step 3: Scoped Supabase client helper**

Add a helper for worker functions to request a scoped JWT from `issue-scoped-jwt` and construct a Supabase client using the anon key plus the scoped bearer token.

- [x] **Step 4: Worker runtime wrapper**

Add a shared wrapper that:

- Accepts only internal calls.
- Claims one job.
- Runs a queue-specific handler.
- Completes, retries, or dead-letters based on the handler result.
- Emits sanitized structured logs.

## Task 4: Add Dispatcher Stubs Without Provider Work

**Files:**

- Create worker folders under `supabase/functions/`.

- [x] **Step 1: Embedding dispatcher stub**

Scaffold `embed-row-dispatch` so it claims embedding jobs and reaches a handler boundary. Provider embedding calls remain disabled until configured; test mode can mark a job failed/retryable without user-data writes.

- [x] **Step 2: Transcription dispatcher stub**

Scaffold `transcribe-session` around Module 7 transcription helpers. Do not call Whisper yet unless explicit test-mode input is supplied.

- [x] **Step 3: Cleanup dispatcher stub**

Scaffold cleanup workers that can claim jobs and expose the service-role exception for post-delete Storage cleanup. Actual Storage deletion can be implemented behind the stub with idempotent behavior.

- [x] **Step 4: Export and notification stubs**

Scaffold dispatchers sufficiently for claim/retry/dead-letter behavior. Module 10 owns full export generation and notification provider integration.

## Task 5: Verify Runtime Source Safety

**Files:**

- Create or modify script tests if needed.

- [x] **Step 1: Secret hygiene tests**

Assert function source files reference secret env var names but do not contain literal secret values, local keys, or checked-in bearer tokens.

- [x] **Step 2: Internal auth tests**

Add lightweight tests for internal auth helper behavior if the repo test harness can run them without Deno deployment.

- [x] **Step 3: Function tree verification**

Update repo verification if needed so expected function folders and shared files are present.

## Task 6: Verify Module 8

**Files:**

- Modify: vault status notes

- [x] **Step 1: Run focused SQL tests**

Run:

```powershell
npm run test:supabase
```

- [x] **Step 2: Run script/source tests**

Run:

```powershell
npm run test:scripts
npm run verify
```

- [x] **Step 3: Run web tests**

Run:

```powershell
npx pnpm@10.11.0 --filter @relic/web test
```

- [x] **Step 4: Run full backend baseline**

Run:

```powershell
npm run backend:baseline:reset
```

- [x] **Step 5: Update vault status**

Record passing verification in this plan and [[46 - Backend Audit and Module Plan]].

## Done Criteria

- Queue workers can claim, complete, retry, and dead-letter jobs without duplicate processing.
- User-data jobs run through scoped user identity unless a service-role exception is documented and tested.
- `issue-scoped-jwt` is the only function that touches `SUPABASE_JWT_SECRET`.
- Edge Function scaffolding exists for runtime-owned workers without provider-specific AI behavior.
- Failure states are inspectable by operators and visible to the relevant product surfaces.
- Logs and source files do not expose secrets, tokens, prompts, or private user content.
- `npm run backend:baseline:reset` passes.

---
status: active
authority: secondary
scope: planning
read_after:
  - "[[00 - Start Here]]"
  - "[[20 - Entity and Canon Schema]]"
  - "[[21 - Tech Architecture]]"
  - "[[25 - Pricing and Rate Limits]]"
  - "[[46 - Backend Audit and Module Plan]]"
depends_on:
  - "[[21 - Tech Architecture]]"
  - "[[25 - Pricing and Rate Limits]]"
  - "[[46 - Backend Audit and Module Plan]]"
  - "[[56 - Backend Module 8 Background Job and Edge Runtime Plan]]"
supersedes: []
last_audited: 2026-06-02
source_file: "Relic Vault/58 - Backend Module 10 Notifications Export Operations Plan.md"
---

# Backend Module 10 Notifications Export Operations Plan

> **For agentic workers:** implement this plan task-by-task with RED tests first. Keep provider calls behind adapters and preserve manual fallback for all failed async work.

**Goal:** Close the non-core backend loops that keep GM workflows from stalling: pipeline notifications, stale review warnings, export generation/download state, export TTL cleanup, and Storage cleanup dispatch.

**Architecture:** Add database contracts for notification enqueue, stale pipeline scanning, export request/preflight, export job completion state, and cleanup finalization. Replace Module 8 placeholder Edge handlers for exports, cleanup, and notifications with deterministic provider/storage adapters that can pass local tests without real Resend, Expo, or Storage deletion credentials. Keep direct browser writes blocked; browser-visible surfaces should use scoped RPCs and poll read models.

**Tech Stack:** Supabase PostgreSQL, pgTAP, Module 6 quota/metering, Module 8 job runtime, Supabase Edge Functions, Resend-compatible email adapter, Expo Push-compatible adapter, Supabase Storage service-role operations.

---

## Current Operations Backend Observed

Verified during Module 10 planning on 2026-06-02:

- `internal.export_jobs`, `internal.cleanup_jobs`, `internal.notification_queue`, and `internal.dead_letter_jobs` exist.
- Module 8 added claim/retry/dead-letter helpers for export, cleanup, and notification queues.
- Module 7 added expired export cleanup enqueue and Saga/audio cleanup job enqueue helpers.
- `export-saga`, `cleanup-audio`, `cleanup-saga`, and `send-notification` Edge Functions still return Module 8 placeholder retry responses.
- There is no browser-scoped export request RPC, export status/read RPC, signed export download RPC, notification preference/device RPC, pipeline-ready/failed notification enqueue trigger, stale-pipeline scanner, or notification provider adapter.

## Files

- Create: `supabase/tests/operations_notifications_export.sql`
- Create: `supabase/migrations/<timestamp>_operations_notifications_export.sql`
- Modify: `supabase/functions/export-saga/index.ts`
- Modify: `supabase/functions/cleanup-audio/index.ts`
- Modify: `supabase/functions/cleanup-saga/index.ts`
- Modify: `supabase/functions/send-notification/index.ts`
- Create/update: `supabase/functions/_shared/export-*.ts`, `notification-*.ts`, and `storage-cleanup-*.ts`
- Modify: `supabase/tests/access_control.sql`
- Modify: `supabase/security/rpc-boundary.md`
- Modify: `scripts/edge-runtime-source.test.mjs`
- Modify: [[46 - Backend Audit and Module Plan]], [[02 - Source Map]], [[04 - Final Contradiction Pass]]

## Task 1: Add Failing Operations Tests

- [ ] **Step 1: Prove export request and quota preflight**

Assert `request_saga_export(...)` validates Workspace / World / Saga scope, blocks exhausted `exports_monthly` quota, enforces one active export job per Saga, writes one idempotent `internal.export_jobs` row, and records export usage exactly once when a job completes.

- [ ] **Step 2: Prove export status and download boundary**

Assert `get_saga_export_status(...)` and `get_saga_export_download(...)` return only scoped export metadata, hide internal payloads, reject expired/failed jobs, and preserve signed-download URL generation behind worker/service context.

- [ ] **Step 3: Prove pipeline notification enqueue**

Assert pipeline state changes to `ready_for_review` and `failed` enqueue one `pipeline_ready` or `pipeline_failed` notification, dedupe by idempotency key, and suppress notifications while a Session is `in_progress` or `ended_pending_undo`.

- [ ] **Step 4: Prove stale pipeline scan**

Assert stale scan marks 30-day and 90-day fields, enqueues the matching notification once, and never auto-archives drafts or pipeline rows.

- [ ] **Step 5: Prove notification dispatch boundaries**

Assert notification dispatch reads latest GM preferences at send time, skips disabled channels, marks sent/skipped/failed with sanitized failure reasons, and dead-letters after retry exhaustion.

- [ ] **Step 6: Prove cleanup finalization**

Assert audio, Saga, and export cleanup jobs mark completion idempotently, skip notifications for deleted Sagas, and never delete rows outside the job's Workspace / World / Saga path.

## Task 2: Implement Export RPCs and Job Contracts

- [ ] **Step 1: Add request RPC**

Create `public.request_saga_export(...)` to assert Saga access, run quota preflight for `export`, enforce one active export job, enqueue `internal.export_jobs`, and return export id/status.

- [ ] **Step 2: Add status/download RPCs**

Create scoped read RPCs for export job state and signed download readiness. Download URLs must not expose service credentials or internal Storage paths to unauthorized users.

- [ ] **Step 3: Add export completion helper**

Add worker-only completion helper that stores `storage_path`, marks complete, sets TTL, and records export usage with an idempotency key.

## Task 3: Implement Notification Enqueue and Preferences

- [ ] **Step 1: Add preference/device RPCs**

Expose scoped notification preference and push-device registration/update/delete RPCs if missing from the schema boundary.

- [ ] **Step 2: Add pipeline notification enqueue**

Add trigger/helper behavior for `pipeline_ready` and `pipeline_failed`, with idempotency keys and active-session suppression.

- [ ] **Step 3: Add stale scan helper**

Add `internal.scan_stale_pipelines(...)` to mark 30-day/90-day stale metadata and enqueue notifications without auto-archiving.

## Task 4: Implement Edge Workers

- [ ] **Step 1: Export worker**

Replace the export placeholder with a deterministic archive builder in test mode, scoped data reads, Storage upload abstraction, storage path writeback, and usage charging.

- [ ] **Step 2: Cleanup workers**

Replace cleanup placeholders with Storage cleanup adapters for audio, Saga, and expired exports. Mark jobs complete with deleted/skipped path counts and keep behavior idempotent.

- [ ] **Step 3: Notification worker**

Replace notification placeholder with email/push adapters. In test mode, record provider intent in job payload and mark sent/skipped according to latest preferences.

## Task 5: Verify Module 10

- [ ] **Step 1: Run focused SQL tests**

```powershell
supabase test db supabase/tests/operations_notifications_export.sql
```

- [ ] **Step 2: Run full Supabase tests**

```powershell
npm run test:supabase
```

- [ ] **Step 3: Run script/source tests and repo verify**

```powershell
npm run test:scripts
npm run verify
```

- [ ] **Step 4: Run web tests**

```powershell
npx pnpm@10.11.0 --filter @relic/web test
```

- [ ] **Step 5: Run full backend baseline**

```powershell
npm run backend:baseline:reset
```

- [ ] **Step 6: Update vault status**

Record passing verification in this plan and [[46 - Backend Audit and Module Plan]].

## Done Criteria

- Pipeline completion and failure enqueue reliable, deduped notifications.
- Stale review queues surface at 30 and 90 days without auto-archiving.
- Notification preferences and device state gate sends at dispatch time.
- Export requests are quota-scoped, idempotent, downloadable, and expired by TTL cleanup.
- Cleanup jobs are idempotent and scoped to the intended Storage paths.
- Worker logs do not include secrets, provider tokens, email bodies, push tokens, or raw export contents.
- `npm run backend:baseline:reset` passes.

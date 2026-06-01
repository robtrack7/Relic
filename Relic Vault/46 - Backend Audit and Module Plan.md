---
status: active
authority: secondary
scope: planning
read_after:
  - "[[00 - Start Here]]"
depends_on:
  - "[[20 - Entity and Canon Schema]]"
  - "[[21 - Tech Architecture]]"
  - "[[22 - Memory and Retrieval]]"
  - "[[23 - AI Task Registry]]"
  - "[[24 - Approval Queue]]"
  - "[[25 - Pricing and Rate Limits]]"
  - "[[41 - Foundation Implementation Plan]]"
  - "[[43 - AI Runtime Implementation Plan]]"
supersedes: []
last_audited: 2026-06-01
source_file: "Relic Vault/46 - Backend Audit and Module Plan.md"
---

# Backend Audit and Module Plan

## Purpose

This note audits the backend implementation as of 2026-06-01 and breaks the remaining backend work into modules that can be completed and verified methodically before deeper UI work.

## Current Readiness

**Backend status: foundation partially wired, product backend not complete.**

The repository has a substantial Supabase foundation:

- Workspace / World / Era / Saga hierarchy tables are present.
- Canon tables, sessions, notes, sources, drafts, audit, embeddings, usage tables, storage buckets, and internal job tables exist.
- RLS is enabled on public user-data tables.
- Browser writes have been narrowed behind scoped RPCs.
- Basic manual web flows call Supabase RPCs for auth/bootstrap, manual entity CRUD, sessions, prep, Stage captures, and draft state changes.
- `search_for_ui`, `retrieve_for_task`, `check_quota_preflight`, and `get_workspace_usage_summary` exist as database functions.
- Foundation tests cover key RLS, quota, draft, retrieval, and storage-path cases.

The backend is not yet wired end-to-end for the MVP trust loop:

- Approval does not commit canon changes. `update_draft_state()` changes draft state only; it does not apply approved payloads, write audit rows, or handle edit-and-approve, merge, archive, conflict checks, or `draft_sources`.
- Manual canon writes do not yet create synthetic `sources`, `canon_audit`, embedding jobs, or mention re-detection jobs.
- Retrieval is currently lexical/trigram fallback behavior, not the specified hybrid BM25 + pgvector RRF path over current embeddings.
- `retrieve_for_task` does not yet implement the full filter contract for source kinds, note types, excluded entities, pending-draft exceptions, hard-canon tasks, or vector ranking.
- `supabase/functions` is empty, so embedding, transcription, synthesis, scoped JWT issuance, cleanup, export, notification, and AI runtime workers are not implemented.
- Usage quota preflight exists, but charging, rollup updates, idempotent usage writers, concurrency controls, and job retry accounting are not wired.
- Storage buckets and path RLS exist, but signed upload, audio retention, export generation, and cleanup flows are not wired.
- Session status updates are callable, but the database does not yet enforce the six-state transition machine.
- Notification and stale-pipeline queue tables exist, but no enqueue triggers, dispatcher, email, or push worker exists.

## Backend Modules

### Module 0 - Baseline Verification and Migration Hygiene

**Goal:** Establish the current backend baseline before changing behavior.

Detailed execution plan: [[47 - Backend Module 0 Baseline Plan]].

**Owns:**

- Local Supabase reset/test procedure.
- Migration ordering and repeatability.
- CI parity for `npm run verify`, web unit tests, and Supabase SQL tests.
- Explicit list of deferred foundation risks.

**Done when:**

- `npm run verify` passes.
- Web unit tests pass.
- Supabase SQL tests pass locally or the blocker is documented.
- The migration chain can reset from empty database to working fixtures.

### Module 1 - Access Control, RLS, and RPC Boundary

**Goal:** Lock the browser/backend boundary before product behavior grows.

**Owns:**

- Public table grants.
- RLS policy consistency.
- Scoped RPC access checks.
- Security-definer review for every callable RPC.
- Tests for cross-Workspace, cross-World, sibling-Saga, and anonymous denial.

**Done when:**

- Every browser-callable write path goes through a scoped RPC.
- Every security-definer function has a documented reason, fixed `search_path`, and explicit ownership checks.
- Retrieval functions either inherit RLS as specified or have a documented accepted deviation with equivalent tests.

### Module 2 - Canon Write Path, Sources, and Audit

**Goal:** Make every canon mutation provenance-safe.

**Owns:**

- Direct GM create/update/archive write path.
- Synthetic `sources` rows for direct GM writes.
- `canon_audit` rows for manual and approval writes.
- `expected_version` conflict checks for updates and approvals.
- Entity archive/unarchive behavior.
- Saga delete guard while sessions are active.

**Done when:**

- Manual entity CRUD writes audit/provenance consistently.
- No entity-table insert happens outside direct GM action, documented synthetic approval, or Approval Queue commit.
- Tests prove audit rows are append-only and conflicts block blind writes.

### Module 3 - Approval Queue Commit Backend

**Goal:** Turn the Review shell into the MVP trust gate.

**Owns:**

- Approve.
- Edit and approve.
- Reject with enum-backed reasons.
- Merge identity decision plus generated target update draft.
- Archive request approval.
- Broken source checks.
- Citation drift read model.
- Queue list/search over direct `drafts` query.

**Done when:**

- Approving a draft applies the canonical change in one transaction.
- Rejection never writes canon audit.
- Merge does not silently mutate canon.
- Conflict mismatch disables blind approval.

### Module 4 - Search, Retrieval, Embeddings, and Evaluation

**Goal:** Make retrieval match the Memory spec before AI depends on it.

**Owns:**

- Embedding job enqueue triggers.
- Embedding worker contract.
- Entity, note, session, transcript, and quick-capture chunking.
- Real `retrieve_for_task` hybrid lexical/vector RRF.
- `search_for_ui` Stage/Sanctum behavior and Stage timeout fallback.
- Source ID return and citation validation support.
- Canned retrieval eval fixtures.

**Done when:**

- `retrieve_for_task` implements task profiles, filters, hard-canon behavior, source IDs, and sibling-Saga exclusion.
- GM-only fields are never embedded.
- Embedding queue p95 target can be measured.
- Eval fixtures can run with warning thresholds.

### Module 5 - Session Prep and Stage Data Backend

**Goal:** Make manual session prep and live-session data reliable before UI polish.

**Owns:**

- Session status state machine.
- Prep update transactions.
- Pinned entity and active thread validation.
- Quick captures.
- Quick stubs.
- Marked moments.
- Dice rolls.
- Consent log.
- Stage packet read model.

**Done when:**

- Invalid status transitions are rejected at the backend.
- Prep writes preserve valid scoped references only.
- Stage writes do not trigger background AI during `in_progress`.
- Manual Stage data can feed post-session processing later.

### Module 6 - Usage, Quota, and Metering

**Goal:** Make every cost-driving action enforceable and accountable.

**Owns:**

- Shared quota preflight helper.
- Shared usage event writer.
- Monthly rollup updater.
- Idempotency keys.
- AI credit, transcription, storage, import, export, and job retry accounting.
- Admin quota overrides.
- Workspace usage summary read model.

**Done when:**

- Metered work is blocked or warned before starting.
- Manual viewing, editing, and approval are never quota blocked.
- Successful metered work charges exactly once.
- Failed provider work follows Pricing spec charging rules.

### Module 7 - Storage, Audio, Transcription, and Cleanup

**Goal:** Wire the file and audio substrate behind Stage and exports.

**Owns:**

- Signed upload/download flows.
- Audio chunk writes.
- Storage path validation.
- Transcription job enqueue and retry.
- Transcript row creation and editing invariants.
- Audio and transcript retention.
- Saga/export cleanup jobs.

**Done when:**

- Audio upload cannot cross Workspace / World / Saga boundaries.
- Transcription jobs produce transcript rows or explicit failure state.
- Transcript edits preserve frozen citations and drift detection inputs.
- Cleanup is idempotent.

### Module 8 - Background Job and Edge Function Runtime

**Goal:** Build the async backbone shared by AI, embeddings, storage, and notifications.

**Owns:**

- Edge Function project structure.
- Scoped JWT issuer.
- Job claiming, retry, backoff, dead-lettering, and observability.
- Worker auth model.
- Internal queue tables.
- Operator-safe logs without secrets.

**Done when:**

- User-data jobs run with scoped user context unless a service-role exception is explicitly required.
- Retried jobs are idempotent.
- Dead-letter cases can be inspected.
- Job failures surface to the relevant product state.

### Module 9 - AI Task Router and Runtime

**Goal:** Wire AI only after retrieval, quota, and drafts are trustworthy.

**Owns:**

- Registry-backed task router.
- Prompt versions.
- LiteLLM tier routing.
- Per-task JSON schemas.
- Source ID validation.
- One repair retry.
- Task logs and cost metadata.
- Draft creation for draftable tasks.
- Ephemeral output handling for non-draft tasks.

**Done when:**

- Every AI Task Registry v1.0 task has a backend route, schema, quota behavior, retrieval profile, validation path, failure state, and tests.
- No AI path writes canon directly.
- `compose_prep_briefing` is canon-only.
- `synthesize_session` creates drafts and review artifacts only.

### Module 10 - Notifications, Export, and Operational Loops

**Goal:** Close the non-core loops that keep GM workflows from stalling.

**Owns:**

- Pipeline-ready and failed notification enqueue.
- Stale-pipeline warning jobs.
- Email and mobile push dispatch.
- Export job generation.
- Export TTL cleanup.
- Monitoring events.

**Done when:**

- Pipeline completion reliably notifies the GM.
- Stale queues surface without auto-archiving.
- Export files are generated, scoped, downloadable, and expired.

## Recommended UI Timing

Use the current web app now as a thin smoke-test harness for auth, bootstrap, manual entity CRUD, session prep, and Stage capture flows. Do not invest heavily in new UI polish until Modules 1-3 are complete, because canon writes and Approval Queue behavior are still the backend trust core.

Start building the fuller UI in earnest after Modules 1-5 pass. At that point, the manual MVP loop can be tested through the UI without live AI:

Create -> Organize -> Prep -> Run -> Review -> Approve -> Continue.

AI-facing UI should wait until Modules 4, 6, 8, and 9 pass. Those modules provide retrieval, quota charging, async execution, source validation, and draft creation.

## Immediate Work Order

1. Complete Module 0 and get a repeatable verification baseline.
2. Complete Module 1 security/RPC review and close any security-definer deviations.
3. Complete Module 2 canon provenance for manual writes.
4. Complete Module 3 Approval Queue commit behavior.
5. Use the existing web UI for an end-to-end manual smoke test.
6. Complete Modules 4-9 before enabling AI UI.

## Open Follow-Ups

- Decide whether retrieval functions must be converted back to `security invoker` to match [[22 - Memory and Retrieval]], or whether the current security-definer RPC pattern is accepted with documented equivalent tests.
- Add a dedicated implementation plan for Modules 2-3 before modifying Approval Queue behavior.
- Add a dedicated implementation plan for Modules 4 and 8 before building embedding workers.
- Keep [[43 - AI Runtime Implementation Plan]] gated until retrieval, quota, jobs, and Approval Queue commit are verified.

---
status: active
authority: secondary
scope: planning
read_after:
  - "[[40 - MVP Implementation Planning Sequence]]"
depends_on:
  - "[[20 - Entity and Canon Schema]]"
  - "[[21 - Tech Architecture]]"
  - "[[22 - Memory and Retrieval]]"
  - "[[25 - Pricing and Rate Limits]]"
supersedes: []
last_audited: 2026-05-20
source_file: "Relic Vault/41 - Foundation Implementation Plan.md"
---

# Foundation Implementation Plan

## Goal

Build the non-AI technical foundation for Relic MVP: tenancy, schema, RLS, storage, auth/bootstrap, retrieval infrastructure, usage metering, quota preflight, jobs, and validation harnesses.

## Build Against

- [[20 - Entity and Canon Schema]]
- [[21 - Tech Architecture]]
- [[22 - Memory and Retrieval]]
- [[25 - Pricing and Rate Limits]]
- [[24 - Approval Queue]]

## Implementation Groups

### 1. Supabase Schema and Migrations

- Create the Workspace / World / Era / Saga hierarchy first.
- Add GM profile, entity tables, session fields, notes, relationships, mentions, sources, drafts, draft sources, canon audit, transcripts, audio chunks, marked moments, pipeline runs, dice rolls, consent log, workshop sessions, usage tables, quota overrides, notification tables, and required enums.
- Keep `scope='world'` rows with `saga_id=null` and `scope='saga'` rows with required `saga_id`.
- Preserve V1-ready fields without exposing V1 UI.

### 2. RLS and Storage Boundaries

- Implement helper functions for Workspace/World/Saga membership and hierarchy validation.
- Apply RLS to every public user-data table.
- Add tests for anonymous denial, cross-Workspace denial, cross-World denial, and sibling-Saga exclusion.
- Implement Storage paths with `workspace_id/world_id/saga_id` segments for audio, attachments, and exports.

### 3. Auth and Bootstrap

- Implement Supabase Auth minimum sign-up/sign-in.
- On first app load, create default Workspace if missing.
- Load GM profile, active Workspace, active World, active Saga, and active session.
- Redirect to New saga only when no active Saga or resumable `workshop_sessions` flow exists.

### 4. Retrieval Infrastructure

- Implement `search_for_ui` and `retrieve_for_task` as the only retrieval entrypoints.
- Add `session_prep_grounding`, `sanctum_grounding`, `sanctum_qa_grounding`, `post_session_synthesis`, `approval_queue_context`, and `prep_grounding` compatibility alias.
- Implement hybrid BM25/vector RRF, source ID return, canon/archive filters, sibling-Saga exclusion, and Stage timeout fallback.
- Add an eval fixture with logging/warnings before enforcing thresholds.

### 5. Usage, Quota, and Jobs

- Implement `usage_events`, `usage_monthly_rollups`, `quota_overrides`, and `workspaces.usage_limits`.
- Build a shared quota preflight helper for AI, transcription, storage, import, export, and create limits.
- Add background job queues for embeddings, transcription, cleanup, exports, stale-pipeline warnings, and notifications.
- Ensure jobs touching user data run with scoped user context unless the Tech Architecture explicitly requires service-role operational cleanup.

## Required Tests

- RLS denies every cross-boundary read/write path.
- Saga delete cascades Saga-scoped rows and leaves World-scoped canon intact.
- `search_for_ui` returns current Saga plus World canon and excludes sibling Sagas.
- `retrieve_for_task` rejects hard-canon task draft inclusion for `compose_prep_briefing`.
- Quota preflight blocks metered work but never blocks manual viewing/editing/approval.
- Embedding job execution preserves source IDs and current-canon assembly.
- Storage RLS denies object paths outside the user's Workspace/World/Saga.

## Acceptance

Foundation planning is complete when the schema/RLS/retrieval/quota surfaces can support the manual UI loop and all AI tasks in [[23 - AI Task Registry]] without adding new table families.

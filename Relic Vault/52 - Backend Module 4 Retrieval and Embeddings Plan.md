---
status: active
authority: secondary
scope: planning
read_after:
  - "[[00 - Start Here]]"
  - "[[46 - Backend Audit and Module Plan]]"
  - "[[22 - Memory and Retrieval]]"
depends_on:
  - "[[20 - Entity and Canon Schema]]"
  - "[[21 - Tech Architecture]]"
  - "[[22 - Memory and Retrieval]]"
  - "[[23 - AI Task Registry]]"
  - "[[24 - Approval Queue]]"
  - "[[46 - Backend Audit and Module Plan]]"
supersedes: []
last_audited: 2026-06-01
source_file: "Relic Vault/52 - Backend Module 4 Retrieval and Embeddings Plan.md"
---

# Backend Module 4 Retrieval and Embeddings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make search and AI retrieval match the Memory spec closely enough that later AI runtime work can depend on source-scoped, citeable context.

**Architecture:** Add a forward Supabase migration that creates the deterministic backend contract for embedding jobs, chunk text, queue metrics, and hybrid retrieval while preserving existing web RPC signatures. The actual external embedding provider remains a worker boundary: the database will enqueue jobs, materialize safe chunk text, store vectors when a worker supplies them, and retrieve through one RRF pipeline over lexical rows plus current `embeddings` rows. This keeps the rough UI testable without requiring provider keys.

**Tech Stack:** Supabase PostgreSQL, pgvector, pgTAP, `internal.embedding_jobs`, `public.embeddings`, existing `search_for_ui` and `retrieve_for_task` RPCs.

---

## Current Retrieval Backend Observed

Verified during Module 4 planning on 2026-06-01:

- `internal.embedding_jobs` exists but no trigger/helper currently queues entity, note, session, or transcript embedding work.
- `public.embeddings` exists with `extensions.vector(1536)`, `chunk_text`, `source_id`, and current-row flags.
- `search_for_ui` and `retrieve_for_task` are currently implemented as lexical plus trigram fallback, not true lexical/vector RRF.
- `retrieve_for_task` already returns `source_id`, but only partially implements filters and profile mapping.
- `sources` rows are now written for manual canon changes and draft approvals, so Module 4 can return citations without inventing a new provenance table.
- The web search page currently depends on the existing `search_for_ui` return shape, so this module should not add required return columns to that RPC before rough UI testing.

## Implementation Status

Implemented on 2026-06-01 in `supabase/migrations/20260601210000_retrieval_embedding_contract.sql`.

- Embedding queue helpers and triggers exist for entity, session, and embeddable note content.
- The local worker-contract helper materializes safe chunks without provider keys; external provider dispatch remains a later runtime concern.
- `retrieve_for_task` now uses lexical/vector RRF when a query vector is supplied and preserves lexical retrieval when no provider vector exists.
- `search_for_ui` keeps the rough UI signature stable and provides the Stage lexical fallback path.
- Queue metrics and canned retrieval eval fixtures are present under `internal`.
- Verification: `npm run test:supabase` passed with 85 tests, `npx pnpm@10.11.0 --filter @relic/web test` passed with 14 tests, and `npm run backend:baseline:reset` completed with `RELIC_BACKEND_BASELINE_OK` on 2026-06-01.

## Files

- Create: `supabase/tests/retrieval_embeddings.sql`
- Create: `supabase/migrations/<timestamp>_retrieval_embedding_contract.sql`
- Modify: `supabase/security/rpc-boundary.md` if new browser-executable or internal security-definer functions are added.
- Modify: `Relic Vault/46 - Backend Audit and Module Plan.md`
- Modify: `Relic Vault/02 - Source Map.md`
- Modify: `Relic Vault/04 - Final Contradiction Pass.md`

## Task 1: Add Failing Retrieval and Embedding Tests

**Files:**

- Create: `supabase/tests/retrieval_embeddings.sql`

- [x] **Step 1: Seed scoped retrieval fixtures**

Create two users, one workspace/world, a target Saga, a sibling Saga, a world-scoped entity, a saga-scoped entity, an archived entity, one session, lore/summary/quick-capture/gm-note notes, source rows, and one pending draft. Use deterministic UUIDs so failures are readable.

- [x] **Step 2: Prove embedding enqueue behavior**

Assert:

- Creating a character through `create_entity` creates or refreshes one pending `internal.embedding_jobs` row.
- Updating only `gm_notes` does not create a new current embedding chunk containing the private text.
- Creating a `note_type='gm_note'` note does not enqueue an embedding job.
- Creating a lore or summary note does enqueue a note job.
- Creating or updating session prep fields queues a session job.

- [x] **Step 3: Prove safe chunk materialization**

Assert `public.materialize_embedding_job_for_test(job_id)` or the worker-contract helper:

- Writes `embeddings.chunk_text` for entity, note, and session jobs.
- Excludes entity/session `gm_notes`.
- Excludes `note_type='gm_note'`.
- Preserves `source_id`, `workspace_id`, `world_id`, `saga_id`, `scope`, source kind, entity type, and chunk index.
- Marks prior chunks for the same source/model/model_version as `is_current=false`.

- [x] **Step 4: Prove `retrieve_for_task` filters**

Assert:

- Sibling Saga and archived rows are excluded.
- World canon and target Saga canon are included when the profile allows world canon.
- `filters.session_id` restricts session-backed rows.
- `filters.source_kinds` applies to `sources.kind`.
- `filters.note_types` applies only to note-backed rows and can target `summary` or `quick_capture`.
- `filters.exclude_entity_id` excludes the focus entity.
- `compose_prep_briefing` stays hard-canon and does not return pending drafts even if `include_pending_drafts_for_entity` is supplied.

- [x] **Step 5: Prove hybrid RRF and citation support**

Insert test vectors into `public.embeddings` for two rows and call `retrieve_for_task` with `filters.query_embedding` as a vector literal string. Assert:

- `vector_rank` is populated for vector candidates.
- `bm25_rank` is populated for lexical candidates.
- `rrf_score` is ordered by reciprocal-rank fusion, not raw trigram similarity.
- Result rows include non-null `source_id` when source rows exist.

- [x] **Step 6: Prove queue metrics and eval fixtures**

Assert `internal.embedding_queue_metrics()` returns pending/running counts plus measurable p95 queue age, and add a non-blocking retrieval eval view/table with warning thresholds for canned queries.

## Task 2: Implement Embedding Queue and Worker Contract

**Files:**

- Create: `supabase/migrations/<timestamp>_retrieval_embedding_contract.sql`

- [x] **Step 1: Add safe content helpers**

Create internal helpers that produce canonical chunk text:

- Entity: `name`, `summary`, `narrative`, and `objective` for threads.
- Session: `name`, `summary`, `narrative`, `objective`, and `opening_scene`.
- Note: `title` and `body` for `lore`, `summary`, and post-session `quick_capture`; never `gm_note`.
- Transcript: deterministic 60s windows with 10s overlap through source rows; vector insertion can wait for worker input.

- [x] **Step 2: Add queue helper**

Create `public.enqueue_embedding_job(...)` or an internal equivalent with fixed `search_path`. It must upsert by `(source_kind, source_entity_id, model, model_version)`, debounce repeated substantive edits, keep `source_id`, and never grant direct browser execution unless the boundary doc and tests explicitly allow it.

- [x] **Step 3: Add triggers**

Attach triggers to `characters`, `places`, `factions`, `artifacts`, `threads`, `sessions`, and `notes`. Triggers enqueue only on insert or substantive content changes. `gm_notes`-only edits must be no-ops for embedding jobs.

- [x] **Step 4: Add worker materialization contract**

Create a database function that the eventual worker can use to materialize chunk rows after it has provider embeddings. For local tests, allow chunk text materialization with null vectors so the backend can validate scope, source IDs, and GM-only exclusion without provider keys.

- [x] **Step 5: Add queue metrics**

Create `internal.embedding_queue_metrics()` with pending/running/failed counts and p95 queue age. Keep it internal unless the UI needs a public read model in a later module.

## Task 3: Replace Retrieval RPC Implementations

**Files:**

- Modify in new migration: `public.search_for_ui(...)`
- Modify in new migration: `public.retrieve_for_task(...)`

- [x] **Step 1: Build shared scoped corpus CTE**

Use one corpus shape for entities, sessions, and notes with workspace/world/saga scope, source IDs, source kinds, note types, canon state, session IDs, search vectors, and current embedding rows.

- [x] **Step 2: Implement lexical ranking**

Rank lexical candidates with `websearch_to_tsquery` and `ts_rank_cd`. Literal UI mode should use only this lexical arm.

- [x] **Step 3: Implement vector ranking**

When `filters.query_embedding` is present for `retrieve_for_task`, cast it to `extensions.vector(1536)` and rank current non-null embeddings by cosine distance. When no query vector is present, skip the vector arm instead of using trigram as a fake semantic score.

- [x] **Step 4: Fuse with RRF**

Fuse lexical and vector candidate ranks with `1 / (60 + rank)`. Return `bm25_rank`, `vector_rank`, and `rrf_score`.

- [x] **Step 5: Preserve `search_for_ui` compatibility**

Keep the existing `search_for_ui` signature and return columns. For `surface='stage'`, literal mode remains fast lexical fallback. Hybrid mode should use current embeddings only if the caller later provides query-vector support through a separate interface; do not block rough UI on provider setup.

- [x] **Step 6: Enforce profile and filter contracts**

Map AI task names to retrieval profiles, enforce profile defaults, support `session_id`, `source_kinds`, `note_types`, `exclude_entity_id`, and hard-canon behavior for `compose_prep_briefing`.

## Task 4: Verify Module 4

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

- `retrieve_for_task` implements task profiles, filters, hard-canon behavior, source IDs, and sibling-Saga exclusion.
- GM-only fields and `gm_note` notes are never embedded.
- Embedding job enqueue and worker materialization contracts are tested.
- Embedding queue p95 can be measured.
- Hybrid retrieval uses real current embeddings when a query vector is supplied.
- Eval fixtures can run and report warning thresholds without blocking backend baseline.
- `npm run backend:baseline:reset` passes.

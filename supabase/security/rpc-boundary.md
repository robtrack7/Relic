# Relic RPC Boundary

This document records the short-term backend boundary used for the rough UI milestone. The catalog tests in `supabase/tests/access_control.sql` are the executable version of this document.

## Boundary Rules

- Browser roles must not write Relic user-data tables directly.
- Browser writes go through scoped RPCs that validate Workspace, World, and Saga ownership server-side.
- Browser-callable functions are granted to `authenticated` only.
- `anon` must not execute public functions directly.
- Every public `security definer` function must set a fixed `search_path`.
- Scoped RPCs must reject cross-Workspace, cross-World, and sibling-Saga data.
- Storage object writes remain governed by Supabase storage grants plus storage RLS policies.

## Accepted Short-Term Deviation

The current rough-UI backend keeps browser RPCs in the `public` schema and uses `security definer` functions for scoped operations. This is acceptable for the backend wiring milestone because direct table writes are revoked, callable functions are allowlisted, and tests enforce the grant boundary.

Revisit this before production hardening or multi-tenant collaboration work. A dedicated exposed API schema would make the callable surface easier to reason about than public-schema RPCs.

## Browser-Callable RPCs

| RPC | Purpose |
|---|---|
| `ensure_default_workspace()` | Bootstrap a first authenticated Workspace. |
| `get_bootstrap_context()` | Load authenticated app shell context. |
| `get_saga_context(workspace_id, world_id, saga_id)` | Load scoped Saga context. |
| `create_blank_saga(...)` | Create a scoped first-run Saga. |
| `list_worlds_for_workspace()` | List Worlds available to the authenticated Workspace owner. |
| `create_entity(...)` | Create manual canon rows through a scoped path. |
| `update_entity(...)` | Update manual canon rows through a scoped path. |
| `archive_entity(..., expected_version)` | Archive canon rows through a scoped conflict-checked path. |
| `append_thread_objective(...)` | Update a Thread objective through a scoped path. |
| `create_session(...)` | Create a Session through a scoped path. |
| `update_session_prep(...)` | Update prep fields, pins, and active threads through scoped validation. |
| `set_session_status(...)` | Update Session status through a scoped path. |
| `quick_capture(...)` | Add a Stage quick-capture note. |
| `quick_stub(...)` | Add a Stage quick-stub entity. |
| `mark_moment(...)` | Add a Stage marked moment. |
| `record_session_consent(...)` | Record per-session Stage recording consent. |
| `record_dice_roll(...)` | Record per-session Stage dice history. |
| `get_stage_packet(...)` | Read a scoped Stage packet for rough UI smoke testing. |
| `get_audio_upload_target(...)` | Build a scoped deterministic audio Storage upload target. |
| `register_audio_chunk(...)` | Register uploaded audio chunk metadata and meter storage once. |
| `enqueue_transcription_job(...)` | Queue scoped transcription work for a Session. |
| `update_transcript_segments(...)` | Edit transcript segment text/deleted flags while preserving timestamp boundaries. |
| `get_transcript_source_context(...)` | Read frozen citation text beside current transcript text for drift display. |
| `update_draft_state(...)` | Resolve drafts and commit approved create/update/archive-request drafts to canon. |
| `list_entities(...)` | Read scoped entity lists. |
| `get_sessions_for_saga(...)` | Read scoped Session lists. |
| `get_session_pinned_entities(...)` | Read scoped pinned entities. |
| `get_session_active_threads(...)` | Read scoped active threads. |
| `get_pending_drafts(...)` | Read scoped pending drafts. |
| `get_workspace_usage_summary(...)` | Read scoped usage summary. |
| `check_quota_preflight(...)` | Check quota before metered work. |
| `preflight_ai_task(...)` | Check Registry v1.0 task contract and quota before starting AI work. |
| `record_usage_event(...)` | Record an idempotent usage event and update monthly rollups. |
| `search_for_ui(...)` | Run scoped lexical UI search. |
| `retrieve_for_task(...)` | Run scoped retrieval for AI/task contexts. |

## Callable Helpers

These helpers are callable by `authenticated` because RLS policies or storage policies need them:

- `active_saga_matches(uuid)`
- `user_owns_workspace(uuid)`
- `user_is_workspace_member(uuid)`
- `world_belongs_to_workspace(uuid, uuid)`
- `saga_belongs_to_world(uuid, uuid)`
- `scoped_row_allowed(uuid, uuid, uuid, content_scope)`
- `saga_row_allowed(uuid, uuid, uuid)`
- `storage_path_allowed(text)`
- `storage_path_segment(text, integer)`

## Internal Definer Helpers

These public-schema helpers are `security definer` because they are called by scoped RPCs or triggers, but they are not directly executable by browser roles:

- `assert_saga_access(...)`
- `scoped_entity_exists(...)`
- `write_manual_canon_source(...)`
- `write_manual_canon_audit(...)`
- `materialize_embedding_job_for_test(...)`
- AI worker wrappers: `get_ai_task_run_for_worker(...)`, `record_ai_task_output_for_worker(...)`, `mark_ai_task_run_failed_for_worker(...)`, and `set_ai_task_usage_for_worker(...)`
- validation trigger helpers for session pins, active threads, notes, relationships, mentions, sources, and draft sources

Manual canon writes must create a synthetic `gm_instruction` source and a `canon_audit` row in the same transaction as the row mutation. Update and archive calls must include the live `expected_version` value from the loaded row.

Approval Queue commits must apply create/update/archive-request drafts and write `canon_audit` rows with `actor_kind='gm_via_ai_approval'`, `draft_id`, and cited `draft_sources`. Rejections and merge identity decisions must not mutate canon directly.

Embedding helpers must only enqueue or materialize chunk text from embeddable fields. `gm_notes` columns and `note_type='gm_note'` notes are excluded from embedding chunks. Provider workers may fill `embeddings.embedding`, but retrieval must continue to function lexically without provider keys.

AI task execution must start with `preflight_ai_task(...)`, then run through the internal Edge task runner. Worker-only wrappers expose the internal `ai_task_runs` ledger to service-role workers without granting browser execution. AI output writers must validate source IDs before writing and may only write to the task's registered output surface.

## Verification

Run:

```bash
npm run backend:baseline:reset
```

The baseline must include:

- `supabase/tests/access_control.sql`
- `supabase/tests/foundation.sql`

Do not record local API keys, JWT secrets, storage keys, or service credentials in this document.

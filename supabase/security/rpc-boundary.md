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
| `restore_entity(..., expected_version)` | Restore an archived Library record through a scoped conflict-checked path. |
| `hard_delete_entity(..., expected_version, confirmation_name)` | Permanently delete an archived record only after typed confirmation and a transaction-time zero-reference check. |
| `get_library_record_detail(...)` | Read one scoped record with provenance, links, mention decisions, backlinks, candidates, and delete blockers. |
| `create_relationship(...)` / `delete_relationship(...)` | Create or remove a scoped fixed-vocabulary Library relationship. |
| `resolve_mention(...)` | Explicitly accept or dismiss an exact-match mention suggestion. |
| `create_note_attachment(...)` / `delete_note_attachment(...)` | Attach or detach a Note and scoped Library entity. |
| `append_thread_objective(...)` | Update a Thread objective through a scoped path. |
| `create_session(...)` | Create a Session through a scoped path. |
| `update_session_prep(...)` | Update prep fields, pins, and active threads through scoped validation. |
| `set_session_status(...)` | Update Session status through a scoped path. |
| `quick_capture(...)` | Add a Stage quick-capture note. |
| `quick_stub(...)` | Add a Stage quick-stub entity. |
| `mark_moment(...)` | Add a Stage marked moment. |
| `apply_stage_write_intent(...)` | Replay the scoped Stage lifecycle/evidence queue exactly once per GM idempotency key and return immutable conflict receipts without overwriting competing lifecycle state. |
| `record_session_consent(...)` | Record per-session Stage recording consent. |
| `record_dice_roll(...)` | Record per-session Stage dice history. |
| `get_stage_packet(...)` | Read a scoped Stage packet for rough UI smoke testing. |
| `get_audio_upload_target(...)` | Build a scoped deterministic audio Storage upload target. |
| `register_audio_chunk(...)` | Register uploaded audio chunk metadata and meter storage once. |
| `finalize_audio_upload(...)` | Record the expected chunk count and make completed recovered audio eligible for transcription. |
| `enqueue_transcription_job(...)` | Queue scoped transcription work for a Session. |
| `update_transcript_segments(...)` | Edit transcript segment text/deleted flags while preserving timestamp boundaries. |
| `get_draft_source_context(...)` | Read every source linked to one scoped draft, including frozen/current transcript context and safe drift/fallback states. |
| `get_session_review(...)` | Read scoped post-session audio, transcript, job, and pipeline state without exposing internal queue rows. |
| `retry_session_transcription(...)` | Explicitly requeue a failed complete recording with a fresh retry budget. |
| `save_session_evidence(...)` | Save idempotent pasted-note or GM-summary Session evidence without creating canon or starting synthesis. |
| `get_approval_queue(...)` | Read scoped field diffs, source health, provenance, and current conflict state without exposing sibling-Saga rows. |
| `save_draft_edit(...)` | Persist recoverable GM proposal edits without changing canon or writing audit. |
| `refresh_draft_baseline(...)` | Explicitly rebase a pending draft to the live target version without changing canon. |
| `resolve_draft(...)` | Idempotently approve, edit-and-approve, reject, or merge one scoped draft; only successful approvals write canon and audit. |
| `update_draft_state(...)` | Compatibility wrapper over the scoped C5 resolution boundary. |
| `list_entities(...)` | Read scoped entity lists. |
| `get_sessions_for_saga(...)` | Read scoped Session lists. |
| `get_session_pinned_entities(...)` | Read scoped pinned entities. |
| `get_session_active_threads(...)` | Read scoped active threads. |
| `get_pending_drafts(...)` | Read scoped pending drafts. |
| `get_workspace_usage_summary(...)` | Read scoped usage summary. |
| `check_quota_preflight(...)` | Check quota before metered work. |
| `preflight_ai_task(...)` | Check Registry v1.0 task contract and quota before starting AI work. |
| `request_saga_export(...)` | Request a scoped Saga export after export quota preflight. |
| `get_saga_export_status(...)` | Read scoped export job state without exposing internal Storage paths. |
| `get_saga_export_download(...)` | Read scoped completed export download readiness. |
| `update_notification_preferences(...)` | Update the authenticated GM's notification preferences. |
| `register_push_device(...)` | Register or refresh an authenticated GM push device token. |
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

`storage_path_allowed(text)` is a fixed-search-path `security definer` helper so Supabase Storage can validate the Workspace/World/Saga path against authenticated ownership without relying on an optional active-Saga JWT claim.

## Internal Definer Helpers

These public-schema helpers are `security definer` because they are called by scoped RPCs or triggers, but they are not directly executable by browser roles:

- `assert_saga_access(...)`
- `get_transcript_source_context(...)` (draft-context helper only; not browser-callable)
- `scoped_entity_exists(...)`
- `write_manual_canon_source(...)`
- `write_manual_canon_audit(...)`
- `materialize_embedding_job_for_test(...)`
- AI worker wrappers: `get_ai_task_run_for_worker(...)`, `record_ai_task_output_for_worker(...)`, `mark_ai_task_run_failed_for_worker(...)`, and `set_ai_task_usage_for_worker(...)`
- validation trigger helpers for session pins, active threads, notes, relationships, mentions, sources, and draft sources
- private `internal.library_*` lookup/dependency helpers plus the exact-mention trigger; none are browser-callable

Manual canon writes must create a synthetic `gm_instruction` source and a `canon_audit` row in the same transaction as the row mutation. Update and archive calls must include the live `expected_version` value from the loaded row.

Library detail reads expose only current-Saga plus relevant World records. Exact, case-insensitive word-boundary mention detection runs after record saves and only creates suggestions; acceptance/dismissal remains an explicit GM RPC. Individual hard-delete is limited to archived records with no relationships, mention/backlink rows, Note attachments, Session pins/Thread activations, or pending draft targets. The delete RPC rechecks all dependencies under the row lock, preserves intrinsic source/audit tombstones, removes derived embeddings, and never cascades external references.

Approval Queue commits apply create/update/archive-request drafts only after live target, Session state, source, and optimistic-version checks. Successful commits write one `canon_audit` row with field-level old/new values, `actor_kind='gm_via_ai_approval'`, `draft_id`, cited `draft_sources`, and batch/run/pipeline/model provenance. Rejections and merge identity decisions do not mutate canon; merge creates a separately reviewable update while preserving sources and provenance. Approval receipts make exact retries safe, and GM edits are saved before commit attempts so conflicts and failures do not discard them.

Embedding helpers must only enqueue or materialize chunk text from embeddable fields. `gm_notes` columns and `note_type='gm_note'` notes are excluded from embedding chunks. Provider workers may fill `embeddings.embedding`, but retrieval must continue to function lexically without provider keys.

AI task execution must start with `preflight_ai_task(...)`, then run through the internal Edge task runner. Worker-only wrappers expose the internal `ai_task_runs` ledger to service-role workers without granting browser execution. The five-argument `record_ai_task_output_for_worker(...)` result boundary also receives the final resolved model/provider. For `synthesize_session`, it revalidates the immutable source set and exact Workspace/World/Saga/Session ownership, then atomically writes one pending draft batch. It cannot write canon, canon audit rows, or embeddings.

Export and notification operations use scoped browser RPCs for request/status/preference/device state. Worker-only internals own export completion, stale-pipeline scanning, notification dispatch, and cleanup finalization.

Hierarchy reads return only owner-accessible Workspace/World/Saga choices and an authorized landing target for each switchable branch. `rename_saga(...)` and `delete_saga(...)` revalidate the exact hierarchy server-side. Deletion requires an exact typed Saga name, rejects `in_progress` and `ended_pending_undo` Sessions, soft-hides the Saga, and enqueues one idempotent Storage cleanup job. Only a successful worker Storage pass may call cleanup completion; that completion hard-deletes the Saga and its cascaded database rows while preserving sibling Sagas.

Worker-only wrappers for operations are `complete_export_job_for_worker(...)`, `dispatch_notification_for_worker(...)`, `claim_cleanup_job_for_worker(...)`, and `complete_cleanup_job_for_worker(...)`; they are not granted to browser roles.

## Verification

Run:

```bash
npm run backend:baseline:reset
```

The baseline must include:

- `supabase/tests/access_control.sql`
- `supabase/tests/foundation.sql`

Do not record local API keys, JWT secrets, storage keys, or service credentials in this document.

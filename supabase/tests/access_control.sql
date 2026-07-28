create extension if not exists pgtap with schema extensions;

begin;

select plan(7);

create temp table module1_callable_functions (
  function_name text primary key,
  browser_callable boolean not null,
  reason text not null
);

insert into module1_callable_functions (function_name, browser_callable, reason)
values
  ('active_saga_matches', false, 'RLS helper used to fail closed without an active Saga claim.'),
  ('user_owns_workspace', false, 'RLS helper used by workspace membership checks.'),
  ('user_is_workspace_member', false, 'RLS helper used by public table policies.'),
  ('world_belongs_to_workspace', false, 'RLS helper used by public table policies.'),
  ('saga_belongs_to_world', false, 'RLS helper used by public table policies.'),
  ('scoped_row_allowed', false, 'RLS helper for world/saga scoped public rows.'),
  ('saga_row_allowed', false, 'RLS helper for Saga-only public rows and storage paths.'),
  ('storage_path_allowed', false, 'Storage RLS helper for workspace/world/saga object paths.'),
  ('storage_path_segment', false, 'Storage path parser used by storage_path_allowed.'),
  ('ensure_default_workspace', true, 'Bootstrap RPC for first authenticated app load.'),
  ('get_bootstrap_context', true, 'Bootstrap read RPC for the authenticated shell.'),
  ('get_saga_context', true, 'Scoped Saga context read RPC.'),
  ('create_blank_saga', true, 'Scoped first-run Saga creation RPC.'),
  ('list_worlds_for_workspace', true, 'Workspace-scoped World picker RPC.'),
  ('rename_saga', true, 'Scoped Saga rename RPC.'),
  ('delete_saga', true, 'Typed-confirmation Saga deletion RPC.'),
  ('create_entity', true, 'Scoped manual canon create RPC.'),
  ('update_entity', true, 'Scoped manual canon update RPC.'),
  ('archive_entity', true, 'Scoped manual canon archive RPC.'),
  ('restore_entity', true, 'Scoped conflict-checked Library restore RPC.'),
  ('hard_delete_entity', true, 'Scoped archived and unreferenced Library hard-delete RPC.'),
  ('get_library_record_detail', true, 'Scoped Library detail, provenance, relationship, mention, and backlink read model.'),
  ('create_relationship', true, 'Scoped fixed-vocabulary relationship create RPC.'),
  ('delete_relationship', true, 'Scoped relationship removal RPC.'),
  ('resolve_mention', true, 'Scoped explicit mention acceptance or dismissal RPC.'),
  ('create_note_attachment', true, 'Scoped Note attachment create RPC.'),
  ('delete_note_attachment', true, 'Scoped Note attachment removal RPC.'),
  ('append_thread_objective', true, 'Scoped thread objective update RPC.'),
  ('update_thread_details', true, 'Scoped optimistic Thread title, summary, state, and resolution write RPC.'),
  ('mutate_thread_objective', true, 'Scoped optimistic Thread objective lifecycle and ordering RPC.'),
  ('get_thread_detail', true, 'Scoped Thread detail and D2 relationship projection RPC.'),
  ('get_thread_timeline', true, 'Scoped derived read-only Thread history RPC.'),
  ('create_session', true, 'Scoped manual session creation RPC.'),
  ('update_session_prep', true, 'Scoped session prep update RPC.'),
  ('autosave_session_prep', true, 'Optimistic scoped Prep autosave with ordered pins and stale-write rejection.'),
  ('get_session_prep', true, 'Scoped Prep read model with resilient pins and prior summary.'),
  ('mutate_session_prep', true, 'Idempotent state-valid reset, duplicate, and archive actions.'),
  ('set_session_status', true, 'Scoped session status RPC.'),
  ('quick_capture', true, 'Scoped Stage quick-capture RPC.'),
  ('quick_stub', true, 'Scoped Stage quick-stub RPC.'),
  ('mark_moment', true, 'Scoped Stage marked-moment RPC.'),
  ('apply_stage_write_intent', true, 'Scoped idempotent Stage write recovery RPC.'),
  ('record_session_consent', true, 'Scoped Stage recording consent RPC.'),
  ('record_dice_roll', true, 'Scoped Stage dice history RPC.'),
  ('get_stage_packet', true, 'Scoped Stage packet read model RPC.'),
  ('get_audio_upload_target', true, 'Scoped audio Storage upload target RPC.'),
  ('register_audio_chunk', true, 'Scoped audio chunk metadata registration RPC.'),
  ('finalize_audio_upload', true, 'Scoped audio upload completion RPC.'),
  ('enqueue_transcription_job', true, 'Scoped transcription queue RPC.'),
  ('update_transcript_segments', true, 'Scoped transcript edit RPC.'),
  ('get_draft_source_context', true, 'Scoped draft citation and transcript drift read RPC.'),
  ('get_session_review', true, 'Scoped post-session transcript and pipeline read RPC.'),
  ('retry_session_transcription', true, 'Scoped explicit transcription retry RPC.'),
  ('save_session_evidence', true, 'Scoped idempotent pasted-notes and GM-summary evidence RPC.'),
  ('save_import_inbox_source', true, 'Scoped idempotent raw Import Inbox write RPC.'),
  ('get_import_inbox', true, 'Scoped Import Inbox provenance and original-content read RPC.'),
  ('set_import_source_state', true, 'Scoped Import Inbox archive and restore RPC.'),
  ('get_approval_queue', true, 'Scoped Approval Queue read model with field diffs and conflicts.'),
  ('save_draft_edit', true, 'Scoped recoverable GM draft edit RPC.'),
  ('refresh_draft_baseline', true, 'Scoped non-canon stale-target rebase RPC.'),
  ('resolve_draft', true, 'Scoped idempotent Approval Queue action and canon commit RPC.'),
  ('update_draft_state', true, 'Scoped draft resolution RPC.'),
  ('list_entities', true, 'Scoped entity list read RPC.'),
  ('get_sessions_for_saga', true, 'Scoped session list read RPC.'),
  ('get_session_pinned_entities', true, 'Scoped session pins read RPC.'),
  ('get_session_active_threads', true, 'Scoped active threads read RPC.'),
  ('get_pending_drafts', true, 'Scoped approval queue read RPC.'),
  ('get_pending_drafts_for_session', true, 'Scoped session review queue read RPC.'),
  ('get_workspace_usage_summary', true, 'Scoped usage summary read RPC.'),
  ('check_quota_preflight', true, 'Scoped quota preflight RPC.'),
  ('preflight_ai_task', true, 'Scoped AI task registry and quota preflight RPC.'),
  ('get_guide_thread', true, 'Scoped persistent Relic Guide conversation read RPC.'),
  ('get_guide_source_context', true, 'Scoped Guide citation and drift context read RPC.'),
  ('new_guide_thread', true, 'Scoped explicit Relic Guide thread creation RPC.'),
  ('set_guide_action_state', true, 'Scoped reviewed Guide action decision RPC.'),
  ('request_saga_export', true, 'Scoped Saga export request RPC.'),
  ('get_saga_export_status', true, 'Scoped Saga export status RPC.'),
  ('get_saga_export_download', true, 'Scoped Saga export download RPC.'),
  ('update_notification_preferences', true, 'Scoped GM notification preference RPC.'),
  ('register_push_device', true, 'Scoped push device registration RPC.'),
  ('record_usage_event', true, 'Scoped idempotent usage event writer RPC.'),
  ('search_for_ui', true, 'Scoped lexical UI search RPC.'),
  ('prepare_embedding_job', true, 'Scoped worker preparation RPC for a claimed embedding job.'),
  ('get_embedding_job_status', true, 'Scoped embedding job status read RPC.'),
  ('search_for_ui_hybrid', true, 'Scoped hybrid UI search RPC with hard retrieval visibility filters.'),
  ('retrieve_for_task', true, 'Scoped retrieval RPC with hard-canon filters.'),
  ('retrieve_for_task_relaxed', true, 'Scoped conservative natural-language fallback for Guide task grounding.');

create temp table module1_security_definer_functions (
  function_name text primary key,
  reason text not null
);

insert into module1_security_definer_functions (function_name, reason)
values
  ('active_saga_matches', 'RLS helper must evaluate active Saga claims consistently.'),
  ('user_can_access_workspace', 'Ownership helper for scoped definer RPCs.'),
  ('user_can_access_saga', 'Hierarchy helper for scoped definer RPCs.'),
  ('storage_path_allowed', 'Storage RLS helper validates scoped object paths against authenticated ownership.'),
  ('assert_saga_access', 'Shared failure point for scoped definer RPCs.'),
  ('scoped_entity_exists', 'Scope validator for entity references.'),
  ('write_manual_canon_source', 'Internal helper that creates synthetic GM instruction sources.'),
  ('write_manual_canon_audit', 'Internal helper that appends canon audit rows for manual GM writes.'),
  ('validate_session_pinned_entity_scope', 'Trigger guard for session pinned entities.'),
  ('validate_session_active_thread_scope', 'Trigger guard for active thread references.'),
  ('source_belongs_to_scope', 'Scope helper for source validation.'),
  ('validate_note_attachment_scope', 'Trigger guard for note attachments.'),
  ('validate_relationship_scope', 'Trigger guard for relationship endpoints.'),
  ('validate_relationship_source_scope', 'Trigger guard for relationship citations.'),
  ('validate_mention_scope', 'Trigger guard for mention references.'),
  ('validate_source_scope', 'Trigger guard for source rows.'),
  ('validate_draft_source_scope', 'Trigger guard for draft citations.'),
  ('ensure_default_workspace', 'Bootstrap RPC.'),
  ('get_bootstrap_context', 'Bootstrap read RPC.'),
  ('get_saga_context', 'Scoped Saga context read RPC.'),
  ('create_blank_saga', 'First-run creation RPC.'),
  ('list_worlds_for_workspace', 'Workspace-scoped read RPC.'),
  ('rename_saga', 'Scoped Saga lifecycle mutation RPC.'),
  ('delete_saga', 'Scoped Saga lifecycle mutation and cleanup enqueue RPC.'),
  ('create_entity', 'Manual canon write RPC.'),
  ('update_entity', 'Manual canon write RPC.'),
  ('archive_entity', 'Manual canon write RPC.'),
  ('restore_entity', 'Manual canon restore RPC.'),
  ('hard_delete_entity', 'Archived unreferenced Library deletion RPC.'),
  ('get_library_record_detail', 'Scoped Library inspector read model RPC.'),
  ('create_relationship', 'Manual relationship creation RPC.'),
  ('delete_relationship', 'Manual relationship removal RPC.'),
  ('resolve_mention', 'Manual mention decision RPC.'),
  ('create_note_attachment', 'Manual Note attachment RPC.'),
  ('delete_note_attachment', 'Manual Note attachment removal RPC.'),
  ('append_thread_objective', 'Manual thread update RPC.'),
  ('update_thread_details', 'Optimistic manual Thread state and resolution write RPC.'),
  ('mutate_thread_objective', 'Optimistic objective lifecycle and ordering write RPC.'),
  ('get_thread_detail', 'Scoped Thread detail and relationship read model RPC.'),
  ('get_thread_timeline', 'Scoped derived Thread timeline read model RPC.'),
  ('create_session', 'Session creation RPC.'),
  ('update_session_prep', 'Session prep write RPC.'),
  ('autosave_session_prep', 'Optimistic Session Prep write RPC.'),
  ('get_session_prep', 'Scoped Session Prep read model RPC.'),
  ('mutate_session_prep', 'State-valid idempotent Session Prep actions RPC.'),
  ('set_session_status', 'Session status write RPC.'),
  ('quick_capture', 'Stage capture write RPC.'),
  ('quick_stub', 'Stage stub write RPC.'),
  ('mark_moment', 'Stage moment write RPC.'),
  ('apply_stage_write_intent', 'Idempotent Stage write recovery RPC.'),
  ('record_session_consent', 'Stage consent write RPC.'),
  ('record_dice_roll', 'Stage dice history write RPC.'),
  ('get_stage_packet', 'Stage packet read RPC.'),
  ('get_audio_upload_target', 'Audio Storage upload target RPC.'),
  ('register_audio_chunk', 'Audio chunk metadata registration RPC.'),
  ('finalize_audio_upload', 'Audio upload completion and transcription eligibility RPC.'),
  ('enqueue_transcription_job', 'Transcription queue RPC.'),
  ('update_transcript_segments', 'Transcript edit RPC.'),
  ('get_transcript_source_context', 'Internal transcript citation context helper.'),
  ('get_draft_source_context', 'Scoped draft citation and transcript drift read RPC.'),
  ('get_session_review', 'Post-session transcript and pipeline read RPC.'),
  ('retry_session_transcription', 'Explicit transcription retry RPC.'),
  ('save_session_evidence', 'Manual Session evidence write RPC.'),
  ('save_import_inbox_source', 'Raw Import Inbox source write RPC.'),
  ('get_import_inbox', 'Scoped Import Inbox review read RPC.'),
  ('set_import_source_state', 'Scoped Import Inbox lifecycle RPC.'),
  ('get_approval_queue', 'Approval Queue diff and conflict read model RPC.'),
  ('save_draft_edit', 'Recoverable GM draft edit RPC.'),
  ('refresh_draft_baseline', 'Non-canon stale-target rebase RPC.'),
  ('resolve_draft', 'Idempotent Approval Queue action and canon commit RPC.'),
  ('update_draft_state', 'Draft resolution RPC.'),
  ('list_entities', 'Scoped entity list read RPC.'),
  ('get_sessions_for_saga', 'Scoped session list read RPC.'),
  ('get_session_pinned_entities', 'Scoped session pins read RPC.'),
  ('get_session_active_threads', 'Scoped active threads read RPC.'),
  ('get_pending_drafts', 'Approval queue read RPC.'),
  ('get_pending_drafts_for_session', 'Session review queue read RPC.'),
  ('check_quota_preflight', 'Quota preflight read RPC.'),
  ('preflight_ai_task', 'AI task registry and quota preflight RPC.'),
  ('get_guide_thread', 'Scoped persistent Relic Guide conversation read RPC.'),
  ('get_guide_source_context', 'Scoped Guide citation and drift context read RPC.'),
  ('new_guide_thread', 'Scoped explicit Relic Guide thread creation RPC.'),
  ('set_guide_action_state', 'Scoped reviewed Guide action decision RPC.'),
  ('create_guide_turn_for_worker', 'Worker-only scoped Guide turn, evidence snapshot, and AI run creator.'),
  ('get_guide_evidence_for_worker', 'Worker-only immutable Guide evidence reader.'),
  ('set_guide_turn_state_for_worker', 'Worker-only Guide lifecycle state writer.'),
  ('block_guide_turn_for_worker', 'Worker-only quota-block terminal writer.'),
  ('complete_guide_turn_for_worker', 'Worker-only validated Guide response and action-intent writer.'),
  ('request_saga_export', 'Saga export request RPC.'),
  ('get_saga_export_status', 'Saga export status RPC.'),
  ('get_saga_export_download', 'Saga export download RPC.'),
  ('update_notification_preferences', 'Notification preference update RPC.'),
  ('register_push_device', 'Push device registration RPC.'),
  ('get_workspace_usage_summary', 'Usage summary read RPC.'),
  ('record_usage_event', 'Usage event writer RPC.'),
  ('get_ai_task_run_for_worker', 'Worker-only AI task run reader wrapper.'),
  ('record_ai_task_output_for_worker', 'Worker-only AI task output writer wrapper.'),
  ('mark_ai_task_run_failed_for_worker', 'Worker-only AI task failure writer wrapper.'),
  ('set_ai_task_usage_for_worker', 'Worker-only AI task usage event linker.'),
  ('claim_ai_task_run_for_worker', 'Worker-only atomic AI task delivery lease.'),
  ('checkpoint_ai_task_provider_output_for_worker', 'Worker-only private validated provider-output checkpoint.'),
  ('fail_ai_task_run_for_worker', 'Worker-only bounded AI task retry and dead-letter transition.'),
  ('replay_ai_task_run_for_worker', 'Worker-only guarded AI task dead-letter replay.'),
  ('reset_stalled_ai_task_runs_for_worker', 'Worker-only stalled AI task lease watchdog.'),
  ('prune_provider_pipeline_events_for_worker', 'Worker-only safe provider event retention maintenance.'),
  ('complete_export_job_for_worker', 'Worker-only export completion wrapper.'),
  ('dispatch_notification_for_worker', 'Worker-only notification dispatch wrapper.'),
  ('complete_cleanup_job_for_worker', 'Worker-only cleanup completion wrapper.'),
  ('claim_cleanup_job_for_worker', 'Worker-only cleanup claim wrapper.'),
  ('claim_transcription_job_for_worker', 'Worker-only transcription claim wrapper.'),
  ('complete_transcription_job_for_worker', 'Worker-only transcription result wrapper.'),
  ('claim_embedding_job_for_worker', 'Worker-only embedding job claim wrapper.'),
  ('claim_transcript_embedding_job_for_worker', 'Worker-only transcript embedding claim wrapper.'),
  ('prepare_embedding_job', 'Scoped worker preparation RPC for eligible embedding input.'),
  ('complete_embedding_job_for_worker', 'Worker-only validated embedding persistence and metering wrapper.'),
  ('fail_embedding_job_for_worker', 'Worker-only classified embedding failure and retry wrapper.'),
  ('replay_embedding_job_for_worker', 'Worker-only dead-letter replay wrapper.'),
  ('get_embedding_job_status', 'Scoped embedding job status read RPC.'),
  ('complete_job_for_worker', 'Worker-only generic job completion wrapper.'),
  ('fail_job_for_worker', 'Worker-only generic job failure wrapper.'),
  ('record_provider_pipeline_event_for_worker', 'Worker-only safe provider pipeline event writer.'),
  ('get_provider_operations_summary_for_worker', 'Worker-only provider operations summary reader.'),
  ('get_provider_operational_alerts_for_worker', 'Worker-only provider operational alert reader.'),
  ('search_for_ui', 'Scoped UI search RPC.'),
  ('search_for_ui_hybrid', 'Scoped hybrid UI search RPC.'),
  ('retrieve_for_task', 'Scoped retrieval RPC.'),
  ('retrieve_for_task_relaxed', 'Scoped conservative natural-language fallback for Guide task grounding.');

with public_functions as (
  select p.oid, p.proname
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
)
select is(
  (select count(*) from public_functions where has_function_privilege('anon', oid, 'execute')),
  0::bigint,
  'anon cannot execute public functions directly'
);

with public_functions as (
  select p.oid, p.proname
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
)
select is(
  (
    select count(*)
    from public_functions f
    where has_function_privilege('authenticated', f.oid, 'execute')
      and not exists (
        select 1
        from module1_callable_functions allowed
        where allowed.function_name = f.proname
      )
  ),
  0::bigint,
  'authenticated execute privilege is limited to the documented callable/helper allowlist'
);

with expected_functions as (
  select allowed.function_name, p.oid
  from module1_callable_functions allowed
  left join pg_proc p on p.proname = allowed.function_name
  left join pg_namespace n on n.oid = p.pronamespace and n.nspname = 'public'
)
select is(
  (
    select count(*)
    from expected_functions
    where oid is null
      or not has_function_privilege('authenticated', oid, 'execute')
  ),
  0::bigint,
  'authenticated can execute every documented callable/helper function'
);

select is(
  (
    select count(*)
    from information_schema.role_table_grants
    where table_schema = 'public'
      and grantee in ('PUBLIC', 'anon', 'authenticated')
      and privilege_type in ('INSERT', 'UPDATE', 'DELETE')
  ),
  0::bigint,
  'browser roles have no direct public table insert/update/delete grants'
);

set local role anon;
select throws_like(
  $$ insert into storage.objects (bucket_id, name)
     values ('audio', '10000000-0000-0000-0000-000000000001/20000000-0000-0000-0000-000000000001/30000000-0000-0000-0000-000000000001/anon-write.webm') $$,
  '%row-level security%',
  'anon cannot write storage objects despite Supabase-managed storage grants'
);
reset role;

with public_security_definers as (
  select p.oid, p.proname, p.proconfig
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.prosecdef
)
select is(
  (
    select count(*)
    from public_security_definers
    where not exists (
      select 1
      from unnest(coalesce(proconfig, array[]::text[])) as config(value)
      where config.value like 'search_path=%'
    )
  ),
  0::bigint,
  'every public security-definer function has an explicit search_path'
);

with public_security_definers as (
  select p.proname
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.prosecdef
)
select is(
  (
    select count(*)
    from public_security_definers f
    where not exists (
      select 1
      from module1_security_definer_functions documented
      where documented.function_name = f.proname
    )
  ),
  0::bigint,
  'every public security-definer function is documented in the Module 1 catalog'
);

select * from finish();

rollback;

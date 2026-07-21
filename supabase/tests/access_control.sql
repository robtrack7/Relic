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
  ('create_entity', true, 'Scoped manual canon create RPC.'),
  ('update_entity', true, 'Scoped manual canon update RPC.'),
  ('archive_entity', true, 'Scoped manual canon archive RPC.'),
  ('append_thread_objective', true, 'Scoped thread objective update RPC.'),
  ('create_session', true, 'Scoped manual session creation RPC.'),
  ('update_session_prep', true, 'Scoped session prep update RPC.'),
  ('set_session_status', true, 'Scoped session status RPC.'),
  ('quick_capture', true, 'Scoped Stage quick-capture RPC.'),
  ('quick_stub', true, 'Scoped Stage quick-stub RPC.'),
  ('mark_moment', true, 'Scoped Stage marked-moment RPC.'),
  ('record_session_consent', true, 'Scoped Stage recording consent RPC.'),
  ('record_dice_roll', true, 'Scoped Stage dice history RPC.'),
  ('get_stage_packet', true, 'Scoped Stage packet read model RPC.'),
  ('get_audio_upload_target', true, 'Scoped audio Storage upload target RPC.'),
  ('register_audio_chunk', true, 'Scoped audio chunk metadata registration RPC.'),
  ('finalize_audio_upload', true, 'Scoped audio upload completion RPC.'),
  ('enqueue_transcription_job', true, 'Scoped transcription queue RPC.'),
  ('update_transcript_segments', true, 'Scoped transcript edit RPC.'),
  ('get_transcript_source_context', true, 'Scoped transcript citation drift read RPC.'),
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
  ('request_saga_export', true, 'Scoped Saga export request RPC.'),
  ('get_saga_export_status', true, 'Scoped Saga export status RPC.'),
  ('get_saga_export_download', true, 'Scoped Saga export download RPC.'),
  ('update_notification_preferences', true, 'Scoped GM notification preference RPC.'),
  ('register_push_device', true, 'Scoped push device registration RPC.'),
  ('record_usage_event', true, 'Scoped idempotent usage event writer RPC.'),
  ('search_for_ui', true, 'Scoped lexical UI search RPC.'),
  ('retrieve_for_task', true, 'Scoped retrieval RPC with hard-canon filters.');

create temp table module1_security_definer_functions (
  function_name text primary key,
  reason text not null
);

insert into module1_security_definer_functions (function_name, reason)
values
  ('active_saga_matches', 'RLS helper must evaluate active Saga claims consistently.'),
  ('user_can_access_workspace', 'Ownership helper for scoped definer RPCs.'),
  ('user_can_access_saga', 'Hierarchy helper for scoped definer RPCs.'),
  ('assert_saga_access', 'Shared failure point for scoped definer RPCs.'),
  ('scoped_entity_exists', 'Scope validator for entity references.'),
  ('write_manual_canon_source', 'Internal helper that creates synthetic GM instruction sources.'),
  ('write_manual_canon_audit', 'Internal helper that appends canon audit rows for manual GM writes.'),
  ('materialize_embedding_job_for_test', 'Internal test/worker-contract helper that materializes safe embedding chunks without provider vectors.'),
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
  ('create_entity', 'Manual canon write RPC.'),
  ('update_entity', 'Manual canon write RPC.'),
  ('archive_entity', 'Manual canon write RPC.'),
  ('append_thread_objective', 'Manual thread update RPC.'),
  ('create_session', 'Session creation RPC.'),
  ('update_session_prep', 'Session prep write RPC.'),
  ('set_session_status', 'Session status write RPC.'),
  ('quick_capture', 'Stage capture write RPC.'),
  ('quick_stub', 'Stage stub write RPC.'),
  ('mark_moment', 'Stage moment write RPC.'),
  ('record_session_consent', 'Stage consent write RPC.'),
  ('record_dice_roll', 'Stage dice history write RPC.'),
  ('get_stage_packet', 'Stage packet read RPC.'),
  ('get_audio_upload_target', 'Audio Storage upload target RPC.'),
  ('register_audio_chunk', 'Audio chunk metadata registration RPC.'),
  ('finalize_audio_upload', 'Audio upload completion and transcription eligibility RPC.'),
  ('enqueue_transcription_job', 'Transcription queue RPC.'),
  ('update_transcript_segments', 'Transcript edit RPC.'),
  ('get_transcript_source_context', 'Transcript citation drift read RPC.'),
  ('update_draft_state', 'Draft resolution RPC.'),
  ('list_entities', 'Scoped entity list read RPC.'),
  ('get_sessions_for_saga', 'Scoped session list read RPC.'),
  ('get_session_pinned_entities', 'Scoped session pins read RPC.'),
  ('get_session_active_threads', 'Scoped active threads read RPC.'),
  ('get_pending_drafts', 'Approval queue read RPC.'),
  ('get_pending_drafts_for_session', 'Session review queue read RPC.'),
  ('check_quota_preflight', 'Quota preflight read RPC.'),
  ('preflight_ai_task', 'AI task registry and quota preflight RPC.'),
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
  ('complete_export_job_for_worker', 'Worker-only export completion wrapper.'),
  ('dispatch_notification_for_worker', 'Worker-only notification dispatch wrapper.'),
  ('complete_cleanup_job_for_worker', 'Worker-only cleanup completion wrapper.'),
  ('search_for_ui', 'Scoped UI search RPC.'),
  ('retrieve_for_task', 'Scoped retrieval RPC.');

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

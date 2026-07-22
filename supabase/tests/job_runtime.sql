create extension if not exists pgtap with schema extensions;

begin;

select plan(31);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, email_change, email_change_token_new, recovery_token)
values
  ('80000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'module8-a@example.test', extensions.crypt('password', extensions.gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false, '', '', '', '')
on conflict (id) do nothing;

insert into public.gm_profiles (id, user_id, experience_level, improv_comfort, prep_style)
values ('80100000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', 'experienced', 'mixed', 'light')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_gm_id, name)
values ('80200000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', 'Module 8 Workspace')
on conflict (id) do nothing;

insert into public.worlds (id, workspace_id, owner_gm_id, name)
values ('80300000-0000-0000-0000-000000000001', '80200000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', 'Module 8 World')
on conflict (id) do nothing;

insert into public.world_eras (id, workspace_id, world_id, name)
values ('80400000-0000-0000-0000-000000000001', '80200000-0000-0000-0000-000000000001', '80300000-0000-0000-0000-000000000001', 'Module 8 Era')
on conflict (id) do nothing;

insert into public.sagas (id, workspace_id, world_id, owner_gm_id, primary_era_id, name)
values ('80500000-0000-0000-0000-000000000001', '80200000-0000-0000-0000-000000000001', '80300000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', '80400000-0000-0000-0000-000000000001', 'Module 8 Saga')
on conflict (id) do nothing;

insert into public.sessions (id, workspace_id, world_id, saga_id, name, status, objective)
values ('80600000-0000-0000-0000-000000000001', '80200000-0000-0000-0000-000000000001', '80300000-0000-0000-0000-000000000001', '80500000-0000-0000-0000-000000000001', 'Module 8 Session', 'ended', 'Test job runtime')
on conflict (id) do nothing;

delete from internal.dead_letter_jobs where job_id in (
  '81000000-0000-0000-0000-000000000001',
  '81000000-0000-0000-0000-000000000002',
  '81000000-0000-0000-0000-000000000003',
  '81000000-0000-0000-0000-000000000004',
  '81000000-0000-0000-0000-000000000005'
);
delete from internal.notification_queue where workspace_id = '80200000-0000-0000-0000-000000000001';
delete from internal.export_jobs where workspace_id = '80200000-0000-0000-0000-000000000001';
delete from internal.cleanup_jobs where workspace_id = '80200000-0000-0000-0000-000000000001';
delete from internal.transcription_jobs where workspace_id = '80200000-0000-0000-0000-000000000001';
delete from internal.embedding_jobs where workspace_id = '80200000-0000-0000-0000-000000000001';
-- Embedding claims are global; keep this fixture deterministic when prior local UI
-- runs have queued due embedding work outside the module workspace.
delete from internal.embedding_jobs where state in ('queued', 'retryable', 'running');
delete from public.transcripts where workspace_id = '80200000-0000-0000-0000-000000000001';

insert into internal.embedding_jobs (id, workspace_id, world_id, saga_id, gm_id, source_kind, source_entity_type, source_entity_id, debounce_until, idempotency_key, input_hash, source_version, request_identity)
values
  ('81000000-0000-0000-0000-000000000001', '80200000-0000-0000-0000-000000000001', '80300000-0000-0000-0000-000000000001', '80500000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', 'entity', 'character', '81100000-0000-0000-0000-000000000001', now() - interval '1 minute', 'module8-embed-due', repeat('1',64), 'module8-v1', 'module8-embed-due'),
  ('81000000-0000-0000-0000-000000000002', '80200000-0000-0000-0000-000000000001', '80300000-0000-0000-0000-000000000001', '80500000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', 'entity', 'place', '81100000-0000-0000-0000-000000000002', now() + interval '1 hour', 'module8-embed-future', repeat('2',64), 'module8-v1', 'module8-embed-future');

insert into public.transcripts (id, workspace_id, world_id, saga_id, session_id, whisper_model, state)
values ('81200000-0000-0000-0000-000000000001', '80200000-0000-0000-0000-000000000001', '80300000-0000-0000-0000-000000000001', '80500000-0000-0000-0000-000000000001', '80600000-0000-0000-0000-000000000001', 'pending', 'pending');

insert into internal.transcription_jobs (id, workspace_id, world_id, saga_id, session_id, gm_id, idempotency_key)
values ('81000000-0000-0000-0000-000000000003', '80200000-0000-0000-0000-000000000001', '80300000-0000-0000-0000-000000000001', '80500000-0000-0000-0000-000000000001', '80600000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', 'module8-transcribe');

insert into internal.cleanup_jobs (id, workspace_id, world_id, saga_id, job_kind, payload, idempotency_key)
values ('81000000-0000-0000-0000-000000000004', '80200000-0000-0000-0000-000000000001', '80300000-0000-0000-0000-000000000001', '80500000-0000-0000-0000-000000000001', 'audio', '{"bucket":"audio"}'::jsonb, 'module8-cleanup');

insert into internal.export_jobs (id, workspace_id, world_id, saga_id, gm_id, requested_formats, idempotency_key)
values ('81000000-0000-0000-0000-000000000005', '80200000-0000-0000-0000-000000000001', '80300000-0000-0000-0000-000000000001', '80500000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', array['json'], 'module8-export');

insert into internal.notification_queue (id, gm_id, workspace_id, world_id, saga_id, kind, channels, payload)
values ('81000000-0000-0000-0000-000000000006', '80000000-0000-0000-0000-000000000001', '80200000-0000-0000-0000-000000000001', '80300000-0000-0000-0000-000000000001', '80500000-0000-0000-0000-000000000001', 'pipeline_failed', array['email']::public.notification_channel[], '{}'::jsonb);

select has_function('internal', 'claim_embedding_job', array['text'], 'embedding claim helper exists');
select has_function('internal', 'claim_transcription_job', array['text'], 'transcription claim helper exists');
select has_function('internal', 'claim_cleanup_job', array['text'], 'cleanup claim helper exists');
select has_function('internal', 'claim_export_job', array['text'], 'export claim helper exists');
select has_function('internal', 'claim_notification_job', array['text'], 'notification claim helper exists');
select has_function('internal', 'complete_job', array['text','uuid','jsonb'], 'generic complete helper exists');
select has_function('internal', 'fail_job', array['text','uuid','text','boolean','jsonb'], 'generic failure helper exists');
select has_function('internal', 'reset_stalled_jobs', array['interval'], 'stalled-job watchdog exists');

create temp table module8_claimed_embedding as
select internal.claim_embedding_job('worker-a') as job;

select is((select job->>'id' from module8_claimed_embedding), '81000000-0000-0000-0000-000000000001', 'claim_embedding_job claims the due embedding job');
select is((select state from internal.embedding_jobs where id = '81000000-0000-0000-0000-000000000001'), 'running', 'claimed embedding job is marked running');
select is((select locked_by from internal.embedding_jobs where id = '81000000-0000-0000-0000-000000000001'), 'worker-a', 'claimed embedding job records worker id');
select is((select attempts from internal.embedding_jobs where id = '81000000-0000-0000-0000-000000000001'), 0, 'claiming does not increment attempts');
select is((select internal.claim_embedding_job('worker-b')), null::jsonb, 'second embedding claim does not claim locked or future jobs');

select is((internal.claim_transcription_job('worker-t')->>'id'), '81000000-0000-0000-0000-000000000003', 'claim_transcription_job claims pending transcription');
select is((internal.claim_cleanup_job('worker-c')->>'id'), '81000000-0000-0000-0000-000000000004', 'claim_cleanup_job claims pending cleanup');
select is((internal.claim_export_job('worker-e')->>'id'), '81000000-0000-0000-0000-000000000005', 'claim_export_job claims pending export');
select is((internal.claim_notification_job('worker-n')->>'id'), '81000000-0000-0000-0000-000000000006', 'claim_notification_job claims scheduled notification');

select lives_ok(
  $$ select internal.fail_job('embedding_jobs', '81000000-0000-0000-0000-000000000001', 'temporary provider timeout token=secret prompt body', true, '{}'::jsonb) $$,
  'retryable failure returns embedding job to the ready queue'
);
select is((select state from internal.embedding_jobs where id = '81000000-0000-0000-0000-000000000001'), 'queued', 'legacy retry maps to the E1 queued state');
select is((select attempts from internal.embedding_jobs where id = '81000000-0000-0000-0000-000000000001'), 1, 'retryable embedding failure increments attempts');
select ok((select debounce_until > now() from internal.embedding_jobs where id = '81000000-0000-0000-0000-000000000001'), 'retryable embedding failure schedules future retry');
select isnt((select failure_reason from internal.embedding_jobs where id = '81000000-0000-0000-0000-000000000001'), 'temporary provider timeout token=secret prompt body', 'failure reason is sanitized before storage');

update internal.transcription_jobs
set state = 'running', attempts = 2
where id = '81000000-0000-0000-0000-000000000003';

select lives_ok(
  $$ select internal.fail_job('transcription_jobs', '81000000-0000-0000-0000-000000000003', 'permanent failure with jwt secret and prompt text', true, '{}'::jsonb) $$,
  'exhausted transcription failure dead-letters'
);
select is((select state from internal.transcription_jobs where id = '81000000-0000-0000-0000-000000000003'), 'failed', 'exhausted transcription job is failed');
select is((select state from public.transcripts where session_id = '80600000-0000-0000-0000-000000000001'), 'failed'::public.transcript_state, 'exhausted transcription failure surfaces to transcript');
select is((select count(*) from internal.dead_letter_jobs where job_table = 'internal.transcription_jobs' and job_id = '81000000-0000-0000-0000-000000000003'), 1::bigint, 'dead-letter row is written once');
select is((select count(*) from internal.dead_letter_jobs where job_table = 'internal.transcription_jobs' and job_id = '81000000-0000-0000-0000-000000000003'), 1::bigint, 'rechecking dead-letter count remains one before duplicate handling');

select lives_ok(
  $$ select internal.complete_job('cleanup_jobs', '81000000-0000-0000-0000-000000000004', '{"storage_deleted":true}'::jsonb) $$,
  'generic complete helper completes cleanup jobs'
);
select is((select state from internal.cleanup_jobs where id = '81000000-0000-0000-0000-000000000004'), 'complete', 'cleanup job marked complete');

update internal.export_jobs
set state = 'running', locked_at = now() - interval '10 minutes'
where id = '81000000-0000-0000-0000-000000000005';

select is(internal.reset_stalled_jobs(interval '5 minutes'), 1, 'watchdog resets one stalled running job');
select is((select state from internal.export_jobs where id = '81000000-0000-0000-0000-000000000005'), 'pending', 'stalled export job returns to pending');

select * from finish();

rollback;

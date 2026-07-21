create extension if not exists pgtap with schema extensions;

begin;

select plan(21);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, email_change, email_change_token_new, recovery_token)
values ('f0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'post-session@example.test', extensions.crypt('password', extensions.gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false, '', '', '', '')
on conflict (id) do nothing;

insert into public.gm_profiles (id, user_id, experience_level, improv_comfort, prep_style)
values ('f1000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'experienced', 'mixed', 'light')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_gm_id, name)
values ('f2000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'Post Session Workspace')
on conflict (id) do nothing;

insert into public.worlds (id, workspace_id, owner_gm_id, name)
values ('f3000000-0000-0000-0000-000000000001', 'f2000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'Post Session World')
on conflict (id) do nothing;

insert into public.world_eras (id, workspace_id, world_id, name)
values ('f4000000-0000-0000-0000-000000000001', 'f2000000-0000-0000-0000-000000000001', 'f3000000-0000-0000-0000-000000000001', 'Post Session Era')
on conflict (id) do nothing;

insert into public.sagas (id, workspace_id, world_id, owner_gm_id, primary_era_id, name, audio_retention)
values ('f5000000-0000-0000-0000-000000000001', 'f2000000-0000-0000-0000-000000000001', 'f3000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'f4000000-0000-0000-0000-000000000001', 'Post Session Saga', 'retain')
on conflict (id) do update set audio_retention = excluded.audio_retention;

insert into public.sessions (id, workspace_id, world_id, saga_id, name, status, started_at, ended_at, audio_chunk_count_expected, recording_finalized_at)
values
  ('f6000000-0000-0000-0000-000000000001', 'f2000000-0000-0000-0000-000000000001', 'f3000000-0000-0000-0000-000000000001', 'f5000000-0000-0000-0000-000000000001', 'Successful Transcription', 'ended', now() - interval '1 hour', now(), 1, now()),
  ('f6000000-0000-0000-0000-000000000002', 'f2000000-0000-0000-0000-000000000001', 'f3000000-0000-0000-0000-000000000001', 'f5000000-0000-0000-0000-000000000001', 'Failed Transcription', 'ended', now() - interval '1 hour', now(), 1, now())
on conflict (id) do update set status = excluded.status, audio_chunk_count_expected = 1, recording_finalized_at = now();

delete from internal.transcription_jobs where workspace_id = 'f2000000-0000-0000-0000-000000000001';
delete from public.transcripts where workspace_id = 'f2000000-0000-0000-0000-000000000001';
delete from public.audio_chunks where workspace_id = 'f2000000-0000-0000-0000-000000000001';
delete from public.pipeline_runs where workspace_id = 'f2000000-0000-0000-0000-000000000001';

insert into public.audio_chunks (workspace_id, world_id, saga_id, session_id, sequence, storage_path, bytes, duration_seconds, client_recorded_at, uploaded_at)
values
  ('f2000000-0000-0000-0000-000000000001', 'f3000000-0000-0000-0000-000000000001', 'f5000000-0000-0000-0000-000000000001', 'f6000000-0000-0000-0000-000000000001', 0, 'f2000000-0000-0000-0000-000000000001/f3000000-0000-0000-0000-000000000001/f5000000-0000-0000-0000-000000000001/f6000000-0000-0000-0000-000000000001/0.webm', 1000, 30, now(), now()),
  ('f2000000-0000-0000-0000-000000000001', 'f3000000-0000-0000-0000-000000000001', 'f5000000-0000-0000-0000-000000000001', 'f6000000-0000-0000-0000-000000000002', 0, 'f2000000-0000-0000-0000-000000000001/f3000000-0000-0000-0000-000000000001/f5000000-0000-0000-0000-000000000001/f6000000-0000-0000-0000-000000000002/0.webm', 1000, 30, now(), now());

insert into public.pipeline_runs (workspace_id, world_id, saga_id, session_id, state)
values
  ('f2000000-0000-0000-0000-000000000001', 'f3000000-0000-0000-0000-000000000001', 'f5000000-0000-0000-0000-000000000001', 'f6000000-0000-0000-0000-000000000001', 'queued'),
  ('f2000000-0000-0000-0000-000000000001', 'f3000000-0000-0000-0000-000000000001', 'f5000000-0000-0000-0000-000000000001', 'f6000000-0000-0000-0000-000000000002', 'queued');

insert into public.transcripts (workspace_id, world_id, saga_id, session_id, whisper_model, state)
values
  ('f2000000-0000-0000-0000-000000000001', 'f3000000-0000-0000-0000-000000000001', 'f5000000-0000-0000-0000-000000000001', 'f6000000-0000-0000-0000-000000000001', 'pending', 'pending'),
  ('f2000000-0000-0000-0000-000000000001', 'f3000000-0000-0000-0000-000000000001', 'f5000000-0000-0000-0000-000000000001', 'f6000000-0000-0000-0000-000000000002', 'pending', 'pending');

insert into internal.transcription_jobs (id, workspace_id, world_id, saga_id, session_id, gm_id, state, max_attempts, idempotency_key)
values
  ('f7000000-0000-0000-0000-000000000001', 'f2000000-0000-0000-0000-000000000001', 'f3000000-0000-0000-0000-000000000001', 'f5000000-0000-0000-0000-000000000001', 'f6000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'pending', 3, 'transcription:f6000000-0000-0000-0000-000000000001'),
  ('f7000000-0000-0000-0000-000000000002', 'f2000000-0000-0000-0000-000000000001', 'f3000000-0000-0000-0000-000000000001', 'f5000000-0000-0000-0000-000000000001', 'f6000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000001', 'pending', 1, 'transcription:f6000000-0000-0000-0000-000000000002');

select has_function('public', 'get_session_review', array['uuid','uuid','uuid','uuid'], 'session review read RPC exists');
select has_function('public', 'retry_session_transcription', array['uuid','uuid','uuid','uuid'], 'transcription retry RPC exists');
select has_function('public', 'claim_transcription_job_for_worker', array['text'], 'worker claim wrapper exists');
select has_function('public', 'complete_transcription_job_for_worker', array['uuid','jsonb','text','text','integer'], 'worker completion wrapper exists');

set local role service_role;
create temp table claimed_transcription as select public.claim_transcription_job_for_worker('post-session-worker') as job;
reset role;

select is((select job ->> 'id' from claimed_transcription), 'f7000000-0000-0000-0000-000000000001', 'worker claims the first due transcription');
select is((select state from public.transcripts where session_id = 'f6000000-0000-0000-0000-000000000001'), 'transcribing'::public.transcript_state, 'claim exposes transcribing transcript state');
select is((select state from public.pipeline_runs where session_id = 'f6000000-0000-0000-0000-000000000001'), 'transcribing'::public.pipeline_state, 'claim exposes transcribing pipeline state');

set local role service_role;
select lives_ok(
  $$ select public.complete_transcription_job_for_worker(
    'f7000000-0000-0000-0000-000000000001',
    '[{"start":0,"end":12.5,"text":"The gate opened.","deleted":false}]'::jsonb,
    'relic-transcribe', 'en', 13
  ) $$,
  'worker completion accepts validated transcript segments'
);
reset role;

select is((select state from public.transcripts where session_id = 'f6000000-0000-0000-0000-000000000001'), 'complete'::public.transcript_state, 'completion stores a complete transcript');
select is((select segments -> 0 ->> 'text' from public.transcripts where session_id = 'f6000000-0000-0000-0000-000000000001'), 'The gate opened.', 'completion stores segment evidence');
select is((select state from public.pipeline_runs where session_id = 'f6000000-0000-0000-0000-000000000001'), 'synthesizing'::public.pipeline_state, 'complete transcript advances the pipeline without creating canon');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'f0000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.saga_id', 'f5000000-0000-0000-0000-000000000001', true);
select is((public.get_session_review('f2000000-0000-0000-0000-000000000001', 'f3000000-0000-0000-0000-000000000001', 'f5000000-0000-0000-0000-000000000001', 'f6000000-0000-0000-0000-000000000001') #>> '{transcript,state}'), 'complete', 'session review returns scoped transcript state');
select is((public.get_session_review('f2000000-0000-0000-0000-000000000001', 'f3000000-0000-0000-0000-000000000001', 'f5000000-0000-0000-0000-000000000001', 'f6000000-0000-0000-0000-000000000001') #>> '{transcription_job,state}'), 'complete', 'session review returns safe worker state');
select throws_like(
  $$ select public.retry_session_transcription('f2000000-0000-0000-0000-000000000001', 'f3000000-0000-0000-0000-000000000001', 'f5000000-0000-0000-0000-000000000001', 'f6000000-0000-0000-0000-000000000001') $$,
  '%only a failed transcription can be retried%',
  'GM cannot requeue a complete transcription'
);
reset role;

set local role service_role;
select public.claim_transcription_job_for_worker('post-session-worker-failure');
select public.fail_job_for_worker('transcription_jobs', 'f7000000-0000-0000-0000-000000000002', 'provider unavailable', true, '{}');
reset role;

select is((select state from public.transcripts where session_id = 'f6000000-0000-0000-0000-000000000002'), 'failed'::public.transcript_state, 'exhausted provider failure is visible on transcript');
select is((select failure_reason from public.pipeline_runs where session_id = 'f6000000-0000-0000-0000-000000000002'), 'no_inputs_after_transcription_failure', 'recording-only failure gives a safe pipeline reason');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'f0000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.saga_id', 'f5000000-0000-0000-0000-000000000001', true);
select is(public.retry_session_transcription('f2000000-0000-0000-0000-000000000001', 'f3000000-0000-0000-0000-000000000001', 'f5000000-0000-0000-0000-000000000001', 'f6000000-0000-0000-0000-000000000002'), 'f7000000-0000-0000-0000-000000000002'::uuid, 'GM can retry the failed scoped transcription');
reset role;

select is((select state from internal.transcription_jobs where id = 'f7000000-0000-0000-0000-000000000002'), 'pending', 'retry returns the worker job to pending');
select is((select attempts from internal.transcription_jobs where id = 'f7000000-0000-0000-0000-000000000002'), 0, 'explicit retry resets the expensive retry budget');
select is((select state from public.pipeline_runs where session_id = 'f6000000-0000-0000-0000-000000000002'), 'queued'::public.pipeline_state, 'explicit retry restores queued pipeline state');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'f0000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.saga_id', 'f5000000-0000-0000-0000-000000000001', true);
select throws_like(
  $$ select public.get_session_review('f2000000-0000-0000-0000-000000000001', 'f3000000-0000-0000-0000-000000000001', 'f5000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000099') $$,
  '%Session is not available%',
  'session review fails closed for an unavailable Session'
);
reset role;

select * from finish();
rollback;

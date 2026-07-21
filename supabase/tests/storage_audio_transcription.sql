create extension if not exists pgtap with schema extensions;

begin;

select plan(36);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, email_change, email_change_token_new, recovery_token)
values
  ('70000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'module7-a@example.test', extensions.crypt('password', extensions.gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false, '', '', '', ''),
  ('70000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'module7-b@example.test', extensions.crypt('password', extensions.gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false, '', '', '', '')
on conflict (id) do nothing;

insert into public.gm_profiles (id, user_id, experience_level, improv_comfort, prep_style)
values
  ('70100000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 'experienced', 'mixed', 'light'),
  ('70100000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000002', 'experienced', 'mixed', 'light')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_gm_id, name, usage_limits)
values
  ('70200000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 'Module 7 Workspace A', '{"plan":"free","storage_bytes":1000000,"transcription_seconds_monthly":600}'::jsonb),
  ('70200000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000002', 'Module 7 Workspace B', '{"plan":"free","storage_bytes":1000000,"transcription_seconds_monthly":600}'::jsonb)
on conflict (id) do update set usage_limits = excluded.usage_limits;

insert into public.worlds (id, workspace_id, owner_gm_id, name)
values
  ('70300000-0000-0000-0000-000000000001', '70200000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 'Module 7 World A'),
  ('70300000-0000-0000-0000-000000000002', '70200000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000002', 'Module 7 World B')
on conflict (id) do nothing;

insert into public.world_eras (id, workspace_id, world_id, name)
values
  ('70400000-0000-0000-0000-000000000001', '70200000-0000-0000-0000-000000000001', '70300000-0000-0000-0000-000000000001', 'Module 7 Era A'),
  ('70400000-0000-0000-0000-000000000002', '70200000-0000-0000-0000-000000000002', '70300000-0000-0000-0000-000000000002', 'Module 7 Era B')
on conflict (id) do nothing;

insert into public.sagas (id, workspace_id, world_id, owner_gm_id, primary_era_id, name, audio_retention)
values
  ('70500000-0000-0000-0000-000000000001', '70200000-0000-0000-0000-000000000001', '70300000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', '70400000-0000-0000-0000-000000000001', 'Module 7 Saga A', 'delete_after_transcription'),
  ('70500000-0000-0000-0000-000000000002', '70200000-0000-0000-0000-000000000002', '70300000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000002', '70400000-0000-0000-0000-000000000002', 'Module 7 Saga B', 'retain')
on conflict (id) do update set audio_retention = excluded.audio_retention;

insert into public.sessions (id, workspace_id, world_id, saga_id, name, status, objective)
values
  ('70600000-0000-0000-0000-000000000001', '70200000-0000-0000-0000-000000000001', '70300000-0000-0000-0000-000000000001', '70500000-0000-0000-0000-000000000001', 'Module 7 Session A', 'started', 'Record the session'),
  ('70600000-0000-0000-0000-000000000002', '70200000-0000-0000-0000-000000000001', '70300000-0000-0000-0000-000000000001', '70500000-0000-0000-0000-000000000001', 'Module 7 Session Fail', 'ended', 'Fail transcription'),
  ('70600000-0000-0000-0000-000000000003', '70200000-0000-0000-0000-000000000002', '70300000-0000-0000-0000-000000000002', '70500000-0000-0000-0000-000000000002', 'Module 7 Session B', 'started', 'Other saga')
on conflict (id) do update set status = excluded.status;

delete from public.usage_events where workspace_id in ('70200000-0000-0000-0000-000000000001', '70200000-0000-0000-0000-000000000002');
delete from public.usage_monthly_rollups where workspace_id in ('70200000-0000-0000-0000-000000000001', '70200000-0000-0000-0000-000000000002');
delete from internal.cleanup_jobs where workspace_id in ('70200000-0000-0000-0000-000000000001', '70200000-0000-0000-0000-000000000002');
delete from internal.transcription_jobs where workspace_id in ('70200000-0000-0000-0000-000000000001', '70200000-0000-0000-0000-000000000002');
delete from internal.export_jobs where workspace_id in ('70200000-0000-0000-0000-000000000001', '70200000-0000-0000-0000-000000000002');
delete from public.transcripts where workspace_id in ('70200000-0000-0000-0000-000000000001', '70200000-0000-0000-0000-000000000002');
delete from public.audio_chunks where workspace_id in ('70200000-0000-0000-0000-000000000001', '70200000-0000-0000-0000-000000000002');

set local role authenticated;
select set_config('request.jwt.claim.sub', '70000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.saga_id', '70500000-0000-0000-0000-000000000001', true);

select has_function('public', 'get_audio_upload_target', array['uuid','uuid','uuid','uuid','integer','text','bigint'], 'get_audio_upload_target has the Module 7 signature');
select has_function('public', 'register_audio_chunk', array['uuid','uuid','uuid','uuid','integer','text','bigint','numeric','timestamp with time zone','text'], 'register_audio_chunk has the Module 7 signature');
select has_function('public', 'enqueue_transcription_job', array['uuid','uuid','uuid','uuid','text'], 'enqueue_transcription_job has the Module 7 signature');
select has_function('public', 'update_transcript_segments', array['uuid','uuid','uuid','uuid','jsonb'], 'update_transcript_segments has the Module 7 signature');
select has_function('public', 'get_transcript_source_context', array['uuid'], 'internal get_transcript_source_context helper has the Module 7 signature');

select is(
  public.get_audio_upload_target('70200000-0000-0000-0000-000000000001', '70300000-0000-0000-0000-000000000001', '70500000-0000-0000-0000-000000000001', '70600000-0000-0000-0000-000000000001', 0, 'webm', 2048)->>'storage_path',
  '70200000-0000-0000-0000-000000000001/70300000-0000-0000-0000-000000000001/70500000-0000-0000-0000-000000000001/70600000-0000-0000-0000-000000000001/0.webm',
  'audio upload target uses deterministic workspace/world/saga/session/sequence path'
);

create temp table module7_chunk as
select public.register_audio_chunk(
  '70200000-0000-0000-0000-000000000001',
  '70300000-0000-0000-0000-000000000001',
  '70500000-0000-0000-0000-000000000001',
  '70600000-0000-0000-0000-000000000001',
  0,
  '70200000-0000-0000-0000-000000000001/70300000-0000-0000-0000-000000000001/70500000-0000-0000-0000-000000000001/70600000-0000-0000-0000-000000000001/0.webm',
  2048,
  30,
  now(),
  'module7-chunk-0'
) as id;

select ok((select id is not null from module7_chunk), 'register_audio_chunk returns an audio chunk id');
select is((select count(*) from public.audio_chunks where session_id = '70600000-0000-0000-0000-000000000001'), 1::bigint, 'register_audio_chunk inserts one audio chunk row');
select is((select status from public.sessions where id = '70600000-0000-0000-0000-000000000001'), 'in_progress'::public.session_status, 'first registered audio chunk moves a started session to in_progress');
select is((select storage_bytes_current from public.usage_monthly_rollups where workspace_id = '70200000-0000-0000-0000-000000000001'), 2048::bigint, 'registered audio chunk charges storage bytes once');

select is(
  public.register_audio_chunk('70200000-0000-0000-0000-000000000001', '70300000-0000-0000-0000-000000000001', '70500000-0000-0000-0000-000000000001', '70600000-0000-0000-0000-000000000001', 0, '70200000-0000-0000-0000-000000000001/70300000-0000-0000-0000-000000000001/70500000-0000-0000-0000-000000000001/70600000-0000-0000-0000-000000000001/0.webm', 2048, 30, now(), 'module7-chunk-0'),
  (select id from module7_chunk),
  'duplicate audio chunk registration returns the existing chunk id'
);
select is((select count(*) from public.audio_chunks where session_id = '70600000-0000-0000-0000-000000000001'), 1::bigint, 'duplicate audio chunk registration does not create another row');
select is((select storage_bytes_current from public.usage_monthly_rollups where workspace_id = '70200000-0000-0000-0000-000000000001'), 2048::bigint, 'duplicate audio chunk registration does not double-charge storage bytes');

select throws_like(
  $$ select public.register_audio_chunk('70200000-0000-0000-0000-000000000001', '70300000-0000-0000-0000-000000000001', '70500000-0000-0000-0000-000000000001', '70600000-0000-0000-0000-000000000001', 1, '70200000-0000-0000-0000-000000000002/70300000-0000-0000-0000-000000000002/70500000-0000-0000-0000-000000000002/70600000-0000-0000-0000-000000000003/1.webm', 2048, 30, now(), 'module7-cross') $$,
  '%storage path does not match%',
  'register_audio_chunk rejects cross-scope storage paths'
);

create temp table module7_transcription_job as
select public.enqueue_transcription_job(
  '70200000-0000-0000-0000-000000000001',
  '70300000-0000-0000-0000-000000000001',
  '70500000-0000-0000-0000-000000000001',
  '70600000-0000-0000-0000-000000000001',
  'module7-transcribe-session'
) as id;

reset role;
insert into public.pipeline_runs (workspace_id, world_id, saga_id, session_id, state)
values ('70200000-0000-0000-0000-000000000001', '70300000-0000-0000-0000-000000000001', '70500000-0000-0000-0000-000000000001', '70600000-0000-0000-0000-000000000001', 'transcribing')
on conflict do nothing;

set local role authenticated;
select set_config('request.jwt.claim.sub', '70000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.saga_id', '70500000-0000-0000-0000-000000000001', true);

select ok((select id is not null from module7_transcription_job), 'enqueue_transcription_job returns a job id');
select is((select count(*) from public.transcripts where session_id = '70600000-0000-0000-0000-000000000001' and state = 'pending'), 1::bigint, 'enqueue_transcription_job creates one pending transcript');

reset role;
select is((select count(*) from internal.transcription_jobs where session_id = '70600000-0000-0000-0000-000000000001' and state = 'pending'), 1::bigint, 'enqueue_transcription_job creates one pending internal job');

set local role authenticated;
select set_config('request.jwt.claim.sub', '70000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.saga_id', '70500000-0000-0000-0000-000000000001', true);

select is(
  public.enqueue_transcription_job('70200000-0000-0000-0000-000000000001', '70300000-0000-0000-0000-000000000001', '70500000-0000-0000-0000-000000000001', '70600000-0000-0000-0000-000000000001', 'module7-transcribe-session'),
  (select id from module7_transcription_job),
  'enqueue_transcription_job is idempotent per session'
);

reset role;

select lives_ok(
  $$ select internal.complete_transcription_job(
    (select id from module7_transcription_job),
    '[{"start":0,"end":5,"text":"hello old"},{"start":5,"end":10,"text":"second line"}]'::jsonb,
    'whisper-test',
    'en',
    10
  ) $$,
  'internal.complete_transcription_job writes successful transcript results'
);

select is((select state from public.transcripts where session_id = '70600000-0000-0000-0000-000000000001'), 'complete'::public.transcript_state, 'completed transcription marks transcript complete');
select is((select jsonb_array_length(segments) from public.transcripts where session_id = '70600000-0000-0000-0000-000000000001'), 2, 'completed transcription stores transcript segments');
select is((select count(*) from internal.cleanup_jobs where workspace_id = '70200000-0000-0000-0000-000000000001' and job_kind = 'audio'), 1::bigint, 'completed transcription enqueues one audio cleanup job under delete-after-transcription retention');

insert into public.pipeline_runs (workspace_id, world_id, saga_id, session_id, state)
values ('70200000-0000-0000-0000-000000000001', '70300000-0000-0000-0000-000000000001', '70500000-0000-0000-0000-000000000001', '70600000-0000-0000-0000-000000000002', 'transcribing')
on conflict do nothing;

create temp table module7_failed_job as
select public.enqueue_transcription_job(
  '70200000-0000-0000-0000-000000000001',
  '70300000-0000-0000-0000-000000000001',
  '70500000-0000-0000-0000-000000000001',
  '70600000-0000-0000-0000-000000000002',
  'module7-transcribe-fail'
) as id;

select lives_ok(
  $$ select internal.fail_transcription_job((select id from module7_failed_job), 'provider failed') $$,
  'internal.fail_transcription_job records explicit failure state'
);
select is((select state from public.transcripts where session_id = '70600000-0000-0000-0000-000000000002'), 'failed'::public.transcript_state, 'failed transcription marks transcript failed');
select is((select inputs_summary->>'transcript_failed' from public.pipeline_runs where session_id = '70600000-0000-0000-0000-000000000002'), 'true', 'failed transcription records pipeline transcript_failed input summary');

insert into public.sources (id, workspace_id, world_id, saga_id, kind, transcript_id, session_id, start_seconds, end_seconds, raw_excerpt)
select '70700000-0000-0000-0000-000000000001', workspace_id, world_id, saga_id, 'transcript_segment', id, session_id, 0, 5, 'hello old'
from public.transcripts
where session_id = '70600000-0000-0000-0000-000000000001';

set local role authenticated;
select set_config('request.jwt.claim.sub', '70000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.saga_id', '70500000-0000-0000-0000-000000000001', true);

select is(
  public.update_transcript_segments(
    '70200000-0000-0000-0000-000000000001',
    '70300000-0000-0000-0000-000000000001',
    '70500000-0000-0000-0000-000000000001',
    (select id from public.transcripts where session_id = '70600000-0000-0000-0000-000000000001'),
    '[{"start":0,"end":5,"text":"hello new"},{"start":5,"end":10,"text":"second line","deleted":true}]'::jsonb
  ),
  (select id from public.transcripts where session_id = '70600000-0000-0000-0000-000000000001'),
  'update_transcript_segments returns the transcript id'
);
select ok((select original_segments is not null from public.transcripts where session_id = '70600000-0000-0000-0000-000000000001'), 'first transcript edit freezes original segments');
select ok((select edited_at is not null from public.transcripts where session_id = '70600000-0000-0000-0000-000000000001'), 'transcript edit records edited_at');
select is((select segments #>> '{0,start}' from public.transcripts where session_id = '70600000-0000-0000-0000-000000000001'), '0', 'transcript edit preserves segment start boundary');
select is((select raw_excerpt from public.sources where id = '70700000-0000-0000-0000-000000000001'), 'hello old', 'transcript edit does not mutate frozen source raw_excerpt');
reset role;
select is(public.get_transcript_source_context('70700000-0000-0000-0000-000000000001')->>'drift_state', 'edited', 'internal transcript source context reports citation drift');
set local role authenticated;
select set_config('request.jwt.claim.sub', '70000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.saga_id', '70500000-0000-0000-0000-000000000001', true);
select is((select inputs_summary->>'transcript_edit_reembed_pending' from public.pipeline_runs where session_id = '70600000-0000-0000-0000-000000000001'), 'true', 'transcript edit marks re-embedding pending for Module 8');

select throws_like(
  $$ select public.update_transcript_segments(
    '70200000-0000-0000-0000-000000000001',
    '70300000-0000-0000-0000-000000000001',
    '70500000-0000-0000-0000-000000000001',
    (select id from public.transcripts where session_id = '70600000-0000-0000-0000-000000000001'),
    '[{"start":0,"end":6,"text":"bad boundary"},{"start":5,"end":10,"text":"second line","deleted":true}]'::jsonb
  ) $$,
  '%segment boundaries are immutable%',
  'update_transcript_segments rejects boundary changes'
);

reset role;

insert into internal.export_jobs (id, workspace_id, world_id, saga_id, gm_id, requested_formats, storage_path, state, expires_at)
values ('70800000-0000-0000-0000-000000000001', '70200000-0000-0000-0000-000000000001', '70300000-0000-0000-0000-000000000001', '70500000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', array['json'], '70200000-0000-0000-0000-000000000001/70300000-0000-0000-0000-000000000001/70500000-0000-0000-0000-000000000001/70800000-0000-0000-0000-000000000001.zip', 'complete', now() - interval '1 day');

select is(internal.enqueue_expired_export_cleanup_jobs(), 1, 'expired export cleanup helper enqueues one cleanup job');
select is(internal.enqueue_expired_export_cleanup_jobs(), 0, 'expired export cleanup helper is idempotent');

update public.sessions
set status = 'ended'
where saga_id = '70500000-0000-0000-0000-000000000001';

update public.sagas
set deleted_at = now()
where id = '70500000-0000-0000-0000-000000000001';

select is((select count(*) from internal.cleanup_jobs where saga_id = '70500000-0000-0000-0000-000000000001' and job_kind = 'saga'), 1::bigint, 'soft-deleted saga enqueues one saga cleanup job');

select * from finish();

rollback;

create extension if not exists pgtap with schema extensions;

begin;

select plan(13);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, email_change, email_change_token_new, recovery_token)
values ('e0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'stage-recovery@example.test', extensions.crypt('password', extensions.gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false, '', '', '', '')
on conflict (id) do nothing;

insert into public.gm_profiles (id, user_id, experience_level, improv_comfort, prep_style)
values ('e1000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'experienced', 'mixed', 'light')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_gm_id, name, usage_limits)
values ('e2000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'Stage Recovery Workspace', '{"storage_bytes":1000000,"transcription_seconds_monthly":600}'::jsonb)
on conflict (id) do update set usage_limits = excluded.usage_limits;

insert into public.worlds (id, workspace_id, owner_gm_id, name)
values ('e3000000-0000-0000-0000-000000000001', 'e2000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'Stage Recovery World')
on conflict (id) do nothing;

insert into public.world_eras (id, workspace_id, world_id, name)
values ('e4000000-0000-0000-0000-000000000001', 'e2000000-0000-0000-0000-000000000001', 'e3000000-0000-0000-0000-000000000001', 'Stage Recovery Era')
on conflict (id) do nothing;

insert into public.sagas (id, workspace_id, world_id, owner_gm_id, primary_era_id, name)
values ('e5000000-0000-0000-0000-000000000001', 'e2000000-0000-0000-0000-000000000001', 'e3000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'e4000000-0000-0000-0000-000000000001', 'Stage Recovery Saga')
on conflict (id) do nothing;

insert into public.sessions (id, workspace_id, world_id, saga_id, name, status, started_at, went_live_at, ended_pending_undo_at, audio_chunk_count_expected, recording_finalized_at)
values
  ('e6000000-0000-0000-0000-000000000001', 'e2000000-0000-0000-0000-000000000001', 'e3000000-0000-0000-0000-000000000001', 'e5000000-0000-0000-0000-000000000001', 'Expired Undo Session', 'ended_pending_undo', now() - interval '2 hours', now() - interval '2 hours', now() - interval '61 seconds', 2, now()),
  ('e6000000-0000-0000-0000-000000000002', 'e2000000-0000-0000-0000-000000000001', 'e3000000-0000-0000-0000-000000000001', 'e5000000-0000-0000-0000-000000000001', 'Undo Still Open', 'ended_pending_undo', now() - interval '1 hour', now() - interval '1 hour', now() - interval '30 seconds', null, null)
on conflict (id) do update set status = excluded.status, ended_pending_undo_at = excluded.ended_pending_undo_at, audio_chunk_count_expected = excluded.audio_chunk_count_expected, recording_finalized_at = excluded.recording_finalized_at;

delete from public.usage_events where workspace_id = 'e2000000-0000-0000-0000-000000000001';
delete from public.usage_monthly_rollups where workspace_id = 'e2000000-0000-0000-0000-000000000001';
delete from internal.transcription_jobs where workspace_id = 'e2000000-0000-0000-0000-000000000001';
delete from public.transcripts where workspace_id = 'e2000000-0000-0000-0000-000000000001';
delete from public.audio_chunks where workspace_id = 'e2000000-0000-0000-0000-000000000001';
delete from public.pipeline_runs where workspace_id = 'e2000000-0000-0000-0000-000000000001';

select has_function('public', 'finalize_audio_upload', array['uuid','uuid','uuid','uuid','integer'], 'finalize_audio_upload RPC exists');
select has_function('internal', 'finalize_expired_stage_sessions', array['timestamp with time zone'], 'server-owned Stage finalizer exists');
select is(internal.finalize_expired_stage_sessions(now()), 1, 'server finalizer closes only expired undo sessions');
select is((select status from public.sessions where id = 'e6000000-0000-0000-0000-000000000001'), 'ended'::public.session_status, 'expired session is ended');
select is((select status from public.sessions where id = 'e6000000-0000-0000-0000-000000000002'), 'ended_pending_undo'::public.session_status, 'unexpired session keeps its undo window');
select is((select count(*) from public.pipeline_runs where session_id = 'e6000000-0000-0000-0000-000000000001'), 1::bigint, 'server finalization creates one pipeline run');
select is(internal.finalize_expired_stage_sessions(now()), 0, 'server finalization is retry safe');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'e0000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.saga_id', 'e5000000-0000-0000-0000-000000000001', true);

select ok(public.register_audio_chunk('e2000000-0000-0000-0000-000000000001', 'e3000000-0000-0000-0000-000000000001', 'e5000000-0000-0000-0000-000000000001', 'e6000000-0000-0000-0000-000000000001', 0, 'e2000000-0000-0000-0000-000000000001/e3000000-0000-0000-0000-000000000001/e5000000-0000-0000-0000-000000000001/e6000000-0000-0000-0000-000000000001/0.webm', 1000, 30, now(), 'stage-recovery-0') is not null, 'late chunk registration succeeds after session end');

reset role;
select is((select count(*) from internal.transcription_jobs where session_id = 'e6000000-0000-0000-0000-000000000001'), 0::bigint, 'transcription waits for every expected chunk');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'e0000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.saga_id', 'e5000000-0000-0000-0000-000000000001', true);
select ok(public.register_audio_chunk('e2000000-0000-0000-0000-000000000001', 'e3000000-0000-0000-0000-000000000001', 'e5000000-0000-0000-0000-000000000001', 'e6000000-0000-0000-0000-000000000001', 1, 'e2000000-0000-0000-0000-000000000001/e3000000-0000-0000-0000-000000000001/e5000000-0000-0000-0000-000000000001/e6000000-0000-0000-0000-000000000001/1.webm', 1000, 30, now(), 'stage-recovery-1') is not null, 'final recovered chunk registers');
select is(public.finalize_audio_upload('e2000000-0000-0000-0000-000000000001', 'e3000000-0000-0000-0000-000000000001', 'e5000000-0000-0000-0000-000000000001', 'e6000000-0000-0000-0000-000000000001', 2), 'e6000000-0000-0000-0000-000000000001'::uuid, 'audio finalization RPC is retry safe');

reset role;
select is((select count(*) from internal.transcription_jobs where session_id = 'e6000000-0000-0000-0000-000000000001'), 1::bigint, 'all recovered chunks enqueue transcription exactly once');
select is((select inputs_summary->>'audio_upload_complete' from public.pipeline_runs where session_id = 'e6000000-0000-0000-0000-000000000001'), 'true', 'pipeline records completed audio evidence');

select * from finish();
rollback;

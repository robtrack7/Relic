create extension if not exists pgtap with schema extensions;

begin;

select plan(29);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, email_change, email_change_token_new, recovery_token)
values
  ('a1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'module10@example.test', extensions.crypt('password', extensions.gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false, '', '', '', '')
on conflict (id) do nothing;

insert into public.gm_profiles (id, user_id, experience_level, notification_preferences)
values (
  'a1100000-0000-0000-0000-000000000001',
  'a1000000-0000-0000-0000-000000000001',
  'experienced',
  '{"email":{"pipeline_ready":true,"pipeline_failed":true,"pipeline_stale_30d":true,"pipeline_stale_90d":true},"push":{"pipeline_ready":true,"pipeline_failed":true},"paused":false}'::jsonb
)
on conflict (id) do update set notification_preferences = excluded.notification_preferences;

insert into public.workspaces (id, owner_gm_id, name, usage_limits)
values ('a1200000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'Module 10 Workspace', '{"plan":"test","ai_credits_monthly":100,"transcription_seconds_monthly":3600,"storage_bytes":1000000,"imports_monthly":10,"exports_monthly":3}'::jsonb)
on conflict (id) do update set usage_limits = excluded.usage_limits;

insert into public.worlds (id, workspace_id, owner_gm_id, name)
values ('a1300000-0000-0000-0000-000000000001', 'a1200000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'Module 10 World')
on conflict (id) do nothing;

insert into public.world_eras (id, workspace_id, world_id, name)
values ('a1400000-0000-0000-0000-000000000001', 'a1200000-0000-0000-0000-000000000001', 'a1300000-0000-0000-0000-000000000001', 'Default Era')
on conflict (id) do nothing;

insert into public.sagas (id, workspace_id, world_id, owner_gm_id, primary_era_id, name)
values ('a1500000-0000-0000-0000-000000000001', 'a1200000-0000-0000-0000-000000000001', 'a1300000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'a1400000-0000-0000-0000-000000000001', 'Module 10 Saga')
on conflict (id) do nothing;

insert into public.sessions (id, workspace_id, world_id, saga_id, scope, name, status, ended_at)
values
  ('a1600000-0000-0000-0000-000000000001', 'a1200000-0000-0000-0000-000000000001', 'a1300000-0000-0000-0000-000000000001', 'a1500000-0000-0000-0000-000000000001', 'saga', 'Ended Session', 'ended', now() - interval '35 days'),
  ('a1600000-0000-0000-0000-000000000002', 'a1200000-0000-0000-0000-000000000001', 'a1300000-0000-0000-0000-000000000001', 'a1500000-0000-0000-0000-000000000001', 'saga', 'Active Session', 'in_progress', null)
on conflict (id) do nothing;

insert into public.usage_monthly_rollups (workspace_id, period_start, period_end, exports_used)
values ('a1200000-0000-0000-0000-000000000001', date_trunc('month', now())::date, (date_trunc('month', now()) + interval '1 month - 1 day')::date, 0)
on conflict (workspace_id, period_start) do update set exports_used = excluded.exports_used;

create or replace function pg_temp.module10_request_export()
returns jsonb
language plpgsql
as $$
declare
  response jsonb;
begin
  if to_regprocedure('public.request_saga_export(uuid,uuid,uuid,text[],boolean)') is null then
    return '{"allowed":false,"missing":true}'::jsonb;
  end if;

  execute 'select public.request_saga_export($1,$2,$3,$4,$5)'
    using 'a1200000-0000-0000-0000-000000000001'::uuid,
          'a1300000-0000-0000-0000-000000000001'::uuid,
          'a1500000-0000-0000-0000-000000000001'::uuid,
          array['json','markdown']::text[],
          false
    into response;
  return response;
end;
$$;

create or replace function pg_temp.module10_export_status(export_id uuid)
returns jsonb
language plpgsql
as $$
declare
  response jsonb;
begin
  if export_id is null or to_regprocedure('public.get_saga_export_status(uuid,uuid,uuid,uuid)') is null then
    return '{"available":false,"missing":true}'::jsonb;
  end if;

  execute 'select public.get_saga_export_status($1,$2,$3,$4)'
    using 'a1200000-0000-0000-0000-000000000001'::uuid,
          'a1300000-0000-0000-0000-000000000001'::uuid,
          'a1500000-0000-0000-0000-000000000001'::uuid,
          export_id
    into response;
  return response;
end;
$$;

create or replace function pg_temp.module10_export_download(export_id uuid)
returns jsonb
language plpgsql
as $$
declare
  response jsonb;
begin
  if export_id is null or to_regprocedure('public.get_saga_export_download(uuid,uuid,uuid,uuid)') is null then
    return '{"available":false,"missing":true}'::jsonb;
  end if;

  execute 'select public.get_saga_export_download($1,$2,$3,$4)'
    using 'a1200000-0000-0000-0000-000000000001'::uuid,
          'a1300000-0000-0000-0000-000000000001'::uuid,
          'a1500000-0000-0000-0000-000000000001'::uuid,
          export_id
    into response;
  return response;
end;
$$;

create or replace function pg_temp.module10_complete_export(export_id uuid)
returns uuid
language plpgsql
as $$
declare
  response uuid;
begin
  if export_id is null or to_regprocedure('internal.complete_export_job(uuid,text,text)') is null then
    return null;
  end if;

  execute 'select internal.complete_export_job($1,$2,$3)'
    using export_id,
          'exports/a1200000-0000-0000-0000-000000000001/a1300000-0000-0000-0000-000000000001/a1500000-0000-0000-0000-000000000001/export.zip',
          'https://download.example/export.zip'
    into response;
  return response;
end;
$$;

create or replace function pg_temp.module10_scan_stale()
returns integer
language plpgsql
as $$
declare
  response integer;
begin
  if to_regprocedure('internal.scan_stale_pipelines()') is null then
    return 0;
  end if;

  execute 'select internal.scan_stale_pipelines()' into response;
  return coalesce(response, 0);
end;
$$;

create or replace function pg_temp.module10_dispatch_notification(notification_id uuid)
returns uuid
language plpgsql
as $$
declare
  response uuid;
begin
  if notification_id is null or to_regprocedure('internal.dispatch_notification_for_test(uuid)') is null then
    return null;
  end if;

  execute 'select internal.dispatch_notification_for_test($1)' using notification_id into response;
  return response;
end;
$$;

create or replace function pg_temp.module10_complete_cleanup(job_id uuid)
returns uuid
language plpgsql
as $$
declare
  response uuid;
begin
  if job_id is null or to_regprocedure('internal.complete_cleanup_job(uuid,integer,integer)') is null then
    return null;
  end if;

  execute 'select internal.complete_cleanup_job($1,$2,$3)' using job_id, 1, 0 into response;
  return response;
end;
$$;

select has_function('public', 'request_saga_export', array['uuid','uuid','uuid','text[]','boolean'], 'request_saga_export RPC exists');
select has_function('public', 'get_saga_export_status', array['uuid','uuid','uuid','uuid'], 'get_saga_export_status RPC exists');
select has_function('public', 'get_saga_export_download', array['uuid','uuid','uuid','uuid'], 'get_saga_export_download RPC exists');
select has_function('internal', 'complete_export_job', array['uuid','text','text'], 'complete_export_job worker helper exists');
select has_function('internal', 'scan_stale_pipelines', array[]::text[], 'scan_stale_pipelines helper exists');
select has_function('internal', 'dispatch_notification_for_test', array['uuid'], 'deterministic notification dispatcher exists');
select has_function('internal', 'complete_cleanup_job', array['uuid','integer','integer'], 'complete_cleanup_job helper exists');
select has_function('public', 'update_notification_preferences', array['jsonb'], 'notification preference RPC exists');
select has_function('public', 'register_push_device', array['text','public.push_platform','text'], 'push device registration RPC exists');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a1000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.saga_id', 'a1500000-0000-0000-0000-000000000001', true);

create temp table module10_export_responses (
  label text primary key,
  response jsonb
);

insert into module10_export_responses values ('initial', pg_temp.module10_request_export());

reset role;
create temp table module10_export_ids as
select id
from internal.export_jobs
where workspace_id = 'a1200000-0000-0000-0000-000000000001'
limit 1;

select ok((select (response ->> 'allowed')::boolean from module10_export_responses where label = 'initial'), 'export request is allowed with available quota');
select is((select count(*) from internal.export_jobs where workspace_id = 'a1200000-0000-0000-0000-000000000001' and state = 'pending'), 1::bigint, 'export request enqueues one pending export job');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a1000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.saga_id', 'a1500000-0000-0000-0000-000000000001', true);
insert into module10_export_responses values ('duplicate', pg_temp.module10_request_export());

reset role;
select is((select response ->> 'export_id' from module10_export_responses where label = 'duplicate'), (select id::text from module10_export_ids), 'duplicate active export request returns the existing job');
select is((select count(*) from internal.export_jobs where workspace_id = 'a1200000-0000-0000-0000-000000000001'), 1::bigint, 'duplicate export request does not enqueue a second active job');

update public.workspaces set usage_limits = jsonb_set(usage_limits, '{exports_monthly}', '0'::jsonb) where id = 'a1200000-0000-0000-0000-000000000001';
update internal.export_jobs set state = 'complete' where workspace_id = 'a1200000-0000-0000-0000-000000000001';

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a1000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.saga_id', 'a1500000-0000-0000-0000-000000000001', true);
insert into module10_export_responses values ('quota_blocked', pg_temp.module10_request_export());

reset role;
select is((select (response ->> 'allowed')::boolean from module10_export_responses where label = 'quota_blocked'), false, 'export request is quota-blocked when monthly exports are exhausted');
update public.workspaces set usage_limits = jsonb_set(usage_limits, '{exports_monthly}', '3'::jsonb) where id = 'a1200000-0000-0000-0000-000000000001';
select pg_temp.module10_complete_export((select id from module10_export_ids));

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a1000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.saga_id', 'a1500000-0000-0000-0000-000000000001', true);
insert into module10_export_responses
values ('status', pg_temp.module10_export_status((select nullif(response ->> 'export_id', '')::uuid from module10_export_responses where label = 'initial')));
insert into module10_export_responses
values ('download', pg_temp.module10_export_download((select nullif(response ->> 'export_id', '')::uuid from module10_export_responses where label = 'initial')));

reset role;
select is((select response ->> 'state' from module10_export_responses where label = 'status'), 'complete', 'export status returns complete');
select is((select response ? 'storage_path' from module10_export_responses where label = 'status'), false, 'export status does not expose internal storage path');
select is((select response ->> 'download_url' from module10_export_responses where label = 'download'), 'https://download.example/export.zip', 'completed export returns signed download URL');
select is((select exports_used from public.usage_monthly_rollups where workspace_id = 'a1200000-0000-0000-0000-000000000001'), 1, 'completed export records usage exactly once');

insert into public.pipeline_runs (id, workspace_id, world_id, saga_id, session_id, state, created_at, updated_at)
values ('a1700000-0000-0000-0000-000000000001', 'a1200000-0000-0000-0000-000000000001', 'a1300000-0000-0000-0000-000000000001', 'a1500000-0000-0000-0000-000000000001', 'a1600000-0000-0000-0000-000000000001', 'queued', now() - interval '2 days', now() - interval '2 days')
on conflict (id) do nothing;

update public.pipeline_runs set state = 'ready_for_review' where id = 'a1700000-0000-0000-0000-000000000001';
select is((select count(*) from internal.notification_queue where kind = 'pipeline_ready' and payload ->> 'pipeline_run_id' = 'a1700000-0000-0000-0000-000000000001'), 1::bigint, 'pipeline ready enqueues one notification');
update public.pipeline_runs set state = 'ready_for_review' where id = 'a1700000-0000-0000-0000-000000000001';
select is((select count(*) from internal.notification_queue where kind = 'pipeline_ready' and payload ->> 'pipeline_run_id' = 'a1700000-0000-0000-0000-000000000001'), 1::bigint, 'pipeline ready notification enqueue is idempotent');

insert into public.pipeline_runs (id, workspace_id, world_id, saga_id, session_id, state, created_at, updated_at)
values ('a1700000-0000-0000-0000-000000000002', 'a1200000-0000-0000-0000-000000000001', 'a1300000-0000-0000-0000-000000000001', 'a1500000-0000-0000-0000-000000000001', 'a1600000-0000-0000-0000-000000000002', 'queued', now(), now())
on conflict (id) do nothing;
update public.pipeline_runs set state = 'failed' where id = 'a1700000-0000-0000-0000-000000000002';
select is((select count(*) from internal.notification_queue where kind = 'pipeline_failed' and payload ->> 'pipeline_run_id' = 'a1700000-0000-0000-0000-000000000002'), 0::bigint, 'pipeline failure notification is suppressed during active sessions');

insert into public.pipeline_runs (id, workspace_id, world_id, saga_id, session_id, state, created_at, updated_at)
values
  ('a1700000-0000-0000-0000-000000000003', 'a1200000-0000-0000-0000-000000000001', 'a1300000-0000-0000-0000-000000000001', 'a1500000-0000-0000-0000-000000000001', 'a1600000-0000-0000-0000-000000000001', 'ready_for_review', now() - interval '31 days', now() - interval '31 days'),
  ('a1700000-0000-0000-0000-000000000004', 'a1200000-0000-0000-0000-000000000001', 'a1300000-0000-0000-0000-000000000001', 'a1500000-0000-0000-0000-000000000001', 'a1600000-0000-0000-0000-000000000001', 'ready_for_review', now() - interval '91 days', now() - interval '91 days')
on conflict (id) do nothing;

select ok(pg_temp.module10_scan_stale() >= 2, 'stale pipeline scan marks stale rows');
select ok((select staleness_warned_at is not null from public.pipeline_runs where id = 'a1700000-0000-0000-0000-000000000003'), '30-day stale scan sets warning timestamp');
select ok((select staleness_nudge_90_at is not null from public.pipeline_runs where id = 'a1700000-0000-0000-0000-000000000004'), '90-day stale scan sets nudge timestamp');
select is((select state from public.pipeline_runs where id = 'a1700000-0000-0000-0000-000000000004'), 'ready_for_review'::public.pipeline_state, 'stale scan does not auto-archive pipeline rows');

insert into public.push_devices (id, user_id, expo_push_token, platform, device_name)
values ('a1800000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'ExponentPushToken[module10]', 'ios', 'Test Phone')
on conflict (id) do nothing;

update public.gm_profiles
set notification_preferences = '{"email":{"pipeline_ready":false},"push":{"pipeline_ready":true},"paused":false}'::jsonb
where user_id = 'a1000000-0000-0000-0000-000000000001';

select pg_temp.module10_dispatch_notification((select id from internal.notification_queue where kind = 'pipeline_ready' and payload ->> 'pipeline_run_id' = 'a1700000-0000-0000-0000-000000000001' limit 1));
select is((select state from internal.notification_queue where kind = 'pipeline_ready' and payload ->> 'pipeline_run_id' = 'a1700000-0000-0000-0000-000000000001' limit 1), 'sent', 'notification dispatcher marks sendable notification sent');
select is((select payload #>> '{dispatch,email,state}' from internal.notification_queue where kind = 'pipeline_ready' and payload ->> 'pipeline_run_id' = 'a1700000-0000-0000-0000-000000000001' limit 1), 'skipped', 'notification dispatcher skips disabled email channel at send time');
select is((select payload #>> '{dispatch,push,state}' from internal.notification_queue where kind = 'pipeline_ready' and payload ->> 'pipeline_run_id' = 'a1700000-0000-0000-0000-000000000001' limit 1), 'sent', 'notification dispatcher sends enabled push channel at send time');

insert into internal.cleanup_jobs (id, workspace_id, world_id, saga_id, job_kind, payload, idempotency_key)
values ('a1900000-0000-0000-0000-000000000001', 'a1200000-0000-0000-0000-000000000001', 'a1300000-0000-0000-0000-000000000001', 'a1500000-0000-0000-0000-000000000001', 'exports', '{"storage_path":"exports/a1200000-0000-0000-0000-000000000001/a1300000-0000-0000-0000-000000000001/a1500000-0000-0000-0000-000000000001/export.zip"}'::jsonb, 'module10-cleanup')
on conflict (id) do nothing;
select pg_temp.module10_complete_cleanup('a1900000-0000-0000-0000-000000000001');
select is((select state from internal.cleanup_jobs where id = 'a1900000-0000-0000-0000-000000000001'), 'complete', 'cleanup completion helper marks job complete');

select * from finish();

rollback;

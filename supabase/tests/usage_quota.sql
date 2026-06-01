create extension if not exists pgtap with schema extensions;

begin;

select plan(19);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, email_change, email_change_token_new, recovery_token)
values
  ('d0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'module6-a@example.test', extensions.crypt('password', extensions.gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false, '', '', '', '')
on conflict (id) do nothing;

insert into public.gm_profiles (id, user_id, experience_level, improv_comfort, prep_style)
values ('d1000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'experienced', 'mixed', 'light')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_gm_id, name, usage_limits)
values (
  'd2000000-0000-0000-0000-000000000001',
  'd0000000-0000-0000-0000-000000000001',
  'Module 6 Workspace',
  '{"plan":"free","ai_credits_monthly":100,"transcription_seconds_monthly":600,"storage_bytes":1000,"imports_monthly":5,"exports_monthly":3}'::jsonb
)
on conflict (id) do update set usage_limits = excluded.usage_limits;

insert into public.worlds (id, workspace_id, owner_gm_id, name)
values ('d3000000-0000-0000-0000-000000000001', 'd2000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'Module 6 World')
on conflict (id) do nothing;

insert into public.world_eras (id, workspace_id, world_id, name)
values ('d4000000-0000-0000-0000-000000000001', 'd2000000-0000-0000-0000-000000000001', 'd3000000-0000-0000-0000-000000000001', 'Module 6 Era')
on conflict (id) do nothing;

insert into public.sagas (id, workspace_id, world_id, owner_gm_id, primary_era_id, name)
values ('d5000000-0000-0000-0000-000000000001', 'd2000000-0000-0000-0000-000000000001', 'd3000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'd4000000-0000-0000-0000-000000000001', 'Module 6 Saga')
on conflict (id) do nothing;

delete from public.usage_events where workspace_id = 'd2000000-0000-0000-0000-000000000001';
delete from public.usage_monthly_rollups where workspace_id = 'd2000000-0000-0000-0000-000000000001';
delete from public.quota_overrides where workspace_id = 'd2000000-0000-0000-0000-000000000001';

insert into public.usage_monthly_rollups (workspace_id, period_start, period_end, ai_credits_used)
values ('d2000000-0000-0000-0000-000000000001', date_trunc('month', now())::date, (date_trunc('month', now()) + interval '1 month - 1 day')::date, 65);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'd0000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.saga_id', 'd5000000-0000-0000-0000-000000000001', true);

select has_function('public', 'record_usage_event', array['uuid','uuid','uuid','text','numeric','text','text','jsonb'], 'record_usage_event has the Module 6 signature');

select is(
  (select severity from public.check_quota_preflight('d2000000-0000-0000-0000-000000000001', 'd3000000-0000-0000-0000-000000000001', 'd5000000-0000-0000-0000-000000000001', 'ai_call', 5, '{}'::jsonb)),
  'warn_70',
  'quota preflight returns warn_70 at seventy percent'
);

reset role;
update public.usage_monthly_rollups set ai_credits_used = 85 where workspace_id = 'd2000000-0000-0000-0000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub', 'd0000000-0000-0000-0000-000000000001', true);

select is(
  (select severity from public.check_quota_preflight('d2000000-0000-0000-0000-000000000001', 'd3000000-0000-0000-0000-000000000001', 'd5000000-0000-0000-0000-000000000001', 'ai_call', 5, '{}'::jsonb)),
  'warn_90',
  'quota preflight returns warn_90 at ninety percent'
);

select is(
  (select severity from public.check_quota_preflight('d2000000-0000-0000-0000-000000000001', 'd3000000-0000-0000-0000-000000000001', 'd5000000-0000-0000-0000-000000000001', 'ai_call', 20, '{}'::jsonb)),
  'blocked',
  'quota preflight blocks over limit'
);

select is(
  (select allowed from public.check_quota_preflight('d2000000-0000-0000-0000-000000000001', 'd3000000-0000-0000-0000-000000000001', 'd5000000-0000-0000-0000-000000000001', 'manual_edit', 999, '{}'::jsonb)),
  true,
  'manual work is never quota blocked'
);

reset role;
insert into public.quota_overrides (workspace_id, limit_key, override_value, reason, expires_at)
values ('d2000000-0000-0000-0000-000000000001', 'ai_credits_monthly', 200, 'module 6 test override', now() + interval '1 day');
set local role authenticated;
select set_config('request.jwt.claim.sub', 'd0000000-0000-0000-0000-000000000001', true);

select is(
  (select allowed from public.check_quota_preflight('d2000000-0000-0000-0000-000000000001', 'd3000000-0000-0000-0000-000000000001', 'd5000000-0000-0000-0000-000000000001', 'ai_call', 20, '{}'::jsonb)),
  true,
  'active quota override raises the effective limit'
);

reset role;
delete from public.usage_events where workspace_id = 'd2000000-0000-0000-0000-000000000001';
update public.usage_monthly_rollups
set ai_credits_used = 0, ai_calls = 0, heavy_ai_jobs = 0, transcription_seconds_used = 0, storage_bytes_current = 0, imports_used = 0, exports_used = 0
where workspace_id = 'd2000000-0000-0000-0000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub', 'd0000000-0000-0000-0000-000000000001', true);

create temp table module6_ai_event as
select public.record_usage_event(
  'd2000000-0000-0000-0000-000000000001',
  'd3000000-0000-0000-0000-000000000001',
  'd5000000-0000-0000-0000-000000000001',
  'ai_call',
  10,
  'ai_credit',
  'module6-ai-1',
  '{"task_name":"compose_prep_briefing","provider":"litellm","model":"test-model","ai_credits":10,"heavy":true}'::jsonb
) as id;

select ok((select id is not null from module6_ai_event), 'record_usage_event returns an event id');
select is((select count(*) from public.usage_events where idempotency_key = 'module6-ai-1'), 1::bigint, 'record_usage_event inserts one usage event');
select is((select ai_credits_used from public.usage_monthly_rollups where workspace_id = 'd2000000-0000-0000-0000-000000000001'), 10, 'AI credit event increments monthly AI credits');

select is(
  public.record_usage_event('d2000000-0000-0000-0000-000000000001', 'd3000000-0000-0000-0000-000000000001', 'd5000000-0000-0000-0000-000000000001', 'ai_call', 10, 'ai_credit', 'module6-ai-1', '{"ai_credits":10}'::jsonb),
  (select id from module6_ai_event),
  'duplicate idempotency key returns existing event id'
);

select is((select count(*) from public.usage_events where idempotency_key = 'module6-ai-1'), 1::bigint, 'duplicate idempotency key does not insert a second event');
select is((select ai_credits_used from public.usage_monthly_rollups where workspace_id = 'd2000000-0000-0000-0000-000000000001'), 10, 'duplicate idempotency key does not double charge rollup');

select public.record_usage_event('d2000000-0000-0000-0000-000000000001', 'd3000000-0000-0000-0000-000000000001', 'd5000000-0000-0000-0000-000000000001', 'transcription', 120, 'second', 'module6-transcription-1', '{"audio_seconds":120}'::jsonb);
select is((select transcription_seconds_used from public.usage_monthly_rollups where workspace_id = 'd2000000-0000-0000-0000-000000000001'), 120, 'transcription event increments seconds');

select public.record_usage_event('d2000000-0000-0000-0000-000000000001', 'd3000000-0000-0000-0000-000000000001', 'd5000000-0000-0000-0000-000000000001', 'storage_upload', 300, 'byte', 'module6-storage-1', '{"storage_bytes":300}'::jsonb);
select is((select storage_bytes_current from public.usage_monthly_rollups where workspace_id = 'd2000000-0000-0000-0000-000000000001'), 300::bigint, 'storage event increments current storage bytes');

select public.record_usage_event('d2000000-0000-0000-0000-000000000001', 'd3000000-0000-0000-0000-000000000001', 'd5000000-0000-0000-0000-000000000001', 'import', 1, 'count', 'module6-import-1', '{}'::jsonb);
select public.record_usage_event('d2000000-0000-0000-0000-000000000001', 'd3000000-0000-0000-0000-000000000001', 'd5000000-0000-0000-0000-000000000001', 'export', 1, 'count', 'module6-export-1', '{}'::jsonb);
select is((select imports_used + exports_used from public.usage_monthly_rollups where workspace_id = 'd2000000-0000-0000-0000-000000000001'), 2, 'import and export events increment count rollups');

select public.record_usage_event(
  'd2000000-0000-0000-0000-000000000001',
  'd3000000-0000-0000-0000-000000000001',
  'd5000000-0000-0000-0000-000000000001',
  'ai_call',
  0,
  'internal_cost',
  'module6-provider-fail-1',
  '{"user_charge":false,"provider":"litellm","model":"test-model","cost_estimate_usd":0.012345,"failure_reason":"provider_failed"}'::jsonb
);

select ok(exists (select 1 from public.usage_events where idempotency_key = 'module6-provider-fail-1' and cost_estimate_usd = 0.012345), 'provider failure writes internal cost event');
select is((select ai_credits_used from public.usage_monthly_rollups where workspace_id = 'd2000000-0000-0000-0000-000000000001'), 10, 'provider failure without usable output does not increment human AI credits');

select ok(
  public.get_workspace_usage_summary('d2000000-0000-0000-0000-000000000001') ?& array['usage_limits','current_rollup','meters','reset_at'],
  'usage summary returns usage limits, current rollup, meters, and reset_at'
);

select is(
  (
    select (meter->>'remaining')::numeric
    from jsonb_array_elements(public.get_workspace_usage_summary('d2000000-0000-0000-0000-000000000001')->'meters') meter
    where meter->>'limit_key' = 'ai_credits_monthly'
  ),
  190::numeric,
  'usage summary meters respect active quota overrides'
);

reset role;

select * from finish();

rollback;

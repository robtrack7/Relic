create extension if not exists pgtap with schema extensions;

begin;

select plan(19);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, email_change, email_change_token_new, recovery_token)
values ('b0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'stage-write-recovery@example.test', extensions.crypt('password', extensions.gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false, '', '', '', '')
on conflict (id) do nothing;

insert into public.gm_profiles (id, user_id, experience_level, improv_comfort, prep_style)
values ('b1000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'experienced', 'mixed', 'light')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_gm_id, name)
values ('b2000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Stage Write Recovery Workspace')
on conflict (id) do nothing;

insert into public.worlds (id, workspace_id, owner_gm_id, name)
values ('b3000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Stage Write Recovery World')
on conflict (id) do nothing;

insert into public.world_eras (id, workspace_id, world_id, name)
values ('b4000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000001', 'Stage Write Recovery Era')
on conflict (id) do nothing;

insert into public.sagas (id, workspace_id, world_id, owner_gm_id, primary_era_id, name)
values ('b5000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'b4000000-0000-0000-0000-000000000001', 'Stage Write Recovery Saga')
on conflict (id) do nothing;

insert into public.sessions (id, workspace_id, world_id, saga_id, name, status, started_at, went_live_at)
values ('b6000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000001', 'b5000000-0000-0000-0000-000000000001', 'Stage Write Recovery Session', 'in_progress', now() - interval '1 hour', now() - interval '1 hour')
on conflict (id) do update set status = excluded.status, ended_pending_undo_at = null;

select has_function('public', 'apply_stage_write_intent', array['uuid','uuid','uuid','uuid','text','text','jsonb'], 'scoped Stage write intent RPC exists');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'b0000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.saga_id', 'b5000000-0000-0000-0000-000000000001', true);

create temp table b1_capture as
select public.apply_stage_write_intent(
  'b2000000-0000-0000-0000-000000000001',
  'b3000000-0000-0000-0000-000000000001',
  'b5000000-0000-0000-0000-000000000001',
  'b6000000-0000-0000-0000-000000000001',
  'stage-write-capture-1',
  'quick_capture',
  '{"title":"Gate witness","body":"The gate opened."}'::jsonb
) as result;

select is(
  public.apply_stage_write_intent('b2000000-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000001', 'b5000000-0000-0000-0000-000000000001', 'b6000000-0000-0000-0000-000000000001', 'stage-write-capture-1', 'quick_capture', '{"body":"The gate opened.","title":"Gate witness"}'::jsonb),
  (select result from b1_capture),
  'duplicate Quick Capture returns the first result despite JSON key order'
);
select is((select count(*) from public.notes where title = 'Gate witness'), 1::bigint, 'duplicate Quick Capture writes one note');
select is((select count(*) from public.sources where note_id = ((select result->>'id' from b1_capture)::uuid) and session_id = 'b6000000-0000-0000-0000-000000000001'), 1::bigint, 'Quick Capture keeps one session source');
select throws_like(
  $$ select public.apply_stage_write_intent('b2000000-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000001', 'b5000000-0000-0000-0000-000000000001', 'b6000000-0000-0000-0000-000000000001', 'stage-write-capture-1', 'quick_capture', '{"title":"Gate witness","body":"Changed payload"}'::jsonb) $$,
  '%already used for a different Stage write%',
  'idempotency-key payload reuse fails closed'
);

create temp table b1_stub as
select public.apply_stage_write_intent(
  'b2000000-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000001', 'b5000000-0000-0000-0000-000000000001', 'b6000000-0000-0000-0000-000000000001',
  'stage-write-stub-1', 'quick_stub', '{"entity_type":"character","name":"Mara Vale","summary":"Harbor witness"}'::jsonb
) as result;
select is(public.apply_stage_write_intent('b2000000-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000001', 'b5000000-0000-0000-0000-000000000001', 'b6000000-0000-0000-0000-000000000001', 'stage-write-stub-1', 'quick_stub', '{"entity_type":"character","name":"Mara Vale","summary":"Harbor witness"}'::jsonb), (select result from b1_stub), 'duplicate Quick Stub returns the first result');
select is((select count(*) from public.characters where name = 'Mara Vale'), 1::bigint, 'duplicate Quick Stub writes one entity');
select is((select count(*) from public.sources where source_entity_id = ((select result->>'id' from b1_stub)::uuid) and session_id = 'b6000000-0000-0000-0000-000000000001'), 1::bigint, 'Quick Stub keeps one session source');
select is((select count(*) from public.canon_audit where entity_id = ((select result->>'id' from b1_stub)::uuid)), 1::bigint, 'Quick Stub keeps one GM canon audit row');

create temp table b1_mark as
select public.apply_stage_write_intent(
  'b2000000-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000001', 'b5000000-0000-0000-0000-000000000001', 'b6000000-0000-0000-0000-000000000001',
  'stage-write-mark-1', 'mark_moment', '{"label":"decision","occurred_at":"2026-07-21T05:30:00Z"}'::jsonb
) as result;
select is(public.apply_stage_write_intent('b2000000-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000001', 'b5000000-0000-0000-0000-000000000001', 'b6000000-0000-0000-0000-000000000001', 'stage-write-mark-1', 'mark_moment', '{"label":"decision","occurred_at":"2026-07-21T05:30:00Z"}'::jsonb), (select result from b1_mark), 'duplicate Mark Moment returns the first result');
select is((select count(*) from public.session_marked_moments where id = ((select result->>'id' from b1_mark)::uuid)), 1::bigint, 'duplicate Mark Moment writes one row');
select is((select occurred_at from public.session_marked_moments where id = ((select result->>'id' from b1_mark)::uuid)), '2026-07-21 05:30:00+00'::timestamptz, 'Mark Moment preserves its client occurrence time');

create temp table b1_end as
select public.apply_stage_write_intent(
  'b2000000-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000001', 'b5000000-0000-0000-0000-000000000001', 'b6000000-0000-0000-0000-000000000001',
  'stage-write-end-1', 'end_session', '{"requested_at":"2026-07-21T05:31:00Z"}'::jsonb
) as result;
select is((select result->>'status' from b1_end), 'ended_pending_undo', 'End Session receipt records the pending-undo state');
select is((select status from public.sessions where id = 'b6000000-0000-0000-0000-000000000001'), 'ended_pending_undo'::public.session_status, 'End Session reaches pending undo');
select is((select ended_pending_undo_at from public.sessions where id = 'b6000000-0000-0000-0000-000000000001'), '2026-07-21 05:31:00+00'::timestamptz, 'End Session preserves the client confirmation time');

create temp table b1_undo as
select public.apply_stage_write_intent(
  'b2000000-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000001', 'b5000000-0000-0000-0000-000000000001', 'b6000000-0000-0000-0000-000000000001',
  'stage-write-undo-1', 'undo_end_session', '{"requested_at":"2026-07-21T05:31:20Z"}'::jsonb
) as result;
select is(public.apply_stage_write_intent('b2000000-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000001', 'b5000000-0000-0000-0000-000000000001', 'b6000000-0000-0000-0000-000000000001', 'stage-write-undo-1', 'undo_end_session', '{"requested_at":"2026-07-21T05:31:20Z"}'::jsonb), (select result from b1_undo), 'duplicate Undo returns the first result');
select ok((select status = 'in_progress' and ended_pending_undo_at is null from public.sessions where id = 'b6000000-0000-0000-0000-000000000001'), 'Undo restores in-progress state and clears the pending timestamp');

reset role;
select is((select count(*) from internal.stage_write_receipts where session_id = 'b6000000-0000-0000-0000-000000000001'), 5::bigint, 'one private receipt exists per distinct Stage intent');

set local role anon;
select throws_like(
  $$ select public.apply_stage_write_intent('b2000000-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000001', 'b5000000-0000-0000-0000-000000000001', 'b6000000-0000-0000-0000-000000000001', 'anon-write', 'quick_capture', '{"body":"blocked"}'::jsonb) $$,
  '%permission denied for function apply_stage_write_intent%',
  'anonymous callers cannot execute the Stage write RPC'
);
reset role;

select * from finish();
rollback;

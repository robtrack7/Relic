create extension if not exists pgtap with schema extensions;

begin;

select plan(20);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, email_change, email_change_token_new, recovery_token)
values ('d0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'stage-airplane@example.test', extensions.crypt('password', extensions.gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false, '', '', '', '')
on conflict (id) do nothing;

insert into public.gm_profiles (id, user_id, experience_level, improv_comfort, prep_style)
values ('d1000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'experienced', 'mixed', 'light')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_gm_id, name)
values ('d2000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'Stage Airplane Workspace')
on conflict (id) do nothing;

insert into public.worlds (id, workspace_id, owner_gm_id, name)
values ('d3000000-0000-0000-0000-000000000001', 'd2000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'Stage Airplane World')
on conflict (id) do nothing;

insert into public.world_eras (id, workspace_id, world_id, name)
values ('d4000000-0000-0000-0000-000000000001', 'd2000000-0000-0000-0000-000000000001', 'd3000000-0000-0000-0000-000000000001', 'Stage Airplane Era')
on conflict (id) do nothing;

insert into public.sagas (id, workspace_id, world_id, owner_gm_id, primary_era_id, name)
values
  ('d5000000-0000-0000-0000-000000000001', 'd2000000-0000-0000-0000-000000000001', 'd3000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'd4000000-0000-0000-0000-000000000001', 'Stage Airplane Saga'),
  ('d5000000-0000-0000-0000-000000000002', 'd2000000-0000-0000-0000-000000000001', 'd3000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'd4000000-0000-0000-0000-000000000001', 'Sibling Saga')
on conflict (id) do nothing;

insert into public.sessions (id, workspace_id, world_id, saga_id, name, objective, status)
values
  ('d6000000-0000-0000-0000-000000000001', 'd2000000-0000-0000-0000-000000000001', 'd3000000-0000-0000-0000-000000000001', 'd5000000-0000-0000-0000-000000000001', 'Offline Session', 'Reach the flooded archive', 'ready'),
  ('d6000000-0000-0000-0000-000000000002', 'd2000000-0000-0000-0000-000000000001', 'd3000000-0000-0000-0000-000000000001', 'd5000000-0000-0000-0000-000000000001', 'Conflict Session', 'Test competing lifecycle state', 'ready')
on conflict (id) do update set status = excluded.status, consent_state = 'unset', ended_pending_undo_at = null;

insert into public.characters (id, workspace_id, world_id, saga_id, scope, name, summary, narrative, canon_state, is_stub, created_by)
values
  ('d7100000-0000-0000-0000-000000000001', 'd2000000-0000-0000-0000-000000000001', 'd3000000-0000-0000-0000-000000000001', 'd5000000-0000-0000-0000-000000000001', 'saga', 'Mara Vale', 'Harbor witness', 'Saw the gate open', 'canon', false, 'gm'),
  ('d7100000-0000-0000-0000-000000000002', 'd2000000-0000-0000-0000-000000000001', 'd3000000-0000-0000-0000-000000000001', 'd5000000-0000-0000-0000-000000000002', 'saga', 'Sibling Secret', 'Must stay excluded', 'Wrong Saga', 'canon', false, 'gm'),
  ('d7100000-0000-0000-0000-000000000003', 'd2000000-0000-0000-0000-000000000001', 'd3000000-0000-0000-0000-000000000001', null, 'world', 'The Old Moon', 'Shared World canon', 'Visible to both Sagas', 'canon', false, 'gm')
on conflict (id) do nothing;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'd0000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.saga_id', 'd5000000-0000-0000-0000-000000000001', true);

create temp table b2_start as select public.apply_stage_write_intent('d2000000-0000-0000-0000-000000000001','d3000000-0000-0000-0000-000000000001','d5000000-0000-0000-0000-000000000001','d6000000-0000-0000-0000-000000000001','b2-start','start_session','{"expected_status":"ready"}') result;
select is((select result->>'outcome' from b2_start), 'applied', 'offline Start Session applies through the receipt boundary');
select is(public.apply_stage_write_intent('d2000000-0000-0000-0000-000000000001','d3000000-0000-0000-0000-000000000001','d5000000-0000-0000-0000-000000000001','d6000000-0000-0000-0000-000000000001','b2-start','start_session','{"expected_status":"ready"}'), (select result from b2_start), 'duplicate Start Session returns the same receipt');

select public.apply_stage_write_intent('d2000000-0000-0000-0000-000000000001','d3000000-0000-0000-0000-000000000001','d5000000-0000-0000-0000-000000000001','d6000000-0000-0000-0000-000000000001','b2-note','quick_capture','{"title":"Flooded door","body":"The archive door opened."}');
select public.apply_stage_write_intent('d2000000-0000-0000-0000-000000000001','d3000000-0000-0000-0000-000000000001','d5000000-0000-0000-0000-000000000001','d6000000-0000-0000-0000-000000000001','b2-stub','quick_stub','{"entity_type":"thread","name":"The Missing Courier","summary":"Never arrived"}');
select is((select count(*) from public.notes where title = 'Flooded door'), 1::bigint, 'offline note creates one source-backed capture');
select is((select count(*) from public.threads where name = 'The Missing Courier'), 1::bigint, 'offline stub creates one GM-authored canon row');

create temp table b2_consent as select public.apply_stage_write_intent('d2000000-0000-0000-0000-000000000001','d3000000-0000-0000-0000-000000000001','d5000000-0000-0000-0000-000000000001','d6000000-0000-0000-0000-000000000001','b2-consent','record_consent','{"expected_consent_state":"unset","granted":true}') result;
select is((select result->>'consent_state' from b2_consent), 'granted', 'recording consent replays before audio goes live');
select is((select count(*) from public.consent_log where session_id = 'd6000000-0000-0000-0000-000000000001'), 1::bigint, 'duplicate-safe consent creates one log row');

select public.apply_stage_write_intent('d2000000-0000-0000-0000-000000000001','d3000000-0000-0000-0000-000000000001','d5000000-0000-0000-0000-000000000001','d6000000-0000-0000-0000-000000000001','b2-live','go_live','{"expected_status":"started"}');
select is((select status from public.sessions where id = 'd6000000-0000-0000-0000-000000000001'), 'in_progress'::public.session_status, 'Go Live reaches in-progress in FIFO order');

select public.apply_stage_write_intent('d2000000-0000-0000-0000-000000000001','d3000000-0000-0000-0000-000000000001','d5000000-0000-0000-0000-000000000001','d6000000-0000-0000-0000-000000000001','b2-mark','mark_moment','{"label":"decision","occurred_at":"2026-07-21T06:40:00Z"}');
select public.apply_stage_write_intent('d2000000-0000-0000-0000-000000000001','d3000000-0000-0000-0000-000000000001','d5000000-0000-0000-0000-000000000001','d6000000-0000-0000-0000-000000000001','b2-end','end_session','{"expected_status":"in_progress","requested_at":"2026-07-21T06:41:00Z"}');
select is((select count(*) from public.session_marked_moments where session_id = 'd6000000-0000-0000-0000-000000000001'), 1::bigint, 'offline Mark Moment creates one row');
select is((select status from public.sessions where id = 'd6000000-0000-0000-0000-000000000001'), 'ended_pending_undo'::public.session_status, 'offline End Session reaches pending undo after all evidence');
reset role;
select is((select count(*) from internal.stage_write_receipts where session_id = 'd6000000-0000-0000-0000-000000000001'), 7::bigint, 'complete offline lifecycle has one receipt per stable idempotency key');
set local role authenticated;

select public.set_session_status('d2000000-0000-0000-0000-000000000001','d3000000-0000-0000-0000-000000000001','d5000000-0000-0000-0000-000000000001','d6000000-0000-0000-0000-000000000002','started');
create temp table b2_conflict as select public.apply_stage_write_intent('d2000000-0000-0000-0000-000000000001','d3000000-0000-0000-0000-000000000001','d5000000-0000-0000-0000-000000000001','d6000000-0000-0000-0000-000000000002','b2-conflict','start_session','{"expected_status":"ready"}') result;
select is((select result->>'outcome' from b2_conflict), 'conflict', 'unexpected reconnect state returns a conflict receipt');
select is((select result->'server_value'->>'status' from b2_conflict), 'started', 'conflict receipt preserves the competing server state');
select is(public.apply_stage_write_intent('d2000000-0000-0000-0000-000000000001','d3000000-0000-0000-0000-000000000001','d5000000-0000-0000-0000-000000000001','d6000000-0000-0000-0000-000000000002','b2-conflict','start_session','{"expected_status":"ready"}'), (select result from b2_conflict), 'duplicate conflict returns exactly the first result');
select is((select status from public.sessions where id = 'd6000000-0000-0000-0000-000000000002'), 'started'::public.session_status, 'conflict replay does not overwrite server lifecycle state');
reset role;
select is((select count(*) from internal.stage_write_receipts where idempotency_key = 'b2-conflict'), 1::bigint, 'conflict is stored once in the private receipt ledger');
set local role authenticated;

create temp table b2_packet as select public.get_stage_packet('d2000000-0000-0000-0000-000000000001','d3000000-0000-0000-0000-000000000001','d5000000-0000-0000-0000-000000000001','d6000000-0000-0000-0000-000000000001') packet;
select ok((select packet ? 'literal_search_index' from b2_packet), 'Stage packet includes the offline literal search index');
select ok((select (packet->'literal_search_index') @> '[{"source_entity_id":"d7100000-0000-0000-0000-000000000001"}]'::jsonb and (packet->'literal_search_index') @> '[{"source_entity_id":"d7100000-0000-0000-0000-000000000003"}]'::jsonb from b2_packet), 'literal index contains current-Saga and World canon');
select ok((select not ((packet->'literal_search_index') @> '[{"source_entity_id":"d7100000-0000-0000-0000-000000000002"}]'::jsonb) from b2_packet), 'literal index excludes sibling-Saga canon');

select set_config('request.jwt.claim.saga_id', '', true);
select ok(
  public.storage_path_allowed('d2000000-0000-0000-0000-000000000001/d3000000-0000-0000-0000-000000000001/d5000000-0000-0000-0000-000000000001/d6000000-0000-0000-0000-000000000001/0.webm'),
  'audio Storage path remains authorized without an active-Saga JWT claim'
);
select lives_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('audio', 'd2000000-0000-0000-0000-000000000001/d3000000-0000-0000-0000-000000000001/d5000000-0000-0000-0000-000000000001/d6000000-0000-0000-0000-000000000001/0.webm') $$,
  'authenticated owner can insert the exact scoped offline audio object through RLS'
);

select * from finish();
rollback;

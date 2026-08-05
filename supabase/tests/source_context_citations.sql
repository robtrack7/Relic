create extension if not exists pgtap with schema extensions;

begin;

select plan(23);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, email_change, email_change_token_new, recovery_token)
values
  ('c4000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'c4-a@example.test', extensions.crypt('password', extensions.gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false, '', '', '', ''),
  ('c4000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'c4-b@example.test', extensions.crypt('password', extensions.gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false, '', '', '', '')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_gm_id, name)
values
  ('c4010000-0000-0000-0000-000000000001', 'c4000000-0000-0000-0000-000000000001', 'C4 Workspace A'),
  ('c4110000-0000-0000-0000-000000000001', 'c4000000-0000-0000-0000-000000000002', 'C4 Workspace B')
on conflict (id) do nothing;

insert into public.worlds (id, workspace_id, owner_gm_id, name)
values
  ('c4020000-0000-0000-0000-000000000001', 'c4010000-0000-0000-0000-000000000001', 'c4000000-0000-0000-0000-000000000001', 'C4 World A'),
  ('c4120000-0000-0000-0000-000000000001', 'c4110000-0000-0000-0000-000000000001', 'c4000000-0000-0000-0000-000000000002', 'C4 World B')
on conflict (id) do nothing;

insert into public.sagas (id, workspace_id, world_id, owner_gm_id, name)
values
  ('c4030000-0000-0000-0000-000000000001', 'c4010000-0000-0000-0000-000000000001', 'c4020000-0000-0000-0000-000000000001', 'c4000000-0000-0000-0000-000000000001', 'C4 Saga A'),
  ('c4080000-0000-0000-0000-000000000001', 'c4010000-0000-0000-0000-000000000001', 'c4020000-0000-0000-0000-000000000001', 'c4000000-0000-0000-0000-000000000001', 'C4 Sibling Saga'),
  ('c4130000-0000-0000-0000-000000000001', 'c4110000-0000-0000-0000-000000000001', 'c4120000-0000-0000-0000-000000000001', 'c4000000-0000-0000-0000-000000000002', 'C4 Saga B')
on conflict (id) do nothing;

insert into public.sessions (id, workspace_id, world_id, saga_id, scope, name, status)
values
  ('c4040000-0000-0000-0000-000000000001', 'c4010000-0000-0000-0000-000000000001', 'c4020000-0000-0000-0000-000000000001', 'c4030000-0000-0000-0000-000000000001', 'saga', 'C4 Evidence Session', 'ended'),
  ('c4090000-0000-0000-0000-000000000001', 'c4010000-0000-0000-0000-000000000001', 'c4020000-0000-0000-0000-000000000001', 'c4080000-0000-0000-0000-000000000001', 'saga', 'C4 Sibling Session', 'ended'),
  ('c4140000-0000-0000-0000-000000000001', 'c4110000-0000-0000-0000-000000000001', 'c4120000-0000-0000-0000-000000000001', 'c4130000-0000-0000-0000-000000000001', 'saga', 'C4 Tenant B Session', 'ended')
on conflict (id) do nothing;

insert into public.transcripts (id, workspace_id, world_id, saga_id, session_id, whisper_model, state, segments)
values
  ('c4050000-0000-0000-0000-000000000001', 'c4010000-0000-0000-0000-000000000001', 'c4020000-0000-0000-0000-000000000001', 'c4030000-0000-0000-0000-000000000001', 'c4040000-0000-0000-0000-000000000001', 'fixture', 'complete', '[{"start":0,"end":18,"text":"The old gate opened."},{"start":20,"end":32,"text":"Mara crossed the bridge.","deleted":true}]'::jsonb)
on conflict (id) do update set segments = excluded.segments, deleted_at = null;

insert into public.sources (id, workspace_id, world_id, saga_id, scope, kind, transcript_id, session_id, start_seconds, end_seconds, raw_excerpt)
values
  ('c4060000-0000-0000-0000-000000000001', 'c4010000-0000-0000-0000-000000000001', 'c4020000-0000-0000-0000-000000000001', 'c4030000-0000-0000-0000-000000000001', 'saga', 'transcript_segment', 'c4050000-0000-0000-0000-000000000001', 'c4040000-0000-0000-0000-000000000001', 0, 18, 'The old gate opened.'),
  ('c4060000-0000-0000-0000-000000000002', 'c4010000-0000-0000-0000-000000000001', 'c4020000-0000-0000-0000-000000000001', 'c4030000-0000-0000-0000-000000000001', 'saga', 'transcript_segment', 'c4050000-0000-0000-0000-000000000001', 'c4040000-0000-0000-0000-000000000001', 20, 32, 'Mara crossed the bridge.'),
  ('c4060000-0000-0000-0000-000000000003', 'c4010000-0000-0000-0000-000000000001', 'c4020000-0000-0000-0000-000000000001', 'c4030000-0000-0000-0000-000000000001', 'saga', 'pasted_text', null, 'c4040000-0000-0000-0000-000000000001', null, null, 'Rough table notes.'),
  ('c4060000-0000-0000-0000-000000000004', 'c4010000-0000-0000-0000-000000000001', 'c4020000-0000-0000-0000-000000000001', 'c4030000-0000-0000-0000-000000000001', 'saga', 'gm_manual_summary', null, 'c4040000-0000-0000-0000-000000000001', null, null, 'The bridge is open.'),
  ('c4060000-0000-0000-0000-000000000005', 'c4010000-0000-0000-0000-000000000001', 'c4020000-0000-0000-0000-000000000001', 'c4030000-0000-0000-0000-000000000001', 'saga', 'transcript_segment', null, 'c4040000-0000-0000-0000-000000000001', 40, 48, 'Broken transcript evidence.'),
  ('c4060000-0000-0000-0000-000000000006', 'c4010000-0000-0000-0000-000000000001', 'c4020000-0000-0000-0000-000000000001', 'c4030000-0000-0000-0000-000000000001', 'saga', 'existing_entity', null, 'c4040000-0000-0000-0000-000000000001', null, null, 'Unsupported in C4.')
on conflict (id) do nothing;

insert into public.drafts (id, workspace_id, world_id, saga_id, scope, entity_type, change_kind, state, proposed_payload, created_by, session_id)
values
  ('c4070000-0000-0000-0000-000000000001', 'c4010000-0000-0000-0000-000000000001', 'c4020000-0000-0000-0000-000000000001', 'c4030000-0000-0000-0000-000000000001', 'saga', 'note', 'create', 'pending', '{"title":"C4 draft"}'::jsonb, 'gm_via_ai_approval', 'c4040000-0000-0000-0000-000000000001'),
  ('c40a0000-0000-0000-0000-000000000001', 'c4010000-0000-0000-0000-000000000001', 'c4020000-0000-0000-0000-000000000001', 'c4080000-0000-0000-0000-000000000001', 'saga', 'note', 'create', 'pending', '{"title":"Sibling draft"}'::jsonb, 'gm_via_ai_approval', 'c4090000-0000-0000-0000-000000000001')
on conflict (id) do nothing;

insert into public.draft_sources (workspace_id, world_id, saga_id, scope, draft_id, source_id)
select 'c4010000-0000-0000-0000-000000000001', 'c4020000-0000-0000-0000-000000000001', 'c4030000-0000-0000-0000-000000000001', 'saga', 'c4070000-0000-0000-0000-000000000001', source_id
from unnest(array[
  'c4060000-0000-0000-0000-000000000001'::uuid,
  'c4060000-0000-0000-0000-000000000002'::uuid,
  'c4060000-0000-0000-0000-000000000003'::uuid,
  'c4060000-0000-0000-0000-000000000004'::uuid,
  'c4060000-0000-0000-0000-000000000005'::uuid,
  'c4060000-0000-0000-0000-000000000006'::uuid
]) source_id
on conflict (draft_id, source_id) do nothing;

select has_function('public', 'get_draft_source_context', array['uuid','uuid','uuid','uuid'], 'scoped draft citation context RPC exists');
select ok(not has_function_privilege('anon', 'public.get_draft_source_context(uuid,uuid,uuid,uuid)', 'execute'), 'anonymous role cannot read draft citation context');
select ok(not has_function_privilege('authenticated', 'public.get_transcript_source_context(uuid)', 'execute'), 'raw transcript context helper is not browser-callable');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c4000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.saga_id', 'c4030000-0000-0000-0000-000000000001', true);

create temp table c4_context as
select public.get_draft_source_context(
  'c4010000-0000-0000-0000-000000000001',
  'c4020000-0000-0000-0000-000000000001',
  'c4030000-0000-0000-0000-000000000001',
  'c4070000-0000-0000-0000-000000000001'
) as value;

select is(jsonb_array_length((select value from c4_context)), 6, 'every linked C3-style draft citation receives context');
select is((select item->>'drift_state' from c4_context, jsonb_array_elements(value) item where item->>'frozen_excerpt' = 'The old gate opened.'), 'exact', 'exact transcript context remains exact');
select is((select item->>'start_seconds' from c4_context, jsonb_array_elements(value) item where item->>'frozen_excerpt' = 'The old gate opened.'), '0', 'transcript context includes the immutable start timestamp');
select is((select item->>'end_seconds' from c4_context, jsonb_array_elements(value) item where item->>'frozen_excerpt' = 'The old gate opened.'), '18', 'transcript context includes the immutable end timestamp');
select is((select item->>'drift_state' from c4_context, jsonb_array_elements(value) item where item->>'frozen_excerpt' = 'Mara crossed the bridge.'), 'deleted', 'soft-deleted transcript segment is explicit drift');
select is((select item->>'status' from c4_context, jsonb_array_elements(value) item where item->>'source_kind' = 'pasted_text'), 'available', 'pasted note evidence is readable');
select is((select item->>'drift_state' from c4_context, jsonb_array_elements(value) item where item->>'source_kind' = 'pasted_text'), 'not_applicable', 'pasted note evidence has no timestamp drift');
select is((select item->>'status' from c4_context, jsonb_array_elements(value) item where item->>'source_kind' = 'gm_manual_summary'), 'available', 'GM summary evidence is readable');
select is((select item->>'start_seconds' from c4_context, jsonb_array_elements(value) item where item->>'source_kind' = 'gm_manual_summary'), null, 'GM summary evidence exposes no timestamp');
select is((select item->>'status' from c4_context, jsonb_array_elements(value) item where item->>'frozen_excerpt' = 'Broken transcript evidence.'), 'broken', 'missing transcript relation returns a safe broken state');
select is((select item->>'status' from c4_context, jsonb_array_elements(value) item where item->>'source_kind' = 'existing_entity'), 'available', 'current canon entity evidence is readable');

reset role;
update public.transcripts
set segments = jsonb_set(segments, '{0,text}', '"The sealed gate opened."'::jsonb), edited_at = now()
where id = 'c4050000-0000-0000-0000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub', 'c4000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.saga_id', 'c4030000-0000-0000-0000-000000000001', true);
select is(
  (select item->>'drift_state' from jsonb_array_elements(public.get_draft_source_context('c4010000-0000-0000-0000-000000000001','c4020000-0000-0000-0000-000000000001','c4030000-0000-0000-0000-000000000001','c4070000-0000-0000-0000-000000000001')) item where item->>'frozen_excerpt' = 'The old gate opened.'),
  'edited',
  'edited transcript drift compares frozen and current text'
);
select is(
  (select item->>'current_text' from jsonb_array_elements(public.get_draft_source_context('c4010000-0000-0000-0000-000000000001','c4020000-0000-0000-0000-000000000001','c4030000-0000-0000-0000-000000000001','c4070000-0000-0000-0000-000000000001')) item where item->>'frozen_excerpt' = 'The old gate opened.'),
  'The sealed gate opened.',
  'edited transcript context returns current segment text'
);

select is(
  (public.get_draft_source_context('c4010000-0000-0000-0000-000000000001','c4020000-0000-0000-0000-000000000001','c4030000-0000-0000-0000-000000000001','ffffffff-ffff-ffff-ffff-ffffffffffff')->0->>'status'),
  'unavailable',
  'missing draft returns safe unavailable state'
);
select ok(
  not (public.get_draft_source_context('c4010000-0000-0000-0000-000000000001','c4020000-0000-0000-0000-000000000001','c4030000-0000-0000-0000-000000000001','ffffffff-ffff-ffff-ffff-ffffffffffff')::text like '%ffffffff%'),
  'missing draft response does not echo the requested identifier'
);
select is(
  (public.get_draft_source_context('c4010000-0000-0000-0000-000000000001','c4020000-0000-0000-0000-000000000001','c4030000-0000-0000-0000-000000000001','c40a0000-0000-0000-0000-000000000001')->0->>'status'),
  'unavailable',
  'a draft from another Saga is unavailable inside the current Saga route'
);
select ok(
  not (public.get_draft_source_context('c4010000-0000-0000-0000-000000000001','c4020000-0000-0000-0000-000000000001','c4030000-0000-0000-0000-000000000001','c40a0000-0000-0000-0000-000000000001')::text like '%Sibling%'),
  'sibling Saga denial leaks no sibling data'
);
select is(
  (public.get_draft_source_context('c4110000-0000-0000-0000-000000000001','c4120000-0000-0000-0000-000000000001','c4130000-0000-0000-0000-000000000001','c40a0000-0000-0000-0000-000000000001')->0->>'status'),
  'permission_denied',
  'other Workspace access returns generic permission denial'
);
select ok(
  not (public.get_draft_source_context('c4110000-0000-0000-0000-000000000001','c4120000-0000-0000-0000-000000000001','c4130000-0000-0000-0000-000000000001','c40a0000-0000-0000-0000-000000000001')::text like '%Workspace B%'),
  'other Workspace denial leaks no tenant data'
);

set local role anon;
select throws_like(
  $$ select public.get_draft_source_context('c4010000-0000-0000-0000-000000000001','c4020000-0000-0000-0000-000000000001','c4030000-0000-0000-0000-000000000001','c4070000-0000-0000-0000-000000000001') $$,
  '%permission denied%',
  'anonymous callers cannot execute citation context RPC'
);

select * from finish();
rollback;

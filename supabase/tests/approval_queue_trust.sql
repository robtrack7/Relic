create extension if not exists pgtap with schema extensions;

begin;

select plan(52);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values
  ('c5000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'c5-owner@example.test', extensions.crypt('password', extensions.gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false, '', '', '', ''),
  ('c5000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'c5-outsider@example.test', extensions.crypt('password', extensions.gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false, '', '', '', '')
on conflict (id) do nothing;

insert into public.gm_profiles (id, user_id, experience_level, improv_comfort, prep_style)
values
  ('c5100000-0000-0000-0000-000000000001', 'c5000000-0000-0000-0000-000000000001', 'experienced', 'mixed', 'light'),
  ('c5100000-0000-0000-0000-000000000002', 'c5000000-0000-0000-0000-000000000002', 'experienced', 'mixed', 'light')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_gm_id, name)
values ('c5200000-0000-0000-0000-000000000001', 'c5000000-0000-0000-0000-000000000001', 'C5 Workspace')
on conflict (id) do nothing;

insert into public.worlds (id, workspace_id, owner_gm_id, name)
values ('c5300000-0000-0000-0000-000000000001', 'c5200000-0000-0000-0000-000000000001', 'c5000000-0000-0000-0000-000000000001', 'C5 World')
on conflict (id) do nothing;

insert into public.sagas (id, workspace_id, world_id, owner_gm_id, name)
values
  ('c5400000-0000-0000-0000-000000000001', 'c5200000-0000-0000-0000-000000000001', 'c5300000-0000-0000-0000-000000000001', 'c5000000-0000-0000-0000-000000000001', 'C5 Saga'),
  ('c5400000-0000-0000-0000-000000000002', 'c5200000-0000-0000-0000-000000000001', 'c5300000-0000-0000-0000-000000000001', 'c5000000-0000-0000-0000-000000000001', 'C5 Sibling Saga')
on conflict (id) do nothing;

insert into public.sessions (id, workspace_id, world_id, saga_id, scope, name, status)
values
  ('c5500000-0000-0000-0000-000000000001', 'c5200000-0000-0000-0000-000000000001', 'c5300000-0000-0000-0000-000000000001', 'c5400000-0000-0000-0000-000000000001', 'saga', 'Evidence Session', 'ended'),
  ('c5500000-0000-0000-0000-000000000002', 'c5200000-0000-0000-0000-000000000001', 'c5300000-0000-0000-0000-000000000001', 'c5400000-0000-0000-0000-000000000001', 'saga', 'Next Session', 'planned')
on conflict (id) do nothing;

insert into public.characters (id, workspace_id, world_id, saga_id, scope, name, summary, narrative, canon_state, status)
values
  ('c5600000-0000-0000-0000-000000000001', 'c5200000-0000-0000-0000-000000000001', 'c5300000-0000-0000-0000-000000000001', 'c5400000-0000-0000-0000-000000000001', 'saga', 'Matching Target', 'Old summary', 'Old narrative', 'canon', 'active'),
  ('c5600000-0000-0000-0000-000000000002', 'c5200000-0000-0000-0000-000000000001', 'c5300000-0000-0000-0000-000000000001', 'c5400000-0000-0000-0000-000000000001', 'saga', 'Stale Target', 'Changed elsewhere', 'Old narrative', 'canon', 'active'),
  ('c5600000-0000-0000-0000-000000000003', 'c5200000-0000-0000-0000-000000000001', 'c5300000-0000-0000-0000-000000000001', 'c5400000-0000-0000-0000-000000000001', 'saga', 'Archive Target', 'Still active', null, 'canon', 'active'),
  ('c5600000-0000-0000-0000-000000000004', 'c5200000-0000-0000-0000-000000000001', 'c5300000-0000-0000-0000-000000000001', 'c5400000-0000-0000-0000-000000000001', 'saga', 'Merge Target', 'Keep this identity', null, 'canon', 'active'),
  ('c5600000-0000-0000-0000-000000000005', 'c5200000-0000-0000-0000-000000000001', 'c5300000-0000-0000-0000-000000000001', 'c5400000-0000-0000-0000-000000000001', 'saga', 'Archived Target', 'No longer active', null, 'archived', 'archived'),
  ('c5600000-0000-0000-0000-000000000006', 'c5200000-0000-0000-0000-000000000001', 'c5300000-0000-0000-0000-000000000001', 'c5400000-0000-0000-0000-000000000002', 'saga', 'Sibling Target', 'Must remain isolated', null, 'canon', 'active')
on conflict (id) do nothing;

insert into public.transcripts (id, workspace_id, world_id, saga_id, session_id, whisper_model, state, segments)
values ('c5700000-0000-0000-0000-000000000001', 'c5200000-0000-0000-0000-000000000001', 'c5300000-0000-0000-0000-000000000001', 'c5400000-0000-0000-0000-000000000001', 'c5500000-0000-0000-0000-000000000001', 'c5-fixture', 'complete', '[{"start":0,"end":10,"text":"The current wording."}]'::jsonb)
on conflict (id) do nothing;

insert into public.sources (id, workspace_id, world_id, saga_id, scope, kind, transcript_id, session_id, start_seconds, end_seconds, raw_excerpt)
values
  ('c5800000-0000-0000-0000-000000000001', 'c5200000-0000-0000-0000-000000000001', 'c5300000-0000-0000-0000-000000000001', 'c5400000-0000-0000-0000-000000000001', 'saga', 'gm_manual_summary', null, 'c5500000-0000-0000-0000-000000000001', null, null, 'Trusted C5 evidence.'),
  ('c5800000-0000-0000-0000-000000000002', 'c5200000-0000-0000-0000-000000000001', 'c5300000-0000-0000-0000-000000000001', 'c5400000-0000-0000-0000-000000000001', 'saga', 'transcript_segment', 'c5700000-0000-0000-0000-000000000001', 'c5500000-0000-0000-0000-000000000001', 0, 10, 'The frozen wording.'),
  ('c5800000-0000-0000-0000-000000000003', 'c5200000-0000-0000-0000-000000000001', 'c5300000-0000-0000-0000-000000000001', 'c5400000-0000-0000-0000-000000000001', 'saga', 'transcript_segment', null, 'c5500000-0000-0000-0000-000000000001', 20, 30, 'Broken transcript evidence.')
on conflict (id) do nothing;

insert into public.drafts (
  id, workspace_id, world_id, saga_id, scope, entity_type, target_entity_id, state,
  change_kind, proposed_payload, expected_version, confidence_band, confidence_reason,
  created_by, draft_batch_id, ai_task_run_id, pipeline_run_id, session_id,
  ai_task_name, ai_prompt_version, ai_model, ai_provider
) values
  ('c5900000-0000-0000-0000-000000000001', 'c5200000-0000-0000-0000-000000000001', 'c5300000-0000-0000-0000-000000000001', 'c5400000-0000-0000-0000-000000000001', 'saga', 'note', null, 'pending', 'create', '{"title":"Session Summary","body":"Approved summary","note_type":"summary"}', null, 'high', 'direct_gm_input', 'gm_via_ai_approval', null, null, null, 'c5500000-0000-0000-0000-000000000001', 'synthesize_session', 'synthesize_session@1.0.0', 'c5-model', 'c5-provider'),
  ('c5900000-0000-0000-0000-000000000002', 'c5200000-0000-0000-0000-000000000001', 'c5300000-0000-0000-0000-000000000001', 'c5400000-0000-0000-0000-000000000001', 'saga', 'character', 'c5600000-0000-0000-0000-000000000001', 'pending', 'update', '{"summary":"New summary"}', (select updated_at from public.characters where id='c5600000-0000-0000-0000-000000000001'), 'high', 'multiple_strong_sources', 'gm_via_ai_approval', null, null, null, 'c5500000-0000-0000-0000-000000000001', 'synthesize_session', 'synthesize_session@1.0.0', 'c5-model', 'c5-provider'),
  ('c5900000-0000-0000-0000-000000000003', 'c5200000-0000-0000-0000-000000000001', 'c5300000-0000-0000-0000-000000000001', 'c5400000-0000-0000-0000-000000000001', 'saga', 'character', 'c5600000-0000-0000-0000-000000000002', 'pending', 'update', '{"summary":"Stale proposal"}', '2000-01-01T00:00:00Z', 'medium', 'single_clear_segment', 'gm_via_ai_approval', null, null, null, 'c5500000-0000-0000-0000-000000000001', 'synthesize_session', 'synthesize_session@1.0.0', 'c5-model', 'c5-provider'),
  ('c5900000-0000-0000-0000-000000000004', 'c5200000-0000-0000-0000-000000000001', 'c5300000-0000-0000-0000-000000000001', 'c5400000-0000-0000-0000-000000000001', 'saga', 'character', null, 'pending', 'create', '{"name":"Edit Me","summary":"Machine wording"}', null, 'medium', 'single_clear_segment', 'gm_via_ai_approval', null, null, null, 'c5500000-0000-0000-0000-000000000001', 'synthesize_session', 'synthesize_session@1.0.0', 'c5-model', 'c5-provider'),
  ('c5900000-0000-0000-0000-000000000005', 'c5200000-0000-0000-0000-000000000001', 'c5300000-0000-0000-0000-000000000001', 'c5400000-0000-0000-0000-000000000001', 'saga', 'character', 'c5600000-0000-0000-0000-000000000003', 'pending', 'archive_request', '{}', (select updated_at from public.characters where id='c5600000-0000-0000-0000-000000000003'), 'high', 'direct_gm_input', 'gm_via_ai_approval', null, null, null, 'c5500000-0000-0000-0000-000000000001', 'synthesize_session', 'synthesize_session@1.0.0', 'c5-model', 'c5-provider'),
  ('c5900000-0000-0000-0000-000000000006', 'c5200000-0000-0000-0000-000000000001', 'c5300000-0000-0000-0000-000000000001', 'c5400000-0000-0000-0000-000000000001', 'saga', 'character', null, 'pending', 'merge', '{"name":"Duplicate Person","summary":"Carry this detail"}', null, 'medium', 'single_clear_segment', 'gm_via_ai_approval', null, null, null, 'c5500000-0000-0000-0000-000000000001', 'synthesize_session', 'synthesize_session@1.0.0', 'c5-model', 'c5-provider'),
  ('c5900000-0000-0000-0000-000000000007', 'c5200000-0000-0000-0000-000000000001', 'c5300000-0000-0000-0000-000000000001', 'c5400000-0000-0000-0000-000000000001', 'saga', 'thread', null, 'pending', 'create', '{"name":"Rejected Thread","summary":"Do not keep"}', null, 'low', 'ambiguous_source', 'gm_via_ai_approval', null, null, null, 'c5500000-0000-0000-0000-000000000001', 'synthesize_session', 'synthesize_session@1.0.0', 'c5-model', 'c5-provider'),
  ('c5900000-0000-0000-0000-000000000008', 'c5200000-0000-0000-0000-000000000001', 'c5300000-0000-0000-0000-000000000001', 'c5400000-0000-0000-0000-000000000001', 'saga', 'character', 'c5990000-0000-0000-0000-000000000001', 'pending', 'update', '{"summary":"Missing target"}', now(), 'low', 'ambiguous_source', 'gm_via_ai_approval', null, null, null, 'c5500000-0000-0000-0000-000000000001', 'synthesize_session', 'synthesize_session@1.0.0', 'c5-model', 'c5-provider'),
  ('c5900000-0000-0000-0000-000000000009', 'c5200000-0000-0000-0000-000000000001', 'c5300000-0000-0000-0000-000000000001', 'c5400000-0000-0000-0000-000000000001', 'saga', 'character', 'c5600000-0000-0000-0000-000000000005', 'pending', 'update', '{"summary":"Archived target"}', (select updated_at from public.characters where id='c5600000-0000-0000-0000-000000000005'), 'low', 'ambiguous_source', 'gm_via_ai_approval', null, null, null, 'c5500000-0000-0000-0000-000000000001', 'synthesize_session', 'synthesize_session@1.0.0', 'c5-model', 'c5-provider'),
  ('c5900000-0000-0000-0000-000000000010', 'c5200000-0000-0000-0000-000000000001', 'c5300000-0000-0000-0000-000000000001', 'c5400000-0000-0000-0000-000000000001', 'saga', 'note', null, 'pending', 'create', '{"title":"Drifted Summary","body":"Frozen claim","note_type":"summary"}', null, 'medium', 'single_clear_segment', 'gm_via_ai_approval', null, null, null, 'c5500000-0000-0000-0000-000000000001', 'synthesize_session', 'synthesize_session@1.0.0', 'c5-model', 'c5-provider'),
  ('c5900000-0000-0000-0000-000000000011', 'c5200000-0000-0000-0000-000000000001', 'c5300000-0000-0000-0000-000000000001', 'c5400000-0000-0000-0000-000000000001', 'saga', 'note', null, 'pending', 'create', '{"title":"Broken Summary","body":"Needs its source","note_type":"summary"}', null, 'low', 'ambiguous_source', 'gm_via_ai_approval', null, null, null, 'c5500000-0000-0000-0000-000000000001', 'synthesize_session', 'synthesize_session@1.0.0', 'c5-model', 'c5-provider'),
  ('c5900000-0000-0000-0000-000000000012', 'c5200000-0000-0000-0000-000000000001', 'c5300000-0000-0000-0000-000000000001', 'c5400000-0000-0000-0000-000000000001', 'saga', 'session', 'c5500000-0000-0000-0000-000000000002', 'pending', 'update', '{"next_prep_implication":"Open beyond the glass bridge.","related_entity_ids":[],"source_session_id":"c5500000-0000-0000-0000-000000000001"}', (select updated_at from public.sessions where id='c5500000-0000-0000-0000-000000000002'), 'high', 'direct_gm_input', 'gm_via_ai_approval', null, null, null, 'c5500000-0000-0000-0000-000000000001', 'synthesize_session', 'synthesize_session@1.0.0', 'c5-model', 'c5-provider'),
  ('c5900000-0000-0000-0000-000000000013', 'c5200000-0000-0000-0000-000000000001', 'c5300000-0000-0000-0000-000000000001', 'c5400000-0000-0000-0000-000000000001', 'saga', 'thread', null, 'pending', 'create', '{"name":"Approved Thread","summary":"An unresolved gate","is_loose_thread":true,"resolution_state":"active"}', null, 'high', 'direct_gm_input', 'gm_via_ai_approval', null, null, null, 'c5500000-0000-0000-0000-000000000001', 'synthesize_session', 'synthesize_session@1.0.0', 'c5-model', 'c5-provider'),
  ('c5900000-0000-0000-0000-000000000014', 'c5200000-0000-0000-0000-000000000001', 'c5300000-0000-0000-0000-000000000001', 'c5400000-0000-0000-0000-000000000001', 'saga', 'character', null, 'pending', 'create', '{"name":"Retry Safe","summary":"Create once"}', null, 'high', 'direct_gm_input', 'gm_via_ai_approval', null, null, null, 'c5500000-0000-0000-0000-000000000001', 'synthesize_session', 'synthesize_session@1.0.0', 'c5-model', 'c5-provider'),
  ('c5900000-0000-0000-0000-000000000015', 'c5200000-0000-0000-0000-000000000001', 'c5300000-0000-0000-0000-000000000001', 'c5400000-0000-0000-0000-000000000001', 'saga', 'character', 'c5600000-0000-0000-0000-000000000001', 'pending', 'update', '{"summary":"Concurrent wording"}', (select updated_at from public.characters where id='c5600000-0000-0000-0000-000000000001'), 'medium', 'single_clear_segment', 'gm_via_ai_approval', null, null, null, 'c5500000-0000-0000-0000-000000000001', 'synthesize_session', 'synthesize_session@1.0.0', 'c5-model', 'c5-provider'),
  ('c5900000-0000-0000-0000-000000000016', 'c5200000-0000-0000-0000-000000000001', 'c5300000-0000-0000-0000-000000000001', 'c5400000-0000-0000-0000-000000000002', 'saga', 'character', 'c5600000-0000-0000-0000-000000000006', 'pending', 'update', '{"summary":"Sibling mutation"}', (select updated_at from public.characters where id='c5600000-0000-0000-0000-000000000006'), 'high', 'direct_gm_input', 'gm_via_ai_approval', null, null, null, null, 'synthesize_session', 'synthesize_session@1.0.0', 'c5-model', 'c5-provider')
on conflict (id) do nothing;

insert into public.draft_sources (workspace_id, world_id, saga_id, scope, draft_id, source_id)
select d.workspace_id, d.world_id, d.saga_id, d.scope, d.id,
  case d.id
    when 'c5900000-0000-0000-0000-000000000010' then 'c5800000-0000-0000-0000-000000000002'::uuid
    when 'c5900000-0000-0000-0000-000000000011' then 'c5800000-0000-0000-0000-000000000003'::uuid
    else 'c5800000-0000-0000-0000-000000000001'::uuid
  end
from public.drafts d
where d.saga_id = 'c5400000-0000-0000-0000-000000000001'
on conflict do nothing;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c5000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.saga_id', 'c5400000-0000-0000-0000-000000000001', true);

create temp table c5_preview as
select public.get_approval_queue('c5200000-0000-0000-0000-000000000001', 'c5300000-0000-0000-0000-000000000001', 'c5400000-0000-0000-0000-000000000001') as payload;

select is(jsonb_array_length((select payload from c5_preview)), 15, 'preview returns only the route-scoped Saga queue');
select is((select item->'field_diffs'->0->>'old' from c5_preview, jsonb_array_elements(payload) item where item->>'id'='c5900000-0000-0000-0000-000000000002'), 'Old summary', 'preview exposes the current field value');
select is((select item->'field_diffs'->0->>'new' from c5_preview, jsonb_array_elements(payload) item where item->>'id'='c5900000-0000-0000-0000-000000000002'), 'New summary', 'preview exposes the proposed field value');
select is((select item->'conflict'->>'kind' from c5_preview, jsonb_array_elements(payload) item where item->>'id'='c5900000-0000-0000-0000-000000000003'), 'stale_target', 'preview detects a stale canonical target');
select is((select item->'conflict'->>'kind' from c5_preview, jsonb_array_elements(payload) item where item->>'id'='c5900000-0000-0000-0000-000000000008'), 'missing_target', 'preview detects a missing target');
select is((select item->'conflict'->>'kind' from c5_preview, jsonb_array_elements(payload) item where item->>'id'='c5900000-0000-0000-0000-000000000009'), 'archived_target', 'preview detects an archived target');
select is((select item->>'source_health' from c5_preview, jsonb_array_elements(payload) item where item->>'id'='c5900000-0000-0000-0000-000000000010'), 'drifted', 'preview detects citation drift');
select is((select item->>'source_health' from c5_preview, jsonb_array_elements(payload) item where item->>'id'='c5900000-0000-0000-0000-000000000011'), 'broken', 'preview detects broken source evidence');
select ok((select (item->'conflict'->>'concurrent_count')::int > 0 from c5_preview, jsonb_array_elements(payload) item where item->>'id'='c5900000-0000-0000-0000-000000000002'), 'preview detects an incompatible concurrent update');
select is((select count(*) from public.canon_audit where workspace_id='c5200000-0000-0000-0000-000000000001'), 0::bigint, 'preview writes zero canon audit rows');
select is((select count(*) from public.notes where workspace_id='c5200000-0000-0000-0000-000000000001'), 0::bigint, 'preview writes zero summary canon rows');

select ok((public.save_draft_edit('c5200000-0000-0000-0000-000000000001', 'c5300000-0000-0000-0000-000000000001', 'c5400000-0000-0000-0000-000000000001', 'c5900000-0000-0000-0000-000000000004', '{"name":"Edit Me","summary":"GM wording"}'::jsonb)->>'ok')::boolean, 'edit preview is saved through the scoped draft boundary');
select is((select count(*) from public.canon_audit where draft_id='c5900000-0000-0000-0000-000000000004'), 0::bigint, 'edit alone writes zero canon audit rows');

create temp table c5_create as select public.resolve_draft('c5200000-0000-0000-0000-000000000001', 'c5300000-0000-0000-0000-000000000001', 'c5400000-0000-0000-0000-000000000001', 'c5900000-0000-0000-0000-000000000001', 'approve', 'c5a00000-0000-0000-0000-000000000001') as result;
select ok((select (result->>'ok')::boolean from c5_create), 'create approval succeeds');
select is((select body from public.notes where title='Session Summary'), 'Approved summary', 'create approval writes the intended summary canon row');

create temp table c5_update as select public.resolve_draft('c5200000-0000-0000-0000-000000000001', 'c5300000-0000-0000-0000-000000000001', 'c5400000-0000-0000-0000-000000000001', 'c5900000-0000-0000-0000-000000000002', 'approve', 'c5a00000-0000-0000-0000-000000000002') as result;
select ok((select (result->>'ok')::boolean from c5_update), 'matching-version update approval succeeds');
select is((select summary from public.characters where id='c5600000-0000-0000-0000-000000000001'), 'New summary', 'matching-version update writes exactly the proposed field');

create temp table c5_stale as select public.resolve_draft('c5200000-0000-0000-0000-000000000001', 'c5300000-0000-0000-0000-000000000001', 'c5400000-0000-0000-0000-000000000001', 'c5900000-0000-0000-0000-000000000003', 'approve', 'c5a00000-0000-0000-0000-000000000003') as result;
select is((select result->>'conflict' from c5_stale), 'stale_target', 'stale approval returns a recoverable conflict');
select is((select state from public.drafts where id='c5900000-0000-0000-0000-000000000003'), 'pending'::public.draft_state, 'stale approval leaves the draft pending');
select is((select count(*) from public.canon_audit where draft_id='c5900000-0000-0000-0000-000000000003'), 0::bigint, 'stale conflict writes zero canon audit rows');

create temp table c5_edit_approve as select public.resolve_draft('c5200000-0000-0000-0000-000000000001', 'c5300000-0000-0000-0000-000000000001', 'c5400000-0000-0000-0000-000000000001', 'c5900000-0000-0000-0000-000000000004', 'edit_and_approve', 'c5a00000-0000-0000-0000-000000000004') as result;
select ok((select (result->>'ok')::boolean from c5_edit_approve), 'edit-and-approve succeeds');
select ok(exists(select 1 from public.characters where name='Edit Me' and summary='GM wording'), 'edit-and-approve applies only the saved GM payload');
select ok((select gm_edit_diff ? 'summary' from public.drafts where id='c5900000-0000-0000-0000-000000000004'), 'edit-and-approve preserves a field-level GM edit diff');

select ok((public.resolve_draft('c5200000-0000-0000-0000-000000000001', 'c5300000-0000-0000-0000-000000000001', 'c5400000-0000-0000-0000-000000000001', 'c5900000-0000-0000-0000-000000000005', 'approve', 'c5a00000-0000-0000-0000-000000000005')->>'ok')::boolean, 'archive approval succeeds');
select is((select canon_state from public.characters where id='c5600000-0000-0000-0000-000000000003'), 'archived'::public.entity_canon_state, 'archive changes canon state without deleting the row');

select ok((public.resolve_draft('c5200000-0000-0000-0000-000000000001', 'c5300000-0000-0000-0000-000000000001', 'c5400000-0000-0000-0000-000000000001', 'c5900000-0000-0000-0000-000000000006', 'merge', 'c5a00000-0000-0000-0000-000000000006', '{}', null, 'c5600000-0000-0000-0000-000000000004')->>'ok')::boolean, 'merge identity decision succeeds');
select is((select summary from public.characters where id='c5600000-0000-0000-0000-000000000004'), 'Keep this identity', 'merge does not mutate the target canon record');
select ok(exists(select 1 from public.drafts d where d.target_entity_id='c5600000-0000-0000-0000-000000000004' and d.state='pending' and d.change_kind='update' and d.ai_task_name='synthesize_session'), 'merge creates a separately reviewable update with provenance');
select ok(exists(select 1 from public.draft_sources ds join public.drafts d on d.id=ds.draft_id where d.target_entity_id='c5600000-0000-0000-0000-000000000004' and ds.source_id='c5800000-0000-0000-0000-000000000001'), 'merge preserves approved source links on the follow-up draft');

select ok((public.resolve_draft('c5200000-0000-0000-0000-000000000001', 'c5300000-0000-0000-0000-000000000001', 'c5400000-0000-0000-0000-000000000001', 'c5900000-0000-0000-0000-000000000007', 'reject', 'c5a00000-0000-0000-0000-000000000007', array['redundant']::public.rejection_reason_tag[], 'GM rejected')->>'ok')::boolean, 'reject succeeds');
select is((select count(*) from public.canon_audit where draft_id='c5900000-0000-0000-0000-000000000007'), 0::bigint, 'reject writes zero canon audit rows');

select is((public.resolve_draft('c5200000-0000-0000-0000-000000000001', 'c5300000-0000-0000-0000-000000000001', 'c5400000-0000-0000-0000-000000000001', 'c5900000-0000-0000-0000-000000000008', 'approve', 'c5a00000-0000-0000-0000-000000000008')->>'conflict'), 'missing_target', 'missing target approval is blocked');
select is((public.resolve_draft('c5200000-0000-0000-0000-000000000001', 'c5300000-0000-0000-0000-000000000001', 'c5400000-0000-0000-0000-000000000001', 'c5900000-0000-0000-0000-000000000009', 'approve', 'c5a00000-0000-0000-0000-000000000009')->>'conflict'), 'archived_target', 'archived target approval is blocked');

select is((public.resolve_draft('c5200000-0000-0000-0000-000000000001', 'c5300000-0000-0000-0000-000000000001', 'c5400000-0000-0000-0000-000000000001', 'c5900000-0000-0000-0000-000000000010', 'approve', 'c5a00000-0000-0000-0000-000000000010')->>'conflict'), 'source_drift', 'source drift requires explicit acknowledgement');
select ok((public.resolve_draft('c5200000-0000-0000-0000-000000000001', 'c5300000-0000-0000-0000-000000000001', 'c5400000-0000-0000-0000-000000000001', 'c5900000-0000-0000-0000-000000000010', 'approve', 'c5a00000-0000-0000-0000-000000000110', '{}', null, null, true)->>'ok')::boolean, 'acknowledged source drift may be approved explicitly');
select is((public.resolve_draft('c5200000-0000-0000-0000-000000000001', 'c5300000-0000-0000-0000-000000000001', 'c5400000-0000-0000-0000-000000000001', 'c5900000-0000-0000-0000-000000000011', 'approve', 'c5a00000-0000-0000-0000-000000000011')->>'conflict'), 'broken_source', 'broken source approval is blocked safely');

select ok((public.save_draft_edit('c5200000-0000-0000-0000-000000000001', 'c5300000-0000-0000-0000-000000000001', 'c5400000-0000-0000-0000-000000000001', 'c5900000-0000-0000-0000-000000000011', '{"title":"Broken Summary","body":"GM preserved edit","note_type":"summary"}'::jsonb)->>'ok')::boolean, 'GM edit is persisted before a commit attempt');
select is((public.resolve_draft('c5200000-0000-0000-0000-000000000001', 'c5300000-0000-0000-0000-000000000001', 'c5400000-0000-0000-0000-000000000001', 'c5900000-0000-0000-0000-000000000011', 'edit_and_approve', 'c5a00000-0000-0000-0000-000000000111')->>'conflict'), 'broken_source', 'failed edit-and-approve remains recoverable');
select is((select committed_payload->>'body' from public.drafts where id='c5900000-0000-0000-0000-000000000011'), 'GM preserved edit', 'failed commit preserves the GM edit');

select ok((public.resolve_draft('c5200000-0000-0000-0000-000000000001', 'c5300000-0000-0000-0000-000000000001', 'c5400000-0000-0000-0000-000000000001', 'c5900000-0000-0000-0000-000000000012', 'approve', 'c5a00000-0000-0000-0000-000000000012')->>'ok')::boolean, 'next-session prep implication approval succeeds');
select is((select pending_prep_suggestions->0->'payload'->>'text' from public.sessions where id='c5500000-0000-0000-0000-000000000002'), 'Open beyond the glass bridge.', 'next-session implication enters the owned planned Session');
select ok(exists(select 1 from public.canon_audit where draft_id='c5900000-0000-0000-0000-000000000012' and entity_type='session' and source_ids=array['c5800000-0000-0000-0000-000000000001'::uuid]), 'next-session approval writes exact audit provenance');

select ok((public.resolve_draft('c5200000-0000-0000-0000-000000000001', 'c5300000-0000-0000-0000-000000000001', 'c5400000-0000-0000-0000-000000000001', 'c5900000-0000-0000-0000-000000000013', 'approve', 'c5a00000-0000-0000-0000-000000000013')->>'ok')::boolean, 'Thread create approval succeeds');
select ok(exists(select 1 from public.threads where name='Approved Thread' and is_loose_thread), 'Thread-specific fields reach canon through approval');

create temp table c5_retry_one as select public.resolve_draft('c5200000-0000-0000-0000-000000000001', 'c5300000-0000-0000-0000-000000000001', 'c5400000-0000-0000-0000-000000000001', 'c5900000-0000-0000-0000-000000000014', 'approve', 'c5a00000-0000-0000-0000-000000000014') result;
create temp table c5_retry_two as select public.resolve_draft('c5200000-0000-0000-0000-000000000001', 'c5300000-0000-0000-0000-000000000001', 'c5400000-0000-0000-0000-000000000001', 'c5900000-0000-0000-0000-000000000014', 'approve', 'c5a00000-0000-0000-0000-000000000014') result;
select ok((select (result->>'replayed')::boolean from c5_retry_two), 'duplicate submission returns its recorded result');
select is((select count(*) from public.characters where name='Retry Safe'), 1::bigint, 'duplicate submission creates canon exactly once');

select is((select count(*) from public.canon_audit where draft_id in ('c5900000-0000-0000-0000-000000000001','c5900000-0000-0000-0000-000000000002','c5900000-0000-0000-0000-000000000004','c5900000-0000-0000-0000-000000000005','c5900000-0000-0000-0000-000000000010','c5900000-0000-0000-0000-000000000012','c5900000-0000-0000-0000-000000000013','c5900000-0000-0000-0000-000000000014')), 8::bigint, 'successful approvals produce exactly one canon audit row each');
select ok((select change_summary->'fields'->'summary'->>'old'='Old summary' and change_summary->'fields'->'summary'->>'new'='New summary' from public.canon_audit where draft_id='c5900000-0000-0000-0000-000000000002'), 'canon audit stores exact field-level old and new values');
select ok((select change_summary->'provenance'->>'ai_task_name'='synthesize_session' and cardinality(source_ids)=1 from public.canon_audit where draft_id='c5900000-0000-0000-0000-000000000001'), 'canon audit preserves task and source provenance');

select is((public.resolve_draft('c5200000-0000-0000-0000-000000000001', 'c5300000-0000-0000-0000-000000000001', 'c5400000-0000-0000-0000-000000000001', 'c5900000-0000-0000-0000-000000000016', 'approve', 'c5a00000-0000-0000-0000-000000000016')->>'conflict'), 'draft_unavailable', 'route-scoped approval cannot substitute a sibling-Saga target');
reset role;
select is((select summary from public.characters where id='c5600000-0000-0000-0000-000000000006'), 'Must remain isolated', 'sibling-Saga canon remains unchanged');

set local role authenticated;
select set_config('request.jwt.claim.saga_id', 'c5400000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.sub', 'c5000000-0000-0000-0000-000000000002', true);
select throws_like(
  $$ select public.get_approval_queue('c5200000-0000-0000-0000-000000000001', 'c5300000-0000-0000-0000-000000000001', 'c5400000-0000-0000-0000-000000000001') $$,
  '%not available%',
  'permission denial prevents Approval Queue reads'
);

reset role;
select * from finish();

rollback;

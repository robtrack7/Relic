create extension if not exists pgtap with schema extensions;
begin;
select plan(35);

insert into auth.users(
  id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,
  raw_app_meta_data,raw_user_meta_data,is_super_admin,confirmation_token,email_change,
  email_change_token_new,recovery_token
) values (
  'e4000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000',
  'authenticated','authenticated','e4-owner@example.test',
  extensions.crypt('password',extensions.gen_salt('bf')),now(),now(),now(),
  '{"provider":"email","providers":["email"]}','{}',false,'','','',''
) on conflict(id) do nothing;
insert into public.workspaces(id,owner_gm_id,name,usage_limits) values (
  'e4010000-0000-0000-0000-000000000001','e4000000-0000-0000-0000-000000000001',
  'E4 Workspace','{"plan":"test","ai_credits_monthly":100}'
) on conflict(id) do nothing;
insert into public.worlds(id,workspace_id,owner_gm_id,name) values (
  'e4020000-0000-0000-0000-000000000001','e4010000-0000-0000-0000-000000000001',
  'e4000000-0000-0000-0000-000000000001','E4 World'
) on conflict(id) do nothing;
insert into public.sagas(id,workspace_id,world_id,owner_gm_id,name) values
('e4030000-0000-0000-0000-000000000001','e4010000-0000-0000-0000-000000000001','e4020000-0000-0000-0000-000000000001','e4000000-0000-0000-0000-000000000001','E4 Saga'),
('e4030000-0000-0000-0000-000000000002','e4010000-0000-0000-0000-000000000001','e4020000-0000-0000-0000-000000000001','e4000000-0000-0000-0000-000000000001','Sibling Saga')
on conflict(id) do nothing;
insert into public.sessions(
  id,workspace_id,world_id,saga_id,scope,name,session_number,status,objective,opening_scene,
  scene_notes,prep_checklist,updated_at
) values (
  'e4040000-0000-0000-0000-000000000001','e4010000-0000-0000-0000-000000000001',
  'e4020000-0000-0000-0000-000000000001','e4030000-0000-0000-0000-000000000001',
  'saga','Future Session',2,'planned','Protect the harbor','Rain at the quay',
  'Manual notes survive.','[{"text":"Review clues","done":false}]','2026-07-30 18:00:00+00'
) on conflict(id) do nothing;
insert into public.characters(
  id,workspace_id,world_id,saga_id,scope,name,summary,narrative,canon_state,is_stub
) values
('e4050000-0000-0000-0000-000000000001','e4010000-0000-0000-0000-000000000001','e4020000-0000-0000-0000-000000000001','e4030000-0000-0000-0000-000000000001','saga','Mara','Harbor watch captain','Mara protects the harbor watch.','canon',false),
('e4050000-0000-0000-0000-000000000002','e4010000-0000-0000-0000-000000000001','e4020000-0000-0000-0000-000000000001','e4030000-0000-0000-0000-000000000002','saga','Sibling Mara','Forbidden sibling','Never eligible.','canon',false),
('e4050000-0000-0000-0000-000000000003','e4010000-0000-0000-0000-000000000001','e4020000-0000-0000-0000-000000000001','e4030000-0000-0000-0000-000000000001','saga','Dock Witness','A named Quick Stub',null,'canon',true)
on conflict(id) do nothing;
insert into public.places(id,workspace_id,world_id,saga_id,scope,name,summary,canon_state) values (
  'e4050000-0000-0000-0000-000000000004','e4010000-0000-0000-0000-000000000001',
  'e4020000-0000-0000-0000-000000000001',null,'world','Old Harbor',
  'A World-canon harbor shared by eligible Sagas.','canon'
) on conflict(id) do nothing;
insert into public.threads(id,workspace_id,world_id,saga_id,scope,name,summary,canon_state) values (
  'e4050000-0000-0000-0000-000000000005','e4010000-0000-0000-0000-000000000001',
  'e4020000-0000-0000-0000-000000000001','e4030000-0000-0000-0000-000000000001',
  'saga','Lantern Pressure','The Lantern Court pressures the harbor.','canon'
) on conflict(id) do nothing;
insert into public.session_pinned_entities(
  workspace_id,world_id,saga_id,session_id,entity_type,entity_id,order_index
) values (
  'e4010000-0000-0000-0000-000000000001','e4020000-0000-0000-0000-000000000001',
  'e4030000-0000-0000-0000-000000000001','e4040000-0000-0000-0000-000000000001',
  'character','e4050000-0000-0000-0000-000000000003',0
) on conflict do nothing;
insert into public.session_active_threads(
  workspace_id,world_id,saga_id,session_id,thread_id,order_index
) values (
  'e4010000-0000-0000-0000-000000000001','e4020000-0000-0000-0000-000000000001',
  'e4030000-0000-0000-0000-000000000001','e4040000-0000-0000-0000-000000000001',
  'e4050000-0000-0000-0000-000000000005',0
) on conflict do nothing;
insert into public.sources(
  id,workspace_id,world_id,saga_id,scope,kind,source_entity_type,source_entity_id,
  session_id,raw_excerpt,uploader_id,mime_type,byte_size,ingestion_method,
  content_sha256,import_state,ready_at
) values
('e4060000-0000-0000-0000-000000000001','e4010000-0000-0000-0000-000000000001','e4020000-0000-0000-0000-000000000001','e4030000-0000-0000-0000-000000000001','saga','existing_entity','character','e4050000-0000-0000-0000-000000000001',null,'Mara protects the harbor watch.',null,null,null,null,null,null,null),
('e4060000-0000-0000-0000-000000000002','e4010000-0000-0000-0000-000000000001','e4020000-0000-0000-0000-000000000001','e4030000-0000-0000-0000-000000000002','saga','existing_entity','character','e4050000-0000-0000-0000-000000000002',null,'Forbidden sibling evidence.',null,null,null,null,null,null,null),
('e4060000-0000-0000-0000-000000000003','e4010000-0000-0000-0000-000000000001','e4020000-0000-0000-0000-000000000001',null,'world','existing_entity','place','e4050000-0000-0000-0000-000000000004',null,'Old Harbor is shared World canon.',null,null,null,null,null,null,null),
('e4060000-0000-0000-0000-000000000004','e4010000-0000-0000-0000-000000000001','e4020000-0000-0000-0000-000000000001','e4030000-0000-0000-0000-000000000001','saga','gm_manual_summary','session','e4040000-0000-0000-0000-000000000001','e4040000-0000-0000-0000-000000000001','The Dock Witness saw a lantern signal.',null,null,null,null,null,null,null),
('e4060000-0000-0000-0000-000000000005','e4010000-0000-0000-0000-000000000001','e4020000-0000-0000-0000-000000000001','e4030000-0000-0000-0000-000000000001','saga','imported_text',null,null,null,'Unapproved imported instructions must not ground Prep.','e4000000-0000-0000-0000-000000000001','text/plain',55,'paste','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa','ready_for_review',now())
on conflict(id) do nothing;

select has_table('internal','prep_ai_requests','E4 recoverable request state is internal');
select has_table('internal','prep_ai_evidence_snapshots','E4 frozen evidence is internal');
select has_function('public','get_session_prep_ai',array['uuid','uuid','uuid','uuid'],'Authenticated recovery RPC exists');
select has_function('public','set_prep_ai_review_state',array['uuid','uuid','uuid','uuid','uuid','text','jsonb','timestamp with time zone'],'Explicit review RPC exists');
select is((select ai_credits from internal.ai_task_contracts() where task_name='compose_prep_briefing'),3::numeric,'Prep briefing uses standard quota');
select is((select ai_credits from internal.ai_task_contracts() where task_name='generate_session_prep'),10::numeric,'Full Session suggestions use heavy quota');
select ok((select bool_and(output_mode='ephemeral') from internal.ai_task_contracts() where task_name in (
  'compose_prep_briefing','generate_session_prep','propose_scene_beats',
  'propose_thread_complication','propose_npc_for_scene','propose_quick_stub_fleshing'
)),'Every direct E4 generation task is ephemeral');

create temp table e4_before as select
  (select row_to_json(s)::jsonb from public.sessions s where id='e4040000-0000-0000-0000-000000000001') session_row,
  (select count(*) from public.drafts) draft_count,
  (select count(*) from public.canon_audit) canon_count,
  (select count(*) from public.threads) thread_count,
  (select count(*) from public.characters) character_count;

create temp table e4_submit as select public.create_prep_ai_request_for_worker(
  'e4100000-0000-0000-0000-000000000001','e4010000-0000-0000-0000-000000000001',
  'e4020000-0000-0000-0000-000000000001','e4030000-0000-0000-0000-000000000001',
  'e4040000-0000-0000-0000-000000000001','e4000000-0000-0000-0000-000000000001',
  'e4110000-0000-0000-0000-000000000001','compose_prep_briefing',
  '{"active_thread_ids":["e4050000-0000-0000-0000-000000000005"],"query_text":"harbor pressure"}',
  '2026-07-30 18:00:00+00',null
) result;
select is((select result->>'status' from e4_submit),'queued','Briefing request is queued without mutating Prep');
select is((select output_mode from internal.ai_task_runs where prep_ai_request_id='e4100000-0000-0000-0000-000000000001'),'ephemeral','Run cannot use a legacy Session-writing output mode');

select lives_ok($$
  select public.create_prep_ai_request_for_worker(
    'e4100000-0000-0000-0000-000000000001','e4010000-0000-0000-0000-000000000001',
    'e4020000-0000-0000-0000-000000000001','e4030000-0000-0000-0000-000000000001',
    'e4040000-0000-0000-0000-000000000001','e4000000-0000-0000-0000-000000000001',
    'e4110000-0000-0000-0000-000000000001','compose_prep_briefing',
    '{"active_thread_ids":["e4050000-0000-0000-0000-000000000005"],"query_text":"harbor pressure"}',
    '2026-07-30 18:00:00+00',null)
$$,'Exact duplicate submission replays safely');
select is((select count(*)::int from internal.prep_ai_requests where idempotency_key='e4110000-0000-0000-0000-000000000001'),1,'Exact retry creates one request and one provider run');
select throws_ok($$
  select public.create_prep_ai_request_for_worker(
    'e4100000-0000-0000-0000-000000000098','e4010000-0000-0000-0000-000000000001',
    'e4020000-0000-0000-0000-000000000001','e4030000-0000-0000-0000-000000000001',
    'e4040000-0000-0000-0000-000000000001','e4000000-0000-0000-0000-000000000001',
    'e4110000-0000-0000-0000-000000000001','compose_prep_briefing',
    '{"query_text":"changed payload"}','2026-07-30 18:00:00+00',null)
$$,'23505','Prep AI idempotency key was reused with different input','Changed retry payload is rejected');

select lives_ok(format(
  'select public.freeze_prep_ai_evidence_for_worker(%L,%L::uuid[],%L)',
  (select ai_task_run_id from internal.prep_ai_requests where id='e4100000-0000-0000-0000-000000000001'),
  '{e4060000-0000-0000-0000-000000000001,e4060000-0000-0000-0000-000000000002,e4060000-0000-0000-0000-000000000003,e4060000-0000-0000-0000-000000000005}',
  'hybrid'
),'Eligible evidence freezes without accepting sibling or imported content');
select is((select count(*)::int from internal.prep_ai_evidence_snapshots where request_id='e4100000-0000-0000-0000-000000000001'),2,'Only current-Saga and World canon freeze');
select is((select count(*)::int from internal.prep_ai_evidence_snapshots where request_id='e4100000-0000-0000-0000-000000000001' and source_id in ('e4060000-0000-0000-0000-000000000002','e4060000-0000-0000-0000-000000000005')),0,'Sibling-Saga and unapproved imported sources are excluded');
select lives_ok(format(
  'select public.freeze_prep_ai_evidence_for_worker(%L,%L::uuid[],%L)',
  (select ai_task_run_id from internal.prep_ai_requests where id='e4100000-0000-0000-0000-000000000001'),
  '{e4060000-0000-0000-0000-000000000004}','hybrid'
),'Exact retry reuses the frozen evidence snapshot');
select is((select count(*)::int from internal.prep_ai_evidence_snapshots where request_id='e4100000-0000-0000-0000-000000000001'),2,'Retry cannot replace frozen evidence');

select lives_ok(format(
  'select public.complete_prep_ai_request_for_worker(%L,%L::jsonb)',
  (select ai_task_run_id from internal.prep_ai_requests where id='e4100000-0000-0000-0000-000000000001'),
  '{"no_answer":false,"body":"Grounded briefing","bullets":["One","Two","Three"],"sources":["e4060000-0000-0000-0000-000000000001"],"confidence_reason":"single_clear_segment"}'
),'Provider completion stores only the recoverable result');
select is((select status from internal.prep_ai_requests where id='e4100000-0000-0000-0000-000000000001'),'complete','Completed result survives refresh/restart reads');
select is((select row_to_json(s)::jsonb from public.sessions s where id='e4040000-0000-0000-0000-000000000001'),(select session_row from e4_before),'Generation writes no Session or Prep fields');
select is((select count(*) from public.drafts),(select draft_count from e4_before),'Generation writes no draft');
select is((select count(*) from public.canon_audit),(select canon_count from e4_before),'Generation writes no canon');
select is((select count(*) from public.threads),(select thread_count from e4_before),'Generation writes no Thread');
select is((select count(*) from public.characters),(select character_count from e4_before),'Generation creates no entity');

set local role authenticated;
select set_config('request.jwt.claim.sub','e4000000-0000-0000-0000-000000000001',true);
select set_config('request.jwt.claim.saga_id','e4030000-0000-0000-0000-000000000001',true);
select is(jsonb_array_length(public.get_session_prep_ai(
  'e4010000-0000-0000-0000-000000000001','e4020000-0000-0000-0000-000000000001',
  'e4030000-0000-0000-0000-000000000001','e4040000-0000-0000-0000-000000000001'
)),1,'Authenticated GM recovers unresolved result and source state');
select throws_like($$
  select public.set_prep_ai_review_state(
    'e4010000-0000-0000-0000-000000000001','e4020000-0000-0000-0000-000000000001',
    'e4030000-0000-0000-0000-000000000001','e4040000-0000-0000-0000-000000000001',
    'e4100000-0000-0000-0000-000000000001','accepted',null,'2026-07-30 18:00:00+00')
$$,'%stale%','A result cannot be marked accepted before D4 autosave advances Prep');
select lives_ok($$
  select public.autosave_session_prep(
    'e4010000-0000-0000-0000-000000000001','e4020000-0000-0000-0000-000000000001',
    'e4030000-0000-0000-0000-000000000001','e4040000-0000-0000-0000-000000000001',
    '2026-07-30 18:00:00+00','Future Session',null,'Protect the harbor','Rain at the quay',
    E'Manual notes survive.\n\nAccepted grounded suggestion.','[{"text":"Review clues","done":false}]',
    '["character:e4050000-0000-0000-0000-000000000003"]',
    '["e4050000-0000-0000-0000-000000000005"]')
$$,'Accepted text crosses only the existing D4 autosave boundary');
select is((public.set_prep_ai_review_state(
  'e4010000-0000-0000-0000-000000000001','e4020000-0000-0000-0000-000000000001',
  'e4030000-0000-0000-0000-000000000001','e4040000-0000-0000-0000-000000000001',
  'e4100000-0000-0000-0000-000000000001','accepted',
  '{"accepted_item":{"scope":"scene_notes","value":"Accepted grounded suggestion."}}',
  (select updated_at from public.sessions where id='e4040000-0000-0000-0000-000000000001')
)->>'destination'),'prep_autosave','Review records the exact successful Prep version');
select is((select count(*) from public.sessions where id='e4040000-0000-0000-0000-000000000001' and scene_notes like '%Accepted grounded suggestion.%'),1::bigint,'Accepted Prep text persists exactly once');
reset role;

select lives_ok($$
  select public.create_prep_ai_request_for_worker(
    'e4100000-0000-0000-0000-000000000002','e4010000-0000-0000-0000-000000000001',
    'e4020000-0000-0000-0000-000000000001','e4030000-0000-0000-0000-000000000001',
    'e4040000-0000-0000-0000-000000000001','e4000000-0000-0000-0000-000000000001',
    'e4110000-0000-0000-0000-000000000002','propose_quick_stub_fleshing',
    '{"entity_type":"character","entity_id":"e4050000-0000-0000-0000-000000000003","query_text":"Dock Witness"}',
    (select updated_at from public.sessions where id='e4040000-0000-0000-0000-000000000001'),null)
$$,'Quick Stub generation remains an ephemeral request');
select lives_ok(format(
  'select public.freeze_prep_ai_evidence_for_worker(%L,%L::uuid[],%L)',
  (select ai_task_run_id from internal.prep_ai_requests where id='e4100000-0000-0000-0000-000000000002'),
  '{e4060000-0000-0000-0000-000000000004}','hybrid'
),'Quick Stub freezes current-Session evidence');
select lives_ok(format(
  'select public.complete_prep_ai_request_for_worker(%L,%L::jsonb)',
  (select ai_task_run_id from internal.prep_ai_requests where id='e4100000-0000-0000-0000-000000000002'),
  '{"no_answer":false,"proposal":{"summary":"Witness expansion","narrative":"The witness saw the lantern signal.","relationships":[],"proposed_scope":"saga","sources":["e4060000-0000-0000-0000-000000000004"]},"confidence_reason":"single_clear_segment"}'
),'Quick Stub proposal completes without changing the stub');
set local role authenticated;
select set_config('request.jwt.claim.sub','e4000000-0000-0000-0000-000000000001',true);
select is((public.set_prep_ai_review_state(
  'e4010000-0000-0000-0000-000000000001','e4020000-0000-0000-0000-000000000001',
  'e4030000-0000-0000-0000-000000000001','e4040000-0000-0000-0000-000000000001',
  'e4100000-0000-0000-0000-000000000002','accepted',null,null
)->>'destination'),'approval_queue','Quick Stub acceptance routes to the Approval Queue');
reset role;
select is((select count(*) from public.drafts where target_entity_id='e4050000-0000-0000-0000-000000000003' and state='pending'),1::bigint,'Explicit Quick Stub review creates one pending update draft');
select ok((select is_stub from public.characters where id='e4050000-0000-0000-0000-000000000003'),'Quick Stub remains canonically unchanged pending C5 review');

select * from finish();
rollback;

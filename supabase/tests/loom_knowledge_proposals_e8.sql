create extension if not exists pgtap with schema extensions;
begin;
select plan(34);

insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_app_meta_data,raw_user_meta_data,is_super_admin,confirmation_token,email_change,email_change_token_new,recovery_token)
values ('e8000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','e8@example.test',extensions.crypt('password',extensions.gen_salt('bf')),now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false,'','','','')
on conflict(id) do nothing;
insert into public.workspaces(id,owner_gm_id,name,usage_limits) values
('e8010000-0000-4000-8000-000000000001','e8000000-0000-4000-8000-000000000001','E8 Workspace','{"plan":"test","ai_credits_monthly":100,"transcription_seconds_monthly":3600,"storage_bytes":1000000,"worlds_active":5,"sagas_active":5,"entities_per_saga":100,"imports_monthly":10,"exports_monthly":10}')
on conflict(id) do nothing;
insert into public.worlds(id,workspace_id,owner_gm_id,name) values
('e8020000-0000-4000-8000-000000000001','e8010000-0000-4000-8000-000000000001','e8000000-0000-4000-8000-000000000001','E8 World') on conflict(id) do nothing;
insert into public.sagas(id,workspace_id,world_id,owner_gm_id,name) values
('e8030000-0000-4000-8000-000000000001','e8010000-0000-4000-8000-000000000001','e8020000-0000-4000-8000-000000000001','e8000000-0000-4000-8000-000000000001','E8 Saga') on conflict(id) do nothing;

insert into public.characters(id,workspace_id,world_id,saga_id,scope,name,summary,narrative,canon_state) values
('e8040000-0000-4000-8000-000000000001','e8010000-0000-4000-8000-000000000001','e8020000-0000-4000-8000-000000000001','e8030000-0000-4000-8000-000000000001','saga','Mara','Gate captain','Mara guards the Iron Gate.','canon'),
('e8040000-0000-4000-8000-000000000002','e8010000-0000-4000-8000-000000000001','e8020000-0000-4000-8000-000000000001',null,'world','Archivist Vale','World archivist','Vale records every erased road.','canon')
on conflict(id) do nothing;
insert into public.places(id,workspace_id,world_id,saga_id,scope,name,summary,narrative,canon_state) values
('e8050000-0000-4000-8000-000000000001','e8010000-0000-4000-8000-000000000001','e8020000-0000-4000-8000-000000000001','e8030000-0000-4000-8000-000000000001','saga','Iron Gate','Eastern passage','The Iron Gate protects the road.','canon') on conflict(id) do nothing;
insert into public.threads(id,workspace_id,world_id,saga_id,scope,name,summary,narrative,objective,objectives_log,canon_state) values
('e8060000-0000-4000-8000-000000000001','e8010000-0000-4000-8000-000000000001','e8020000-0000-4000-8000-000000000001','e8030000-0000-4000-8000-000000000001','saga','Broken Seal','Who opened the seal?','The seal was opened from within.','Find the opener','[{"id":"e8160000-0000-4000-8000-000000000001","text":"Find the opener","state":"open","order_index":0}]','canon'),
('e8060000-0000-4000-8000-000000000002','e8010000-0000-4000-8000-000000000001','e8020000-0000-4000-8000-000000000001','e8030000-0000-4000-8000-000000000001','saga','Vanishing Road','Where did the road go?','The western road fades at moonrise.','Trace the road','[]','canon')
on conflict(id) do nothing;
insert into public.notes(id,workspace_id,world_id,saga_id,scope,note_type,title,body,canon_state) values
('e8070000-0000-4000-8000-000000000001','e8010000-0000-4000-8000-000000000001','e8020000-0000-4000-8000-000000000001','e8030000-0000-4000-8000-000000000001','saga','lore','Road Ledger','The ledger names three missing roads.','canon') on conflict(id) do nothing;
insert into public.relationships(id,workspace_id,world_id,saga_id,scope,from_entity_type,from_entity_id,to_entity_type,to_entity_id,kind,canon_state) values
('e8080000-0000-4000-8000-000000000001','e8010000-0000-4000-8000-000000000001','e8020000-0000-4000-8000-000000000001','e8030000-0000-4000-8000-000000000001','saga','character','e8040000-0000-4000-8000-000000000001','place','e8050000-0000-4000-8000-000000000001','located-at','canon') on conflict(id) do nothing;
insert into public.sources(id,workspace_id,world_id,saga_id,scope,kind,source_entity_type,source_entity_id,note_id,raw_excerpt) values
('e8090000-0000-4000-8000-000000000001','e8010000-0000-4000-8000-000000000001','e8020000-0000-4000-8000-000000000001','e8030000-0000-4000-8000-000000000001','saga','existing_entity','character','e8040000-0000-4000-8000-000000000001',null,'Mara guards the Iron Gate.'),
('e8090000-0000-4000-8000-000000000002','e8010000-0000-4000-8000-000000000001','e8020000-0000-4000-8000-000000000001','e8030000-0000-4000-8000-000000000001','saga','existing_entity','place','e8050000-0000-4000-8000-000000000001',null,'The Iron Gate protects the road.'),
('e8090000-0000-4000-8000-000000000003','e8010000-0000-4000-8000-000000000001','e8020000-0000-4000-8000-000000000001','e8030000-0000-4000-8000-000000000001','saga','existing_entity','thread','e8060000-0000-4000-8000-000000000001',null,'The seal was opened from within.'),
('e8090000-0000-4000-8000-000000000004','e8010000-0000-4000-8000-000000000001','e8020000-0000-4000-8000-000000000001','e8030000-0000-4000-8000-000000000001','saga','existing_entity','thread','e8060000-0000-4000-8000-000000000002',null,'The western road fades at moonrise.'),
('e8090000-0000-4000-8000-000000000005','e8010000-0000-4000-8000-000000000001','e8020000-0000-4000-8000-000000000001','e8030000-0000-4000-8000-000000000001','saga','note',null,null,'e8070000-0000-4000-8000-000000000001','The ledger names three missing roads.'),
('e8090000-0000-4000-8000-000000000006','e8010000-0000-4000-8000-000000000001','e8020000-0000-4000-8000-000000000001',null,'world','existing_entity','character','e8040000-0000-4000-8000-000000000002',null,'Vale records every erased road.')
on conflict(id) do nothing;

select is((select count(*) from internal.loom_action_contracts()),12::bigint,'E8 expands the active Loom registry to twelve actions');
select is((select count(*) from internal.loom_action_contracts() where action_name in ('propose_record_create','propose_record_update','add_relationship','remove_relationship','set_thread_state','mutate_thread_objective') and ai_credits=0),6::bigint,'Every E8 confirmation has zero additional AI credits');
select ok(not has_function_privilege('authenticated','internal.review_loom_action_e6(uuid,integer,text,uuid)','EXECUTE'),'The compatibility review implementation is private and not browser callable');
select ok(not internal.loom_provider_action_manifest()::text ~* '(handler|rpc|function_name)','Expanded provider manifest still excludes executors');

select public.create_loom_provider_turn_for_worker(
  'e8010000-0000-4000-8000-000000000001','e8020000-0000-4000-8000-000000000001','e8030000-0000-4000-8000-000000000001','e8000000-0000-4000-8000-000000000001',null,
  'e8100000-0000-4000-8000-000000000001','e8110000-0000-4000-8000-000000000001','Prepare reviewed worldbuilding changes.','exact',
  array['e8090000-0000-4000-8000-000000000001','e8090000-0000-4000-8000-000000000002','e8090000-0000-4000-8000-000000000003','e8090000-0000-4000-8000-000000000004','e8090000-0000-4000-8000-000000000005','e8090000-0000-4000-8000-000000000006']::uuid[]);

select internal.materialize_loom_action_intent('e8100000-0000-4000-8000-000000000001',0,
  '{"name":"propose_record_create","version":"1.0.0","arguments":{"entity_type":"character","payload":{"name":"Ashen Cartographer","summary":"Tracks erased roads","narrative":"They chart roads that vanish at moonrise.","gm_notes":"Connect after review."},"source_ids":["e8090000-0000-4000-8000-000000000006"]}}','Create one reviewed Character proposal.');
select internal.materialize_loom_action_intent('e8100000-0000-4000-8000-000000000001',1,
  '{"name":"propose_record_update","version":"1.0.0","arguments":{"source_id":"e8090000-0000-4000-8000-000000000005","changes":{"body":"The ledger now names four missing roads."},"source_ids":["e8090000-0000-4000-8000-000000000006"]}}','Prepare one Note update.');
select internal.materialize_loom_action_intent('e8100000-0000-4000-8000-000000000001',2,
  '{"name":"add_relationship","version":"1.0.0","arguments":{"from_source_id":"e8090000-0000-4000-8000-000000000001","to_source_id":"e8090000-0000-4000-8000-000000000002","kind":"related-to"}}','Add one relationship.');
select internal.materialize_loom_action_intent('e8100000-0000-4000-8000-000000000001',3,
  '{"name":"remove_relationship","version":"1.0.0","arguments":{"from_source_id":"e8090000-0000-4000-8000-000000000001","to_source_id":"e8090000-0000-4000-8000-000000000002","kind":"located-at"}}','Remove one relationship.');
select internal.materialize_loom_action_intent('e8100000-0000-4000-8000-000000000001',4,
  '{"name":"set_thread_state","version":"1.0.0","arguments":{"source_id":"e8090000-0000-4000-8000-000000000003","state":"resolved","resolution_details":"Mara resealed it from within."}}','Resolve one Thread.');
select internal.materialize_loom_action_intent('e8100000-0000-4000-8000-000000000001',5,
  '{"name":"mutate_thread_objective","version":"1.0.0","arguments":{"source_id":"e8090000-0000-4000-8000-000000000004","operation":"create","new_text":"Trace the erased western road."}}','Create one Thread objective.');

select is((select count(*) from public.guide_action_intents where turn_id='e8100000-0000-4000-8000-000000000001'),6::bigint,'All six E8 typed previews materialize');
select is((select count(*) from public.drafts where saga_id='e8030000-0000-4000-8000-000000000001'),0::bigint,'Preview materialization creates no draft');
select is((select count(*) from public.canon_audit where saga_id='e8030000-0000-4000-8000-000000000001'),0::bigint,'Preview materialization creates no canon audit');
select ok((select target_type='note' and jsonb_array_length(result_snapshot->'fields')=1 from public.guide_action_intents where turn_id='e8100000-0000-4000-8000-000000000001' and block_index=1),'Note sources normalize through note_id and produce a field diff');
select throws_ok($$select internal.materialize_loom_action_intent('e8100000-0000-4000-8000-000000000001',8,'{"name":"propose_record_update","version":"1.0.0","arguments":{"source_id":"e8090000-0000-4000-8000-000000000006","changes":{"summary":"Forbidden World update"}}}','Do not mutate World canon.')$$,'22023','Record update target or payload is invalid','World-canon update proposals are rejected');
select throws_ok($$select internal.materialize_loom_action_intent('e8100000-0000-4000-8000-000000000001',9,'{"name":"propose_record_create","version":"1.0.0","arguments":{"entity_type":"character","payload":{"name":"Bad","unknown":"field"},"source_ids":[]}}','Reject unknown fields.')$$,'22023','Record creation proposal payload is invalid','Unknown record fields fail closed');

create temp table e8_actions as select block_index,id from public.guide_action_intents where turn_id='e8100000-0000-4000-8000-000000000001';
grant select on e8_actions to authenticated;
create temp table e8_baseline as select (select count(*) from internal.embedding_jobs) embedding_jobs,(select count(*) from public.canon_audit) audits;
grant select on e8_baseline to authenticated;

set local role authenticated;
select set_config('request.jwt.claim.sub','e8000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claim.role','authenticated',true);
create temp table e8_create_result as select public.review_loom_action((select id from e8_actions where block_index=0),1,'confirmed','e8120000-0000-4000-8000-000000000001') result;
select is((select result->>'state' from e8_create_result),'accepted','Record creation confirmation creates an accepted proposal action');
select ok((select result->>'draft_id' is not null and result->>'consequence' like 'Pending proposal%' from e8_create_result),'Proposal confirmation returns one pending Review destination');
select is((public.review_loom_action((select id from e8_actions where block_index=0),1,'confirmed','e8120000-0000-4000-8000-000000000001')->>'replayed'),'true','Exact proposal confirmation replay cannot duplicate the draft');
reset role;
select is((select count(*) from public.drafts where id=(select (result->>'draft_id')::uuid from e8_create_result) and state='pending' and change_kind='create'),1::bigint,'Exactly one ordinary pending create draft is written');
select is((select count(*) from public.draft_sources where draft_id=(select (result->>'draft_id')::uuid from e8_create_result)),2::bigint,'The proposal links its GM instruction and eligible World evidence');
select is(internal.approval_source_health('e8010000-0000-4000-8000-000000000001','e8020000-0000-4000-8000-000000000001','e8030000-0000-4000-8000-000000000001',(select (result->>'draft_id')::uuid from e8_create_result)),'healthy','Eligible World evidence is healthy under the Saga draft authorization root');
select is((select count(*) from public.drafts where saga_id='e8030000-0000-4000-8000-000000000001'),1::bigint,'Exact replay leaves one draft');
select is((select count(*) from internal.embedding_jobs),(select embedding_jobs from e8_baseline),'Proposal confirmation enqueues no embedding');
set local role authenticated;
select ok((public.resolve_draft('e8010000-0000-4000-8000-000000000001','e8020000-0000-4000-8000-000000000001','e8030000-0000-4000-8000-000000000001',(select (result->>'draft_id')::uuid from e8_create_result),'approve','e8130000-0000-4000-8000-000000000001')->>'ok')::boolean,'Ordinary Approval Queue commit approves the Loom proposal');
reset role;
select is((select count(*) from public.characters where saga_id='e8030000-0000-4000-8000-000000000001' and name='Ashen Cartographer'),1::bigint,'Approval writes one canon Character');
select is((select count(*) from internal.embedding_jobs),(select embedding_jobs+1 from e8_baseline),'Approved content enqueues one current embedding identity');

set local role authenticated;
create temp table e8_note_result as select public.review_loom_action((select id from e8_actions where block_index=1),1,'confirmed','e8120000-0000-4000-8000-000000000002') result;
reset role;
select is((select count(*) from internal.embedding_jobs),(select embedding_jobs+1 from e8_baseline),'Update proposal confirmation still enqueues no embedding');
set local role authenticated;
select ok((public.resolve_draft('e8010000-0000-4000-8000-000000000001','e8020000-0000-4000-8000-000000000001','e8030000-0000-4000-8000-000000000001',(select (result->>'draft_id')::uuid from e8_note_result),'reject','e8130000-0000-4000-8000-000000000002',array['ambiguous_source']::public.rejection_reason_tag[],'Keep the original note')->>'ok')::boolean,'GM may reject the pending Note update normally');
reset role;
select is((select count(*) from internal.embedding_jobs),(select embedding_jobs+1 from e8_baseline),'Rejected content enqueues no embedding');

set local role authenticated;
select is((public.review_loom_action((select id from e8_actions where block_index=2),1,'confirmed','e8120000-0000-4000-8000-000000000003')->>'state'),'accepted','Relationship add executes only after confirmation');
reset role;
select is((select count(*) from public.relationships where saga_id='e8030000-0000-4000-8000-000000000001' and kind='related-to'),1::bigint,'Relationship add reuses the scoped relationship path');
set local role authenticated;
select is((public.review_loom_action((select id from e8_actions where block_index=3),1,'confirmed','e8120000-0000-4000-8000-000000000004')->>'state'),'accepted','Relationship removal executes only after confirmation');
reset role;
select is((select count(*) from public.relationships where id='e8080000-0000-4000-8000-000000000001'),0::bigint,'Relationship removal deletes the exact reviewed edge');
select is((select count(*) from internal.embedding_jobs),(select embedding_jobs+1 from e8_baseline),'Relationship-only changes create no content embedding');

set local role authenticated;
select is((public.review_loom_action((select id from e8_actions where block_index=4),1,'confirmed','e8120000-0000-4000-8000-000000000005')->>'state'),'accepted','Thread state executes through the reviewed inline path');
reset role;
select ok((select resolution_state='resolved' and resolution_details='Mara resealed it from within.' from public.threads where id='e8060000-0000-4000-8000-000000000001'),'Thread state mutation persists the exact reviewed effect');
set local role authenticated;
select is((public.review_loom_action((select id from e8_actions where block_index=5),1,'confirmed','e8120000-0000-4000-8000-000000000006')->>'state'),'accepted','Thread objective executes through the reviewed inline path');
reset role;
select ok((select exists(select 1 from jsonb_array_elements(objectives_log) x where x->>'text'='Trace the erased western road.') from public.threads where id='e8060000-0000-4000-8000-000000000002'),'Objective mutation reuses the existing stable objective writer');
select is((select count(*) from public.canon_audit where saga_id='e8030000-0000-4000-8000-000000000001'),3::bigint,'One record approval and two Thread mutations produce exactly three canon audits');

select * from finish();
rollback;

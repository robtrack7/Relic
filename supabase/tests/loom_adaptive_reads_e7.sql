create extension if not exists pgtap with schema extensions;
begin;
select plan(21);

insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_app_meta_data,raw_user_meta_data,is_super_admin,confirmation_token,email_change,email_change_token_new,recovery_token)
values ('e7000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','e7@example.test',extensions.crypt('password',extensions.gen_salt('bf')),now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false,'','','','')
on conflict(id) do nothing;
insert into public.workspaces(id,owner_gm_id,name,usage_limits) values
('e7010000-0000-4000-8000-000000000001','e7000000-0000-4000-8000-000000000001','E7 Workspace','{"plan":"test","ai_credits_monthly":100,"transcription_seconds_monthly":3600,"storage_bytes":1000000,"worlds_active":5,"sagas_active":5,"entities_per_saga":100,"imports_monthly":10,"exports_monthly":10}')
on conflict(id) do nothing;
insert into public.worlds(id,workspace_id,owner_gm_id,name) values
('e7020000-0000-4000-8000-000000000001','e7010000-0000-4000-8000-000000000001','e7000000-0000-4000-8000-000000000001','E7 World')
on conflict(id) do nothing;
insert into public.sagas(id,workspace_id,world_id,owner_gm_id,name) values
('e7030000-0000-4000-8000-000000000001','e7010000-0000-4000-8000-000000000001','e7020000-0000-4000-8000-000000000001','e7000000-0000-4000-8000-000000000001','E7 Saga'),
('e7030000-0000-4000-8000-000000000002','e7010000-0000-4000-8000-000000000001','e7020000-0000-4000-8000-000000000001','e7000000-0000-4000-8000-000000000001','Sibling Saga')
on conflict(id) do nothing;
insert into public.characters(id,workspace_id,world_id,saga_id,scope,name,summary,narrative,canon_state) values
('e7040000-0000-4000-8000-000000000001','e7010000-0000-4000-8000-000000000001','e7020000-0000-4000-8000-000000000001','e7030000-0000-4000-8000-000000000001','saga','Mara','Gate captain','Mara guards the Iron Gate.','canon'),
('e7040000-0000-4000-8000-000000000002','e7010000-0000-4000-8000-000000000001','e7020000-0000-4000-8000-000000000001','e7030000-0000-4000-8000-000000000002','saga','Secret Vale','Sibling-only character','Must never cross the Saga boundary.','canon')
on conflict(id) do nothing;
insert into public.places(id,workspace_id,world_id,saga_id,scope,name,summary,narrative,canon_state) values
('e7050000-0000-4000-8000-000000000001','e7010000-0000-4000-8000-000000000001','e7020000-0000-4000-8000-000000000001','e7030000-0000-4000-8000-000000000001','saga','Iron Gate','Eastern passage','The Iron Gate protects the eastern road.','canon')
on conflict(id) do nothing;
insert into public.threads(id,workspace_id,world_id,saga_id,scope,name,summary,narrative,objective,objectives_log,canon_state) values
('e7060000-0000-4000-8000-000000000001','e7010000-0000-4000-8000-000000000001','e7020000-0000-4000-8000-000000000001','e7030000-0000-4000-8000-000000000001','saga','Broken Seal','Who opened the seal?','The seal was opened from within.','Find the opener','[{"id":"o1","text":"Find the opener","state":"open","order_index":0}]','canon')
on conflict(id) do nothing;
insert into public.sessions(id,workspace_id,world_id,saga_id,scope,name,session_number,status,objective) values
('e7070000-0000-4000-8000-000000000001','e7010000-0000-4000-8000-000000000001','e7020000-0000-4000-8000-000000000001','e7030000-0000-4000-8000-000000000001','saga','The First Watch',1,'ready','Reach the Iron Gate')
on conflict(id) do nothing;
insert into public.relationships(id,workspace_id,world_id,saga_id,scope,from_entity_type,from_entity_id,to_entity_type,to_entity_id,kind,canon_state) values
('e7080000-0000-4000-8000-000000000001','e7010000-0000-4000-8000-000000000001','e7020000-0000-4000-8000-000000000001','e7030000-0000-4000-8000-000000000001','saga','character','e7040000-0000-4000-8000-000000000001','place','e7050000-0000-4000-8000-000000000001','located-at','canon')
on conflict(id) do nothing;
insert into public.sources(id,workspace_id,world_id,saga_id,scope,kind,source_entity_type,source_entity_id,raw_excerpt) values
('e7090000-0000-4000-8000-000000000001','e7010000-0000-4000-8000-000000000001','e7020000-0000-4000-8000-000000000001','e7030000-0000-4000-8000-000000000001','saga','existing_entity','character','e7040000-0000-4000-8000-000000000001','Mara guards the Iron Gate.'),
('e7090000-0000-4000-8000-000000000002','e7010000-0000-4000-8000-000000000001','e7020000-0000-4000-8000-000000000001','e7030000-0000-4000-8000-000000000001','saga','existing_entity','place','e7050000-0000-4000-8000-000000000001','The Iron Gate protects the eastern road.'),
('e7090000-0000-4000-8000-000000000003','e7010000-0000-4000-8000-000000000001','e7020000-0000-4000-8000-000000000001','e7030000-0000-4000-8000-000000000001','saga','existing_entity','thread','e7060000-0000-4000-8000-000000000001','The seal was opened from within.'),
('e7090000-0000-4000-8000-000000000004','e7010000-0000-4000-8000-000000000001','e7020000-0000-4000-8000-000000000001','e7030000-0000-4000-8000-000000000001','saga','existing_entity','session','e7070000-0000-4000-8000-000000000001','Reach the Iron Gate during the first watch.')
on conflict(id) do nothing;

select is((select count(*) from internal.loom_action_contracts() where action_name in ('open_record','list_records','show_source','explain_provenance','navigate_surface','draft_entity')),6::bigint,'E7 six-action baseline remains registered after later expansion');
select is((select sum(ai_credits) from internal.loom_action_contracts() where authority_tier='read_navigation'),0::numeric,'Every read and navigation action is free');
select ok((public.plan_loom_retrieval_for_worker('e7010000-0000-4000-8000-000000000001','e7020000-0000-4000-8000-000000000001','e7030000-0000-4000-8000-000000000001','e7000000-0000-4000-8000-000000000001','list active threads')->>'strategy')='deterministic_read','Structured lists bypass the provider');
select is(public.plan_loom_retrieval_for_worker('e7010000-0000-4000-8000-000000000001','e7020000-0000-4000-8000-000000000001','e7030000-0000-4000-8000-000000000001','e7000000-0000-4000-8000-000000000001','open Broken Seal')->'action'->>'name','open_record','Exact opens produce a typed open action');
select is(public.plan_loom_retrieval_for_worker('e7010000-0000-4000-8000-000000000001','e7020000-0000-4000-8000-000000000001','e7030000-0000-4000-8000-000000000001','e7000000-0000-4000-8000-000000000001','What does Mara know about the eastern road?')->>'strategy','exact','Named questions use exact grounded evidence');
select is(jsonb_array_length(public.plan_loom_retrieval_for_worker('e7010000-0000-4000-8000-000000000001','e7020000-0000-4000-8000-000000000001','e7030000-0000-4000-8000-000000000001','e7000000-0000-4000-8000-000000000001','What does Mara know about the eastern road?')->'source_ids'),2,'Exact grounding includes direct and one-hop sources');
select is(public.plan_loom_retrieval_for_worker('e7010000-0000-4000-8000-000000000001','e7020000-0000-4000-8000-000000000001','e7030000-0000-4000-8000-000000000001','e7000000-0000-4000-8000-000000000001','How do Mara relationships affect the eastern road?')->>'strategy','structured','Named structural questions use source-backed structured grounding');
select is(public.plan_loom_retrieval_for_worker('e7010000-0000-4000-8000-000000000001','e7020000-0000-4000-8000-000000000001','e7030000-0000-4000-8000-000000000001','e7000000-0000-4000-8000-000000000001','find Iron Gate')->>'reason','literal_search_navigation','Explicit search opens literal search without retrieval');
select is(public.plan_loom_retrieval_for_worker('e7010000-0000-4000-8000-000000000001','e7020000-0000-4000-8000-000000000001','e7030000-0000-4000-8000-000000000001','e7000000-0000-4000-8000-000000000001','who waits?')->>'strategy','lexical','Short unknown questions prefer lexical retrieval');
select is(public.plan_loom_retrieval_for_worker('e7010000-0000-4000-8000-000000000001','e7020000-0000-4000-8000-000000000001','e7030000-0000-4000-8000-000000000001','e7000000-0000-4000-8000-000000000001','What forgotten bargain could reshape the political pressure around the eastern road?')->>'strategy','hybrid','Semantic recall is reserved for questions that need it');
select is(public.plan_loom_retrieval_for_worker('e7010000-0000-4000-8000-000000000001','e7020000-0000-4000-8000-000000000001','e7030000-0000-4000-8000-000000000001','e7000000-0000-4000-8000-000000000001','open Secret Vale')->>'reason','target_not_found','Exact resolution cannot leak a sibling Saga record');
select ok(not has_function_privilege('authenticated','public.plan_loom_retrieval_for_worker(uuid,uuid,uuid,uuid,text)','EXECUTE'),'Browser roles cannot call the server retrieval planner');
select ok(not has_function_privilege('authenticated','public.create_loom_deterministic_turn_for_worker(uuid,uuid,uuid,uuid,uuid,uuid,uuid,text)','EXECUTE'),'Browser roles cannot create deterministic worker turns');

create temp table e7_baseline as select
  (select count(*) from internal.ai_task_runs) ai_runs,
  (select count(*) from public.usage_events) usage_events,
  (select count(*) from internal.embedding_jobs) embedding_jobs,
  (select count(*) from public.canon_audit) canon_writes,
  (select count(*) from public.drafts) drafts;
select public.create_loom_deterministic_turn_for_worker(
  'e7010000-0000-4000-8000-000000000001','e7020000-0000-4000-8000-000000000001','e7030000-0000-4000-8000-000000000001','e7000000-0000-4000-8000-000000000001',null,
  'e7100000-0000-4000-8000-000000000001','e7110000-0000-4000-8000-000000000001','list active threads');
select ok((select status='complete' and retrieval_mode='deterministic_read' and ai_task_run_id is null from public.guide_turns where id='e7100000-0000-4000-8000-000000000001'),'Deterministic read completes without an AI run');
select ok((select state='accepted' and action_type='list_records' and result_snapshot->>'count'='1' from public.guide_action_intents where turn_id='e7100000-0000-4000-8000-000000000001'),'List result is frozen as an accepted read-only snapshot');
select ok((select b.ai_runs=(select count(*) from internal.ai_task_runs) and b.usage_events=(select count(*) from public.usage_events) and b.embedding_jobs=(select count(*) from internal.embedding_jobs) and b.canon_writes=(select count(*) from public.canon_audit) and b.drafts=(select count(*) from public.drafts) from e7_baseline b),'Direct reads create no model, quota, embedding, draft, or canon side effects');
select is((public.create_loom_deterministic_turn_for_worker('e7010000-0000-4000-8000-000000000001','e7020000-0000-4000-8000-000000000001','e7030000-0000-4000-8000-000000000001','e7000000-0000-4000-8000-000000000001',null,'e7100000-0000-4000-8000-000000000001','e7110000-0000-4000-8000-000000000001','list active threads')->>'replayed'),'true','Exact deterministic retry is idempotent');
select throws_ok($$select public.create_loom_deterministic_turn_for_worker('e7010000-0000-4000-8000-000000000001','e7020000-0000-4000-8000-000000000001','e7030000-0000-4000-8000-000000000001','e7000000-0000-4000-8000-000000000001',null,'e7100000-0000-4000-8000-000000000099','e7110000-0000-4000-8000-000000000001','list active threads')$$,'23505','Loom idempotency key was reused with different input','Changed deterministic input cannot reuse a receipt key');

select public.create_loom_deterministic_turn_for_worker('e7010000-0000-4000-8000-000000000001','e7020000-0000-4000-8000-000000000001','e7030000-0000-4000-8000-000000000001','e7000000-0000-4000-8000-000000000001',null,'e7100000-0000-4000-8000-000000000002','e7110000-0000-4000-8000-000000000002','open Broken Seal');
select ok((select jsonb_array_length(result_snapshot->'objectives')=1 and jsonb_array_length(result_snapshot->'relationships')<=8 from public.guide_action_intents where turn_id='e7100000-0000-4000-8000-000000000002'),'Thread reads expose objectives and cap relationships at one bounded hop');
select public.create_loom_deterministic_turn_for_worker('e7010000-0000-4000-8000-000000000001','e7020000-0000-4000-8000-000000000001','e7030000-0000-4000-8000-000000000001','e7000000-0000-4000-8000-000000000001',null,'e7100000-0000-4000-8000-000000000003','e7110000-0000-4000-8000-000000000003','open session 1');
select ok((select target_type='session' and result_snapshot->'session'->>'status'='ready' from public.guide_action_intents where turn_id='e7100000-0000-4000-8000-000000000003'),'Session reads carry the status needed for the correct client route');
select public.create_loom_deterministic_turn_for_worker('e7010000-0000-4000-8000-000000000001','e7020000-0000-4000-8000-000000000001','e7030000-0000-4000-8000-000000000001','e7000000-0000-4000-8000-000000000001',null,'e7100000-0000-4000-8000-000000000004','e7110000-0000-4000-8000-000000000004','explain provenance for Mara');
select ok((select action_type='explain_provenance' and result_snapshot?'source' and result_snapshot?'provenance_state' from public.guide_action_intents where turn_id='e7100000-0000-4000-8000-000000000004'),'Provenance reads expose only the bounded source and audit projection');

select * from finish();
rollback;

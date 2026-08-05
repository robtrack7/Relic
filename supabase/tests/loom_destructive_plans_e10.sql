create extension if not exists pgtap with schema extensions;
begin;
select plan(34);

insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_app_meta_data,raw_user_meta_data,is_super_admin,confirmation_token,email_change,email_change_token_new,recovery_token)
values
('ea000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','e10@example.test',extensions.crypt('password',extensions.gen_salt('bf')),now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false,'','','',''),
('ea000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','e10-other@example.test',extensions.crypt('password',extensions.gen_salt('bf')),now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false,'','','','')
on conflict(id) do nothing;
insert into public.workspaces(id,owner_gm_id,name,usage_limits) values
('ea010000-0000-4000-8000-000000000001','ea000000-0000-4000-8000-000000000001','E10 Workspace','{"plan":"test","ai_credits_monthly":100,"transcription_seconds_monthly":3600,"storage_bytes":1000000,"worlds_active":5,"sagas_active":5,"entities_per_saga":100,"imports_monthly":10,"exports_monthly":10}')
on conflict(id) do nothing;
insert into public.worlds(id,workspace_id,owner_gm_id,name) values
('ea020000-0000-4000-8000-000000000001','ea010000-0000-4000-8000-000000000001','ea000000-0000-4000-8000-000000000001','E10 World') on conflict(id) do nothing;
insert into public.sagas(id,workspace_id,world_id,owner_gm_id,name) values
('ea030000-0000-4000-8000-000000000001','ea010000-0000-4000-8000-000000000001','ea020000-0000-4000-8000-000000000001','ea000000-0000-4000-8000-000000000001','E10 Saga') on conflict(id) do nothing;
insert into public.characters(id,workspace_id,world_id,saga_id,scope,name,summary,canon_state,created_by) values
('ea040000-0000-4000-8000-000000000001','ea010000-0000-4000-8000-000000000001','ea020000-0000-4000-8000-000000000001','ea030000-0000-4000-8000-000000000001','saga','Mara Venn','Captain of the ember watch.','canon','gm'),
('ea040000-0000-4000-8000-000000000002','ea010000-0000-4000-8000-000000000001','ea020000-0000-4000-8000-000000000001',null,'world','World Mara','Shared setting record.','canon','gm');
insert into public.places(id,workspace_id,world_id,saga_id,scope,name,summary,canon_state,created_by) values
('ea041000-0000-4000-8000-000000000001','ea010000-0000-4000-8000-000000000001','ea020000-0000-4000-8000-000000000001','ea030000-0000-4000-8000-000000000001','saga','Old Gate','An archived eastern gate.','archived','gm');
insert into public.artifacts(id,workspace_id,world_id,saga_id,scope,name,summary,canon_state,created_by) values
('ea042000-0000-4000-8000-000000000001','ea010000-0000-4000-8000-000000000001','ea020000-0000-4000-8000-000000000001','ea030000-0000-4000-8000-000000000001','saga','Stale Idol','A brittle ward.','canon','gm');
insert into public.sources(id,workspace_id,world_id,saga_id,scope,kind,source_entity_type,source_entity_id,raw_excerpt) values
('ea050000-0000-4000-8000-000000000001','ea010000-0000-4000-8000-000000000001','ea020000-0000-4000-8000-000000000001','ea030000-0000-4000-8000-000000000001','saga','existing_entity','character','ea040000-0000-4000-8000-000000000001','Mara guards the eastern road.'),
('ea050000-0000-4000-8000-000000000002','ea010000-0000-4000-8000-000000000001','ea020000-0000-4000-8000-000000000001','ea030000-0000-4000-8000-000000000001','saga','existing_entity','artifact','ea042000-0000-4000-8000-000000000001','The idol seals a forgotten vault.'),
('ea050000-0000-4000-8000-000000000003','ea010000-0000-4000-8000-000000000001','ea020000-0000-4000-8000-000000000001',null,'world','existing_entity','character','ea040000-0000-4000-8000-000000000002','World-only evidence.');

select is((select count(*) from internal.loom_action_contracts()),19::bigint,'E10 expands the active Loom registry to nineteen actions');
select is((select count(*) from internal.loom_action_contracts() where action_name in ('archive_record','restore_record','prepare_hard_delete')),3::bigint,'All three E10 lifecycle contracts are active');
select is((select prompt_version from internal.ai_task_contracts() where task_name='answer_saga_question'),'answer_saga_question@1.6.0','E10 versions the conversational plan schema');
select ok(not internal.loom_provider_action_manifest()::text~*'(hard_delete_entity|handler|rpc|function_name)','Provider manifest exposes no delete executor or handler internals');
select is((internal.plan_loom_retrieval('ea010000-0000-4000-8000-000000000001','ea020000-0000-4000-8000-000000000001','ea030000-0000-4000-8000-000000000001','ea000000-0000-4000-8000-000000000001','Archive character Mara Venn')->>'provider_required')::boolean,false,'Exact archive bypasses provider work');
select is(internal.plan_loom_retrieval('ea010000-0000-4000-8000-000000000001','ea020000-0000-4000-8000-000000000001','ea030000-0000-4000-8000-000000000001','ea000000-0000-4000-8000-000000000001','Archive character World Mara')->>'reason','lifecycle_target_unavailable','World-canon lifecycle targets fail closed');

set local role service_role;
select public.create_loom_deterministic_turn_for_worker(
  'ea010000-0000-4000-8000-000000000001','ea020000-0000-4000-8000-000000000001','ea030000-0000-4000-8000-000000000001','ea000000-0000-4000-8000-000000000001',null,
  'ea100000-0000-4000-8000-000000000001','ea110000-0000-4000-8000-000000000001','Archive character Mara Venn');
reset role;
create temp table e10_actions(label text primary key,action_id uuid);
insert into e10_actions select 'archive',id from public.guide_action_intents where turn_id='ea100000-0000-4000-8000-000000000001';
grant select on e10_actions to authenticated;
select ok((select state='pending' and authority_tier='archive_restore' and cost_snapshot->>'ai_credits'='0' from public.guide_action_intents where id=(select action_id from e10_actions where label='archive')),'Exact archive freezes a free explicit action instead of auto-accepting');
select is((select count(*) from internal.ai_task_runs where guide_turn_id='ea100000-0000-4000-8000-000000000001'),0::bigint,'Exact archive creates no answer task');
set local role authenticated;
select set_config('request.jwt.claim.sub','ea000000-0000-4000-8000-000000000002',true);
select set_config('request.jwt.claim.role','authenticated',true);
select throws_ok($$select public.review_loom_action((select action_id from e10_actions where label='archive'),1,'confirmed','ea120000-0000-4000-8000-000000000099')$$,'42501','Loom action is unavailable','A different GM cannot confirm archive');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','ea000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claim.role','authenticated',true);
select is((public.review_loom_action((select action_id from e10_actions where label='archive'),1,'confirmed','ea120000-0000-4000-8000-000000000001')->>'state'),'accepted','Owner confirmation archives through the protected writer');
select is((public.review_loom_action((select action_id from e10_actions where label='archive'),1,'confirmed','ea120000-0000-4000-8000-000000000001')->>'replayed'),'true','Exact archive confirmation replays one receipt');
reset role;
select is((select canon_state::text from public.characters where id='ea040000-0000-4000-8000-000000000001'),'archived','Archive changes only the exact Saga record lifecycle');
select is((select count(*) from public.canon_audit where entity_id='ea040000-0000-4000-8000-000000000001' and from_state='canon' and to_state='archived'),1::bigint,'Archive writes one existing canon audit effect');

set local role service_role;
select public.create_loom_deterministic_turn_for_worker(
  'ea010000-0000-4000-8000-000000000001','ea020000-0000-4000-8000-000000000001','ea030000-0000-4000-8000-000000000001','ea000000-0000-4000-8000-000000000001',null,
  'ea100000-0000-4000-8000-000000000002','ea110000-0000-4000-8000-000000000002','Restore character Mara Venn');
reset role;
insert into e10_actions select 'restore',id from public.guide_action_intents where turn_id='ea100000-0000-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claim.sub','ea000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claim.role','authenticated',true);
select is((public.review_loom_action((select action_id from e10_actions where label='restore'),1,'confirmed','ea120000-0000-4000-8000-000000000002')->>'state'),'accepted','Owner confirmation restores through the protected writer');
reset role;
select is((select canon_state::text from public.characters where id='ea040000-0000-4000-8000-000000000001'),'canon','Restore returns the exact Saga record to canon');

set local role service_role;
select public.create_loom_deterministic_turn_for_worker(
  'ea010000-0000-4000-8000-000000000001','ea020000-0000-4000-8000-000000000001','ea030000-0000-4000-8000-000000000001','ea000000-0000-4000-8000-000000000001',null,
  'ea100000-0000-4000-8000-000000000003','ea110000-0000-4000-8000-000000000003','Prepare permanent delete panel for place Old Gate');
reset role;
insert into e10_actions select 'delete-prep',id from public.guide_action_intents where turn_id='ea100000-0000-4000-8000-000000000003';
create temp table e10_before_delete_prep as select (select count(*) from public.places where id='ea041000-0000-4000-8000-000000000001') records,
  (select count(*) from public.canon_audit where entity_id='ea041000-0000-4000-8000-000000000001') audits;
set local role authenticated;
select set_config('request.jwt.claim.sub','ea000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claim.role','authenticated',true);
select is((public.review_loom_action((select action_id from e10_actions where label='delete-prep'),1,'confirmed','ea120000-0000-4000-8000-000000000003')->>'prepared'),'true','Hard-delete preparation confirms only the owning UI handoff');
reset role;
select is((select count(*) from public.places where id='ea041000-0000-4000-8000-000000000001'),(select records from e10_before_delete_prep),'Hard-delete preparation deletes no record');
select is((select count(*) from public.canon_audit where entity_id='ea041000-0000-4000-8000-000000000001'),(select audits from e10_before_delete_prep),'Hard-delete preparation writes no canon audit');
select throws_ok($$select internal.materialize_loom_action_intent('ea100000-0000-4000-8000-000000000003',3,'{"name":"prepare_hard_delete","version":"1.0.0","arguments":{"record_type":"place","record_id":"ea041000-0000-4000-8000-000000000001","confirmation_name":"Old Gate"}}','Forged delete input.')$$,'22023','Lifecycle arguments are invalid','Delete name and raw executor arguments cannot enter a Loom intent');

set local role service_role;
select public.create_loom_deterministic_turn_for_worker(
  'ea010000-0000-4000-8000-000000000001','ea020000-0000-4000-8000-000000000001','ea030000-0000-4000-8000-000000000001','ea000000-0000-4000-8000-000000000001',null,
  'ea100000-0000-4000-8000-000000000004','ea110000-0000-4000-8000-000000000004','Archive artifact Stale Idol');
reset role;
insert into e10_actions select 'stale',id from public.guide_action_intents where turn_id='ea100000-0000-4000-8000-000000000004';
update public.artifacts set summary='Changed after preview.',updated_at=clock_timestamp() where id='ea042000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub','ea000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claim.role','authenticated',true);
select is((public.review_loom_action((select action_id from e10_actions where label='stale'),1,'confirmed','ea120000-0000-4000-8000-000000000004')->>'state'),'conflict','Changed lifecycle target stops before archive');
reset role;
select is((select canon_state::text from public.artifacts where id='ea042000-0000-4000-8000-000000000001'),'canon','Stale lifecycle conflict has zero record effect');

select public.create_guide_turn_for_worker(
  'ea010000-0000-4000-8000-000000000001','ea020000-0000-4000-8000-000000000001','ea030000-0000-4000-8000-000000000001','ea000000-0000-4000-8000-000000000001',
  null,'ea100000-0000-4000-8000-000000000010','ea110000-0000-4000-8000-000000000010','Create a bounded plan.','lexical_fallback',array['ea050000-0000-4000-8000-000000000001']::uuid[]);
select public.complete_guide_turn_for_worker((select ai_task_run_id from public.guide_turns where id='ea100000-0000-4000-8000-000000000010'),
  '{"no_answer":false,"blocks":[{"type":"grounded_answer","text":"Mara guards the eastern road.","citations":[{"source_id":"ea050000-0000-4000-8000-000000000001"}]},{"type":"action_preview","action":{"name":"propose_record_create","version":"1.0.0","arguments":{"entity_type":"character","payload":{"name":"Ashen Cartographer"},"source_ids":["ea050000-0000-4000-8000-000000000001"]}},"explanation":"Prepare one pending proposal.","plan":{"step":1,"depends_on":[]}},{"type":"action_preview","action":{"name":"create_session","version":"1.0.0","arguments":{"name":"Roads Remembered"}},"explanation":"Create one planned Session.","plan":{"step":2,"depends_on":[1]}}],"confidence_reason":"single_clear_segment"}');
select is((select count(*) from public.guide_action_intents where turn_id='ea100000-0000-4000-8000-000000000010'),2::bigint,'A valid two-step plan materializes exactly two intents');
select ok((select plan_step=1 and plan_size=2 and availability_state='available' from public.guide_action_intents where turn_id='ea100000-0000-4000-8000-000000000010' and plan_step=1),'The first plan step is available with frozen plan size');
select ok((select plan_depends_on=array[1]::smallint[] and availability_state='unavailable' and failure_category='plan_waiting' from public.guide_action_intents where turn_id='ea100000-0000-4000-8000-000000000010' and plan_step=2),'The dependent step is explicit and initially unavailable');
insert into e10_actions select 'plan-1',id from public.guide_action_intents where turn_id='ea100000-0000-4000-8000-000000000010' and plan_step=1;
insert into e10_actions select 'plan-2',id from public.guide_action_intents where turn_id='ea100000-0000-4000-8000-000000000010' and plan_step=2;
set local role authenticated;
select set_config('request.jwt.claim.sub','ea000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claim.role','authenticated',true);
select throws_ok($$select public.review_loom_action((select action_id from e10_actions where label='plan-2'),1,'confirmed','ea120000-0000-4000-8000-000000000012')$$,'23514','Loom plan step is not available','A later plan step cannot execute early');
select is((public.review_loom_action((select action_id from e10_actions where label='plan-1'),1,'confirmed','ea120000-0000-4000-8000-000000000010')->>'state'),'accepted','First plan step confirms independently');
select is((public.review_loom_action((select action_id from e10_actions where label='plan-2'),1,'confirmed','ea120000-0000-4000-8000-000000000011')->>'state'),'accepted','Accepted first receipt unlocks exactly the next plan step');
reset role;
select is((select count(*) from public.sessions where saga_id='ea030000-0000-4000-8000-000000000001' and name='Roads Remembered'),1::bigint,'Successful bounded plan creates one planned Session through its existing writer');

select public.create_guide_turn_for_worker(
  'ea010000-0000-4000-8000-000000000001','ea020000-0000-4000-8000-000000000001','ea030000-0000-4000-8000-000000000001','ea000000-0000-4000-8000-000000000001',
  null,'ea100000-0000-4000-8000-000000000020','ea110000-0000-4000-8000-000000000020','Stop a bounded plan.','lexical_fallback',array['ea050000-0000-4000-8000-000000000001']::uuid[]);
select public.complete_guide_turn_for_worker((select ai_task_run_id from public.guide_turns where id='ea100000-0000-4000-8000-000000000020'),
  '{"no_answer":false,"blocks":[{"type":"creative_proposal","text":"Two reviewed steps could organize the next session."},{"type":"action_preview","action":{"name":"create_session","version":"1.0.0","arguments":{"name":"Stopped First"}},"explanation":"Create the first Session.","plan":{"step":1,"depends_on":[]}},{"type":"action_preview","action":{"name":"create_session","version":"1.0.0","arguments":{"name":"Must Not Run"}},"explanation":"Create the second Session.","plan":{"step":2,"depends_on":[1]}}],"confidence_reason":"direct_gm_input"}');
insert into e10_actions select 'stop-1',id from public.guide_action_intents where turn_id='ea100000-0000-4000-8000-000000000020' and plan_step=1;
insert into e10_actions select 'stop-2',id from public.guide_action_intents where turn_id='ea100000-0000-4000-8000-000000000020' and plan_step=2;
set local role authenticated;
select set_config('request.jwt.claim.sub','ea000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claim.role','authenticated',true);
select is((public.review_loom_action((select action_id from e10_actions where label='stop-1'),1,'dismissed','ea120000-0000-4000-8000-000000000020')->>'state'),'dismissed','Dismissing one step is explicit and side-effect free');
select throws_ok($$select public.review_loom_action((select action_id from e10_actions where label='stop-2'),1,'confirmed','ea120000-0000-4000-8000-000000000021')$$,'23514','Loom plan step is not available','Dismissal stops every later step');
reset role;
select is((select failure_category from public.guide_action_intents where id=(select action_id from e10_actions where label='stop-2')),'plan_stopped','Stopped plan state persists on the later intent');
select is((select count(*) from public.sessions where saga_id='ea030000-0000-4000-8000-000000000001' and name in ('Stopped First','Must Not Run')),0::bigint,'Stopped plan creates no Session from either dismissed or blocked step');

select is((select count(*) from public.usage_events where workspace_id='ea010000-0000-4000-8000-000000000001'),0::bigint,'Lifecycle review and plan confirmation add zero provider charges');
select is((select count(*) from internal.embedding_jobs where workspace_id='ea010000-0000-4000-8000-000000000001' and source_kind='query'),0::bigint,'Exact E10 lifecycle commands create no query embeddings');

select * from finish();
rollback;

create extension if not exists pgtap with schema extensions;
begin;
select plan(21);

insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_app_meta_data,raw_user_meta_data,is_super_admin,confirmation_token,email_change,email_change_token_new,recovery_token)
values
('e6000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','loom@example.test',extensions.crypt('password',extensions.gen_salt('bf')),now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false,'','','',''),
('e6000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','loom-other@example.test',extensions.crypt('password',extensions.gen_salt('bf')),now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false,'','','','')
on conflict(id) do nothing;
insert into public.workspaces(id,owner_gm_id,name,usage_limits) values
('e6010000-0000-0000-0000-000000000001','e6000000-0000-0000-0000-000000000001','Loom Workspace','{"plan":"test","ai_credits_monthly":100,"transcription_seconds_monthly":3600,"storage_bytes":1000000,"worlds_active":5,"sagas_active":5,"entities_per_saga":100,"imports_monthly":10,"exports_monthly":10}')
on conflict(id) do nothing;
insert into public.worlds(id,workspace_id,owner_gm_id,name) values
('e6020000-0000-0000-0000-000000000001','e6010000-0000-0000-0000-000000000001','e6000000-0000-0000-0000-000000000001','Loom World')
on conflict(id) do nothing;
insert into public.sagas(id,workspace_id,world_id,owner_gm_id,name) values
('e6030000-0000-0000-0000-000000000001','e6010000-0000-0000-0000-000000000001','e6020000-0000-0000-0000-000000000001','e6000000-0000-0000-0000-000000000001','Loom Saga')
on conflict(id) do nothing;
insert into public.characters(id,workspace_id,world_id,saga_id,scope,name,summary,narrative,canon_state) values
('e6040000-0000-0000-0000-000000000001','e6010000-0000-0000-0000-000000000001','e6020000-0000-0000-0000-000000000001','e6030000-0000-0000-0000-000000000001','saga','Mara','Gate captain','Mara guards the Iron Gate.','canon')
on conflict(id) do nothing;
insert into public.sources(id,workspace_id,world_id,saga_id,scope,kind,source_entity_type,source_entity_id,raw_excerpt) values
('e6060000-0000-0000-0000-000000000001','e6010000-0000-0000-0000-000000000001','e6020000-0000-0000-0000-000000000001','e6030000-0000-0000-0000-000000000001','saga','existing_entity','character','e6040000-0000-0000-0000-000000000001','Mara guards the Iron Gate.')
on conflict(id) do nothing;

select is((select count(*) from internal.loom_action_contracts() where action_name in ('open_record','draft_entity')),2::bigint,'E6 action contracts remain registered after later packets');
select is((select ai_credits from internal.loom_action_contracts() where action_name='open_record'),0::numeric,'Navigation is free');
select is((select ai_credits from internal.loom_action_contracts() where action_name='draft_entity'),3::numeric,'Entity drafting has the registered three-credit cost');
select ok(not internal.loom_provider_action_manifest()::text ~* '(handler|rpc|function_name)','Provider manifest excludes execution internals');

select public.create_guide_turn_for_worker(
  'e6010000-0000-0000-0000-000000000001','e6020000-0000-0000-0000-000000000001','e6030000-0000-0000-0000-000000000001','e6000000-0000-0000-0000-000000000001',
  null,'e6100000-0000-0000-0000-000000000001','e6110000-0000-0000-0000-000000000001','Open Mara and draft a companion.','lexical_fallback',array['e6060000-0000-0000-0000-000000000001']::uuid[]);
select lives_ok(format($f$select public.complete_guide_turn_for_worker(%L,
  '{"no_answer":false,"blocks":[{"type":"grounded_answer","text":"Mara guards the gate.","citations":[{"source_id":"e6060000-0000-0000-0000-000000000001"}]},{"type":"action_preview","action":{"name":"open_record","version":"1.0.0","arguments":{"source_id":"e6060000-0000-0000-0000-000000000001"}},"explanation":"Open Mara."},{"type":"action_preview","action":{"name":"draft_entity","version":"1.0.0","arguments":{"entity_type":"character","intent":"Draft Mara''s non-canon companion."}},"explanation":"Draft a companion."}],"confidence_reason":"single_clear_segment"}')$f$,
  (select ai_task_run_id from public.guide_turns where id='e6100000-0000-0000-0000-000000000001')),'Worker materializes only validated registry-backed intents');
select is((select count(*) from public.guide_action_intents where turn_id='e6100000-0000-0000-0000-000000000001'),2::bigint,'Both action previews become frozen intents');
select is((select count(*) from public.drafts where saga_id='e6030000-0000-0000-0000-000000000001'),0::bigint,'Preview materialization creates no draft');
select is((select count(*) from public.canon_audit where saga_id='e6030000-0000-0000-0000-000000000001'),0::bigint,'Preview materialization creates no canon write');
select ok((select target_id='e6040000-0000-0000-0000-000000000001' and confirmation_policy='none' and authority_tier='read_navigation' from public.guide_action_intents where action_type='open_record' and turn_id='e6100000-0000-0000-0000-000000000001'),'Open-record intent freezes a current supported target');
select ok((select (select count(*) from jsonb_object_keys(evidence_versions))=1 and confirmation_policy='explicit' and cost_snapshot->>'ai_credits'='3' from public.guide_action_intents where action_type='draft_entity' and turn_id='e6100000-0000-0000-0000-000000000001'),'Draft intent freezes evidence, confirmation, and price');
create temp table e6_action_ids(turn_id uuid primary key,action_id uuid not null);
insert into e6_action_ids select turn_id,id from public.guide_action_intents where action_type='draft_entity' and turn_id='e6100000-0000-0000-0000-000000000001';
grant select on e6_action_ids to authenticated;

set local role authenticated;
select set_config('request.jwt.claim.sub','e6000000-0000-0000-0000-000000000001',true);
select set_config('request.jwt.claim.role','authenticated',true);
select is(jsonb_array_length(public.get_loom_action_availability('e6010000-0000-0000-0000-000000000001','e6020000-0000-0000-0000-000000000001','e6030000-0000-0000-0000-000000000001')),6,'Owner sees safe action availability metadata');
select is((public.review_loom_action((select action_id from e6_action_ids where turn_id='e6100000-0000-0000-0000-000000000001'),1,'confirmed','e6120000-0000-0000-0000-000000000001')->>'state'),'processing','Explicit current-version confirmation dispatches the registered draft task');
select is((public.review_loom_action((select action_id from e6_action_ids where turn_id='e6100000-0000-0000-0000-000000000001'),1,'confirmed','e6120000-0000-0000-0000-000000000001')->>'replayed'),'true','Exact retry returns the private receipt');
select throws_ok($$select public.review_loom_action((select action_id from e6_action_ids where turn_id='e6100000-0000-0000-0000-000000000001'),1,'dismissed','e6120000-0000-0000-0000-000000000001')$$,'23505','Loom action idempotency key was reused with different input','Changed input cannot reuse a receipt key');
reset role;
select is((select count(*) from internal.ai_task_runs where saga_id='e6030000-0000-0000-0000-000000000001' and task_name='draft_entity_from_prompt' and input_payload->>'loom_action_id' is not null and cardinality(allowed_source_ids)=1 and jsonb_array_length(public.get_guide_evidence_for_worker(id))=1),1::bigint,'Confirmation creates one separately metered run linked to its frozen Loom evidence');
insert into internal.ai_task_runs(
  id,workspace_id,world_id,saga_id,gm_id,task_name,prompt_version,quota_tier,ai_credits,
  model_tier,retrieval_profile,source_policy,output_mode,input_payload,allowed_source_ids,allowed_source_versions
)
select 'e6200000-0000-4000-8000-000000000001','e6010000-0000-0000-0000-000000000001','e6020000-0000-0000-0000-000000000001',
  'e6030000-0000-0000-0000-000000000001','e6000000-0000-0000-0000-000000000001',
  c.task_name,c.prompt_version,c.quota_tier,c.ai_credits,c.model_tier,c.retrieval_profile,c.source_policy,c.output_mode,
  jsonb_build_object('question','Forged linkage','loom_action_id',(select action_id from e6_action_ids where turn_id='e6100000-0000-0000-0000-000000000001')),
  '{}'::uuid[],'{}'::jsonb
from internal.ai_task_contracts() c where c.task_name='answer_saga_question';
select is(jsonb_array_length(public.get_guide_evidence_for_worker('e6200000-0000-4000-8000-000000000001')),0,'A run cannot borrow Loom evidence by forging an action ID in its input');

select public.create_guide_turn_for_worker(
  'e6010000-0000-0000-0000-000000000001','e6020000-0000-0000-0000-000000000001','e6030000-0000-0000-0000-000000000001','e6000000-0000-0000-0000-000000000001',
  (select thread_id from public.guide_turns where id='e6100000-0000-0000-0000-000000000001'),'e6100000-0000-0000-0000-000000000002','e6110000-0000-0000-0000-000000000002','Draft another companion.','lexical_fallback',array['e6060000-0000-0000-0000-000000000001']::uuid[]);
select public.complete_guide_turn_for_worker(
  (select ai_task_run_id from public.guide_turns where id='e6100000-0000-0000-0000-000000000002'),
  '{"no_answer":false,"blocks":[{"type":"creative_proposal","text":"A companion could help."},{"type":"action_preview","action":{"name":"draft_entity","version":"1.0.0","arguments":{"entity_type":"character","intent":"Draft another non-canon companion."}},"explanation":"Draft another companion."}],"confidence_reason":"tonal_or_genre_match"}');
insert into e6_action_ids select turn_id,id from public.guide_action_intents where turn_id='e6100000-0000-0000-0000-000000000002';
update public.characters set narrative='Mara now guards the gate with a new oath.',updated_at=clock_timestamp() where id='e6040000-0000-0000-0000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub','e6000000-0000-0000-0000-000000000001',true);
select set_config('request.jwt.claim.role','authenticated',true);
select is((public.review_loom_action((select action_id from e6_action_ids where turn_id='e6100000-0000-0000-0000-000000000002'),1,'confirmed','e6120000-0000-0000-0000-000000000002')->>'category'),'stale_evidence','Changed evidence fails closed before dispatch');
reset role;
select is((select count(*) from internal.ai_task_runs where saga_id='e6030000-0000-0000-0000-000000000001' and task_name='draft_entity_from_prompt' and input_payload->>'loom_action_id' is not null),1::bigint,'Stale review creates zero downstream effects');
select is((select status from internal.loom_action_receipts where idempotency_key='e6120000-0000-0000-0000-000000000002'),'conflict','Stale failure leaves a private conflict receipt');
set local role authenticated;
select set_config('request.jwt.claim.sub','e6000000-0000-0000-0000-000000000001',true);
select set_config('request.jwt.claim.role','authenticated',true);
select is((public.review_loom_action((select action_id from e6_action_ids where turn_id='e6100000-0000-0000-0000-000000000002'),2,'dismissed','e6120000-0000-0000-0000-000000000003')->>'state'),'dismissed','GM may dismiss a conflicted preview without dispatching work');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','e6000000-0000-0000-0000-000000000002',true);
select set_config('request.jwt.claim.role','authenticated',true);
select throws_ok($$select public.get_loom_action_availability('e6010000-0000-0000-0000-000000000001','e6020000-0000-0000-0000-000000000001','e6030000-0000-0000-0000-000000000001')$$,'42501','saga context is not available','Non-owner cannot inspect action availability');
reset role;

select * from finish();
rollback;

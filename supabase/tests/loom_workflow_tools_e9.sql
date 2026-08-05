create extension if not exists pgtap with schema extensions;
begin;
select plan(35);

insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_app_meta_data,raw_user_meta_data,is_super_admin,confirmation_token,email_change,email_change_token_new,recovery_token)
values
('e9000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','e9@example.test',extensions.crypt('password',extensions.gen_salt('bf')),now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false,'','','',''),
('e9000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','e9-other@example.test',extensions.crypt('password',extensions.gen_salt('bf')),now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false,'','','','')
on conflict(id) do nothing;
insert into public.workspaces(id,owner_gm_id,name,usage_limits) values
('e9010000-0000-4000-8000-000000000001','e9000000-0000-4000-8000-000000000001','E9 Workspace','{"plan":"test","ai_credits_monthly":100,"transcription_seconds_monthly":3600,"storage_bytes":1000000,"worlds_active":5,"sagas_active":5,"entities_per_saga":100,"imports_monthly":10,"exports_monthly":10}')
on conflict(id) do nothing;
insert into public.worlds(id,workspace_id,owner_gm_id,name) values
('e9020000-0000-4000-8000-000000000001','e9010000-0000-4000-8000-000000000001','e9000000-0000-4000-8000-000000000001','E9 World') on conflict(id) do nothing;
insert into public.sagas(id,workspace_id,world_id,owner_gm_id,name) values
('e9030000-0000-4000-8000-000000000001','e9010000-0000-4000-8000-000000000001','e9020000-0000-4000-8000-000000000001','e9000000-0000-4000-8000-000000000001','E9 Saga') on conflict(id) do nothing;
insert into public.characters(id,workspace_id,world_id,saga_id,scope,name,summary,canon_state,created_by) values
('e9040000-0000-4000-8000-000000000001','e9010000-0000-4000-8000-000000000001','e9020000-0000-4000-8000-000000000001','e9030000-0000-4000-8000-000000000001','saga','Mara Venn','Captain of the ember watch.','canon','gm');
insert into public.sources(id,workspace_id,world_id,saga_id,scope,kind,source_entity_type,source_entity_id,raw_excerpt) values
('e9050000-0000-4000-8000-000000000001','e9010000-0000-4000-8000-000000000001','e9020000-0000-4000-8000-000000000001','e9030000-0000-4000-8000-000000000001','saga','existing_entity','character','e9040000-0000-4000-8000-000000000001','Mara guards the eastern road.');

select is((select count(*) from internal.loom_action_contracts()),19::bigint,'All E9 workflow contracts remain active after E10 expands the registry');
select is((select count(*) from internal.loom_action_contracts() where action_name in ('create_session','open_session_workflow','start_prep_task','retry_session_transcription')),4::bigint,'All four E9 workflow contracts are active');
select is((select prompt_version from internal.ai_task_contracts() where task_name='answer_saga_question'),'answer_saga_question@1.6.0','E9 workflow actions remain in the current conversational action manifest');
select ok(not internal.loom_provider_action_manifest()::text~*'(handler|rpc|function_name)','Workflow manifest exposes no executor internals');
select has_function('public','get_guide_turn_replay_for_worker',array['uuid','uuid','uuid'],'Guide replay uses a narrow worker RPC');
select has_function('public','resolve_guide_source_ids_for_worker',array['uuid','uuid','uuid','jsonb'],'Guide source resolution uses a narrow worker RPC');
select is((internal.plan_loom_retrieval('e9010000-0000-4000-8000-000000000001','e9020000-0000-4000-8000-000000000001','e9030000-0000-4000-8000-000000000001','e9000000-0000-4000-8000-000000000001','Create a new session called Ember Descent')->>'provider_required')::boolean,false,'Exact Session creation bypasses provider work');
select throws_ok($$select internal.plan_loom_retrieval('e9010000-0000-4000-8000-000000000001','e9020000-0000-4000-8000-000000000001','e9030000-0000-4000-8000-000000000001','e9000000-0000-4000-8000-000000000002','Create a session called Leak')$$,'42501','Loom Saga is not available','Workflow planning denies a different GM before target resolution');

set local role service_role;
select public.create_loom_deterministic_turn_for_worker(
  'e9010000-0000-4000-8000-000000000001','e9020000-0000-4000-8000-000000000001','e9030000-0000-4000-8000-000000000001','e9000000-0000-4000-8000-000000000001',null,
  'e9100000-0000-4000-8000-000000000001','e9110000-0000-4000-8000-000000000001','Create a new session called Ember Descent');
reset role;
select is((select state from public.guide_action_intents where turn_id='e9100000-0000-4000-8000-000000000001'),'pending','A confirmable deterministic action is not auto-accepted');
select is((select cost_snapshot->>'ai_credits' from public.guide_action_intents where turn_id='e9100000-0000-4000-8000-000000000001'),'0','Session creation discloses zero AI credits');
select is((select count(*) from internal.ai_task_runs where guide_turn_id='e9100000-0000-4000-8000-000000000001'),0::bigint,'Exact Session creation creates no AI task run');
set local role service_role;
select is((public.get_guide_turn_replay_for_worker('e9000000-0000-4000-8000-000000000001','e9030000-0000-4000-8000-000000000001','e9110000-0000-4000-8000-000000000001')->>'id'),'e9100000-0000-4000-8000-000000000001','Worker replay returns the exact scoped Guide turn');
select is((public.resolve_guide_source_ids_for_worker(
  'e9010000-0000-4000-8000-000000000001','e9020000-0000-4000-8000-000000000001','e9030000-0000-4000-8000-000000000001',
  '[{"source_entity_type":"character","source_entity_id":"e9040000-0000-4000-8000-000000000001"}]'::jsonb)->>0),'e9050000-0000-4000-8000-000000000001','Worker source resolution returns only the scoped canon source');
reset role;

create temp table e9_actions(label text primary key,action_id uuid,receipt_id uuid,request_id uuid,session_id uuid,prep_version timestamptz,run_id uuid);
insert into e9_actions(label,action_id) select 'create',id from public.guide_action_intents where turn_id='e9100000-0000-4000-8000-000000000001';
grant select,update on e9_actions to authenticated;
grant select,update on e9_actions to service_role;
set local role authenticated;
select set_config('request.jwt.claim.sub','e9000000-0000-4000-8000-000000000002',true);
select set_config('request.jwt.claim.role','authenticated',true);
select throws_ok($$select public.review_loom_action((select action_id from e9_actions where label='create'),1,'confirmed','e9120000-0000-4000-8000-000000000099')$$,'42501','Loom action is unavailable','A different GM cannot confirm the workflow action');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','e9000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claim.role','authenticated',true);
select is((public.review_loom_action((select action_id from e9_actions where label='create'),1,'confirmed','e9120000-0000-4000-8000-000000000001')->>'state'),'accepted','Owner confirmation creates the planned Session');
select is((public.review_loom_action((select action_id from e9_actions where label='create'),1,'confirmed','e9120000-0000-4000-8000-000000000001')->>'replayed'),'true','Exact Session creation review replays its receipt');
reset role;
select is((select count(*) from public.sessions where saga_id='e9030000-0000-4000-8000-000000000001' and name='Ember Descent'),1::bigint,'Session creation replay cannot duplicate the Session');
select is((select status from public.sessions where saga_id='e9030000-0000-4000-8000-000000000001' and name='Ember Descent'),'planned'::public.session_status,'Loom creates only planned Sessions');

set local role service_role;
select public.create_loom_deterministic_turn_for_worker(
  'e9010000-0000-4000-8000-000000000001','e9020000-0000-4000-8000-000000000001','e9030000-0000-4000-8000-000000000001','e9000000-0000-4000-8000-000000000001',null,
  'e9100000-0000-4000-8000-000000000002','e9110000-0000-4000-8000-000000000002','Open prep for Session 1');
reset role;
select ok((select state='accepted' and result_snapshot->>'destination'='prep' from public.guide_action_intents where turn_id='e9100000-0000-4000-8000-000000000002'),'Lifecycle-aware Session navigation is accepted, free, and points to Prep');

set local role service_role;
select public.create_loom_deterministic_turn_for_worker(
  'e9010000-0000-4000-8000-000000000001','e9020000-0000-4000-8000-000000000001','e9030000-0000-4000-8000-000000000001','e9000000-0000-4000-8000-000000000001',null,
  'e9100000-0000-4000-8000-000000000003','e9110000-0000-4000-8000-000000000003','Generate full prep for Session 1');
reset role;
insert into e9_actions(label,action_id) select 'prep',id from public.guide_action_intents where turn_id='e9100000-0000-4000-8000-000000000003';
select ok((select state='pending' and cost_snapshot->>'ai_credits'='10' and cost_snapshot->>'task_name'='generate_session_prep' from public.guide_action_intents where turn_id='e9100000-0000-4000-8000-000000000003'),'Prep action freezes the exact ten-credit registered task before confirmation');
select is((select count(*) from internal.ai_task_runs where guide_turn_id in ('e9100000-0000-4000-8000-000000000002','e9100000-0000-4000-8000-000000000003')),0::bigint,'Workflow navigation and Prep preview create no answer task');
set local role authenticated;
select set_config('request.jwt.claim.sub','e9000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claim.role','authenticated',true);
update e9_actions set receipt_id=(public.review_loom_action(action_id,1,'confirmed','e9120000-0000-4000-8000-000000000002')->>'receipt_id')::uuid where label='prep';
reset role;
select is((select state from public.guide_action_intents where id=(select action_id from e9_actions where label='prep')),'processing','Prep confirmation records a processing handoff before external dispatch');
select is((select result->>'dispatch_kind' from internal.loom_action_receipts where id=(select receipt_id from e9_actions where label='prep')),'prep_ai','The private receipt contains the bounded E4 dispatch kind');
update e9_actions x set request_id=(a.result_snapshot->>'request_id')::uuid,session_id=a.target_id,prep_version=a.target_version::timestamptz
from public.guide_action_intents a where x.label='prep' and a.id=x.action_id;
set local role service_role;
update e9_actions set run_id=(public.create_prep_ai_request_for_worker(
  request_id,'e9010000-0000-4000-8000-000000000001','e9020000-0000-4000-8000-000000000001','e9030000-0000-4000-8000-000000000001',
  session_id,
  'e9000000-0000-4000-8000-000000000001',request_id,'generate_session_prep','{}'::jsonb,prep_version,null)->>'run_id')::uuid where label='prep';
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','e9000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claim.role','authenticated',true);
select is((public.complete_loom_workflow_action((select action_id from e9_actions where label='prep'),(select receipt_id from e9_actions where label='prep'),'accepted',null,(select run_id from e9_actions where label='prep'))->>'state'),'accepted','Authenticated dispatch finalization records the accepted handoff');
reset role;
select is((select count(*) from public.usage_events where workspace_id='e9010000-0000-4000-8000-000000000001'),0::bigint,'Preview, confirmation, and handoff finalization do not create a second AI charge');
select is((select count(*) from internal.loom_action_receipts where action_intent_id=(select action_id from e9_actions where label='prep')),1::bigint,'One Prep confirmation creates one idempotent receipt');

update public.sessions set status='in_progress',updated_at=clock_timestamp() where saga_id='e9030000-0000-4000-8000-000000000001' and session_number=1;
set local role service_role;
select throws_ok($$select public.create_loom_deterministic_turn_for_worker(
  'e9010000-0000-4000-8000-000000000001','e9020000-0000-4000-8000-000000000001','e9030000-0000-4000-8000-000000000001','e9000000-0000-4000-8000-000000000001',null,
  'e9100000-0000-4000-8000-000000000004','e9110000-0000-4000-8000-000000000004','Generate prep for Session 1')$$,'23514','Prep is no longer editable','Stage-live Session blocks Prep task materialization');
reset role;
select is((select count(*) from internal.ai_task_runs where guide_turn_id='e9100000-0000-4000-8000-000000000004'),0::bigint,'Stage-live denial creates no provider run or charge');

insert into public.workshop_sessions(id,user_id,workspace_id,world_id,path,gm_profile_snapshot,creation_input,workshop_phase,state)
values('e9200000-0000-4000-8000-000000000001','e9000000-0000-4000-8000-000000000001','e9010000-0000-4000-8000-000000000001','e9020000-0000-4000-8000-000000000001','build_with_ai','{}','{"saga_name":"Ash Road"}','conversation','in_progress');
set local role service_role;
select public.create_loom_deterministic_turn_for_worker(
  'e9010000-0000-4000-8000-000000000001','e9020000-0000-4000-8000-000000000001','e9030000-0000-4000-8000-000000000001','e9000000-0000-4000-8000-000000000001',null,
  'e9100000-0000-4000-8000-000000000005','e9110000-0000-4000-8000-000000000005','Resume the active Saga Workshop');
reset role;
select ok((select state='accepted' and result_snapshot->>'destination'='active_workshop' and target_id='e9200000-0000-4000-8000-000000000001' from public.guide_action_intents where turn_id='e9100000-0000-4000-8000-000000000005'),'Workshop resume returns only the current user Workspace target');

insert into public.sessions(id,workspace_id,world_id,saga_id,name,session_number,status,started_at,ended_at,audio_chunk_count_expected,recording_finalized_at)
values('e9300000-0000-4000-8000-000000000001','e9010000-0000-4000-8000-000000000001','e9020000-0000-4000-8000-000000000001','e9030000-0000-4000-8000-000000000001','The Broken Recording',2,'ended',now()-interval '1 hour',now(),1,now());
insert into public.audio_chunks(workspace_id,world_id,saga_id,session_id,sequence,storage_path,bytes,duration_seconds,client_recorded_at,uploaded_at)
values('e9010000-0000-4000-8000-000000000001','e9020000-0000-4000-8000-000000000001','e9030000-0000-4000-8000-000000000001','e9300000-0000-4000-8000-000000000001',0,'e9/audio/0.webm',1000,30,now(),now());
insert into public.pipeline_runs(workspace_id,world_id,saga_id,session_id,state) values
('e9010000-0000-4000-8000-000000000001','e9020000-0000-4000-8000-000000000001','e9030000-0000-4000-8000-000000000001','e9300000-0000-4000-8000-000000000001','failed');
insert into public.transcripts(workspace_id,world_id,saga_id,session_id,whisper_model,state,failure_reason) values
('e9010000-0000-4000-8000-000000000001','e9020000-0000-4000-8000-000000000001','e9030000-0000-4000-8000-000000000001','e9300000-0000-4000-8000-000000000001','pending','failed','synthetic failure');
insert into internal.transcription_jobs(id,workspace_id,world_id,saga_id,session_id,gm_id,state,max_attempts,idempotency_key,failure_reason) values
('e9400000-0000-4000-8000-000000000001','e9010000-0000-4000-8000-000000000001','e9020000-0000-4000-8000-000000000001','e9030000-0000-4000-8000-000000000001','e9300000-0000-4000-8000-000000000001','e9000000-0000-4000-8000-000000000001','failed',3,'e9-transcription','synthetic failure');
set local role service_role;
select public.create_loom_deterministic_turn_for_worker(
  'e9010000-0000-4000-8000-000000000001','e9020000-0000-4000-8000-000000000001','e9030000-0000-4000-8000-000000000001','e9000000-0000-4000-8000-000000000001',null,
  'e9100000-0000-4000-8000-000000000006','e9110000-0000-4000-8000-000000000006','Retry transcription for Session 2');
reset role;
insert into e9_actions(label,action_id) select 'retry',id from public.guide_action_intents where turn_id='e9100000-0000-4000-8000-000000000006';
select ok((select state='pending' and cost_snapshot->>'ai_credits'='0' from public.guide_action_intents where turn_id='e9100000-0000-4000-8000-000000000006'),'Eligible transcription retry requires free explicit review');
set local role authenticated;
select set_config('request.jwt.claim.sub','e9000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claim.role','authenticated',true);
select is((public.review_loom_action((select action_id from e9_actions where label='retry'),1,'confirmed','e9120000-0000-4000-8000-000000000003')->>'state'),'accepted','Reviewed transcription retry reuses the existing owner RPC');
reset role;
select is((select state::text from internal.transcription_jobs where id='e9400000-0000-4000-8000-000000000001'),'pending','Transcription retry resets the existing job without creating another');
select is((select count(*) from internal.transcription_jobs where session_id='e9300000-0000-4000-8000-000000000001'),1::bigint,'Transcription retry does not duplicate or reupload evidence');
select is((select count(*) from internal.ai_task_runs where workspace_id='e9010000-0000-4000-8000-000000000001' and task_name='answer_saga_question'),0::bigint,'All exact E9 planning remains free of Loom answer tasks');
select is((select count(*) from internal.embedding_jobs where workspace_id='e9010000-0000-4000-8000-000000000001' and source_kind='query'),0::bigint,'Exact E9 workflow commands create no query embeddings');

select * from finish();
rollback;

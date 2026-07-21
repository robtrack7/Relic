create extension if not exists pgtap with schema extensions;
select plan(1);

insert into auth.users (id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_app_meta_data,raw_user_meta_data,is_super_admin,confirmation_token,email_change,email_change_token_new,recovery_token)
values ('e5000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','c5-browser@example.test',extensions.crypt('password',extensions.gen_salt('bf')),now(),now(),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,false,'','','','')
on conflict(id) do update set encrypted_password=excluded.encrypted_password,email_confirmed_at=excluded.email_confirmed_at;

insert into public.gm_profiles(id,user_id,experience_level,improv_comfort,prep_style)
values('e5100000-0000-0000-0000-000000000001','e5000000-0000-0000-0000-000000000001','experienced','mixed','light') on conflict(id) do nothing;
insert into public.workspaces(id,owner_gm_id,name) values('e5200000-0000-0000-0000-000000000001','e5000000-0000-0000-0000-000000000001','C5 Browser Workspace') on conflict(id) do nothing;
insert into public.worlds(id,workspace_id,owner_gm_id,name) values('e5300000-0000-0000-0000-000000000001','e5200000-0000-0000-0000-000000000001','e5000000-0000-0000-0000-000000000001','C5 Browser World') on conflict(id) do nothing;
insert into public.sagas(id,workspace_id,world_id,owner_gm_id,name,game_system)
values('e5400000-0000-0000-0000-000000000001','e5200000-0000-0000-0000-000000000001','e5300000-0000-0000-0000-000000000001','e5000000-0000-0000-0000-000000000001','C5 Browser Saga','Deterministic C5') on conflict(id) do nothing;
insert into public.sessions(id,workspace_id,world_id,saga_id,scope,name,status,ended_at)
values('e5500000-0000-0000-0000-000000000001','e5200000-0000-0000-0000-000000000001','e5300000-0000-0000-0000-000000000001','e5400000-0000-0000-0000-000000000001','saga','Evidence Session','ended',now()) on conflict(id) do nothing;

delete from public.canon_audit where draft_id in ('e5900000-0000-0000-0000-000000000001','e5900000-0000-0000-0000-000000000002','e5900000-0000-0000-0000-000000000003','e5900000-0000-0000-0000-000000000004');
delete from public.approval_action_receipts where workspace_id='e5200000-0000-0000-0000-000000000001';
delete from public.notes where workspace_id='e5200000-0000-0000-0000-000000000001' and title='Session 1 Summary';
delete from public.drafts where id in ('e5900000-0000-0000-0000-000000000001','e5900000-0000-0000-0000-000000000002','e5900000-0000-0000-0000-000000000003','e5900000-0000-0000-0000-000000000004');

insert into public.pipeline_runs(id,workspace_id,world_id,saga_id,session_id,state,inputs_summary)
values('e5700000-0000-0000-0000-000000000001','e5200000-0000-0000-0000-000000000001','e5300000-0000-0000-0000-000000000001','e5400000-0000-0000-0000-000000000001','e5500000-0000-0000-0000-000000000001','ready_for_review','{"fixture":"c5-browser"}')
on conflict(id) do update set state='ready_for_review',inputs_summary=excluded.inputs_summary;
insert into public.sources(id,workspace_id,world_id,saga_id,scope,kind,session_id,raw_excerpt)
values('e5800000-0000-0000-0000-000000000001','e5200000-0000-0000-0000-000000000001','e5300000-0000-0000-0000-000000000001','e5400000-0000-0000-0000-000000000001','saga','gm_manual_summary','e5500000-0000-0000-0000-000000000001','Mara opened the glass bridge and the old keeper left.')
on conflict(id) do update set raw_excerpt=excluded.raw_excerpt;
insert into public.characters(id,workspace_id,world_id,saga_id,scope,name,summary,canon_state,status,updated_at)
values
 ('e5600000-0000-0000-0000-000000000001','e5200000-0000-0000-0000-000000000001','e5300000-0000-0000-0000-000000000001','e5400000-0000-0000-0000-000000000001','saga','Mara Vale','Changed by the GM elsewhere','canon','active','2026-07-21T16:00:10Z'),
 ('e5600000-0000-0000-0000-000000000002','e5200000-0000-0000-0000-000000000001','e5300000-0000-0000-0000-000000000001','e5400000-0000-0000-0000-000000000001','saga','Old Keeper','A retired guide','canon','active','2026-07-21T16:00:00Z')
on conflict(id) do update set summary=excluded.summary,canon_state='canon',status='active',updated_at=excluded.updated_at;

insert into public.drafts(id,workspace_id,world_id,saga_id,scope,entity_type,target_entity_id,state,change_kind,proposed_payload,expected_version,confidence_band,confidence_reason,session_id,pipeline_run_id,ai_task_name,ai_prompt_version,ai_model,ai_provider)
values
 ('e5900000-0000-0000-0000-000000000001','e5200000-0000-0000-0000-000000000001','e5300000-0000-0000-0000-000000000001','e5400000-0000-0000-0000-000000000001','saga','note',null,'pending','create','{"title":"Session 1 Summary","body":"Machine wording","note_type":"summary"}',null,'high','direct_gm_input','e5500000-0000-0000-0000-000000000001','e5700000-0000-0000-0000-000000000001','synthesize_session','synthesize_session@1.0.0','deterministic-c5','deterministic-test'),
 ('e5900000-0000-0000-0000-000000000002','e5200000-0000-0000-0000-000000000001','e5300000-0000-0000-0000-000000000001','e5400000-0000-0000-0000-000000000001','saga','character','e5600000-0000-0000-0000-000000000001','pending','update','{"summary":"After the glass bridge"}','2026-07-21T16:00:00Z','medium','single_clear_segment','e5500000-0000-0000-0000-000000000001','e5700000-0000-0000-0000-000000000001','synthesize_session','synthesize_session@1.0.0','deterministic-c5','deterministic-test'),
 ('e5900000-0000-0000-0000-000000000003','e5200000-0000-0000-0000-000000000001','e5300000-0000-0000-0000-000000000001','e5400000-0000-0000-0000-000000000001','saga','character','e5600000-0000-0000-0000-000000000002','pending','archive_request','{}','2026-07-21T16:00:00Z','high','direct_gm_input','e5500000-0000-0000-0000-000000000001','e5700000-0000-0000-0000-000000000001','synthesize_session','synthesize_session@1.0.0','deterministic-c5','deterministic-test'),
 ('e5900000-0000-0000-0000-000000000004','e5200000-0000-0000-0000-000000000001','e5300000-0000-0000-0000-000000000001','e5400000-0000-0000-0000-000000000001','saga','thread',null,'pending','create','{"name":"Who forged the bridge?","summary":"Leave this pending","is_loose_thread":true}',null,'low','ambiguous_source','e5500000-0000-0000-0000-000000000001','e5700000-0000-0000-0000-000000000001','synthesize_session','synthesize_session@1.0.0','deterministic-c5','deterministic-test');
insert into public.draft_sources(workspace_id,world_id,saga_id,scope,draft_id,source_id)
select 'e5200000-0000-0000-0000-000000000001','e5300000-0000-0000-0000-000000000001','e5400000-0000-0000-0000-000000000001','saga',id,'e5800000-0000-0000-0000-000000000001' from public.drafts where id in ('e5900000-0000-0000-0000-000000000001','e5900000-0000-0000-0000-000000000002','e5900000-0000-0000-0000-000000000003','e5900000-0000-0000-0000-000000000004')
on conflict do nothing;

select pass('C5 authenticated browser fixture seeded');
select * from finish();

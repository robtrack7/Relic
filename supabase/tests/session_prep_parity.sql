create extension if not exists pgtap with schema extensions;

begin;
select plan(31);

insert into auth.users (id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_app_meta_data,raw_user_meta_data,is_super_admin,confirmation_token,email_change,email_change_token_new,recovery_token) values
('d4000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','d4-owner@example.test',extensions.crypt('password',extensions.gen_salt('bf')),now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false,'','','',''),
('d4000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','d4-outsider@example.test',extensions.crypt('password',extensions.gen_salt('bf')),now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false,'','','','') on conflict(id) do nothing;
insert into public.gm_profiles(id,user_id,experience_level,improv_comfort,prep_style) values
('d4010000-0000-0000-0000-000000000001','d4000000-0000-0000-0000-000000000001','experienced','mixed','light'),
('d4010000-0000-0000-0000-000000000002','d4000000-0000-0000-0000-000000000002','experienced','mixed','light') on conflict(id) do nothing;
insert into public.workspaces(id,owner_gm_id,name) values ('d4020000-0000-0000-0000-000000000001','d4000000-0000-0000-0000-000000000001','D4 Workspace') on conflict(id) do nothing;
insert into public.worlds(id,workspace_id,owner_gm_id,name) values ('d4030000-0000-0000-0000-000000000001','d4020000-0000-0000-0000-000000000001','d4000000-0000-0000-0000-000000000001','D4 World') on conflict(id) do nothing;
insert into public.world_eras(id,workspace_id,world_id,name) values ('d4040000-0000-0000-0000-000000000001','d4020000-0000-0000-0000-000000000001','d4030000-0000-0000-0000-000000000001','D4 Era') on conflict(id) do nothing;
insert into public.sagas(id,workspace_id,world_id,owner_gm_id,primary_era_id,name) values
('d4050000-0000-0000-0000-000000000001','d4020000-0000-0000-0000-000000000001','d4030000-0000-0000-0000-000000000001','d4000000-0000-0000-0000-000000000001','d4040000-0000-0000-0000-000000000001','D4 Saga'),
('d4050000-0000-0000-0000-000000000002','d4020000-0000-0000-0000-000000000001','d4030000-0000-0000-0000-000000000001','d4000000-0000-0000-0000-000000000001','d4040000-0000-0000-0000-000000000001','Sibling Saga') on conflict(id) do nothing;

insert into public.characters(id,workspace_id,world_id,saga_id,scope,name,canon_state) values
('d4060000-0000-0000-0000-000000000001','d4020000-0000-0000-0000-000000000001','d4030000-0000-0000-0000-000000000001','d4050000-0000-0000-0000-000000000001','saga','Mara','canon'),
('d4060000-0000-0000-0000-000000000002','d4020000-0000-0000-0000-000000000001','d4030000-0000-0000-0000-000000000001','d4050000-0000-0000-0000-000000000001','saga','Old Harbor','archived'),
('d4060000-0000-0000-0000-000000000003','d4020000-0000-0000-0000-000000000001','d4030000-0000-0000-0000-000000000001','d4050000-0000-0000-0000-000000000002','saga','Sibling Mara','canon'),
('d4060000-0000-0000-0000-000000000004','d4020000-0000-0000-0000-000000000001','d4030000-0000-0000-0000-000000000001','d4050000-0000-0000-0000-000000000001','saga','Soon Missing','canon') on conflict(id) do nothing;
insert into public.threads(id,workspace_id,world_id,saga_id,scope,name,canon_state) values
('d4070000-0000-0000-0000-000000000001','d4020000-0000-0000-0000-000000000001','d4030000-0000-0000-0000-000000000001','d4050000-0000-0000-0000-000000000001','saga','First Thread','canon'),
('d4070000-0000-0000-0000-000000000002','d4020000-0000-0000-0000-000000000001','d4030000-0000-0000-0000-000000000001','d4050000-0000-0000-0000-000000000001','saga','Archived Thread','archived'),
('d4070000-0000-0000-0000-000000000003','d4020000-0000-0000-0000-000000000001','d4030000-0000-0000-0000-000000000001','d4050000-0000-0000-0000-000000000002','saga','Sibling Thread','canon') on conflict(id) do nothing;

insert into public.sessions(id,workspace_id,world_id,saga_id,scope,name,session_number,status,summary,objective,opening_scene,scene_notes,prep_checklist,ended_at,updated_at) values
('d4080000-0000-0000-0000-000000000001','d4020000-0000-0000-0000-000000000001','d4030000-0000-0000-0000-000000000001','d4050000-0000-0000-0000-000000000001','saga','Prior Approved',1,'ended','The party recovered the seal.','Recover the seal',null,null,'[]',now()-interval '3 days','2026-07-21 18:00:00+00'),
('d4080000-0000-0000-0000-000000000002','d4020000-0000-0000-0000-000000000001','d4030000-0000-0000-0000-000000000001','d4050000-0000-0000-0000-000000000001','saga','Future Alpha',2,'planned',null,'Find the witness','Rain at the harbor','Initial notes','[{"text":"Review clues","done":false}]',null,'2026-07-21 20:00:00+00'),
('d4080000-0000-0000-0000-000000000003','d4020000-0000-0000-0000-000000000001','d4030000-0000-0000-0000-000000000001','d4050000-0000-0000-0000-000000000001','saga','Future Beta',3,'ready',null,'Enter the vault',null,null,'[]',null,'2026-07-21 20:00:00+00'),
('d4080000-0000-0000-0000-000000000004','d4020000-0000-0000-0000-000000000001','d4030000-0000-0000-0000-000000000001','d4050000-0000-0000-0000-000000000002','saga','Sibling Future',1,'planned',null,'Wrong Saga',null,null,'[]',null,'2026-07-21 20:00:00+00') on conflict(id) do nothing;

create temp table d4_before as select (select count(*) from public.canon_audit) canon_count,(select count(*) from internal.ai_task_runs) provider_count;

set local role authenticated;
select set_config('request.jwt.claim.sub','d4000000-0000-0000-0000-000000000001',true);
select set_config('request.jwt.claim.saga_id','d4050000-0000-0000-0000-000000000001',true);

select has_column('public','sessions','planned_start_at','scheduled timestamp exists');
select has_column('public','sessions','archived_at','session archive timestamp exists');
select has_column('public','session_active_threads','order_index','Thread pin order exists');
select has_function('public','autosave_session_prep',array['uuid','uuid','uuid','uuid','timestamp with time zone','text','timestamp with time zone','text','text','text','jsonb','jsonb','jsonb'],'optimistic Prep autosave exists');
select has_function('public','get_session_prep',array['uuid','uuid','uuid','uuid'],'Prep read model exists');
select has_function('public','mutate_session_prep',array['uuid','uuid','uuid','uuid','timestamp with time zone','text','text'],'Prep actions RPC exists');

create temp table d4_saved as select public.autosave_session_prep('d4020000-0000-0000-0000-000000000001','d4030000-0000-0000-0000-000000000001','d4050000-0000-0000-0000-000000000001','d4080000-0000-0000-0000-000000000002','2026-07-21 20:00:00+00','Future Alpha','2026-07-31 02:30:00+00','Meet the witness','Rain at the harbor','Latest notes','[{"text":"Review clues","done":false}]','["character:d4060000-0000-0000-0000-000000000002","character:d4060000-0000-0000-0000-000000000001"]','["d4070000-0000-0000-0000-000000000002","d4070000-0000-0000-0000-000000000001"]') result;
select is((select result->>'status' from d4_saved),'saved','autosave persists successfully');
select is((select objective from public.sessions where id='d4080000-0000-0000-0000-000000000002'),'Meet the witness','autosave writes latest content');
select is((select planned_start_at from public.sessions where id='d4080000-0000-0000-0000-000000000002'),'2026-07-31 02:30:00+00'::timestamptz,'schedule date and time persist');
select is((select string_agg(entity_id::text,',' order by order_index) from public.session_pinned_entities where session_id='d4080000-0000-0000-0000-000000000002'),'d4060000-0000-0000-0000-000000000002,d4060000-0000-0000-0000-000000000001','entity order persists');
select is((select string_agg(thread_id::text,',' order by order_index) from public.session_active_threads where session_id='d4080000-0000-0000-0000-000000000002'),'d4070000-0000-0000-0000-000000000002,d4070000-0000-0000-0000-000000000001','Thread order persists');
select is((public.get_session_prep('d4020000-0000-0000-0000-000000000001','d4030000-0000-0000-0000-000000000001','d4050000-0000-0000-0000-000000000001','d4080000-0000-0000-0000-000000000002')#>>'{prior_summary,state}'),'approved','approved prior summary is preferred');
select is((public.get_session_prep('d4020000-0000-0000-0000-000000000001','d4030000-0000-0000-0000-000000000001','d4050000-0000-0000-0000-000000000001','d4080000-0000-0000-0000-000000000002')#>>'{prior_summary,text}'),'The party recovered the seal.','approved prior summary text is returned');
select is((public.get_session_prep('d4020000-0000-0000-0000-000000000001','d4030000-0000-0000-0000-000000000001','d4050000-0000-0000-0000-000000000001','d4080000-0000-0000-0000-000000000002')#>>'{pinned_entities,0,state}'),'archived','archived entity pin remains recoverable');
select is((public.get_session_prep('d4020000-0000-0000-0000-000000000001','d4030000-0000-0000-0000-000000000001','d4050000-0000-0000-0000-000000000001','d4080000-0000-0000-0000-000000000002')#>>'{active_threads,0,state}'),'archived','archived Thread pin remains recoverable');

select throws_like($$select public.autosave_session_prep('d4020000-0000-0000-0000-000000000001','d4030000-0000-0000-0000-000000000001','d4050000-0000-0000-0000-000000000001','d4080000-0000-0000-0000-000000000002','2026-07-21 20:00:00+00','Stale overwrite',null,'Bad',null,null,'[]','[]','[]')$$,'%Prep changed elsewhere%','stale write is rejected');
select is((select name from public.sessions where id='d4080000-0000-0000-0000-000000000002'),'Future Alpha','stale write does not overwrite');
select throws_like($$select public.autosave_session_prep('d4020000-0000-0000-0000-000000000001','d4030000-0000-0000-0000-000000000001','d4050000-0000-0000-0000-000000000001','d4080000-0000-0000-0000-000000000002',(select updated_at from public.sessions where id='d4080000-0000-0000-0000-000000000002'),'Cross scope',null,'Bad',null,null,'[]','["character:d4060000-0000-0000-0000-000000000003"]','[]')$$,'%outside the Saga%','cross-Saga entity pin is rejected');
select throws_like($$select public.autosave_session_prep('d4020000-0000-0000-0000-000000000001','d4030000-0000-0000-0000-000000000001','d4050000-0000-0000-0000-000000000001','d4080000-0000-0000-0000-000000000002',(select updated_at from public.sessions where id='d4080000-0000-0000-0000-000000000002'),'Cross thread',null,'Bad',null,null,'[]','[]','["d4070000-0000-0000-0000-000000000003"]')$$,'%outside the Saga%','cross-Saga Thread pin is rejected');

reset role; insert into public.session_pinned_entities(workspace_id,world_id,saga_id,session_id,entity_type,entity_id,order_index) values('d4020000-0000-0000-0000-000000000001','d4030000-0000-0000-0000-000000000001','d4050000-0000-0000-0000-000000000001','d4080000-0000-0000-0000-000000000002','character','d4060000-0000-0000-0000-000000000004',2); delete from public.characters where id='d4060000-0000-0000-0000-000000000004'; set local role authenticated;
select is((public.get_session_prep('d4020000-0000-0000-0000-000000000001','d4030000-0000-0000-0000-000000000001','d4050000-0000-0000-0000-000000000001','d4080000-0000-0000-0000-000000000002')#>>'{pinned_entities,2,state}'),'missing','refresh retains a recoverable deleted pin');

reset role;
insert into public.sessions(id,workspace_id,world_id,saga_id,scope,name,session_number,status,updated_at) values
('d4080000-0000-0000-0000-000000000005','d4020000-0000-0000-0000-000000000001','d4030000-0000-0000-0000-000000000001','d4050000-0000-0000-0000-000000000001','saga','Live',5,'in_progress','2026-07-21 20:00:00+00'),
('d4080000-0000-0000-0000-000000000006','d4020000-0000-0000-0000-000000000001','d4030000-0000-0000-0000-000000000001','d4050000-0000-0000-0000-000000000001','saga','Ended',6,'ended','2026-07-21 20:00:00+00') on conflict(id) do nothing;
set local role authenticated;
select throws_like($$select public.autosave_session_prep('d4020000-0000-0000-0000-000000000001','d4030000-0000-0000-0000-000000000001','d4050000-0000-0000-0000-000000000001','d4080000-0000-0000-0000-000000000005','2026-07-21 20:00:00+00','Live edit',null,null,null,null,'[]','[]','[]')$$,'%Prep is read-only%','Live Prep is read-only');
select throws_like($$select public.autosave_session_prep('d4020000-0000-0000-0000-000000000001','d4030000-0000-0000-0000-000000000001','d4050000-0000-0000-0000-000000000001','d4080000-0000-0000-0000-000000000006','2026-07-21 20:00:00+00','Ended edit',null,null,null,null,'[]','[]','[]')$$,'%Prep is read-only%','ended Prep is read-only');
select lives_ok($$select public.autosave_session_prep('d4020000-0000-0000-0000-000000000001','d4030000-0000-0000-0000-000000000001','d4050000-0000-0000-0000-000000000001','d4080000-0000-0000-0000-000000000003','2026-07-21 20:00:00+00','Future Beta',null,'Ready remains editable',null,null,'[]','[]','[]')$$,'Ready Prep remains editable');

create temp table d4_duplicate as select public.mutate_session_prep('d4020000-0000-0000-0000-000000000001','d4030000-0000-0000-0000-000000000001','d4050000-0000-0000-0000-000000000001','d4080000-0000-0000-0000-000000000002',(select updated_at from public.sessions where id='d4080000-0000-0000-0000-000000000002'),'duplicate','duplicate-request-a') result;
select is((select result->>'status' from d4_duplicate),'duplicated','duplicate action returns planned copy');
select is((select status::text from public.sessions where id=((select result->>'session_id' from d4_duplicate)::uuid)),'planned','duplicate is planned');
select is((select count(*) from public.sessions where duplicated_from_session_id='d4080000-0000-0000-0000-000000000002'),1::bigint,'duplicate request creates exactly one Session');
select is((public.mutate_session_prep('d4020000-0000-0000-0000-000000000001','d4030000-0000-0000-0000-000000000001','d4050000-0000-0000-0000-000000000001','d4080000-0000-0000-0000-000000000002',(select updated_at from public.sessions where id='d4080000-0000-0000-0000-000000000002'),'duplicate','duplicate-request-a')->>'session_id'),(select result->>'session_id' from d4_duplicate),'duplicate retry returns the same Session');
select is((select count(*) from public.sessions where duplicated_from_session_id='d4080000-0000-0000-0000-000000000002'),1::bigint,'duplicate retry creates no duplicate future Session');

reset role;
select is((select count(*) from public.canon_audit),(select canon_count from d4_before),'Prep writes create zero canon audit rows');
select is((select count(*) from internal.ai_task_runs),(select provider_count from d4_before),'Prep writes invoke zero provider task rows');
set local role authenticated;

select set_config('request.jwt.claim.sub','d4000000-0000-0000-0000-000000000002',true);
select throws_like($$select public.get_session_prep('d4020000-0000-0000-0000-000000000001','d4030000-0000-0000-0000-000000000001','d4050000-0000-0000-0000-000000000001','d4080000-0000-0000-0000-000000000002')$$,'%saga context is not available%','permission-denied Prep does not leak pin data');

select * from finish();
rollback;

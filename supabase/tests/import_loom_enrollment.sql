create extension if not exists pgtap with schema extensions;

begin;
select plan(17);

insert into auth.users (id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_app_meta_data,raw_user_meta_data,is_super_admin,confirmation_token,email_change,email_change_token_new,recovery_token)
values ('da000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','g1-enrollment@example.test',extensions.crypt('password',extensions.gen_salt('bf')),now(),now(),now(),'{}','{}',false,'','','','') on conflict do nothing;
insert into public.workspaces(id,owner_gm_id,name) values('da100000-0000-4000-8000-000000000001','da000000-0000-4000-8000-000000000001','G1 Enrollment');
insert into public.worlds(id,workspace_id,owner_gm_id,name) values('da200000-0000-4000-8000-000000000001','da100000-0000-4000-8000-000000000001','da000000-0000-4000-8000-000000000001','Bellweather');
insert into public.world_eras(id,workspace_id,world_id,name) values('da300000-0000-4000-8000-000000000001','da100000-0000-4000-8000-000000000001','da200000-0000-4000-8000-000000000001','Present');
insert into public.sagas(id,workspace_id,world_id,owner_gm_id,primary_era_id,name) values
('da400000-0000-4000-8000-000000000001','da100000-0000-4000-8000-000000000001','da200000-0000-4000-8000-000000000001','da000000-0000-4000-8000-000000000001','da300000-0000-4000-8000-000000000001','Lantern Archive'),
('da400000-0000-4000-8000-000000000002','da100000-0000-4000-8000-000000000001','da200000-0000-4000-8000-000000000001','da000000-0000-4000-8000-000000000001','da300000-0000-4000-8000-000000000001','Sibling');
insert into public.sources(id,workspace_id,world_id,saga_id,scope,kind,uploader_id,original_filename,mime_type,byte_size,ingestion_method,content_sha256,import_state,raw_excerpt,ready_at) values
('da500000-0000-4000-8000-000000000001','da100000-0000-4000-8000-000000000001','da200000-0000-4000-8000-000000000001','da400000-0000-4000-8000-000000000001','saga','imported_text','da000000-0000-4000-8000-000000000001','campaign.md','text/markdown',25,'markdown_file',repeat('a',64),'ready_for_review','Keeper Sable guards the map.',now()),
('da500000-0000-4000-8000-000000000002','da100000-0000-4000-8000-000000000001','da200000-0000-4000-8000-000000000001','da400000-0000-4000-8000-000000000001','saga','imported_text','da000000-0000-4000-8000-000000000001','threads.txt','text/plain',31,'plain_text_file',repeat('b',64),'ready_for_review','The observatory seal was changed.',now()),
('da500000-0000-4000-8000-000000000003','da100000-0000-4000-8000-000000000001','da200000-0000-4000-8000-000000000001','da400000-0000-4000-8000-000000000002','saga','imported_text','da000000-0000-4000-8000-000000000001','sibling.txt','text/plain',20,'plain_text_file',repeat('c',64),'ready_for_review','Sibling-only evidence.',now());

select has_function('public','create_import_loom_turn_for_worker',array['uuid','uuid','uuid','uuid','uuid','uuid','uuid','text','uuid[]'],'service-only import enrollment creator exists');
select ok(has_function_privilege('service_role','public.create_import_loom_turn_for_worker(uuid,uuid,uuid,uuid,uuid,uuid,uuid,text,uuid[])','execute'),'service worker can enroll selected imports');
select ok(not has_function_privilege('authenticated','public.create_import_loom_turn_for_worker(uuid,uuid,uuid,uuid,uuid,uuid,uuid,text,uuid[])','execute'),'browser cannot forge import evidence enrollment');

create temp table enrolled as select public.create_import_loom_turn_for_worker(
  'da100000-0000-4000-8000-000000000001','da200000-0000-4000-8000-000000000001','da400000-0000-4000-8000-000000000001','da000000-0000-4000-8000-000000000001',null,
  'da600000-0000-4000-8000-000000000001','da700000-0000-4000-8000-000000000001','Organize these imports into reviewable proposals.',
  array['da500000-0000-4000-8000-000000000002','da500000-0000-4000-8000-000000000001']::uuid[]
) result;
select is((select result->>'source_count' from enrolled),'2','explicit enrollment freezes exactly two selected imports');
select is((select count(*)::int from internal.guide_evidence_snapshots where turn_id='da600000-0000-4000-8000-000000000001'),2,'two immutable Guide evidence snapshots are created');
select is((select string_agg(source_kind,',' order by ordinal) from internal.guide_evidence_snapshots where turn_id='da600000-0000-4000-8000-000000000001'),'imported_text,imported_text','enrolled evidence is labeled as untrusted imported text');
select is((select allowed_source_ids from internal.ai_task_runs where guide_turn_id='da600000-0000-4000-8000-000000000001'),array['da500000-0000-4000-8000-000000000001','da500000-0000-4000-8000-000000000002']::uuid[],'run allowlist contains only the selected sorted source identities');
select is((select input_payload->>'import_enrollment' from internal.ai_task_runs where guide_turn_id='da600000-0000-4000-8000-000000000001'),'true','run records the explicit import-enrollment mode');
select is(internal.loom_source_current_version('da500000-0000-4000-8000-000000000001'),repeat('a',64),'ready import current version is its immutable content hash');
select is(public.create_import_loom_turn_for_worker('da100000-0000-4000-8000-000000000001','da200000-0000-4000-8000-000000000001','da400000-0000-4000-8000-000000000001','da000000-0000-4000-8000-000000000001',null,'da600000-0000-4000-8000-000000000001','da700000-0000-4000-8000-000000000001','Organize these imports into reviewable proposals.',array['da500000-0000-4000-8000-000000000001','da500000-0000-4000-8000-000000000002']::uuid[])->>'replayed','true','exact enrollment retry creates no second turn or run');
select throws_like($$select public.create_import_loom_turn_for_worker('da100000-0000-4000-8000-000000000001','da200000-0000-4000-8000-000000000001','da400000-0000-4000-8000-000000000001','da000000-0000-4000-8000-000000000001',null,'da600000-0000-4000-8000-000000000001','da700000-0000-4000-8000-000000000001','Organize these imports into reviewable proposals.',array['da500000-0000-4000-8000-000000000001']::uuid[])$$,'%does not match selected imports%','retry cannot substitute a different import set');
select throws_like($$select public.create_import_loom_turn_for_worker('da100000-0000-4000-8000-000000000001','da200000-0000-4000-8000-000000000001','da400000-0000-4000-8000-000000000001','da000000-0000-4000-8000-000000000001',null,gen_random_uuid(),gen_random_uuid(),'Use sibling evidence.',array['da500000-0000-4000-8000-000000000003']::uuid[])$$,'%unavailable for Loom enrollment%','sibling-Saga import selection fails closed');
select is((select count(*)::int from public.drafts),0,'enrollment writes no Approval Queue proposal');
select is((select count(*)::int from public.canon_audit),0,'enrollment writes no canon audit');
select is((select count(*)::int from public.embeddings),0,'enrollment writes no embedding');
select is((select count(*)::int from internal.embedding_jobs),0,'enrollment queues no embedding');
select is((select count(*)::int from public.usage_events),0,'enrollment itself records no provider usage before delivery');

select * from finish();
rollback;

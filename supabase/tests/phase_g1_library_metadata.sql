create extension if not exists pgtap with schema extensions;

begin;
select plan(11);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, email_change, email_change_token_new, recovery_token)
values ('f1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'g1-metadata@example.test', extensions.crypt('password', extensions.gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false, '', '', '', '')
on conflict (id) do nothing;
insert into public.workspaces (id, owner_gm_id, name) values ('f1100000-0000-0000-0000-000000000001','f1000000-0000-0000-0000-000000000001','G1 Metadata Workspace') on conflict (id) do nothing;
insert into public.worlds (id, workspace_id, owner_gm_id, name) values ('f1200000-0000-0000-0000-000000000001','f1100000-0000-0000-0000-000000000001','f1000000-0000-0000-0000-000000000001','G1 Metadata World') on conflict (id) do nothing;
insert into public.sagas (id, workspace_id, world_id, owner_gm_id, name) values ('f1300000-0000-0000-0000-000000000001','f1100000-0000-0000-0000-000000000001','f1200000-0000-0000-0000-000000000001','f1000000-0000-0000-0000-000000000001','G1 Metadata Saga') on conflict (id) do nothing;
insert into public.characters (id, workspace_id, world_id, saga_id, scope, name, summary, narrative, status, tags)
values ('f1400000-0000-0000-0000-000000000001','f1100000-0000-0000-0000-000000000001','f1200000-0000-0000-0000-000000000001','f1300000-0000-0000-0000-000000000001','saga','Mara Vale','Scout','Watches the road.','active',array['scout']);
delete from internal.embedding_jobs where source_entity_id='f1400000-0000-0000-0000-000000000001';

set local role authenticated;
select set_config('request.jwt.claim.sub', 'f1000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.saga_id', 'f1300000-0000-0000-0000-000000000001', true);

select has_function('public','update_entity',array['uuid','uuid','uuid','text','uuid','jsonb'],'G1 metadata uses the existing scoped optimistic update boundary');
select is(public.get_library_record_detail('f1100000-0000-0000-0000-000000000001','f1200000-0000-0000-0000-000000000001','f1300000-0000-0000-0000-000000000001','character','f1400000-0000-0000-0000-000000000001') #>> '{record,status}','active','detail exposes descriptive status');
select is(public.get_library_record_detail('f1100000-0000-0000-0000-000000000001','f1200000-0000-0000-0000-000000000001','f1300000-0000-0000-0000-000000000001','character','f1400000-0000-0000-0000-000000000001') #>> '{record,tags,0}','scout','detail exposes tags');

select lives_ok($$ select public.update_entity('f1100000-0000-0000-0000-000000000001','f1200000-0000-0000-0000-000000000001','f1300000-0000-0000-0000-000000000001','character','f1400000-0000-0000-0000-000000000001',jsonb_build_object('name','Mara Vale','summary','Scout','narrative','Watches the road.','gm_notes','','status','missing','tags','["hidden-path","politics","hidden-path"]'::jsonb,'expected_version',(select updated_at from public.characters where id='f1400000-0000-0000-0000-000000000001'))) $$,'GM can update status and tags');
select is((select status || ':' || canon_state::text from public.characters where id='f1400000-0000-0000-0000-000000000001'),'missing:canon','descriptive status is stored separately from canon state');
select is((select tags from public.characters where id='f1400000-0000-0000-0000-000000000001'),array['hidden-path','politics'],'tags preserve order and remove duplicates');
select ok(exists(select 1 from public.canon_audit where entity_id='f1400000-0000-0000-0000-000000000001' and change_summary @> '{"payload":{"status":"missing","tags":["hidden-path","politics"]}}'::jsonb),'metadata edit retains canon provenance');
select is((select count(*) from public.get_embedding_job_status('f1100000-0000-0000-0000-000000000001','f1200000-0000-0000-0000-000000000001','f1300000-0000-0000-0000-000000000001','entity','f1400000-0000-0000-0000-000000000001')),1::bigint,'metadata edit refreshes retrieval freshness');
select throws_like($$ select public.update_entity('f1100000-0000-0000-0000-000000000001','f1200000-0000-0000-0000-000000000001','f1300000-0000-0000-0000-000000000001','character','f1400000-0000-0000-0000-000000000001','{"name":"Mara Vale","summary":"Scout","narrative":"Stale","gm_notes":"","status":"missing","tags":[],"expected_version":"2026-01-01T00:00:00Z"}'::jsonb) $$,'%conflict%','stale metadata edit fails closed');
select throws_like($$ select public.update_entity('f1100000-0000-0000-0000-000000000001','f1200000-0000-0000-0000-000000000001','f1300000-0000-0000-0000-000000000001','character','f1400000-0000-0000-0000-000000000001',jsonb_build_object('name','Mara Vale','summary','Scout','narrative','Watches the road.','gm_notes','','status','missing','tags','["Not Valid"]'::jsonb,'expected_version',(select updated_at from public.characters where id='f1400000-0000-0000-0000-000000000001'))) $$,'%lowercase kebab-case%','server rejects malformed tags');
select throws_like($$ select public.update_entity('f1100000-0000-0000-0000-000000000001','f1200000-0000-0000-0000-000000000001','f1300000-0000-0000-0000-000000000001','character','f1400000-0000-0000-0000-000000000001',jsonb_build_object('name','Mara Vale','summary','Scout','narrative','Watches the road.','gm_notes','','status','missing','tags','["a","b","c","d","e","f","g","h","i","j","k","l","m"]'::jsonb,'expected_version',(select updated_at from public.characters where id='f1400000-0000-0000-0000-000000000001'))) $$,'%at most 12%','server enforces the tag count bound');

select * from finish();
rollback;

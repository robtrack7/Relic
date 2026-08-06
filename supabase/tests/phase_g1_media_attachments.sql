create extension if not exists pgtap with schema extensions;
begin;
select plan(31);

insert into auth.users (id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_app_meta_data,raw_user_meta_data,is_super_admin,confirmation_token,email_change,email_change_token_new,recovery_token) values
('f2000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','g1-media-owner@example.test',extensions.crypt('password',extensions.gen_salt('bf')),now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false,'','','',''),
('f2000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','g1-media-other@example.test',extensions.crypt('password',extensions.gen_salt('bf')),now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false,'','','','') on conflict(id) do nothing;
insert into public.workspaces(id,owner_gm_id,name) values ('f2100000-0000-4000-8000-000000000001','f2000000-0000-4000-8000-000000000001','Media Workspace');
insert into public.worlds(id,workspace_id,owner_gm_id,name) values ('f2200000-0000-4000-8000-000000000001','f2100000-0000-4000-8000-000000000001','f2000000-0000-4000-8000-000000000001','Media World');
insert into public.sagas(id,workspace_id,world_id,owner_gm_id,name) values ('f2300000-0000-4000-8000-000000000001','f2100000-0000-4000-8000-000000000001','f2200000-0000-4000-8000-000000000001','f2000000-0000-4000-8000-000000000001','Media Saga');
insert into public.characters(id,workspace_id,world_id,saga_id,scope,name,summary) values ('f2400000-0000-4000-8000-000000000001','f2100000-0000-4000-8000-000000000001','f2200000-0000-4000-8000-000000000001','f2300000-0000-4000-8000-000000000001','saga','Mara Vale','A careful scout.');

set local role authenticated;
select set_config('request.jwt.claim.sub','f2000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claim.saga_id','f2300000-0000-4000-8000-000000000001',true);
select has_table('public','media_attachments','G1 media table exists');
select has_function('public','begin_media_attachment',array['uuid','uuid','uuid','uuid','text','uuid','text','text','bigint','text','text','text'],'registration is a scoped authenticated RPC');
select is(public.begin_media_attachment('f2100000-0000-4000-8000-000000000001','f2200000-0000-4000-8000-000000000001','f2300000-0000-4000-8000-000000000001','f2500000-0000-4000-8000-000000000001','character','f2400000-0000-4000-8000-000000000001','atmosphere.png','image/png',1000,'Stormglass','A bridge under green lightning','Cold rain and a hidden path')->>'id','f2500000-0000-4000-8000-000000000001','registration derives a private upload target');
select is(public.list_media_attachments('f2100000-0000-4000-8000-000000000001','f2200000-0000-4000-8000-000000000001','f2300000-0000-4000-8000-000000000001','character','f2400000-0000-4000-8000-000000000001')#>>'{0,state}','uploading','upload state survives refresh');
select ok(not ((public.list_media_attachments('f2100000-0000-4000-8000-000000000001','f2200000-0000-4000-8000-000000000001','f2300000-0000-4000-8000-000000000001','character','f2400000-0000-4000-8000-000000000001')->0)?'storage_path'),'public projection omits object paths');
select ok(public.attachment_object_write_allowed('f2100000-0000-4000-8000-000000000001/f2200000-0000-4000-8000-000000000001/f2300000-0000-4000-8000-000000000001/images/f2500000-0000-4000-8000-000000000001/original.png'),'only the registered owner upload path is writable');
select is((select count(*) from public.sources where saga_id='f2300000-0000-4000-8000-000000000001'),0::bigint,'upload registration creates no source or Loom evidence');
select is((select count(*) from public.drafts where saga_id='f2300000-0000-4000-8000-000000000001'),0::bigint,'upload registration creates no draft or canon proposal');
select is((select count(*) from public.embeddings where saga_id='f2300000-0000-4000-8000-000000000001'),0::bigint,'upload registration creates no embedding');
select is(public.claim_media_attachment_operation('f2100000-0000-4000-8000-000000000001','f2200000-0000-4000-8000-000000000001','f2300000-0000-4000-8000-000000000001','f2500000-0000-4000-8000-000000000001','f2600000-0000-4000-8000-000000000001','validate')->>'state','validating','validation uses an exact claim');

set local role service_role;
select throws_like($$ select public.complete_media_attachment_validation_for_worker('f2500000-0000-4000-8000-000000000001','f2000000-0000-4000-8000-000000000001','f2600000-0000-4000-8000-000000000001','image/png',1000,10000,10000,repeat('a',64),'relic-static-image-v1') $$,'%Trusted image result is invalid%','worker completion rechecks dimension limits');
select is(public.complete_media_attachment_validation_for_worker('f2500000-0000-4000-8000-000000000001','f2000000-0000-4000-8000-000000000001','f2600000-0000-4000-8000-000000000001','image/png',1000,1200,800,repeat('a',64),'relic-static-image-v1')->>'state','ready','trusted validation finalizes a static image');

set local role authenticated;
select set_config('request.jwt.claim.sub','f2000000-0000-4000-8000-000000000001',true);
select is(public.list_media_attachments('f2100000-0000-4000-8000-000000000001','f2200000-0000-4000-8000-000000000001','f2300000-0000-4000-8000-000000000001','character','f2400000-0000-4000-8000-000000000001')#>>'{0,state}','ready','ready image is listed after restart');
select is(public.list_media_attachments('f2100000-0000-4000-8000-000000000001','f2200000-0000-4000-8000-000000000001','f2300000-0000-4000-8000-000000000001','character','f2400000-0000-4000-8000-000000000001')#>>'{0,alt_text}','A bridge under green lightning','sanitized projection includes authored text');
select is(public.claim_media_attachment_operation('f2100000-0000-4000-8000-000000000001','f2200000-0000-4000-8000-000000000001','f2300000-0000-4000-8000-000000000001','f2500000-0000-4000-8000-000000000001','f2600000-0000-4000-8000-000000000002','view')->>'bucket','attachments','view requires an authorized ready claim');
select is(public.update_media_attachment_metadata('f2100000-0000-4000-8000-000000000001','f2200000-0000-4000-8000-000000000001','f2300000-0000-4000-8000-000000000001','f2500000-0000-4000-8000-000000000001','Stormglass','A bridge beneath green lightning','Cold rain; a hidden quest path',(public.list_media_attachments('f2100000-0000-4000-8000-000000000001','f2200000-0000-4000-8000-000000000001','f2300000-0000-4000-8000-000000000001','character','f2400000-0000-4000-8000-000000000001')#>>'{0,updated_at}')::timestamptz)->>'description','Cold rain; a hidden quest path','GM can edit authored text optimistically');
select throws_like($$ select public.update_media_attachment_metadata('f2100000-0000-4000-8000-000000000001','f2200000-0000-4000-8000-000000000001','f2300000-0000-4000-8000-000000000001','f2500000-0000-4000-8000-000000000001','Stale','Stale alt','Stale','2026-01-01T00:00:00Z') $$,'%conflict%','stale metadata edit fails closed');
select is((public.get_library_record_detail('f2100000-0000-4000-8000-000000000001','f2200000-0000-4000-8000-000000000001','f2300000-0000-4000-8000-000000000001','character','f2400000-0000-4000-8000-000000000001')#>>'{delete_blockers,media_attachments}')::bigint,1::bigint,'active private image blocks record hard deletion');
select throws_ok($$ select * from public.media_attachments $$,'42501','permission denied for table media_attachments','authenticated callers cannot read raw media rows or paths');

set local role service_role;
create temp table media_loom as select public.create_media_attachment_loom_turn_for_worker('f2100000-0000-4000-8000-000000000001','f2200000-0000-4000-8000-000000000001','f2300000-0000-4000-8000-000000000001','f2000000-0000-4000-8000-000000000001',null,'f2700000-0000-4000-8000-000000000001','f2800000-0000-4000-8000-000000000001','Propose an atmosphere Note and quest Thread.',array['f2500000-0000-4000-8000-000000000001'::uuid]) payload;
select is(payload->>'source_count','1','explicit media handoff creates one cited text evidence source') from media_loom;
reset role;
select is((select evidence_text from internal.guide_evidence_snapshots where turn_id='f2700000-0000-4000-8000-000000000001' limit 1),E'GM-authored description; image not inspected.\nTitle: Stormglass\nAlt text: A bridge beneath green lightning\nDescription: Cold rain; a hidden quest path\nSafe metadata: image/png, 1200×800 pixels.','Loom evidence says the image was not inspected');
select ok(not exists(select 1 from internal.guide_evidence_snapshots where turn_id='f2700000-0000-4000-8000-000000000001' and (evidence_text like '%storage_path%' or evidence_text like '%signed%' or evidence_text like '%/images/%')),'Loom evidence contains no pixels, path, or signed URL');
select is((select count(*) from public.drafts where saga_id='f2300000-0000-4000-8000-000000000001'),0::bigint,'media handoff does not create a canon draft before provider review');
select is((select count(*) from public.canon_audit where saga_id='f2300000-0000-4000-8000-000000000001'),0::bigint,'media handoff does not mutate canon or audit');
select is((select count(*) from public.embeddings where saga_id='f2300000-0000-4000-8000-000000000001'),0::bigint,'media caption remains excluded from ordinary embeddings');
set local role service_role;
select is(public.create_media_attachment_loom_turn_for_worker('f2100000-0000-4000-8000-000000000001','f2200000-0000-4000-8000-000000000001','f2300000-0000-4000-8000-000000000001','f2000000-0000-4000-8000-000000000001',null,'f2700000-0000-4000-8000-000000000001','f2800000-0000-4000-8000-000000000001','Propose an atmosphere Note and quest Thread.',array['f2500000-0000-4000-8000-000000000001'::uuid])->>'replayed','true','exact media handoff retry creates no second turn or source');

set local role authenticated;
select set_config('request.jwt.claim.sub','f2000000-0000-4000-8000-000000000002',true);
select throws_like($$ select public.list_media_attachments('f2100000-0000-4000-8000-000000000001','f2200000-0000-4000-8000-000000000001','f2300000-0000-4000-8000-000000000001','character','f2400000-0000-4000-8000-000000000001') $$,'%saga context is not available%','another owner cannot list private attachments');
select set_config('request.jwt.claim.sub','f2000000-0000-4000-8000-000000000001',true);
select is(public.claim_media_attachment_operation('f2100000-0000-4000-8000-000000000001','f2200000-0000-4000-8000-000000000001','f2300000-0000-4000-8000-000000000001','f2500000-0000-4000-8000-000000000001','f2600000-0000-4000-8000-000000000003','delete')->>'state','validating','delete takes an exact protected claim');
set local role service_role;
select lives_ok($$ select public.complete_media_attachment_delete_for_worker('f2500000-0000-4000-8000-000000000001','f2000000-0000-4000-8000-000000000001','f2600000-0000-4000-8000-000000000003') $$,'service completes deletion only after object removal');
set local role authenticated;
select set_config('request.jwt.claim.sub','f2000000-0000-4000-8000-000000000001',true);
select is(jsonb_array_length(public.list_media_attachments('f2100000-0000-4000-8000-000000000001','f2200000-0000-4000-8000-000000000001','f2300000-0000-4000-8000-000000000001','character','f2400000-0000-4000-8000-000000000001')),0,'deleted media disappears from the record projection');
select is((public.get_library_record_detail('f2100000-0000-4000-8000-000000000001','f2200000-0000-4000-8000-000000000001','f2300000-0000-4000-8000-000000000001','character','f2400000-0000-4000-8000-000000000001')#>>'{delete_blockers,media_attachments}')::bigint,0::bigint,'deleted media no longer blocks record lifecycle');

select * from finish();
rollback;

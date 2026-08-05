create extension if not exists pgtap with schema extensions;

begin;
select plan(68);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, email_change, email_change_token_new, recovery_token)
values ('d5000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'd5@example.test', extensions.crypt('password', extensions.gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false, '', '', '', '')
on conflict (id) do nothing;
insert into public.gm_profiles (id, user_id, experience_level, improv_comfort, prep_style) values ('d5100000-0000-0000-0000-000000000001', 'd5000000-0000-0000-0000-000000000001', 'experienced', 'mixed', 'light') on conflict do nothing;
insert into public.workspaces (id, owner_gm_id, name) values ('d5200000-0000-0000-0000-000000000001', 'd5000000-0000-0000-0000-000000000001', 'D5 Workspace') on conflict do nothing;
insert into public.worlds (id, workspace_id, owner_gm_id, name) values ('d5300000-0000-0000-0000-000000000001', 'd5200000-0000-0000-0000-000000000001', 'd5000000-0000-0000-0000-000000000001', 'D5 World') on conflict do nothing;
insert into public.world_eras (id, workspace_id, world_id, name) values ('d5400000-0000-0000-0000-000000000001', 'd5200000-0000-0000-0000-000000000001', 'd5300000-0000-0000-0000-000000000001', 'D5 Era') on conflict do nothing;
insert into public.sagas (id, workspace_id, world_id, owner_gm_id, primary_era_id, name) values
  ('d5500000-0000-0000-0000-000000000001', 'd5200000-0000-0000-0000-000000000001', 'd5300000-0000-0000-0000-000000000001', 'd5000000-0000-0000-0000-000000000001', 'd5400000-0000-0000-0000-000000000001', 'D5 Saga'),
  ('d5500000-0000-0000-0000-000000000002', 'd5200000-0000-0000-0000-000000000001', 'd5300000-0000-0000-0000-000000000001', 'd5000000-0000-0000-0000-000000000001', 'd5400000-0000-0000-0000-000000000001', 'Sibling Saga')
on conflict do nothing;

create temp table before_counts as select
  (select count(*) from public.characters) characters,
  (select count(*) from public.notes) notes,
  (select count(*) from public.threads) threads,
  (select count(*) from public.drafts) drafts,
  (select count(*) from public.draft_sources) draft_sources,
  (select count(*) from public.canon_audit) audits,
  (select count(*) from public.embeddings) embeddings,
  (select count(*) from internal.embedding_jobs) embedding_jobs,
  (select count(*) from internal.ai_task_runs) ai_runs,
  (select count(*) from public.usage_events) usage_events;

select has_function('public', 'save_import_inbox_source', array['uuid','uuid','uuid','uuid','text','text','text','bigint','text'], 'scoped import write RPC exists');
select has_function('public', 'get_import_inbox', array['uuid','uuid','uuid','boolean'], 'scoped import review RPC exists');
select has_function('public', 'set_import_source_state', array['uuid','uuid','uuid','uuid','text'], 'scoped import state RPC exists');
select has_function('public', 'begin_pdf_import', array['uuid','uuid','uuid','uuid','text','text','bigint'], 'scoped PDF upload registration RPC exists');
select has_function('public', 'claim_pdf_import_extraction', array['uuid','uuid','uuid','uuid','uuid'], 'owner-scoped PDF extraction claim RPC exists');
select has_function('public', 'complete_pdf_import_extraction_for_worker', array['uuid','uuid','uuid','text','text','text','integer','integer','text'], 'service PDF completion RPC exists');
select has_function('public', 'fail_pdf_import_extraction_for_worker', array['uuid','uuid','uuid','text','text','text','integer'], 'service PDF failure RPC exists');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'd5000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.saga_id', 'd5500000-0000-0000-0000-000000000001', true);

create temp table pasted as select public.save_import_inbox_source(
  'd5200000-0000-0000-0000-000000000001','d5300000-0000-0000-0000-000000000001','d5500000-0000-0000-0000-000000000001','d5600000-0000-0000-0000-000000000001',
  'paste', null, 'text/plain', 40, E'A substantial UTF-8 import: Héritage.\r\n'
) result;
select is((select result->>'state' from pasted), 'ready_for_review', 'pasted text becomes ready for review');
select is((select result->>'duplicate' from pasted), 'false', 'first import is not a duplicate');
select is(public.save_import_inbox_source('d5200000-0000-0000-0000-000000000001','d5300000-0000-0000-0000-000000000001','d5500000-0000-0000-0000-000000000001','d5600000-0000-0000-0000-000000000001','paste',null,'text/plain',40,E'A substantial UTF-8 import: Héritage.\r\n')->>'id', 'd5600000-0000-0000-0000-000000000001', 'exact retry returns one source');
select throws_like($$select public.save_import_inbox_source('d5200000-0000-0000-0000-000000000001','d5300000-0000-0000-0000-000000000001','d5500000-0000-0000-0000-000000000001','d5600000-0000-0000-0000-000000000001','paste',null,'text/plain',7,'Changed')$$, '%source key is already bound to a different import%', 'changed key reuse fails closed');

create temp table markdown as select public.save_import_inbox_source('d5200000-0000-0000-0000-000000000001','d5300000-0000-0000-0000-000000000001','d5500000-0000-0000-0000-000000000001','d5600000-0000-0000-0000-000000000002','markdown_file','lore.md','text/markdown',13,E'# Lore\n\nExact') result;
select is((select result->>'filename' from markdown), 'lore.md', 'Markdown filename is retained');
select is(public.save_import_inbox_source('d5200000-0000-0000-0000-000000000001','d5300000-0000-0000-0000-000000000001','d5500000-0000-0000-0000-000000000001','d5600000-0000-0000-0000-000000000003','markdown_file','copy.md','text/markdown',13,E'# Lore\n\nExact')->>'id', 'd5600000-0000-0000-0000-000000000002', 'duplicate content returns the original source');
select is(public.save_import_inbox_source('d5200000-0000-0000-0000-000000000001','d5300000-0000-0000-0000-000000000001','d5500000-0000-0000-0000-000000000001','d5600000-0000-0000-0000-000000000004','plain_text_file','notes.txt','text/plain',10,'Plain text')->>'state', 'ready_for_review', 'plain-text file intake succeeds');

select throws_like($$select public.save_import_inbox_source('d5200000-0000-0000-0000-000000000001','d5300000-0000-0000-0000-000000000001','d5500000-0000-0000-0000-000000000001',gen_random_uuid(),'paste',null,'text/plain',0,'')$$, '%content is required%', 'empty content is rejected');
select throws_like($$select public.save_import_inbox_source('d5200000-0000-0000-0000-000000000001','d5300000-0000-0000-0000-000000000001','d5500000-0000-0000-0000-000000000001',gen_random_uuid(),'pdf_file','bad.pdf','application/pdf',4,'PDF!')$$, '%unsupported import method%', 'unsupported type is rejected');
select throws_like($$select public.save_import_inbox_source('d5200000-0000-0000-0000-000000000001','d5300000-0000-0000-0000-000000000001','d5500000-0000-0000-0000-000000000001',gen_random_uuid(),'markdown_file','bad.md','application/pdf',5,'# Bad')$$, '%MIME type does not match%', 'MIME mismatch is rejected');
select throws_like($$select public.save_import_inbox_source('d5200000-0000-0000-0000-000000000001','d5300000-0000-0000-0000-000000000001','d5500000-0000-0000-0000-000000000001',gen_random_uuid(),'markdown_file','../bad.md','text/markdown',5,'# Bad')$$, '%filename is unsafe%', 'unsafe filename is rejected');
select throws_like($$select public.save_import_inbox_source('d5200000-0000-0000-0000-000000000001','d5300000-0000-0000-0000-000000000001','d5500000-0000-0000-0000-000000000001',gen_random_uuid(),'plain_text_file','huge.txt','text/plain',1048577,repeat('x',1048577))$$, '%too large%', 'oversized file is rejected');
select throws_like($$select public.save_import_inbox_source('d5200000-0000-0000-0000-000000000001','d5300000-0000-0000-0000-000000000001','d5500000-0000-0000-0000-000000000001',gen_random_uuid(),'plain_text_file','bad.txt','text/plain',7,'bad' || chr(1) || 'txt')$$, '%malformed text%', 'malformed control content is rejected');
select throws_like($$select public.save_import_inbox_source('d5200000-0000-0000-0000-000000000001','d5300000-0000-0000-0000-000000000001','d5500000-0000-0000-0000-000000000001',gen_random_uuid(),'plain_text_file','bad.md','text/plain',5,'wrong')$$, '%filename does not match%', 'incorrect file extension is rejected');
select throws_like($$select public.save_import_inbox_source('d5200000-0000-0000-0000-000000000001','d5300000-0000-0000-0000-000000000001','d5500000-0000-0000-0000-000000000002','d5600000-0000-0000-0000-000000000001','paste',null,'text/plain',40,E'A substantial UTF-8 import: Héritage.\r\n')$$, '%source key is already bound to a different import%', 'sibling Saga cannot substitute the same source key');

reset role;
update public.workspaces set usage_limits = usage_limits || '{"imports_monthly":3,"alpha_soft_limit":false}'::jsonb where id='d5200000-0000-0000-0000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub', 'd5000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.saga_id', 'd5500000-0000-0000-0000-000000000001', true);
select throws_like($$select public.save_import_inbox_source('d5200000-0000-0000-0000-000000000001','d5300000-0000-0000-0000-000000000001','d5500000-0000-0000-0000-000000000001',gen_random_uuid(),'paste',null,'text/plain',16,'Quota-safe draft')$$, '%monthly import quota reached%', 'hard import quota stops intake with a manual fallback');

select is((public.get_import_inbox('d5200000-0000-0000-0000-000000000001','d5300000-0000-0000-0000-000000000001','d5500000-0000-0000-0000-000000000001',false)->0->>'content'), 'Plain text', 'review returns original imported content');
select ok((public.get_import_inbox('d5200000-0000-0000-0000-000000000001','d5300000-0000-0000-0000-000000000001','d5500000-0000-0000-0000-000000000001',false)->0) ?& array['workspace_id','world_id','saga_id','uploader_id','mime_type','byte_size','ingestion_method','created_at','ready_at'], 'review exposes complete provenance');
select is(public.set_import_source_state('d5200000-0000-0000-0000-000000000001','d5300000-0000-0000-0000-000000000001','d5500000-0000-0000-0000-000000000001','d5600000-0000-0000-0000-000000000002','archived')->>'state', 'archived', 'ready import can be archived');
select is(public.set_import_source_state('d5200000-0000-0000-0000-000000000001','d5300000-0000-0000-0000-000000000001','d5500000-0000-0000-0000-000000000001','d5600000-0000-0000-0000-000000000002','ready_for_review')->>'state', 'ready_for_review', 'archived import can be restored for review');
select throws_like($$select public.set_import_source_state('d5200000-0000-0000-0000-000000000001','d5300000-0000-0000-0000-000000000001','d5500000-0000-0000-0000-000000000002','d5600000-0000-0000-0000-000000000002','archived')$$, '%import is not available%', 'sibling Saga cannot transition an import');
reset role;

select is((select public from storage.buckets where id='attachments'),false,'attachment originals remain in a private bucket');
select is((select file_size_limit from storage.buckets where id='attachments'),10485760::bigint,'attachment bucket enforces the ten MiB MVP boundary');
select ok((select allowed_mime_types @> array['application/pdf','image/jpeg','image/png','image/webp'] from storage.buckets where id='attachments'),'attachment bucket permits only the bounded PDF and static-image MIME set');

update public.workspaces set usage_limits=usage_limits||'{"imports_monthly":100}'::jsonb where id='d5200000-0000-0000-0000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub','d5000000-0000-0000-0000-000000000001',true);
select set_config('request.jwt.claim.saga_id','d5500000-0000-0000-0000-000000000001',true);
create temp table pdf_begin as select public.begin_pdf_import(
  'd5200000-0000-0000-0000-000000000001','d5300000-0000-0000-0000-000000000001','d5500000-0000-0000-0000-000000000001',
  'd5600000-0000-0000-0000-000000000005','campaign.pdf','application/pdf',2462
) result;
select is((select result->>'state' from pdf_begin),'uploading','PDF registration creates only an uploading non-canon source');
select is((select result->>'storage_path' from pdf_begin),'d5200000-0000-0000-0000-000000000001/d5300000-0000-0000-0000-000000000001/d5500000-0000-0000-0000-000000000001/imports/d5600000-0000-0000-0000-000000000005/original.pdf','PDF original path is deterministic and Saga-scoped');
select ok(public.attachment_object_write_allowed((select result->>'storage_path' from pdf_begin)),'pending owner PDF path is writable through Storage RLS');
select is(public.begin_pdf_import('d5200000-0000-0000-0000-000000000001','d5300000-0000-0000-0000-000000000001','d5500000-0000-0000-0000-000000000001','d5600000-0000-0000-0000-000000000005','campaign.pdf','application/pdf',2462)->>'replayed','true','exact PDF registration retry reuses its source and path');
select throws_like($$select public.begin_pdf_import('d5200000-0000-0000-0000-000000000001','d5300000-0000-0000-0000-000000000001','d5500000-0000-0000-0000-000000000001',gen_random_uuid(),'campaign.pdf','text/plain',2462)$$,'%does not match PDF%','PDF MIME mismatch fails before Storage registration');
select throws_like($$select public.begin_pdf_import('d5200000-0000-0000-0000-000000000001','d5300000-0000-0000-0000-000000000001','d5500000-0000-0000-0000-000000000001',gen_random_uuid(),'campaign.pdf','application/pdf',10485761)$$,'%too large%','oversized PDF fails before Storage registration');
select is(public.begin_pdf_import('d5200000-0000-0000-0000-000000000001','d5300000-0000-0000-0000-000000000001','d5500000-0000-0000-0000-000000000002','d5600000-0000-0000-0000-000000000007','campaign.pdf','application/pdf',2462)->>'state','uploading','authorized sibling PDF registration remains a separately scoped source');
select is(public.claim_pdf_import_extraction('d5200000-0000-0000-0000-000000000001','d5300000-0000-0000-0000-000000000001','d5500000-0000-0000-0000-000000000001','d5600000-0000-0000-0000-000000000005','d5700000-0000-0000-0000-000000000001')->>'id','d5600000-0000-0000-0000-000000000005','owner can claim the registered PDF extraction attempt');
select is((select import_state::text from public.sources where id='d5600000-0000-0000-0000-000000000005'),'extracting','claim advances PDF into extracting state');
select throws_like($$select public.claim_pdf_import_extraction('d5200000-0000-0000-0000-000000000001','d5300000-0000-0000-0000-000000000001','d5500000-0000-0000-0000-000000000002','d5600000-0000-0000-0000-000000000005',gen_random_uuid())$$,'%not available%','sibling Saga cannot claim another Saga PDF extraction');
reset role;

create temp table pdf_complete as select public.complete_pdf_import_extraction_for_worker(
  'd5600000-0000-0000-0000-000000000005','d5000000-0000-0000-0000-000000000001','d5700000-0000-0000-0000-000000000001',repeat('a',64),
  'PDF extracted lore',encode(extensions.digest(convert_to('PDF extracted lore','UTF8'),'sha256'),'hex'),2,18,'pdfjs-5.4.149/relic-1'
) result;
select is((select result->>'state' from pdf_complete),'ready_for_review','validated PDF extraction becomes reviewable');
select is((select raw_excerpt from public.sources where id='d5600000-0000-0000-0000-000000000005'),'PDF extracted lore','only derived PDF text enters the Import Inbox source');
select ok((select original_sha256=repeat('a',64) and extraction_version='pdfjs-5.4.149/relic-1' and page_count=2 and extracted_characters=18 and ready_at is not null from public.sources where id='d5600000-0000-0000-0000-000000000005'),'PDF provenance freezes original hash, extractor version, page count, character count, and ready time');
select ok(not public.attachment_object_write_allowed((select storage_path from public.sources where id='d5600000-0000-0000-0000-000000000005')),'ready PDF original cannot be overwritten or deleted through browser Storage RLS');
select throws_like($$select public.complete_pdf_import_extraction_for_worker('d5600000-0000-0000-0000-000000000005','d5000000-0000-0000-0000-000000000001','d5700000-0000-0000-0000-000000000001',repeat('a',64),'PDF extracted lore',encode(extensions.digest(convert_to('PDF extracted lore','UTF8'),'sha256'),'hex'),2,18,'pdfjs-5.4.149/relic-1')$$,'%stale or unavailable%','completed extraction cannot be replayed into mutable provenance');

set local role authenticated;
select set_config('request.jwt.claim.sub','d5000000-0000-0000-0000-000000000001',true);
select set_config('request.jwt.claim.saga_id','d5500000-0000-0000-0000-000000000001',true);
select is(public.begin_pdf_import('d5200000-0000-0000-0000-000000000001','d5300000-0000-0000-0000-000000000001','d5500000-0000-0000-0000-000000000001','d5600000-0000-0000-0000-000000000006','scan.pdf','application/pdf',4637)->>'state','uploading','second PDF registers independently');
select is(public.claim_pdf_import_extraction('d5200000-0000-0000-0000-000000000001','d5300000-0000-0000-0000-000000000001','d5500000-0000-0000-0000-000000000001','d5600000-0000-0000-0000-000000000006','d5700000-0000-0000-0000-000000000002')->>'id','d5600000-0000-0000-0000-000000000006','second PDF extraction is independently claimed');
reset role;
select is(public.fail_pdf_import_extraction_for_worker('d5600000-0000-0000-0000-000000000006','d5000000-0000-0000-0000-000000000001','d5700000-0000-0000-0000-000000000002','rejected','no_extractable_text',repeat('b',64),1)->>'state','rejected','image-only PDF records a stable safe rejection');
select is((select failure_code from public.sources where id='d5600000-0000-0000-0000-000000000006'),'no_extractable_text','safe PDF rejection retains its stable failure code');
set local role authenticated;
select set_config('request.jwt.claim.sub','d5000000-0000-0000-0000-000000000001',true);
select set_config('request.jwt.claim.saga_id','d5500000-0000-0000-0000-000000000001',true);
select throws_like($$select public.claim_pdf_import_extraction('d5200000-0000-0000-0000-000000000001','d5300000-0000-0000-0000-000000000001','d5500000-0000-0000-0000-000000000001','d5600000-0000-0000-0000-000000000006',gen_random_uuid())$$,'%cannot be extracted%','terminal rejected PDF requires explicit replacement rather than unsafe retry');
reset role;
select ok(not has_function_privilege('anon','public.begin_pdf_import(uuid,uuid,uuid,uuid,text,text,bigint)','execute'),'anonymous PDF registration is denied');
select ok(not has_function_privilege('authenticated','public.complete_pdf_import_extraction_for_worker(uuid,uuid,uuid,text,text,text,integer,integer,text)','execute'),'browser role cannot forge a completed extraction');
select throws_like($$update public.sources set raw_excerpt='changed PDF text' where id='d5600000-0000-0000-0000-000000000005'$$,'%ready import provenance is immutable%','ready PDF derived text cannot be changed');

select is((select uploader_id from public.sources where id='d5600000-0000-0000-0000-000000000001'), 'd5000000-0000-0000-0000-000000000001'::uuid, 'uploader provenance is immutable and exact');
select is((select raw_excerpt from public.sources where id='d5600000-0000-0000-0000-000000000001'), E'A substantial UTF-8 import: Héritage.\r\n', 'UTF-8 and line endings remain exact');
select throws_like($$update public.sources set raw_excerpt='mutated' where id='d5600000-0000-0000-0000-000000000001'$$, '%import provenance is immutable%', 'raw import content cannot be changed');
select is((select count(*) from public.characters), (select characters from before_counts), 'import writes no canon entity');
select is((select count(*) from public.notes), (select notes from before_counts), 'import writes no Note');
select is((select count(*) from public.threads), (select threads from before_counts), 'import writes no Thread');
select is((select count(*) from public.drafts), (select drafts from before_counts), 'import writes no Approval Queue proposal');
select is((select count(*) from public.draft_sources), (select draft_sources from before_counts), 'import links no proposal sources');
select is((select count(*) from public.canon_audit), (select audits from before_counts), 'import writes no canon audit');
select is((select count(*) from public.embeddings), (select embeddings from before_counts), 'import writes no embedding');
select is((select count(*) from internal.embedding_jobs), (select embedding_jobs from before_counts), 'import queues no embedding');
select is((select count(*) from internal.ai_task_runs), (select ai_runs from before_counts), 'import starts no AI run');
select is((select count(*) from public.usage_events), (select usage_events from before_counts), 'import creates no usage charge');
select ok(not has_function_privilege('anon','public.save_import_inbox_source(uuid,uuid,uuid,uuid,text,text,text,bigint,text)','execute'), 'anonymous import is denied');

select * from finish();
rollback;

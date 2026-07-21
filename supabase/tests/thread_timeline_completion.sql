create extension if not exists pgtap with schema extensions;

begin;
select plan(43);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, email_change, email_change_token_new, recovery_token)
values
  ('d3000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','d3-owner@example.test',extensions.crypt('password',extensions.gen_salt('bf')),now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false,'','','',''),
  ('d3000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','d3-other@example.test',extensions.crypt('password',extensions.gen_salt('bf')),now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false,'','','','')
on conflict (id) do nothing;

insert into public.workspaces(id,owner_gm_id,name) values
  ('d3100000-0000-0000-0000-000000000001','d3000000-0000-0000-0000-000000000001','D3 Workspace'),
  ('d3100000-0000-0000-0000-000000000002','d3000000-0000-0000-0000-000000000002','D3 Other Workspace') on conflict do nothing;
insert into public.worlds(id,workspace_id,owner_gm_id,name) values
  ('d3200000-0000-0000-0000-000000000001','d3100000-0000-0000-0000-000000000001','d3000000-0000-0000-0000-000000000001','D3 World'),
  ('d3200000-0000-0000-0000-000000000002','d3100000-0000-0000-0000-000000000002','d3000000-0000-0000-0000-000000000002','D3 Other World') on conflict do nothing;
insert into public.sagas(id,workspace_id,world_id,owner_gm_id,name) values
  ('d3300000-0000-0000-0000-000000000001','d3100000-0000-0000-0000-000000000001','d3200000-0000-0000-0000-000000000001','d3000000-0000-0000-0000-000000000001','D3 Saga'),
  ('d3300000-0000-0000-0000-000000000002','d3100000-0000-0000-0000-000000000001','d3200000-0000-0000-0000-000000000001','d3000000-0000-0000-0000-000000000001','D3 Sibling Saga'),
  ('d3300000-0000-0000-0000-000000000003','d3100000-0000-0000-0000-000000000002','d3200000-0000-0000-0000-000000000002','d3000000-0000-0000-0000-000000000002','D3 Other Saga') on conflict do nothing;

insert into public.sessions(id,workspace_id,world_id,saga_id,scope,name,session_number,status,created_at) values
  ('d3400000-0000-0000-0000-000000000001','d3100000-0000-0000-0000-000000000001','d3200000-0000-0000-0000-000000000001','d3300000-0000-0000-0000-000000000001','saga','Session 1',1,'ended','2026-07-01T18:00:00Z'),
  ('d3400000-0000-0000-0000-000000000002','d3100000-0000-0000-0000-000000000001','d3200000-0000-0000-0000-000000000001','d3300000-0000-0000-0000-000000000001','saga','Session 2',2,'ended','2026-07-05T18:00:00Z'),
  ('d3400000-0000-0000-0000-000000000003','d3100000-0000-0000-0000-000000000001','d3200000-0000-0000-0000-000000000001','d3300000-0000-0000-0000-000000000001','saga','Session 3',3,'ended','2026-07-09T18:00:00Z'),
  ('d3400000-0000-0000-0000-000000000004','d3100000-0000-0000-0000-000000000001','d3200000-0000-0000-0000-000000000001','d3300000-0000-0000-0000-000000000001','saga','Session 4',4,'ended','2026-07-13T18:00:00Z'),
  ('d3400000-0000-0000-0000-000000000005','d3100000-0000-0000-0000-000000000001','d3200000-0000-0000-0000-000000000001','d3300000-0000-0000-0000-000000000001','saga','Session 5',5,'ended','2026-07-17T18:00:00Z') on conflict do nothing;

insert into public.threads(id,workspace_id,world_id,saga_id,scope,name,summary,resolution_state,is_loose_thread,canon_state,created_at,updated_at) values
  ('d3500000-0000-0000-0000-000000000001','d3100000-0000-0000-0000-000000000001','d3200000-0000-0000-0000-000000000001','d3300000-0000-0000-0000-000000000001','saga','The Glass Crown','A five-session fixture.','active',true,'canon','2026-07-01T18:00:00Z','2026-07-01T18:00:00Z'),
  ('d3500000-0000-0000-0000-000000000002','d3100000-0000-0000-0000-000000000001','d3200000-0000-0000-0000-000000000001','d3300000-0000-0000-0000-000000000002','saga','Sibling Secret','Must not leak.','active',false,'canon',now(),now()) on conflict do nothing;
insert into public.characters(id,workspace_id,world_id,saga_id,scope,name,summary,canon_state) values
  ('d3600000-0000-0000-0000-000000000001','d3100000-0000-0000-0000-000000000001','d3200000-0000-0000-0000-000000000001','d3300000-0000-0000-0000-000000000001','saga','Mara Vale','Related character.','canon'),
  ('d3600000-0000-0000-0000-000000000002','d3100000-0000-0000-0000-000000000001','d3200000-0000-0000-0000-000000000001','d3300000-0000-0000-0000-000000000002','saga','Sibling Character','Must not link.','canon') on conflict do nothing;

set local role authenticated;
select set_config('request.jwt.claim.sub','d3000000-0000-0000-0000-000000000001',true);
select set_config('request.jwt.claim.saga_id','d3300000-0000-0000-0000-000000000001',true);

select has_function('public','update_thread_details',array['uuid','uuid','uuid','uuid','timestamp with time zone','text','text','text','text','uuid'],'D3 Thread detail write has an optimistic scoped signature');
select has_function('public','mutate_thread_objective',array['uuid','uuid','uuid','uuid','timestamp with time zone','text','uuid','text','integer','uuid'],'D3 objective mutation has an optimistic scoped signature');
select has_function('public','get_thread_detail',array['uuid','uuid','uuid','uuid'],'D3 detail read is scoped');
select has_function('public','get_thread_timeline',array['uuid','uuid','uuid','uuid'],'D3 derived timeline read is scoped');

select lives_ok($$select public.update_thread_details('d3100000-0000-0000-0000-000000000001','d3200000-0000-0000-0000-000000000001','d3300000-0000-0000-0000-000000000001','d3500000-0000-0000-0000-000000000001',(select updated_at from public.threads where id='d3500000-0000-0000-0000-000000000001'),'The Glass Crown','The crown stirs.','active','', 'd3400000-0000-0000-0000-000000000002')$$,'Loose Thread becomes Active in Session 2');
select is((select is_loose_thread from public.threads where id='d3500000-0000-0000-0000-000000000001'),false,'Active transition clears Loose grouping');

create temp table d3_first as select public.mutate_thread_objective('d3100000-0000-0000-0000-000000000001','d3200000-0000-0000-0000-000000000001','d3300000-0000-0000-0000-000000000001','d3500000-0000-0000-0000-000000000001',(select updated_at from public.threads where id='d3500000-0000-0000-0000-000000000001'),'create',null,'Find the map',null,'d3400000-0000-0000-0000-000000000002') payload;
create temp table d3_second as select public.mutate_thread_objective('d3100000-0000-0000-0000-000000000001','d3200000-0000-0000-0000-000000000001','d3300000-0000-0000-0000-000000000001','d3500000-0000-0000-0000-000000000001',(select updated_at from public.threads where id='d3500000-0000-0000-0000-000000000001'),'create',null,'Cross the bridge',null,'d3400000-0000-0000-0000-000000000002') payload;
select is(jsonb_array_length((select objectives_log from public.threads where id='d3500000-0000-0000-0000-000000000001')),2,'objectives create');
select is((select payload->>'state' from d3_first),'open','new objective starts open');
select isnt((select payload->>'id' from d3_first),null,'new objective receives a stable ID');

select lives_ok(format($q$select public.mutate_thread_objective('d3100000-0000-0000-0000-000000000001','d3200000-0000-0000-0000-000000000001','d3300000-0000-0000-0000-000000000001','d3500000-0000-0000-0000-000000000001',(select updated_at from public.threads where id='d3500000-0000-0000-0000-000000000001'),'edit','%s','Find the hidden map',null,'d3400000-0000-0000-0000-000000000002')$q$,(select payload->>'id' from d3_first)),'objective edits');
select is((select item->>'text' from public.threads t,jsonb_array_elements(t.objectives_log) item where t.id='d3500000-0000-0000-0000-000000000001' and item->>'id'=(select payload->>'id' from d3_first)),'Find the hidden map','objective edit persists');
select lives_ok(format($q$select public.mutate_thread_objective('d3100000-0000-0000-0000-000000000001','d3200000-0000-0000-0000-000000000001','d3300000-0000-0000-0000-000000000001','d3500000-0000-0000-0000-000000000001',(select updated_at from public.threads where id='d3500000-0000-0000-0000-000000000001'),'complete','%s',null,null,'d3400000-0000-0000-0000-000000000003')$q$,(select payload->>'id' from d3_first)),'objective completes in Session 3');
select is((select item->>'state' from public.threads t,jsonb_array_elements(t.objectives_log) item where t.id='d3500000-0000-0000-0000-000000000001' and item->>'id'=(select payload->>'id' from d3_first)),'completed','completion sets state');
select isnt((select item->>'completed_at' from public.threads t,jsonb_array_elements(t.objectives_log) item where t.id='d3500000-0000-0000-0000-000000000001' and item->>'id'=(select payload->>'id' from d3_first)),null,'completion persists completed_at');
select lives_ok(format($q$select public.mutate_thread_objective('d3100000-0000-0000-0000-000000000001','d3200000-0000-0000-0000-000000000001','d3300000-0000-0000-0000-000000000001','d3500000-0000-0000-0000-000000000001',(select updated_at from public.threads where id='d3500000-0000-0000-0000-000000000001'),'reopen','%s',null,null,'d3400000-0000-0000-0000-000000000004')$q$,(select payload->>'id' from d3_first)),'objective reopens in Session 4');
select is((select item->>'state' from public.threads t,jsonb_array_elements(t.objectives_log) item where t.id='d3500000-0000-0000-0000-000000000001' and item->>'id'=(select payload->>'id' from d3_first)),'open','reopen restores open state');
select is((select item->>'completed_at' from public.threads t,jsonb_array_elements(t.objectives_log) item where t.id='d3500000-0000-0000-0000-000000000001' and item->>'id'=(select payload->>'id' from d3_first)),null,'reopen clears completed_at');
select lives_ok(format($q$select public.mutate_thread_objective('d3100000-0000-0000-0000-000000000001','d3200000-0000-0000-0000-000000000001','d3300000-0000-0000-0000-000000000001','d3500000-0000-0000-0000-000000000001',(select updated_at from public.threads where id='d3500000-0000-0000-0000-000000000001'),'move','%s',null,0,'d3400000-0000-0000-0000-000000000004')$q$,(select payload->>'id' from d3_second)),'objective ordering updates');
select is((select objectives_log->0->>'id' from public.threads where id='d3500000-0000-0000-0000-000000000001'),(select payload->>'id' from d3_second),'moved objective persists first');

set local role postgres;
select lives_ok($$insert into public.session_active_threads(workspace_id,world_id,saga_id,session_id,thread_id) values('d3100000-0000-0000-0000-000000000001','d3200000-0000-0000-0000-000000000001','d3300000-0000-0000-0000-000000000001','d3400000-0000-0000-0000-000000000004','d3500000-0000-0000-0000-000000000001')$$,'Session 4 pins the Thread as active');
set local role authenticated;
select set_config('request.jwt.claim.sub','d3000000-0000-0000-0000-000000000001',true);
select lives_ok($$select public.create_relationship('d3100000-0000-0000-0000-000000000001','d3200000-0000-0000-0000-000000000001','d3300000-0000-0000-0000-000000000001','thread','d3500000-0000-0000-0000-000000000001','character','d3600000-0000-0000-0000-000000000001','related-to','Crown witness')$$,'D2 contract adds a related entity');
select is(jsonb_array_length(public.get_thread_detail('d3100000-0000-0000-0000-000000000001','d3200000-0000-0000-0000-000000000001','d3300000-0000-0000-0000-000000000001','d3500000-0000-0000-0000-000000000001')->'relationships'),1,'Thread detail returns D2 relationships');
select lives_ok($$select public.delete_relationship('d3100000-0000-0000-0000-000000000001','d3200000-0000-0000-0000-000000000001','d3300000-0000-0000-0000-000000000001',(select id from public.relationships where from_entity_id='d3500000-0000-0000-0000-000000000001'))$$,'D2 contract removes a related entity');
select is(jsonb_array_length(public.get_thread_detail('d3100000-0000-0000-0000-000000000001','d3200000-0000-0000-0000-000000000001','d3300000-0000-0000-0000-000000000001','d3500000-0000-0000-0000-000000000001')->'relationships'),0,'removed relationship leaves detail');
select throws_like($$select public.create_relationship('d3100000-0000-0000-0000-000000000001','d3200000-0000-0000-0000-000000000001','d3300000-0000-0000-0000-000000000001','thread','d3500000-0000-0000-0000-000000000001','character','d3600000-0000-0000-0000-000000000002','related-to',null)$$,'%outside%','related entity substitution cannot cross into sibling Saga');

select lives_ok($$select public.update_thread_details('d3100000-0000-0000-0000-000000000001','d3200000-0000-0000-0000-000000000001','d3300000-0000-0000-0000-000000000001','d3500000-0000-0000-0000-000000000001',(select updated_at from public.threads where id='d3500000-0000-0000-0000-000000000001'),'The Glass Crown','The crown was lost.','failed','The party abandoned the crown.','d3400000-0000-0000-0000-000000000005')$$,'Thread enters Failed with an explanation');
select is((select resolution_state from public.threads where id='d3500000-0000-0000-0000-000000000001'),'failed','Failed state persists');
select is((select resolution_details from public.threads where id='d3500000-0000-0000-0000-000000000001'),'The party abandoned the crown.','resolution details persist');
select lives_ok($$select public.update_thread_details('d3100000-0000-0000-0000-000000000001','d3200000-0000-0000-0000-000000000001','d3300000-0000-0000-0000-000000000001','d3500000-0000-0000-0000-000000000001',(select updated_at from public.threads where id='d3500000-0000-0000-0000-000000000001'),'The Glass Crown','The crown was found.','resolved','Mara returned it to the rightful heir.','d3400000-0000-0000-0000-000000000005')$$,'Failed Thread can transition to Resolved');
select is((select resolution_state from public.threads where id='d3500000-0000-0000-0000-000000000001'),'resolved','Resolved state persists');

create temp table d3_timeline as select value entry, ordinality from jsonb_array_elements(public.get_thread_timeline('d3100000-0000-0000-0000-000000000001','d3200000-0000-0000-0000-000000000001','d3300000-0000-0000-0000-000000000001','d3500000-0000-0000-0000-000000000001')) with ordinality;
select ok(exists(select 1 from d3_timeline where entry->>'event_type'='session_pinned' and entry->>'session_number'='4'),'Session pin history is derived');
select ok(exists(select 1 from d3_timeline where entry->>'event_type'='objective_completed' and entry->>'session_number'='3'),'objective completion transition renders at Session 3');
select ok(exists(select 1 from d3_timeline where entry->>'event_type'='objective_reopened' and entry->>'session_number'='4'),'objective reopen transition renders at Session 4');
select ok(exists(select 1 from d3_timeline where entry->>'event_type'='thread_failed' and entry->>'session_number'='5'),'Failed transition renders at Session 5');
select ok(not exists(select 1 from d3_timeline a join d3_timeline b on b.ordinality=a.ordinality+1 where (a.entry->>'session_number')::int>(b.entry->>'session_number')::int),'timeline is ordered by Session then evidence time');
select ok(not exists(select 1 from d3_timeline where nullif(entry->>'source_type','') is null or nullif(entry->>'source_id','') is null),'every timeline entry is source-aware and traceable');
select ok(not exists(select 1 from information_schema.tables where table_schema='public' and table_name in ('thread_timeline','timeline_events')),'timeline has no second editable history table');

select throws_like($$select public.update_thread_details('d3100000-0000-0000-0000-000000000001','d3200000-0000-0000-0000-000000000001','d3300000-0000-0000-0000-000000000001','d3500000-0000-0000-0000-000000000001','2026-07-01T18:00:00Z','Stale title','stale','active','',null)$$,'%conflict%','stale Thread update cannot silently overwrite');
select throws_like($$select public.get_thread_detail('d3100000-0000-0000-0000-000000000001','d3200000-0000-0000-0000-000000000001','d3300000-0000-0000-0000-000000000001','d3500000-0000-0000-0000-000000000002')$$,'%not available%','sibling-Saga Thread detail is denied');
select throws_like($$select public.mutate_thread_objective('d3100000-0000-0000-0000-000000000001','d3200000-0000-0000-0000-000000000001','d3300000-0000-0000-0000-000000000001','d3500000-0000-0000-0000-000000000002',now(),'create',null,'Leak',null,null)$$,'%not available%','sibling-Saga objective write is denied');
select throws_like($$select public.update_thread_details('d3100000-0000-0000-0000-000000000001','d3200000-0000-0000-0000-000000000001','d3300000-0000-0000-0000-000000000001','d3500000-0000-0000-0000-000000000001',(select updated_at from public.threads where id='d3500000-0000-0000-0000-000000000001'),'Bad state','Bad state','deleted','',null)$$,'%state%','unsupported Thread state is denied');
set local role anon;
select throws_ok($$select public.get_thread_timeline('d3100000-0000-0000-0000-000000000001','d3200000-0000-0000-0000-000000000001','d3300000-0000-0000-0000-000000000001','d3500000-0000-0000-0000-000000000001')$$,'42501','permission denied for function get_thread_timeline','anonymous timeline read is denied');
select throws_ok($$select public.update_thread_details('d3100000-0000-0000-0000-000000000001','d3200000-0000-0000-0000-000000000001','d3300000-0000-0000-0000-000000000001','d3500000-0000-0000-0000-000000000001',now(),'No','No','active','',null)$$,'42501','permission denied for function update_thread_details','anonymous Thread write is denied');

select * from finish();
rollback;

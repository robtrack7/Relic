create extension if not exists pgtap with schema extensions;

begin;

select plan(42);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, email_change, email_change_token_new, recovery_token)
values
  ('d2000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'd2-owner@example.test', extensions.crypt('password', extensions.gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false, '', '', '', ''),
  ('d2000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'd2-other@example.test', extensions.crypt('password', extensions.gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false, '', '', '', '')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_gm_id, name) values
  ('d2100000-0000-0000-0000-000000000001', 'd2000000-0000-0000-0000-000000000001', 'D2 Workspace'),
  ('d2100000-0000-0000-0000-000000000002', 'd2000000-0000-0000-0000-000000000002', 'D2 Private Workspace')
on conflict (id) do nothing;
insert into public.worlds (id, workspace_id, owner_gm_id, name) values
  ('d2200000-0000-0000-0000-000000000001', 'd2100000-0000-0000-0000-000000000001', 'd2000000-0000-0000-0000-000000000001', 'D2 World'),
  ('d2200000-0000-0000-0000-000000000002', 'd2100000-0000-0000-0000-000000000002', 'd2000000-0000-0000-0000-000000000002', 'D2 Private World')
on conflict (id) do nothing;
insert into public.sagas (id, workspace_id, world_id, owner_gm_id, name) values
  ('d2300000-0000-0000-0000-000000000001', 'd2100000-0000-0000-0000-000000000001', 'd2200000-0000-0000-0000-000000000001', 'd2000000-0000-0000-0000-000000000001', 'D2 Saga'),
  ('d2300000-0000-0000-0000-000000000002', 'd2100000-0000-0000-0000-000000000001', 'd2200000-0000-0000-0000-000000000001', 'd2000000-0000-0000-0000-000000000001', 'D2 Sibling Saga'),
  ('d2300000-0000-0000-0000-000000000003', 'd2100000-0000-0000-0000-000000000002', 'd2200000-0000-0000-0000-000000000002', 'd2000000-0000-0000-0000-000000000002', 'D2 Private Saga')
on conflict (id) do nothing;

insert into public.characters (id, workspace_id, world_id, saga_id, scope, name, summary, narrative) values
  ('d2400000-0000-0000-0000-000000000001', 'd2100000-0000-0000-0000-000000000001', 'd2200000-0000-0000-0000-000000000001', 'd2300000-0000-0000-0000-000000000001', 'saga', 'Mara Vale', 'A careful scout.', 'Mara knows the bridge.'),
  ('d2400000-0000-0000-0000-000000000002', 'd2100000-0000-0000-0000-000000000001', 'd2200000-0000-0000-0000-000000000001', 'd2300000-0000-0000-0000-000000000002', 'saga', 'Sibling Secret', 'Must stay hidden.', 'Private sibling canon.'),
  ('d2400000-0000-0000-0000-000000000003', 'd2100000-0000-0000-0000-000000000002', 'd2200000-0000-0000-0000-000000000002', 'd2300000-0000-0000-0000-000000000003', 'saga', 'Other Owner', 'Must stay hidden.', 'Private owner canon.')
on conflict (id) do nothing;
insert into public.places (id, workspace_id, world_id, saga_id, scope, name, summary, narrative) values
  ('d2500000-0000-0000-0000-000000000001', 'd2100000-0000-0000-0000-000000000001', 'd2200000-0000-0000-0000-000000000001', 'd2300000-0000-0000-0000-000000000001', 'saga', 'Glass Bridge', 'A bright crossing.', 'The bridge spans the ravine.')
on conflict (id) do nothing;
insert into public.notes (id, workspace_id, world_id, saga_id, scope, note_type, title, body) values
  ('d2600000-0000-0000-0000-000000000001', 'd2100000-0000-0000-0000-000000000001', 'd2200000-0000-0000-0000-000000000001', 'd2300000-0000-0000-0000-000000000001', 'saga', 'lore', 'Bridge Lore', 'Mara Vale crossed the Glass Bridge.')
on conflict (id) do nothing;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'd2000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.saga_id', 'd2300000-0000-0000-0000-000000000001', true);

select has_function('public', 'get_library_record_detail', array['uuid','uuid','uuid','text','uuid'], 'D2 detail read has a scoped browser signature');
select has_function('public', 'restore_entity', array['uuid','uuid','uuid','text','uuid','timestamptz'], 'D2 restore has an optimistic scoped signature');
select has_function('public', 'hard_delete_entity', array['uuid','uuid','uuid','text','uuid','timestamptz','text'], 'D2 hard delete requires scope, version, and typed title');
select has_function('public', 'create_relationship', array['uuid','uuid','uuid','text','uuid','text','uuid','public.relationship_kind','text'], 'D2 relationship create is scoped');
select has_function('public', 'delete_relationship', array['uuid','uuid','uuid','uuid'], 'D2 relationship removal is scoped');
select has_function('public', 'resolve_mention', array['uuid','uuid','uuid','uuid','public.mention_state'], 'D2 mention decision is scoped');
select has_function('public', 'create_note_attachment', array['uuid','uuid','uuid','uuid','text','uuid'], 'D2 note attachment create is scoped');
select has_function('public', 'delete_note_attachment', array['uuid','uuid','uuid','uuid'], 'D2 note attachment removal is scoped');

create temp table d2_detail as select public.get_library_record_detail('d2100000-0000-0000-0000-000000000001','d2200000-0000-0000-0000-000000000001','d2300000-0000-0000-0000-000000000001','character','d2400000-0000-0000-0000-000000000001') payload;
select is(payload #>> '{record,name}', 'Mara Vale', 'detail returns the scoped record') from d2_detail;
select ok(payload ? 'provenance' and payload ? 'relationships' and payload ? 'mentions' and payload ? 'backlinks' and payload ? 'candidates', 'detail returns every D2 inspector collection') from d2_detail;
select ok(not (payload::text like '%Sibling Secret%') and not (payload::text like '%Other Owner%'), 'detail candidates exclude sibling Sagas and other owners') from d2_detail;

select lives_ok($$ select public.update_entity('d2100000-0000-0000-0000-000000000001','d2200000-0000-0000-0000-000000000001','d2300000-0000-0000-0000-000000000001','character','d2400000-0000-0000-0000-000000000001',jsonb_build_object('name','Mara Vale','summary','A careful scout.','narrative','Mara crossed the Glass Bridge.','gm_notes','','expected_version',(select updated_at from public.characters where id='d2400000-0000-0000-0000-000000000001'))) $$, 'autosave update runs exact mention detection');
select is((select count(*) from public.mentions where source_entity_id='d2400000-0000-0000-0000-000000000001' and mentioned_entity_id='d2500000-0000-0000-0000-000000000001' and state='suggested'), 1::bigint, 'word-boundary mention becomes a suggestion after save');
select is(public.resolve_mention('d2100000-0000-0000-0000-000000000001','d2200000-0000-0000-0000-000000000001','d2300000-0000-0000-0000-000000000001',(select id from public.mentions where source_entity_id='d2400000-0000-0000-0000-000000000001' and mentioned_entity_id='d2500000-0000-0000-0000-000000000001'),'accepted')->>'state','accepted','GM can explicitly accept a mention');
select is(public.get_library_record_detail('d2100000-0000-0000-0000-000000000001','d2200000-0000-0000-0000-000000000001','d2300000-0000-0000-0000-000000000001','place','d2500000-0000-0000-0000-000000000001') #>> '{backlinks,0,source_name}','Mara Vale','accepted mention appears as a backlink');
select is(public.resolve_mention('d2100000-0000-0000-0000-000000000001','d2200000-0000-0000-0000-000000000001','d2300000-0000-0000-0000-000000000001',(select id from public.mentions where source_entity_id='d2400000-0000-0000-0000-000000000001' and mentioned_entity_id='d2500000-0000-0000-0000-000000000001'),'dismissed')->>'state','snoozed','dismissing a mention snoozes it instead of silently deleting history');
select is(
  (public.get_library_record_detail('d2100000-0000-0000-0000-000000000001','d2200000-0000-0000-0000-000000000001','d2300000-0000-0000-0000-000000000001','place','d2500000-0000-0000-0000-000000000001') #>> '{delete_blockers,mentions}')::bigint,
  (select count(*) from public.mentions where mentioned_entity_id = 'd2500000-0000-0000-0000-000000000001' and state in ('suggested','accepted')),
  'snoozed mentions are excluded from active hard-delete references'
);

create temp table d2_relationship as select public.create_relationship('d2100000-0000-0000-0000-000000000001','d2200000-0000-0000-0000-000000000001','d2300000-0000-0000-0000-000000000001','character','d2400000-0000-0000-0000-000000000001','place','d2500000-0000-0000-0000-000000000001','located-at','Often watches the crossing.') payload;
select is(payload->>'kind','located-at','GM can create a fixed-vocabulary relationship') from d2_relationship;
select is(jsonb_array_length(public.get_library_record_detail('d2100000-0000-0000-0000-000000000001','d2200000-0000-0000-0000-000000000001','d2300000-0000-0000-0000-000000000001','place','d2500000-0000-0000-0000-000000000001')->'relationships'),1,'relationship renders bidirectionally');
select throws_like($$ select public.create_relationship('d2100000-0000-0000-0000-000000000001','d2200000-0000-0000-0000-000000000001','d2300000-0000-0000-0000-000000000001','character','d2400000-0000-0000-0000-000000000001','character','d2400000-0000-0000-0000-000000000002','related-to',null) $$,'%outside%','relationship rejects a sibling-Saga target');
select is(public.delete_relationship('d2100000-0000-0000-0000-000000000001','d2200000-0000-0000-0000-000000000001','d2300000-0000-0000-0000-000000000001',(select (payload->>'id')::uuid from d2_relationship))->>'deleted','true','GM can remove a scoped relationship');

create temp table d2_attachment as select public.create_note_attachment('d2100000-0000-0000-0000-000000000001','d2200000-0000-0000-0000-000000000001','d2300000-0000-0000-0000-000000000001','d2600000-0000-0000-0000-000000000001','place','d2500000-0000-0000-0000-000000000001') payload;
select is(payload->>'target_name','Glass Bridge','GM can attach a Note to a scoped entity') from d2_attachment;
select is(jsonb_array_length(public.get_library_record_detail('d2100000-0000-0000-0000-000000000001','d2200000-0000-0000-0000-000000000001','d2300000-0000-0000-0000-000000000001','note','d2600000-0000-0000-0000-000000000001')->'relationships'),1,'Note detail exposes attachments as related records');
select is(public.delete_note_attachment('d2100000-0000-0000-0000-000000000001','d2200000-0000-0000-0000-000000000001','d2300000-0000-0000-0000-000000000001',(select (payload->>'id')::uuid from d2_attachment))->>'deleted','true','GM can remove a Note attachment');

select is(public.archive_entity('d2100000-0000-0000-0000-000000000001','d2200000-0000-0000-0000-000000000001','d2300000-0000-0000-0000-000000000001','note','d2600000-0000-0000-0000-000000000001',(select updated_at from public.notes where id='d2600000-0000-0000-0000-000000000001')),'d2600000-0000-0000-0000-000000000001'::uuid,'Note archives through the existing boundary');
select is(public.restore_entity('d2100000-0000-0000-0000-000000000001','d2200000-0000-0000-0000-000000000001','d2300000-0000-0000-0000-000000000001','note','d2600000-0000-0000-0000-000000000001',(select updated_at from public.notes where id='d2600000-0000-0000-0000-000000000001')),'d2600000-0000-0000-0000-000000000001'::uuid,'archived Note can be restored');
select is((select canon_state from public.notes where id='d2600000-0000-0000-0000-000000000001'),'canon'::public.entity_canon_state,'restore returns the Note to canon');
select ok(exists(select 1 from public.canon_audit where entity_type='note' and entity_id='d2600000-0000-0000-0000-000000000001' and from_state='archived' and to_state='canon'),'restore writes provenance audit');

create temp table d2_delete_target as select (public.create_entity('d2100000-0000-0000-0000-000000000001','d2200000-0000-0000-0000-000000000001','d2300000-0000-0000-0000-000000000001','artifact','saga','{"name":"Unreferenced Key","summary":"Safe deletion fixture."}'::jsonb)->>'id')::uuid id;
select throws_like($$ select public.hard_delete_entity('d2100000-0000-0000-0000-000000000001','d2200000-0000-0000-0000-000000000001','d2300000-0000-0000-0000-000000000001','artifact',(select id from d2_delete_target),(select updated_at from public.artifacts where id=(select id from d2_delete_target)),'Unreferenced Key') $$,'%archived%','hard delete rejects an active record');
create temp table d2_delete_blocker as select public.create_relationship('d2100000-0000-0000-0000-000000000001','d2200000-0000-0000-0000-000000000001','d2300000-0000-0000-0000-000000000001','character','d2400000-0000-0000-0000-000000000001','artifact',(select id from d2_delete_target),'owns',null) payload;
select lives_ok($$ select public.archive_entity('d2100000-0000-0000-0000-000000000001','d2200000-0000-0000-0000-000000000001','d2300000-0000-0000-0000-000000000001','artifact',(select id from d2_delete_target),(select updated_at from public.artifacts where id=(select id from d2_delete_target))) $$,'delete fixture archives first');
select throws_like($$ select public.hard_delete_entity('d2100000-0000-0000-0000-000000000001','d2200000-0000-0000-0000-000000000001','d2300000-0000-0000-0000-000000000001','artifact',(select id from d2_delete_target),(select updated_at from public.artifacts where id=(select id from d2_delete_target)),'Wrong Key') $$,'%confirmation%','hard delete requires exact name confirmation');
select throws_like($$ select public.hard_delete_entity('d2100000-0000-0000-0000-000000000001','d2200000-0000-0000-0000-000000000001','d2300000-0000-0000-0000-000000000001','artifact',(select id from d2_delete_target),(select updated_at from public.artifacts where id=(select id from d2_delete_target)),'Unreferenced Key') $$,'%references%','hard delete fails closed while a relationship exists');
select public.delete_relationship('d2100000-0000-0000-0000-000000000001','d2200000-0000-0000-0000-000000000001','d2300000-0000-0000-0000-000000000001',(select (payload->>'id')::uuid from d2_delete_blocker));
select is(public.hard_delete_entity('d2100000-0000-0000-0000-000000000001','d2200000-0000-0000-0000-000000000001','d2300000-0000-0000-0000-000000000001','artifact',(select id from d2_delete_target),(select updated_at from public.artifacts where id=(select id from d2_delete_target)),'Unreferenced Key')->>'deleted','true','archived unreferenced record can be hard-deleted');
select is((select count(*) from public.artifacts where id=(select id from d2_delete_target)),0::bigint,'hard delete removes only the target record');
select ok(exists(select 1 from public.canon_audit where entity_type='artifact' and entity_id=(select id from d2_delete_target)),'hard delete preserves audit tombstones');

create temp table d2_type_matrix as
select entity_type,(public.create_entity('d2100000-0000-0000-0000-000000000001','d2200000-0000-0000-0000-000000000001','d2300000-0000-0000-0000-000000000001',entity_type,'saga',payload)->>'id')::uuid id
from (values
  ('character','{"name":"Matrix Character","summary":"Matrix"}'::jsonb),
  ('place','{"name":"Matrix Place","summary":"Matrix"}'::jsonb),
  ('faction','{"name":"Matrix Faction","summary":"Matrix"}'::jsonb),
  ('artifact','{"name":"Matrix Artifact","summary":"Matrix"}'::jsonb),
  ('thread','{"name":"Matrix Thread","summary":"Matrix"}'::jsonb),
  ('note','{"title":"Matrix Note","body":"Matrix","note_type":"lore"}'::jsonb)
) records(entity_type,payload);
select is((select count(*) from d2_type_matrix),6::bigint,'all five canon tables plus Notes create through the D2 Library boundary');
select is((select count(*) from d2_type_matrix m where jsonb_array_length(public.get_library_record_detail('d2100000-0000-0000-0000-000000000001','d2200000-0000-0000-0000-000000000001','d2300000-0000-0000-0000-000000000001',m.entity_type,m.id)->'provenance')>0),6::bigint,'all six Library record types expose source provenance');
do $$ declare r record; d jsonb; begin for r in select * from d2_type_matrix loop d:=public.get_library_record_detail('d2100000-0000-0000-0000-000000000001','d2200000-0000-0000-0000-000000000001','d2300000-0000-0000-0000-000000000001',r.entity_type,r.id)->'record'; perform public.archive_entity('d2100000-0000-0000-0000-000000000001','d2200000-0000-0000-0000-000000000001','d2300000-0000-0000-0000-000000000001',r.entity_type,r.id,(d->>'updated_at')::timestamptz); end loop; end $$;
select is((select count(*) from d2_type_matrix m where public.get_library_record_detail('d2100000-0000-0000-0000-000000000001','d2200000-0000-0000-0000-000000000001','d2300000-0000-0000-0000-000000000001',m.entity_type,m.id) #>> '{record,canon_state}'='archived'),6::bigint,'all six Library record types archive');
do $$ declare r record; d jsonb; begin for r in select * from d2_type_matrix loop d:=public.get_library_record_detail('d2100000-0000-0000-0000-000000000001','d2200000-0000-0000-0000-000000000001','d2300000-0000-0000-0000-000000000001',r.entity_type,r.id)->'record'; perform public.restore_entity('d2100000-0000-0000-0000-000000000001','d2200000-0000-0000-0000-000000000001','d2300000-0000-0000-0000-000000000001',r.entity_type,r.id,(d->>'updated_at')::timestamptz); end loop; end $$;
select is((select count(*) from d2_type_matrix m where public.get_library_record_detail('d2100000-0000-0000-0000-000000000001','d2200000-0000-0000-0000-000000000001','d2300000-0000-0000-0000-000000000001',m.entity_type,m.id) #>> '{record,canon_state}'='canon'),6::bigint,'all six Library record types restore');
select is((select count(distinct (a.entity_type::text,a.entity_id)) from public.canon_audit a join d2_type_matrix m on m.entity_type=a.entity_type::text and m.id=a.entity_id where a.from_state='archived' and a.to_state='canon'),6::bigint,'all six restores retain audit provenance');

select throws_like($$ select public.get_library_record_detail('d2100000-0000-0000-0000-000000000002','d2200000-0000-0000-0000-000000000002','d2300000-0000-0000-0000-000000000003','character','d2400000-0000-0000-0000-000000000003') $$,'%saga context is not available%','detail rejects another owner');
set local role anon;
select throws_ok($$ select public.get_library_record_detail('d2100000-0000-0000-0000-000000000001','d2200000-0000-0000-0000-000000000001','d2300000-0000-0000-0000-000000000001','character','d2400000-0000-0000-0000-000000000001') $$,'42501','permission denied for function get_library_record_detail','anonymous callers cannot read Library detail');

select * from finish();
rollback;

create extension if not exists pgtap with schema extensions;

begin;

select plan(14);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, email_change, email_change_token_new, recovery_token)
values
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'module2-a@example.test', extensions.crypt('password', extensions.gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false, '', '', '', ''),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'module2-b@example.test', extensions.crypt('password', extensions.gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false, '', '', '', '')
on conflict (id) do nothing;

insert into public.gm_profiles (id, user_id, experience_level, improv_comfort, prep_style)
values
  ('91000000-0000-0000-0000-000000000001', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'experienced', 'mixed', 'light'),
  ('91000000-0000-0000-0000-000000000002', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'returning', 'planner', 'heavy')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_gm_id, name)
values
  ('92000000-0000-0000-0000-000000000001', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Module 2 Workspace A'),
  ('92000000-0000-0000-0000-000000000002', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Module 2 Workspace B')
on conflict (id) do nothing;

insert into public.worlds (id, workspace_id, owner_gm_id, name)
values
  ('93000000-0000-0000-0000-000000000001', '92000000-0000-0000-0000-000000000001', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Module 2 World A'),
  ('93000000-0000-0000-0000-000000000002', '92000000-0000-0000-0000-000000000002', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Module 2 World B')
on conflict (id) do nothing;

insert into public.world_eras (id, workspace_id, world_id, name)
values
  ('94000000-0000-0000-0000-000000000001', '92000000-0000-0000-0000-000000000001', '93000000-0000-0000-0000-000000000001', 'Module 2 Era A'),
  ('94000000-0000-0000-0000-000000000002', '92000000-0000-0000-0000-000000000002', '93000000-0000-0000-0000-000000000002', 'Module 2 Era B')
on conflict (id) do nothing;

insert into public.sagas (id, workspace_id, world_id, owner_gm_id, primary_era_id, name)
values
  ('95000000-0000-0000-0000-000000000001', '92000000-0000-0000-0000-000000000001', '93000000-0000-0000-0000-000000000001', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '94000000-0000-0000-0000-000000000001', 'Module 2 Saga A'),
  ('95000000-0000-0000-0000-000000000002', '92000000-0000-0000-0000-000000000001', '93000000-0000-0000-0000-000000000001', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '94000000-0000-0000-0000-000000000001', 'Module 2 Sibling Saga'),
  ('95000000-0000-0000-0000-000000000003', '92000000-0000-0000-0000-000000000002', '93000000-0000-0000-0000-000000000002', 'dddddddd-dddd-dddd-dddd-dddddddddddd', '94000000-0000-0000-0000-000000000002', 'Module 2 Saga B')
on conflict (id) do nothing;

insert into public.characters (id, workspace_id, world_id, saga_id, scope, name, summary, narrative)
values
  ('96000000-0000-0000-0000-000000000001', '92000000-0000-0000-0000-000000000001', '93000000-0000-0000-0000-000000000001', '95000000-0000-0000-0000-000000000001', 'saga', 'Missing Version Target', 'Original', 'Original'),
  ('96000000-0000-0000-0000-000000000002', '92000000-0000-0000-0000-000000000001', '93000000-0000-0000-0000-000000000001', '95000000-0000-0000-0000-000000000001', 'saga', 'Stale Version Target', 'Original', 'Original'),
  ('96000000-0000-0000-0000-000000000003', '92000000-0000-0000-0000-000000000001', '93000000-0000-0000-0000-000000000001', '95000000-0000-0000-0000-000000000001', 'saga', 'Live Version Target', 'Original', 'Original'),
  ('96000000-0000-0000-0000-000000000004', '92000000-0000-0000-0000-000000000001', '93000000-0000-0000-0000-000000000001', '95000000-0000-0000-0000-000000000001', 'saga', 'Archive Target', 'Original', 'Original')
on conflict (id) do nothing;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'cccccccc-cccc-cccc-cccc-cccccccccccc', true);
select set_config('request.jwt.claim.saga_id', '95000000-0000-0000-0000-000000000001', true);

create temp table module2_created_character as
select (public.create_entity(
  '92000000-0000-0000-0000-000000000001',
  '93000000-0000-0000-0000-000000000001',
  '95000000-0000-0000-0000-000000000001',
  'character',
  'saga',
  '{"name":"Audited Create","summary":"Created by GM","narrative":"Manual canon create.","gm_notes":"Private note."}'::jsonb
)->>'id')::uuid as id;

select ok(
  exists (select 1 from public.characters where id = (select id from module2_created_character)),
  'create_entity inserts the canonical row'
);

select is(
  (
    select count(*)
    from public.sources s
    where s.kind = 'gm_instruction'
      and s.source_entity_type = 'character'
      and s.source_entity_id = (select id from module2_created_character)
  ),
  1::bigint,
  'manual create writes one synthetic gm_instruction source'
);

select is(
  (
    select count(*)
    from public.canon_audit a
    where a.entity_type = 'character'
      and a.entity_id = (select id from module2_created_character)
      and a.actor_kind = 'gm'
      and a.from_state is null
      and a.to_state = 'canon'
      and cardinality(a.source_ids) = 1
  ),
  1::bigint,
  'manual create writes one canon audit row with the synthetic source'
);

create temp table module2_created_note as
select (public.create_entity(
  '92000000-0000-0000-0000-000000000001',
  '93000000-0000-0000-0000-000000000001',
  '95000000-0000-0000-0000-000000000001',
  'note',
  'saga',
  '{"note_type":"lore","title":"Audited Note","body":"Manual lore note."}'::jsonb
)->>'id')::uuid as id;

select is(
  (
    select count(*)
    from public.canon_audit a
    where a.entity_type::text = 'note'
      and a.entity_id = (select id from module2_created_note)
  ),
  1::bigint,
  'manual note create is included in canon audit'
);

select throws_like(
  $$ select public.update_entity(
       '92000000-0000-0000-0000-000000000001',
       '93000000-0000-0000-0000-000000000001',
       '95000000-0000-0000-0000-000000000001',
       'character',
       '96000000-0000-0000-0000-000000000001',
       '{"name":"Missing Version Target","summary":"Blind update","narrative":"Blind update."}'::jsonb
     ) $$,
  '%expected_version%',
  'manual update rejects missing expected_version'
);

select throws_like(
  $$ select public.update_entity(
       '92000000-0000-0000-0000-000000000001',
       '93000000-0000-0000-0000-000000000001',
       '95000000-0000-0000-0000-000000000001',
       'character',
       '96000000-0000-0000-0000-000000000002',
       '{"name":"Stale Version Target","summary":"Stale update","narrative":"Stale update.","expected_version":"2000-01-01T00:00:00Z"}'::jsonb
     ) $$,
  '%conflict%',
  'manual update rejects stale expected_version'
);

select is(
  public.update_entity(
    '92000000-0000-0000-0000-000000000001',
    '93000000-0000-0000-0000-000000000001',
    '95000000-0000-0000-0000-000000000001',
    'character',
    '96000000-0000-0000-0000-000000000003',
    jsonb_build_object(
      'name', 'Live Version Target',
      'summary', 'Updated safely',
      'narrative', 'Updated with the live version.',
      'gm_notes', 'Kept private.',
      'expected_version', (select updated_at from public.characters where id = '96000000-0000-0000-0000-000000000003')
    )
  ),
  '96000000-0000-0000-0000-000000000003'::uuid,
  'manual update succeeds with matching expected_version'
);

select is(
  (
    select count(*)
    from public.canon_audit a
    where a.entity_type = 'character'
      and a.entity_id = '96000000-0000-0000-0000-000000000003'
      and a.from_state = 'canon'
      and a.to_state = 'canon'
      and cardinality(a.source_ids) = 1
  ),
  1::bigint,
  'manual update writes one canon audit row with a source'
);

select throws_like(
  $$ select public.archive_entity(
       '92000000-0000-0000-0000-000000000001',
       '93000000-0000-0000-0000-000000000001',
       '95000000-0000-0000-0000-000000000001',
       'character',
       '96000000-0000-0000-0000-000000000004',
       '2000-01-01T00:00:00Z'::timestamptz
     ) $$,
  '%conflict%',
  'manual archive rejects stale expected_version'
);

select is(
  public.archive_entity(
    '92000000-0000-0000-0000-000000000001',
    '93000000-0000-0000-0000-000000000001',
    '95000000-0000-0000-0000-000000000001',
    'character',
    '96000000-0000-0000-0000-000000000004',
    (select updated_at from public.characters where id = '96000000-0000-0000-0000-000000000004')
  ),
  '96000000-0000-0000-0000-000000000004'::uuid,
  'manual archive succeeds with matching expected_version'
);

select is(
  (
    select canon_state
    from public.characters
    where id = '96000000-0000-0000-0000-000000000004'
  ),
  'archived'::public.entity_canon_state,
  'manual archive sets canon_state to archived'
);

select is(
  (
    select count(*)
    from public.canon_audit a
    where a.entity_type = 'character'
      and a.entity_id = '96000000-0000-0000-0000-000000000004'
      and a.from_state = 'canon'
      and a.to_state = 'archived'
      and cardinality(a.source_ids) = 1
  ),
  1::bigint,
  'manual archive writes one canon audit row with a source'
);

select throws_like(
  $$ update public.canon_audit
     set change_summary = '{"tampered":true}'::jsonb $$,
  '%permission denied%',
  'authenticated users cannot update canon audit rows directly'
);

select throws_like(
  $$ delete from public.canon_audit $$,
  '%permission denied%',
  'authenticated users cannot delete canon audit rows directly'
);

reset role;
select * from finish();

rollback;

create extension if not exists pgtap with schema extensions;

begin;

select plan(14);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, email_change, email_change_token_new, recovery_token)
values
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'module3-a@example.test', extensions.crypt('password', extensions.gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false, '', '', '', '')
on conflict (id) do nothing;

insert into public.gm_profiles (id, user_id, experience_level, improv_comfort, prep_style)
values ('a1000000-0000-0000-0000-000000000001', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'experienced', 'mixed', 'light')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_gm_id, name)
values ('a2000000-0000-0000-0000-000000000001', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Module 3 Workspace')
on conflict (id) do nothing;

insert into public.worlds (id, workspace_id, owner_gm_id, name)
values ('a3000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Module 3 World')
on conflict (id) do nothing;

insert into public.world_eras (id, workspace_id, world_id, name)
values ('a4000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001', 'Module 3 Era')
on conflict (id) do nothing;

insert into public.sagas (id, workspace_id, world_id, owner_gm_id, primary_era_id, name)
values ('a5000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'a4000000-0000-0000-0000-000000000001', 'Module 3 Saga')
on conflict (id) do nothing;

insert into public.characters (id, workspace_id, world_id, saga_id, scope, name, summary, narrative)
values
  ('a6000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001', 'a5000000-0000-0000-0000-000000000001', 'saga', 'Update Target', 'Original summary', 'Original narrative'),
  ('a6000000-0000-0000-0000-000000000002', 'a2000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001', 'a5000000-0000-0000-0000-000000000001', 'saga', 'Stale Target', 'Original summary', 'Original narrative'),
  ('a6000000-0000-0000-0000-000000000003', 'a2000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001', 'a5000000-0000-0000-0000-000000000001', 'saga', 'Archive Target', 'Original summary', 'Original narrative'),
  ('a6000000-0000-0000-0000-000000000004', 'a2000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001', 'a5000000-0000-0000-0000-000000000001', 'saga', 'Merge Target', 'Original summary', 'Original narrative')
on conflict (id) do nothing;

insert into public.sources (id, workspace_id, world_id, saga_id, scope, kind, source_entity_type, source_entity_id, raw_excerpt)
values
  ('a7000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001', 'a5000000-0000-0000-0000-000000000001', 'saga', 'gm_instruction', 'character', 'a6000000-0000-0000-0000-000000000001', 'Approval source 1'),
  ('a7000000-0000-0000-0000-000000000002', 'a2000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001', 'a5000000-0000-0000-0000-000000000001', 'saga', 'gm_instruction', 'character', 'a6000000-0000-0000-0000-000000000002', 'Approval source 2')
on conflict (id) do nothing;

insert into public.drafts (id, workspace_id, world_id, saga_id, scope, entity_type, target_entity_id, state, change_kind, proposed_payload, expected_version)
values
  ('a8000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001', 'a5000000-0000-0000-0000-000000000001', 'saga', 'character', null, 'pending', 'create', '{"name":"Approved Character","summary":"Created from draft","narrative":"Approved narrative."}'::jsonb, null),
  ('a8000000-0000-0000-0000-000000000002', 'a2000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001', 'a5000000-0000-0000-0000-000000000001', 'saga', 'character', 'a6000000-0000-0000-0000-000000000001', 'pending', 'update', '{"summary":"Approved update"}'::jsonb, (select updated_at from public.characters where id = 'a6000000-0000-0000-0000-000000000001')),
  ('a8000000-0000-0000-0000-000000000003', 'a2000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001', 'a5000000-0000-0000-0000-000000000001', 'saga', 'character', 'a6000000-0000-0000-0000-000000000002', 'pending', 'update', '{"summary":"Stale update"}'::jsonb, '2000-01-01T00:00:00Z'::timestamptz),
  ('a8000000-0000-0000-0000-000000000004', 'a2000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001', 'a5000000-0000-0000-0000-000000000001', 'saga', 'character', 'a6000000-0000-0000-0000-000000000003', 'pending', 'archive_request', '{}'::jsonb, (select updated_at from public.characters where id = 'a6000000-0000-0000-0000-000000000003')),
  ('a8000000-0000-0000-0000-000000000005', 'a2000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001', 'a5000000-0000-0000-0000-000000000001', 'saga', 'character', null, 'pending', 'create', '{"name":"Rejected Character"}'::jsonb, null),
  ('a8000000-0000-0000-0000-000000000006', 'a2000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001', 'a5000000-0000-0000-0000-000000000001', 'saga', 'character', null, 'pending', 'merge', '{"merge_target_id":"a6000000-0000-0000-0000-000000000004"}'::jsonb, null)
on conflict (id) do nothing;

insert into public.draft_sources (workspace_id, world_id, saga_id, scope, draft_id, source_id)
select 'a2000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001', 'a5000000-0000-0000-0000-000000000001', 'saga', d.id, 'a7000000-0000-0000-0000-000000000001'
from public.drafts d
where d.id in (
  'a8000000-0000-0000-0000-000000000001',
  'a8000000-0000-0000-0000-000000000002',
  'a8000000-0000-0000-0000-000000000004'
)
on conflict do nothing;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', true);
select set_config('request.jwt.claim.saga_id', 'a5000000-0000-0000-0000-000000000001', true);

select is(public.update_draft_state('a2000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001', 'a5000000-0000-0000-0000-000000000001', 'a8000000-0000-0000-0000-000000000001', 'approved', null), 'a8000000-0000-0000-0000-000000000001'::uuid, 'approve create draft returns draft id');

select ok(exists (select 1 from public.characters where name = 'Approved Character' and created_by = 'gm_via_ai_approval'), 'approve create draft inserts canon row');

select ok(exists (select 1 from public.canon_audit where draft_id = 'a8000000-0000-0000-0000-000000000001' and actor_kind = 'gm_via_ai_approval' and cardinality(source_ids) = 1), 'approve create draft writes audit with draft source');

select is(public.update_draft_state('a2000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001', 'a5000000-0000-0000-0000-000000000001', 'a8000000-0000-0000-0000-000000000002', 'approved', null), 'a8000000-0000-0000-0000-000000000002'::uuid, 'approve update draft returns draft id');

select is((select summary from public.characters where id = 'a6000000-0000-0000-0000-000000000001'), 'Approved update', 'approve update draft mutates canon');

select throws_like(
  $$ select public.update_draft_state('a2000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001', 'a5000000-0000-0000-0000-000000000001', 'a8000000-0000-0000-0000-000000000003', 'approved', null) $$,
  '%conflict%',
  'stale approval fails with conflict'
);

select is((select state from public.drafts where id = 'a8000000-0000-0000-0000-000000000003'), 'pending'::public.draft_state, 'stale approval leaves draft pending');

select is(public.update_draft_state('a2000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001', 'a5000000-0000-0000-0000-000000000001', 'a8000000-0000-0000-0000-000000000004', 'approved', null), 'a8000000-0000-0000-0000-000000000004'::uuid, 'approve archive-request draft returns draft id');

select is((select canon_state from public.characters where id = 'a6000000-0000-0000-0000-000000000003'), 'archived'::public.entity_canon_state, 'approve archive-request archives target');

select is(public.update_draft_state('a2000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001', 'a5000000-0000-0000-0000-000000000001', 'a8000000-0000-0000-0000-000000000005', 'rejected', 'not table canon'), 'a8000000-0000-0000-0000-000000000005'::uuid, 'reject draft returns draft id');

select ok(not exists (select 1 from public.canon_audit where draft_id = 'a8000000-0000-0000-0000-000000000005'), 'reject draft writes no canon audit');

select is(public.update_draft_state('a2000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001', 'a5000000-0000-0000-0000-000000000001', 'a8000000-0000-0000-0000-000000000006', 'merged', null), 'a8000000-0000-0000-0000-000000000006'::uuid, 'merge draft returns draft id');

select is((select summary from public.characters where id = 'a6000000-0000-0000-0000-000000000004'), 'Original summary', 'merge decision does not mutate canon directly');

select ok(
  exists (
    select 1
    from public.drafts d
    where d.id <> 'a8000000-0000-0000-0000-000000000006'
      and d.target_entity_id = 'a6000000-0000-0000-0000-000000000004'
      and d.change_kind = 'update'
      and d.state = 'pending'
  ),
  'merge decision enqueues a separate target update draft'
);

reset role;
select * from finish();

rollback;

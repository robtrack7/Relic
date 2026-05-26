create extension if not exists pgtap with schema extensions;

begin;

select plan(32);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, email_change, email_change_token_new, recovery_token)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'user-a@example.test', extensions.crypt('password', extensions.gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false, '', '', '', ''),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'user-b@example.test', extensions.crypt('password', extensions.gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false, '', '', '', '')
on conflict (id) do nothing;

insert into public.gm_profiles (id, user_id, experience_level, improv_comfort, prep_style)
values
  ('01000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'experienced', 'mixed', 'light'),
  ('01000000-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'returning', 'planner', 'heavy')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_gm_id, name, usage_limits)
values
  ('10000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'User A Workspace', '{"plan":"free","ai_credits_monthly":0,"transcription_seconds_monthly":0,"storage_bytes":100,"worlds_active":1,"sagas_active":1,"entities_per_saga":2,"imports_monthly":0,"exports_monthly":0}'::jsonb),
  ('10000000-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'User B Workspace', '{"plan":"free","ai_credits_monthly":100,"transcription_seconds_monthly":3600,"storage_bytes":1000000,"worlds_active":1,"sagas_active":1,"entities_per_saga":100,"imports_monthly":10,"exports_monthly":3}'::jsonb)
on conflict (id) do nothing;

insert into public.worlds (id, workspace_id, owner_gm_id, name, summary)
values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Aster World', 'A shared setting with the World Relic.'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Beryl World', 'A separate setting.')
on conflict (id) do nothing;

insert into public.world_eras (id, workspace_id, world_id, name, summary)
values
  ('21000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Default Era', 'Hidden MVP era.'),
  ('21000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'Default Era', 'Hidden MVP era.')
on conflict (id) do nothing;

insert into public.sagas (id, workspace_id, world_id, owner_gm_id, primary_era_id, name, premise)
values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '21000000-0000-0000-0000-000000000001', 'Current Saga', 'The current table investigates the Saga Relic.'),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '21000000-0000-0000-0000-000000000001', 'Sibling Saga', 'A sibling story that must be excluded from active retrieval.'),
  ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '21000000-0000-0000-0000-000000000002', 'Other Workspace Saga', 'A different workspace story.')
on conflict (id) do nothing;

insert into public.characters (id, workspace_id, world_id, saga_id, scope, name, summary, narrative)
values
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', null, 'world', 'World Relic Keeper', 'World canon character tied to the Relic.', 'The keeper appears across sagas.'),
  ('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'saga', 'Saga Relic Scout', 'Current saga character carrying the Relic clue.', 'The scout belongs only to the current saga.'),
  ('40000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 'saga', 'Sibling Relic Rival', 'Sibling saga character that must not appear in current retrieval.', 'This row verifies sibling exclusion.')
on conflict (id) do nothing;

insert into public.sources (id, workspace_id, world_id, saga_id, scope, kind, source_entity_type, source_entity_id, raw_excerpt)
values
  ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', null, 'world', 'existing_entity', 'character', '40000000-0000-0000-0000-000000000001', 'World Relic Keeper source.'),
  ('50000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'saga', 'existing_entity', 'character', '40000000-0000-0000-0000-000000000002', 'Saga Relic Scout source.'),
  ('50000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 'saga', 'existing_entity', 'character', '40000000-0000-0000-0000-000000000003', 'Sibling Relic Rival source.')
on conflict (id) do nothing;

insert into public.drafts (id, workspace_id, world_id, saga_id, scope, entity_type, target_entity_id, state, change_kind, proposed_payload)
values
  ('60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'saga', 'character', '40000000-0000-0000-0000-000000000001', 'pending', 'update', '{"summary":"pending draft content"}'::jsonb)
on conflict (id) do nothing;

insert into public.sessions (id, workspace_id, world_id, saga_id, scope, name)
values
  ('70000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'saga', 'Security Test Session')
on conflict (id) do nothing;

insert into public.usage_monthly_rollups (workspace_id, period_start, period_end, ai_credits_used)
values ('10000000-0000-0000-0000-000000000001', date_trunc('month', now())::date, (date_trunc('month', now()) + interval '1 month - 1 day')::date, 0)
on conflict (workspace_id, period_start) do update set ai_credits_used = excluded.ai_credits_used;

insert into public.usage_events (id, workspace_id, world_id, saga_id, actor_gm_id, event_kind, units, unit_type)
values ('80000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ai_call', 1, 'credit')
on conflict (id) do nothing;

select has_table('public', 'workspaces', 'workspaces table exists');
select has_table('public', 'worlds', 'worlds table exists');
select has_table('public', 'sagas', 'sagas table exists');
select has_table('public', 'characters', 'characters table exists');
select has_table('public', 'drafts', 'drafts table exists');
select has_table('public', 'usage_events', 'usage_events table exists');

select has_function('public', 'search_for_ui', array[
  'uuid', 'uuid', 'uuid', 'text', 'text', 'integer', 'boolean', 'boolean', 'boolean'
], 'search_for_ui has the MVP signature');

select has_function('public', 'retrieve_for_task', array[
  'uuid', 'uuid', 'uuid', 'uuid', 'text', 'text', 'jsonb', 'integer'
], 'retrieve_for_task has the MVP signature');

select has_function('public', 'check_quota_preflight', array[
  'uuid', 'uuid', 'uuid', 'text', 'numeric', 'jsonb'
], 'check_quota_preflight has the MVP signature');

select has_function('public', 'get_bootstrap_context', array[]::text[], 'get_bootstrap_context exists');
select has_function('public', 'ensure_default_workspace', array[]::text[], 'ensure_default_workspace exists');

select throws_like(
  $$ insert into public.characters (id, workspace_id, world_id, saga_id, scope, name)
     values (
       '00000000-0000-0000-0000-000000000001',
       '10000000-0000-0000-0000-000000000001',
       '20000000-0000-0000-0000-000000000001',
       '30000000-0000-0000-0000-000000000001',
       'world',
       'Invalid world scoped character'
     ) $$,
  '%characters_scope_check%',
  'world scope requires null saga_id'
);

select throws_like(
  $$ insert into public.characters (id, workspace_id, world_id, saga_id, scope, name)
     values (
       '00000000-0000-0000-0000-000000000002',
       '10000000-0000-0000-0000-000000000001',
       '20000000-0000-0000-0000-000000000001',
       null,
       'saga',
       'Invalid saga scoped character'
     ) $$,
  '%characters_scope_check%',
  'saga scope requires saga_id'
);

set local role anon;
select is((select count(*) from public.workspaces), 0::bigint, 'anonymous users cannot read workspaces');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);
select set_config('request.jwt.claim.saga_id', '', true);

select is(
  (select count(*) from public.characters where saga_id = '30000000-0000-0000-0000-000000000001'),
  0::bigint,
  'direct table access to Saga-scoped rows fails closed without active Saga claim'
);

select throws_like(
  $$ update public.workspaces
     set usage_limits = '{"plan":"tampered","ai_credits_monthly":999999}'::jsonb
     where id = '10000000-0000-0000-0000-000000000001' $$,
  '%permission denied%',
  'authenticated users cannot directly edit workspace usage limits'
);

select throws_like(
  $$ update public.usage_events
     set units = 999
     where id = '80000000-0000-0000-0000-000000000001' $$,
  '%permission denied%',
  'authenticated users cannot directly update usage events'
);

select throws_like(
  $$ delete from public.usage_events
     where id = '80000000-0000-0000-0000-000000000001' $$,
  '%permission denied%',
  'authenticated users cannot directly delete usage events'
);

select throws_like(
  $$ update public.drafts
     set state = 'approved'
     where id = '60000000-0000-0000-0000-000000000001' $$,
  '%permission denied%',
  'authenticated users cannot directly resolve drafts'
);

select set_config('request.jwt.claim.saga_id', '30000000-0000-0000-0000-000000000001', true);

select is(
  (select count(*) from public.workspaces where id = '10000000-0000-0000-0000-000000000001'),
  1::bigint,
  'user A can read own workspace'
);

select is(
  (select count(*) from public.workspaces where id = '10000000-0000-0000-0000-000000000002'),
  0::bigint,
  'user A cannot read user B workspace'
);

select is(
  (select count(*) from public.characters where saga_id = '30000000-0000-0000-0000-000000000001'),
  1::bigint,
  'user A can read current saga canon'
);

select is(
  (select count(*) from public.characters where saga_id = '30000000-0000-0000-0000-000000000002'),
  0::bigint,
  'RLS excludes owned sibling saga canon when active saga is scoped'
);

select is(
  (select count(*) from public.search_for_ui(
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    'Relic',
    'sanctum',
    20,
    false,
    true,
    true
  ) where source_entity_id = '40000000-0000-0000-0000-000000000003'),
  0::bigint,
  'search_for_ui excludes sibling sagas'
);

select ok(
  exists (
    select 1 from public.search_for_ui(
      '10000000-0000-0000-0000-000000000001',
      '20000000-0000-0000-0000-000000000001',
      '30000000-0000-0000-0000-000000000001',
      'Relic',
      'sanctum',
      20,
      false,
      true,
      true
    ) where source_entity_id in (
      '40000000-0000-0000-0000-000000000001',
      '40000000-0000-0000-0000-000000000002'
    )
  ),
  'search_for_ui returns current saga and world canon'
);

select is(
  (select count(*)
   from public.retrieve_for_task(
     '10000000-0000-0000-0000-000000000001',
     '20000000-0000-0000-0000-000000000001',
     '30000000-0000-0000-0000-000000000001',
     null,
     'pending draft content',
     'compose_prep_briefing',
     '{"include_pending_drafts_for_entity":"40000000-0000-0000-0000-000000000001"}'::jsonb,
     20
   )
   where source_entity_id = '60000000-0000-0000-0000-000000000001'),
  0::bigint,
  'compose_prep_briefing hard-canon retrieval excludes draft rows'
);

select is(
  (select allowed from public.check_quota_preflight(
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    'ai_call',
    1,
    '{}'::jsonb
  )),
  false,
  'quota preflight blocks metered work over limit'
);

select is(
  (select allowed from public.check_quota_preflight(
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    'manual_edit',
    1,
    '{}'::jsonb
  )),
  true,
  'quota preflight never blocks manual editing'
);

select is(
  public.update_draft_state(
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000001',
    'rejected',
    'covered by security test'
  ),
  '60000000-0000-0000-0000-000000000001'::uuid,
  'draft resolution works through the scoped RPC'
);

select throws_like(
  $$ select public.update_session_prep(
       '10000000-0000-0000-0000-000000000001',
       '20000000-0000-0000-0000-000000000001',
       '30000000-0000-0000-0000-000000000001',
       '70000000-0000-0000-0000-000000000001',
       'Security Test Session',
       'Objective',
       'Opening',
       'Scene notes',
       '[]'::jsonb,
       '["character:40000000-0000-0000-0000-000000000003"]'::jsonb,
       '[]'::jsonb
     ) $$,
  '%referenced entity is outside the row scope%',
  'session prep RPC rejects sibling-Saga pinned entity IDs'
);

select is(
  public.storage_path_allowed(
    '10000000-0000-0000-0000-000000000001/20000000-0000-0000-0000-000000000001/30000000-0000-0000-0000-000000000001/session/file.webm'
  ),
  true,
  'storage helper allows owned workspace/world/saga path'
);

select is(
  public.storage_path_allowed(
    '10000000-0000-0000-0000-000000000002/20000000-0000-0000-0000-000000000002/30000000-0000-0000-0000-000000000003/session/file.webm'
  ),
  false,
  'storage helper denies cross-workspace path'
);

reset role;
select * from finish();

rollback;

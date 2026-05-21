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

insert into public.usage_monthly_rollups (workspace_id, period_start, period_end, ai_credits_used)
values ('10000000-0000-0000-0000-000000000001', date_trunc('month', now())::date, (date_trunc('month', now()) + interval '1 month - 1 day')::date, 0)
on conflict (workspace_id, period_start) do update set ai_credits_used = excluded.ai_credits_used;

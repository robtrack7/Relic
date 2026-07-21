create extension if not exists pgtap with schema extensions;

begin;

select plan(34);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, email_change, email_change_token_new, recovery_token)
values
  ('c0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'module5-a@example.test', extensions.crypt('password', extensions.gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false, '', '', '', '')
on conflict (id) do nothing;

insert into public.gm_profiles (id, user_id, experience_level, improv_comfort, prep_style)
values ('c1000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'experienced', 'mixed', 'light')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_gm_id, name)
values ('c2000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Module 5 Workspace')
on conflict (id) do nothing;

insert into public.worlds (id, workspace_id, owner_gm_id, name)
values ('c3000000-0000-0000-0000-000000000001', 'c2000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Module 5 World')
on conflict (id) do nothing;

insert into public.world_eras (id, workspace_id, world_id, name)
values ('c4000000-0000-0000-0000-000000000001', 'c2000000-0000-0000-0000-000000000001', 'c3000000-0000-0000-0000-000000000001', 'Module 5 Era')
on conflict (id) do nothing;

insert into public.sagas (id, workspace_id, world_id, owner_gm_id, primary_era_id, name)
values
  ('c5000000-0000-0000-0000-000000000001', 'c2000000-0000-0000-0000-000000000001', 'c3000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'c4000000-0000-0000-0000-000000000001', 'Module 5 Saga'),
  ('c5000000-0000-0000-0000-000000000002', 'c2000000-0000-0000-0000-000000000001', 'c3000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'c4000000-0000-0000-0000-000000000001', 'Module 5 Sibling')
on conflict (id) do nothing;

insert into public.characters (id, workspace_id, world_id, saga_id, scope, name, summary, narrative, canon_state)
values
  ('c6000000-0000-0000-0000-000000000001', 'c2000000-0000-0000-0000-000000000001', 'c3000000-0000-0000-0000-000000000001', 'c5000000-0000-0000-0000-000000000001', 'saga', 'Pinned Ally', 'Valid pinned entity', 'Ready packet entity', 'canon'),
  ('c6000000-0000-0000-0000-000000000002', 'c2000000-0000-0000-0000-000000000001', 'c3000000-0000-0000-0000-000000000001', 'c5000000-0000-0000-0000-000000000002', 'saga', 'Sibling Pin', 'Invalid sibling entity', 'Wrong Saga', 'canon')
on conflict (id) do nothing;

insert into public.threads (id, workspace_id, world_id, saga_id, scope, name, summary, narrative, objective, canon_state)
values
  ('c6100000-0000-0000-0000-000000000001', 'c2000000-0000-0000-0000-000000000001', 'c3000000-0000-0000-0000-000000000001', 'c5000000-0000-0000-0000-000000000001', 'saga', 'Active Thread', 'Valid thread', 'Thread narrative', 'Thread objective', 'canon'),
  ('c6100000-0000-0000-0000-000000000002', 'c2000000-0000-0000-0000-000000000001', 'c3000000-0000-0000-0000-000000000001', 'c5000000-0000-0000-0000-000000000002', 'saga', 'Sibling Thread', 'Invalid thread', 'Sibling narrative', 'Sibling objective', 'canon')
on conflict (id) do nothing;

insert into public.sessions (id, workspace_id, world_id, saga_id, scope, name, objective, opening_scene, scene_notes, prep_checklist, status, started_at, ended_at)
values
  ('c7000000-0000-0000-0000-000000000001', 'c2000000-0000-0000-0000-000000000001', 'c3000000-0000-0000-0000-000000000001', 'c5000000-0000-0000-0000-000000000001', 'saga', 'Empty Planned Session', null, null, null, '[]'::jsonb, 'planned', null, null),
  ('c7000000-0000-0000-0000-000000000002', 'c2000000-0000-0000-0000-000000000001', 'c3000000-0000-0000-0000-000000000001', 'c5000000-0000-0000-0000-000000000001', 'saga', 'Prepared Session', 'Reach the old gate', 'Open at dusk', 'Bring the ally', '[{"text":"Check consent","done":false}]'::jsonb, 'planned', null, null),
  ('c7000000-0000-0000-0000-000000000003', 'c2000000-0000-0000-0000-000000000001', 'c3000000-0000-0000-0000-000000000001', 'c5000000-0000-0000-0000-000000000001', 'saga', 'Prior Ended Session', 'Prior objective', 'Prior opening', 'Prior notes', '[]'::jsonb, 'ended', now() - interval '2 days', now() - interval '1 day'),
  ('c7000000-0000-0000-0000-000000000004', 'c2000000-0000-0000-0000-000000000001', 'c3000000-0000-0000-0000-000000000001', 'c5000000-0000-0000-0000-000000000001', 'saga', 'Second Prepared Session', 'Follow the second lead', 'Open at dawn', 'Bring the map', '[{"text":"Check safety","done":false}]'::jsonb, 'planned', null, null)
on conflict (id) do nothing;

insert into public.sources (id, workspace_id, world_id, saga_id, scope, kind, session_id, raw_excerpt)
values
  ('c8000000-0000-0000-0000-000000000001', 'c2000000-0000-0000-0000-000000000001', 'c3000000-0000-0000-0000-000000000001', 'c5000000-0000-0000-0000-000000000001', 'saga', 'gm_instruction', 'c7000000-0000-0000-0000-000000000002', 'Current session draft evidence.'),
  ('c8000000-0000-0000-0000-000000000002', 'c2000000-0000-0000-0000-000000000001', 'c3000000-0000-0000-0000-000000000001', 'c5000000-0000-0000-0000-000000000001', 'saga', 'gm_instruction', 'c7000000-0000-0000-0000-000000000004', 'Sibling session draft evidence.')
on conflict (id) do nothing;

insert into public.drafts (id, workspace_id, world_id, saga_id, scope, entity_type, target_entity_id, state, change_kind, proposed_payload)
values
  ('c9000000-0000-0000-0000-000000000001', 'c2000000-0000-0000-0000-000000000001', 'c3000000-0000-0000-0000-000000000001', 'c5000000-0000-0000-0000-000000000001', 'saga', 'character', 'c6000000-0000-0000-0000-000000000001', 'pending', 'update', '{"name":"Current session proposal"}'::jsonb),
  ('c9000000-0000-0000-0000-000000000002', 'c2000000-0000-0000-0000-000000000001', 'c3000000-0000-0000-0000-000000000001', 'c5000000-0000-0000-0000-000000000001', 'saga', 'character', 'c6000000-0000-0000-0000-000000000001', 'pending', 'update', '{"name":"Other session proposal"}'::jsonb)
on conflict (id) do nothing;

insert into public.draft_sources (workspace_id, world_id, saga_id, scope, draft_id, source_id)
values
  ('c2000000-0000-0000-0000-000000000001', 'c3000000-0000-0000-0000-000000000001', 'c5000000-0000-0000-0000-000000000001', 'saga', 'c9000000-0000-0000-0000-000000000001', 'c8000000-0000-0000-0000-000000000001'),
  ('c2000000-0000-0000-0000-000000000001', 'c3000000-0000-0000-0000-000000000001', 'c5000000-0000-0000-0000-000000000001', 'saga', 'c9000000-0000-0000-0000-000000000002', 'c8000000-0000-0000-0000-000000000002')
on conflict (draft_id, source_id) do nothing;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c0000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.saga_id', 'c5000000-0000-0000-0000-000000000001', true);

select has_function('public', 'record_session_consent', array['uuid','uuid','uuid','uuid','boolean'], 'record_session_consent RPC exists');
select has_function('public', 'record_dice_roll', array['uuid','uuid','uuid','uuid','text','integer','integer[]','text'], 'record_dice_roll RPC exists');
select has_function('public', 'get_stage_packet', array['uuid','uuid','uuid','uuid'], 'get_stage_packet RPC exists');

select is(public.append_thread_objective('c2000000-0000-0000-0000-000000000001', 'c3000000-0000-0000-0000-000000000001', 'c5000000-0000-0000-0000-000000000001', 'c6100000-0000-0000-0000-000000000001', 'Open the gate'), 'c6100000-0000-0000-0000-000000000001'::uuid, 'thread objective appends through scoped RPC');
select is(jsonb_array_length(public.get_pending_drafts_for_session('c2000000-0000-0000-0000-000000000001', 'c3000000-0000-0000-0000-000000000001', 'c5000000-0000-0000-0000-000000000001', 'c7000000-0000-0000-0000-000000000002')), 1, 'session review returns only drafts sourced to that session');
select is((public.get_pending_drafts_for_session('c2000000-0000-0000-0000-000000000001', 'c3000000-0000-0000-0000-000000000001', 'c5000000-0000-0000-0000-000000000001', 'c7000000-0000-0000-0000-000000000002')->0->>'id'), 'c9000000-0000-0000-0000-000000000001', 'session review excludes sibling-session drafts');

select throws_like(
  $$ select public.set_session_status('c2000000-0000-0000-0000-000000000001', 'c3000000-0000-0000-0000-000000000001', 'c5000000-0000-0000-0000-000000000001', 'c7000000-0000-0000-0000-000000000001', 'in_progress') $$,
  '%invalid status transition%',
  'planned sessions cannot jump directly to in_progress'
);

select throws_like(
  $$ select public.set_session_status('c2000000-0000-0000-0000-000000000001', 'c3000000-0000-0000-0000-000000000001', 'c5000000-0000-0000-0000-000000000001', 'c7000000-0000-0000-0000-000000000001', 'ready') $$,
  '%ready for stage%',
  'ready requires packet minimums'
);

select is(
  public.update_session_prep(
    'c2000000-0000-0000-0000-000000000001',
    'c3000000-0000-0000-0000-000000000001',
    'c5000000-0000-0000-0000-000000000001',
    'c7000000-0000-0000-0000-000000000002',
    'Prepared Session',
    'Reach the old gate',
    'Open at dusk',
    'Bring the ally',
    '[{"text":"Check consent","done":false}]'::jsonb,
    '["character:c6000000-0000-0000-0000-000000000001"]'::jsonb,
    '["c6100000-0000-0000-0000-000000000001"]'::jsonb
  ),
  'c7000000-0000-0000-0000-000000000002'::uuid,
  'prep update writes valid pins and active threads'
);

select throws_like(
  $$ select public.update_session_prep(
       'c2000000-0000-0000-0000-000000000001',
       'c3000000-0000-0000-0000-000000000001',
       'c5000000-0000-0000-0000-000000000001',
       'c7000000-0000-0000-0000-000000000002',
       'Bad Pin Session',
       'Bad objective',
       'Bad opening',
       'Bad notes',
       '[]'::jsonb,
       '["character:c6000000-0000-0000-0000-000000000002"]'::jsonb,
       '[]'::jsonb
     ) $$,
  '%referenced entity is outside the row scope%',
  'prep update rejects sibling-Saga pins atomically'
);

select is(
  (select name from public.sessions where id = 'c7000000-0000-0000-0000-000000000002'),
  'Prepared Session',
  'failed prep rewrite leaves session fields unchanged'
);

select is(
  public.set_session_status('c2000000-0000-0000-0000-000000000001', 'c3000000-0000-0000-0000-000000000001', 'c5000000-0000-0000-0000-000000000001', 'c7000000-0000-0000-0000-000000000002', 'ready'),
  'c7000000-0000-0000-0000-000000000002'::uuid,
  'valid prepared session can become ready'
);

select ok(
  (select packet_locked_at is not null and pending_prep_suggestions = '[]'::jsonb from public.sessions where id = 'c7000000-0000-0000-0000-000000000002'),
  'ready transition locks packet timestamp and clears pending suggestions'
);

select is(public.set_session_status('c2000000-0000-0000-0000-000000000001', 'c3000000-0000-0000-0000-000000000001', 'c5000000-0000-0000-0000-000000000001', 'c7000000-0000-0000-0000-000000000002', 'started'), 'c7000000-0000-0000-0000-000000000002'::uuid, 'ready session can start');
select is(public.set_session_status('c2000000-0000-0000-0000-000000000001', 'c3000000-0000-0000-0000-000000000001', 'c5000000-0000-0000-0000-000000000001', 'c7000000-0000-0000-0000-000000000004', 'ready'), 'c7000000-0000-0000-0000-000000000004'::uuid, 'another prepared session can remain ready');
select throws_like(
  $$ select public.set_session_status('c2000000-0000-0000-0000-000000000001', 'c3000000-0000-0000-0000-000000000001', 'c5000000-0000-0000-0000-000000000001', 'c7000000-0000-0000-0000-000000000004', 'started') $$,
  '%live session already exists%',
  'only one session per Saga can be started or in progress'
);
select is(public.set_session_status('c2000000-0000-0000-0000-000000000001', 'c3000000-0000-0000-0000-000000000001', 'c5000000-0000-0000-0000-000000000001', 'c7000000-0000-0000-0000-000000000002', 'in_progress'), 'c7000000-0000-0000-0000-000000000002'::uuid, 'started session can go in progress');

select throws_like(
  $$ select public.update_session_prep(
       'c2000000-0000-0000-0000-000000000001',
       'c3000000-0000-0000-0000-000000000001',
       'c5000000-0000-0000-0000-000000000001',
       'c7000000-0000-0000-0000-000000000002',
       'Live Edit',
       'Live objective',
       'Live opening',
       'Live notes',
       '[]'::jsonb,
       '[]'::jsonb,
       '[]'::jsonb
     ) $$,
  '%prep is locked%',
  'prep edits are blocked while in progress'
);

create temp table module5_capture as
select public.quick_capture(
  'c2000000-0000-0000-0000-000000000001',
  'c3000000-0000-0000-0000-000000000001',
  'c5000000-0000-0000-0000-000000000001',
  'c7000000-0000-0000-0000-000000000002',
  'Captured clue at the gate'
) as id;

select ok(
  exists (
    select 1
    from public.sources s
    where s.kind = 'note'
      and s.note_id = (select id from module5_capture)
      and s.session_id = 'c7000000-0000-0000-0000-000000000002'
  ),
  'quick_capture writes a session-scoped note source'
);

create temp table module5_named_capture as
select public.quick_capture(
  'c2000000-0000-0000-0000-000000000001',
  'c3000000-0000-0000-0000-000000000001',
  'c5000000-0000-0000-0000-000000000001',
  'c7000000-0000-0000-0000-000000000002',
  'A messenger saw the exchange.',
  'Harbor witness'
) as id;

select is(
  (select title from public.notes where id = (select id from module5_named_capture)),
  'Harbor witness',
  'quick_capture preserves an explicit Stage Create note title'
);

select is(
  (select note_type::text from public.notes where id = (select id from module5_named_capture)),
  'quick_capture',
  'named Stage Create notes retain quick-capture semantics'
);

select ok(
  exists (
    select 1
    from public.sources s
    where s.note_id = (select id from module5_named_capture)
      and s.session_id = 'c7000000-0000-0000-0000-000000000002'
  ),
  'named Stage Create notes retain session evidence'
);

create temp table module5_stub as
select public.quick_stub(
  'c2000000-0000-0000-0000-000000000001',
  'c3000000-0000-0000-0000-000000000001',
  'c5000000-0000-0000-0000-000000000001',
  'c7000000-0000-0000-0000-000000000002',
  'character',
  'Gate Quartermaster',
  'New stub from Stage'
) as id;

select throws_like(
  $$ select public.quick_stub(
       'c2000000-0000-0000-0000-000000000001',
       'c3000000-0000-0000-0000-000000000001',
       'c5000000-0000-0000-0000-000000000001',
       'c7000000-0000-0000-0000-000000000001',
       'character',
       'Planned Session Stub',
       'Should not write'
     ) $$,
  '%started or in-progress session%',
  'quick_stub requires a writable Stage session'
);

select ok(
  exists (select 1 from public.canon_audit a where a.entity_id = (select id from module5_stub) and a.actor_kind = 'gm'),
  'quick_stub writes canon audit provenance'
);

create temp table module5_more_stubs as
select
  public.quick_stub('c2000000-0000-0000-0000-000000000001', 'c3000000-0000-0000-0000-000000000001', 'c5000000-0000-0000-0000-000000000001', 'c7000000-0000-0000-0000-000000000002', 'place', 'Tideglass Pier', 'Location summary') as place_id,
  public.quick_stub('c2000000-0000-0000-0000-000000000001', 'c3000000-0000-0000-0000-000000000001', 'c5000000-0000-0000-0000-000000000001', 'c7000000-0000-0000-0000-000000000002', 'artifact', 'Brass Compass', 'Item summary') as artifact_id,
  public.quick_stub('c2000000-0000-0000-0000-000000000001', 'c3000000-0000-0000-0000-000000000001', 'c5000000-0000-0000-0000-000000000001', 'c7000000-0000-0000-0000-000000000002', 'thread', 'The Missing Courier', 'Thread summary') as thread_id,
  public.quick_stub('c2000000-0000-0000-0000-000000000001', 'c3000000-0000-0000-0000-000000000001', 'c5000000-0000-0000-0000-000000000001', 'c7000000-0000-0000-0000-000000000002', 'faction', 'Brass Assembly', 'Faction summary') as faction_id;

select ok(
  exists (select 1 from public.characters where id = (select id from module5_stub) and is_stub and created_by = 'gm')
    and exists (select 1 from public.places where id = (select place_id from module5_more_stubs) and is_stub and created_by = 'gm')
    and exists (select 1 from public.artifacts where id = (select artifact_id from module5_more_stubs) and is_stub and created_by = 'gm')
    and exists (select 1 from public.threads where id = (select thread_id from module5_more_stubs) and is_stub and created_by = 'gm')
    and exists (select 1 from public.factions where id = (select faction_id from module5_more_stubs) and is_stub and created_by = 'gm'),
  'quick_stub writes every Stage Create entity type as a GM-authored stub'
);

select is(
  (
    select count(*)::integer
    from public.sources s
    where s.session_id = 'c7000000-0000-0000-0000-000000000002'
      and s.source_entity_id in (
        (select id from module5_stub),
        (select place_id from module5_more_stubs),
        (select artifact_id from module5_more_stubs),
        (select thread_id from module5_more_stubs),
        (select faction_id from module5_more_stubs)
      )
  ),
  5,
  'every Stage Create stub retains its live-session source link'
);

select is(
  (
    select count(*)::integer
    from public.canon_audit a
    where a.entity_id in (
      (select id from module5_stub),
      (select place_id from module5_more_stubs),
      (select artifact_id from module5_more_stubs),
      (select thread_id from module5_more_stubs),
      (select faction_id from module5_more_stubs)
    )
      and a.actor_kind = 'gm'
  ),
  5,
  'every Stage Create stub records GM canon provenance'
);

select is(public.mark_moment('c2000000-0000-0000-0000-000000000001', 'c3000000-0000-0000-0000-000000000001', 'c5000000-0000-0000-0000-000000000001', 'c7000000-0000-0000-0000-000000000002', 'secret'), 'c7000000-0000-0000-0000-000000000002'::uuid, 'mark_moment returns session id for active session');

select is(public.record_session_consent('c2000000-0000-0000-0000-000000000001', 'c3000000-0000-0000-0000-000000000001', 'c5000000-0000-0000-0000-000000000001', 'c7000000-0000-0000-0000-000000000002', true), 'c7000000-0000-0000-0000-000000000002'::uuid, 'record_session_consent returns session id');

select is(public.record_dice_roll('c2000000-0000-0000-0000-000000000001', 'c3000000-0000-0000-0000-000000000001', 'c5000000-0000-0000-0000-000000000001', 'c7000000-0000-0000-0000-000000000002', '2d6+3', 10, array[3,4], 'test roll'), 'c7000000-0000-0000-0000-000000000002'::uuid, 'record_dice_roll returns session id');

select is(public.set_session_status('c2000000-0000-0000-0000-000000000001', 'c3000000-0000-0000-0000-000000000001', 'c5000000-0000-0000-0000-000000000001', 'c7000000-0000-0000-0000-000000000002', 'ended_pending_undo'), 'c7000000-0000-0000-0000-000000000002'::uuid, 'in-progress session can enter ended pending undo');
select is(public.set_session_status('c2000000-0000-0000-0000-000000000001', 'c3000000-0000-0000-0000-000000000001', 'c5000000-0000-0000-0000-000000000001', 'c7000000-0000-0000-0000-000000000002', 'ended'), 'c7000000-0000-0000-0000-000000000002'::uuid, 'ended pending undo can finalize');

select is(
  (select count(*) from public.pipeline_runs where session_id = 'c7000000-0000-0000-0000-000000000002' and state = 'queued'),
  1::bigint,
  'ending a session creates one queued pipeline run'
);

select ok(
  (public.get_stage_packet('c2000000-0000-0000-0000-000000000001', 'c3000000-0000-0000-0000-000000000001', 'c5000000-0000-0000-0000-000000000001', 'c7000000-0000-0000-0000-000000000002') ?& array['session','pinned_entities','active_threads','quick_captures','marked_moments','dice_rolls','consent_state','start_warning']),
  'get_stage_packet returns the rough UI Stage packet keys'
);

reset role;

select * from finish();

rollback;

create extension if not exists pgtap with schema extensions;

begin;

select plan(18);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, email_change, email_change_token_new, recovery_token)
values
  ('b0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'module4-a@example.test', extensions.crypt('password', extensions.gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false, '', '', '', '')
on conflict (id) do nothing;

insert into public.gm_profiles (id, user_id, experience_level, improv_comfort, prep_style)
values ('b1000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'experienced', 'mixed', 'light')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_gm_id, name)
values ('b2000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Module 4 Workspace')
on conflict (id) do nothing;

insert into public.worlds (id, workspace_id, owner_gm_id, name)
values ('b3000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Module 4 World')
on conflict (id) do nothing;

insert into public.world_eras (id, workspace_id, world_id, name)
values ('b4000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000001', 'Module 4 Era')
on conflict (id) do nothing;

insert into public.sagas (id, workspace_id, world_id, owner_gm_id, primary_era_id, name)
values
  ('b5000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'b4000000-0000-0000-0000-000000000001', 'Module 4 Saga'),
  ('b5000000-0000-0000-0000-000000000002', 'b2000000-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'b4000000-0000-0000-0000-000000000001', 'Module 4 Sibling')
on conflict (id) do nothing;

insert into public.characters (id, workspace_id, world_id, saga_id, scope, name, summary, narrative, gm_notes, canon_state)
values
  ('b6000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000001', null, 'world', 'World Oracle', 'World-level recall anchor', 'Shared mythic anchor', 'world private phrase', 'canon'),
  ('b6000000-0000-0000-0000-000000000002', 'b2000000-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000001', 'b5000000-0000-0000-0000-000000000001', 'saga', 'Saga Vector Hero', 'Lexical moonstone anchor', 'Hero narrative with moonstone evidence', 'PRIVATE_NEVER_EMBED_ENTITY', 'canon'),
  ('b6000000-0000-0000-0000-000000000003', 'b2000000-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000001', 'b5000000-0000-0000-0000-000000000002', 'saga', 'Sibling Intruder', 'moonstone sibling content', 'Must not cross into target Saga', null, 'canon'),
  ('b6000000-0000-0000-0000-000000000004', 'b2000000-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000001', 'b5000000-0000-0000-0000-000000000001', 'saga', 'Archived Moonstone', 'moonstone archived content', 'Must not retrieve when archived excluded', null, 'archived')
on conflict (id) do nothing;

insert into public.sessions (id, workspace_id, world_id, saga_id, scope, name, summary, narrative, gm_notes, objective, opening_scene)
values ('b6100000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000001', 'b5000000-0000-0000-0000-000000000001', 'saga', 'Moonstone Session', 'Session summary moonstone', 'Session narrative', 'PRIVATE_NEVER_EMBED_SESSION', 'Recover the moonstone', 'Opening scene')
on conflict (id) do nothing;

insert into public.notes (id, workspace_id, world_id, saga_id, scope, note_type, title, body, canon_state)
values
  ('b6200000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000001', 'b5000000-0000-0000-0000-000000000001', 'saga', 'lore', 'Moonstone Lore', 'Lore body moonstone citation.', 'canon'),
  ('b6200000-0000-0000-0000-000000000002', 'b2000000-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000001', 'b5000000-0000-0000-0000-000000000001', 'saga', 'summary', 'Moonstone Summary', 'Summary body moonstone briefing.', 'canon'),
  ('b6200000-0000-0000-0000-000000000003', 'b2000000-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000001', 'b5000000-0000-0000-0000-000000000001', 'saga', 'quick_capture', 'Moonstone Capture', 'Capture body moonstone live note.', 'canon'),
  ('b6200000-0000-0000-0000-000000000004', 'b2000000-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000001', 'b5000000-0000-0000-0000-000000000001', 'saga', 'gm_note', 'Moonstone Private', 'PRIVATE_NEVER_EMBED_NOTE', 'canon')
on conflict (id) do nothing;

insert into public.sources (id, workspace_id, world_id, saga_id, scope, kind, source_entity_type, source_entity_id, note_id, session_id, raw_excerpt)
values
  ('b7000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000001', null, 'world', 'existing_entity', 'character', 'b6000000-0000-0000-0000-000000000001', null, null, 'World oracle source'),
  ('b7000000-0000-0000-0000-000000000002', 'b2000000-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000001', 'b5000000-0000-0000-0000-000000000001', 'saga', 'existing_entity', 'character', 'b6000000-0000-0000-0000-000000000002', null, null, 'Saga hero source'),
  ('b7000000-0000-0000-0000-000000000003', 'b2000000-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000001', 'b5000000-0000-0000-0000-000000000002', 'saga', 'existing_entity', 'character', 'b6000000-0000-0000-0000-000000000003', null, null, 'Sibling source'),
  ('b7000000-0000-0000-0000-000000000004', 'b2000000-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000001', 'b5000000-0000-0000-0000-000000000001', 'saga', 'note', null, null, 'b6200000-0000-0000-0000-000000000001', null, 'Lore source'),
  ('b7000000-0000-0000-0000-000000000005', 'b2000000-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000001', 'b5000000-0000-0000-0000-000000000001', 'saga', 'note', null, null, 'b6200000-0000-0000-0000-000000000002', null, 'Summary source'),
  ('b7000000-0000-0000-0000-000000000006', 'b2000000-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000001', 'b5000000-0000-0000-0000-000000000001', 'saga', 'note', null, null, 'b6200000-0000-0000-0000-000000000003', 'b6100000-0000-0000-0000-000000000001', 'Quick capture source'),
  ('b7000000-0000-0000-0000-000000000007', 'b2000000-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000001', 'b5000000-0000-0000-0000-000000000001', 'saga', 'existing_entity', 'session', 'b6100000-0000-0000-0000-000000000001', null, 'b6100000-0000-0000-0000-000000000001', 'Session source')
on conflict (id) do nothing;

insert into public.drafts (id, workspace_id, world_id, saga_id, scope, entity_type, target_entity_id, state, change_kind, proposed_payload)
values ('b8000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000001', 'b5000000-0000-0000-0000-000000000001', 'saga', 'character', 'b6000000-0000-0000-0000-000000000002', 'pending', 'update', '{"summary":"pending draft content moonstone"}'::jsonb)
on conflict (id) do nothing;

truncate internal.embedding_jobs;
delete from public.embeddings where workspace_id = 'b2000000-0000-0000-0000-000000000001';

select has_function('public', 'materialize_embedding_job_for_test', array['uuid'], 'test worker materialization helper exists');
select has_function('internal', 'embedding_queue_metrics', array[]::name[], 'internal embedding queue metrics function exists');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'b0000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.saga_id', 'b5000000-0000-0000-0000-000000000001', true);

create temp table module4_created_character as
select (public.create_entity(
  'b2000000-0000-0000-0000-000000000001',
  'b3000000-0000-0000-0000-000000000001',
  'b5000000-0000-0000-0000-000000000001',
  'character',
  'saga',
  '{"name":"Queued Moonstone","summary":"Queue summary moonstone","narrative":"Queue narrative","gm_notes":"PRIVATE_NEVER_EMBED_CREATED"}'::jsonb
)->>'id')::uuid as id;

reset role;

select is(
  (select count(*) from internal.embedding_jobs where source_kind = 'entity' and source_entity_id = (select id from module4_created_character)),
  1::bigint,
  'create_entity queues one entity embedding job'
);

select ok(
  (select source_id is not null from internal.embedding_jobs where source_kind = 'entity' and source_entity_id = (select id from module4_created_character)),
  'queued entity job carries a source id for citation'
);

select public.materialize_embedding_job_for_test((select id from internal.embedding_jobs where source_entity_id = (select id from module4_created_character)));

select ok(
  not exists (
    select 1
    from public.embeddings e
    where e.source_entity_id = (select id from module4_created_character)
      and e.chunk_text ilike '%PRIVATE_NEVER_EMBED_CREATED%'
  ),
  'materialized entity chunk excludes gm_notes'
);

insert into internal.embedding_jobs (id, workspace_id, world_id, saga_id, gm_id, source_kind, source_entity_id, source_id)
values ('b9000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000001', 'b5000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'note', 'b6200000-0000-0000-0000-000000000004', null)
on conflict do nothing;

select throws_like(
  $$ select public.materialize_embedding_job_for_test('b9000000-0000-0000-0000-000000000001') $$,
  '%not embeddable%',
  'gm_note materialization is rejected'
);

insert into internal.embedding_jobs (id, workspace_id, world_id, saga_id, gm_id, source_kind, source_entity_id, source_id)
values
  ('b9000000-0000-0000-0000-000000000002', 'b2000000-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000001', 'b5000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'note', 'b6200000-0000-0000-0000-000000000002', 'b7000000-0000-0000-0000-000000000005'),
  ('b9000000-0000-0000-0000-000000000003', 'b2000000-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000001', 'b5000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'session', 'b6100000-0000-0000-0000-000000000001', 'b7000000-0000-0000-0000-000000000007')
on conflict do nothing;

select public.materialize_embedding_job_for_test('b9000000-0000-0000-0000-000000000002');
select public.materialize_embedding_job_for_test('b9000000-0000-0000-0000-000000000003');

select ok(
  not exists (
    select 1 from public.embeddings e
    where e.source_kind = 'session'
      and e.source_entity_id = 'b6100000-0000-0000-0000-000000000001'
      and e.chunk_text ilike '%PRIVATE_NEVER_EMBED_SESSION%'
  ),
  'materialized session chunk excludes gm_notes'
);

select is(
  (select count(*) from internal.embedding_queue_metrics()),
  1::bigint,
  'embedding queue metrics returns one aggregate row'
);

select ok(
  (select count(*) >= 3 and bool_and(warning_threshold > 0 and warning_threshold <= 1) from internal.retrieval_eval_warning_thresholds()),
  'retrieval eval fixtures expose warning thresholds'
);

insert into public.embeddings (workspace_id, world_id, saga_id, scope, source_kind, source_entity_type, source_entity_id, source_id, chunk_index, chunk_text, embedding, model, model_version, is_current, content_hash)
values
  ('b2000000-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000001', 'b5000000-0000-0000-0000-000000000001', 'saga', 'entity', 'character', 'b6000000-0000-0000-0000-000000000002', 'b7000000-0000-0000-0000-000000000002', 0, 'Saga Vector Hero Lexical moonstone anchor', ('[' || array_to_string(array_prepend('1'::text, array_fill('0'::text, array[1535])), ',') || ']')::extensions.vector, 'text-embedding-3-small', 'mvp', true, 'module4-vector-hero'),
  ('b2000000-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000001', null, 'world', 'entity', 'character', 'b6000000-0000-0000-0000-000000000001', 'b7000000-0000-0000-0000-000000000001', 0, 'World Oracle World-level recall anchor', ('[' || array_to_string(array_prepend('0.7'::text, array_fill('0'::text, array[1535])), ',') || ']')::extensions.vector, 'text-embedding-3-small', 'mvp', true, 'module4-vector-world')
on conflict do nothing;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'b0000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.saga_id', 'b5000000-0000-0000-0000-000000000001', true);

select ok(
  exists (
    select 1
    from public.retrieve_for_task(
      'b2000000-0000-0000-0000-000000000001',
      'b3000000-0000-0000-0000-000000000001',
      'b5000000-0000-0000-0000-000000000001',
      null,
      'moonstone',
      'sanctum_grounding',
      jsonb_build_object('query_embedding', '[' || array_to_string(array_prepend('1'::text, array_fill('0'::text, array[1535])), ',') || ']'),
      10
    ) r
    where r.source_entity_id = 'b6000000-0000-0000-0000-000000000002'
      and r.source_id = 'b7000000-0000-0000-0000-000000000002'
      and r.bm25_rank is not null
      and r.vector_rank is not null
  ),
  'retrieve_for_task returns citeable hybrid lexical/vector entity results'
);

select ok(
  exists (
    select 1
    from public.retrieve_for_task(
      'b2000000-0000-0000-0000-000000000001',
      'b3000000-0000-0000-0000-000000000001',
      'b5000000-0000-0000-0000-000000000001',
      null,
      'world-level',
      'sanctum_grounding',
      '{}'::jsonb,
      10
    ) r
    where r.source_entity_id = 'b6000000-0000-0000-0000-000000000001'
  ),
  'retrieve_for_task includes world canon for profiles that allow it'
);

select is(
  (
    select count(*)
    from public.retrieve_for_task(
      'b2000000-0000-0000-0000-000000000001',
      'b3000000-0000-0000-0000-000000000001',
      'b5000000-0000-0000-0000-000000000001',
      null,
      'sibling archived moonstone',
      'sanctum_grounding',
      '{}'::jsonb,
      20
    ) r
    where r.source_entity_id in ('b6000000-0000-0000-0000-000000000003', 'b6000000-0000-0000-0000-000000000004')
  ),
  0::bigint,
  'retrieve_for_task excludes sibling Saga and archived rows'
);

select ok(
  exists (
    select 1
    from public.retrieve_for_task(
      'b2000000-0000-0000-0000-000000000001',
      'b3000000-0000-0000-0000-000000000001',
      'b5000000-0000-0000-0000-000000000001',
      null,
      'briefing',
      'compose_prep_briefing',
      '{"note_types":["summary"],"include_pending_drafts_for_entity":"b6000000-0000-0000-0000-000000000002"}'::jsonb,
      10
    ) r
    where r.source_entity_id = 'b6200000-0000-0000-0000-000000000002'
  ),
  'compose_prep_briefing can retrieve summary notes'
);

select ok(
  not exists (
    select 1
    from public.retrieve_for_task(
      'b2000000-0000-0000-0000-000000000001',
      'b3000000-0000-0000-0000-000000000001',
      'b5000000-0000-0000-0000-000000000001',
      null,
      'pending draft content moonstone',
      'compose_prep_briefing',
      '{"note_types":["summary"],"include_pending_drafts_for_entity":"b6000000-0000-0000-0000-000000000002"}'::jsonb,
      10
    ) r
    where r.source_entity_id = 'b8000000-0000-0000-0000-000000000001'
  ),
  'compose_prep_briefing hard-canon retrieval excludes pending drafts'
);

select ok(
  not exists (
    select 1
    from public.retrieve_for_task(
      'b2000000-0000-0000-0000-000000000001',
      'b3000000-0000-0000-0000-000000000001',
      'b5000000-0000-0000-0000-000000000001',
      null,
      'moonstone',
      'sanctum_grounding',
      '{"note_types":["summary"]}'::jsonb,
      20
    ) r
    where r.source_entity_id in ('b6200000-0000-0000-0000-000000000001', 'b6200000-0000-0000-0000-000000000003')
  ),
  'note_types filter excludes non-matching lore and quick-capture notes'
);

select ok(
  exists (
    select 1
    from public.retrieve_for_task(
      'b2000000-0000-0000-0000-000000000001',
      'b3000000-0000-0000-0000-000000000001',
      'b5000000-0000-0000-0000-000000000001',
      null,
      'capture',
      'post_session_synthesis',
      '{"session_id":"b6100000-0000-0000-0000-000000000001","note_types":["quick_capture"],"source_kinds":["note"]}'::jsonb,
      10
    ) r
    where r.source_entity_id = 'b6200000-0000-0000-0000-000000000003'
  ),
  'session_id, source_kinds, and note_types can target quick captures'
);

select ok(
  not exists (
    select 1
    from public.retrieve_for_task(
      'b2000000-0000-0000-0000-000000000001',
      'b3000000-0000-0000-0000-000000000001',
      'b5000000-0000-0000-0000-000000000001',
      null,
      'moonstone',
      'sanctum_grounding',
      '{"exclude_entity_id":"b6000000-0000-0000-0000-000000000002"}'::jsonb,
      10
    ) r
    where r.source_entity_id = 'b6000000-0000-0000-0000-000000000002'
  ),
  'exclude_entity_id removes the focus entity from retrieval'
);

select ok(
  exists (
    select 1
    from public.search_for_ui(
      'b2000000-0000-0000-0000-000000000001',
      'b3000000-0000-0000-0000-000000000001',
      'b5000000-0000-0000-0000-000000000001',
      'moonstone',
      'stage',
      10,
      false,
      true,
      true
    ) r
    where r.source_entity_id = 'b6000000-0000-0000-0000-000000000002'
  ),
  'search_for_ui stage literal mode keeps fast lexical fallback usable'
);

reset role;

select * from finish();

rollback;

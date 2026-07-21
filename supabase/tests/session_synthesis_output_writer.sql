create extension if not exists pgtap with schema extensions;

begin;

select plan(44);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, email_change, email_change_token_new, recovery_token)
values
  ('c3000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'c3-a@example.test', extensions.crypt('password', extensions.gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false, '', '', '', ''),
  ('c3000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'c3-b@example.test', extensions.crypt('password', extensions.gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false, '', '', '', '')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_gm_id, name)
values
  ('c3010000-0000-0000-0000-000000000001', 'c3000000-0000-0000-0000-000000000001', 'C3 Workspace A'),
  ('c3110000-0000-0000-0000-000000000001', 'c3000000-0000-0000-0000-000000000002', 'C3 Workspace B')
on conflict (id) do nothing;

insert into public.worlds (id, workspace_id, owner_gm_id, name)
values
  ('c3020000-0000-0000-0000-000000000001', 'c3010000-0000-0000-0000-000000000001', 'c3000000-0000-0000-0000-000000000001', 'C3 World A'),
  ('c3120000-0000-0000-0000-000000000001', 'c3110000-0000-0000-0000-000000000001', 'c3000000-0000-0000-0000-000000000002', 'C3 World B')
on conflict (id) do nothing;

insert into public.sagas (id, workspace_id, world_id, owner_gm_id, name)
values
  ('c3030000-0000-0000-0000-000000000001', 'c3010000-0000-0000-0000-000000000001', 'c3020000-0000-0000-0000-000000000001', 'c3000000-0000-0000-0000-000000000001', 'C3 Saga A'),
  ('c3080000-0000-0000-0000-000000000001', 'c3010000-0000-0000-0000-000000000001', 'c3020000-0000-0000-0000-000000000001', 'c3000000-0000-0000-0000-000000000001', 'C3 Sibling Saga'),
  ('c3130000-0000-0000-0000-000000000001', 'c3110000-0000-0000-0000-000000000001', 'c3120000-0000-0000-0000-000000000001', 'c3000000-0000-0000-0000-000000000002', 'C3 Saga B')
on conflict (id) do nothing;

insert into public.sessions (id, workspace_id, world_id, saga_id, scope, name, status)
values
  ('c3040000-0000-0000-0000-000000000001', 'c3010000-0000-0000-0000-000000000001', 'c3020000-0000-0000-0000-000000000001', 'c3030000-0000-0000-0000-000000000001', 'saga', 'C3 Evidence Session', 'ended'),
  ('c3040000-0000-0000-0000-000000000002', 'c3010000-0000-0000-0000-000000000001', 'c3020000-0000-0000-0000-000000000001', 'c3030000-0000-0000-0000-000000000001', 'saga', 'C3 Next Session', 'planned'),
  ('c3040000-0000-0000-0000-000000000003', 'c3010000-0000-0000-0000-000000000001', 'c3020000-0000-0000-0000-000000000001', 'c3030000-0000-0000-0000-000000000001', 'saga', 'C3 Other Session', 'ended'),
  ('c3090000-0000-0000-0000-000000000001', 'c3010000-0000-0000-0000-000000000001', 'c3020000-0000-0000-0000-000000000001', 'c3080000-0000-0000-0000-000000000001', 'saga', 'C3 Sibling Saga Session', 'ended'),
  ('c3140000-0000-0000-0000-000000000001', 'c3110000-0000-0000-0000-000000000001', 'c3120000-0000-0000-0000-000000000001', 'c3130000-0000-0000-0000-000000000001', 'saga', 'C3 Tenant B Session', 'ended')
on conflict (id) do nothing;

insert into public.pipeline_runs (id, workspace_id, world_id, saga_id, session_id, state, inputs_summary)
values ('c3050000-0000-0000-0000-000000000001', 'c3010000-0000-0000-0000-000000000001', 'c3020000-0000-0000-0000-000000000001', 'c3030000-0000-0000-0000-000000000001', 'c3040000-0000-0000-0000-000000000001', 'synthesizing', '{"fixture":"c3"}'::jsonb)
on conflict (id) do update set state = excluded.state, inputs_summary = excluded.inputs_summary;

insert into public.sources (id, workspace_id, world_id, saga_id, scope, kind, session_id, raw_excerpt)
values
  ('c3060000-0000-0000-0000-000000000001', 'c3010000-0000-0000-0000-000000000001', 'c3020000-0000-0000-0000-000000000001', 'c3030000-0000-0000-0000-000000000001', 'saga', 'pasted_text', 'c3040000-0000-0000-0000-000000000001', 'The Glass Bridge opened after Ilyra returned the sun key.'),
  ('c3060000-0000-0000-0000-000000000002', 'c3010000-0000-0000-0000-000000000001', 'c3020000-0000-0000-0000-000000000001', 'c3030000-0000-0000-0000-000000000001', 'saga', 'gm_manual_summary', 'c3040000-0000-0000-0000-000000000001', 'The bridge is open; its maker remains unknown.'),
  ('c3060000-0000-0000-0000-000000000003', 'c3010000-0000-0000-0000-000000000001', 'c3020000-0000-0000-0000-000000000001', 'c3030000-0000-0000-0000-000000000001', 'saga', 'pasted_text', 'c3040000-0000-0000-0000-000000000003', 'Evidence from the wrong Session.'),
  ('c30a0000-0000-0000-0000-000000000001', 'c3010000-0000-0000-0000-000000000001', 'c3020000-0000-0000-0000-000000000001', 'c3080000-0000-0000-0000-000000000001', 'saga', 'pasted_text', 'c3090000-0000-0000-0000-000000000001', 'Evidence from a sibling Saga.'),
  ('c3160000-0000-0000-0000-000000000001', 'c3110000-0000-0000-0000-000000000001', 'c3120000-0000-0000-0000-000000000001', 'c3130000-0000-0000-0000-000000000001', 'saga', 'pasted_text', 'c3140000-0000-0000-0000-000000000001', 'Evidence from another tenant.')
on conflict (id) do nothing;

create or replace function pg_temp.c3_fixture()
returns jsonb
language sql
immutable
as $$
  select '{
    "session_summary":{"title":"Session 7 Summary","body":"The Glass Bridge opened after Ilyra returned the sun key.","sources":["c3060000-0000-0000-0000-000000000001"],"confidence_reason":"direct_gm_input"},
    "proposed_entity_changes":[{"change_kind":"create","entity_type":"place","proposed_scope":"saga","payload":{"name":"Glass Bridge","summary":"A bridge that opens for the bearer of the sun key."},"sources":["c3060000-0000-0000-0000-000000000001","c3060000-0000-0000-0000-000000000002"],"confidence_reason":"multiple_strong_sources"}],
    "loose_threads":[{"suggested_name":"Who forged the sun key?","reason":"The maker was named but their motive remains unresolved.","sources":["c3060000-0000-0000-0000-000000000002"],"confidence_reason":"single_clear_segment"}],
    "next_prep_implications":[{"text":"Prepare the first scene beyond the Glass Bridge.","related_entity_ids":[],"sources":["c3060000-0000-0000-0000-000000000001"],"confidence_reason":"direct_gm_input"}],
    "stub_evidence_flags":[]
  }'::jsonb;
$$;

create or replace function pg_temp.c3_create_run(p_run_id uuid, p_allowed uuid[])
returns uuid
language plpgsql
as $$
begin
  insert into internal.ai_task_runs (
    id, workspace_id, world_id, saga_id, session_id, gm_id, task_name, prompt_version,
    quota_tier, ai_credits, model_tier, resolved_model, resolved_provider, retrieval_profile,
    source_policy, output_mode, status, attempts, input_payload, allowed_source_ids
  ) values (
    p_run_id,
    'c3010000-0000-0000-0000-000000000001',
    'c3020000-0000-0000-0000-000000000001',
    'c3030000-0000-0000-0000-000000000001',
    'c3040000-0000-0000-0000-000000000001',
    'c3000000-0000-0000-0000-000000000001',
    'synthesize_session', 'synthesize_session@1.0.0', 'pipeline_synthesis', 15,
    'relic-deep', 'deterministic-synthesis-fixture', 'deterministic-test',
    'post_session_synthesis', 'canon_plus_untrusted_input', 'draft_batch', 'running', 1,
    '{"pipeline_run_id":"c3050000-0000-0000-0000-000000000001","next_session_id":"c3040000-0000-0000-0000-000000000002"}'::jsonb,
    p_allowed
  );
  return p_run_id;
end;
$$;

select has_table('internal', 'ai_draft_batches', 'C3 draft batch ledger exists');
select has_column('public', 'drafts', 'draft_batch_id', 'drafts preserve batch identity');
select has_column('public', 'drafts', 'ai_task_run_id', 'drafts preserve AI run identity');
select has_column('public', 'drafts', 'ai_provider', 'drafts preserve provider provenance');

select pg_temp.c3_create_run('c3200000-0000-0000-0000-000000000001', array['c3060000-0000-0000-0000-000000000001'::uuid, 'c3060000-0000-0000-0000-000000000002'::uuid]);

set local role service_role;
create temp table c3_happy_result as
select public.record_ai_task_output_for_worker(
  'c3200000-0000-0000-0000-000000000001',
  pg_temp.c3_fixture(),
  array['c3060000-0000-0000-0000-000000000001'::uuid, 'c3060000-0000-0000-0000-000000000002'::uuid],
  'deterministic-synthesis-fixture',
  'deterministic-test'
) as result;
reset role;

select ok((select (result->>'ok')::boolean from c3_happy_result), 'deterministic fixture writes successfully');
select is((select (result->>'draft_count')::integer from c3_happy_result), 4, 'fixture creates summary, entity, Thread, and next-prep drafts');
select is((select count(*) from public.drafts where ai_task_run_id = 'c3200000-0000-0000-0000-000000000001'), 4::bigint, 'one run owns exactly four drafts');
select is((select count(distinct draft_batch_id) from public.drafts where ai_task_run_id = 'c3200000-0000-0000-0000-000000000001'), 1::bigint, 'all synthesis drafts share one batch identity');
select set_eq(
  $$ select entity_type::text from public.drafts where ai_task_run_id = 'c3200000-0000-0000-0000-000000000001' $$,
  $$ values ('note'), ('place'), ('thread'), ('session') $$,
  'batch contains every C3 draft kind'
);
select is((select count(*) from public.drafts where ai_task_run_id = 'c3200000-0000-0000-0000-000000000001' and state = 'pending'), 4::bigint, 'all synthesis outputs remain pending');
select is((select count(*) from public.drafts where ai_task_run_id = 'c3200000-0000-0000-0000-000000000001' and confidence_reason is not null and confidence_band is not null), 4::bigint, 'confidence reason and derived band are preserved');
select is((select count(*) from public.drafts where ai_task_run_id = 'c3200000-0000-0000-0000-000000000001' and ai_task_name = 'synthesize_session' and ai_prompt_version = 'synthesize_session@1.0.0' and ai_model = 'deterministic-synthesis-fixture' and ai_provider = 'deterministic-test'), 4::bigint, 'task, prompt, model, and provider provenance are preserved');
select is((select count(*) from public.drafts where ai_task_run_id = 'c3200000-0000-0000-0000-000000000001' and pipeline_run_id = 'c3050000-0000-0000-0000-000000000001' and session_id = 'c3040000-0000-0000-0000-000000000001'), 4::bigint, 'pipeline and evidence Session provenance are preserved');
select is((select count(*) from public.draft_sources ds join public.drafts d on d.id = ds.draft_id where d.ai_task_run_id = 'c3200000-0000-0000-0000-000000000001'), 5::bigint, 'draft sources preserve the fixture citations without duplication');
select ok(not exists (
  select 1
  from public.draft_sources ds
  join public.drafts d on d.id = ds.draft_id
  join public.sources s on s.id = ds.source_id
  where d.ai_task_run_id = 'c3200000-0000-0000-0000-000000000001'
    and (s.workspace_id, s.world_id, s.saga_id, s.session_id) is distinct from (d.workspace_id, d.world_id, d.saga_id, d.session_id)
), 'every written source belongs to the exact draft Workspace, World, Saga, and Session');
select is((select state::text from public.pipeline_runs where id = 'c3050000-0000-0000-0000-000000000001'), 'ready_for_review', 'successful batch advances its pipeline to review');
select is((select status from internal.ai_task_runs where id = 'c3200000-0000-0000-0000-000000000001'), 'complete', 'successful batch completes the AI run');

create temp table c3_retry_result as
select public.record_ai_task_output_for_worker(
  'c3200000-0000-0000-0000-000000000001',
  pg_temp.c3_fixture(),
  array['c3060000-0000-0000-0000-000000000001'::uuid, 'c3060000-0000-0000-0000-000000000002'::uuid],
  'deterministic-synthesis-fixture',
  'deterministic-test'
) as result;

select ok((select (result->>'replayed')::boolean from c3_retry_result), 'exact retry returns the recorded batch');
select is((select result->>'batch_id' from c3_retry_result), (select result->>'batch_id' from c3_happy_result), 'exact retry preserves batch identity');
select is((select count(*) from public.drafts where ai_task_run_id = 'c3200000-0000-0000-0000-000000000001'), 4::bigint, 'exact retry creates no duplicate drafts');
select is((select count(*) from internal.ai_draft_batches where ai_task_run_id = 'c3200000-0000-0000-0000-000000000001'), 1::bigint, 'duplicate delivery creates no duplicate batch');
select throws_like(
  $$ select internal.record_ai_task_output('c3200000-0000-0000-0000-000000000001', jsonb_set(pg_temp.c3_fixture(), '{session_summary,body}', '"different"'::jsonb), array['c3060000-0000-0000-0000-000000000001'::uuid, 'c3060000-0000-0000-0000-000000000002'::uuid]) $$,
  '%already completed with different output%',
  'idempotency key reuse with different output fails closed'
);

select pg_temp.c3_create_run('c3200000-0000-0000-0000-000000000002', array['c3060000-0000-0000-0000-000000000001'::uuid]);
select throws_like(
  $$ select internal.record_ai_task_output('c3200000-0000-0000-0000-000000000002', jsonb_set(pg_temp.c3_fixture(), '{proposed_entity_changes}', '{}'::jsonb), array['c3060000-0000-0000-0000-000000000001'::uuid]) $$,
  '%proposed_entity_changes must be an array%',
  'malformed synthesis output is rejected before persistence'
);
select is((select count(*) from public.drafts where ai_task_run_id = 'c3200000-0000-0000-0000-000000000002'), 0::bigint, 'malformed output creates no drafts');

select pg_temp.c3_create_run('c3200000-0000-0000-0000-000000000003', array['c3060000-0000-0000-0000-000000000001'::uuid, 'c3060000-0000-0000-0000-000000000002'::uuid]);
select throws_like(
  $$ select internal.record_ai_task_output('c3200000-0000-0000-0000-000000000003', jsonb_set(pg_temp.c3_fixture(), '{proposed_entity_changes,0,sources}', '[]'::jsonb), array['c3060000-0000-0000-0000-000000000001'::uuid, 'c3060000-0000-0000-0000-000000000002'::uuid]) $$,
  '%requires at least one source%',
  'draftable output without source IDs is rejected'
);

select pg_temp.c3_create_run('c3200000-0000-0000-0000-000000000004', array['c3060000-0000-0000-0000-000000000001'::uuid]);
select throws_like(
  $$ select internal.record_ai_task_output('c3200000-0000-0000-0000-000000000004', jsonb_set(pg_temp.c3_fixture(), '{session_summary,sources}', '["ffffffff-ffff-ffff-ffff-ffffffffffff"]'::jsonb), array['c3060000-0000-0000-0000-000000000001'::uuid]) $$,
  '%outside the allowed retrieval set%',
  'hallucinated source IDs are rejected'
);
select is((select count(*) from public.drafts where ai_task_run_id = 'c3200000-0000-0000-0000-000000000004'), 0::bigint, 'hallucinated source rejection writes no drafts');

select pg_temp.c3_create_run('c3200000-0000-0000-0000-000000000005', array['c3990000-0000-0000-0000-000000000001'::uuid]);
select throws_like(
  $$ select internal.record_ai_task_output('c3200000-0000-0000-0000-000000000005', jsonb_set(jsonb_set(pg_temp.c3_fixture(), '{session_summary,sources}', '["c3990000-0000-0000-0000-000000000001"]'::jsonb), '{proposed_entity_changes}', '[]'::jsonb), array['c3990000-0000-0000-0000-000000000001'::uuid]) $$,
  '%missing or outside the run Workspace, World, Saga, and Session%',
  'allowed-but-missing source rows are rejected'
);

select pg_temp.c3_create_run('c3200000-0000-0000-0000-000000000006', array['c3060000-0000-0000-0000-000000000003'::uuid]);
select throws_like(
  $$ select internal.record_ai_task_output('c3200000-0000-0000-0000-000000000006', jsonb_set(jsonb_set(pg_temp.c3_fixture(), '{session_summary,sources}', '["c3060000-0000-0000-0000-000000000003"]'::jsonb), '{proposed_entity_changes}', '[]'::jsonb), array['c3060000-0000-0000-0000-000000000003'::uuid]) $$,
  '%missing or outside the run Workspace, World, Saga, and Session%',
  'cross-Session sources are rejected even when listed as allowed'
);

select pg_temp.c3_create_run('c3200000-0000-0000-0000-000000000007', array['c30a0000-0000-0000-0000-000000000001'::uuid]);
select throws_like(
  $$ select internal.record_ai_task_output('c3200000-0000-0000-0000-000000000007', jsonb_set(jsonb_set(pg_temp.c3_fixture(), '{session_summary,sources}', '["c30a0000-0000-0000-0000-000000000001"]'::jsonb), '{proposed_entity_changes}', '[]'::jsonb), array['c30a0000-0000-0000-0000-000000000001'::uuid]) $$,
  '%missing or outside the run Workspace, World, Saga, and Session%',
  'cross-Saga sources are rejected even when listed as allowed'
);

select pg_temp.c3_create_run('c3200000-0000-0000-0000-000000000008', array['c3160000-0000-0000-0000-000000000001'::uuid]);
select throws_like(
  $$ select internal.record_ai_task_output('c3200000-0000-0000-0000-000000000008', jsonb_set(jsonb_set(pg_temp.c3_fixture(), '{session_summary,sources}', '["c3160000-0000-0000-0000-000000000001"]'::jsonb), '{proposed_entity_changes}', '[]'::jsonb), array['c3160000-0000-0000-0000-000000000001'::uuid]) $$,
  '%missing or outside the run Workspace, World, Saga, and Session%',
  'cross-tenant sources are rejected even when listed as allowed'
);
select is((select count(*) from public.drafts where workspace_id = 'c3110000-0000-0000-0000-000000000001'), 0::bigint, 'tenant isolation leaves the sibling Workspace untouched');

select pg_temp.c3_create_run('c3200000-0000-0000-0000-000000000010', array['c3060000-0000-0000-0000-000000000001'::uuid]);
select throws_like(
  $$ select internal.record_ai_task_output('c3200000-0000-0000-0000-000000000010', jsonb_set(jsonb_set(pg_temp.c3_fixture(), '{proposed_entity_changes}', '[]'::jsonb), '{loose_threads}', '[]'::jsonb), array['c3060000-0000-0000-0000-000000000001'::uuid, 'c3160000-0000-0000-0000-000000000001'::uuid]) $$,
  '%does not match the immutable AI run source set%',
  'delivery cannot expand the source allowlist recorded by orchestration'
);
select is((select count(*) from public.drafts where ai_task_run_id = 'c3200000-0000-0000-0000-000000000010'), 0::bigint, 'allowlist expansion attempt creates no drafts');

create or replace function pg_temp.c3_inject_partial_failure()
returns trigger
language plpgsql
as $$
begin
  if new.proposed_payload ? 'force_failure' then
    raise exception 'injected C3 partial failure';
  end if;
  return new;
end;
$$;

create trigger c3_inject_partial_failure
before insert on public.drafts
for each row execute function pg_temp.c3_inject_partial_failure();

update public.pipeline_runs set state = 'synthesizing' where id = 'c3050000-0000-0000-0000-000000000001';
select pg_temp.c3_create_run('c3200000-0000-0000-0000-000000000009', array['c3060000-0000-0000-0000-000000000001'::uuid, 'c3060000-0000-0000-0000-000000000002'::uuid]);
select throws_like(
  $$ select internal.record_ai_task_output('c3200000-0000-0000-0000-000000000009', jsonb_set(pg_temp.c3_fixture(), '{proposed_entity_changes,0,payload,force_failure}', 'true'::jsonb), array['c3060000-0000-0000-0000-000000000001'::uuid, 'c3060000-0000-0000-0000-000000000002'::uuid]) $$,
  '%injected C3 partial failure%',
  'mid-batch persistence failure is surfaced'
);
select is((select count(*) from public.drafts where ai_task_run_id = 'c3200000-0000-0000-0000-000000000009'), 0::bigint, 'mid-batch failure rolls back earlier draft inserts');
select is((select count(*) from internal.ai_draft_batches where ai_task_run_id = 'c3200000-0000-0000-0000-000000000009'), 0::bigint, 'mid-batch failure rolls back batch identity');

drop trigger c3_inject_partial_failure on public.drafts;

select is((select count(*) from public.notes where workspace_id = 'c3010000-0000-0000-0000-000000000001'), 0::bigint, 'synthesis writes zero note canon rows');
select is((select count(*) from public.places where workspace_id = 'c3010000-0000-0000-0000-000000000001'), 0::bigint, 'synthesis writes zero entity canon rows');
select is((select count(*) from public.threads where workspace_id = 'c3010000-0000-0000-0000-000000000001'), 0::bigint, 'synthesis writes zero Thread canon rows');
select is((select count(*) from public.canon_audit where workspace_id = 'c3010000-0000-0000-0000-000000000001'), 0::bigint, 'synthesis writes zero canon audit rows');
select is((select count(*) from public.embeddings where workspace_id = 'c3010000-0000-0000-0000-000000000001'), 0::bigint, 'synthesis writes zero retrieval-visible embeddings');
select is((select opening_scene from public.sessions where id = 'c3040000-0000-0000-0000-000000000002'), null, 'next-session prep remains unchanged until explicit approval');
select is((select summary_note_id from public.pipeline_runs where id = 'c3050000-0000-0000-0000-000000000001'), null, 'pipeline stores no canonical summary note automatically');

select * from finish();

rollback;

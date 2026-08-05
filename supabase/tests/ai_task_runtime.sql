create extension if not exists pgtap with schema extensions;

begin;

select plan(33);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, email_change, email_change_token_new, recovery_token)
values
  ('90000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'module9@example.test', extensions.crypt('password', extensions.gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false, '', '', '', '')
on conflict (id) do nothing;

insert into public.workspaces (id, owner_gm_id, name, usage_limits)
values ('90100000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000001', 'Module 9 Workspace', '{"plan":"test","ai_credits_monthly":20,"transcription_seconds_monthly":3600,"storage_bytes":1000000,"worlds_active":2,"sagas_active":2,"entities_per_saga":100,"imports_monthly":10,"exports_monthly":10}'::jsonb)
on conflict (id) do update set usage_limits = excluded.usage_limits;

insert into public.worlds (id, workspace_id, owner_gm_id, name)
values ('90200000-0000-0000-0000-000000000001', '90100000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000001', 'Module 9 World')
on conflict (id) do nothing;

insert into public.world_eras (id, workspace_id, world_id, name)
values ('90300000-0000-0000-0000-000000000001', '90100000-0000-0000-0000-000000000001', '90200000-0000-0000-0000-000000000001', 'Default Era')
on conflict (id) do nothing;

insert into public.sagas (id, workspace_id, world_id, owner_gm_id, primary_era_id, name)
values ('90400000-0000-0000-0000-000000000001', '90100000-0000-0000-0000-000000000001', '90200000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000001', '90300000-0000-0000-0000-000000000001', 'Module 9 Saga')
on conflict (id) do nothing;

insert into public.sessions (id, workspace_id, world_id, saga_id, scope, name, objective)
values ('90500000-0000-0000-0000-000000000001', '90100000-0000-0000-0000-000000000001', '90200000-0000-0000-0000-000000000001', '90400000-0000-0000-0000-000000000001', 'saga', 'Module 9 Session', 'Prove the runtime contract.')
on conflict (id) do nothing;

insert into public.sources (id, workspace_id, world_id, saga_id, scope, kind, source_entity_type, source_entity_id, session_id, raw_excerpt)
values
  ('90600000-0000-0000-0000-000000000001', '90100000-0000-0000-0000-000000000001', '90200000-0000-0000-0000-000000000001', '90400000-0000-0000-0000-000000000001', 'saga', 'existing_entity', 'session', '90500000-0000-0000-0000-000000000001', '90500000-0000-0000-0000-000000000001', 'Approved session context.'),
  ('90600000-0000-0000-0000-000000000002', '90100000-0000-0000-0000-000000000001', '90200000-0000-0000-0000-000000000001', '90400000-0000-0000-0000-000000000001', 'saga', 'transcript_segment', 'session', '90500000-0000-0000-0000-000000000001', '90500000-0000-0000-0000-000000000001', 'Transcript evidence for synthesis.')
on conflict (id) do nothing;

insert into public.pipeline_runs (id, workspace_id, world_id, saga_id, session_id, state, inputs_summary)
values ('90700000-0000-0000-0000-000000000001', '90100000-0000-0000-0000-000000000001', '90200000-0000-0000-0000-000000000001', '90400000-0000-0000-0000-000000000001', '90500000-0000-0000-0000-000000000001', 'synthesizing', '{"fixture":"module9"}'::jsonb)
on conflict (id) do update set state = excluded.state, inputs_summary = excluded.inputs_summary;

insert into public.usage_monthly_rollups (workspace_id, period_start, period_end, ai_credits_used)
values ('90100000-0000-0000-0000-000000000001', date_trunc('month', now())::date, (date_trunc('month', now()) + interval '1 month - 1 day')::date, 0)
on conflict (workspace_id, period_start) do update set ai_credits_used = excluded.ai_credits_used;

create or replace function pg_temp.module9_contract_rows()
returns table (
  task_name text,
  prompt_version text,
  quota_tier text,
  ai_credits numeric,
  model_tier text,
  retrieval_profile text,
  source_policy text,
  output_mode text,
  active boolean
)
language plpgsql
as $$
begin
  if to_regprocedure('internal.ai_task_contracts()') is null then
    return;
  end if;

  return query execute
    'select task_name, prompt_version, quota_tier, ai_credits, model_tier, retrieval_profile, source_policy, output_mode, active from internal.ai_task_contracts()';
end;
$$;

create or replace function pg_temp.module9_preflight(task_name text)
returns jsonb
language plpgsql
as $$
declare
  response jsonb;
begin
  if to_regprocedure('public.preflight_ai_task(uuid,uuid,uuid,uuid,text,jsonb)') is null then
    return '{"allowed":false,"missing":true}'::jsonb;
  end if;

  execute 'select public.preflight_ai_task($1,$2,$3,$4,$5,$6)'
    using
      '90100000-0000-0000-0000-000000000001'::uuid,
      '90200000-0000-0000-0000-000000000001'::uuid,
      '90400000-0000-0000-0000-000000000001'::uuid,
      '90500000-0000-0000-0000-000000000001'::uuid,
      task_name,
      '{}'::jsonb
    into response;
  return response;
end;
$$;

create or replace function pg_temp.module9_validate_source_ids(allowed uuid[], output jsonb)
returns boolean
language plpgsql
as $$
declare
  response boolean;
begin
  if to_regprocedure('internal.validate_ai_source_ids(uuid[],jsonb)') is null then
    return false;
  end if;

  execute 'select internal.validate_ai_source_ids($1,$2)' using allowed, output into response;
  return coalesce(response, false);
end;
$$;

create or replace function pg_temp.module9_create_run(task_name text)
returns uuid
language plpgsql
as $$
declare
  run_id uuid;
begin
  if to_regclass('internal.ai_task_runs') is null then
    return null;
  end if;

  execute '
    insert into internal.ai_task_runs (
      workspace_id, world_id, saga_id, session_id, gm_id, task_name, prompt_version,
      quota_tier, ai_credits, model_tier, resolved_model, resolved_provider, retrieval_profile,
      source_policy, output_mode, status, attempts, repair_attempts, latency_ms,
      input_payload, allowed_source_ids
    )
    select
      $1, $2, $3, $4, $5, c.task_name, c.prompt_version,
      c.quota_tier, c.ai_credits, c.model_tier, ''test-model'', ''deterministic-test'', c.retrieval_profile,
      c.source_policy, c.output_mode, ''running'', 1, 0, 25, $6, $7
    from internal.ai_task_contracts() c
    where c.task_name = $8
    returning id'
    using
      '90100000-0000-0000-0000-000000000001'::uuid,
      '90200000-0000-0000-0000-000000000001'::uuid,
      '90400000-0000-0000-0000-000000000001'::uuid,
      '90500000-0000-0000-0000-000000000001'::uuid,
      '90000000-0000-0000-0000-000000000001'::uuid,
      '{"pipeline_run_id":"90700000-0000-0000-0000-000000000001"}'::jsonb,
      array['90600000-0000-0000-0000-000000000001'::uuid, '90600000-0000-0000-0000-000000000002'::uuid],
      task_name
    into run_id;
  return run_id;
end;
$$;

create or replace function pg_temp.module9_record_output(run_id uuid, output jsonb)
returns jsonb
language plpgsql
as $$
declare
  response jsonb;
begin
  if run_id is null or to_regprocedure('internal.record_ai_task_output(uuid,jsonb,uuid[])') is null then
    return '{"ok":false,"missing":true}'::jsonb;
  end if;

  execute 'select internal.record_ai_task_output($1,$2,$3)'
    using run_id, output, array['90600000-0000-0000-0000-000000000001'::uuid, '90600000-0000-0000-0000-000000000002'::uuid]
    into response;
  return response;
end;
$$;

create or replace function pg_temp.module9_run_output(run_id uuid)
returns jsonb
language plpgsql
as $$
declare
  response jsonb;
begin
  if run_id is null or to_regclass('internal.ai_task_runs') is null then
    return null;
  end if;

  execute 'select output_payload from internal.ai_task_runs where id = $1' using run_id into response;
  return response;
end;
$$;

create or replace function pg_temp.module9_run_log_complete(run_id uuid)
returns boolean
language plpgsql
as $$
declare
  response boolean;
begin
  if run_id is null or to_regclass('internal.ai_task_runs') is null then
    return false;
  end if;

  execute '
    select exists (
      select 1
      from internal.ai_task_runs
      where id = $1
        and prompt_version = ''answer_saga_question@1.1.0''
        and model_tier = ''relic-balanced''
        and resolved_model = ''test-model''
        and workspace_id = ''90100000-0000-0000-0000-000000000001''
        and world_id = ''90200000-0000-0000-0000-000000000001''
        and saga_id = ''90400000-0000-0000-0000-000000000001''
        and latency_ms = 25
        and status = ''complete''
    )'
    using run_id
    into response;
  return coalesce(response, false);
end;
$$;

create temp table module9_runs (
  task_name text primary key,
  run_id uuid
);

select has_function('internal', 'ai_task_contracts', array[]::text[], 'AI task contract registry exists');
select has_table('internal', 'ai_task_runs', 'AI task run ledger exists');
select has_function('public', 'preflight_ai_task', array['uuid','uuid','uuid','uuid','text','jsonb'], 'AI preflight RPC has browser-callable signature');
select has_function('internal', 'validate_ai_source_ids', array['uuid[]','jsonb'], 'AI source validator exists');
select has_function('internal', 'record_ai_task_output', array['uuid','jsonb','uuid[]'], 'AI output writer exists');

select is((select count(*) from pg_temp.module9_contract_rows()), 10::bigint, 'registry includes all ten MVP AI tasks');

select set_eq(
  $$ select task_name from pg_temp.module9_contract_rows() $$,
  $$ values
    ('scaffold_saga'),
    ('draft_entity_from_prompt'),
    ('generate_session_prep'),
    ('compose_prep_briefing'),
    ('synthesize_session'),
    ('propose_scene_beats'),
    ('propose_thread_complication'),
    ('propose_npc_for_scene'),
    ('answer_saga_question'),
    ('propose_quick_stub_fleshing') $$,
  'registry task names match AI Task Registry v1.0'
);

select ok(not exists (
  select 1
  from pg_temp.module9_contract_rows()
  where (
       task_name in ('answer_saga_question', 'scaffold_saga', 'draft_entity_from_prompt')
       and prompt_version <> task_name || '@1.1.0'
     )
     or (
       task_name not in ('answer_saga_question', 'scaffold_saga', 'draft_entity_from_prompt')
       and prompt_version !~ ('^' || task_name || '@1\.0\.0$')
     )
     or quota_tier not in ('light', 'standard', 'heavy', 'pipeline_synthesis')
     or model_tier not in ('relic-fast', 'relic-balanced', 'relic-deep')
     or retrieval_profile not in ('none', 'workshop_grounding', 'session_prep_grounding', 'sanctum_grounding', 'sanctum_qa_grounding', 'post_session_synthesis')
     or source_policy not in ('canon_only', 'canon_plus_untrusted_input', 'untrusted_input_only', 'none')
     or output_mode not in ('workshop_draft_payload', 'draft', 'prep_suggestions', 'prep_briefing', 'draft_batch', 'ephemeral')
     or active is not true
), 'every registry task has a valid prompt/version/quota/model/retrieval/source/output contract');

select results_eq(
  $$ select quota_tier, ai_credits, model_tier, retrieval_profile, source_policy, output_mode
     from pg_temp.module9_contract_rows()
     where task_name = 'compose_prep_briefing' $$,
  $$ values ('standard'::text, 3::numeric, 'relic-balanced'::text, 'session_prep_grounding'::text, 'canon_only'::text, 'ephemeral'::text) $$,
  'compose_prep_briefing is canon-only standard ephemeral output'
);

select results_eq(
  $$ select quota_tier, ai_credits, model_tier, retrieval_profile, source_policy, output_mode
     from pg_temp.module9_contract_rows()
     where task_name = 'synthesize_session' $$,
  $$ values ('pipeline_synthesis'::text, 15::numeric, 'relic-deep'::text, 'post_session_synthesis'::text, 'canon_plus_untrusted_input'::text, 'draft_batch'::text) $$,
  'synthesize_session is deep post-session draft-batch output'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '90000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.saga_id', '90400000-0000-0000-0000-000000000001', true);

select ok((pg_temp.module9_preflight('compose_prep_briefing') ->> 'allowed')::boolean, 'AI preflight allows available quota');
select is(pg_temp.module9_preflight('compose_prep_briefing') #>> '{contract,quota_tier}', 'standard', 'AI preflight returns task contract details');

reset role;
update public.workspaces
set usage_limits = jsonb_set(usage_limits, '{ai_credits_monthly}', '0'::jsonb)
where id = '90100000-0000-0000-0000-000000000001';

set local role authenticated;
select set_config('request.jwt.claim.sub', '90000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.saga_id', '90400000-0000-0000-0000-000000000001', true);

select is((pg_temp.module9_preflight('compose_prep_briefing') ->> 'allowed')::boolean, false, 'AI preflight blocks quota-exhausted tasks');
select is((pg_temp.module9_preflight('compose_prep_briefing') ->> 'manual_fallback_available')::boolean, true, 'quota-blocked AI preflight preserves manual fallback');

reset role;
update public.workspaces
set usage_limits = jsonb_set(usage_limits, '{ai_credits_monthly}', '20'::jsonb)
where id = '90100000-0000-0000-0000-000000000001';

select ok(
  pg_temp.module9_validate_source_ids(
    array['90600000-0000-0000-0000-000000000001'::uuid],
    '{"sources":["90600000-0000-0000-0000-000000000001"],"nested":{"source_id":"90600000-0000-0000-0000-000000000001"}}'::jsonb
  ),
  'source validator accepts IDs from the allowed set'
);

select is(
  pg_temp.module9_validate_source_ids(
    array['90600000-0000-0000-0000-000000000001'::uuid],
    '{"sources":["99999999-9999-9999-9999-999999999999"]}'::jsonb
  ),
  false,
  'source validator rejects hallucinated source IDs'
);

insert into module9_runs (task_name, run_id) values ('compose_prep_briefing', pg_temp.module9_create_run('compose_prep_briefing'));
select ok((pg_temp.module9_record_output((select run_id from module9_runs where task_name = 'compose_prep_briefing'), '{"no_answer":false,"body":"A compact canon-only briefing.","bullets":[{"id":"b1","value":"One","sources":["90600000-0000-0000-0000-000000000001"]}],"sources":["90600000-0000-0000-0000-000000000001"],"confidence_reason":"direct_gm_input"}'::jsonb) ->> 'ok')::boolean, 'prep briefing output writer succeeds');
select is((select prep_briefing from public.sessions where id = '90500000-0000-0000-0000-000000000001'), null::jsonb, 'prep briefing output remains ephemeral until explicit acceptance');
select is((select count(*) from public.drafts where workspace_id = '90100000-0000-0000-0000-000000000001'), 0::bigint, 'prep briefing writer creates no drafts');

insert into module9_runs (task_name, run_id) values ('generate_session_prep', pg_temp.module9_create_run('generate_session_prep'));
select ok((pg_temp.module9_record_output((select run_id from module9_runs where task_name = 'generate_session_prep'), '{"no_answer":false,"suggestions":[{"id":"s1","scope":"objective","value":"Follow the relic clue.","rationale":"Grounded","sources":["90600000-0000-0000-0000-000000000001"],"confidence_reason":"direct_gm_input"}],"summary":"One useful suggestion.","confidence_reason":"direct_gm_input"}'::jsonb) ->> 'ok')::boolean, 'session prep suggestion output writer succeeds');
select is((select jsonb_array_length(pending_prep_suggestions) from public.sessions where id = '90500000-0000-0000-0000-000000000001'), 0, 'session prep suggestion output remains ephemeral until explicit acceptance');
select is((select count(*) from public.drafts where workspace_id = '90100000-0000-0000-0000-000000000001'), 0::bigint, 'session prep suggestion writer creates no drafts');

insert into module9_runs (task_name, run_id) values ('draft_entity_from_prompt', pg_temp.module9_create_run('draft_entity_from_prompt'));
select ok((pg_temp.module9_record_output((select run_id from module9_runs where task_name = 'draft_entity_from_prompt'), '{"entity":{"entity_type":"character","name":"Ilyra","summary":"A careful witness.","narrative":"Ilyra saw the relic pass hands.","is_stub":false,"proposed_scope":"saga"},"sources":["90600000-0000-0000-0000-000000000001"],"confidence_reason":"direct_gm_input"}'::jsonb) ->> 'ok')::boolean, 'entity draft writer succeeds');
select is((select count(*) from public.drafts where workspace_id = '90100000-0000-0000-0000-000000000001' and entity_type = 'character' and state = 'pending'), 1::bigint, 'entity draft writer creates one pending draft');
select is((select count(*) from public.draft_sources ds join public.drafts d on d.id = ds.draft_id where d.workspace_id = '90100000-0000-0000-0000-000000000001'), 1::bigint, 'entity draft writer records draft sources');
select is((select count(*) from public.characters where workspace_id = '90100000-0000-0000-0000-000000000001'), 0::bigint, 'entity draft writer does not mutate canon');

insert into module9_runs (task_name, run_id) values ('synthesize_session', pg_temp.module9_create_run('synthesize_session'));
select ok((pg_temp.module9_record_output((select run_id from module9_runs where task_name = 'synthesize_session'), '{"session_summary":{"title":"Session Summary","body":"The relic changed hands.","sources":["90600000-0000-0000-0000-000000000002"],"confidence_reason":"single_clear_segment"},"proposed_entity_changes":[{"change_kind":"create","entity_type":"place","proposed_scope":"saga","payload":{"name":"Glass Bridge","summary":"A bridge over a bright ravine."},"sources":["90600000-0000-0000-0000-000000000002"],"confidence_reason":"single_clear_segment"}],"loose_threads":[],"next_prep_implications":[],"stub_evidence_flags":[]}'::jsonb) ->> 'ok')::boolean, 'session synthesis writer succeeds');
select is((select count(*) from public.drafts where workspace_id = '90100000-0000-0000-0000-000000000001' and entity_type in ('note', 'place') and state = 'pending'), 2::bigint, 'session synthesis creates review drafts only');
select is((select count(*) from public.places where workspace_id = '90100000-0000-0000-0000-000000000001'), 0::bigint, 'session synthesis does not mutate place canon');

create temp table module9_counts_before_ephemeral as
select count(*)::bigint as draft_count
from public.drafts
where workspace_id = '90100000-0000-0000-0000-000000000001';

insert into module9_runs (task_name, run_id) values ('answer_saga_question', pg_temp.module9_create_run('answer_saga_question'));
select ok((pg_temp.module9_record_output((select run_id from module9_runs where task_name = 'answer_saga_question'), '{"answer":"Only approved context is available.","citations":[{"index":1,"source_id":"90600000-0000-0000-0000-000000000001","source_label":"Approved session context"}],"confidence_reason":"direct_gm_input","no_answer":false}'::jsonb) ->> 'ok')::boolean, 'ephemeral answer writer succeeds');
select is(pg_temp.module9_run_output((select run_id from module9_runs where task_name = 'answer_saga_question')) ->> 'answer', 'Only approved context is available.', 'ephemeral outputs are stored in the run ledger');
select is((select count(*) from public.drafts where workspace_id = '90100000-0000-0000-0000-000000000001'), (select draft_count from module9_counts_before_ephemeral), 'ephemeral outputs create no drafts');

select ok(pg_temp.module9_run_log_complete((select run_id from module9_runs where task_name = 'answer_saga_question')), 'run ledger records prompt version, model, scope, latency, and complete state');

select * from finish();

rollback;

create table if not exists internal.ai_task_runs (
  id uuid primary key default public.uuid7(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  world_id uuid not null references public.worlds(id) on delete cascade,
  saga_id uuid references public.sagas(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete set null,
  gm_id uuid references auth.users(id) on delete set null,
  task_name text not null,
  prompt_version text not null,
  quota_tier text not null check (quota_tier in ('light', 'standard', 'heavy', 'pipeline_synthesis')),
  ai_credits numeric not null check (ai_credits >= 0),
  model_tier text not null check (model_tier in ('relic-fast', 'relic-balanced', 'relic-deep')),
  resolved_model text,
  retrieval_profile text not null check (retrieval_profile in ('none', 'session_prep_grounding', 'sanctum_grounding', 'sanctum_qa_grounding', 'post_session_synthesis')),
  source_policy text not null check (source_policy in ('canon_only', 'canon_plus_untrusted_input', 'untrusted_input_only', 'none')),
  output_mode text not null check (output_mode in ('workshop_draft_payload', 'draft', 'prep_suggestions', 'prep_briefing', 'draft_batch', 'ephemeral')),
  status text not null default 'pending' check (status in ('pending', 'running', 'complete', 'failed')),
  attempts int not null default 0 check (attempts >= 0),
  repair_attempts int not null default 0 check (repair_attempts between 0 and 1),
  latency_ms int check (latency_ms is null or latency_ms >= 0),
  input_payload jsonb not null default '{}'::jsonb,
  allowed_source_ids uuid[] not null default '{}',
  output_payload jsonb,
  validation_errors jsonb not null default '[]'::jsonb,
  failure_reason text,
  usage_event_id uuid references public.usage_events(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint ai_task_runs_prompt_matches_task check (prompt_version ~ ('^' || task_name || '@[0-9]+\.[0-9]+\.[0-9]+$'))
);

create index if not exists ai_task_runs_scope_created_idx on internal.ai_task_runs(workspace_id, world_id, saga_id, created_at desc);
create index if not exists ai_task_runs_status_idx on internal.ai_task_runs(status, created_at) where status in ('pending', 'running');
create index if not exists ai_task_runs_task_idx on internal.ai_task_runs(task_name, prompt_version);

create or replace function internal.ai_task_contracts()
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
language sql
stable
set search_path = public, pg_temp
as $$
  values
    ('scaffold_saga', 'scaffold_saga@1.0.0', 'heavy', 10::numeric, 'relic-deep', 'none', 'canon_plus_untrusted_input', 'workshop_draft_payload', true),
    ('draft_entity_from_prompt', 'draft_entity_from_prompt@1.0.0', 'standard', 3::numeric, 'relic-balanced', 'sanctum_grounding', 'canon_plus_untrusted_input', 'draft', true),
    ('generate_session_prep', 'generate_session_prep@1.0.0', 'heavy', 10::numeric, 'relic-deep', 'session_prep_grounding', 'canon_only', 'prep_suggestions', true),
    ('compose_prep_briefing', 'compose_prep_briefing@1.0.0', 'standard', 3::numeric, 'relic-balanced', 'session_prep_grounding', 'canon_only', 'prep_briefing', true),
    ('synthesize_session', 'synthesize_session@1.0.0', 'pipeline_synthesis', 15::numeric, 'relic-deep', 'post_session_synthesis', 'canon_plus_untrusted_input', 'draft_batch', true),
    ('propose_scene_beats', 'propose_scene_beats@1.0.0', 'light', 1::numeric, 'relic-balanced', 'session_prep_grounding', 'canon_only', 'ephemeral', true),
    ('propose_thread_complication', 'propose_thread_complication@1.0.0', 'light', 1::numeric, 'relic-balanced', 'sanctum_grounding', 'canon_only', 'ephemeral', true),
    ('propose_npc_for_scene', 'propose_npc_for_scene@1.0.0', 'light', 1::numeric, 'relic-balanced', 'session_prep_grounding', 'canon_only', 'ephemeral', true),
    ('answer_saga_question', 'answer_saga_question@1.0.0', 'light', 1::numeric, 'relic-balanced', 'sanctum_qa_grounding', 'canon_only', 'ephemeral', true),
    ('propose_quick_stub_fleshing', 'propose_quick_stub_fleshing@1.0.0', 'light', 1::numeric, 'relic-balanced', 'post_session_synthesis', 'canon_plus_untrusted_input', 'draft', true);
$$;

create or replace function public.preflight_ai_task(
  p_workspace_id uuid,
  p_world_id uuid,
  p_saga_id uuid,
  p_session_id uuid,
  p_task_name text,
  p_input_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  contract record;
  quota record;
begin
  perform public.assert_saga_access(p_workspace_id, p_world_id, p_saga_id);

  if p_session_id is not null and not exists (
    select 1
    from public.sessions s
    where s.id = p_session_id
      and s.workspace_id = p_workspace_id
      and s.world_id = p_world_id
      and s.saga_id = p_saga_id
  ) then
    raise exception 'Session is not available in this Saga';
  end if;

  select *
  into contract
  from internal.ai_task_contracts() c
  where c.task_name = p_task_name
    and c.active;

  if not found then
    return jsonb_build_object(
      'allowed', false,
      'severity', 'blocked',
      'message', 'AI task is not registered.',
      'manual_fallback_available', true
    );
  end if;

  select *
  into quota
  from public.check_quota_preflight(
    p_workspace_id,
    p_world_id,
    p_saga_id,
    case when contract.quota_tier = 'pipeline_synthesis' then 'pipeline_synthesis' else 'ai_call' end,
    contract.ai_credits,
    jsonb_build_object(
      'task_name', contract.task_name,
      'prompt_version', contract.prompt_version,
      'quota_tier', contract.quota_tier,
      'input_keys', coalesce((select jsonb_agg(key order by key) from jsonb_object_keys(coalesce(p_input_payload, '{}'::jsonb)) as key), '[]'::jsonb)
    )
  );

  return jsonb_build_object(
    'allowed', quota.allowed,
    'severity', quota.severity,
    'limit_key', quota.limit_key,
    'used', quota.used,
    'limit', quota."limit",
    'reset_at', quota.reset_at,
    'message', quota.message,
    'manual_fallback_available', true,
    'contract', jsonb_build_object(
      'task_name', contract.task_name,
      'prompt_version', contract.prompt_version,
      'quota_tier', contract.quota_tier,
      'ai_credits', contract.ai_credits,
      'model_tier', contract.model_tier,
      'retrieval_profile', contract.retrieval_profile,
      'source_policy', contract.source_policy,
      'output_mode', contract.output_mode
    )
  );
end;
$$;

create or replace function internal.ai_output_source_ids(p_output jsonb)
returns uuid[]
language sql
stable
set search_path = public, pg_temp
as $$
  with recursive walk(key_name, value) as (
    select null::text, coalesce($1, '{}'::jsonb)
    union all
    select child.key_name, child.value
    from walk w
    cross join lateral (
      select e.key as key_name, e.value
      from jsonb_each(w.value) e
      where jsonb_typeof(w.value) = 'object'
      union all
      select w.key_name, e.value
      from jsonb_array_elements(w.value) e
      where jsonb_typeof(w.value) = 'array'
    ) child
  ),
  candidates as (
    select value #>> '{}' as source_id
    from walk
    where lower(coalesce(key_name, '')) in ('source_id', 'source_ids', 'sources')
      and jsonb_typeof(value) = 'string'
      and (value #>> '{}') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  )
  select coalesce(array_agg(distinct source_id::uuid order by source_id::uuid), '{}'::uuid[])
  from candidates;
$$;

create or replace function internal.validate_ai_source_ids(
  p_allowed_source_ids uuid[],
  p_output jsonb
)
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select not exists (
    select 1
    from unnest(internal.ai_output_source_ids($2)) as output_source_id
    where not (output_source_id = any(coalesce($1, '{}'::uuid[])))
  );
$$;

create or replace function internal.link_ai_draft_sources(
  p_run internal.ai_task_runs,
  p_draft_id uuid,
  p_source_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_source_id uuid;
begin
  foreach v_source_id in array coalesce(p_source_ids, '{}'::uuid[]) loop
    insert into public.draft_sources (workspace_id, world_id, saga_id, scope, draft_id, source_id)
    values (p_run.workspace_id, p_run.world_id, p_run.saga_id, 'saga', p_draft_id, v_source_id)
    on conflict (draft_id, source_id) do nothing;
  end loop;
end;
$$;

create or replace function internal.record_ai_task_output(
  p_run_id uuid,
  p_output jsonb,
  p_allowed_source_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  run_row internal.ai_task_runs%rowtype;
  source_ids uuid[];
  draft_id uuid;
  item jsonb;
  entity_payload jsonb;
  confidence public.confidence_reason;
  draft_count int := 0;
  workshop_id uuid;
begin
  select *
  into run_row
  from internal.ai_task_runs
  where id = p_run_id
  for update;

  if not found then
    raise exception 'AI task run is not available';
  end if;

  source_ids := internal.ai_output_source_ids(coalesce(p_output, '{}'::jsonb));

  -- Source IDs are the main hallucination boundary: reject before writing any task output.
  if not internal.validate_ai_source_ids(coalesce(p_allowed_source_ids, run_row.allowed_source_ids), p_output) then
    update internal.ai_task_runs
    set status = 'failed',
        validation_errors = jsonb_build_array(jsonb_build_object('code', 'invalid_source_id')),
        failure_reason = 'AI output referenced a source outside the allowed retrieval set.',
        updated_at = now(),
        completed_at = now()
    where id = run_row.id;

    raise exception 'AI output referenced a source outside the allowed retrieval set';
  end if;

  if run_row.output_mode = 'prep_briefing' then
    update public.sessions
    set prep_briefing = p_output,
        prep_briefing_generated_at = now(),
        updated_at = now()
    where id = run_row.session_id
      and workspace_id = run_row.workspace_id
      and world_id = run_row.world_id
      and saga_id = run_row.saga_id;
  elsif run_row.output_mode = 'prep_suggestions' then
    update public.sessions
    set pending_prep_suggestions = coalesce(pending_prep_suggestions, '[]'::jsonb) || coalesce(p_output -> 'suggestions', '[]'::jsonb),
        updated_at = now()
    where id = run_row.session_id
      and workspace_id = run_row.workspace_id
      and world_id = run_row.world_id
      and saga_id = run_row.saga_id;
  elsif run_row.output_mode = 'draft' then
    entity_payload := case
      when p_output ? 'entity' then p_output -> 'entity'
      else jsonb_strip_nulls(jsonb_build_object(
        'name', coalesce(p_output ->> 'name', p_output ->> 'entity_name'),
        'summary', coalesce(p_output ->> 'proposed_summary', p_output ->> 'summary'),
        'narrative', coalesce(p_output ->> 'proposed_narrative', p_output ->> 'narrative'),
        'status', p_output ->> 'proposed_status',
        'proposed_scope', coalesce(p_output ->> 'proposed_scope', 'saga')
      ))
    end;

    confidence := nullif(p_output ->> 'confidence_reason', '')::public.confidence_reason;

    insert into public.drafts (
      workspace_id, world_id, saga_id, scope, entity_type, target_entity_id, state,
      change_kind, proposed_payload, confidence_reason, created_by
    )
    values (
      run_row.workspace_id,
      run_row.world_id,
      run_row.saga_id,
      'saga',
      coalesce(entity_payload ->> 'entity_type', run_row.input_payload ->> 'entity_type', 'character')::public.entity_type,
      nullif(coalesce(run_row.input_payload ->> 'target_entity_id', p_output ->> 'target_entity_id'), '')::uuid,
      'pending',
      coalesce(nullif(p_output ->> 'change_kind', ''), nullif(run_row.input_payload ->> 'change_kind', ''), 'create')::public.change_kind,
      entity_payload,
      confidence,
      'gm_via_ai_approval'
    )
    returning id into draft_id;

    perform internal.link_ai_draft_sources(run_row, draft_id, source_ids);
    draft_count := 1;
  elsif run_row.output_mode = 'draft_batch' then
    if p_output ? 'session_summary' then
      item := p_output -> 'session_summary';
      insert into public.drafts (
        workspace_id, world_id, saga_id, scope, entity_type, state, change_kind,
        proposed_payload, confidence_reason, created_by
      )
      values (
        run_row.workspace_id,
        run_row.world_id,
        run_row.saga_id,
        'saga',
        'note',
        'pending',
        'create',
        jsonb_build_object(
          'title', coalesce(item ->> 'title', 'Session Summary'),
          'body', coalesce(item ->> 'body', ''),
          'note_type', 'summary',
          'session_id', run_row.session_id
        ),
        nullif(item ->> 'confidence_reason', '')::public.confidence_reason,
        'gm_via_ai_approval'
      )
      returning id into draft_id;

      perform internal.link_ai_draft_sources(run_row, draft_id, internal.ai_output_source_ids(item));
      draft_count := draft_count + 1;
    end if;

    for item in select value from jsonb_array_elements(coalesce(p_output -> 'proposed_entity_changes', '[]'::jsonb)) loop
      insert into public.drafts (
        workspace_id, world_id, saga_id, scope, entity_type, target_entity_id, state,
        change_kind, proposed_payload, expected_version, confidence_reason, created_by
      )
      values (
        run_row.workspace_id,
        run_row.world_id,
        run_row.saga_id,
        'saga',
        (item ->> 'entity_type')::public.entity_type,
        nullif(item ->> 'target_entity_id', '')::uuid,
        'pending',
        coalesce(nullif(item ->> 'change_kind', ''), 'create')::public.change_kind,
        coalesce(item -> 'payload', '{}'::jsonb),
        nullif(item ->> 'expected_version', '')::timestamptz,
        nullif(item ->> 'confidence_reason', '')::public.confidence_reason,
        'gm_via_ai_approval'
      )
      returning id into draft_id;

      perform internal.link_ai_draft_sources(run_row, draft_id, internal.ai_output_source_ids(item));
      draft_count := draft_count + 1;
    end loop;
  elsif run_row.output_mode = 'workshop_draft_payload' then
    workshop_id := nullif(run_row.input_payload ->> 'workshop_session_id', '')::uuid;

    if workshop_id is not null then
      update public.workshop_sessions
      set draft_payload = p_output,
          updated_at = now()
      where id = workshop_id
        and user_id = run_row.gm_id
        and (workspace_id is null or workspace_id = run_row.workspace_id)
        and (world_id is null or world_id = run_row.world_id)
        and (saga_id is null or saga_id = run_row.saga_id);
    end if;
  end if;

  update internal.ai_task_runs
  set status = 'complete',
      output_payload = p_output,
      allowed_source_ids = coalesce(p_allowed_source_ids, allowed_source_ids),
      validation_errors = '[]'::jsonb,
      failure_reason = null,
      updated_at = now(),
      completed_at = now()
  where id = run_row.id;

  return jsonb_build_object('ok', true, 'run_id', run_row.id, 'output_mode', run_row.output_mode, 'draft_count', draft_count);
end;
$$;

create or replace function public.get_ai_task_run_for_worker(p_run_id uuid)
returns jsonb
language sql
security definer
set search_path = public, pg_temp
as $$
  select to_jsonb(r)
  from internal.ai_task_runs r
  where r.id = $1;
$$;

create or replace function public.record_ai_task_output_for_worker(
  p_run_id uuid,
  p_output jsonb,
  p_allowed_source_ids uuid[]
)
returns jsonb
language sql
security definer
set search_path = public, pg_temp
as $$
  select internal.record_ai_task_output($1, $2, $3);
$$;

create or replace function public.mark_ai_task_run_failed_for_worker(
  p_run_id uuid,
  p_failure_reason text,
  p_validation_errors jsonb default '[]'::jsonb,
  p_repair_attempts int default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update internal.ai_task_runs
  set status = 'failed',
      failure_reason = left(coalesce(p_failure_reason, 'AI task failed.'), 500),
      validation_errors = coalesce(p_validation_errors, '[]'::jsonb),
      repair_attempts = coalesce(p_repair_attempts, repair_attempts),
      updated_at = now(),
      completed_at = now()
  where id = p_run_id;

  if not found then
    raise exception 'AI task run is not available';
  end if;

  return p_run_id;
end;
$$;

create or replace function public.set_ai_task_usage_for_worker(
  p_run_id uuid,
  p_usage_event_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update internal.ai_task_runs
  set usage_event_id = p_usage_event_id,
      updated_at = now()
  where id = p_run_id;

  if not found then
    raise exception 'AI task run is not available';
  end if;

  return p_run_id;
end;
$$;

revoke all on function public.preflight_ai_task(uuid, uuid, uuid, uuid, text, jsonb) from public;
revoke all on function public.preflight_ai_task(uuid, uuid, uuid, uuid, text, jsonb) from anon;
grant execute on function public.preflight_ai_task(uuid, uuid, uuid, uuid, text, jsonb) to authenticated;
revoke all on function public.get_ai_task_run_for_worker(uuid) from public, anon, authenticated;
revoke all on function public.record_ai_task_output_for_worker(uuid, jsonb, uuid[]) from public, anon, authenticated;
revoke all on function public.mark_ai_task_run_failed_for_worker(uuid, text, jsonb, int) from public, anon, authenticated;
revoke all on function public.set_ai_task_usage_for_worker(uuid, uuid) from public, anon, authenticated;

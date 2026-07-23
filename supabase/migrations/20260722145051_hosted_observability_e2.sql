create table internal.provider_pipeline_events (
  id uuid primary key default public.uuid7(),
  occurred_at timestamptz not null default now(),
  event_name text not null,
  severity text not null default 'info' check (severity in ('debug', 'info', 'warn', 'error')),
  environment text not null,
  deployment_id text,
  worker_type text not null,
  ai_run_id uuid,
  pipeline_run_id uuid,
  job_id uuid,
  workspace_id uuid,
  world_id uuid,
  saga_id uuid,
  session_id uuid,
  idempotency_identifier text,
  provider_alias text,
  resolved_model text,
  provider text,
  attempt_count integer check (attempt_count is null or attempt_count >= 0),
  queue_delay_ms bigint check (queue_delay_ms is null or queue_delay_ms >= 0),
  provider_latency_ms bigint check (provider_latency_ms is null or provider_latency_ms >= 0),
  e2e_latency_ms bigint check (e2e_latency_ms is null or e2e_latency_ms >= 0),
  state text not null check (state in (
    'queued', 'running', 'success', 'retryable_failure', 'terminal_failure',
    'dead_letter', 'quota_blocked', 'cancelled', 'fallback', 'idle'
  )),
  error_category text,
  input_units numeric check (input_units is null or input_units >= 0),
  input_unit_type text,
  output_units numeric check (output_units is null or output_units >= 0),
  output_unit_type text,
  usage_units numeric check (usage_units is null or usage_units >= 0),
  usage_unit_type text,
  retry_path text,
  fallback_path text,
  safe_metadata jsonb not null default '{}'::jsonb,
  constraint provider_pipeline_events_event_name_check check (event_name in (
    'worker_claimed', 'worker_idle', 'worker_completed', 'worker_retry_scheduled',
    'worker_terminal_failure', 'worker_dead_lettered', 'worker_heartbeat', 'cron_heartbeat',
    'provider_call_started', 'provider_call_completed', 'provider_call_failed',
    'embedding_completed', 'transcription_completed', 'ai_task_completed',
    'ai_task_validation_failed', 'hybrid_search_completed', 'lexical_fallback_activated',
    'quota_blocked', 'job_cancelled', 'configuration_rejected',
    'observability_event_rejected', 'metering_conflict'
  )),
  constraint provider_pipeline_events_identifier_lengths_check check (
    length(coalesce(deployment_id, '')) <= 200
    and length(coalesce(worker_type, '')) <= 100
    and length(coalesce(idempotency_identifier, '')) <= 200
    and length(coalesce(provider_alias, '')) <= 100
    and length(coalesce(resolved_model, '')) <= 200
    and length(coalesce(provider, '')) <= 100
    and length(coalesce(error_category, '')) <= 100
    and length(coalesce(retry_path, '')) <= 100
    and length(coalesce(fallback_path, '')) <= 100
  )
);

create index provider_pipeline_events_occurred_idx
  on internal.provider_pipeline_events (occurred_at desc);
create index provider_pipeline_events_event_occurred_idx
  on internal.provider_pipeline_events (event_name, occurred_at desc);
create index provider_pipeline_events_worker_state_idx
  on internal.provider_pipeline_events (worker_type, state, occurred_at desc);
create index provider_pipeline_events_job_idx
  on internal.provider_pipeline_events (job_id, occurred_at desc)
  where job_id is not null;
create index provider_pipeline_events_ai_run_idx
  on internal.provider_pipeline_events (ai_run_id, occurred_at desc)
  where ai_run_id is not null;

revoke all on table internal.provider_pipeline_events from public, anon, authenticated;

create or replace function internal.assert_safe_observability_metadata(p_metadata jsonb)
returns jsonb
language plpgsql
immutable
set search_path = public, internal, pg_temp
as $$
declare
  item record;
  allowed_keys constant text[] := array[
    'actual_model', 'billable', 'cron_job_name', 'cron_status', 'dimensions',
    'exact_redelivery', 'expected_model', 'lease_ms', 'metered',
    'provider_request_id_present', 'replayed', 'request_id_present', 'result_count',
    'retrieval_mode', 'scheduled_for', 'source_kind', 'trigger',
    'validation_repair_attempts', 'worker_id_hash'
  ];
begin
  p_metadata := coalesce(p_metadata, '{}'::jsonb);
  if jsonb_typeof(p_metadata) <> 'object' then
    raise exception 'observability_metadata_not_allowlisted' using errcode = '22023';
  end if;

  for item in select key, value from jsonb_each(p_metadata) loop
    if not (item.key = any(allowed_keys))
      or jsonb_typeof(item.value) in ('object', 'array')
      or length(item.value #>> '{}') > 200 then
      raise exception 'observability_metadata_not_allowlisted' using errcode = '22023';
    end if;
  end loop;
  return p_metadata;
end;
$$;

create or replace function public.record_provider_pipeline_event_for_worker(
  p_event_name text,
  p_severity text,
  p_environment text,
  p_deployment_id text,
  p_worker_type text,
  p_ai_run_id uuid,
  p_pipeline_run_id uuid,
  p_job_id uuid,
  p_workspace_id uuid,
  p_world_id uuid,
  p_saga_id uuid,
  p_session_id uuid,
  p_idempotency_identifier text,
  p_provider_alias text,
  p_resolved_model text,
  p_provider text,
  p_attempt_count integer,
  p_queue_delay_ms bigint,
  p_provider_latency_ms bigint,
  p_e2e_latency_ms bigint,
  p_state text,
  p_error_category text,
  p_input_units numeric,
  p_input_unit_type text,
  p_output_units numeric,
  p_output_unit_type text,
  p_usage_units numeric,
  p_usage_unit_type text,
  p_retry_path text,
  p_fallback_path text,
  p_safe_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, internal, pg_temp
as $$
declare
  event_id uuid;
begin
  if nullif(btrim(coalesce(p_environment, '')), '') is null
    or nullif(btrim(coalesce(p_worker_type, '')), '') is null then
    raise exception 'observability_scope_required' using errcode = '22023';
  end if;

  insert into internal.provider_pipeline_events (
    event_name, severity, environment, deployment_id, worker_type,
    ai_run_id, pipeline_run_id, job_id, workspace_id, world_id, saga_id, session_id,
    idempotency_identifier, provider_alias, resolved_model, provider, attempt_count,
    queue_delay_ms, provider_latency_ms, e2e_latency_ms, state, error_category,
    input_units, input_unit_type, output_units, output_unit_type, usage_units, usage_unit_type,
    retry_path, fallback_path, safe_metadata
  ) values (
    p_event_name, p_severity, lower(p_environment), nullif(left(p_deployment_id, 200), ''), left(p_worker_type, 100),
    p_ai_run_id, p_pipeline_run_id, p_job_id, p_workspace_id, p_world_id, p_saga_id, p_session_id,
    nullif(left(p_idempotency_identifier, 200), ''), nullif(left(p_provider_alias, 100), ''),
    nullif(left(p_resolved_model, 200), ''), nullif(left(p_provider, 100), ''), p_attempt_count,
    p_queue_delay_ms, p_provider_latency_ms, p_e2e_latency_ms, p_state,
    nullif(left(p_error_category, 100), ''), p_input_units, nullif(left(p_input_unit_type, 50), ''),
    p_output_units, nullif(left(p_output_unit_type, 50), ''), p_usage_units,
    nullif(left(p_usage_unit_type, 50), ''), nullif(left(p_retry_path, 100), ''),
    nullif(left(p_fallback_path, 100), ''), internal.assert_safe_observability_metadata(p_safe_metadata)
  ) returning id into event_id;

  return event_id;
end;
$$;

create or replace function public.get_provider_operations_summary_for_worker(p_since_minutes integer default 60)
returns jsonb
language sql
security definer
stable
set search_path = public, internal, pg_temp
as $$
  with recent as (
    select *
    from internal.provider_pipeline_events
    where occurred_at >= now() - make_interval(mins => greatest(1, least(coalesce($1, 60), 10080)))
  ), event_counts as (
    select coalesce(jsonb_object_agg(state, count), '{}'::jsonb) value
    from (select state, count(*) count from recent group by state) grouped
  ), latency as (
    select jsonb_build_object(
      'queue_delay_p95_ms', coalesce(percentile_cont(0.95) within group (order by queue_delay_ms), 0),
      'provider_p95_ms', coalesce(percentile_cont(0.95) within group (order by provider_latency_ms), 0),
      'end_to_end_p95_ms', coalesce(percentile_cont(0.95) within group (order by e2e_latency_ms), 0)
    ) value
    from recent
  ), routes as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'worker_type', worker_type,
      'provider_alias', provider_alias,
      'resolved_model', resolved_model,
      'state', state,
      'count', count
    ) order by worker_type, provider_alias, resolved_model, state), '[]'::jsonb) value
    from (
      select worker_type, provider_alias, resolved_model, state, count(*) count
      from recent
      group by worker_type, provider_alias, resolved_model, state
    ) grouped
  ), queue_counts as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'queue', queue_name, 'state', state, 'count', count
    ) order by queue_name, state), '[]'::jsonb) value
    from (
      select queue_name, state, count(*) count
      from (
        select 'embedding'::text queue_name, state::text from internal.embedding_jobs
        union all
        select 'transcription', state::text from internal.transcription_jobs
        union all
        select 'ai_task', status::text from internal.ai_task_runs
        union all
        select 'dead_letter', 'dead_letter' from internal.dead_letter_jobs
      ) queue_rows
      group by queue_name, state
    ) grouped
  ), schedules as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'job_name', job.jobname,
      'active', job.active,
      'schedule', job.schedule,
      'last_status', latest.status,
      'last_started_at', latest.start_time
    ) order by job.jobname), '[]'::jsonb) value
    from cron.job job
    left join lateral (
      select run.status, run.start_time
      from cron.job_run_details run
      where run.jobid = job.jobid
      order by run.start_time desc
      limit 1
    ) latest on true
    where job.jobname like 'relic-%'
  )
  select jsonb_build_object(
    'window_minutes', greatest(1, least(coalesce($1, 60), 10080)),
    'events', event_counts.value,
    'latency', latency.value,
    'routes', routes.value,
    'queues', queue_counts.value,
    'schedules', schedules.value
  )
  from event_counts, latency, routes, queue_counts, schedules;
$$;

create or replace function public.get_provider_operational_alerts_for_worker()
returns jsonb
language sql
security definer
stable
set search_path = public, internal, pg_temp
as $$
  with alerts as (
    select 'sustained_provider_failure'::text code, count(*)::bigint count
    from internal.provider_pipeline_events
    where event_name = 'provider_call_failed' and occurred_at >= now() - interval '15 minutes'
    having count(*) >= 3
    union all
    select 'dead_letter_growth', count(*) from internal.dead_letter_jobs
    where created_at >= now() - interval '1 hour'
    having count(*) > 0
    union all
    select 'stranded_running_jobs', count(*) from (
      select id from internal.embedding_jobs where state = 'running' and locked_at < now() - interval '10 minutes'
      union all
      select id from internal.transcription_jobs where state = 'running' and locked_at < now() - interval '10 minutes'
      union all
      select id from internal.ai_task_runs where status = 'running' and updated_at < now() - interval '10 minutes'
    ) stranded
    having count(*) > 0
    union all
    select 'dimension_or_model_mismatch', count(*) from internal.provider_pipeline_events
    where error_category in ('dimension_mismatch', 'model_mismatch') and occurred_at >= now() - interval '1 hour'
    having count(*) > 0
    union all
    select 'repeated_quota_denial', count(*) from internal.provider_pipeline_events
    where state = 'quota_blocked' and occurred_at >= now() - interval '1 hour'
    having count(*) >= 3
    union all
    select 'unexpected_deterministic_mode', count(*) from internal.provider_pipeline_events
    where environment in ('staging', 'production') and provider like 'deterministic%'
      and occurred_at >= now() - interval '1 day'
    having count(*) > 0
    union all
    select 'missing_worker_execution', count(*) from (
      values ('transcription'::text), ('embedding'::text), ('ai_task'::text)
    ) required(worker_type)
    where not exists (
      select 1 from internal.provider_pipeline_events event
      where (event.worker_type = required.worker_type or event.worker_type like required.worker_type || ':%')
        and event.occurred_at >= now() - interval '10 minutes'
    )
    having count(*) > 0
    union all
    select 'missing_scheduler_configuration', count(*) from (
      values ('relic-dispatch-transcription'::text), ('relic-dispatch-embeddings'::text), ('relic-dispatch-ai-tasks'::text)
    ) required(job_name)
    where not exists (select 1 from cron.job where jobname = required.job_name and active)
    having count(*) > 0
    union all
    select 'duplicate_metering', count(*) from (
      select idempotency_key from public.usage_events group by idempotency_key having count(*) > 1
    ) duplicates
    having count(*) > 0
    union all
    select 'sensitive_field_logging_regression', count(*) from internal.provider_pipeline_events
    where event_name = 'observability_event_rejected' and occurred_at >= now() - interval '1 day'
    having count(*) > 0
  )
  select coalesce(jsonb_agg(jsonb_build_object('code', code, 'count', count) order by code), '[]'::jsonb)
  from alerts;
$$;

revoke all on function internal.assert_safe_observability_metadata(jsonb) from public, anon, authenticated;
revoke all on function public.record_provider_pipeline_event_for_worker(
  text, text, text, text, text, uuid, uuid, uuid, uuid, uuid, uuid, uuid,
  text, text, text, text, integer, bigint, bigint, bigint, text, text,
  numeric, text, numeric, text, numeric, text, text, text, jsonb
) from public, anon, authenticated;
revoke all on function public.get_provider_operations_summary_for_worker(integer) from public, anon, authenticated;
revoke all on function public.get_provider_operational_alerts_for_worker() from public, anon, authenticated;
grant execute on function public.record_provider_pipeline_event_for_worker(
  text, text, text, text, text, uuid, uuid, uuid, uuid, uuid, uuid, uuid,
  text, text, text, text, integer, bigint, bigint, bigint, text, text,
  numeric, text, numeric, text, numeric, text, text, text, jsonb
) to service_role;
grant execute on function public.get_provider_operations_summary_for_worker(integer) to service_role;
grant execute on function public.get_provider_operational_alerts_for_worker() to service_role;

-- AI task delivery uses a database lease so duplicate HTTP dispatch cannot make
-- concurrent provider calls. Validated provider output is checkpointed privately
-- before metering or persistence, allowing a restarted worker to resume without
-- another billable call.
alter table internal.ai_task_runs
  drop constraint if exists ai_task_runs_status_check;

alter table internal.ai_task_runs
  add constraint ai_task_runs_status_check check (
    status in ('pending', 'running', 'retryable', 'complete', 'failed', 'terminal', 'dead_letter')
  ),
  add column if not exists scheduled_at timestamptz not null default now(),
  add column if not exists started_at timestamptz,
  add column if not exists locked_by text,
  add column if not exists locked_at timestamptz,
  add column if not exists max_attempts integer not null default 2 check (max_attempts between 1 and 5),
  add column if not exists failure_category text,
  add column if not exists provider_alias text,
  add column if not exists provider_completed_at timestamptz,
  add column if not exists provider_tokens_in integer check (provider_tokens_in is null or provider_tokens_in >= 0),
  add column if not exists provider_tokens_out integer check (provider_tokens_out is null or provider_tokens_out >= 0),
  add column if not exists provider_cost_estimate_usd numeric check (provider_cost_estimate_usd is null or provider_cost_estimate_usd >= 0),
  add column if not exists provider_billable boolean,
  add column if not exists provider_request_id_present boolean not null default false,
  add column if not exists replay_count integer not null default 0 check (replay_count >= 0);

drop index if exists internal.ai_task_runs_status_idx;
create index ai_task_runs_status_idx
  on internal.ai_task_runs(status, scheduled_at, created_at)
  where status in ('pending', 'retryable', 'running');

create or replace function internal.safe_ai_failure_category(p_category text)
returns text
language sql
immutable
set search_path = public, internal, pg_temp
as $$
  select case
    when $1 in (
      'invalid_input', 'configuration', 'timeout', 'rate_limited', 'provider_unavailable',
      'provider_rejected', 'malformed_response', 'model_mismatch', 'quota_denied',
      'validation_failed', 'retrieval_failed', 'metering_failed', 'persistence',
      'worker_restart', 'ai_task_internal_failure'
    ) then $1
    else 'ai_task_internal_failure'
  end;
$$;

create or replace function public.claim_ai_task_run_for_worker(
  p_run_id uuid,
  p_worker_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public, internal, pg_temp
as $$
declare
  run_row internal.ai_task_runs%rowtype;
  claim_state text;
begin
  if nullif(btrim(coalesce(p_worker_id, '')), '') is null or length(p_worker_id) > 200 then
    raise exception 'ai_task_worker_id_invalid' using errcode = '22023';
  end if;

  select * into run_row
  from internal.ai_task_runs
  where id = p_run_id
  for update;

  if run_row.id is null then
    raise exception 'ai_task_run_missing' using errcode = '22023';
  end if;

  if run_row.status = 'complete' then
    claim_state := 'complete';
  elsif run_row.status = 'running' then
    claim_state := 'busy';
  elsif run_row.status in ('failed', 'terminal', 'dead_letter') then
    claim_state := 'terminal';
  elsif run_row.scheduled_at > now() then
    claim_state := 'not_due';
  elsif run_row.status in ('pending', 'retryable') then
    update internal.ai_task_runs
    set status = 'running',
        attempts = attempts + 1,
        started_at = coalesce(started_at, now()),
        locked_by = p_worker_id,
        locked_at = now(),
        failure_category = null,
        failure_reason = null,
        completed_at = null,
        updated_at = now()
    where id = run_row.id
    returning * into run_row;
    claim_state := 'claimed';
  else
    claim_state := 'terminal';
  end if;

  return to_jsonb(run_row) || jsonb_build_object('claim_state', claim_state);
end;
$$;

create or replace function public.checkpoint_ai_task_provider_output_for_worker(
  p_run_id uuid,
  p_worker_id text,
  p_output jsonb,
  p_provider_alias text,
  p_resolved_model text,
  p_resolved_provider text,
  p_tokens_in integer default null,
  p_tokens_out integer default null,
  p_cost_estimate_usd numeric default null,
  p_billable boolean default true,
  p_provider_request_id_present boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, internal, pg_temp
as $$
declare
  run_row internal.ai_task_runs%rowtype;
begin
  select * into run_row
  from internal.ai_task_runs
  where id = p_run_id
  for update;

  if run_row.id is null then
    raise exception 'ai_task_run_missing' using errcode = '22023';
  end if;
  if run_row.status = 'complete' then
    return jsonb_build_object('status', 'complete', 'exact_redelivery', true);
  end if;
  if run_row.status <> 'running' or run_row.locked_by is distinct from p_worker_id then
    raise exception 'ai_task_lease_invalid' using errcode = '40001';
  end if;
  if nullif(btrim(coalesce(p_provider_alias, '')), '') is null
    or nullif(btrim(coalesce(p_resolved_model, '')), '') is null
    or nullif(btrim(coalesce(p_resolved_provider, '')), '') is null then
    raise exception 'ai_task_provider_provenance_required' using errcode = '22023';
  end if;

  if run_row.provider_completed_at is not null then
    if run_row.output_payload is distinct from p_output
      or run_row.provider_alias is distinct from p_provider_alias
      or run_row.resolved_model is distinct from p_resolved_model
      or run_row.resolved_provider is distinct from p_resolved_provider then
      raise exception 'ai_task_checkpoint_conflict' using errcode = '23505';
    end if;
    return jsonb_build_object('status', 'checkpointed', 'exact_redelivery', true);
  end if;

  update internal.ai_task_runs
  set output_payload = p_output,
      provider_alias = left(p_provider_alias, 100),
      resolved_model = left(p_resolved_model, 200),
      resolved_provider = left(p_resolved_provider, 100),
      provider_tokens_in = p_tokens_in,
      provider_tokens_out = p_tokens_out,
      provider_cost_estimate_usd = p_cost_estimate_usd,
      provider_billable = coalesce(p_billable, true),
      provider_request_id_present = coalesce(p_provider_request_id_present, false),
      provider_completed_at = now(),
      updated_at = now()
  where id = run_row.id;

  return jsonb_build_object('status', 'checkpointed', 'exact_redelivery', false);
end;
$$;

create or replace function public.fail_ai_task_run_for_worker(
  p_run_id uuid,
  p_worker_id text,
  p_category text,
  p_retryable boolean,
  p_repair_attempts integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public, internal, pg_temp
as $$
declare
  run_row internal.ai_task_runs%rowtype;
  safe_category text := internal.safe_ai_failure_category(p_category);
  next_state text;
begin
  select * into run_row
  from internal.ai_task_runs
  where id = p_run_id
  for update;

  if run_row.id is null then
    raise exception 'ai_task_run_missing' using errcode = '22023';
  end if;
  if run_row.status in ('complete', 'failed', 'terminal', 'dead_letter') then
    return jsonb_build_object('status', run_row.status, 'attempts', run_row.attempts, 'exact_redelivery', true);
  end if;
  if run_row.status <> 'running' or run_row.locked_by is distinct from p_worker_id then
    raise exception 'ai_task_lease_invalid' using errcode = '40001';
  end if;

  if coalesce(p_retryable, false) and run_row.attempts < run_row.max_attempts then
    next_state := 'retryable';
  elsif coalesce(p_retryable, false) then
    next_state := 'dead_letter';
  else
    next_state := 'terminal';
  end if;

  update internal.ai_task_runs
  set status = next_state,
      scheduled_at = case when next_state = 'retryable' then now() + interval '30 seconds' else scheduled_at end,
      locked_by = null,
      locked_at = null,
      failure_category = safe_category,
      failure_reason = safe_category,
      validation_errors = case
        when safe_category = 'validation_failed' then jsonb_build_array(jsonb_build_object('code', safe_category))
        else '[]'::jsonb
      end,
      repair_attempts = greatest(repair_attempts, least(coalesce(p_repair_attempts, 0), 1)),
      completed_at = case when next_state in ('terminal', 'dead_letter') then now() else null end,
      updated_at = now()
  where id = run_row.id;

  if next_state in ('terminal', 'dead_letter') then
    perform internal.write_dead_letter(
      'ai_task_runs',
      run_row.id,
      jsonb_build_object(
        'workspace_id', run_row.workspace_id,
        'world_id', run_row.world_id,
        'saga_id', run_row.saga_id,
        'session_id', run_row.session_id,
        'task_name', run_row.task_name,
        'prompt_version', run_row.prompt_version,
        'provider_alias', run_row.provider_alias,
        'resolved_model', run_row.resolved_model,
        'failure_category', safe_category,
        'attempts', run_row.attempts
      ),
      safe_category
    );
  end if;

  return jsonb_build_object('status', next_state, 'attempts', run_row.attempts, 'exact_redelivery', false);
end;
$$;

create or replace function public.replay_ai_task_run_for_worker(p_run_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, internal, pg_temp
as $$
declare
  run_row internal.ai_task_runs%rowtype;
begin
  select * into run_row
  from internal.ai_task_runs
  where id = p_run_id
  for update;

  if run_row.id is null then
    raise exception 'ai_task_run_missing' using errcode = '22023';
  end if;
  if run_row.status in ('pending', 'retryable', 'running', 'complete') then
    return jsonb_build_object('status', run_row.status, 'duplicate_replay', true);
  end if;
  if exists (select 1 from internal.ai_draft_batches where ai_task_run_id = run_row.id)
    or exists (select 1 from public.drafts where ai_task_run_id = run_row.id) then
    return jsonb_build_object('status', run_row.status, 'duplicate_replay', false, 'blocked_by_newer_result', true);
  end if;

  update internal.ai_task_runs
  set status = 'retryable',
      attempts = 0,
      scheduled_at = now(),
      locked_by = null,
      locked_at = null,
      failure_category = null,
      failure_reason = null,
      validation_errors = '[]'::jsonb,
      completed_at = null,
      replay_count = replay_count + 1,
      updated_at = now()
  where id = run_row.id;

  update internal.dead_letter_jobs
  set payload = payload || jsonb_build_object('replayed_at', now(), 'replay_count', run_row.replay_count + 1)
  where job_table = 'internal.ai_task_runs' and job_id = run_row.id;

  return jsonb_build_object(
    'status', 'retryable',
    'duplicate_replay', false,
    'provider_checkpoint_present', run_row.provider_completed_at is not null
  );
end;
$$;

create or replace function public.reset_stalled_ai_task_runs_for_worker(p_stale_after_seconds integer default 600)
returns jsonb
language plpgsql
security definer
set search_path = public, internal, pg_temp
as $$
declare
  run_row internal.ai_task_runs%rowtype;
  reset_count integer := 0;
  dead_letter_count integer := 0;
begin
  p_stale_after_seconds := greatest(60, least(coalesce(p_stale_after_seconds, 600), 86400));

  for run_row in
    select * from internal.ai_task_runs
    where status = 'running'
      and coalesce(locked_at, started_at, updated_at) < now() - make_interval(secs => p_stale_after_seconds)
    for update skip locked
  loop
    if run_row.provider_completed_at is not null or run_row.attempts < run_row.max_attempts then
      update internal.ai_task_runs
      set status = 'retryable', scheduled_at = now(), locked_by = null, locked_at = null,
          failure_category = 'worker_restart', failure_reason = 'worker_restart', updated_at = now()
      where id = run_row.id;
      reset_count := reset_count + 1;
    else
      update internal.ai_task_runs
      set status = 'dead_letter', locked_by = null, locked_at = null,
          failure_category = 'worker_restart', failure_reason = 'worker_restart',
          completed_at = now(), updated_at = now()
      where id = run_row.id;
      perform internal.write_dead_letter(
        'ai_task_runs', run_row.id,
        jsonb_build_object(
          'workspace_id', run_row.workspace_id, 'world_id', run_row.world_id,
          'saga_id', run_row.saga_id, 'session_id', run_row.session_id,
          'task_name', run_row.task_name, 'prompt_version', run_row.prompt_version,
          'failure_category', 'worker_restart', 'attempts', run_row.attempts
        ),
        'worker_restart'
      );
      dead_letter_count := dead_letter_count + 1;
    end if;
  end loop;

  return jsonb_build_object('reset', reset_count, 'dead_lettered', dead_letter_count);
end;
$$;

create or replace function internal.prune_provider_pipeline_events(p_retention_days integer default 30)
returns integer
language plpgsql
security definer
set search_path = public, internal, pg_temp
as $$
declare
  deleted_count integer;
begin
  if p_retention_days < 1 or p_retention_days > 90 then
    raise exception 'provider_event_retention_invalid' using errcode = '22023';
  end if;
  delete from internal.provider_pipeline_events
  where occurred_at < now() - make_interval(days => p_retention_days);
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

create or replace function public.prune_provider_pipeline_events_for_worker(p_retention_days integer default 30)
returns integer
language sql
security definer
set search_path = public, internal, pg_temp
as $$
  select internal.prune_provider_pipeline_events($1);
$$;

create or replace function public.record_ai_task_output_for_worker(
  p_run_id uuid,
  p_output jsonb,
  p_allowed_source_ids uuid[],
  p_resolved_model text,
  p_resolved_provider text
)
returns jsonb
language plpgsql
security definer
set search_path = public, internal, pg_temp
as $$
declare
  run_row internal.ai_task_runs%rowtype;
  result jsonb;
begin
  select * into run_row from internal.ai_task_runs where id = p_run_id for update;
  if not found then raise exception 'AI task run is not available' using errcode = '42501'; end if;
  if nullif(p_resolved_model, '') is null or nullif(p_resolved_provider, '') is null then
    raise exception 'Resolved model and provider are required' using errcode = '22023';
  end if;
  if run_row.status = 'complete' and (
    run_row.resolved_model is distinct from p_resolved_model or run_row.resolved_provider is distinct from p_resolved_provider
  ) then
    raise exception 'Completed AI run provenance does not match retry delivery' using errcode = '23505';
  end if;
  if run_row.provider_completed_at is not null and (
    run_row.output_payload is distinct from p_output
    or run_row.resolved_model is distinct from p_resolved_model
    or run_row.resolved_provider is distinct from p_resolved_provider
  ) then
    raise exception 'Checkpointed AI run does not match output delivery' using errcode = '23505';
  end if;
  if run_row.status <> 'complete' then
    update internal.ai_task_runs
    set resolved_model = p_resolved_model, resolved_provider = p_resolved_provider, updated_at = now()
    where id = p_run_id;
  end if;

  result := internal.record_ai_task_output(p_run_id, p_output, p_allowed_source_ids);
  update internal.ai_task_runs
  set locked_by = null, locked_at = null, updated_at = now()
  where id = p_run_id and status = 'complete';
  return result;
end;
$$;

do $$
declare
  existing_job bigint;
begin
  select jobid into existing_job from cron.job where jobname = 'relic-prune-provider-events';
  if existing_job is not null then perform cron.unschedule(existing_job); end if;
  perform cron.schedule(
    'relic-prune-provider-events',
    '15 4 * * *',
    'select internal.prune_provider_pipeline_events(30);'
  );

  select jobid into existing_job from cron.job where jobname = 'relic-ai-task-watchdog';
  if existing_job is not null then perform cron.unschedule(existing_job); end if;
  perform cron.schedule(
    'relic-ai-task-watchdog',
    '*/5 * * * *',
    'select public.reset_stalled_ai_task_runs_for_worker(600);'
  );
end;
$$;

revoke all on function internal.safe_ai_failure_category(text) from public, anon, authenticated;
revoke all on function internal.prune_provider_pipeline_events(integer) from public, anon, authenticated;
revoke all on function public.claim_ai_task_run_for_worker(uuid, text) from public, anon, authenticated;
revoke all on function public.checkpoint_ai_task_provider_output_for_worker(uuid, text, jsonb, text, text, text, integer, integer, numeric, boolean, boolean) from public, anon, authenticated;
revoke all on function public.fail_ai_task_run_for_worker(uuid, text, text, boolean, integer) from public, anon, authenticated;
revoke all on function public.replay_ai_task_run_for_worker(uuid) from public, anon, authenticated;
revoke all on function public.reset_stalled_ai_task_runs_for_worker(integer) from public, anon, authenticated;
revoke all on function public.prune_provider_pipeline_events_for_worker(integer) from public, anon, authenticated;
revoke all on function public.record_ai_task_output_for_worker(uuid, jsonb, uuid[], text, text) from public, anon, authenticated;
grant execute on function public.claim_ai_task_run_for_worker(uuid, text) to service_role;
grant execute on function public.checkpoint_ai_task_provider_output_for_worker(uuid, text, jsonb, text, text, text, integer, integer, numeric, boolean, boolean) to service_role;
grant execute on function public.fail_ai_task_run_for_worker(uuid, text, text, boolean, integer) to service_role;
grant execute on function public.replay_ai_task_run_for_worker(uuid) to service_role;
grant execute on function public.reset_stalled_ai_task_runs_for_worker(integer) to service_role;
grant execute on function public.prune_provider_pipeline_events_for_worker(integer) to service_role;
grant execute on function public.record_ai_task_output_for_worker(uuid, jsonb, uuid[], text, text) to service_role;

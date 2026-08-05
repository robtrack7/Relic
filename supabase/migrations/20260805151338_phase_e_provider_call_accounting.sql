-- Phase E hosted closeout: preserve every provider completion before validation
-- so repair work and failed delivery cannot disappear from the private cost ledger.

alter table internal.ai_task_runs
  add column if not exists provider_completions integer not null default 0
    check (provider_completions >= 0),
  add column if not exists provider_cost_estimate_complete boolean not null default true;

create table internal.ai_task_provider_calls (
  id bigint generated always as identity primary key,
  ai_run_id uuid not null references internal.ai_task_runs(id) on delete cascade,
  attempt_number integer not null check (attempt_number between 1 and 5),
  call_kind text not null check (call_kind in ('initial', 'schema_repair', 'legacy_checkpoint')),
  provider_alias text not null check (length(provider_alias) between 1 and 100),
  resolved_model text not null check (length(resolved_model) between 1 and 200),
  resolved_provider text not null check (length(resolved_provider) between 1 and 100),
  tokens_in integer check (tokens_in is null or tokens_in >= 0),
  tokens_out integer check (tokens_out is null or tokens_out >= 0),
  cost_estimate_usd numeric check (cost_estimate_usd is null or cost_estimate_usd >= 0),
  cost_estimate_complete boolean not null,
  cost_estimate_source text not null check (
    cost_estimate_source in ('proxy_or_local_upper_bound', 'deterministic_test', 'unavailable', 'legacy_checkpoint')
  ),
  billable boolean not null default true,
  provider_request_id_present boolean not null default false,
  completed_at timestamptz not null default now(),
  unique (ai_run_id, attempt_number, call_kind),
  check (not cost_estimate_complete or cost_estimate_usd is not null)
);

create index ai_task_provider_calls_run_idx
  on internal.ai_task_provider_calls(ai_run_id, completed_at);

revoke all on table internal.ai_task_provider_calls from public, anon, authenticated;

create or replace function internal.refresh_ai_task_provider_totals(p_run_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, internal, pg_temp
as $$
declare
  totals record;
begin
  select
    count(*)::integer as provider_completions,
    coalesce(sum(tokens_in), 0)::integer as provider_tokens_in,
    coalesce(sum(tokens_out), 0)::integer as provider_tokens_out,
    coalesce(sum(cost_estimate_usd), 0)::numeric as provider_cost_estimate_usd,
    coalesce(bool_and(cost_estimate_complete), true) as provider_cost_estimate_complete,
    coalesce(bool_or(billable), false) as provider_billable,
    coalesce(bool_or(provider_request_id_present), false) as provider_request_id_present
  into totals
  from internal.ai_task_provider_calls
  where ai_run_id = p_run_id;

  update internal.ai_task_runs
  set provider_completions = totals.provider_completions,
      provider_tokens_in = totals.provider_tokens_in,
      provider_tokens_out = totals.provider_tokens_out,
      provider_cost_estimate_usd = totals.provider_cost_estimate_usd,
      provider_cost_estimate_complete = totals.provider_cost_estimate_complete,
      provider_billable = totals.provider_billable,
      provider_request_id_present = totals.provider_request_id_present,
      updated_at = now()
  where id = p_run_id;

  return to_jsonb(totals);
end;
$$;

revoke all on function internal.refresh_ai_task_provider_totals(uuid) from public, anon, authenticated;

create or replace function public.record_ai_task_provider_completion_for_worker(
  p_run_id uuid,
  p_worker_id text,
  p_attempt_number integer,
  p_call_kind text,
  p_provider_alias text,
  p_resolved_model text,
  p_resolved_provider text,
  p_tokens_in integer default null,
  p_tokens_out integer default null,
  p_cost_estimate_usd numeric default null,
  p_cost_estimate_complete boolean default false,
  p_cost_estimate_source text default 'unavailable',
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
  existing_row internal.ai_task_provider_calls%rowtype;
  totals jsonb;
begin
  select * into run_row
  from internal.ai_task_runs
  where id = p_run_id
  for update;

  if run_row.id is null then
    raise exception 'ai_task_run_missing' using errcode = '22023';
  end if;
  if run_row.status <> 'running' or run_row.locked_by is distinct from p_worker_id then
    raise exception 'ai_task_lease_invalid' using errcode = '40001';
  end if;
  if p_attempt_number is distinct from run_row.attempts then
    raise exception 'ai_task_provider_attempt_invalid' using errcode = '22023';
  end if;
  if p_call_kind not in ('initial', 'schema_repair') then
    raise exception 'ai_task_provider_call_kind_invalid' using errcode = '22023';
  end if;
  if nullif(btrim(coalesce(p_provider_alias, '')), '') is null
    or nullif(btrim(coalesce(p_resolved_model, '')), '') is null
    or nullif(btrim(coalesce(p_resolved_provider, '')), '') is null then
    raise exception 'ai_task_provider_provenance_required' using errcode = '22023';
  end if;
  if p_tokens_in < 0 or p_tokens_out < 0 or p_cost_estimate_usd < 0
    or (coalesce(p_cost_estimate_complete, false) and p_cost_estimate_usd is null) then
    raise exception 'ai_task_provider_usage_invalid' using errcode = '22023';
  end if;
  if p_cost_estimate_source not in ('proxy_or_local_upper_bound', 'deterministic_test', 'unavailable') then
    raise exception 'ai_task_provider_cost_source_invalid' using errcode = '22023';
  end if;
  if run_row.provider_alias is not null and (
    run_row.provider_alias is distinct from p_provider_alias
    or run_row.resolved_model is distinct from p_resolved_model
    or run_row.resolved_provider is distinct from p_resolved_provider
  ) then
    raise exception 'ai_task_provider_provenance_conflict' using errcode = '23505';
  end if;

  select * into existing_row
  from internal.ai_task_provider_calls
  where ai_run_id = p_run_id
    and attempt_number = p_attempt_number
    and call_kind = p_call_kind
  for update;

  if existing_row.id is not null then
    if existing_row.provider_alias is distinct from left(p_provider_alias, 100)
      or existing_row.resolved_model is distinct from left(p_resolved_model, 200)
      or existing_row.resolved_provider is distinct from left(p_resolved_provider, 100)
      or existing_row.tokens_in is distinct from p_tokens_in
      or existing_row.tokens_out is distinct from p_tokens_out
      or existing_row.cost_estimate_usd is distinct from p_cost_estimate_usd
      or existing_row.cost_estimate_complete is distinct from coalesce(p_cost_estimate_complete, false)
      or existing_row.cost_estimate_source is distinct from p_cost_estimate_source
      or existing_row.billable is distinct from coalesce(p_billable, true)
      or existing_row.provider_request_id_present is distinct from coalesce(p_provider_request_id_present, false) then
      raise exception 'ai_task_provider_completion_conflict' using errcode = '23505';
    end if;
    totals := internal.refresh_ai_task_provider_totals(p_run_id);
    return totals || jsonb_build_object('exact_redelivery', true);
  end if;

  insert into internal.ai_task_provider_calls(
    ai_run_id, attempt_number, call_kind, provider_alias, resolved_model, resolved_provider,
    tokens_in, tokens_out, cost_estimate_usd, cost_estimate_complete, cost_estimate_source,
    billable, provider_request_id_present
  ) values (
    p_run_id, p_attempt_number, p_call_kind, left(p_provider_alias, 100),
    left(p_resolved_model, 200), left(p_resolved_provider, 100), p_tokens_in, p_tokens_out,
    p_cost_estimate_usd, coalesce(p_cost_estimate_complete, false), p_cost_estimate_source,
    coalesce(p_billable, true), coalesce(p_provider_request_id_present, false)
  );

  update internal.ai_task_runs
  set provider_alias = coalesce(provider_alias, left(p_provider_alias, 100)),
      resolved_model = coalesce(resolved_model, left(p_resolved_model, 200)),
      resolved_provider = coalesce(resolved_provider, left(p_resolved_provider, 100)),
      updated_at = now()
  where id = p_run_id;

  totals := internal.refresh_ai_task_provider_totals(p_run_id);
  return totals || jsonb_build_object('exact_redelivery', false);
end;
$$;

-- Keep the established signature for rolling deploys. New workers ledger each
-- completion first; an old worker receives a one-call legacy fallback here.
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

  if run_row.provider_completions = 0 then
    insert into internal.ai_task_provider_calls(
      ai_run_id, attempt_number, call_kind, provider_alias, resolved_model, resolved_provider,
      tokens_in, tokens_out, cost_estimate_usd, cost_estimate_complete, cost_estimate_source,
      billable, provider_request_id_present
    ) values (
      p_run_id, greatest(run_row.attempts, 1), 'legacy_checkpoint', left(p_provider_alias, 100),
      left(p_resolved_model, 200), left(p_resolved_provider, 100), p_tokens_in, p_tokens_out,
      p_cost_estimate_usd, p_cost_estimate_usd is not null or not coalesce(p_billable, true),
      'legacy_checkpoint', coalesce(p_billable, true), coalesce(p_provider_request_id_present, false)
    ) on conflict (ai_run_id, attempt_number, call_kind) do nothing;
    perform internal.refresh_ai_task_provider_totals(p_run_id);
  end if;

  update internal.ai_task_runs
  set output_payload = p_output,
      provider_alias = left(p_provider_alias, 100),
      resolved_model = left(p_resolved_model, 200),
      resolved_provider = left(p_resolved_provider, 100),
      provider_completed_at = now(),
      updated_at = now()
  where id = run_row.id;

  return jsonb_build_object('status', 'checkpointed', 'exact_redelivery', false);
end;
$$;

revoke all on function public.record_ai_task_provider_completion_for_worker(
  uuid, text, integer, text, text, text, text, integer, integer, numeric, boolean, text, boolean, boolean
) from public, anon, authenticated;
grant execute on function public.record_ai_task_provider_completion_for_worker(
  uuid, text, integer, text, text, text, text, integer, integer, numeric, boolean, text, boolean, boolean
) to service_role;

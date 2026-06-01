create or replace function public.record_usage_event(
  p_workspace_id uuid,
  p_world_id uuid default null,
  p_saga_id uuid default null,
  p_event_kind text default 'manual',
  p_units numeric default 0,
  p_unit_type text default 'count',
  p_idempotency_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  existing_event public.usage_events%rowtype;
  new_event_id uuid;
  v_metadata jsonb := coalesce(p_metadata, '{}'::jsonb);
  v_period_start date := date_trunc('month', now())::date;
  v_period_end date := (date_trunc('month', now()) + interval '1 month - 1 day')::date;
  v_units numeric := greatest(coalesce(p_units, 0), 0);
  v_ai_credits int := 0;
  v_audio_seconds int := null;
  v_storage_bytes bigint := null;
  v_imports int := 0;
  v_exports int := 0;
  v_ai_call_increment int := 0;
  v_heavy_increment int := 0;
  v_user_charge boolean := true;
begin
  if nullif(btrim(coalesce(p_idempotency_key, '')), '') is null then
    raise exception 'idempotency_key is required';
  end if;

  select *
  into existing_event
  from public.usage_events ue
  where ue.idempotency_key = p_idempotency_key;

  if found then
    if not public.user_can_access_workspace(existing_event.workspace_id) then
      raise exception 'Usage event is not available';
    end if;

    return existing_event.id;
  end if;

  if not public.user_can_access_workspace(p_workspace_id) then
    raise exception 'Workspace is not available';
  end if;

  if p_world_id is not null and not public.world_belongs_to_workspace(p_world_id, p_workspace_id) then
    raise exception 'World is not available in this Workspace';
  end if;

  if p_saga_id is not null then
    if p_world_id is null then
      raise exception 'world_id is required when saga_id is supplied';
    end if;

    perform public.assert_saga_access(p_workspace_id, p_world_id, p_saga_id);
  end if;

  if v_metadata ? 'user_charge' then
    v_user_charge := coalesce((v_metadata ->> 'user_charge')::boolean, true);
  end if;

  v_ai_credits := greatest(coalesce((v_metadata ->> 'ai_credits')::numeric, case when p_unit_type = 'ai_credit' then v_units else 0 end), 0)::int;
  v_audio_seconds := greatest(coalesce((v_metadata ->> 'audio_seconds')::numeric, case when p_unit_type = 'second' then v_units else null end), 0)::int;
  v_storage_bytes := greatest(coalesce((v_metadata ->> 'storage_bytes')::numeric, case when p_unit_type = 'byte' then v_units else null end), 0)::bigint;

  insert into public.usage_events (
    workspace_id,
    world_id,
    saga_id,
    actor_gm_id,
    event_kind,
    task_name,
    provider,
    model,
    units,
    unit_type,
    tokens_in,
    tokens_out,
    audio_seconds,
    storage_bytes,
    ai_credits,
    cost_estimate_usd,
    idempotency_key,
    metadata
  )
  values (
    p_workspace_id,
    p_world_id,
    p_saga_id,
    auth.uid(),
    p_event_kind,
    v_metadata ->> 'task_name',
    v_metadata ->> 'provider',
    v_metadata ->> 'model',
    v_units,
    p_unit_type,
    nullif(v_metadata ->> 'tokens_in', '')::int,
    nullif(v_metadata ->> 'tokens_out', '')::int,
    v_audio_seconds,
    v_storage_bytes,
    v_ai_credits,
    nullif(v_metadata ->> 'cost_estimate_usd', '')::numeric(10,6),
    p_idempotency_key,
    v_metadata
  )
  returning id into new_event_id;

  -- Failed provider work is still useful for internal cost analysis, but it must not spend the GM's quota.
  if not v_user_charge then
    return new_event_id;
  end if;

  if p_event_kind in ('ai_call', 'ai', 'pipeline_synthesis') or p_unit_type = 'ai_credit' then
    v_ai_call_increment := 1;
    if coalesce((v_metadata ->> 'heavy')::boolean, false) then
      v_heavy_increment := 1;
    end if;
  else
    v_ai_credits := 0;
  end if;

  if p_event_kind not in ('transcription', 'transcription_job') and p_unit_type <> 'second' then
    v_audio_seconds := 0;
  end if;

  if p_event_kind not in ('storage', 'storage_upload') and p_unit_type <> 'byte' then
    v_storage_bytes := 0;
  end if;

  if p_event_kind = 'import' then
    v_imports := v_units::int;
  elsif p_event_kind = 'export' then
    v_exports := v_units::int;
  end if;

  insert into public.usage_monthly_rollups (
    workspace_id,
    period_start,
    period_end,
    ai_credits_used,
    ai_calls,
    heavy_ai_jobs,
    transcription_seconds_used,
    storage_bytes_current,
    imports_used,
    exports_used
  )
  values (
    p_workspace_id,
    v_period_start,
    v_period_end,
    v_ai_credits,
    v_ai_call_increment,
    v_heavy_increment,
    coalesce(v_audio_seconds, 0),
    coalesce(v_storage_bytes, 0),
    v_imports,
    v_exports
  )
  on conflict (workspace_id, period_start) do update set
    ai_credits_used = public.usage_monthly_rollups.ai_credits_used + excluded.ai_credits_used,
    ai_calls = public.usage_monthly_rollups.ai_calls + excluded.ai_calls,
    heavy_ai_jobs = public.usage_monthly_rollups.heavy_ai_jobs + excluded.heavy_ai_jobs,
    transcription_seconds_used = public.usage_monthly_rollups.transcription_seconds_used + excluded.transcription_seconds_used,
    storage_bytes_current = public.usage_monthly_rollups.storage_bytes_current + excluded.storage_bytes_current,
    imports_used = public.usage_monthly_rollups.imports_used + excluded.imports_used,
    exports_used = public.usage_monthly_rollups.exports_used + excluded.exports_used,
    period_end = excluded.period_end,
    updated_at = now();

  return new_event_id;
exception
  when unique_violation then
    select *
    into existing_event
    from public.usage_events ue
    where ue.idempotency_key = p_idempotency_key;

    if found and public.user_can_access_workspace(existing_event.workspace_id) then
      return existing_event.id;
    end if;

    raise;
end;
$$;

create or replace function public.get_workspace_usage_summary(workspace_id uuid)
returns jsonb
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  with current_period as (
    select
      date_trunc('month', now())::date as period_start,
      (date_trunc('month', now()) + interval '1 month - 1 day')::date as period_end,
      (date_trunc('month', now()) + interval '1 month')::timestamptz as reset_at
  ),
  scoped_workspace as (
    select w.id, w.usage_limits
    from public.workspaces w
    where w.id = $1
      and public.user_can_access_workspace(w.id)
  ),
  rollup as (
    select
      sw.id as workspace_id,
      cp.period_start,
      cp.period_end,
      coalesce(umr.ai_credits_used, 0)::numeric as ai_credits_used,
      coalesce(umr.ai_calls, 0) as ai_calls,
      coalesce(umr.heavy_ai_jobs, 0) as heavy_ai_jobs,
      coalesce(umr.transcription_seconds_used, 0)::numeric as transcription_seconds_used,
      coalesce(umr.storage_bytes_current, 0)::numeric as storage_bytes_current,
      coalesce(umr.imports_used, 0)::numeric as imports_used,
      coalesce(umr.exports_used, 0)::numeric as exports_used
    from scoped_workspace sw
    cross join current_period cp
    left join public.usage_monthly_rollups umr
      on umr.workspace_id = sw.id
     and umr.period_start = cp.period_start
  ),
  meter_input(limit_key, used) as (
    values
      ('ai_credits_monthly', (select ai_credits_used from rollup)),
      ('transcription_seconds_monthly', (select transcription_seconds_used from rollup)),
      ('storage_bytes', (select storage_bytes_current from rollup)),
      ('imports_monthly', (select imports_used from rollup)),
      ('exports_monthly', (select exports_used from rollup))
  ),
  meters as (
    select
      mi.limit_key,
      coalesce(mi.used, 0) as used,
      coalesce((
        select qo.override_value
        from public.quota_overrides qo
        where qo.workspace_id = sw.id
          and qo.limit_key = mi.limit_key
          and (qo.expires_at is null or qo.expires_at > now())
        order by qo.created_at desc
        limit 1
      ), (sw.usage_limits ->> mi.limit_key)::numeric, 0) as effective_limit,
      cp.reset_at
    from scoped_workspace sw
    cross join current_period cp
    cross join meter_input mi
  )
  select jsonb_build_object(
    'workspace_id', sw.id,
    'usage_limits', sw.usage_limits,
    'current_rollup', to_jsonb(r),
    'meters', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'limit_key', m.limit_key,
          'used', m.used,
          'limit', m.effective_limit,
          'remaining', greatest(m.effective_limit - m.used, 0),
          'severity', case
            when m.effective_limit <= 0 or m.used >= m.effective_limit then 'blocked'
            when m.used >= m.effective_limit * 0.9 then 'warn_90'
            when m.used >= m.effective_limit * 0.7 then 'warn_70'
            else 'ok'
          end,
          'reset_at', m.reset_at
        )
        order by m.limit_key
      )
      from meters m
    ), '[]'::jsonb),
    'reset_at', cp.reset_at
  )
  from scoped_workspace sw
  cross join current_period cp
  left join rollup r on r.workspace_id = sw.id;
$$;

revoke all on function public.record_usage_event(uuid, uuid, uuid, text, numeric, text, text, jsonb) from public;
revoke all on function public.record_usage_event(uuid, uuid, uuid, text, numeric, text, text, jsonb) from anon;
revoke all on function public.get_workspace_usage_summary(uuid) from public;
revoke all on function public.get_workspace_usage_summary(uuid) from anon;
grant execute on function public.record_usage_event(uuid, uuid, uuid, text, numeric, text, text, jsonb) to authenticated;
grant execute on function public.get_workspace_usage_summary(uuid) to authenticated;

alter table internal.export_jobs
  add column if not exists download_url text;

create or replace function public.request_saga_export(
  p_workspace_id uuid,
  p_world_id uuid,
  p_saga_id uuid,
  p_requested_formats text[] default array['json', 'markdown'],
  p_include_audit boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, internal, pg_temp
as $$
declare
  quota record;
  existing_job internal.export_jobs%rowtype;
  new_job internal.export_jobs%rowtype;
  formats text[] := coalesce(nullif(p_requested_formats, '{}'::text[]), array['json', 'markdown']);
begin
  perform public.assert_saga_access(p_workspace_id, p_world_id, p_saga_id);

  select *
  into existing_job
  from internal.export_jobs ej
  where ej.workspace_id = p_workspace_id
    and ej.world_id = p_world_id
    and ej.saga_id = p_saga_id
    and ej.state in ('pending', 'running')
  order by ej.created_at desc
  limit 1;

  if found then
    return jsonb_build_object('allowed', true, 'export_id', existing_job.id, 'state', existing_job.state, 'existing', true);
  end if;

  select *
  into quota
  from public.check_quota_preflight(p_workspace_id, p_world_id, p_saga_id, 'export', 1, jsonb_build_object('formats', formats));

  if not quota.allowed then
    return jsonb_build_object(
      'allowed', false,
      'severity', quota.severity,
      'message', quota.message,
      'manual_fallback_available', true
    );
  end if;

  insert into internal.export_jobs (
    workspace_id,
    world_id,
    saga_id,
    gm_id,
    requested_formats,
    include_audit,
    state,
    idempotency_key
  )
  values (
    p_workspace_id,
    p_world_id,
    p_saga_id,
    auth.uid(),
    formats,
    p_include_audit,
    'pending',
    'export:' || p_saga_id::text || ':' || replace(date_trunc('second', now())::text, ' ', 'T')
  )
  returning * into new_job;

  return jsonb_build_object('allowed', true, 'export_id', new_job.id, 'state', new_job.state, 'existing', false);
end;
$$;

create or replace function public.get_saga_export_status(
  p_workspace_id uuid,
  p_world_id uuid,
  p_saga_id uuid,
  p_export_id uuid
)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, internal, pg_temp
as $$
declare
  job internal.export_jobs%rowtype;
begin
  perform public.assert_saga_access(p_workspace_id, p_world_id, p_saga_id);

  select *
  into job
  from internal.export_jobs ej
  where ej.id = p_export_id
    and ej.workspace_id = p_workspace_id
    and ej.world_id = p_world_id
    and ej.saga_id = p_saga_id;

  if not found then
    return jsonb_build_object('available', false, 'state', 'missing');
  end if;

  return jsonb_strip_nulls(jsonb_build_object(
    'available', true,
    'export_id', job.id,
    'state', job.state,
    'requested_formats', to_jsonb(job.requested_formats),
    'include_audit', job.include_audit,
    'created_at', job.created_at,
    'completed_at', job.completed_at,
    'expires_at', job.expires_at,
    'failure_reason', job.failure_reason
  ));
end;
$$;

create or replace function public.get_saga_export_download(
  p_workspace_id uuid,
  p_world_id uuid,
  p_saga_id uuid,
  p_export_id uuid
)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, internal, pg_temp
as $$
declare
  job internal.export_jobs%rowtype;
begin
  perform public.assert_saga_access(p_workspace_id, p_world_id, p_saga_id);

  select *
  into job
  from internal.export_jobs ej
  where ej.id = p_export_id
    and ej.workspace_id = p_workspace_id
    and ej.world_id = p_world_id
    and ej.saga_id = p_saga_id;

  if not found or job.state <> 'complete' or job.expires_at <= now() then
    return jsonb_build_object('available', false, 'state', coalesce(job.state, 'missing'));
  end if;

  return jsonb_build_object(
    'available', true,
    'export_id', job.id,
    'download_url', job.download_url,
    'expires_at', job.expires_at
  );
end;
$$;

create or replace function internal.complete_export_job(
  p_export_id uuid,
  p_storage_path text,
  p_download_url text
)
returns uuid
language plpgsql
security definer
set search_path = public, internal, pg_temp
as $$
declare
  job internal.export_jobs%rowtype;
  usage_id uuid;
  inserted_usage boolean := false;
  v_period_start date := date_trunc('month', now())::date;
  v_period_end date := (date_trunc('month', now()) + interval '1 month - 1 day')::date;
begin
  select * into job
  from internal.export_jobs ej
  where ej.id = p_export_id
  for update;

  if not found then
    raise exception 'Export job is not available';
  end if;

  update internal.export_jobs
  set state = 'complete',
      storage_path = p_storage_path,
      download_url = p_download_url,
      expires_at = greatest(expires_at, now() + interval '7 days'),
      completed_at = coalesce(completed_at, now()),
      locked_by = null,
      locked_at = null,
      failure_reason = null,
      updated_at = now()
  where id = p_export_id;

  insert into public.usage_events (
    workspace_id, world_id, saga_id, actor_gm_id, event_kind, units, unit_type, idempotency_key, metadata
  )
  values (
    job.workspace_id,
    job.world_id,
    job.saga_id,
    job.gm_id,
    'export',
    1,
    'count',
    'export:' || job.id::text,
    jsonb_build_object('export_id', job.id, 'formats', job.requested_formats, 'include_audit', job.include_audit)
  )
  on conflict (idempotency_key) do nothing
  returning id into usage_id;

  inserted_usage := usage_id is not null;

  if inserted_usage then
    insert into public.usage_monthly_rollups (workspace_id, period_start, period_end, exports_used)
    values (job.workspace_id, v_period_start, v_period_end, 1)
    on conflict (workspace_id, period_start) do update set
      exports_used = public.usage_monthly_rollups.exports_used + 1,
      period_end = excluded.period_end,
      updated_at = now();
  end if;

  return p_export_id;
end;
$$;

create or replace function internal.enqueue_notification(
  p_gm_id uuid,
  p_workspace_id uuid,
  p_world_id uuid,
  p_saga_id uuid,
  p_kind public.notification_kind,
  p_channels public.notification_channel[],
  p_payload jsonb,
  p_idempotency_key text
)
returns uuid
language plpgsql
security definer
set search_path = public, internal, pg_temp
as $$
declare
  notification_id uuid;
begin
  select id into notification_id
  from internal.notification_queue
  where idempotency_key = p_idempotency_key;

  if found then
    update internal.notification_queue
    set payload = payload || coalesce(p_payload, '{}'::jsonb),
        updated_at = now()
    where id = notification_id;

    return notification_id;
  end if;

  insert into internal.notification_queue (
    gm_id, workspace_id, world_id, saga_id, kind, channels, payload, state, idempotency_key
  )
  values (
    p_gm_id,
    p_workspace_id,
    p_world_id,
    p_saga_id,
    p_kind,
    p_channels,
    coalesce(p_payload, '{}'::jsonb),
    'pending',
    p_idempotency_key
  )
  returning id into notification_id;

  return notification_id;
end;
$$;

create or replace function internal.enqueue_pipeline_notification()
returns trigger
language plpgsql
security definer
set search_path = public, internal, pg_temp
as $$
declare
  owner_id uuid;
  notification_kind public.notification_kind;
begin
  if new.state = old.state or new.state not in ('ready_for_review', 'failed') then
    return new;
  end if;

  if exists (
    select 1
    from public.sessions s
    where s.id = new.session_id
      and s.status in ('in_progress', 'ended_pending_undo')
  ) then
    return new;
  end if;

  select s.owner_gm_id into owner_id
  from public.sagas s
  where s.id = new.saga_id;

  notification_kind := case when new.state = 'ready_for_review' then 'pipeline_ready'::public.notification_kind else 'pipeline_failed'::public.notification_kind end;

  perform internal.enqueue_notification(
    owner_id,
    new.workspace_id,
    new.world_id,
    new.saga_id,
    notification_kind,
    array['email'::public.notification_channel, 'push'::public.notification_channel],
    jsonb_build_object('pipeline_run_id', new.id, 'session_id', new.session_id),
    'notification:' || notification_kind::text || ':' || new.id::text
  );

  return new;
end;
$$;

drop trigger if exists enqueue_pipeline_notification on public.pipeline_runs;
create trigger enqueue_pipeline_notification
after update of state on public.pipeline_runs
for each row execute function internal.enqueue_pipeline_notification();

create or replace function internal.scan_stale_pipelines()
returns integer
language plpgsql
security definer
set search_path = public, internal, pg_temp
as $$
declare
  changed_count int := 0;
  run_row public.pipeline_runs%rowtype;
  owner_id uuid;
begin
  for run_row in
    select *
    from public.pipeline_runs pr
    where pr.state = 'ready_for_review'
      and pr.staleness_warned_at is null
      and pr.created_at <= now() - interval '30 days'
  loop
    update public.pipeline_runs set staleness_warned_at = now() where id = run_row.id;
    select s.owner_gm_id into owner_id from public.sagas s where s.id = run_row.saga_id;
    perform internal.enqueue_notification(
      owner_id,
      run_row.workspace_id,
      run_row.world_id,
      run_row.saga_id,
      'pipeline_stale_30d',
      array['email'::public.notification_channel],
      jsonb_build_object('pipeline_run_id', run_row.id, 'session_id', run_row.session_id),
      'notification:pipeline_stale_30d:' || run_row.id::text
    );
    changed_count := changed_count + 1;
  end loop;

  for run_row in
    select *
    from public.pipeline_runs pr
    where pr.state = 'ready_for_review'
      and pr.staleness_nudge_90_at is null
      and pr.created_at <= now() - interval '90 days'
  loop
    update public.pipeline_runs set staleness_nudge_90_at = now() where id = run_row.id;
    select s.owner_gm_id into owner_id from public.sagas s where s.id = run_row.saga_id;
    perform internal.enqueue_notification(
      owner_id,
      run_row.workspace_id,
      run_row.world_id,
      run_row.saga_id,
      'pipeline_stale_90d',
      array['email'::public.notification_channel],
      jsonb_build_object('pipeline_run_id', run_row.id, 'session_id', run_row.session_id),
      'notification:pipeline_stale_90d:' || run_row.id::text
    );
    changed_count := changed_count + 1;
  end loop;

  return changed_count;
end;
$$;

create or replace function internal.dispatch_notification_for_test(p_notification_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, internal, pg_temp
as $$
declare
  job internal.notification_queue%rowtype;
  preferences jsonb;
  channel public.notification_channel;
  channel_state text;
  dispatch jsonb := '{}'::jsonb;
  sent_count int := 0;
begin
  select * into job
  from internal.notification_queue nq
  where nq.id = p_notification_id
  for update;

  if not found then
    raise exception 'Notification is not available';
  end if;

  select gp.notification_preferences into preferences
  from public.gm_profiles gp
  where gp.user_id = job.gm_id;

  foreach channel in array job.channels loop
    if coalesce((preferences ->> 'paused')::boolean, false) then
      channel_state := 'skipped';
    elsif not coalesce((preferences #>> array[channel::text, job.kind::text])::boolean, false) then
      channel_state := 'skipped';
    elsif channel = 'push' and not exists (select 1 from public.push_devices pd where pd.user_id = job.gm_id) then
      channel_state := 'skipped';
    else
      channel_state := 'sent';
      sent_count := sent_count + 1;
    end if;

    dispatch := jsonb_set(dispatch, array[channel::text], jsonb_build_object('state', channel_state), true);
  end loop;

  update internal.notification_queue
  set state = case when sent_count > 0 then 'sent' else 'skipped' end,
      sent_at = case when sent_count > 0 then now() else sent_at end,
      completed_at = now(),
      payload = payload || jsonb_build_object('dispatch', dispatch),
      updated_at = now()
  where id = job.id;

  return job.id;
end;
$$;

create or replace function internal.complete_cleanup_job(
  p_job_id uuid,
  p_deleted_paths integer default 0,
  p_skipped_paths integer default 0
)
returns uuid
language plpgsql
security definer
set search_path = public, internal, pg_temp
as $$
begin
  perform internal.complete_job(
    'cleanup_jobs',
    p_job_id,
    jsonb_build_object('deleted_paths', greatest(coalesce(p_deleted_paths, 0), 0), 'skipped_paths', greatest(coalesce(p_skipped_paths, 0), 0))
  );
  return p_job_id;
end;
$$;

create or replace function public.complete_export_job_for_worker(
  p_export_id uuid,
  p_storage_path text,
  p_download_url text
)
returns uuid
language sql
security definer
set search_path = public, internal, pg_temp
as $$
  select internal.complete_export_job($1, $2, $3);
$$;

create or replace function public.dispatch_notification_for_worker(p_notification_id uuid)
returns uuid
language sql
security definer
set search_path = public, internal, pg_temp
as $$
  select internal.dispatch_notification_for_test($1);
$$;

create or replace function public.complete_cleanup_job_for_worker(
  p_job_id uuid,
  p_deleted_paths integer default 0,
  p_skipped_paths integer default 0
)
returns uuid
language sql
security definer
set search_path = public, internal, pg_temp
as $$
  select internal.complete_cleanup_job($1, $2, $3);
$$;

create or replace function public.update_notification_preferences(p_preferences jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  prefs jsonb := coalesce(p_preferences, '{}'::jsonb);
begin
  if auth.uid() is null then
    raise exception 'Authentication is required';
  end if;

  update public.gm_profiles
  set notification_preferences = prefs,
      updated_at = now()
  where user_id = auth.uid()
  returning notification_preferences into prefs;

  if prefs is null then
    raise exception 'GM profile is not available';
  end if;

  return prefs;
end;
$$;

create or replace function public.register_push_device(
  p_expo_push_token text,
  p_platform public.push_platform,
  p_device_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  device_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required';
  end if;

  if nullif(btrim(coalesce(p_expo_push_token, '')), '') is null then
    raise exception 'Expo push token is required';
  end if;

  insert into public.push_devices (user_id, expo_push_token, platform, device_name, last_seen_at)
  values (auth.uid(), p_expo_push_token, p_platform, p_device_name, now())
  on conflict (user_id, expo_push_token) do update set
    platform = excluded.platform,
    device_name = excluded.device_name,
    last_seen_at = now()
  returning id into device_id;

  return device_id;
end;
$$;

revoke all on function public.request_saga_export(uuid, uuid, uuid, text[], boolean) from public, anon;
revoke all on function public.get_saga_export_status(uuid, uuid, uuid, uuid) from public, anon;
revoke all on function public.get_saga_export_download(uuid, uuid, uuid, uuid) from public, anon;
revoke all on function public.update_notification_preferences(jsonb) from public, anon;
revoke all on function public.register_push_device(text, public.push_platform, text) from public, anon;
revoke all on function public.complete_export_job_for_worker(uuid, text, text) from public, anon, authenticated;
revoke all on function public.dispatch_notification_for_worker(uuid) from public, anon, authenticated;
revoke all on function public.complete_cleanup_job_for_worker(uuid, integer, integer) from public, anon, authenticated;

grant execute on function public.request_saga_export(uuid, uuid, uuid, text[], boolean) to authenticated;
grant execute on function public.get_saga_export_status(uuid, uuid, uuid, uuid) to authenticated;
grant execute on function public.get_saga_export_download(uuid, uuid, uuid, uuid) to authenticated;
grant execute on function public.update_notification_preferences(jsonb) to authenticated;
grant execute on function public.register_push_device(text, public.push_platform, text) to authenticated;

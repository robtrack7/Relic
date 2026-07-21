create or replace function public.get_saga_context(workspace_id uuid, world_id uuid, saga_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  workspace_row jsonb;
  world_row jsonb;
  saga_row jsonb;
  hierarchy_row jsonb;
begin
  perform public.assert_saga_access($1, $2, $3);

  select to_jsonb(w) - 'billing_customer_id' into workspace_row
  from public.workspaces w
  where w.id = $1 and w.deleted_at is null;

  select to_jsonb(w) into world_row
  from public.worlds w
  where w.id = $2 and w.workspace_id = $1 and w.deleted_at is null;

  select to_jsonb(s) into saga_row
  from public.sagas s
  where s.id = $3 and s.workspace_id = $1 and s.world_id = $2 and s.deleted_at is null;

  select jsonb_build_object(
    'switching_blocked', exists (
      select 1 from public.sessions live
      where live.workspace_id = $1 and live.world_id = $2 and live.saga_id = $3
        and live.status in ('in_progress', 'ended_pending_undo')
    ),
    'workspaces', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', ws.id,
          'name', ws.name,
          'target', case when target.saga_id is null then null else jsonb_build_object(
            'workspaceId', ws.id,
            'worldId', target.world_id,
            'sagaId', target.saga_id
          ) end
        ) order by ws.name, ws.id
      )
      from public.workspaces ws
      left join lateral (
        select s.world_id, s.id as saga_id
        from public.sagas s
        join public.worlds wo on wo.id = s.world_id and wo.workspace_id = ws.id and wo.deleted_at is null
        where s.workspace_id = ws.id and s.deleted_at is null and s.status = 'active'
        order by case when ws.id = $1 and s.id = $3 then 0 else 1 end, s.updated_at desc, s.created_at desc
        limit 1
      ) target on true
      where ws.owner_gm_id = auth.uid() and ws.deleted_at is null
    ), '[]'::jsonb),
    'worlds', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', wo.id,
          'name', wo.name,
          'target', case when target.saga_id is null then null else jsonb_build_object(
            'workspaceId', wo.workspace_id,
            'worldId', wo.id,
            'sagaId', target.saga_id
          ) end
        ) order by wo.name, wo.id
      )
      from public.worlds wo
      left join lateral (
        select s.id as saga_id
        from public.sagas s
        where s.workspace_id = wo.workspace_id and s.world_id = wo.id
          and s.deleted_at is null and s.status = 'active'
        order by case when wo.id = $2 and s.id = $3 then 0 else 1 end, s.updated_at desc, s.created_at desc
        limit 1
      ) target on true
      where wo.workspace_id = $1 and wo.owner_gm_id = auth.uid() and wo.deleted_at is null
    ), '[]'::jsonb),
    'sagas', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', s.id,
          'name', s.name,
          'target', jsonb_build_object('workspaceId', s.workspace_id, 'worldId', s.world_id, 'sagaId', s.id)
        ) order by s.name, s.id
      )
      from public.sagas s
      where s.workspace_id = $1 and s.world_id = $2 and s.owner_gm_id = auth.uid()
        and s.deleted_at is null and s.status = 'active'
    ), '[]'::jsonb)
  ) into hierarchy_row;

  return jsonb_build_object(
    'workspace', workspace_row,
    'world', world_row,
    'saga', saga_row,
    'hierarchy', hierarchy_row
  );
end;
$$;

create or replace function public.rename_saga(
  workspace_id uuid,
  world_id uuid,
  saga_id uuid,
  new_name text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean_name text := btrim(rename_saga.new_name);
  renamed public.sagas%rowtype;
begin
  perform public.assert_saga_access(rename_saga.workspace_id, rename_saga.world_id, rename_saga.saga_id);

  if clean_name is null or length(clean_name) not between 1 and 120 then
    raise exception 'Saga name must be between 1 and 120 characters' using errcode = '23514';
  end if;

  update public.sagas s
  set name = clean_name, updated_at = now()
  where s.id = rename_saga.saga_id
    and s.workspace_id = rename_saga.workspace_id
    and s.world_id = rename_saga.world_id
    and s.deleted_at is null
  returning * into renamed;

  if renamed.id is null then
    raise exception 'Saga access denied' using errcode = '42501';
  end if;

  return jsonb_build_object('id', renamed.id, 'name', renamed.name, 'updated_at', renamed.updated_at);
end;
$$;

create or replace function public.delete_saga(
  workspace_id uuid,
  world_id uuid,
  saga_id uuid,
  confirmation_name text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.sagas%rowtype;
  next_saga public.sagas%rowtype;
  cleanup_id uuid;
begin
  perform public.assert_saga_access(delete_saga.workspace_id, delete_saga.world_id, delete_saga.saga_id);

  select * into target
  from public.sagas s
  where s.id = delete_saga.saga_id
    and s.workspace_id = delete_saga.workspace_id
    and s.world_id = delete_saga.world_id
    and s.deleted_at is null
  for update;

  if target.id is null then
    raise exception 'Saga access denied' using errcode = '42501';
  end if;
  if btrim(coalesce(delete_saga.confirmation_name, '')) <> target.name then
    raise exception 'Saga confirmation name does not match' using errcode = '23514';
  end if;
  if exists (
    select 1 from public.sessions s
    where s.saga_id = target.id and s.status in ('in_progress', 'ended_pending_undo')
  ) then
    raise exception 'cannot delete a Saga while a session is live or ending' using errcode = '23514';
  end if;

  update public.sagas s set deleted_at = now(), updated_at = now() where s.id = target.id;

  select cj.id into cleanup_id
  from internal.cleanup_jobs cj
  where cj.idempotency_key = 'cleanup:saga:' || target.id::text;

  select s.* into next_saga
  from public.sagas s
  join public.worlds wo on wo.id = s.world_id and wo.workspace_id = s.workspace_id and wo.deleted_at is null
  join public.workspaces ws on ws.id = s.workspace_id and ws.deleted_at is null
  where ws.owner_gm_id = auth.uid() and s.deleted_at is null and s.status = 'active'
  order by
    case
      when s.world_id = target.world_id then 0
      when s.workspace_id = target.workspace_id then 1
      else 2
    end,
    s.updated_at desc,
    s.created_at desc
  limit 1;

  return jsonb_build_object(
    'state', 'cleanup_pending',
    'cleanup_job_id', cleanup_id,
    'next_workspace_id', next_saga.workspace_id,
    'next_world_id', next_saga.world_id,
    'next_saga_id', next_saga.id
  );
end;
$$;

drop function if exists public.list_worlds_for_workspace();
create or replace function public.list_worlds_for_workspace(workspace_id uuid default null)
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  target_workspace_id uuid := list_worlds_for_workspace.workspace_id;
  result jsonb;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if target_workspace_id is null then
    select w.id into target_workspace_id
    from public.workspaces w
    where w.owner_gm_id = auth.uid() and w.deleted_at is null
    order by w.created_at
    limit 1;
  elsif not public.user_owns_workspace(target_workspace_id) then
    raise exception 'Workspace access denied' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('id', w.id, 'name', w.name) order by w.updated_at desc), '[]'::jsonb)
  into result
  from public.worlds w
  where w.workspace_id = target_workspace_id and w.deleted_at is null;

  return result;
end;
$$;

drop function if exists public.create_blank_saga(text, text, text, text, text, text, uuid, text);
create or replace function public.create_blank_saga(
  saga_name text,
  game_system text default null,
  experience_level text default 'returning',
  improv_comfort text default 'mixed',
  prep_style text default 'mixed',
  world_choice text default 'new',
  existing_world_id uuid default null,
  world_name text default null,
  target_workspace_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_workspace_id uuid;
  selected_world_id uuid;
  selected_era_id uuid;
  inserted_saga_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if nullif(btrim(saga_name), '') is null then
    raise exception 'Saga name is required' using errcode = '23514';
  end if;

  if target_workspace_id is null then
    v_workspace_id := public.ensure_default_workspace();
  elsif public.user_owns_workspace(target_workspace_id) then
    v_workspace_id := target_workspace_id;
  else
    raise exception 'Workspace access denied' using errcode = '42501';
  end if;

  insert into public.gm_profiles (user_id, experience_level, improv_comfort, prep_style, default_game_system)
  values (auth.uid(), coalesce(experience_level, 'returning'), coalesce(improv_comfort, 'mixed'), coalesce(prep_style, 'mixed'), nullif(game_system, ''))
  on conflict (user_id) do update
  set experience_level = excluded.experience_level,
      improv_comfort = excluded.improv_comfort,
      prep_style = excluded.prep_style,
      default_game_system = excluded.default_game_system,
      updated_at = now();

  if world_choice = 'existing' and existing_world_id is not null then
    select w.id into selected_world_id
    from public.worlds w
    where w.id = existing_world_id and w.workspace_id = v_workspace_id and w.deleted_at is null;
  end if;

  if world_choice = 'existing' and existing_world_id is not null and selected_world_id is null then
    raise exception 'World access denied' using errcode = '42501';
  end if;

  if selected_world_id is null then
    insert into public.worlds (workspace_id, owner_gm_id, name, default_game_system)
    values (v_workspace_id, auth.uid(), coalesce(nullif(btrim(world_name), ''), btrim(saga_name) || ' World'), nullif(game_system, ''))
    returning id into selected_world_id;
  end if;

  select we.id into selected_era_id
  from public.world_eras we
  where we.workspace_id = v_workspace_id and we.world_id = selected_world_id
  order by we.sort_order
  limit 1;

  if selected_era_id is null then
    insert into public.world_eras (workspace_id, world_id, name, summary, sort_order)
    values (v_workspace_id, selected_world_id, 'Default Era', 'Default timeframe for this world.', 0)
    returning id into selected_era_id;
  end if;

  insert into public.sagas (workspace_id, world_id, owner_gm_id, name, game_system, primary_era_id)
  values (v_workspace_id, selected_world_id, auth.uid(), btrim(saga_name), nullif(game_system, ''), selected_era_id)
  returning id into inserted_saga_id;

  return jsonb_build_object('workspace_id', v_workspace_id, 'world_id', selected_world_id, 'saga_id', inserted_saga_id);
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
set search_path = ''
as $$
declare
  job internal.cleanup_jobs%rowtype;
begin
  select * into job from internal.cleanup_jobs where id = p_job_id for update;
  if job.id is null then
    raise exception 'cleanup job not found';
  end if;

  perform internal.complete_job(
    'cleanup_jobs',
    p_job_id,
    jsonb_build_object(
      'deleted_paths', greatest(coalesce(p_deleted_paths, 0), 0),
      'skipped_paths', greatest(coalesce(p_skipped_paths, 0), 0)
    )
  );

  if job.job_kind = 'saga' and job.saga_id is not null then
    if not exists (select 1 from public.sagas s where s.id = job.saga_id and s.deleted_at is not null) then
      raise exception 'Saga cleanup requires a pending deletion';
    end if;

    delete from internal.embedding_jobs where saga_id = job.saga_id;
    delete from internal.transcription_jobs where saga_id = job.saga_id;
    delete from internal.export_jobs where saga_id = job.saga_id;
    delete from internal.notification_queue where saga_id = job.saga_id;
    delete from internal.stale_pipeline_warning_jobs where saga_id = job.saga_id;
    delete from internal.cleanup_jobs where saga_id = job.saga_id and id <> job.id;
    delete from public.sagas where id = job.saga_id;
  end if;

  return p_job_id;
end;
$$;

create or replace function public.claim_cleanup_job_for_worker(worker_id text)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select internal.claim_cleanup_job($1);
$$;

revoke all on function public.rename_saga(uuid, uuid, uuid, text) from public, anon;
revoke all on function public.delete_saga(uuid, uuid, uuid, text) from public, anon;
revoke all on function public.list_worlds_for_workspace(uuid) from public, anon;
revoke all on function public.create_blank_saga(text, text, text, text, text, text, uuid, text, uuid) from public, anon;
grant execute on function public.rename_saga(uuid, uuid, uuid, text) to authenticated;
grant execute on function public.delete_saga(uuid, uuid, uuid, text) to authenticated;
grant execute on function public.list_worlds_for_workspace(uuid) to authenticated;
grant execute on function public.create_blank_saga(text, text, text, text, text, text, uuid, text, uuid) to authenticated;
revoke all on function public.claim_cleanup_job_for_worker(text) from public, anon, authenticated;
grant execute on function public.claim_cleanup_job_for_worker(text) to service_role;

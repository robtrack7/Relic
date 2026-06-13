create or replace function public.set_session_status(
  workspace_id uuid,
  world_id uuid,
  saga_id uuid,
  session_id uuid,
  status public.session_status
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_status public.session_status;
  updated_id uuid;
  capture_count int;
  moment_count int;
begin
  perform public.assert_saga_access($1, $2, $3);
  perform pg_advisory_xact_lock(hashtextextended($3::text, 0));

  select s.status into current_status
  from public.sessions s
  where s.id = set_session_status.session_id
    and s.workspace_id = $1
    and s.world_id = $2
    and s.saga_id = $3
  for update;

  if current_status is null then
    raise exception 'Session is not available' using errcode = '42501';
  end if;

  if set_session_status.status = 'ready' then
    if current_status not in ('planned', 'ready', 'started') then
      raise exception 'invalid status transition: % to %', current_status, set_session_status.status using errcode = '23514';
    end if;
    if not internal.session_ready_for_stage($1, $2, $3, set_session_status.session_id) then
      raise exception 'ready for stage requires a title and at least one packet item' using errcode = '23514';
    end if;
  elsif not (
    (current_status = 'ready' and set_session_status.status = 'started')
    or (current_status = 'started' and set_session_status.status = 'in_progress')
    or (current_status = 'in_progress' and set_session_status.status = 'ended_pending_undo')
    or (current_status = 'ended_pending_undo' and set_session_status.status in ('in_progress', 'ended'))
    or (current_status = set_session_status.status)
  ) then
    raise exception 'invalid status transition: % to %', current_status, set_session_status.status using errcode = '23514';
  end if;

  if set_session_status.status in ('started', 'in_progress')
     and current_status not in ('started', 'in_progress')
     and exists (
       select 1
       from public.sessions live
       where live.workspace_id = $1
         and live.world_id = $2
         and live.saga_id = $3
         and live.id <> set_session_status.session_id
         and live.status in ('started', 'in_progress')
     ) then
    raise exception 'live session already exists for this Saga' using errcode = '23514';
  end if;

  update public.sessions s
  set status = set_session_status.status,
      packet_locked_at = case when set_session_status.status = 'ready' then coalesce(s.packet_locked_at, now()) else s.packet_locked_at end,
      pending_prep_suggestions = case when set_session_status.status = 'ready' then '[]'::jsonb else s.pending_prep_suggestions end,
      started_at = case when set_session_status.status in ('started', 'in_progress') then coalesce(s.started_at, now()) else s.started_at end,
      went_live_at = case when set_session_status.status = 'in_progress' then coalesce(s.went_live_at, now()) else s.went_live_at end,
      ended_pending_undo_at = case when set_session_status.status = 'ended_pending_undo' then now() when set_session_status.status = 'in_progress' then null else s.ended_pending_undo_at end,
      ended_at = case when set_session_status.status = 'ended' then coalesce(s.ended_at, now()) else s.ended_at end,
      updated_at = now()
  where s.id = set_session_status.session_id
    and s.workspace_id = $1
    and s.world_id = $2
    and s.saga_id = $3
  returning s.id into updated_id;

  if set_session_status.status = 'ended' and current_status = 'ended_pending_undo' then
    select count(*) into capture_count from public.sources src where src.session_id = set_session_status.session_id and src.kind = 'note';
    select count(*) into moment_count from public.session_marked_moments m where m.session_id = set_session_status.session_id;

    insert into public.pipeline_runs (workspace_id, world_id, saga_id, session_id, state, inputs_summary)
    select $1, $2, $3, set_session_status.session_id, 'queued',
           jsonb_build_object('capture_count', capture_count, 'marked_moment_count', moment_count)
    where not exists (
      select 1 from public.pipeline_runs pr
      where pr.session_id = set_session_status.session_id
        and pr.workspace_id = $1
        and pr.world_id = $2
        and pr.saga_id = $3
    );
  end if;

  return updated_id;
end;
$$;

drop function if exists public.quick_stub(uuid, uuid, uuid, text, text, text);

create or replace function public.quick_stub(
  workspace_id uuid,
  world_id uuid,
  saga_id uuid,
  session_id uuid,
  entity_type text,
  entity_name text,
  summary text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  inserted_id uuid;
  source_id uuid;
begin
  perform public.assert_saga_access($1, $2, $3);

  if not internal.stage_session_writable($1, $2, $3, quick_stub.session_id) then
    raise exception 'Stage writes require a started or in-progress session' using errcode = '23514';
  end if;

  if nullif(trim(entity_name), '') is null then
    raise exception 'Entity name is required' using errcode = '23514';
  end if;

  if entity_type = 'character' then
    insert into public.characters (workspace_id, world_id, saga_id, scope, name, summary, canon_state, created_by, is_stub)
    values ($1, $2, $3, 'saga', entity_name, summary, 'canon', 'gm', true) returning id into inserted_id;
  elsif entity_type = 'place' then
    insert into public.places (workspace_id, world_id, saga_id, scope, name, summary, canon_state, created_by, is_stub)
    values ($1, $2, $3, 'saga', entity_name, summary, 'canon', 'gm', true) returning id into inserted_id;
  elsif entity_type = 'faction' then
    insert into public.factions (workspace_id, world_id, saga_id, scope, name, summary, canon_state, created_by, is_stub)
    values ($1, $2, $3, 'saga', entity_name, summary, 'canon', 'gm', true) returning id into inserted_id;
  elsif entity_type = 'artifact' then
    insert into public.artifacts (workspace_id, world_id, saga_id, scope, name, summary, canon_state, created_by, is_stub)
    values ($1, $2, $3, 'saga', entity_name, summary, 'canon', 'gm', true) returning id into inserted_id;
  elsif entity_type = 'thread' then
    insert into public.threads (workspace_id, world_id, saga_id, scope, name, summary, canon_state, created_by, is_stub)
    values ($1, $2, $3, 'saga', entity_name, summary, 'canon', 'gm', true) returning id into inserted_id;
  else
    raise exception 'Unsupported entity type' using errcode = '23514';
  end if;

  source_id := public.write_manual_canon_source($1, $2, $3, 'saga', entity_type, inserted_id, 'quick_stub', jsonb_build_object('name', entity_name, 'summary', summary, 'session_id', quick_stub.session_id));
  update public.sources
  set session_id = quick_stub.session_id
  where id = source_id;
  perform public.write_manual_canon_audit($1, $2, $3, 'saga', entity_type, inserted_id, null, 'canon', 'quick_stub', source_id, jsonb_build_object('name', entity_name, 'summary', summary, 'session_id', quick_stub.session_id));

  return inserted_id;
end;
$$;

revoke execute on function public.quick_stub(uuid, uuid, uuid, uuid, text, text, text) from PUBLIC, anon;
grant execute on function public.quick_stub(uuid, uuid, uuid, uuid, text, text, text) to authenticated;

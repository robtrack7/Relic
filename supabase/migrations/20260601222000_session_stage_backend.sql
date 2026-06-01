alter table public.sessions
  add column if not exists packet_locked_at timestamptz,
  add column if not exists went_live_at timestamptz,
  add column if not exists ended_pending_undo_at timestamptz;

create or replace function internal.session_ready_for_stage(
  p_workspace_id uuid,
  p_world_id uuid,
  p_saga_id uuid,
  p_session_id uuid
)
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.sessions s
    where s.id = p_session_id
      and s.workspace_id = p_workspace_id
      and s.world_id = p_world_id
      and s.saga_id = p_saga_id
      and nullif(trim(s.name), '') is not null
      and (
        nullif(trim(coalesce(s.objective, '')), '') is not null
        or nullif(trim(coalesce(s.opening_scene, '')), '') is not null
        or nullif(trim(coalesce(s.scene_notes, '')), '') is not null
        or jsonb_array_length(coalesce(s.prep_checklist, '[]'::jsonb)) > 0
        or exists (select 1 from public.session_pinned_entities p where p.session_id = s.id)
        or exists (select 1 from public.session_active_threads t where t.session_id = s.id)
      )
  );
$$;

create or replace function public.update_session_prep(
  workspace_id uuid,
  world_id uuid,
  saga_id uuid,
  session_id uuid,
  session_name text,
  objective text,
  opening_scene text,
  scene_notes text,
  prep_checklist jsonb,
  pinned_entities jsonb default '[]'::jsonb,
  active_threads jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  updated_id uuid;
  current_status public.session_status;
  pin text;
  pin_type text;
  pin_id uuid;
  pin_index int := 0;
  active_thread_id uuid;
begin
  perform public.assert_saga_access($1, $2, $3);

  select s.status into current_status
  from public.sessions s
  where s.id = update_session_prep.session_id
    and s.workspace_id = $1
    and s.world_id = $2
    and s.saga_id = $3
  for update;

  if current_status is null then
    raise exception 'Session is not available' using errcode = '42501';
  end if;
  if current_status in ('in_progress', 'ended_pending_undo') then
    raise exception 'prep is locked while the session is live or ending' using errcode = '23514';
  end if;

  for pin in select jsonb_array_elements_text(coalesce(update_session_prep.pinned_entities, '[]'::jsonb)) loop
    pin_type := split_part(pin, ':', 1);
    pin_id := split_part(pin, ':', 2)::uuid;
    if not public.scoped_entity_exists(pin_type::public.entity_type, pin_id, $1, $2, $3, 'saga') then
      raise exception 'referenced entity is outside the row scope' using errcode = '23514';
    end if;
  end loop;

  for active_thread_id in select jsonb_array_elements_text(coalesce(update_session_prep.active_threads, '[]'::jsonb))::uuid loop
    if not public.scoped_entity_exists('thread', active_thread_id, $1, $2, $3, 'saga') then
      raise exception 'referenced thread is outside the row scope' using errcode = '23514';
    end if;
  end loop;

  update public.sessions s
  set name = coalesce(nullif(trim(update_session_prep.session_name), ''), s.name),
      objective = update_session_prep.objective,
      opening_scene = update_session_prep.opening_scene,
      scene_notes = update_session_prep.scene_notes,
      prep_checklist = coalesce(update_session_prep.prep_checklist, '[]'::jsonb),
      updated_at = now()
  where s.id = update_session_prep.session_id
    and s.workspace_id = $1
    and s.world_id = $2
    and s.saga_id = $3
  returning s.id into updated_id;

  delete from public.session_pinned_entities p where p.session_id = update_session_prep.session_id;
  for pin in select jsonb_array_elements_text(coalesce(update_session_prep.pinned_entities, '[]'::jsonb)) loop
    pin_type := split_part(pin, ':', 1);
    pin_id := split_part(pin, ':', 2)::uuid;
    insert into public.session_pinned_entities (workspace_id, world_id, saga_id, session_id, entity_type, entity_id, order_index)
    values ($1, $2, $3, update_session_prep.session_id, pin_type::public.entity_type, pin_id, pin_index);
    pin_index := pin_index + 1;
  end loop;

  delete from public.session_active_threads t where t.session_id = update_session_prep.session_id;
  for active_thread_id in select jsonb_array_elements_text(coalesce(update_session_prep.active_threads, '[]'::jsonb))::uuid loop
    insert into public.session_active_threads (workspace_id, world_id, saga_id, session_id, thread_id)
    values ($1, $2, $3, update_session_prep.session_id, active_thread_id);
  end loop;

  return updated_id;
end;
$$;

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

create or replace function internal.stage_session_writable(
  p_workspace_id uuid,
  p_world_id uuid,
  p_saga_id uuid,
  p_session_id uuid
)
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.sessions s
    where s.id = p_session_id
      and s.workspace_id = p_workspace_id
      and s.world_id = p_world_id
      and s.saga_id = p_saga_id
      and s.status in ('started', 'in_progress')
  );
$$;

create or replace function public.quick_capture(
  workspace_id uuid,
  world_id uuid,
  saga_id uuid,
  session_id uuid,
  body text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  inserted_id uuid;
begin
  perform public.assert_saga_access($1, $2, $3);

  if nullif(trim(body), '') is null then
    raise exception 'Capture body is required' using errcode = '23514';
  end if;
  if not internal.stage_session_writable($1, $2, $3, quick_capture.session_id) then
    raise exception 'Stage writes require a started or in-progress session' using errcode = '23514';
  end if;

  insert into public.notes (workspace_id, world_id, saga_id, scope, note_type, title, body, canon_state, created_by)
  values ($1, $2, $3, 'saga', 'quick_capture', 'Capture ' || to_char(now(), 'HH24:MI:SS'), body, 'canon', 'gm')
  returning id into inserted_id;

  insert into public.sources (workspace_id, world_id, saga_id, scope, kind, note_id, session_id, raw_excerpt)
  values ($1, $2, $3, 'saga', 'note', inserted_id, quick_capture.session_id, left(body, 1000));

  return inserted_id;
end;
$$;

create or replace function public.quick_stub(
  workspace_id uuid,
  world_id uuid,
  saga_id uuid,
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

  source_id := public.write_manual_canon_source($1, $2, $3, 'saga', entity_type, inserted_id, 'quick_stub', jsonb_build_object('name', entity_name, 'summary', summary));
  perform public.write_manual_canon_audit($1, $2, $3, 'saga', entity_type, inserted_id, null, 'canon', 'quick_stub', source_id, jsonb_build_object('name', entity_name, 'summary', summary));

  return inserted_id;
end;
$$;

create or replace function public.mark_moment(
  workspace_id uuid,
  world_id uuid,
  saga_id uuid,
  session_id uuid,
  label text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.assert_saga_access($1, $2, $3);
  if not internal.stage_session_writable($1, $2, $3, mark_moment.session_id) then
    raise exception 'Stage writes require a started or in-progress session' using errcode = '23514';
  end if;

  insert into public.session_marked_moments (workspace_id, world_id, saga_id, session_id, occurred_at, label)
  values ($1, $2, $3, mark_moment.session_id, now(), coalesce(nullif(trim(label), ''), 'Marked moment'));

  return mark_moment.session_id;
end;
$$;

create or replace function public.record_session_consent(
  workspace_id uuid,
  world_id uuid,
  saga_id uuid,
  session_id uuid,
  granted boolean
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.assert_saga_access($1, $2, $3);
  if not exists (select 1 from public.sessions s where s.id = record_session_consent.session_id and s.workspace_id = $1 and s.world_id = $2 and s.saga_id = $3) then
    raise exception 'Session is not available' using errcode = '42501';
  end if;

  insert into public.consent_log (workspace_id, world_id, saga_id, session_id, granted, prompted_at, decided_at)
  values ($1, $2, $3, record_session_consent.session_id, granted, now(), now());

  update public.sessions s
  set consent_state = case when granted then 'granted' else 'denied' end,
      updated_at = now()
  where s.id = record_session_consent.session_id;

  return record_session_consent.session_id;
end;
$$;

create or replace function public.record_dice_roll(
  workspace_id uuid,
  world_id uuid,
  saga_id uuid,
  session_id uuid,
  expression text,
  result_total integer,
  result_breakdown integer[],
  label text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.assert_saga_access($1, $2, $3);
  if not exists (select 1 from public.sessions s where s.id = record_dice_roll.session_id and s.workspace_id = $1 and s.world_id = $2 and s.saga_id = $3) then
    raise exception 'Session is not available' using errcode = '42501';
  end if;
  if nullif(trim(expression), '') is null or result_total is null or coalesce(array_length(result_breakdown, 1), 0) = 0 then
    raise exception 'Dice roll payload is invalid' using errcode = '23514';
  end if;

  insert into public.dice_rolls (workspace_id, world_id, saga_id, session_id, expression, result_total, result_breakdown, label)
  values ($1, $2, $3, record_dice_roll.session_id, expression, result_total, result_breakdown, nullif(trim(label), ''));

  return record_dice_roll.session_id;
end;
$$;

create or replace function public.get_stage_packet(workspace_id uuid, world_id uuid, saga_id uuid, session_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  packet jsonb;
begin
  perform public.assert_saga_access($1, $2, $3);

  select jsonb_build_object(
    'session', to_jsonb(s),
    'pinned_entities', coalesce((select jsonb_agg(to_jsonb(p) order by p.order_index) from public.session_pinned_entities p where p.session_id = s.id), '[]'::jsonb),
    'active_threads', coalesce((select jsonb_agg(to_jsonb(t)) from public.session_active_threads t where t.session_id = s.id), '[]'::jsonb),
    'quick_captures', coalesce((select jsonb_agg(to_jsonb(n) order by n.created_at desc) from public.notes n join public.sources src on src.note_id = n.id where src.session_id = s.id and n.note_type = 'quick_capture'), '[]'::jsonb),
    'marked_moments', coalesce((select jsonb_agg(to_jsonb(m) order by m.occurred_at desc) from public.session_marked_moments m where m.session_id = s.id), '[]'::jsonb),
    'dice_rolls', coalesce((select jsonb_agg(to_jsonb(d) order by d.created_at desc) from public.dice_rolls d where d.session_id = s.id), '[]'::jsonb),
    'consent_state', s.consent_state,
    'start_warning', jsonb_build_object('warning_shown', false, 'pending_count', 0)
  )
  into packet
  from public.sessions s
  where s.id = get_stage_packet.session_id
    and s.workspace_id = $1
    and s.world_id = $2
    and s.saga_id = $3;

  if packet is null then
    raise exception 'Session is not available' using errcode = '42501';
  end if;

  return packet;
end;
$$;

revoke execute on function public.record_session_consent(uuid, uuid, uuid, uuid, boolean) from PUBLIC, anon;
revoke execute on function public.record_dice_roll(uuid, uuid, uuid, uuid, text, integer, integer[], text) from PUBLIC, anon;
revoke execute on function public.get_stage_packet(uuid, uuid, uuid, uuid) from PUBLIC, anon;
grant execute on function public.record_session_consent(uuid, uuid, uuid, uuid, boolean) to authenticated;
grant execute on function public.record_dice_roll(uuid, uuid, uuid, uuid, text, integer, integer[], text) to authenticated;
grant execute on function public.get_stage_packet(uuid, uuid, uuid, uuid) to authenticated;

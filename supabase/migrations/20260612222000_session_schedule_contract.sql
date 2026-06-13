alter table public.sessions
  add column if not exists session_number integer,
  add column if not exists planned_date date;

with numbered as (
  select
    id,
    (row_number() over (partition by workspace_id, world_id, saga_id order by created_at, id))::integer as computed_number
  from public.sessions
  where session_number is null
)
update public.sessions s
set session_number = numbered.computed_number
from numbered
where s.id = numbered.id;

create index if not exists sessions_saga_number_idx on public.sessions(workspace_id, world_id, saga_id, session_number);
create index if not exists sessions_saga_planned_date_idx on public.sessions(workspace_id, world_id, saga_id, planned_date);

create or replace function public.create_session(
  workspace_id uuid,
  world_id uuid,
  saga_id uuid,
  session_name text,
  objective text default null,
  opening_scene text default null,
  scene_notes text default null,
  planned_date date default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  inserted_id uuid;
  next_session_number integer;
begin
  perform public.assert_saga_access($1, $2, $3);

  select coalesce(max(s.session_number), count(*)::integer, 0) + 1
  into next_session_number
  from public.sessions s
  where s.workspace_id = $1
    and s.world_id = $2
    and s.saga_id = $3;

  insert into public.sessions (
    workspace_id,
    world_id,
    saga_id,
    scope,
    name,
    session_number,
    planned_date,
    objective,
    opening_scene,
    scene_notes,
    prep_checklist
  )
  values (
    $1,
    $2,
    $3,
    'saga',
    coalesce(nullif(trim(session_name), ''), 'Session ' || next_session_number::text),
    next_session_number,
    create_session.planned_date,
    objective,
    opening_scene,
    scene_notes,
    '[]'::jsonb
  )
  returning id into inserted_id;

  return jsonb_build_object('id', inserted_id, 'session_number', next_session_number);
end;
$$;

revoke execute on function public.create_session(uuid, uuid, uuid, text, text, text, text, date) from public, anon;
grant execute on function public.create_session(uuid, uuid, uuid, text, text, text, text, date) to authenticated;

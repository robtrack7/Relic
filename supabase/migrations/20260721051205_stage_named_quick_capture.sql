drop function if exists public.quick_capture(uuid, uuid, uuid, uuid, text);

create or replace function public.quick_capture(
  workspace_id uuid,
  world_id uuid,
  saga_id uuid,
  session_id uuid,
  body text,
  title text default null
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
  values (
    $1,
    $2,
    $3,
    'saga',
    'quick_capture',
    coalesce(nullif(trim(quick_capture.title), ''), 'Capture ' || to_char(now(), 'HH24:MI:SS')),
    body,
    'canon',
    'gm'
  )
  returning id into inserted_id;

  insert into public.sources (workspace_id, world_id, saga_id, scope, kind, note_id, session_id, raw_excerpt)
  values ($1, $2, $3, 'saga', 'note', inserted_id, quick_capture.session_id, left(body, 1000));

  return inserted_id;
end;
$$;

revoke execute on function public.quick_capture(uuid, uuid, uuid, uuid, text, text) from PUBLIC, anon;
grant execute on function public.quick_capture(uuid, uuid, uuid, uuid, text, text) to authenticated;

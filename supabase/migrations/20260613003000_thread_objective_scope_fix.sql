create or replace function public.append_thread_objective(
  workspace_id uuid,
  world_id uuid,
  saga_id uuid,
  thread_id uuid,
  objective_text text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  updated_id uuid;
begin
  perform public.assert_saga_access($1, $2, $3);

  if nullif(trim(objective_text), '') is null then
    raise exception 'Objective text is required' using errcode = '23514';
  end if;

  update public.threads t
  set objectives_log = t.objectives_log || jsonb_build_array(jsonb_build_object(
        'text', trim(objective_text),
        'state', 'open',
        'created_at', now()
      )),
      updated_at = now()
  where t.id = append_thread_objective.thread_id
    and t.workspace_id = $1
    and t.world_id = $2
    and t.saga_id = $3
  returning t.id into updated_id;

  if updated_id is null then
    raise exception 'Thread is not available' using errcode = '42501';
  end if;

  return updated_id;
end;
$$;

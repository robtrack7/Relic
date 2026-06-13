create or replace function public.get_pending_drafts_for_session(
  workspace_id uuid,
  world_id uuid,
  saga_id uuid,
  session_id uuid
)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
begin
  perform public.assert_saga_access($1, $2, $3);

  if not exists (
    select 1
    from public.sessions s
    where s.id = get_pending_drafts_for_session.session_id
      and s.workspace_id = $1
      and s.world_id = $2
      and s.saga_id = $3
  ) then
    raise exception 'Session is not available' using errcode = '42501';
  end if;

  return (
    select coalesce(jsonb_agg(to_jsonb(scoped) order by scoped.created_at desc), '[]'::jsonb)
    from (
      select distinct d.*
      from public.drafts d
      join public.draft_sources ds
        on ds.draft_id = d.id
       and ds.workspace_id = d.workspace_id
       and ds.world_id = d.world_id
       and ds.saga_id = d.saga_id
      join public.sources src
        on src.id = ds.source_id
       and src.workspace_id = d.workspace_id
       and src.world_id = d.world_id
       and src.saga_id = d.saga_id
      where d.workspace_id = $1
        and d.world_id = $2
        and d.saga_id = $3
        and src.session_id = get_pending_drafts_for_session.session_id
    ) scoped
  );
end;
$$;

revoke execute on function public.get_pending_drafts_for_session(uuid, uuid, uuid, uuid) from PUBLIC, anon;
grant execute on function public.get_pending_drafts_for_session(uuid, uuid, uuid, uuid) to authenticated;

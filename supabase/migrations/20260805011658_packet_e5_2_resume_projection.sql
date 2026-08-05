-- Packet E5.2: narrow resumable-workshop bootstrap projection and explicit discard.

create or replace function public.get_bootstrap_context()
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  active_workspace public.workspaces%rowtype;
  active_world public.worlds%rowtype;
  active_saga public.sagas%rowtype;
  active_session public.sessions%rowtype;
  resumable_workshop public.workshop_sessions%rowtype;
  resumable_world_name text;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode='42501'; end if;
  select * into active_workspace from public.workspaces where owner_gm_id=auth.uid() and deleted_at is null order by created_at limit 1;
  select * into active_world from public.worlds where workspace_id=active_workspace.id and deleted_at is null order by created_at limit 1;
  select * into active_saga from public.sagas where workspace_id=active_workspace.id and world_id=active_world.id and deleted_at is null and status='active' order by updated_at desc limit 1;
  select * into active_session from public.sessions where saga_id=active_saga.id and status in ('ready','started','in_progress','ended_pending_undo') order by updated_at desc limit 1;
  select * into resumable_workshop from public.workshop_sessions where user_id=auth.uid() and state='in_progress' order by updated_at desc limit 1;
  if resumable_workshop.world_id is not null then select name into resumable_world_name from public.worlds where id=resumable_workshop.world_id and workspace_id=resumable_workshop.workspace_id; end if;
  return jsonb_build_object(
    'gm_profile',(select to_jsonb(g) from public.gm_profiles g where g.user_id=auth.uid()),
    'workspace',to_jsonb(active_workspace),'world',to_jsonb(active_world),'saga',to_jsonb(active_saga),'session',to_jsonb(active_session),
    'resumable_workshop_session',case when resumable_workshop.id is null then null else jsonb_build_object(
      'id',resumable_workshop.id,'workspace_id',resumable_workshop.workspace_id,'path',resumable_workshop.path,
      'phase',resumable_workshop.workshop_phase,'saga_name',resumable_workshop.creation_input->>'saga_name',
      'world_name',coalesce(resumable_world_name,resumable_workshop.creation_input->>'world_name'),
      'updated_at',resumable_workshop.updated_at
    ) end,
    'needs_new_saga',active_saga.id is null and resumable_workshop.id is null
  );
end;
$$;

create or replace function public.abandon_saga_workshop(p_workshop_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare w public.workshop_sessions%rowtype;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode='42501'; end if;
  select * into w from public.workshop_sessions where id=p_workshop_id and user_id=auth.uid() for update;
  if not found or not public.user_is_workspace_member(w.workspace_id) then raise exception 'Workshop is unavailable' using errcode='42501'; end if;
  if w.state='committed' then raise exception 'Committed workshops cannot be discarded' using errcode='23514'; end if;
  if w.state='abandoned' then return jsonb_build_object('workshop_id',w.id,'state','abandoned','replayed',true); end if;
  update internal.ai_task_runs set status='terminal',failure_category='job_cancelled',failure_reason='workshop_abandoned',
    locked_by=null,locked_at=null,completed_at=now(),updated_at=now()
  where workshop_session_id=w.id and status in ('pending','retryable');
  if exists(select 1 from internal.ai_task_runs where workshop_session_id=w.id and status='running') then
    raise exception 'The current AI task is already running; wait for it to finish before discarding' using errcode='55006';
  end if;
  update internal.workshop_regeneration_requests q set status='failed',failure_category='job_cancelled',updated_at=now()
  where q.workshop_session_id=w.id and q.status='queued'
    and exists(select 1 from internal.ai_task_runs r where r.id=q.ai_task_run_id and r.status='terminal' and r.failure_category='job_cancelled');
  update public.workshop_sessions set state='abandoned',updated_at=now() where id=w.id;
  return jsonb_build_object('workshop_id',w.id,'state','abandoned','replayed',false);
end;
$$;

revoke all on function public.get_bootstrap_context() from public,anon;
revoke all on function public.abandon_saga_workshop(uuid) from public,anon;
grant execute on function public.get_bootstrap_context() to authenticated;
grant execute on function public.abandon_saga_workshop(uuid) to authenticated;

-- Phase G0 hosted hardening.
-- Keep the documented browser RPC surface exact, remove a fail-closed legacy
-- overload that no client should call, optimize direct auth checks in the four
-- advisor-reported RLS policies, and index the session/Saga joins exercised by
-- the integrated release journey and Saga cleanup.

revoke all on function public.update_notification_preferences(jsonb)
  from public, anon, authenticated;

drop policy if exists gm_profiles_owner_all on public.gm_profiles;
create policy gm_profiles_owner_all
on public.gm_profiles
for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists workspaces_owner_all on public.workspaces;
create policy workspaces_owner_all
on public.workspaces
for all to authenticated
using (owner_gm_id = (select auth.uid()) and deleted_at is null)
with check (owner_gm_id = (select auth.uid()));

drop policy if exists push_devices_owner_all on public.push_devices;
create policy push_devices_owner_all
on public.push_devices
for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists workshop_sessions_owner_all on public.workshop_sessions;
create policy workshop_sessions_owner_all
on public.workshop_sessions
for all to authenticated
using (
  user_id = (select auth.uid())
  and (workspace_id is null or public.user_is_workspace_member(workspace_id))
  and (world_id is null or public.world_belongs_to_workspace(world_id, workspace_id))
  and (saga_id is null or public.saga_belongs_to_world(saga_id, world_id))
)
with check (
  user_id = (select auth.uid())
  and (workspace_id is null or public.user_is_workspace_member(workspace_id))
  and (world_id is null or public.world_belongs_to_workspace(world_id, workspace_id))
  and (saga_id is null or public.saga_belongs_to_world(saga_id, world_id))
);

-- The integrated loop repeatedly joins Session evidence and later deletes a
-- complete Saga. These indexes cover those measured product access paths. The
-- remaining advisor-only FK candidates stay for the G5 query-plan audit.
create index if not exists sources_session_fk_idx
  on public.sources(session_id);
create index if not exists sources_saga_fk_idx
  on public.sources(saga_id);
create index if not exists drafts_session_fk_idx
  on public.drafts(session_id);
create index if not exists drafts_saga_fk_idx
  on public.drafts(saga_id);
create index if not exists pipeline_runs_session_fk_idx
  on public.pipeline_runs(session_id);
create index if not exists pipeline_runs_saga_fk_idx
  on public.pipeline_runs(saga_id);
create index if not exists transcripts_saga_fk_idx
  on public.transcripts(saga_id);
create index if not exists audio_chunks_saga_fk_idx
  on public.audio_chunks(saga_id);
create index if not exists workshop_sessions_ai_run_fk_idx
  on public.workshop_sessions(ai_task_run_id);
create index if not exists workshop_sessions_saga_fk_idx
  on public.workshop_sessions(saga_id);
create index if not exists prep_ai_requests_session_fk_idx
  on internal.prep_ai_requests(session_id);
create index if not exists prep_ai_requests_saga_fk_idx
  on internal.prep_ai_requests(saga_id);

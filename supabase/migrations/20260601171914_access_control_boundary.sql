-- Module 1 boundary: remove broad function/table grants that earlier bootstrap
-- migrations used, then re-grant only the browser RPC and RLS-helper surface.
revoke execute on all functions in schema public from PUBLIC, anon, authenticated;
alter default privileges in schema public revoke execute on functions from PUBLIC;

revoke insert, update, delete on all tables in schema public from PUBLIC, anon, authenticated;

revoke all on storage.objects from PUBLIC, anon;
grant select on storage.objects to anon;
grant select, insert, update, delete on storage.objects to authenticated;

grant execute on function public.active_saga_matches(uuid) to authenticated;
grant execute on function public.user_owns_workspace(uuid) to authenticated;
grant execute on function public.user_is_workspace_member(uuid) to authenticated;
grant execute on function public.world_belongs_to_workspace(uuid, uuid) to authenticated;
grant execute on function public.saga_belongs_to_world(uuid, uuid) to authenticated;
grant execute on function public.scoped_row_allowed(uuid, uuid, uuid, public.content_scope) to authenticated;
grant execute on function public.saga_row_allowed(uuid, uuid, uuid) to authenticated;
grant execute on function public.storage_path_allowed(text) to authenticated;
grant execute on function public.storage_path_segment(text, integer) to authenticated;

grant execute on function public.ensure_default_workspace() to authenticated;
grant execute on function public.get_bootstrap_context() to authenticated;
grant execute on function public.get_saga_context(uuid, uuid, uuid) to authenticated;
grant execute on function public.create_blank_saga(text, text, text, text, text, text, uuid, text) to authenticated;
grant execute on function public.list_worlds_for_workspace() to authenticated;
grant execute on function public.create_entity(uuid, uuid, uuid, text, public.content_scope, jsonb) to authenticated;
grant execute on function public.update_entity(uuid, uuid, uuid, text, uuid, jsonb) to authenticated;
grant execute on function public.archive_entity(uuid, uuid, uuid, text, uuid) to authenticated;
grant execute on function public.append_thread_objective(uuid, uuid, uuid, uuid, text) to authenticated;
grant execute on function public.create_session(uuid, uuid, uuid, text, text, text, text) to authenticated;
grant execute on function public.update_session_prep(uuid, uuid, uuid, uuid, text, text, text, text, jsonb, jsonb, jsonb) to authenticated;
grant execute on function public.set_session_status(uuid, uuid, uuid, uuid, public.session_status) to authenticated;
grant execute on function public.quick_capture(uuid, uuid, uuid, uuid, text) to authenticated;
grant execute on function public.quick_stub(uuid, uuid, uuid, text, text, text) to authenticated;
grant execute on function public.mark_moment(uuid, uuid, uuid, uuid, text) to authenticated;
grant execute on function public.update_draft_state(uuid, uuid, uuid, uuid, public.draft_state, text) to authenticated;
grant execute on function public.list_entities(uuid, uuid, uuid, text, boolean) to authenticated;
grant execute on function public.get_sessions_for_saga(uuid, uuid, uuid) to authenticated;
grant execute on function public.get_session_pinned_entities(uuid, uuid, uuid, uuid) to authenticated;
grant execute on function public.get_session_active_threads(uuid, uuid, uuid, uuid) to authenticated;
grant execute on function public.get_pending_drafts(uuid, uuid, uuid) to authenticated;
grant execute on function public.get_workspace_usage_summary(uuid) to authenticated;
grant execute on function public.check_quota_preflight(uuid, uuid, uuid, text, numeric, jsonb) to authenticated;
grant execute on function public.search_for_ui(uuid, uuid, uuid, text, text, integer, boolean, boolean, boolean) to authenticated;
grant execute on function public.retrieve_for_task(uuid, uuid, uuid, uuid, text, text, jsonb, integer) to authenticated;

-- Phase F closeout: pin foundational invoker helpers to their fully-qualified bodies.

alter function public.saga_belongs_to_world(uuid,uuid) set search_path='';
alter function public.saga_row_allowed(uuid,uuid,uuid) set search_path='';
alter function public.scoped_row_allowed(uuid,uuid,uuid,public.content_scope) set search_path='';
alter function public.storage_path_segment(text,integer) set search_path='';
alter function public.user_is_workspace_member(uuid) set search_path='';
alter function public.user_owns_saga(uuid) set search_path='';
alter function public.user_owns_workspace(uuid) set search_path='';
alter function public.user_owns_world(uuid) set search_path='';
alter function public.uuid7() set search_path='';
alter function public.world_belongs_to_workspace(uuid,uuid) set search_path='';

-- Phase F1: deterministic, scoped settings and retention/quota recovery.

create table if not exists internal.settings_action_receipts (
  id uuid primary key default public.uuid7(),
  gm_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null,
  world_id uuid,
  saga_id uuid,
  action_kind text not null check (action_kind in ('gm_profile', 'saga_operational', 'saga_retention', 'notification_preferences')),
  idempotency_key text not null,
  request_hash text not null check (request_hash ~ '^[0-9a-f]{64}$'),
  previous_state jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (gm_id, idempotency_key)
);

create index if not exists settings_action_receipts_scope_idx
  on internal.settings_action_receipts(workspace_id, world_id, saga_id, created_at desc);

create or replace function internal.settings_request_hash(p_payload jsonb)
returns text
language sql
immutable
set search_path = extensions, pg_catalog, pg_temp
as $$
  select encode(extensions.digest(convert_to(coalesce(p_payload, '{}'::jsonb)::text, 'UTF8'), 'sha256'), 'hex');
$$;

create or replace function internal.validate_notification_preferences(p_preferences jsonb)
returns jsonb
language plpgsql
immutable
set search_path = pg_catalog, pg_temp
as $$
declare
  top_key text;
  channel_key text;
  setting_key text;
  setting_value jsonb;
begin
  if jsonb_typeof(p_preferences) <> 'object' then
    raise exception 'Notification preferences must be an object' using errcode = '22023';
  end if;

  for top_key in select jsonb_object_keys(p_preferences) loop
    if top_key not in ('paused', 'email', 'push') then
      raise exception 'Notification preferences contain an unsupported field' using errcode = '22023';
    end if;
  end loop;

  if p_preferences ? 'paused' and jsonb_typeof(p_preferences -> 'paused') <> 'boolean' then
    raise exception 'Notification pause state must be boolean' using errcode = '22023';
  end if;

  foreach channel_key in array array['email', 'push'] loop
    if p_preferences ? channel_key then
      if jsonb_typeof(p_preferences -> channel_key) <> 'object' then
        raise exception 'Notification channel preferences must be objects' using errcode = '22023';
      end if;
      for setting_key, setting_value in select key, value from jsonb_each(p_preferences -> channel_key) loop
        if (channel_key = 'email' and setting_key not in ('pipeline_ready', 'pipeline_failed', 'pipeline_stale_30d', 'pipeline_stale_90d'))
          or (channel_key = 'push' and setting_key not in ('pipeline_ready', 'pipeline_failed', 'transcription_complete', 'synthesis_in_progress')) then
          raise exception 'Notification channel contains an unsupported event' using errcode = '22023';
        end if;
        if jsonb_typeof(setting_value) <> 'boolean' then
          raise exception 'Notification event preferences must be boolean' using errcode = '22023';
        end if;
      end loop;
    end if;
  end loop;

  return p_preferences;
end;
$$;

create or replace function internal.merge_notification_preferences(p_current jsonb, p_patch jsonb)
returns jsonb
language plpgsql
stable
set search_path = internal, pg_catalog, pg_temp
as $$
declare
  validated jsonb := internal.validate_notification_preferences(p_patch);
begin
  return jsonb_build_object(
    'paused', coalesce((validated ->> 'paused')::boolean, (p_current ->> 'paused')::boolean, false),
    'email', coalesce(p_current -> 'email', '{}'::jsonb) || coalesce(validated -> 'email', '{}'::jsonb),
    'push', coalesce(p_current -> 'push', '{}'::jsonb) || coalesce(validated -> 'push', '{}'::jsonb)
  );
end;
$$;

create or replace function public.get_settings_control_plane(
  p_workspace_id uuid,
  p_world_id uuid,
  p_saga_id uuid
)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, internal, pg_temp
as $$
declare
  v_saga public.sagas%rowtype;
  v_profile public.gm_profiles%rowtype;
begin
  perform public.assert_saga_access(p_workspace_id, p_world_id, p_saga_id);
  select * into v_saga from public.sagas s where s.id = p_saga_id;
  select * into v_profile from public.gm_profiles gp where gp.user_id = auth.uid();

  return jsonb_build_object(
    'workspace_id', p_workspace_id,
    'world_id', p_world_id,
    'saga_id', p_saga_id,
    'saga', jsonb_build_object(
      'game_system', v_saga.game_system,
      'gm_profile_override', v_saga.gm_profile_override,
      'audio_retention', v_saga.audio_retention,
      'transcript_retention', v_saga.transcript_retention,
      'updated_at', v_saga.updated_at
    ),
    'gm_profile', jsonb_build_object(
      'experience_level', v_profile.experience_level,
      'improv_comfort', v_profile.improv_comfort,
      'prep_style', v_profile.prep_style,
      'default_game_system', v_profile.default_game_system,
      'notification_preferences', v_profile.notification_preferences,
      'updated_at', v_profile.updated_at
    ),
    'usage', public.get_workspace_usage_summary(p_workspace_id),
    'recovery', jsonb_build_object(
      'failed_transcriptions', (select count(*) from internal.transcription_jobs tj where tj.saga_id = p_saga_id and tj.state = 'failed'),
      'retained_audio_chunks', (select count(*) from public.audio_chunks ac where ac.saga_id = p_saga_id and ac.deleted_at is null),
      'failed_exports', (select count(*) from internal.export_jobs ej where ej.saga_id = p_saga_id and ej.state = 'failed')
    ),
    'recent_changes', coalesce((
      select jsonb_agg(jsonb_build_object('action', r.action_kind, 'changed_at', r.created_at) order by r.created_at desc)
      from (select action_kind, created_at from internal.settings_action_receipts where gm_id = auth.uid() and workspace_id = p_workspace_id and (saga_id is null or saga_id = p_saga_id) order by created_at desc limit 8) r
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.update_gm_profile_settings(
  p_workspace_id uuid,
  p_profile jsonb,
  p_default_game_system text,
  p_expected_updated_at timestamptz,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, internal, extensions, pg_temp
as $$
declare
  v_profile jsonb := internal.validate_gm_creation_profile(p_profile);
  v_key text := nullif(btrim(coalesce(p_idempotency_key, '')), '');
  v_hash text;
  v_prior internal.settings_action_receipts%rowtype;
  v_current public.gm_profiles%rowtype;
  v_result jsonb;
begin
  if not public.user_can_access_workspace(p_workspace_id) then raise exception 'Workspace access denied' using errcode = '42501'; end if;
  if v_key is null or char_length(v_key) > 160 then raise exception 'A valid idempotency key is required' using errcode = '22023'; end if;
  if p_default_game_system is not null and char_length(btrim(p_default_game_system)) > 120 then raise exception 'Default game system is too long' using errcode = '22023'; end if;
  v_hash := internal.settings_request_hash(jsonb_build_object('action','gm_profile','workspace_id',p_workspace_id,'profile',v_profile,'default_game_system',nullif(btrim(coalesce(p_default_game_system,'')),''),'expected_updated_at',p_expected_updated_at));
  select * into v_prior from internal.settings_action_receipts where gm_id = auth.uid() and idempotency_key = v_key;
  if found then
    if v_prior.request_hash <> v_hash then raise exception 'Settings idempotency key was reused with different input' using errcode = '23505'; end if;
    return v_prior.result || jsonb_build_object('replayed', true);
  end if;
  select * into v_current from public.gm_profiles where user_id = auth.uid() for update;
  if not found then raise exception 'GM profile is not available' using errcode = 'P0002'; end if;
  if p_expected_updated_at is not null and v_current.updated_at <> p_expected_updated_at then raise exception 'GM profile changed; refresh before saving' using errcode = '40001'; end if;
  update public.gm_profiles set
    experience_level = v_profile ->> 'experience_level',
    improv_comfort = v_profile ->> 'improv_comfort',
    prep_style = v_profile ->> 'prep_style',
    default_game_system = nullif(btrim(coalesce(p_default_game_system,'')),''),
    updated_at = now()
  where user_id = auth.uid()
  returning jsonb_build_object('experience_level',experience_level,'improv_comfort',improv_comfort,'prep_style',prep_style,'default_game_system',default_game_system,'updated_at',updated_at,'replayed',false) into v_result;
  insert into internal.settings_action_receipts(gm_id,workspace_id,action_kind,idempotency_key,request_hash,previous_state,result)
  values(auth.uid(),p_workspace_id,'gm_profile',v_key,v_hash,to_jsonb(v_current) - array['id','user_id','notification_preferences'],v_result);
  return v_result;
end;
$$;

create or replace function public.update_saga_operational_settings(
  p_workspace_id uuid,
  p_world_id uuid,
  p_saga_id uuid,
  p_game_system text,
  p_profile_override jsonb,
  p_expected_updated_at timestamptz,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, internal, extensions, pg_temp
as $$
declare
  v_override jsonb := case when p_profile_override is null or p_profile_override = 'null'::jsonb then null else internal.validate_gm_creation_profile(p_profile_override) end;
  v_key text := nullif(btrim(coalesce(p_idempotency_key,'')),'');
  v_hash text;
  v_prior internal.settings_action_receipts%rowtype;
  v_current public.sagas%rowtype;
  v_result jsonb;
begin
  perform public.assert_saga_access(p_workspace_id,p_world_id,p_saga_id);
  if v_key is null or char_length(v_key)>160 then raise exception 'A valid idempotency key is required' using errcode='22023'; end if;
  if p_game_system is not null and char_length(btrim(p_game_system))>120 then raise exception 'Game system is too long' using errcode='22023'; end if;
  v_hash:=internal.settings_request_hash(jsonb_build_object('action','saga_operational','workspace_id',p_workspace_id,'world_id',p_world_id,'saga_id',p_saga_id,'game_system',nullif(btrim(coalesce(p_game_system,'')),''),'profile_override',v_override,'expected_updated_at',p_expected_updated_at));
  select * into v_prior from internal.settings_action_receipts where gm_id=auth.uid() and idempotency_key=v_key;
  if found then if v_prior.request_hash<>v_hash then raise exception 'Settings idempotency key was reused with different input' using errcode='23505'; end if; return v_prior.result || jsonb_build_object('replayed',true); end if;
  select * into v_current from public.sagas s where s.id=p_saga_id for update;
  if p_expected_updated_at is not null and v_current.updated_at<>p_expected_updated_at then raise exception 'Saga settings changed; refresh before saving' using errcode='40001'; end if;
  update public.sagas set game_system=nullif(btrim(coalesce(p_game_system,'')),''),gm_profile_override=v_override,updated_at=now() where id=p_saga_id
  returning jsonb_build_object('game_system',game_system,'gm_profile_override',gm_profile_override,'updated_at',updated_at,'replayed',false) into v_result;
  insert into internal.settings_action_receipts(gm_id,workspace_id,world_id,saga_id,action_kind,idempotency_key,request_hash,previous_state,result)
  values(auth.uid(),p_workspace_id,p_world_id,p_saga_id,'saga_operational',v_key,v_hash,jsonb_build_object('game_system',v_current.game_system,'gm_profile_override',v_current.gm_profile_override,'updated_at',v_current.updated_at),v_result);
  return v_result;
end;
$$;

create or replace function public.update_saga_retention_settings(
  p_workspace_id uuid,
  p_world_id uuid,
  p_saga_id uuid,
  p_audio_retention text,
  p_transcript_retention text,
  p_confirm_destructive boolean,
  p_expected_updated_at timestamptz,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, internal, extensions, pg_temp
as $$
declare
  v_key text:=nullif(btrim(coalesce(p_idempotency_key,'')),'');
  v_hash text; v_prior internal.settings_action_receipts%rowtype; v_current public.sagas%rowtype; v_result jsonb;
begin
  perform public.assert_saga_access(p_workspace_id,p_world_id,p_saga_id);
  if p_audio_retention not in ('delete_after_transcription','retain') or p_transcript_retention not in ('retain','delete_after_synthesis') then raise exception 'Retention setting is invalid' using errcode='22023'; end if;
  if v_key is null or char_length(v_key)>160 then raise exception 'A valid idempotency key is required' using errcode='22023'; end if;
  v_hash:=internal.settings_request_hash(jsonb_build_object('action','saga_retention','workspace_id',p_workspace_id,'world_id',p_world_id,'saga_id',p_saga_id,'audio_retention',p_audio_retention,'transcript_retention',p_transcript_retention,'confirm_destructive',p_confirm_destructive,'expected_updated_at',p_expected_updated_at));
  select * into v_prior from internal.settings_action_receipts where gm_id=auth.uid() and idempotency_key=v_key;
  if found then if v_prior.request_hash<>v_hash then raise exception 'Settings idempotency key was reused with different input' using errcode='23505'; end if; return v_prior.result || jsonb_build_object('replayed',true); end if;
  select * into v_current from public.sagas s where s.id=p_saga_id for update;
  if p_expected_updated_at is not null and v_current.updated_at<>p_expected_updated_at then raise exception 'Saga settings changed; refresh before saving' using errcode='40001'; end if;
  if ((v_current.audio_retention='retain' and p_audio_retention='delete_after_transcription') or (v_current.transcript_retention='retain' and p_transcript_retention='delete_after_synthesis')) and not coalesce(p_confirm_destructive,false) then raise exception 'Retention cleanup must be explicitly confirmed' using errcode='22023'; end if;
  update public.sagas set audio_retention=p_audio_retention,transcript_retention=p_transcript_retention,updated_at=now() where id=p_saga_id
  returning jsonb_build_object('audio_retention',audio_retention,'transcript_retention',transcript_retention,'updated_at',updated_at,'future_cleanup_only',true,'replayed',false) into v_result;
  insert into internal.settings_action_receipts(gm_id,workspace_id,world_id,saga_id,action_kind,idempotency_key,request_hash,previous_state,result)
  values(auth.uid(),p_workspace_id,p_world_id,p_saga_id,'saga_retention',v_key,v_hash,jsonb_build_object('audio_retention',v_current.audio_retention,'transcript_retention',v_current.transcript_retention,'updated_at',v_current.updated_at),v_result);
  return v_result;
end;
$$;

create or replace function public.update_notification_preferences(p_preferences jsonb, p_workspace_id uuid, p_idempotency_key text)
returns jsonb
language plpgsql
security definer
set search_path = public, internal, extensions, pg_temp
as $$
declare
  v_key text:=nullif(btrim(coalesce(p_idempotency_key,'')),''); v_hash text; v_prior internal.settings_action_receipts%rowtype;
  v_current public.gm_profiles%rowtype; v_next jsonb; v_result jsonb;
begin
  if not public.user_can_access_workspace(p_workspace_id) then raise exception 'Workspace access denied' using errcode='42501'; end if;
  if v_key is null or char_length(v_key)>160 then raise exception 'A valid idempotency key is required' using errcode='22023'; end if;
  select * into v_current from public.gm_profiles where user_id=auth.uid() for update;
  v_next:=internal.merge_notification_preferences(v_current.notification_preferences,p_preferences);
  v_hash:=internal.settings_request_hash(jsonb_build_object('action','notification_preferences','workspace_id',p_workspace_id,'preferences',p_preferences));
  select * into v_prior from internal.settings_action_receipts where gm_id=auth.uid() and idempotency_key=v_key;
  if found then if v_prior.request_hash<>v_hash then raise exception 'Settings idempotency key was reused with different input' using errcode='23505'; end if; return v_prior.result || jsonb_build_object('replayed',true); end if;
  update public.gm_profiles set notification_preferences=v_next,updated_at=now() where user_id=auth.uid()
  returning jsonb_build_object('notification_preferences',notification_preferences,'updated_at',updated_at,'replayed',false) into v_result;
  insert into internal.settings_action_receipts(gm_id,workspace_id,action_kind,idempotency_key,request_hash,previous_state,result)
  values(auth.uid(),p_workspace_id,'notification_preferences',v_key,v_hash,jsonb_build_object('notification_preferences',v_current.notification_preferences,'updated_at',v_current.updated_at),v_result);
  return v_result;
end;
$$;

-- Keep the legacy one-argument function fail-closed instead of accepting arbitrary JSON.
create or replace function public.update_notification_preferences(p_preferences jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, internal, pg_temp
as $$
begin
  perform internal.validate_notification_preferences(p_preferences);
  raise exception 'Use the scoped notification settings contract' using errcode='0A000';
end;
$$;

create or replace function internal.apply_transcript_retention_after_synthesis()
returns trigger
language plpgsql
security definer
set search_path = public, internal, pg_temp
as $$
begin
  if old.state is distinct from new.state and new.state='closed' and exists(select 1 from public.sagas s where s.id=new.saga_id and s.transcript_retention='delete_after_synthesis') then
    update public.transcripts t set segments='[]'::jsonb,original_segments=null,deleted_at=coalesce(t.deleted_at,now()),updated_at=now()
    where t.session_id=new.session_id and t.deleted_at is null;
    update public.sessions s set transcript_deleted_at=coalesce(s.transcript_deleted_at,now()),updated_at=now() where s.id=new.session_id;
  end if;
  return new;
end;
$$;

drop trigger if exists apply_transcript_retention_after_synthesis on public.pipeline_runs;
create trigger apply_transcript_retention_after_synthesis
after update of state on public.pipeline_runs
for each row execute function internal.apply_transcript_retention_after_synthesis();

revoke all on function public.get_settings_control_plane(uuid,uuid,uuid) from public,anon;
revoke all on function public.update_gm_profile_settings(uuid,jsonb,text,timestamptz,text) from public,anon;
revoke all on function public.update_saga_operational_settings(uuid,uuid,uuid,text,jsonb,timestamptz,text) from public,anon;
revoke all on function public.update_saga_retention_settings(uuid,uuid,uuid,text,text,boolean,timestamptz,text) from public,anon;
revoke all on function public.update_notification_preferences(jsonb,uuid,text) from public,anon;
grant execute on function public.get_settings_control_plane(uuid,uuid,uuid) to authenticated;
grant execute on function public.update_gm_profile_settings(uuid,jsonb,text,timestamptz,text) to authenticated;
grant execute on function public.update_saga_operational_settings(uuid,uuid,uuid,text,jsonb,timestamptz,text) to authenticated;
grant execute on function public.update_saga_retention_settings(uuid,uuid,uuid,text,text,boolean,timestamptz,text) to authenticated;
grant execute on function public.update_notification_preferences(jsonb,uuid,text) to authenticated;

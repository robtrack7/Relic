create or replace function public.user_owns_workspace(target_workspace_id uuid)
returns boolean
language sql
security invoker
stable
as $$
  select exists (
    select 1
    from public.workspaces
    where id = target_workspace_id
      and owner_gm_id = auth.uid()
      and deleted_at is null
  );
$$;

create or replace function public.user_is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
security invoker
stable
as $$
  select public.user_owns_workspace(target_workspace_id);
$$;

create or replace function public.world_belongs_to_workspace(target_world_id uuid, target_workspace_id uuid)
returns boolean
language sql
security invoker
stable
as $$
  select exists (
    select 1
    from public.worlds
    where id = target_world_id
      and workspace_id = target_workspace_id
      and deleted_at is null
  );
$$;

create or replace function public.saga_belongs_to_world(target_saga_id uuid, target_world_id uuid)
returns boolean
language sql
security invoker
stable
as $$
  select exists (
    select 1
    from public.sagas
    where id = target_saga_id
      and world_id = target_world_id
      and deleted_at is null
  );
$$;

create or replace function public.user_owns_world(target_world_id uuid)
returns boolean
language sql
security invoker
stable
as $$
  select exists (
    select 1
    from public.worlds w
    where w.id = target_world_id
      and public.user_is_workspace_member(w.workspace_id)
      and w.deleted_at is null
  );
$$;

create or replace function public.user_owns_saga(target_saga_id uuid)
returns boolean
language sql
security invoker
stable
as $$
  select exists (
    select 1
    from public.sagas s
    where s.id = target_saga_id
      and public.user_is_workspace_member(s.workspace_id)
      and public.world_belongs_to_workspace(s.world_id, s.workspace_id)
      and s.deleted_at is null
  );
$$;

create or replace function public.active_saga_matches(target_saga_id uuid)
returns boolean
language sql
security invoker
stable
as $$
  select coalesce(nullif(current_setting('request.jwt.claim.saga_id', true), '')::uuid = target_saga_id, true);
$$;

create or replace function public.scoped_row_allowed(
  target_workspace_id uuid,
  target_world_id uuid,
  target_saga_id uuid,
  target_scope public.content_scope
)
returns boolean
language sql
security invoker
stable
as $$
  select public.user_is_workspace_member(target_workspace_id)
    and public.world_belongs_to_workspace(target_world_id, target_workspace_id)
    and (
      (target_scope = 'world' and target_saga_id is null)
      or (
        target_scope = 'saga'
        and target_saga_id is not null
        and public.saga_belongs_to_world(target_saga_id, target_world_id)
        and public.active_saga_matches(target_saga_id)
      )
    );
$$;

create or replace function public.saga_row_allowed(
  target_workspace_id uuid,
  target_world_id uuid,
  target_saga_id uuid
)
returns boolean
language sql
security invoker
stable
as $$
  select public.user_is_workspace_member(target_workspace_id)
    and public.world_belongs_to_workspace(target_world_id, target_workspace_id)
    and public.saga_belongs_to_world(target_saga_id, target_world_id)
    and public.active_saga_matches(target_saga_id);
$$;

create or replace function public.storage_path_allowed(path text)
returns boolean
language plpgsql
security invoker
stable
as $$
declare
  path_workspace_id uuid;
  path_world_id uuid;
  path_saga_id uuid;
begin
  path_workspace_id := public.storage_path_segment(path, 1)::uuid;
  path_world_id := public.storage_path_segment(path, 2)::uuid;
  path_saga_id := public.storage_path_segment(path, 3)::uuid;

  return public.saga_row_allowed(path_workspace_id, path_world_id, path_saga_id);
exception when invalid_text_representation or null_value_not_allowed then
  return false;
end;
$$;

create or replace function public.ensure_default_workspace()
returns uuid
language plpgsql
security invoker
as $$
declare
  existing_id uuid;
  inserted_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select id into existing_id
  from public.workspaces
  where owner_gm_id = auth.uid()
    and deleted_at is null
  order by created_at
  limit 1;

  if existing_id is not null then
    return existing_id;
  end if;

  insert into public.workspaces (owner_gm_id, name)
  values (auth.uid(), 'My Workspace')
  returning id into inserted_id;

  return inserted_id;
end;
$$;

create or replace function public.get_bootstrap_context()
returns jsonb
language plpgsql
security invoker
stable
as $$
declare
  active_workspace public.workspaces%rowtype;
  active_world public.worlds%rowtype;
  active_saga public.sagas%rowtype;
  active_session public.sessions%rowtype;
  resumable_workshop public.workshop_sessions%rowtype;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select * into active_workspace
  from public.workspaces
  where owner_gm_id = auth.uid()
    and deleted_at is null
  order by created_at
  limit 1;

  select * into active_world
  from public.worlds
  where workspace_id = active_workspace.id
    and deleted_at is null
  order by created_at
  limit 1;

  select * into active_saga
  from public.sagas
  where workspace_id = active_workspace.id
    and world_id = active_world.id
    and deleted_at is null
    and status = 'active'
  order by updated_at desc
  limit 1;

  select * into active_session
  from public.sessions
  where saga_id = active_saga.id
    and status in ('ready', 'started', 'in_progress', 'ended_pending_undo')
  order by updated_at desc
  limit 1;

  select * into resumable_workshop
  from public.workshop_sessions
  where user_id = auth.uid()
    and state = 'in_progress'
  order by updated_at desc
  limit 1;

  return jsonb_build_object(
    'gm_profile', (select to_jsonb(g) from public.gm_profiles g where g.user_id = auth.uid()),
    'workspace', to_jsonb(active_workspace),
    'world', to_jsonb(active_world),
    'saga', to_jsonb(active_saga),
    'session', to_jsonb(active_session),
    'resumable_workshop_session', to_jsonb(resumable_workshop),
    'needs_new_saga', active_saga.id is null and resumable_workshop.id is null
  );
end;
$$;

create or replace function public.check_quota_preflight(
  workspace_id uuid,
  world_id uuid default null,
  saga_id uuid default null,
  action_kind text default 'manual_view',
  requested_units numeric default 1,
  metadata jsonb default '{}'::jsonb
)
returns table (
  allowed boolean,
  severity text,
  limit_key text,
  used numeric,
  "limit" numeric,
  reset_at timestamptz,
  message text
)
language plpgsql
security invoker
stable
as $$
declare
  limits jsonb;
  rollup public.usage_monthly_rollups%rowtype;
  v_period_start date := date_trunc('month', now())::date;
  manual_actions text[] := array['manual_view', 'manual_edit', 'approval', 'approve', 'reject', 'edit_and_approve'];
  effective_limit numeric;
  effective_used numeric := 0;
  key_name text;
begin
  if $4 = any(manual_actions) then
    return query select true, 'ok', $4, 0::numeric, null::numeric, null::timestamptz, 'Manual work is not quota blocked.';
    return;
  end if;

  if not public.user_is_workspace_member($1) then
    return query select false, 'blocked', $4, 0::numeric, 0::numeric, null::timestamptz, 'Workspace is not available.';
    return;
  end if;

  select w.usage_limits into limits from public.workspaces w where w.id = $1;
  select * into rollup
  from public.usage_monthly_rollups umr
  where umr.workspace_id = $1
    and umr.period_start = v_period_start;

  key_name := case
    when $4 in ('ai_call', 'ai', 'pipeline_synthesis') then 'ai_credits_monthly'
    when $4 in ('transcription', 'transcription_job') then 'transcription_seconds_monthly'
    when $4 in ('storage', 'storage_upload') then 'storage_bytes'
    when $4 = 'import' then 'imports_monthly'
    when $4 = 'export' then 'exports_monthly'
    else $4
  end;

  effective_limit := coalesce((limits ->> key_name)::numeric, 0);
  effective_limit := coalesce((
    select qo.override_value
    from public.quota_overrides qo
    where qo.workspace_id = $1
      and qo.limit_key = key_name
      and (qo.expires_at is null or qo.expires_at > now())
    order by qo.created_at desc
    limit 1
  ), effective_limit);

  effective_used := case key_name
    when 'ai_credits_monthly' then coalesce(rollup.ai_credits_used, 0)
    when 'transcription_seconds_monthly' then coalesce(rollup.transcription_seconds_used, 0)
    when 'storage_bytes' then coalesce(rollup.storage_bytes_current, 0)
    when 'imports_monthly' then coalesce(rollup.imports_used, 0)
    when 'exports_monthly' then coalesce(rollup.exports_used, 0)
    else 0
  end;

  if effective_limit <= 0 then
    return query select false, 'blocked', key_name, effective_used, effective_limit, (v_period_start + interval '1 month')::timestamptz, 'No quota is configured for this action.';
  elsif effective_used + $5 > effective_limit then
    return query select false, 'blocked', key_name, effective_used, effective_limit, (v_period_start + interval '1 month')::timestamptz, 'This quota is exhausted. Manual viewing, editing, and approval remain available.';
  elsif effective_used + $5 >= effective_limit * 0.9 then
    return query select true, 'warn_90', key_name, effective_used, effective_limit, (v_period_start + interval '1 month')::timestamptz, 'Quota is above 90%.';
  elsif effective_used + $5 >= effective_limit * 0.7 then
    return query select true, 'warn_70', key_name, effective_used, effective_limit, (v_period_start + interval '1 month')::timestamptz, 'Quota is above 70%.';
  else
    return query select true, 'ok', key_name, effective_used, effective_limit, (v_period_start + interval '1 month')::timestamptz, 'Quota is available.';
  end if;
end;
$$;

create or replace function public.get_workspace_usage_summary(workspace_id uuid)
returns jsonb
language sql
security invoker
stable
as $$
  select jsonb_build_object(
    'workspace_id', w.id,
    'usage_limits', w.usage_limits,
    'current_rollup', to_jsonb(umr)
  )
  from public.workspaces w
  left join public.usage_monthly_rollups umr
    on umr.workspace_id = w.id
   and umr.period_start = date_trunc('month', now())::date
  where w.id = $1
    and public.user_is_workspace_member(w.id);
$$;

alter table public.gm_profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.worlds enable row level security;
alter table public.world_eras enable row level security;
alter table public.sagas enable row level security;
alter table public.push_devices enable row level security;

create policy gm_profiles_owner_all on public.gm_profiles for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy workspaces_owner_all on public.workspaces for all to authenticated using (owner_gm_id = auth.uid() and deleted_at is null) with check (owner_gm_id = auth.uid());
create policy worlds_member_all on public.worlds for all to authenticated using (public.user_is_workspace_member(workspace_id) and deleted_at is null) with check (public.user_is_workspace_member(workspace_id));
create policy world_eras_member_all on public.world_eras for all to authenticated using (public.user_is_workspace_member(workspace_id) and public.world_belongs_to_workspace(world_id, workspace_id)) with check (public.user_is_workspace_member(workspace_id) and public.world_belongs_to_workspace(world_id, workspace_id));
create policy sagas_member_all on public.sagas for all to authenticated using (public.user_is_workspace_member(workspace_id) and public.world_belongs_to_workspace(world_id, workspace_id) and deleted_at is null) with check (public.user_is_workspace_member(workspace_id) and public.world_belongs_to_workspace(world_id, workspace_id));
create policy push_devices_owner_all on public.push_devices for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.characters enable row level security;
alter table public.places enable row level security;
alter table public.factions enable row level security;
alter table public.artifacts enable row level security;
alter table public.threads enable row level security;
alter table public.sessions enable row level security;
alter table public.notes enable row level security;
alter table public.note_attachments enable row level security;
alter table public.relationships enable row level security;
alter table public.relationship_sources enable row level security;
alter table public.mentions enable row level security;
alter table public.sources enable row level security;
alter table public.drafts enable row level security;
alter table public.draft_sources enable row level security;
alter table public.canon_audit enable row level security;
alter table public.embeddings enable row level security;

create policy characters_scoped_all on public.characters for all to authenticated using (public.scoped_row_allowed(workspace_id, world_id, saga_id, scope)) with check (public.scoped_row_allowed(workspace_id, world_id, saga_id, scope));
create policy places_scoped_all on public.places for all to authenticated using (public.scoped_row_allowed(workspace_id, world_id, saga_id, scope)) with check (public.scoped_row_allowed(workspace_id, world_id, saga_id, scope));
create policy factions_scoped_all on public.factions for all to authenticated using (public.scoped_row_allowed(workspace_id, world_id, saga_id, scope)) with check (public.scoped_row_allowed(workspace_id, world_id, saga_id, scope));
create policy artifacts_scoped_all on public.artifacts for all to authenticated using (public.scoped_row_allowed(workspace_id, world_id, saga_id, scope)) with check (public.scoped_row_allowed(workspace_id, world_id, saga_id, scope));
create policy threads_scoped_all on public.threads for all to authenticated using (public.scoped_row_allowed(workspace_id, world_id, saga_id, scope)) with check (public.scoped_row_allowed(workspace_id, world_id, saga_id, scope));
create policy sessions_scoped_all on public.sessions for all to authenticated using (public.saga_row_allowed(workspace_id, world_id, saga_id)) with check (public.saga_row_allowed(workspace_id, world_id, saga_id));
create policy notes_scoped_all on public.notes for all to authenticated using (public.scoped_row_allowed(workspace_id, world_id, saga_id, scope)) with check (public.scoped_row_allowed(workspace_id, world_id, saga_id, scope));
create policy note_attachments_scoped_all on public.note_attachments for all to authenticated using (public.scoped_row_allowed(workspace_id, world_id, saga_id, scope)) with check (public.scoped_row_allowed(workspace_id, world_id, saga_id, scope));
create policy relationships_scoped_all on public.relationships for all to authenticated using (public.scoped_row_allowed(workspace_id, world_id, saga_id, scope)) with check (public.scoped_row_allowed(workspace_id, world_id, saga_id, scope));
create policy relationship_sources_scoped_all on public.relationship_sources for all to authenticated using (public.scoped_row_allowed(workspace_id, world_id, saga_id, scope)) with check (public.scoped_row_allowed(workspace_id, world_id, saga_id, scope));
create policy mentions_scoped_all on public.mentions for all to authenticated using (public.scoped_row_allowed(workspace_id, world_id, saga_id, scope)) with check (public.scoped_row_allowed(workspace_id, world_id, saga_id, scope));
create policy sources_scoped_all on public.sources for all to authenticated using (public.scoped_row_allowed(workspace_id, world_id, saga_id, scope)) with check (public.scoped_row_allowed(workspace_id, world_id, saga_id, scope));
create policy drafts_scoped_all on public.drafts for all to authenticated using (public.scoped_row_allowed(workspace_id, world_id, saga_id, scope)) with check (public.scoped_row_allowed(workspace_id, world_id, saga_id, scope));
create policy draft_sources_scoped_all on public.draft_sources for all to authenticated using (public.scoped_row_allowed(workspace_id, world_id, saga_id, scope)) with check (public.scoped_row_allowed(workspace_id, world_id, saga_id, scope));
create policy canon_audit_select_insert on public.canon_audit for select to authenticated using (public.scoped_row_allowed(workspace_id, world_id, saga_id, scope));
create policy canon_audit_insert on public.canon_audit for insert to authenticated with check (public.scoped_row_allowed(workspace_id, world_id, saga_id, scope));
create policy embeddings_scoped_all on public.embeddings for all to authenticated using (public.scoped_row_allowed(workspace_id, world_id, saga_id, scope)) with check (public.scoped_row_allowed(workspace_id, world_id, saga_id, scope));

alter table public.session_pinned_entities enable row level security;
alter table public.session_active_threads enable row level security;
alter table public.transcripts enable row level security;
alter table public.audio_chunks enable row level security;
alter table public.session_marked_moments enable row level security;
alter table public.pipeline_runs enable row level security;
alter table public.dice_rolls enable row level security;
alter table public.consent_log enable row level security;
alter table public.workshop_sessions enable row level security;
alter table public.usage_events enable row level security;
alter table public.usage_monthly_rollups enable row level security;
alter table public.quota_overrides enable row level security;

create policy session_pinned_entities_saga_all on public.session_pinned_entities for all to authenticated using (public.saga_row_allowed(workspace_id, world_id, saga_id)) with check (public.saga_row_allowed(workspace_id, world_id, saga_id));
create policy session_active_threads_saga_all on public.session_active_threads for all to authenticated using (public.saga_row_allowed(workspace_id, world_id, saga_id)) with check (public.saga_row_allowed(workspace_id, world_id, saga_id));
create policy transcripts_saga_all on public.transcripts for all to authenticated using (public.saga_row_allowed(workspace_id, world_id, saga_id)) with check (public.saga_row_allowed(workspace_id, world_id, saga_id));
create policy audio_chunks_saga_all on public.audio_chunks for all to authenticated using (public.saga_row_allowed(workspace_id, world_id, saga_id)) with check (public.saga_row_allowed(workspace_id, world_id, saga_id));
create policy session_marked_moments_saga_all on public.session_marked_moments for all to authenticated using (public.saga_row_allowed(workspace_id, world_id, saga_id)) with check (public.saga_row_allowed(workspace_id, world_id, saga_id));
create policy pipeline_runs_saga_all on public.pipeline_runs for all to authenticated using (public.saga_row_allowed(workspace_id, world_id, saga_id)) with check (public.saga_row_allowed(workspace_id, world_id, saga_id));
create policy dice_rolls_saga_all on public.dice_rolls for all to authenticated using (public.saga_row_allowed(workspace_id, world_id, saga_id)) with check (public.saga_row_allowed(workspace_id, world_id, saga_id));
create policy consent_log_saga_all on public.consent_log for all to authenticated using (public.saga_row_allowed(workspace_id, world_id, saga_id)) with check (public.saga_row_allowed(workspace_id, world_id, saga_id));
create policy workshop_sessions_owner_all on public.workshop_sessions for all to authenticated using (user_id = auth.uid() and (workspace_id is null or public.user_is_workspace_member(workspace_id)) and (world_id is null or public.world_belongs_to_workspace(world_id, workspace_id)) and (saga_id is null or public.saga_belongs_to_world(saga_id, world_id))) with check (user_id = auth.uid() and (workspace_id is null or public.user_is_workspace_member(workspace_id)) and (world_id is null or public.world_belongs_to_workspace(world_id, workspace_id)) and (saga_id is null or public.saga_belongs_to_world(saga_id, world_id)));
create policy usage_events_member_select_insert on public.usage_events for all to authenticated using (public.user_is_workspace_member(workspace_id)) with check (public.user_is_workspace_member(workspace_id));
create policy usage_monthly_rollups_member_select on public.usage_monthly_rollups for select to authenticated using (public.user_is_workspace_member(workspace_id));
create policy quota_overrides_member_select on public.quota_overrides for select to authenticated using (public.user_is_workspace_member(workspace_id));

create policy storage_audio_member_all on storage.objects for all to authenticated using (bucket_id = 'audio' and public.storage_path_allowed(name)) with check (bucket_id = 'audio' and public.storage_path_allowed(name));
create policy storage_attachments_member_all on storage.objects for all to authenticated using (bucket_id = 'attachments' and public.storage_path_allowed(name)) with check (bucket_id = 'attachments' and public.storage_path_allowed(name));
create policy storage_exports_member_all on storage.objects for all to authenticated using (bucket_id = 'exports' and public.storage_path_allowed(name)) with check (bucket_id = 'exports' and public.storage_path_allowed(name));

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant select, insert, update, delete on storage.objects to anon, authenticated;
grant execute on all functions in schema public to anon, authenticated;

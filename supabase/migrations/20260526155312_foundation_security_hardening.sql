-- Foundation security hardening.
--
-- This migration narrows the exposed Data API surface and moves the current
-- app workflows behind scoped RPCs. Direct table reads remain available for
-- defense-in-depth RLS tests, but direct writes are revoked from browser roles.

create or replace function public.active_saga_matches(target_saga_id uuid)
returns boolean
language sql
security invoker
stable
as $$
  select nullif(current_setting('request.jwt.claim.saga_id', true), '') is not null
    and nullif(current_setting('request.jwt.claim.saga_id', true), '')::uuid = target_saga_id;
$$;

create or replace function public.user_can_access_workspace(target_workspace_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.workspaces w
      where w.id = target_workspace_id
        and w.owner_gm_id = auth.uid()
        and w.deleted_at is null
    );
$$;

create or replace function public.user_can_access_saga(
  target_workspace_id uuid,
  target_world_id uuid,
  target_saga_id uuid
)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.workspaces w
      join public.worlds wo
        on wo.workspace_id = w.id
       and wo.id = target_world_id
       and wo.deleted_at is null
      join public.sagas s
        on s.workspace_id = w.id
       and s.world_id = wo.id
       and s.id = target_saga_id
       and s.deleted_at is null
      where w.id = target_workspace_id
        and w.owner_gm_id = auth.uid()
        and w.deleted_at is null
    );
$$;

create or replace function public.assert_saga_access(
  target_workspace_id uuid,
  target_world_id uuid,
  target_saga_id uuid
)
returns void
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
begin
  if not public.user_can_access_saga(target_workspace_id, target_world_id, target_saga_id) then
    raise exception 'saga context is not available'
      using errcode = '42501';
  end if;
end;
$$;

create or replace function public.scoped_entity_exists(
  target_entity_type public.entity_type,
  target_entity_id uuid,
  target_workspace_id uuid,
  target_world_id uuid,
  target_saga_id uuid,
  target_scope public.content_scope
)
returns boolean
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  found boolean := false;
begin
  if target_entity_type = 'character' then
    select exists (
      select 1 from public.characters e
      where e.id = target_entity_id and e.workspace_id = target_workspace_id and e.world_id = target_world_id
        and (
          (target_scope = 'world' and e.scope = 'world' and e.saga_id is null)
          or (target_scope = 'saga' and ((e.scope = 'world' and e.saga_id is null) or (e.scope = 'saga' and e.saga_id = target_saga_id)))
        )
    ) into found;
  elsif target_entity_type = 'place' then
    select exists (
      select 1 from public.places e
      where e.id = target_entity_id and e.workspace_id = target_workspace_id and e.world_id = target_world_id
        and (
          (target_scope = 'world' and e.scope = 'world' and e.saga_id is null)
          or (target_scope = 'saga' and ((e.scope = 'world' and e.saga_id is null) or (e.scope = 'saga' and e.saga_id = target_saga_id)))
        )
    ) into found;
  elsif target_entity_type = 'faction' then
    select exists (
      select 1 from public.factions e
      where e.id = target_entity_id and e.workspace_id = target_workspace_id and e.world_id = target_world_id
        and (
          (target_scope = 'world' and e.scope = 'world' and e.saga_id is null)
          or (target_scope = 'saga' and ((e.scope = 'world' and e.saga_id is null) or (e.scope = 'saga' and e.saga_id = target_saga_id)))
        )
    ) into found;
  elsif target_entity_type = 'artifact' then
    select exists (
      select 1 from public.artifacts e
      where e.id = target_entity_id and e.workspace_id = target_workspace_id and e.world_id = target_world_id
        and (
          (target_scope = 'world' and e.scope = 'world' and e.saga_id is null)
          or (target_scope = 'saga' and ((e.scope = 'world' and e.saga_id is null) or (e.scope = 'saga' and e.saga_id = target_saga_id)))
        )
    ) into found;
  elsif target_entity_type = 'thread' then
    select exists (
      select 1 from public.threads e
      where e.id = target_entity_id and e.workspace_id = target_workspace_id and e.world_id = target_world_id
        and (
          (target_scope = 'world' and e.scope = 'world' and e.saga_id is null)
          or (target_scope = 'saga' and ((e.scope = 'world' and e.saga_id is null) or (e.scope = 'saga' and e.saga_id = target_saga_id)))
        )
    ) into found;
  elsif target_entity_type = 'session' then
    select exists (
      select 1 from public.sessions e
      where e.id = target_entity_id and e.workspace_id = target_workspace_id and e.world_id = target_world_id
        and target_scope = 'saga' and e.saga_id = target_saga_id
    ) into found;
  end if;

  return found;
end;
$$;

create or replace function public.validate_session_pinned_entity_scope()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1 from public.sessions s
    where s.id = new.session_id
      and s.workspace_id = new.workspace_id
      and s.world_id = new.world_id
      and s.saga_id = new.saga_id
  ) then
    raise exception 'session is outside the row scope'
      using errcode = '23514';
  end if;

  if not public.scoped_entity_exists(new.entity_type, new.entity_id, new.workspace_id, new.world_id, new.saga_id, 'saga') then
    raise exception 'referenced entity is outside the row scope'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_session_pinned_entity_scope on public.session_pinned_entities;
create trigger validate_session_pinned_entity_scope
before insert or update on public.session_pinned_entities
for each row execute function public.validate_session_pinned_entity_scope();

create or replace function public.validate_session_active_thread_scope()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1 from public.sessions s
    where s.id = new.session_id
      and s.workspace_id = new.workspace_id
      and s.world_id = new.world_id
      and s.saga_id = new.saga_id
  ) then
    raise exception 'session is outside the row scope'
      using errcode = '23514';
  end if;

  if not public.scoped_entity_exists('thread', new.thread_id, new.workspace_id, new.world_id, new.saga_id, 'saga') then
    raise exception 'referenced thread is outside the row scope'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_session_active_thread_scope on public.session_active_threads;
create trigger validate_session_active_thread_scope
before insert or update on public.session_active_threads
for each row execute function public.validate_session_active_thread_scope();

create or replace function public.source_belongs_to_scope(
  target_source_id uuid,
  target_workspace_id uuid,
  target_world_id uuid,
  target_saga_id uuid,
  target_scope public.content_scope
)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.sources s
    where s.id = target_source_id
      and s.workspace_id = target_workspace_id
      and s.world_id = target_world_id
      and (
        (target_scope = 'world' and s.scope = 'world' and s.saga_id is null)
        or (target_scope = 'saga' and ((s.scope = 'world' and s.saga_id is null) or (s.scope = 'saga' and s.saga_id = target_saga_id)))
      )
  );
$$;

create or replace function public.validate_note_attachment_scope()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1 from public.notes n
    where n.id = new.note_id
      and n.workspace_id = new.workspace_id
      and n.world_id = new.world_id
      and (
        (new.scope = 'world' and n.scope = 'world' and n.saga_id is null)
        or (new.scope = 'saga' and ((n.scope = 'world' and n.saga_id is null) or (n.scope = 'saga' and n.saga_id = new.saga_id)))
      )
  ) then
    raise exception 'note is outside the row scope' using errcode = '23514';
  end if;

  if not public.scoped_entity_exists(new.entity_type, new.entity_id, new.workspace_id, new.world_id, new.saga_id, new.scope) then
    raise exception 'referenced entity is outside the row scope' using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_note_attachment_scope on public.note_attachments;
create trigger validate_note_attachment_scope
before insert or update on public.note_attachments
for each row execute function public.validate_note_attachment_scope();

create or replace function public.validate_relationship_scope()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.scoped_entity_exists(new.from_entity_type, new.from_entity_id, new.workspace_id, new.world_id, new.saga_id, new.scope) then
    raise exception 'relationship source entity is outside the row scope' using errcode = '23514';
  end if;

  if not public.scoped_entity_exists(new.to_entity_type, new.to_entity_id, new.workspace_id, new.world_id, new.saga_id, new.scope) then
    raise exception 'relationship target entity is outside the row scope' using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_relationship_scope on public.relationships;
create trigger validate_relationship_scope
before insert or update on public.relationships
for each row execute function public.validate_relationship_scope();

create or replace function public.validate_relationship_source_scope()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1 from public.relationships r
    where r.id = new.relationship_id
      and r.workspace_id = new.workspace_id
      and r.world_id = new.world_id
      and (
        (new.scope = 'world' and r.scope = 'world' and r.saga_id is null)
        or (new.scope = 'saga' and ((r.scope = 'world' and r.saga_id is null) or (r.scope = 'saga' and r.saga_id = new.saga_id)))
      )
  ) then
    raise exception 'relationship is outside the row scope' using errcode = '23514';
  end if;

  if not public.source_belongs_to_scope(new.source_id, new.workspace_id, new.world_id, new.saga_id, new.scope) then
    raise exception 'source is outside the row scope' using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_relationship_source_scope on public.relationship_sources;
create trigger validate_relationship_source_scope
before insert or update on public.relationship_sources
for each row execute function public.validate_relationship_source_scope();

create or replace function public.validate_mention_scope()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.scoped_entity_exists(new.source_entity_type, new.source_entity_id, new.workspace_id, new.world_id, new.saga_id, new.scope) then
    raise exception 'mention source entity is outside the row scope' using errcode = '23514';
  end if;

  if not public.scoped_entity_exists(new.mentioned_entity_type, new.mentioned_entity_id, new.workspace_id, new.world_id, new.saga_id, new.scope) then
    raise exception 'mentioned entity is outside the row scope' using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_mention_scope on public.mentions;
create trigger validate_mention_scope
before insert or update on public.mentions
for each row execute function public.validate_mention_scope();

create or replace function public.validate_source_scope()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.source_entity_type is not null
    and new.source_entity_id is not null
    and not public.scoped_entity_exists(new.source_entity_type, new.source_entity_id, new.workspace_id, new.world_id, new.saga_id, new.scope) then
    raise exception 'source entity is outside the row scope' using errcode = '23514';
  end if;

  if new.note_id is not null and not exists (
    select 1 from public.notes n
    where n.id = new.note_id
      and n.workspace_id = new.workspace_id
      and n.world_id = new.world_id
      and (
        (new.scope = 'world' and n.scope = 'world' and n.saga_id is null)
        or (new.scope = 'saga' and ((n.scope = 'world' and n.saga_id is null) or (n.scope = 'saga' and n.saga_id = new.saga_id)))
      )
  ) then
    raise exception 'source note is outside the row scope' using errcode = '23514';
  end if;

  if new.session_id is not null and not exists (
    select 1 from public.sessions s
    where s.id = new.session_id
      and s.workspace_id = new.workspace_id
      and s.world_id = new.world_id
      and s.saga_id = new.saga_id
  ) then
    raise exception 'source session is outside the row scope' using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_source_scope on public.sources;
create trigger validate_source_scope
before insert or update on public.sources
for each row execute function public.validate_source_scope();

create or replace function public.validate_draft_source_scope()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1 from public.drafts d
    where d.id = new.draft_id
      and d.workspace_id = new.workspace_id
      and d.world_id = new.world_id
      and (
        (new.scope = 'world' and d.scope = 'world' and d.saga_id is null)
        or (new.scope = 'saga' and d.scope = 'saga' and d.saga_id = new.saga_id)
      )
  ) then
    raise exception 'draft is outside the row scope' using errcode = '23514';
  end if;

  if not public.source_belongs_to_scope(new.source_id, new.workspace_id, new.world_id, new.saga_id, new.scope) then
    raise exception 'source is outside the row scope' using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_draft_source_scope on public.draft_sources;
create trigger validate_draft_source_scope
before insert or update on public.draft_sources
for each row execute function public.validate_draft_source_scope();

drop policy if exists sagas_member_all on public.sagas;
create policy sagas_member_select on public.sagas
  for select to authenticated
  using (
    public.user_is_workspace_member(workspace_id)
    and public.world_belongs_to_workspace(world_id, workspace_id)
    and public.active_saga_matches(id)
    and deleted_at is null
  );
create policy sagas_member_insert on public.sagas
  for insert to authenticated
  with check (
    public.user_is_workspace_member(workspace_id)
    and public.world_belongs_to_workspace(world_id, workspace_id)
  );
create policy sagas_member_update on public.sagas
  for update to authenticated
  using (
    public.user_is_workspace_member(workspace_id)
    and public.world_belongs_to_workspace(world_id, workspace_id)
    and public.active_saga_matches(id)
    and deleted_at is null
  )
  with check (
    public.user_is_workspace_member(workspace_id)
    and public.world_belongs_to_workspace(world_id, workspace_id)
    and public.active_saga_matches(id)
  );

drop policy if exists usage_events_member_select_insert on public.usage_events;
create policy usage_events_member_select on public.usage_events
  for select to authenticated
  using (public.user_is_workspace_member(workspace_id));
create policy usage_events_member_insert on public.usage_events
  for insert to authenticated
  with check (public.user_is_workspace_member(workspace_id));

drop policy if exists drafts_scoped_all on public.drafts;
create policy drafts_scoped_select on public.drafts
  for select to authenticated
  using (public.scoped_row_allowed(workspace_id, world_id, saga_id, scope));

revoke insert, update, delete on all tables in schema public from anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete, select on storage.objects to authenticated;
revoke insert, update, delete on storage.objects from anon;

create or replace function public.ensure_default_workspace()
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  existing_id uuid;
  inserted_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
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
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
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

create or replace function public.get_saga_context(workspace_id uuid, world_id uuid, saga_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  workspace_row jsonb;
  world_row jsonb;
  saga_row jsonb;
begin
  perform public.assert_saga_access($1, $2, $3);

  select to_jsonb(w) - 'billing_customer_id' into workspace_row
  from public.workspaces w
  where w.id = $1 and w.deleted_at is null;

  select to_jsonb(w) into world_row
  from public.worlds w
  where w.id = $2 and w.workspace_id = $1 and w.deleted_at is null;

  select to_jsonb(s) into saga_row
  from public.sagas s
  where s.id = $3 and s.workspace_id = $1 and s.world_id = $2 and s.deleted_at is null;

  return jsonb_build_object('workspace', workspace_row, 'world', world_row, 'saga', saga_row);
end;
$$;

create or replace function public.create_blank_saga(
  saga_name text,
  game_system text default null,
  experience_level text default 'returning',
  improv_comfort text default 'mixed',
  prep_style text default 'mixed',
  world_choice text default 'new',
  existing_world_id uuid default null,
  world_name text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_workspace_id uuid;
  selected_world_id uuid;
  selected_era_id uuid;
  inserted_saga_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if nullif(trim(saga_name), '') is null then
    raise exception 'Saga name is required' using errcode = '23514';
  end if;

  v_workspace_id := public.ensure_default_workspace();

  insert into public.gm_profiles (user_id, experience_level, improv_comfort, prep_style, default_game_system)
  values (auth.uid(), coalesce(experience_level, 'returning'), coalesce(improv_comfort, 'mixed'), coalesce(prep_style, 'mixed'), nullif(game_system, ''))
  on conflict (user_id) do update
  set experience_level = excluded.experience_level,
      improv_comfort = excluded.improv_comfort,
      prep_style = excluded.prep_style,
      default_game_system = excluded.default_game_system,
      updated_at = now();

  if world_choice = 'existing' and existing_world_id is not null then
    select id into selected_world_id
    from public.worlds w
    where w.id = existing_world_id
      and w.workspace_id = v_workspace_id
      and w.deleted_at is null;
  end if;

  if selected_world_id is null then
    insert into public.worlds (workspace_id, owner_gm_id, name, default_game_system)
    values (v_workspace_id, auth.uid(), coalesce(nullif(trim(world_name), ''), saga_name || ' World'), nullif(game_system, ''))
    returning id into selected_world_id;
  end if;

  select id into selected_era_id
  from public.world_eras we
  where we.workspace_id = v_workspace_id
    and we.world_id = selected_world_id
  order by sort_order
  limit 1;

  if selected_era_id is null then
    insert into public.world_eras (workspace_id, world_id, name, summary, sort_order)
    values (v_workspace_id, selected_world_id, 'Default Era', 'Default timeframe for this world.', 0)
    returning id into selected_era_id;
  end if;

  insert into public.sagas (workspace_id, world_id, owner_gm_id, name, game_system, primary_era_id)
  values (v_workspace_id, selected_world_id, auth.uid(), saga_name, nullif(game_system, ''), selected_era_id)
  returning id into inserted_saga_id;

  return jsonb_build_object(
    'workspace_id', v_workspace_id,
    'world_id', selected_world_id,
    'saga_id', inserted_saga_id
  );
end;
$$;

create or replace function public.list_worlds_for_workspace()
returns jsonb
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', w.id, 'name', w.name) order by w.updated_at desc), '[]'::jsonb)
  from public.worlds w
  join public.workspaces ws on ws.id = w.workspace_id
  where ws.owner_gm_id = auth.uid()
    and ws.deleted_at is null
    and w.deleted_at is null;
$$;

create or replace function public.create_entity(
  workspace_id uuid,
  world_id uuid,
  saga_id uuid,
  entity_type text,
  entity_scope public.content_scope,
  payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  inserted_id uuid;
  row_saga_id uuid := case when entity_scope = 'world' then null else saga_id end;
begin
  perform public.assert_saga_access($1, $2, $3);

  if entity_type = 'character' then
    insert into public.characters (workspace_id, world_id, saga_id, scope, name, summary, narrative, gm_notes, canon_state, created_by)
    values ($1, $2, row_saga_id, entity_scope, payload->>'name', payload->>'summary', payload->>'narrative', payload->>'gm_notes', 'canon', 'gm')
    returning id into inserted_id;
  elsif entity_type = 'place' then
    insert into public.places (workspace_id, world_id, saga_id, scope, name, summary, narrative, gm_notes, canon_state, created_by)
    values ($1, $2, row_saga_id, entity_scope, payload->>'name', payload->>'summary', payload->>'narrative', payload->>'gm_notes', 'canon', 'gm')
    returning id into inserted_id;
  elsif entity_type = 'faction' then
    insert into public.factions (workspace_id, world_id, saga_id, scope, name, summary, narrative, gm_notes, canon_state, created_by)
    values ($1, $2, row_saga_id, entity_scope, payload->>'name', payload->>'summary', payload->>'narrative', payload->>'gm_notes', 'canon', 'gm')
    returning id into inserted_id;
  elsif entity_type = 'artifact' then
    insert into public.artifacts (workspace_id, world_id, saga_id, scope, name, summary, narrative, gm_notes, canon_state, created_by)
    values ($1, $2, row_saga_id, entity_scope, payload->>'name', payload->>'summary', payload->>'narrative', payload->>'gm_notes', 'canon', 'gm')
    returning id into inserted_id;
  elsif entity_type = 'thread' then
    insert into public.threads (workspace_id, world_id, saga_id, scope, name, summary, narrative, gm_notes, canon_state, created_by)
    values ($1, $2, row_saga_id, entity_scope, payload->>'name', payload->>'summary', payload->>'narrative', payload->>'gm_notes', 'canon', 'gm')
    returning id into inserted_id;
  elsif entity_type = 'note' then
    insert into public.notes (workspace_id, world_id, saga_id, scope, note_type, title, body, canon_state, created_by)
    values ($1, $2, row_saga_id, entity_scope, coalesce(nullif(payload->>'note_type', ''), 'lore')::public.note_type, payload->>'title', coalesce(payload->>'body', ''), 'canon', 'gm')
    returning id into inserted_id;
  else
    raise exception 'Unsupported entity type' using errcode = '23514';
  end if;

  return jsonb_build_object('id', inserted_id);
end;
$$;

create or replace function public.update_entity(
  workspace_id uuid,
  world_id uuid,
  saga_id uuid,
  entity_type text,
  entity_id uuid,
  payload jsonb
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

  if entity_type = 'character' then
    update public.characters set name = payload->>'name', summary = payload->>'summary', narrative = payload->>'narrative', gm_notes = payload->>'gm_notes', updated_at = now()
    where id = entity_id and workspace_id = $1 and world_id = $2 and (saga_id = $3 or (scope = 'world' and saga_id is null)) returning id into updated_id;
  elsif entity_type = 'place' then
    update public.places set name = payload->>'name', summary = payload->>'summary', narrative = payload->>'narrative', gm_notes = payload->>'gm_notes', updated_at = now()
    where id = entity_id and workspace_id = $1 and world_id = $2 and (saga_id = $3 or (scope = 'world' and saga_id is null)) returning id into updated_id;
  elsif entity_type = 'faction' then
    update public.factions set name = payload->>'name', summary = payload->>'summary', narrative = payload->>'narrative', gm_notes = payload->>'gm_notes', updated_at = now()
    where id = entity_id and workspace_id = $1 and world_id = $2 and (saga_id = $3 or (scope = 'world' and saga_id is null)) returning id into updated_id;
  elsif entity_type = 'artifact' then
    update public.artifacts set name = payload->>'name', summary = payload->>'summary', narrative = payload->>'narrative', gm_notes = payload->>'gm_notes', updated_at = now()
    where id = entity_id and workspace_id = $1 and world_id = $2 and (saga_id = $3 or (scope = 'world' and saga_id is null)) returning id into updated_id;
  elsif entity_type = 'thread' then
    update public.threads set name = payload->>'name', summary = payload->>'summary', narrative = payload->>'narrative', gm_notes = payload->>'gm_notes', updated_at = now()
    where id = entity_id and workspace_id = $1 and world_id = $2 and (saga_id = $3 or (scope = 'world' and saga_id is null)) returning id into updated_id;
  elsif entity_type = 'note' then
    update public.notes set title = payload->>'title', body = coalesce(payload->>'body', ''), updated_at = now()
    where id = entity_id and workspace_id = $1 and world_id = $2 and (saga_id = $3 or (scope = 'world' and saga_id is null)) returning id into updated_id;
  else
    raise exception 'Unsupported entity type' using errcode = '23514';
  end if;

  if updated_id is null then
    raise exception 'Entity is not available' using errcode = '42501';
  end if;

  return updated_id;
end;
$$;

create or replace function public.archive_entity(
  workspace_id uuid,
  world_id uuid,
  saga_id uuid,
  entity_type text,
  entity_id uuid
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

  if entity_type = 'character' then
    update public.characters set canon_state = 'archived', status = 'archived', updated_at = now() where id = entity_id and workspace_id = $1 and world_id = $2 and (saga_id = $3 or (scope = 'world' and saga_id is null)) returning id into updated_id;
  elsif entity_type = 'place' then
    update public.places set canon_state = 'archived', status = 'archived', updated_at = now() where id = entity_id and workspace_id = $1 and world_id = $2 and (saga_id = $3 or (scope = 'world' and saga_id is null)) returning id into updated_id;
  elsif entity_type = 'faction' then
    update public.factions set canon_state = 'archived', status = 'archived', updated_at = now() where id = entity_id and workspace_id = $1 and world_id = $2 and (saga_id = $3 or (scope = 'world' and saga_id is null)) returning id into updated_id;
  elsif entity_type = 'artifact' then
    update public.artifacts set canon_state = 'archived', status = 'archived', updated_at = now() where id = entity_id and workspace_id = $1 and world_id = $2 and (saga_id = $3 or (scope = 'world' and saga_id is null)) returning id into updated_id;
  elsif entity_type = 'thread' then
    update public.threads set canon_state = 'archived', status = 'archived', updated_at = now() where id = entity_id and workspace_id = $1 and world_id = $2 and (saga_id = $3 or (scope = 'world' and saga_id is null)) returning id into updated_id;
  elsif entity_type = 'note' then
    update public.notes set canon_state = 'archived', updated_at = now() where id = entity_id and workspace_id = $1 and world_id = $2 and (saga_id = $3 or (scope = 'world' and saga_id is null)) returning id into updated_id;
  else
    raise exception 'Unsupported entity type' using errcode = '23514';
  end if;

  if updated_id is null then
    raise exception 'Entity is not available' using errcode = '42501';
  end if;

  return updated_id;
end;
$$;

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

  update public.threads
  set objectives_log = objectives_log || jsonb_build_array(jsonb_build_object(
        'text', trim(objective_text),
        'state', 'open',
        'created_at', now()
      )),
      updated_at = now()
  where id = thread_id
    and workspace_id = $1
    and world_id = $2
    and saga_id = $3
  returning id into updated_id;

  if updated_id is null then
    raise exception 'Thread is not available' using errcode = '42501';
  end if;

  return updated_id;
end;
$$;

create or replace function public.create_session(
  workspace_id uuid,
  world_id uuid,
  saga_id uuid,
  session_name text,
  objective text default null,
  opening_scene text default null,
  scene_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  inserted_id uuid;
begin
  perform public.assert_saga_access($1, $2, $3);

  insert into public.sessions (workspace_id, world_id, saga_id, scope, name, objective, opening_scene, scene_notes, prep_checklist)
  values ($1, $2, $3, 'saga', coalesce(nullif(trim(session_name), ''), 'Next session'), objective, opening_scene, scene_notes, '[]'::jsonb)
  returning id into inserted_id;

  return jsonb_build_object('id', inserted_id);
end;
$$;

create or replace function public.update_session_prep(
  workspace_id uuid,
  world_id uuid,
  saga_id uuid,
  session_id uuid,
  session_name text,
  objective text,
  opening_scene text,
  scene_notes text,
  prep_checklist jsonb,
  pinned_entities jsonb default '[]'::jsonb,
  active_threads jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  updated_id uuid;
  pin text;
  pin_type text;
  pin_id uuid;
  pin_index int := 0;
  active_thread_id uuid;
begin
  perform public.assert_saga_access($1, $2, $3);

  update public.sessions s
  set name = coalesce(nullif(trim(update_session_prep.session_name), ''), s.name),
      objective = update_session_prep.objective,
      opening_scene = update_session_prep.opening_scene,
      scene_notes = update_session_prep.scene_notes,
      prep_checklist = coalesce(update_session_prep.prep_checklist, '[]'::jsonb),
      updated_at = now()
  where s.id = update_session_prep.session_id
    and s.workspace_id = $1
    and s.world_id = $2
    and s.saga_id = $3
  returning s.id into updated_id;

  if updated_id is null then
    raise exception 'Session is not available' using errcode = '42501';
  end if;

  delete from public.session_pinned_entities where session_pinned_entities.session_id = update_session_prep.session_id;
  for pin in select jsonb_array_elements_text(coalesce(update_session_prep.pinned_entities, '[]'::jsonb)) loop
    pin_type := split_part(pin, ':', 1);
    pin_id := split_part(pin, ':', 2)::uuid;
    insert into public.session_pinned_entities (workspace_id, world_id, saga_id, session_id, entity_type, entity_id, order_index)
    values ($1, $2, $3, update_session_prep.session_id, pin_type::public.entity_type, pin_id, pin_index);
    pin_index := pin_index + 1;
  end loop;

  delete from public.session_active_threads where session_active_threads.session_id = update_session_prep.session_id;
  for active_thread_id in select jsonb_array_elements_text(coalesce(update_session_prep.active_threads, '[]'::jsonb))::uuid loop
    insert into public.session_active_threads (workspace_id, world_id, saga_id, session_id, thread_id)
    values ($1, $2, $3, update_session_prep.session_id, active_thread_id);
  end loop;

  return updated_id;
end;
$$;

create or replace function public.set_session_status(
  workspace_id uuid,
  world_id uuid,
  saga_id uuid,
  session_id uuid,
  status public.session_status
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

  update public.sessions
  set status = set_session_status.status,
      started_at = case when set_session_status.status in ('started', 'in_progress') and started_at is null then now() else started_at end,
      ended_at = case when set_session_status.status = 'ended' then now() else ended_at end,
      updated_at = now()
  where id = session_id
    and workspace_id = $1
    and world_id = $2
    and saga_id = $3
  returning id into updated_id;

  if updated_id is null then
    raise exception 'Session is not available' using errcode = '42501';
  end if;

  return updated_id;
end;
$$;

create or replace function public.quick_capture(
  workspace_id uuid,
  world_id uuid,
  saga_id uuid,
  session_id uuid,
  body text
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

  if not exists (select 1 from public.sessions s where s.id = session_id and s.workspace_id = $1 and s.world_id = $2 and s.saga_id = $3) then
    raise exception 'Session is not available' using errcode = '42501';
  end if;

  insert into public.notes (workspace_id, world_id, saga_id, scope, note_type, title, body, canon_state, created_by)
  values ($1, $2, $3, 'saga', 'quick_capture', 'Capture ' || to_char(now(), 'HH24:MI:SS'), body, 'canon', 'gm')
  returning id into inserted_id;

  return inserted_id;
end;
$$;

create or replace function public.quick_stub(
  workspace_id uuid,
  world_id uuid,
  saga_id uuid,
  entity_type text,
  entity_name text,
  summary text default null
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

  if nullif(trim(entity_name), '') is null then
    raise exception 'Entity name is required' using errcode = '23514';
  end if;

  if entity_type = 'character' then
    insert into public.characters (workspace_id, world_id, saga_id, scope, name, summary, canon_state, created_by, is_stub)
    values ($1, $2, $3, 'saga', entity_name, summary, 'canon', 'gm', true) returning id into inserted_id;
  elsif entity_type = 'place' then
    insert into public.places (workspace_id, world_id, saga_id, scope, name, summary, canon_state, created_by, is_stub)
    values ($1, $2, $3, 'saga', entity_name, summary, 'canon', 'gm', true) returning id into inserted_id;
  elsif entity_type = 'faction' then
    insert into public.factions (workspace_id, world_id, saga_id, scope, name, summary, canon_state, created_by, is_stub)
    values ($1, $2, $3, 'saga', entity_name, summary, 'canon', 'gm', true) returning id into inserted_id;
  elsif entity_type = 'artifact' then
    insert into public.artifacts (workspace_id, world_id, saga_id, scope, name, summary, canon_state, created_by, is_stub)
    values ($1, $2, $3, 'saga', entity_name, summary, 'canon', 'gm', true) returning id into inserted_id;
  elsif entity_type = 'thread' then
    insert into public.threads (workspace_id, world_id, saga_id, scope, name, summary, canon_state, created_by, is_stub)
    values ($1, $2, $3, 'saga', entity_name, summary, 'canon', 'gm', true) returning id into inserted_id;
  else
    raise exception 'Unsupported entity type' using errcode = '23514';
  end if;

  return inserted_id;
end;
$$;

create or replace function public.mark_moment(
  workspace_id uuid,
  world_id uuid,
  saga_id uuid,
  session_id uuid,
  label text default null
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

  if not exists (select 1 from public.sessions s where s.id = session_id and s.workspace_id = $1 and s.world_id = $2 and s.saga_id = $3) then
    raise exception 'Session is not available' using errcode = '42501';
  end if;

  insert into public.session_marked_moments (workspace_id, world_id, saga_id, session_id, occurred_at, label)
  values ($1, $2, $3, session_id, now(), coalesce(nullif(trim(label), ''), 'Marked moment'))
  returning id into inserted_id;

  return inserted_id;
end;
$$;

create or replace function public.update_draft_state(
  workspace_id uuid,
  world_id uuid,
  saga_id uuid,
  draft_id uuid,
  state public.draft_state,
  rejection_note text default null
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

  if state not in ('approved', 'rejected', 'merged', 'superseded') then
    raise exception 'Unsupported draft state' using errcode = '23514';
  end if;

  update public.drafts d
  set state = update_draft_state.state,
      rejection_note = nullif(update_draft_state.rejection_note, ''),
      resolved_at = now(),
      updated_at = now()
  where d.id = update_draft_state.draft_id
    and d.workspace_id = $1
    and d.world_id = $2
    and d.saga_id = $3
  returning d.id into updated_id;

  if updated_id is null then
    raise exception 'Draft is not available' using errcode = '42501';
  end if;

  return updated_id;
end;
$$;

create or replace function public.list_entities(
  workspace_id uuid,
  world_id uuid,
  saga_id uuid,
  entity_type text,
  include_archived boolean default false
)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  result jsonb := '[]'::jsonb;
begin
  perform public.assert_saga_access($1, $2, $3);

  if entity_type = 'character' then
    select coalesce(jsonb_agg(to_jsonb(e) order by e.updated_at desc), '[]'::jsonb) into result
    from public.characters e
    where e.workspace_id = $1 and e.world_id = $2
      and (e.saga_id = $3 or (e.scope = 'world' and e.saga_id is null))
      and (include_archived or e.canon_state <> 'archived');
  elsif entity_type = 'place' then
    select coalesce(jsonb_agg(to_jsonb(e) order by e.updated_at desc), '[]'::jsonb) into result
    from public.places e
    where e.workspace_id = $1 and e.world_id = $2
      and (e.saga_id = $3 or (e.scope = 'world' and e.saga_id is null))
      and (include_archived or e.canon_state <> 'archived');
  elsif entity_type = 'faction' then
    select coalesce(jsonb_agg(to_jsonb(e) order by e.updated_at desc), '[]'::jsonb) into result
    from public.factions e
    where e.workspace_id = $1 and e.world_id = $2
      and (e.saga_id = $3 or (e.scope = 'world' and e.saga_id is null))
      and (include_archived or e.canon_state <> 'archived');
  elsif entity_type = 'artifact' then
    select coalesce(jsonb_agg(to_jsonb(e) order by e.updated_at desc), '[]'::jsonb) into result
    from public.artifacts e
    where e.workspace_id = $1 and e.world_id = $2
      and (e.saga_id = $3 or (e.scope = 'world' and e.saga_id is null))
      and (include_archived or e.canon_state <> 'archived');
  elsif entity_type = 'thread' then
    select coalesce(jsonb_agg(to_jsonb(e) order by e.updated_at desc), '[]'::jsonb) into result
    from public.threads e
    where e.workspace_id = $1 and e.world_id = $2
      and (e.saga_id = $3 or (e.scope = 'world' and e.saga_id is null))
      and (include_archived or e.canon_state <> 'archived');
  elsif entity_type = 'note' then
    select coalesce(jsonb_agg(to_jsonb(e) order by e.updated_at desc), '[]'::jsonb) into result
    from public.notes e
    where e.workspace_id = $1 and e.world_id = $2
      and (e.saga_id = $3 or (e.scope = 'world' and e.saga_id is null))
      and (include_archived or e.canon_state <> 'archived');
  else
    raise exception 'Unsupported entity type' using errcode = '23514';
  end if;

  return result;
end;
$$;

create or replace function public.get_sessions_for_saga(workspace_id uuid, world_id uuid, saga_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
begin
  perform public.assert_saga_access($1, $2, $3);

  return (
    select coalesce(jsonb_agg(to_jsonb(s) order by s.created_at desc), '[]'::jsonb)
    from public.sessions s
    where s.workspace_id = $1
      and s.world_id = $2
      and s.saga_id = $3
  );
end;
$$;

create or replace function public.get_session_pinned_entities(workspace_id uuid, world_id uuid, saga_id uuid, session_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
begin
  perform public.assert_saga_access($1, $2, $3);

  return (
    select coalesce(jsonb_agg(to_jsonb(p) order by p.order_index), '[]'::jsonb)
    from public.session_pinned_entities p
    where p.workspace_id = $1
      and p.world_id = $2
      and p.saga_id = $3
      and p.session_id = get_session_pinned_entities.session_id
  );
end;
$$;

create or replace function public.get_session_active_threads(workspace_id uuid, world_id uuid, saga_id uuid, session_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
begin
  perform public.assert_saga_access($1, $2, $3);

  return (
    select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
    from public.session_active_threads t
    where t.workspace_id = $1
      and t.world_id = $2
      and t.saga_id = $3
      and t.session_id = get_session_active_threads.session_id
  );
end;
$$;

create or replace function public.get_pending_drafts(workspace_id uuid, world_id uuid, saga_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
begin
  perform public.assert_saga_access($1, $2, $3);

  return (
    select coalesce(jsonb_agg(to_jsonb(d) order by d.created_at desc), '[]'::jsonb)
    from public.drafts d
    where d.workspace_id = $1
      and d.world_id = $2
      and d.saga_id = $3
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
security definer
stable
set search_path = public, pg_temp
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

  if not public.user_can_access_workspace($1) then
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
security definer
stable
set search_path = public, pg_temp
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
    and public.user_can_access_workspace(w.id);
$$;

create or replace function public.search_for_ui(
  workspace_id uuid,
  world_id uuid,
  saga_id uuid,
  query_text text,
  surface text default 'sanctum',
  top_k integer default 10,
  include_archived boolean default false,
  literal_only boolean default false,
  include_world_canon boolean default true
)
returns table (
  source_kind text,
  source_entity_type public.entity_type,
  source_entity_id uuid,
  snippet text,
  rrf_score double precision,
  canon_state public.entity_canon_state,
  is_stub boolean
)
language sql
security definer
stable
set search_path = public, extensions, pg_temp
as $$
with query as (
  select websearch_to_tsquery('english', coalesce($4, '')) as tsq,
         nullif(trim(coalesce($4, '')), '') as raw
),
corpus as (
  select 'entity'::text as source_kind, 'character'::public.entity_type as source_entity_type, c.id as source_entity_id,
         c.name, c.summary, c.narrative, c.search_tsv, c.canon_state, c.is_stub, c.updated_at, c.workspace_id, c.world_id, c.saga_id, c.scope
  from public.characters c
  union all select 'entity', 'place'::public.entity_type, p.id, p.name, p.summary, p.narrative, p.search_tsv, p.canon_state, p.is_stub, p.updated_at, p.workspace_id, p.world_id, p.saga_id, p.scope from public.places p
  union all select 'entity', 'faction'::public.entity_type, f.id, f.name, f.summary, f.narrative, f.search_tsv, f.canon_state, f.is_stub, f.updated_at, f.workspace_id, f.world_id, f.saga_id, f.scope from public.factions f
  union all select 'entity', 'artifact'::public.entity_type, a.id, a.name, a.summary, a.narrative, a.search_tsv, a.canon_state, a.is_stub, a.updated_at, a.workspace_id, a.world_id, a.saga_id, a.scope from public.artifacts a
  union all select 'entity', 'thread'::public.entity_type, t.id, t.name, t.summary, concat_ws(E'\n\n', t.narrative, t.objective), t.search_tsv, t.canon_state, t.is_stub, t.updated_at, t.workspace_id, t.world_id, t.saga_id, t.scope from public.threads t
  union all select 'entity', 'session'::public.entity_type, s.id, s.name, s.summary, concat_ws(E'\n\n', s.narrative, s.objective, s.opening_scene), s.search_tsv, 'canon'::public.entity_canon_state, false, s.updated_at, s.workspace_id, s.world_id, s.saga_id, s.scope from public.sessions s
  union all select 'note', null::public.entity_type, n.id, coalesce(n.title, 'Untitled note'), left(n.body, 500), n.body, n.search_tsv, n.canon_state, false, n.updated_at, n.workspace_id, n.world_id, n.saga_id, n.scope from public.notes n where n.note_type <> 'gm_note'
),
scoped as (
  select c.*
  from corpus c
  where public.user_can_access_saga($1, $2, $3)
    and c.workspace_id = $1
    and c.world_id = $2
    and (($9 and c.scope = 'world' and c.saga_id is null) or (c.scope = 'saga' and c.saga_id = $3))
    and ($7 or c.canon_state <> 'archived')
),
ranked as (
  select s.*,
         (case when s.search_tsv @@ q.tsq then ts_rank_cd(s.search_tsv, q.tsq)::double precision else 0 end)
         + (case when q.raw is not null and not $8 then extensions.similarity(concat_ws(' ', s.name, s.summary, s.narrative), q.raw)::double precision else 0 end) as score
  from scoped s, query q
  where q.raw is not null
    and (
      s.search_tsv @@ q.tsq
      or s.name ilike '%' || q.raw || '%'
      or coalesce(s.summary, '') ilike '%' || q.raw || '%'
      or (not $8 and extensions.similarity(concat_ws(' ', s.name, s.summary, s.narrative), q.raw) > 0)
    )
)
select r.source_kind,
       r.source_entity_type,
       r.source_entity_id,
       left(concat_ws(' - ', r.name, r.summary, r.narrative), 320) as snippet,
       r.score as rrf_score,
       r.canon_state,
       r.is_stub
from ranked r
order by r.score desc, r.updated_at desc, r.source_entity_id
limit greatest(1, coalesce($6, 10));
$$;

create or replace function public.retrieve_for_task(
  workspace_id uuid,
  world_id uuid,
  saga_id uuid default null,
  era_id uuid default null,
  query_text text default '',
  task_profile text default 'sanctum_grounding',
  filters jsonb default '{}'::jsonb,
  top_k integer default null
)
returns table (
  source_kind text,
  source_entity_type public.entity_type,
  source_entity_id uuid,
  chunk_index integer,
  rrf_score double precision,
  bm25_rank integer,
  vector_rank integer,
  source_id uuid,
  canon_state public.entity_canon_state
)
language sql
security definer
stable
set search_path = public, extensions, pg_temp
as $$
with profile as (
  select *
  from public.retrieval_profiles rp
  where rp.name = case coalesce(nullif($6, ''), 'sanctum_grounding')
    when 'compose_prep_briefing' then 'session_prep_grounding'
    when 'generate_session_prep' then 'session_prep_grounding'
    when 'propose_scene_beats' then 'session_prep_grounding'
    when 'propose_npc_for_scene' then 'session_prep_grounding'
    when 'draft_entity_from_prompt' then 'sanctum_grounding'
    when 'propose_thread_complication' then 'sanctum_grounding'
    when 'answer_saga_question' then 'sanctum_qa_grounding'
    when 'synthesize_session' then 'post_session_synthesis'
    when 'propose_quick_stub_fleshing' then 'post_session_synthesis'
    else coalesce(nullif($6, ''), 'sanctum_grounding')
  end
),
effective as (
  select coalesce($8, p.top_k, 12) as limit_rows,
         p.include_world_canon
  from profile p
),
query as (
  select websearch_to_tsquery('english', coalesce($5, '')) as tsq,
         nullif(trim(coalesce($5, '')), '') as raw
),
corpus as (
  select 'entity'::text as source_kind, 'character'::public.entity_type as source_entity_type, c.id as source_entity_id, 0 as chunk_index, c.name, c.summary, c.narrative, c.search_tsv, c.canon_state, c.updated_at, c.workspace_id, c.world_id, c.saga_id, c.scope, s.id as source_id, null::uuid as source_session_id
  from public.characters c left join public.sources s on s.source_entity_type = 'character' and s.source_entity_id = c.id and s.kind = 'existing_entity'
  union all select 'entity', 'place'::public.entity_type, p.id, 0, p.name, p.summary, p.narrative, p.search_tsv, p.canon_state, p.updated_at, p.workspace_id, p.world_id, p.saga_id, p.scope, s.id, null::uuid from public.places p left join public.sources s on s.source_entity_type = 'place' and s.source_entity_id = p.id and s.kind = 'existing_entity'
  union all select 'entity', 'faction'::public.entity_type, f.id, 0, f.name, f.summary, f.narrative, f.search_tsv, f.canon_state, f.updated_at, f.workspace_id, f.world_id, f.saga_id, f.scope, s.id, null::uuid from public.factions f left join public.sources s on s.source_entity_type = 'faction' and s.source_entity_id = f.id and s.kind = 'existing_entity'
  union all select 'entity', 'artifact'::public.entity_type, a.id, 0, a.name, a.summary, a.narrative, a.search_tsv, a.canon_state, a.updated_at, a.workspace_id, a.world_id, a.saga_id, a.scope, s.id, null::uuid from public.artifacts a left join public.sources s on s.source_entity_type = 'artifact' and s.source_entity_id = a.id and s.kind = 'existing_entity'
  union all select 'entity', 'thread'::public.entity_type, t.id, 0, t.name, t.summary, concat_ws(E'\n\n', t.narrative, t.objective), t.search_tsv, t.canon_state, t.updated_at, t.workspace_id, t.world_id, t.saga_id, t.scope, s.id, null::uuid from public.threads t left join public.sources s on s.source_entity_type = 'thread' and s.source_entity_id = t.id and s.kind = 'existing_entity'
  union all select 'entity', 'session'::public.entity_type, se.id, 0, se.name, se.summary, concat_ws(E'\n\n', se.narrative, se.objective, se.opening_scene), se.search_tsv, 'canon'::public.entity_canon_state, se.updated_at, se.workspace_id, se.world_id, se.saga_id, se.scope, src.id, se.id from public.sessions se left join public.sources src on src.source_entity_type = 'session' and src.source_entity_id = se.id and src.kind = 'existing_entity'
  union all select 'note', null::public.entity_type, n.id, 0, coalesce(n.title, 'Untitled note'), left(n.body, 500), n.body, n.search_tsv, n.canon_state, n.updated_at, n.workspace_id, n.world_id, n.saga_id, n.scope, s.id, s.session_id from public.notes n left join public.sources s on s.note_id = n.id and s.kind = 'note' where n.note_type <> 'gm_note'
),
scoped as (
  select c.*
  from corpus c, effective e
  where public.user_can_access_saga($1, $2, $3)
    and c.workspace_id = $1
    and c.world_id = $2
    and ((e.include_world_canon and c.scope = 'world' and c.saga_id is null) or (c.scope = 'saga' and c.saga_id = $3))
    and c.canon_state <> 'archived'
    and (not ($7 ? 'session_id') or c.source_session_id = ($7 ->> 'session_id')::uuid)
),
ranked as (
  select s.*,
         row_number() over (order by ts_rank_cd(s.search_tsv, q.tsq) desc, s.updated_at desc) as bm25_rank,
         row_number() over (order by extensions.similarity(concat_ws(' ', s.name, s.summary, s.narrative), q.raw) desc, s.updated_at desc) as vector_rank,
         (ts_rank_cd(s.search_tsv, q.tsq)::double precision + extensions.similarity(concat_ws(' ', s.name, s.summary, s.narrative), q.raw)::double precision) as score
  from scoped s, query q
  where q.raw is not null
    and (s.search_tsv @@ q.tsq or s.name ilike '%' || q.raw || '%' or coalesce(s.summary, '') ilike '%' || q.raw || '%' or extensions.similarity(concat_ws(' ', s.name, s.summary, s.narrative), q.raw) > 0)
)
select limited.source_kind,
       limited.source_entity_type,
       limited.source_entity_id,
       limited.chunk_index,
       limited.rrf_score,
       limited.bm25_rank,
       limited.vector_rank,
       limited.source_id,
       limited.canon_state
from (
  select r.source_kind,
         r.source_entity_type,
         r.source_entity_id,
         r.chunk_index,
         r.score as rrf_score,
         r.bm25_rank::integer,
         r.vector_rank::integer,
         r.source_id,
         r.canon_state,
         row_number() over (order by r.score desc, r.source_entity_id) as result_rank,
         e.limit_rows
  from ranked r
  cross join effective e
) limited
where limited.result_rank <= greatest(1, limited.limit_rows)
order by limited.result_rank;
$$;

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

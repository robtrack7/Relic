set check_function_bodies = off;

alter type public.entity_type add value if not exists 'note';

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
        and ((target_scope = 'world' and e.scope = 'world' and e.saga_id is null) or (target_scope = 'saga' and ((e.scope = 'world' and e.saga_id is null) or (e.scope = 'saga' and e.saga_id = target_saga_id))))
    ) into found;
  elsif target_entity_type = 'place' then
    select exists (
      select 1 from public.places e
      where e.id = target_entity_id and e.workspace_id = target_workspace_id and e.world_id = target_world_id
        and ((target_scope = 'world' and e.scope = 'world' and e.saga_id is null) or (target_scope = 'saga' and ((e.scope = 'world' and e.saga_id is null) or (e.scope = 'saga' and e.saga_id = target_saga_id))))
    ) into found;
  elsif target_entity_type = 'faction' then
    select exists (
      select 1 from public.factions e
      where e.id = target_entity_id and e.workspace_id = target_workspace_id and e.world_id = target_world_id
        and ((target_scope = 'world' and e.scope = 'world' and e.saga_id is null) or (target_scope = 'saga' and ((e.scope = 'world' and e.saga_id is null) or (e.scope = 'saga' and e.saga_id = target_saga_id))))
    ) into found;
  elsif target_entity_type = 'artifact' then
    select exists (
      select 1 from public.artifacts e
      where e.id = target_entity_id and e.workspace_id = target_workspace_id and e.world_id = target_world_id
        and ((target_scope = 'world' and e.scope = 'world' and e.saga_id is null) or (target_scope = 'saga' and ((e.scope = 'world' and e.saga_id is null) or (e.scope = 'saga' and e.saga_id = target_saga_id))))
    ) into found;
  elsif target_entity_type = 'thread' then
    select exists (
      select 1 from public.threads e
      where e.id = target_entity_id and e.workspace_id = target_workspace_id and e.world_id = target_world_id
        and ((target_scope = 'world' and e.scope = 'world' and e.saga_id is null) or (target_scope = 'saga' and ((e.scope = 'world' and e.saga_id is null) or (e.scope = 'saga' and e.saga_id = target_saga_id))))
    ) into found;
  elsif target_entity_type = 'session' then
    select exists (
      select 1 from public.sessions e
      where e.id = target_entity_id and e.workspace_id = target_workspace_id and e.world_id = target_world_id
        and target_scope = 'saga' and e.saga_id = target_saga_id
    ) into found;
  elsif target_entity_type = 'note' then
    select exists (
      select 1 from public.notes e
      where e.id = target_entity_id and e.workspace_id = target_workspace_id and e.world_id = target_world_id
        and ((target_scope = 'world' and e.scope = 'world' and e.saga_id is null) or (target_scope = 'saga' and ((e.scope = 'world' and e.saga_id is null) or (e.scope = 'saga' and e.saga_id = target_saga_id))))
    ) into found;
  end if;

  return found;
end;
$$;

create or replace function public.write_manual_canon_source(
  p_workspace_id uuid,
  p_world_id uuid,
  p_saga_id uuid,
  p_scope public.content_scope,
  p_entity_type text,
  p_entity_id uuid,
  p_operation text,
  p_payload jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  inserted_source_id uuid;
  source_excerpt text;
begin
  -- Synthetic GM sources make direct edits citeable without pretending they came from AI or transcript evidence.
  source_excerpt := left(concat('Manual GM ', p_operation, ': ', coalesce(p_payload->>'name', p_payload->>'title', p_entity_id::text)), 1000);

  insert into public.sources (
    workspace_id,
    world_id,
    saga_id,
    scope,
    kind,
    source_entity_type,
    source_entity_id,
    note_id,
    raw_excerpt
  )
  values (
    p_workspace_id,
    p_world_id,
    p_saga_id,
    p_scope,
    'gm_instruction',
    p_entity_type::public.entity_type,
    p_entity_id,
    case when p_entity_type = 'note' then p_entity_id else null end,
    source_excerpt
  )
  returning id into inserted_source_id;

  return inserted_source_id;
end;
$$;

create or replace function public.write_manual_canon_audit(
  p_workspace_id uuid,
  p_world_id uuid,
  p_saga_id uuid,
  p_scope public.content_scope,
  p_entity_type text,
  p_entity_id uuid,
  p_from_state public.entity_canon_state,
  p_to_state public.entity_canon_state,
  p_operation text,
  p_source_id uuid,
  p_payload jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  inserted_audit_id uuid;
begin
  -- Audit is append-only by grant/RLS; this helper keeps source and mutation metadata together.
  insert into public.canon_audit (
    workspace_id,
    world_id,
    saga_id,
    scope,
    entity_type,
    entity_id,
    from_state,
    to_state,
    action,
    actor_kind,
    source_ids,
    change_summary
  )
  values (
    p_workspace_id,
    p_world_id,
    p_saga_id,
    p_scope,
    p_entity_type::public.entity_type,
    p_entity_id,
    p_from_state,
    p_to_state,
    null,
    'gm',
    array[p_source_id],
    jsonb_build_object('operation', p_operation, 'payload', p_payload - 'expected_version')
  )
  returning id into inserted_audit_id;

  return inserted_audit_id;
end;
$$;

drop function if exists public.create_entity(uuid, uuid, uuid, text, public.content_scope, jsonb);
drop function if exists public.update_entity(uuid, uuid, uuid, text, uuid, jsonb);

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
  p_workspace_id alias for $1;
  p_world_id alias for $2;
  p_saga_id alias for $3;
  p_entity_type alias for $4;
  p_entity_scope alias for $5;
  p_payload alias for $6;
  inserted_id uuid;
  source_id uuid;
  row_saga_id uuid := case when p_entity_scope = 'world' then null else p_saga_id end;
begin
  perform public.assert_saga_access(p_workspace_id, p_world_id, p_saga_id);

  if p_entity_type = 'character' then
    insert into public.characters (workspace_id, world_id, saga_id, scope, name, summary, narrative, gm_notes, canon_state, created_by)
    values (p_workspace_id, p_world_id, row_saga_id, p_entity_scope, p_payload->>'name', p_payload->>'summary', p_payload->>'narrative', p_payload->>'gm_notes', 'canon', 'gm')
    returning id into inserted_id;
  elsif p_entity_type = 'place' then
    insert into public.places (workspace_id, world_id, saga_id, scope, name, summary, narrative, gm_notes, canon_state, created_by)
    values (p_workspace_id, p_world_id, row_saga_id, p_entity_scope, p_payload->>'name', p_payload->>'summary', p_payload->>'narrative', p_payload->>'gm_notes', 'canon', 'gm')
    returning id into inserted_id;
  elsif p_entity_type = 'faction' then
    insert into public.factions (workspace_id, world_id, saga_id, scope, name, summary, narrative, gm_notes, canon_state, created_by)
    values (p_workspace_id, p_world_id, row_saga_id, p_entity_scope, p_payload->>'name', p_payload->>'summary', p_payload->>'narrative', p_payload->>'gm_notes', 'canon', 'gm')
    returning id into inserted_id;
  elsif p_entity_type = 'artifact' then
    insert into public.artifacts (workspace_id, world_id, saga_id, scope, name, summary, narrative, gm_notes, canon_state, created_by)
    values (p_workspace_id, p_world_id, row_saga_id, p_entity_scope, p_payload->>'name', p_payload->>'summary', p_payload->>'narrative', p_payload->>'gm_notes', 'canon', 'gm')
    returning id into inserted_id;
  elsif p_entity_type = 'thread' then
    insert into public.threads (workspace_id, world_id, saga_id, scope, name, summary, narrative, gm_notes, canon_state, created_by)
    values (p_workspace_id, p_world_id, row_saga_id, p_entity_scope, p_payload->>'name', p_payload->>'summary', p_payload->>'narrative', p_payload->>'gm_notes', 'canon', 'gm')
    returning id into inserted_id;
  elsif p_entity_type = 'note' then
    insert into public.notes (workspace_id, world_id, saga_id, scope, note_type, title, body, canon_state, created_by)
    values (p_workspace_id, p_world_id, row_saga_id, p_entity_scope, coalesce(nullif(p_payload->>'note_type', ''), 'lore')::public.note_type, p_payload->>'title', coalesce(p_payload->>'body', ''), 'canon', 'gm')
    returning id into inserted_id;
  else
    raise exception 'Unsupported entity type' using errcode = '23514';
  end if;

  source_id := public.write_manual_canon_source(p_workspace_id, p_world_id, row_saga_id, p_entity_scope, p_entity_type, inserted_id, 'create', p_payload);
  perform public.write_manual_canon_audit(p_workspace_id, p_world_id, row_saga_id, p_entity_scope, p_entity_type, inserted_id, null, 'canon', 'create', source_id, p_payload);

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
  p_workspace_id alias for $1;
  p_world_id alias for $2;
  p_saga_id alias for $3;
  p_entity_type alias for $4;
  p_entity_id alias for $5;
  p_payload alias for $6;
  expected_version timestamptz;
  live_updated_at timestamptz;
  from_state public.entity_canon_state;
  row_saga_id uuid;
  row_scope public.content_scope;
  updated_id uuid;
  source_id uuid;
  clean_payload jsonb := p_payload - 'expected_version';
begin
  perform public.assert_saga_access(p_workspace_id, p_world_id, p_saga_id);

  if nullif(p_payload->>'expected_version', '') is null then
    raise exception 'expected_version is required' using errcode = '22023';
  end if;
  expected_version := (p_payload->>'expected_version')::timestamptz;

  if p_entity_type = 'character' then
    select e.updated_at, e.canon_state, e.saga_id, e.scope into live_updated_at, from_state, row_saga_id, row_scope from public.characters e where e.id = p_entity_id and e.workspace_id = p_workspace_id and e.world_id = p_world_id and (e.saga_id = p_saga_id or (e.scope = 'world' and e.saga_id is null)) for update;
    if live_updated_at is not null and live_updated_at = expected_version then
      update public.characters e set name = clean_payload->>'name', summary = clean_payload->>'summary', narrative = clean_payload->>'narrative', gm_notes = clean_payload->>'gm_notes', updated_at = now() where e.id = p_entity_id returning e.id into updated_id;
    end if;
  elsif p_entity_type = 'place' then
    select e.updated_at, e.canon_state, e.saga_id, e.scope into live_updated_at, from_state, row_saga_id, row_scope from public.places e where e.id = p_entity_id and e.workspace_id = p_workspace_id and e.world_id = p_world_id and (e.saga_id = p_saga_id or (e.scope = 'world' and e.saga_id is null)) for update;
    if live_updated_at is not null and live_updated_at = expected_version then
      update public.places e set name = clean_payload->>'name', summary = clean_payload->>'summary', narrative = clean_payload->>'narrative', gm_notes = clean_payload->>'gm_notes', updated_at = now() where e.id = p_entity_id returning e.id into updated_id;
    end if;
  elsif p_entity_type = 'faction' then
    select e.updated_at, e.canon_state, e.saga_id, e.scope into live_updated_at, from_state, row_saga_id, row_scope from public.factions e where e.id = p_entity_id and e.workspace_id = p_workspace_id and e.world_id = p_world_id and (e.saga_id = p_saga_id or (e.scope = 'world' and e.saga_id is null)) for update;
    if live_updated_at is not null and live_updated_at = expected_version then
      update public.factions e set name = clean_payload->>'name', summary = clean_payload->>'summary', narrative = clean_payload->>'narrative', gm_notes = clean_payload->>'gm_notes', updated_at = now() where e.id = p_entity_id returning e.id into updated_id;
    end if;
  elsif p_entity_type = 'artifact' then
    select e.updated_at, e.canon_state, e.saga_id, e.scope into live_updated_at, from_state, row_saga_id, row_scope from public.artifacts e where e.id = p_entity_id and e.workspace_id = p_workspace_id and e.world_id = p_world_id and (e.saga_id = p_saga_id or (e.scope = 'world' and e.saga_id is null)) for update;
    if live_updated_at is not null and live_updated_at = expected_version then
      update public.artifacts e set name = clean_payload->>'name', summary = clean_payload->>'summary', narrative = clean_payload->>'narrative', gm_notes = clean_payload->>'gm_notes', updated_at = now() where e.id = p_entity_id returning e.id into updated_id;
    end if;
  elsif p_entity_type = 'thread' then
    select e.updated_at, e.canon_state, e.saga_id, e.scope into live_updated_at, from_state, row_saga_id, row_scope from public.threads e where e.id = p_entity_id and e.workspace_id = p_workspace_id and e.world_id = p_world_id and (e.saga_id = p_saga_id or (e.scope = 'world' and e.saga_id is null)) for update;
    if live_updated_at is not null and live_updated_at = expected_version then
      update public.threads e set name = clean_payload->>'name', summary = clean_payload->>'summary', narrative = clean_payload->>'narrative', gm_notes = clean_payload->>'gm_notes', updated_at = now() where e.id = p_entity_id returning e.id into updated_id;
    end if;
  elsif p_entity_type = 'note' then
    select e.updated_at, e.canon_state, e.saga_id, e.scope into live_updated_at, from_state, row_saga_id, row_scope from public.notes e where e.id = p_entity_id and e.workspace_id = p_workspace_id and e.world_id = p_world_id and (e.saga_id = p_saga_id or (e.scope = 'world' and e.saga_id is null)) for update;
    if live_updated_at is not null and live_updated_at = expected_version then
      update public.notes e set title = clean_payload->>'title', body = coalesce(clean_payload->>'body', ''), updated_at = now() where e.id = p_entity_id returning e.id into updated_id;
    end if;
  else
    raise exception 'Unsupported entity type' using errcode = '23514';
  end if;

  if live_updated_at is null then
    raise exception 'Entity is not available' using errcode = '42501';
  end if;
  if updated_id is null then
    raise exception 'conflict: expected_version does not match live entity version' using errcode = '40001';
  end if;

  source_id := public.write_manual_canon_source(p_workspace_id, p_world_id, row_saga_id, row_scope, p_entity_type, p_entity_id, 'update', clean_payload);
  perform public.write_manual_canon_audit(p_workspace_id, p_world_id, row_saga_id, row_scope, p_entity_type, p_entity_id, from_state, from_state, 'update', source_id, clean_payload);

  return updated_id;
end;
$$;

drop function if exists public.archive_entity(uuid, uuid, uuid, text, uuid);

create or replace function public.archive_entity(
  workspace_id uuid,
  world_id uuid,
  saga_id uuid,
  entity_type text,
  entity_id uuid,
  expected_version timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  p_workspace_id alias for $1;
  p_world_id alias for $2;
  p_saga_id alias for $3;
  p_entity_type alias for $4;
  p_entity_id alias for $5;
  p_expected_version alias for $6;
  live_updated_at timestamptz;
  from_state public.entity_canon_state;
  row_saga_id uuid;
  row_scope public.content_scope;
  updated_id uuid;
  source_id uuid;
begin
  perform public.assert_saga_access(p_workspace_id, p_world_id, p_saga_id);

  if p_expected_version is null then
    raise exception 'expected_version is required' using errcode = '22023';
  end if;

  if p_entity_type = 'character' then
    select e.updated_at, e.canon_state, e.saga_id, e.scope into live_updated_at, from_state, row_saga_id, row_scope from public.characters e where e.id = p_entity_id and e.workspace_id = p_workspace_id and e.world_id = p_world_id and (e.saga_id = p_saga_id or (e.scope = 'world' and e.saga_id is null)) for update;
    if live_updated_at is not null and live_updated_at = p_expected_version then update public.characters e set canon_state = 'archived', status = 'archived', updated_at = now() where e.id = p_entity_id returning e.id into updated_id; end if;
  elsif p_entity_type = 'place' then
    select e.updated_at, e.canon_state, e.saga_id, e.scope into live_updated_at, from_state, row_saga_id, row_scope from public.places e where e.id = p_entity_id and e.workspace_id = p_workspace_id and e.world_id = p_world_id and (e.saga_id = p_saga_id or (e.scope = 'world' and e.saga_id is null)) for update;
    if live_updated_at is not null and live_updated_at = p_expected_version then update public.places e set canon_state = 'archived', status = 'archived', updated_at = now() where e.id = p_entity_id returning e.id into updated_id; end if;
  elsif p_entity_type = 'faction' then
    select e.updated_at, e.canon_state, e.saga_id, e.scope into live_updated_at, from_state, row_saga_id, row_scope from public.factions e where e.id = p_entity_id and e.workspace_id = p_workspace_id and e.world_id = p_world_id and (e.saga_id = p_saga_id or (e.scope = 'world' and e.saga_id is null)) for update;
    if live_updated_at is not null and live_updated_at = p_expected_version then update public.factions e set canon_state = 'archived', status = 'archived', updated_at = now() where e.id = p_entity_id returning e.id into updated_id; end if;
  elsif p_entity_type = 'artifact' then
    select e.updated_at, e.canon_state, e.saga_id, e.scope into live_updated_at, from_state, row_saga_id, row_scope from public.artifacts e where e.id = p_entity_id and e.workspace_id = p_workspace_id and e.world_id = p_world_id and (e.saga_id = p_saga_id or (e.scope = 'world' and e.saga_id is null)) for update;
    if live_updated_at is not null and live_updated_at = p_expected_version then update public.artifacts e set canon_state = 'archived', status = 'archived', updated_at = now() where e.id = p_entity_id returning e.id into updated_id; end if;
  elsif p_entity_type = 'thread' then
    select e.updated_at, e.canon_state, e.saga_id, e.scope into live_updated_at, from_state, row_saga_id, row_scope from public.threads e where e.id = p_entity_id and e.workspace_id = p_workspace_id and e.world_id = p_world_id and (e.saga_id = p_saga_id or (e.scope = 'world' and e.saga_id is null)) for update;
    if live_updated_at is not null and live_updated_at = p_expected_version then update public.threads e set canon_state = 'archived', status = 'archived', updated_at = now() where e.id = p_entity_id returning e.id into updated_id; end if;
  elsif p_entity_type = 'note' then
    select e.updated_at, e.canon_state, e.saga_id, e.scope into live_updated_at, from_state, row_saga_id, row_scope from public.notes e where e.id = p_entity_id and e.workspace_id = p_workspace_id and e.world_id = p_world_id and (e.saga_id = p_saga_id or (e.scope = 'world' and e.saga_id is null)) for update;
    if live_updated_at is not null and live_updated_at = p_expected_version then update public.notes e set canon_state = 'archived', updated_at = now() where e.id = p_entity_id returning e.id into updated_id; end if;
  else
    raise exception 'Unsupported entity type' using errcode = '23514';
  end if;

  if live_updated_at is null then
    raise exception 'Entity is not available' using errcode = '42501';
  end if;
  if updated_id is null then
    raise exception 'conflict: expected_version does not match live entity version' using errcode = '40001';
  end if;

  source_id := public.write_manual_canon_source(p_workspace_id, p_world_id, row_saga_id, row_scope, p_entity_type, p_entity_id, 'archive', '{}'::jsonb);
  perform public.write_manual_canon_audit(p_workspace_id, p_world_id, row_saga_id, row_scope, p_entity_type, p_entity_id, from_state, 'archived', 'archive', source_id, '{}'::jsonb);

  return updated_id;
end;
$$;

revoke execute on function public.scoped_entity_exists(public.entity_type, uuid, uuid, uuid, uuid, public.content_scope) from PUBLIC, anon, authenticated;
revoke execute on function public.write_manual_canon_source(uuid, uuid, uuid, public.content_scope, text, uuid, text, jsonb) from PUBLIC, anon, authenticated;
revoke execute on function public.write_manual_canon_audit(uuid, uuid, uuid, public.content_scope, text, uuid, public.entity_canon_state, public.entity_canon_state, text, uuid, jsonb) from PUBLIC, anon, authenticated;

revoke execute on function public.create_entity(uuid, uuid, uuid, text, public.content_scope, jsonb) from PUBLIC, anon;
revoke execute on function public.update_entity(uuid, uuid, uuid, text, uuid, jsonb) from PUBLIC, anon;
revoke execute on function public.archive_entity(uuid, uuid, uuid, text, uuid, timestamptz) from PUBLIC, anon;

grant execute on function public.create_entity(uuid, uuid, uuid, text, public.content_scope, jsonb) to authenticated;
grant execute on function public.update_entity(uuid, uuid, uuid, text, uuid, jsonb) to authenticated;
grant execute on function public.archive_entity(uuid, uuid, uuid, text, uuid, timestamptz) to authenticated;

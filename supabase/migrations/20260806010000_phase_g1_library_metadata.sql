-- Phase G1: normal Library metadata editing.
-- Tags and descriptive status remain GM-authored canon, travel through the same
-- optimistic update/audit boundary, and refresh retrieval freshness.

create or replace function internal.queue_entity_embedding_trigger()
returns trigger
language plpgsql
security definer
set search_path = public, internal, pg_temp
as $$
declare
  entity_type public.entity_type := tg_argv[0]::public.entity_type;
  should_queue boolean := false;
begin
  if tg_op = 'INSERT' then
    should_queue := new.canon_state <> 'archived';
  elsif entity_type = 'thread' then
    should_queue := new.name is distinct from old.name
      or new.summary is distinct from old.summary
      or new.narrative is distinct from old.narrative
      or new.gm_notes is distinct from old.gm_notes
      or new.status is distinct from old.status
      or new.tags is distinct from old.tags
      or new.objective is distinct from old.objective
      or new.canon_state is distinct from old.canon_state;
  else
    should_queue := new.name is distinct from old.name
      or new.summary is distinct from old.summary
      or new.narrative is distinct from old.narrative
      or new.gm_notes is distinct from old.gm_notes
      or new.status is distinct from old.status
      or new.tags is distinct from old.tags
      or new.canon_state is distinct from old.canon_state;
  end if;

  if should_queue and new.canon_state <> 'archived' then
    perform internal.enqueue_embedding_job(new.workspace_id, new.world_id, new.saga_id, 'entity', entity_type, new.id, null);
  end if;
  return new;
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
set search_path = ''
as $$
#variable_conflict use_variable
declare
  table_name text := internal.library_table(entity_type);
  expected_version timestamptz;
  record_row jsonb;
  updated_id uuid;
  source_id uuid;
  clean_payload jsonb := payload - 'expected_version';
  clean_status text;
  clean_tags text[];
begin
  perform public.assert_saga_access(workspace_id, world_id, saga_id);
  if table_name is null then raise exception 'Unsupported entity type' using errcode = '23514'; end if;
  if nullif(payload->>'expected_version', '') is null then
    raise exception 'expected_version is required' using errcode = '22023';
  end if;
  expected_version := (payload->>'expected_version')::timestamptz;
  record_row := internal.library_record(workspace_id, world_id, saga_id, entity_type, entity_id);
  if record_row is null then raise exception 'Entity is not available' using errcode = '42501'; end if;

  if entity_type = 'note' then
    update public.notes n
    set title = clean_payload->>'title', body = coalesce(clean_payload->>'body', ''), updated_at = now()
    where n.id = entity_id and n.workspace_id = workspace_id and n.world_id = world_id
      and (n.saga_id = saga_id or (n.scope = 'world' and n.saga_id is null))
      and n.updated_at = expected_version
    returning n.id into updated_id;
  else
    if payload ? 'status' then
      if jsonb_typeof(payload->'status') <> 'string' then raise exception 'status must be text' using errcode = '22023'; end if;
      clean_status := trim(payload->>'status');
    else
      clean_status := record_row->>'status';
    end if;
    if clean_status = '' or char_length(clean_status) > 80 then
      raise exception 'status must contain 1 to 80 characters' using errcode = '22023';
    end if;

    if payload ? 'tags' then
      if jsonb_typeof(payload->'tags') <> 'array'
        or jsonb_array_length(payload->'tags') > 12
        or exists (select 1 from jsonb_array_elements(payload->'tags') tag where jsonb_typeof(tag) <> 'string')
        or exists (select 1 from jsonb_array_elements_text(payload->'tags') tag where char_length(tag) > 50 or tag !~ '^[a-z0-9]+(-[a-z0-9]+)*$') then
        raise exception 'tags must be at most 12 lowercase kebab-case values of 50 characters or fewer' using errcode = '22023';
      end if;
      select coalesce(array_agg(tag order by first_position), '{}'::text[])
      into clean_tags
      from (
        select tag, min(position) first_position
        from jsonb_array_elements_text(payload->'tags') with ordinality values_with_position(tag, position)
        group by tag
      ) unique_tags;
    else
      select coalesce(array_agg(tag order by position), '{}'::text[])
      into clean_tags
      from jsonb_array_elements_text(coalesce(record_row->'tags', '[]'::jsonb)) with ordinality existing_tags(tag, position);
    end if;

    clean_payload := jsonb_set(jsonb_set(clean_payload, '{status}', to_jsonb(clean_status), true), '{tags}', to_jsonb(clean_tags), true);
    execute format(
      'update public.%I e set name=$1,summary=$2,narrative=$3,gm_notes=$4,status=$5,tags=$6,updated_at=now() where e.id=$7 and e.workspace_id=$8 and e.world_id=$9 and (e.saga_id=$10 or (e.scope=''world'' and e.saga_id is null)) and e.updated_at=$11 returning e.id',
      table_name
    ) into updated_id using clean_payload->>'name', clean_payload->>'summary', clean_payload->>'narrative', clean_payload->>'gm_notes', clean_status, clean_tags, entity_id, workspace_id, world_id, saga_id, expected_version;
  end if;

  if updated_id is null then
    raise exception 'conflict: expected_version does not match live entity version' using errcode = '40001';
  end if;

  source_id := public.write_manual_canon_source(
    workspace_id, world_id, (record_row->>'saga_id')::uuid, (record_row->>'scope')::public.content_scope,
    entity_type, entity_id, 'update', clean_payload
  );
  perform public.write_manual_canon_audit(
    workspace_id, world_id, (record_row->>'saga_id')::uuid, (record_row->>'scope')::public.content_scope,
    entity_type, entity_id, (record_row->>'canon_state')::public.entity_canon_state,
    (record_row->>'canon_state')::public.entity_canon_state, 'update', source_id, clean_payload
  );
  return updated_id;
end;
$$;

revoke all on function public.update_entity(uuid, uuid, uuid, text, uuid, jsonb) from public, anon;
grant execute on function public.update_entity(uuid, uuid, uuid, text, uuid, jsonb) to authenticated;

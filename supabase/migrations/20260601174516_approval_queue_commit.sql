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
  p_workspace_id alias for $1;
  p_world_id alias for $2;
  p_saga_id alias for $3;
  p_draft_id alias for $4;
  p_state alias for $5;
  p_rejection_note alias for $6;
  d record;
  payload jsonb;
  inserted_id uuid;
  live_updated_at timestamptz;
  from_state public.entity_canon_state;
  row_saga_id uuid;
  row_scope public.content_scope;
  source_ids uuid[] := '{}';
  v_merge_target_id uuid;
  merge_expected_version timestamptz;
begin
  perform public.assert_saga_access(p_workspace_id, p_world_id, p_saga_id);

  if p_state not in ('approved', 'rejected', 'merged', 'superseded') then
    raise exception 'Unsupported draft state' using errcode = '23514';
  end if;

  select *
  into d
  from public.drafts draft
  where draft.id = p_draft_id
    and draft.workspace_id = p_workspace_id
    and draft.world_id = p_world_id
    and draft.saga_id = p_saga_id
  for update;

  if d.id is null then
    raise exception 'Draft is not available' using errcode = '42501';
  end if;
  if d.state <> 'pending' then
    raise exception 'Draft is already resolved' using errcode = '23514';
  end if;

  if p_state = 'rejected' then
    update public.drafts draft
    set state = 'rejected',
        rejection_note = nullif(p_rejection_note, ''),
        resolved_at = now(),
        updated_at = now()
    where draft.id = p_draft_id;
    return p_draft_id;
  end if;

  if p_state = 'merged' then
    v_merge_target_id := coalesce(d.merge_target_id, nullif(d.proposed_payload->>'merge_target_id', '')::uuid);

    if v_merge_target_id is not null then
      if d.entity_type::text = 'character' then
        select e.updated_at into merge_expected_version from public.characters e where e.id = v_merge_target_id and e.workspace_id = p_workspace_id and e.world_id = p_world_id and (e.saga_id = p_saga_id or (e.scope = 'world' and e.saga_id is null));
      elsif d.entity_type::text = 'place' then
        select e.updated_at into merge_expected_version from public.places e where e.id = v_merge_target_id and e.workspace_id = p_workspace_id and e.world_id = p_world_id and (e.saga_id = p_saga_id or (e.scope = 'world' and e.saga_id is null));
      elsif d.entity_type::text = 'faction' then
        select e.updated_at into merge_expected_version from public.factions e where e.id = v_merge_target_id and e.workspace_id = p_workspace_id and e.world_id = p_world_id and (e.saga_id = p_saga_id or (e.scope = 'world' and e.saga_id is null));
      elsif d.entity_type::text = 'artifact' then
        select e.updated_at into merge_expected_version from public.artifacts e where e.id = v_merge_target_id and e.workspace_id = p_workspace_id and e.world_id = p_world_id and (e.saga_id = p_saga_id or (e.scope = 'world' and e.saga_id is null));
      elsif d.entity_type::text = 'thread' then
        select e.updated_at into merge_expected_version from public.threads e where e.id = v_merge_target_id and e.workspace_id = p_workspace_id and e.world_id = p_world_id and (e.saga_id = p_saga_id or (e.scope = 'world' and e.saga_id is null));
      elsif d.entity_type::text = 'note' then
        select e.updated_at into merge_expected_version from public.notes e where e.id = v_merge_target_id and e.workspace_id = p_workspace_id and e.world_id = p_world_id and (e.saga_id = p_saga_id or (e.scope = 'world' and e.saga_id is null));
      end if;

      if merge_expected_version is null then
        raise exception 'Merge target is not available' using errcode = '42501';
      end if;

      -- Merge is an identity decision; any field carry-over must be reviewed as a new update draft.
      insert into public.drafts (workspace_id, world_id, saga_id, scope, entity_type, target_entity_id, state, change_kind, proposed_payload, expected_version, confidence_band, confidence_reason, created_by)
      values (p_workspace_id, p_world_id, d.saga_id, d.scope, d.entity_type, v_merge_target_id, 'pending', 'update', coalesce(d.proposed_payload->'target_update_payload', '{}'::jsonb), merge_expected_version, d.confidence_band, d.confidence_reason, 'gm_via_ai_approval');
    end if;

    update public.drafts draft
    set state = 'merged',
        merge_target_id = v_merge_target_id,
        resolved_at = now(),
        updated_at = now()
    where draft.id = p_draft_id;
    return p_draft_id;
  end if;

  if p_state = 'superseded' then
    update public.drafts draft
    set state = 'superseded',
        resolved_at = now(),
        updated_at = now()
    where draft.id = p_draft_id;
    return p_draft_id;
  end if;

  payload := coalesce(d.committed_payload, d.proposed_payload);

  select coalesce(array_agg(ds.source_id order by ds.created_at), '{}') into source_ids
  from public.draft_sources ds
  where ds.draft_id = p_draft_id;

  if d.change_kind = 'create' then
    if d.entity_type::text = 'character' then
      insert into public.characters (workspace_id, world_id, saga_id, scope, name, summary, narrative, gm_notes, canon_state, created_by)
      values (p_workspace_id, p_world_id, d.saga_id, d.scope, payload->>'name', payload->>'summary', payload->>'narrative', payload->>'gm_notes', 'canon', 'gm_via_ai_approval')
      returning id into inserted_id;
    elsif d.entity_type::text = 'place' then
      insert into public.places (workspace_id, world_id, saga_id, scope, name, summary, narrative, gm_notes, canon_state, created_by)
      values (p_workspace_id, p_world_id, d.saga_id, d.scope, payload->>'name', payload->>'summary', payload->>'narrative', payload->>'gm_notes', 'canon', 'gm_via_ai_approval')
      returning id into inserted_id;
    elsif d.entity_type::text = 'faction' then
      insert into public.factions (workspace_id, world_id, saga_id, scope, name, summary, narrative, gm_notes, canon_state, created_by)
      values (p_workspace_id, p_world_id, d.saga_id, d.scope, payload->>'name', payload->>'summary', payload->>'narrative', payload->>'gm_notes', 'canon', 'gm_via_ai_approval')
      returning id into inserted_id;
    elsif d.entity_type::text = 'artifact' then
      insert into public.artifacts (workspace_id, world_id, saga_id, scope, name, summary, narrative, gm_notes, canon_state, created_by)
      values (p_workspace_id, p_world_id, d.saga_id, d.scope, payload->>'name', payload->>'summary', payload->>'narrative', payload->>'gm_notes', 'canon', 'gm_via_ai_approval')
      returning id into inserted_id;
    elsif d.entity_type::text = 'thread' then
      insert into public.threads (workspace_id, world_id, saga_id, scope, name, summary, narrative, gm_notes, canon_state, created_by)
      values (p_workspace_id, p_world_id, d.saga_id, d.scope, payload->>'name', payload->>'summary', payload->>'narrative', payload->>'gm_notes', 'canon', 'gm_via_ai_approval')
      returning id into inserted_id;
    elsif d.entity_type::text = 'note' then
      insert into public.notes (workspace_id, world_id, saga_id, scope, note_type, title, body, canon_state, created_by)
      values (p_workspace_id, p_world_id, d.saga_id, d.scope, coalesce(nullif(payload->>'note_type', ''), 'lore')::public.note_type, payload->>'title', coalesce(payload->>'body', ''), 'canon', 'gm_via_ai_approval')
      returning id into inserted_id;
    else
      raise exception 'Unsupported entity type' using errcode = '23514';
    end if;

    insert into public.canon_audit (workspace_id, world_id, saga_id, scope, entity_type, entity_id, draft_id, from_state, to_state, action, actor_kind, source_ids, change_summary)
    values (p_workspace_id, p_world_id, d.saga_id, d.scope, d.entity_type, inserted_id, p_draft_id, null, 'canon', 'approve', 'gm_via_ai_approval', source_ids, jsonb_build_object('operation', 'approve_create', 'payload', payload));

  elsif d.change_kind in ('update', 'archive_request') then
    if d.expected_version is null then
      raise exception 'expected_version is required' using errcode = '22023';
    end if;

    if d.entity_type::text = 'character' then
      select e.updated_at, e.canon_state, e.saga_id, e.scope into live_updated_at, from_state, row_saga_id, row_scope from public.characters e where e.id = d.target_entity_id and e.workspace_id = p_workspace_id and e.world_id = p_world_id and (e.saga_id = p_saga_id or (e.scope = 'world' and e.saga_id is null)) for update;
      if live_updated_at = d.expected_version and d.change_kind = 'update' then update public.characters e set name = coalesce(payload->>'name', e.name), summary = coalesce(payload->>'summary', e.summary), narrative = coalesce(payload->>'narrative', e.narrative), gm_notes = coalesce(payload->>'gm_notes', e.gm_notes), updated_at = now() where e.id = d.target_entity_id returning e.id into inserted_id; end if;
      if live_updated_at = d.expected_version and d.change_kind = 'archive_request' then update public.characters e set canon_state = 'archived', status = 'archived', updated_at = now() where e.id = d.target_entity_id returning e.id into inserted_id; end if;
    elsif d.entity_type::text = 'place' then
      select e.updated_at, e.canon_state, e.saga_id, e.scope into live_updated_at, from_state, row_saga_id, row_scope from public.places e where e.id = d.target_entity_id and e.workspace_id = p_workspace_id and e.world_id = p_world_id and (e.saga_id = p_saga_id or (e.scope = 'world' and e.saga_id is null)) for update;
      if live_updated_at = d.expected_version and d.change_kind = 'update' then update public.places e set name = coalesce(payload->>'name', e.name), summary = coalesce(payload->>'summary', e.summary), narrative = coalesce(payload->>'narrative', e.narrative), gm_notes = coalesce(payload->>'gm_notes', e.gm_notes), updated_at = now() where e.id = d.target_entity_id returning e.id into inserted_id; end if;
      if live_updated_at = d.expected_version and d.change_kind = 'archive_request' then update public.places e set canon_state = 'archived', status = 'archived', updated_at = now() where e.id = d.target_entity_id returning e.id into inserted_id; end if;
    elsif d.entity_type::text = 'faction' then
      select e.updated_at, e.canon_state, e.saga_id, e.scope into live_updated_at, from_state, row_saga_id, row_scope from public.factions e where e.id = d.target_entity_id and e.workspace_id = p_workspace_id and e.world_id = p_world_id and (e.saga_id = p_saga_id or (e.scope = 'world' and e.saga_id is null)) for update;
      if live_updated_at = d.expected_version and d.change_kind = 'update' then update public.factions e set name = coalesce(payload->>'name', e.name), summary = coalesce(payload->>'summary', e.summary), narrative = coalesce(payload->>'narrative', e.narrative), gm_notes = coalesce(payload->>'gm_notes', e.gm_notes), updated_at = now() where e.id = d.target_entity_id returning e.id into inserted_id; end if;
      if live_updated_at = d.expected_version and d.change_kind = 'archive_request' then update public.factions e set canon_state = 'archived', status = 'archived', updated_at = now() where e.id = d.target_entity_id returning e.id into inserted_id; end if;
    elsif d.entity_type::text = 'artifact' then
      select e.updated_at, e.canon_state, e.saga_id, e.scope into live_updated_at, from_state, row_saga_id, row_scope from public.artifacts e where e.id = d.target_entity_id and e.workspace_id = p_workspace_id and e.world_id = p_world_id and (e.saga_id = p_saga_id or (e.scope = 'world' and e.saga_id is null)) for update;
      if live_updated_at = d.expected_version and d.change_kind = 'update' then update public.artifacts e set name = coalesce(payload->>'name', e.name), summary = coalesce(payload->>'summary', e.summary), narrative = coalesce(payload->>'narrative', e.narrative), gm_notes = coalesce(payload->>'gm_notes', e.gm_notes), updated_at = now() where e.id = d.target_entity_id returning e.id into inserted_id; end if;
      if live_updated_at = d.expected_version and d.change_kind = 'archive_request' then update public.artifacts e set canon_state = 'archived', status = 'archived', updated_at = now() where e.id = d.target_entity_id returning e.id into inserted_id; end if;
    elsif d.entity_type::text = 'thread' then
      select e.updated_at, e.canon_state, e.saga_id, e.scope into live_updated_at, from_state, row_saga_id, row_scope from public.threads e where e.id = d.target_entity_id and e.workspace_id = p_workspace_id and e.world_id = p_world_id and (e.saga_id = p_saga_id or (e.scope = 'world' and e.saga_id is null)) for update;
      if live_updated_at = d.expected_version and d.change_kind = 'update' then update public.threads e set name = coalesce(payload->>'name', e.name), summary = coalesce(payload->>'summary', e.summary), narrative = coalesce(payload->>'narrative', e.narrative), gm_notes = coalesce(payload->>'gm_notes', e.gm_notes), updated_at = now() where e.id = d.target_entity_id returning e.id into inserted_id; end if;
      if live_updated_at = d.expected_version and d.change_kind = 'archive_request' then update public.threads e set canon_state = 'archived', status = 'archived', updated_at = now() where e.id = d.target_entity_id returning e.id into inserted_id; end if;
    elsif d.entity_type::text = 'note' then
      select e.updated_at, e.canon_state, e.saga_id, e.scope into live_updated_at, from_state, row_saga_id, row_scope from public.notes e where e.id = d.target_entity_id and e.workspace_id = p_workspace_id and e.world_id = p_world_id and (e.saga_id = p_saga_id or (e.scope = 'world' and e.saga_id is null)) for update;
      if live_updated_at = d.expected_version and d.change_kind = 'update' then update public.notes e set title = coalesce(payload->>'title', e.title), body = coalesce(payload->>'body', e.body), updated_at = now() where e.id = d.target_entity_id returning e.id into inserted_id; end if;
      if live_updated_at = d.expected_version and d.change_kind = 'archive_request' then update public.notes e set canon_state = 'archived', updated_at = now() where e.id = d.target_entity_id returning e.id into inserted_id; end if;
    else
      raise exception 'Unsupported entity type' using errcode = '23514';
    end if;

    if live_updated_at is null then
      raise exception 'Entity is not available' using errcode = '42501';
    end if;
    if inserted_id is null then
      raise exception 'conflict: expected_version does not match live entity version' using errcode = '40001';
    end if;

    insert into public.canon_audit (workspace_id, world_id, saga_id, scope, entity_type, entity_id, draft_id, from_state, to_state, action, actor_kind, source_ids, change_summary)
    values (p_workspace_id, p_world_id, row_saga_id, row_scope, d.entity_type, inserted_id, p_draft_id, from_state, case when d.change_kind = 'archive_request' then 'archived' else from_state end, 'approve', 'gm_via_ai_approval', source_ids, jsonb_build_object('operation', 'approve_' || d.change_kind::text, 'payload', payload));
  else
    raise exception 'Unsupported draft change_kind' using errcode = '23514';
  end if;

  update public.drafts draft
  set state = 'approved',
      target_entity_id = coalesce(d.target_entity_id, inserted_id),
      committed_payload = payload,
      resolved_at = now(),
      updated_at = now()
  where draft.id = p_draft_id;

  return p_draft_id;
end;
$$;

revoke execute on function public.update_draft_state(uuid, uuid, uuid, uuid, public.draft_state, text) from PUBLIC, anon;
grant execute on function public.update_draft_state(uuid, uuid, uuid, uuid, public.draft_state, text) to authenticated;

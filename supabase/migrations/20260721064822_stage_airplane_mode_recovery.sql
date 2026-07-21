alter table public.sessions alter column consent_state set default 'unset';
update public.sessions set consent_state = 'unset' where consent_state = 'unknown';

create or replace function public.storage_path_allowed(path text)
returns boolean
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  path_workspace_id uuid;
  path_world_id uuid;
  path_saga_id uuid;
begin
  path_workspace_id := public.storage_path_segment(path, 1)::uuid;
  path_world_id := public.storage_path_segment(path, 2)::uuid;
  path_saga_id := public.storage_path_segment(path, 3)::uuid;

  return public.user_can_access_saga(path_workspace_id, path_world_id, path_saga_id);
exception when invalid_text_representation or null_value_not_allowed then
  return false;
end;
$$;

alter table internal.stage_write_receipts
  drop constraint stage_write_receipts_intent_kind_check;

alter table internal.stage_write_receipts
  add constraint stage_write_receipts_intent_kind_check
  check (intent_kind in (
    'start_session',
    'quick_capture',
    'quick_stub',
    'record_consent',
    'go_live',
    'mark_moment',
    'end_session',
    'undo_end_session'
  ));

create or replace function public.apply_stage_write_intent(
  workspace_id uuid,
  world_id uuid,
  saga_id uuid,
  session_id uuid,
  idempotency_key text,
  intent_kind text,
  payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  normalized_key text := btrim(apply_stage_write_intent.idempotency_key);
  normalized_payload jsonb := coalesce(apply_stage_write_intent.payload, '{}'::jsonb);
  existing internal.stage_write_receipts%rowtype;
  result_id uuid;
  result_payload jsonb;
  requested_at timestamptz;
  server_status public.session_status;
  server_consent text;
  expected_value text;
  target_value text;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if normalized_key is null or length(normalized_key) not between 1 and 255 then
    raise exception 'A valid idempotency key is required' using errcode = '23514';
  end if;
  if apply_stage_write_intent.intent_kind not in (
    'start_session', 'quick_capture', 'quick_stub', 'record_consent',
    'go_live', 'mark_moment', 'end_session', 'undo_end_session'
  ) then
    raise exception 'Unsupported Stage write intent' using errcode = '23514';
  end if;
  if jsonb_typeof(normalized_payload) <> 'object' then
    raise exception 'Stage write payload must be an object' using errcode = '23514';
  end if;

  perform public.assert_saga_access(
    apply_stage_write_intent.workspace_id,
    apply_stage_write_intent.world_id,
    apply_stage_write_intent.saga_id
  );

  select s.status, s.consent_state
  into server_status, server_consent
  from public.sessions s
  where s.id = apply_stage_write_intent.session_id
    and s.workspace_id = apply_stage_write_intent.workspace_id
    and s.world_id = apply_stage_write_intent.world_id
    and s.saga_id = apply_stage_write_intent.saga_id
  for update;

  if not found then
    raise exception 'Session is not available' using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(caller_id::text || ':' || normalized_key, 0));

  select receipt.* into existing
  from internal.stage_write_receipts receipt
  where receipt.gm_id = caller_id
    and receipt.idempotency_key = normalized_key;

  if found then
    if existing.workspace_id <> apply_stage_write_intent.workspace_id
      or existing.world_id <> apply_stage_write_intent.world_id
      or existing.saga_id <> apply_stage_write_intent.saga_id
      or existing.session_id <> apply_stage_write_intent.session_id
      or existing.intent_kind <> apply_stage_write_intent.intent_kind
      or existing.payload <> normalized_payload
    then
      raise exception 'Idempotency key was already used for a different Stage write' using errcode = '23514';
    end if;
    return existing.result;
  end if;

  if apply_stage_write_intent.intent_kind = 'start_session' then
    expected_value := coalesce(nullif(normalized_payload->>'expected_status', ''), 'ready');
    if server_status::text <> expected_value then
      result_payload := jsonb_build_object(
        'outcome', 'conflict',
        'intent_kind', apply_stage_write_intent.intent_kind,
        'local_value', jsonb_build_object('expected_status', expected_value, 'target_status', 'started'),
        'server_value', jsonb_build_object('status', server_status, 'consent_state', server_consent),
        'message', 'Session state changed while Stage was offline.'
      );
    else
      result_id := public.set_session_status($1, $2, $3, apply_stage_write_intent.session_id, 'started');
      result_payload := jsonb_build_object('outcome', 'applied', 'id', result_id, 'intent_kind', apply_stage_write_intent.intent_kind, 'status', 'started');
    end if;
  elsif apply_stage_write_intent.intent_kind = 'quick_capture' then
    result_id := public.quick_capture($1, $2, $3, apply_stage_write_intent.session_id, normalized_payload->>'body', nullif(normalized_payload->>'title', ''));
    result_payload := jsonb_build_object('outcome', 'applied', 'id', result_id, 'intent_kind', apply_stage_write_intent.intent_kind);
  elsif apply_stage_write_intent.intent_kind = 'quick_stub' then
    result_id := public.quick_stub($1, $2, $3, apply_stage_write_intent.session_id, normalized_payload->>'entity_type', normalized_payload->>'name', nullif(normalized_payload->>'summary', ''));
    result_payload := jsonb_build_object('outcome', 'applied', 'id', result_id, 'intent_kind', apply_stage_write_intent.intent_kind);
  elsif apply_stage_write_intent.intent_kind = 'record_consent' then
    expected_value := coalesce(nullif(normalized_payload->>'expected_consent_state', ''), 'unset');
    target_value := case when coalesce((normalized_payload->>'granted')::boolean, false) then 'granted' else 'denied' end;
    if server_consent = target_value then
      result_payload := jsonb_build_object('outcome', 'applied', 'id', apply_stage_write_intent.session_id, 'intent_kind', apply_stage_write_intent.intent_kind, 'consent_state', server_consent, 'already_applied', true);
    elsif server_consent <> expected_value then
      result_payload := jsonb_build_object(
        'outcome', 'conflict',
        'intent_kind', apply_stage_write_intent.intent_kind,
        'local_value', jsonb_build_object('expected_consent_state', expected_value, 'target_consent_state', target_value),
        'server_value', jsonb_build_object('status', server_status, 'consent_state', server_consent),
        'message', 'Recording consent changed while Stage was offline.'
      );
    else
      result_id := public.record_session_consent($1, $2, $3, apply_stage_write_intent.session_id, target_value = 'granted');
      result_payload := jsonb_build_object('outcome', 'applied', 'id', result_id, 'intent_kind', apply_stage_write_intent.intent_kind, 'consent_state', target_value);
    end if;
  elsif apply_stage_write_intent.intent_kind = 'go_live' then
    expected_value := coalesce(nullif(normalized_payload->>'expected_status', ''), 'started');
    if server_status = 'in_progress' then
      result_payload := jsonb_build_object('outcome', 'applied', 'id', apply_stage_write_intent.session_id, 'intent_kind', apply_stage_write_intent.intent_kind, 'status', 'in_progress', 'already_applied', true);
    elsif server_status::text <> expected_value then
      result_payload := jsonb_build_object(
        'outcome', 'conflict',
        'intent_kind', apply_stage_write_intent.intent_kind,
        'local_value', jsonb_build_object('expected_status', expected_value, 'target_status', 'in_progress'),
        'server_value', jsonb_build_object('status', server_status, 'consent_state', server_consent),
        'message', 'Session state changed before recording went live.'
      );
    else
      result_id := public.set_session_status($1, $2, $3, apply_stage_write_intent.session_id, 'in_progress');
      result_payload := jsonb_build_object('outcome', 'applied', 'id', result_id, 'intent_kind', apply_stage_write_intent.intent_kind, 'status', 'in_progress');
    end if;
  elsif apply_stage_write_intent.intent_kind = 'mark_moment' then
    if not internal.stage_session_writable($1, $2, $3, apply_stage_write_intent.session_id) then
      raise exception 'Stage writes require a started or in-progress session' using errcode = '23514';
    end if;
    requested_at := least(coalesce(nullif(normalized_payload->>'occurred_at', '')::timestamptz, now()), now());
    insert into public.session_marked_moments (workspace_id, world_id, saga_id, session_id, occurred_at, label)
    values ($1, $2, $3, apply_stage_write_intent.session_id, requested_at, coalesce(nullif(btrim(normalized_payload->>'label'), ''), 'Marked moment'))
    returning id into result_id;
    result_payload := jsonb_build_object('outcome', 'applied', 'id', result_id, 'intent_kind', apply_stage_write_intent.intent_kind, 'occurred_at', requested_at);
  elsif apply_stage_write_intent.intent_kind = 'end_session' then
    expected_value := coalesce(nullif(normalized_payload->>'expected_status', ''), 'in_progress');
    if server_status::text <> expected_value then
      result_payload := jsonb_build_object(
        'outcome', 'conflict',
        'intent_kind', apply_stage_write_intent.intent_kind,
        'local_value', jsonb_build_object('expected_status', expected_value, 'target_status', 'ended_pending_undo'),
        'server_value', jsonb_build_object('status', server_status, 'consent_state', server_consent),
        'message', 'Session end could not overwrite a newer server state.'
      );
    else
      requested_at := least(coalesce(nullif(normalized_payload->>'requested_at', '')::timestamptz, now()), now());
      result_id := public.set_session_status($1, $2, $3, apply_stage_write_intent.session_id, 'ended_pending_undo');
      update public.sessions s set ended_pending_undo_at = requested_at, updated_at = now() where s.id = result_id;
      result_payload := jsonb_build_object('outcome', 'applied', 'id', result_id, 'intent_kind', apply_stage_write_intent.intent_kind, 'status', 'ended_pending_undo', 'requested_at', requested_at);
    end if;
  else
    expected_value := coalesce(nullif(normalized_payload->>'expected_status', ''), 'ended_pending_undo');
    if server_status::text <> expected_value then
      result_payload := jsonb_build_object(
        'outcome', 'conflict',
        'intent_kind', apply_stage_write_intent.intent_kind,
        'local_value', jsonb_build_object('expected_status', expected_value, 'target_status', 'in_progress'),
        'server_value', jsonb_build_object('status', server_status, 'consent_state', server_consent),
        'message', 'Session undo could not overwrite a newer server state.'
      );
    else
      result_id := public.set_session_status($1, $2, $3, apply_stage_write_intent.session_id, 'in_progress');
      result_payload := jsonb_build_object('outcome', 'applied', 'id', result_id, 'intent_kind', apply_stage_write_intent.intent_kind, 'status', 'in_progress');
    end if;
  end if;

  insert into internal.stage_write_receipts (
    gm_id, workspace_id, world_id, saga_id, session_id, idempotency_key, intent_kind, payload, result
  ) values (
    caller_id, $1, $2, $3, apply_stage_write_intent.session_id, normalized_key,
    apply_stage_write_intent.intent_kind, normalized_payload, result_payload
  );

  return result_payload;
end;
$$;

revoke all on function public.apply_stage_write_intent(uuid, uuid, uuid, uuid, text, text, jsonb) from public, anon;
grant execute on function public.apply_stage_write_intent(uuid, uuid, uuid, uuid, text, text, jsonb) to authenticated;

create or replace function public.get_stage_packet(workspace_id uuid, world_id uuid, saga_id uuid, session_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  packet jsonb;
begin
  perform public.assert_saga_access($1, $2, $3);

  select jsonb_build_object(
    'session', to_jsonb(s),
    'pinned_entities', coalesce((select jsonb_agg(to_jsonb(p) order by p.order_index) from public.session_pinned_entities p where p.session_id = s.id), '[]'::jsonb),
    'active_threads', coalesce((select jsonb_agg(to_jsonb(t)) from public.session_active_threads t where t.session_id = s.id), '[]'::jsonb),
    'quick_captures', coalesce((select jsonb_agg(to_jsonb(n) order by n.created_at desc) from public.notes n join public.sources src on src.note_id = n.id where src.session_id = s.id and n.note_type = 'quick_capture'), '[]'::jsonb),
    'marked_moments', coalesce((select jsonb_agg(to_jsonb(m) order by m.occurred_at desc) from public.session_marked_moments m where m.session_id = s.id), '[]'::jsonb),
    'dice_rolls', coalesce((select jsonb_agg(to_jsonb(d) order by d.created_at desc) from public.dice_rolls d where d.session_id = s.id), '[]'::jsonb),
    'consent_state', s.consent_state,
    'start_warning', jsonb_build_object('warning_shown', false, 'pending_count', 0),
    'literal_search_index', coalesce((
      select jsonb_agg(jsonb_build_object(
        'source_kind', docs.source_kind,
        'source_entity_type', docs.source_entity_type,
        'source_entity_id', docs.source_entity_id,
        'name', docs.name,
        'summary', docs.summary,
        'narrative', docs.narrative,
        'canon_state', docs.canon_state,
        'is_stub', docs.is_stub,
        'updated_at', docs.updated_at
      ) order by docs.updated_at desc, docs.source_entity_id)
      from (
        select * from (
          select 'entity'::text source_kind, 'character'::text source_entity_type, e.id source_entity_id, e.name, e.summary, e.narrative, e.canon_state::text canon_state, e.is_stub, e.updated_at from public.characters e where e.workspace_id = $1 and e.world_id = $2 and e.canon_state = 'canon' and ((e.scope = 'saga' and e.saga_id = $3) or (e.scope = 'world' and e.saga_id is null))
          union all
          select 'entity', 'place', e.id, e.name, e.summary, e.narrative, e.canon_state::text, e.is_stub, e.updated_at from public.places e where e.workspace_id = $1 and e.world_id = $2 and e.canon_state = 'canon' and ((e.scope = 'saga' and e.saga_id = $3) or (e.scope = 'world' and e.saga_id is null))
          union all
          select 'entity', 'faction', e.id, e.name, e.summary, e.narrative, e.canon_state::text, e.is_stub, e.updated_at from public.factions e where e.workspace_id = $1 and e.world_id = $2 and e.canon_state = 'canon' and ((e.scope = 'saga' and e.saga_id = $3) or (e.scope = 'world' and e.saga_id is null))
          union all
          select 'entity', 'artifact', e.id, e.name, e.summary, e.narrative, e.canon_state::text, e.is_stub, e.updated_at from public.artifacts e where e.workspace_id = $1 and e.world_id = $2 and e.canon_state = 'canon' and ((e.scope = 'saga' and e.saga_id = $3) or (e.scope = 'world' and e.saga_id is null))
          union all
          select 'entity', 'thread', e.id, e.name, e.summary, e.narrative, e.canon_state::text, e.is_stub, e.updated_at from public.threads e where e.workspace_id = $1 and e.world_id = $2 and e.canon_state = 'canon' and ((e.scope = 'saga' and e.saga_id = $3) or (e.scope = 'world' and e.saga_id is null))
          union all
          select 'note', 'note', n.id, n.title, left(n.body, 240), n.body, n.canon_state::text, false, n.updated_at from public.notes n where n.workspace_id = $1 and n.world_id = $2 and n.canon_state = 'canon' and n.note_type <> 'gm_note' and ((n.scope = 'saga' and n.saga_id = $3) or (n.scope = 'world' and n.saga_id is null))
        ) scoped_docs
        order by updated_at desc, source_entity_id
        limit 500
      ) docs
    ), '[]'::jsonb)
  )
  into packet
  from public.sessions s
  where s.id = get_stage_packet.session_id
    and s.workspace_id = $1
    and s.world_id = $2
    and s.saga_id = $3;

  if packet is null then
    raise exception 'Session is not available' using errcode = '42501';
  end if;

  return packet;
end;
$$;

revoke execute on function public.get_stage_packet(uuid, uuid, uuid, uuid) from public, anon;
grant execute on function public.get_stage_packet(uuid, uuid, uuid, uuid) to authenticated;

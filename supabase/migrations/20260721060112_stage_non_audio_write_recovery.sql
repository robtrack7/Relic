create table internal.stage_write_receipts (
  id uuid primary key default gen_random_uuid(),
  gm_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  world_id uuid not null references public.worlds(id) on delete cascade,
  saga_id uuid not null references public.sagas(id) on delete cascade,
  session_id uuid not null references public.sessions(id) on delete cascade,
  idempotency_key text not null check (length(idempotency_key) between 1 and 255),
  intent_kind text not null check (intent_kind in ('quick_capture', 'quick_stub', 'mark_moment', 'end_session', 'undo_end_session')),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  result jsonb not null check (jsonb_typeof(result) = 'object'),
  created_at timestamptz not null default now(),
  unique (gm_id, idempotency_key)
);

create index stage_write_receipts_session_created_idx
  on internal.stage_write_receipts (session_id, created_at);
create index stage_write_receipts_workspace_idx
  on internal.stage_write_receipts (workspace_id);
create index stage_write_receipts_world_idx
  on internal.stage_write_receipts (world_id);
create index stage_write_receipts_saga_idx
  on internal.stage_write_receipts (saga_id);

revoke all on table internal.stage_write_receipts from public, anon, authenticated;

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
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if normalized_key is null or length(normalized_key) not between 1 and 255 then
    raise exception 'A valid idempotency key is required' using errcode = '23514';
  end if;
  if apply_stage_write_intent.intent_kind not in ('quick_capture', 'quick_stub', 'mark_moment', 'end_session', 'undo_end_session') then
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
  if not exists (
    select 1
    from public.sessions s
    where s.id = apply_stage_write_intent.session_id
      and s.workspace_id = apply_stage_write_intent.workspace_id
      and s.world_id = apply_stage_write_intent.world_id
      and s.saga_id = apply_stage_write_intent.saga_id
  ) then
    raise exception 'Session is not available' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(caller_id::text || ':' || normalized_key, 0));

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

  if apply_stage_write_intent.intent_kind = 'quick_capture' then
    result_id := public.quick_capture(
      apply_stage_write_intent.workspace_id,
      apply_stage_write_intent.world_id,
      apply_stage_write_intent.saga_id,
      apply_stage_write_intent.session_id,
      normalized_payload->>'body',
      nullif(normalized_payload->>'title', '')
    );
    result_payload := jsonb_build_object('id', result_id, 'intent_kind', apply_stage_write_intent.intent_kind);
  elsif apply_stage_write_intent.intent_kind = 'quick_stub' then
    result_id := public.quick_stub(
      apply_stage_write_intent.workspace_id,
      apply_stage_write_intent.world_id,
      apply_stage_write_intent.saga_id,
      apply_stage_write_intent.session_id,
      normalized_payload->>'entity_type',
      normalized_payload->>'name',
      nullif(normalized_payload->>'summary', '')
    );
    result_payload := jsonb_build_object('id', result_id, 'intent_kind', apply_stage_write_intent.intent_kind);
  elsif apply_stage_write_intent.intent_kind = 'mark_moment' then
    if not internal.stage_session_writable(
      apply_stage_write_intent.workspace_id,
      apply_stage_write_intent.world_id,
      apply_stage_write_intent.saga_id,
      apply_stage_write_intent.session_id
    ) then
      raise exception 'Stage writes require a started or in-progress session' using errcode = '23514';
    end if;
    requested_at := coalesce(nullif(normalized_payload->>'occurred_at', '')::timestamptz, now());
    insert into public.session_marked_moments (
      workspace_id,
      world_id,
      saga_id,
      session_id,
      occurred_at,
      label
    ) values (
      apply_stage_write_intent.workspace_id,
      apply_stage_write_intent.world_id,
      apply_stage_write_intent.saga_id,
      apply_stage_write_intent.session_id,
      requested_at,
      coalesce(nullif(btrim(normalized_payload->>'label'), ''), 'Marked moment')
    )
    returning id into result_id;
    result_payload := jsonb_build_object('id', result_id, 'intent_kind', apply_stage_write_intent.intent_kind, 'occurred_at', requested_at);
  elsif apply_stage_write_intent.intent_kind = 'end_session' then
    requested_at := least(coalesce(nullif(normalized_payload->>'requested_at', '')::timestamptz, now()), now());
    result_id := public.set_session_status(
      apply_stage_write_intent.workspace_id,
      apply_stage_write_intent.world_id,
      apply_stage_write_intent.saga_id,
      apply_stage_write_intent.session_id,
      'ended_pending_undo'
    );
    update public.sessions s
    set ended_pending_undo_at = requested_at,
        updated_at = now()
    where s.id = result_id;
    result_payload := jsonb_build_object('id', result_id, 'intent_kind', apply_stage_write_intent.intent_kind, 'status', 'ended_pending_undo', 'requested_at', requested_at);
  else
    result_id := public.set_session_status(
      apply_stage_write_intent.workspace_id,
      apply_stage_write_intent.world_id,
      apply_stage_write_intent.saga_id,
      apply_stage_write_intent.session_id,
      'in_progress'
    );
    result_payload := jsonb_build_object('id', result_id, 'intent_kind', apply_stage_write_intent.intent_kind, 'status', 'in_progress');
  end if;

  insert into internal.stage_write_receipts (
    gm_id,
    workspace_id,
    world_id,
    saga_id,
    session_id,
    idempotency_key,
    intent_kind,
    payload,
    result
  ) values (
    caller_id,
    apply_stage_write_intent.workspace_id,
    apply_stage_write_intent.world_id,
    apply_stage_write_intent.saga_id,
    apply_stage_write_intent.session_id,
    normalized_key,
    apply_stage_write_intent.intent_kind,
    normalized_payload,
    result_payload
  );

  return result_payload;
end;
$$;

revoke all on function public.apply_stage_write_intent(uuid, uuid, uuid, uuid, text, text, jsonb) from public, anon;
grant execute on function public.apply_stage_write_intent(uuid, uuid, uuid, uuid, text, text, jsonb) to authenticated;

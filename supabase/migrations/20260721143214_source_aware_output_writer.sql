alter table internal.ai_task_runs
  add column if not exists resolved_provider text;

create table if not exists internal.ai_draft_batches (
  id uuid primary key default public.uuid7(),
  ai_task_run_id uuid not null unique references internal.ai_task_runs(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  world_id uuid not null references public.worlds(id) on delete cascade,
  saga_id uuid not null references public.sagas(id) on delete cascade,
  session_id uuid not null references public.sessions(id) on delete cascade,
  pipeline_run_id uuid not null references public.pipeline_runs(id) on delete cascade,
  task_name text not null,
  prompt_version text not null,
  model text not null,
  provider text not null,
  output_hash text not null,
  state text not null default 'writing' check (state in ('writing', 'complete')),
  draft_count int not null default 0 check (draft_count >= 0),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists ai_draft_batches_scope_created_idx
  on internal.ai_draft_batches(workspace_id, world_id, saga_id, session_id, created_at desc);

alter table public.drafts
  add column if not exists draft_batch_id uuid references internal.ai_draft_batches(id) on delete set null,
  add column if not exists ai_task_run_id uuid references internal.ai_task_runs(id) on delete set null,
  add column if not exists pipeline_run_id uuid references public.pipeline_runs(id) on delete set null,
  add column if not exists session_id uuid references public.sessions(id) on delete set null,
  add column if not exists ai_task_name text,
  add column if not exists ai_prompt_version text,
  add column if not exists ai_model text,
  add column if not exists ai_provider text;

create index if not exists drafts_batch_idx on public.drafts(draft_batch_id) where draft_batch_id is not null;
create index if not exists drafts_ai_run_idx on public.drafts(ai_task_run_id) where ai_task_run_id is not null;
create index if not exists drafts_pipeline_idx on public.drafts(pipeline_run_id, state) where pipeline_run_id is not null;

create or replace function internal.confidence_band_for_reason(p_reason public.confidence_reason)
returns public.confidence_band
language sql
immutable
set search_path = public, pg_temp
as $$
  select case
    when $1 in ('direct_gm_input', 'multiple_strong_sources') then 'high'::public.confidence_band
    when $1 in ('single_clear_segment', 'cross_session_consistency', 'inferred_from_context') then 'medium'::public.confidence_band
    else 'low'::public.confidence_band
  end;
$$;

create or replace function internal.normalized_uuid_array(p_values uuid[])
returns uuid[]
language sql
immutable
set search_path = public, pg_temp
as $$
  select coalesce(array_agg(distinct value order by value), '{}'::uuid[])
  from unnest(coalesce($1, '{}'::uuid[])) value;
$$;

create or replace function internal.synthesis_item_source_ids(p_item jsonb, p_label text)
returns uuid[]
language plpgsql
stable
set search_path = public, pg_temp
as $$
declare
  value jsonb;
  source_id_text text;
  source_ids uuid[] := '{}'::uuid[];
begin
  if jsonb_typeof(p_item) <> 'object' then
    raise exception '% must be an object', p_label using errcode = '22023';
  end if;

  if jsonb_typeof(p_item -> 'sources') <> 'array' or jsonb_array_length(p_item -> 'sources') = 0 then
    raise exception '% requires at least one source', p_label using errcode = '22023';
  end if;

  for value in select entry from jsonb_array_elements(p_item -> 'sources') entry loop
    if jsonb_typeof(value) <> 'string' then
      raise exception '% sources must contain valid source UUIDs', p_label using errcode = '22023';
    end if;

    source_id_text := value #>> '{}';
    if source_id_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      raise exception '% sources must contain valid source UUIDs', p_label using errcode = '22023';
    end if;
    source_ids := array_append(source_ids, source_id_text::uuid);
  end loop;

  return internal.normalized_uuid_array(source_ids);
end;
$$;

create or replace function internal.assert_synthesis_source_scope(
  p_run internal.ai_task_runs,
  p_item jsonb,
  p_label text
)
returns uuid[]
language plpgsql
stable
security definer
set search_path = public, internal, pg_temp
as $$
declare
  source_ids uuid[];
  source_id uuid;
begin
  source_ids := internal.synthesis_item_source_ids(p_item, p_label);

  foreach source_id in array source_ids loop
    if not (source_id = any(coalesce(p_run.allowed_source_ids, '{}'::uuid[]))) then
      raise exception 'AI output referenced a source outside the allowed retrieval set' using errcode = '22023';
    end if;

    if not exists (
      select 1
      from public.sources source
      where source.id = source_id
        and source.workspace_id = p_run.workspace_id
        and source.world_id = p_run.world_id
        and source.saga_id = p_run.saga_id
        and source.session_id = p_run.session_id
        and source.scope = 'saga'
    ) then
      raise exception 'Synthesis source is missing or outside the run Workspace, World, Saga, and Session' using errcode = '42501';
    end if;
  end loop;

  return source_ids;
end;
$$;

create or replace function internal.synthesis_target_updated_at(
  p_run internal.ai_task_runs,
  p_entity_type public.entity_type,
  p_entity_id uuid
)
returns timestamptz
language plpgsql
stable
security definer
set search_path = public, internal, pg_temp
as $$
declare
  target_updated_at timestamptz;
begin
  if p_entity_type = 'character' then
    select updated_at into target_updated_at from public.characters where id = p_entity_id and workspace_id = p_run.workspace_id and world_id = p_run.world_id and saga_id = p_run.saga_id and scope = 'saga';
  elsif p_entity_type = 'place' then
    select updated_at into target_updated_at from public.places where id = p_entity_id and workspace_id = p_run.workspace_id and world_id = p_run.world_id and saga_id = p_run.saga_id and scope = 'saga';
  elsif p_entity_type = 'faction' then
    select updated_at into target_updated_at from public.factions where id = p_entity_id and workspace_id = p_run.workspace_id and world_id = p_run.world_id and saga_id = p_run.saga_id and scope = 'saga';
  elsif p_entity_type = 'artifact' then
    select updated_at into target_updated_at from public.artifacts where id = p_entity_id and workspace_id = p_run.workspace_id and world_id = p_run.world_id and saga_id = p_run.saga_id and scope = 'saga';
  elsif p_entity_type = 'thread' then
    select updated_at into target_updated_at from public.threads where id = p_entity_id and workspace_id = p_run.workspace_id and world_id = p_run.world_id and saga_id = p_run.saga_id and scope = 'saga';
  end if;

  if target_updated_at is null then
    raise exception 'Synthesis target is missing or outside the run Workspace, World, and Saga' using errcode = '42501';
  end if;

  return target_updated_at;
end;
$$;

create or replace function internal.synthesis_entity_is_scoped_stub(
  p_run internal.ai_task_runs,
  p_entity_type public.entity_type,
  p_entity_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = public, internal, pg_temp
as $$
declare
  is_scoped_stub boolean := false;
begin
  if p_entity_type = 'character' then
    select is_stub into is_scoped_stub from public.characters where id = p_entity_id and workspace_id = p_run.workspace_id and world_id = p_run.world_id and saga_id = p_run.saga_id and scope = 'saga';
  elsif p_entity_type = 'place' then
    select is_stub into is_scoped_stub from public.places where id = p_entity_id and workspace_id = p_run.workspace_id and world_id = p_run.world_id and saga_id = p_run.saga_id and scope = 'saga';
  elsif p_entity_type = 'faction' then
    select is_stub into is_scoped_stub from public.factions where id = p_entity_id and workspace_id = p_run.workspace_id and world_id = p_run.world_id and saga_id = p_run.saga_id and scope = 'saga';
  elsif p_entity_type = 'artifact' then
    select is_stub into is_scoped_stub from public.artifacts where id = p_entity_id and workspace_id = p_run.workspace_id and world_id = p_run.world_id and saga_id = p_run.saga_id and scope = 'saga';
  elsif p_entity_type = 'thread' then
    select is_stub into is_scoped_stub from public.threads where id = p_entity_id and workspace_id = p_run.workspace_id and world_id = p_run.world_id and saga_id = p_run.saga_id and scope = 'saga';
  end if;
  return coalesce(is_scoped_stub, false);
end;
$$;

create or replace function internal.assert_confidence_reason(p_item jsonb, p_label text)
returns public.confidence_reason
language plpgsql
stable
set search_path = public, pg_temp
as $$
declare
  reason public.confidence_reason;
begin
  begin
    reason := nullif(p_item ->> 'confidence_reason', '')::public.confidence_reason;
  exception when invalid_text_representation then
    raise exception '%.confidence_reason must be a registered confidence reason', p_label using errcode = '22023';
  end;
  if reason is null then
    raise exception '%.confidence_reason must be a registered confidence reason', p_label using errcode = '22023';
  end if;
  return reason;
end;
$$;

create or replace function internal.validate_synthesis_output(
  p_run internal.ai_task_runs,
  p_output jsonb
)
returns void
language plpgsql
stable
security definer
set search_path = public, internal, pg_temp
as $$
declare
  collection_name text;
  item jsonb;
  item_index int;
  label text;
  entity_type public.entity_type;
  target_id uuid;
  session_id_value jsonb;
  next_session_id uuid;
begin
  if p_run.task_name <> 'synthesize_session' or p_run.output_mode <> 'draft_batch' then
    raise exception 'Run is not a synthesize_session draft batch' using errcode = '22023';
  end if;
  if p_run.workspace_id is null or p_run.world_id is null or p_run.saga_id is null or p_run.session_id is null then
    raise exception 'Synthesis run scope is incomplete' using errcode = '22023';
  end if;
  if jsonb_typeof(p_output) <> 'object' then
    raise exception 'Synthesis output must be an object' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_object_keys(p_output) key
    where key not in ('session_summary', 'proposed_entity_changes', 'loose_threads', 'next_prep_implications', 'stub_evidence_flags')
  ) then
    raise exception 'Synthesis output contains an unsupported top-level field' using errcode = '22023';
  end if;

  foreach collection_name in array array['proposed_entity_changes', 'loose_threads', 'next_prep_implications', 'stub_evidence_flags'] loop
    if jsonb_typeof(p_output -> collection_name) <> 'array' then
      raise exception '% must be an array', collection_name using errcode = '22023';
    end if;
  end loop;

  if p_output ? 'session_summary' then
    item := p_output -> 'session_summary';
    if jsonb_typeof(item) <> 'object' or nullif(btrim(item ->> 'title'), '') is null or nullif(btrim(item ->> 'body'), '') is null then
      raise exception 'session_summary requires title and body' using errcode = '22023';
    end if;
    perform internal.assert_synthesis_source_scope(p_run, item, 'session_summary');
    perform internal.assert_confidence_reason(item, 'session_summary');
  end if;

  item_index := 0;
  for item in select value from jsonb_array_elements(p_output -> 'proposed_entity_changes') loop
    label := format('proposed_entity_changes[%s]', item_index);
    if jsonb_typeof(item) <> 'object' then raise exception '% must be an object', label using errcode = '22023'; end if;
    if item ->> 'change_kind' not in ('create', 'update') then raise exception '%.change_kind must be create or update', label using errcode = '22023'; end if;
    if item ->> 'proposed_scope' <> 'saga' then raise exception '%.proposed_scope must be saga', label using errcode = '22023'; end if;
    if jsonb_typeof(item -> 'payload') <> 'object' then raise exception '%.payload must be an object', label using errcode = '22023'; end if;
    begin
      entity_type := nullif(item ->> 'entity_type', '')::public.entity_type;
    exception when invalid_text_representation then
      raise exception '%.entity_type is not draftable', label using errcode = '22023';
    end;
    if entity_type is null or entity_type in ('session', 'note') then raise exception '%.entity_type is not draftable', label using errcode = '22023'; end if;
    if item ->> 'change_kind' = 'create' and nullif(btrim(item #>> '{payload,name}'), '') is null then
      raise exception '%.payload.name is required for create', label using errcode = '22023';
    end if;
    if item ->> 'change_kind' = 'update' then
      begin
        target_id := nullif(item ->> 'target_entity_id', '')::uuid;
      exception when invalid_text_representation then
        raise exception '% update requires target_entity_id and expected_version', label using errcode = '22023';
      end;
      if target_id is null or nullif(item ->> 'expected_version', '') is null then
        raise exception '% update requires target_entity_id and expected_version', label using errcode = '22023';
      end if;
      perform (item ->> 'expected_version')::timestamptz;
      perform internal.synthesis_target_updated_at(p_run, entity_type, target_id);
    end if;
    perform internal.assert_synthesis_source_scope(p_run, item, label);
    perform internal.assert_confidence_reason(item, label);
    item_index := item_index + 1;
  end loop;

  item_index := 0;
  for item in select value from jsonb_array_elements(p_output -> 'loose_threads') loop
    label := format('loose_threads[%s]', item_index);
    if jsonb_typeof(item) <> 'object' or nullif(btrim(item ->> 'reason'), '') is null then raise exception '%.reason is required', label using errcode = '22023'; end if;
    if item ? 'thread_id' then
      begin target_id := nullif(item ->> 'thread_id', '')::uuid; exception when invalid_text_representation then raise exception '%.thread_id must be a UUID', label using errcode = '22023'; end;
      if target_id is null then raise exception '%.thread_id must be a UUID', label using errcode = '22023'; end if;
      perform internal.synthesis_target_updated_at(p_run, 'thread', target_id);
    elsif nullif(btrim(item ->> 'suggested_name'), '') is null then
      raise exception '%.suggested_name is required for a new Thread', label using errcode = '22023';
    end if;
    perform internal.assert_synthesis_source_scope(p_run, item, label);
    perform internal.assert_confidence_reason(item, label);
    item_index := item_index + 1;
  end loop;

  if jsonb_array_length(p_output -> 'next_prep_implications') > 0 then
    begin next_session_id := nullif(p_run.input_payload ->> 'next_session_id', '')::uuid; exception when invalid_text_representation then next_session_id := null; end;
    if next_session_id is null or not exists (
      select 1 from public.sessions s
      where s.id = next_session_id and s.id <> p_run.session_id
        and s.workspace_id = p_run.workspace_id and s.world_id = p_run.world_id and s.saga_id = p_run.saga_id
        and s.status in ('planned', 'ready', 'started')
    ) then
      raise exception 'next_session_id is missing or outside the run Workspace, World, and Saga' using errcode = '42501';
    end if;
  end if;

  item_index := 0;
  for item in select value from jsonb_array_elements(p_output -> 'next_prep_implications') loop
    label := format('next_prep_implications[%s]', item_index);
    if jsonb_typeof(item) <> 'object' or nullif(btrim(item ->> 'text'), '') is null then raise exception '%.text is required', label using errcode = '22023'; end if;
    if item ? 'related_thread_id' then
      begin target_id := nullif(item ->> 'related_thread_id', '')::uuid; exception when invalid_text_representation then raise exception '%.related_thread_id must be a UUID', label using errcode = '22023'; end;
      perform internal.synthesis_target_updated_at(p_run, 'thread', target_id);
    end if;
    if item ? 'related_entity_ids' and (jsonb_typeof(item -> 'related_entity_ids') <> 'array' or exists (
      select 1 from jsonb_array_elements(item -> 'related_entity_ids') entry
      where jsonb_typeof(entry) <> 'string' or (entry #>> '{}') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    )) then raise exception '%.related_entity_ids must be an array of UUIDs', label using errcode = '22023'; end if;
    perform internal.assert_synthesis_source_scope(p_run, item, label);
    perform internal.assert_confidence_reason(item, label);
    item_index := item_index + 1;
  end loop;

  item_index := 0;
  for item in select value from jsonb_array_elements(p_output -> 'stub_evidence_flags') loop
    label := format('stub_evidence_flags[%s]', item_index);
    if jsonb_typeof(item) <> 'object' then raise exception '% must be an object', label using errcode = '22023'; end if;
    begin
      entity_type := nullif(item ->> 'entity_type', '')::public.entity_type;
      target_id := nullif(item ->> 'entity_id', '')::uuid;
    exception when invalid_text_representation then
      raise exception '% references an invalid stub', label using errcode = '22023';
    end;
    if entity_type is null or entity_type in ('session', 'note') or target_id is null or not internal.synthesis_entity_is_scoped_stub(p_run, entity_type, target_id) then
      raise exception '% references an invalid stub', label using errcode = '42501';
    end if;
    if jsonb_typeof(item -> 'session_ids_with_mentions') <> 'array' or jsonb_array_length(item -> 'session_ids_with_mentions') = 0 then
      raise exception '%.session_ids_with_mentions requires the current Session', label using errcode = '22023';
    end if;
    for session_id_value in select value from jsonb_array_elements(item -> 'session_ids_with_mentions') loop
      if jsonb_typeof(session_id_value) <> 'string' or (session_id_value #>> '{}') <> p_run.session_id::text then
        raise exception '%.session_ids_with_mentions requires the current Session', label using errcode = '42501';
      end if;
    end loop;
    perform internal.assert_synthesis_source_scope(p_run, item, label);
    item_index := item_index + 1;
  end loop;
end;
$$;

create or replace function internal.insert_synthesis_draft(
  p_run internal.ai_task_runs,
  p_batch_id uuid,
  p_pipeline_run_id uuid,
  p_entity_type public.entity_type,
  p_target_entity_id uuid,
  p_change_kind public.change_kind,
  p_payload jsonb,
  p_expected_version timestamptz,
  p_confidence_reason public.confidence_reason,
  p_source_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = public, internal, pg_temp
as $$
declare
  draft_id uuid;
  source_id uuid;
begin
  insert into public.drafts (
    workspace_id, world_id, saga_id, scope, entity_type, target_entity_id, state,
    change_kind, proposed_payload, expected_version, confidence_band, confidence_reason,
    created_by, draft_batch_id, ai_task_run_id, pipeline_run_id, session_id,
    ai_task_name, ai_prompt_version, ai_model, ai_provider
  ) values (
    p_run.workspace_id, p_run.world_id, p_run.saga_id, 'saga', p_entity_type, p_target_entity_id, 'pending',
    p_change_kind, p_payload, p_expected_version, internal.confidence_band_for_reason(p_confidence_reason), p_confidence_reason,
    'gm_via_ai_approval', p_batch_id, p_run.id, p_pipeline_run_id, p_run.session_id,
    p_run.task_name, p_run.prompt_version, p_run.resolved_model, p_run.resolved_provider
  ) returning id into draft_id;

  foreach source_id in array p_source_ids loop
    insert into public.draft_sources (workspace_id, world_id, saga_id, scope, draft_id, source_id)
    values (p_run.workspace_id, p_run.world_id, p_run.saga_id, 'saga', draft_id, source_id);
  end loop;

  return draft_id;
end;
$$;

create or replace function internal.record_synthesis_output(
  p_run_id uuid,
  p_output jsonb,
  p_allowed_source_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = public, internal, pg_temp
as $$
declare
  run_row internal.ai_task_runs%rowtype;
  batch_row internal.ai_draft_batches%rowtype;
  pipeline_run_id uuid;
  next_session_id uuid;
  item jsonb;
  source_ids uuid[];
  reason public.confidence_reason;
  entity_type public.entity_type;
  target_id uuid;
  expected_version timestamptz;
  v_draft_count int := 0;
  output_hash text;
begin
  select * into run_row from internal.ai_task_runs where id = p_run_id for update;
  if not found then raise exception 'AI task run is not available' using errcode = '42501'; end if;

  if internal.normalized_uuid_array(p_allowed_source_ids) is distinct from internal.normalized_uuid_array(run_row.allowed_source_ids) then
    raise exception 'Allowed source set does not match the immutable AI run source set' using errcode = '22023';
  end if;
  if nullif(run_row.resolved_model, '') is null or nullif(run_row.resolved_provider, '') is null then
    raise exception 'Synthesis model and provider provenance are required' using errcode = '22023';
  end if;

  output_hash := encode(extensions.digest(convert_to(p_output::text, 'UTF8'), 'sha256'), 'hex');

  select * into batch_row from internal.ai_draft_batches where ai_task_run_id = run_row.id for update;
  if found then
    if batch_row.output_hash <> output_hash or run_row.output_payload is distinct from p_output then
      raise exception 'AI task run already completed with different output' using errcode = '23505';
    end if;
    if batch_row.state <> 'complete' or batch_row.draft_count <> (select count(*) from public.drafts where draft_batch_id = batch_row.id) then
      raise exception 'Existing synthesis draft batch is incomplete' using errcode = '40001';
    end if;
    return jsonb_build_object('ok', true, 'run_id', run_row.id, 'batch_id', batch_row.id, 'draft_count', batch_row.draft_count, 'replayed', true);
  end if;

  if run_row.status = 'complete' then
    raise exception 'AI task run already completed without its synthesis batch' using errcode = '40001';
  end if;

  perform internal.validate_synthesis_output(run_row, p_output);

  begin pipeline_run_id := nullif(run_row.input_payload ->> 'pipeline_run_id', '')::uuid; exception when invalid_text_representation then pipeline_run_id := null; end;
  if pipeline_run_id is null or not exists (
    select 1 from public.pipeline_runs p
    where p.id = pipeline_run_id and p.workspace_id = run_row.workspace_id and p.world_id = run_row.world_id
      and p.saga_id = run_row.saga_id and p.session_id = run_row.session_id and p.state = 'synthesizing'
  ) then
    raise exception 'pipeline_run_id is missing or outside the synthesis run scope' using errcode = '42501';
  end if;

  insert into internal.ai_draft_batches (
    ai_task_run_id, workspace_id, world_id, saga_id, session_id, pipeline_run_id,
    task_name, prompt_version, model, provider, output_hash
  ) values (
    run_row.id, run_row.workspace_id, run_row.world_id, run_row.saga_id, run_row.session_id, pipeline_run_id,
    run_row.task_name, run_row.prompt_version, run_row.resolved_model, run_row.resolved_provider, output_hash
  ) returning * into batch_row;

  if p_output ? 'session_summary' then
    item := p_output -> 'session_summary';
    source_ids := internal.synthesis_item_source_ids(item, 'session_summary');
    reason := internal.assert_confidence_reason(item, 'session_summary');
    perform internal.insert_synthesis_draft(
      run_row, batch_row.id, pipeline_run_id, 'note', null, 'create',
      jsonb_build_object('title', item ->> 'title', 'body', item ->> 'body', 'note_type', 'summary', 'session_id', run_row.session_id),
      null, reason, source_ids
    );
    v_draft_count := v_draft_count + 1;
  end if;

  for item in select value from jsonb_array_elements(p_output -> 'proposed_entity_changes') loop
    entity_type := (item ->> 'entity_type')::public.entity_type;
    target_id := nullif(item ->> 'target_entity_id', '')::uuid;
    expected_version := nullif(item ->> 'expected_version', '')::timestamptz;
    source_ids := internal.synthesis_item_source_ids(item, 'proposed_entity_change');
    reason := internal.assert_confidence_reason(item, 'proposed_entity_change');
    perform internal.insert_synthesis_draft(
      run_row, batch_row.id, pipeline_run_id, entity_type, target_id,
      (item ->> 'change_kind')::public.change_kind, item -> 'payload', expected_version, reason, source_ids
    );
    v_draft_count := v_draft_count + 1;
  end loop;

  for item in select value from jsonb_array_elements(p_output -> 'loose_threads') loop
    target_id := nullif(item ->> 'thread_id', '')::uuid;
    source_ids := internal.synthesis_item_source_ids(item, 'loose_thread');
    reason := internal.assert_confidence_reason(item, 'loose_thread');
    expected_version := case when target_id is null then null else internal.synthesis_target_updated_at(run_row, 'thread', target_id) end;
    perform internal.insert_synthesis_draft(
      run_row, batch_row.id, pipeline_run_id, 'thread', target_id,
      case when target_id is null then 'create'::public.change_kind else 'update'::public.change_kind end,
      case when target_id is null then
        jsonb_build_object('name', item ->> 'suggested_name', 'summary', item ->> 'reason', 'is_loose_thread', true, 'resolution_state', 'active')
      else
        jsonb_build_object('summary', item ->> 'reason', 'is_loose_thread', true)
      end,
      expected_version, reason, source_ids
    );
    v_draft_count := v_draft_count + 1;
  end loop;

  next_session_id := nullif(run_row.input_payload ->> 'next_session_id', '')::uuid;
  for item in select value from jsonb_array_elements(p_output -> 'next_prep_implications') loop
    source_ids := internal.synthesis_item_source_ids(item, 'next_prep_implication');
    reason := internal.assert_confidence_reason(item, 'next_prep_implication');
    select updated_at into expected_version from public.sessions where id = next_session_id;
    perform internal.insert_synthesis_draft(
      run_row, batch_row.id, pipeline_run_id, 'session', next_session_id, 'update',
      jsonb_build_object(
        'next_prep_implication', item ->> 'text',
        'related_thread_id', item ->> 'related_thread_id',
        'related_entity_ids', coalesce(item -> 'related_entity_ids', '[]'::jsonb),
        'source_session_id', run_row.session_id
      ),
      expected_version, reason, source_ids
    );
    v_draft_count := v_draft_count + 1;
  end loop;

  update internal.ai_draft_batches
  set state = 'complete', draft_count = v_draft_count, completed_at = now()
  where id = batch_row.id;

  update internal.ai_task_runs
  set status = 'complete', output_payload = p_output, validation_errors = '[]'::jsonb,
      failure_reason = null, updated_at = now(), completed_at = now()
  where id = run_row.id;

  update public.pipeline_runs
  set state = 'ready_for_review', failure_reason = null, updated_at = now()
  where id = pipeline_run_id;

  return jsonb_build_object('ok', true, 'run_id', run_row.id, 'batch_id', batch_row.id, 'draft_count', v_draft_count, 'replayed', false);
end;
$$;

alter function internal.record_ai_task_output(uuid, jsonb, uuid[])
  rename to record_ai_task_output_legacy;

create function internal.record_ai_task_output(
  p_run_id uuid,
  p_output jsonb,
  p_allowed_source_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = public, internal, pg_temp
as $$
declare
  run_task_name text;
begin
  select task_name into run_task_name from internal.ai_task_runs where id = p_run_id;
  if run_task_name is null then raise exception 'AI task run is not available' using errcode = '42501'; end if;
  if run_task_name = 'synthesize_session' then
    return internal.record_synthesis_output(p_run_id, p_output, p_allowed_source_ids);
  end if;
  return internal.record_ai_task_output_legacy(p_run_id, p_output, p_allowed_source_ids);
end;
$$;

create or replace function public.record_ai_task_output_for_worker(
  p_run_id uuid,
  p_output jsonb,
  p_allowed_source_ids uuid[],
  p_resolved_model text,
  p_resolved_provider text
)
returns jsonb
language plpgsql
security definer
set search_path = public, internal, pg_temp
as $$
declare
  run_row internal.ai_task_runs%rowtype;
begin
  select * into run_row from internal.ai_task_runs where id = p_run_id for update;
  if not found then raise exception 'AI task run is not available' using errcode = '42501'; end if;
  if nullif(p_resolved_model, '') is null or nullif(p_resolved_provider, '') is null then
    raise exception 'Resolved model and provider are required' using errcode = '22023';
  end if;
  if run_row.status = 'complete' and (
    run_row.resolved_model is distinct from p_resolved_model or run_row.resolved_provider is distinct from p_resolved_provider
  ) then
    raise exception 'Completed AI run provenance does not match retry delivery' using errcode = '23505';
  end if;
  if run_row.status <> 'complete' then
    update internal.ai_task_runs
    set resolved_model = p_resolved_model, resolved_provider = p_resolved_provider, updated_at = now()
    where id = p_run_id;
  end if;
  return internal.record_ai_task_output(p_run_id, p_output, p_allowed_source_ids);
end;
$$;

revoke all on function public.record_ai_task_output_for_worker(uuid, jsonb, uuid[], text, text) from public, anon, authenticated;
grant execute on function public.get_ai_task_run_for_worker(uuid) to service_role;
grant execute on function public.record_ai_task_output_for_worker(uuid, jsonb, uuid[], text, text) to service_role;
grant execute on function public.mark_ai_task_run_failed_for_worker(uuid, text, jsonb, int) to service_role;
grant execute on function public.set_ai_task_usage_for_worker(uuid, uuid) to service_role;

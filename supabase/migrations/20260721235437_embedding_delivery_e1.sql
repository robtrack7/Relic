set check_function_bodies = off;

-- Packet E1 keeps the existing vector(1536) storage/index and versions delivery
-- metadata around it. Source text and vectors never enter job or dead-letter payloads.
alter table internal.embedding_jobs drop constraint if exists embedding_jobs_state_check;
alter table internal.embedding_jobs drop constraint if exists embedding_jobs_source_kind_source_entity_id_model_model_ver_key;

update internal.embedding_jobs
set state = case state
  when 'pending' then 'queued'
  when 'failed' then 'dead_letter'
  else state
end;

alter table internal.embedding_jobs
  add column if not exists purpose text not null default 'retrieval',
  add column if not exists chunk_index integer not null default 0,
  add column if not exists provider_alias text not null default 'relic-embed',
  add column if not exists resolved_model text not null default 'text-embedding-3-small',
  add column if not exists dimensions integer not null default 1536,
  add column if not exists input_hash text,
  add column if not exists source_version text,
  add column if not exists request_identity text,
  add column if not exists failure_category text,
  add column if not exists last_attempt_at timestamptz,
  add column if not exists provider_request_id text,
  add column if not exists provider_accepted_at timestamptz,
  add column if not exists usage_event_id uuid references public.usage_events(id) on delete set null,
  add column if not exists superseded_by uuid references internal.embedding_jobs(id) on delete set null,
  add column if not exists replay_count integer not null default 0;

update internal.embedding_jobs
set input_hash = coalesce(input_hash, encode(extensions.digest(id::text, 'sha256'), 'hex')),
    source_version = coalesce(source_version, 'legacy'),
    request_identity = coalesce(request_identity, idempotency_key, id::text),
    scheduled_at = greatest(scheduled_at, debounce_until)
where input_hash is null or source_version is null or request_identity is null;

alter table internal.embedding_jobs
  alter column state set default 'queued',
  alter column input_hash set not null,
  alter column source_version set not null,
  alter column request_identity set not null,
  add constraint embedding_jobs_state_check
    check (state in ('queued', 'running', 'retryable', 'complete', 'stale', 'terminal', 'dead_letter')),
  add constraint embedding_jobs_dimensions_check check (dimensions = 1536),
  add constraint embedding_jobs_attempts_check check (attempts between 0 and max_attempts);

create or replace function internal.normalize_legacy_embedding_job_state()
returns trigger
language plpgsql
set search_path = pg_temp
as $$
begin
  if new.state = 'pending' then new.state := 'queued'; end if;
  if new.state = 'failed' then new.state := 'dead_letter'; end if;
  return new;
end;
$$;

drop trigger if exists normalize_legacy_embedding_job_state on internal.embedding_jobs;
create trigger normalize_legacy_embedding_job_state
before insert or update of state on internal.embedding_jobs
for each row execute function internal.normalize_legacy_embedding_job_state();

drop index if exists internal.embedding_jobs_pending_idx;
create index embedding_jobs_ready_idx
  on internal.embedding_jobs(state, scheduled_at, created_at)
  where state in ('queued', 'retryable');
create index embedding_jobs_owner_version_idx
  on internal.embedding_jobs(workspace_id, world_id, saga_id, source_kind, source_entity_id, chunk_index, created_at desc);
create unique index embedding_jobs_request_identity_idx
  on internal.embedding_jobs(request_identity);

alter table public.embeddings
  add column if not exists embedding_job_id uuid references internal.embedding_jobs(id) on delete set null,
  add column if not exists purpose text not null default 'retrieval',
  add column if not exists provider text not null default 'legacy',
  add column if not exists dimensions integer not null default 1536,
  add column if not exists input_hash text,
  add column if not exists source_version text,
  add column if not exists request_identity text,
  add column if not exists provider_request_id text,
  add column if not exists succeeded_at timestamptz,
  add column if not exists stale_at timestamptz;

alter table public.embeddings
  add constraint embeddings_dimensions_check check (dimensions = 1536);

create unique index embeddings_job_result_idx
  on public.embeddings(embedding_job_id)
  where embedding_job_id is not null;
create index embeddings_compatible_current_idx
  on public.embeddings(workspace_id, world_id, saga_id, model, model_version, dimensions, is_current)
  where is_current and embedding is not null and stale_at is null;

create or replace function internal.normalize_embedding_input(p_text text)
returns text
language plpgsql
immutable
set search_path = pg_catalog, pg_temp
as $$
declare
  normalized text;
  paragraph text;
  paragraphs text[] := array[]::text[];
begin
  if p_text is null then return null; end if;
  normalized := normalize(replace(replace(p_text, E'\r\n', E'\n'), E'\r', E'\n'), NFKC);
  normalized := regexp_replace(normalized, E'\n[[:space:]]*\n+', E'\n\n', 'g');
  foreach paragraph in array regexp_split_to_array(normalized, E'\n\n') loop
    paragraph := trim(regexp_replace(paragraph, '[[:space:]]+', ' ', 'g'));
    if paragraph <> '' then paragraphs := array_append(paragraphs, paragraph); end if;
  end loop;
  return nullif(array_to_string(paragraphs, E'\n\n'), '');
end;
$$;

create or replace function internal.embedding_input_hash(p_text text)
returns text
language sql
immutable
set search_path = extensions, internal, pg_temp
as $$
  select encode(extensions.digest(coalesce(internal.normalize_embedding_input(p_text), ''), 'sha256'), 'hex');
$$;

create or replace function internal.current_transcript_window_text(
  p_transcript_id uuid,
  p_start_seconds numeric,
  p_end_seconds numeric
)
returns text
language sql
stable
set search_path = public, pg_temp
as $$
  select nullif(string_agg(trim(segment->>'text'), ' ' order by ordinality), '')
  from public.transcripts t
  cross join lateral jsonb_array_elements(t.segments) with ordinality as entry(segment, ordinality)
  where t.id = p_transcript_id
    and t.deleted_at is null
    and t.state = 'complete'
    and coalesce((segment->>'deleted')::boolean, false) = false
    and (segment->>'end')::numeric > p_start_seconds
    and (segment->>'start')::numeric < p_end_seconds;
$$;

create or replace function internal.embedding_chunk_for_identity(
  p_source_kind text,
  p_source_entity_type public.entity_type,
  p_source_entity_id uuid,
  p_source_id uuid,
  p_chunk_index integer
)
returns table (
  workspace_id uuid,
  world_id uuid,
  saga_id uuid,
  scope public.content_scope,
  input_text text,
  source_version text,
  eligible boolean,
  effective_source_id uuid
)
language plpgsql
stable
set search_path = public, internal, pg_temp
as $$
declare
  note_row public.notes%rowtype;
  source_row public.sources%rowtype;
  transcript_row public.transcripts%rowtype;
  section_text text;
begin
  if p_source_kind = 'entity' and p_source_entity_type = 'character' then
    return query select c.workspace_id, c.world_id, c.saga_id, c.scope,
      left(concat_ws(E'\n\n', c.name, c.summary, c.narrative), 6000),
      to_char(c.updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
      c.canon_state <> 'archived', coalesce(p_source_id, (select src.id from public.sources src where src.source_entity_type = 'character' and src.source_entity_id = c.id order by src.created_at desc, src.id desc limit 1))
    from public.characters c where c.id = p_source_entity_id and p_chunk_index = 0;
  elsif p_source_kind = 'entity' and p_source_entity_type = 'place' then
    return query select p.workspace_id, p.world_id, p.saga_id, p.scope,
      left(concat_ws(E'\n\n', p.name, p.summary, p.narrative), 6000),
      to_char(p.updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
      p.canon_state <> 'archived', coalesce(p_source_id, (select src.id from public.sources src where src.source_entity_type = 'place' and src.source_entity_id = p.id order by src.created_at desc, src.id desc limit 1))
    from public.places p where p.id = p_source_entity_id and p_chunk_index = 0;
  elsif p_source_kind = 'entity' and p_source_entity_type = 'faction' then
    return query select f.workspace_id, f.world_id, f.saga_id, f.scope,
      left(concat_ws(E'\n\n', f.name, f.summary, f.narrative), 6000),
      to_char(f.updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
      f.canon_state <> 'archived', coalesce(p_source_id, (select src.id from public.sources src where src.source_entity_type = 'faction' and src.source_entity_id = f.id order by src.created_at desc, src.id desc limit 1))
    from public.factions f where f.id = p_source_entity_id and p_chunk_index = 0;
  elsif p_source_kind = 'entity' and p_source_entity_type = 'artifact' then
    return query select a.workspace_id, a.world_id, a.saga_id, a.scope,
      left(concat_ws(E'\n\n', a.name, a.summary, a.narrative), 6000),
      to_char(a.updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
      a.canon_state <> 'archived', coalesce(p_source_id, (select src.id from public.sources src where src.source_entity_type = 'artifact' and src.source_entity_id = a.id order by src.created_at desc, src.id desc limit 1))
    from public.artifacts a where a.id = p_source_entity_id and p_chunk_index = 0;
  elsif p_source_kind = 'entity' and p_source_entity_type = 'thread' then
    return query select t.workspace_id, t.world_id, t.saga_id, t.scope,
      left(concat_ws(E'\n\n', t.name, t.summary, t.narrative, t.objective), 6000),
      to_char(t.updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
      t.canon_state <> 'archived', coalesce(p_source_id, (select src.id from public.sources src where src.source_entity_type = 'thread' and src.source_entity_id = t.id order by src.created_at desc, src.id desc limit 1))
    from public.threads t where t.id = p_source_entity_id and p_chunk_index = 0;
  elsif p_source_kind = 'session' then
    return query select s.workspace_id, s.world_id, s.saga_id, s.scope,
      left(concat_ws(E'\n\n', s.name, s.summary, s.narrative, s.objective, s.opening_scene), 6000),
      to_char(s.updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
      true, coalesce(p_source_id, (select src.id from public.sources src where src.source_entity_type = 'session' and src.source_entity_id = s.id order by src.created_at desc, src.id desc limit 1))
    from public.sessions s where s.id = p_source_entity_id and p_chunk_index = 0;
  elsif p_source_kind = 'note' then
    select * into note_row from public.notes n where n.id = p_source_entity_id;
    if note_row.id is null then return; end if;
    if p_chunk_index = 0 then
      section_text := concat_ws(E'\n\n', note_row.title, note_row.body);
    elsif length(note_row.body) > 2000 then
      select trim(value) into section_text
      from regexp_split_to_table(note_row.body, E'\n[[:space:]]*\n+') with ordinality as part(value, position)
      where position = p_chunk_index;
    end if;
    if section_text is null then return; end if;
    return query select note_row.workspace_id, note_row.world_id, note_row.saga_id, note_row.scope,
      left(section_text, 24000),
      to_char(note_row.updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
      note_row.canon_state <> 'archived'
        and note_row.note_type in ('lore', 'summary', 'quick_capture')
        and (note_row.note_type <> 'quick_capture' or exists (
          select 1 from public.sources src join public.sessions ses on ses.id = src.session_id
          where src.note_id = note_row.id and ses.ended_at is not null
        )),
      coalesce(p_source_id, internal.latest_source_for_embedding(
        note_row.workspace_id, note_row.world_id, note_row.saga_id, note_row.scope,
        'note', null, note_row.id
      ));
  elsif p_source_kind = 'transcript_chunk' then
    select * into source_row from public.sources s
    where s.id = p_source_id and s.transcript_id = p_source_entity_id and s.kind = 'transcript_segment';
    if source_row.id is null then return; end if;
    select * into transcript_row from public.transcripts t where t.id = source_row.transcript_id;
    return query select source_row.workspace_id, source_row.world_id, source_row.saga_id, source_row.scope,
      internal.current_transcript_window_text(source_row.transcript_id, source_row.start_seconds, source_row.end_seconds),
      to_char(transcript_row.updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
      transcript_row.deleted_at is null and transcript_row.state = 'complete'
        and internal.current_transcript_window_text(source_row.transcript_id, source_row.start_seconds, source_row.end_seconds) is not null,
      source_row.id;
  else
    raise exception 'unsupported_embedding_owner' using errcode = '23514';
  end if;
end;
$$;

create or replace function internal.enqueue_embedding_job(
  p_workspace_id uuid,
  p_world_id uuid,
  p_saga_id uuid,
  p_source_kind text,
  p_source_entity_type public.entity_type,
  p_source_entity_id uuid,
  p_source_id uuid default null,
  p_debounce interval default interval '5 seconds'
)
returns uuid
language plpgsql
security definer
set search_path = public, internal, extensions, pg_temp
as $$
declare
  chunk record;
  chunk_number integer;
  maximum_chunk integer := case when p_source_kind = 'note' then 100 else 0 end;
  first_job_id uuid;
  queued_id uuid;
  effective_source_id uuid := p_source_id;
  normalized_text text;
  hash_value text;
  identity_value text;
  owner_gm_id uuid;
begin
  if p_source_entity_id is null then
    raise exception 'embedding_owner_required' using errcode = '22023';
  end if;

  if p_source_kind = 'transcript_chunk' then
    select greatest(0, floor(coalesce(s.start_seconds, 0) / 50)::integer), s.id
      into chunk_number, effective_source_id
    from public.sources s
    where s.id = p_source_id
      and s.transcript_id = p_source_entity_id
      and s.kind = 'transcript_segment';
    if effective_source_id is null then
      raise exception 'transcript_embedding_source_missing' using errcode = '22023';
    end if;
    maximum_chunk := chunk_number;
  else
    chunk_number := 0;
  end if;

  while chunk_number <= maximum_chunk loop
    select * into chunk
    from internal.embedding_chunk_for_identity(
      p_source_kind, p_source_entity_type, p_source_entity_id, effective_source_id, chunk_number
    );

    if chunk.workspace_id is null then
      if p_source_kind = 'note' and chunk_number > 0 then exit; end if;
      chunk_number := chunk_number + 1;
      continue;
    end if;

    if chunk.workspace_id <> p_workspace_id
      or chunk.world_id <> p_world_id
      or chunk.saga_id is distinct from p_saga_id then
      raise exception 'embedding_scope_mismatch' using errcode = '42501';
    end if;

    select w.owner_gm_id into owner_gm_id
    from public.workspaces w
    where w.id = chunk.workspace_id and w.deleted_at is null;
    if owner_gm_id is null then
      raise exception 'embedding_workspace_unavailable' using errcode = '42501';
    end if;

    normalized_text := internal.normalize_embedding_input(chunk.input_text);
    if coalesce(chunk.eligible, false) and normalized_text is not null then
      hash_value := internal.embedding_input_hash(normalized_text);
      identity_value := encode(extensions.digest(concat_ws(':',
        chunk.workspace_id::text,
        chunk.world_id::text,
        coalesce(chunk.saga_id::text, 'world'),
        p_source_kind,
        coalesce(p_source_entity_type::text, 'none'),
        p_source_entity_id::text,
        'retrieval',
        chunk_number::text,
        hash_value,
        chunk.source_version,
        'relic-embed',
        'text-embedding-3-small',
        '1536',
        'mvp'
      ), 'sha256'), 'hex');

      insert into internal.embedding_jobs (
        workspace_id, world_id, saga_id, gm_id,
        source_kind, source_entity_type, source_entity_id, source_id,
        purpose, chunk_index, provider_alias, model, resolved_model, model_version, dimensions,
        input_hash, source_version, request_identity, state,
        debounce_until, scheduled_at, idempotency_key, updated_at
      ) values (
        chunk.workspace_id, chunk.world_id, chunk.saga_id, coalesce(auth.uid(), owner_gm_id),
        p_source_kind, p_source_entity_type, p_source_entity_id, chunk.effective_source_id,
        'retrieval', chunk_number, 'relic-embed', 'text-embedding-3-small', 'text-embedding-3-small', 'mvp', 1536,
        hash_value, chunk.source_version, identity_value, 'queued',
        now() + p_debounce, now() + p_debounce, identity_value, now()
      )
      on conflict (idempotency_key) do update set
        state = case when internal.embedding_jobs.state = 'stale' then 'queued' else internal.embedding_jobs.state end,
        attempts = case when internal.embedding_jobs.state = 'stale' then 0 else internal.embedding_jobs.attempts end,
        superseded_by = case when internal.embedding_jobs.state = 'stale' then null else internal.embedding_jobs.superseded_by end,
        scheduled_at = case
          when internal.embedding_jobs.state in ('queued', 'retryable', 'stale')
            then least(internal.embedding_jobs.scheduled_at, excluded.scheduled_at)
          else internal.embedding_jobs.scheduled_at
        end,
        debounce_until = case
          when internal.embedding_jobs.state in ('queued', 'retryable', 'stale')
            then least(internal.embedding_jobs.debounce_until, excluded.debounce_until)
          else internal.embedding_jobs.debounce_until
        end,
        updated_at = now()
      returning id into queued_id;

      update internal.embedding_jobs old_job
      set state = 'stale',
          superseded_by = queued_id,
          locked_by = null,
          locked_at = null,
          updated_at = now()
      where old_job.workspace_id = chunk.workspace_id
        and old_job.world_id = chunk.world_id
        and old_job.saga_id is not distinct from chunk.saga_id
        and old_job.source_kind = p_source_kind
        and old_job.source_entity_id = p_source_entity_id
        and old_job.chunk_index = chunk_number
        and old_job.purpose = 'retrieval'
        and old_job.id <> queued_id
        and old_job.state in ('queued', 'running', 'retryable', 'terminal', 'dead_letter');

      first_job_id := coalesce(first_job_id, queued_id);
    else
      update internal.embedding_jobs old_job
      set state = 'stale', locked_by = null, locked_at = null, updated_at = now()
      where old_job.source_kind = p_source_kind
        and old_job.source_entity_id = p_source_entity_id
        and old_job.chunk_index = chunk_number
        and old_job.state in ('queued', 'running', 'retryable', 'terminal', 'dead_letter');

      update public.embeddings e
      set is_current = false, stale_at = coalesce(e.stale_at, now())
      where e.source_kind = p_source_kind
        and e.source_entity_id = p_source_entity_id
        and e.chunk_index = chunk_number
        and e.is_current;
    end if;

    chunk_number := chunk_number + 1;
  end loop;

  -- Removed note sections are no longer eligible, while changed surviving chunks
  -- retain their last good vector until replacement succeeds.
  if p_source_kind = 'note' then
    update public.embeddings e
    set is_current = false, stale_at = coalesce(e.stale_at, now())
    where e.source_kind = 'note'
      and e.source_entity_id = p_source_entity_id
      and e.is_current
      and not exists (
        select 1
        from internal.embedding_chunk_for_identity('note', null, p_source_entity_id, null, e.chunk_index) current_chunk
        where current_chunk.eligible and internal.normalize_embedding_input(current_chunk.input_text) is not null
      );
  end if;

  return first_job_id;
end;
$$;

create or replace function internal.claim_embedding_job(worker_id text)
returns jsonb
language plpgsql
security definer
set search_path = public, internal, pg_temp
as $$
declare
  claimed internal.embedding_jobs%rowtype;
begin
  if nullif(trim(worker_id), '') is null then
    raise exception 'worker_id_required' using errcode = '22023';
  end if;

  update internal.embedding_jobs job
  set state = 'running',
      locked_by = left(trim(worker_id), 200),
      locked_at = now(),
      started_at = coalesce(job.started_at, now()),
      last_attempt_at = now(),
      updated_at = now()
  where job.id = (
    select ready.id
    from internal.embedding_jobs ready
    where ready.state in ('queued', 'retryable')
      and greatest(ready.scheduled_at, ready.debounce_until) <= now()
    order by greatest(ready.scheduled_at, ready.debounce_until), ready.created_at, ready.id
    for update skip locked
    limit 1
  )
  returning * into claimed;

  if claimed.id is null then return null; end if;
  return jsonb_build_object(
    'id', claimed.id,
    'workspace_id', claimed.workspace_id,
    'world_id', claimed.world_id,
    'saga_id', claimed.saga_id,
    'gm_id', claimed.gm_id,
    'source_kind', claimed.source_kind,
    'source_entity_type', claimed.source_entity_type,
    'source_entity_id', claimed.source_entity_id,
    'source_id', claimed.source_id,
    'chunk_index', claimed.chunk_index,
    'purpose', claimed.purpose,
    'provider_alias', claimed.provider_alias,
    'model', claimed.resolved_model,
    'dimensions', claimed.dimensions,
    'input_hash', claimed.input_hash,
    'source_version', claimed.source_version,
    'request_identity', claimed.request_identity,
    'attempts', claimed.attempts
  );
end;
$$;

create or replace function public.claim_embedding_job_for_worker(worker_id text)
returns jsonb
language sql
security definer
set search_path = public, internal, pg_temp
as $$
  select internal.claim_embedding_job(worker_id);
$$;

create or replace function public.claim_transcript_embedding_job_for_worker(worker_id text)
returns jsonb
language plpgsql
security definer
set search_path = public, internal, pg_temp
as $$
declare
  claimed internal.embedding_jobs%rowtype;
begin
  if nullif(trim(worker_id), '') is null then raise exception 'worker_id_required' using errcode = '22023'; end if;
  update internal.embedding_jobs job
  set state = 'running', locked_by = left(trim(worker_id), 200), locked_at = now(),
      started_at = coalesce(job.started_at, now()), last_attempt_at = now(), updated_at = now()
  where job.id = (
    select ready.id from internal.embedding_jobs ready
    where ready.source_kind = 'transcript_chunk'
      and ready.state in ('queued', 'retryable')
      and greatest(ready.scheduled_at, ready.debounce_until) <= now()
    order by greatest(ready.scheduled_at, ready.debounce_until), ready.created_at, ready.id
    for update skip locked limit 1
  ) returning * into claimed;
  if claimed.id is null then return null; end if;
  return jsonb_build_object(
    'id', claimed.id, 'workspace_id', claimed.workspace_id, 'world_id', claimed.world_id,
    'saga_id', claimed.saga_id, 'gm_id', claimed.gm_id, 'source_kind', claimed.source_kind,
    'source_entity_type', claimed.source_entity_type, 'source_entity_id', claimed.source_entity_id,
    'source_id', claimed.source_id, 'chunk_index', claimed.chunk_index, 'purpose', claimed.purpose,
    'provider_alias', claimed.provider_alias, 'model', claimed.resolved_model,
    'dimensions', claimed.dimensions, 'input_hash', claimed.input_hash,
    'source_version', claimed.source_version, 'request_identity', claimed.request_identity,
    'attempts', claimed.attempts
  );
end;
$$;

create or replace function public.prepare_embedding_job(job_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, internal, pg_temp
as $$
declare
  job internal.embedding_jobs%rowtype;
  chunk record;
  normalized_text text;
  monthly_cap numeric;
  used_units numeric;
begin
  select * into job from internal.embedding_jobs where id = job_id for update;
  if job.id is null or job.state <> 'running' then
    raise exception 'embedding_job_unavailable' using errcode = '22023';
  end if;
  if auth.uid() is null or auth.uid() <> job.gm_id or not public.user_can_access_workspace(job.workspace_id) then
    raise exception 'embedding_job_scope_denied' using errcode = '42501';
  end if;

  select * into chunk from internal.embedding_chunk_for_identity(
    job.source_kind, job.source_entity_type, job.source_entity_id, job.source_id, job.chunk_index
  );
  normalized_text := internal.normalize_embedding_input(chunk.input_text);

  if chunk.workspace_id is null
    or chunk.workspace_id <> job.workspace_id
    or chunk.world_id <> job.world_id
    or chunk.saga_id is distinct from job.saga_id
    or not coalesce(chunk.eligible, false)
    or normalized_text is null
    or internal.embedding_input_hash(normalized_text) <> job.input_hash
    or chunk.source_version <> job.source_version then
    update internal.embedding_jobs
    set state = 'stale', locked_by = null, locked_at = null,
        failure_category = 'superseded', failure_reason = 'superseded', updated_at = now()
    where id = job.id;
    return jsonb_build_object('status', 'stale');
  end if;

  select qo.override_value into monthly_cap
  from public.quota_overrides qo
  where qo.workspace_id = job.workspace_id
    and qo.limit_key = 'embedding_tokens_monthly'
    and (qo.expires_at is null or qo.expires_at > now())
  order by qo.created_at desc
  limit 1;

  if monthly_cap is not null then
    select coalesce(sum(ue.units), 0) into used_units
    from public.usage_events ue
    where ue.workspace_id = job.workspace_id
      and ue.event_kind = 'embedding'
      and ue.created_at >= date_trunc('month', now());
    if used_units >= monthly_cap then
      update internal.embedding_jobs
      set state = 'retryable', scheduled_at = now() + interval '1 hour',
          locked_by = null, locked_at = null, failure_category = 'quota_denied',
          failure_reason = 'quota_denied', updated_at = now()
      where id = job.id;
      return jsonb_build_object('status', 'quota_blocked');
    end if;
  end if;

  return jsonb_build_object(
    'status', 'ready',
    'input', normalized_text,
    'input_hash', job.input_hash,
    'source_version', job.source_version,
    'provider_alias', job.provider_alias,
    'model', job.resolved_model,
    'dimensions', job.dimensions
  );
end;
$$;

create or replace function internal.record_embedding_usage(
  p_job_id uuid,
  p_provider text,
  p_model text,
  p_usage jsonb,
  p_provider_request_id text,
  p_stale_delivery boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public, internal, pg_temp
as $$
declare
  job internal.embedding_jobs%rowtype;
  usage_id uuid;
  input_tokens integer;
  total_tokens integer;
begin
  select * into job from internal.embedding_jobs where id = p_job_id;
  if job.id is null then raise exception 'embedding_job_missing' using errcode = '22023'; end if;
  input_tokens := case when (p_usage->>'input_tokens') ~ '^[0-9]+$' then (p_usage->>'input_tokens')::integer end;
  total_tokens := case when (p_usage->>'total_tokens') ~ '^[0-9]+$' then (p_usage->>'total_tokens')::integer end;

  insert into public.usage_events (
    workspace_id, world_id, saga_id, actor_gm_id,
    event_kind, task_name, provider, model,
    units, unit_type, tokens_in, idempotency_key, metadata
  ) values (
    job.workspace_id, job.world_id, job.saga_id, job.gm_id,
    'embedding', 'embed_row', left(coalesce(nullif(p_provider, ''), 'unknown'), 100),
    left(coalesce(nullif(p_model, ''), job.resolved_model), 200),
    coalesce(total_tokens, input_tokens, 1), case when coalesce(total_tokens, input_tokens) is null then 'request' else 'token' end,
    input_tokens, 'embedding-job:' || job.id::text || ':provider-accepted',
    jsonb_build_object(
      'job_id', job.id,
      'request_identity', job.request_identity,
      'provider_request_id', left(coalesce(p_provider_request_id, ''), 200),
      'dimensions', job.dimensions,
      'stale_delivery', p_stale_delivery,
      'user_charge', not p_stale_delivery
    )
  )
  on conflict (idempotency_key) do update set idempotency_key = excluded.idempotency_key
  returning id into usage_id;

  update internal.embedding_jobs
  set usage_event_id = usage_id,
      provider_accepted_at = coalesce(provider_accepted_at, now()),
      provider_request_id = coalesce(provider_request_id, left(p_provider_request_id, 200)),
      updated_at = now()
  where id = job.id;
  return usage_id;
end;
$$;

create or replace function public.complete_embedding_job_for_worker(
  p_job_id uuid,
  p_vector jsonb,
  p_provider text,
  p_resolved_model text,
  p_dimensions integer,
  p_usage jsonb default '{}'::jsonb,
  p_provider_request_id text default null,
  p_billable boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public, internal, extensions, pg_temp
as $$
declare
  job internal.embedding_jobs%rowtype;
  chunk record;
  normalized_text text;
  inserted_id uuid;
  usage_id uuid;
  stale_delivery boolean := false;
begin
  select * into job from internal.embedding_jobs where id = p_job_id for update;
  if job.id is null then raise exception 'embedding_job_missing' using errcode = '22023'; end if;
  if job.state = 'complete' then
    select id into inserted_id from public.embeddings where embedding_job_id = job.id;
    return jsonb_build_object('status', 'complete', 'embedding_id', inserted_id, 'exact_redelivery', true);
  end if;

  if p_dimensions <> job.dimensions
    or jsonb_typeof(p_vector) <> 'array'
    or jsonb_array_length(p_vector) <> job.dimensions then
    raise exception 'embedding_dimension_mismatch' using errcode = '22023';
  end if;
  if nullif(trim(p_provider), '') is null or nullif(trim(p_resolved_model), '') is null then
    raise exception 'embedding_metadata_invalid' using errcode = '22023';
  end if;

  select * into chunk from internal.embedding_chunk_for_identity(
    job.source_kind, job.source_entity_type, job.source_entity_id, job.source_id, job.chunk_index
  );
  normalized_text := internal.normalize_embedding_input(chunk.input_text);
  stale_delivery := job.state = 'stale'
    or chunk.workspace_id is null
    or chunk.workspace_id <> job.workspace_id
    or chunk.world_id <> job.world_id
    or chunk.saga_id is distinct from job.saga_id
    or not coalesce(chunk.eligible, false)
    or normalized_text is null
    or internal.embedding_input_hash(normalized_text) <> job.input_hash
    or chunk.source_version <> job.source_version
    or exists (
      select 1 from internal.embedding_jobs newer
      where newer.source_kind = job.source_kind
        and newer.source_entity_id = job.source_entity_id
        and newer.chunk_index = job.chunk_index
        and newer.purpose = job.purpose
        and newer.created_at > job.created_at
        and newer.state in ('queued', 'running', 'retryable', 'complete')
    );

  if p_billable then
    usage_id := internal.record_embedding_usage(
      job.id, p_provider, p_resolved_model, coalesce(p_usage, '{}'::jsonb), p_provider_request_id, stale_delivery
    );
  end if;

  if stale_delivery then
    update internal.embedding_jobs
    set state = 'stale', locked_by = null, locked_at = null,
        failure_category = 'superseded', failure_reason = 'superseded', updated_at = now()
    where id = job.id;
    return jsonb_build_object('status', 'stale', 'metered', usage_id is not null);
  end if;
  if job.state <> 'running' then
    raise exception 'embedding_job_not_running' using errcode = '22023';
  end if;

  insert into public.embeddings (
    workspace_id, world_id, saga_id, scope,
    source_kind, source_entity_type, source_entity_id, source_id,
    chunk_index, chunk_text, embedding, model, model_version, is_current, content_hash,
    embedding_job_id, purpose, provider, dimensions, input_hash, source_version,
    request_identity, provider_request_id, succeeded_at, stale_at
  ) values (
    job.workspace_id, job.world_id, job.saga_id, (case when job.saga_id is null then 'world' else 'saga' end)::public.content_scope,
    job.source_kind, job.source_entity_type, job.source_entity_id, chunk.effective_source_id,
    job.chunk_index, case when job.source_kind = 'transcript_chunk' then null else normalized_text end,
    (p_vector::text)::extensions.vector, p_resolved_model, job.model_version, false, job.input_hash,
    job.id, job.purpose, left(p_provider, 100), job.dimensions, job.input_hash, job.source_version,
    job.request_identity, left(p_provider_request_id, 200), now(), null
  )
  returning id into inserted_id;

  update public.embeddings e
  set is_current = false, stale_at = coalesce(e.stale_at, now())
  where e.source_kind = job.source_kind
    and e.source_entity_id = job.source_entity_id
    and e.chunk_index = job.chunk_index
    and e.purpose = job.purpose
    and e.dimensions = job.dimensions
    and e.id <> inserted_id
    and e.is_current;
  update public.embeddings set is_current = true where id = inserted_id;

  update internal.embedding_jobs
  set state = 'complete', completed_at = now(), locked_by = null, locked_at = null,
      provider_request_id = left(p_provider_request_id, 200), usage_event_id = usage_id,
      failure_category = null, failure_reason = null, updated_at = now()
  where id = job.id;

  return jsonb_build_object('status', 'complete', 'embedding_id', inserted_id, 'exact_redelivery', false);
end;
$$;

create or replace function public.fail_embedding_job_for_worker(
  p_job_id uuid,
  p_category text,
  p_retryable boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public, internal, pg_temp
as $$
declare
  job internal.embedding_jobs%rowtype;
  next_attempt integer;
  next_state text;
  delay_seconds integer;
begin
  if p_category not in (
    'invalid_input', 'input_too_large', 'configuration', 'timeout', 'provider_unavailable',
    'provider_rejected', 'malformed_response', 'dimension_mismatch', 'quota_denied', 'persistence'
  ) then p_category := 'provider_unavailable'; end if;

  select * into job from internal.embedding_jobs where id = p_job_id for update;
  if job.id is null then raise exception 'embedding_job_missing' using errcode = '22023'; end if;
  if job.state in ('complete', 'stale', 'terminal', 'dead_letter') then
    return jsonb_build_object('status', job.state, 'attempts', job.attempts);
  end if;

  next_attempt := least(job.attempts + 1, job.max_attempts);
  if p_retryable and next_attempt < job.max_attempts then
    next_state := 'retryable';
    delay_seconds := case next_attempt when 1 then 1 when 2 then 4 when 3 then 16 else 60 end;
  elsif p_retryable then
    next_state := 'dead_letter';
  else
    next_state := 'terminal';
  end if;

  update internal.embedding_jobs
  set state = next_state,
      attempts = next_attempt,
      scheduled_at = case when next_state = 'retryable' then now() + make_interval(secs => delay_seconds) else scheduled_at end,
      locked_by = null, locked_at = null,
      failure_category = p_category, failure_reason = p_category,
      last_attempt_at = now(), updated_at = now()
  where id = job.id;

  if next_state in ('terminal', 'dead_letter') then
    perform internal.write_dead_letter(
      'embedding_jobs', job.id,
      jsonb_build_object(
        'workspace_id', job.workspace_id, 'world_id', job.world_id, 'saga_id', job.saga_id,
        'source_kind', job.source_kind, 'source_entity_id', job.source_entity_id,
        'chunk_index', job.chunk_index, 'request_identity', job.request_identity,
        'failure_category', p_category, 'attempts', next_attempt
      ),
      p_category
    );
  end if;
  return jsonb_build_object('status', next_state, 'attempts', next_attempt);
end;
$$;

create or replace function public.replay_embedding_job_for_worker(p_job_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, internal, pg_temp
as $$
declare
  job internal.embedding_jobs%rowtype;
  chunk record;
  normalized_text text;
begin
  select * into job from internal.embedding_jobs where id = p_job_id for update;
  if job.id is null then raise exception 'embedding_job_missing' using errcode = '22023'; end if;
  if job.state in ('queued', 'running', 'retryable', 'complete') then
    return jsonb_build_object('status', job.state, 'duplicate_replay', true);
  end if;
  if job.state not in ('terminal', 'dead_letter') then
    return jsonb_build_object('status', job.state, 'duplicate_replay', false);
  end if;

  select * into chunk from internal.embedding_chunk_for_identity(
    job.source_kind, job.source_entity_type, job.source_entity_id, job.source_id, job.chunk_index
  );
  normalized_text := internal.normalize_embedding_input(chunk.input_text);
  if chunk.workspace_id is null or not coalesce(chunk.eligible, false)
    or internal.embedding_input_hash(normalized_text) <> job.input_hash
    or chunk.source_version <> job.source_version then
    update internal.embedding_jobs set state = 'stale', updated_at = now() where id = job.id;
    return jsonb_build_object('status', 'stale', 'duplicate_replay', false);
  end if;

  update internal.embedding_jobs
  set state = 'queued', attempts = 0, scheduled_at = now(), debounce_until = now(),
      locked_by = null, locked_at = null, failure_category = null, failure_reason = null,
      replay_count = replay_count + 1, updated_at = now()
  where id = job.id;
  update internal.dead_letter_jobs
  set payload = payload || jsonb_build_object('replayed_at', now(), 'replay_count', job.replay_count + 1)
  where job_table = 'internal.embedding_jobs' and job_id = job.id;
  return jsonb_build_object('status', 'queued', 'duplicate_replay', false);
end;
$$;

create or replace function public.get_embedding_job_status(
  workspace_id uuid,
  world_id uuid,
  saga_id uuid,
  source_kind text,
  source_entity_id uuid
)
returns table (
  job_id uuid, chunk_index integer, state text, attempts integer, failure_category text,
  provider_alias text, resolved_model text, dimensions integer, input_hash text,
  source_version text, scheduled_at timestamptz, last_attempt_at timestamptz,
  completed_at timestamptz, dead_lettered boolean
)
language plpgsql
security invoker
set search_path = public, internal, pg_temp
as $$
begin
  perform public.assert_saga_access(workspace_id, world_id, saga_id);
  return query
  select j.id, j.chunk_index, j.state, j.attempts, j.failure_category,
    j.provider_alias, j.resolved_model, j.dimensions, j.input_hash,
    j.source_version, j.scheduled_at, j.last_attempt_at, j.completed_at,
    exists (select 1 from internal.dead_letter_jobs d where d.job_table = 'internal.embedding_jobs' and d.job_id = j.id)
  from internal.embedding_jobs j
  where j.workspace_id = get_embedding_job_status.workspace_id
    and j.world_id = get_embedding_job_status.world_id
    and j.saga_id = get_embedding_job_status.saga_id
    and j.source_kind = get_embedding_job_status.source_kind
    and j.source_entity_id = get_embedding_job_status.source_entity_id
  order by j.created_at desc, j.chunk_index;
end;
$$;

create or replace function internal.refresh_transcript_embedding_jobs(
  p_transcript_id uuid,
  p_debounce interval default interval '5 seconds'
)
returns integer
language plpgsql
security definer
set search_path = public, internal, pg_temp
as $$
declare
  transcript_row public.transcripts%rowtype;
  window_start numeric;
  window_end numeric;
  maximum_end numeric;
  excerpt text;
  latest_source public.sources%rowtype;
  current_source_id uuid;
  queued_count integer := 0;
begin
  select * into transcript_row from public.transcripts where id = p_transcript_id for update;
  if transcript_row.id is null then return 0; end if;

  if transcript_row.deleted_at is not null or transcript_row.state <> 'complete' then
    update public.embeddings set is_current = false, stale_at = coalesce(stale_at, now())
    where source_kind = 'transcript_chunk' and source_entity_id = transcript_row.id and is_current;
    update internal.embedding_jobs set state = 'stale', locked_by = null, locked_at = null, updated_at = now()
    where source_kind = 'transcript_chunk' and source_entity_id = transcript_row.id
      and state in ('queued', 'running', 'retryable', 'terminal', 'dead_letter');
    return 0;
  end if;

  select greatest(
    coalesce(transcript_row.duration_seconds, 0),
    coalesce(max((segment->>'end')::numeric), 0)
  ) into maximum_end
  from jsonb_array_elements(transcript_row.segments) segment;

  for window_start in select generate_series(0::numeric, greatest(0, maximum_end - 0.000001), 50::numeric) loop
    window_end := least(maximum_end, window_start + 60);
    if window_end <= window_start then window_end := window_start + 60; end if;
    excerpt := internal.current_transcript_window_text(transcript_row.id, window_start, window_end);

    if excerpt is null then
      update public.embeddings e set is_current = false, stale_at = coalesce(e.stale_at, now())
      where e.source_kind = 'transcript_chunk'
        and e.source_entity_id = transcript_row.id
        and e.chunk_index = floor(window_start / 50)::integer
        and e.is_current;
      update internal.embedding_jobs j set state = 'stale', locked_by = null, locked_at = null, updated_at = now()
      where j.source_kind = 'transcript_chunk'
        and j.source_entity_id = transcript_row.id
        and j.chunk_index = floor(window_start / 50)::integer
        and j.state in ('queued', 'running', 'retryable', 'terminal', 'dead_letter');
      continue;
    end if;

    select * into latest_source
    from public.sources s
    where s.transcript_id = transcript_row.id
      and s.kind = 'transcript_segment'
      and s.start_seconds = window_start
      and s.end_seconds = window_end
    order by s.created_at desc, s.id desc
    limit 1;

    if latest_source.id is null or latest_source.raw_excerpt is distinct from excerpt then
      insert into public.sources (
        workspace_id, world_id, saga_id, scope, kind,
        transcript_id, session_id, start_seconds, end_seconds, raw_excerpt
      ) values (
        transcript_row.workspace_id, transcript_row.world_id, transcript_row.saga_id, 'saga', 'transcript_segment',
        transcript_row.id, transcript_row.session_id, window_start, window_end, excerpt
      ) returning id into current_source_id;
    else
      current_source_id := latest_source.id;
    end if;

    perform internal.enqueue_embedding_job(
      transcript_row.workspace_id, transcript_row.world_id, transcript_row.saga_id,
      'transcript_chunk', null, transcript_row.id, current_source_id, p_debounce
    );
    queued_count := queued_count + 1;
  end loop;
  return queued_count;
end;
$$;

create or replace function internal.on_transcript_embedding_change()
returns trigger
language plpgsql
security definer
set search_path = public, internal, pg_temp
as $$
declare
  pipeline_closed boolean;
  old_deleted_shape jsonb;
  new_deleted_shape jsonb;
begin
  if new.deleted_at is not null then
    perform internal.refresh_transcript_embedding_jobs(new.id, interval '0 seconds');
    return new;
  end if;

  if old.state is distinct from new.state and new.state = 'complete' then
    perform internal.refresh_transcript_embedding_jobs(new.id, interval '5 seconds');
    return new;
  end if;
  if old.segments is not distinct from new.segments then return new; end if;

  select jsonb_agg(coalesce((segment->>'deleted')::boolean, false) order by ordinality)
    into old_deleted_shape
  from jsonb_array_elements(old.segments) with ordinality as item(segment, ordinality);
  select jsonb_agg(coalesce((segment->>'deleted')::boolean, false) order by ordinality)
    into new_deleted_shape
  from jsonb_array_elements(new.segments) with ordinality as item(segment, ordinality);

  select exists (
    select 1 from public.pipeline_runs pr
    where pr.session_id = new.session_id and pr.state = 'closed'
  ) into pipeline_closed;

  if old_deleted_shape is distinct from new_deleted_shape then
    -- Hide/restore changes semantic eligibility immediately.
    perform internal.refresh_transcript_embedding_jobs(new.id, interval '5 seconds');
  elsif pipeline_closed then
    perform internal.refresh_transcript_embedding_jobs(new.id, interval '30 seconds');
  else
    -- Open-review edits still create/supersede versioned work, but the distant
    -- schedule keeps provider delivery batched until pipeline close releases it.
    perform internal.refresh_transcript_embedding_jobs(new.id, interval '365 days');
  end if;
  return new;
end;
$$;

drop trigger if exists transcript_embedding_change on public.transcripts;
create trigger transcript_embedding_change
after update of state, segments, deleted_at on public.transcripts
for each row execute function internal.on_transcript_embedding_change();

create or replace function internal.on_pipeline_close_embedding_refresh()
returns trigger
language plpgsql
security definer
set search_path = public, internal, pg_temp
as $$
declare
  transcript_id uuid;
begin
  if old.state is distinct from new.state and new.state = 'closed' then
    select t.id into transcript_id from public.transcripts t where t.session_id = new.session_id;
    if transcript_id is not null then
      perform internal.refresh_transcript_embedding_jobs(transcript_id, interval '0 seconds');
    end if;
    new.inputs_summary := new.inputs_summary - 'transcript_edit_reembed_pending';
  end if;
  return new;
end;
$$;

drop trigger if exists pipeline_close_embedding_refresh on public.pipeline_runs;
create trigger pipeline_close_embedding_refresh
before update of state on public.pipeline_runs
for each row execute function internal.on_pipeline_close_embedding_refresh();

create or replace function internal.on_session_post_session_embeddings()
returns trigger
language plpgsql
security definer
set search_path = public, internal, pg_temp
as $$
declare
  capture record;
begin
  if old.ended_at is null and new.ended_at is not null then
    for capture in
      select n.id, n.workspace_id, n.world_id, n.saga_id
      from public.notes n join public.sources src on src.note_id = n.id
      where src.session_id = new.id and n.note_type = 'quick_capture' and n.canon_state <> 'archived'
    loop
      perform internal.enqueue_embedding_job(
        capture.workspace_id, capture.world_id, capture.saga_id, 'note', null, capture.id, null, interval '5 seconds'
      );
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists session_post_session_embeddings on public.sessions;
create trigger session_post_session_embeddings
after update of ended_at on public.sessions
for each row execute function internal.on_session_post_session_embeddings();

create or replace function public.get_transcript_source_context(source_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, internal, pg_temp
as $$
declare
  source_row public.sources%rowtype;
  transcript_row public.transcripts%rowtype;
  current_text text;
  overlapping_count integer;
  all_deleted boolean;
  normalized_frozen text;
  normalized_current text;
  drift_state text;
begin
  select * into source_row from public.sources s
  where s.id = get_transcript_source_context.source_id and s.kind = 'transcript_segment';
  if source_row.id is null then
    return jsonb_build_object('status','unavailable','source_kind','unknown','label','Source unavailable','drift_state','unavailable');
  end if;
  if source_row.saga_id is null or auth.uid() is null
    or not public.user_can_access_saga(source_row.workspace_id, source_row.world_id, source_row.saga_id) then
    return jsonb_build_object('status','permission_denied','source_kind','unknown','label','Source unavailable','drift_state','unavailable');
  end if;
  if source_row.transcript_id is null or source_row.session_id is null
    or source_row.start_seconds is null or source_row.end_seconds is null then
    return jsonb_build_object('status','broken','source_kind','transcript_segment','label','Source unavailable','frozen_excerpt',nullif(source_row.raw_excerpt,''),'drift_state','unavailable');
  end if;

  select * into transcript_row from public.transcripts t
  where t.id = source_row.transcript_id
    and t.workspace_id = source_row.workspace_id and t.world_id = source_row.world_id
    and t.saga_id = source_row.saga_id and t.session_id = source_row.session_id;
  if transcript_row.id is null then
    return jsonb_build_object('status','broken','source_kind','transcript_segment','label','Source unavailable','frozen_excerpt',nullif(source_row.raw_excerpt,''),'drift_state','unavailable');
  end if;
  if transcript_row.deleted_at is not null then
    return jsonb_build_object(
      'status','available','source_kind','transcript_segment','label','Transcript evidence',
      'frozen_excerpt',source_row.raw_excerpt,'current_text',null,
      'start_seconds',source_row.start_seconds,'end_seconds',source_row.end_seconds,
      'session_id',source_row.session_id,'current_text_deleted',true,'drift_state','deleted'
    );
  end if;

  select
    string_agg(trim(segment->>'text'), ' ' order by ordinality)
      filter (where not coalesce((segment->>'deleted')::boolean,false)),
    count(*)::integer,
    bool_and(coalesce((segment->>'deleted')::boolean,false))
  into current_text, overlapping_count, all_deleted
  from jsonb_array_elements(coalesce(transcript_row.segments,'[]'::jsonb)) with ordinality as item(segment, ordinality)
  where (segment->>'end')::numeric > source_row.start_seconds
    and (segment->>'start')::numeric < source_row.end_seconds;
  if overlapping_count = 0 then
    return jsonb_build_object('status','broken','source_kind','transcript_segment','label','Source unavailable','frozen_excerpt',nullif(source_row.raw_excerpt,''),'drift_state','unavailable');
  end if;

  normalized_frozen := regexp_replace(trim(coalesce(source_row.raw_excerpt, '')), '\s+', ' ', 'g');
  normalized_current := regexp_replace(trim(coalesce(current_text, '')), '\s+', ' ', 'g');
  drift_state := case
    when all_deleted then 'deleted'
    when normalized_frozen is distinct from normalized_current then 'edited'
    else 'exact'
  end;
  return jsonb_build_object(
    'status','available','source_kind','transcript_segment','label','Transcript evidence',
    'source_id',source_row.id,'transcript_id',source_row.transcript_id,
    'frozen_excerpt',source_row.raw_excerpt,'raw_excerpt',source_row.raw_excerpt,
    'current_text',current_text,'start_seconds',source_row.start_seconds,'end_seconds',source_row.end_seconds,
    'session_id',source_row.session_id,'current_text_deleted',all_deleted,
    'drift_detected',drift_state <> 'exact','drift_state',drift_state
  );
end;
$$;

create or replace function public.search_for_ui_hybrid(
  workspace_id uuid,
  world_id uuid,
  saga_id uuid,
  query_text text,
  query_embedding text,
  top_k integer default 10,
  include_archived boolean default false,
  include_world_canon boolean default true
)
returns table (
  source_kind text,
  source_entity_type public.entity_type,
  source_entity_id uuid,
  source_id uuid,
  snippet text,
  rrf_score double precision,
  lexical_rank integer,
  semantic_rank integer,
  canon_state public.entity_canon_state,
  is_stub boolean,
  retrieval_mode text
)
language sql
security definer
stable
set search_path = public, extensions, pg_temp
as $$
with query as (
  select nullif(trim(coalesce($4, '')), '') as raw,
         case when nullif(trim(coalesce($5, '')), '') is null then null::extensions.vector
              else $5::extensions.vector end as query_vec
),
lexical as (
  select result.*,
         row_number() over (order by result.rrf_score desc, result.source_kind, result.source_entity_id)::integer as lexical_rank
  from public.search_for_ui($1, $2, $3, $4, 'sanctum', 50, $7, true, $8) result
),
semantic_corpus as (
  select 'entity'::text source_kind, 'character'::public.entity_type source_entity_type, c.id source_entity_id,
    null::uuid source_id, left(concat_ws(' - ', c.name, c.summary, c.narrative), 320) snippet,
    c.canon_state, c.is_stub, c.updated_at owner_updated_at, c.workspace_id, c.world_id, c.saga_id, c.scope
  from public.characters c
  union all select 'entity', 'place'::public.entity_type, p.id, null::uuid, left(concat_ws(' - ', p.name, p.summary, p.narrative), 320), p.canon_state, p.is_stub, p.updated_at, p.workspace_id, p.world_id, p.saga_id, p.scope from public.places p
  union all select 'entity', 'faction'::public.entity_type, f.id, null::uuid, left(concat_ws(' - ', f.name, f.summary, f.narrative), 320), f.canon_state, f.is_stub, f.updated_at, f.workspace_id, f.world_id, f.saga_id, f.scope from public.factions f
  union all select 'entity', 'artifact'::public.entity_type, a.id, null::uuid, left(concat_ws(' - ', a.name, a.summary, a.narrative), 320), a.canon_state, a.is_stub, a.updated_at, a.workspace_id, a.world_id, a.saga_id, a.scope from public.artifacts a
  union all select 'entity', 'thread'::public.entity_type, t.id, null::uuid, left(concat_ws(' - ', t.name, t.summary, t.narrative, t.objective), 320), t.canon_state, t.is_stub, t.updated_at, t.workspace_id, t.world_id, t.saga_id, t.scope from public.threads t
  union all select 'session', 'session'::public.entity_type, s.id, null::uuid, left(concat_ws(' - ', s.name, s.summary, s.narrative, s.objective, s.opening_scene), 320), 'canon'::public.entity_canon_state, false, s.updated_at, s.workspace_id, s.world_id, s.saga_id, s.scope from public.sessions s
  union all select 'note', null::public.entity_type, n.id, src.id, left(concat_ws(' - ', n.title, n.body), 320), n.canon_state, false, n.updated_at, n.workspace_id, n.world_id, n.saga_id, n.scope
    from public.notes n left join lateral (
      select so.id from public.sources so where so.note_id = n.id order by so.created_at desc, so.id desc limit 1
    ) src on true where n.note_type in ('lore', 'summary', 'quick_capture')
  union all select 'transcript_chunk', null::public.entity_type, t.id, src.id,
    left(concat_ws(' - ', 'Transcript', src.raw_excerpt), 320), 'canon'::public.entity_canon_state, false,
    t.updated_at, t.workspace_id, t.world_id, t.saga_id, 'saga'::public.content_scope
    from public.sources src join public.transcripts t on t.id = src.transcript_id
    where src.kind = 'transcript_segment' and t.state = 'complete' and t.deleted_at is null
),
semantic_ranked as (
  select corpus.*,
    row_number() over (
      partition by corpus.source_kind, corpus.source_entity_id
      order by embedding.embedding <=> q.query_vec, embedding.chunk_index, embedding.id
    ) as owner_vector_rank,
    embedding.embedding <=> q.query_vec as distance
  from semantic_corpus corpus
  join public.embeddings embedding
    on embedding.workspace_id = corpus.workspace_id
   and embedding.world_id = corpus.world_id
   and embedding.saga_id is not distinct from corpus.saga_id
   and embedding.source_kind = corpus.source_kind
   and embedding.source_entity_id = corpus.source_entity_id
   and (corpus.source_kind <> 'transcript_chunk' or embedding.source_id = corpus.source_id)
   and embedding.is_current
   and embedding.embedding is not null
   and embedding.stale_at is null
   and embedding.model = 'text-embedding-3-small'
   and embedding.dimensions = 1536
   and coalesce(embedding.succeeded_at, embedding.created_at) + interval '5 minutes' >= corpus.owner_updated_at
  cross join query q
  where q.query_vec is not null
    and public.user_can_access_saga($1, $2, $3)
    and corpus.workspace_id = $1
    and corpus.world_id = $2
    and (($8 and corpus.scope = 'world' and corpus.saga_id is null) or (corpus.scope = 'saga' and corpus.saga_id = $3))
    and ($7 or corpus.canon_state <> 'archived')
),
semantic as (
  select ranked.*,
    row_number() over (order by ranked.distance, ranked.owner_updated_at desc, ranked.source_kind, ranked.source_entity_id)::integer as semantic_rank
  from semantic_ranked ranked
  where ranked.owner_vector_rank = 1
  order by ranked.distance, ranked.owner_updated_at desc, ranked.source_kind, ranked.source_entity_id
  limit 50
),
fused as (
  select coalesce(l.source_kind, s.source_kind) source_kind,
    coalesce(l.source_entity_type, s.source_entity_type) source_entity_type,
    coalesce(l.source_entity_id, s.source_entity_id) source_entity_id,
    s.source_id,
    coalesce(l.snippet, s.snippet) snippet,
    (coalesce(1.0 / (60 + l.lexical_rank), 0) + coalesce(1.0 / (60 + s.semantic_rank), 0))::double precision rrf_score,
    l.lexical_rank, s.semantic_rank,
    coalesce(l.canon_state, s.canon_state) canon_state,
    coalesce(l.is_stub, s.is_stub, false) is_stub
  from lexical l
  full join semantic s on s.source_kind = l.source_kind and s.source_entity_id = l.source_entity_id
),
scope_lookup as (
  select distinct on (source_kind, source_entity_id)
    source_kind, source_entity_id, scope, owner_updated_at
  from semantic_corpus
  order by source_kind, source_entity_id, owner_updated_at desc
)
select f.source_kind, f.source_entity_type, f.source_entity_id, f.source_id, f.snippet,
  f.rrf_score, f.lexical_rank, f.semantic_rank, f.canon_state, f.is_stub,
  case when f.lexical_rank is not null and f.semantic_rank is not null then 'hybrid'
       when f.semantic_rank is not null then 'semantic'
       else 'lexical' end
from fused f
join scope_lookup lookup on lookup.source_kind = f.source_kind and lookup.source_entity_id = f.source_entity_id
order by f.rrf_score desc, (lookup.scope = 'saga') desc, lookup.owner_updated_at desc nulls last,
  f.source_kind, f.source_entity_id
limit greatest(1, least(coalesce($6, 10), 50));
$$;

alter function public.get_embedding_job_status(uuid, uuid, uuid, text, uuid) security definer;

revoke all on function public.claim_embedding_job_for_worker(text) from public, anon, authenticated;
revoke all on function public.claim_transcript_embedding_job_for_worker(text) from public, anon, authenticated;
revoke all on function public.complete_embedding_job_for_worker(uuid, jsonb, text, text, integer, jsonb, text, boolean) from public, anon, authenticated;
revoke all on function public.fail_embedding_job_for_worker(uuid, text, boolean) from public, anon, authenticated;
revoke all on function public.replay_embedding_job_for_worker(uuid) from public, anon, authenticated;
grant execute on function public.claim_embedding_job_for_worker(text) to service_role;
grant execute on function public.claim_transcript_embedding_job_for_worker(text) to service_role;
grant execute on function public.complete_embedding_job_for_worker(uuid, jsonb, text, text, integer, jsonb, text, boolean) to service_role;
grant execute on function public.fail_embedding_job_for_worker(uuid, text, boolean) to service_role;
grant execute on function public.replay_embedding_job_for_worker(uuid) to service_role;

revoke all on function public.prepare_embedding_job(uuid) from public, anon;
grant execute on function public.prepare_embedding_job(uuid) to authenticated;
revoke all on function public.get_embedding_job_status(uuid, uuid, uuid, text, uuid) from public, anon;
grant execute on function public.get_embedding_job_status(uuid, uuid, uuid, text, uuid) to authenticated;
revoke all on function public.search_for_ui_hybrid(uuid, uuid, uuid, text, text, integer, boolean, boolean) from public, anon;
grant execute on function public.search_for_ui_hybrid(uuid, uuid, uuid, text, text, integer, boolean, boolean) to authenticated;

-- The legacy helper bypassed provider validation and replacement-before-flip persistence.
drop function if exists public.materialize_embedding_job_for_test(uuid);

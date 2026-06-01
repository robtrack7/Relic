create or replace function internal.latest_source_for_embedding(
  p_workspace_id uuid,
  p_world_id uuid,
  p_saga_id uuid,
  p_scope public.content_scope,
  p_source_kind text,
  p_source_entity_type public.entity_type,
  p_source_entity_id uuid
)
returns uuid
language sql
stable
set search_path = public, pg_temp
as $$
  select s.id
  from public.sources s
  where s.workspace_id = p_workspace_id
    and s.world_id = p_world_id
    and s.scope = p_scope
    and ((p_scope = 'world' and s.saga_id is null) or (p_scope = 'saga' and s.saga_id = p_saga_id))
    and (
      (p_source_kind = 'note' and s.note_id = p_source_entity_id)
      or (
        p_source_kind in ('entity', 'session')
        and s.source_entity_type = p_source_entity_type
        and s.source_entity_id = p_source_entity_id
      )
    )
  order by s.created_at desc, s.id desc
  limit 1;
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
set search_path = public, internal, pg_temp
as $$
declare
  queued_id uuid;
  effective_source_id uuid;
  effective_gm_id uuid := coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
begin
  if p_source_entity_id is null then
    raise exception 'source_entity_id is required' using errcode = '22023';
  end if;

  effective_source_id := coalesce(
    p_source_id,
    internal.latest_source_for_embedding(
      p_workspace_id,
      p_world_id,
      p_saga_id,
      (case when p_saga_id is null then 'world' else 'saga' end)::public.content_scope,
      p_source_kind,
      p_source_entity_type,
      p_source_entity_id
    )
  );

  -- The unique key collapses repeated edits into one worker task; debounce_until is the worker's "not before" time.
  insert into internal.embedding_jobs (
    workspace_id,
    world_id,
    saga_id,
    gm_id,
    source_kind,
    source_entity_type,
    source_entity_id,
    source_id,
    state,
    debounce_until,
    idempotency_key,
    updated_at
  )
  values (
    p_workspace_id,
    p_world_id,
    p_saga_id,
    effective_gm_id,
    p_source_kind,
    p_source_entity_type,
    p_source_entity_id,
    effective_source_id,
    'pending',
    now() + p_debounce,
    p_source_kind || ':' || p_source_entity_id::text || ':text-embedding-3-small:mvp',
    now()
  )
  on conflict (source_kind, source_entity_id, model, model_version)
  do update set
    workspace_id = excluded.workspace_id,
    world_id = excluded.world_id,
    saga_id = excluded.saga_id,
    gm_id = excluded.gm_id,
    source_entity_type = excluded.source_entity_type,
    source_id = coalesce(excluded.source_id, internal.embedding_jobs.source_id),
    state = case when internal.embedding_jobs.state = 'running' then 'running' else 'pending' end,
    debounce_until = excluded.debounce_until,
    failure_reason = null,
    updated_at = now()
  returning id into queued_id;

  return queued_id;
end;
$$;

create or replace function internal.embedding_chunk_text(
  p_source_kind text,
  p_source_entity_type public.entity_type,
  p_source_entity_id uuid
)
returns text
language plpgsql
stable
set search_path = public, pg_temp
as $$
declare
  chunk text;
begin
  if p_source_kind = 'entity' and p_source_entity_type = 'character' then
    select concat_ws(E'\n\n', c.name, c.summary, c.narrative) into chunk from public.characters c where c.id = p_source_entity_id and c.canon_state <> 'archived';
  elsif p_source_kind = 'entity' and p_source_entity_type = 'place' then
    select concat_ws(E'\n\n', p.name, p.summary, p.narrative) into chunk from public.places p where p.id = p_source_entity_id and p.canon_state <> 'archived';
  elsif p_source_kind = 'entity' and p_source_entity_type = 'faction' then
    select concat_ws(E'\n\n', f.name, f.summary, f.narrative) into chunk from public.factions f where f.id = p_source_entity_id and f.canon_state <> 'archived';
  elsif p_source_kind = 'entity' and p_source_entity_type = 'artifact' then
    select concat_ws(E'\n\n', a.name, a.summary, a.narrative) into chunk from public.artifacts a where a.id = p_source_entity_id and a.canon_state <> 'archived';
  elsif p_source_kind = 'entity' and p_source_entity_type = 'thread' then
    select concat_ws(E'\n\n', t.name, t.summary, t.narrative, t.objective) into chunk from public.threads t where t.id = p_source_entity_id and t.canon_state <> 'archived';
  elsif p_source_kind = 'session' then
    select concat_ws(E'\n\n', s.name, s.summary, s.narrative, s.objective, s.opening_scene) into chunk from public.sessions s where s.id = p_source_entity_id;
  elsif p_source_kind = 'note' then
    select concat_ws(E'\n\n', n.title, n.body) into chunk
    from public.notes n
    where n.id = p_source_entity_id
      and n.canon_state <> 'archived'
      and n.note_type in ('lore', 'summary', 'quick_capture');
  else
    raise exception 'Unsupported embedding source kind' using errcode = '23514';
  end if;

  if nullif(trim(coalesce(chunk, '')), '') is null then
    raise exception 'source is not embeddable' using errcode = '22023';
  end if;

  return chunk;
end;
$$;

create or replace function public.materialize_embedding_job_for_test(job_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, internal, pg_temp
as $$
declare
  job internal.embedding_jobs%rowtype;
  source_scope public.content_scope;
  chunk text;
  inserted_id uuid;
begin
  select * into job
  from internal.embedding_jobs
  where id = job_id
  for update;

  if job.id is null then
    raise exception 'embedding job is not available' using errcode = '22023';
  end if;

  chunk := internal.embedding_chunk_text(job.source_kind, job.source_entity_type, job.source_entity_id);
  source_scope := case when job.saga_id is null then 'world'::public.content_scope else 'saga'::public.content_scope end;

  -- Worker contract: only the current chunks participate in retrieval; old chunks stay available for diagnostics.
  update public.embeddings e
  set is_current = false
  where e.source_kind = job.source_kind
    and e.source_entity_id = job.source_entity_id
    and e.model = job.model
    and e.model_version = job.model_version
    and e.is_current;

  insert into public.embeddings (
    workspace_id,
    world_id,
    saga_id,
    scope,
    source_kind,
    source_entity_type,
    source_entity_id,
    source_id,
    chunk_index,
    chunk_text,
    embedding,
    model,
    model_version,
    is_current,
    content_hash
  )
  values (
    job.workspace_id,
    job.world_id,
    job.saga_id,
    source_scope,
    job.source_kind,
    job.source_entity_type,
    job.source_entity_id,
    coalesce(job.source_id, internal.latest_source_for_embedding(job.workspace_id, job.world_id, job.saga_id, source_scope, job.source_kind, job.source_entity_type, job.source_entity_id)),
    0,
    chunk,
    null,
    job.model,
    job.model_version,
    true,
    md5(chunk)
  )
  returning id into inserted_id;

  update internal.embedding_jobs
  set state = 'complete',
      completed_at = now(),
      updated_at = now(),
      failure_reason = null
  where id = job.id;

  return inserted_id;
exception
  when others then
    update internal.embedding_jobs
    set state = 'failed',
        failure_reason = sqlerrm,
        updated_at = now()
    where id = job_id;
    raise;
end;
$$;

create or replace function internal.embedding_queue_metrics()
returns table (
  pending_count bigint,
  running_count bigint,
  failed_count bigint,
  p95_queue_age_seconds numeric
)
language sql
stable
set search_path = internal, pg_temp
as $$
  select
    count(*) filter (where state = 'pending') as pending_count,
    count(*) filter (where state = 'running') as running_count,
    count(*) filter (where state = 'failed') as failed_count,
    coalesce(
      percentile_cont(0.95) within group (order by extract(epoch from (now() - created_at))) filter (where state in ('pending', 'running')),
      0
    )::numeric as p95_queue_age_seconds
  from internal.embedding_jobs;
$$;

create table if not exists internal.retrieval_eval_fixtures (
  id uuid primary key default public.uuid7(),
  name text not null unique,
  task_profile text not null,
  query_text text not null,
  filters jsonb not null default '{}'::jsonb,
  expected_source_kinds text[] not null default '{}',
  warning_threshold numeric not null default 0.60 check (warning_threshold > 0 and warning_threshold <= 1),
  top_k int not null default 10,
  created_at timestamptz not null default now()
);

insert into internal.retrieval_eval_fixtures (name, task_profile, query_text, filters, expected_source_kinds, warning_threshold, top_k)
values
  ('sanctum_basic_canon_recall', 'sanctum_grounding', 'canon recall', '{}'::jsonb, array['entity', 'note'], 0.60, 10),
  ('prep_summary_only_context', 'compose_prep_briefing', 'session briefing summary', '{"note_types":["summary"]}'::jsonb, array['note'], 0.70, 15),
  ('post_session_capture_context', 'post_session_synthesis', 'quick capture synthesis', '{"note_types":["quick_capture"],"source_kinds":["note"]}'::jsonb, array['note'], 0.65, 20)
on conflict (name) do update
set task_profile = excluded.task_profile,
    query_text = excluded.query_text,
    filters = excluded.filters,
    expected_source_kinds = excluded.expected_source_kinds,
    warning_threshold = excluded.warning_threshold,
    top_k = excluded.top_k;

create or replace function internal.retrieval_eval_warning_thresholds()
returns table (
  name text,
  task_profile text,
  query_text text,
  filters jsonb,
  expected_source_kinds text[],
  warning_threshold numeric,
  top_k int
)
language sql
stable
set search_path = internal, pg_temp
as $$
  select f.name,
         f.task_profile,
         f.query_text,
         f.filters,
         f.expected_source_kinds,
         f.warning_threshold,
         f.top_k
  from internal.retrieval_eval_fixtures f
  order by f.name;
$$;

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
      or new.objective is distinct from old.objective
      or new.canon_state is distinct from old.canon_state;
  else
    should_queue := new.name is distinct from old.name
      or new.summary is distinct from old.summary
      or new.narrative is distinct from old.narrative
      or new.canon_state is distinct from old.canon_state;
  end if;

  if should_queue and new.canon_state <> 'archived' then
    perform internal.enqueue_embedding_job(new.workspace_id, new.world_id, new.saga_id, 'entity', entity_type, new.id, null);
  end if;

  return new;
end;
$$;

create or replace function internal.queue_session_embedding_trigger()
returns trigger
language plpgsql
security definer
set search_path = public, internal, pg_temp
as $$
declare
  should_queue boolean := false;
begin
  if tg_op = 'INSERT' then
    should_queue := true;
  else
    should_queue := new.name is distinct from old.name
      or new.summary is distinct from old.summary
      or new.narrative is distinct from old.narrative
      or new.objective is distinct from old.objective
      or new.opening_scene is distinct from old.opening_scene;
  end if;

  if should_queue then
    perform internal.enqueue_embedding_job(new.workspace_id, new.world_id, new.saga_id, 'session', 'session', new.id, null);
  end if;

  return new;
end;
$$;

create or replace function internal.queue_note_embedding_trigger()
returns trigger
language plpgsql
security definer
set search_path = public, internal, pg_temp
as $$
declare
  should_queue boolean := false;
begin
  if new.note_type not in ('lore', 'summary') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    should_queue := new.canon_state <> 'archived';
  else
    should_queue := new.title is distinct from old.title
      or new.body is distinct from old.body
      or new.note_type is distinct from old.note_type
      or new.canon_state is distinct from old.canon_state;
  end if;

  if should_queue and new.canon_state <> 'archived' then
    perform internal.enqueue_embedding_job(new.workspace_id, new.world_id, new.saga_id, 'note', null, new.id, null);
  end if;

  return new;
end;
$$;

drop trigger if exists queue_character_embedding on public.characters;
create trigger queue_character_embedding after insert or update on public.characters
for each row execute function internal.queue_entity_embedding_trigger('character');

drop trigger if exists queue_place_embedding on public.places;
create trigger queue_place_embedding after insert or update on public.places
for each row execute function internal.queue_entity_embedding_trigger('place');

drop trigger if exists queue_faction_embedding on public.factions;
create trigger queue_faction_embedding after insert or update on public.factions
for each row execute function internal.queue_entity_embedding_trigger('faction');

drop trigger if exists queue_artifact_embedding on public.artifacts;
create trigger queue_artifact_embedding after insert or update on public.artifacts
for each row execute function internal.queue_entity_embedding_trigger('artifact');

drop trigger if exists queue_thread_embedding on public.threads;
create trigger queue_thread_embedding after insert or update on public.threads
for each row execute function internal.queue_entity_embedding_trigger('thread');

drop trigger if exists queue_session_embedding on public.sessions;
create trigger queue_session_embedding after insert or update on public.sessions
for each row execute function internal.queue_session_embedding_trigger();

drop trigger if exists queue_note_embedding on public.notes;
create trigger queue_note_embedding after insert or update on public.notes
for each row execute function internal.queue_note_embedding_trigger();

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
set search_path = public, internal, pg_temp
as $$
declare
  inserted_source_id uuid;
  source_excerpt text;
  source_entity public.entity_type;
  embedding_kind text;
begin
  -- Synthetic GM sources make direct edits citeable without pretending they came from AI or transcript evidence.
  source_excerpt := left(concat('Manual GM ', p_operation, ': ', coalesce(p_payload->>'name', p_payload->>'title', p_entity_id::text)), 1000);
  source_entity := case when p_entity_type = 'note' then null else p_entity_type::public.entity_type end;
  embedding_kind := case when p_entity_type = 'session' then 'session' when p_entity_type = 'note' then 'note' else 'entity' end;

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
    source_entity,
    case when p_entity_type = 'note' then null else p_entity_id end,
    case when p_entity_type = 'note' then p_entity_id else null end,
    source_excerpt
  )
  returning id into inserted_source_id;

  perform internal.enqueue_embedding_job(p_workspace_id, p_world_id, p_saga_id, embedding_kind, source_entity, p_entity_id, inserted_source_id);

  return inserted_source_id;
end;
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
         row_number() over (order by ts_rank_cd(s.search_tsv, q.tsq) desc, s.updated_at desc, s.source_entity_id) as bm25_rank
  from scoped s, query q
  where q.raw is not null
    and (
      s.search_tsv @@ q.tsq
      or s.name ilike '%' || q.raw || '%'
      or coalesce(s.summary, '') ilike '%' || q.raw || '%'
      or coalesce(s.narrative, '') ilike '%' || q.raw || '%'
    )
)
select r.source_kind,
       r.source_entity_type,
       r.source_entity_id,
       left(concat_ws(' - ', r.name, r.summary, r.narrative), 320) as snippet,
       (1.0 / (60 + r.bm25_rank))::double precision as rrf_score,
       r.canon_state,
       r.is_stub
from ranked r
order by r.bm25_rank
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
         p.include_world_canon,
         case when coalesce(nullif($6, ''), '') = 'compose_prep_briefing' then '{"note_types":["summary"]}'::jsonb else p.defaults end as defaults
  from profile p
),
query as (
  select websearch_to_tsquery('english', coalesce($5, '')) as tsq,
         nullif(trim(coalesce($5, '')), '') as raw,
         case when $7 ? 'query_embedding' then ($7->>'query_embedding')::extensions.vector else null::extensions.vector end as query_vec
),
base_corpus as (
  select 'entity'::text as source_kind, 'existing_entity'::text as source_record_kind, 'character'::public.entity_type as source_entity_type, c.id as source_entity_id, 0 as chunk_index, c.name, c.summary, c.narrative, c.search_tsv, c.canon_state, c.updated_at, c.workspace_id, c.world_id, c.saga_id, c.scope, src.id as source_id, null::uuid as source_session_id, null::public.note_type as note_type
  from public.characters c left join lateral (select s.id from public.sources s where s.source_entity_type = 'character' and s.source_entity_id = c.id order by s.created_at desc, s.id desc limit 1) src on true
  union all select 'entity', 'existing_entity', 'place'::public.entity_type, p.id, 0, p.name, p.summary, p.narrative, p.search_tsv, p.canon_state, p.updated_at, p.workspace_id, p.world_id, p.saga_id, p.scope, src.id, null::uuid, null::public.note_type from public.places p left join lateral (select s.id from public.sources s where s.source_entity_type = 'place' and s.source_entity_id = p.id order by s.created_at desc, s.id desc limit 1) src on true
  union all select 'entity', 'existing_entity', 'faction'::public.entity_type, f.id, 0, f.name, f.summary, f.narrative, f.search_tsv, f.canon_state, f.updated_at, f.workspace_id, f.world_id, f.saga_id, f.scope, src.id, null::uuid, null::public.note_type from public.factions f left join lateral (select s.id from public.sources s where s.source_entity_type = 'faction' and s.source_entity_id = f.id order by s.created_at desc, s.id desc limit 1) src on true
  union all select 'entity', 'existing_entity', 'artifact'::public.entity_type, a.id, 0, a.name, a.summary, a.narrative, a.search_tsv, a.canon_state, a.updated_at, a.workspace_id, a.world_id, a.saga_id, a.scope, src.id, null::uuid, null::public.note_type from public.artifacts a left join lateral (select s.id from public.sources s where s.source_entity_type = 'artifact' and s.source_entity_id = a.id order by s.created_at desc, s.id desc limit 1) src on true
  union all select 'entity', 'existing_entity', 'thread'::public.entity_type, t.id, 0, t.name, t.summary, concat_ws(E'\n\n', t.narrative, t.objective), t.search_tsv, t.canon_state, t.updated_at, t.workspace_id, t.world_id, t.saga_id, t.scope, src.id, null::uuid, null::public.note_type from public.threads t left join lateral (select s.id from public.sources s where s.source_entity_type = 'thread' and s.source_entity_id = t.id order by s.created_at desc, s.id desc limit 1) src on true
  union all select 'session', 'existing_entity', 'session'::public.entity_type, se.id, 0, se.name, se.summary, concat_ws(E'\n\n', se.narrative, se.objective, se.opening_scene), se.search_tsv, 'canon'::public.entity_canon_state, se.updated_at, se.workspace_id, se.world_id, se.saga_id, se.scope, src.id, se.id, null::public.note_type from public.sessions se left join lateral (select s.id from public.sources s where s.source_entity_type = 'session' and s.source_entity_id = se.id order by s.created_at desc, s.id desc limit 1) src on true
  union all select 'note', 'note', null::public.entity_type, n.id, 0, coalesce(n.title, 'Untitled note'), left(n.body, 500), n.body, n.search_tsv, n.canon_state, n.updated_at, n.workspace_id, n.world_id, n.saga_id, n.scope, src.id, src.session_id, n.note_type from public.notes n left join lateral (select s.id, s.session_id from public.sources s where s.note_id = n.id and s.kind = 'note' order by s.created_at desc, s.id desc limit 1) src on true where n.note_type <> 'gm_note'
),
scoped as (
  select c.*
  from base_corpus c
  cross join effective e
  where public.user_can_access_saga($1, $2, $3)
    and c.workspace_id = $1
    and c.world_id = $2
    and ((e.include_world_canon and c.scope = 'world' and c.saga_id is null) or (c.scope = 'saga' and c.saga_id = $3))
    and c.canon_state <> 'archived'
    and (not ($7 ? 'session_id') or c.source_session_id = ($7 ->> 'session_id')::uuid)
    and (not ($7 ? 'source_kinds') or c.source_record_kind in (select jsonb_array_elements_text($7 -> 'source_kinds')))
    and (not (($7 || e.defaults) ? 'note_types') or c.source_kind <> 'note' or c.note_type::text in (select jsonb_array_elements_text(($7 || e.defaults) -> 'note_types')))
    and (not ($7 ? 'exclude_entity_id') or c.source_entity_id <> ($7 ->> 'exclude_entity_id')::uuid)
),
lexical as (
  select s.*,
         row_number() over (order by ts_rank_cd(s.search_tsv, q.tsq) desc, s.updated_at desc, s.source_entity_id) as bm25_rank
  from scoped s, query q
  where q.raw is not null
    and (
      s.search_tsv @@ q.tsq
      or s.name ilike '%' || q.raw || '%'
      or coalesce(s.summary, '') ilike '%' || q.raw || '%'
      or coalesce(s.narrative, '') ilike '%' || q.raw || '%'
    )
),
semantic as (
  select s.source_kind,
         s.source_entity_type,
         s.source_entity_id,
         coalesce(e.chunk_index, s.chunk_index) as chunk_index,
         coalesce(e.source_id, s.source_id) as source_id,
         s.canon_state,
         row_number() over (order by e.embedding <=> q.query_vec, s.updated_at desc, s.source_entity_id) as vector_rank
  from scoped s
  join public.embeddings e
    on e.workspace_id = s.workspace_id
   and e.world_id = s.world_id
   and e.source_kind = s.source_kind
   and e.source_entity_id = s.source_entity_id
   and e.is_current
   and e.embedding is not null
  cross join query q
  where q.query_vec is not null
),
fused as (
  select coalesce(l.source_kind, v.source_kind) as source_kind,
         coalesce(l.source_entity_type, v.source_entity_type) as source_entity_type,
         coalesce(l.source_entity_id, v.source_entity_id) as source_entity_id,
         coalesce(l.chunk_index, v.chunk_index) as chunk_index,
         coalesce(l.source_id, v.source_id) as source_id,
         coalesce(l.canon_state, v.canon_state) as canon_state,
         l.bm25_rank::integer,
         v.vector_rank::integer,
         (coalesce(1.0 / (60 + l.bm25_rank), 0) + coalesce(1.0 / (60 + v.vector_rank), 0))::double precision as rrf_score
  from lexical l
  full join semantic v
    on v.source_kind = l.source_kind
   and v.source_entity_type is not distinct from l.source_entity_type
   and v.source_entity_id = l.source_entity_id
   and v.chunk_index = l.chunk_index
)
select f.source_kind,
       f.source_entity_type,
       f.source_entity_id,
       f.chunk_index,
       f.rrf_score,
       f.bm25_rank,
       f.vector_rank,
       f.source_id,
       f.canon_state
from fused f
order by f.rrf_score desc, f.source_entity_id
limit greatest(1, (select limit_rows from effective));
$$;

revoke execute on function public.materialize_embedding_job_for_test(uuid) from PUBLIC, anon, authenticated;
revoke execute on function public.write_manual_canon_source(uuid, uuid, uuid, public.content_scope, text, uuid, text, jsonb) from PUBLIC, anon, authenticated;
revoke execute on function public.search_for_ui(uuid, uuid, uuid, text, text, integer, boolean, boolean, boolean) from PUBLIC, anon;
revoke execute on function public.retrieve_for_task(uuid, uuid, uuid, uuid, text, text, jsonb, integer) from PUBLIC, anon;
grant execute on function public.search_for_ui(uuid, uuid, uuid, text, text, integer, boolean, boolean, boolean) to authenticated;
grant execute on function public.retrieve_for_task(uuid, uuid, uuid, uuid, text, text, jsonb, integer) to authenticated;

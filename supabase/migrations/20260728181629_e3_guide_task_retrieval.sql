-- Packet E3: conservative natural-language fallback for Guide task grounding.
--
-- The primary retrieve_for_task RPC remains the hybrid BM25/vector surface. This
-- fallback is invoked only after that surface returns no rows, and only for an
-- ordinary natural-language answer_saga_question query. Explicit web-search
-- syntax keeps PostgreSQL's strict websearch_to_tsquery semantics.

create or replace function public.retrieve_for_task_relaxed(
  workspace_id uuid,
  world_id uuid,
  saga_id uuid,
  query_text text,
  task_profile text default 'answer_saga_question',
  top_k integer default 20
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
  select rp.include_world_canon
  from public.retrieval_profiles rp
  where $5 = 'answer_saga_question'
    and rp.name = 'sanctum_qa_grounding'
),
query as (
  select
    nullif(trim(coalesce($4, '')), '') as raw,
    tsvector_to_array(to_tsvector('english', coalesce($4, ''))) as terms,
    coalesce(cardinality(tsvector_to_array(to_tsvector('english', coalesce($4, '')))), 0) as term_count,
    coalesce($4, '') ~* '("|(^|[[:space:]])-|(^|[[:space:]])or([[:space:]]|$))' as has_explicit_syntax
),
corpus as (
  select
    'entity'::text as source_kind,
    'character'::public.entity_type as source_entity_type,
    c.id as source_entity_id,
    c.name,
    c.summary,
    c.narrative,
    c.search_tsv,
    c.canon_state,
    c.updated_at,
    c.workspace_id,
    c.world_id,
    c.saga_id,
    c.scope,
    src.id as source_id
  from public.characters c
  left join lateral (
    select s.id
    from public.sources s
    where s.source_entity_type = 'character'
      and s.source_entity_id = c.id
      and s.kind <> 'imported_text'
    order by s.created_at desc, s.id desc
    limit 1
  ) src on true
  union all
  select 'entity', 'place'::public.entity_type, p.id, p.name, p.summary, p.narrative,
    p.search_tsv, p.canon_state, p.updated_at, p.workspace_id, p.world_id, p.saga_id,
    p.scope, src.id
  from public.places p
  left join lateral (
    select s.id from public.sources s
    where s.source_entity_type = 'place' and s.source_entity_id = p.id
      and s.kind <> 'imported_text'
    order by s.created_at desc, s.id desc limit 1
  ) src on true
  union all
  select 'entity', 'faction'::public.entity_type, f.id, f.name, f.summary, f.narrative,
    f.search_tsv, f.canon_state, f.updated_at, f.workspace_id, f.world_id, f.saga_id,
    f.scope, src.id
  from public.factions f
  left join lateral (
    select s.id from public.sources s
    where s.source_entity_type = 'faction' and s.source_entity_id = f.id
      and s.kind <> 'imported_text'
    order by s.created_at desc, s.id desc limit 1
  ) src on true
  union all
  select 'entity', 'artifact'::public.entity_type, a.id, a.name, a.summary, a.narrative,
    a.search_tsv, a.canon_state, a.updated_at, a.workspace_id, a.world_id, a.saga_id,
    a.scope, src.id
  from public.artifacts a
  left join lateral (
    select s.id from public.sources s
    where s.source_entity_type = 'artifact' and s.source_entity_id = a.id
      and s.kind <> 'imported_text'
    order by s.created_at desc, s.id desc limit 1
  ) src on true
  union all
  select 'entity', 'thread'::public.entity_type, t.id, t.name, t.summary,
    concat_ws(E'\n\n', t.narrative, t.objective), t.search_tsv, t.canon_state,
    t.updated_at, t.workspace_id, t.world_id, t.saga_id, t.scope, src.id
  from public.threads t
  left join lateral (
    select s.id from public.sources s
    where s.source_entity_type = 'thread' and s.source_entity_id = t.id
      and s.kind <> 'imported_text'
    order by s.created_at desc, s.id desc limit 1
  ) src on true
  union all
  select 'session', 'session'::public.entity_type, se.id, se.name, se.summary,
    concat_ws(E'\n\n', se.narrative, se.objective, se.opening_scene), se.search_tsv,
    'canon'::public.entity_canon_state, se.updated_at, se.workspace_id, se.world_id,
    se.saga_id, se.scope, src.id
  from public.sessions se
  left join lateral (
    select s.id from public.sources s
    where s.source_entity_type = 'session' and s.source_entity_id = se.id
      and s.kind <> 'imported_text'
    order by s.created_at desc, s.id desc limit 1
  ) src on true
  union all
  select 'note', null::public.entity_type, n.id, coalesce(n.title, 'Untitled note'),
    left(n.body, 500), n.body, n.search_tsv, n.canon_state, n.updated_at,
    n.workspace_id, n.world_id, n.saga_id, n.scope, src.id
  from public.notes n
  left join lateral (
    select s.id from public.sources s
    where s.note_id = n.id and s.kind = 'note'
    order by s.created_at desc, s.id desc limit 1
  ) src on true
  where n.note_type in ('lore', 'summary', 'quick_capture')
),
scoped as (
  select c.*
  from corpus c
  cross join profile p
  where public.user_can_access_saga($1, $2, $3)
    and c.workspace_id = $1
    and c.world_id = $2
    and ((p.include_world_canon and c.scope = 'world' and c.saga_id is null)
      or (c.scope = 'saga' and c.saga_id = $3))
    and c.canon_state <> 'archived'
    and c.source_id is not null
),
overlap as (
  select
    s.*,
    (
      select count(*)::integer
      from unnest(q.terms) term
      where term = any(tsvector_to_array(s.search_tsv))
    ) as overlap_count,
    q.term_count
  from scoped s
  cross join query q
  where q.raw is not null
    and not q.has_explicit_syntax
    and q.term_count > 0
),
ranked as (
  select
    o.*,
    row_number() over (
      order by
        (o.overlap_count::double precision / o.term_count) desc,
        o.overlap_count desc,
        o.updated_at desc,
        o.source_kind,
        o.source_entity_id
    )::integer as relaxed_rank
  from overlap o
  where o.overlap_count >= case
    when o.term_count <= 2 then o.term_count
    else ceil(o.term_count / 2.0)::integer
  end
)
select
  r.source_kind,
  r.source_entity_type,
  r.source_entity_id,
  0 as chunk_index,
  (0.5 / (60 + r.relaxed_rank))::double precision as rrf_score,
  r.relaxed_rank as bm25_rank,
  null::integer as vector_rank,
  r.source_id,
  r.canon_state
from ranked r
order by r.relaxed_rank
limit greatest(1, least(coalesce($6, 20), 50));
$$;

revoke all on function public.retrieve_for_task_relaxed(uuid, uuid, uuid, text, text, integer)
  from public, anon;
grant execute on function public.retrieve_for_task_relaxed(uuid, uuid, uuid, text, text, integer)
  to authenticated;

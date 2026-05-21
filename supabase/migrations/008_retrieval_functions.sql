create table if not exists public.retrieval_profiles (
  name text primary key,
  top_k int not null,
  canon_only boolean not null default true,
  include_world_canon boolean not null default true,
  defaults jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

insert into public.retrieval_profiles (name, top_k, canon_only, include_world_canon, defaults)
values
  ('session_prep_grounding', 20, true, true, '{"recency_tiebreak": true}'::jsonb),
  ('sanctum_grounding', 12, true, true, '{}'::jsonb),
  ('sanctum_qa_grounding', 20, true, true, '{"note_types": ["lore", "summary"]}'::jsonb),
  ('post_session_synthesis', 30, true, true, '{}'::jsonb),
  ('approval_queue_context', 5, true, true, '{"exclude_focus_entity": true}'::jsonb),
  ('prep_grounding', 20, true, true, '{"alias_for": "session_prep_grounding"}'::jsonb)
on conflict (name) do update
set top_k = excluded.top_k,
    canon_only = excluded.canon_only,
    include_world_canon = excluded.include_world_canon,
    defaults = excluded.defaults;

alter table public.retrieval_profiles enable row level security;
create policy retrieval_profiles_read on public.retrieval_profiles for select to anon, authenticated using (true);
grant select on public.retrieval_profiles to anon, authenticated;

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
security invoker
stable
as $$
with query as (
  select websearch_to_tsquery('english', coalesce($4, '')) as tsq,
         nullif(trim(coalesce($4, '')), '') as raw
),
corpus as (
  select 'entity'::text as source_kind, 'character'::public.entity_type as source_entity_type, c.id as source_entity_id,
         c.name, c.summary, c.narrative, c.search_tsv, c.canon_state, c.is_stub, c.updated_at,
         c.workspace_id, c.world_id, c.saga_id, c.scope
  from public.characters c
  union all
  select 'entity', 'place'::public.entity_type, p.id, p.name, p.summary, p.narrative, p.search_tsv, p.canon_state, p.is_stub, p.updated_at,
         p.workspace_id, p.world_id, p.saga_id, p.scope
  from public.places p
  union all
  select 'entity', 'faction'::public.entity_type, f.id, f.name, f.summary, f.narrative, f.search_tsv, f.canon_state, f.is_stub, f.updated_at,
         f.workspace_id, f.world_id, f.saga_id, f.scope
  from public.factions f
  union all
  select 'entity', 'artifact'::public.entity_type, a.id, a.name, a.summary, a.narrative, a.search_tsv, a.canon_state, a.is_stub, a.updated_at,
         a.workspace_id, a.world_id, a.saga_id, a.scope
  from public.artifacts a
  union all
  select 'entity', 'thread'::public.entity_type, t.id, t.name, t.summary, concat_ws(E'\n\n', t.narrative, t.objective), t.search_tsv, t.canon_state, t.is_stub, t.updated_at,
         t.workspace_id, t.world_id, t.saga_id, t.scope
  from public.threads t
  union all
  select 'entity', 'session'::public.entity_type, s.id, s.name, s.summary, concat_ws(E'\n\n', s.narrative, s.objective, s.opening_scene), s.search_tsv, 'canon'::public.entity_canon_state, false, s.updated_at,
         s.workspace_id, s.world_id, s.saga_id, s.scope
  from public.sessions s
  union all
  select 'note', null::public.entity_type, n.id, coalesce(n.title, 'Untitled note'), left(n.body, 500), n.body, n.search_tsv, n.canon_state, false, n.updated_at,
         n.workspace_id, n.world_id, n.saga_id, n.scope
  from public.notes n
  where n.note_type <> 'gm_note'
),
scoped as (
  select c.*
  from corpus c
  where c.workspace_id = $1
    and c.world_id = $2
    and (($9 and c.scope = 'world' and c.saga_id is null) or (c.scope = 'saga' and c.saga_id = $3))
    and ($7 or c.canon_state <> 'archived')
),
lexical as (
  select s.*, row_number() over (order by ts_rank_cd(s.search_tsv, q.tsq) desc, s.updated_at desc) as bm25_rank
  from scoped s, query q
  where q.raw is not null
    and (s.search_tsv @@ q.tsq or s.name ilike '%' || q.raw || '%' or coalesce(s.summary, '') ilike '%' || q.raw || '%')
  limit 50
),
semantic as (
  select s.*, row_number() over (order by extensions.similarity(concat_ws(' ', s.name, s.summary, s.narrative), q.raw) desc, s.updated_at desc) as vector_rank
  from scoped s, query q
  where q.raw is not null
    and not $8
    and extensions.similarity(concat_ws(' ', s.name, s.summary, s.narrative), q.raw) > 0
  limit 50
),
fused as (
  select
    coalesce(l.source_kind, v.source_kind) as source_kind,
    coalesce(l.source_entity_type, v.source_entity_type) as source_entity_type,
    coalesce(l.source_entity_id, v.source_entity_id) as source_entity_id,
    coalesce(l.name, v.name) as name,
    coalesce(l.summary, v.summary) as summary,
    coalesce(l.narrative, v.narrative) as narrative,
    coalesce(l.canon_state, v.canon_state) as canon_state,
    coalesce(l.is_stub, v.is_stub) as is_stub,
    (case when l.bm25_rank is null then 0 else 1.0 / (60 + l.bm25_rank) end)
      + (case when v.vector_rank is null then 0 else 1.0 / (60 + v.vector_rank) end) as rrf_score
  from lexical l
  full outer join semantic v
    on v.source_kind = l.source_kind
   and v.source_entity_id = l.source_entity_id
)
select f.source_kind,
       f.source_entity_type,
       f.source_entity_id,
       left(concat_ws(' - ', f.name, f.summary, f.narrative), 320) as snippet,
       f.rrf_score,
       f.canon_state,
       f.is_stub
from fused f
order by f.rrf_score desc, f.source_entity_id
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
security invoker
stable
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
         case when $6 in ('compose_prep_briefing', 'session_prep_grounding', 'prep_grounding') then true else p.canon_only end as canon_only,
         p.include_world_canon
  from profile p
),
query as (
  select websearch_to_tsquery('english', coalesce($5, '')) as tsq,
         nullif(trim(coalesce($5, '')), '') as raw
),
corpus as (
  select 'entity'::text as source_kind, 'character'::public.entity_type as source_entity_type, c.id as source_entity_id,
         0 as chunk_index, c.name, c.summary, c.narrative, c.search_tsv, c.canon_state, c.updated_at,
         c.workspace_id, c.world_id, c.saga_id, c.scope, s.id as source_id, null::public.note_type as note_type, null::uuid as source_session_id
  from public.characters c
  left join public.sources s on s.source_entity_type = 'character' and s.source_entity_id = c.id and s.kind = 'existing_entity'
  union all
  select 'entity', 'place'::public.entity_type, p.id, 0, p.name, p.summary, p.narrative, p.search_tsv, p.canon_state, p.updated_at,
         p.workspace_id, p.world_id, p.saga_id, p.scope, s.id, null::public.note_type, null::uuid
  from public.places p
  left join public.sources s on s.source_entity_type = 'place' and s.source_entity_id = p.id and s.kind = 'existing_entity'
  union all
  select 'entity', 'faction'::public.entity_type, f.id, 0, f.name, f.summary, f.narrative, f.search_tsv, f.canon_state, f.updated_at,
         f.workspace_id, f.world_id, f.saga_id, f.scope, s.id, null::public.note_type, null::uuid
  from public.factions f
  left join public.sources s on s.source_entity_type = 'faction' and s.source_entity_id = f.id and s.kind = 'existing_entity'
  union all
  select 'entity', 'artifact'::public.entity_type, a.id, 0, a.name, a.summary, a.narrative, a.search_tsv, a.canon_state, a.updated_at,
         a.workspace_id, a.world_id, a.saga_id, a.scope, s.id, null::public.note_type, null::uuid
  from public.artifacts a
  left join public.sources s on s.source_entity_type = 'artifact' and s.source_entity_id = a.id and s.kind = 'existing_entity'
  union all
  select 'entity', 'thread'::public.entity_type, t.id, 0, t.name, t.summary, concat_ws(E'\n\n', t.narrative, t.objective), t.search_tsv, t.canon_state, t.updated_at,
         t.workspace_id, t.world_id, t.saga_id, t.scope, s.id, null::public.note_type, null::uuid
  from public.threads t
  left join public.sources s on s.source_entity_type = 'thread' and s.source_entity_id = t.id and s.kind = 'existing_entity'
  union all
  select 'entity', 'session'::public.entity_type, se.id, 0, se.name, se.summary, concat_ws(E'\n\n', se.narrative, se.objective, se.opening_scene), se.search_tsv, 'canon'::public.entity_canon_state, se.updated_at,
         se.workspace_id, se.world_id, se.saga_id, se.scope, src.id, null::public.note_type, se.id
  from public.sessions se
  left join public.sources src on src.source_entity_type = 'session' and src.source_entity_id = se.id and src.kind = 'existing_entity'
  union all
  select 'note', null::public.entity_type, n.id, 0, coalesce(n.title, 'Untitled note'), left(n.body, 500), n.body, n.search_tsv, n.canon_state, n.updated_at,
         n.workspace_id, n.world_id, n.saga_id, n.scope, s.id, n.note_type, s.session_id
  from public.notes n
  left join public.sources s on s.note_id = n.id and s.kind = 'note'
  where n.note_type <> 'gm_note'
),
scoped as (
  select c.*
  from corpus c, effective e
  where c.workspace_id = $1
    and c.world_id = $2
    and ((e.include_world_canon and c.scope = 'world' and c.saga_id is null) or (c.scope = 'saga' and c.saga_id = $3))
    and c.canon_state <> 'archived'
    and (not ($7 ? 'session_id') or c.source_session_id = ($7 ->> 'session_id')::uuid)
    and (not ($7 ? 'exclude_entity_id') or c.source_entity_id <> ($7 ->> 'exclude_entity_id')::uuid)
    and (
      not ($7 ? 'note_types')
      or c.note_type is null
      or exists (
        select 1
        from jsonb_array_elements_text($7 -> 'note_types') nt(value)
        where nt.value = c.note_type::text
      )
    )
),
lexical as (
  select s.*, row_number() over (order by ts_rank_cd(s.search_tsv, q.tsq) desc, s.updated_at desc) as bm25_rank
  from scoped s, query q
  where q.raw is not null
    and (s.search_tsv @@ q.tsq or s.name ilike '%' || q.raw || '%' or coalesce(s.summary, '') ilike '%' || q.raw || '%')
  limit 50
),
semantic as (
  select s.*, row_number() over (order by extensions.similarity(concat_ws(' ', s.name, s.summary, s.narrative), q.raw) desc, s.updated_at desc) as vector_rank
  from scoped s, query q
  where q.raw is not null
    and extensions.similarity(concat_ws(' ', s.name, s.summary, s.narrative), q.raw) > 0
  limit 50
),
fused as (
  select
    coalesce(l.source_kind, v.source_kind) as source_kind,
    coalesce(l.source_entity_type, v.source_entity_type) as source_entity_type,
    coalesce(l.source_entity_id, v.source_entity_id) as source_entity_id,
    coalesce(l.chunk_index, v.chunk_index) as chunk_index,
    l.bm25_rank::integer as bm25_rank,
    v.vector_rank::integer as vector_rank,
    coalesce(l.source_id, v.source_id) as source_id,
    coalesce(l.canon_state, v.canon_state) as canon_state,
    (case when l.bm25_rank is null then 0 else 1.0 / (60 + l.bm25_rank) end)
      + (case when v.vector_rank is null then 0 else 1.0 / (60 + v.vector_rank) end) as rrf_score
  from lexical l
  full outer join semantic v
    on v.source_kind = l.source_kind
   and v.source_entity_id = l.source_entity_id
),
ranked as (
  select f.source_kind,
         f.source_entity_type,
         f.source_entity_id,
         f.chunk_index,
         f.rrf_score,
         f.bm25_rank,
         f.vector_rank,
         f.source_id,
         f.canon_state,
         row_number() over (order by f.rrf_score desc, f.source_entity_id) as result_rank,
         e.limit_rows
  from fused f
  cross join effective e
)
select r.source_kind,
       r.source_entity_type,
       r.source_entity_id,
       r.chunk_index,
       r.rrf_score,
       r.bm25_rank,
       r.vector_rank,
       r.source_id,
       r.canon_state
from ranked r
where r.result_rank <= greatest(1, r.limit_rows)
order by r.result_rank;
$$;

grant execute on function public.search_for_ui(uuid, uuid, uuid, text, text, integer, boolean, boolean, boolean) to anon, authenticated;
grant execute on function public.retrieve_for_task(uuid, uuid, uuid, uuid, text, text, jsonb, integer) to anon, authenticated;

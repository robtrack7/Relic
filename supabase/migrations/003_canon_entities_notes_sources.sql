create table if not exists public.characters (
  id uuid primary key default public.uuid7(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  world_id uuid not null references public.worlds(id) on delete cascade,
  saga_id uuid references public.sagas(id) on delete cascade,
  scope public.content_scope not null default 'saga',
  valid_from_index bigint,
  valid_to_index bigint,
  name text not null check (char_length(name) between 1 and 200),
  summary text,
  narrative text,
  gm_notes text,
  status text not null default 'active',
  tags text[] not null default '{}',
  canon_state public.entity_canon_state not null default 'canon',
  is_stub boolean not null default false,
  created_by public.actor_kind not null default 'gm',
  role text,
  wants text,
  voice text,
  mechanical_block jsonb,
  search_tsv tsvector generated always as (to_tsvector('english', coalesce(name, '') || ' ' || coalesce(summary, '') || ' ' || coalesce(narrative, '') || ' ' || coalesce(gm_notes, ''))) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint characters_scope_check check ((scope = 'world' and saga_id is null) or (scope = 'saga' and saga_id is not null))
);
create index if not exists characters_scope_idx on public.characters(workspace_id, world_id, saga_id, scope);
create index if not exists characters_search_tsv_idx on public.characters using gin(search_tsv);

create table if not exists public.places (
  id uuid primary key default public.uuid7(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  world_id uuid not null references public.worlds(id) on delete cascade,
  saga_id uuid references public.sagas(id) on delete cascade,
  scope public.content_scope not null default 'saga',
  valid_from_index bigint,
  valid_to_index bigint,
  name text not null check (char_length(name) between 1 and 200),
  summary text,
  narrative text,
  gm_notes text,
  status text not null default 'active',
  tags text[] not null default '{}',
  canon_state public.entity_canon_state not null default 'canon',
  is_stub boolean not null default false,
  created_by public.actor_kind not null default 'gm',
  location_type text,
  search_tsv tsvector generated always as (to_tsvector('english', coalesce(name, '') || ' ' || coalesce(summary, '') || ' ' || coalesce(narrative, '') || ' ' || coalesce(gm_notes, ''))) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint places_scope_check check ((scope = 'world' and saga_id is null) or (scope = 'saga' and saga_id is not null))
);
create index if not exists places_scope_idx on public.places(workspace_id, world_id, saga_id, scope);
create index if not exists places_search_tsv_idx on public.places using gin(search_tsv);

create table if not exists public.factions (
  id uuid primary key default public.uuid7(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  world_id uuid not null references public.worlds(id) on delete cascade,
  saga_id uuid references public.sagas(id) on delete cascade,
  scope public.content_scope not null default 'saga',
  valid_from_index bigint,
  valid_to_index bigint,
  name text not null check (char_length(name) between 1 and 200),
  summary text,
  narrative text,
  gm_notes text,
  status text not null default 'active',
  tags text[] not null default '{}',
  canon_state public.entity_canon_state not null default 'canon',
  is_stub boolean not null default false,
  created_by public.actor_kind not null default 'gm',
  motive text,
  search_tsv tsvector generated always as (to_tsvector('english', coalesce(name, '') || ' ' || coalesce(summary, '') || ' ' || coalesce(narrative, '') || ' ' || coalesce(gm_notes, ''))) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint factions_scope_check check ((scope = 'world' and saga_id is null) or (scope = 'saga' and saga_id is not null))
);
create index if not exists factions_scope_idx on public.factions(workspace_id, world_id, saga_id, scope);
create index if not exists factions_search_tsv_idx on public.factions using gin(search_tsv);

create table if not exists public.artifacts (
  id uuid primary key default public.uuid7(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  world_id uuid not null references public.worlds(id) on delete cascade,
  saga_id uuid references public.sagas(id) on delete cascade,
  scope public.content_scope not null default 'saga',
  valid_from_index bigint,
  valid_to_index bigint,
  name text not null check (char_length(name) between 1 and 200),
  summary text,
  narrative text,
  gm_notes text,
  status text not null default 'active',
  tags text[] not null default '{}',
  canon_state public.entity_canon_state not null default 'canon',
  is_stub boolean not null default false,
  created_by public.actor_kind not null default 'gm',
  known_properties text,
  mechanical_block jsonb,
  search_tsv tsvector generated always as (to_tsvector('english', coalesce(name, '') || ' ' || coalesce(summary, '') || ' ' || coalesce(narrative, '') || ' ' || coalesce(gm_notes, ''))) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint artifacts_scope_check check ((scope = 'world' and saga_id is null) or (scope = 'saga' and saga_id is not null))
);
create index if not exists artifacts_scope_idx on public.artifacts(workspace_id, world_id, saga_id, scope);
create index if not exists artifacts_search_tsv_idx on public.artifacts using gin(search_tsv);

create table if not exists public.threads (
  id uuid primary key default public.uuid7(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  world_id uuid not null references public.worlds(id) on delete cascade,
  saga_id uuid references public.sagas(id) on delete cascade,
  scope public.content_scope not null default 'saga',
  valid_from_index bigint,
  valid_to_index bigint,
  name text not null check (char_length(name) between 1 and 200),
  summary text,
  narrative text,
  gm_notes text,
  status text not null default 'active',
  tags text[] not null default '{}',
  canon_state public.entity_canon_state not null default 'canon',
  is_stub boolean not null default false,
  created_by public.actor_kind not null default 'gm',
  objective text,
  resolution_state text not null default 'active' check (resolution_state in ('active', 'resolved', 'failed', 'dormant')),
  is_loose_thread boolean not null default false,
  objectives_log jsonb not null default '[]'::jsonb,
  search_tsv tsvector generated always as (to_tsvector('english', coalesce(name, '') || ' ' || coalesce(summary, '') || ' ' || coalesce(narrative, '') || ' ' || coalesce(objective, '') || ' ' || coalesce(gm_notes, ''))) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint threads_scope_check check ((scope = 'world' and saga_id is null) or (scope = 'saga' and saga_id is not null))
);
create index if not exists threads_scope_idx on public.threads(workspace_id, world_id, saga_id, scope);
create index if not exists threads_search_tsv_idx on public.threads using gin(search_tsv);

create table if not exists public.sessions (
  id uuid primary key default public.uuid7(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  world_id uuid not null references public.worlds(id) on delete cascade,
  saga_id uuid not null references public.sagas(id) on delete cascade,
  scope public.content_scope not null default 'saga',
  name text not null,
  summary text,
  narrative text,
  gm_notes text,
  status public.session_status not null default 'planned',
  objective text,
  opening_scene text,
  scene_notes text,
  prep_checklist jsonb not null default '[]'::jsonb,
  prep_briefing jsonb,
  prep_briefing_generated_at timestamptz,
  pending_prep_suggestions jsonb not null default '[]'::jsonb,
  consent_state text not null default 'unknown',
  started_at timestamptz,
  ended_at timestamptz,
  transcript_deleted_at timestamptz,
  search_tsv tsvector generated always as (to_tsvector('english', coalesce(name, '') || ' ' || coalesce(summary, '') || ' ' || coalesce(narrative, '') || ' ' || coalesce(objective, '') || ' ' || coalesce(opening_scene, '') || ' ' || coalesce(gm_notes, ''))) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sessions_scope_check check (scope = 'saga' and saga_id is not null)
);
create index if not exists sessions_scope_idx on public.sessions(workspace_id, world_id, saga_id, status);
create index if not exists sessions_search_tsv_idx on public.sessions using gin(search_tsv);

create table if not exists public.notes (
  id uuid primary key default public.uuid7(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  world_id uuid not null references public.worlds(id) on delete cascade,
  saga_id uuid references public.sagas(id) on delete cascade,
  scope public.content_scope not null default 'saga',
  note_type public.note_type not null default 'lore',
  title text,
  body text not null default '',
  canon_state public.entity_canon_state not null default 'canon',
  created_by public.actor_kind not null default 'gm',
  search_tsv tsvector generated always as (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(body, ''))) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notes_scope_check check ((scope = 'world' and saga_id is null) or (scope = 'saga' and saga_id is not null))
);
create index if not exists notes_scope_idx on public.notes(workspace_id, world_id, saga_id, scope, note_type);
create index if not exists notes_search_tsv_idx on public.notes using gin(search_tsv);

create table if not exists public.note_attachments (
  id uuid primary key default public.uuid7(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  world_id uuid not null references public.worlds(id) on delete cascade,
  saga_id uuid references public.sagas(id) on delete cascade,
  scope public.content_scope not null default 'saga',
  note_id uuid not null references public.notes(id) on delete cascade,
  entity_type public.entity_type not null,
  entity_id uuid not null,
  created_at timestamptz not null default now(),
  constraint note_attachments_scope_check check ((scope = 'world' and saga_id is null) or (scope = 'saga' and saga_id is not null))
);

create table if not exists public.relationships (
  id uuid primary key default public.uuid7(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  world_id uuid not null references public.worlds(id) on delete cascade,
  saga_id uuid references public.sagas(id) on delete cascade,
  scope public.content_scope not null default 'saga',
  from_entity_type public.entity_type not null,
  from_entity_id uuid not null,
  to_entity_type public.entity_type not null,
  to_entity_id uuid not null,
  kind public.relationship_kind not null default 'related-to',
  notes text,
  canon_state public.entity_canon_state not null default 'canon',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint relationships_scope_check check ((scope = 'world' and saga_id is null) or (scope = 'saga' and saga_id is not null))
);
create index if not exists relationships_scope_idx on public.relationships(workspace_id, world_id, saga_id, scope);

create table if not exists public.relationship_sources (
  id uuid primary key default public.uuid7(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  world_id uuid not null references public.worlds(id) on delete cascade,
  saga_id uuid references public.sagas(id) on delete cascade,
  scope public.content_scope not null default 'saga',
  relationship_id uuid not null references public.relationships(id) on delete cascade,
  source_id uuid not null,
  created_at timestamptz not null default now(),
  constraint relationship_sources_scope_check check ((scope = 'world' and saga_id is null) or (scope = 'saga' and saga_id is not null))
);

create table if not exists public.mentions (
  id uuid primary key default public.uuid7(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  world_id uuid not null references public.worlds(id) on delete cascade,
  saga_id uuid references public.sagas(id) on delete cascade,
  scope public.content_scope not null default 'saga',
  source_entity_type public.entity_type not null,
  source_entity_id uuid not null,
  mentioned_entity_type public.entity_type not null,
  mentioned_entity_id uuid not null,
  mention_text text not null,
  state public.mention_state not null default 'suggested',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mentions_scope_check check ((scope = 'world' and saga_id is null) or (scope = 'saga' and saga_id is not null))
);
create index if not exists mentions_scope_idx on public.mentions(workspace_id, world_id, saga_id, scope);

create table if not exists public.sources (
  id uuid primary key default public.uuid7(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  world_id uuid not null references public.worlds(id) on delete cascade,
  saga_id uuid references public.sagas(id) on delete cascade,
  scope public.content_scope not null default 'saga',
  kind public.source_kind not null,
  source_entity_type public.entity_type,
  source_entity_id uuid,
  note_id uuid references public.notes(id) on delete set null,
  transcript_id uuid,
  session_id uuid references public.sessions(id) on delete set null,
  start_seconds numeric,
  end_seconds numeric,
  raw_excerpt text not null default '',
  created_at timestamptz not null default now(),
  constraint sources_scope_check check ((scope = 'world' and saga_id is null) or (scope = 'saga' and saga_id is not null))
);
create index if not exists sources_scope_idx on public.sources(workspace_id, world_id, saga_id, scope, kind);
create index if not exists sources_transcript_range_idx on public.sources(transcript_id, start_seconds) where transcript_id is not null;

create table if not exists public.drafts (
  id uuid primary key default public.uuid7(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  world_id uuid not null references public.worlds(id) on delete cascade,
  saga_id uuid references public.sagas(id) on delete cascade,
  scope public.content_scope not null default 'saga',
  entity_type public.entity_type not null,
  target_entity_id uuid,
  state public.draft_state not null default 'pending',
  canon_state public.draft_canon_state not null default 'ai_draft',
  change_kind public.change_kind not null,
  proposed_payload jsonb not null default '{}'::jsonb,
  committed_payload jsonb,
  expected_version timestamptz,
  confidence_band public.confidence_band,
  confidence_reason public.confidence_reason,
  rejection_reason_tags public.rejection_reason_tag[] not null default '{}',
  rejection_note text,
  gm_edit_diff jsonb,
  merge_target_id uuid,
  created_by public.actor_kind not null default 'gm_via_ai_approval',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint drafts_scope_check check ((scope = 'world' and saga_id is null) or (scope = 'saga' and saga_id is not null))
);
create index if not exists drafts_scope_state_idx on public.drafts(workspace_id, world_id, saga_id, scope, state);

create table if not exists public.draft_sources (
  id uuid primary key default public.uuid7(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  world_id uuid not null references public.worlds(id) on delete cascade,
  saga_id uuid references public.sagas(id) on delete cascade,
  scope public.content_scope not null default 'saga',
  draft_id uuid not null references public.drafts(id) on delete cascade,
  source_id uuid not null references public.sources(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (draft_id, source_id),
  constraint draft_sources_scope_check check ((scope = 'world' and saga_id is null) or (scope = 'saga' and saga_id is not null))
);

create table if not exists public.canon_audit (
  id uuid primary key default public.uuid7(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  world_id uuid not null references public.worlds(id) on delete cascade,
  saga_id uuid references public.sagas(id) on delete cascade,
  scope public.content_scope not null default 'saga',
  entity_type public.entity_type not null,
  entity_id uuid not null,
  draft_id uuid references public.drafts(id) on delete set null,
  from_state public.entity_canon_state,
  to_state public.entity_canon_state,
  action public.approval_action,
  actor_kind public.actor_kind not null default 'gm',
  source_ids uuid[] not null default '{}',
  change_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint canon_audit_scope_check check ((scope = 'world' and saga_id is null) or (scope = 'saga' and saga_id is not null))
);
create index if not exists canon_audit_scope_idx on public.canon_audit(workspace_id, world_id, saga_id, scope);

create table if not exists public.embeddings (
  id uuid primary key default public.uuid7(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  world_id uuid not null references public.worlds(id) on delete cascade,
  saga_id uuid references public.sagas(id) on delete cascade,
  scope public.content_scope not null default 'saga',
  source_kind text not null,
  source_entity_type public.entity_type,
  source_entity_id uuid not null,
  source_id uuid references public.sources(id) on delete set null,
  chunk_index int not null default 0,
  chunk_text text,
  embedding extensions.vector(1536),
  model text not null default 'text-embedding-3-small',
  model_version text not null default 'mvp',
  is_current boolean not null default true,
  content_hash text,
  created_at timestamptz not null default now(),
  constraint embeddings_scope_check check ((scope = 'world' and saga_id is null) or (scope = 'saga' and saga_id is not null))
);
create index if not exists embeddings_scope_current_idx on public.embeddings(workspace_id, world_id, saga_id, scope, is_current);
create index if not exists embeddings_hnsw_idx on public.embeddings using hnsw (embedding extensions.vector_cosine_ops) where is_current and embedding is not null;

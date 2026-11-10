-- Relic V2 — entity-scoped authored documents.
--
-- A document belongs to the World Object, never to a Card placement. The
-- version is the optimistic concurrency seam shared by Focus and Builder;
-- the legacy Fragment body remains a derived compatibility projection.

create table if not exists public.entity_documents (
  object_id  uuid primary key references public.world_objects(id) on delete cascade,
  document   jsonb not null check (jsonb_typeof(document) = 'object'),
  version    integer not null check (version > 0),
  updated_at timestamptz not null default now(),
  updated_by text not null default 'gm'
    check (updated_by in ('gm', 'player', 'librarian', 'system'))
);

create index entity_documents_updated_at
  on public.entity_documents (updated_at desc);

alter table public.representations
  add column if not exists mechanics jsonb
    check (mechanics is null or jsonb_typeof(mechanics) = 'object');

alter table public.entity_documents enable row level security;

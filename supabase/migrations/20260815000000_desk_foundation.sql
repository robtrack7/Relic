-- Relic V2 — the Desk foundation.
--
-- This is the world model made literal, and the split is the point:
-- `composition_items` holds placement and nothing else, `fragments` holds body
-- text and nothing else. There is no column on a composition item that could
-- hold world truth, so a Board cannot accidentally start owning one.
--
-- Ported from the development SQLite schema without adding features. Claims,
-- representations and story position arrive in the next slice; this migration
-- deliberately does not anticipate their shape.

-- Identity ---------------------------------------------------------------

create table public.worlds (
  id          uuid primary key,
  name        text,
  created_at  timestamptz not null default now()
);

-- Closed vocabularies are `check` constraints rather than Postgres enums.
-- The next slices widen every one of these, and widening a check is one
-- statement while widening an enum is a migration with a rewrite in it.
create table public.world_objects (
  id                    uuid primary key,
  world_id              uuid not null references public.worlds(id) on delete cascade,
  lifecycle             text not null default 'active'
                          check (lifecycle in ('active', 'archived', 'deleted')),
  version               integer not null default 1 check (version > 0),
  created_at            timestamptz not null default now(),
  creation_kind         text not null
                          check (creation_kind in ('gm_capture', 'gm_assertion', 'import', 'librarian', 'session')),
  creation_author       text not null
                          check (creation_author in ('gm', 'player', 'librarian', 'system')),
  creation_recorded_at  timestamptz not null
);

-- The lightest state of a World Object: captured thought before classification.
-- One per object, which is what makes an edit through any composition edit the
-- one body.
create table public.fragments (
  id           uuid primary key,
  object_id    uuid not null unique references public.world_objects(id) on delete cascade,
  body         text not null,
  truth_state  text not null default 'pencil'
                 check (truth_state in ('ink', 'pencil', 'disputed')),
  version      integer not null default 1 check (version > 0),
  updated_at   timestamptz not null default now()
);

-- Composition ------------------------------------------------------------

-- `seq` exists because SQLite ordering leaned on `rowid`, which Postgres has no
-- equivalent for. Insertion order is a property callers depend on, so it
-- becomes an explicit column rather than an accident of the engine.
create table public.compositions (
  id          uuid primary key,
  world_id    uuid not null references public.worlds(id) on delete cascade,
  kind        text not null check (kind in ('desk', 'board', 'prep', 'session')),
  name        text,
  version     integer not null default 1 check (version > 0),
  created_at  timestamptz not null default now(),
  seq         bigint generated always as identity
);

create table public.composition_items (
  id              uuid primary key,
  composition_id  uuid not null references public.compositions(id) on delete cascade,
  object_id       uuid not null references public.world_objects(id) on delete cascade,
  -- double precision, never numeric: postgres.js returns numeric as a string,
  -- and layout arithmetic happens in JS.
  x               double precision not null,
  y               double precision not null,
  width           double precision not null,
  height          double precision not null,
  z               integer not null default 0,
  version         integer not null default 1 check (version > 0),
  lifecycle       text not null default 'active'
                    check (lifecycle in ('active', 'archived', 'deleted')),
  seq             bigint generated always as identity
);

create index composition_items_by_composition
  on public.composition_items (composition_id, lifecycle, z);

create index composition_items_by_object
  on public.composition_items (object_id, lifecycle);

create index compositions_by_world
  on public.compositions (world_id, seq);

-- A world opens at exactly one Desk. SQLite's whole-database write lock made
-- select-then-insert safe; Postgres needs the invariant stated, or two first
-- visits racing each other would each create one.
create unique index compositions_one_desk_per_world
  on public.compositions (world_id)
  where kind = 'desk';

-- One object appears at most once on any one composition. Across compositions
-- it may appear freely — that is the whole point of a reference. Two cards for
-- the same object on the same Board would only make "which one am I editing"
-- ambiguous, and there is nothing to distinguish them by.
--
-- Partial on `active` deliberately: removing a card and referencing the object
-- again later is an ordinary gesture, not a constraint violation.
create unique index composition_items_one_active_reference
  on public.composition_items (composition_id, object_id)
  where lifecycle = 'active';

-- Access -----------------------------------------------------------------

-- RLS is enabled with no policies, which denies everything to `anon` and
-- `authenticated`. Relic has no actor yet: every read and write goes through a
-- Next.js server action holding a privileged connection, which bypasses RLS.
--
-- This is inert today and deliberately so. It means these tables are closed the
-- day anything points PostgREST at them, rather than open. Real policies arrive
-- with auth, alongside the owner column they need to reference.
alter table public.worlds             enable row level security;
alter table public.world_objects      enable row level security;
alter table public.fragments          enable row level security;
alter table public.compositions       enable row level security;
alter table public.composition_items  enable row level security;

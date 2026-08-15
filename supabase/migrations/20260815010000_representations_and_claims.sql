-- Relic V2 — Representations, Claims, and Templates.
--
-- Three ideas land here, and the boundary between them is the whole design:
--
--   A **Representation** is a way of understanding one World Object — Character,
--   Place, Faction, Thread, Event, Artifact, Source, Note. It is not a separate
--   record. Deepening a Fragment into a Character adds a representation to the
--   object that was already there; the Fragment body survives underneath it.
--
--   Its **fields** hold the game's mechanical sheet: ability scores, armour
--   class, hit points. These are rules data. They are not assertions about the
--   world, nobody disputes them, and they do not change with story time.
--
--   A **Claim** is a narrative assertion about a World Object: occupation,
--   allegiance, location, status, or a free sentence. These *are* contested,
--   sourced, and temporal. So they are addressable on their own, carry truth and
--   provenance, and carry a story position.
--
-- Putting a statblock in claims would drown the truth system in bookkeeping.
-- Putting allegiance in a JSON field would make it unciteable and untemporal.

-- Templates --------------------------------------------------------------

-- User-assembled shapes, for when Relic has not provided the template someone
-- needs. The built-in templates deliberately live in TypeScript instead
-- (`lib/world/templates.ts`) — they will churn constantly while the product
-- finds its shape, and a code change beats a migration for that. A row here
-- is always somebody's own.
create table public.templates (
  id          uuid primary key,
  world_id    uuid not null references public.worlds(id) on delete cascade,
  kind        text not null
                check (kind in ('character', 'place', 'faction', 'artifact',
                                'event', 'thread', 'source', 'note')),
  name        text not null check (length(btrim(name)) between 1 and 120),
  -- Ordered field definitions: [{ key, label, kind, group? }, ...]
  fields      jsonb not null default '[]'::jsonb
                check (jsonb_typeof(fields) = 'array'),
  version     integer not null default 1 check (version > 0),
  lifecycle   text not null default 'active'
                check (lifecycle in ('active', 'archived', 'deleted')),
  created_at  timestamptz not null default now(),
  seq         bigint generated always as identity
);

create index templates_by_world on public.templates (world_id, kind, lifecycle);

-- Representations --------------------------------------------------------

create table public.representations (
  id           uuid primary key,
  object_id    uuid not null references public.world_objects(id) on delete cascade,
  kind         text not null
                 check (kind in ('character', 'place', 'faction', 'artifact',
                                 'event', 'thread', 'source', 'note')),
  -- The object's name *as this kind of thing*. Identity lives on the object;
  -- the name is a property of how you are looking at it.
  label        text check (label is null or length(btrim(label)) between 1 and 200),
  template_id  uuid references public.templates(id) on delete set null,
  -- The mechanical sheet. An object, never an array.
  fields       jsonb not null default '{}'::jsonb
                 check (jsonb_typeof(fields) = 'object'),
  version      integer not null default 1 check (version > 0),
  lifecycle    text not null default 'active'
                 check (lifecycle in ('active', 'archived', 'deleted')),
  created_at   timestamptz not null default now(),
  seq          bigint generated always as identity,
  -- One Character view of a thing, not two. An object may still hold several
  -- *different* kinds — a Place that is also a Faction seat is one identity
  -- seen two ways.
  unique (object_id, kind)
);

create index representations_by_object on public.representations (object_id, lifecycle, seq);

-- Claims -----------------------------------------------------------------

-- Deliberately **not** `unique (subject_id, claim_kind)`.
--
-- A claim is an assertion made at a point in story time, not a mutable cell.
-- Mara's allegiance before the cathedral and after it are two claims, both
-- true, at different story positions — and the value Relic shows is a
-- projection: the latest claim at or before the story position being viewed.
--
-- That is the whole reason story position is here before anything reads it.
-- A schema that assumed one current value per fact would have to be rewritten
-- to gain a temporal axis; this one only has to gain a query.
create table public.claims (
  id           uuid primary key,
  subject_id   uuid not null references public.world_objects(id) on delete cascade,
  -- The attribute being asserted: 'occupation', 'allegiance', 'location',
  -- 'status', or 'assertion' for a free sentence.
  claim_kind   text not null check (length(btrim(claim_kind)) between 1 and 120),
  value        text not null check (length(btrim(value)) between 1 and 4000),

  -- Truth, separate from the object's maturity. A Pencil Character may hold an
  -- established claim; an Ink Character may hold a disputed one.
  truth_state  text not null default 'pencil'
                 check (truth_state in ('ink', 'pencil', 'disputed')),

  -- Provenance: why Relic believes this.
  authored_by  text not null
                 check (authored_by in ('gm', 'player', 'librarian', 'system')),
  provenance   text not null
                 check (provenance in ('gm_capture', 'gm_assertion', 'import',
                                       'librarian', 'session')),
  -- Transaction time: when Relic recorded it. Never conflate with story time.
  recorded_at  timestamptz not null default now(),

  -- Story time: when this was true in the fiction. Every column nullable,
  -- because `before Session 4` is a real position and `unknown` is a real
  -- answer. Relic must never invent precision it was not given.
  story_order      bigint,
  story_precision  text not null default 'unknown'
                     check (story_precision in ('exact', 'day', 'month', 'year',
                                                'relative', 'unknown')),
  story_label      text check (story_label is null
                               or length(btrim(story_label)) between 1 and 200),

  version      integer not null default 1 check (version > 0),
  lifecycle    text not null default 'active'
                 check (lifecycle in ('active', 'archived', 'deleted')),
  seq          bigint generated always as identity
);

create index claims_by_subject
  on public.claims (subject_id, lifecycle, claim_kind, story_order, seq);

-- Access -----------------------------------------------------------------

-- As with the Desk foundation: enabled, no policies, closed by default until
-- Relic has an actor to write policies against.
alter table public.templates        enable row level security;
alter table public.representations  enable row level security;
alter table public.claims           enable row level security;

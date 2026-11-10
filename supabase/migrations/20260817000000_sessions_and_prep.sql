-- Relic V2 — sessions, and Prep as one of their compositions.
--
-- A session is the temporal unit the next three slices turn on: Prep arranges
-- for it, Stage runs it, and Review settles what happened back into the world.
-- Nothing before this migration had a shape for "tonight", so a prep
-- composition would have been a Board wearing a different name.
--
-- The split is the same one `compositions` already makes. A session's workspace
-- is an ordinary composition holding references and layout; what the session
-- adds is the part a Board has no use for — a running order, and an intention.

create table public.sessions (
  id              uuid primary key,
  world_id        uuid not null references public.worlds(id) on delete cascade,
  -- One session, one prep composition, and neither exists without the other.
  -- Unique because Prep is *the* workspace of a session, not one of several:
  -- narrowing it into Stage must not have to ask which one it meant.
  composition_id  uuid not null unique references public.compositions(id) on delete cascade,
  title           text not null,
  -- What tonight is for, in one line. Null until the GM says, which is the
  -- ordinary state of a session somebody has only just started thinking about.
  intent          text,
  -- Widened by no later slice: Stage moves a session to `in_play` and Review
  -- to `played`. Stated now because the whole reason this table exists is that
  -- a session has a life, and a one-state lifecycle would not be one.
  state           text not null default 'planned'
                    check (state in ('planned', 'in_play', 'played')),
  version         integer not null default 1 check (version > 0),
  created_at      timestamptz not null default now(),
  seq             bigint generated always as identity
);

create index sessions_by_world on public.sessions (world_id, seq);

-- The running order.
--
-- A beat is an **intention**, not an Event: something the GM means to try,
-- which may never happen. That is why there is deliberately no `truth_state`
-- here and no route from this table into `claims`. An Event is something the
-- fiction records as having occurred, and turning a beat into one is Review's
-- job, taken deliberately, once the session has actually been played.
--
-- `author` exists for the same reason it exists on prose: the Librarian may
-- propose a beat, and a GM who cannot tell their own plan from a model's
-- suggestion has lost the thing Prep is for.
create table public.session_beats (
  id          uuid primary key,
  session_id  uuid not null references public.sessions(id) on delete cascade,
  body        text not null,
  -- Rewritten wholesale by a reorder rather than nudged. The list is short and
  -- arrives complete, so there is no partial order to reconcile and no float
  -- precision to drift.
  position    integer not null,
  author      text not null
                check (author in ('gm', 'player', 'librarian', 'system')),
  lifecycle   text not null default 'active'
                check (lifecycle in ('active', 'archived', 'deleted')),
  version     integer not null default 1 check (version > 0),
  created_at  timestamptz not null,
  seq         bigint generated always as identity
);

create index session_beats_by_session
  on public.session_beats (session_id, lifecycle, position, seq);

-- What a beat is about.
--
-- References and ordering, exactly as `composition_items` holds references and
-- placement: there is no column here that could hold world content, so a beat
-- can never quietly become the record of what a Character is. Attaching an
-- object to tonight's plan says nothing about that object at all.
create table public.session_beat_refs (
  beat_id    uuid not null references public.session_beats(id) on delete cascade,
  object_id  uuid not null references public.world_objects(id) on delete cascade,
  seq        integer not null,
  primary key (beat_id, object_id)
);

create index session_beat_refs_by_object
  on public.session_beat_refs (object_id);

-- Closed to `anon` and `authenticated` on the same terms as everything else:
-- enabled with no policies, because Relic still has no actor to write one
-- against. See the foundation migration.
alter table public.sessions           enable row level security;
alter table public.session_beats      enable row level security;
alter table public.session_beat_refs  enable row level security;

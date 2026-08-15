-- Relic V2 — Ink, provenance, and deliberate truth editing.
--
-- Two axes are separated here that the schema had been quietly running
-- together, and the separation is the whole migration:
--
--   **Maturity** belongs to a World Object. Pencil while unsettled, Ink once
--   substantially settled. It says how finished a thing is.
--
--   **Truth** belongs to a claim. Ink, Pencil, or disputed. It says whether
--   Relic believes an assertion.
--
-- Neither implies the other. A Pencil Character may hold an established claim
-- about their occupation; an Ink Character may hold a disputed one about what
-- they did at the cathedral. Rendering one as the other would tell the GM
-- something false about their own world.
--
-- `fragments.truth_state` was maturity wearing the wrong name. There is exactly
-- one Fragment per object, so that column was already per-object — and a
-- Fragment's prose is unclassified creative material, whose settledness is
-- precisely maturity. It moves onto `world_objects` and the old column goes.

-- Maturity ---------------------------------------------------------------

alter table public.world_objects
  add column maturity text not null default 'pencil'
    check (maturity in ('pencil', 'ink'));

-- Why Relic believes this thing is settled. Null until somebody settles it,
-- which is the ordinary state: capture produces Pencil and nothing else.
alter table public.world_objects
  add column settled_by text
    check (settled_by is null or settled_by in ('gm', 'player', 'librarian', 'system')),
  add column settled_at timestamptz;

-- Both halves of the record arrive or neither. A settlement with no author is
-- an assertion with nothing standing behind it.
alter table public.world_objects
  add constraint world_objects_settlement_whole
  check ((settled_by is null) = (settled_at is null));

update public.world_objects wo
   set maturity   = 'ink',
       -- Anything settled before this migration was settled by the GM: no other
       -- actor exists yet. Stated rather than left to inference, because the
       -- constraint below is about to require it.
       settled_by = 'gm',
       settled_at = wo.created_at
  from public.fragments f
 where f.object_id = wo.id and f.truth_state = 'ink';

alter table public.fragments drop column truth_state;

-- Truth provenance -------------------------------------------------------

-- A claim already records how it arrived: `provenance`, `authored_by`,
-- `recorded_at`. Establishing it is a *second* act, by a second author, at a
-- second time — "the Librarian inferred this from Session 4; the GM established
-- it in August" is two facts, and collapsing them loses the one that matters
-- when asking why Relic believes something.
alter table public.claims
  add column truth_by text
    check (truth_by is null or truth_by in ('gm', 'player', 'librarian', 'system')),
  add column truth_at timestamptz;

alter table public.claims
  add constraint claims_truth_settlement_whole
  check ((truth_by is null) = (truth_at is null));

update public.claims
   set truth_by = 'gm', truth_at = recorded_at
 where truth_state = 'ink' and truth_by is null;

-- Ink is deliberate ------------------------------------------------------

-- The invariant made structural rather than documented, and added last so the
-- backfills above have already made the existing rows honest.
--
-- Nothing may reach Ink without an author recorded against it. `setClaim` and
-- `captureCard` write no settlement, so they *cannot* write Ink — the check
-- refuses them — and a future write path that forgets the rule fails loudly on
-- its first insert instead of quietly establishing truth.
--
-- *Which* actors may be that author is enforced above this, in the store: only
-- the GM. That belongs in code because it is a judgment about actors; this
-- belongs here because it is a property of the row.
alter table public.claims
  add constraint claims_ink_is_deliberate
  check (truth_state <> 'ink' or truth_by is not null);

alter table public.world_objects
  add constraint world_objects_ink_is_deliberate
  check (maturity <> 'ink' or settled_by is not null);

-- Disputed and established claims are what a GM goes looking for — "what is
-- unresolved about this world" is a real question and should not be a scan.
create index claims_by_truth
  on public.claims (subject_id, truth_state)
  where lifecycle = 'active' and truth_state <> 'pencil';

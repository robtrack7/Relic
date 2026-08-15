-- Relic V2 — Relationship assertions.
--
-- A relationship is **a claim whose value is another World Object**. It is not a
-- new kind of record and it does not get its own table.
--
-- That is the whole design decision, and it earns three things at once:
--
--   truth, provenance and story position already live on a claim, so a
--   relationship inherits all of them. "Mara served the Harbour Guild until the
--   fire" is one claim with a story position, disputed or established like any
--   other assertion, and citeable.
--
--   there is one write path. `setClaim` gains a nullable column, not a sibling
--   API — so nothing downstream has to learn that relationships are special.
--
--   Chronicle gets edges for free when it arrives, because the edges are already
--   ordered in story time by the columns claims have carried since the first
--   migration.
--
-- `value` stays and stays required: it holds the reading of the claim in words.
-- For a relationship it is the name as asserted, which is a fallback, not the
-- truth — Relic resolves the *current* name of the object it points at, so
-- renaming Mara renames her everywhere she is referred to. The text survives so
-- an archived or unresolvable other end still reads as language rather than as
-- a dangling id.

alter table public.claims
  add column object_value uuid references public.world_objects(id) on delete set null;

-- Nothing is its own allegiance. A self-edge carries no information and would
-- make every neighbourhood query return the object it started from.
alter table public.claims
  add constraint claims_object_value_not_self
  check (object_value is null or object_value <> subject_id);

-- The inbound half of "pull the thread". Asking what points *at* this object is
-- as ordinary as asking what it points at, and without this it is a sequential
-- scan of every claim in the world.
create index claims_by_object_value
  on public.claims (object_value, lifecycle)
  where object_value is not null;

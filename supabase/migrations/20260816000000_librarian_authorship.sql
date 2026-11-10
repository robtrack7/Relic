-- Relic V2 — the Librarian's hands leave a mark.
--
-- Every author column in this schema has always listed 'librarian' among its
-- permitted values, and nothing has ever written one. That was correct while
-- every tool the Librarian had was a read. It stops being correct here: the
-- Librarian can now capture material, assert claims, and revise prose, and a
-- world that cannot say which of those were its work is a world where the GM
-- cannot tell their own writing from a model's.
--
-- `world_objects` and `claims` need nothing — their `creation_author`,
-- `authored_by`, and `provenance` checks already accept it, and only the
-- TypeScript was hardcoding 'gm'. `fragments` records no authorship at all,
-- which is the gap this closes.

-- Who last wrote this prose ----------------------------------------------

-- Null means the GM, which is every row that exists today and every row an
-- ordinary edit will write. Recording an author only when it is *not* the GM
-- would be the cheaper schema and the wrong one — "nobody has said" and "the GM
-- said" are different facts, and the second is the one a restore control needs.
alter table public.fragments
  add column edited_by text
    check (edited_by is null or edited_by in ('gm', 'player', 'librarian', 'system')),
  add column edited_at timestamptz;

-- Both halves arrive or neither, exactly as `world_objects_settlement_whole`
-- requires of a settlement. An authorship with no time is not a record of when
-- the world changed.
alter table public.fragments
  add constraint fragments_authorship_whole
  check ((edited_by is null) = (edited_at is null));

-- What the last rewrite replaced -----------------------------------------

-- Relic has no undo. That is a deliberate gap — undo is its own slice and it
-- must cover the GM's gestures too — but rewriting prose is the one thing the
-- Librarian can do that destroys something rather than adding or archiving it.
-- Everything else it touches is reversible by a gesture that already exists:
-- remove the card, retract the claim, move it back.
--
-- So the destructive act carries its own reversal rather than waiting for a
-- general one. One column, holding exactly one step back: what the body said
-- before the most recent rewrite. Not a revision history — that is Chronicle's
-- shape, and building it here would mean building it against a world with no
-- sessions in it.
alter table public.fragments
  add column superseded_body text;

-- Relic V2 — the Librarian's conversation.
--
-- One conversation per world, not per composition. The Librarian is a single
-- persistent presence: moving from the Desk to a Board is changing what you are
-- looking at, not starting a new relationship with the thing you are talking to.
--
-- `INTERACTION.md` says conversation *records what happened* and is not the
-- product itself, and this table is deliberately built to that description. It
-- holds what was said and nothing else. No world truth lives here: an assertion
-- the Librarian makes in prose is not a claim, and the only way for something
-- said in this table to become world content is for a write path to put it
-- there. Chat is not evidence merely because it was typed into a chat.
--
-- Persisting it also settles a security question. The transcript is part of the
-- model's prompt, so if the browser held it the server would have to trust the
-- client's account of what it had previously said — which is a direct route for
-- anything that can write to the page to rewrite the Librarian's instructions.
-- The server reads the history by world id and the client sends only the new
-- message.

create table public.librarian_messages (
  id              uuid primary key default gen_random_uuid(),
  world_id        uuid not null references public.worlds(id) on delete cascade,

  -- Where the GM was standing when this was said. Nullable and `set null` on
  -- delete, because the conversation outlives any one composition — a Board can
  -- be thrown away without tearing a hole in what was discussed on it.
  composition_id  uuid references public.compositions(id) on delete set null,

  role            text not null check (role in ('gm', 'librarian')),
  body            text not null,

  -- The World Objects an answer actually cited, resolved at the time it was
  -- given. Kept so a reloaded conversation still shows its sources rather than
  -- bare "[1]" markers with nothing behind them.
  --
  -- These are *references* to identities, never copies of them: each entry is an
  -- object id plus the label it was cited under. What a source is called now is
  -- read from the world, so renaming a thing renames it in every answer that
  -- ever pointed at it.
  sources         jsonb not null default '[]'::jsonb,

  said_at         timestamptz not null default now(),

  -- Ordering, separate from the clock. A turn writes the GM's message and the
  -- Librarian's reply in one transaction, so their timestamps can be identical;
  -- ordering a conversation by a value that ties is how a reply ends up printed
  -- above the question it answers.
  seq             bigserial not null
);

create index librarian_messages_by_world
  on public.librarian_messages (world_id, seq);

-- Closed to PostgREST, exactly as every other table is: enabled with no
-- policies denies `anon` and `authenticated` outright. Relic has no actor yet,
-- so there is nothing to write a policy against — and a transcript is the last
-- table that should be open by default the day something points a client at it.
alter table public.librarian_messages enable row level security;

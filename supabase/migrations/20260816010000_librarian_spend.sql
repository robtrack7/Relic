-- Relic V2 — what the Librarian costs.
--
-- Tokens, not money. The provider reports tokens and they are exact; money is a
-- rate that changes, that varies by account, and that Relic cannot verify. A
-- dollar figure written into a row is a price frozen at the moment of the call,
-- and it would go quietly wrong the first time a rate moved. So the measurement
-- is stored and the estimate is derived at read time, in `lib/librarian/spend.ts`.
--
-- These columns sit on the message rather than in a table of their own because
-- one Librarian message *is* one turn's answer, and a turn is the unit anyone
-- asks about: what did this question cost, what has this world cost. A separate
-- table would be the same rows keyed by the same id.
--
-- The known gap: a turn that fails after the model has spoken records no
-- exchange, so its spend is not counted here. That is bounded — a provider
-- error or a rate limit spends nothing, and a refusal after a full prompt is
-- rare — but it means this is a floor on spend rather than an exact bill. The
-- provider's own dashboard remains the authority; this answers "which
-- conversations are expensive", which no dashboard can.

alter table public.librarian_messages
  -- Which worker ran it. Kept beside the model because "gpt-5.6-terra" is a
  -- LiteLLM-era alias that says nothing about who serves it, and a world may
  -- have been spoken to through both adapters over its life.
  add column provider           text,
  add column model              text,

  -- The four buckets are Relic's, not either provider's. `tokens_input` is
  -- always what was read fresh at full price: OpenAI reports a total with the
  -- cached portion inside it and Anthropic reports the remainder beside it, and
  -- the adapters translate. Storing whichever dialect answered would make two
  -- worlds' figures incomparable.
  add column tokens_input       integer,
  add column tokens_cache_write integer,
  add column tokens_cache_read  integer,
  add column tokens_output      integer;

-- All of it or none of it, exactly as `fragments_authorship_whole` requires of
-- an authorship. A partial measurement is worse than an absent one: it reads as
-- a cheap turn rather than as an unmeasured one, and the whole point of this
-- column set is that somebody is watching a hard limit.
alter table public.librarian_messages
  add constraint librarian_messages_spend_whole
  check (
    num_nonnulls(
      provider, model,
      tokens_input, tokens_cache_write, tokens_cache_read, tokens_output
    ) in (0, 6)
  );

-- Nothing is spent saying a thing to yourself. The GM's own message is half of
-- the exchange and costs nothing, and a row that claimed otherwise would double
-- every world's total.
alter table public.librarian_messages
  add constraint librarian_messages_only_the_librarian_spends
  check (role = 'librarian' or provider is null);

alter table public.librarian_messages
  add constraint librarian_messages_spend_is_not_negative
  check (
    coalesce(tokens_input, 0) >= 0
    and coalesce(tokens_cache_write, 0) >= 0
    and coalesce(tokens_cache_read, 0) >= 0
    and coalesce(tokens_output, 0) >= 0
  );

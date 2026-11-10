/**
 * What a Librarian turn cost, in tokens — and what that is probably worth.
 *
 * Two different kinds of fact live in this file and the distinction is the whole
 * design. **Tokens are measured**: the provider reports them, Relic records
 * them, and they are exact. **Money is estimated**: it comes from a rate the
 * provider publishes and may change tomorrow, and Relic has no way to know
 * whether the account it is billing has a discount, a free tier, or a
 * negotiated price. So tokens are stored and money is derived at read time —
 * never the other way round. A dollar figure written into the database is a
 * price frozen at the moment of the call, and it would go quietly wrong.
 *
 * The Librarian never sees any of this. Spend is a property of running a model,
 * not of the intelligence above the port, which is why nothing here reaches
 * `Turn`, the Soul, or the tools.
 */

/**
 * Tokens through one model, normalised.
 *
 * The four buckets are Relic's, not either provider's, and the adapters
 * translate into them. That translation is the point: OpenAI reports a total
 * `input_tokens` with the cached portion *inside* it, while Anthropic reports
 * uncached input with cache reads and writes *beside* it. Storing whichever
 * dialect happened to answer would make two worlds' figures incomparable, and
 * "how much have I spent" is exactly the question that must not depend on which
 * adapter was configured that week.
 *
 * `input` is therefore always tokens read fresh at full price, with nothing
 * served from cache and nothing written to it counted twice.
 */
export type Spend = Readonly<{
  provider: string;
  model: string;
  input: number;
  /** Tokens written into a cache. Billed at a premium by some providers. */
  cacheWrite: number;
  /** Tokens served from a cache. Billed at a steep discount by both. */
  cacheRead: number;
  output: number;
}>;

/** Every token a turn passed through a model, whatever it was spent on. */
export const tokens = (spend: Spend): number =>
  spend.input + spend.cacheWrite + spend.cacheRead + spend.output;

/**
 * One turn's spend, summed across the several model calls it took.
 *
 * A turn is one question and one answer as far as the GM is concerned, but a
 * turn that searches twice and then answers is three round trips. They are one
 * cost, and it is the turn — not the round trip — that the transcript records.
 *
 * Model and provider are taken from the first call. In practice they cannot
 * differ within a turn: one adapter runs it, and the model is read from the
 * environment once at module load.
 */
export function combine(spends: readonly Spend[]): Spend | null {
  const first = spends[0];
  if (!first) return null;
  return spends.slice(1).reduce<Spend>(
    (total, next) => ({
      provider: total.provider,
      model: total.model,
      input: total.input + next.input,
      cacheWrite: total.cacheWrite + next.cacheWrite,
      cacheRead: total.cacheRead + next.cacheRead,
      output: total.output + next.output
    }),
    first
  );
}

/** What a world has spent, one entry per model it has spoken through. */
export type SpendTally = Readonly<{
  turns: number;
  byModel: readonly Spend[];
}>;

/**
 * A tally in the two numbers a GM actually reads.
 *
 * `usd` is null when *any* model in the tally has no known rate, rather than
 * silently pricing the part it recognises. A figure that quietly omits half the
 * spend is worse than no figure at all — particularly for the person who asked
 * for this because they have a hard limit on the account.
 */
export type Reckoning = Readonly<{
  turns: number;
  tokens: number;
  usd: number | null;
}>;

export function reckon(tally: SpendTally): Reckoning {
  let total = 0;
  let usd: number | null = 0;

  for (const spend of tally.byModel) {
    total += tokens(spend);
    const rates = ratesFor(spend.model);
    if (!rates || usd === null) {
      usd = null;
      continue;
    }
    usd +=
      (spend.input * rates.input +
        spend.cacheWrite * rates.cacheWrite +
        spend.cacheRead * rates.cacheRead +
        spend.output * rates.output) /
      1_000_000;
  }

  return { turns: tally.turns, tokens: total, usd };
}

/** US dollars per million tokens. */
export type Rates = Readonly<{
  input: number;
  cacheWrite: number;
  cacheRead: number;
  output: number;
}>;

/**
 * What Relic believes a model costs.
 *
 * Deliberately short, and deliberately not exhaustive. A model is in this table
 * only if its published price was checked; everything else answers `null` and
 * the readout shows tokens with no money beside them. That is the honest
 * failure: `AI.md` asks the Librarian never to fill a gap with something
 * plausible, and a cost meter has no business doing what the Librarian is
 * forbidden to do.
 *
 * Anthropic's cache pricing is a multiple of the input rate rather than its own
 * number — writes at 1.25x for the five-minute cache `anthropic.ts` uses, reads
 * at 0.1x — so the columns here are those multiples already worked out.
 *
 * The `gpt-5.6-*` aliases are absent on purpose. They are V1's LiteLLM names
 * for OpenAI models and Relic has no checked price for them, so they take the
 * `LIBRARIAN_RATES` route below rather than a guess written into the source.
 */
const PUBLISHED: Readonly<Record<string, Rates>> = {
  "claude-opus-5": { input: 5, cacheWrite: 6.25, cacheRead: 0.5, output: 25 },
  "claude-opus-4-8": { input: 5, cacheWrite: 6.25, cacheRead: 0.5, output: 25 },
  "claude-opus-4-7": { input: 5, cacheWrite: 6.25, cacheRead: 0.5, output: 25 },
  "claude-sonnet-5": { input: 3, cacheWrite: 3.75, cacheRead: 0.3, output: 15 },
  "claude-sonnet-4-6": { input: 3, cacheWrite: 3.75, cacheRead: 0.3, output: 15 },
  "claude-haiku-4-5": { input: 1, cacheWrite: 1.25, cacheRead: 0.1, output: 5 },
  "claude-fable-5": { input: 10, cacheWrite: 12.5, cacheRead: 1, output: 50 }
};

/**
 * The rate for a model, or nothing.
 *
 * `LIBRARIAN_RATES` wins, because the operator knows their own bill and Relic
 * does not. It is four numbers — input, cache write, cache read, output, in US
 * dollars per million tokens — and it applies to whichever model is configured,
 * since one deployment runs one model at a time. Four rather than two so that a
 * cached conversation is not priced as though nothing were cached; a heavily
 * cached Librarian is most of the tokens and a small fraction of the cost, and
 * conflating them would make the meter wrong in the direction that matters.
 *
 * Anything unparseable is ignored rather than thrown. A malformed rate is a
 * typo in a cost estimate, and it must not be able to stop the Librarian from
 * answering.
 */
export function ratesFor(model: string): Rates | null {
  return declared() ?? PUBLISHED[model] ?? null;
}

function declared(): Rates | null {
  const raw = process.env.LIBRARIAN_RATES?.trim();
  if (!raw) return null;

  const parts = raw.split("/").map((part) => Number(part.trim()));
  if (parts.length !== 4) return null;
  if (parts.some((n) => !Number.isFinite(n) || n < 0)) return null;

  const [input, cacheWrite, cacheRead, output] = parts as [number, number, number, number];
  return { input, cacheWrite, cacheRead, output };
}

/**
 * Tokens, as a GM reads them rather than as a machine writes them.
 *
 * Thousands from a thousand, because the interesting comparison in a
 * conversation is between turns rather than between digits, and an exact count
 * that has to be read character by character says less than a rounded one.
 */
export function saySize(count: number): string {
  if (count < 1_000) return `${count}`;
  if (count < 1_000_000) return `${(count / 1_000).toFixed(1)}k`;
  return `${(count / 1_000_000).toFixed(2)}M`;
}

/**
 * Money, at the precision the number deserves.
 *
 * Sub-cent figures keep their decimals, because a Librarian turn genuinely can
 * cost a tenth of a cent and rounding it to `$0.00` would tell the GM their
 * conversation is free. Anything above a cent rounds to cents, because this is
 * an estimate and trailing precision on an estimate is a false claim.
 */
export function sayMoney(usd: number): string {
  if (usd === 0) return "$0.00";
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(2)}`;
}

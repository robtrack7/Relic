// @vitest-environment node
import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { buildBrief, catalogue, searchTool } from "@/lib/librarian/context";
import { citedSources } from "@/lib/librarian/model";
import type { Vantage, WireEvent } from "@/lib/librarian/model";
import { ScriptedLibrarian, SCRIPTED_MODEL, type Step } from "@/lib/librarian/scripted";
import {
  combine,
  ratesFor,
  reckon,
  sayMoney,
  saySize,
  type Spend
} from "@/lib/librarian/spend";
import { runTurn } from "@/lib/librarian/turn";
import {
  asCardId,
  asClaimId,
  asCompositionId,
  asRepresentationId,
  asWorldId,
  asWorldObjectId,
  cardRef,
  emptyLayoutAt,
  type CompositionId,
  type DeskCard,
  type DeskView,
  type ObjectRef,
  type RepresentationKind
} from "@/lib/world/model";
import { closeDb, db } from "@/lib/world/db";
import { PostgresDeskRepository } from "@/lib/world/postgres-store";
import type { DeskRepository } from "@/lib/world/repository";
import { must } from "./support";

/**
 * What the Librarian is allowed to know, and what it may cite.
 *
 * Two things are specified here, and neither of them involves a model. The
 * grounding is assembled on the server from identifiers, so what the client
 * *claims* is focused or selected can only be right or resolve to nothing —
 * which is the property that keeps anything able to write to the page from
 * writing to the Librarian's context. And a citation is a number into a list
 * Relic built, so a number the world does not back can be dropped rather than
 * rendered as a source pointing somewhere.
 *
 * No real provider appears here. Where a turn has to be run end to end, it is
 * run through `ScriptedLibrarian`, which calls the real tools and yields the
 * real events — the decision of *which* tool to call is the only thing faked.
 * Nothing worth specifying about a Turn depends on a model existing, and a
 * suite that needed one to run would stop
 * being run.
 */

let WORLD = asWorldId(randomUUID());
let repo: DeskRepository;

beforeEach(() => {
  WORLD = asWorldId(randomUUID());
  repo = PostgresDeskRepository.open(db());
});

afterAll(async () => {
  await closeDb();
});

async function capture(
  compositionId: CompositionId,
  body: string,
  name?: string,
  kind: RepresentationKind = "character"
) {
  const card = must(await repo.captureCard({
    compositionId,
    cardId: asCardId(randomUUID()),
    objectId: asWorldObjectId(randomUUID()),
    body,
    layout: emptyLayoutAt(0, 0),
    author: "gm"
  }), "capture");
  if (name) {
    await repo.representObject({
      objectId: card.objectId,
      representationId: asRepresentationId(randomUUID()),
      kind,
      label: name
    });
  }
  return card;
}

/** The composition as the server re-reads it, plus everything the brief needs. */
async function reread(compositionId: CompositionId) {
  const view = await repo.openComposition(compositionId);
  const workspace = await repo.openWorld(WORLD);
  if (!view) throw new Error("composition vanished");
  return { view, workspace };
}

function brief(view: DeskView, workspace: Awaited<ReturnType<typeof reread>>["workspace"], vantage: Vantage) {
  const sources = catalogue();
  return {
    text: buildBrief({ workspace, view, vantage, cite: sources.cite }),
    sources
  };
}

const nothing = (compositionId: CompositionId): Vantage => ({
  compositionId,
  focusCardId: null,
  selectedCardIds: [],
  here: null
});

describe("what the Librarian can see", () => {
  it("names what is on the composition the GM is looking at", async () => {
    const desk = await repo.openDesk(WORLD);
    await capture(desk.compositionId, "A harbourmaster with a debt.", "Mara");
    await capture(desk.compositionId, "Salt and rope.", "The Quay", "place");

    const { view, workspace } = await reread(desk.compositionId);
    const { text } = brief(view, workspace, nothing(desk.compositionId));

    expect(text).toContain("Mara — character, pencil");
    expect(text).toContain("The Quay — place, pencil");
    expect(text).toContain("Nothing is selected.");
    expect(text).toContain("Nothing is focused.");
  });

  /*
   * The seam that matters. The browser says which card is focused; it does not
   * say what that card is, and a card id belonging to another composition — or
   * to nothing at all — buys exactly no context.
   */
  it("resolves focus and selection against the composition, not against the client", async () => {
    const desk = await repo.openDesk(WORLD);
    const mara = await capture(desk.compositionId, "A harbourmaster.", "Mara");

    const board = await repo.createBoard({
      worldId: WORLD,
      compositionId: asCompositionId(randomUUID()),
      name: "Harbour"
    });
    const elsewhere = await capture(board.compositionId, "Kept out of the way.", "Ledger");

    const { view, workspace } = await reread(desk.compositionId);
    const { text } = brief(view, workspace, {
      compositionId: desk.compositionId,
      // A card that is real, but not here.
      focusCardId: elsewhere.cardId,
      // One that is here, and one that has never existed.
      selectedCardIds: [mara.cardId, randomUUID()],
      here: null
    });

    expect(text).toContain("Nothing is focused.");
    expect(text).not.toContain("Ledger");
    expect(text).toContain("# Selected (1)");
    expect(text).toContain("Mara");
  });

  /*
   * Truth and provenance are different questions, and an answer that reports the
   * first without the second is how "the Librarian inferred this" quietly
   * becomes "this is so".
   */
  it("gives the focused object its claims, with truth and provenance", async () => {
    const desk = await repo.openDesk(WORLD);
    const mara = await capture(desk.compositionId, "A harbourmaster with a debt.", "Mara");

    await repo.setClaim({
      subjectId: mara.objectId,
      claimId: asClaimId(randomUUID()),
      claimKind: "occupation",
      value: "harbourmaster",
      author: "gm"
    });

    const { view, workspace } = await reread(desk.compositionId);
    const { text } = brief(view, workspace, {
      compositionId: desk.compositionId,
      focusCardId: mara.cardId,
      selectedCardIds: [],
  here: null
    });

    expect(text).toContain("# Open in the entity surface");
    expect(text).toContain("occupation: harbourmaster");
    // Asserted by hand is Pencil, and it says who asserted it.
    expect(text).toContain("Pencil; gm assertion by gm");
    expect(text).toContain("A harbourmaster with a debt.");
  });

  /*
   * A relational claim points at an identity, so the far end gets a number of
   * its own — the Librarian can cite the Guild, not merely the sentence about it.
   */
  it("numbers the far end of a relationship so it can be cited directly", async () => {
    const desk = await repo.openDesk(WORLD);
    const mara = await capture(desk.compositionId, "A harbourmaster.", "Mara");
    const guild = await capture(desk.compositionId, "Runs the wharf.", "Harbour Guild", "faction");

    await repo.setClaim({
      subjectId: mara.objectId,
      claimId: asClaimId(randomUUID()),
      claimKind: "allegiance",
      value: "the Harbour Guild",
      objectValue: guild.objectId,
      author: "gm"
    });

    const { view, workspace } = await reread(desk.compositionId);
    const { text, sources } = brief(view, workspace, {
      compositionId: desk.compositionId,
      focusCardId: mara.cardId,
      selectedCardIds: [],
  here: null
    });

    const guildNumber = sources
      .sources()
      .findIndex((ref) => ref.objectId === guild.objectId) + 1;

    expect(guildNumber).toBeGreaterThan(0);
    expect(text).toContain(`the Harbour Guild → [${guildNumber}]`);
    expect(text).toContain(`allegiance: [${guildNumber}] Harbour Guild`);
  });

  it("says plainly when the composition is empty", async () => {
    const desk = await repo.openDesk(WORLD);
    const { view, workspace } = await reread(desk.compositionId);
    const { text } = brief(view, workspace, nothing(desk.compositionId));

    expect(text).toContain("Nothing is on it yet.");
  });
});

describe("looking things up", () => {
  /*
   * One numbering for the whole turn. The Harbour Guild found by search and the
   * Harbour Guild sitting on the Desk are one identity, and a conversation that
   * gave them two numbers would have made the Librarian the one place in Relic
   * where identity is not stable.
   */
  it("cites a thing by one number however it was reached", async () => {
    const desk = await repo.openDesk(WORLD);
    const guild = await capture(desk.compositionId, "Runs the wharf.", "Harbour Guild", "faction");

    const { view, workspace } = await reread(desk.compositionId);
    const sources = catalogue();
    const text = buildBrief({ workspace, view, vantage: nothing(desk.compositionId), cite: sources.cite });

    const onDesk = text.match(/\[(\d+)\] Harbour Guild/)?.[1];
    expect(onDesk).toBeDefined();

    const { told: found } = await searchTool(repo, WORLD, sources.cite).run({ query: "Harbour" });

    expect(found).toContain(`[${onDesk}] Harbour Guild`);
    expect(sources.sources().filter((ref) => ref.objectId === guild.objectId)).toHaveLength(1);
  });

  it("reaches material that is nowhere near the current composition", async () => {
    const desk = await repo.openDesk(WORLD);
    const board = await repo.createBoard({
      worldId: WORLD,
      compositionId: asCompositionId(randomUUID()),
      name: "Elsewhere"
    });
    await capture(board.compositionId, "A lighthouse keeper.", "Ossian");

    const { view, workspace } = await reread(desk.compositionId);
    const sources = catalogue();
    buildBrief({ workspace, view, vantage: nothing(desk.compositionId), cite: sources.cite });

    const { told: found } = await searchTool(repo, WORLD, sources.cite).run({ query: "Ossian" });
    expect(found).toContain("Ossian");
  });

  it("says when nothing answers, rather than offering something close", async () => {
    const desk = await repo.openDesk(WORLD);
    const { view, workspace } = await reread(desk.compositionId);
    const sources = catalogue();
    buildBrief({ workspace, view, vantage: nothing(desk.compositionId), cite: sources.cite });

    const { told: found } = await searchTool(repo, WORLD, sources.cite).run({ query: "Ossian" });
    expect(found).toContain("Nothing in this world matches");
  });
});

describe("citations", () => {
  const ref = (label: string): ObjectRef => ({
    objectId: asWorldObjectId(randomUUID()),
    label,
    kind: null
  });

  it("keeps the sources an answer used, in the order it used them", () => {
    const offered = [ref("Mara"), ref("The Quay"), ref("Harbour Guild")];
    const cited = citedSources("She works the wharf [3] and lives on it [1].", offered);

    expect(cited.map((source) => source.n)).toEqual([1, 3]);
    expect(cited.map((source) => source.ref.label)).toEqual(["Mara", "Harbour Guild"]);
  });

  it("counts a source once however often it is cited", () => {
    const offered = [ref("Mara")];
    expect(citedSources("[1] and again [1].", offered)).toHaveLength(1);
  });

  /*
   * The one failure this design can still produce, and it fails closed. A number
   * with nothing behind it is dropped rather than repaired: rendering it as a
   * chip pointing at the wrong thing would be worse than the answer carrying one
   * fewer source than it claims.
   */
  it("drops a number the world does not back", () => {
    const offered = [ref("Mara")];
    expect(citedSources("As recorded [4].", offered)).toEqual([]);
    expect(citedSources("As recorded [0].", offered)).toEqual([]);
  });

  it("finds nothing to cite in an answer that cites nothing", () => {
    expect(citedSources("Nothing in this world says.", [ref("Mara")])).toEqual([]);
  });
});

describe("the conversation", () => {
  it("records a question and its answer as one exchange, in order", async () => {
    const desk = await repo.openDesk(WORLD);
    const mara = await capture(desk.compositionId, "A harbourmaster.", "Mara");

    const written = await repo.recordExchange({
      worldId: WORLD,
      compositionId: desk.compositionId,
      ask: "Who runs the harbour?",
      answer: "Mara does [1].",
      sources: [{ n: 1, ref: cardRef(mara as DeskCard) }]
    });

    expect(written.map((message) => message.speaker)).toEqual(["gm", "librarian"]);

    const history = await repo.librarianHistory(WORLD);
    expect(history.map((message) => message.body)).toEqual([
      "Who runs the harbour?",
      "Mara does [1]."
    ]);
    expect(history[1]?.sources).toEqual([{ n: 1, ref: cardRef(mara as DeskCard) }]);
    expect(history[0]?.compositionId).toBe(desk.compositionId);
  });

  it("keeps the conversation in the order it was said", async () => {
    await repo.openDesk(WORLD);

    for (const n of [1, 2, 3]) {
      await repo.recordExchange({
        worldId: WORLD,
        compositionId: null,
        ask: `question ${n}`,
        answer: `answer ${n}`,
        sources: []
      });
    }

    const history = await repo.librarianHistory(WORLD);
    expect(history.map((message) => message.body)).toEqual([
      "question 1",
      "answer 1",
      "question 2",
      "answer 2",
      "question 3",
      "answer 3"
    ]);
  });

  /* A conversation is world-scoped, and one world may never see another's. */
  it("is scoped to its world", async () => {
    await repo.openDesk(WORLD);
    await repo.recordExchange({
      worldId: WORLD,
      compositionId: null,
      ask: "Who runs the harbour?",
      answer: "Mara does.",
      sources: []
    });

    const other = asWorldId(randomUUID());
    await repo.openDesk(other);
    expect(await repo.librarianHistory(other)).toEqual([]);
  });

  /* The newest window, so a long conversation costs what a short one does. */
  it("returns the most recent exchanges when asked for a window", async () => {
    await repo.openDesk(WORLD);
    for (const n of [1, 2, 3]) {
      await repo.recordExchange({
        worldId: WORLD,
        compositionId: null,
        ask: `question ${n}`,
        answer: `answer ${n}`,
        sources: []
      });
    }

    const history = await repo.librarianHistory(WORLD, 2);
    expect(history.map((message) => message.body)).toEqual(["question 3", "answer 3"]);
  });
});

/**
 * A whole turn, from a vantage to what changed.
 *
 * `runTurn` is where the pieces meet: the grounding is assembled, the tools are
 * offered, the conversation runs, citations resolve, and the exchange is
 * recorded. Everything below drives it with a script instead of a model, which
 * makes the interesting cases reachable — a turn that acts and says nothing, a
 * turn that cites something it created, a turn that reaches for a number it was
 * never given.
 */
describe("a turn, end to end", () => {
  const speak = async (
    compositionId: CompositionId,
    script: Step[],
    ask = "do the thing"
  ) => {
    const provider = new ScriptedLibrarian(script);
    const stream = await runTurn({
      repository: repo,
      provider,
      vantage: nothing(compositionId),
      ask
    });
    if (!stream) throw new Error("no such composition");

    const events: WireEvent[] = [];
    for await (const event of stream) events.push(event);
    return { events, provider };
  };

  it("streams what it did, as it did it, and finishes with what it said", async () => {
    const desk = await repo.openDesk(WORLD);
    const mara = await capture(desk.compositionId, "A rumour", "Mara");

    const { events } = await speak(desk.compositionId, [
      { use: "attend", input: { subjects: [1] } },
      { say: "That is Mara, and she is the one to ask." }
    ]);

    const acted = events.filter((e) => e.type === "acted");
    expect(acted).toHaveLength(1);
    expect(acted[0]).toMatchObject({
      effect: { kind: "attend", cardIds: [mara.cardId] }
    });

    const done = events.at(-1);
    expect(done?.type).toBe("done");
    expect(done).toMatchObject({ body: "That is Mara, and she is the one to ask." });
  });

  it("records a turn that acted but said nothing", async () => {
    const desk = await repo.openDesk(WORLD);
    await capture(desk.compositionId, "A rumour", "Mara");

    const { events } = await speak(
      desk.compositionId,
      [{ use: "capture", input: { text: "The night watch is being paid twice" } }],
      "make me a note about the night watch"
    );

    // A silent turn that changed the world must still leave an account of
    // itself: the transcript is part of every later prompt, and the GM scrolling
    // back should find why their Desk changed.
    expect(events.at(-1)?.type).toBe("done");

    const history = await repo.librarianHistory(WORLD);
    expect(history).toHaveLength(2);
    expect(history[0]!.body).toBe("make me a note about the night watch");
    expect(history[1]!.body).toContain("Written and placed");
  });

  it("fails a turn that neither spoke nor did anything", async () => {
    const desk = await repo.openDesk(WORLD);

    const { events } = await speak(desk.compositionId, [{ say: "   " }]);

    expect(events.at(-1)).toMatchObject({ type: "failed" });
    expect(await repo.librarianHistory(WORLD)).toEqual([]);
  });

  it("keeps a citation that the world backs and drops one it does not", async () => {
    const desk = await repo.openDesk(WORLD);
    await capture(desk.compositionId, "A rumour", "Mara");

    const { events } = await speak(desk.compositionId, [
      { say: "Mara [1] would know, and so would the harbourmaster [7]." }
    ]);

    const done = events.at(-1);
    expect(done?.type).toBe("done");
    if (done?.type !== "done") throw new Error("unreachable");

    // [1] resolves; [7] was never offered and is carried by nothing.
    expect(done.sources.map((s) => s.n)).toEqual([1]);
    expect(done.sources[0]!.ref.label).toBe("Mara");
  });

  it("changes nothing when the model reaches for something it was not shown", async () => {
    const desk = await repo.openDesk(WORLD);
    await capture(desk.compositionId, "A rumour", "Mara");

    const { events, provider } = await speak(desk.compositionId, [
      { use: "clear", input: { subjects: [42] } },
      { say: "I could not find that." }
    ]);

    expect(events.some((e) => e.type === "acted")).toBe(false);
    expect(provider.heard[0]).toContain("[42]");
    expect((await repo.openComposition(desk.compositionId))?.cards).toHaveLength(1);
  });

  it("reports nothing at all for a composition that does not exist", async () => {
    const stream = await runTurn({
      repository: repo,
      provider: new ScriptedLibrarian([{ say: "hello" }]),
      vantage: nothing(asCompositionId(randomUUID())),
      ask: "anything"
    });

    expect(stream).toBeNull();
  });

  /*
   * A turn is one cost even when it is several round trips. The GM asked once,
   * and a Librarian that searched twice before answering did not ask them three
   * questions — so the transcript records one figure and the meter moves once.
   */
  it("sums every round trip of a turn into one recorded cost", async () => {
    const desk = await repo.openDesk(WORLD);
    await capture(desk.compositionId, "A rumour", "Mara");

    const { events } = await speak(desk.compositionId, [
      { spend: { input: 1200, cacheWrite: 400, cacheRead: 0, output: 90 } },
      { use: "attend", input: { subjects: [1] } },
      { spend: { input: 300, cacheWrite: 0, cacheRead: 1600, output: 40 } },
      { say: "That is Mara [1]." }
    ]);

    const done = events.at(-1);
    if (done?.type !== "done") throw new Error("the turn did not finish");
    expect(done.spent).toEqual({ turns: 1, tokens: 3630, usd: expect.any(Number) });

    const history = await repo.librarianHistory(WORLD);
    expect(history[1]!.spend).toEqual({
      provider: "scripted",
      model: SCRIPTED_MODEL,
      input: 1500,
      cacheWrite: 400,
      cacheRead: 1600,
      output: 130
    });
  });

  /* Saying a thing to yourself is free, and the database refuses to say it is not. */
  it("charges the Librarian's half of an exchange and never the GM's", async () => {
    const desk = await repo.openDesk(WORLD);

    await speak(desk.compositionId, [
      { spend: { input: 100, cacheWrite: 0, cacheRead: 0, output: 10 } },
      { say: "Noted." }
    ]);

    const history = await repo.librarianHistory(WORLD);
    expect(history[0]!.spend).toBeNull();
    expect(history[1]!.spend).not.toBeNull();
  });

  /*
   * A provider that reports no usage must not be recorded as a free turn. Null
   * says "not measured"; zero would say "measured, and it cost nothing", and
   * only one of those is true.
   */
  it("records no cost when the provider reported none", async () => {
    const desk = await repo.openDesk(WORLD);

    const { events } = await speak(desk.compositionId, [{ say: "Noted." }]);

    const done = events.at(-1);
    if (done?.type !== "done") throw new Error("the turn did not finish");
    expect(done.spent).toEqual({ turns: 0, tokens: 0, usd: 0 });
    expect((await repo.librarianHistory(WORLD))[1]!.spend).toBeNull();
  });
});

/**
 * What the Librarian costs.
 *
 * Two facts of different kinds live here and the tests keep them apart. Tokens
 * are **measured** — the provider counts them and Relic stores them, grouped by
 * the model that spent them. Money is **estimated** from a rate that may move
 * and that Relic cannot check against the account being billed, so the one
 * thing that must never happen is a confident figure over an unknown rate.
 */
describe("what the Librarian costs", () => {
  const opus = (over: Partial<Spend> = {}): Spend => ({
    provider: "anthropic",
    model: "claude-opus-5",
    input: 0,
    cacheWrite: 0,
    cacheRead: 0,
    output: 0,
    ...over
  });

  it("prices each bucket at its own rate", () => {
    // A million of each, so the reckoning is the rate table read back.
    const priced = reckon({
      turns: 1,
      byModel: [
        opus({ input: 1_000_000, cacheWrite: 1_000_000, cacheRead: 1_000_000, output: 1_000_000 })
      ]
    });

    expect(priced.tokens).toBe(4_000_000);
    expect(priced.usd).toBeCloseTo(5 + 6.25 + 0.5 + 25, 6);
  });

  /*
   * The reason there are four buckets rather than two. A Librarian conversation
   * is mostly cache reads, and pricing them as fresh input would overstate the
   * bill several times over — which is precisely the wrong way to be wrong for
   * somebody who asked for this because they have a hard limit.
   */
  it("does not price a cached token as a fresh one", () => {
    const fresh = reckon({ turns: 1, byModel: [opus({ input: 1_000_000 })] });
    const cached = reckon({ turns: 1, byModel: [opus({ cacheRead: 1_000_000 })] });

    expect(fresh.tokens).toBe(cached.tokens);
    expect(cached.usd!).toBeLessThan(fresh.usd!);
  });

  it("counts tokens for a model it cannot price, and refuses to invent the money", () => {
    const priced = reckon({
      turns: 1,
      byModel: [{ ...opus({ input: 5_000 }), provider: "openai", model: "gpt-5.6-luna" }]
    });

    expect(priced.tokens).toBe(5_000);
    expect(priced.usd).toBeNull();
  });

  /*
   * One unpriceable model poisons the whole figure rather than being skipped.
   * A total that quietly omitted the part it did not recognise would read as a
   * small bill instead of an incomplete one.
   */
  it("gives up on the money entirely when any one model is unknown", () => {
    const priced = reckon({
      turns: 2,
      byModel: [
        opus({ input: 1_000_000 }),
        { ...opus({ input: 1_000 }), provider: "openai", model: "gpt-5.6-luna" }
      ]
    });

    expect(priced.tokens).toBe(1_001_000);
    expect(priced.usd).toBeNull();
  });

  it("sums a turn's round trips and keeps the model that ran them", () => {
    const summed = combine([
      opus({ input: 100, output: 10 }),
      opus({ input: 50, cacheRead: 900, output: 5 })
    ]);

    expect(summed).toEqual(opus({ input: 150, cacheRead: 900, output: 15 }));
    expect(combine([])).toBeNull();
  });

  /* The operator knows their own bill; Relic does not. Their rate wins. */
  it("prefers a declared rate over a published one", () => {
    const before = ratesFor("claude-opus-5");
    process.env.LIBRARIAN_RATES = "1/2/3/4";
    try {
      expect(ratesFor("claude-opus-5")).toEqual({
        input: 1,
        cacheWrite: 2,
        cacheRead: 3,
        output: 4
      });
      // And it reaches the models Relic has no published price for at all.
      expect(ratesFor("gpt-5.6-luna")).not.toBeNull();
    } finally {
      delete process.env.LIBRARIAN_RATES;
    }
    expect(ratesFor("claude-opus-5")).toEqual(before);
  });

  /*
   * A typo in a cost estimate must not be able to stop the Librarian answering,
   * so a malformed rate falls back rather than throwing.
   */
  it("ignores a rate it cannot read", () => {
    for (const bad of ["5/25", "a/b/c/d", "5/6.25/0.5/25/9", "-1/0/0/0", ""]) {
      process.env.LIBRARIAN_RATES = bad;
      expect(ratesFor("gpt-5.6-luna")).toBeNull();
    }
    delete process.env.LIBRARIAN_RATES;
  });

  /*
   * A turn can genuinely cost a tenth of a cent, and rounding that to "$0.00"
   * would tell the GM their conversation is free.
   */
  it("keeps a sub-cent estimate legible", () => {
    expect(sayMoney(0.0004)).toBe("$0.0004");
    expect(sayMoney(0.42)).toBe("$0.42");
    expect(saySize(940)).toBe("940");
    expect(saySize(12_400)).toBe("12.4k");
    expect(saySize(2_500_000)).toBe("2.50M");
  });
});

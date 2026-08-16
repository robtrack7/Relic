// @vitest-environment node
import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { buildBrief, catalogue, searchTool } from "@/lib/librarian/context";
import { citedSources } from "@/lib/librarian/model";
import type { Vantage } from "@/lib/librarian/model";
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
 * The provider is deliberately absent. Nothing worth specifying about a Turn
 * depends on a model existing, and a suite that needed one to run would stop
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
  const card = await repo.captureCard({
    compositionId,
    cardId: asCardId(randomUUID()),
    objectId: asWorldObjectId(randomUUID()),
    body,
    layout: emptyLayoutAt(0, 0)
  });
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
  selectedCardIds: []
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
      selectedCardIds: [mara.cardId, randomUUID()]
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
      value: "harbourmaster"
    });

    const { view, workspace } = await reread(desk.compositionId);
    const { text } = brief(view, workspace, {
      compositionId: desk.compositionId,
      focusCardId: mara.cardId,
      selectedCardIds: []
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
      objectValue: guild.objectId
    });

    const { view, workspace } = await reread(desk.compositionId);
    const { text, sources } = brief(view, workspace, {
      compositionId: desk.compositionId,
      focusCardId: mara.cardId,
      selectedCardIds: []
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

    const found = await searchTool(repo, WORLD, sources.cite).run({ query: "Harbour" });

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

    const found = await searchTool(repo, WORLD, sources.cite).run({ query: "Ossian" });
    expect(found).toContain("Ossian");
  });

  it("says when nothing answers, rather than offering something close", async () => {
    const desk = await repo.openDesk(WORLD);
    const { view, workspace } = await reread(desk.compositionId);
    const sources = catalogue();
    buildBrief({ workspace, view, vantage: nothing(desk.compositionId), cite: sources.cite });

    const found = await searchTool(repo, WORLD, sources.cite).run({ query: "Ossian" });
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

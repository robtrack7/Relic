// @vitest-environment node
import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { catalogue } from "@/lib/librarian/context";
import { handTools, type Hands } from "@/lib/librarian/hands";
import type { Effect, LibrarianTool, ToolOutcome } from "@/lib/librarian/model";
import { closeDb, db } from "@/lib/world/db";
import {
  asCardId,
  asCompositionId,
  asRepresentationId,
  asWorldId,
  asWorldObjectId,
  cardRef,
  emptyLayoutAt,
  type CompositionId,
  type DeskCard
} from "@/lib/world/model";
import { PostgresDeskRepository } from "@/lib/world/postgres-store";
import type { DeskRepository } from "@/lib/world/repository";

import { must } from "./support";

/**
 * The Librarian's hands, specified.
 *
 * Three properties carry this slice, and they are what most of this file is
 * about:
 *
 *   **the address space is the turn's evidence.** Everything a tool acts on is
 *   a citation number resolved against the catalogue Relic built. A number
 *   outside it writes nothing — not because a check rejects it, but because the
 *   model has no way to express an object Relic did not put in front of it;
 *
 *   **nothing here reaches Ink.** Every write is Pencil carrying the
 *   Librarian's name, and `settleTruth` is not among the tools at all;
 *
 *   **compositions still never own truth.** Placing, arranging, and clearing
 *   touch layout; capturing, asserting, and rewriting touch the world; and no
 *   tool does both by accident.
 *
 * The provider is scripted rather than absent here — the tools are the thing
 * under test, and they are run for real, against real Postgres.
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

async function capture(compositionId: CompositionId, body: string, name?: string) {
  const card = must(
    await repo.captureCard({
      compositionId,
      cardId: asCardId(randomUUID()),
      objectId: asWorldObjectId(randomUUID()),
      body,
      layout: emptyLayoutAt(0, 0),
      author: "gm"
    }),
    "capture"
  );
  if (name) {
    await repo.representObject({
      objectId: card.objectId,
      representationId: asRepresentationId(randomUUID()),
      kind: "character",
      label: name
    });
  }
  return card;
}

/**
 * A turn's worth of hands, with everything on the composition already cited —
 * which is what the grounding does for a real turn.
 */
async function handsOn(compositionId: CompositionId) {
  const cat = catalogue();
  const view = await repo.openComposition(compositionId);
  const numbered = new Map<string, number>();
  for (const card of view?.cards ?? []) {
    numbered.set(card.objectId, cat.cite(cardRef(card)));
  }

  const hands: Hands = {
    repository: repo,
    compositionId,
    catalogue: cat,
    here: { x: 0, y: 0 },
    // Not a Prep. The planning tool is absent, which is what these tests are
    // exercising the rest of the surface against.
    session: null
  };

  const tools = handTools(hands);
  const byName = new Map(tools.map((t) => [t.name, t]));

  return {
    catalogue: cat,
    numbered,
    tool: (name: string): LibrarianTool => {
      const found = byName.get(name);
      if (!found) throw new Error(`no tool called ${name}`);
      return found;
    },
    use: async (name: string, input: Record<string, unknown>): Promise<ToolOutcome> => {
      const found = byName.get(name);
      if (!found) throw new Error(`no tool called ${name}`);
      return await found.run(input);
    },
    cards: async () => (await repo.openComposition(compositionId))?.cards ?? [],
    /** Cite something not on this composition, as a search result would. */
    cite: (card: DeskCard) => cat.cite(cardRef(card))
  };
}

const cardsOf = (effect: Effect | undefined): readonly DeskCard[] =>
  effect && effect.kind === "cards" ? effect.cards : [];

describe("the address space is the turn's evidence", () => {
  it("writes nothing for a number it was never given", async () => {
    const desk = await repo.openDesk(WORLD);
    await capture(desk.compositionId, "A rumour", "Mara");
    const hands = await handsOn(desk.compositionId);

    const before = await hands.cards();
    const outcome = await hands.use("place", { subjects: [99] });

    expect(outcome.effect).toBeUndefined();
    expect(outcome.told).toContain("[99]");
    expect(await hands.cards()).toHaveLength(before.length);
  });

  it("refuses a number that is not a number", async () => {
    const desk = await repo.openDesk(WORLD);
    await capture(desk.compositionId, "A rumour", "Mara");
    const hands = await handsOn(desk.compositionId);

    for (const bad of [0, -1, 1.5, "1", null]) {
      const outcome = await hands.use("attend", { subjects: [bad] });
      expect(outcome.effect).toBeUndefined();
    }
  });

  it("cannot reach a card on another composition", async () => {
    const desk = await repo.openDesk(WORLD);
    const board = await repo.createBoard({
      worldId: WORLD,
      compositionId: asCompositionId(randomUUID()),
      name: "Elsewhere"
    });
    const hidden = await capture(board.compositionId, "Kept apart", "The Quay");

    // A turn taken on the Desk numbers only the Desk. The object exists, and
    // the Librarian working here has no number for it.
    const hands = await handsOn(desk.compositionId);
    expect(hands.numbered.has(hidden.objectId)).toBe(false);
    expect(hands.catalogue.resolve(1)).toBeNull();
  });

  it("numbers what it creates, so it can cite and use it in the same turn", async () => {
    const desk = await repo.openDesk(WORLD);
    const hands = await handsOn(desk.compositionId);

    const made = await hands.use("capture", {
      text: "The harbourmaster has been taking bribes",
      name: "The harbourmaster",
      kind: "character"
    });

    const n = Number(/\[(\d+)\]/.exec(made.told)?.[1]);
    expect(n).toBeGreaterThan(0);
    expect(hands.catalogue.resolve(n)).not.toBeNull();

    // And that number is usable straight away.
    const pointed = await hands.use("attend", { subjects: [n] });
    expect(pointed.effect?.kind).toBe("attend");
  });
});

describe("composing changes placement and nothing else", () => {
  it("brings a cited thing onto the composition as a reference", async () => {
    const desk = await repo.openDesk(WORLD);
    const board = await repo.createBoard({
      worldId: WORLD,
      compositionId: asCompositionId(randomUUID()),
      name: "The Coast"
    });
    const guild = await capture(board.compositionId, "Runs the docks", "Harbour Guild");

    const hands = await handsOn(desk.compositionId);
    // As if a search had found it: numbered without being here.
    const n = hands.cite(guild);

    const outcome = await hands.use("place", { subjects: [n] });
    const placed = cardsOf(outcome.effect);

    expect(placed).toHaveLength(1);
    // A reference, not a copy: same identity, new card.
    expect(placed[0]!.objectId).toBe(guild.objectId);
    expect(placed[0]!.cardId).not.toBe(guild.cardId);
    // Still on the board it came from.
    expect((await repo.openComposition(board.compositionId))?.cards).toHaveLength(1);
  });

  it("leaves something already here where it is", async () => {
    const desk = await repo.openDesk(WORLD);
    const mara = await capture(desk.compositionId, "A rumour", "Mara");
    const hands = await handsOn(desk.compositionId);
    const n = hands.numbered.get(mara.objectId)!;

    const outcome = await hands.use("place", { subjects: [n] });

    expect(outcome.told).toContain("already here");
    expect(await hands.cards()).toHaveLength(1);
  });

  it("gathers cards without touching what they say", async () => {
    const desk = await repo.openDesk(WORLD);
    const a = await capture(desk.compositionId, "The lighthouse keeper", "Keeper");
    const b = await capture(desk.compositionId, "The lighthouse itself", "Lighthouse");
    const hands = await handsOn(desk.compositionId);

    const outcome = await hands.use("arrange", {
      subjects: [hands.numbered.get(a.objectId), hands.numbered.get(b.objectId)]
    });
    const moved = cardsOf(outcome.effect);

    expect(moved).toHaveLength(2);
    // The composition changed; world truth did not.
    for (const card of moved) {
      expect(card.bodyVersion).toBe(1);
    }
    const keeper = moved.find((c) => c.objectId === a.objectId);
    expect(keeper?.body).toBe("The lighthouse keeper");
  });

  it("puts one thing beside another without overlapping it", async () => {
    const desk = await repo.openDesk(WORLD);
    const anchor = await capture(desk.compositionId, "Mara", "Mara");
    const other = await capture(desk.compositionId, "The Guild", "Guild");
    const hands = await handsOn(desk.compositionId);

    await hands.use("arrange", {
      subjects: [hands.numbered.get(other.objectId)],
      beside: hands.numbered.get(anchor.objectId)
    });

    const cards = await hands.cards();
    const moved = cards.find((c) => c.objectId === other.objectId)!;
    const fixed = cards.find((c) => c.objectId === anchor.objectId)!;

    expect(moved.layout.x).toBeGreaterThanOrEqual(fixed.layout.x + fixed.layout.width);
  });

  it("refuses to arrange something that is not here", async () => {
    const desk = await repo.openDesk(WORLD);
    const board = await repo.createBoard({
      worldId: WORLD,
      compositionId: asCompositionId(randomUUID()),
      name: "Elsewhere"
    });
    const away = await capture(board.compositionId, "Not here", "Absent");

    const hands = await handsOn(desk.compositionId);
    const outcome = await hands.use("arrange", { subjects: [hands.cite(away)] });

    expect(outcome.effect).toBeUndefined();
    expect(outcome.told).toContain("not on this composition");
  });

  it("clears a card off without destroying the thing", async () => {
    const desk = await repo.openDesk(WORLD);
    const mara = await capture(desk.compositionId, "A rumour", "Mara");
    const hands = await handsOn(desk.compositionId);

    const outcome = await hands.use("clear", {
      subjects: [hands.numbered.get(mara.objectId)]
    });

    expect(outcome.effect?.kind).toBe("gone");
    expect(await hands.cards()).toHaveLength(0);
    // Archived, not deleted — the Library is the way back, and it must have one.
    expect(await repo.objectLifecycle(mara.objectId)).toBe("archived");
    const found = await repo.searchWorld({ worldId: WORLD, query: "Mara", include: "archived" });
    expect(found).toHaveLength(1);
  });

  it("points at things without writing anything", async () => {
    const desk = await repo.openDesk(WORLD);
    const mara = await capture(desk.compositionId, "A rumour", "Mara");
    const hands = await handsOn(desk.compositionId);
    const before = await hands.cards();

    const outcome = await hands.use("attend", {
      subjects: [hands.numbered.get(mara.objectId)]
    });

    expect(outcome.effect).toEqual({ kind: "attend", cardIds: [mara.cardId] });
    expect(await hands.cards()).toEqual(before);
  });
});

describe("everything the Librarian makes is Pencil, and says so", () => {
  it("captures as Pencil, attributed, and never settled", async () => {
    const desk = await repo.openDesk(WORLD);
    const hands = await handsOn(desk.compositionId);

    const outcome = await hands.use("capture", {
      text: "Someone has been paying the night watch",
      name: "The night watch",
      kind: "faction"
    });
    const [made] = cardsOf(outcome.effect);

    expect(made!.maturity).toBe("pencil");
    expect(made!.settled).toBeNull();
    expect(made!.written?.by).toBe("librarian");
    expect(made!.representation?.kind).toBe("faction");
  });

  it("leaves a Fragment when it is not confident what something is", async () => {
    const desk = await repo.openDesk(WORLD);
    const hands = await handsOn(desk.compositionId);

    const outcome = await hands.use("capture", { text: "Something is wrong at the quay" });
    const [made] = cardsOf(outcome.effect);

    // A note that is simply true is real world material. Demanding it be
    // classified first would be structure blocking thought.
    expect(made!.representation).toBeNull();
    expect(made!.maturity).toBe("pencil");
  });

  it("refuses a kind that is not a kind of thing", async () => {
    const desk = await repo.openDesk(WORLD);
    const hands = await handsOn(desk.compositionId);

    const outcome = await hands.use("capture", { text: "A thing", kind: "sandwich" });

    expect(outcome.effect).toBeUndefined();
    expect(await hands.cards()).toHaveLength(0);
  });

  it("deepens without creating a second thing", async () => {
    const desk = await repo.openDesk(WORLD);
    const note = await capture(desk.compositionId, "Runs the docks, takes a cut");
    const hands = await handsOn(desk.compositionId);

    await hands.use("deepen", {
      subject: hands.numbered.get(note.objectId),
      kind: "faction",
      name: "Harbour Guild"
    });

    const cards = await hands.cards();
    expect(cards).toHaveLength(1);
    // The identity invariant, reached by a model.
    expect(cards[0]!.objectId).toBe(note.objectId);
    expect(cards[0]!.body).toBe("Runs the docks, takes a cut");
    expect(cards[0]!.representation?.kind).toBe("faction");
  });

  it("asserts as Pencil, attributed to the Librarian", async () => {
    const desk = await repo.openDesk(WORLD);
    const mara = await capture(desk.compositionId, "A rumour", "Mara");
    const hands = await handsOn(desk.compositionId);

    await hands.use("assert", {
      subject: hands.numbered.get(mara.objectId),
      attribute: "occupation",
      value: "harbourmaster"
    });

    const [card] = await hands.cards();
    const claim = card!.claims.find((c) => c.claimKind === "occupation")!;

    expect(claim.value).toBe("harbourmaster");
    expect(claim.truthState).toBe("pencil");
    expect(claim.provenance.authoredBy).toBe("librarian");
    expect(claim.settled).toBeNull();
  });

  it("links two things and shows the edge at both ends", async () => {
    const desk = await repo.openDesk(WORLD);
    const mara = await capture(desk.compositionId, "A rumour", "Mara");
    const guild = await capture(desk.compositionId, "Runs the docks", "Harbour Guild");
    const hands = await handsOn(desk.compositionId);

    const outcome = await hands.use("assert", {
      subject: hands.numbered.get(mara.objectId),
      attribute: "allegiance",
      value: "the Harbour Guild",
      about: hands.numbered.get(guild.objectId)
    });

    // Both ends change, so both come back — a card showing one side of an edge
    // would be showing half a truth.
    expect(cardsOf(outcome.effect)).toHaveLength(2);

    const cards = await hands.cards();
    const from = cards.find((c) => c.objectId === mara.objectId)!;
    const to = cards.find((c) => c.objectId === guild.objectId)!;
    expect(from.links.some((l) => l.direction === "out")).toBe(true);
    expect(to.links.some((l) => l.direction === "in")).toBe(true);
  });

  it("refuses to relate a thing to itself", async () => {
    const desk = await repo.openDesk(WORLD);
    const mara = await capture(desk.compositionId, "A rumour", "Mara");
    const hands = await handsOn(desk.compositionId);
    const n = hands.numbered.get(mara.objectId);

    const outcome = await hands.use("assert", {
      subject: n,
      attribute: "allegiance",
      value: "herself",
      about: n
    });

    expect(outcome.effect).toBeUndefined();
    const [card] = await hands.cards();
    expect(card!.claims).toHaveLength(0);
  });

  it("has no way to establish Ink at all", async () => {
    const desk = await repo.openDesk(WORLD);
    await capture(desk.compositionId, "A rumour", "Mara");
    const hands = await handsOn(desk.compositionId);
    const names = handTools({
      repository: repo,
      compositionId: desk.compositionId,
      catalogue: catalogue(),
      here: null,
      session: null
    }).map((t) => t.name);

    // Not a rule the model is asked to keep — a capability it does not have.
    expect(names).not.toContain("settle");
    expect(names).not.toContain("establish");
    expect(hands.tool("assert").schema).not.toHaveProperty("properties.truth");
  });
});

describe("rewriting keeps what it replaced", () => {
  it("records the Librarian and the superseded words", async () => {
    const desk = await repo.openDesk(WORLD);
    const mara = await capture(desk.compositionId, "Mara keeps the third bell", "Mara");
    const hands = await handsOn(desk.compositionId);

    const outcome = await hands.use("rewrite", {
      subject: hands.numbered.get(mara.objectId),
      text: "Mara has kept the third bell since the flood"
    });
    const [card] = cardsOf(outcome.effect);

    expect(card!.body).toBe("Mara has kept the third bell since the flood");
    expect(card!.written?.by).toBe("librarian");
    // Relic has no undo, so the one destructive act carries its own reversal.
    expect(card!.written?.superseded).toBe("Mara keeps the third bell");
  });

  it("will not rewrite prose to nothing", async () => {
    const desk = await repo.openDesk(WORLD);
    const mara = await capture(desk.compositionId, "Mara keeps the third bell", "Mara");
    const hands = await handsOn(desk.compositionId);

    const outcome = await hands.use("rewrite", {
      subject: hands.numbered.get(mara.objectId),
      text: "   "
    });

    expect(outcome.effect).toBeUndefined();
    const [card] = await hands.cards();
    expect(card!.body).toBe("Mara keeps the third bell");
  });
});

describe("what a tool declares about itself", () => {
  it("marks the read as a read and the hands as writes", async () => {
    const desk = await repo.openDesk(WORLD);
    const hands = await handsOn(desk.compositionId);

    for (const name of ["place", "arrange", "clear", "capture", "deepen", "assert", "rewrite"]) {
      expect(hands.tool(name).writes).toBe(true);
    }
  });

  it("takes no coordinate anywhere in its surface", async () => {
    const desk = await repo.openDesk(WORLD);
    const hands = await handsOn(desk.compositionId);

    // The Librarian emits semantic intents; deterministic code turns them into
    // geometry. A tool taking an x would be a tool that could put a card three
    // screens away.
    for (const name of ["place", "arrange", "clear", "attend", "capture", "deepen", "assert", "rewrite"]) {
      const json = JSON.stringify(hands.tool(name).schema);
      expect(json).not.toMatch(/"(x|y|width|height|left|top)"/);
    }
  });
});

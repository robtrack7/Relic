// @vitest-environment node
import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { catalogue } from "@/lib/librarian/context";
import { handTools, type Hands } from "@/lib/librarian/hands";
import { closeDb, db } from "@/lib/world/db";
import {
  asBeatId,
  asCardId,
  asCompositionId,
  asRepresentationId,
  asSessionId,
  asWorldId,
  asWorldObjectId,
  cardRef,
  emptyLayoutAt,
  type CompositionId,
  type Prep,
  type WorldId,
  type WorldObjectId
} from "@/lib/world/model";
import { PostgresDeskRepository } from "@/lib/world/postgres-store";
import type { DeskRepository } from "@/lib/world/repository";

import { must } from "./support";

/**
 * Step 14's specification, executable.
 *
 * Two things carry this slice and everything below is one of them.
 *
 *   **Prep is a composition of the same world.** Not a copy of it, not a
 *   container, and not a mode: the same identities, referenced, edited through
 *   either end, with a running order beside them. If a beat could ever change
 *   what an object is or what is true about it, the invariant that compositions
 *   never own truth would have been broken by the surface that was supposed to
 *   demonstrate it.
 *
 *   **A beat is an intention, not a record.** It carries no truth state, has no
 *   route into `claims`, and asserting nothing is not an omission — planning to
 *   do something is not saying it happened. Turning a beat into world history is
 *   Review's act, deliberately, once there is a session that actually occurred.
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

async function prepare(title = "Session 4"): Promise<Prep> {
  await repo.openDesk(WORLD);
  return must(
    await repo.createSession({
      worldId: WORLD,
      sessionId: asSessionId(randomUUID()),
      compositionId: asCompositionId(randomUUID()),
      title
    }),
    "createSession"
  );
}

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
    must(
      await repo.representObject({
        objectId: card.objectId,
        representationId: asRepresentationId(randomUUID()),
        kind: "character",
        label: name
      }),
      "represent"
    );
  }
  return card;
}

const beat = (prep: Prep, body: string, refs: readonly WorldObjectId[] = []) =>
  repo.setBeat({
    sessionId: prep.session.id,
    beatId: asBeatId(randomUUID()),
    body,
    refs,
    author: "gm"
  });

describe("a session and the composition it is prepared on", () => {
  it("creates both together, and the Prep is an ordinary composition of the world", async () => {
    const prep = await prepare("The Drowned Coast");

    expect(prep.session.title).toBe("The Drowned Coast");
    expect(prep.session.state).toBe("planned");
    expect(prep.session.intent).toBeNull();
    expect(prep.beats).toEqual([]);

    const view = await repo.openComposition(prep.session.compositionId);
    expect(view?.kind).toBe("prep");
    expect(view?.worldId).toBe(WORLD);
    // It renders through the same surface as the Desk because it is the same
    // kind of thing: references plus layout over shared world material.
    expect(view?.cards).toEqual([]);
  });

  it("lists sessions beside the compositions, not among them", async () => {
    const prep = await prepare("Session 4");
    const workspace = await repo.openWorld(WORLD);

    expect(workspace.sessions).toHaveLength(1);
    expect(workspace.sessions[0]?.sessionId).toBe(prep.session.id);
    expect(workspace.sessions[0]?.compositionId).toBe(prep.session.compositionId);
    expect(workspace.sessions[0]?.beatCount).toBe(0);

    // The Prep is still a composition — that is the whole point — so it appears
    // in both places, once as a place and once as an evening.
    expect(
      workspace.compositions.some((c) => c.compositionId === prep.session.compositionId)
    ).toBe(true);
  });

  it("is null for anything that is not a Prep", async () => {
    const desk = await repo.openDesk(WORLD);
    const board = await repo.createBoard({
      worldId: WORLD,
      compositionId: asCompositionId(randomUUID()),
      name: "The Quay"
    });

    expect(await repo.openPrep(desk.compositionId)).toBeNull();
    expect(await repo.openPrep(board.compositionId)).toBeNull();
    expect(await repo.openPrep(asCompositionId(randomUUID()))).toBeNull();
  });

  it("renames the composition when the session is renamed", async () => {
    const prep = await prepare("Untitled session");

    const renamed = must(
      await repo.editSession({
        sessionId: prep.session.id,
        title: "The night of the fire",
        intent: "Get them to the Quay before the Guild moves.",
        observedVersion: prep.session.version
      }),
      "editSession"
    );

    expect(renamed.title).toBe("The night of the fire");
    expect(renamed.intent).toBe("Get them to the Quay before the Guild moves.");

    const view = await repo.openComposition(prep.session.compositionId);
    expect(view?.name).toBe("The night of the fire");
  });

  it("refuses an edit made against a version that has moved", async () => {
    const prep = await prepare();
    must(
      await repo.editSession({
        sessionId: prep.session.id,
        title: "First",
        intent: null,
        observedVersion: prep.session.version
      }),
      "first edit"
    );

    const stale = await repo.editSession({
      sessionId: prep.session.id,
      title: "Second",
      intent: null,
      observedVersion: prep.session.version
    });

    expect(stale.state).toBe("refused");
  });
});

describe("Prep is the same world, not a copy of it", () => {
  it("references an identity rather than duplicating it, and one edit reaches both", async () => {
    const desk = await repo.openDesk(WORLD);
    const prep = await prepare();
    const card = await capture(desk.compositionId, "Mara keeps the third bell", "Mara");

    const [onPrep] = must(
      await repo.referenceObjects({
        compositionId: prep.session.compositionId,
        placements: [
          { cardId: asCardId(randomUUID()), objectId: card.objectId, layout: emptyLayoutAt(0, 0) }
        ]
      }),
      "reference onto the Prep"
    );

    expect(onPrep?.objectId).toBe(card.objectId);
    expect(onPrep?.cardId).not.toBe(card.cardId);

    must(
      await repo.editCardBody({
        compositionId: prep.session.compositionId,
        cardId: onPrep!.cardId,
        body: "Mara has not kept the third bell since the fire",
        observedBodyVersion: onPrep!.bodyVersion,
        author: "gm"
      }),
      "edit through the Prep"
    );

    const deskAfter = await repo.openComposition(desk.compositionId);
    expect(deskAfter?.cards[0]?.body).toBe(
      "Mara has not kept the third bell since the fire"
    );
  });
});

describe("a beat is an intention, never a record", () => {
  it("changes nothing about the world material it names", async () => {
    const desk = await repo.openDesk(WORLD);
    const prep = await prepare();
    const card = await capture(desk.compositionId, "The Harbour Guild", "Harbour Guild");

    const before = (await repo.openComposition(desk.compositionId))?.cards[0];

    must(await beat(prep, "The Guild moves on the Quay", [card.objectId]), "beat");

    const after = (await repo.openComposition(desk.compositionId))?.cards[0];

    // Nothing has been asserted, nothing has been settled, and nothing about
    // the object has moved. Planning to do something is not saying it happened.
    expect(after?.claims).toEqual([]);
    expect(after?.links).toEqual([]);
    expect(after?.maturity).toBe(before?.maturity);
    expect(after?.settled).toBeNull();
    expect(after?.bodyVersion).toBe(before?.bodyVersion);
    expect(after?.cardVersion).toBe(before?.cardVersion);
  });

  it("may name something that is not on the Prep at all", async () => {
    const desk = await repo.openDesk(WORLD);
    const prep = await prepare();
    const card = await capture(desk.compositionId, "The Cathedral", "The Cathedral");

    const written = must(await beat(prep, "They reach the Cathedral", [card.objectId]), "beat");

    expect(written.refs.map((ref) => ref.objectId)).toEqual([card.objectId]);

    // The running order belongs to the evening, not to the composition. A beat
    // that could only name what happens to have a card would make the plan a
    // property of the layout.
    const view = await repo.openComposition(prep.session.compositionId);
    expect(view?.cards).toEqual([]);
  });

  it("reads the name the world uses now, not the one it was written with", async () => {
    const desk = await repo.openDesk(WORLD);
    const prep = await prepare();
    const card = await capture(desk.compositionId, "A guild", "Harbour Guild");

    must(await beat(prep, "The Guild moves", [card.objectId]), "beat");

    const representation = (await repo.openComposition(desk.compositionId))?.cards[0]
      ?.representation;
    must(
      await repo.editRepresentation({
        representationId: representation!.id,
        label: "The Quay Wardens",
        fields: {},
        observedVersion: representation!.version
      }),
      "rename"
    );

    const after = await repo.openPrep(prep.session.compositionId);
    expect(after?.beats[0]?.refs[0]?.label).toBe("The Quay Wardens");
  });

  it("keeps its references when the material is cleared off every composition", async () => {
    const desk = await repo.openDesk(WORLD);
    const prep = await prepare();
    const card = await capture(desk.compositionId, "A rumour about the bell");

    must(await beat(prep, "Somebody repeats the rumour", [card.objectId]), "beat");
    must(
      await repo.removeCards({ compositionId: desk.compositionId, cardIds: [card.cardId] }),
      "clear the Desk"
    );

    // Archived, not destroyed — and the GM's own plan for tonight does not lose
    // what it was about because they tidied last week.
    expect(await repo.objectLifecycle(card.objectId)).toBe("archived");
    const after = await repo.openPrep(prep.session.compositionId);
    expect(after?.beats[0]?.refs).toHaveLength(1);
  });

  it("refuses material from another world", async () => {
    const prep = await prepare();

    const elsewhere = asWorldId(randomUUID()) as WorldId;
    const otherDesk = await repo.openDesk(elsewhere);
    const stranger = await capture(otherDesk.compositionId, "Someone else's harbour");

    expect((await beat(prep, "They arrive", [stranger.objectId])).state).toBe("missing");
  });
});

describe("the running order", () => {
  it("appends in the order written, and replaces references wholesale", async () => {
    const desk = await repo.openDesk(WORLD);
    const prep = await prepare();
    const mara = await capture(desk.compositionId, "Mara", "Mara");
    const guild = await capture(desk.compositionId, "The Guild", "Guild");

    const first = must(await beat(prep, "Open at the quay", [mara.objectId]), "first");
    must(await beat(prep, "The Guild arrives"), "second");

    expect(first.position).toBe(1);

    const swapped = must(
      await repo.setBeat({
        sessionId: prep.session.id,
        beatId: first.id,
        body: "Open at the quay, at dusk",
        refs: [guild.objectId],
        author: "gm"
      }),
      "reword"
    );

    // One judgment, replaced whole. Merging would make removing the last
    // reference impossible to express.
    expect(swapped.body).toBe("Open at the quay, at dusk");
    expect(swapped.refs.map((ref) => ref.objectId)).toEqual([guild.objectId]);
    expect(swapped.position).toBe(1);
  });

  it("reorders as one intent, and refuses a list that is not this session's", async () => {
    const prep = await prepare();
    const one = must(await beat(prep, "One"), "one");
    const two = must(await beat(prep, "Two"), "two");
    const three = must(await beat(prep, "Three"), "three");

    const reordered = must(
      await repo.reorderBeats({
        sessionId: prep.session.id,
        beatIds: [three.id, one.id, two.id]
      }),
      "reorder"
    );

    expect(reordered.map((b) => b.body)).toEqual(["Three", "One", "Two"]);
    expect(reordered.map((b) => b.position)).toEqual([1, 2, 3]);

    // A partial order would be a caller asking Relic to decide where the rest
    // of the evening went.
    const partial = await repo.reorderBeats({
      sessionId: prep.session.id,
      beatIds: [one.id, two.id]
    });
    expect(partial.state).toBe("refused");

    const stranger = await repo.reorderBeats({
      sessionId: prep.session.id,
      beatIds: [one.id, two.id, asBeatId(randomUUID())]
    });
    expect(stranger.state).toBe("refused");
  });

  it("archives a removed beat and takes it out of the order", async () => {
    const prep = await prepare();
    const one = must(await beat(prep, "One"), "one");
    must(await beat(prep, "Two"), "two");

    must(await repo.removeBeat({ beatId: one.id }), "remove");

    const after = await repo.openPrep(prep.session.compositionId);
    expect(after?.beats.map((b) => b.body)).toEqual(["Two"]);

    // Gone from the order, and not writable again through the same id.
    expect(
      (
        await repo.setBeat({
          sessionId: prep.session.id,
          beatId: one.id,
          body: "One, revived",
          refs: [],
          author: "gm"
        })
      ).state
    ).toBe("missing");
  });

  it("will not let one session write another's beats", async () => {
    const mine = await prepare("Mine");
    const yours = await prepare("Yours");
    const theirs = must(await beat(yours, "Yours alone"), "beat");

    const stolen = await repo.setBeat({
      sessionId: mine.session.id,
      beatId: theirs.id,
      body: "Mine now",
      refs: [],
      author: "gm"
    });

    expect(stolen.state).toBe("missing");
    const still = await repo.openPrep(yours.session.compositionId);
    expect(still?.beats[0]?.body).toBe("Yours alone");
  });
});

describe("what the Librarian may do to an evening", () => {
  async function tools(compositionId: CompositionId) {
    const cat = catalogue();
    const view = await repo.openComposition(compositionId);
    const numbered = new Map<string, number>();
    for (const card of view?.cards ?? []) {
      numbered.set(card.objectId, cat.cite(cardRef(card)));
    }
    const prep = await repo.openPrep(compositionId);

    const hands: Hands = {
      repository: repo,
      compositionId,
      catalogue: cat,
      here: { x: 0, y: 0 },
      session: prep?.session ?? null
    };

    const byName = new Map(handTools(hands).map((tool) => [tool.name, tool]));
    return { numbered, byName };
  }

  it("has no planning tool anywhere but a Prep", async () => {
    const desk = await repo.openDesk(WORLD);
    const { byName } = await tools(desk.compositionId);

    // Absence rather than refusal — the same argument that keeps `settleTruth`
    // out of the tool surface entirely.
    expect(byName.has("plan")).toBe(false);
  });

  it("adds a beat marked as its own, and can only add", async () => {
    const prep = await prepare();
    await capture(prep.session.compositionId, "The Harbour Guild", "Harbour Guild");
    const { numbered, byName } = await tools(prep.session.compositionId);

    const guild = [...numbered.values()][0];
    const outcome = await byName.get("plan")!.run({
      beat: "The Guild calls in the debt",
      about: [guild]
    });

    expect(outcome.effect?.kind).toBe("beats");

    const after = await repo.openPrep(prep.session.compositionId);
    expect(after?.beats).toHaveLength(1);
    expect(after?.beats[0]?.body).toBe("The Guild calls in the debt");
    // Marked, so a GM can tell their own plan from a suggestion.
    expect(after?.beats[0]?.author).toBe("librarian");
    expect(after?.beats[0]?.refs).toHaveLength(1);

    // Reordering the evening and taking something out of it are the GM's
    // judgment about their own table.
    expect(byName.has("reorder")).toBe(false);
    expect(byName.has("unplan")).toBe(false);
  });

  it("cannot plan about something it was not shown", async () => {
    const prep = await prepare();
    const { byName } = await tools(prep.session.compositionId);

    const outcome = await byName.get("plan")!.run({ beat: "Something happens", about: [7] });

    expect(outcome.effect).toBeUndefined();
    expect(outcome.told).toContain("[7]");
    expect((await repo.openPrep(prep.session.compositionId))?.beats).toEqual([]);
  });
});

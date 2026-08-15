// @vitest-environment node
import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";

import {
  asCardId,
  asCompositionId,
  asWorldId,
  asWorldObjectId,
  emptyLayoutAt
} from "@/lib/world/model";
import { SqliteDeskRepository } from "@/lib/world/sqlite-store";

const WORLD = asWorldId("00000000-0000-4000-8000-0000000000aa");

let repo: SqliteDeskRepository;

beforeEach(() => {
  repo = SqliteDeskRepository.open(":memory:");
});

async function deskWithCard(body = "A rumour about the harbour", x = 40, y = 90) {
  const desk = await repo.openDesk(WORLD);
  const card = await repo.captureCard({
    compositionId: desk.compositionId,
    cardId: asCardId(randomUUID()),
    objectId: asWorldObjectId(randomUUID()),
    body,
    layout: emptyLayoutAt(x, y)
  });
  return { desk, card };
}

describe("opening a desk", () => {
  it("creates the world's desk composition once and reuses it", async () => {
    const first = await repo.openDesk(WORLD);
    const second = await repo.openDesk(WORLD);
    expect(second.compositionId).toBe(first.compositionId);
    expect(second.cards).toEqual([]);
  });
});

describe("capture", () => {
  it("creates one object with a Fragment body and one card placing it", async () => {
    const { desk, card } = await deskWithCard("Ash falls on the quay");

    expect(card.body).toBe("Ash falls on the quay");
    expect(card.layout).toMatchObject({ x: 40, y: 90 });

    const reopened = await repo.openDesk(WORLD);
    expect(reopened.compositionId).toBe(desk.compositionId);
    expect(reopened.cards).toHaveLength(1);
    expect(reopened.cards[0]?.cardId).toBe(card.cardId);
    expect(reopened.cards[0]?.objectId).toBe(card.objectId);
  });

  it("captures Pencil, never Ink", async () => {
    const { card } = await deskWithCard();
    expect(card.truthState).toBe("pencil");
  });

  it("stacks each new card above the last", async () => {
    const desk = await repo.openDesk(WORLD);
    const place = (n: number) =>
      repo.captureCard({
        compositionId: desk.compositionId,
        cardId: asCardId(randomUUID()),
        objectId: asWorldObjectId(randomUUID()),
        body: `card ${n}`,
        layout: emptyLayoutAt(n * 10, 0)
      });
    const a = await place(1);
    const b = await place(2);
    expect(b.z).toBeGreaterThan(a.z);
  });
});

describe("the composition never owns world truth", () => {
  it("moving a card leaves the body and its version untouched", async () => {
    const { desk, card } = await deskWithCard("The harbour master lies");

    const moved = await repo.moveCards({
      compositionId: desk.compositionId,
      bringToFront: true,
      moves: [{ cardId: card.cardId, x: 900, y: -300, observedCardVersion: card.cardVersion }]
    });

    expect(moved.state).toBe("ok");
    const after = (await repo.openDesk(WORLD)).cards[0];
    expect(after?.layout).toMatchObject({ x: 900, y: -300 });
    expect(after?.body).toBe("The harbour master lies");
    expect(after?.bodyVersion).toBe(card.bodyVersion);
    expect(after?.cardVersion).toBe(card.cardVersion + 1);
  });

  it("editing the body leaves placement and its version untouched", async () => {
    const { desk, card } = await deskWithCard("first thought");

    const edited = await repo.editCardBody({
      compositionId: desk.compositionId,
      cardId: card.cardId,
      body: "second thought",
      observedBodyVersion: card.bodyVersion
    });

    expect(edited.state).toBe("ok");
    const after = (await repo.openDesk(WORLD)).cards[0];
    expect(after?.body).toBe("second thought");
    expect(after?.bodyVersion).toBe(card.bodyVersion + 1);
    expect(after?.layout).toEqual(card.layout);
    expect(after?.cardVersion).toBe(card.cardVersion);
  });
});

describe("one intent, one change set", () => {
  it("refuses a whole multi-card move when any card is stale", async () => {
    const desk = await repo.openDesk(WORLD);
    const place = (x: number) =>
      repo.captureCard({
        compositionId: desk.compositionId,
        cardId: asCardId(randomUUID()),
        objectId: asWorldObjectId(randomUUID()),
        body: "",
        layout: emptyLayoutAt(x, 0)
      });
    const a = await place(0);
    const b = await place(400);

    // Something else moved `b` in between.
    await repo.moveCards({
      compositionId: desk.compositionId,
      bringToFront: false,
      moves: [{ cardId: b.cardId, x: 111, y: 222, observedCardVersion: b.cardVersion }]
    });

    const result = await repo.moveCards({
      compositionId: desk.compositionId,
      bringToFront: true,
      moves: [
        { cardId: a.cardId, x: 10, y: 10, observedCardVersion: a.cardVersion },
        { cardId: b.cardId, x: 20, y: 20, observedCardVersion: b.cardVersion }
      ]
    });

    expect(result.state).toBe("conflict");

    // The fresh card must not have moved either — the gesture landed whole or not at all.
    const cards = (await repo.openDesk(WORLD)).cards;
    const freshA = cards.find((card) => card.cardId === a.cardId);
    const freshB = cards.find((card) => card.cardId === b.cardId);
    expect(freshA?.layout).toMatchObject({ x: 0, y: 0 });
    expect(freshB?.layout).toMatchObject({ x: 111, y: 222 });
  });

  it("reports a stale body edit instead of overwriting it", async () => {
    const { desk, card } = await deskWithCard("original");

    await repo.editCardBody({
      compositionId: desk.compositionId,
      cardId: card.cardId,
      body: "written elsewhere",
      observedBodyVersion: card.bodyVersion
    });

    const stale = await repo.editCardBody({
      compositionId: desk.compositionId,
      cardId: card.cardId,
      body: "written here",
      observedBodyVersion: card.bodyVersion
    });

    expect(stale.state).toBe("conflict");
    expect((await repo.openDesk(WORLD)).cards[0]?.body).toBe("written elsewhere");
  });

  it("reports a conflict with the whole composition, not just the card that clashed", async () => {
    const { desk, card } = await deskWithCard("original");
    const bystander = await repo.captureCard({
      compositionId: desk.compositionId,
      cardId: asCardId(randomUUID()),
      objectId: asWorldObjectId(randomUUID()),
      body: "untouched by any of this",
      layout: emptyLayoutAt(600, 600)
    });

    await repo.editCardBody({
      compositionId: desk.compositionId,
      cardId: card.cardId,
      body: "written elsewhere",
      observedBodyVersion: card.bodyVersion
    });
    const stale = await repo.editCardBody({
      compositionId: desk.compositionId,
      cardId: card.cardId,
      body: "written here",
      observedBodyVersion: card.bodyVersion
    });

    // A caller reconciles by replacing what it holds. A partial list here would
    // read as "the Desk now contains only this" and drop the bystander.
    expect(stale.state).toBe("conflict");
    if (stale.state !== "conflict") return;
    expect(stale.current.map((c) => c.cardId).sort()).toEqual(
      [card.cardId, bystander.cardId].sort()
    );
  });

  it("reports a write against a card that is not on this composition", async () => {
    const desk = await repo.openDesk(WORLD);
    const result = await repo.editCardBody({
      compositionId: desk.compositionId,
      cardId: asCardId(randomUUID()),
      body: "nowhere",
      observedBodyVersion: 1
    });
    expect(result.state).toBe("missing");
  });
});

describe("boards are compositions of the same world", () => {
  async function deskAndBoard() {
    const desk = await repo.openDesk(WORLD);
    const board = await repo.createBoard({
      worldId: WORLD,
      compositionId: asCompositionId(randomUUID()),
      name: "The Drowned Coast"
    });
    return { desk, board };
  }

  it("lists the desk and every board of the world", async () => {
    const { board } = await deskAndBoard();
    const workspace = await repo.openWorld(WORLD);

    expect(workspace.compositions.map((c) => c.kind)).toEqual(["desk", "board"]);
    expect(workspace.compositions[1]?.compositionId).toBe(board.compositionId);
  });

  it("reopens a board with only what was put on it", async () => {
    const { desk, board } = await deskAndBoard();
    const card = await repo.captureCard({
      compositionId: desk.compositionId,
      cardId: asCardId(randomUUID()),
      objectId: asWorldObjectId(randomUUID()),
      body: "The bells vanished during the storm",
      layout: emptyLayoutAt(0, 0)
    });

    const reopened = await repo.openComposition(board.compositionId);
    expect(reopened?.kind).toBe("board");
    expect(reopened?.name).toBe("The Drowned Coast");
    expect(reopened?.cards).toEqual([]);

    // ...and the object it does not hold is still on the Desk.
    expect((await repo.openDesk(WORLD)).cards[0]?.cardId).toBe(card.cardId);
  });

  it("references one object from two compositions without copying it", async () => {
    const { desk, board } = await deskAndBoard();
    const onDesk = await repo.captureCard({
      compositionId: desk.compositionId,
      cardId: asCardId(randomUUID()),
      objectId: asWorldObjectId(randomUUID()),
      body: "The harbour master lies",
      layout: emptyLayoutAt(10, 20)
    });

    const placed = await repo.referenceObjects({
      compositionId: board.compositionId,
      placements: [
        { cardId: asCardId(randomUUID()), objectId: onDesk.objectId, layout: emptyLayoutAt(10, 20) }
      ]
    });
    expect(placed.state).toBe("ok");
    if (placed.state !== "ok") return;

    const onBoard = placed.data[0];
    expect(onBoard?.objectId).toBe(onDesk.objectId);
    expect(onBoard?.cardId).not.toBe(onDesk.cardId);

    // Editing through the board is editing the one Fragment.
    await repo.editCardBody({
      compositionId: board.compositionId,
      cardId: onBoard!.cardId,
      body: "The harbour master is bought",
      observedBodyVersion: onBoard!.bodyVersion
    });
    expect((await repo.openDesk(WORLD)).cards[0]?.body).toBe("The harbour master is bought");

    // Moving on the board moves nothing on the desk.
    await repo.moveCards({
      compositionId: board.compositionId,
      bringToFront: true,
      moves: [
        { cardId: onBoard!.cardId, x: 900, y: 900, observedCardVersion: onBoard!.cardVersion }
      ]
    });
    expect((await repo.openDesk(WORLD)).cards[0]?.layout).toMatchObject({ x: 10, y: 20 });
    expect(
      (await repo.openComposition(board.compositionId))?.cards[0]?.layout
    ).toMatchObject({ x: 900, y: 900 });
  });

  it("referencing the same object twice returns the card that is already there", async () => {
    const { desk, board } = await deskAndBoard();
    const onDesk = await repo.captureCard({
      compositionId: desk.compositionId,
      cardId: asCardId(randomUUID()),
      objectId: asWorldObjectId(randomUUID()),
      body: "",
      layout: emptyLayoutAt(0, 0)
    });

    const place = () =>
      repo.referenceObjects({
        compositionId: board.compositionId,
        placements: [
          { cardId: asCardId(randomUUID()), objectId: onDesk.objectId, layout: emptyLayoutAt(0, 0) }
        ]
      });

    const first = await place();
    const second = await place();
    expect(second.state).toBe("ok");
    if (first.state !== "ok" || second.state !== "ok") return;
    expect(second.data[0]?.cardId).toBe(first.data[0]?.cardId);
    expect((await repo.openComposition(board.compositionId))?.cards).toHaveLength(1);
  });

  it("refuses to reference an object from another world", async () => {
    const { board } = await deskAndBoard();
    const other = asWorldId("00000000-0000-4000-8000-0000000000ff");
    const elsewhere = await repo.openDesk(other);
    const stranger = await repo.captureCard({
      compositionId: elsewhere.compositionId,
      cardId: asCardId(randomUUID()),
      objectId: asWorldObjectId(randomUUID()),
      body: "belongs to another world",
      layout: emptyLayoutAt(0, 0)
    });

    const result = await repo.referenceObjects({
      compositionId: board.compositionId,
      placements: [
        { cardId: asCardId(randomUUID()), objectId: stranger.objectId, layout: emptyLayoutAt(0, 0) }
      ]
    });

    expect(result.state).toBe("missing");
    expect((await repo.openComposition(board.compositionId))?.cards).toEqual([]);
  });

  it("keeps the object alive while any composition still references it", async () => {
    const { desk, board } = await deskAndBoard();
    const onDesk = await repo.captureCard({
      compositionId: desk.compositionId,
      cardId: asCardId(randomUUID()),
      objectId: asWorldObjectId(randomUUID()),
      body: "still wanted",
      layout: emptyLayoutAt(0, 0)
    });
    await repo.referenceObjects({
      compositionId: board.compositionId,
      placements: [
        { cardId: asCardId(randomUUID()), objectId: onDesk.objectId, layout: emptyLayoutAt(0, 0) }
      ]
    });

    await repo.removeCards({ compositionId: desk.compositionId, cardIds: [onDesk.cardId] });

    expect(repo.objectLifecycle(onDesk.objectId)).toBe("active");
    expect((await repo.openComposition(board.compositionId))?.cards[0]?.body).toBe("still wanted");
  });
});

describe("removal", () => {
  it("takes the card off the desk and archives the object it was the last reference to", async () => {
    const { desk, card } = await deskWithCard();

    const removed = await repo.removeCards({
      compositionId: desk.compositionId,
      cardIds: [card.cardId]
    });

    expect(removed.state).toBe("ok");
    expect((await repo.openDesk(WORLD)).cards).toEqual([]);

    // Archived, not destroyed: the identity survives losing its last card.
    expect(repo.objectLifecycle(card.objectId)).toBe("archived");
  });

  it("ignores cards that are already gone rather than failing the gesture", async () => {
    const { desk, card } = await deskWithCard();
    await repo.removeCards({ compositionId: desk.compositionId, cardIds: [card.cardId] });
    const again = await repo.removeCards({
      compositionId: desk.compositionId,
      cardIds: [card.cardId, asCardId(randomUUID())]
    });
    expect(again.state).toBe("ok");
  });
});

// @vitest-environment node
import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import {
  asCardId,
  asCompositionId,
  asRepresentationId,
  asWorldId,
  asWorldObjectId,
  emptyLayoutAt,
  type CompositionId,
  type DeskCard,
  type WorldObjectId
} from "@/lib/world/model";
import { closeDb, db } from "@/lib/world/db";
import { PostgresDeskRepository } from "@/lib/world/postgres-store";
import type { DeskRepository } from "@/lib/world/repository";
import { must } from "./support";

/**
 * The world's index.
 *
 * `searchWorld` is the one read that reaches past a composition, and everything
 * that finds material by identity rather than by placement goes through it — the
 * Library, global search, and the relationship picker alike. What is specified
 * here is that it ranks rather than merely matches, that its filters mean what
 * they say, and that archived material stays reachable: an object cleared off
 * the Desk is out of the way, not gone, and this is the only route back to it.
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
      kind: "character",
      label: name
    });
  }
  return card;
}

const cardFor = (cards: readonly DeskCard[], objectId: WorldObjectId) =>
  cards.find((card) => card.objectId === objectId)!;

describe("searchWorld ranks results and filters material", () => {
  it("an exact name outranks a mention in prose", async () => {
    const desk = await repo.openDesk(WORLD);
    const mara = await capture(desk.compositionId, "harbour master", "Mara");
    const other = await capture(desk.compositionId, "Mara used to work here");

    const results = await repo.searchWorld({ worldId: WORLD, query: "Mara" });

    expect(results).toHaveLength(2);
    expect(results[0]?.ref.objectId).toBe(mara.objectId);
    expect(results[0]?.ref.label).toBe("Mara");
    expect(results[1]?.ref.objectId).toBe(other.objectId);
  });

  it("a name prefix outranks a name that merely contains it", async () => {
    const desk = await repo.openDesk(WORLD);
    const guild = await capture(desk.compositionId, "the cartel", "Harbour Guild");
    const watch = await capture(desk.compositionId, "the night guard", "The Sunken Harbour");

    const results = await repo.searchWorld({ worldId: WORLD, query: "harbour" });

    expect(results).toHaveLength(2);
    expect(results[0]?.ref.label).toBe("Harbour Guild");
    expect(results[1]?.ref.label).toBe("The Sunken Harbour");
  });

  it("unclassified material is findable with null kind and empty kinds array", async () => {
    const desk = await repo.openDesk(WORLD);
    const unclassified = await capture(desk.compositionId, "something about the lamplighters");

    const results = await repo.searchWorld({ worldId: WORLD, query: "lamplighter" });

    expect(results).toHaveLength(1);
    expect(results[0]?.ref.kind).toBeNull();
    expect(results[0]?.kinds).toEqual([]);
  });

  it("every representation's label is searchable, not only the first", async () => {
    const desk = await repo.openDesk(WORLD);
    const card = await capture(desk.compositionId, "runs the waterfront", "The Quay");

    await repo.representObject({
      objectId: card.objectId,
      representationId: asRepresentationId(randomUUID()),
      kind: "faction",
      label: "Quay Wardens"
    });

    const resultsByWardens = await repo.searchWorld({ worldId: WORLD, query: "wardens" });
    expect(resultsByWardens).toHaveLength(1);
    expect(resultsByWardens[0]?.ref.objectId).toBe(card.objectId);
    expect(resultsByWardens[0]?.kinds).toContain("character");
    expect(resultsByWardens[0]?.kinds).toContain("faction");
  });

  it("an empty query is a browse, ordered by name", async () => {
    const desk = await repo.openDesk(WORLD);
    const charlie = await capture(desk.compositionId, "fighter", "Charlie");
    const alice = await capture(desk.compositionId, "scholar", "Alice");
    const bob = await capture(desk.compositionId, "rogue", "Bob");
    const unnamed = await capture(desk.compositionId, "just some thoughts");

    const results = await repo.searchWorld({ worldId: WORLD, query: "" });

    expect(results).toHaveLength(4);
    expect(results[0]?.ref.label).toBe("Alice");
    expect(results[1]?.ref.label).toBe("Bob");
    expect(results[2]?.ref.label).toBe("Charlie");
    // An object nobody has named yet reads as what was captured, and sorts last.
    expect(results[3]?.ref.label).toBe("just some thoughts");
  });

  it("filtering by kind returns only objects holding that representation", async () => {
    const desk = await repo.openDesk(WORLD);
    const character = await capture(desk.compositionId, "a person", "Mara");
    const placeCard = await capture(desk.compositionId, "a location");
    await repo.representObject({
      objectId: placeCard.objectId,
      representationId: asRepresentationId(randomUUID()),
      kind: "place",
      label: "The Quay"
    });
    const unclassified = await capture(desk.compositionId, "loose thoughts");

    const characters = await repo.searchWorld({
      worldId: WORLD,
      query: "",
      kinds: ["character"]
    });
    expect(characters).toHaveLength(1);
    expect(characters[0]?.ref.objectId).toBe(character.objectId);

    const places = await repo.searchWorld({
      worldId: WORLD,
      query: "",
      kinds: ["place"]
    });
    expect(places).toHaveLength(1);
    expect(places[0]?.ref.objectId).toBe(placeCard.objectId);

    const unclassifiedResults = await repo.searchWorld({
      worldId: WORLD,
      query: "",
      kinds: ["unclassified"]
    });
    expect(unclassifiedResults).toHaveLength(1);
    expect(unclassifiedResults[0]?.ref.objectId).toBe(unclassified.objectId);

    const both = await repo.searchWorld({
      worldId: WORLD,
      query: "",
      kinds: ["character", "unclassified"]
    });
    expect(both).toHaveLength(2);
    expect(both.map((e) => e.ref.objectId)).toContain(character.objectId);
    expect(both.map((e) => e.ref.objectId)).toContain(unclassified.objectId);
  });

  it("filtering by maturity returns only objects at that settlement level", async () => {
    const desk = await repo.openDesk(WORLD);
    const pencil = await capture(desk.compositionId, "provisional", "Uncertain");
    const inked = await capture(desk.compositionId, "established", "Definite");

    await repo.settleTruth({
      objectId: inked.objectId,
      maturity: "ink",
      claims: [],
      author: "gm"
    });

    const pencilResults = await repo.searchWorld({
      worldId: WORLD,
      query: "",
      maturity: "pencil"
    });
    expect(pencilResults).toHaveLength(1);
    expect(pencilResults[0]?.ref.objectId).toBe(pencil.objectId);
    expect(pencilResults[0]?.maturity).toBe("pencil");

    const inkResults = await repo.searchWorld({
      worldId: WORLD,
      query: "",
      maturity: "ink"
    });
    expect(inkResults).toHaveLength(1);
    expect(inkResults[0]?.ref.objectId).toBe(inked.objectId);
    expect(inkResults[0]?.maturity).toBe("ink");
  });

  it("cardHere names the card on the composition asked about, or null otherwise", async () => {
    const desk = await repo.openDesk(WORLD);
    const deskCard = await capture(desk.compositionId, "on the desk", "Desk Object");

    const board = await repo.createBoard({
      worldId: WORLD,
      compositionId: asCompositionId(randomUUID()),
      name: "Another Board"
    });

    const boardCard = await repo.referenceObjects({
      compositionId: board.compositionId,
      placements: [
        {
          cardId: asCardId(randomUUID()),
          objectId: deskCard.objectId,
          layout: emptyLayoutAt(0, 0)
        }
      ]
    });
    expect(boardCard.state).toBe("ok");

    // Asked about no composition, the index answers about the world alone.
    const noComposition = await repo.searchWorld({
      worldId: WORLD,
      query: "Desk Object"
    });
    expect(noComposition[0]?.cardHere).toBeNull();

    const onDesk = await repo.searchWorld({
      worldId: WORLD,
      query: "Desk Object",
      compositionId: desk.compositionId
    });
    expect(onDesk[0]?.cardHere).toBe(deskCard.cardId);

    // The same identity, a different placement: one object, two cards.
    const onBoard = await repo.searchWorld({
      worldId: WORLD,
      query: "Desk Object",
      compositionId: board.compositionId
    });
    if (boardCard.state === "ok" && boardCard.data.length > 0) {
      expect(onBoard[0]?.cardHere).toBe(boardCard.data[0]?.cardId);
    }

    const thirdBoard = await repo.createBoard({
      worldId: WORLD,
      compositionId: asCompositionId(randomUUID()),
      name: "Third Board"
    });
    const notThere = await repo.searchWorld({
      worldId: WORLD,
      query: "Desk Object",
      compositionId: thirdBoard.compositionId
    });
    expect(notThere[0]?.cardHere).toBeNull();
  });

  it("archived material is absent from default search but present with include flags", async () => {
    const desk = await repo.openDesk(WORLD);
    const active = await capture(desk.compositionId, "still here", "Active");
    const toArchive = await capture(desk.compositionId, "will be archived", "Archived");

    // Removing the last card referencing an object archives the object itself.
    const deskCards = (await repo.openDesk(WORLD)).cards;
    await repo.removeCards({
      compositionId: desk.compositionId,
      cardIds: [cardFor(deskCards, toArchive.objectId).cardId]
    });

    expect(await repo.objectLifecycle(toArchive.objectId)).toBe("archived");

    const defaultSearch = await repo.searchWorld({ worldId: WORLD, query: "" });
    expect(defaultSearch.map((e) => e.ref.objectId)).toContain(active.objectId);
    expect(defaultSearch.map((e) => e.ref.objectId)).not.toContain(toArchive.objectId);

    const archivedOnly = await repo.searchWorld({
      worldId: WORLD,
      query: "",
      include: "archived"
    });
    expect(archivedOnly.map((e) => e.ref.objectId)).not.toContain(active.objectId);
    expect(archivedOnly.map((e) => e.ref.objectId)).toContain(toArchive.objectId);
    expect(archivedOnly[0]?.lifecycle).toBe("archived");

    const all = await repo.searchWorld({
      worldId: WORLD,
      query: "",
      include: "all"
    });
    expect(all.map((e) => e.ref.objectId)).toContain(active.objectId);
    expect(all.map((e) => e.ref.objectId)).toContain(toArchive.objectId);
  });

  it("pulling archived material back via referenceObjects restores it to active", async () => {
    const desk = await repo.openDesk(WORLD);
    const toArchive = await capture(desk.compositionId, "will be archived", "Archived");

    const deskCards = (await repo.openDesk(WORLD)).cards;
    await repo.removeCards({
      compositionId: desk.compositionId,
      cardIds: [cardFor(deskCards, toArchive.objectId).cardId]
    });
    expect(await repo.objectLifecycle(toArchive.objectId)).toBe("archived");

    // Referencing it again is the deliberate act that brings it back.
    const result = await repo.referenceObjects({
      compositionId: desk.compositionId,
      placements: [
        {
          cardId: asCardId(randomUUID()),
          objectId: toArchive.objectId,
          layout: emptyLayoutAt(0, 0)
        }
      ]
    });
    expect(result.state).toBe("ok");
    expect(await repo.objectLifecycle(toArchive.objectId)).toBe("active");

    const defaultSearch = await repo.searchWorld({ worldId: WORLD, query: "" });
    expect(defaultSearch.map((e) => e.ref.objectId)).toContain(toArchive.objectId);
    expect(defaultSearch.find((e) => e.ref.objectId === toArchive.objectId)?.lifecycle).toBe(
      "active"
    );
  });

  it("another world's material never appears, even with the same name", async () => {
    const desk1 = await repo.openDesk(WORLD);
    const mara1 = await capture(desk1.compositionId, "harbour master", "Mara");

    const WORLD2 = asWorldId(randomUUID());
    const desk2 = await repo.openDesk(WORLD2);
    const mara2 = await capture(desk2.compositionId, "another Mara", "Mara");

    const results = await repo.searchWorld({ worldId: WORLD, query: "Mara" });

    expect(results).toHaveLength(1);
    expect(results[0]?.ref.objectId).toBe(mara1.objectId);
    expect(results[0]?.ref.objectId).not.toBe(mara2.objectId);
  });

  it("excludeId removes the subject from results", async () => {
    const desk = await repo.openDesk(WORLD);
    const mara = await capture(desk.compositionId, "harbour master", "Mara");
    const other = await capture(desk.compositionId, "mention Mara in passing");

    const results = await repo.searchWorld({
      worldId: WORLD,
      query: "Mara",
      excludeId: mara.objectId
    });

    expect(results).toHaveLength(1);
    expect(results[0]?.ref.objectId).toBe(other.objectId);
  });

  it("the query is text, never a pattern", async () => {
    const desk = await repo.openDesk(WORLD);
    await capture(desk.compositionId, "the shipping cartel", "Harbour Guild");

    const wildcard = await repo.searchWorld({ worldId: WORLD, query: "%" });
    expect(wildcard).toHaveLength(0);

    const underscore = await repo.searchWorld({ worldId: WORLD, query: "_" });
    expect(underscore).toHaveLength(0);
  });

  it("limit and offset page through results without overlap", async () => {
    const desk = await repo.openDesk(WORLD);
    const alice = await capture(desk.compositionId, "scholar", "Alice");
    const bob = await capture(desk.compositionId, "rogue", "Bob");
    const charlie = await capture(desk.compositionId, "fighter", "Charlie");
    const diana = await capture(desk.compositionId, "cleric", "Diana");

    const page1 = await repo.searchWorld({
      worldId: WORLD,
      query: "",
      limit: 2,
      offset: 0
    });
    expect(page1).toHaveLength(2);
    expect(page1[0]?.ref.label).toBe("Alice");
    expect(page1[1]?.ref.label).toBe("Bob");

    const page2 = await repo.searchWorld({
      worldId: WORLD,
      query: "",
      limit: 2,
      offset: 2
    });
    expect(page2).toHaveLength(2);
    expect(page2[0]?.ref.label).toBe("Charlie");
    expect(page2[1]?.ref.label).toBe("Diana");

    const page3 = await repo.searchWorld({
      worldId: WORLD,
      query: "",
      limit: 2,
      offset: 4
    });
    expect(page3).toHaveLength(0);

    const page1Ids = page1.map((e) => e.ref.objectId);
    const page2Ids = page2.map((e) => e.ref.objectId);
    const overlap = page1Ids.filter((id) => page2Ids.includes(id));
    expect(overlap).toHaveLength(0);
  });
});

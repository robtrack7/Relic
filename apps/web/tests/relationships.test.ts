// @vitest-environment node
import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import {
  asCardId,
  asClaimId,
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

/**
 * Relationship assertions.
 *
 * A relationship is a claim whose value is another World Object — so what is
 * being specified here is mostly that it is *not* special: the same write path,
 * the same truth and provenance, the same replace-or-append rule. What is new
 * is the neighbourhood a card can now report, in both directions and beyond the
 * composition it happens to be sitting on.
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
      kind: "character",
      label: name
    });
  }
  return card;
}

const relate = (
  subjectId: WorldObjectId,
  claimKind: string,
  value: string,
  objectValue: WorldObjectId | null
) =>
  repo.setClaim({
    subjectId,
    claimId: asClaimId(randomUUID()),
    claimKind,
    value,
    objectValue
  });

const cardFor = (cards: readonly DeskCard[], objectId: WorldObjectId) =>
  cards.find((card) => card.objectId === objectId)!;

describe("a relationship is a claim, not a new kind of record", () => {
  it("records the other end alongside the words, and carries claim semantics", async () => {
    const desk = await repo.openDesk(WORLD);
    const mara = await capture(desk.compositionId, "harbour master", "Mara");
    const guild = await capture(desk.compositionId, "the shipping cartel", "Harbour Guild");

    const result = await relate(mara.objectId, "allegiance", "Harbour Guild", guild.objectId);
    expect(result.state).toBe("ok");
    if (result.state !== "ok") return;

    // The text survives so the claim still reads as language, and the id is
    // what makes it followable.
    expect(result.data.value).toBe("Harbour Guild");
    expect(result.data.objectValue).toBe(guild.objectId);
    // Everything a claim carries applies unchanged. Nothing on this path
    // establishes Ink.
    expect(result.data.truthState).toBe("pencil");
    expect(result.data.provenance.kind).toBe("gm_assertion");
    expect(result.data.story.order).toBeNull();
  });

  it("refuses to point an object at itself", async () => {
    const desk = await repo.openDesk(WORLD);
    const mara = await capture(desk.compositionId, "harbour master", "Mara");

    // Not `missing` — the object is plainly there. A self-edge carries no
    // information and a caller sending one has a bug, so the database refuses
    // it outright. The action boundary catches it earlier, with words.
    await expect(
      relate(mara.objectId, "allegiance", "herself", mara.objectId)
    ).rejects.toThrow(/claims_object_value_not_self/);
  });

  it("refuses an other end in a different world", async () => {
    const here = await repo.openDesk(WORLD);
    const mara = await capture(here.compositionId, "harbour master", "Mara");

    const elsewhere = await repo.openDesk(asWorldId(randomUUID()));
    const stranger = await capture(elsewhere.compositionId, "someone else entirely");

    const result = await relate(mara.objectId, "allegiance", "them", stranger.objectId);
    expect(result.state).toBe("missing");
  });

  it("refuses an other end that has been archived", async () => {
    const desk = await repo.openDesk(WORLD);
    const mara = await capture(desk.compositionId, "harbour master", "Mara");
    const guild = await capture(desk.compositionId, "the shipping cartel", "Harbour Guild");

    const cards = (await repo.openDesk(WORLD)).cards;
    await repo.removeCards({
      compositionId: desk.compositionId,
      cardIds: [cardFor(cards, guild.objectId).cardId]
    });
    expect(await repo.objectLifecycle(guild.objectId)).toBe("archived");

    const result = await relate(mara.objectId, "allegiance", "Harbour Guild", guild.objectId);
    expect(result.state).toBe("missing");
  });
});

describe("a neighbourhood reads from both ends", () => {
  it("gives the subject an outbound link and the target the inbound one", async () => {
    const desk = await repo.openDesk(WORLD);
    const mara = await capture(desk.compositionId, "harbour master", "Mara");
    const guild = await capture(desk.compositionId, "the shipping cartel", "Harbour Guild");

    await relate(mara.objectId, "allegiance", "Harbour Guild", guild.objectId);

    const cards = (await repo.openDesk(WORLD)).cards;

    const out = cardFor(cards, mara.objectId).links;
    expect(out).toHaveLength(1);
    expect(out[0]?.direction).toBe("out");
    expect(out[0]?.claimKind).toBe("allegiance");
    expect(out[0]?.other.objectId).toBe(guild.objectId);
    expect(out[0]?.other.label).toBe("Harbour Guild");

    const back = cardFor(cards, guild.objectId).links;
    expect(back).toHaveLength(1);
    expect(back[0]?.direction).toBe("in");
    expect(back[0]?.other.objectId).toBe(mara.objectId);
    expect(back[0]?.other.label).toBe("Mara");
  });

  it("names the other end from what it is called now, not from the text asserted", async () => {
    const desk = await repo.openDesk(WORLD);
    const mara = await capture(desk.compositionId, "harbour master", "Mara");
    const guild = await capture(desk.compositionId, "the shipping cartel", "Harbour Guild");

    await relate(mara.objectId, "allegiance", "Harbour Guild", guild.objectId);

    // Identity is stable; names are not. Renaming the Guild must rename it
    // everywhere it is referred to.
    const before = (await repo.openDesk(WORLD)).cards;
    const representation = cardFor(before, guild.objectId).representation!;
    await repo.editRepresentation({
      representationId: representation.id,
      label: "The Quayside Combine",
      fields: {},
      observedVersion: representation.version
    });

    const after = (await repo.openDesk(WORLD)).cards;
    const link = cardFor(after, mara.objectId).links[0];
    expect(link?.other.label).toBe("The Quayside Combine");
    // The words as asserted are untouched — the claim still reads as a
    // sentence somebody wrote.
    const claim = cardFor(after, mara.objectId).claims.find(
      (c) => c.claimKind === "allegiance"
    );
    expect(claim?.value).toBe("Harbour Guild");
  });

  it("reaches past the composition being looked at", async () => {
    const desk = await repo.openDesk(WORLD);
    const mara = await capture(desk.compositionId, "harbour master", "Mara");
    const guild = await capture(desk.compositionId, "the shipping cartel", "Harbour Guild");
    await relate(mara.objectId, "allegiance", "Harbour Guild", guild.objectId);

    // A Board holding only Mara still knows the Guild is there. A
    // neighbourhood is a property of the world, not of a view of it.
    const board = await repo.createBoard({
      worldId: WORLD,
      compositionId: asCompositionId(randomUUID()),
      name: "The waterfront"
    });
    await repo.referenceObjects({
      compositionId: board.compositionId,
      placements: [
        {
          cardId: asCardId(randomUUID()),
          objectId: mara.objectId,
          layout: emptyLayoutAt(0, 0)
        }
      ]
    });

    const view = await repo.openComposition(board.compositionId);
    expect(view?.cards).toHaveLength(1);
    expect(view?.cards[0]?.links[0]?.other.objectId).toBe(guild.objectId);
    expect(view?.cards[0]?.links[0]?.other.label).toBe("Harbour Guild");
  });

  it("drops a link whose other end is archived, keeping the claim's words", async () => {
    const desk = await repo.openDesk(WORLD);
    const mara = await capture(desk.compositionId, "harbour master", "Mara");
    const guild = await capture(desk.compositionId, "the shipping cartel", "Harbour Guild");
    await relate(mara.objectId, "allegiance", "Harbour Guild", guild.objectId);

    const cards = (await repo.openDesk(WORLD)).cards;
    await repo.removeCards({
      compositionId: desk.compositionId,
      cardIds: [cardFor(cards, guild.objectId).cardId]
    });

    const after = cardFor((await repo.openDesk(WORLD)).cards, mara.objectId);
    expect(after.links).toHaveLength(0);
    expect(after.claims.find((c) => c.claimKind === "allegiance")?.value).toBe("Harbour Guild");
  });
});

describe("a relational attribute is single-valued", () => {
  it("retires the standing relationship rather than accumulating both", async () => {
    const desk = await repo.openDesk(WORLD);
    const mara = await capture(desk.compositionId, "harbour master", "Mara");
    const quay = await capture(desk.compositionId, "the wet stones", "The Quay");
    const cathedral = await capture(desk.compositionId, "half-drowned", "The Cathedral");

    await relate(mara.objectId, "location", "The Quay", quay.objectId);
    await relate(mara.objectId, "location", "The Cathedral", cathedral.objectId);

    const cards = (await repo.openDesk(WORLD)).cards;

    const links = cardFor(cards, mara.objectId).links;
    expect(links).toHaveLength(1);
    expect(links[0]?.other.objectId).toBe(cathedral.objectId);

    // The far end of the retired edge forgets it too.
    expect(cardFor(cards, quay.objectId).links).toHaveLength(0);
    expect(cardFor(cards, cathedral.objectId).links).toHaveLength(1);
  });

  it("lets a plain text claim replace a relationship of the same kind", async () => {
    const desk = await repo.openDesk(WORLD);
    const mara = await capture(desk.compositionId, "harbour master", "Mara");
    const quay = await capture(desk.compositionId, "the wet stones", "The Quay");

    await relate(mara.objectId, "location", "The Quay", quay.objectId);
    await relate(mara.objectId, "location", "somewhere upriver", null);

    const card = cardFor((await repo.openDesk(WORLD)).cards, mara.objectId);
    expect(card.links).toHaveLength(0);
    expect(card.claims.find((c) => c.claimKind === "location")?.value).toBe("somewhere upriver");
  });
});

// Choosing the other end of a relationship is the world's index asked with a
// narrower question, so what it does is specified once, in `library.test.ts`.

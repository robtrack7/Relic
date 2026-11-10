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
import { must } from "./support";

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
    objectValue,
    author: "gm"
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

describe("semantic relationship identity and cardinality", () => {
  it("keeps relationship identity while correcting predicate and endpoint", async () => {
    const desk = await repo.openDesk(WORLD);
    const mara = await capture(desk.compositionId, "harbour master", "Mara");
    const guild = await capture(desk.compositionId, "the shipping cartel", "Harbour Guild");
    const cathedral = await capture(desk.compositionId, "half-drowned", "The Cathedral");

    const first = await relate(mara.objectId, "knows", "Harbour Guild", guild.objectId);
    expect(first.state).toBe("ok");
    if (first.state !== "ok") return;
    expect(first.data.relationshipId).toBeTruthy();

    const corrected = await repo.setClaim({
      subjectId: mara.objectId,
      claimId: asClaimId(randomUUID()),
      claimKind: "protects",
      value: "The Cathedral",
      objectValue: cathedral.objectId,
      author: "gm",
      expectedClaim: {
        claimId: first.data.id,
        version: first.data.version,
        relationshipId: first.data.relationshipId
      }
    });
    expect(corrected.state).toBe("ok");
    if (corrected.state !== "ok") return;
    expect(corrected.data.id).not.toBe(first.data.id);
    expect(corrected.data.relationshipId).toBe(first.data.relationshipId);

    const cards = (await repo.openDesk(WORLD)).cards;
    expect(cardFor(cards, mara.objectId).links.map((link) => link.other.objectId)).toEqual([cathedral.objectId]);
    expect(cardFor(cards, guild.objectId).links).toHaveLength(0);
  });

  it("keeps many relationship endpoints instead of replacing peers", async () => {
    const desk = await repo.openDesk(WORLD);
    const mara = await capture(desk.compositionId, "harbour master", "Mara");
    const guild = await capture(desk.compositionId, "the shipping cartel", "Harbour Guild");
    const cathedral = await capture(desk.compositionId, "half-drowned", "The Cathedral");

    await relate(mara.objectId, "knows", "Harbour Guild", guild.objectId);
    await relate(mara.objectId, "knows", "The Cathedral", cathedral.objectId);

    const links = cardFor((await repo.openDesk(WORLD)).cards, mara.objectId).links;
    expect(links).toHaveLength(2);
    expect(new Set(links.map((link) => link.other.objectId)).size).toBe(2);
  });
});

describe("relationship mutation guards preserve established and historical claims", () => {
  it("refuses editing or removing an established relationship without data loss", async () => {
    const desk = await repo.openDesk(WORLD);
    const mara = await capture(desk.compositionId, "harbour master", "Mara");
    const guild = await capture(desk.compositionId, "shipping cartel", "Harbour Guild");
    const cathedral = await capture(desk.compositionId, "half-drowned", "The Cathedral");
    const first = await relate(mara.objectId, "knows", "Harbour Guild", guild.objectId);
    expect(first.state).toBe("ok");
    if (first.state !== "ok") return;
    const settled = await repo.settleTruth({ objectId: mara.objectId, maturity: null, claims: [{ claimId: first.data.id, truth: "ink", observedVersion: first.data.version }], author: "gm" });
    expect(settled.state).toBe("ok");
    if (settled.state !== "ok") return;

    const edited = await repo.setClaim({ subjectId: mara.objectId, claimId: asClaimId(randomUUID()), claimKind: "protects", value: "The Cathedral", objectValue: cathedral.objectId, author: "gm", expectedClaim: { claimId: first.data.id, version: settled.data.claims[0]!.version, relationshipId: first.data.relationshipId } });
    expect(edited.state).toBe("refused");
    const removed = await repo.removeClaim({ claimId: first.data.id, observedVersion: settled.data.claims[0]!.version });
    expect(removed.state).toBe("refused");

    const after = cardFor((await repo.openDesk(WORLD)).cards, mara.objectId);
    expect(after.links[0]?.other.objectId).toBe(guild.objectId);
    expect(after.claims.find(claim => claim.id === first.data.id)?.truthState).toBe("ink");
  });

  it("refuses replacing a standing established single-valued relationship", async () => {
    const desk = await repo.openDesk(WORLD);
    const mara = await capture(desk.compositionId, "harbour master", "Mara");
    const quay = await capture(desk.compositionId, "wet stones", "The Quay");
    const cathedral = await capture(desk.compositionId, "half-drowned", "The Cathedral");
    const first = await relate(mara.objectId, "location", "The Quay", quay.objectId);
    expect(first.state).toBe("ok");
    if (first.state !== "ok") return;
    const settled = await repo.settleTruth({ objectId: mara.objectId, maturity: null, claims: [{ claimId: first.data.id, truth: "ink", observedVersion: first.data.version }], author: "gm" });
    expect(settled.state).toBe("ok");
    const replacement = await relate(mara.objectId, "location", "The Cathedral", cathedral.objectId);
    expect(replacement.state).toBe("refused");
    expect(cardFor((await repo.openDesk(WORLD)).cards, mara.objectId).links[0]?.other.objectId).toBe(quay.objectId);
  });

  it("refuses editing or removing an ordered historical relationship", async () => {
    const desk = await repo.openDesk(WORLD);
    const mara = await capture(desk.compositionId, "harbour master", "Mara");
    const guild = await capture(desk.compositionId, "shipping cartel", "Harbour Guild");
    const cathedral = await capture(desk.compositionId, "half-drowned", "The Cathedral");
    const first = await repo.setClaim({ subjectId: mara.objectId, claimId: asClaimId(randomUUID()), claimKind: "knows", value: "Harbour Guild", objectValue: guild.objectId, story: { order: 12, precision: "relative", label: "after the harbour fire" }, author: "gm" });
    expect(first.state).toBe("ok");
    if (first.state !== "ok") return;
    const edited = await repo.setClaim({ subjectId: mara.objectId, claimId: asClaimId(randomUUID()), claimKind: "protects", value: "The Cathedral", objectValue: cathedral.objectId, author: "gm", expectedClaim: { claimId: first.data.id, version: first.data.version, relationshipId: first.data.relationshipId } });
    expect(edited.state).toBe("refused");
    const removed = await repo.removeClaim({ claimId: first.data.id, observedVersion: first.data.version });
    expect(removed.state).toBe("refused");
    expect(cardFor((await repo.openDesk(WORLD)).cards, mara.objectId).links[0]?.other.objectId).toBe(guild.objectId);
  });
});

// Choosing the other end of a relationship is the world's index asked with a
// narrower question, so what it does is specified once, in `library.test.ts`.

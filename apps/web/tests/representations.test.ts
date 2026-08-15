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
  emptyLayoutAt
} from "@/lib/world/model";
import { closeDb, db } from "@/lib/world/db";
import { PostgresDeskRepository } from "@/lib/world/postgres-store";
import type { DeskRepository } from "@/lib/world/repository";

let WORLD = asWorldId(randomUUID());
let repo: DeskRepository;

beforeEach(() => {
  WORLD = asWorldId(randomUUID());
  repo = PostgresDeskRepository.open(db());
});

afterAll(async () => {
  await closeDb();
});

async function deskWithCard(body = "someone who lies about the third bell") {
  const desk = await repo.openDesk(WORLD);
  const card = await repo.captureCard({
    compositionId: desk.compositionId,
    cardId: asCardId(randomUUID()),
    objectId: asWorldObjectId(randomUUID()),
    body,
    layout: emptyLayoutAt(0, 0)
  });
  return { desk, card };
}

const represent = (objectId: ReturnType<typeof asWorldObjectId>, label: string | null = null) =>
  repo.representObject({
    objectId,
    representationId: asRepresentationId(randomUUID()),
    kind: "character",
    label
  });

describe("deepening never creates a new thing", () => {
  it("keeps the object's identity and its Fragment body", async () => {
    const { desk, card } = await deskWithCard("someone who lies about the third bell");

    const result = await represent(card.objectId, "Mara");
    expect(result.state).toBe("ok");
    if (result.state !== "ok") return;

    expect(result.data.objectId).toBe(card.objectId);

    const after = (await repo.openDesk(WORLD)).cards[0];
    // Same card, same object, same body. The Fragment survives underneath the
    // representation rather than being replaced by it.
    expect(after?.cardId).toBe(card.cardId);
    expect(after?.objectId).toBe(card.objectId);
    expect(after?.body).toBe("someone who lies about the third bell");
    expect(after?.representation?.kind).toBe("character");
    expect(after?.representation?.label).toBe("Mara");
  });

  it("returns the representation already there rather than adding a second", async () => {
    const { card } = await deskWithCard();

    const first = await represent(card.objectId, "Mara");
    const second = await represent(card.objectId, "Someone else");
    if (first.state !== "ok" || second.state !== "ok") throw new Error("setup failed");

    expect(second.data.id).toBe(first.data.id);
    expect(second.data.label).toBe("Mara");
  });

  it("shows the same representation through every composition holding the object", async () => {
    const { desk, card } = await deskWithCard();
    const board = await repo.createBoard({
      worldId: WORLD,
      compositionId: asCompositionId(randomUUID()),
      name: "The Drowned Coast"
    });
    await repo.referenceObjects({
      compositionId: board.compositionId,
      placements: [
        { cardId: asCardId(randomUUID()), objectId: card.objectId, layout: emptyLayoutAt(0, 0) }
      ]
    });

    await represent(card.objectId, "Mara");

    // Deepening happened once, on the identity — not on a card.
    const onDesk = (await repo.openDesk(WORLD)).cards[0];
    const onBoard = (await repo.openComposition(board.compositionId))?.cards[0];
    expect(onDesk?.representation?.label).toBe("Mara");
    expect(onBoard?.representation?.label).toBe("Mara");
    expect(onBoard?.representation?.id).toBe(onDesk?.representation?.id);
  });

  it("refuses to deepen an object that is not there", async () => {
    const result = await represent(asWorldObjectId(randomUUID()));
    expect(result.state).toBe("missing");
  });
});

describe("the mechanical sheet", () => {
  it("holds ability scores without touching the body or the placement", async () => {
    const { desk, card } = await deskWithCard("a hedge knight");
    const made = await represent(card.objectId, "Mara");
    if (made.state !== "ok") throw new Error("setup failed");

    const edited = await repo.editRepresentation({
      representationId: made.data.id,
      label: "Mara Estrell",
      fields: { str: 14, dex: 11, level: 3 },
      observedVersion: made.data.version
    });

    expect(edited.state).toBe("ok");
    if (edited.state !== "ok") return;
    expect(edited.data.fields).toEqual({ str: 14, dex: 11, level: 3 });
    expect(edited.data.version).toBe(made.data.version + 1);

    const after = (await repo.openDesk(WORLD)).cards[0];
    expect(after?.body).toBe("a hedge knight");
    expect(after?.bodyVersion).toBe(card.bodyVersion);
    expect(after?.cardVersion).toBe(card.cardVersion);
    expect(after?.representation?.fields).toEqual({ str: 14, dex: 11, level: 3 });
  });

  it("reports a stale sheet edit rather than overwriting it", async () => {
    const { card } = await deskWithCard();
    const made = await represent(card.objectId, "Mara");
    if (made.state !== "ok") throw new Error("setup failed");

    await repo.editRepresentation({
      representationId: made.data.id,
      label: "Mara",
      fields: { str: 14 },
      observedVersion: made.data.version
    });

    const stale = await repo.editRepresentation({
      representationId: made.data.id,
      label: "Mara",
      fields: { str: 8 },
      observedVersion: made.data.version
    });

    expect(stale.state).toBe("conflict");
    const after = (await repo.openDesk(WORLD)).cards[0];
    expect(after?.representation?.fields).toEqual({ str: 14 });
  });
});

describe("claims are the addressable truth unit", () => {
  const claim = (
    subjectId: ReturnType<typeof asWorldObjectId>,
    claimKind: string,
    value: string,
    story?: { order: number | null; precision: "exact" | "relative" | "unknown"; label: string | null }
  ) =>
    repo.setClaim({
      subjectId,
      claimId: asClaimId(randomUUID()),
      claimKind,
      value,
      ...(story ? { story } : {})
    });

  it("asserts Pencil, never Ink", async () => {
    const { card } = await deskWithCard();
    const made = await claim(card.objectId, "occupation", "harbour master");

    expect(made.state).toBe("ok");
    if (made.state !== "ok") return;
    // Establishing Ink is a deliberate, previewed act. Nothing on this path
    // may do it.
    expect(made.data.truthState).toBe("pencil");
    expect(made.data.provenance.authoredBy).toBe("gm");
    expect(made.data.provenance.kind).toBe("gm_assertion");
  });

  it("carries a story position when given one, and admits ignorance when not", async () => {
    const { card } = await deskWithCard();

    const vague = await claim(card.objectId, "status", "missing");
    if (vague.state !== "ok") throw new Error("setup failed");
    // Relic never invents precision it was not given.
    expect(vague.data.story).toEqual({ order: null, precision: "unknown", label: null });

    const placed = await claim(card.objectId, "location", "Blackwater", {
      order: 400,
      precision: "relative",
      label: "before Session 4"
    });
    if (placed.state !== "ok") throw new Error("setup failed");
    expect(placed.data.story).toEqual({
      order: 400,
      precision: "relative",
      label: "before Session 4"
    });
  });

  it("replaces a correction but appends a change over story time", async () => {
    const { card } = await deskWithCard();

    // A GM fixing what they said. One current answer, not two contradictions
    // standing at the same point in the story.
    await claim(card.objectId, "allegiance", "the Crown");
    await claim(card.objectId, "allegiance", "the Harbour Guild");

    let claims = (await repo.openDesk(WORLD)).cards[0]?.claims ?? [];
    expect(claims.filter((c) => c.claimKind === "allegiance")).toHaveLength(1);
    expect(claims[0]?.value).toBe("the Harbour Guild");

    // The world changing is a different thing entirely: both are true, at
    // different story positions.
    await claim(card.objectId, "allegiance", "the Drowned", {
      order: 900,
      precision: "relative",
      label: "after the cathedral"
    });

    claims = (await repo.openDesk(WORLD)).cards[0]?.claims ?? [];
    const allegiance = claims.filter((c) => c.claimKind === "allegiance");
    expect(allegiance).toHaveLength(2);
    expect(allegiance.map((c) => c.value)).toEqual(["the Harbour Guild", "the Drowned"]);
  });

  it("keeps claims with the identity, so every composition sees them", async () => {
    const { card } = await deskWithCard();
    const board = await repo.createBoard({
      worldId: WORLD,
      compositionId: asCompositionId(randomUUID()),
      name: "The Drowned Coast"
    });
    await repo.referenceObjects({
      compositionId: board.compositionId,
      placements: [
        { cardId: asCardId(randomUUID()), objectId: card.objectId, layout: emptyLayoutAt(0, 0) }
      ]
    });

    await claim(card.objectId, "occupation", "harbour master");

    const onBoard = (await repo.openComposition(board.compositionId))?.cards[0];
    expect(onBoard?.claims.map((c) => c.value)).toEqual(["harbour master"]);
  });

  it("retires a claim without destroying it", async () => {
    const { card } = await deskWithCard();
    const made = await claim(card.objectId, "occupation", "harbour master");
    if (made.state !== "ok") throw new Error("setup failed");

    const removed = await repo.removeClaim({ claimId: made.data.id });
    expect(removed.state).toBe("ok");
    expect((await repo.openDesk(WORLD)).cards[0]?.claims).toEqual([]);

    // Already gone is not a failure the second time either.
    expect((await repo.removeClaim({ claimId: made.data.id })).state).toBe("missing");
  });

  it("refuses to assert anything about an object that is not there", async () => {
    const orphan = await claim(asWorldObjectId(randomUUID()), "occupation", "nobody");
    expect(orphan.state).toBe("missing");
  });
});

describe("maturity and truth are different axes", () => {
  it("lets a Pencil object hold claims of its own truth state", async () => {
    const { card } = await deskWithCard();
    await represent(card.objectId, "Orin");
    await repo.setClaim({
      subjectId: card.objectId,
      claimId: asClaimId(randomUUID()),
      claimKind: "occupation",
      value: "locksmith"
    });

    const after = (await repo.openDesk(WORLD)).cards[0];
    // The object is still unsettled; the claim about it is a separate question.
    // Neither state is derived from the other.
    expect(after?.truthState).toBe("pencil");
    expect(after?.claims[0]?.truthState).toBe("pencil");
    expect(after?.representation?.kind).toBe("character");
  });
});

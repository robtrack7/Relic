// @vitest-environment node
import { describe, expect, it } from "vitest";

import {
  asCardId,
  asClaimId,
  asWorldObjectId,
  type Claim,
  type DeskCard,
  type Link,
  type StoryPosition
} from "@/lib/world/model";
import { projectObject, type StoryDevelopment } from "@/lib/world/object-projection";

const objectId = asWorldObjectId("object-1");
const otherId = asWorldObjectId("object-2");
const story = (order: number | null, label: string | null = null): StoryPosition => ({
  order,
  precision: order === null ? "unknown" : "exact",
  label
});

function claim(
  id: string,
  claimKind: string,
  value: string,
  truthState: Claim["truthState"],
  position: StoryPosition,
  recordedAt: string
): Claim {
  return {
    id: asClaimId(id),
    subjectId: objectId,
    claimKind,
    value,
    objectValue: null,
    truthState,
    provenance: { kind: "gm_assertion", authoredBy: "gm", recordedAt },
    settled: null,
    story: position,
    version: 1
  };
}

function link(truthState: Link["truthState"], label: string): Link {
  return {
    claimId: asClaimId(`link-${label}`),
    claimKind: "allegiance",
    direction: "out",
    other: { objectId: otherId, label, kind: "faction" },
    truthState
  };
}

function card(overrides: Partial<DeskCard> = {}): DeskCard {
  return {
    cardId: asCardId("card-1"),
    objectId,
    layout: { x: 12, y: 24, width: 260, height: 160 },
    z: 3,
    body: "current prose",
    maturity: "pencil",
    settled: null,
    written: null,
    cardVersion: 4,
    bodyVersion: 2,
    representation: null,
    claims: [],
    links: [],
    ...overrides
  };
}

const provenance = {
  kind: "gm_assertion" as const,
  authoredBy: "gm" as const,
  recordedAt: "2026-01-01T00:00:00.000Z"
};

function development(
  id: string,
  layer: StoryDevelopment["layer"],
  order: number,
  summary = id
): StoryDevelopment {
  return { id, summary, story: story(order), layer, provenance };
}

describe("projectObject", () => {
  it("keeps maturity independent from claim authority", () => {
    const pencilObjectWithInk = card({
      maturity: "pencil",
      claims: [
        claim("ink-claim", "occupation", "locksmith", "ink", story(null), "2026-09-01"),
        claim("pending-claim", "status", "missing", "pencil", story(null), "2026-01-01")
      ]
    });

    const projected = projectObject(pencilObjectWithInk);

    expect(projected.card).toBe(pencilObjectWithInk);
    expect(projected.card.maturity).toBe("pencil");
    expect(projected.settledClaims.map((item) => item.value)).toEqual(["locksmith"]);
    expect(projected.pendingClaims.map((item) => item.value)).toEqual(["missing"]);
  });

  it("uses an explicit historical card and never falls back to current prose or links", () => {
    const current = card({
      body: "future prose",
      links: [link("ink", "future faction")],
      claims: [claim("future", "status", "future", "ink", story(9), "2026-01-01")]
    });
    const historical = card({
      cardId: asCardId("historical-card"),
      body: "earlier prose",
      layout: { x: 99, y: 88, width: 200, height: 120 },
      z: 99,
      cardVersion: 98,
      links: [link("ink", "earlier faction")],
      claims: [claim("past", "status", "earlier", "ink", story(2), "2026-10-01")]
    });

    const projected = projectObject(current, {
      context: { kind: "historical", position: story(3, "Session 3") },
      card: historical,
      developments: [development("past-development", "settled", 2), development("future-development", "settled", 9)]
    });

    expect(projected.context.kind).toBe("historical");
    expect(projected.card.cardId).toBe(current.cardId);
    expect(projected.card.body).toBe("earlier prose");
    expect(projected.card.layout).toEqual(current.layout);
    expect(projected.card.z).toBe(current.z);
    expect(projected.card.cardVersion).toBe(current.cardVersion);
    expect(projected.settledClaims.map((item) => item.value)).toEqual(["earlier"]);
    expect(projected.settledLinks[0]?.other.label).toBe("earlier faction");
    expect(projected.settledLinks.some((item) => item.other.label === "future faction")).toBe(false);
    expect(projected.developments.map((item) => item.id)).toEqual(["past-development"]);
  });

  it("rejects a historical snapshot for a different stable identity", () => {
    expect(() =>
      projectObject(card(), {
        context: { kind: "historical", position: story(1) },
        card: card({ objectId: asWorldObjectId("different-object") }),
        developments: []
      })
    ).toThrow(/identity mismatch/);
  });

  it("keeps pending separate, excludes corrected/reverted, and exposes evidence", () => {
    const projected = projectObject(card(), {
      context: { kind: "historical", position: story(10) },
      card: card(),
      developments: [
        development("settled", "settled", 1),
        development("pending", "pending", 2),
        development("corrected", "corrected", 3),
        development("reverted", "reverted", 4),
        development("evidence", "evidence", 5)
      ]
    });

    expect(projected.developments.map((item) => item.id)).toEqual(["settled"]);
    expect(projected.pendingDevelopments.map((item) => item.id)).toEqual(["pending"]);
    expect(projected.evidenceDevelopments.map((item) => item.id)).toEqual(["evidence"]);
  });

  it("orders developments and current scalar standings by story position, never recorded time", () => {
    const claims = [
      claim("newer-story", "development:status", "later", "ink", story(5), "2020-01-01"),
      claim("older-story", "development:status", "earlier", "ink", story(2), "2030-01-01"),
      claim("pending-future", "status", "proposal", "pencil", story(9), "1900-01-01"),
      claim("settled-status", "status", "settled", "ink", story(1), "2035-01-01")
    ];
    const projected = projectObject(card({ claims }));

    expect(projected.developments.map((item) => item.id)).toEqual([
      "older-story",
      "newer-story"
    ]);
    expect(projected.settledClaims.map((item) => item.value)).toEqual(["later", "settled"]);
    expect(projected.pendingClaims.map((item) => item.value)).toEqual(["proposal"]);
  });
});

// @vitest-environment node
import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import {
  asCardId,
  asClaimId,
  asRepresentationId,
  asWorldId,
  asWorldObjectId,
  emptyLayoutAt,
  type Claim,
  type WorldObjectId
} from "@/lib/world/model";
import { closeDb, db } from "@/lib/world/db";
import { PostgresDeskRepository } from "@/lib/world/postgres-store";
import type { DeskRepository } from "@/lib/world/repository";
import { must } from "./support";

/**
 * Step 10's specification, executable.
 *
 * The two things worth protecting here are the ones that are expensive to get
 * wrong later: **Ink is deliberate**, and **maturity is not truth**. Everything
 * below is one of those two, or the change-set promise that holds them together.
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

async function subject(body = "someone who lies about the third bell") {
  const desk = await repo.openDesk(WORLD);
  const card = must(await repo.captureCard({
    compositionId: desk.compositionId,
    cardId: asCardId(randomUUID()),
    objectId: asWorldObjectId(randomUUID()),
    body,
    layout: emptyLayoutAt(0, 0),
    author: "gm"
  }), "capture");
  await repo.representObject({
    objectId: card.objectId,
    representationId: asRepresentationId(randomUUID()),
    kind: "character",
    label: "Mara"
  });
  return { desk, card };
}

async function assert(
  objectId: WorldObjectId,
  claimKind: string,
  value: string
): Promise<Claim> {
  const result = await repo.setClaim({
    subjectId: objectId,
    claimId: asClaimId(randomUUID()),
    claimKind,
    value,
    author: "gm"
  });
  if (result.state !== "ok") throw new Error(`setClaim: ${result.state}`);
  return result.data;
}

const reload = async (objectId: WorldObjectId) =>
  (await repo.openDesk(WORLD)).cards.find((card) => card.objectId === objectId);

/**
 * Step 13 adds a second author. These are the properties that keep the GM able
 * to tell their own world from a model's contribution to it — and the one
 * reversal that makes an immediate, undo-less write tolerable.
 */
describe("the world records who wrote it", () => {
  it("leaves the GM's own capture unmarked", async () => {
    const { card } = await subject();

    // Attribution is for material that is not the GM's. Marking their own
    // writing would put an author on every card in an ordinary world.
    expect(card.written).toBeNull();
  });

  it("names the Librarian on what the Librarian captured", async () => {
    const desk = await repo.openDesk(WORLD);
    const card = must(
      await repo.captureCard({
        compositionId: desk.compositionId,
        cardId: asCardId(randomUUID()),
        objectId: asWorldObjectId(randomUUID()),
        body: "The harbourmaster has been taking bribes since spring",
        layout: emptyLayoutAt(0, 0),
        author: "librarian"
      }),
      "capture"
    );

    expect(card.written?.by).toBe("librarian");
    expect(card.written?.at).toBeTruthy();
    // Nothing was replaced, so there is nothing to put back.
    expect(card.written?.superseded).toBeNull();

    // Authorship is not maturity. What the Librarian contributes is Pencil, and
    // saying who wrote it must not read as saying Relic believes it.
    expect(card.maturity).toBe("pencil");
    expect(card.settled).toBeNull();
  });

  it("records the Librarian as the source of a claim it asserted", async () => {
    const { card } = await subject();
    const result = await repo.setClaim({
      subjectId: card.objectId,
      claimId: asClaimId(randomUUID()),
      claimKind: "occupation",
      value: "harbourmaster",
      author: "librarian"
    });
    if (result.state !== "ok") throw new Error(`setClaim: ${result.state}`);

    expect(result.data.provenance.authoredBy).toBe("librarian");
    expect(result.data.provenance.kind).toBe("librarian");
    // The law it cannot reach: asserting is not establishing, whoever asserts.
    expect(result.data.truthState).toBe("pencil");
    expect(result.data.settled).toBeNull();
  });

  it("keeps what a Librarian rewrite replaced, so it can be put back", async () => {
    const { desk, card } = await subject("Mara keeps the third bell");

    const rewritten = await repo.editCardBody({
      compositionId: desk.compositionId,
      cardId: card.cardId,
      body: "Mara keeps the third bell, and has since the flood",
      observedBodyVersion: card.bodyVersion,
      author: "librarian"
    });
    if (rewritten.state !== "ok") throw new Error(`editCardBody: ${rewritten.state}`);

    expect(rewritten.data.body).toBe("Mara keeps the third bell, and has since the flood");
    expect(rewritten.data.written?.by).toBe("librarian");
    // Relic has no undo. This one column is the reversal for the one act that
    // destroys rather than adds or archives.
    expect(rewritten.data.written?.superseded).toBe("Mara keeps the third bell");
  });

  it("leaves no superseded copy when the GM edits their own prose", async () => {
    const { desk, card } = await subject("Mara keeps the third bell");

    const edited = await repo.editCardBody({
      compositionId: desk.compositionId,
      cardId: card.cardId,
      body: "Mara kept the third bell",
      observedBodyVersion: card.bodyVersion,
      author: "gm"
    });
    if (edited.state !== "ok") throw new Error(`editCardBody: ${edited.state}`);

    // Every keystroke on the capture path comes through here, debounced. A
    // superseded copy per edit would be a revision log nobody asked for.
    expect(edited.data.written).toBeNull();
  });

  it("clears the Librarian's mark once the GM writes over it", async () => {
    const { desk, card } = await subject("Mara keeps the third bell");

    const byLibrarian = await repo.editCardBody({
      compositionId: desk.compositionId,
      cardId: card.cardId,
      body: "Mara has kept the third bell since the flood",
      observedBodyVersion: card.bodyVersion,
      author: "librarian"
    });
    if (byLibrarian.state !== "ok") throw new Error("setup failed");

    const byGm = await repo.editCardBody({
      compositionId: desk.compositionId,
      cardId: card.cardId,
      body: "Mara has kept the third bell since her father died",
      observedBodyVersion: byLibrarian.data.bodyVersion,
      author: "gm"
    });
    if (byGm.state !== "ok") throw new Error(`editCardBody: ${byGm.state}`);

    // The GM has taken the prose back. Leaving the Librarian's name on it would
    // attribute their sentence to a model.
    expect(byGm.data.written).toBeNull();
  });
});

describe("nothing but a deliberate act establishes Ink", () => {
  it("captures and asserts as Pencil, with nothing settled", async () => {
    const { card } = await subject();
    const claim = await assert(card.objectId, "occupation", "locksmith");

    expect(card.maturity).toBe("pencil");
    expect(card.settled).toBeNull();
    expect(claim.truthState).toBe("pencil");
    // Asserting is saying it. It is not deciding it is so, and the record must
    // not pretend anybody decided anything.
    expect(claim.settled).toBeNull();
  });

  it("refuses Ink from anyone but the GM", async () => {
    const { card } = await subject();
    const claim = await assert(card.objectId, "occupation", "locksmith");

    for (const author of ["librarian", "player", "system"] as const) {
      const result = await repo.settleTruth({
        objectId: card.objectId,
        maturity: "ink",
        claims: [{ claimId: claim.id, truth: "ink", observedVersion: claim.version }],
        author
      });
      expect(result.state).toBe("refused");
    }

    // Refused means nothing happened, not "happened and then complained".
    const after = await reload(card.objectId);
    expect(after?.maturity).toBe("pencil");
    expect(after?.claims[0]?.truthState).toBe("pencil");
  });

  it("lets the Librarian dispute and withdraw, which are not establishment", async () => {
    const { card } = await subject();
    const claim = await assert(card.objectId, "allegiance", "the Harbour Guild");

    const result = await repo.settleTruth({
      objectId: card.objectId,
      maturity: null,
      claims: [{ claimId: claim.id, truth: "disputed", observedVersion: claim.version }],
      author: "librarian"
    });

    expect(result.state).toBe("ok");
    if (result.state !== "ok") return;
    expect(result.data.claims[0]?.truthState).toBe("disputed");
    // A ruling is attributed to whoever made it, so "why does Relic believe
    // this" has an answer even when the answer is the Librarian.
    expect(result.data.claims[0]?.settled?.by).toBe("librarian");
  });

  it("records who established, and when, separately from how it arrived", async () => {
    const { card } = await subject();
    const claim = await assert(card.objectId, "occupation", "locksmith");

    const result = await repo.settleTruth({
      objectId: card.objectId,
      maturity: "ink",
      claims: [{ claimId: claim.id, truth: "ink", observedVersion: claim.version }],
      author: "gm"
    });

    expect(result.state).toBe("ok");
    if (result.state !== "ok") return;

    const settled = result.data.claims[0]!;
    expect(settled.truthState).toBe("ink");
    expect(settled.settled?.by).toBe("gm");
    // Provenance survives establishment rather than being replaced by it. Both
    // halves of "asserted by the GM, established by the GM" are kept, because
    // the two answer different questions.
    expect(settled.provenance.kind).toBe("gm_assertion");
    expect(result.data.settled?.by).toBe("gm");
  });

  it("keeps the settlement after a reload, on every card referencing the object", async () => {
    const { card } = await subject();
    const claim = await assert(card.objectId, "occupation", "locksmith");

    await repo.settleTruth({
      objectId: card.objectId,
      maturity: "ink",
      claims: [{ claimId: claim.id, truth: "ink", observedVersion: claim.version }],
      author: "gm"
    });

    const after = await reload(card.objectId);
    expect(after?.maturity).toBe("ink");
    expect(after?.settled?.by).toBe("gm");
    expect(after?.claims[0]?.truthState).toBe("ink");
  });
});

describe("maturity is not truth", () => {
  it("holds an established claim on a Pencil object", async () => {
    const { card } = await subject();
    const claim = await assert(card.objectId, "occupation", "locksmith");

    await repo.settleTruth({
      objectId: card.objectId,
      // Left alone deliberately: settling what she does for a living says
      // nothing about whether Mara herself is finished.
      maturity: null,
      claims: [{ claimId: claim.id, truth: "ink", observedVersion: claim.version }],
      author: "gm"
    });

    const after = await reload(card.objectId);
    expect(after?.maturity).toBe("pencil");
    expect(after?.claims[0]?.truthState).toBe("ink");
  });

  it("holds a disputed claim on an Ink object", async () => {
    const { card } = await subject();
    const claim = await assert(card.objectId, "status", "killed him at the cathedral");

    await repo.settleTruth({
      objectId: card.objectId,
      maturity: "ink",
      claims: [{ claimId: claim.id, truth: "disputed", observedVersion: claim.version }],
      author: "gm"
    });

    const after = await reload(card.objectId);
    expect(after?.maturity).toBe("ink");
    expect(after?.claims[0]?.truthState).toBe("disputed");
  });

  it("does not carry object maturity down onto new claims", async () => {
    const { card } = await subject();
    await repo.settleTruth({
      objectId: card.objectId,
      maturity: "ink",
      claims: [],
      author: "gm"
    });

    const later = await assert(card.objectId, "location", "the Quay");
    expect(later.truthState).toBe("pencil");
  });
});

describe("a settlement is one change set", () => {
  it("establishes every claim in the preview together", async () => {
    const { card } = await subject();
    const one = await assert(card.objectId, "occupation", "locksmith");
    const two = await assert(card.objectId, "allegiance", "the Harbour Guild");

    const result = await repo.settleTruth({
      objectId: card.objectId,
      maturity: "ink",
      claims: [
        { claimId: one.id, truth: "ink", observedVersion: one.version },
        { claimId: two.id, truth: "ink", observedVersion: two.version }
      ],
      author: "gm"
    });

    expect(result.state).toBe("ok");
    const after = await reload(card.objectId);
    expect(after?.maturity).toBe("ink");
    expect(after?.claims.every((claim) => claim.truthState === "ink")).toBe(true);
  });

  it("applies none of it when one claim has moved underneath the preview", async () => {
    const { card } = await subject();
    const one = await assert(card.objectId, "occupation", "locksmith");
    const two = await assert(card.objectId, "allegiance", "the Harbour Guild");

    const result = await repo.settleTruth({
      objectId: card.objectId,
      maturity: "ink",
      claims: [
        { claimId: one.id, truth: "ink", observedVersion: one.version },
        // Not what the GM was shown. Establishing this would establish wording
        // nobody previewed, which is the thing "previewed" exists to prevent.
        { claimId: two.id, truth: "ink", observedVersion: two.version + 1 }
      ],
      author: "gm"
    });

    expect(result.state).toBe("conflict");

    const after = await reload(card.objectId);
    expect(after?.maturity).toBe("pencil");
    expect(after?.claims.every((claim) => claim.truthState === "pencil")).toBe(true);
  });

  it("refuses claims that are about something else", async () => {
    const mara = await subject();
    const guild = await subject("the harbour guild, which owns the third bell");
    const theirs = await assert(guild.card.objectId, "occupation", "a cartel");

    const result = await repo.settleTruth({
      objectId: mara.card.objectId,
      maturity: null,
      claims: [{ claimId: theirs.id, truth: "ink", observedVersion: theirs.version }],
      author: "gm"
    });

    expect(result.state).toBe("refused");

    const after = await reload(guild.card.objectId);
    expect(after?.claims[0]?.truthState).toBe("pencil");
  });

  it("reports a missing object rather than settling nothing quietly", async () => {
    const result = await repo.settleTruth({
      objectId: asWorldObjectId(randomUUID()),
      maturity: "ink",
      claims: [],
      author: "gm"
    });
    expect(result.state).toBe("missing");
  });
});

describe("established truth is never silently rewritten", () => {
  it("returns a revised claim to Pencil", async () => {
    const { card } = await subject();
    const claim = await assert(card.objectId, "occupation", "locksmith");

    await repo.settleTruth({
      objectId: card.objectId,
      maturity: null,
      claims: [{ claimId: claim.id, truth: "ink", observedVersion: claim.version }],
      author: "gm"
    });

    // Correcting what a claim says is a new assertion, not an edit to a
    // settled one. Nobody has decided the new wording is so, so it is Pencil
    // until somebody does.
    await assert(card.objectId, "occupation", "a forger");

    const after = await reload(card.objectId);
    expect(after?.claims).toHaveLength(1);
    expect(after?.claims[0]?.value).toBe("a forger");
    expect(after?.claims[0]?.truthState).toBe("pencil");
    expect(after?.claims[0]?.settled).toBeNull();
  });

  it("keeps what an unsettled claim says, and records who withdrew it", async () => {
    const { card } = await subject();
    const claim = await assert(card.objectId, "occupation", "locksmith");

    await repo.settleTruth({
      objectId: card.objectId,
      maturity: "ink",
      claims: [{ claimId: claim.id, truth: "ink", observedVersion: claim.version }],
      author: "gm"
    });

    const established = (await reload(card.objectId))!.claims[0]!;

    const result = await repo.settleTruth({
      objectId: card.objectId,
      maturity: "pencil",
      claims: [
        { claimId: established.id, truth: "pencil", observedVersion: established.version }
      ],
      author: "gm"
    });
    expect(result.state).toBe("ok");

    const after = await reload(card.objectId);
    expect(after?.maturity).toBe("pencil");
    expect(after?.claims[0]?.value).toBe("locksmith");
    expect(after?.claims[0]?.truthState).toBe("pencil");
    // Withdrawing is an act, and the record says who did it. Clearing this
    // would lose the fact that somebody deliberately pulled it back.
    expect(after?.claims[0]?.settled?.by).toBe("gm");
    expect(after?.settled?.by).toBe("gm");
  });

  it("leaves a claim already at that truth untouched, without restamping it", async () => {
    const { card } = await subject();
    const claim = await assert(card.objectId, "occupation", "locksmith");

    await repo.settleTruth({
      objectId: card.objectId,
      maturity: null,
      claims: [{ claimId: claim.id, truth: "ink", observedVersion: claim.version }],
      author: "gm"
    });
    const once = (await reload(card.objectId))!.claims[0]!;

    const again = await repo.settleTruth({
      objectId: card.objectId,
      maturity: null,
      claims: [{ claimId: once.id, truth: "ink", observedVersion: once.version }],
      author: "gm"
    });

    expect(again.state).toBe("ok");
    if (again.state !== "ok") return;
    expect(again.data.claims[0]?.version).toBe(once.version);
    expect(again.data.claims[0]?.settled?.at).toBe(once.settled?.at);
  });
});

describe("a relationship is established like any other claim", () => {
  it("carries its truth to both ends of the neighbourhood", async () => {
    const mara = await subject();
    const guild = await subject("the harbour guild");

    const result = await repo.setClaim({
      subjectId: mara.card.objectId,
      claimId: asClaimId(randomUUID()),
      claimKind: "allegiance",
      value: "the Harbour Guild",
      objectValue: guild.card.objectId,
      author: "gm"
    });
    if (result.state !== "ok") throw new Error("setClaim failed");

    await repo.settleTruth({
      objectId: mara.card.objectId,
      maturity: null,
      claims: [{ claimId: result.data.id, truth: "ink", observedVersion: result.data.version }],
      author: "gm"
    });

    const cards = (await repo.openDesk(WORLD)).cards;
    const out = cards
      .find((c) => c.objectId === mara.card.objectId)
      ?.links.find((link) => link.direction === "out");
    const inbound = cards
      .find((c) => c.objectId === guild.card.objectId)
      ?.links.find((link) => link.direction === "in");

    // One claim, one truth. The Guild's view of the edge and Mara's are the
    // same assertion seen from two sides — they cannot disagree about whether
    // it is established.
    expect(out?.truthState).toBe("ink");
    expect(inbound?.truthState).toBe("ink");
  });
});

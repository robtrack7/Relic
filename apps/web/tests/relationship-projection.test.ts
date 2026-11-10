// @vitest-environment node
import { randomUUID } from "node:crypto";
import { afterAll, expect, it } from "vitest";
import { asCardId, asClaimId, asCompositionId, asRelationshipId, asWorldId, asWorldObjectId, emptyLayoutAt } from "@/lib/world/model";
import { closeDb, db } from "@/lib/world/db";
import { PostgresDeskRepository } from "@/lib/world/postgres-store";
import { must } from "./support";
afterAll(closeDb);

it("commits Canvas relationship and visibility atomically; visibility stays Board-local and survives paper changes", async () => {
  const repo = PostgresDeskRepository.open(db());
  const worldId = asWorldId(randomUUID());
  const desk = await repo.openDesk(worldId);
  const capture = async (body: string, x: number) => must(await repo.captureCard({ compositionId: desk.compositionId, cardId: asCardId(randomUUID()), objectId: asWorldObjectId(randomUUID()), body, layout: emptyLayoutAt(x, 0), author: "gm" }), "capture");
  const source = await capture("Mara", 0), target = await capture("The spire", 400);
  const board = await repo.createBoard({ worldId, compositionId: asCompositionId(randomUUID()), name: "A different arrangement" });
  const references = must(await repo.referenceObjects({ compositionId: board.compositionId, placements: [source, target].map(card => ({ cardId: asCardId(randomUUID()), objectId: card.objectId, layout: card.layout })) }), "reference");
  const claim = must(await repo.setClaim({ subjectId: source.objectId, claimId: asClaimId(randomUUID()), claimKind: "protects", value: "The spire", objectValue: target.objectId, author: "gm",
    boardProjection: { compositionId: desk.compositionId, cardId: source.cardId, observedCardVersion: source.cardVersion } }), "Canvas Connect");
  expect(claim.truthState).toBe("pencil");
  const relationshipId = claim.relationshipId!;
  let current = (await repo.openComposition(desk.compositionId))!.cards.find(card => card.cardId === source.cardId)!;
  expect(current.presentation?.semanticEdges).toContain(relationshipId);
  expect(current.cardVersion).toBe(source.cardVersion + 1);
  expect((await repo.openComposition(board.compositionId))!.cards.every(card => !card.presentation?.semanticEdges?.length)).toBe(true);
  current = must(await repo.moveCards({ compositionId: desk.compositionId, bringToFront: false, moves: [{ cardId: source.cardId, x: 80, y: 40, tint: "sage", observedCardVersion: current.cardVersion }] }), "move and tint")[0]!;
  expect(current.presentation?.semanticEdges).toContain(relationshipId);
  const shown = must(await repo.setRelationshipVisibility({ compositionId: board.compositionId, cardId: references[0]!.cardId, relationshipId, visible: true, observedCardVersion: references[0]!.cardVersion }), "show existing relationship");
  expect(shown.presentation?.semanticEdges).toContain(relationshipId);
  current = must(await repo.setRelationshipVisibility({ compositionId: desk.compositionId, cardId: source.cardId, relationshipId, visible: false, observedCardVersion: current.cardVersion }), "hide on original Board");
  expect(current.presentation?.semanticEdges).not.toContain(relationshipId);
  expect(current.claims.find(item => item.id === claim.id)?.truthState).toBe("pencil");
  expect((await repo.openComposition(board.compositionId))!.cards[0]!.presentation?.semanticEdges).toContain(relationshipId);
  expect((await repo.setRelationshipVisibility({ compositionId: desk.compositionId, cardId: source.cardId, relationshipId: asRelationshipId(randomUUID()), visible: true, observedCardVersion: current.cardVersion })).state).toBe("refused");
  const location = must(await repo.setClaim({ subjectId: source.objectId, claimId: asClaimId(randomUUID()), claimKind: "LOCATION", value: "The spire", objectValue: target.objectId, author: "gm" }), "known predicate spelling");
  expect(location.claimKind).toBe("location");
  must(await repo.settleTruth({ objectId: source.objectId, maturity: null, claims: [{ claimId: location.id, truth: "ink", observedVersion: location.version }], author: "gm" }), "establish location");
  expect((await repo.setClaim({ subjectId: source.objectId, claimId: asClaimId(randomUUID()), claimKind: "Location", value: "Spire", objectValue: target.objectId, author: "gm" })).state).toBe("refused");
});

it("refuses a stale or absent Canvas endpoint before creating any semantic assertion", async () => {
  const repo = PostgresDeskRepository.open(db());
  const worldId = asWorldId(randomUUID());
  const desk = await repo.openDesk(worldId);
  const capture = async (body: string) => must(await repo.captureCard({ compositionId: desk.compositionId, cardId: asCardId(randomUUID()), objectId: asWorldObjectId(randomUUID()), body, layout: emptyLayoutAt(0, 0), author: "gm" }), "capture");
  const source = await capture("Mara"), target = await capture("Spire");
  const result = await repo.setClaim({ subjectId: source.objectId, claimId: asClaimId(randomUUID()), claimKind: "protects", value: "Spire", objectValue: target.objectId, author: "gm", boardProjection: { compositionId: desk.compositionId, cardId: source.cardId, observedCardVersion: source.cardVersion + 1 } });
  expect(result.state).toBe("conflict");
  expect((await repo.openComposition(desk.compositionId))!.cards.find(card => card.cardId === source.cardId)!.claims).toHaveLength(0);
  const other = await repo.createBoard({ worldId, compositionId: asCompositionId(randomUUID()), name: "One endpoint only" });
  const [reference] = must(await repo.referenceObjects({ compositionId: other.compositionId, placements: [{ cardId: asCardId(randomUUID()), objectId: source.objectId, layout: emptyLayoutAt(0, 0) }] }), "reference source");
  expect((await repo.setClaim({ subjectId: source.objectId, claimId: asClaimId(randomUUID()), claimKind: "protects", value: "Spire", objectValue: target.objectId, author: "gm", boardProjection: { compositionId: other.compositionId, cardId: reference!.cardId, observedCardVersion: reference!.cardVersion } })).state).toBe("refused");
  expect((await repo.openComposition(desk.compositionId))!.cards.find(card => card.cardId === source.cardId)!.claims).toHaveLength(0);
});

// @vitest-environment node
import { randomUUID } from "node:crypto";
import { afterAll, expect, it } from "vitest";
import { asCardId, asCompositionId, asWorldId, asWorldObjectId, emptyLayoutAt } from "@/lib/world/model";
import { closeDb, db } from "@/lib/world/db";
import { PostgresDeskRepository } from "@/lib/world/postgres-store";
import { must } from "./support";

afterAll(closeDb);

it("inspects by world identity, edits through the existing placement, and never places material on the browsing Board", async () => {
  const repo = PostgresDeskRepository.open(db());
  const worldId = asWorldId(randomUUID());
  const desk = await repo.openDesk(worldId);
  const board = await repo.createBoard({ worldId, compositionId: asCompositionId(randomUUID()), name: "An empty research Board" });
  const card = must(await repo.captureCard({ compositionId: desk.compositionId, cardId: asCardId(randomUUID()), objectId: asWorldObjectId(randomUUID()), body: "An unopened letter from the crown.", layout: emptyLayoutAt(120, 80), author: "gm" }), "capture");
  const inspected = await repo.inspectObject(worldId, card.objectId);
  expect(inspected?.compositionId).toBe(desk.compositionId);
  expect(inspected?.cards[0]?.objectId).toBe(card.objectId);
  expect((await repo.openComposition(board.compositionId))?.cards).toHaveLength(0);
  expect(await repo.inspectObject(asWorldId(randomUUID()), card.objectId)).toBeNull();
  must(await repo.editCardBody({ compositionId: inspected!.compositionId, cardId: inspected!.cards[0]!.cardId, observedBodyVersion: card.bodyVersion, body: "The letter names the missing keeper.", author: "gm" }), "write through Focus");
  const reloaded = (await repo.inspectObject(worldId, card.objectId))!.cards[0]!;
  expect(reloaded.body).toBe("The letter names the missing keeper.");
  expect(reloaded.layout).toEqual(card.layout);
  expect(reloaded.cardVersion).toBe(card.cardVersion);
  expect((await repo.openComposition(board.compositionId))?.cards).toHaveLength(0);
});

it("does not silently restore an archived identity during inspection", async () => {
  const repo = PostgresDeskRepository.open(db());
  const worldId = asWorldId(randomUUID());
  const desk = await repo.openDesk(worldId);
  const card = must(await repo.captureCard({ compositionId: desk.compositionId, cardId: asCardId(randomUUID()), objectId: asWorldObjectId(randomUUID()), body: "A retired lead.", layout: emptyLayoutAt(0, 0), author: "gm" }), "capture");
  must(await repo.removeCards({ compositionId: desk.compositionId, cardIds: [card.cardId] }), "archive last reference");
  expect(await repo.inspectObject(worldId, card.objectId)).toBeNull();
  expect(await repo.objectLifecycle(card.objectId)).toBe("archived");
});

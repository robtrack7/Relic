// @vitest-environment node
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { applyCollectionCommand, collectionBounds, EMPTY_SPATIAL, projectCollections } from "@/lib/desk/collections";
import { asCardId, asCompositionId, asWorldId, asWorldObjectId, emptyLayoutAt, type SpatialState } from "@/lib/world/model";
import { OBJECT_DESK } from "@/components/world-objects/object-fixtures";
import { PostgresDeskRepository } from "@/lib/world/postgres-store";
import { closeDb, db } from "@/lib/world/db";
import { must } from "./support";

afterAll(closeDb);

describe("spatial collections", () => {
  it("moves a stack anchor deliberately and restores geometry, tint and grouping atomically", async () => {
    const repo = PostgresDeskRepository.open(db());
    const desk = await repo.openDesk(asWorldId(randomUUID()));
    const cards = await Promise.all([0, 1].map(async index => must(await repo.captureCard({ compositionId: desk.compositionId, cardId: asCardId(randomUUID()), objectId: asWorldObjectId(randomUUID()), body: `Desk integrity ${index}`, layout: emptyLayoutAt(index * 400, 0), author: 'gm' }), 'capture')));
    const original = must(await repo.changeCollection({ compositionId: desk.compositionId, observedVersion: 1, command: { kind: 'create', id: randomUUID(), title: 'Letters', cardIds: cards.map(card => card.cardId), collapsed: true } }), 'collect');
    const moved = must(await repo.moveCollectionCards({ compositionId: desk.compositionId, observedSpatialVersion: original.version, command: null, bringToFront: false, moves: cards.map(card => ({ cardId: card.cardId, x: card.layout.x + 80, y: card.layout.y + 40, observedCardVersion: card.cardVersion })) }), 'move stack');
    expect(moved.spatial.collections[0]?.anchor).toEqual({ x: 80, y: 40 });
    const expanded = { ...original, collections: original.collections.map(group => ({ ...group, collapsed: false })) };
    const moves = moved.cards.map(card => ({ cardId: card.cardId, x: card.layout.x + 100, y: card.layout.y, width: 320, height: 220, tint: 'sage' as const, observedCardVersion: card.cardVersion }));
    const failed = await repo.moveCollectionCards({ compositionId: desk.compositionId, observedSpatialVersion: moved.spatial.version, command: null, spatial: expanded, bringToFront: false, moves: moves.map((move, index) => index ? move : { ...move, observedCardVersion: 999 }) });
    expect(failed.state).toBe('conflict');
    const unchanged = await repo.openComposition(desk.compositionId);
    expect(unchanged?.spatial).toEqual(moved.spatial);
    expect(unchanged?.cards.map(card => card.layout)).toEqual(moved.cards.map(card => card.layout));
    const restored = must(await repo.moveCollectionCards({ compositionId: desk.compositionId, observedSpatialVersion: moved.spatial.version, command: null, spatial: expanded, bringToFront: false, moves }), 'restore composition');
    expect(restored.spatial.collections[0]?.collapsed).toBe(false);
    const reopened = await repo.openComposition(desk.compositionId);
    expect(reopened?.cards.map(card => [card.layout.width, card.layout.height, card.presentation?.tint])).toEqual([[320, 220, 'sage'], [320, 220, 'sage']]);
    expect(reopened?.cards.map(card => [card.objectId, card.body, card.claims, card.links])).toEqual(cards.map(card => [card.objectId, card.body, card.claims, card.links]));
    const prior = must(await repo.moveCollectionCards({ compositionId: desk.compositionId, observedSpatialVersion: restored.spatial.version, command: null, spatial: original, bringToFront: false, moves: cards.map(card => ({ cardId: card.cardId, ...card.layout, tint: null, z: card.z, observedCardVersion: restored.cards.find(item => item.cardId === card.cardId)!.cardVersion })) }), 'restore prior arrangement');
    expect(prior.cards.map(card => card.layout)).toEqual(cards.map(card => card.layout));
    expect(prior.spatial.collections[0]?.collapsed).toBe(true);
  });
  it("stacks by projection and restores the authored arrangement without touching world identity or claims", () => {
    const cards = structuredClone(OBJECT_DESK.cards);
    const state = applyCollectionCommand(EMPTY_SPATIAL, { kind: "create", id: "research-cluster", title: "Ironshore Coast", cardIds: cards.map(card => card.cardId), collapsed: true }, cards);
    const stacked = projectCollections(cards, state.collections);
    expect(stacked.map(card => card.layout)).not.toEqual(cards.map(card => card.layout));
    expect(stacked.map(card => [card.objectId, card.claims, card.links, card.maturity])).toEqual(cards.map(card => [card.objectId, card.claims, card.links, card.maturity]));
    const opened = applyCollectionCommand(state, { kind: "collapse", id: "research-cluster", collapsed: false }, cards);
    expect(projectCollections(cards, opened.collections).map(card => card.layout)).toEqual(cards.map(card => card.layout));
    expect(cards).toEqual(OBJECT_DESK.cards);
  });

  it("transfers explicit placement membership without duplication or nesting", () => {
    const cards = OBJECT_DESK.cards;
    const first = cards[0]!.cardId, second = cards[1]!.cardId;
    let state = applyCollectionCommand(EMPTY_SPATIAL, { kind: "create", id: "group-a", title: "People", cardIds: [first, second], collapsed: false }, cards);
    state = applyCollectionCommand(state, { kind: "create", id: "group-b", title: "Coast", cardIds: [second], collapsed: true }, cards);
    expect(state.collections.find(group => group.id === "group-a")?.cardIds).toEqual([first]);
    expect(state.collections.find(group => group.id === "group-b")?.cardIds).toEqual([second]);
    expect(() => applyCollectionCommand(state, { kind: "transfer", id: "group-a", cardIds: [asCardId("foreign-placement")] }, cards)).toThrow();
    expect(() => applyCollectionCommand(state, { kind: "reorder", id: "group-a", cardIds: [second] }, cards)).toThrow();
    expect(collectionBounds(state.collections[0]!, cards)).not.toBeNull();
  });

  it("keeps a collapsed stack anchored when a new card is inserted", () => {
    const cards = OBJECT_DESK.cards;
    const first = cards[0]!;
    const second = cards[1]!;
    let state = applyCollectionCommand(EMPTY_SPATIAL, {
      kind: "create", id: "stack", title: "Research", cardIds: [first.cardId], collapsed: true
    }, cards);
    const before = projectCollections(cards, state.collections).find(card => card.cardId === first.cardId)!;
    state = applyCollectionCommand(state, { kind: "transfer", id: "stack", cardIds: [second.cardId] }, cards);
    const after = projectCollections(cards, state.collections).find(card => card.cardId === first.cardId)!;
    expect(after.layout.x).toBe(before.layout.x);
    expect(after.layout.y).toBe(before.layout.y);
    expect(state.collections[0]?.anchor).toEqual({ x: first.layout.x, y: first.layout.y });
  });

  it("gathers a moved and regrouped collection where its cards are now, without rewriting their arrangement", () => {
    const cards = OBJECT_DESK.cards.slice(0, 3).map((card, index) => ({
      ...card, layout: { ...card.layout, x: [-543, -251, -507][index]!, y: [-432, -432, -346][index]! }
    }));
    let spatial: SpatialState = {
      version: 40, collections: [{
        id: "research", title: "Research collection", cardIds: cards.map(card => card.cardId),
        collapsed: false, anchor: { x: -1539.24, y: -415.2 }
      }]
    };
    const authored = structuredClone(cards);
    for (let cycle = 0; cycle < 3; cycle++) {
      spatial = applyCollectionCommand(spatial, { kind: "collapse", id: "research", collapsed: true }, cards);
      expect(spatial.collections[0]?.anchor).toEqual({ x: -543, y: -432 });
      expect(projectCollections(cards, spatial.collections)[0]?.layout).toMatchObject({ x: -543, y: -432 });
      spatial = applyCollectionCommand(spatial, { kind: "collapse", id: "research", collapsed: false }, cards);
      expect(projectCollections(cards, spatial.collections).map(card => card.layout)).toEqual(authored.map(card => card.layout));
    }
    expect(cards).toEqual(authored);
  });

  it("persists collection membership and disclosure across reload, rejects stale writes and foreign placements", async () => {
    const repo = PostgresDeskRepository.open(db());
    const world = asWorldId(randomUUID());
    const desk = await repo.openDesk(world);
    const cards = await Promise.all(["Mara Veyra", "Watcher's Spire"].map((body, index) => repo.captureCard({ compositionId: desk.compositionId, cardId: asCardId(randomUUID()), objectId: asWorldObjectId(randomUUID()), body, layout: emptyLayoutAt(index * 400, 0), author: "gm" }).then(result => must(result, "capture"))));
    const id = randomUUID();
    const first = must(await repo.changeCollection({ compositionId: desk.compositionId, observedVersion: 1, command: { kind: "create", id, title: "Ironshore Coast", cardIds: cards.map(card => card.cardId), collapsed: true } }), "collect");
    const reopened = await repo.openComposition(desk.compositionId);
    expect(reopened?.spatial).toEqual(first);
    expect(cards.map(card => reopened?.cards.find(item => item.cardId === card.cardId)?.layout)).toEqual(cards.map(card => card.layout));
    expect(reopened?.cards.every(card => !card.claims.length && !card.links.length)).toBe(true);
    expect((await repo.changeCollection({ compositionId: desk.compositionId, observedVersion: 1, command: { kind: "collapse", id, collapsed: false } })).state).toBe("refused");
    expect((await repo.changeCollection({ compositionId: desk.compositionId, observedVersion: first.version, command: { kind: "transfer", id, cardIds: [asCardId(randomUUID())] } })).state).toBe("refused");
    expect((await repo.changeCollection({ compositionId: asCompositionId(randomUUID()), observedVersion: 1, command: { kind: "dissolve", id } })).state).toBe("missing");
    const opened = must(await repo.changeCollection({ compositionId: desk.compositionId, observedVersion: first.version, command: { kind: "collapse", id, collapsed: false } }), "expand");
    expect(opened.collections[0]?.collapsed).toBe(false);
  });

  it("persists the current gathering point after taking a member out, moving its group and reinserting it", async () => {
    const repo = PostgresDeskRepository.open(db());
    const desk = await repo.openDesk(asWorldId(randomUUID()));
    const cards = await Promise.all([0, 1, 2].map(async index => must(await repo.captureCard({ compositionId: desk.compositionId, cardId: asCardId(randomUUID()), objectId: asWorldObjectId(randomUUID()), body: `Regrouped card ${index}`, layout: emptyLayoutAt(index * 400, 0), author: "gm" }), "capture")));
    const id = randomUUID();
    let spatial = must(await repo.changeCollection({ compositionId: desk.compositionId, observedVersion: 1, command: { kind: "create", id, title: "Research", cardIds: cards.map(card => card.cardId), collapsed: false } }), "collect");
    const detached = must(await repo.moveCollectionCards({ compositionId: desk.compositionId, observedSpatialVersion: spatial.version, command: { kind: "transfer", id: null, cardIds: [cards[0]!.cardId] }, bringToFront: true, moves: [{ cardId: cards[0]!.cardId, x: -200, y: 300, observedCardVersion: cards[0]!.cardVersion }] }), "detach");
    const moved = must(await repo.moveCollectionCards({ compositionId: desk.compositionId, observedSpatialVersion: detached.spatial.version, command: null, bringToFront: false, moves: cards.slice(1).map(card => ({ cardId: card.cardId, x: card.layout.x - 350, y: 0, observedCardVersion: card.cardVersion })) }), "move group");
    expect(moved.spatial.collections[0]?.anchor).toEqual({ x: -350, y: 0 });
    const inserted = must(await repo.moveCollectionCards({ compositionId: desk.compositionId, observedSpatialVersion: moved.spatial.version, command: { kind: "transfer", id, cardIds: [cards[0]!.cardId] }, bringToFront: true, moves: [{ cardId: cards[0]!.cardId, x: 80, y: 80, observedCardVersion: detached.cards[0]!.cardVersion }] }), "reinsert");
    const before = await repo.openComposition(desk.compositionId);
    spatial = must(await repo.changeCollection({ compositionId: desk.compositionId, observedVersion: inserted.spatial.version, command: { kind: "collapse", id, collapsed: true } }), "gather");
    expect(spatial.collections[0]?.anchor).toEqual({ x: 50, y: 0 });
    const reloaded = await repo.openComposition(desk.compositionId);
    expect(reloaded?.spatial).toEqual(spatial);
    expect(reloaded?.cards).toEqual(before?.cards);
    const expanded = must(await repo.changeCollection({ compositionId: desk.compositionId, observedVersion: spatial.version, command: { kind: "collapse", id, collapsed: false } }), "expand");
    expect(projectCollections(reloaded!.cards, expanded.collections).map(card => card.layout)).toEqual(before!.cards.map(card => card.layout));
  });

  it("commits membership and coordinates together and prunes removed members atomically", async () => {
    const repo = PostgresDeskRepository.open(db());
    const desk = await repo.openDesk(asWorldId(randomUUID()));
    const card = must(await repo.captureCard({ compositionId: desk.compositionId, cardId: asCardId(randomUUID()), objectId: asWorldObjectId(randomUUID()), body: "A letter from the coast", layout: emptyLayoutAt(0, 0), author: "gm" }), "capture");
    const id = randomUUID();
    const spatial = must(await repo.changeCollection({ compositionId: desk.compositionId, observedVersion: 1, command: { kind: "create", id, title: "Letters", cardIds: [card.cardId], collapsed: true } }), "collect");
    const input = { compositionId: desk.compositionId, observedSpatialVersion: spatial.version, bringToFront: true, command: { kind: "transfer" as const, id: null, cardIds: [card.cardId] }, moves: [{ cardId: card.cardId, x: 800, y: 500, observedCardVersion: card.cardVersion }] };
    expect((await repo.moveCollectionCards({ ...input, observedSpatialVersion: 1 })).state).toBe("refused");
    expect((await repo.moveCollectionCards({ ...input, command: null, moves: [input.moves[0]!, input.moves[0]!] })).state).toBe("refused");
    expect((await repo.moveCollectionCards({ ...input, moves: [{ ...input.moves[0]!, observedCardVersion: 999 }] })).state).toBe("conflict");
    const unchanged = await repo.openComposition(desk.compositionId);
    expect(unchanged?.cards[0]?.layout).toEqual(card.layout);
    expect(unchanged?.spatial).toEqual(spatial);
    const moved = must(await repo.moveCollectionCards(input), "move out");
    expect(moved.spatial.collections).toEqual([]);
    expect(moved.cards[0]?.layout.x).toBe(800);
    const recollected = must(await repo.changeCollection({ compositionId: desk.compositionId, observedVersion: moved.spatial.version, command: { kind: "create", id, title: "Letters", cardIds: [card.cardId], collapsed: true } }), "collect again");
    must(await repo.removeCards({ compositionId: desk.compositionId, cardIds: [card.cardId] }), "remove");
    const removed = await repo.openComposition(desk.compositionId);
    expect(removed?.spatial?.collections).toEqual([]);
    expect(removed?.spatial?.version).toBe(recollected.version + 1);
  });
});

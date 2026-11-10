import type { CardId, DeskCard, SpatialCollection, SpatialState } from "@/lib/world/model";
import { boundsOf, type Rect } from "./viewport";

export type CollectionCommand =
  | { kind: "create"; id: string; title: string; cardIds: readonly CardId[]; collapsed: boolean; anchor?: Readonly<{ x: number; y: number }> }
  | { kind: "transfer"; id: string | null; cardIds: readonly CardId[] }
  | { kind: "collapse"; id: string; collapsed: boolean }
  | { kind: "rename"; id: string; title: string }
  | { kind: "reorder"; id: string; cardIds: readonly CardId[] }
  | { kind: "dissolve"; id: string };

export const EMPTY_SPATIAL: SpatialState = { version: 1, collections: [] };

/** The same validated composition operation serves human and future tool callers. */
export function applyCollectionCommand(state: SpatialState, command: CollectionCommand, cards: readonly Pick<DeskCard, "cardId" | "layout">[]): SpatialState {
  const available = new Set(cards.map(card => card.cardId));
  let collections = state.collections.map(collection => {
    const members = cards.filter(card => collection.cardIds.includes(card.cardId));
    const bounds = boundsOf(members.map(card => card.layout));
    return { ...collection, ...(collection.anchor || !bounds ? {} : { anchor: { x: bounds.x, y: bounds.y } }), cardIds: collection.cardIds.filter(id => available.has(id)) };
  });
  if ("cardIds" in command) {
    if (!Array.isArray(command.cardIds) || command.cardIds.length > 500 || new Set(command.cardIds).size !== command.cardIds.length || command.cardIds.some(id => !available.has(id))) throw new Error("Choose placements on this Board.");
  }
  if (command.kind === "create") {
    if (collections.some(collection => collection.id === command.id)) throw new Error("That collection already exists.");
    if (collections.length >= 100 || command.cardIds.length < 1) throw new Error("Choose at least one card to collect.");
    const moving = new Set(command.cardIds);
    collections = collections.map(collection => ({ ...collection, cardIds: collection.cardIds.filter(id => !moving.has(id)) }));
    const first = cards.find(card => card.cardId === command.cardIds[0]);
    collections.push({
      id: command.id,
      title: cleanTitle(command.title),
      cardIds: [...command.cardIds],
      collapsed: command.collapsed,
      // A stack is a presentation of placements. Keep its first authored
      // placement as the stable handle so adding a member cannot move the
      // collection under the pointer.
      anchor: command.anchor ?? (first ? { x: first.layout.x, y: first.layout.y } : undefined)
    });
  } else if (command.kind === "transfer") {
    if (command.id !== null && !collections.some(collection => collection.id === command.id)) throw new Error("That collection is no longer here.");
    const moving = new Set(command.cardIds);
    collections = collections.map(collection => ({ ...collection, cardIds: [...collection.cardIds.filter(id => !moving.has(id)), ...(collection.id === command.id ? command.cardIds : [])] }));
  } else {
    const target = collections.find(collection => collection.id === command.id);
    if (!target) throw new Error("That collection is no longer here.");
    if (command.kind === "dissolve") collections = collections.filter(collection => collection.id !== command.id);
    else if (command.kind === "reorder") {
      if (command.cardIds.length !== target.cardIds.length || command.cardIds.some(id => !target.cardIds.includes(id))) throw new Error("The collection's contents changed. Try again.");
      target.cardIds = [...command.cardIds];
    } else if (command.kind === "collapse") {
      if (command.collapsed && !target.collapsed) {
        // The anchor is stable while stacked, including insertions. Once the
        // spread is gathered again, use its current location: its members may
        // have moved or changed since the previous gathering. Authored card
        // coordinates remain untouched, so expansion restores the same spread.
        const bounds = boundsOf(cards.filter(card => target.cardIds.includes(card.cardId)).map(card => card.layout));
        if (bounds) target.anchor = { x: bounds.x, y: bounds.y };
      }
      target.collapsed = command.collapsed;
    } else target.title = cleanTitle(command.title);
  }
  return { version: state.version + 1, collections: collections.filter(collection => collection.cardIds.length > 0) };
}

function cleanTitle(title: string): string { return title.trim().replace(/\s+/g, " ").slice(0, 120) || "Untitled collection"; }

export function collectionFor(collections: readonly SpatialCollection[], cardId: CardId) { return collections.find(collection => collection.cardIds.includes(cardId)); }

/** Collapse is a projection: the authored, expanded coordinates never change. */
export function projectCollections(cards: readonly DeskCard[], collections: readonly SpatialCollection[], lifted: ReadonlySet<CardId> = new Set(), origins?: ReadonlyMap<string, { x: number; y: number }>): readonly DeskCard[] {
  const projections = new Map<CardId, DeskCard>();
  collections.forEach(collection => {
    const members = collection.cardIds.map(id => cards.find(card => card.cardId === id)).filter((card): card is DeskCard => Boolean(card));
    const authored = boundsOf(members.map(card => card.layout));
    const bounds = origins?.get(collection.id) ?? (collection.collapsed && collection.anchor
      ? { ...collection.anchor, width: authored?.width ?? 0, height: authored?.height ?? 0 }
      : authored);
    if (!bounds) return;
    const baseZ = Math.max(0, ...members.map(card => card.z)) * 1000;
    members.forEach((card, index) => {
      if (lifted.has(card.cardId)) { projections.set(card.cardId, { ...card, z: 2147482000 }); return; }
      if (!collection.collapsed) { projections.set(card.cardId, { ...card, z: baseZ + index }); return; }
      // Keep the first authored card at the collection anchor. Later members
      // gather behind it; inserting one therefore cannot move the parent stack.
      const depth = Math.min(index, 7);
      projections.set(card.cardId, { ...card, z: baseZ + index, layout: { ...card.layout, x: bounds.x + depth * 18, y: bounds.y + depth * 13 } });
    });
  });
  return cards.map(card => projections.get(card.cardId) ?? { ...card, z: card.z * 1000 });
}

export function collectionBounds(collection: SpatialCollection, cards: readonly DeskCard[]): Rect | null {
  const ids = new Set(collection.cardIds);
  const bounds = boundsOf(cards.filter(card => ids.has(card.cardId)).map(card => card.layout));
  return bounds ? { x: bounds.x - 26, y: bounds.y - 64, width: Math.max(bounds.width + 52, 340), height: bounds.height + 90 } : null;
}

export function hitCollection(point: { x: number; y: number }, collections: readonly SpatialCollection[], cards: readonly DeskCard[], excluded: ReadonlySet<CardId>): SpatialCollection | undefined {
  return [...collections].reverse().find(collection => {
    if (collection.cardIds.every(id => excluded.has(id))) return false;
    const rect = collectionBounds(collection, cards.filter(card => !excluded.has(card.cardId)));
    return rect && point.x >= rect.x && point.y >= rect.y && point.x <= rect.x + rect.width && point.y <= rect.y + rect.height;
  });
}

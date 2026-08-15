import { rectsIntersect, type Rect } from "@/lib/desk/viewport";
import type { CardId, Layout } from "@/lib/world/model";

export type Selection = ReadonlySet<CardId>;

export const EMPTY_SELECTION: Selection = new Set<CardId>();

export const isSelected = (selection: Selection, id: CardId): boolean => selection.has(id);

export const only = (id: CardId): Selection => new Set([id]);

export function toggle(selection: Selection, id: CardId): Selection {
  const next = new Set(selection);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

export function add(selection: Selection, ids: readonly CardId[]): Selection {
  const next = new Set(selection);
  for (const id of ids) next.add(id);
  return next;
}

export const soleMember = (selection: Selection): CardId | null =>
  selection.size === 1 ? ([...selection][0] as CardId) : null;

type Placed = { readonly cardId: CardId; readonly layout: Layout };

/** Marquee hit test: a card is caught if it overlaps the band at all. */
export function within(cards: readonly Placed[], band: Rect): CardId[] {
  return cards.filter((card) => rectsIntersect(card.layout, band)).map((card) => card.cardId);
}

/**
 * Dot pitch that stays legible at any zoom. Without this the background moirés
 * into noise when zoomed out and looks like graph paper when zoomed in.
 */
export function gridStep(scale: number, minimumScreenPitch = 18): number {
  let step = 24;
  while (step * scale < minimumScreenPitch && step < 6144) step *= 2;
  while (step * scale > minimumScreenPitch * 4 && step > 6) step /= 2;
  return step;
}

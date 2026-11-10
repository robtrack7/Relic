import { CANVAS_GRID, materiallyContained } from "@/lib/desk/manipulation";
import type { Rect } from "@/lib/desk/viewport";
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

/** Marquee hit test: a grazing edge does not unexpectedly capture a card. */
export function within(cards: readonly Placed[], band: Rect): CardId[] {
  return cards.filter((card) => materiallyContained(card.layout, band)).map((card) => card.cardId);
}

/**
 * Shared visible-dot and snapping step. Power-of-two multiples of the base
 * world grid preserve one origin while keeping the screen pitch legible.
 */
export function gridStep(scale: number, minimumScreenPitch = 18): number {
  let step = CANVAS_GRID;
  while (step * scale < minimumScreenPitch && step < 6144) step *= 2;
  return step;
}

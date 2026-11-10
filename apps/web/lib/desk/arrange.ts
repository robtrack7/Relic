import { DEFAULT_CARD_HEIGHT, DEFAULT_CARD_WIDTH } from "@/lib/world/model";

import { rectsIntersect, type Point, type Rect } from "./viewport";

/**
 * Where things go on a composition.
 *
 * The Librarian emits semantic intents — put these together, put this beside
 * that — and this is the deterministic code that turns one into coordinates.
 * Nothing asks a model for a number of pixels: a model that could place a card
 * could also place it on top of another one, three screens away, or at a
 * coordinate that reads fine in a JSON blob and nowhere else.
 *
 * Pure, and deliberately so. It runs on the server inside a Librarian tool and
 * in the browser inside `useDesk`, which is the reason it is here rather than in
 * either — one placement algorithm, so a card the GM retrieves and a card the
 * Librarian brings land the same way.
 */

/** Breathing room between neighbouring cards, in world units. */
const GUTTER = 32;

/** How wide a cluster grows before it wraps. Four reads as a group; eight reads as a pile. */
const COLUMNS = 4;

/** How far a search for free space will walk before it settles for overlapping. */
const ATTEMPTS = 40;

export const DEFAULT_SIZE = { width: DEFAULT_CARD_WIDTH, height: DEFAULT_CARD_HEIGHT } as const;

const rectAt = (x: number, y: number): Rect => ({
  x: Math.round(x),
  y: Math.round(y),
  ...DEFAULT_SIZE
});

/** A rect grown by the gutter, so "clear" means clear with room to breathe. */
const padded = (rect: Rect): Rect => ({
  x: rect.x - GUTTER / 2,
  y: rect.y - GUTTER / 2,
  width: rect.width + GUTTER,
  height: rect.height + GUTTER
});

const clear = (candidate: Rect, occupied: readonly Rect[]): boolean =>
  !occupied.some((taken) => rectsIntersect(padded(candidate), taken));

/**
 * A block of positions centred on a point: a row of up to four, then the next.
 *
 * This is the shape retrieval has always used — the Library, following a
 * relationship, and the Librarian bringing something in all produce a group, and
 * a group should arrive looking like one. What is new is that it steps aside
 * from what is already there rather than landing on top of it.
 *
 * The whole block moves together when it collides, instead of each card finding
 * its own hole. A cluster that has been shuffled around obstacles is no longer a
 * cluster, and the reason to place them together was that they belong together.
 */
export function clusterAt(
  count: number,
  centre: Point,
  occupied: readonly Rect[] = []
): readonly Rect[] {
  if (count <= 0) return [];

  const columns = Math.min(count, COLUMNS);
  const rows = Math.ceil(count / columns);
  const stepX = DEFAULT_CARD_WIDTH + GUTTER;
  const stepY = DEFAULT_CARD_HEIGHT + GUTTER;
  const originX = centre.x - ((columns - 1) * stepX) / 2 - DEFAULT_CARD_WIDTH / 2;
  const originY = centre.y - ((rows - 1) * stepY) / 2 - DEFAULT_CARD_HEIGHT / 2;

  const block = (dx: number, dy: number): readonly Rect[] =>
    Array.from({ length: count }, (_, i) =>
      rectAt(
        originX + (i % columns) * stepX + dx,
        originY + Math.floor(i / columns) * stepY + dy
      )
    );

  for (const [dx, dy] of spiral(stepX, stepY)) {
    const candidate = block(dx, dy);
    if (candidate.every((rect) => clear(rect, occupied))) return candidate;
  }

  // Nowhere clear within reach. Land on the centre anyway rather than drifting
  // off to wherever the world happens to be empty — the GM asked for it *here*,
  // and something overlapping in front of them beats something tidy they have to
  // go and find.
  return block(0, 0);
}

/**
 * Immediately to the right of an anchor, dropping down past anything in the way.
 *
 * The gesture behind this is "and here is the thing you just asked about" —
 * following a relationship, or the Librarian answering with a person it went and
 * fetched. Beside is what keeps the anchor and the arrival readable together, so
 * the search prefers staying on the same line over finding the nearest gap.
 */
export function beside(anchor: Rect, occupied: readonly Rect[] = []): Rect {
  const x = anchor.x + anchor.width + GUTTER;
  const stepY = DEFAULT_CARD_HEIGHT + GUTTER;

  for (let step = 0; step < ATTEMPTS; step += 1) {
    // Alternate below and above the anchor, nearest first, so the arrival stays
    // as close to eye level as the space allows.
    const offset = Math.ceil(step / 2) * (step % 2 === 1 ? 1 : -1) * stepY;
    const candidate = rectAt(x, anchor.y + offset);
    if (clear(candidate, occupied)) return candidate;
  }

  return rectAt(x, anchor.y);
}

/**
 * Tidy things that already exist into a group, in the order given.
 *
 * `arrange` calls this: the Librarian says "put everyone from the lighthouse
 * together" and the cards it named move, while everything it did not name stays
 * exactly where the GM left it. That is why the moving set is excluded from
 * `occupied` by the caller — a card cannot be an obstacle to itself.
 */
export function gather(
  count: number,
  centre: Point,
  occupied: readonly Rect[] = []
): readonly Rect[] {
  return clusterAt(count, centre, occupied);
}

/** The centre of a set of rects — where a gathered group belongs by default. */
export function middleOf(rects: readonly Rect[]): Point {
  if (rects.length === 0) return { x: 0, y: 0 };

  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (const rect of rects) {
    left = Math.min(left, rect.x);
    top = Math.min(top, rect.y);
    right = Math.max(right, rect.x + rect.width);
    bottom = Math.max(bottom, rect.y + rect.height);
  }
  return { x: (left + right) / 2, y: (top + bottom) / 2 };
}

/**
 * Offsets to try, nearest first: right, down, left, up, then further out.
 *
 * A square spiral rather than a scan, because the point of the offset is to stay
 * near where the GM was looking. Walking right until a gap appears would put a
 * two-card cluster half a screen away the first time anything was in the way.
 */
function* spiral(stepX: number, stepY: number): Generator<readonly [number, number]> {
  yield [0, 0];
  for (let ring = 1; ring <= 5; ring += 1) {
    for (const [ux, uy] of [
      [1, 0],
      [0, 1],
      [-1, 0],
      [0, -1],
      [1, 1],
      [-1, 1],
      [1, -1],
      [-1, -1]
    ] as const) {
      yield [ux * ring * stepX, uy * ring * stepY];
    }
  }
}

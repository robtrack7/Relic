// @vitest-environment node
import { describe, expect, it } from "vitest";

import { beside, clusterAt, DEFAULT_SIZE, middleOf } from "@/lib/desk/arrange";
import { rectsIntersect, type Rect } from "@/lib/desk/viewport";

/**
 * Layout is the Librarian's hands made deterministic.
 *
 * `BUILD.md` settles that the model emits semantic intents — put these together,
 * put this beside that — and that Relic's own code turns them into coordinates.
 * This is that code's specification, and it is a pure one on purpose: no
 * database, no model, no React. The properties worth holding are that a group
 * reads as a group, that nothing lands on top of what is already there, and that
 * placement stays near where the GM was looking.
 */

const at = (x: number, y: number): Rect => ({ x, y, ...DEFAULT_SIZE });

const overlapping = (rects: readonly Rect[]): boolean =>
  rects.some((a, i) => rects.some((b, j) => i !== j && rectsIntersect(a, b)));

describe("bringing a group somewhere", () => {
  it("centres a single card on the point asked for", () => {
    const [only] = clusterAt(1, { x: 500, y: 300 });

    expect(only).toBeDefined();
    expect(only!.x + only!.width / 2).toBe(500);
    expect(only!.y + only!.height / 2).toBe(300);
  });

  it("lays a small group out in one row", () => {
    const spots = clusterAt(3, { x: 0, y: 0 });

    expect(spots).toHaveLength(3);
    // A group should read as a group: same line, left to right.
    expect(new Set(spots.map((s) => s.y)).size).toBe(1);
    expect(spots[0]!.x).toBeLessThan(spots[1]!.x);
    expect(spots[1]!.x).toBeLessThan(spots[2]!.x);
  });

  it("wraps past four rather than growing one long line", () => {
    const spots = clusterAt(6, { x: 0, y: 0 });

    expect(new Set(spots.map((s) => s.y)).size).toBe(2);
    expect(new Set(spots.map((s) => s.x)).size).toBe(4);
  });

  it("never overlaps within the group", () => {
    for (const count of [2, 4, 5, 9, 12]) {
      expect(overlapping(clusterAt(count, { x: 0, y: 0 }))).toBe(false);
    }
  });

  it("steps aside from what is already on the composition", () => {
    const occupied = [at(-130, -80)];
    const spots = clusterAt(2, { x: 0, y: 0 }, occupied);

    for (const spot of spots) {
      expect(occupied.some((taken) => rectsIntersect(spot, taken))).toBe(false);
    }
  });

  it("moves the whole block rather than scattering it around obstacles", () => {
    const occupied = [at(-130, -80)];
    const spots = clusterAt(3, { x: 0, y: 0 }, occupied);

    // Displaced together, so what arrived together still reads as one thing.
    expect(new Set(spots.map((s) => s.y)).size).toBe(1);
  });

  it("stays near where the GM was looking rather than fleeing to open space", () => {
    // A wall of cards immediately right of the centre.
    const occupied = Array.from({ length: 6 }, (_, i) => at(-130, -80 + i * 40));
    const spots = clusterAt(2, { x: 0, y: 0 }, occupied);
    const centre = middleOf(spots);

    // Within a couple of card-widths, not half a screen.
    expect(Math.abs(centre.x)).toBeLessThan(DEFAULT_SIZE.width * 3);
    expect(Math.abs(centre.y)).toBeLessThan(DEFAULT_SIZE.height * 3);
  });

  it("asks for nothing when nothing was wanted", () => {
    expect(clusterAt(0, { x: 0, y: 0 })).toEqual([]);
  });

  it("lands on the point when there is nowhere clear at all", () => {
    // Every reachable offset is taken. Overlapping in front of the GM beats
    // tidy somewhere they would have to go looking.
    const wall: Rect[] = [];
    for (let x = -4000; x <= 4000; x += 100) {
      for (let y = -3000; y <= 3000; y += 100) wall.push(at(x, y));
    }
    const [only] = clusterAt(1, { x: 0, y: 0 }, wall);

    expect(only!.x + only!.width / 2).toBe(0);
    expect(only!.y + only!.height / 2).toBe(0);
  });
});

describe("putting one thing beside another", () => {
  it("places it to the right, on the same line", () => {
    const anchor = at(0, 0);
    const spot = beside(anchor);

    expect(spot.x).toBeGreaterThan(anchor.x + anchor.width);
    expect(spot.y).toBe(anchor.y);
    expect(rectsIntersect(spot, anchor)).toBe(false);
  });

  it("keeps the same line when the space is free, whatever else exists", () => {
    const anchor = at(0, 0);
    const elsewhere = [at(2000, 2000)];

    expect(beside(anchor, elsewhere).y).toBe(anchor.y);
  });

  it("drops past something already in that spot", () => {
    const anchor = at(0, 0);
    const taken = beside(anchor);
    const spot = beside(anchor, [anchor, taken]);

    expect(rectsIntersect(spot, taken)).toBe(false);
    // Still to the right — beside is what makes the pair readable together, so
    // it gives up vertical position before it gives up the line.
    expect(spot.x).toBe(taken.x);
  });

  it("stays as close to eye level as the space allows", () => {
    const anchor = at(0, 0);
    const taken = beside(anchor);
    const spot = beside(anchor, [anchor, taken]);

    expect(Math.abs(spot.y - anchor.y)).toBeLessThanOrEqual(
      (DEFAULT_SIZE.height + 32) * 1.5
    );
  });
});

describe("finding the middle of things", () => {
  it("is the centre of their bounds, not the mean of their corners", () => {
    // One wide card and one narrow one: averaging origins would drift left.
    const middle = middleOf([
      { x: 0, y: 0, width: 100, height: 100 },
      { x: 100, y: 0, width: 300, height: 100 }
    ]);

    expect(middle).toEqual({ x: 200, y: 50 });
  });

  it("has an answer for nothing at all", () => {
    expect(middleOf([])).toEqual({ x: 0, y: 0 });
  });
});

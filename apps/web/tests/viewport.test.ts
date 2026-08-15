import { describe, expect, it } from "vitest";

import {
  boundsOf,
  clampScale,
  fitToBounds,
  MAX_SCALE,
  MIN_SCALE,
  panBy,
  rectFromCorners,
  rectsIntersect,
  screenToWorld,
  worldToScreen,
  zoomAt,
  zoomBy,
  type Viewport
} from "@/lib/desk/viewport";
import { gridStep } from "@/lib/desk/selection";

const vp = (x: number, y: number, scale: number): Viewport => ({ x, y, scale });

describe("screen and world coordinates", () => {
  it("round-trips through both transforms", () => {
    const viewport = vp(-140, 62, 1.75);
    const world = { x: 312.5, y: -88.25 };
    const back = screenToWorld(viewport, worldToScreen(viewport, world));
    expect(back.x).toBeCloseTo(world.x, 10);
    expect(back.y).toBeCloseTo(world.y, 10);
  });

  it("matches the CSS transform it stands in for", () => {
    // translate(x, y) scale(s) applied to a child at world (wx, wy).
    const viewport = vp(30, -10, 2);
    expect(worldToScreen(viewport, { x: 100, y: 50 })).toEqual({ x: 230, y: 90 });
  });

  it("pans in screen pixels regardless of zoom", () => {
    expect(panBy(vp(0, 0, 3), 25, -40)).toEqual({ x: 25, y: -40, scale: 3 });
  });
});

describe("zooming", () => {
  it("keeps the world point under the cursor fixed", () => {
    const viewport = vp(-220, 90, 0.8);
    const anchor = { x: 640, y: 300 };
    const before = screenToWorld(viewport, anchor);
    const after = screenToWorld(zoomAt(viewport, anchor, 2.4), anchor);
    expect(after.x).toBeCloseTo(before.x, 8);
    expect(after.y).toBeCloseTo(before.y, 8);
  });

  it("clamps rather than running away", () => {
    expect(clampScale(1e9)).toBe(MAX_SCALE);
    expect(clampScale(0)).toBe(MIN_SCALE);
    expect(clampScale(Number.NaN)).toBe(1);
    expect(zoomBy(vp(0, 0, MAX_SCALE), { x: 0, y: 0 }, 4).scale).toBe(MAX_SCALE);
    expect(zoomBy(vp(0, 0, MIN_SCALE), { x: 0, y: 0 }, 0.01).scale).toBe(MIN_SCALE);
  });

  it("is a no-op when the clamped scale does not change", () => {
    const viewport = vp(12, 34, MAX_SCALE);
    expect(zoomBy(viewport, { x: 5, y: 5 }, 10)).toBe(viewport);
  });
});

describe("fitting", () => {
  it("centres content in the viewport", () => {
    const bounds = { x: 0, y: 0, width: 400, height: 200 };
    const size = { width: 1000, height: 600 };
    const fitted = fitToBounds(bounds, size, 50);
    const centre = worldToScreen(fitted, { x: 200, y: 100 });
    expect(centre.x).toBeCloseTo(500, 6);
    expect(centre.y).toBeCloseTo(300, 6);
  });

  it("resets to a centred origin when there is nothing to frame", () => {
    expect(fitToBounds(null, { width: 800, height: 400 })).toEqual({
      x: 400,
      y: 200,
      scale: 1
    });
  });

  it("brings distant material into view without magnifying it", () => {
    // A board holding one card opens at its natural size. Filling the screen
    // with a single card would be a worse first impression than empty space.
    const one = fitToBounds({ x: 0, y: 0, width: 260, height: 160 }, { width: 1400, height: 900 });
    expect(one.scale).toBe(1);

    const speck = fitToBounds({ x: 0, y: 0, width: 1, height: 1 }, { width: 1000, height: 800 });
    expect(speck.scale).toBe(1);
    expect(speck.scale).toBeLessThan(MAX_SCALE);
  });

  it("shrinks to frame content larger than the viewport", () => {
    const wide = fitToBounds({ x: 0, y: 0, width: 4000, height: 400 }, { width: 1000, height: 800 });
    expect(wide.scale).toBeLessThan(1);
    expect(wide.scale).toBeGreaterThan(MIN_SCALE);
  });
});

describe("bounds and hit testing", () => {
  it("unions rectangles including negative coordinates", () => {
    expect(
      boundsOf([
        { x: -50, y: 10, width: 20, height: 20 },
        { x: 100, y: -40, width: 10, height: 5 }
      ])
    ).toEqual({ x: -50, y: -40, width: 160, height: 70 });
  });

  it("has no bounds for an empty desk", () => {
    expect(boundsOf([])).toBeNull();
  });

  it("treats touching edges as not intersecting", () => {
    const a = { x: 0, y: 0, width: 10, height: 10 };
    expect(rectsIntersect(a, { x: 10, y: 0, width: 10, height: 10 })).toBe(false);
    expect(rectsIntersect(a, { x: 9.9, y: 0, width: 10, height: 10 })).toBe(true);
  });

  it("normalises a drag made in any direction", () => {
    expect(rectFromCorners({ x: 100, y: 80 }, { x: 20, y: 200 })).toEqual({
      x: 20,
      y: 80,
      width: 80,
      height: 120
    });
  });
});

describe("grid pitch", () => {
  it("stays inside a legible screen range at any zoom", () => {
    for (const scale of [MIN_SCALE, 0.25, 0.5, 1, 2, MAX_SCALE]) {
      const pitch = gridStep(scale) * scale;
      expect(pitch).toBeGreaterThanOrEqual(18);
      expect(pitch).toBeLessThanOrEqual(18 * 4);
    }
  });
});

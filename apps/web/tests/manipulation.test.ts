// @vitest-environment node
import { describe, expect, it } from "vitest";

import {
  axisAnchors,
  boundsFor,
  materiallyContained,
  snapCoordinate
} from "@/lib/desk/manipulation";

describe("canvas marquee selection", () => {
  const card = { x: 100, y: 100, width: 200, height: 120 };

  it("accepts a materially contained placement", () => {
    expect(materiallyContained(card, { x: 80, y: 80, width: 190, height: 180 })).toBe(true);
  });

  it("ignores a grazing intersection", () => {
    expect(materiallyContained(card, { x: 290, y: 90, width: 50, height: 150 })).toBe(false);
  });
});

describe("canvas snapping", () => {
  it("prefers nearby object alignment over the grid", () => {
    expect(snapCoordinate(101.5, [100], 1)).toEqual({ value: 100, guide: 100 });
  });

  it("falls back to the eight point world grid", () => {
    expect(snapCoordinate(101.5, [], 1)).toEqual({ value: 104, guide: null });
  });

  it("can be bypassed for rough placement", () => {
    expect(snapCoordinate(101.5, [100], 1, true)).toEqual({ value: 101.5, guide: null });
  });

  it("finds edge and centre anchors", () => {
    expect(axisAnchors({ x: 10, y: 20, width: 100, height: 40 }, "x")).toEqual([10, 60, 110]);
    expect(axisAnchors({ x: 10, y: 20, width: 100, height: 40 }, "y")).toEqual([20, 40, 60]);
  });
});

describe("multi-selection bounds", () => {
  it("wraps every selected placement", () => {
    expect(
      boundsFor([
        { x: -20, y: 10, width: 40, height: 30 },
        { x: 80, y: -10, width: 20, height: 80 }
      ])
    ).toEqual({ x: -20, y: -10, width: 120, height: 80 });
  });
});

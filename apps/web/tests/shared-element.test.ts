import { describe, expect, it } from "vitest";
import { travelFrames, type Box } from "@/lib/motion/shared-element";

/** Where the first frame's visible (clipped) region lands on screen. */
function firstFrameVisible(frames: Keyframe[], to: Box, k: number): Box {
  const [, tx, ty, s] = String(frames[0]!.transform).match(/translate\(([-\d.e]+)px, ([-\d.e]+)px\) scale\(([-\d.e]+)\)/)!.map(Number);
  const [top, right, , left] = String(frames[0]!.clipPath).match(/-?\d+(?:\.\d+)?(?:e-?\d+)?/g)!.map(Number);
  const localWidth = to.width / k, localHeight = to.height / k;
  return {
    x: to.x + k * (tx! + s! * left!),
    y: to.y + k * (ty! + s! * top!),
    width: k * s! * (localWidth - left! - right!),
    height: k * s! * (localHeight - 2 * top!),
  };
}

describe("shared-element travel", () => {
  const close = (actual: Box, expected: Box) => {
    for (const key of ["x", "y", "width", "height"] as const) expect(actual[key]).toBeCloseTo(expected[key], 4);
  };

  it("starts a picture exactly over its source frame, cropped to the source aspect, without stretching", () => {
    const from = { box: { x: 120, y: 180, width: 340, height: 265 }, fontSize: 14 };
    const to = { x: 218, y: 181, width: 143, height: 252 };
    const frames = travelFrames("media", from, to, 1, 14)!;
    close(firstFrameVisible(frames, to, 1), from.box);
    // One scale for both axes: the picture is cropped, never squashed.
    expect(String(frames[0]!.transform)).toMatch(/scale\([\d.]+\)$/);
    expect(frames[1]).toMatchObject({ transform: "none", clipPath: "inset(0px 0px 0px 0px)" });
  });

  it("holds inside a zoomed canvas plane, where local pixels are not screen pixels", () => {
    const from = { box: { x: 40, y: 60, width: 200, height: 150 }, fontSize: 14 };
    const to = { x: 300, y: 90, width: 120, height: 160 };
    const k = 0.6;
    close(firstFrameVisible(travelFrames("media", from, to, k, 14)!, to, k), from.box);
  });

  it("carries a title by its type size from the source's top-left", () => {
    const frames = travelFrames("title", { box: { x: 10, y: 20, width: 100, height: 24 }, fontSize: 23 }, { x: 110, y: 40, width: 140, height: 32 }, 1, 30)!;
    expect(frames[0]!.transform).toBe(`translate(-100px, -20px) scale(${23 / 30})`);
    expect(frames[1]!.transform).toBe("none");
  });

  it("does nothing when the part has not moved", () => {
    const box = { x: 10, y: 10, width: 100, height: 80 };
    expect(travelFrames("media", { box, fontSize: 14 }, box, 1, 14)).toBeNull();
  });
});

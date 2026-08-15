// @vitest-environment node
import { describe, expect, it } from "vitest";

import {
  claimBudget,
  FAR_EDGE,
  HYSTERESIS,
  NEAR_EDGE,
  tierFor,
  type Tier
} from "@/lib/desk/zoom";

describe("semantic zoom tiers", () => {
  it("reads the obvious scales without any history", () => {
    expect(tierFor(0.2)).toBe("far");
    expect(tierFor(1)).toBe("mid");
    expect(tierFor(3)).toBe("near");
  });

  it("does not flicker while a scale sits on a boundary", () => {
    // A trackpad pinch crossing exactly FAR_EDGE would otherwise rewrite every
    // card on every frame.
    let tier: Tier = "mid";
    const wobble = [FAR_EDGE, FAR_EDGE + 0.01, FAR_EDGE - 0.01, FAR_EDGE, FAR_EDGE + 0.02];
    for (const scale of wobble) {
      tier = tierFor(scale, tier);
      expect(tier).toBe("mid");
    }

    tier = "far";
    for (const scale of wobble) {
      tier = tierFor(scale, tier);
      expect(tier).toBe("far");
    }
  });

  it("costs more to leave a tier than to stay in it", () => {
    // Entering `far` from `mid` needs a decisive move past the edge...
    expect(tierFor(FAR_EDGE - HYSTERESIS, "mid")).toBe("far");
    expect(tierFor(FAR_EDGE - HYSTERESIS + 0.001, "mid")).toBe("mid");

    // ...and leaving it again needs an equally decisive one the other way.
    expect(tierFor(FAR_EDGE + HYSTERESIS, "far")).toBe("mid");
    expect(tierFor(FAR_EDGE + HYSTERESIS - 0.001, "far")).toBe("far");
  });

  it("applies the same rule at the near boundary", () => {
    expect(tierFor(NEAR_EDGE + HYSTERESIS, "mid")).toBe("near");
    expect(tierFor(NEAR_EDGE + HYSTERESIS - 0.001, "mid")).toBe("mid");
    expect(tierFor(NEAR_EDGE - HYSTERESIS, "near")).toBe("mid");
    expect(tierFor(NEAR_EDGE - HYSTERESIS + 0.001, "near")).toBe("near");
  });

  it("crosses two boundaries in one step when the scale jumps past both", () => {
    // Fit-to-bounds can move the scale from 0.2 to 4 at once. A tier that
    // advanced only one level would stay a level short until something else
    // happened to move the scale again.
    expect(tierFor(4, "far")).toBe("near");
    expect(tierFor(0.1, "near")).toBe("far");
  });

  it("is stable: feeding a tier back in never moves it again", () => {
    for (const scale of [0.1, 0.4, 0.45, 0.5, 1, 1.4, 1.45, 4]) {
      for (const start of ["far", "mid", "near"] as const) {
        const settled = tierFor(scale, start);
        expect(tierFor(scale, settled)).toBe(settled);
      }
    }
  });

  it("keeps the tier it had when handed nonsense", () => {
    expect(tierFor(Number.NaN, "near")).toBe("near");
    expect(tierFor(Number.POSITIVE_INFINITY, "far")).toBe("far");
  });

  it("budgets claims by how close the reader has come", () => {
    expect(claimBudget("far")).toBe(0);
    expect(claimBudget("mid")).toBe(4);
    expect(claimBudget("near")).toBe(Number.POSITIVE_INFINITY);
  });
});

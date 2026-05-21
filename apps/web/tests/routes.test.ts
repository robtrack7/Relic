import { describe, expect, it } from "vitest";
import { requireHierarchyMatch, validateHierarchyParams } from "@/lib/routes";

const params = { workspaceId: "w1", worldId: "world1", sagaId: "s1" };

describe("route hierarchy guards", () => {
  it("accepts matching route IDs", () => {
    expect(validateHierarchyParams(params, params)).toBe(true);
  });

  it("rejects sibling Saga route IDs", () => {
    const sibling = { ...params, sagaId: "s2" };
    expect(validateHierarchyParams(params, sibling)).toBe(false);
    expect(() => requireHierarchyMatch(params, sibling)).toThrow(/must match/);
  });
});

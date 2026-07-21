import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
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

  it("keeps the MVP web route surface present", () => {
    const routeFiles = [
      "app/app/new-saga/[creationSessionId]/page.tsx",
      "app/app/w/[workspaceId]/settings/page.tsx",
      "app/app/w/[workspaceId]/world/[worldId]/settings/page.tsx",
      "app/app/w/[workspaceId]/world/[worldId]/saga/[sagaId]/export/page.tsx",
      "app/app/w/[workspaceId]/world/[worldId]/saga/[sagaId]/guide/page.tsx",
      "app/app/w/[workspaceId]/world/[worldId]/saga/[sagaId]/imports/page.tsx",
      "app/app/w/[workspaceId]/world/[worldId]/saga/[sagaId]/sessions/[sessionId]/review/page.tsx"
    ];

    for (const routeFile of routeFiles) {
      expect(existsSync(join(process.cwd(), routeFile)), routeFile).toBe(true);
    }
  });
});

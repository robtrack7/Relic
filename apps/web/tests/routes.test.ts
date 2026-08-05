import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { recordPath, requireHierarchyMatch, validateHierarchyParams } from "@/lib/routes";

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

  it("routes Library records, Threads, and Sessions to their canonical surfaces", () => {
    const root = "/app/w/w1/world/world1/saga/s1";
    expect(recordPath(root, "character", "c1")).toBe(`${root}/entities/character/c1`);
    expect(recordPath(root, "thread", "t1")).toBe(`${root}/threads/t1`);
    expect(recordPath(root, "session", "s-ready", "ready")).toBe(`${root}/sessions/s-ready/prep`);
    expect(recordPath(root, "session", "s-live", "in_progress")).toBe(`${root}/sessions/s-live/stage`);
    expect(recordPath(root, "session", "s-ended", "ended")).toBe(`${root}/sessions/s-ended/review`);
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

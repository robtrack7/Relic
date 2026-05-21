import { describe, expect, it } from "vitest";
import { normalizeScope, scopedPayload } from "@/lib/entities";

describe("entity scope payloads", () => {
  it("keeps World canon saga_id null", () => {
    expect(scopedPayload("world", "saga-a")).toEqual({ scope: "world", saga_id: null });
  });

  it("keeps Saga canon saga_id populated", () => {
    expect(scopedPayload("saga", "saga-a")).toEqual({ scope: "saga", saga_id: "saga-a" });
  });

  it("defaults form scope to Saga", () => {
    expect(normalizeScope(null)).toBe("saga");
  });
});

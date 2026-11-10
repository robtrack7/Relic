import { describe, expect, it } from "vitest";
import { relationshipCardinality, relationshipGroup, relationshipPhrase, relationshipTypeFor } from "@/components/world-objects/relationship-types";

describe("relationship type registry", () => {
  it("resolves built-in forward and key forms", () => {
    expect(relationshipTypeFor("member-of")?.inverse).toBe("has member");
    expect(relationshipTypeFor("is a member of")?.group).toBe("Politics");
  });

  it("keeps custom predicates custom", () => {
    expect(relationshipGroup("sends dreams to")).toBe("Custom");
  });

  it("keeps focal perspective for incoming and symmetric predicates", () => {
    expect(relationshipPhrase("protects", "out")).toBe("protects");
    expect(relationshipPhrase("protects", "in")).toBe("is protected by");
    expect(relationshipPhrase("adjacent-to", "in")).toBe("is adjacent to");
    expect(relationshipPhrase("sends dreams to", "in")).toBe("sends dreams to");
  });

  it("keeps known single-valued attributes narrow while relationships default to many", () => {
    expect(relationshipCardinality("location")).toBe("one");
    expect(relationshipCardinality("allegiance")).toBe("one");
    expect(relationshipCardinality("knows")).toBe("many");
    expect(relationshipCardinality("custom-connects")).toBe("many");
  });
});

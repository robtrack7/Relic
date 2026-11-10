import type { RepresentationKind } from "./model";

/** The semantic vocabulary shared by UI, persistence, and projections. */
export type RelationshipCardinality = "one" | "many";

export type RelationshipType = Readonly<{
  key: string;
  label: string;
  inverse: string;
  group: "Social" | "Politics" | "Spatial" | "Possession" | "Narrative" | "Custom";
  symmetric?: boolean;
  cardinality?: RelationshipCardinality;
  from?: readonly RepresentationKind[];
  to?: readonly RepresentationKind[];
}>;

export const RELATIONSHIP_TYPES: readonly RelationshipType[] = [
  { key: "knows", label: "knows", inverse: "is known by", group: "Social" },
  { key: "owes-debt-to", label: "owes a debt to", inverse: "is owed a debt by", group: "Social" },
  { key: "member-of", label: "is a member of", inverse: "has member", group: "Politics", from: ["character", "faction"], to: ["faction"] },
  { key: "allegiance", label: "allegiance", inverse: "has allegiance", group: "Politics", cardinality: "one" },
  { key: "leads", label: "leads", inverse: "is led by", group: "Politics" },
  { key: "allied-with", label: "is allied with", inverse: "is allied with", group: "Politics", symmetric: true },
  { key: "opposed-to", label: "is opposed to", inverse: "is opposed to", group: "Politics", symmetric: true },
  { key: "location", label: "location", inverse: "contains", group: "Spatial", cardinality: "one" },
  { key: "located-at", label: "is located at", inverse: "contains", group: "Spatial" },
  { key: "adjacent-to", label: "is adjacent to", inverse: "is adjacent to", group: "Spatial", symmetric: true },
  { key: "owns", label: "owns", inverse: "is owned by", group: "Possession" },
  { key: "created-by", label: "was created by", inverse: "created", group: "Possession" },
  { key: "protects", label: "protects", inverse: "is protected by", group: "Narrative" },
  { key: "involved-with", label: "is involved with", inverse: "is involved with", group: "Narrative", symmetric: true },
  { key: "threatened-by", label: "is threatened by", inverse: "threatens", group: "Narrative" },
  { key: "seeks", label: "seeks", inverse: "is sought by", group: "Narrative" }
];

export function relationshipTypeFor(label: string): RelationshipType | undefined {
  const normalized = label.trim().toLocaleLowerCase();
  return RELATIONSHIP_TYPES.find((type) => type.label === normalized || type.key === normalized);
}

export function relationshipGroup(label: string): RelationshipType["group"] {
  return relationshipTypeFor(label)?.group ?? "Custom";
}

/** Unknown relationship predicates are deliberately many-valued. */
export function relationshipCardinality(label: string): RelationshipCardinality {
  return relationshipTypeFor(label)?.cardinality ?? "many";
}

/**
 * Resolve the phrase shown from the current object's point of view. Custom
 * predicates have no declared inverse, so their authored wording is retained.
 */
export function relationshipPhrase(label: string, direction: "out" | "in"): string {
  const type = relationshipTypeFor(label);
  if (type) return direction === "out" ? type.label : type.inverse;
  return label.trim();
}

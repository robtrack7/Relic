import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { bundleRelationshipLinks, SemanticRelationshipEdge } from "@/components/world-objects/semantic-relationship-edge";
import { asClaimId, asWorldObjectId, type Link } from "@/lib/world/model";

const other = { objectId: asWorldObjectId("edge-other"), label: "Watcher’s Spire", kind: "place" as const };
const edge = (claimKind: string, direction: Link["direction"]): Link => ({ claimId: asClaimId(`edge-${claimKind}-${direction}`), claimKind, direction, other, truthState: "pencil" });

describe("SemanticRelationshipEdge", () => {
  it("points an incoming directed claim toward the focal object", () => {
    const { container } = render(<svg><SemanticRelationshipEdge link={edge("protects", "in")} x1={10} y1={10} x2={100} y2={10}/></svg>);
    const path = container.querySelectorAll("path")[1];
    expect(path?.getAttribute("marker-start")).toContain("relic-semantic-arrow");
    expect(path?.getAttribute("marker-end")).toBeNull();
  });

  it("does not invent arrows for symmetric predicates", () => {
    const { container } = render(<svg><SemanticRelationshipEdge link={edge("adjacent-to", "out")} x1={10} y1={10} x2={100} y2={10}/></svg>);
    const path = container.querySelectorAll("path")[1];
    expect(path?.getAttribute("marker-start")).toBeNull();
    expect(path?.getAttribute("marker-end")).toBeNull();
  });

  it("keeps authored direction for custom predicates", () => {
    const { container } = render(<svg><SemanticRelationshipEdge link={edge("sends dreams to", "out")} x1={10} y1={10} x2={100} y2={10}/></svg>);
    expect(container.querySelectorAll("path")[1]?.getAttribute("marker-end")).toContain("relic-semantic-arrow");
  });

  it("bundles multiple predicates between the same projected endpoints", () => {
    const first = edge("knows", "out");
    const second = edge("protects", "out");
    const bundles = bundleRelationshipLinks([first, second]);
    expect(bundles).toHaveLength(1);
    expect(bundles[0]?.links).toHaveLength(2);
  });

  it("offsets bundled lines while retaining the supplied endpoint geometry", () => {
    const { container } = render(<svg><SemanticRelationshipEdge link={edge("protects", "out")} x1={10} y1={10} x2={100} y2={10} bundleIndex={0} bundleCount={2}/></svg>);
    const path = container.querySelectorAll("path")[1];
    expect(path?.getAttribute("d")).toContain("M10 6.5");
    expect(path?.getAttribute("d")).toContain("100 6.5");
  });

  it("renders curved labelled bundle summaries with explicit pending state", () => {
    const { container } = render(<svg><SemanticRelationshipEdge link={edge("protects", "out")} x1={10} y1={10} x2={100} y2={10} bundleCount={3}/></svg>);
    const curved = [...container.querySelectorAll("path")].find(path => path.getAttribute("d")?.includes("Q"));
    expect(curved?.getAttribute("d")).toContain("Q");
    expect(container.querySelector("text")?.textContent).toContain("3 relationships");
    expect(container.querySelector("text")?.textContent).toContain("pending");
    expect(container.querySelector("g")?.getAttribute("aria-label")).toContain("3 relationships");
  });
});

import { expect, it } from "vitest";
import { relationshipLabelPosition } from "@/lib/desk/relationship-layout";

it("keeps a readable relationship caption out of closely spaced endpoint cards", () => {
  const cards = [{ x: 0, y: 0, width: 340, height: 300 }, { x: 400, y: 0, width: 340, height: 300 }];
  const point = relationshipLabelPosition({ start: { x: 340, y: 150 }, end: { x: 400, y: 150 }, endpoints: cards, obstacles: cards, width: 220 });
  expect(point.y - 14).toBeGreaterThan(300);
  const blocked = relationshipLabelPosition({ start: { x: 340, y: 150 }, end: { x: 400, y: 150 }, endpoints: cards, obstacles: [...cards, { x: 0, y: 305, width: 740, height: 80 }], width: 220 });
  expect(blocked.y + 14).toBeLessThan(0);
});

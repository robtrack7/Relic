import type { Point, Rect } from "./viewport";

/** Find a nearby clear label position; moving a card never moves the camera. */
export function relationshipLabelPosition({ start, end, endpoints, obstacles, occupied = [], width, height = 28 }: {
  start: Point; end: Point; endpoints: readonly Rect[]; obstacles: readonly Rect[]; occupied?: readonly Rect[]; width: number; height?: number;
}): Point {
  const middle = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
  const candidates = [middle,
    { x: middle.x, y: Math.max(...endpoints.map(rect => rect.y + rect.height)) + height / 2 + 10 },
    { x: middle.x, y: Math.min(...endpoints.map(rect => rect.y)) - height / 2 - 10 },
    { x: Math.min(...endpoints.map(rect => rect.x)) - width / 2 - 10, y: middle.y },
    { x: Math.max(...endpoints.map(rect => rect.x + rect.width)) + width / 2 + 10, y: middle.y }
  ];
  const score = (point: Point) => {
    const left = point.x - width / 2 - 5, top = point.y - height / 2 - 5;
    const overlap = [...obstacles, ...occupied].reduce((area, rect) => area + Math.max(0, Math.min(left + width + 10, rect.x + rect.width) - Math.max(left, rect.x)) * Math.max(0, Math.min(top + height + 10, rect.y + rect.height) - Math.max(top, rect.y)), 0);
    return overlap * 10000 + Math.hypot(point.x - middle.x, point.y - middle.y);
  };
  return candidates.reduce((best, point) => score(point) < score(best) ? point : best);
}

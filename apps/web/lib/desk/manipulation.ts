import type { Rect } from "@/lib/desk/viewport";

export const CANVAS_GRID = 8;

export type AxisGuide = {
  axis: "x" | "y";
  position: number;
};

export type SnapCoordinate = {
  value: number;
  guide: number | null;
};

export function intersectionArea(a: Rect, b: Rect): number {
  const width = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  const height = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  return width * height;
}

/**
 * Marquee selection should be deliberate. A grazing edge does not capture a
 * card; most of the placement must be inside the band.
 */
export function materiallyContained(rect: Rect, band: Rect, threshold = 0.6): boolean {
  const area = rect.width * rect.height;
  return area > 0 && intersectionArea(rect, band) / area >= threshold;
}

export function snapCoordinate(
  value: number,
  candidates: readonly number[],
  scale: number,
  bypass = false,
  grid = CANVAS_GRID
): SnapCoordinate {
  if (bypass) return { value, guide: null };

  const tolerance = 6 / Math.max(scale, 0.01);
  let closest: { value: number; distance: number } | null = null;
  for (const candidate of candidates) {
    const distance = Math.abs(candidate - value);
    if (distance <= tolerance && (!closest || distance < closest.distance)) {
      closest = { value: candidate, distance };
    }
  }

  if (closest) return { value: closest.value, guide: closest.value };
  return { value: Math.round(value / grid) * grid, guide: null };
}

export function axisAnchors(rect: Rect, axis: "x" | "y"): readonly number[] {
  const start = axis === "x" ? rect.x : rect.y;
  const extent = axis === "x" ? rect.width : rect.height;
  return [start, start + extent / 2, start + extent];
}

export function boundsFor(rects: readonly Rect[]): Rect | null {
  if (rects.length === 0) return null;
  const left = Math.min(...rects.map((rect) => rect.x));
  const top = Math.min(...rects.map((rect) => rect.y));
  const right = Math.max(...rects.map((rect) => rect.x + rect.width));
  const bottom = Math.max(...rects.map((rect) => rect.y + rect.height));
  return { x: left, y: top, width: right - left, height: bottom - top };
}

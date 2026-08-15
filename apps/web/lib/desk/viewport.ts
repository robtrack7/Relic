/**
 * Canvas math for the Desk.
 *
 * Convention: `screen = world * scale + offset`, so the transform maps 1:1 onto
 * `transform: translate(offsetX, offsetY) scale(scale)` applied to a container
 * whose children are absolutely positioned at their world coordinates. Nothing
 * else in the app should invent its own transform.
 */

export type Point = { x: number; y: number };
export type Size = { width: number; height: number };
export type Rect = { x: number; y: number; width: number; height: number };

export type Viewport = {
  /** Screen-space translation applied after scaling. */
  x: number;
  y: number;
  scale: number;
};

export const MIN_SCALE = 0.1;
export const MAX_SCALE = 4;

export const IDENTITY_VIEWPORT: Viewport = { x: 0, y: 0, scale: 1 };

export function clampScale(scale: number): number {
  if (!Number.isFinite(scale)) return 1;
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

export function worldToScreen(viewport: Viewport, point: Point): Point {
  return {
    x: point.x * viewport.scale + viewport.x,
    y: point.y * viewport.scale + viewport.y
  };
}

export function screenToWorld(viewport: Viewport, point: Point): Point {
  return {
    x: (point.x - viewport.x) / viewport.scale,
    y: (point.y - viewport.y) / viewport.scale
  };
}

export function panBy(viewport: Viewport, dx: number, dy: number): Viewport {
  return { ...viewport, x: viewport.x + dx, y: viewport.y + dy };
}

/**
 * Zoom while keeping the world point currently under `anchor` (screen space)
 * under it afterwards. This is what makes wheel-zoom feel anchored rather than
 * like the canvas is sliding away.
 */
export function zoomAt(viewport: Viewport, anchor: Point, nextScale: number): Viewport {
  const scale = clampScale(nextScale);
  if (scale === viewport.scale) return viewport;
  const world = screenToWorld(viewport, anchor);
  return {
    scale,
    x: anchor.x - world.x * scale,
    y: anchor.y - world.y * scale
  };
}

export function zoomBy(viewport: Viewport, anchor: Point, factor: number): Viewport {
  return zoomAt(viewport, anchor, viewport.scale * factor);
}

/** Zoom about the centre of the visible area — for buttons and keyboard. */
export function zoomAboutCentre(viewport: Viewport, size: Size, factor: number): Viewport {
  return zoomBy(viewport, { x: size.width / 2, y: size.height / 2 }, factor);
}

export function boundsOf(rects: readonly Rect[]): Rect | null {
  if (rects.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const r of rects) {
    minX = Math.min(minX, r.x);
    minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x + r.width);
    maxY = Math.max(maxY, r.y + r.height);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/**
 * Frame `bounds` inside a viewport of `size`. Returns the identity-centred
 * viewport when there is nothing to frame, so "fit" on an empty Desk is a
 * sensible reset rather than a no-op.
 */
export function fitToBounds(
  bounds: Rect | null,
  size: Size,
  padding = 96
): Viewport {
  if (!bounds || bounds.width <= 0 || bounds.height <= 0) {
    return { x: size.width / 2, y: size.height / 2, scale: 1 };
  }
  const usableWidth = Math.max(1, size.width - padding * 2);
  const usableHeight = Math.max(1, size.height - padding * 2);
  const scale = clampScale(
    Math.min(usableWidth / bounds.width, usableHeight / bounds.height)
  );
  const centre = {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2
  };
  return {
    scale,
    x: size.width / 2 - centre.x * scale,
    y: size.height / 2 - centre.y * scale
  };
}

export function rectsIntersect(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

export function rectContainsPoint(rect: Rect, point: Point): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

/** Normalises a drag between two corners into a positive-extent rect. */
export function rectFromCorners(a: Point, b: Point): Rect {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(a.x - b.x),
    height: Math.abs(a.y - b.y)
  };
}

/**
 * Where a newly captured card should land when the user did not point at a
 * spot: the centre of what they are looking at, nudged so repeats do not stack
 * exactly on top of one another.
 */
export function centreOfView(viewport: Viewport, size: Size): Point {
  return screenToWorld(viewport, { x: size.width / 2, y: size.height / 2 });
}

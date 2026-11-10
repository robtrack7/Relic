/**
 * Shared-element continuity: the object you touch is the object that arrives.
 *
 * Persistent parts of an object (its picture, its name) travel between
 * representations; they never fade. Pictures keep their aspect by scaling
 * uniformly and cropping to the source frame instead of stretching.
 */

export const TRAVEL_EASING = "cubic-bezier(.16, 1, .3, 1)"; // front-loaded: most travel early
export const TRAVEL_MS = 300;

export type SharedKind = "media" | "title";
export type Box = { x: number; y: number; width: number; height: number };
export type SharedSnapshot = { box: Box; fontSize: number };

/** Relic's own motion setting wins over the system preference, as in useSurfaceTransition. */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  const preference = document.documentElement.dataset.relicMotion;
  return preference === "reduced" || (preference !== "full" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
}

export function canAnimate(element: Element | null | undefined): element is HTMLElement {
  return !!element && typeof (element as HTMLElement).animate === "function" && !prefersReducedMotion();
}

/** Attribute-selector-safe id; CSS.escape is absent in some test environments. */
export const escapeId = (value: string) => typeof CSS !== "undefined" && CSS.escape ? CSS.escape(value) : value.replace(/["\\]/g, "\\$&");

const box = (rect: DOMRect): Box => ({ x: rect.left, y: rect.top, width: rect.width, height: rect.height });

/** The shared part of a representation, if it is laid out. */
export function sharedPart(root: ParentNode | null | undefined, kind: SharedKind): HTMLElement | null {
  const element = root?.querySelector<HTMLElement>(kind === "title" ? '[data-shared="title"], [data-card-title]' : '[data-shared="media"]');
  return element && element.getClientRects().length ? element : null;
}

export function snapshot(element: HTMLElement): SharedSnapshot {
  return { box: box(element.getBoundingClientRect()), fontSize: Number.parseFloat(getComputedStyle(element).fontSize) || 16 };
}

/**
 * Where an element will rest once any entrance animation on an ancestor (a
 * dock sliding in) has finished: running translations are taken back out.
 */
export function settledRect(element: HTMLElement): DOMRect {
  const rect = element.getBoundingClientRect();
  let dx = 0, dy = 0;
  for (const animation of document.getAnimations?.() ?? []) {
    const target = (animation.effect as KeyframeEffect | null)?.target;
    if (!(target instanceof HTMLElement) || target === element || !target.contains(element) || animation.playState !== "running") continue;
    const transform = getComputedStyle(target).transform;
    if (!transform || transform === "none") continue;
    const matrix = new DOMMatrixReadOnly(transform);
    dx += matrix.m41; dy += matrix.m42;
  }
  return new DOMRect(rect.left - dx, rect.top - dy, rect.width, rect.height);
}

/** On-screen scale of an element's coordinate space (a zoomed canvas plane is not 1). */
function spaceScale(element: HTMLElement): number {
  return element.offsetWidth ? element.getBoundingClientRect().width / element.offsetWidth : 1;
}

/**
 * Keyframes that carry `element` from `from` into its own current box. Media
 * scale uniformly and crop to the source frame; titles scale by type size.
 */
function travel(element: HTMLElement, kind: SharedKind, from: SharedSnapshot): Keyframe[] | null {
  return travelFrames(kind, from, box(element.getBoundingClientRect()), spaceScale(element) || 1, Number.parseFloat(getComputedStyle(element).fontSize) || from.fontSize);
}

/**
 * Pure geometry for {@link travel}. `to` is the element's own on-screen box,
 * `k` the on-screen scale of its coordinate space. The first frame shows,
 * exactly over `from.box`, a centred crop of the element at the source aspect.
 */
export function travelFrames(kind: SharedKind, from: SharedSnapshot, to: Box, k: number, toFontSize: number): Keyframe[] | null {
  if (!to.width || !to.height || !from.box.width || !from.box.height) return null;
  if (kind === "title") {
    const s = from.fontSize / (toFontSize || from.fontSize);
    const dx = (from.box.x - to.x) / k, dy = (from.box.y - to.y) / k;
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && Math.abs(s - 1) < 0.01) return null;
    return [{ transformOrigin: "0 0", transform: `translate(${dx}px, ${dy}px) scale(${s})` }, { transformOrigin: "0 0", transform: "none" }];
  }
  const s = Math.max(from.box.width / to.width, from.box.height / to.height);
  // Inset (in screen pixels of the final box) that leaves the source aspect visible, centred.
  const ix = (to.width - from.box.width / s) / 2, iy = (to.height - from.box.height / s) / 2;
  const dx = (from.box.x - to.x - s * ix) / k, dy = (from.box.y - to.y - s * iy) / k;
  const lx = ix / k, ly = iy / k;
  if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && Math.abs(s - 1) < 0.01) return null;
  return [
    { transformOrigin: "0 0", transform: `translate(${dx}px, ${dy}px) scale(${s})`, clipPath: `inset(${ly}px ${lx}px ${ly}px ${lx}px)` },
    { transformOrigin: "0 0", transform: "none", clipPath: "inset(0px 0px 0px 0px)" },
  ];
}

/** Move an element that has just been re-laid-out from where it was. */
export function morphFrom(element: HTMLElement, kind: SharedKind, from: SharedSnapshot, duration = 260): Animation | null {
  if (!canAnimate(element)) return null;
  const frames = travel(element, kind, from);
  return frames ? element.animate(frames, { duration, easing: TRAVEL_EASING }) : null;
}

/** A detached, visually identical stand-in. Text fields carry their value as text. */
function ghostOf(element: HTMLElement): HTMLElement {
  if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
    const style = getComputedStyle(element);
    const ghost = document.createElement("div");
    ghost.textContent = element.value || element.placeholder;
    for (const property of ["font", "letterSpacing", "lineHeight", "color", "textWrap", "padding", "whiteSpace", "wordBreak", "overflowWrap"] as const) (ghost.style as unknown as Record<string, string>)[property] = style[property];
    return ghost;
  }
  const clone = element.cloneNode(true) as HTMLElement;
  clone.removeAttribute("id");
  return clone;
}

/**
 * Fly a stand-in for `target` from `from` to the target's own box, then hand
 * over to the real element. The target is hidden for the journey so the
 * object exists once on screen.
 */
export function flyTo(target: HTMLElement, kind: SharedKind, from: SharedSnapshot, duration = TRAVEL_MS): Animation | null {
  if (!canAnimate(target)) return null;
  const rect = settledRect(target);
  if (!rect.width || !rect.height) return null;
  const ghost = ghostOf(target);
  ghost.setAttribute("aria-hidden", "true");
  ghost.setAttribute("data-shared-ghost", kind);
  Object.assign(ghost.style, { position: "fixed", left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`, margin: "0", zIndex: "60", pointerEvents: "none", boxSizing: "border-box" });
  if (kind === "media") ghost.style.objectFit = getComputedStyle(target).objectFit;
  document.body.append(ghost);
  const frames = travel(ghost, kind, from);
  if (!frames) { ghost.remove(); return null; }
  const previous = target.style.visibility;
  target.style.visibility = "hidden";
  const animation = ghost.animate(frames, { duration, easing: TRAVEL_EASING });
  const finish = () => { ghost.remove(); target.style.visibility = previous; };
  animation.onfinish = finish;
  animation.oncancel = finish;
  return animation;
}

export type Departure = { kind: SharedKind; ghost: HTMLElement; from: SharedSnapshot };

/** Capture a departing part while it is still laid out, for a later return flight. */
export function captureDeparture(element: HTMLElement, kind: SharedKind): Departure | null {
  if (!canAnimate(element) || !element.getClientRects().length) return null;
  const ghost = ghostOf(element);
  if (kind === "title") ghost.style.font = getComputedStyle(element).font;
  if (kind === "media") ghost.style.objectFit = getComputedStyle(element).objectFit;
  return { kind, ghost, from: snapshot(element) };
}

/**
 * Fly a captured departure back to `to`. Used when a representation closes:
 * the object returns to exactly where it came from.
 */
export function flyBack({ kind, ghost, from }: Departure, target: HTMLElement, duration = TRAVEL_MS): Animation | null {
  const to = snapshot(target);
  ghost.setAttribute("aria-hidden", "true");
  ghost.setAttribute("data-shared-ghost", kind);
  // Lay the ghost out at its destination, then travel it in from the departing box.
  Object.assign(ghost.style, { position: "fixed", left: `${to.box.x}px`, top: `${to.box.y}px`, width: `${to.box.width}px`, height: `${to.box.height}px`, margin: "0", zIndex: "60", pointerEvents: "none", boxSizing: "border-box" });
  if (kind === "title") Object.assign(ghost.style, { fontSize: `${to.fontSize}px`, width: "max-content", height: "auto", padding: "0", whiteSpace: "nowrap" });
  document.body.append(ghost);
  const frames = travel(ghost, kind, from);
  if (!frames) { ghost.remove(); return null; }
  const previous = target.style.visibility;
  target.style.visibility = "hidden";
  const animation = ghost.animate(frames, { duration, easing: TRAVEL_EASING });
  const finish = () => { ghost.remove(); target.style.visibility = previous; };
  animation.onfinish = finish;
  animation.oncancel = finish;
  return animation;
}

/**
 * Fade in what is new in a composition while its shared parts travel: every
 * branch that holds no shared part fades, starting about halfway through.
 */
export function revealAround(root: HTMLElement, keep: readonly HTMLElement[], delay = 120, duration = 160): Animation[] {
  if (!canAnimate(root)) return [];
  const animations: Animation[] = [];
  const visit = (node: HTMLElement) => {
    for (const child of [...node.children] as HTMLElement[]) {
      if (keep.includes(child)) continue;
      if (keep.some(element => child.contains(element))) { visit(child); continue; }
      if (typeof child.animate === "function") animations.push(child.animate([{ opacity: 0 }, { opacity: 1 }], { duration, delay, easing: "ease-out", fill: "backwards" }));
    }
  };
  visit(root);
  return animations;
}

/** The on-screen representation an object is arriving from, other than `self`. */
export function arrivalSource(objectId: string, self: Element): Element | null {
  const candidates = [...document.querySelectorAll(`[data-object-id="${escapeId(objectId)}"]`)].filter(element => element !== self && !self.contains(element) && !element.contains(self) && element.getClientRects().length);
  // A neighbouring deeper surface (Focus) is the nearer origin than the canvas card.
  return candidates.find(element => element.hasAttribute("data-entity-focus")) ?? candidates.find(element => element.hasAttribute("data-object-family")) ?? null;
}

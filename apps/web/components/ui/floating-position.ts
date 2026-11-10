export type FloatingSide = "top" | "bottom" | "left" | "right";
export type FloatingAlign = "center" | "start";

export type FloatingViewport = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export type FloatingPosition = {
  left: number;
  top: number;
  maxHeight: number;
  side: FloatingSide;
};

export const FLOATING_GAP = 10;
export const FLOATING_MARGIN = 12;
export const TOOLTIP_GAP = 8;
export const TOOLTIP_MARGIN = 8;

export function visualViewportRect(): FloatingViewport {
  const viewport = typeof window !== "undefined" ? window.visualViewport : undefined;
  const left = viewport?.offsetLeft ?? 0;
  const top = viewport?.offsetTop ?? 0;
  const width = viewport?.width ?? (typeof window !== "undefined" ? window.innerWidth : 0);
  const height = viewport?.height ?? (typeof window !== "undefined" ? window.innerHeight : 0);
  return { left, top, right: left + width, bottom: top + height };
}

export function positionFloatingSurface({
  trigger,
  panel,
  placement,
  align = "center",
  viewport = visualViewportRect(),
  gap = FLOATING_GAP,
  margin = FLOATING_MARGIN
}: {
  trigger: Pick<DOMRect, "left" | "right" | "top" | "bottom" | "width" | "height">;
  panel: Pick<DOMRect, "width" | "height">;
  placement: FloatingSide;
  align?: FloatingAlign;
  viewport?: FloatingViewport;
  gap?: number;
  margin?: number;
}): FloatingPosition {
  const vertical = placement === "top" || placement === "bottom";
  const before = vertical
    ? Math.max(0, trigger.top - viewport.top - gap - margin)
    : Math.max(0, trigger.left - viewport.left - gap - margin);
  const after = vertical
    ? Math.max(0, viewport.bottom - trigger.bottom - gap - margin)
    : Math.max(0, viewport.right - trigger.right - gap - margin);
  const preferred = placement === "top" || placement === "left" ? before : after;
  const fallback = placement === "top" || placement === "left" ? after : before;
  const fallbackSide = placement === "top" ? "bottom" : placement === "bottom" ? "top" : placement === "left" ? "right" : "left";
  const side = preferred >= (vertical ? panel.height : panel.width) || preferred >= fallback ? placement : fallbackSide;
  const available = vertical ? (side === "top" ? before : after) : align === "start"
    ? Math.max(0, viewport.bottom - margin - Math.max(trigger.top, viewport.top + margin))
    : viewport.bottom - viewport.top - margin * 2;
  const panelHeight = !vertical && align === "start" ? Math.min(panel.height, available) : panel.height;
  const desiredLeft = side === "left"
    ? trigger.left - gap - panel.width
    : side === "right" ? trigger.right + gap : align === "start" ? trigger.left : trigger.left + trigger.width / 2 - panel.width / 2;
  const desiredTop = side === "top"
    ? trigger.top - gap - panel.height
    : side === "bottom" ? trigger.bottom + gap : align === "start" ? trigger.top : trigger.top + trigger.height / 2 - panelHeight / 2;
  const left = clamp(desiredLeft, viewport.left + margin, viewport.right - margin - panel.width);
  const top = clamp(desiredTop, viewport.top + margin, viewport.bottom - margin - panelHeight);
  return { left, top, maxHeight: available, side };
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
}

"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { FLOATING_MARGIN, positionFloatingSurface, visualViewportRect, type FloatingAlign, type FloatingSide } from "./floating-position";
import styles from "./floating-surface.module.css";
import { useSurfaceTransition } from "./use-surface-transition";

const OPEN_EVENT = "relic:overlay-open";

/** One active transient decision, with Escape going to the topmost layer. */
export function useOverlayDismiss({ open, onClose, triggerRef, contentRef }: {
  open: boolean; onClose: (restoreFocus: boolean) => void;
  triggerRef: RefObject<HTMLElement | null>; contentRef: RefObject<HTMLElement | null>;
}) {
  const id = useId();
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!open) return;
    const scope = triggerRef.current?.closest("[data-left-mode]") ?? document;
    const sibling = (event: Event) => { if ((event as CustomEvent).detail !== id) close.current(false); };
    const outside = (event: PointerEvent) => {
      if (!contentRef.current?.contains(event.target as Node) && !triggerRef.current?.contains(event.target as Node)) close.current(false);
    };
    const escape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault(); event.stopPropagation(); close.current(true);
    };
    scope.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: id }));
    scope.addEventListener(OPEN_EVENT, sibling);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      scope.removeEventListener(OPEN_EVENT, sibling);
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open, id, triggerRef, contentRef]);
}

/** Portaled, collision-aware menu/popover shared by floating Canvas controls. */
export function FloatingSurface({ open, onClose, triggerRef, children, label, id, placement = "top", align = "center", role = "menu", width = 224 }: {
  open: boolean; onClose: (restoreFocus: boolean) => void; triggerRef: RefObject<HTMLElement | null>;
  children: ReactNode; label: string; id?: string; placement?: FloatingSide; align?: FloatingAlign;
  role?: "menu" | "dialog"; width?: number;
}) {
  const content = useRef<HTMLDivElement>(null);
  const present = useSurfaceTransition(open, content, "point");
  const [position, setPosition] = useState({ left: 0, top: 0, maxHeight: 0 });
  const focusedOnOpen = useRef(false);
  const typeahead = useRef("");
  const typeaheadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useOverlayDismiss({ open, onClose, triggerRef, contentRef: content });

  const positionSurface = useCallback(() => {
    const trigger = triggerRef.current;
    const panel = content.current;
    if (!trigger || !panel) return;
    const viewport = visualViewportRect();
    panel.style.maxHeight = `${Math.max(0, viewport.bottom - viewport.top - FLOATING_MARGIN * 2)}px`;
    const initial = positionFloatingSurface({ trigger: trigger.getBoundingClientRect(), panel: panel.getBoundingClientRect(), placement, align, viewport });
    panel.style.maxHeight = `${initial.maxHeight}px`;
    const measured = positionFloatingSurface({ trigger: trigger.getBoundingClientRect(), panel: panel.getBoundingClientRect(), placement, align, viewport });
    setPosition((current) => current.left === measured.left && current.top === measured.top && current.maxHeight === measured.maxHeight
      ? current
      : { left: measured.left, top: measured.top, maxHeight: measured.maxHeight });
  }, [align, placement, triggerRef]);

  useLayoutEffect(() => {
    if (!open) {
      focusedOnOpen.current = false;
      return;
    }
    positionSurface();
    const trigger = triggerRef.current;
    const panel = content.current;
    if (!trigger || !panel) return;
    const observer = new ResizeObserver(positionSurface);
    observer.observe(trigger);
    observer.observe(panel);
    const centralWorkspace = trigger.closest("[data-left-mode]")?.querySelector<HTMLElement>('[data-layer="central-workspace"]');
    if (centralWorkspace) observer.observe(centralWorkspace);
    const visualViewport = window.visualViewport;
    window.addEventListener("resize", positionSurface);
    window.addEventListener("scroll", positionSurface, true);
    visualViewport?.addEventListener("resize", positionSurface);
    visualViewport?.addEventListener("scroll", positionSurface);
    if (!focusedOnOpen.current) {
      const items = [...panel.querySelectorAll<HTMLElement>('[role^="menuitem"], input, button, [tabindex="0"]')];
      const enabled = items.find((item) => !isDisabled(item));
      (enabled ?? items[0])?.focus({ preventScroll: true });
      focusedOnOpen.current = true;
    }
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", positionSurface);
      window.removeEventListener("scroll", positionSurface, true);
      visualViewport?.removeEventListener("resize", positionSurface);
      visualViewport?.removeEventListener("scroll", positionSurface);
      if (typeaheadTimer.current) clearTimeout(typeaheadTimer.current);
      typeaheadTimer.current = null;
      typeahead.current = "";
    };
  }, [open, positionSurface, triggerRef]);

  const handleMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    // Dismiss at the portaled surface before Canvas ancestors can consume
    // Escape. Popovers containing a toolbar have no menuitems to navigate.
    if (event.key === "Escape") {
      event.preventDefault(); event.stopPropagation(); onClose(true); return;
    }
    if (role !== "menu") return;
    const items = [...event.currentTarget.querySelectorAll<HTMLElement>('[role^="menuitem"]')];
    if (!items.length) return;
    const navigable = items.filter((item) => !isDisabled(item));
    const candidates = navigable.length ? navigable : items;
    const current = candidates.indexOf(document.activeElement as HTMLElement);
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onClose(true);
      return;
    }
    if (event.key === "Tab") {
      const trigger = triggerRef.current;
      const tabbables = [...document.querySelectorAll<HTMLElement>("button, a[href], input, textarea, select, [tabindex]")]
        .filter((element) => !event.currentTarget.contains(element) && !isDisabled(element) && isVisible(element) && element.tabIndex >= 0);
      const triggerIndex = trigger ? tabbables.indexOf(trigger) : -1;
      const target = triggerIndex >= 0 ? tabbables[triggerIndex + (event.shiftKey ? -1 : 1)] : undefined;
      if (target) {
        event.preventDefault();
        onClose(false);
        target.focus();
      } else {
        onClose(false);
      }
      return;
    }
    const direction = event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0;
    const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? candidates.length - 1 : direction
      ? (current + direction + candidates.length) % candidates.length
      : -1;
    if (nextIndex >= 0) {
      event.preventDefault();
      candidates[nextIndex]?.focus();
      return;
    }
    if (event.key.length === 1 && !event.altKey && !event.ctrlKey && !event.metaKey) {
      typeahead.current = `${typeahead.current}${event.key.toLocaleLowerCase()}`;
      if (typeaheadTimer.current) clearTimeout(typeaheadTimer.current);
      typeaheadTimer.current = setTimeout(() => { typeahead.current = ""; }, 500);
      const start = current < 0 ? -1 : current;
      const match = [...candidates.slice(start + 1), ...candidates.slice(0, start + 1)].find((item) => item.textContent?.trim().toLocaleLowerCase().startsWith(typeahead.current));
      if (match) {
        event.preventDefault();
        match.focus();
      }
    }
  };

  useLayoutEffect(() => {
    const panel = content.current;
    if (open && panel && !panel.contains(document.activeElement)) panel.querySelector<HTMLElement>('[role^="menuitem"]:not(:disabled), input, button:not(:disabled)')?.focus({ preventScroll: true });
  }, [children, open]);

  if (!open && !present) return null;
  return createPortal(<div ref={content} id={id} role={role} aria-label={label} className={styles.surface}
    inert={!open} aria-hidden={!open || undefined}
    style={{ ...position, width }} onPointerDown={event => event.stopPropagation()}
    onBlur={event => {
      const next = event.relatedTarget as Node | null;
      if (!event.currentTarget.contains(next) && !triggerRef.current?.contains(next)) onClose(false);
    }}
    onKeyDown={handleMenuKeyDown}>{children}</div>, document.body);
}

function isDisabled(element: HTMLElement) {
  return element.hasAttribute("disabled") || element.getAttribute("aria-disabled") === "true";
}

function isVisible(element: HTMLElement) {
  if (element.closest("[hidden], [inert]")) return false;
  const style = window.getComputedStyle(element);
  return style.display !== "none" && style.visibility !== "hidden" && style.visibility !== "collapse";
}

"use client";

import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type CSSProperties
} from "react";

import {
  CANVAS_GRID,
  axisAnchors,
  boundsFor,
  materiallyContained
} from "@/lib/desk/manipulation";
import {
  fitToBounds,
  panBy,
  rectFromCorners,
  screenToWorld,
  zoomAboutCentre,
  zoomAt,
  wheelNavigationIntent,
  type Point,
  type Rect,
  type Size,
  type Viewport
} from "@/lib/desk/viewport";
import { gridStep } from "@/lib/desk/selection";
import { CanvasViewControls } from "./canvas-controls";
import type { PersistentCanvasTool } from "./canvas-controls";

import styles from "./canvas-foundation.module.css";

export type ProxyPlacement = Rect & {
  id: string;
  title: string;
  kind: string;
  note: string;
  tone?: "paper" | "sage" | "slate" | "archive";
  image?: { src: string; alt: string };
  presentation?: "record" | "note";
  provenance?: string;
};

type Handle = "nw" | "ne" | "se" | "sw";
type Guides = { x: number | null; y: number | null };

type Gesture =
  | { kind: "none" }
  | {
      kind: "pan";
      pointerId: number;
      button: number;
      originScreen: Point;
      lastScreen: Point;
      clickPlacementId: string | null;
      moved: boolean;
    }
  | {
      kind: "marquee";
      pointerId: number;
      origin: Point;
      base: ReadonlySet<string>;
      additive: boolean;
    }
  | {
      kind: "drag";
      pointerId: number;
      ids: readonly string[];
      startWorld: Point;
      startLayouts: ReadonlyMap<string, Rect>;
      startBounds: Rect;
      moved: boolean;
    }
  | {
      kind: "resize";
      pointerId: number;
      id: string;
      handle: Handle;
      startWorld: Point;
      startLayout: Rect;
      moved: boolean;
    };

type PointerSample = {
  pointerId: number;
  clientX: number;
  clientY: number;
  shiftKey: boolean;
  altKey: boolean;
};

type CanvasContextMenu = {
  screen: Point;
  world: Point;
};

export type CanvasFoundationProps = {
  initialPlacements?: readonly ProxyPlacement[];
  initialView?: "fit" | "origin";
  height?: number | string;
  diagnostics?: boolean;
  showViewControls?: boolean;
  showGrid?: boolean;
  activeTool?: PersistentCanvasTool;
  onPlacementsChange?: (placements: readonly ProxyPlacement[]) => void;
  onViewportChange?: (viewport: Viewport) => void;
  onViewportSizeChange?: (size: Size) => void;
  onSelectionChange?: (ids: readonly string[]) => void;
};

export type CanvasFoundationHandle = {
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  fitBoard: () => void;
  fitSelection: () => void;
  centerOn: (point: Point) => void;
};

const EMPTY = new Set<string>();
const MIN_WIDTH = 152;
const MIN_HEIGHT = 96;
const WHEEL_ZOOM_SENSITIVITY = 0.0022;
const MIDDLE_DOUBLE_CLICK_MS = 360;
const MIDDLE_DOUBLE_CLICK_RADIUS = 8;
const CONTEXT_MENU_WIDTH = 188;
const CONTEXT_MENU_HEIGHT = 132;
const CONTEXT_MENU_GUTTER = 10;

export const CanvasFoundation = forwardRef<CanvasFoundationHandle, CanvasFoundationProps>(function CanvasFoundation({
  initialPlacements = [],
  initialView = "fit",
  height = "min(760px, 100vh)",
  diagnostics = false,
  showViewControls = true,
  showGrid = true,
  activeTool = "select",
  onPlacementsChange,
  onViewportChange,
  onViewportSizeChange,
  onSelectionChange
}, ref) {
  const surface = useRef<HTMLDivElement>(null);
  const [placements, setPlacements] = useState<readonly ProxyPlacement[]>(initialPlacements);
  const [selection, setSelection] = useState<ReadonlySet<string>>(EMPTY);
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, scale: 1 });
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  const [marquee, setMarquee] = useState<Rect | null>(null);
  const [guides, setGuides] = useState<Guides>({ x: null, y: null });
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [interaction, setInteraction] = useState<Gesture["kind"]>("none");
  const [keyboardNavigation, setKeyboardNavigation] = useState(false);
  const [contextMenu, setContextMenu] = useState<CanvasContextMenu | null>(null);

  const placementsRef = useRef(placements);
  const viewportRef = useRef(viewport);
  const sizeRef = useRef(size);
  const gesture = useRef<Gesture>({ kind: "none" });
  const pendingPointer = useRef<PointerSample | null>(null);
  const frame = useRef<number | null>(null);
  const initialised = useRef(false);
  const lastMiddleClick = useRef<{ at: number; screen: Point } | null>(null);
  const contextMenuFirstItem = useRef<HTMLButtonElement>(null);
  placementsRef.current = placements;
  viewportRef.current = viewport;
  sizeRef.current = size;

  useEffect(() => onViewportChange?.(viewport), [onViewportChange, viewport]);
  useEffect(() => onViewportSizeChange?.(size), [onViewportSizeChange, size]);
  useEffect(() => onSelectionChange?.([...selection]), [onSelectionChange, selection]);

  const updateViewport = useCallback((change: (current: Viewport) => Viewport) => {
    const next = change(viewportRef.current);
    viewportRef.current = next;
    setViewport(next);
  }, []);

  const updatePlacements = useCallback(
    (change: (current: readonly ProxyPlacement[]) => readonly ProxyPlacement[]) => {
      const next = change(placementsRef.current);
      placementsRef.current = next;
      setPlacements(next);
      onPlacementsChange?.(next);
    },
    [onPlacementsChange]
  );

  const fit = useCallback(
    (rects: readonly Rect[] = placementsRef.current) => {
      updateViewport(() => fitToBounds(boundsFor(rects), sizeRef.current));
    },
    [updateViewport]
  );

  useEffect(() => {
    const node = surface.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const next = { width: entry.contentRect.width, height: entry.contentRect.height };
      sizeRef.current = next;
      setSize(next);
      if (!initialised.current && next.width > 0 && next.height > 0) {
        initialised.current = true;
        const opening =
          initialView === "fit"
            ? fitToBounds(boundsFor(initialPlacements), next)
            : { x: next.width / 2, y: next.height / 2, scale: 1 };
        viewportRef.current = opening;
        setViewport(opening);
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [initialPlacements, initialView]);

  useEffect(() => {
    const node = surface.current;
    if (!node) return;

    const onWheel = (event: WheelEvent) => {
      if ((event.target as Element).closest?.("button, summary, [role=menu]")) return;
      event.preventDefault();
      if (gesture.current.kind !== "none") return;
      setContextMenu(null);
      const multiplier = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16 : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? sizeRef.current.height : 1;
      const dx = event.deltaX * multiplier;
      const dy = event.deltaY * multiplier;

      if (wheelNavigationIntent(event) === "zoom") {
        const rect = node.getBoundingClientRect();
        const anchor = { x: event.clientX - rect.left, y: event.clientY - rect.top };
        const factor = Math.exp(-dy * WHEEL_ZOOM_SENSITIVITY);
        updateViewport((current) => zoomAt(current, anchor, current.scale * factor));
      } else {
        updateViewport((current) => panBy(current, -dx, -dy));
      }
    };

    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [updateViewport]);

  useEffect(() => {
    if (contextMenu) contextMenuFirstItem.current?.focus({ preventScroll: true });
  }, [contextMenu]);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.code === "Space" && !isTextEntry(event.target) &&
          !(event.target instanceof Element && event.target.closest("button, a, summary, [role=button], [role=menu]")) &&
          (!(event.target instanceof Node) || event.target === document.body || surface.current?.contains(event.target))) {
        event.preventDefault();
        setSpaceHeld(true);
      }
    };
    const up = (event: KeyboardEvent) => {
      if (event.code === "Space") setSpaceHeld(false);
    };
    const blur = () => setSpaceHeld(false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    []
  );

  const localPoint = useCallback((sample: { clientX: number; clientY: number }): Point => {
    const rect = surface.current?.getBoundingClientRect();
    return { x: sample.clientX - (rect?.left ?? 0), y: sample.clientY - (rect?.top ?? 0) };
  }, []);

  const worldPoint = useCallback(
    (sample: { clientX: number; clientY: number }): Point =>
      screenToWorld(viewportRef.current, localPoint(sample)),
    [localPoint]
  );

  const applyPointer = useCallback(
    (sample: PointerSample) => {
      const active = gesture.current;
      if (active.kind === "none" || active.pointerId !== sample.pointerId) return;

      if (active.kind === "pan") {
        const dx = sample.clientX - active.lastScreen.x;
        const dy = sample.clientY - active.lastScreen.y;
        if (Math.hypot(sample.clientX - active.originScreen.x, sample.clientY - active.originScreen.y) >= 3) {
          active.moved = true;
        }
        active.lastScreen = { x: sample.clientX, y: sample.clientY };
        updateViewport((current) => panBy(current, dx, dy));
        return;
      }

      const pointer = worldPoint(sample);
      if (active.kind === "marquee") {
        const band = rectFromCorners(active.origin, pointer);
        setMarquee(band);
        const caught = placementsRef.current
          .filter((placement) => materiallyContained(placement, band))
          .map((placement) => placement.id);
        setSelection(active.additive ? new Set([...active.base, ...caught]) : new Set(caught));
        return;
      }

      if (active.kind === "drag") {
        let dx = pointer.x - active.startWorld.x;
        let dy = pointer.y - active.startWorld.y;
        if (!active.moved && Math.hypot(dx, dy) * viewportRef.current.scale < 3) return;
        active.moved = true;
        let horizontalOnly = false;
        let verticalOnly = false;
        if (sample.shiftKey) {
          if (Math.abs(dx) >= Math.abs(dy)) {
            dy = 0;
            horizontalOnly = true;
          } else {
            dx = 0;
            verticalOnly = true;
          }
        }

        const stationary = placementsRef.current.filter((placement) => !active.ids.includes(placement.id));
        const snapGrid = gridStep(viewportRef.current.scale);
        const snappedX = verticalOnly
          ? { delta: 0, guide: null }
          : snapTranslation(
              active.startBounds,
              stationary,
              "x",
              dx,
              viewportRef.current.scale,
              sample.altKey,
              snapGrid
            );
        const snappedY = horizontalOnly
          ? { delta: 0, guide: null }
          : snapTranslation(
              active.startBounds,
              stationary,
              "y",
              dy,
              viewportRef.current.scale,
              sample.altKey,
              snapGrid
            );
        dx = snappedX.delta;
        dy = snappedY.delta;
        setGuides({ x: snappedX.guide, y: snappedY.guide });

        updatePlacements((current) =>
          current.map((placement) => {
            const start = active.startLayouts.get(placement.id);
            return start ? { ...placement, x: start.x + dx, y: start.y + dy } : placement;
          })
        );
        return;
      }

      const next = resizedRect(active.startLayout, active.startWorld, pointer, active.handle);
      if (
        !active.moved &&
        Math.hypot(pointer.x - active.startWorld.x, pointer.y - active.startWorld.y) *
          viewportRef.current.scale <
          3
      ) {
        return;
      }
      active.moved = true;
      const stationary = placementsRef.current.filter((placement) => placement.id !== active.id);
      const snapped = snapResize(
        next,
        active.handle,
        stationary,
        viewportRef.current.scale,
        sample.altKey,
        gridStep(viewportRef.current.scale)
      );
      setGuides(snapped.guides);
      updatePlacements((current) =>
        current.map((placement) => (placement.id === active.id ? { ...placement, ...snapped.rect } : placement))
      );
    },
    [updatePlacements, updateViewport, worldPoint]
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (gesture.current.kind === "none" || gesture.current.pointerId !== event.pointerId) return;
      pendingPointer.current = {
        pointerId: event.pointerId,
        clientX: event.clientX,
        clientY: event.clientY,
        shiftKey: event.shiftKey,
        altKey: event.altKey
      };
      if (frame.current !== null) return;
      frame.current = requestAnimationFrame(() => {
        frame.current = null;
        const sample = pendingPointer.current;
        pendingPointer.current = null;
        if (sample) applyPointer(sample);
      });
    },
    [applyPointer]
  );

  const onSurfacePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0 && event.button !== 1) return;
      if (gesture.current.kind !== "none") return;
      if ((event.target as Element).closest("button, summary, [role=menu]")) return;
      event.preventDefault();
      setContextMenu(null);
      surface.current?.focus({ preventScroll: true });
      surface.current?.setPointerCapture(event.pointerId);
      const pan =
        event.button === 1 ||
        activeTool === "hand" ||
        spaceHeld ||
        event.ctrlKey ||
        event.metaKey ||
        event.pointerType === "touch";
      if (pan) {
        const screen = { x: event.clientX, y: event.clientY };
        const target = event.target;
        const clickPlacementId =
          event.button === 0 && !spaceHeld && (event.ctrlKey || event.metaKey) && target instanceof Element
            ? target.closest<HTMLElement>("[data-placement-id]")?.dataset.placementId ?? null
            : null;
        gesture.current = {
          kind: "pan",
          pointerId: event.pointerId,
          button: event.button,
          originScreen: screen,
          lastScreen: screen,
          clickPlacementId,
          moved: false
        };
        setInteraction("pan");
        return;
      }

      const additive = event.shiftKey;
      gesture.current = {
        kind: "marquee",
        pointerId: event.pointerId,
        origin: worldPoint(event),
        base: additive ? selection : EMPTY,
        additive
      };
      setInteraction("marquee");
      if (!additive) setSelection(EMPTY);
      setMarquee({ x: 0, y: 0, width: 0, height: 0 });
    },
    [activeTool, selection, spaceHeld, worldPoint]
  );

  const onPlacementPointerDown = useCallback(
    (id: string) => (event: React.PointerEvent<HTMLElement>) => {
      if (event.button !== 0) return;
      if (gesture.current.kind !== "none") return;
      if (spaceHeld || event.ctrlKey || event.metaKey) return;
      event.preventDefault();
      event.stopPropagation();
      setContextMenu(null);
      surface.current?.focus({ preventScroll: true });

      if (activeTool === "hand") {
        const screen = { x: event.clientX, y: event.clientY };
        surface.current?.setPointerCapture(event.pointerId);
        gesture.current = {
          kind: "pan",
          pointerId: event.pointerId,
          button: event.button,
          originScreen: screen,
          lastScreen: screen,
          clickPlacementId: null,
          moved: false
        };
        setInteraction("pan");
        return;
      }

      const additive = event.shiftKey;
      const next = new Set(selection);
      if (additive) {
        if (next.has(id)) next.delete(id);
        else next.add(id);
      } else if (!next.has(id)) {
        next.clear();
        next.add(id);
      }
      setSelection(next);
      if (!next.has(id)) return;

      const startLayouts = new Map<string, Rect>();
      for (const placement of placementsRef.current) {
        if (next.has(placement.id)) startLayouts.set(placement.id, placement);
      }
      const startBounds = boundsFor([...startLayouts.values()]);
      if (!startBounds) return;
      surface.current?.setPointerCapture(event.pointerId);
      gesture.current = {
        kind: "drag",
        pointerId: event.pointerId,
        ids: [...next],
        startWorld: worldPoint(event),
        startLayouts,
        startBounds,
        moved: false
      };
      setInteraction("drag");
    },
    [activeTool, selection, spaceHeld, worldPoint]
  );

  const onHandlePointerDown = useCallback(
    (id: string, handle: Handle) => (event: React.PointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0) return;
      if (gesture.current.kind !== "none") return;
      event.preventDefault();
      event.stopPropagation();
      const placement = placementsRef.current.find((candidate) => candidate.id === id);
      if (!placement) return;
      surface.current?.focus({ preventScroll: true });
      surface.current?.setPointerCapture(event.pointerId);
      gesture.current = {
        kind: "resize",
        pointerId: event.pointerId,
        id,
        handle,
        startWorld: worldPoint(event),
        startLayout: placement,
        moved: false
      };
      setInteraction("resize");
    },
    [worldPoint]
  );

  const cancelGesture = useCallback(() => {
    const active = gesture.current;
    if (active.kind === "drag") {
      updatePlacements((current) =>
        current.map((placement) => {
          const start = active.startLayouts.get(placement.id);
          return start ? { ...placement, ...start } : placement;
        })
      );
    } else if (active.kind === "resize") {
      updatePlacements((current) =>
        current.map((placement) =>
          placement.id === active.id ? { ...placement, ...active.startLayout } : placement
        )
      );
    } else if (active.kind === "marquee") {
      setSelection(active.base);
    }
    gesture.current = { kind: "none" };
    setInteraction("none");
    if (active.kind !== "none" && surface.current?.hasPointerCapture(active.pointerId)) {
      surface.current.releasePointerCapture(active.pointerId);
    }
    pendingPointer.current = null;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    setMarquee(null);
    setGuides({ x: null, y: null });
  }, [updatePlacements]);

  const endGesture = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const active = gesture.current;
      if (active.kind === "none" || active.pointerId !== event.pointerId) return;
      if (frame.current !== null) {
        cancelAnimationFrame(frame.current);
        frame.current = null;
        const sample = pendingPointer.current;
        pendingPointer.current = null;
        if (sample) applyPointer(sample);
      }

      if (active.kind === "pan" && active.button === 1 && !active.moved) {
        const now = performance.now();
        const previous = lastMiddleClick.current;
        if (
          previous &&
          now - previous.at <= MIDDLE_DOUBLE_CLICK_MS &&
          Math.hypot(
            active.originScreen.x - previous.screen.x,
            active.originScreen.y - previous.screen.y
          ) <= MIDDLE_DOUBLE_CLICK_RADIUS
        ) {
          lastMiddleClick.current = null;
          fit();
        } else {
          lastMiddleClick.current = { at: now, screen: active.originScreen };
        }
      } else if (active.kind === "pan" && active.button === 0 && !active.moved && active.clickPlacementId) {
        const clickedId = active.clickPlacementId;
        setSelection((current) => {
          const next = new Set(current);
          if (next.has(clickedId)) next.delete(clickedId);
          else next.add(clickedId);
          return next;
        });
      }

      gesture.current = { kind: "none" };
      setInteraction("none");
      if (surface.current?.hasPointerCapture(event.pointerId)) {
        surface.current.releasePointerCapture(event.pointerId);
      }
      setMarquee(null);
      setGuides({ x: null, y: null });
    },
    [applyPointer, fit]
  );

  useEffect(() => {
    const blur = () => { cancelGesture(); setContextMenu(null); };
    window.addEventListener("blur", blur);
    return () => window.removeEventListener("blur", blur);
  }, [cancelGesture]);

  const onPointerCancel = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (gesture.current.kind === "none" || gesture.current.pointerId !== event.pointerId) return;
      cancelGesture();
    },
    [cancelGesture]
  );

  const onContextMenu = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      cancelGesture();
      const screen = localPoint(event);
      const maxX = Math.max(CONTEXT_MENU_GUTTER, sizeRef.current.width - CONTEXT_MENU_WIDTH - CONTEXT_MENU_GUTTER);
      const maxY = Math.max(CONTEXT_MENU_GUTTER, sizeRef.current.height - CONTEXT_MENU_HEIGHT - CONTEXT_MENU_GUTTER);
      setContextMenu({
        screen: {
          x: clamp(screen.x, CONTEXT_MENU_GUTTER, maxX),
          y: clamp(screen.y, CONTEXT_MENU_GUTTER, maxY)
        },
        world: screenToWorld(viewportRef.current, screen)
      });
    },
    [cancelGesture, localPoint]
  );

  const centerOn = useCallback(
    (point: Point) => {
      updateViewport((current) => ({
        ...current,
        x: sizeRef.current.width / 2 - point.x * current.scale,
        y: sizeRef.current.height / 2 - point.y * current.scale
      }));
    },
    [updateViewport]
  );

  useImperativeHandle(
    ref,
    () => ({
      zoomIn: () => updateViewport((current) => zoomAboutCentre(current, sizeRef.current, 1.2)),
      zoomOut: () => updateViewport((current) => zoomAboutCentre(current, sizeRef.current, 1 / 1.2)),
      resetZoom: () =>
        updateViewport((current) => zoomAboutCentre(current, sizeRef.current, 1 / current.scale)),
      fitBoard: () => fit(),
      fitSelection: () => {
        const selected = placementsRef.current.filter((placement) => selection.has(placement.id));
        if (selected.length > 0) fit(selected);
      },
      centerOn
    }),
    [centerOn, fit, ref, selection, updateViewport]
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (isTextEntry(event.target)) return;
      if (event.target instanceof Element && event.target.closest("button, summary, [role=menu]")) return;
      const ids = [...selection];
      if (event.key === "Escape") {
        event.preventDefault();
        if (contextMenu) setContextMenu(null);
        else if (gesture.current.kind !== "none") cancelGesture();
        else if (activeTool === "hand") return;
        else setSelection(EMPTY);
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "a") {
        event.preventDefault();
        setSelection(new Set(placementsRef.current.map((placement) => placement.id)));
        return;
      }
      if ((event.key === "Delete" || event.key === "Backspace") && ids.length > 0) {
        event.preventDefault();
        updatePlacements((current) => current.filter((placement) => !selection.has(placement.id)));
        setSelection(EMPTY);
        return;
      }
      if (event.key === "0") {
        event.preventDefault();
        fit();
        return;
      }
      if (event.key === "1") {
        event.preventDefault();
        updateViewport((current) => zoomAboutCentre(current, sizeRef.current, 1 / current.scale));
        return;
      }
      if (event.key === "+" || event.key === "=" || event.key === "-") {
        event.preventDefault();
        updateViewport((current) => zoomAboutCentre(current, sizeRef.current, event.key === "-" ? 1 / 1.2 : 1.2));
        return;
      }
      if (event.key.toLowerCase() === "f" && ids.length > 0) {
        event.preventDefault();
        fit(placementsRef.current.filter((placement) => selection.has(placement.id)));
        return;
      }

      const step = event.shiftKey ? CANVAS_GRID * 4 : CANVAS_GRID;
      const delta =
        event.key === "ArrowLeft"
          ? { x: -step, y: 0 }
          : event.key === "ArrowRight"
            ? { x: step, y: 0 }
            : event.key === "ArrowUp"
              ? { x: 0, y: -step }
              : event.key === "ArrowDown"
                ? { x: 0, y: step }
                : null;
      if (!delta || ids.length === 0) return;
      event.preventDefault();
      updatePlacements((current) =>
        current.map((placement) =>
          selection.has(placement.id)
            ? { ...placement, x: placement.x + delta.x, y: placement.y + delta.y }
            : placement
        )
      );
    },
    [activeTool, cancelGesture, contextMenu, fit, selection, updatePlacements, updateViewport]
  );

  const selectionBounds = useMemo(
    () => boundsFor(placements.filter((placement) => selection.has(placement.id))),
    [placements, selection]
  );

  const visiblePlacements = useMemo(() => {
    if (keyboardNavigation || size.width === 0 || size.height === 0) return placements;
    const topLeft = screenToWorld(viewport, { x: -size.width, y: -size.height });
    const bottomRight = screenToWorld(viewport, { x: size.width * 2, y: size.height * 2 });
    const visible = {
      x: topLeft.x,
      y: topLeft.y,
      width: bottomRight.x - topLeft.x,
      height: bottomRight.y - topLeft.y
    };
    return placements.filter((placement) => selection.has(placement.id) || rectanglesOverlap(placement, visible));
  }, [keyboardNavigation, placements, selection, size, viewport]);

  const visibleGrid = gridStep(viewport.scale);
  const pitch = visibleGrid * viewport.scale;
  const dragging = interaction === "drag" || interaction === "resize";
  const worldStyle = {
    transform: `translate3d(${viewport.x}px, ${viewport.y}px, 0) scale(${viewport.scale})`,
    "--canvas-scale": viewport.scale
  } as CSSProperties;

  return (
    <section className={styles.frame} style={{ height }} aria-label="Desk Canvas">
      <div
        ref={surface}
        className={styles.canvas}
        data-testid="canvas-viewport"
        data-space-held={spaceHeld || undefined}
        data-manipulating={dragging || undefined}
        data-panning={interaction === "pan" || undefined}
        data-tool={activeTool}
        data-grid-step={visibleGrid}
        role="application"
        aria-label="Relic Canvas"
        tabIndex={0}
        onPointerDown={onSurfacePointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endGesture}
        onPointerCancel={onPointerCancel}
        onLostPointerCapture={onPointerCancel}
        onKeyDownCapture={(event) => { if (event.key === "Tab") setKeyboardNavigation(true); }}
        onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setKeyboardNavigation(false); }}
        onAuxClick={(event) => event.preventDefault()}
        onContextMenu={onContextMenu}
        onKeyDown={onKeyDown}
        style={{
          backgroundSize: `${pitch}px ${pitch}px`,
          backgroundImage: showGrid ? undefined : "none",
          // The radial dot is centred in its CSS tile. Offset by half a tile so
          // world-space grid intersections render exactly where snapping lands.
          backgroundPosition: `${viewport.x - pitch / 2}px ${viewport.y - pitch / 2}px`
        }}
      >
        <div
          className={styles.world}
          style={worldStyle}
          data-testid="canvas-world"
          data-viewport-x={viewport.x}
          data-viewport-y={viewport.y}
          data-viewport-scale={viewport.scale}
        >
          {visiblePlacements.map((placement) => (
            <ProxyCard
              key={placement.id}
              placement={placement}
              selected={selection.has(placement.id)}
              onPointerDown={onPlacementPointerDown(placement.id)}
              onSelect={(additive) => setSelection((current) => {
                if (!additive) return new Set([placement.id]);
                const next = new Set(current);
                if (next.has(placement.id)) next.delete(placement.id); else next.add(placement.id);
                return next;
              })}
              onReveal={() => {
                const view = viewportRef.current;
                const extent = sizeRef.current;
                if (placement.x * view.scale + view.x < 80 || placement.y * view.scale + view.y < 80 ||
                    (placement.x + placement.width) * view.scale + view.x > extent.width - 40 ||
                    (placement.y + placement.height) * view.scale + view.y > extent.height - 80) {
                  centerOn({ x: placement.x + placement.width / 2, y: placement.y + placement.height / 2 });
                }
              }}
            />
          ))}

          {selectionBounds ? (
            <SelectionFrame
              bounds={selectionBounds}
              count={selection.size}
              id={selection.size === 1 ? [...selection][0] ?? null : null}
              onHandlePointerDown={onHandlePointerDown}
              onHandleKeyDown={(id, handle) => (event) => {
                const step = event.shiftKey ? CANVAS_GRID * 4 : CANVAS_GRID;
                const dx = event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0;
                const dy = event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0;
                if (!dx && !dy) return;
                event.preventDefault(); event.stopPropagation();
                updatePlacements((current) => current.map((placement) => placement.id === id ?
                  { ...placement, ...resizedRect(placement, { x: 0, y: 0 }, { x: dx, y: dy }, handle) } : placement));
              }}
            />
          ) : null}

          {marquee && marquee.width > 1 && marquee.height > 1 ? (
            <div className={styles.marquee} style={rectStyle(marquee)} data-testid="selection-marquee" />
          ) : null}

          {guides.x !== null ? <div className={styles.guideX} style={{ left: guides.x }} /> : null}
          {guides.y !== null ? <div className={styles.guideY} style={{ top: guides.y }} /> : null}
        </div>

        {placements.length === 0 ? (
          <div className={styles.empty}>
            <h2>Space for a world.</h2>
            <p>A place to gather ideas, follow threads,<br />and leave things where you can find them.</p>
          </div>
        ) : null}

        {showViewControls ? (
          <div className={styles.viewControls} onPointerDown={(event) => event.stopPropagation()}>
            <CanvasViewControls scale={viewport.scale} hasSelection={selection.size > 0}
              onZoomOut={() => updateViewport((current) => zoomAboutCentre(current, sizeRef.current, 1 / 1.2))}
              onZoomIn={() => updateViewport((current) => zoomAboutCentre(current, sizeRef.current, 1.2))}
              onResetZoom={() => updateViewport((current) => zoomAboutCentre(current, sizeRef.current, 1 / current.scale))}
              onFitBoard={() => fit()}
              onFitSelection={() => fit(placementsRef.current.filter((placement) => selection.has(placement.id)))} />
          </div>
        ) : null}

        {contextMenu ? (
          <div
            className={styles.contextMenu}
            role="menu"
            aria-label="Canvas context menu"
            data-world-x={contextMenu.world.x}
            data-world-y={contextMenu.world.y}
            onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setContextMenu(null); }}
            style={{ left: contextMenu.screen.x, top: contextMenu.screen.y }}
            onPointerDown={(event) => event.stopPropagation()}
            onContextMenu={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onKeyDown={(event) => {
              const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button"));
              const index = items.indexOf(document.activeElement as HTMLButtonElement);
              if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
                event.preventDefault(); event.stopPropagation();
                const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 :
                  (index + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
                items[next]?.focus(); return;
              }
              if (event.key !== "Escape") return;
              event.preventDefault();
              event.stopPropagation();
              setContextMenu(null);
              surface.current?.focus({ preventScroll: true });
            }}
          >
            <button
              ref={contextMenuFirstItem}
              type="button"
              role="menuitem"
              aria-label="Zoom Extents"
              onClick={() => {
                fit();
                setContextMenu(null);
                surface.current?.focus({ preventScroll: true });
              }}
            >
              <span>Zoom Extents</span>
              <kbd>0</kbd>
            </button>
            <button
              type="button"
              role="menuitem"
              aria-label="Actual Size"
              onClick={() => {
                updateViewport((current) => zoomAboutCentre(current, sizeRef.current, 1 / current.scale));
                setContextMenu(null);
                surface.current?.focus({ preventScroll: true });
              }}
            >
              <span>Actual Size</span>
              <kbd>1</kbd>
            </button>
            {selection.size > 0 ? (
              <button
                type="button"
                role="menuitem"
                aria-label="Clear Selection"
                onClick={() => {
                  setSelection(EMPTY);
                  setContextMenu(null);
                  surface.current?.focus({ preventScroll: true });
                }}
              >
                <span>Clear Selection</span>
                <kbd>Esc</kbd>
              </button>
            ) : null}
          </div>
        ) : null}

        <details className={styles.hint} onPointerDown={(event) => event.stopPropagation()}>
          <summary>Navigation help</summary>
          <div><p><kbd>Space</kbd> + drag or middle drag to pan</p><p>Scroll to zoom · two-finger scroll to pan</p><p><kbd>0</kbd> Fit Board · <kbd>1</kbd> Actual size · <kbd>F</kbd> Fit selection</p><p>Tab to an object · Enter to select · arrows to move</p></div>
        </details>

        {selection.size > 0 ? (
          <output className={styles.selectionCount} aria-live="polite">
            {selection.size} selected
          </output>
        ) : null}

        {diagnostics ? (
          <output className={styles.diagnostics}>
            {visiblePlacements.length} mounted / {placements.length} placements
          </output>
        ) : null}
      </div>
    </section>
  );
});

const ProxyCard = memo(function ProxyCard({
  placement,
  selected,
  onPointerDown,
  onSelect,
  onReveal
}: {
  placement: ProxyPlacement;
  selected: boolean;
  onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
  onSelect: (additive: boolean) => void;
  onReveal: () => void;
}) {
  return (
    <div
      className={styles.placement}
      data-tone={placement.tone ?? "paper"}
      data-selected={selected || undefined}
      data-placement-id={placement.id}
      data-presentation={placement.presentation}
      data-image={Boolean(placement.image) || undefined}
      style={rectStyle(placement)}
      role="button"
      aria-pressed={selected}
      aria-label={`${placement.kind}: ${placement.title}. ${placement.note}${placement.provenance ? `. ${placement.provenance}` : ""}`}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onFocus={onReveal}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault(); event.stopPropagation();
        onSelect(event.shiftKey || event.ctrlKey || event.metaKey);
      }}
    >
      {placement.image ? <img className={styles.artwork} src={placement.image.src} alt={placement.image.alt} draggable={false} decoding="async" /> : null}
      <span className={styles.kind}>{placement.kind}</span>{" "}
      <h2>{placement.title}</h2>{" "}
      <p>{placement.note}</p>{" "}
      {placement.provenance ? <span className={styles.accession}>{placement.provenance}</span> : null}
    </div>
  );
});

function SelectionFrame({
  bounds,
  count,
  id,
  onHandlePointerDown,
  onHandleKeyDown
}: {
  bounds: Rect;
  count: number;
  id: string | null;
  onHandlePointerDown: (
    id: string,
    handle: Handle
  ) => (event: React.PointerEvent<HTMLButtonElement>) => void;
  onHandleKeyDown: (id: string, handle: Handle) => (event: React.KeyboardEvent<HTMLButtonElement>) => void;
}) {
  return (
    <div className={styles.selectionFrame} style={rectStyle(bounds)} role="presentation">
      <i data-corner="nw" />
      <i data-corner="ne" />
      <i data-corner="se" />
      <i data-corner="sw" />
      {count === 1 && id
        ? (["nw", "ne", "se", "sw"] as const).map((handle) => (
            <button
              key={handle}
              type="button"
              className={styles.resizeHandle}
              data-handle={handle}
              aria-label={`Resize ${handle}`}
              title="Use arrow keys to resize; Shift for a larger step"
              onPointerDown={onHandlePointerDown(id, handle)}
              onKeyDown={onHandleKeyDown(id, handle)}
            />
          ))
        : null}
    </div>
  );
}

function snapTranslation(
  bounds: Rect,
  stationary: readonly Rect[],
  axis: "x" | "y",
  rawDelta: number,
  scale: number,
  bypass: boolean,
  grid: number
): { delta: number; guide: number | null } {
  if (bypass) return { delta: rawDelta, guide: null };
  const moved = {
    ...bounds,
    x: bounds.x + (axis === "x" ? rawDelta : 0),
    y: bounds.y + (axis === "y" ? rawDelta : 0)
  };
  const movingAnchors = axisAnchors(moved, axis);
  const candidates = stationary.flatMap((placement) => axisAnchors(placement, axis));
  const tolerance = 6 / Math.max(scale, 0.01);
  let closest: { offset: number; guide: number } | null = null;
  for (const anchor of movingAnchors) {
    for (const candidate of candidates) {
      const offset = candidate - anchor;
      if (Math.abs(offset) <= tolerance && (!closest || Math.abs(offset) < Math.abs(closest.offset))) {
        closest = { offset, guide: candidate };
      }
    }
  }
  if (closest) {
    const alignedStart = (axis === "x" ? moved.x : moved.y) + closest.offset;
    if (isGridAligned(alignedStart, grid)) {
      return { delta: rawDelta + closest.offset, guide: closest.guide };
    }
  }

  const start = axis === "x" ? moved.x : moved.y;
  const snapped = Math.round(start / grid) * grid;
  return { delta: rawDelta + snapped - start, guide: null };
}

function snapResize(
  rect: Rect,
  handle: Handle,
  stationary: readonly Rect[],
  scale: number,
  bypass: boolean,
  grid: number
): { rect: Rect; guides: Guides } {
  if (bypass) return { rect, guides: { x: null, y: null } };
  const xCandidates = stationary.flatMap((placement) => axisAnchors(placement, "x"));
  const yCandidates = stationary.flatMap((placement) => axisAnchors(placement, "y"));
  const east = handle.includes("e");
  const south = handle.includes("s");
  const horizontal = east ? rect.x + rect.width : rect.x;
  const vertical = south ? rect.y + rect.height : rect.y;
  const x = nearest(horizontal, xCandidates, scale, grid);
  const y = nearest(vertical, yCandidates, scale, grid);

  const next = { ...rect };
  if (east) next.width = Math.max(MIN_WIDTH, x.value - rect.x);
  else {
    const right = rect.x + rect.width;
    next.x = Math.min(x.value, right - MIN_WIDTH);
    next.width = right - next.x;
  }
  if (south) next.height = Math.max(MIN_HEIGHT, y.value - rect.y);
  else {
    const bottom = rect.y + rect.height;
    next.y = Math.min(y.value, bottom - MIN_HEIGHT);
    next.height = bottom - next.y;
  }
  return { rect: next, guides: { x: x.guide, y: y.guide } };
}

function nearest(value: number, candidates: readonly number[], scale: number, grid: number) {
  const tolerance = 6 / Math.max(scale, 0.01);
  let best: { value: number; guide: number | null; distance: number } | null = null;
  for (const candidate of candidates) {
    const distance = Math.abs(candidate - value);
    if (isGridAligned(candidate, grid) && distance <= tolerance && (!best || distance < best.distance)) {
      best = { value: candidate, guide: candidate, distance };
    }
  }
  return best ?? { value: Math.round(value / grid) * grid, guide: null };
}

function isGridAligned(value: number, grid: number): boolean {
  return Math.abs(value / grid - Math.round(value / grid)) < 1e-6;
}

function resizedRect(start: Rect, origin: Point, pointer: Point, handle: Handle): Rect {
  const dx = pointer.x - origin.x;
  const dy = pointer.y - origin.y;
  const east = handle.includes("e");
  const south = handle.includes("s");
  const right = start.x + start.width;
  const bottom = start.y + start.height;
  const x = east ? start.x : Math.min(start.x + dx, right - MIN_WIDTH);
  const y = south ? start.y : Math.min(start.y + dy, bottom - MIN_HEIGHT);
  const width = east ? Math.max(MIN_WIDTH, start.width + dx) : right - x;
  const height = south ? Math.max(MIN_HEIGHT, start.height + dy) : bottom - y;
  return { x, y, width, height };
}

function rectStyle(rect: Rect): CSSProperties {
  return { left: rect.x, top: rect.y, width: rect.width, height: rect.height };
}

function rectanglesOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function isTextEntry(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}


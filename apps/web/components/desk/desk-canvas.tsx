"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  boundsOf,
  centreOfView,
  centreOn,
  fitToBounds,
  panBy,
  rectFromCorners,
  screenToWorld,
  zoomAboutCentre,
  zoomBy,
  wheelNavigationIntent,
  type Point,
  type Rect,
  type Size,
  type Viewport
} from "@/lib/desk/viewport";
import { CanvasChrome, CanvasGlyph, CanvasSelectionToolbar, type MinimapMode, type PersistentCanvasTool } from "@/components/canvas/canvas-controls";
import { Button, IconButton } from "@/components/ui/control";
import { SpatialCollection } from "@/components/canvas/spatial-collection";
import { useSpatialCamera } from "@/components/canvas/use-spatial-camera";
import { collectionFor, collectionBounds, hitCollection, projectCollections } from "@/lib/desk/collections";
import { RelationshipComposer } from "@/components/world-objects/relationship-composer";
import { SemanticRelationshipEdge } from "@/components/world-objects/semantic-relationship-edge";
import { relationshipPhrase } from "@/lib/world/relationship-types";
import { relationshipLabelPosition } from "@/lib/desk/relationship-layout";
import {
  add,
  EMPTY_SELECTION,
  gridStep,
  only,
  soleMember,
  toggle,
  within,
  type Selection
} from "@/lib/desk/selection";
import { tierFor, type Tier } from "@/lib/desk/zoom";
import { cardRef, cardTitle, DEFAULT_CARD_WIDTH, DEFAULT_CARD_HEIGHT, type CardId, type RepresentationKind } from "@/lib/world/model";

import { DeskCard } from "./desk-card";
import { ObjectProposalPreview } from "@/components/world-objects/object-proposal";
import { previewObjectProposal, type CanvasObjectProposal, type ObjectProposalReviewAction } from "@/lib/world/object-proposal";
import type { SurfaceControlsRef } from "./surface-controls";
import type { DeskStore } from "./use-desk";
import styles from "./desk.module.css";
import { DeskContextMenu, type DeskMenuGroup } from "./desk-context-menu";

type Gesture =
  | { kind: "none" }
  | { kind: "pan"; pointerId: number; lastScreen: Point }
  | { kind: "pinch"; pointerId: number; pointerIds: readonly number[]; lastMid: Point; lastDistance: number }
  | { kind: "marquee"; pointerId: number; origin: Point; base: Selection; additive: boolean }
  | { kind: "resize"; pointerId: number; cardId: CardId; startWorld: Point; original: Size }
  | { kind: "drag"; pointerId: number; ids: readonly CardId[]; startWorld: Point; lastWorld: Point; moved: boolean; collectionId?: string; liftOffset?: Point; before: readonly import("@/lib/world/model").DeskCard[] };

const NUDGE_COMMIT_MS = 350;
const WHEEL_ZOOM_SENSITIVITY = 0.0022;

type Props = {
  store: DeskStore;
  /** What this composition calls itself when it is empty. */
  surfaceName: string;
  selection: Selection;
  onSelectionChange: (selection: Selection) => void;
  editing: CardId | null;
  onEditingChange: (cardId: CardId | null) => void;
  /** The card being deepened into, if any. Focus is a second, deliberate stage. */
  focusId: CardId | null;
  onFocusChange: (cardId: CardId | null, section?: import("@/components/world-objects/use-focus-history").FocusSection) => void;
  onInspect?: (cardId: CardId) => void;
  onFollow?: (link: import("@/lib/world/model").Link) => void;
  /** Cards the focused object is connected to. They do not recede. */
  neighbours: ReadonlySet<string>;
  /** Filled in here, so the chrome can place and reveal things on this canvas. */
  controls: SurfaceControlsRef;
  active?: boolean;
  proposals?: readonly CanvasObjectProposal[];
  onApplyProposal?: ObjectProposalReviewAction;
  onDismissProposal?: (proposalId: string) => void;
};

export function DeskCanvas({
  store,
  surfaceName,
  selection,
  onSelectionChange,
  editing,
  onEditingChange,
  focusId,
  onFocusChange,
  onInspect,
  onFollow,
  neighbours,
  controls,
  active = true,
  proposals = [],
  onApplyProposal,
  onDismissProposal
}: Props) {
  const surface = useRef<HTMLDivElement>(null);
  const { viewport, setViewport, navigate, stop: stopCamera } = useSpatialCamera();
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  const [toolbarInsets, setToolbarInsets] = useState({ top: 132, left: 84, right: 12, bottom: 90 });
  const [marquee, setMarquee] = useState<Rect | null>(null);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [interacting, setInteracting] = useState<Gesture["kind"]>("none");
  const [minimapMode, setMinimapMode] = useState<MinimapMode>("auto");
  const [gridVisible, setGridVisible] = useState(true);
  const [tool, setTool] = useState<PersistentCanvasTool>("select");
  const [connectionSource, setConnectionSource] = useState<CardId | null>(null);
  const [connectionTarget, setConnectionTarget] = useState<CardId | null>(null);
  const [contextMenu, setContextMenu] = useState<{ point: Point; world: Point; cardId?: CardId; collectionId?: string; page?: "paper" | "create" | "organize" | "size" } | null>(null);
  const [renameRequests, setRenameRequests] = useState<ReadonlyMap<string, number>>(new Map());
  const contextReturn = useRef<HTMLElement | null>(null);
  const [resizePreview, setResizePreview] = useState<{ cardId: CardId; width: number; height: number } | null>(null);
  const [expandedCards, setExpandedCards] = useState<ReadonlySet<CardId>>(new Set());
  const [measuredSizes, setMeasuredSizes] = useState<ReadonlyMap<CardId, Size>>(new Map());
  const collections = store.spatial?.collections ?? [];
  const collectionsRef = useRef(collections);
  collectionsRef.current = collections;
  const [liftedCards, setLiftedCards] = useState<ReadonlySet<CardId>>(new Set());
  const [frozenOrigins, setFrozenOrigins] = useState<ReadonlyMap<string, Point> | undefined>();
  const [dropCollection, setDropCollection] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const liftEpoch = useRef(0);
  useEffect(() => {
    const root = surface.current?.closest<HTMLElement>('[data-left-mode]');
    if (!root) return;
    const measure = () => {
      const style = getComputedStyle(root);
      const left = Number.parseFloat(style.getPropertyValue('--workspace-left-inset')) || 0;
      const right = Number.parseFloat(style.getPropertyValue('--workspace-right-inset')) || 0;
      const next = { top: Math.min(132, Math.max(12, size.height / 3)), left: left + (size.width > 480 ? 84 : 12), right: right + 12, bottom: Math.min(90, size.height / 4) };
      setToolbarInsets(current => Object.keys(next).every(key => current[key as keyof typeof current] === next[key as keyof typeof next]) ? current : next);
    };
    measure();
    const observer = new MutationObserver(measure);
    observer.observe(root, { attributes: true, attributeFilter: ['style', 'data-left-mode', 'data-right-mode'] });
    return () => observer.disconnect();
  }, [size]);
  useEffect(() => { if (!active) stopCamera(); }, [active, stopCamera]);

  const gesture = useRef<Gesture>({ kind: "none" });
  const touches = useRef(new Map<number, Point>());
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;
  const sizeRef = useRef(size);
  sizeRef.current = size;
  const nudgeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Disclosure and measured footprints belong to this Canvas, never to object state.
  const baseCards = useMemo(() => store.cards.map(card => {
    const expanded = expandedCards.has(card.cardId);
    const measured = measuredSizes.get(card.cardId);
    const preview = resizePreview?.cardId === card.cardId ? resizePreview : null;
    return { ...card, layout: { ...card.layout, width: preview?.width ?? (expanded ? Math.max(400, card.layout.width) : card.layout.width), height: preview?.height ?? measured?.height ?? card.layout.height } };
  }), [store.cards, expandedCards, measuredSizes, resizePreview]);
  const cards = useMemo(() => projectCollections(baseCards, collections, liftedCards, frozenOrigins), [baseCards, collections, liftedCards, frozenOrigins]);
  const toggleExpanded = (cardId: CardId) => setExpandedCards(current => { const next = new Set(current); if (next.has(cardId)) next.delete(cardId); else next.add(cardId); return next; });
  const measureCard = (cardId: CardId, width: number, height: number) => {
    if (!width || !height) return;
    setMeasuredSizes(current => { const previous = current.get(cardId); if (previous && Math.abs(previous.width - width) < 1 && Math.abs(previous.height - height) < 1) return current; return new Map(current).set(cardId, { width, height }); });
  };
  const cardsRef = useRef(cards);
  cardsRef.current = cards;
  const initialFootprints = useRef(store.cards.map(card => card.cardId));
  const fittedFootprints = useRef(false);
  useEffect(() => {
    if (fittedFootprints.current || !initialFootprints.current.length || !size.width) return;
    if (!initialFootprints.current.every(id => measuredSizes.has(id))) return;
    fittedFootprints.current = true;
    setViewport(fitSpatialScene(cards, collections, size));
  }, [cards, measuredSizes, size]);
  const chooseConnectionCard = (cardId: CardId) => {
    if (!connectionSource) { setConnectionSource(cardId); onSelectionChange(only(cardId)); }
    else if (connectionSource !== cardId) setConnectionTarget(cardId);
  };
  const changeTool = (next: PersistentCanvasTool) => {
    setTool(next); setConnectionTarget(null);
    setConnectionSource(next === "connect" ? soleMember(selection) : null);
  };

  // Centre the origin once we know how big the surface is, so an empty Desk
  // opens looking at (0, 0) rather than with it pinned to the top-left corner.
  const centred = useRef(false);
  useEffect(() => {
    const node = surface.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const next = {
        width: entry.contentRect.width,
        height: entry.contentRect.height
      };
      setSize(next);
      if (!centred.current && next.width > 0) {
        centred.current = true;
        setViewport(
          fitSpatialScene(cardsRef.current, collectionsRef.current, next)
        );
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  /*
   * What the chrome can ask of this canvas.
   *
   * Read through refs rather than state so that the Finder holding these does
   * not re-render on every frame of a pan — and answered here rather than
   * lifted, because where the GM is looking is a property of the surface, not
   * something the surrounding frame should be tracking.
   */
  useEffect(() => {
    controls.current = {
      landing: () => centreOfView(viewportRef.current, sizeRef.current),
      reveal: (cardId) => {
        const card = cardsRef.current.find((c) => c.cardId === cardId);
        if (!card) return;
        navigate(centreOn(viewportRef.current, sizeRef.current, card.layout));
      }
    };
    return () => {
      controls.current = null;
    };
  }, [controls, navigate]);

  const toWorld = useCallback((event: { clientX: number; clientY: number }): Point => {
    const rect = surface.current?.getBoundingClientRect();
    const local = {
      x: event.clientX - (rect?.left ?? 0),
      y: event.clientY - (rect?.top ?? 0)
    };
    return screenToWorld(viewportRef.current, local);
  }, []);

  // Wheel must be a non-passive listener or the browser scrolls the page under us.
  useEffect(() => {
    const node = surface.current;
    if (!node) return;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (gesture.current.kind !== "none") return;
      const rect = node.getBoundingClientRect();
      fittedFootprints.current = true;
      setContextMenu(null);
      const anchor = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      const multiplier = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? sizeRef.current.height : 1;
      if (wheelNavigationIntent(event) === "zoom") {
        const factor = Math.exp(-event.deltaY * multiplier * WHEEL_ZOOM_SENSITIVITY);
        setViewport((current) => {
          const next = zoomBy(current, anchor, factor);
          viewportRef.current = next;
          return next;
        });
      } else {
        setViewport((current) => {
          const next = panBy(current, -event.deltaX * multiplier, -event.deltaY * multiplier);
          viewportRef.current = next;
          return next;
        });
      }
    };

    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    if (!active) { setSpaceHeld(false); return; }
    const down = (event: KeyboardEvent) => {
      if (event.code === "Space" && !isTextEntry(event.target) &&
          !(event.target instanceof Element && event.target.closest("button, a, summary")) &&
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
  }, [active]);

  const commitNudgeSoon = useCallback(
    (ids: readonly CardId[]) => {
      if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
      nudgeTimer.current = setTimeout(() => store.commitMove(ids), NUDGE_COMMIT_MS);
    },
    [store]
  );

  const captureAt = useCallback(
    (world: Point) => {
      const cardId = store.capture(world.x, world.y);
      onSelectionChange(only(cardId));
      onEditingChange(cardId);
    },
    [onEditingChange, onSelectionChange, store]
  );

  const onSurfacePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0 && event.button !== 1) return;
      if (gesture.current.kind !== "none") return;
      fittedFootprints.current = true;
      setContextMenu(null);
      event.preventDefault();
      surface.current?.focus({ preventScroll: true });
      if (editing) {
        // Let the editor's blur commit its local draft before Canvas acts.
        onSelectionChange(EMPTY_SELECTION);
        return;
      }
      event.currentTarget.setPointerCapture(event.pointerId);

      const panning = event.button === 1 || tool === "hand" || spaceHeld || event.pointerType === "touch";
      if (panning) {
        gesture.current = { kind: "pan", pointerId: event.pointerId, lastScreen: { x: event.clientX, y: event.clientY } };
        setInteracting("pan");
        return;
      }

      const additive = event.shiftKey || event.metaKey || event.ctrlKey;
      gesture.current = {
        kind: "marquee",
        pointerId: event.pointerId,
        origin: toWorld(event),
        base: additive ? selection : EMPTY_SELECTION,
        additive
      };
      setInteracting("marquee");
      if (!additive) onSelectionChange(EMPTY_SELECTION);
      setMarquee({ x: 0, y: 0, width: 0, height: 0 });
    },
    [editing, onEditingChange, onSelectionChange, selection, spaceHeld, store, toWorld, tool]
  );

  const onCardPointerDown = useCallback(
    (cardId: CardId) => (event: React.PointerEvent<HTMLElement>) => {
      if (event.button !== 0) return;
      if (spaceHeld) return;
      if (gesture.current.kind !== "none") return;
      event.stopPropagation();
      setContextMenu(null);
      if (editing === cardId) return;
      event.preventDefault();
      surface.current?.focus({ preventScroll: true });
      if (tool === "hand") {
        surface.current?.setPointerCapture(event.pointerId);
        gesture.current = { kind: "pan", pointerId: event.pointerId, lastScreen: { x: event.clientX, y: event.clientY } };
        setInteracting("pan");
        return;
      }
      if (tool === "connect") { chooseConnectionCard(cardId); return; }
      stopCamera();
      liftEpoch.current += 1;
      if (editing) {
        return;
      }

      const additive = event.shiftKey || event.metaKey || event.ctrlKey;
      let next: Selection;
      if (additive) {
        next = toggle(selection, cardId);
      } else if (selection.has(cardId)) {
        // Whole-collection movement belongs to its boundary/heading. A member
        // remains an independently draggable placement even after group selection.
        const wholeCollection = collectionsRef.current.some(group => group.cardIds.length === selection.size && group.cardIds.every(id => selection.has(id)));
        next = wholeCollection ? only(cardId) : selection;
      } else {
        next = only(cardId);
      }
      onSelectionChange(next);

      // Toggling a card off is a selection change, not the start of a drag.
      if (!next.has(cardId)) return;

      gesture.current = {
        kind: "drag",
        pointerId: event.pointerId,
        ids: [...next],
        startWorld: toWorld(event),
        lastWorld: toWorld(event),
        moved: false,
        before: store.cards.filter(card => next.has(card.cardId))
      };
      setInteracting("drag");
    },
    [editing, onEditingChange, onSelectionChange, selection, spaceHeld, store, toWorld, tool, connectionSource]
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const active = gesture.current;
      if (event.pointerType === "touch" && touches.current.has(event.pointerId)) touches.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (active.kind === "pinch") {
        const points = active.pointerIds.map(id => touches.current.get(id)).filter((point): point is Point => Boolean(point));
        if (points.length !== 2) return;
        const mid = { x: (points[0]!.x + points[1]!.x) / 2, y: (points[0]!.y + points[1]!.y) / 2 };
        const distance = Math.max(1, Math.hypot(points[0]!.x - points[1]!.x, points[0]!.y - points[1]!.y));
        const rect = surface.current!.getBoundingClientRect();
        setViewport(current => zoomBy(panBy(current, mid.x - active.lastMid.x, mid.y - active.lastMid.y), { x: mid.x - rect.left, y: mid.y - rect.top }, distance / active.lastDistance));
        active.lastMid = mid; active.lastDistance = distance;
        return;
      }
      if (active.kind !== "none" && active.pointerId !== event.pointerId) return;
      switch (active.kind) {
        case "none":
          return;
        case "pan": {
          const dx = event.clientX - active.lastScreen.x;
          const dy = event.clientY - active.lastScreen.y;
          active.lastScreen = { x: event.clientX, y: event.clientY };
          setViewport((current) => panBy(current, dx, dy));
          return;
        }
        case "resize": {
          const world = toWorld(event);
          setResizePreview({ cardId: active.cardId,
            width: Math.round(Math.min(720, Math.max(180, active.original.width + world.x - active.startWorld.x))),
            height: Math.round(Math.min(640, Math.max(120, active.original.height + world.y - active.startWorld.y))) });
          return;
        }
        case "marquee": {
          const band = rectFromCorners(active.origin, toWorld(event));
          setMarquee(band);
          const caught = within(cardsRef.current, band);
          onSelectionChange(active.additive ? add(active.base, caught) : new Set(caught));
          return;
        }
        case "drag": {
          const world = toWorld(event);
          if (!active.moved && Math.hypot(world.x - active.startWorld.x, world.y - active.startWorld.y) * viewportRef.current.scale < 3) return;
          if (!active.moved) surface.current?.setPointerCapture(event.pointerId);
          if (!active.moved && !active.collectionId && active.ids.length === 1) {
            const id = active.ids[0]!;
            const collection = collectionFor(collectionsRef.current, id);
            const projected = cardsRef.current.find(card => card.cardId === id);
            const original = store.byId.get(id);
            if (collection?.collapsed && projected && original) {
              const origins = new Map<string, Point>();
              for (const group of collectionsRef.current) {
                const rect = collectionBounds(group, cardsRef.current);
                if (rect) origins.set(group.id, { x: rect.x + 26, y: rect.y + 64 });
              }
              setFrozenOrigins(origins);
              active.liftOffset = { x: projected.layout.x - original.layout.x, y: projected.layout.y - original.layout.y };
              store.nudge([id], active.liftOffset.x, active.liftOffset.y);
              setLiftedCards(new Set([id]));
            }
          }
          const dx = world.x - active.lastWorld.x;
          const dy = world.y - active.lastWorld.y;
          if (dx === 0 && dy === 0) return;
          active.lastWorld = world;
          active.moved = true;
          store.nudge(active.ids, dx, dy);
          if (!active.collectionId) setDropCollection(hitCollection(world, collectionsRef.current, cardsRef.current, new Set(active.ids))?.id ?? null);
        }
      }
    },
    [onSelectionChange, store, toWorld]
  );

  const endGesture = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const active = gesture.current;
      touches.current.delete(event.pointerId);
      if (active.kind === "pinch") {
        const remaining = [...touches.current.entries()][0];
        gesture.current = remaining ? { kind: "pan", pointerId: remaining[0], lastScreen: remaining[1] } : { kind: "none" };
        setInteracting(remaining ? "pan" : "none");
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        return;
      }
      if (active.kind === "none" || active.pointerId !== event.pointerId) return;
      gesture.current = { kind: "none" };
      setInteracting("none");
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      setMarquee(null);
      if (active.kind === "resize") {
        if (resizePreview?.cardId === active.cardId) void store.resizeCard(active.cardId, resizePreview.width, resizePreview.height);
        setResizePreview(null);
        return;
      }
      if (active.kind === "drag" && active.moved) {
        const destination = active.collectionId ? undefined : hitCollection(toWorld(event), collectionsRef.current, cardsRef.current, new Set(active.ids));
        if (active.collectionId || destination || active.ids.some(id => collectionFor(collectionsRef.current, id))) {
          const epoch = liftEpoch.current;
          void store.commitCollectionMove(active.ids, active.collectionId ? undefined : destination?.id ?? null, active.before).then(ok => {
            if (epoch === liftEpoch.current) { setLiftedCards(new Set()); setFrozenOrigins(undefined); }
            setAnnouncement(ok ? destination ? `Added to ${destination.title}.` : "Collection arrangement saved." : "The arrangement could not be saved. Review the Board and try again.");
          });
          setDropCollection(null);
          return;
        }
        store.commitMove(active.ids);
      }
      setLiftedCards(new Set()); setFrozenOrigins(undefined); setDropCollection(null);
    },
    [store, toWorld, resizePreview]
  );

  const cancelGesture = useCallback(() => {
    const active = gesture.current;
    gesture.current = { kind: "none" };
    liftEpoch.current += 1;
    setInteracting("none");
    setResizePreview(null);
    touches.current.clear();
    if (active.kind === "drag" && active.moved) {
      store.nudge(active.ids, active.startWorld.x - active.lastWorld.x - (active.liftOffset?.x ?? 0), active.startWorld.y - active.lastWorld.y - (active.liftOffset?.y ?? 0));
      store.cancelMove();
    } else if (active.kind === "marquee") onSelectionChange(active.base);
    if (active.kind !== "none" && surface.current?.hasPointerCapture(active.pointerId)) surface.current.releasePointerCapture(active.pointerId);
    setMarquee(null);
    setLiftedCards(new Set()); setFrozenOrigins(undefined); setDropCollection(null);
  }, [onSelectionChange, store]);

  useEffect(() => {
    window.addEventListener("blur", cancelGesture);
    return () => window.removeEventListener("blur", cancelGesture);
  }, [cancelGesture]);

  useEffect(() => {
    if (!active) return;
    const historyKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || isTextEntry(event.target) || !(event.metaKey || event.ctrlKey)) return;
      if (event.target !== document.body && !(event.target instanceof Node && surface.current?.contains(event.target))) return;
      if (event.key.toLowerCase() === "z" || event.key.toLowerCase() === "y") {
        event.preventDefault();
        if (event.shiftKey || event.key.toLowerCase() === "y") void store.redo(); else void store.undo();
      }
    };
    window.addEventListener("keydown", historyKey);
    return () => window.removeEventListener("keydown", historyKey);
  }, [active, store]);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.defaultPrevented) return;
      if (isTextEntry(event.target)) return;
      if (event.target instanceof Element && event.target.closest("button, a, [role=menu]")) return;
      const ids = [...selection];

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) void store.redo(); else void store.undo();
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "y") { event.preventDefault(); void store.redo(); return; }
      if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) {
        event.preventDefault();
        const target = event.target as HTMLElement;
        const rect = target.getBoundingClientRect();
        contextReturn.current = target;
        const cardId = target.closest<HTMLElement>('[data-card-id]')?.dataset.cardId as CardId | undefined ?? soleMember(selection) ?? undefined;
        if (cardId && !selection.has(cardId)) onSelectionChange(only(cardId));
        setContextMenu({ point: { x: rect.left + Math.min(rect.width / 2, 120), y: rect.top + Math.min(rect.height / 2, 80) }, world: centreOfView(viewportRef.current, sizeRef.current), cardId });
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "g" && ids.length) {
        event.preventDefault();
        if (event.shiftKey) void store.changeCollection({ kind: "transfer", id: null, cardIds: ids });
        else void store.changeCollection({ kind: "create", id: crypto.randomUUID(), title: "Research collection", cardIds: ids, collapsed: false });
        return;
      }

      if (event.key === "Escape") {
        if (contextMenu) { event.preventDefault(); setContextMenu(null); return; }
        if (gesture.current.kind !== "none") { event.preventDefault(); cancelGesture(); return; }
        if (tool !== "select") { event.preventDefault(); changeTool("select"); return; }
        // Leave the deepest thing first. Escaping out of Focus and out of the
        // selection at once would lose the place the reader was in.
        if (focusId !== null) {
          onFocusChange(null);
          return;
        }
        const sole = soleMember(selection);
        if (sole && expandedCards.has(sole)) { event.preventDefault(); toggleExpanded(sole); return; }
        onSelectionChange(EMPTY_SELECTION);
        return;
      }
      if (!event.metaKey && !event.ctrlKey && !event.altKey && (event.key === "0" || event.key === "1" || event.key === "+" || event.key === "=" || event.key === "-")) {
        event.preventDefault();
        if (event.key === "0") setViewport(fitToBounds(boundsOf(cardsRef.current.map((card) => card.layout)), sizeRef.current));
        else setViewport((current) => zoomAboutCentre(current, sizeRef.current, event.key === "1" ? 1 / current.scale : event.key === "-" ? 1 / 1.2 : 1.2));
        return;
      }
      if (event.key.toLowerCase() === "f" && !event.metaKey && !event.ctrlKey) {
        const sole = soleMember(selection);
        if (sole) {
          event.preventDefault();
          onFocusChange(focusId === sole ? null : sole);
        }
        return;
      }
      if (event.key.toLowerCase() === "e" && !event.metaKey && !event.ctrlKey && !event.altKey) {
        const sole = soleMember(selection);
        if (sole) { event.preventDefault(); toggleExpanded(sole); }
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "a") {
        event.preventDefault();
        onSelectionChange(new Set(cardsRef.current.map((card) => card.cardId)));
        return;
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        if (ids.length === 0) return;
        event.preventDefault();
        store.remove(ids);
        onSelectionChange(EMPTY_SELECTION);
        return;
      }
      if (event.key === "Enter") {
        const single = soleMember(selection);
        if (single) {
          event.preventDefault();
          onFocusChange(single);
        }
        return;
      }
      if (event.key === "F2") {
        const single = soleMember(selection);
        if (single) { event.preventDefault(); onEditingChange(single); }
        return;
      }
      if (event.key === "n" && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        captureAt(screenToWorld(viewportRef.current, { x: size.width / 2, y: size.height / 2 }));
        return;
      }

      const step = event.shiftKey ? 32 : 8;
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

      if (delta && ids.length > 0) {
        event.preventDefault();
        store.nudge(ids, delta.x, delta.y);
        commitNudgeSoon(ids);
      }
    },
    [
      captureAt,
      cancelGesture,
      commitNudgeSoon,
      focusId,
      expandedCards,
      onEditingChange,
      onFocusChange,
      onSelectionChange,
      selection,
      size,
      store,
      tool,
      contextMenu
    ]
  );

  const pitch = useMemo(() => gridStep(viewport.scale), [viewport.scale]);

  /*
   * Semantic zoom. The tier is state rather than a pure derivation of scale
   * because hysteresis needs to know where it came from — that is what stops a
   * card rewriting itself on every frame of a pinch.
   */
  const [tier, setTier] = useState<Tier>(() => tierFor(viewport.scale));
  useEffect(() => {
    setTier((previous) => tierFor(viewport.scale, previous));
  }, [viewport.scale]);

  const zoom = useCallback(
    (factor: number) => navigate(zoomAboutCentre(viewportRef.current, size, factor)),
    [navigate, size]
  );
  const fit = useCallback(
    () => navigate(fitSpatialScene(cards, collections, size)),
    [cards, collections, navigate, size]
  );
  const selectedCards = cards.filter(card => selection.has(card.cardId));
  const selectionBounds = boundsOf(selectedCards.map(card => card.layout));
  const selectedCard = selectedCards.length === 1 ? selectedCards[0] : null;
  const source = cards.find(card => card.cardId === connectionSource);
  const target = cards.find(card => card.cardId === connectionTarget);
  const fitSelected = () => navigate(fitToBounds(selectionBounds, size));
  const selectedCollection = collections.find(collection => collection.cardIds.length === selection.size && collection.cardIds.every(id => selection.has(id)));
  const toolbarCollection = selectedCollection ?? (selectedCard && collectionFor(collections, selectedCard.cardId)?.collapsed ? collectionFor(collections, selectedCard.cardId) : undefined);
  const toolbarBounds = toolbarCollection ? collectionBounds(toolbarCollection, cards) ?? selectionBounds : selectionBounds;
  const toolbarVisible = Boolean(toolbarBounds) && selectedCards.length > 0 && !editing && !focusId && !contextMenu && interacting === "none" && tool === "select";
  // One expanded card carries its actions as an attached tray; its own hover actions stand down.
  const trayCardId = toolbarVisible && selectedCard && !toolbarCollection && expandedCards.has(selectedCard.cardId) ? selectedCard.cardId : null;
  const collectSelection = (collapsed: boolean) => {
    if (!selection.size) { setAnnouncement("Select cards, then collect them into a Section or Stack."); return; }
    void store.changeCollection({ kind: "create", id: crypto.randomUUID(), title: "Research collection", cardIds: [...selection].sort((a, b) => (store.byId.get(a)?.z ?? 0) - (store.byId.get(b)?.z ?? 0)), collapsed });
    setAnnouncement(collapsed ? "Cards gathered into a stack." : "Collection created. Drag its heading to move it together.");
  };
  const bringForward = (id: CardId) => {
    const group = collectionFor(collections, id);
    if (group) void store.changeCollection({ kind: "reorder", id: group.id, cardIds: [...group.cardIds.filter(member => member !== id), id] });
    else store.commitMove([id]);
    onSelectionChange(only(id));
  };
  const moveCollection = (id: string, event: React.PointerEvent<HTMLElement>) => {
    if (event.button !== 0 || gesture.current.kind !== "none" || tool !== "select") return;
    const group = collections.find(collection => collection.id === id);
    if (!group) return;
    event.preventDefault(); event.stopPropagation(); stopCamera();
    onSelectionChange(new Set(group.cardIds));
    surface.current?.focus({ preventScroll: true });
    liftEpoch.current += 1;
    gesture.current = { kind: "drag", collectionId: id, ids: group.cardIds, pointerId: event.pointerId, startWorld: toWorld(event), lastWorld: toWorld(event), moved: false, before: store.cards.filter(card => group.cardIds.includes(card.cardId)) };
    setInteracting("drag");
  };
  const tidySelection = () => {
    void store.arrangeCards([...selection], new Map(selectedCards.map(card => [card.cardId, card.layout])));
  };
  const openContextMenu = (event: React.MouseEvent<HTMLElement>, cardId?: CardId, collectionId?: string) => {
    if (editing) return;
    event.preventDefault(); event.stopPropagation();
    const node = event.currentTarget;
    const rect = node.getBoundingClientRect();
    const point = event.clientX || event.clientY ? { x: event.clientX, y: event.clientY } : { x: rect.left + Math.min(rect.width / 2, 120), y: rect.top + Math.min(rect.height / 2, 80) };
    contextReturn.current = node;
    if (cardId && !selection.has(cardId)) onSelectionChange(only(cardId));
    if (collectionId) {
      const group = collections.find(item => item.id === collectionId);
      if (group) onSelectionChange(new Set(group.cardIds));
    }
    setContextMenu({ point, world: toWorld({ clientX: point.x, clientY: point.y }), cardId, collectionId });
  };
  const beginResize = (card: import("@/lib/world/model").DeskCard, event: React.PointerEvent<HTMLElement>) => {
    if (event.button !== 0 || gesture.current.kind !== "none" || editing) return;
    event.preventDefault(); event.stopPropagation(); stopCamera();
    setContextMenu(null);
    onSelectionChange(only(card.cardId));
    surface.current?.setPointerCapture(event.pointerId);
    gesture.current = { kind: "resize", pointerId: event.pointerId, cardId: card.cardId, startWorld: toWorld(event), original: { width: card.layout.width, height: card.layout.height } };
    setResizePreview({ cardId: card.cardId, width: card.layout.width, height: card.layout.height });
    setInteracting("resize");
  };
  const arrangeCollection = (collectionId: string) => {
    const group = collections.find(item => item.id === collectionId);
    if (!group) return;
    const members = baseCards.filter(card => group.cardIds.includes(card.cardId));
    void store.arrangeCards(group.cardIds, new Map(members.map(card => [card.cardId, card.layout])));
  };
  const createMaterial = (kind: RepresentationKind | "fragment", point: Point) => {
    const id = store.capture(point.x, point.y, "", kind === "fragment" ? undefined : kind);
    onSelectionChange(only(id));
    if (kind === "fragment" || kind === "note") onEditingChange(id); else onFocusChange(id);
  };
  const menuCard = contextMenu?.cardId ? store.byId.get(contextMenu.cardId) : selectedCard;
  const menuCollection = contextMenu?.collectionId ? collections.find(item => item.id === contextMenu.collectionId) : null;
  const menuIds = menuCollection?.cardIds ?? (contextMenu?.cardId && !selection.has(contextMenu.cardId) ? [contextMenu.cardId] : [...selection]);
  const menuGroups: DeskMenuGroup[] = !contextMenu ? [] : contextMenu.page === "create" ? [{ actions: [{ label: "Back", keepOpen: true, onSelect: () => setContextMenu({ ...contextMenu, page: undefined }) }] }, { label: "Create world material", actions: (["character", "place", "faction", "artifact", "event", "thread", "note", "source"] as const).map(kind => ({ label: kind.charAt(0).toUpperCase() + kind.slice(1), onSelect: () => createMaterial(kind, contextMenu.world) })) }] : contextMenu.page === "paper" ? [
    { actions: [{ label: "Back", keepOpen: true, onSelect: () => setContextMenu({ ...contextMenu, page: undefined }) }] },
    { label: "Paper tint · this Board", actions: ([['paper', 'Natural paper', '#fbf9f4'], ['sand', 'Warm sand', '#f4ecdc'], ['sage', 'Pale sage', '#edf0e7'], ['slate', 'Soft slate', '#eaf0f2'], ['rose', 'Dusty rose', '#f4e9e5']] as const).map(([tint, label, swatch]) => ({ label, swatch, onSelect: () => { void store.setCardTint(menuIds, tint); } })) }
  ] : contextMenu.page === "size" ? [
    { actions: [{ label: "Back", keepOpen: true, onSelect: () => setContextMenu({ ...contextMenu, page: undefined }) }] },
    { label: "Card dimensions · this Board", actions: ([['Standard', DEFAULT_CARD_WIDTH, DEFAULT_CARD_HEIGHT], ['Wide', 360, 220], ['Large', 440, 300]] as const).map(([label, width, height]) => ({ label, onSelect: () => { if (menuCard) void store.resizeCard(menuCard.cardId, width, height); } })) }
  ] : contextMenu.page === "organize" ? [
    { actions: [{ label: "Back", keepOpen: true, onSelect: () => setContextMenu({ ...contextMenu, page: undefined }) }] },
    { label: "Add to collection", actions: collections.filter(group => !menuIds.every(id => group.cardIds.includes(id))).map(group => ({ label: group.title, onSelect: () => { void store.changeCollection({ kind: "transfer", id: group.id, cardIds: menuIds }); } })) }
  ] : menuCollection ? [
    { actions: [{ label: menuCollection.collapsed ? "Expand collection" : "Stack collection", shortcut: "E", onSelect: () => { void store.changeCollection({ kind: "collapse", id: menuCollection.id, collapsed: !menuCollection.collapsed }); } }, { label: "Arrange cards", onSelect: () => arrangeCollection(menuCollection.id) }, { label: "Rename collection", shortcut: "F2", onSelect: () => setRenameRequests(current => new Map(current).set(menuCollection.id, (current.get(menuCollection.id) ?? 0) + 1)) }] },
    { actions: [{ label: "Paper tint…", keepOpen: true, onSelect: () => setContextMenu({ ...contextMenu, page: "paper" }) }, { label: "Ungroup cards", onSelect: () => { void store.changeCollection({ kind: "dissolve", id: menuCollection.id }); } }] }
  ] : contextMenu.cardId ? [
    { actions: [{ label: "Open Focus", shortcut: "F", onSelect: () => onFocusChange(contextMenu.cardId!) }, { label: "Open in Builder", shortcut: "Enter", onSelect: () => onEditingChange(contextMenu.cardId!) }, { label: expandedCards.has(contextMenu.cardId) ? "Collapse card" : "Expand card", shortcut: "E", onSelect: () => toggleExpanded(contextMenu.cardId!) }, { label: "Connect to…", shortcut: "L", onSelect: () => { onSelectionChange(only(contextMenu.cardId!)); setConnectionSource(contextMenu.cardId!); setTool("connect"); } }] },
    { label: "On this Board", actions: [{ label: "Bring to front", onSelect: () => bringForward(contextMenu.cardId!) }, { label: "Card size…", keepOpen: true, onSelect: () => setContextMenu({ ...contextMenu, page: "size" }) }, { label: "Paper tint…", keepOpen: true, onSelect: () => setContextMenu({ ...contextMenu, page: "paper" }) }, ...(menuIds.length > 1 ? [{ label: "Arrange selected cards", onSelect: tidySelection }] : []), { label: "Collect in stack", onSelect: () => collectSelection(true) }, { label: "Create Section", onSelect: () => collectSelection(false) }, ...(collections.length ? [{ label: "Add to collection…", keepOpen: true, onSelect: () => setContextMenu({ ...contextMenu, page: "organize" as const }) }] : []), ...(menuIds.some(id => collectionFor(collections, id)) ? [{ label: "Take out of collection", onSelect: () => { void store.changeCollection({ kind: "transfer", id: null, cardIds: menuIds }); } }] : [])] },
    { label: "Relationship visibility", actions: (menuCard?.links ?? []).filter(link => link.relationshipId).map(link => {
      const relationshipId = link.relationshipId!;
      const owner = cards.find(card => card.presentation?.semanticEdges?.includes(relationshipId));
      const otherHere = cards.some(card => card.objectId === link.other.objectId);
      return { label: `${owner ? "Hide" : "Show"} ${relationshipPhrase(link.claimKind, link.direction)} · ${link.other.label}`, disabled: !owner && !otherHere,
        onSelect: () => { if (menuCard) void store.setRelationshipVisible(owner?.cardId ?? menuCard.cardId, relationshipId, !owner); } };
    }) },
    { actions: [{ label: "Remove from Board", destructive: true, shortcut: "Delete", onSelect: () => { store.remove(menuIds); onSelectionChange(EMPTY_SELECTION); } }] }
  ] : [
    { actions: [{ label: "New fragment", shortcut: "N", onSelect: () => createMaterial("fragment", contextMenu.world) }, { label: "Create world material…", keepOpen: true, onSelect: () => setContextMenu({ ...contextMenu, page: "create" }) }, ...(selection.size ? [{ label: "Collect selection in stack", onSelect: () => collectSelection(true) }, { label: "Arrange selected cards", onSelect: tidySelection }] : [])] },
    { actions: [{ label: "Undo arrangement", shortcut: "Ctrl Z", disabled: !store.canUndo, onSelect: () => { void store.undo(); } }, { label: "Redo arrangement", shortcut: "Ctrl Shift Z", disabled: !store.canRedo, onSelect: () => { void store.redo(); } }] },
    { actions: [{ label: "Fit Board", shortcut: "0", onSelect: fit }, { label: "Actual size", shortcut: "1", onSelect: () => zoom(1 / viewport.scale) }, { label: gridVisible ? "Hide dot grid" : "Show dot grid", onSelect: () => setGridVisible(current => !current) }] }
  ];
  const edgeCard = focusId ? cards.find(card => card.cardId === focusId) : selectedCard;
  const edgeGroups = new Map<string, { owner: typeof cards[number]; links: import("@/lib/world/model").Link[]; explicit: boolean }>();
  const projectedRelationships = new Set<string>();
  const addEdge = (owner: typeof cards[number], link: import("@/lib/world/model").Link, explicit: boolean) => {
    const identity = link.relationshipId ?? link.claimId;
    if (projectedRelationships.has(identity)) return;
    const other = cards.find(card => card.objectId === link.other.objectId);
    if (!other) return;
    projectedRelationships.add(identity);
    const canonical = owner.objectId < other.objectId;
    const source = canonical ? owner : other;
    const normalized = canonical ? link : { ...link, direction: link.direction === "out" ? "in" as const : "out" as const, other: cardRef(owner) };
    const key = [owner.objectId, other.objectId].sort().join(":");
    const group = edgeGroups.get(key) ?? { owner: source, links: [], explicit: false };
    group.links.push(normalized); group.explicit ||= explicit; edgeGroups.set(key, group);
  };
  for (const owner of cards) for (const link of owner.links) if (link.relationshipId && owner.presentation?.semanticEdges?.includes(link.relationshipId)) addEdge(owner, link, true);
  if (edgeCard) for (const link of edgeCard.links) addEdge(edgeCard, link, false);
  const occupiedEdgeLabels: Rect[] = [];
  const activePlacementZ = Math.max(0, ...cards.map(card => card.z)) + 1000;
  const lastMenu = useRef<{ point: Point; label: string; groups: DeskMenuGroup[] } | null>(null);
  if (contextMenu) lastMenu.current = { point: contextMenu.point, label: menuCollection ? "Collection actions" : contextMenu.cardId ? "Card actions" : "Canvas actions", groups: menuGroups };

  return (
    <div className={styles.canvasFrame} onKeyDown={event => {
      if (event.key === "Escape" && !event.defaultPrevented && !surface.current?.contains(event.target as Node)) {
        event.preventDefault();
        if (contextMenu) setContextMenu(null); else onSelectionChange(EMPTY_SELECTION);
      }
    }}>
      <div
        ref={surface}
        className={styles.canvas}
        data-panning={spaceHeld || undefined}
        data-interacting={interacting !== "none" ? interacting : undefined}
        data-tool={tool}
        role="application"
        aria-label="Desk canvas"
        tabIndex={0}
        onPointerDown={onSurfacePointerDown}
        onPointerDownCapture={event => {
          if (event.pointerType !== "touch") return;
          touches.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
          if (touches.current.size !== 2) return;
          event.preventDefault(); event.stopPropagation();
          const points = [...touches.current.entries()];
          cancelGesture(); stopCamera();
          touches.current = new Map(points);
          const a = points[0]![1], b = points[1]![1];
          gesture.current = { kind: "pinch", pointerId: points[0]![0], pointerIds: points.map(([id]) => id), lastMid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, lastDistance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)) };
          for (const [id] of points) surface.current?.setPointerCapture(id);
          setInteracting("pinch"); setContextMenu(null);
        }}
        onPointerMove={onPointerMove}
        onPointerUp={endGesture}
        onPointerCancel={(event) => { if (gesture.current.kind !== "none" && gesture.current.pointerId === event.pointerId) cancelGesture(); }}
        onLostPointerCapture={(event) => { if (gesture.current.kind !== "none" && gesture.current.pointerId === event.pointerId) cancelGesture(); }}
        onKeyDown={onKeyDown}
        onContextMenu={event => openContextMenu(event)}
        onKeyDownCapture={event => {
          if (tool !== "connect" || event.key !== "Enter" || isTextEntry(event.target)) return;
          const cardId = (event.target as HTMLElement).closest<HTMLElement>("[data-card-id]")?.dataset.cardId as CardId | undefined;
          if (cardId) { event.preventDefault(); event.stopPropagation(); chooseConnectionCard(cardId); }
        }}
        onDoubleClick={event => {
          if (tool !== "select") return;
          if ((event.target as Element).closest('[data-collection-id], button, a, input, textarea, [contenteditable]')) return;
          // Pointer capture makes the surface the click target after a press.
          // Resolve the same projected geometry used for selection and edges.
          const point = toWorld(event);
          const hit = [...cardsRef.current].sort((a, b) => b.z - a.z).find(card => point.x >= card.layout.x && point.y >= card.layout.y && point.x <= card.layout.x + card.layout.width && point.y <= card.layout.y + card.layout.height);
          if (hit) { onSelectionChange(only(hit.cardId)); onFocusChange(hit.cardId); }
          else captureAt(point);
        }}
        style={{
          backgroundImage: gridVisible ? undefined : "none",
          backgroundSize: `${pitch * viewport.scale}px ${pitch * viewport.scale}px`,
          backgroundPosition: `${viewport.x - pitch * viewport.scale / 2}px ${viewport.y - pitch * viewport.scale / 2}px`
        }}
      >
        <div
          className={styles.world}
          style={{
            transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`,
            // Lets screen-space affordances (card actions, handles) keep their hit size at any zoom.
            "--canvas-scale": viewport.scale
          } as React.CSSProperties}
        >
          {collections.map(collection => {
            const bounds = collectionBounds(collection, cards.filter(card => !liftedCards.has(card.cardId)));
            return bounds ? <SpatialCollection key={collection.id} collection={collection} bounds={bounds} cards={cards} selected={collection.cardIds.every(id => selection.has(id))} dropTarget={dropCollection === collection.id}
              onMoveStart={event => moveCollection(collection.id, event)} onSelect={() => onSelectionChange(new Set(collection.cardIds))}
              onNudge={(dx, dy) => { onSelectionChange(new Set(collection.cardIds)); store.nudge(collection.cardIds, dx, dy); commitNudgeSoon(collection.cardIds); }}
              onToggle={() => { void store.changeCollection({ kind: "collapse", id: collection.id, collapsed: !collection.collapsed }); setAnnouncement(collection.collapsed ? `${collection.title} expanded.` : `${collection.title} stacked.`); }}
              onRename={title => { void store.changeCollection({ kind: "rename", id: collection.id, title }); }}
              renameRequested={renameRequests.get(collection.id)}
              onArrange={() => arrangeCollection(collection.id)} onContextMenu={event => openContextMenu(event, undefined, collection.id)}
              onBrowse={bringForward} onDissolve={() => { void store.changeCollection({ kind: "dissolve", id: collection.id }); }} /> : null;
          })}
          {edgeGroups.size ? <svg className={styles.semanticEdges} role="group" aria-label="Board relationships"><defs><marker id="relic-semantic-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor"/></marker></defs>{[...edgeGroups].map(([key, bundle]) => {
            const link = bundle.links[0]!;
            const source = bundle.owner;
            const other = cards.find(card => card.objectId === link.other.objectId);
            if (!other) return null;
            const right = other.layout.x >= source.layout.x;
            const start = { x: source.layout.x + (right ? source.layout.width : 0), y: source.layout.y + source.layout.height / 2 };
            const end = { x: other.layout.x + (right ? 0 : other.layout.width), y: other.layout.y + other.layout.height / 2 };
            const labelScale = 1 / Math.min(1, viewport.scale);
            const labelWidth = ((bundle.links.length > 1 ? `${bundle.links.length} relationships` : relationshipPhrase(link.claimKind, link.direction)).length * 7.2 + 90) * labelScale;
            const labelPosition = relationshipLabelPosition({ start, end, endpoints: [source.layout, other.layout], obstacles: cards.map(card => card.layout), occupied: occupiedEdgeLabels, width: labelWidth, height: 28 * labelScale });
            occupiedEdgeLabels.push({ x: labelPosition.x - labelWidth / 2, y: labelPosition.y - 14 * labelScale, width: labelWidth, height: 28 * labelScale });
            return <SemanticRelationshipEdge key={key} link={link} bundleLinks={bundle.links} persisted={bundle.explicit} bundleCount={bundle.links.length} bundleIndex={(bundle.links.length - 1) / 2} x1={start.x} y1={start.y} x2={end.x} y2={end.y} labelPosition={labelPosition} labelScale={labelScale} onSelect={() => onFocusChange(source.cardId, "relationships")}/>;
          })}</svg> : null}
          {cards.map((card) => (
            <DeskCard
              key={card.cardId}
              card={{ ...card, z: expandedCards.has(card.cardId) || editing === card.cardId || (interacting === "drag" && selection.has(card.cardId)) ? activePlacementZ : card.z, layout: { ...card.layout, height: resizePreview?.cardId === card.cardId ? resizePreview.height : store.byId.get(card.cardId)?.layout.height ?? card.layout.height } }}
              tier={tier}
              selected={selection.has(card.cardId)}
              editing={editing === card.cardId}
              expanded={expandedCards.has(card.cardId)}
              trayed={trayCardId === card.cardId}
              stacked={Boolean(collectionFor(collections, card.cardId)?.collapsed)}
              rotation={collectionFor(collections, card.cardId)?.collapsed && !liftedCards.has(card.cardId) ? ((collectionFor(collections, card.cardId)!.cardIds.indexOf(card.cardId) % 3) - 1) * 1.1 : 0}
              onExpand={() => { onSelectionChange(only(card.cardId)); toggleExpanded(card.cardId); }}
              onMeasure={(width, height) => measureCard(card.cardId, width, height)}
              onFollow={onFollow ?? (async link => { const [targetId] = await store.pullIn([link.other], { x: card.layout.x + card.layout.width + 220, y: card.layout.y }); if (targetId) { onSelectionChange(only(targetId)); onFocusChange(targetId); } })}
              focused={focusId === card.cardId}
              // Attention suppresses unrelated material: once one object is
              // being deepened into, the rest of the world recedes without
              // leaving. What it is connected to is not unrelated, so a
              // neighbour keeps its weight and says why it kept it.
              neighbour={neighbours.has(card.cardId)}
              receded={
                focusId !== null && focusId !== card.cardId && !neighbours.has(card.cardId)
              }
              onPointerDown={onCardPointerDown(card.cardId)}
              onContextMenu={event => openContextMenu(event, card.cardId)}
              onResizeStart={event => beginResize(card, event)}
              onResizeKeyDown={event => {
                const step = event.shiftKey ? 32 : 8;
                const dx = event.key === "ArrowRight" ? step : event.key === "ArrowLeft" ? -step : 0;
                const dy = event.key === "ArrowDown" ? step : event.key === "ArrowUp" ? -step : 0;
                if (dx || dy) { event.preventDefault(); const layout = store.byId.get(card.cardId)?.layout ?? card.layout; void store.resizeCard(card.cardId, layout.width + dx, layout.height + dy); }
              }}
              onTitleChange={card.representation ? label => { void store.editSheet(card.objectId, label, card.representation!.fields); } : undefined}
              onOpen={(section) => {
                onSelectionChange(only(card.cardId));
                onFocusChange(card.cardId, section);
              }}
              onRequestEdit={() => {
                onSelectionChange(only(card.cardId));
                onEditingChange(card.cardId);
              }}
              onBodyChange={(body) => store.setBody(card.cardId, body)}
              onEndEdit={() => {
                store.flushBody(card.cardId);
                onEditingChange(null);
                surface.current?.focus();
              }}
            />
          ))}

          {onApplyProposal && onDismissProposal ? proposals.map(({ card, proposal }) => { const preview = previewObjectProposal(card, proposal); return <div key={proposal.id} className={styles.objectProposalPlacement} data-proposal-id={proposal.id} style={{ left: preview.layout.x, top: preview.layout.y, width: Math.max(360, preview.layout.width) }} onPointerDown={event => event.stopPropagation()} onDoubleClick={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()}><ObjectProposalPreview card={card} proposal={proposal} onApply={onApplyProposal} onDismiss={() => onDismissProposal(proposal.id)}/></div>; }) : null}

          {marquee && marquee.width > 1 && marquee.height > 1 ? (
            <div
              className={styles.marquee}
              style={{
                left: marquee.x,
                top: marquee.y,
                width: marquee.width,
                height: marquee.height
              }}
            />
          ) : null}
        </div>

        {cards.length === 0 ? (
          <div className={styles.emptyDesk}>
            <h1>Space for a world.</h1>
            <p>Start with a name, a question, or something you don’t want to lose.</p>
            <button type="button" onPointerDown={(event) => event.stopPropagation()} onDoubleClick={(event) => event.stopPropagation()} onClick={() => captureAt(centreOfView(viewportRef.current, sizeRef.current))}>Capture a fragment</button>
            <small>An empty {surfaceName}. Double-click anywhere, or press <kbd>N</kbd>, to begin.</small>
          </div>
        ) : null}
      </div>

      {lastMenu.current ? <DeskContextMenu open={Boolean(contextMenu)} {...lastMenu.current} onClose={restore => {
        setContextMenu(null);
        if (restore) {
          const card = contextMenu?.cardId ? surface.current?.querySelector<HTMLElement>(`[data-card-id="${contextMenu.cardId}"]`) : null;
          (contextReturn.current?.isConnected ? contextReturn.current : card ?? surface.current)?.focus({ preventScroll: true });
        }
      }}/>: null}

      {toolbarVisible && toolbarBounds ? <CanvasSelectionToolbar attach={Boolean(trayCardId)} scale={viewport.scale}
        bounds={{ x: toolbarBounds.x * viewport.scale + viewport.x, y: toolbarBounds.y * viewport.scale + viewport.y, width: toolbarBounds.width * viewport.scale, height: toolbarBounds.height * viewport.scale }} viewportSize={size} insets={toolbarInsets}>
        {selectedCard ? <><Button variant="quiet" onClick={() => onFocusChange(selectedCard.cardId)}>Open Focus</Button>
          {/* The tray hangs inside the card's width, so its secondary actions are marks, not words. */}
          {trayCardId ? <IconButton label="Collapse card" onClick={() => toggleExpanded(selectedCard.cardId)}><CanvasGlyph name="collapse" /></IconButton>
            : <Button variant="quiet" onClick={() => toggleExpanded(selectedCard.cardId)}>{expandedCards.has(selectedCard.cardId) ? "Collapse card" : "Expand card"}</Button>}
          <IconButton label="Open in Builder" onClick={() => onEditingChange(selectedCard.cardId)}><CanvasGlyph name="edit" /></IconButton></> : <span>{selectedCards.length} selected</span>}
        {!selectedCard ? <Button variant="quiet" onClick={() => selectedCollection ? void store.changeCollection({ kind: "collapse", id: selectedCollection.id, collapsed: !selectedCollection.collapsed }) : collectSelection(true)}>{selectedCollection ? selectedCollection.collapsed ? "Expand collection" : "Stack collection" : "Collect in stack"}</Button> : null}
        <IconButton label="Connect selected object" disabled={!selectedCard} onClick={() => changeTool("connect")}><CanvasGlyph name="connect" /></IconButton>
        <IconButton label="More selection actions" aria-haspopup="menu" aria-expanded={Boolean(contextMenu)} onClick={event => openContextMenu(event, selectedCard?.cardId, selectedCollection?.id)}><CanvasGlyph name="more" /></IconButton>
      </CanvasSelectionToolbar> : null}

      {tool === "connect" && source && target ? <section className={styles.connectionEditor} aria-label="New semantic connection" onPointerDown={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()}>
        <h2 className={styles.connectionHeading}>Connect world objects</h2>
        <RelationshipComposer key={`${source.cardId}-${target.cardId}`} card={source} store={store} initialTarget={cardRef(target)} boardProjection
          onCancel={() => { changeTool("select"); surface.current?.focus(); }} onSaved={() => { changeTool("select"); surface.current?.focus(); }}/>
      </section> : null}

      <CanvasChrome activeTool={tool} onToolChange={changeTool} gridVisible={gridVisible} onGridVisibleChange={setGridVisible} showTopFrame={false} showCanvasControls={active} contextLabel={surfaceName} scale={viewport.scale} selectionCount={selection.size}
        placements={cards.map(card => ({ ...card.layout, id: card.cardId }))}
        viewport={viewport} viewportSize={size} selectedIds={[...selection]} minimapMode={minimapMode}
        onMinimapModeChange={setMinimapMode} onNavigate={(point) => navigate(centreOn(viewport, size, { ...point, width: 0, height: 0 }))}
        onZoomOut={() => zoom(1 / 1.2)} onZoomIn={() => zoom(1.2)}
        onResetZoom={() => zoom(1 / viewport.scale)} onFitBoard={fit}
        onFitSelection={fitSelected}
        availableToolActions={["Fragment", "Character", "Place", "Faction", "Artifact", "Event", "Thread", "Note", "Source", ...(selection.size ? ["Section", "Stack"] : [])]} onToolAction={(mode, action) => {
          if (mode === "compose") { collectSelection(action === "Stack"); return; }
          const point = centreOfView(viewportRef.current, sizeRef.current);
          if (action === "Fragment") { captureAt(point); return; }
          const kind = action.toLowerCase() as RepresentationKind;
          const cardId = store.capture(point.x, point.y, "", kind);
          onSelectionChange(only(cardId));
          if (kind === "note") onEditingChange(cardId); else onFocusChange(cardId);
        }} />
      <span className={styles.spatialAnnouncement} role="status" aria-live="polite">{announcement}</span>
    </div>
  );
}

function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === "TEXTAREA" ||
    target.tagName === "INPUT" ||
    target.isContentEditable
  );
}

function fitSpatialScene(cards: readonly import("@/lib/world/model").DeskCard[], collections: readonly import("@/lib/world/model").SpatialCollection[], size: Size): Viewport {
  if (!collections.length) return fitToBounds(boundsOf(cards.map(card => card.layout)), size);
  const regions = collections.flatMap(collection => { const rect = collectionBounds(collection, cards); return rect ? [rect] : []; });
  const fit = fitToBounds(boundsOf([...cards.map(card => card.layout), ...regions]), { width: size.width, height: Math.max(1, size.height - 220) }, 56);
  return { ...fit, y: fit.y + 132 };
}

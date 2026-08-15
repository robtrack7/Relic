"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  boundsOf,
  fitToBounds,
  IDENTITY_VIEWPORT,
  panBy,
  rectFromCorners,
  screenToWorld,
  zoomAboutCentre,
  zoomBy,
  type Point,
  type Rect,
  type Size,
  type Viewport
} from "@/lib/desk/viewport";
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
import type { CardId } from "@/lib/world/model";

import { DeskCard } from "./desk-card";
import type { DeskStore } from "./use-desk";
import styles from "./desk.module.css";

type Gesture =
  | { kind: "none" }
  | { kind: "pan"; lastScreen: Point }
  | { kind: "marquee"; origin: Point; base: Selection; additive: boolean }
  | { kind: "drag"; ids: readonly CardId[]; lastWorld: Point; moved: boolean };

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
  onFocusChange: (cardId: CardId | null) => void;
};

export function DeskCanvas({
  store,
  surfaceName,
  selection,
  onSelectionChange,
  editing,
  onEditingChange,
  focusId,
  onFocusChange
}: Props) {
  const surface = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState<Viewport>(IDENTITY_VIEWPORT);
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  const [marquee, setMarquee] = useState<Rect | null>(null);
  const [spaceHeld, setSpaceHeld] = useState(false);

  const gesture = useRef<Gesture>({ kind: "none" });
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;
  const nudgeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cards = store.cards;
  const cardsRef = useRef(cards);
  cardsRef.current = cards;

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
          fitToBounds(
            boundsOf(cardsRef.current.map((card) => card.layout)),
            next
          )
        );
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const toWorld = useCallback((event: { clientX: number; clientY: number }): Point => {
    const rect = surface.current?.getBoundingClientRect();
    const local = {
      x: event.clientX - (rect?.left ?? 0),
      y: event.clientY - (rect?.top ?? 0)
    };
    return screenToWorld(viewportRef.current, local);
  }, []);

  const toLocal = useCallback((event: { clientX: number; clientY: number }): Point => {
    const rect = surface.current?.getBoundingClientRect();
    return { x: event.clientX - (rect?.left ?? 0), y: event.clientY - (rect?.top ?? 0) };
  }, []);

  // Wheel must be a non-passive listener or the browser scrolls the page under us.
  useEffect(() => {
    const node = surface.current;
    if (!node) return;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = node.getBoundingClientRect();
      const anchor = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      if (event.ctrlKey || event.metaKey) {
        const factor = Math.exp(-event.deltaY * WHEEL_ZOOM_SENSITIVITY * 4);
        setViewport((current) => zoomBy(current, anchor, factor));
      } else {
        setViewport((current) => panBy(current, -event.deltaX, -event.deltaY));
      }
    };

    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.code === "Space" && !isTextEntry(event.target)) setSpaceHeld(true);
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
      surface.current?.focus();
      if (editing) {
        store.flushBody(editing);
        onEditingChange(null);
      }
      event.currentTarget.setPointerCapture(event.pointerId);

      const panning = event.button === 1 || spaceHeld;
      if (panning) {
        gesture.current = { kind: "pan", lastScreen: { x: event.clientX, y: event.clientY } };
        return;
      }

      const additive = event.shiftKey || event.metaKey || event.ctrlKey;
      gesture.current = {
        kind: "marquee",
        origin: toWorld(event),
        base: additive ? selection : EMPTY_SELECTION,
        additive
      };
      if (!additive) onSelectionChange(EMPTY_SELECTION);
      setMarquee({ x: 0, y: 0, width: 0, height: 0 });
    },
    [editing, onEditingChange, onSelectionChange, selection, spaceHeld, store, toWorld]
  );

  const onCardPointerDown = useCallback(
    (cardId: CardId) => (event: React.PointerEvent<HTMLElement>) => {
      if (event.button !== 0) return;
      event.stopPropagation();
      if (editing === cardId) return;
      if (editing) {
        store.flushBody(editing);
        onEditingChange(null);
      }

      const additive = event.shiftKey || event.metaKey || event.ctrlKey;
      let next: Selection;
      if (additive) {
        next = toggle(selection, cardId);
      } else if (selection.has(cardId)) {
        next = selection;
      } else {
        next = only(cardId);
      }
      onSelectionChange(next);

      // Toggling a card off is a selection change, not the start of a drag.
      if (!next.has(cardId)) return;

      surface.current?.setPointerCapture(event.pointerId);
      gesture.current = {
        kind: "drag",
        ids: [...next],
        lastWorld: toWorld(event),
        moved: false
      };
    },
    [editing, onEditingChange, onSelectionChange, selection, store, toWorld]
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const active = gesture.current;
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
        case "marquee": {
          const band = rectFromCorners(active.origin, toWorld(event));
          setMarquee(band);
          const caught = within(cardsRef.current, band);
          onSelectionChange(active.additive ? add(active.base, caught) : new Set(caught));
          return;
        }
        case "drag": {
          const world = toWorld(event);
          const dx = world.x - active.lastWorld.x;
          const dy = world.y - active.lastWorld.y;
          if (dx === 0 && dy === 0) return;
          active.lastWorld = world;
          active.moved = true;
          store.nudge(active.ids, dx, dy);
        }
      }
    },
    [onSelectionChange, store, toWorld]
  );

  const endGesture = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const active = gesture.current;
      gesture.current = { kind: "none" };
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      setMarquee(null);
      if (active.kind === "drag" && active.moved) {
        store.commitMove(active.ids);
      }
    },
    [store]
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (isTextEntry(event.target)) return;
      const ids = [...selection];

      if (event.key === "Escape") {
        // Leave the deepest thing first. Escaping out of Focus and out of the
        // selection at once would lose the place the reader was in.
        if (focusId !== null) {
          onFocusChange(null);
          return;
        }
        onSelectionChange(EMPTY_SELECTION);
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
      if (event.key === "Enter" || event.key === "F2") {
        const single = soleMember(selection);
        if (single) {
          event.preventDefault();
          onEditingChange(single);
        }
        return;
      }
      if (event.key === "n" && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        captureAt(screenToWorld(viewportRef.current, { x: size.width / 2, y: size.height / 2 }));
        return;
      }

      const step = event.shiftKey ? 1 : 8;
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
      commitNudgeSoon,
      focusId,
      onEditingChange,
      onFocusChange,
      onSelectionChange,
      selection,
      size,
      store
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
    (factor: number) => setViewport((current) => zoomAboutCentre(current, size, factor)),
    [size]
  );
  const fit = useCallback(
    () => setViewport(fitToBounds(boundsOf(cards.map((card) => card.layout)), size)),
    [cards, size]
  );

  return (
    <div className={styles.canvasFrame}>
      <div
        ref={surface}
        className={styles.canvas}
        data-panning={spaceHeld || undefined}
        role="application"
        aria-label="Desk canvas"
        tabIndex={0}
        onPointerDown={onSurfacePointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endGesture}
        onPointerCancel={endGesture}
        onKeyDown={onKeyDown}
        onDoubleClick={(event) => captureAt(toWorld(event))}
        style={{
          backgroundSize: `${pitch * viewport.scale}px ${pitch * viewport.scale}px`,
          backgroundPosition: `${viewport.x}px ${viewport.y}px`
        }}
      >
        <div
          className={styles.world}
          style={{
            transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`
          }}
        >
          {cards.map((card) => (
            <DeskCard
              key={card.cardId}
              card={card}
              tier={tier}
              selected={selection.has(card.cardId)}
              editing={editing === card.cardId}
              focused={focusId === card.cardId}
              // Attention suppresses unrelated material: once one object is
              // being deepened into, the rest of the world recedes without
              // leaving.
              receded={focusId !== null && focusId !== card.cardId}
              onPointerDown={onCardPointerDown(card.cardId)}
              onOpen={() => {
                onSelectionChange(only(card.cardId));
                onFocusChange(card.cardId);
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
          <p className={styles.emptyDesk}>
            An empty {surfaceName}. <strong>Double-click</strong> anywhere, or press <kbd>N</kbd>,
            to begin.
          </p>
        ) : null}
      </div>

      <div className={styles.viewControls}>
        <button type="button" onClick={() => zoom(1 / 1.25)} aria-label="Zoom out">
          −
        </button>
        <button type="button" onClick={fit} className={styles.zoomLevel}>
          {Math.round(viewport.scale * 100)}%
        </button>
        <button type="button" onClick={() => zoom(1.25)} aria-label="Zoom in">
          +
        </button>
      </div>
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

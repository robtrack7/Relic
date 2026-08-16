"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { DEFAULT_CARD_WIDTH } from "@/lib/world/model";
import { add, EMPTY_SELECTION, only, type Selection } from "@/lib/desk/selection";
import type { CardId, DeskView, Link, Workspace } from "@/lib/world/model";

import { DeskCanvas } from "./desk-canvas";
import { DeskStack } from "./desk-stack";
import { Finder } from "./finder";
import { Library } from "./library";
import type { SurfaceControls } from "./surface-controls";
import { useDesk, type DeskStore } from "./use-desk";
import { WorldBar } from "./world-bar";
import { Inspector } from "./inspector";
import styles from "./desk.module.css";

type Arrangement = "canvas" | "stack";

export function DeskSurface({
  workspace,
  initial
}: {
  workspace: Workspace;
  initial: DeskView;
}) {
  const store = useDesk(initial);
  const [selection, setSelection] = useState<Selection>(EMPTY_SELECTION);
  const [editing, setEditing] = useState<CardId | null>(null);
  const [focusId, setFocusId] = useState<CardId | null>(null);
  const [narrow, setNarrow] = useState(false);
  const [override, setOverride] = useState<Arrangement | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const controls = useRef<SurfaceControls | null>(null);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 720px), (pointer: coarse)");
    const apply = () => setNarrow(query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  const arrangement: Arrangement = override ?? (narrow ? "stack" : "canvas");
  const surfaceName = initial.kind === "desk" ? "desk" : initial.kind;

  /*
   * Focus is one piece of state, not two.
   *
   * Selection is not focus: clicking a card reveals what can be done with it,
   * and a further deliberate act — double-click, or the control that appears —
   * deepens into it. That second stage is what opens the entity surface *and*
   * what makes the rest of the world recede, because they are the same idea
   * seen from the panel and from the canvas.
   */
  const focused = focusId === null ? null : (store.byId.get(focusId) ?? null);

  // A focused card that is removed, or a composition that changes underneath,
  // must not leave the surface open on nothing.
  useEffect(() => {
    if (focusId !== null && !store.byId.has(focusId)) setFocusId(null);
  }, [focusId, store.byId]);

  /*
   * The neighbourhood: what the focused object is connected to.
   *
   * Focus suppresses everything unrelated, but "unrelated" is a claim Relic can
   * now actually make. A card the focused object points at, or that points at
   * it, keeps its weight — so deepening into Mara shows her footprint rather
   * than dimming the world uniformly around her.
   */
  const neighbours = useMemo(() => {
    if (!focused) return new Set<string>();
    const objectIds = new Set(focused.links.map((link) => link.other.objectId as string));
    return new Set(
      store.cards
        .filter((card) => objectIds.has(card.objectId))
        .map((card) => card.cardId as string)
    );
  }, [focused, store.cards]);

  /**
   * Follows a relationship to its other end.
   *
   * If that end is not on this composition it is referenced here first, next to
   * the card it was reached from — pulling the thread brings the thing to you
   * rather than taking you somewhere else.
   */
  const follow = async (link: Link) => {
    if (!focused) return;
    const beside = {
      x: focused.layout.x + focused.layout.width + 48 + DEFAULT_CARD_WIDTH / 2,
      y: focused.layout.y + focused.layout.height / 2
    };
    const [cardId] = await store.pullIn([link.other], beside);
    if (cardId) {
      setSelection(only(cardId));
      setFocusId(cardId);
    }
  };

  /**
   * What happens when something is retrieved from search or the Library.
   *
   * Selection because it is what the GM asked for; Focus, for a single thing,
   * because searching for one object is already the deliberate act that Focus
   * asks for — the second stage happened at the keyboard. A batch is only
   * selected: nine things arriving at once is an arrangement, not a reading, and
   * opening a panel on one of them would be Relic choosing which.
   */
  const arrive = (cardIds: readonly CardId[]) => {
    if (cardIds.length === 0) return;
    setSelection(add(EMPTY_SELECTION, cardIds));
    setFocusId(cardIds.length === 1 ? cardIds[0]! : null);
    const first = cardIds[0];
    if (first) requestAnimationFrame(() => controls.current?.reveal(first));
  };

  const captureFromChrome = () => {
    // Placed just below the newest card so the stack view stays readable and
    // the canvas does not pile every card on one spot.
    const cardId = store.capture(0, store.cards.length * 190);
    setSelection(only(cardId));
    setEditing(cardId);
  };

  return (
    <div className={styles.shell}>
      <header className={styles.chrome}>
        <div className={styles.identity}>
          <span className={styles.wordmark}>Relic</span>
          <WorldBar workspace={workspace} active={initial.compositionId} />
        </div>

        {/* Search sits in the top frame, between where you are and what you can
            do with it: the world is always reachable, from any composition. */}
        <Finder
          store={store}
          controls={controls}
          onArrive={arrive}
          onOpenLibrary={() => setLibraryOpen(true)}
        />

        <div className={styles.chromeActions}>
          <SyncBadge store={store} />
          <button
            type="button"
            className={styles.ghostAction}
            aria-pressed={libraryOpen}
            onClick={() => setLibraryOpen((was) => !was)}
          >
            Library
          </button>
          <button type="button" className={styles.primaryAction} onClick={captureFromChrome}>
            New card
          </button>
          <button
            type="button"
            className={styles.ghostAction}
            aria-pressed={arrangement === "stack"}
            onClick={() => setOverride(arrangement === "canvas" ? "stack" : "canvas")}
          >
            {arrangement === "canvas" ? "Stack" : "Canvas"}
          </button>
        </div>
      </header>

      <main className={styles.main}>
        {arrangement === "canvas" ? (
          <DeskCanvas
            store={store}
            surfaceName={surfaceName}
            selection={selection}
            onSelectionChange={setSelection}
            editing={editing}
            onEditingChange={setEditing}
            focusId={focusId}
            onFocusChange={setFocusId}
            neighbours={neighbours}
            controls={controls}
          />
        ) : (
          <DeskStack
            store={store}
            surfaceName={surfaceName}
            selection={selection}
            onSelectionChange={setSelection}
            editing={editing}
            onEditingChange={setEditing}
            focusId={focusId}
            onFocusChange={setFocusId}
            neighbours={neighbours}
            controls={controls}
          />
        )}

        {/* Over the composition rather than away from it. The Library is an
            index into this world, not another place to be — and what it hands
            back lands on the composition still underneath it. */}
        {libraryOpen ? (
          <Library
            store={store}
            controls={controls}
            compositionName={initial.name ?? "this composition"}
            onArrive={arrive}
            onClose={() => setLibraryOpen(false)}
          />
        ) : null}

        {/* Emerges from selection, beside the canvas rather than over it: the
            surrounding world stays perceptible while one object deepens. */}
        {focused ? (
          <Inspector
            card={focused}
            store={store}
            onClose={() => setFocusId(null)}
            onFollow={follow}
          />
        ) : null}
      </main>

      <footer className={styles.statusBar}>
        <span className={styles.tally}>
          {store.cards.length} {store.cards.length === 1 ? "card" : "cards"}
          {selection.size > 0 ? ` · ${selection.size} selected` : ""}
        </span>

        {/* Contextual: the way to another composition appears once there is
            something to send, and goes away again afterwards. */}
        {selection.size > 0 ? (
          <SendToComposition
            workspace={workspace}
            store={store}
            selection={selection}
            here={initial.compositionId}
          />
        ) : null}

        {arrangement === "canvas" ? (
          <span className={styles.hints}>
            Double-click to capture · Space or middle-drag to pan · Ctrl+wheel to zoom ·
            Enter to edit · Delete to remove
          </span>
        ) : (
          <span className={styles.hints}>Tap to select · Edit to write · Remove to clear</span>
        )}
      </footer>
    </div>
  );
}

/**
 * Places the selected objects on another composition of the same world.
 *
 * The wording is deliberate: the cards are *referenced*, not moved or copied.
 * The same world material ends up visible in two places at once, which is the
 * point of a Board.
 */
function SendToComposition({
  workspace,
  store,
  selection,
  here
}: {
  workspace: Workspace;
  store: DeskStore;
  selection: Selection;
  here: DeskView["compositionId"];
}) {
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const elsewhere = workspace.compositions.filter((c) => c.compositionId !== here);

  useEffect(() => {
    if (!open) return;
    const close = (event: Event) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  if (elsewhere.length === 0) return null;

  return (
    <div className={styles.sendTo} ref={wrapper}>
      <button
        type="button"
        className={styles.sendToButton}
        aria-expanded={open}
        onClick={() => setOpen((was) => !was)}
      >
        Add {selection.size === 1 ? "card" : `${selection.size} cards`} to…
      </button>

      {open ? (
        <div className={styles.sendToMenu} role="menu">
          {elsewhere.map((composition) => (
            <button
              key={composition.compositionId}
              type="button"
              role="menuitem"
              className={styles.switcherItem}
              aria-label={composition.name}
              onClick={() => {
                store.referenceInto(composition.compositionId, [...selection]);
                setOpen(false);
              }}
            >
              <span className={styles.switcherName}>{composition.name}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SyncBadge({ store }: { store: DeskStore }) {
  const { sync, dismissProblem } = store;

  if (sync.kind === "problem") {
    return (
      <button
        type="button"
        className={styles.problem}
        onClick={dismissProblem}
        title="Dismiss"
      >
        <span aria-hidden="true">⚠</span> {sync.message}
      </button>
    );
  }

  return (
    <span className={styles.syncBadge} data-state={sync.kind} role="status">
      {sync.kind === "saving" ? "Saving…" : "Saved"}
    </span>
  );
}

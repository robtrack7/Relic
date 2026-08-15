"use client";

import { useEffect, useState } from "react";

import { EMPTY_SELECTION, only, type Selection } from "@/lib/desk/selection";
import type { CardId, DeskView } from "@/lib/world/model";

import { DeskCanvas } from "./desk-canvas";
import { DeskStack } from "./desk-stack";
import { useDesk } from "./use-desk";
import styles from "./desk.module.css";

type Arrangement = "canvas" | "stack";

export function DeskSurface({ initial }: { initial: DeskView }) {
  const store = useDesk(initial);
  const [selection, setSelection] = useState<Selection>(EMPTY_SELECTION);
  const [editing, setEditing] = useState<CardId | null>(null);
  const [narrow, setNarrow] = useState(false);
  const [override, setOverride] = useState<Arrangement | null>(null);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 720px), (pointer: coarse)");
    const apply = () => setNarrow(query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  const arrangement: Arrangement = override ?? (narrow ? "stack" : "canvas");

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
          <span className={styles.deskName}>{initial.name ?? "Desk"}</span>
        </div>

        <div className={styles.chromeActions}>
          <SyncBadge store={store} />
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
            selection={selection}
            onSelectionChange={setSelection}
            editing={editing}
            onEditingChange={setEditing}
          />
        ) : (
          <DeskStack
            store={store}
            selection={selection}
            onSelectionChange={setSelection}
            editing={editing}
            onEditingChange={setEditing}
          />
        )}
      </main>

      <footer className={styles.statusBar}>
        <span>
          {store.cards.length} {store.cards.length === 1 ? "card" : "cards"}
          {selection.size > 0 ? ` · ${selection.size} selected` : ""}
        </span>
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

function SyncBadge({ store }: { store: ReturnType<typeof useDesk> }) {
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

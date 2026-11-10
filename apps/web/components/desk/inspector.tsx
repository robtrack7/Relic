"use client";

import { useRef } from "react";
import { useSurfaceTransition } from "@/components/ui/use-surface-transition";
import styles from "./inspector-shell.module.css";
import type { DeskCard, Link } from "@/lib/world/model";
import { ObjectDetail } from "@/components/world-objects/object-detail";
import type { DeskStore } from "./use-desk";
import type { useFocusHistory } from "@/components/world-objects/use-focus-history";

/** Focus is one projection for every World Object, including an unclassified Fragment. */
export function Inspector({
  card,
  store,
  onClose,
  onFollow,
  history,
  mode = "compact",
  onOpenFullFocus,
  onModeChange
}: {
  card: DeskCard | null;
  history: ReturnType<typeof useFocusHistory>;
  store: DeskStore;
  onClose: () => void;
  onFollow: (link: Link) => void;
  /** Compact dossier in the carriage; full keeps the same mounted editor and identity. */
  mode?: "compact" | "full";
  onOpenFullFocus?: () => void;
  onModeChange?: (mode: "compact" | "full") => void;
}) {
  // Keep visited editors mounted so inspection never throws away a draft or a
  // failed save. Only the active object participates in reading/keyboard input.
  const surface = useRef<HTMLDivElement>(null);
  const lastCard = useRef(card);
  if (card) lastCard.current = card;
  const present = useSurfaceTransition(Boolean(card), surface);
  const visible = card ?? lastCard.current;
  const objects = [...new Set(history.entries.map(entry => entry.objectId))];
  return <div ref={surface} className={styles.motionSurface} hidden={!present} inert={!card}>{objects.map(objectId => {
    const current = store.cards.find(item => item.objectId === objectId);
    if (!current) return null;
    const shown = visible?.objectId === objectId;
    const active = card?.objectId === objectId;
    return <div key={objectId} hidden={!shown}><ObjectDetail card={current} store={store} active={active} mode={mode}
      onClose={onClose} onFollow={onFollow} navigation={history.navigation}
      visitId={active ? history.current?.id : undefined} initialView={active ? history.view : undefined}
      onOpenFullFocus={onOpenFullFocus}
      onModeChange={onModeChange}
      onViewChange={view => { if (active && history.current) history.remember(history.current.id, view); }}/></div>;
  })}</div>;
}

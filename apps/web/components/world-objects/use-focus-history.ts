"use client";

import { useEffect, useRef, useState } from "react";
import type { CardId, DeskCard, WorldObjectId } from "@/lib/world/model";
import type { ProjectionContext } from "@/lib/world/object-projection";

export type FocusSection = "overview" | "state" | "relationships" | "mechanics" | "notes" | "sources" | "history" | "record" | "classify";
export type FocusView = { section: FocusSection; scrollTop: number; expanded: readonly FocusSection[] };
export type FocusVisit = { id: number; objectId: WorldObjectId; placementId: CardId; context: ProjectionContext };
export type FocusNavigation = { canBack: boolean; canForward: boolean; back: () => void; forward: () => void; backLabel?: string; forwardLabel?: string };

/** Presentation memory only. No browser history, camera or world writes. */
export function useFocusHistory(cards: readonly DeskCard[], scope: string, onNavigate?: (placementId: CardId) => void) {
  const [state, setState] = useState<{ entries: readonly FocusVisit[]; index: number; open: boolean }>({ entries: [], index: -1, open: false });
  const nextId = useRef(0);
  const views = useRef(new Map<number, FocusView>());
  const [pending, setPending] = useState<{ placementId: CardId; section: FocusSection } | null>(null);
  useEffect(() => { setState({ entries: [], index: -1, open: false }); views.current.clear(); setPending(null); }, [scope]);
  const resolve = (visit?: FocusVisit) => visit ? cards.find(card => card.cardId === visit.placementId && card.objectId === visit.objectId) ?? cards.find(card => card.objectId === visit.objectId) : undefined;
  const current = state.entries[state.index];
  const card = state.open ? resolve(current) : undefined;
  const open = (placementId: CardId | null, section: FocusSection = "overview") => {
    if (placementId === null) { setPending(null); setState(previous => ({ ...previous, open: false })); return; }
    const target = cards.find(item => item.cardId === placementId);
    if (!target) { setPending({ placementId, section }); return; }
    const active = state.entries[state.index];
    if (state.open && active?.objectId === target.objectId && section === "overview") return;
    const visit: FocusVisit = { id: ++nextId.current, objectId: target.objectId, placementId, context: { kind: "now" } };
    views.current.set(visit.id, { section, scrollTop: 0, expanded: section === "overview" ? [] : [section] });
    setState(previous => {
      // Forward visits are discarded when branching, just as an inspection trail should be.
      const entries = [...previous.entries.slice(0, previous.index + 1), visit];
      return { entries, index: entries.length - 1, open: true };
    });
  };
  useEffect(() => {
    const target = pending;
    if (target && cards.some(card => card.cardId === target.placementId)) { setPending(null); open(target.placementId, target.section); }
    // A reference may arrive after the async navigation gesture resolves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards, pending]);
  const adjacent = (direction: number) => {
    for (let i = state.index + direction; i >= 0 && i < state.entries.length; i += direction) if (resolve(state.entries[i])) return i;
    return -1;
  };
  const backIndex = adjacent(-1), forwardIndex = adjacent(1);
  const go = (index: number) => { if (index >= 0) { const target = resolve(state.entries[index]); if (target) onNavigate?.(target.cardId); setState(previous => ({ ...previous, index, open: true })); } };
  const navigation: FocusNavigation = {
    canBack: backIndex >= 0, canForward: forwardIndex >= 0,
    back: () => go(backIndex), forward: () => go(forwardIndex),
    backLabel: resolve(state.entries[backIndex])?.representation?.label ?? undefined,
    forwardLabel: resolve(state.entries[forwardIndex])?.representation?.label ?? undefined
  };
  return { card, current, entries: state.entries, open, navigation,
    view: current ? views.current.get(current.id) : undefined,
    remember: (id: number, view: FocusView) => views.current.set(id, view) };
}

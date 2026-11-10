"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { WritingEditor } from "@/components/ui/text-editor";
import { Button } from "@/components/ui/control";
import { CanvasGlyph } from "@/components/canvas/canvas-controls";

import { EMPTY_SELECTION, only, toggle, type Selection } from "@/lib/desk/selection";
import { cardTitle, disputedClaims, type CardId, type DeskCard } from "@/lib/world/model";

import type { SurfaceControlsRef } from "./surface-controls";
import { ContestedCue } from "./truth";
import type { DeskStore } from "./use-desk";
import { WorldObjectCard } from "@/components/world-objects/world-object-card";
import { objectProse } from "@/lib/world/object-presentation";
import styles from "./desk.module.css";
import stackStyles from "./world-stack.module.css";

/** A represented object leads with its name; a Fragment leads with its text. */
function stackTitle(card: DeskCard): string {
  if (card.representation) {
    const name = cardTitle(card);
    return name === "" ? `Unnamed ${card.representation.kind}` : name;
  }
  return card.body.trim() === "" ? "Empty card" : objectProse(card) || cardTitle(card);
}

type Props = {
  store: DeskStore;
  /** What this composition calls itself when it is empty. */
  surfaceName: string;
  selection: Selection;
  onSelectionChange: (selection: Selection) => void;
  editing: CardId | null;
  onEditingChange: (cardId: CardId | null) => void;
  focusId: CardId | null;
  onFocusChange: (cardId: CardId | null, section?: import("@/components/world-objects/use-focus-history").FocusSection) => void;
  onFollow?: (link: import("@/lib/world/model").Link) => void;
  /** Cards the focused object is connected to. */
  neighbours: ReadonlySet<string>;
  /** Filled in here, so retrieval works the same way without a canvas. */
  controls: SurfaceControlsRef;
  onCapture?: () => void;
};

/**
 * The narrow-screen and pointer-free path.
 *
 * This is not a shrunken canvas. INTERACTION.md asks for workflow parity, not
 * canvas parity: the same world, the same cards, the same edits, arranged as an
 * ordered stack so nothing depends on dragging in two dimensions.
 */
export function DeskStack({
  store,
  surfaceName,
  selection,
  onSelectionChange,
  editing,
  onEditingChange,
  focusId,
  onFocusChange,
  onFollow,
  neighbours,
  controls,
  onCapture
}: Props) {
  const list = useRef<HTMLOListElement>(null);
  const [expanded, setExpanded] = useState<ReadonlySet<CardId>>(new Set());
  const toggleExpanded = (id: CardId) => setExpanded(current => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });

  const cards = store.cards;
  const cardsRef = useRef(cards);
  cardsRef.current = cards;

  /*
   * The same two answers the canvas gives, without a viewport to give them
   * with. Workflow parity, not canvas parity: retrieving something from the
   * Library has to work here too, so "where does it land" becomes a position in
   * the stack and "reveal it" becomes a scroll.
   */
  useEffect(() => {
    controls.current = {
      landing: () => ({ x: 0, y: cardsRef.current.length * 190 }),
      reveal: (cardId) => {
        list.current
          ?.querySelector(`[data-card="${cardId}"]`)
          ?.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    };
    return () => {
      controls.current = null;
    };
  }, [controls]);

  // Most recently placed first — the stack reads as a capture history.
  const ordered = useMemo(() => [...cards].sort((a, b) => b.z - a.z), [cards]);

  return (
    <div className={styles.stack}>
      <div className={styles.stackToolbar}>
        <h2>Stack</h2>
        {onCapture ? <Button variant="primary" onClick={onCapture}><CanvasGlyph name="create" />Capture a fragment</Button> : null}
      </div>
      <div className={styles.stackScroll} role="region" aria-label="Stack cards" tabIndex={0}>
      {ordered.length === 0 ? (
        <div className={styles.emptyStack}>
          <h1>Space for a world.</h1>
          <p>An empty {surfaceName}. Capture a fragment to begin.</p>
        </div>
      ) : null}

      <ol className={styles.stackList} ref={list}>
        {ordered.map((card) => {
          const selected = selection.has(card.cardId);
          const isEditing = editing === card.cardId;
          return (
            <li
              key={card.cardId}
              className={stackStyles.item}
              data-card={card.cardId}
              data-maturity={card.maturity}
              data-selected={selected || undefined}
              data-focused={focusId === card.cardId || undefined}
              // The same attention model without the canvas: what the focused
              // object is connected to keeps its weight, the rest recedes.
              data-neighbour={neighbours.has(card.cardId) || undefined}
              data-receded={
                (focusId !== null &&
                  focusId !== card.cardId &&
                  !neighbours.has(card.cardId)) ||
                undefined
              }
            >
              {isEditing ? (
                <WritingEditor
                  editorClassName={styles.stackEditor}
                  value={card.body}
                  ariaLabel="Card text"
                  onCommit={body => {
                    flushSync(() => store.setBody(card.cardId, body));
                    store.flushBody(card.cardId);
                    onEditingChange(null);
                  }}
                  onCancel={() => onEditingChange(null)}
                />
              ) : (
                <article
                  tabIndex={0}
                  className={stackStyles.body}
                  aria-label={`Stack object: ${stackTitle(card)}`}
                  data-stack-object={card.cardId}
                  aria-description={selected ? "Selected" : undefined}
                  data-empty={card.body.trim() === "" || undefined}
                  onClick={(event) => {
                    if ((event.target as Element).closest("button, a")) return;
                    onSelectionChange(
                      event.shiftKey ? toggle(selection, card.cardId) : only(card.cardId)
                    );
                  }}
                  onDoubleClick={event => {
                    if ((event.target as Element).closest("button, a")) return;
                    onSelectionChange(only(card.cardId));
                    onFocusChange(card.cardId);
                  }}
                  onKeyDown={event => { if (event.target !== event.currentTarget) return; if (event.key === "Enter") { event.preventDefault(); onSelectionChange(only(card.cardId)); } else if (event.key.toLowerCase() === "f") { event.preventDefault(); onSelectionChange(only(card.cardId)); onFocusChange(card.cardId); } }}
                >
                  <WorldObjectCard card={card} selected={selected} disclosure={expanded.has(card.cardId) ? "expanded" : "card"} onExpand={() => toggleExpanded(card.cardId)} onFocus={section => { onSelectionChange(only(card.cardId)); onFocusChange(card.cardId, section); }} onFollow={onFollow ?? (async link => { const [id] = await store.pullIn([link.other], { x: 0, y: cards.length * 190 }); if (id) { onSelectionChange(only(id)); onFocusChange(id); } })}/>
                </article>
              )}

              <div className={stackStyles.actions}>
                <ContestedCue count={disputedClaims(card).length} />
                {/* Workflow parity, not canvas parity: deepening must be
                    reachable without a pointer gesture. */}
                <button
                  type="button"
                  aria-pressed={focusId === card.cardId}
                  onClick={() => {
                    onSelectionChange(only(card.cardId));
                    onFocusChange(focusId === card.cardId ? null : card.cardId);
                  }}
                >
                  Open
                </button>
                <button type="button" onClick={() => onEditingChange(card.cardId)}>
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    store.remove([card.cardId]);
                    onSelectionChange(EMPTY_SELECTION);
                  }}
                >
                  Remove
                </button>
              </div>
            </li>
          );
        })}
      </ol>
      </div>
    </div>
  );
}

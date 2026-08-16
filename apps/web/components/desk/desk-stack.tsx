"use client";

import { useEffect, useMemo, useRef } from "react";

import { EMPTY_SELECTION, only, toggle, type Selection } from "@/lib/desk/selection";
import { cardTitle, disputedClaims, type CardId, type DeskCard } from "@/lib/world/model";

import type { SurfaceControlsRef } from "./surface-controls";
import { ContestedCue, MaturityCue } from "./truth";
import type { DeskStore } from "./use-desk";
import styles from "./desk.module.css";

/** A represented object leads with its name; a Fragment leads with its text. */
function stackTitle(card: DeskCard): string {
  if (card.representation) {
    const name = cardTitle(card);
    return name === "" ? `Unnamed ${card.representation.kind}` : name;
  }
  return card.body.trim() === "" ? "Empty card" : card.body;
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
  onFocusChange: (cardId: CardId | null) => void;
  /** Cards the focused object is connected to. */
  neighbours: ReadonlySet<string>;
  /** Filled in here, so retrieval works the same way without a canvas. */
  controls: SurfaceControlsRef;
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
  neighbours,
  controls
}: Props) {
  const editor = useRef<HTMLTextAreaElement>(null);
  const list = useRef<HTMLOListElement>(null);

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

  useEffect(() => {
    if (!editing) return;
    const node = editor.current;
    if (!node) return;
    node.focus();
    node.setSelectionRange(node.value.length, node.value.length);
  }, [editing]);

  // Most recently placed first — the stack reads as a capture history.
  const ordered = useMemo(() => [...cards].sort((a, b) => b.z - a.z), [cards]);

  return (
    <div className={styles.stack}>
      {ordered.length === 0 ? (
        <p className={styles.emptyStack}>
          An empty {surfaceName}. Use <strong>New card</strong> to begin.
        </p>
      ) : null}

      <ol className={styles.stackList} ref={list}>
        {ordered.map((card) => {
          const selected = selection.has(card.cardId);
          const isEditing = editing === card.cardId;
          return (
            <li
              key={card.cardId}
              className={styles.stackItem}
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
                <textarea
                  ref={editor}
                  className={styles.stackEditor}
                  value={card.body}
                  aria-label="Card text"
                  onChange={(event) => store.setBody(card.cardId, event.target.value)}
                  onBlur={() => {
                    store.flushBody(card.cardId);
                    onEditingChange(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      event.preventDefault();
                      store.flushBody(card.cardId);
                      onEditingChange(null);
                    }
                  }}
                />
              ) : (
                <button
                  type="button"
                  className={styles.stackBody}
                  aria-pressed={selected}
                  data-empty={card.body.trim() === "" || undefined}
                  onClick={(event) => {
                    onSelectionChange(
                      event.shiftKey ? toggle(selection, card.cardId) : only(card.cardId)
                    );
                  }}
                  onDoubleClick={() => {
                    onSelectionChange(only(card.cardId));
                    onFocusChange(card.cardId);
                  }}
                >
                  {stackTitle(card)}
                </button>
              )}

              <div className={styles.stackActions}>
                <MaturityCue state={card.maturity} />
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
  );
}

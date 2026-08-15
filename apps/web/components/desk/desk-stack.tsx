"use client";

import { useEffect, useMemo, useRef } from "react";

import { EMPTY_SELECTION, only, toggle, type Selection } from "@/lib/desk/selection";
import { cardTitle, type CardId, type DeskCard } from "@/lib/world/model";

import { TruthCue } from "./truth";
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
  onFocusChange
}: Props) {
  const editor = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!editing) return;
    const node = editor.current;
    if (!node) return;
    node.focus();
    node.setSelectionRange(node.value.length, node.value.length);
  }, [editing]);

  // Most recently placed first — the stack reads as a capture history.
  const ordered = useMemo(() => [...store.cards].sort((a, b) => b.z - a.z), [store.cards]);

  return (
    <div className={styles.stack}>
      {ordered.length === 0 ? (
        <p className={styles.emptyStack}>
          An empty {surfaceName}. Use <strong>New card</strong> to begin.
        </p>
      ) : null}

      <ol className={styles.stackList}>
        {ordered.map((card) => {
          const selected = selection.has(card.cardId);
          const isEditing = editing === card.cardId;
          return (
            <li
              key={card.cardId}
              className={styles.stackItem}
              data-truth={card.truthState}
              data-selected={selected || undefined}
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
                <TruthCue state={card.truthState} />
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

"use client";

import { useEffect, useMemo, useRef } from "react";

import { EMPTY_SELECTION, only, toggle, type Selection } from "@/lib/desk/selection";
import type { CardId } from "@/lib/world/model";

import type { DeskStore } from "./use-desk";
import styles from "./desk.module.css";

type Props = {
  store: DeskStore;
  selection: Selection;
  onSelectionChange: (selection: Selection) => void;
  editing: CardId | null;
  onEditingChange: (cardId: CardId | null) => void;
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
  selection,
  onSelectionChange,
  editing,
  onEditingChange
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
          An empty desk. Use <strong>New card</strong> to begin.
        </p>
      ) : null}

      <ol className={styles.stackList}>
        {ordered.map((card) => {
          const selected = selection.has(card.cardId);
          const isEditing = editing === card.cardId;
          return (
            <li key={card.cardId} className={styles.stackItem} data-selected={selected || undefined}>
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
                  onDoubleClick={() => onEditingChange(card.cardId)}
                >
                  {card.body.trim() === "" ? "Empty card" : card.body}
                </button>
              )}

              <div className={styles.stackActions}>
                <span className={styles.truth}>
                  <span aria-hidden="true">✎</span> Pencil
                </span>
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

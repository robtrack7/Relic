"use client";

import { useEffect, useRef } from "react";

import type { DeskCard as DeskCardModel } from "@/lib/world/model";

import { TruthCue } from "./truth";
import styles from "./desk.module.css";

type Props = {
  card: DeskCardModel;
  selected: boolean;
  editing: boolean;
  onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
  onRequestEdit: () => void;
  onBodyChange: (body: string) => void;
  onEndEdit: () => void;
};

export function DeskCard({
  card,
  selected,
  editing,
  onPointerDown,
  onRequestEdit,
  onBodyChange,
  onEndEdit
}: Props) {
  const textarea = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!editing) return;
    const node = textarea.current;
    if (!node) return;
    node.focus();
    node.setSelectionRange(node.value.length, node.value.length);
  }, [editing]);

  const summary = card.body.trim();

  return (
    <article
      className={styles.card}
      data-truth={card.truthState}
      data-selected={selected || undefined}
      data-editing={editing || undefined}
      style={{
        left: card.layout.x,
        top: card.layout.y,
        width: card.layout.width,
        minHeight: card.layout.height,
        zIndex: card.z
      }}
      tabIndex={editing ? -1 : 0}
      aria-selected={selected}
      aria-label={summary === "" ? "Empty card" : summary.slice(0, 120)}
      onPointerDown={onPointerDown}
      onDoubleClick={(event) => {
        event.stopPropagation();
        onRequestEdit();
      }}
      onKeyDown={(event) => {
        if (editing) return;
        if (event.key === "Enter" || event.key === "F2") {
          event.preventDefault();
          event.stopPropagation();
          onRequestEdit();
        }
      }}
    >
      {editing ? (
        <textarea
          ref={textarea}
          className={styles.cardEditor}
          value={card.body}
          spellCheck
          aria-label="Card text"
          onChange={(event) => onBodyChange(event.target.value)}
          onBlur={onEndEdit}
          onPointerDown={(event) => event.stopPropagation()}
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.key === "Escape") {
              event.preventDefault();
              onEndEdit();
            }
          }}
        />
      ) : (
        <p className={styles.cardBody} data-empty={summary === "" || undefined}>
          {summary === "" ? "Empty — press Enter to write" : card.body}
        </p>
      )}

      <footer className={styles.cardFooter}>
        <TruthCue state={card.truthState} />
      </footer>
    </article>
  );
}

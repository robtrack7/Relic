"use client";

import { useEffect, useRef } from "react";

import {
  cardTitle,
  FREE_ASSERTION,
  type DeskCard as DeskCardModel
} from "@/lib/world/model";
import { builtInTemplate } from "@/lib/world/templates";

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
  const representation = card.representation;
  const title = cardTitle(card);

  /*
   * A Character, a Place and an unfinished Fragment should read as members of
   * one family without being the same thing. The difference is content — a name
   * and its assertions, or bare text on paper — never a different wrapper or
   * decoration.
   */
  const standing = representation
    ? card.claims.filter((claim) => claim.claimKind !== FREE_ASSERTION).slice(0, 4)
    : [];

  const sheet = representation
    ? builtInTemplate(representation.kind).fields.filter(
        (field) => representation.fields[field.key] !== undefined
      )
    : [];

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
      data-kind={representation?.kind}
      aria-label={
        representation
          ? `${representation.kind}: ${title === "" ? "unnamed" : title}`
          : summary === ""
            ? "Empty card"
            : summary.slice(0, 120)
      }
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
      ) : representation ? (
        <>
          <header className={styles.cardHead}>
            <span className={styles.kindMark}>{representation.kind}</span>
            <h3 className={styles.cardName} data-empty={title === "" || undefined}>
              {title === "" ? "Unnamed" : title}
            </h3>
          </header>

          {standing.length > 0 ? (
            <dl className={styles.claimList}>
              {standing.map((claim) => (
                <div key={claim.id} className={styles.claimRow} data-truth={claim.truthState}>
                  <dt className={styles.claimKind}>{claim.claimKind}</dt>
                  <dd className={styles.claimValue}>{claim.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          {sheet.length > 0 ? (
            <ul className={styles.sheet}>
              {sheet.map((field) => (
                <li key={field.key} className={styles.sheetCell}>
                  <span className={styles.sheetLabel}>{field.label}</span>
                  <span className={styles.sheetValue}>
                    {String(representation.fields[field.key])}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}

          {summary === "" ? null : <p className={styles.cardNote}>{summary}</p>}
        </>
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

"use client";

import { useEffect, useRef } from "react";

import {
  cardTitle,
  FREE_ASSERTION,
  type DeskCard as DeskCardModel
} from "@/lib/world/model";
import { claimBudget, type Tier } from "@/lib/desk/zoom";
import { builtInTemplate } from "@/lib/world/templates";

import { TruthCue } from "./truth";
import styles from "./desk.module.css";

type Props = {
  card: DeskCardModel;
  /** How much of itself this card should show at the current scale. */
  tier?: Tier;
  selected: boolean;
  editing: boolean;
  /** This is the object being deepened into. */
  focused?: boolean;
  /** Something else is. Recede without leaving. */
  receded?: boolean;
  onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
  onOpen?: () => void;
  onRequestEdit: () => void;
  onBodyChange: (body: string) => void;
  onEndEdit: () => void;
};

export function DeskCard({
  card,
  tier = "mid",
  selected,
  editing,
  focused = false,
  receded = false,
  onPointerDown,
  onOpen,
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
  const budget = claimBudget(tier);

  const standing = representation
    ? card.claims
        .filter((claim) => claim.claimKind !== FREE_ASSERTION)
        .slice(0, budget === Number.POSITIVE_INFINITY ? undefined : budget)
    : [];

  // The sheet is figures, which stay readable when small — but at far zoom the
  // question is "what is over there", and a row of numbers does not answer it.
  const sheet =
    representation && tier !== "far"
      ? builtInTemplate(representation.kind).fields.filter(
          (field) => representation.fields[field.key] !== undefined
        )
      : [];

  // Prose is the first thing to go and the last to come back.
  const showsBody = tier === "near" || !representation;

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
      data-tier={tier}
      data-focused={focused || undefined}
      data-receded={receded || undefined}
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
        // Deeper intent opens the entity surface. Enter still edits inline,
        // which is the fast path capture depends on.
        if (onOpen) onOpen();
        else onRequestEdit();
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

          {showsBody && summary !== "" ? (
            <p className={styles.cardNote}>{summary}</p>
          ) : null}
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

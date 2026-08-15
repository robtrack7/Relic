import type { AuthorKind, Maturity, Provenance, Settlement, TruthState } from "@/lib/world/model";

import styles from "./desk.module.css";

/**
 * The two axes, drawn so they cannot be mistaken for each other.
 *
 * **Maturity** is how settled a thing is. **Truth** is whether an assertion is
 * believed. A Pencil Character may hold an established claim about their
 * occupation; an Ink Character may hold a disputed one about the cathedral.
 * Rendering one as the other would tell the GM something false about their own
 * world, so they get different words and different marks — never one badge
 * doing both jobs.
 *
 * Neither ever reads through colour alone. Every state carries a word plus a
 * glyph, so it survives greyscale, a screen reader, and a GM who is looking at
 * the table rather than the screen.
 */

const MATURITY_MARK: Record<Maturity, { label: string; glyph: string }> = {
  pencil: { label: "Pencil", glyph: "✎" },
  ink: { label: "Ink", glyph: "◆" }
};

const TRUTH_MARK: Record<TruthState, { label: string; glyph: string }> = {
  pencil: { label: "Pencil", glyph: "✎" },
  ink: { label: "Ink", glyph: "◆" },
  disputed: { label: "Disputed", glyph: "≠" }
};

/**
 * How settled the object is. Belongs on a card; never on a claim.
 *
 * The word sits in its own element so that far zoom can drop it and keep the
 * mark: at that distance the question is "what is over there", and the shape
 * answers it while a word only takes up room.
 */
export function MaturityCue({ state }: { state: Maturity }) {
  const mark = MATURITY_MARK[state];
  return (
    <span className={styles.truth} data-maturity={state} aria-label={`Maturity: ${mark.label}`}>
      <span aria-hidden="true">{mark.glyph}</span>
      <span className={styles.truthLabel}>{mark.label}</span>
    </span>
  );
}

/**
 * That something about this object is contested.
 *
 * Surfaced on the card because an unresolved dispute is exactly the thing a GM
 * needs to see before it comes up at the table — and it would otherwise be
 * invisible until the object was opened.
 */
export function ContestedCue({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span
      className={styles.contested}
      aria-label={`${count} disputed ${count === 1 ? "claim" : "claims"}`}
    >
      <span aria-hidden="true">≠ {count}</span>
      <span className={styles.truthLabel}>disputed</span>
    </span>
  );
}

/** Whether Relic believes one assertion. Belongs on a claim; never on a card. */
export function TruthMark({ state }: { state: TruthState }) {
  const mark = TRUTH_MARK[state];
  return (
    <span className={styles.claimTruth} data-truth={state} aria-label={`Truth: ${mark.label}`}>
      <span aria-hidden="true">{mark.glyph}</span> {mark.label.toUpperCase()}
    </span>
  );
}

const AUTHOR: Record<AuthorKind, string> = {
  gm: "you",
  player: "a player",
  librarian: "the Librarian",
  system: "Relic"
};

const RULING: Record<TruthState, string> = {
  ink: "established",
  disputed: "disputed",
  pencil: "returned to pencil"
};

const ARRIVAL: Record<Provenance["kind"], string> = {
  gm_capture: "captured",
  gm_assertion: "asserted",
  import: "imported",
  librarian: "inferred",
  session: "from play"
};

/** Short enough for a card, exact enough to be worth reading. */
function when(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/**
 * Why Relic believes this.
 *
 * Two facts, kept apart because they are two facts: how the assertion arrived,
 * and what was later decided about it. "Inferred by the Librarian · established
 * by you" is the sentence the whole truth system exists to be able to write,
 * and collapsing it into one line would lose the half that matters.
 *
 * Mono, quiet, and always present — an archival record rather than a tooltip
 * the GM has to know to go looking for.
 */
export function ProvenanceLine({
  provenance,
  settled,
  truth
}: {
  provenance: Provenance;
  settled: Settlement | null;
  truth: TruthState;
}) {
  const arrival = `${ARRIVAL[provenance.kind]} by ${AUTHOR[provenance.authoredBy]}`;
  const ruling = settled ? `${RULING[truth]} by ${AUTHOR[settled.by]} ${when(settled.at)}` : null;

  return (
    <p className={styles.provenance}>
      {arrival}
      {ruling ? <span className={styles.provenanceRuling}> · {ruling}</span> : null}
    </p>
  );
}

import type { TruthState } from "@/lib/world/model";

import styles from "./desk.module.css";

/**
 * Truth state reads through a word and a mark, never through colour alone — a
 * GM must be able to tell established world truth from provisional material
 * without relying on hue. The card's edge carries the same distinction in
 * shape: Pencil is drawn with an interrupted border.
 */
const TRUTH_MARK: Record<TruthState, { label: string; glyph: string }> = {
  pencil: { label: "Pencil", glyph: "✎" },
  ink: { label: "Ink", glyph: "◆" },
  disputed: { label: "Disputed", glyph: "≠" }
};

export function TruthCue({ state }: { state: TruthState }) {
  const mark = TRUTH_MARK[state];
  return (
    <span className={styles.truth} aria-label={`Truth state: ${mark.label}`}>
      <span aria-hidden="true">{mark.glyph}</span> {mark.label}
    </span>
  );
}

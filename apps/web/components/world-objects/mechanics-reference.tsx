import type { DeskCard } from "@/lib/world/model";
import type { MechanicsProfile } from "@/lib/world/entity-document";
import { legacyMechanicsProfile } from "@/lib/world/mechanics-presentation";
import { MechanicsStatBlock } from "@/components/entities/mechanics-stat-block";
import styles from "./mechanics-reference.module.css";

/** Field-based (pre-profile) mechanics, presented through the shared stat block. */
export function referenceProfile(card: DeskCard): MechanicsProfile {
  return card.representation?.mechanics ?? legacyMechanicsProfile(card, { populatedOnly: true });
}

export function MechanicsReference({ card, profile = "full", onFull }: { card: DeskCard; profile?: "full" | "compact" | "glance"; onFull?: () => void }) {
  const mechanics = referenceProfile(card);
  if (!mechanics.fields.length && !mechanics.features.length && !mechanics.resources.length) return <p className={styles.empty}>Add the rules details you use at the table.</p>;
  return <div className={styles.reference} data-profile={profile} aria-label="Mechanics reference">
    <MechanicsStatBlock profile={mechanics} depth={profile === "full" ? "focus" : "card"} editable={false}/>
    {onFull ? <button className={styles.full} type="button" onClick={onFull}>Full mechanics <span aria-hidden="true">→</span></button> : null}
  </div>;
}

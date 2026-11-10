"use client";

import { objectMedia, objectProse } from "@/lib/world/object-presentation";
import { CardTitle, displayTitle, Essentials, fact, firstSentence, involvedLinks, type ObjectCardContentProps } from "./card-content";
import { ObjectMaturity, ObjectMedia, ObjectMonogram, ObjectReferences } from "./object-parts";
import styles from "./object-cards.module.css";

/** Portrait crops keep the face's focal point at this fraction of the frame height. */
export const PORTRAIT_FOCAL = 0.4;

export function CharacterPortrait({ card, className = "" }: Pick<ObjectCardContentProps, "card"> & { className?: string }) {
  return <div className={`${styles.portraitFrame} ${className}`}>
    {objectMedia(card) ? <ObjectMedia card={card} className={styles.fill} focal={PORTRAIT_FOCAL}/> : <ObjectMonogram title={displayTitle(card)} className={styles.fill}/>}
  </div>;
}

/** OBJ-CHAR-02: portrait (or composed initials) and the name. Nothing else. */
export function CharacterCard({ card }: ObjectCardContentProps) {
  return <div className={styles.character} data-recognition="small">
    <CharacterPortrait card={card}/>
    <div className={styles.nameBand}><CardTitle card={card}/><ObjectMaturity card={card}/></div>
  </div>;
}

const ESSENTIAL_KEYS = ["allegiance", "location", "status"];

/** OBJ-CHAR-03: portrait column, name, epithet, one statement, at most three essentials, one relationship cue. */
export function CharacterExpandedCard({ card, claims, links, onFollow }: ObjectCardContentProps) {
  const epithet = fact(card, claims, "occupation");
  const statement = firstSentence(objectProse(card));
  // An essential already names its object; the cue offers the other connections.
  const related = involvedLinks(links).filter(link => !ESSENTIAL_KEYS.includes(link.claimKind));
  return <div className={styles.characterExpanded} data-recognition="expanded">
    <CharacterPortrait card={card}/>
    <div className={styles.characterBody}>
      <div className={styles.headRow}><CardTitle card={card} size="expanded"/><ObjectMaturity card={card}/></div>
      {epithet ? <p className={styles.epithet}>{epithet}</p> : null}
      {statement ? <p className={styles.statement} data-identity-statement>{statement}</p> : null}
      <Essentials card={card} claims={claims} keys={ESSENTIAL_KEYS}/>
      {related.length ? <div className={styles.relationCue}><span>Connected</span><ObjectReferences links={related} onFollow={onFollow} limit={3}/></div> : null}
    </div>
  </div>;
}

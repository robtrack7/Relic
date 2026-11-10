"use client";

import { objectProse } from "@/lib/world/object-presentation";
import { CardTitle, claimValue, firstSentence, involvedLinks, type ExpandedCardContentProps, type ObjectCardContentProps } from "./card-content";
import { Developments, ObjectGlyph, ObjectMaturity, ObjectReferences } from "./object-parts";
import styles from "./object-cards.module.css";

function ThreadLead({ card, claims, expanded = false }: Pick<ObjectCardContentProps, "card" | "claims"> & { expanded?: boolean }) {
  const status = claimValue(claims, "status") || "Unresolved";
  const question = claimValue(claims, "open_question") || firstSentence(objectProse(card));
  const pressure = claimValue(claims, "next") || claimValue(claims, "stakes");
  return <>
    <div className={styles.metaRow}><span className={styles.familyCue}><ObjectGlyph family="thread"/>Thread</span><span className={styles.threadStatus}><i aria-hidden="true"/>{status}</span></div>
    <CardTitle card={card} size={expanded ? "expanded" : "card"}/>
    {question && question !== card.representation?.label ? <p className={styles.question}>{question}</p> : null}
    {pressure ? <p className={styles.pressure}><span>Pressure</span>{pressure}</p> : null}
  </>;
}

/** OBJ-THREAD-02: what is unresolved, how hard it pulls, and who is in it. */
export function ThreadCard({ card, claims, links }: ObjectCardContentProps) {
  const involved = involvedLinks(links).slice(0, 3);
  return <div className={styles.thread} data-recognition="small">
    <ThreadLead card={card} claims={claims}/>
    <div className={styles.footRow}>
      <span className={styles.involved}>{involved.map(link => link.other.label).join(" · ")}</span>
      <ObjectMaturity card={card}/>
    </div>
  </div>;
}

/** OBJ-THREAD-03: the Card plus its recent story developments and followable people/places. */
export function ThreadExpandedCard({ card, claims, links, developments, onFollow }: ExpandedCardContentProps) {
  const involved = involvedLinks(links);
  return <div className={styles.thread} data-recognition="expanded">
    <ThreadLead card={card} claims={claims} expanded/>
    <section className={styles.expandedSection} aria-label="Recent developments"><h3>Recent developments</h3><Developments items={developments.slice(-3)}/></section>
    <div className={styles.footRow}>
      {involved.length ? <ObjectReferences links={involved} onFollow={onFollow} limit={3}/> : <span/>}
      <ObjectMaturity card={card}/>
    </div>
  </div>;
}

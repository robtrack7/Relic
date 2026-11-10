"use client";

import { objectMedia, objectProse } from "@/lib/world/object-presentation";
import { CardTitle, displayTitle, Essentials, FadeText, fact, involvedLinks, type ObjectCardContentProps } from "./card-content";
import { ObjectGlyph, ObjectMaturity, ObjectMedia, ObjectMonogram, ObjectReferences } from "./object-parts";
import styles from "./object-cards.module.css";

/** Faction, Artifact and Event share identity and reference primitives while each leads with its own answer. */

function Emblem({ card }: Pick<ObjectCardContentProps, "card">) {
  return <div className={styles.emblem}>{objectMedia(card) ? <ObjectMedia card={card} className={styles.fill}/> : <ObjectMonogram title={displayTitle(card)} className={styles.fill}/>}</div>;
}

function References({ links, onFollow }: Pick<ObjectCardContentProps, "links" | "onFollow">) {
  const related = involvedLinks(links);
  return related.length ? <div className={styles.footRow}><ObjectReferences links={related} onFollow={onFollow} limit={4}/></div> : null;
}

function Cue({ card, family, children }: { card: ObjectCardContentProps["card"]; family: "faction" | "artifact" | "event"; children: string }) {
  return <div className={styles.metaRow}><span className={styles.familyCue}><ObjectGlyph family={family}/>{children}</span><ObjectMaturity card={card}/></div>;
}

/** Who they are, what they want. */
export function FactionCard({ card, claims, expanded = false }: ObjectCardContentProps & { expanded?: boolean }) {
  const context = [fact(card, claims, "seat"), fact(card, claims, "size")].filter(Boolean).join(" · ");
  const agenda = fact(card, claims, "goal");
  return <div className={styles.faction}>
    <div className={styles.emblemRow}><Emblem card={card}/><div className={styles.emblemText}><Cue card={card} family="faction">Faction</Cue><CardTitle card={card} size={expanded ? "expanded" : "card"}/>{context ? <p className={styles.kindLine}>{context}</p> : null}</div></div>
    {agenda ? <p className={styles.agenda}>{agenda}</p> : <FadeText lines={3} className={styles.statement}>{objectProse(card)}</FadeText>}
  </div>;
}

/** What it is and who holds it. */
export function ArtifactCard({ card, claims, expanded = false }: ObjectCardContentProps & { expanded?: boolean }) {
  const context = [fact(card, claims, "rarity"), fact(card, claims, "holder")].filter(Boolean).join(" · ");
  const image = Boolean(objectMedia(card));
  return <div className={styles.artifact} data-image={image || undefined}>
    {image ? <div className={styles.artifactImage}><ObjectMedia card={card} className={styles.fill}/></div> : null}
    <div className={image ? styles.artifactText : styles.emblemRow}>{image ? null : <Emblem card={card}/>}<div className={styles.emblemText}><Cue card={card} family="artifact">Artifact</Cue><CardTitle card={card} size={expanded ? "expanded" : "card"}/>{context ? <p className={styles.kindLine}>{context}</p> : null}</div></div>
    <FadeText lines={expanded ? 4 : 2} className={styles.statement}>{objectProse(card)}</FadeText>
  </div>;
}

function storyPosition(claims: ObjectCardContentProps["claims"]): string {
  return claims.find(item => item.story.label)?.story.label ?? "Not yet placed in story time";
}

/** When it happened, and what it changed. */
export function EventCard({ card, claims, expanded = false }: ObjectCardContentProps & { expanded?: boolean }) {
  return <div className={styles.event}>
    <Cue card={card} family="event">{storyPosition(claims)}</Cue>
    <CardTitle card={card} size={expanded ? "expanded" : "card"}/>
    <FadeText lines={expanded ? 4 : 3} className={styles.statement}>{objectProse(card)}</FadeText>
    {!expanded && fact(card, claims, "location") ? <p className={styles.kindLine}>At {fact(card, claims, "location")}</p> : null}
  </div>;
}

export function FactionSmallCard(props: ObjectCardContentProps) {
  return <div className={styles.familyHost} data-recognition="small"><FactionCard {...props}/></div>;
}
export function FactionExpandedCard(props: ObjectCardContentProps) {
  return <div className={styles.familyHost} data-recognition="expanded"><FactionCard {...props} expanded/><div className={styles.expandedBody}><Essentials card={props.card} claims={props.claims} keys={["leader", "status", "seat"]}/></div><References {...props}/></div>;
}
export function ArtifactSmallCard(props: ObjectCardContentProps) {
  return <div className={styles.familyHost} data-recognition="small"><ArtifactCard {...props}/></div>;
}
export function ArtifactExpandedCard(props: ObjectCardContentProps) {
  return <div className={styles.familyHost} data-recognition="expanded"><ArtifactCard {...props} expanded/><div className={styles.expandedBody}><Essentials card={props.card} claims={props.claims} keys={["location", "origin", "attunement"]}/></div><References {...props}/></div>;
}
export function EventSmallCard(props: ObjectCardContentProps) {
  return <div className={styles.familyHost} data-recognition="small"><EventCard {...props}/></div>;
}
export function EventExpandedCard(props: ObjectCardContentProps) {
  return <div className={styles.familyHost} data-recognition="expanded"><EventCard {...props} expanded/><div className={styles.expandedBody}><Essentials card={props.card} claims={props.claims} keys={["location", "participants", "consequence"]}/></div><References {...props}/></div>;
}

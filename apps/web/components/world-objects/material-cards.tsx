"use client";

import { fragmentProse, objectField, objectMedia, objectProse } from "@/lib/world/object-presentation";
import { CardTitle, Essentials, FadeText, fact, firstSentence, involvedLinks, type ObjectCardContentProps } from "./card-content";
import { ObjectGlyph, ObjectMaturity, ObjectMedia, ObjectReferences } from "./object-parts";
import styles from "./object-cards.module.css";

function placeKind(card: ObjectCardContentProps["card"], claims: ObjectCardContentProps["claims"]) {
  return [fact(card, claims, "category"), fact(card, claims, "region") || objectField(card, "terrain")].filter(Boolean).join(" · ");
}

/**
 * OBJ-PLACE-02: the image leads to the top edge; name and category sit on a
 * tonal overlay at its lower edge. `cinematic` lets the image hold the whole
 * card. Without imagery the Place is title-led rather than an empty frame.
 */
export function PlaceCard({ card, claims }: ObjectCardContentProps) {
  const kind = placeKind(card, claims);
  const atmosphere = firstSentence(objectProse(card), 140);
  const cinematic = objectField(card, "composition") === "cinematic";
  if (!objectMedia(card)) return <div className={`${styles.place} ${styles.placeText}`} data-recognition="small">
    <div className={styles.metaRow}><span className={styles.familyCue}><ObjectGlyph family="place"/>Place</span><ObjectMaturity card={card}/></div>
    <CardTitle card={card}/>
    {kind ? <p className={styles.kindLine}>{kind}</p> : null}
    {atmosphere ? <p className={styles.atmosphere}>{atmosphere}</p> : null}
  </div>;
  return <div className={styles.place} data-cinematic={cinematic || undefined} data-recognition="small">
    <div className={styles.placeImage}>
      <ObjectMedia card={card} className={styles.fill}/>
      <div className={styles.placeOverlay}>
        <CardTitle card={card}/>
        {kind ? <p className={styles.kindLine}>{kind}</p> : null}
        {cinematic && atmosphere ? <p className={styles.atmosphere}>{atmosphere}</p> : null}
        {cinematic ? <ObjectMaturity card={card}/> : null}
      </div>
    </div>
    {!cinematic ? <div className={styles.placeBand}>{atmosphere ? <p className={styles.atmosphere}>{atmosphere}</p> : <span/>}<ObjectMaturity card={card}/></div> : null}
  </div>;
}

export function PlaceExpandedCard({ card, claims, links, onFollow }: ObjectCardContentProps) {
  const kind = placeKind(card, claims);
  const related = involvedLinks(links);
  return <div className={styles.placeExpanded} data-recognition="expanded">
    {objectMedia(card) ? <div className={styles.placeImage}><ObjectMedia card={card} className={styles.fill}/><div className={styles.placeOverlay}><CardTitle card={card} size="expanded"/>{kind ? <p className={styles.kindLine}>{kind}</p> : null}</div></div> : null}
    <div className={styles.expandedBody}>
      {!objectMedia(card) ? <><CardTitle card={card} size="expanded"/>{kind ? <p className={styles.kindLine}>{kind}</p> : null}</> : null}
      <FadeText lines={3} className={styles.statement}>{objectProse(card)}</FadeText>
      <Essentials card={card} claims={claims} keys={["status", "climate", "ruler"]}/>
    </div>
    <div className={styles.footRow}>{related.length ? <ObjectReferences links={related} onFollow={onFollow} limit={3}/> : <span/>}<ObjectMaturity card={card}/></div>
  </div>;
}

function isQuote(card: ObjectCardContentProps["card"], prose: string) {
  return objectField(card, "composition") === "quote" || /^[“"‘]/.test(prose.trim());
}

/** A small provenance cue: who wrote it when it was not the GM, else its classification. */
function fragmentCue(card: ObjectCardContentProps["card"]) {
  if (card.written && card.written.by !== "gm") return { librarian: "Written by the Librarian", player: "Written by a player", system: "Imported" }[card.written.by];
  return objectField(card, "category") || "Unclassified";
}

/**
 * OBJ-FRAG-03: the words are the object. No media band unless an image was
 * captured; prose clamps to whole lines and fades rather than clipping.
 */
export function FragmentCard({ card, links, onFollow, expanded = false }: ObjectCardContentProps & { expanded?: boolean }) {
  const prose = fragmentProse(card);
  const empty = !prose.trim();
  const quote = !empty && isQuote(card, prose);
  const image = Boolean(objectMedia(card));
  const lines = expanded ? (image ? 8 : 12) : image ? 4 : 7;
  const related = expanded ? involvedLinks(links) : [];
  return <div className={styles.fragment} data-quote={quote || undefined} data-image={image || undefined} data-recognition={expanded ? "expanded" : "small"}>
    {image ? <div className={styles.fragmentImage}><ObjectMedia card={card} className={styles.fill}/></div> : null}
    <div className={styles.fragmentText}>
      {empty ? <p className={styles.fragmentProse} data-empty>A name, a question, a beginning.</p> : <FadeText as={quote ? "blockquote" : "p"} lines={lines} className={styles.fragmentProse}>{prose}</FadeText>}
    </div>
    {related.length ? <div className={styles.fragmentLinks}><ObjectReferences links={related} onFollow={onFollow} limit={4}/></div> : null}
    <div className={styles.footRow}><span className={styles.familyCue}><ObjectGlyph family="fragment"/>{fragmentCue(card)}</span><ObjectMaturity card={card}/></div>
  </div>;
}

function SourceThumbnail({ card }: Pick<ObjectCardContentProps, "card">) {
  const pages = objectField(card, "page");
  return <div className={styles.documentFrame}>
    {objectMedia(card) ? <ObjectMedia card={card} className={styles.fill}/> : <div className={styles.documentBlank} aria-hidden="true"><ObjectGlyph family="source"/></div>}
    {pages ? <span className={styles.pageCue}>{pages}</span> : null}
  </div>;
}

/** OBJ-SRC-02: the document is the object — its own framed thumbnail, title, type, excerpt, provenance. */
export function SourceCard({ card, claims, expanded = false }: ObjectCardContentProps & { expanded?: boolean }) {
  const citation = objectField(card, "citation");
  const excerpt = objectField(card, "excerpt") || objectProse(card);
  const origin = fact(card, claims, "origin");
  return <div className={styles.source}>
    <div className={styles.sourceMain}>
      <SourceThumbnail card={card}/>
      <div className={styles.sourceText}>
        <span className={styles.familyCue}><ObjectGlyph family="source"/>{objectField(card, "sourceType") || "Source"}</span>
        <CardTitle card={card} size={expanded ? "expanded" : "card"}/>
        {citation ? <p className={styles.citation}>{citation}</p> : null}
        {excerpt ? <FadeText lines={expanded ? 6 : 3} className={styles.excerpt}>{excerpt}</FadeText> : null}
        {expanded && excerpt !== objectProse(card) ? <FadeText lines={4} className={styles.statement}>{objectProse(card)}</FadeText> : null}
      </div>
    </div>
    <div className={styles.footRow}><span className={styles.provenance}>{origin ? <>From {origin}</> : "Provenance unrecorded"}</span><ObjectMaturity card={card}/></div>
  </div>;
}

export function SourceSmallCard(props: ObjectCardContentProps) {
  return <div className={styles.sourceHost} data-recognition="small"><SourceCard {...props}/></div>;
}

export function SourceExpandedCard(props: ObjectCardContentProps) {
  const related = involvedLinks(props.links);
  return <div className={styles.sourceHost} data-recognition="expanded"><SourceCard {...props} expanded/>
    {related.length ? <section className={styles.expandedSection} aria-label="Related world material"><h3>Related world material</h3><ObjectReferences links={related} onFollow={props.onFollow} limit={4}/></section> : null}
  </div>;
}

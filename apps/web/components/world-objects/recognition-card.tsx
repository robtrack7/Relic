"use client";

import type { Claim, DeskCard, Link } from "@/lib/world/model";
import { objectFamily, objectMedia, type Disclosure } from "@/lib/world/object-presentation";
import type { StoryDevelopment } from "@/lib/world/object-projection";
import { displayTitle, type ObjectCardContentProps } from "./card-content";
import { CharacterCard, CharacterExpandedCard, PORTRAIT_FOCAL } from "./character-card";
import { ArtifactExpandedCard, ArtifactSmallCard, EventExpandedCard, EventSmallCard, FactionExpandedCard, FactionSmallCard } from "./family-cards";
import { FragmentCard, PlaceCard, PlaceExpandedCard, SourceExpandedCard, SourceSmallCard } from "./material-cards";
import { ObjectGlyph, ObjectMedia, ObjectMonogram } from "./object-parts";
import { ThreadCard, ThreadExpandedCard } from "./thread-card";
import styles from "./recognition-card.module.css";

type FaceProps = {
  card: DeskCard;
  claims: readonly Claim[];
  links: readonly Link[];
  developments: readonly StoryDevelopment[];
  disclosure: Disclosure;
  onFollow?: (link: Link) => void;
};

const MARKED = new Set(["character", "faction", "artifact"]);

/**
 * DSK-026 far tier: the same Small Card simplified to image or mark, a type
 * cue and the name. The name counter-scales against the Desk camera so it is
 * never rendered below 11px on screen.
 */
export function FarRecognitionCard({ card }: { card: DeskCard }) {
  const family = objectFamily(card);
  const media = Boolean(objectMedia(card));
  return <div className={styles.far} data-recognition="far" data-media={media || undefined}>
    {media ? <div className={styles.farImage}><ObjectMedia card={card} className={styles.fill} focal={family === "character" ? PORTRAIT_FOCAL : undefined}/></div>
      : MARKED.has(family) ? <ObjectMonogram title={displayTitle(card)} className={styles.farMark}/> : null}
    <div className={styles.farName}>
      <ObjectGlyph family={family} className={styles.farGlyph}/>
      <h2 data-card-title>{displayTitle(card)}</h2>
    </div>
  </div>;
}

/** Selects the family-owned face for a disclosure. Shell, selection and motion stay with the host. */
export function RecognitionFace({ card, claims, links, developments, disclosure, onFollow }: FaceProps) {
  if (disclosure === "marker") return <FarRecognitionCard card={card}/>;
  const expanded = disclosure === "expanded";
  const props: ObjectCardContentProps = { card, claims, links, onFollow };
  switch (objectFamily(card)) {
    case "character": return expanded ? <CharacterExpandedCard {...props}/> : <CharacterCard {...props}/>;
    case "place": return expanded ? <PlaceExpandedCard {...props}/> : <PlaceCard {...props}/>;
    case "thread": return expanded ? <ThreadExpandedCard {...props} developments={developments}/> : <ThreadCard {...props}/>;
    case "source": return expanded ? <SourceExpandedCard {...props}/> : <SourceSmallCard {...props}/>;
    case "faction": return expanded ? <FactionExpandedCard {...props}/> : <FactionSmallCard {...props}/>;
    case "artifact": return expanded ? <ArtifactExpandedCard {...props}/> : <ArtifactSmallCard {...props}/>;
    case "event": return expanded ? <EventExpandedCard {...props}/> : <EventSmallCard {...props}/>;
    default: return <FragmentCard {...props} expanded={expanded}/>;
  }
}

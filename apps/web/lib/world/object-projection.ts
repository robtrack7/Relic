import type {
  Claim,
  DeskCard,
  Link,
  ObjectRef,
  Provenance,
  StoryPosition
} from "@/lib/world/model";
import type { EntitySnapshot } from "./entity-document";

/** The contexts this presentation adapter can describe. */
export type ProjectionContext =
  | Readonly<{ kind: "now" }>
  | Readonly<{ kind: "historical"; position: StoryPosition }>;

/** Explicit truth layers; maturity is deliberately not one of them. */
export type TemporalTruthLayer =
  | "settled"
  | "pending"
  | "corrected"
  | "reverted"
  | "evidence";

export type StoryDevelopment = Readonly<{
  id: string;
  summary: string;
  story: StoryPosition;
  layer: TemporalTruthLayer;
  provenance: Provenance;
  event?: ObjectRef;
  involved?: readonly ObjectRef[];
}>;

/** An already-resolved historical read; this module does not reconstruct it. */
export type ResolvedObjectSnapshot = Readonly<{
  context: ProjectionContext;
  card: DeskCard;
  developments: readonly StoryDevelopment[];
}>;

export type ProjectedObject = Readonly<{
  card: DeskCard;
  context: ProjectionContext;
  settledClaims: readonly Claim[];
  pendingClaims: readonly Claim[];
  settledLinks: readonly Link[];
  pendingLinks: readonly Link[];
  developments: readonly StoryDevelopment[];
  pendingDevelopments: readonly StoryDevelopment[];
  /** Evidence is separate from story-truth developments. */
  evidenceDevelopments: readonly StoryDevelopment[];
}>;

const NOW: ProjectionContext = { kind: "now" };

function claimLayer(state: Claim["truthState"]): TemporalTruthLayer {
  return state === "ink" ? "settled" : "pending";
}

function isDevelopmentClaim(claim: Claim): boolean {
  return (
    (claim.claimKind === "development" || claim.claimKind.startsWith("development:"))
  );
}

function claimDevelopment(claim: Claim, links: readonly Link[]): StoryDevelopment {
  const event = links.find(link => link.claimId === claim.id && link.direction === "out" && link.other.kind === "event")?.other;
  return {
    id: String(claim.id),
    summary: claim.value,
    story: claim.story,
    layer: claimLayer(claim.truthState),
    provenance: claim.provenance,
    ...(event ? { event } : {})
  };
}

function storyOrder(value: StoryPosition): number {
  return value.order ?? Number.POSITIVE_INFINITY;
}

function orderByStory(values: readonly StoryDevelopment[]): readonly StoryDevelopment[] {
  return values
    .map((development, index) => ({ development, index }))
    .sort(
      (left, right) =>
        storyOrder(left.development.story) - storyOrder(right.development.story) ||
        left.index - right.index
    )
    .map(({ development }) => development);
}

function isFuture(development: StoryDevelopment, context: ProjectionContext): boolean {
  const position = context.kind === "historical" ? context.position.order : null;
  return (
    position !== null &&
    development.story.order !== null &&
    development.story.order > position
  );
}

function visibleDevelopments(
  developments: readonly StoryDevelopment[],
  context: ProjectionContext
): Pick<
  ProjectedObject,
  "developments" | "pendingDevelopments" | "evidenceDevelopments"
> {
  const visible = developments.filter(
    (development) =>
      development.layer !== "corrected" &&
      development.layer !== "reverted" &&
      !isFuture(development, context)
  );
  const evidenceDevelopments = orderByStory(
    visible.filter((development) => development.layer === "evidence")
  );
  const settledDevelopments = orderByStory(
    visible.filter((development) => development.layer === "settled")
  );
  const pendingDevelopments = orderByStory(
    visible.filter((development) => development.layer === "pending")
  );

  return {
    developments: settledDevelopments,
    pendingDevelopments,
    evidenceDevelopments
  };
}

function claimStoryOrder(claim: Claim): number {
  return claim.story.order ?? Number.NEGATIVE_INFINITY;
}

/**
 * Chooses the current settled standing for each scalar claim kind in Now.
 * Pending rows never replace a settled standing. Dated claims are compared by
 * Story Position only; recordedAt is provenance, not chronology.
 */
function currentSettledClaims(claims: readonly Claim[]): readonly Claim[] {
  const settledByKind = new Map<string, { claim: Claim; index: number }>();
  claims.forEach((claim, index) => {
    if (claim.truthState !== "ink") return;
    const previous = settledByKind.get(claim.claimKind);
    if (
      !previous ||
      claimStoryOrder(claim) > claimStoryOrder(previous.claim) ||
      (claimStoryOrder(claim) === claimStoryOrder(previous.claim) && index < previous.index)
    ) {
      settledByKind.set(claim.claimKind, { claim, index });
    }
  });
  return [...settledByKind.values()]
    .sort((left, right) => left.index - right.index)
    .map(({ claim }) => claim);
}

/** Semantic projection for entity hosts; no Placement is created or required. */
export function projectEntity(entity: EntitySnapshot) {
  const developments = entity.claims.filter(isDevelopmentClaim).map(claim => claimDevelopment(claim, entity.links));
  return {
    settledClaims: currentSettledClaims(entity.claims),
    pendingClaims: pendingClaims(entity.claims),
    settledLinks: entity.links.filter(link => link.truthState === "ink"),
    pendingLinks: entity.links.filter(link => link.truthState !== "ink"),
    ...visibleDevelopments(developments, NOW)
  };
}

/** Pending claims remain visible, including one pending claim for a kind with a settled standing. */
function pendingClaims(claims: readonly Claim[]): readonly Claim[] {
  return claims.filter(
    (claim) => claim.truthState === "pencil" || claim.truthState === "disputed"
  );
}

/**
 * Projects a DeskCard for a surface. This is a presentation read boundary,
 * not authorization and not a temporal resolver.
 */
export function projectObject(
  card: DeskCard,
  snapshot?: ResolvedObjectSnapshot
): ProjectedObject {
  if (snapshot && snapshot.card.objectId !== card.objectId) {
    throw new Error(
      `Cannot project a snapshot for ${snapshot.card.objectId} onto ${card.objectId}: object identity mismatch`
    );
  }

  // When supplied, the snapshot owns semantic read values. Placement is kept
  // from the caller because story time must not move a composition card.
  const projectedCard = snapshot
    ? {
        ...snapshot.card,
        // Placement belongs to the caller's composition, not story time. A
        // historical read changes semantic state without moving the card.
        cardId: card.cardId,
        layout: card.layout,
        z: card.z,
        cardVersion: card.cardVersion
      }
    : card;
  const context = snapshot?.context ?? NOW;
  const claims = projectedCard.claims;
  const links = projectedCard.links;
  const developments =
    snapshot?.developments ?? claims.filter(isDevelopmentClaim).map(claim => claimDevelopment(claim, links));
  const visible = visibleDevelopments(developments, context);
  const settledClaims = snapshot
    ? claims.filter((claim) => claim.truthState === "ink")
    : currentSettledClaims(claims);

  return {
    card: projectedCard,
    context,
    settledClaims,
    pendingClaims: pendingClaims(claims),
    settledLinks: links.filter((link) => link.truthState === "ink"),
    pendingLinks: links.filter(
      (link) => link.truthState === "pencil" || link.truthState === "disputed"
    ),
    ...visible
  };
}


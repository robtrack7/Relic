import { asClaimId, type CompositionId, type DeskCard, type Layout, type ObjectRef, type Provenance, type StoryPosition, type WorldId, type WorldObjectId } from "./model";
import type { ProjectionContext } from "./object-projection";
import type { EntityDocument, EntitySnapshot, RichDocument } from "./entity-document";

/** One reviewable intent. Execution always uses the existing validated domain operations. */
export type ObjectProposal = Readonly<{
  id: string;
  objectId: WorldObjectId;
  scope: Readonly<{ worldId: WorldId; compositionId: CompositionId }>;
  context: ProjectionContext;
  observed: Readonly<{ body: number; representation: number | null; placement: number; claims: Readonly<Record<string, number>> }>;
  provenance: Provenance;
  reason: string;
  change:
    | Readonly<{ kind: "body"; value: string }>
    | Readonly<{ kind: "create"; value: string }>
    | Readonly<{ kind: "placement"; value: string; layout: Layout }>
    | Readonly<{ kind: "field"; key: string; value: string }>
    | Readonly<{ kind: "claim"; key: string; value: string; target?: ObjectRef; story?: StoryPosition }>;
}>;

/** Temporary preview of the same identity. This never persists or establishes a fact. */
export function previewObjectProposal(card: DeskCard, proposal: ObjectProposal): DeskCard {
  if (card.objectId !== proposal.objectId) throw new Error("This proposal belongs to a different object.");
  const change = proposal.change;
  if (change.kind === "create") return { ...card, body: change.value, maturity: "pencil", settled: null, claims: card.claims.map(claim => ({ ...claim, truthState: "pencil", settled: null, provenance: proposal.provenance })), links: card.links.map(link => ({ ...link, truthState: "pencil" })) };
  if (change.kind === "placement") return { ...card, layout: change.layout };
  if (change.kind === "body") return { ...card, body: change.value };
  if (change.kind === "field") {
    if (!card.representation) return card;
    return { ...card, representation: { ...card.representation, fields: { ...card.representation.fields, [change.key]: change.value } } };
  }
  const claimId = asClaimId(proposal.id);
  return { ...card, claims: [...card.claims, {
    id: claimId, subjectId: card.objectId, claimKind: change.key, value: change.value,
    objectValue: change.target?.objectId ?? null, truthState: "pencil", provenance: proposal.provenance,
    settled: null, story: change.story ?? { order: null, precision: "unknown", label: null }, version: 1
  }], links: change.target ? [...card.links, { claimId, claimKind: change.key, direction: "out", other: change.target, truthState: "pencil" }] : card.links };
}

/**
 * Runtime integration port, deliberately not a second write path. The application
 * executor must validate scope, authority, observed versions and Story Position,
 * preserve the supplied origin, then use the same semantic operations as manual
 * editing. A preview cannot confer settlement or database authority.
 */
export type ObjectProposalExecutor = (proposal: ObjectProposal) => Promise<Readonly<{ cards: readonly DeskCard[] }> | null>;
export type ObjectProposalReviewAction = (proposal: ObjectProposal) => Promise<boolean>;

/** Rich authorship uses the same scoped proposal envelope and document write seam. */
export type EntityBlockProposal = Omit<ObjectProposal, "change"> & Readonly<{
  change: Readonly<{ kind: "block"; blockId: string; observedDocumentVersion: number; content: RichDocument }>;
}>;

/** Preview only. The caller still submits through the validated document operation. */
export function previewEntityBlockProposal(entity: EntitySnapshot, proposal: EntityBlockProposal): EntityDocument | null {
  if (entity.objectId !== proposal.objectId || entity.worldId !== proposal.scope.worldId || proposal.context.kind !== "now" || entity.document.version !== proposal.change.observedDocumentVersion) return null;
  const block = entity.document.blocks.find(item => item.id === proposal.change.blockId);
  if (!block || block.kind !== "text") return null;
  return { ...entity.document, blocks: entity.document.blocks.map(item => item.id === block.id ? { ...block, content: proposal.change.content } : item) };
}

export type CanvasObjectProposal = Readonly<{ card: DeskCard; proposal: ObjectProposal }>;

export function observeObject(card: DeskCard): ObjectProposal["observed"] {
  return { body: card.bodyVersion, representation: card.representation?.version ?? null, placement: card.cardVersion, claims: Object.fromEntries(card.claims.map(claim => [claim.id, claim.version])) };
}

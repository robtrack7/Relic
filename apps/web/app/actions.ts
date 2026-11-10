"use server";

import { revalidatePath } from "next/cache";

import {
  asBeatId,
  asCardId,
  asClaimId,
  asCompositionId,
  asRepresentationId,
  asRelationshipId,
  asSessionId,
  asWorldId,
  asWorldObjectId,
  type Beat,
  type BeatId,
  type CardId,
  type CardTint,
  type Claim,
  type ClaimId,
  type CompositionSummary,
  type DeskCard,
  type DeskView,
  type FieldValues,
  type KindFilter,
  type Maturity,
  type Prep,
  type Representation,
  type RepresentationKind,
  type Session,
  type StoryPosition,
  type TruthState,
  type WorldEntry,
  type WorldObjectId
} from "@/lib/world/model";
import type { Settled, WriteResult } from "@/lib/world/repository";
import { deskRepository } from "@/lib/world/store";
import { REPRESENTATION_KINDS } from "@/lib/world/templates";
import type { CollectionCommand } from "@/lib/desk/collections";
import type { SpatialState } from "@/lib/world/model";

/**
 * The server-action boundary.
 *
 * The browser sends opaque identifiers, coordinates, and text. It never sends
 * authority: no versions it invented, no lifecycle, no truth state. Everything
 * that decides whether a write is allowed is re-resolved here or below.
 */

const MAX_BODY = 20_000;
const MAX_BATCH = 500;
const COORDINATE_LIMIT = 1e7;

class InvalidInput extends Error {}

function id(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length < 8 || value.length > 64) {
    throw new InvalidInput(`${field} is not a valid identifier`);
  }
  if (!/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new InvalidInput(`${field} is not a valid identifier`);
  }
  return value;
}

function coordinate(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new InvalidInput(`${field} must be a finite number`);
  }
  return Math.max(-COORDINATE_LIMIT, Math.min(COORDINATE_LIMIT, value));
}

function extent(value: unknown, field: string): number {
  const n = coordinate(value, field);
  if (n <= 0) throw new InvalidInput(`${field} must be positive`);
  return Math.min(n, 20_000);
}

function cardTint(value: unknown, field = "tint"): CardTint | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string" || !["paper", "sand", "sage", "slate", "rose"].includes(value)) {
    throw new InvalidInput(`${field} is not a supported paper tint`);
  }
  return value as CardTint;
}

function version(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    throw new InvalidInput(`${field} must be a positive integer`);
  }
  return value;
}

function body(value: unknown): string {
  if (typeof value !== "string") throw new InvalidInput("body must be text");
  return value.slice(0, MAX_BODY);
}

function label(value: unknown, fallback: string): string {
  if (typeof value !== "string") throw new InvalidInput("name must be text");
  const trimmed = value.trim().replace(/\s+/g, " ").slice(0, 120);
  return trimmed === "" ? fallback : trimmed;
}

/** A name that has not been given yet is null, not an empty string. */
function optionalLabel(value: unknown): string | null {
  if (typeof value !== "string") throw new InvalidInput("name must be text");
  const trimmed = value.trim().replace(/\s+/g, " ").slice(0, 200);
  return trimmed === "" ? null : trimmed;
}

function initialRepresentation(value: unknown): {
  representationId: ReturnType<typeof asRepresentationId>;
  kind: RepresentationKind;
  label: string | null;
} | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new InvalidInput("initial representation must be an object");
  }
  const candidate = value as Record<string, unknown>;
  return {
    representationId: asRepresentationId(id(candidate.representationId, "representationId")),
    kind: representationKind(candidate.kind),
    label: optionalLabel(candidate.label ?? "")
  };
}

function representationKind(value: unknown): RepresentationKind {
  if (typeof value !== "string" || !REPRESENTATION_KINDS.includes(value as RepresentationKind)) {
    throw new InvalidInput("that is not a kind of thing Relic knows about");
  }
  return value as RepresentationKind;
}

function claimKind(value: unknown): string {
  if (typeof value !== "string") throw new InvalidInput("claim kind must be text");
  const trimmed = value.trim().slice(0, 120);
  if (trimmed === "") throw new InvalidInput("a claim needs something to be about");
  return trimmed;
}

function claimValue(value: unknown): string {
  if (typeof value !== "string") throw new InvalidInput("a claim must be text");
  const trimmed = value.trim().slice(0, 4000);
  if (trimmed === "") throw new InvalidInput("a claim needs a value");
  return trimmed;
}

function storyPosition(value: unknown): StoryPosition | undefined {
  if (value === undefined) return undefined;
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new InvalidInput("story position must be an object");
  const position = value as Record<string, unknown>;
  const precisions = ["exact", "day", "month", "year", "relative", "unknown"] as const;
  if (position.order !== null && (typeof position.order !== "number" || !Number.isFinite(position.order))) throw new InvalidInput("story order must be a finite number or unknown");
  if (!precisions.includes(position.precision as StoryPosition["precision"])) throw new InvalidInput("story precision is not recognized");
  if (position.label !== null && typeof position.label !== "string") throw new InvalidInput("story label must be text or unknown");
  return { order: position.order as number | null, precision: position.precision as StoryPosition["precision"], label: typeof position.label === "string" ? position.label.trim().slice(0, 200) || null : null };
}

/**
 * The mechanical sheet, sanitised.
 *
 * Only strings and finite numbers, only sane key shapes, and a hard cap on
 * size — the browser is handing over a free-form object, and it reaches a jsonb
 * column.
 */
function fieldValues(value: unknown): FieldValues {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new InvalidInput("fields must be an object");
  }
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length > 120) throw new InvalidInput("too many fields");

  const out: Record<string, string | number> = {};
  for (const [key, raw] of entries) {
    if (!/^[A-Za-z0-9_-]{1,60}$/.test(key)) {
      throw new InvalidInput(`${key} is not a valid field`);
    }
    if (typeof raw === "number") {
      if (!Number.isFinite(raw)) throw new InvalidInput(`${key} must be a finite number`);
      out[key] = raw;
    } else if (typeof raw === "string") {
      const trimmed = raw.slice(0, 2_000);
      // An empty field is unset, not the empty string. Keeps the sheet honest
      // about the difference between "zero" and "nobody has said".
      if (trimmed.trim() !== "") out[key] = trimmed;
    } else if (raw !== null && raw !== undefined) {
      throw new InvalidInput(`${key} must be text or a number`);
    }
  }
  return out;
}

export type ActionResult<T> =
  | { state: "ok"; data: T }
  | { state: "missing" }
  | { state: "conflict"; current: readonly DeskCard[] }
  /** Well formed, everything exists, and Relic declined. A rule, not an error. */
  | { state: "refused"; reason: string }
  | { state: "invalid"; message: string }
  | { state: "failed"; message: string };

async function run<T>(work: () => Promise<WriteResult<T>>): Promise<ActionResult<T>> {
  try {
    const result = await work();
    switch (result.state) {
      case "ok":
        return { state: "ok", data: result.data };
      case "conflict":
        return { state: "conflict", current: result.current };
      case "refused":
        return { state: "refused", reason: result.reason };
      case "missing":
        return { state: "missing" };
    }
  } catch (error) {
    if (error instanceof InvalidInput) {
      return { state: "invalid", message: error.message };
    }
    console.error("[relic] desk write failed", error);
    return { state: "failed", message: "The Desk could not be saved." };
  }
}

export async function changeCollectionAction(raw: { compositionId: string; observedVersion: number; command: CollectionCommand }): Promise<ActionResult<SpatialState>> {
  return run(async () => {
    const compositionId = asCompositionId(id(raw.compositionId, "compositionId"));
    const observedVersion = version(raw.observedVersion, "collection version");
    const candidate = raw.command;
    if (!candidate || typeof candidate !== "object" || !["create", "transfer", "collapse", "rename", "reorder", "dissolve"].includes(candidate.kind)) throw new InvalidInput("Unknown collection operation");
    const collectionId = candidate.kind === "transfer" && candidate.id === null ? null : id(candidate.id, "collectionId");
    const cardIds = "cardIds" in candidate ? candidate.cardIds : undefined;
    if (cardIds && (!Array.isArray(cardIds) || cardIds.length > MAX_BATCH)) throw new InvalidInput("Too many collection members");
    const members = cardIds?.map(value => asCardId(id(value, "cardId")));
    let command: CollectionCommand;
    switch (candidate.kind) {
      case "create":
        if (typeof candidate.collapsed !== "boolean" || !members) throw new InvalidInput("A collection needs its members and view");
        command = { kind: "create", id: collectionId!, title: label(candidate.title, "Untitled collection"), cardIds: members, collapsed: candidate.collapsed }; break;
      case "transfer":
        if (!members) throw new InvalidInput("Choose collection members");
        command = { kind: "transfer", id: collectionId, cardIds: members }; break;
      case "reorder":
        if (!members) throw new InvalidInput("Choose collection order");
        command = { kind: "reorder", id: collectionId!, cardIds: members }; break;
      case "collapse":
        if (typeof candidate.collapsed !== "boolean") throw new InvalidInput("Choose a collection view");
        command = { kind: "collapse", id: collectionId!, collapsed: candidate.collapsed }; break;
      case "rename": command = { kind: "rename", id: collectionId!, title: label(candidate.title, "Untitled collection") }; break;
      case "dissolve": command = { kind: "dissolve", id: collectionId! }; break;
    }
    return deskRepository().changeCollection({ compositionId, observedVersion, command });
  });
}

export async function replaceSpatialAction(raw: { compositionId: string; observedVersion: number; spatial: SpatialState }): Promise<ActionResult<SpatialState>> {
  return run(() => {
    if (!raw.spatial || typeof raw.spatial !== "object" || !Array.isArray(raw.spatial.collections) || raw.spatial.collections.length > 100) throw new InvalidInput("Invalid Board arrangement");
    const collections = raw.spatial.collections.map(collection => {
      if (!collection || typeof collection.id !== "string" || typeof collection.title !== "string" || !Array.isArray(collection.cardIds) || typeof collection.collapsed !== "boolean") throw new InvalidInput("Invalid collection arrangement");
      if (collection.anchor && (!Number.isFinite(collection.anchor.x) || !Number.isFinite(collection.anchor.y))) throw new InvalidInput("Invalid collection anchor");
      return { id: id(collection.id, "collectionId"), title: label(collection.title, "Untitled collection"), cardIds: collection.cardIds.map((cardId: unknown) => asCardId(id(cardId, "cardId"))), collapsed: collection.collapsed, ...(collection.anchor ? { anchor: { x: coordinate(collection.anchor.x, "anchor x"), y: coordinate(collection.anchor.y, "anchor y") } } : {}) };
    });
    return deskRepository().replaceSpatial({ compositionId: asCompositionId(id(raw.compositionId, "compositionId")), observedVersion: version(raw.observedVersion, "collection version"), spatial: { version: version(raw.spatial.version, "collection version"), collections } });
  });
}

/** Restores Board geometry and grouping as one version-checked transaction. */
export async function restoreCompositionAction(raw: {
  compositionId: string; observedSpatialVersion: number; spatial: SpatialState;
  moves: readonly { cardId: string; x: number; y: number; width?: number; height?: number; tint?: string | null; z?: number; observedCardVersion: number }[];
}): Promise<ActionResult<{ cards: readonly DeskCard[]; spatial: SpatialState }>> {
  return run(() => {
    if (!Array.isArray(raw.moves) || raw.moves.length > MAX_BATCH || !raw.spatial || !Array.isArray(raw.spatial.collections) || raw.spatial.collections.length > 100) throw new InvalidInput("Invalid Board arrangement");
    const collections = raw.spatial.collections.map(group => {
      if (!group || typeof group.collapsed !== "boolean" || !Array.isArray(group.cardIds) || group.cardIds.length > MAX_BATCH) throw new InvalidInput("Invalid collection arrangement");
      return { id: id(group.id, "collectionId"), title: label(group.title, "Untitled collection"), collapsed: group.collapsed,
        cardIds: group.cardIds.map((value: unknown) => asCardId(id(value, "cardId"))),
        ...(group.anchor ? { anchor: { x: coordinate(group.anchor.x, "anchor x"), y: coordinate(group.anchor.y, "anchor y") } } : {}) };
    });
    const moves = raw.moves.map(move => ({ cardId: asCardId(id(move.cardId, "cardId")), x: coordinate(move.x, "x"), y: coordinate(move.y, "y"),
      ...(move.width !== undefined ? { width: extent(move.width, "width") } : {}), ...(move.height !== undefined ? { height: extent(move.height, "height") } : {}),
      ...(move.tint !== undefined ? { tint: cardTint(move.tint) } : {}),
      ...(move.z !== undefined ? { z: coordinate(move.z, "z") } : {}), observedCardVersion: version(move.observedCardVersion, "card version") }));
    return deskRepository().moveCollectionCards({ compositionId: asCompositionId(id(raw.compositionId, "compositionId")), moves, bringToFront: false,
      command: null, observedSpatialVersion: version(raw.observedSpatialVersion, "collection version"), spatial: { version: version(raw.spatial.version, "collection version"), collections } });
  });
}

export async function captureCardAction(raw: {
  compositionId: string;
  cardId: string;
  objectId: string;
  body: string;
  x: number;
  y: number;
  width: number;
  height: number;
  initialRepresentation?: {
    representationId: string;
    kind: string;
    label?: string;
  };
}): Promise<ActionResult<DeskCard>> {
  return run(() =>
    deskRepository().captureCard({
      compositionId: asCompositionId(id(raw.compositionId, "compositionId")),
      cardId: asCardId(id(raw.cardId, "cardId")),
      objectId: asWorldObjectId(id(raw.objectId, "objectId")),
      body: body(raw.body),
      layout: {
        x: coordinate(raw.x, "x"),
        y: coordinate(raw.y, "y"),
        width: extent(raw.width, "width"),
        height: extent(raw.height, "height")
      },
      initialRepresentation: initialRepresentation(raw.initialRepresentation),
      // Every action on this file is the GM acting through Relic's own
      // controls. The Librarian reaches the same store from `lib/librarian/`
      // and names itself there.
      author: "gm"
    })
  );
}

export async function editCardBodyAction(raw: {
  compositionId: string;
  cardId: string;
  body: string;
  observedBodyVersion: number;
}): Promise<ActionResult<DeskCard>> {
  return run(() =>
    deskRepository().editCardBody({
      compositionId: asCompositionId(id(raw.compositionId, "compositionId")),
      cardId: asCardId(id(raw.cardId, "cardId")),
      body: body(raw.body),
      observedBodyVersion: version(raw.observedBodyVersion, "observedBodyVersion"),
      author: "gm"
    })
  );
}

export async function moveCardsAction(raw: {
  compositionId: string;
  moves: readonly { cardId: string; x: number; y: number; width?: number; height?: number; tint?: string | null; observedCardVersion: number }[];
  bringToFront: boolean;
}): Promise<ActionResult<readonly DeskCard[]>> {
  return run(() => {
    if (!Array.isArray(raw.moves) || raw.moves.length > MAX_BATCH) {
      throw new InvalidInput("too many cards in one move");
    }
    if (new Set(raw.moves.map(move => move.cardId)).size !== raw.moves.length) throw new InvalidInput("A placement may appear only once in a move");
    return deskRepository().moveCards({
      compositionId: asCompositionId(id(raw.compositionId, "compositionId")),
      bringToFront: raw.bringToFront === true,
      moves: raw.moves.map((move) => ({
        cardId: asCardId(id(move.cardId, "cardId")),
        x: coordinate(move.x, "x"),
        y: coordinate(move.y, "y"),
        ...(move.width === undefined ? {} : { width: extent(move.width, "width") }),
        ...(move.height === undefined ? {} : { height: extent(move.height, "height") }),
        ...(move.tint === undefined ? {} : { tint: cardTint(move.tint) }),
        observedCardVersion: version(move.observedCardVersion, "observedCardVersion")
      }))
    });
  });
}

export async function moveCollectionCardsAction(raw: {
  compositionId: string; observedSpatialVersion: number; preserveMembership: boolean; destinationId: string | null;
  moves: readonly { cardId: string; x: number; y: number; width?: number; height?: number; tint?: string | null; observedCardVersion: number }[];
}): Promise<ActionResult<{ cards: readonly DeskCard[]; spatial: SpatialState }>> {
  return run(() => {
    if (!Array.isArray(raw.moves) || !raw.moves.length || raw.moves.length > MAX_BATCH) throw new InvalidInput("Choose cards to move");
    const moves = raw.moves.map(move => ({ cardId: asCardId(id(move.cardId, "cardId")), x: coordinate(move.x, "x"), y: coordinate(move.y, "y"), ...(move.width === undefined ? {} : { width: extent(move.width, "width") }), ...(move.height === undefined ? {} : { height: extent(move.height, "height") }), ...(move.tint === undefined ? {} : { tint: cardTint(move.tint) }), observedCardVersion: version(move.observedCardVersion, "card version") }));
    if (new Set(moves.map(move => move.cardId)).size !== moves.length) throw new InvalidInput("A placement may appear only once in a move");
    const destinationId = raw.destinationId === null ? null : id(raw.destinationId, "collectionId");
    return deskRepository().moveCollectionCards({ compositionId: asCompositionId(id(raw.compositionId, "compositionId")), observedSpatialVersion: version(raw.observedSpatialVersion, "collection version"), moves, bringToFront: true, command: raw.preserveMembership === true ? null : { kind: "transfer", id: destinationId, cardIds: moves.map(move => move.cardId) } });
  });
}

export async function removeCollectionCardsAction(raw: { compositionId: string; cardIds: readonly string[] }): Promise<ActionResult<{ removed: readonly CardId[]; spatial: SpatialState }>> {
  return run(async () => {
    if (!Array.isArray(raw.cardIds) || raw.cardIds.length > MAX_BATCH) throw new InvalidInput("Choose cards to remove");
    const repository = deskRepository();
    const compositionId = asCompositionId(id(raw.compositionId, "compositionId"));
    const result = await repository.removeCards({ compositionId, cardIds: raw.cardIds.map(value => asCardId(id(value, "cardId"))) });
    if (result.state !== "ok") return result;
    const current = await repository.openComposition(compositionId);
    if (!current) return { state: "missing" };
    return { state: "ok", data: { removed: result.data, spatial: current.spatial ?? { version: 1, collections: [] } } };
  });
}

export async function createBoardAction(raw: {
  worldId: string;
  compositionId: string;
  name: string;
}): Promise<ActionResult<CompositionSummary>> {
  return run(async () => {
    const board = await deskRepository().createBoard({
      worldId: asWorldId(id(raw.worldId, "worldId")),
      compositionId: asCompositionId(id(raw.compositionId, "compositionId")),
      name: label(raw.name, "Untitled board")
    });
    // The switcher is rendered on the server, so a new Board has to reach it.
    revalidatePath("/", "layout");
    return { state: "ok", data: board };
  });
}

export async function referenceObjectsAction(raw: {
  compositionId: string;
  placements: readonly {
    cardId: string;
    objectId: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }[];
}): Promise<ActionResult<readonly DeskCard[]>> {
  return run(async () => {
    if (!Array.isArray(raw.placements) || raw.placements.length > MAX_BATCH) {
      throw new InvalidInput("too many cards in one placement");
    }
    const result = await deskRepository().referenceObjects({
      compositionId: asCompositionId(id(raw.compositionId, "compositionId")),
      placements: raw.placements.map((placement) => ({
        cardId: asCardId(id(placement.cardId, "cardId")),
        objectId: asWorldObjectId(id(placement.objectId, "objectId")),
        layout: {
          x: coordinate(placement.x, "x"),
          y: coordinate(placement.y, "y"),
          width: extent(placement.width, "width"),
          height: extent(placement.height, "height")
        }
      }))
    });
    revalidatePath("/", "layout");
    return result;
  });
}

export async function removeCardsAction(raw: {
  compositionId: string;
  cardIds: readonly string[];
}): Promise<ActionResult<readonly CardId[]>> {
  return run(() => {
    if (!Array.isArray(raw.cardIds) || raw.cardIds.length > MAX_BATCH) {
      throw new InvalidInput("too many cards in one removal");
    }
    return deskRepository().removeCards({
      compositionId: asCompositionId(id(raw.compositionId, "compositionId")),
      cardIds: raw.cardIds.map((value) => asCardId(id(value, "cardId")))
    });
  });
}

// Sessions and Prep ----------------------------------------------------------

/**
 * Starts a session and the composition it is prepared on.
 *
 * The browser proposes two ids and a title. It does not propose state — a
 * session begins `planned` because it has not been played, and which evening is
 * under way is not a form field.
 */
export async function createSessionAction(raw: {
  worldId: string;
  sessionId: string;
  compositionId: string;
  title: string;
}): Promise<ActionResult<Prep>> {
  return run(async () => {
    const result = await deskRepository().createSession({
      worldId: asWorldId(id(raw.worldId, "worldId")),
      sessionId: asSessionId(id(raw.sessionId, "sessionId")),
      compositionId: asCompositionId(id(raw.compositionId, "compositionId")),
      title: label(raw.title, "Untitled session")
    });
    // The switcher and the sessions list are rendered on the server.
    revalidatePath("/", "layout");
    return result;
  });
}

export async function editSessionAction(raw: {
  sessionId: string;
  title: string;
  intent: string;
  observedVersion: number;
}): Promise<ActionResult<Session>> {
  return run(async () => {
    const result = await deskRepository().editSession({
      sessionId: asSessionId(id(raw.sessionId, "sessionId")),
      title: label(raw.title, "Untitled session"),
      // What tonight is for is prose, not a name: it keeps its punctuation and
      // its shape, and saying nothing is a real answer.
      intent: intent(raw.intent),
      observedVersion: version(raw.observedVersion, "observedVersion")
    });
    revalidatePath("/", "layout");
    return result;
  });
}

/** One line of intention, or nothing. Never the empty string. */
function intent(value: unknown): string | null {
  if (typeof value !== "string") throw new InvalidInput("an intent must be text");
  const trimmed = value.trim().slice(0, 500);
  return trimmed === "" ? null : trimmed;
}

function beatBody(value: unknown): string {
  if (typeof value !== "string") throw new InvalidInput("a beat must be text");
  const trimmed = value.trim().slice(0, 2_000);
  if (trimmed === "") throw new InvalidInput("a beat needs something to say");
  return trimmed;
}

const MAX_BEAT_REFS = 24;

function beatRefs(value: unknown): readonly WorldObjectId[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > MAX_BEAT_REFS) {
    throw new InvalidInput("too many things attached to one beat");
  }
  return value.map((objectId) => asWorldObjectId(id(objectId, "objectId")));
}

export async function setBeatAction(raw: {
  sessionId: string;
  beatId: string;
  body: string;
  refs?: readonly string[];
}): Promise<ActionResult<Beat>> {
  return run(() =>
    deskRepository().setBeat({
      sessionId: asSessionId(id(raw.sessionId, "sessionId")),
      beatId: asBeatId(id(raw.beatId, "beatId")),
      body: beatBody(raw.body),
      refs: beatRefs(raw.refs),
      author: "gm"
    })
  );
}

export async function removeBeatAction(raw: {
  beatId: string;
}): Promise<ActionResult<BeatId>> {
  return run(() =>
    deskRepository().removeBeat({
      beatId: asBeatId(id(raw.beatId, "beatId"))
    })
  );
}

export async function reorderBeatsAction(raw: {
  sessionId: string;
  beatIds: readonly string[];
}): Promise<ActionResult<readonly Beat[]>> {
  return run(() => {
    if (!Array.isArray(raw.beatIds) || raw.beatIds.length > MAX_BATCH) {
      throw new InvalidInput("too many beats in one reordering");
    }
    return deskRepository().reorderBeats({
      sessionId: asSessionId(id(raw.sessionId, "sessionId")),
      beatIds: raw.beatIds.map((beatId) => asBeatId(id(beatId, "beatId")))
    });
  });
}

// Representations and claims -------------------------------------------------

/**
 * The browser proposes a kind and a name. It does not propose truth, version,
 * or provenance — those are decided below this line, as everything that grants
 * authority must be.
 */
export async function representObjectAction(raw: {
  objectId: string;
  representationId: string;
  kind: string;
  label: string;
}): Promise<ActionResult<Representation>> {
  return run(() =>
    deskRepository().representObject({
      objectId: asWorldObjectId(id(raw.objectId, "objectId")),
      representationId: asRepresentationId(id(raw.representationId, "representationId")),
      kind: representationKind(raw.kind),
      label: optionalLabel(raw.label)
    })
  );
}

export async function editRepresentationAction(raw: {
  representationId: string;
  label: string;
  fields: Record<string, unknown>;
  observedVersion: number;
}): Promise<ActionResult<Representation>> {
  return run(() =>
    deskRepository().editRepresentation({
      representationId: asRepresentationId(id(raw.representationId, "representationId")),
      label: optionalLabel(raw.label),
      fields: fieldValues(raw.fields),
      observedVersion: version(raw.observedVersion, "observedVersion")
    })
  );
}

export async function setClaimAction(raw: {
  subjectId: string;
  claimId: string;
  claimKind: string;
  value: string;
  /** Present makes this a relationship: the value is another World Object. */
  objectValue?: string | null;
  story?: StoryPosition;
  expectedClaim?: { claimId: string; version: number; relationshipId?: string | null };
  boardProjection?: { compositionId: string; cardId: string; observedCardVersion: number };
}): Promise<ActionResult<Claim>> {
  return run(() => {
    const subjectId = asWorldObjectId(id(raw.subjectId, "subjectId"));
    const objectValue =
      raw.objectValue === undefined || raw.objectValue === null
        ? null
        : asWorldObjectId(id(raw.objectValue, "objectValue"));

    // Nothing is its own allegiance. The database refuses this too; refusing it
    // here means the GM is told rather than shown a failed write.
    if (objectValue !== null && objectValue === subjectId) {
      throw new InvalidInput("a thing cannot be related to itself");
    }

    const expected = raw.expectedClaim;
    if (expected !== undefined && (!expected || typeof expected !== "object" || Array.isArray(expected))) throw new InvalidInput("observed assertion must be an object");
    return deskRepository().setClaim({
      subjectId,
      claimId: asClaimId(id(raw.claimId, "claimId")),
      claimKind: claimKind(raw.claimKind),
      value: claimValue(raw.value),
      objectValue,
      story: storyPosition(raw.story),
      ...(expected ? { expectedClaim: { claimId: asClaimId(id(expected.claimId, "observed claimId")), version: version(expected.version, "observed claim version"), relationshipId: expected.relationshipId ? asRelationshipId(id(expected.relationshipId, "observed relationshipId")) : null } } : {}),
      ...(raw.boardProjection ? { boardProjection: { compositionId: asCompositionId(id(raw.boardProjection.compositionId, "compositionId")), cardId: asCardId(id(raw.boardProjection.cardId, "cardId")), observedCardVersion: version(raw.boardProjection.observedCardVersion, "observedCardVersion") } } : {}),
      author: "gm"
    });
  });
}

export async function setRelationshipVisibilityAction(raw: { compositionId: string; cardId: string; relationshipId: string; visible: boolean; observedCardVersion: number }): Promise<ActionResult<DeskCard>> {
  return run(() => {
    if (typeof raw.visible !== "boolean") throw new InvalidInput("Visibility must be a deliberate choice.");
    return deskRepository().setRelationshipVisibility({ compositionId: asCompositionId(id(raw.compositionId, "compositionId")), cardId: asCardId(id(raw.cardId, "cardId")), relationshipId: asRelationshipId(id(raw.relationshipId, "relationshipId")), visible: raw.visible, observedCardVersion: version(raw.observedCardVersion, "observedCardVersion") });
  });
}

function kindFilters(value: unknown): readonly KindFilter[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value) || value.length > 16) {
    throw new InvalidInput("that is not a set of kinds");
  }
  return value.map((kind) => {
    if (kind === "unclassified") return kind;
    return representationKind(kind);
  });
}

function include(value: unknown): "active" | "archived" | "all" | undefined {
  if (value === undefined || value === null) return undefined;
  if (value !== "active" && value !== "archived" && value !== "all") {
    throw new InvalidInput("that is not a scope Relic knows about");
  }
  return value;
}

/**
 * The world's index — for the Library, for global search, and for the
 * relationship picker, which are the same question with different filters.
 *
 * A read rather than a write, so it does not go through `run` — but the world
 * is still re-resolved from an opaque id here, and the query is treated as
 * text, never as a fragment of anything.
 */
export async function inspectObjectAction(raw: { worldId: string; objectId: string }): Promise<ActionResult<DeskView>> {
  try {
    const view = await deskRepository().inspectObject(
      asWorldId(id(raw.worldId, "worldId")), asWorldObjectId(id(raw.objectId, "objectId")));
    return view ? { state: "ok", data: view } : { state: "failed", message: "This object is unavailable. Archived material must be restored before editing." };
  } catch {
    return { state: "failed", message: "This object could not load. Your Library position is unchanged; try again." };
  }
}

export async function readCompositionObjectsAction(raw: { worldId: string; compositionId: string }): Promise<ActionResult<readonly DeskCard[]>> {
  try {
    const worldId = asWorldId(id(raw.worldId, "worldId"));
    const view = await deskRepository().openComposition(asCompositionId(id(raw.compositionId, "compositionId")));
    return view?.worldId === worldId ? { state: "ok", data: view.cards } : { state: "failed", message: "This workspace could not be refreshed." };
  } catch { return { state: "failed", message: "This workspace could not be refreshed. Try again." }; }
}

export async function searchWorldAction(raw: {
  worldId: string;
  query: string;
  kinds?: readonly string[];
  maturity?: string | null;
  include?: string;
  excludeId?: string;
  compositionId?: string;
  limit?: number;
  offset?: number;
}): Promise<ActionResult<readonly WorldEntry[]>> {
  try {
    const results = await deskRepository().searchWorld({
      worldId: asWorldId(id(raw.worldId, "worldId")),
      query: typeof raw.query === "string" ? raw.query.slice(0, 200) : "",
      kinds: kindFilters(raw.kinds),
      maturity: maturity(raw.maturity),
      include: include(raw.include),
      excludeId: raw.excludeId
        ? asWorldObjectId(id(raw.excludeId, "excludeId"))
        : undefined,
      compositionId: raw.compositionId
        ? asCompositionId(id(raw.compositionId, "compositionId"))
        : undefined,
      limit: typeof raw.limit === "number" ? raw.limit : undefined,
      offset: typeof raw.offset === "number" ? raw.offset : undefined
    });
    return { state: "ok", data: results };
  } catch (error) {
    if (error instanceof InvalidInput) {
      return { state: "invalid", message: error.message };
    }
    console.error("[relic] world search failed", error);
    return { state: "failed", message: "Relic could not search this world." };
  }
}

export async function removeClaimAction(raw: {
  claimId: string;
  observedVersion?: number;
}): Promise<ActionResult<ClaimId>> {
  return run(() =>
    deskRepository().removeClaim({
      claimId: asClaimId(id(raw.claimId, "claimId")),
      ...(raw.observedVersion !== undefined ? { observedVersion: version(raw.observedVersion, "observed claim version") } : {})
    })
  );
}

// Truth ----------------------------------------------------------------------

function truthState(value: unknown): TruthState {
  if (value !== "ink" && value !== "pencil" && value !== "disputed") {
    throw new InvalidInput("that is not a truth state");
  }
  return value;
}

function maturity(value: unknown): Maturity | null {
  if (value === null || value === undefined) return null;
  if (value !== "ink" && value !== "pencil") {
    throw new InvalidInput("that is not a maturity");
  }
  return value;
}

/**
 * Settles truth. The one action that can establish Ink.
 *
 * The browser says *what* to settle and to what. It does not say **who** — the
 * author is supplied here, and today it is always the GM because the GM is the
 * only actor at a keyboard. That is the point of the parameter existing at all:
 * when the Librarian gains the ability to call into the world at step 13, it
 * will pass `librarian` from the server and be refused by the store. Letting
 * the browser name the author would make the whole invariant a form field.
 */
export async function settleTruthAction(raw: {
  objectId: string;
  maturity?: string | null;
  claims?: readonly { claimId: string; truth: string; observedVersion: number }[];
}): Promise<ActionResult<Settled>> {
  return run(() => {
    const claims = raw.claims ?? [];
    if (!Array.isArray(claims) || claims.length > MAX_BATCH) {
      throw new InvalidInput("too many assertions in one settlement");
    }

    return deskRepository().settleTruth({
      objectId: asWorldObjectId(id(raw.objectId, "objectId")),
      maturity: maturity(raw.maturity),
      claims: claims.map((claim) => ({
        claimId: asClaimId(id(claim.claimId, "claimId")),
        truth: truthState(claim.truth),
        observedVersion: version(claim.observedVersion, "observedVersion")
      })),
      author: "gm"
    });
  });
}

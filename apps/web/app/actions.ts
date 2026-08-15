"use server";

import { revalidatePath } from "next/cache";

import {
  asCardId,
  asClaimId,
  asCompositionId,
  asRepresentationId,
  asWorldId,
  asWorldObjectId,
  type CardId,
  type Claim,
  type ClaimId,
  type CompositionSummary,
  type DeskCard,
  type FieldValues,
  type ObjectRef,
  type Representation,
  type RepresentationKind
} from "@/lib/world/model";
import type { WriteResult } from "@/lib/world/repository";
import { deskRepository } from "@/lib/world/store";
import { REPRESENTATION_KINDS } from "@/lib/world/templates";

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
  | { state: "invalid"; message: string }
  | { state: "failed"; message: string };

async function run<T>(work: () => Promise<WriteResult<T>>): Promise<ActionResult<T>> {
  try {
    const result = await work();
    return result.state === "ok"
      ? { state: "ok", data: result.data }
      : result.state === "conflict"
        ? { state: "conflict", current: result.current }
        : { state: "missing" };
  } catch (error) {
    if (error instanceof InvalidInput) {
      return { state: "invalid", message: error.message };
    }
    console.error("[relic] desk write failed", error);
    return { state: "failed", message: "The Desk could not be saved." };
  }
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
}): Promise<ActionResult<DeskCard>> {
  return run(async () => {
    const card = await deskRepository().captureCard({
      compositionId: asCompositionId(id(raw.compositionId, "compositionId")),
      cardId: asCardId(id(raw.cardId, "cardId")),
      objectId: asWorldObjectId(id(raw.objectId, "objectId")),
      body: body(raw.body),
      layout: {
        x: coordinate(raw.x, "x"),
        y: coordinate(raw.y, "y"),
        width: extent(raw.width, "width"),
        height: extent(raw.height, "height")
      }
    });
    return { state: "ok", data: card };
  });
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
      observedBodyVersion: version(raw.observedBodyVersion, "observedBodyVersion")
    })
  );
}

export async function moveCardsAction(raw: {
  compositionId: string;
  moves: readonly { cardId: string; x: number; y: number; observedCardVersion: number }[];
  bringToFront: boolean;
}): Promise<ActionResult<readonly DeskCard[]>> {
  return run(() => {
    if (!Array.isArray(raw.moves) || raw.moves.length > MAX_BATCH) {
      throw new InvalidInput("too many cards in one move");
    }
    return deskRepository().moveCards({
      compositionId: asCompositionId(id(raw.compositionId, "compositionId")),
      bringToFront: raw.bringToFront === true,
      moves: raw.moves.map((move) => ({
        cardId: asCardId(id(move.cardId, "cardId")),
        x: coordinate(move.x, "x"),
        y: coordinate(move.y, "y"),
        observedCardVersion: version(move.observedCardVersion, "observedCardVersion")
      }))
    });
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

    return deskRepository().setClaim({
      subjectId,
      claimId: asClaimId(id(raw.claimId, "claimId")),
      claimKind: claimKind(raw.claimKind),
      value: claimValue(raw.value),
      objectValue
    });
  });
}

/**
 * Objects that could stand at the other end of a relationship.
 *
 * A read rather than a write, so it does not go through `run` — but the world
 * is still re-resolved from an opaque id here, and the query is treated as
 * text, never as a fragment of anything.
 */
export async function searchObjectsAction(raw: {
  worldId: string;
  query: string;
  excludeId?: string;
  limit?: number;
}): Promise<ActionResult<readonly ObjectRef[]>> {
  try {
    const results = await deskRepository().searchObjects({
      worldId: asWorldId(id(raw.worldId, "worldId")),
      query: typeof raw.query === "string" ? raw.query.slice(0, 200) : "",
      excludeId: raw.excludeId
        ? asWorldObjectId(id(raw.excludeId, "excludeId"))
        : undefined,
      limit: typeof raw.limit === "number" ? raw.limit : undefined
    });
    return { state: "ok", data: results };
  } catch (error) {
    if (error instanceof InvalidInput) {
      return { state: "invalid", message: error.message };
    }
    console.error("[relic] object search failed", error);
    return { state: "failed", message: "Relic could not search this world." };
  }
}

export async function removeClaimAction(raw: {
  claimId: string;
}): Promise<ActionResult<ClaimId>> {
  return run(() =>
    deskRepository().removeClaim({
      claimId: asClaimId(id(raw.claimId, "claimId"))
    })
  );
}

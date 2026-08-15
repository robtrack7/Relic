"use server";

import { revalidatePath } from "next/cache";

import {
  asCardId,
  asCompositionId,
  asWorldId,
  asWorldObjectId,
  type CardId,
  type CompositionSummary,
  type DeskCard
} from "@/lib/world/model";
import type { WriteResult } from "@/lib/world/repository";
import { deskRepository } from "@/lib/world/store";

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

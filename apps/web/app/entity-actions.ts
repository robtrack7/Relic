"use server";

import { asWorldId, asWorldObjectId, type FieldValues, type RepresentationKind } from "@/lib/world/model";
import type { EntityDocument, EntitySnapshot, MechanicsProfile, RichNode } from "@/lib/world/entity-document";
import { validEntityDocument, validMechanicsProfile } from "@/lib/world/entity-document";
import { deskRepository } from "@/lib/world/store";
import type { ActionResult } from "./actions";

class InvalidInput extends Error {}
const KINDS: readonly RepresentationKind[] = ["character", "place", "faction", "artifact", "event", "thread", "source", "note"];

function id(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length < 8 || value.length > 64 || !/^[A-Za-z0-9_-]+$/.test(value)) throw new InvalidInput(`${field} is not a valid identifier`);
  return value;
}
function world(value: unknown) { return asWorldId(id(value, "worldId")); }
function object(value: unknown) { return asWorldObjectId(id(value, "objectId")); }
function observed(value: unknown, allowZero = false): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < (allowZero ? 0 : 1)) throw new InvalidInput("version is not valid");
  return value;
}
function optionalLabel(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") throw new InvalidInput("label must be text");
  const result = value.trim().replace(/\s+/g, " ").slice(0, 200);
  return result || null;
}
function kind(value: unknown): RepresentationKind | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string" || !KINDS.includes(value as RepresentationKind)) throw new InvalidInput("that is not a supported entity kind");
  return value as RepresentationKind;
}
function fields(value: unknown): FieldValues {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new InvalidInput("fields must be an object");
  const result: Record<string, string | number> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!/^[A-Za-z0-9_-]{1,60}$/.test(key) || (typeof raw !== "string" && typeof raw !== "number") || (typeof raw === "number" && !Number.isFinite(raw))) throw new InvalidInput("fields contain an unsupported value");
    result[key] = typeof raw === "string" ? raw.slice(0, 2000) : raw;
  }
  if (Object.keys(result).length > 120) throw new InvalidInput("too many fields");
  return result;
}
function references(value: EntityDocument): string[] {
  const ids: string[] = [];
  const visit = (node: RichNode) => {
    if (node.type === "entityReference" && typeof node.attrs?.objectId === "string") ids.push(node.attrs.objectId);
    node.content?.forEach(visit);
    node.marks?.forEach(mark => { if (mark.attrs) { /* marks carry no entity identity */ } });
  };
  value.blocks.forEach(block => { if (block.kind === "text") visit(block.content); });
  return [...new Set(ids)];
}
async function sameWorldReferences(repository: ReturnType<typeof deskRepository>, worldId: ReturnType<typeof asWorldId>, document: EntityDocument) {
  for (const reference of references(document)) {
    const target = await repository.loadEntity(worldId, asWorldObjectId(id(reference, "entity reference")));
    if (!target) throw new InvalidInput("entity references must belong to this world");
  }
}
async function run<T>(work: () => Promise<import("@/lib/world/repository").WriteResult<T>>): Promise<ActionResult<T>> {
  try {
    const result = await work();
    if (result.state === "ok") return { state: "ok", data: result.data };
    if (result.state === "conflict") return { state: "conflict", current: result.current };
    if (result.state === "refused") return { state: "refused", reason: result.reason };
    return { state: "missing" };
  } catch (error) {
    if (error instanceof InvalidInput) return { state: "invalid", message: error.message };
    console.error("[relic] entity write failed", error);
    return { state: "failed", message: "The entity could not be saved. Your draft remains available for retry." };
  }
}

export async function loadEntityAction(input: { worldId: unknown; objectId: unknown }): Promise<ActionResult<EntitySnapshot>> {
  try {
    const entity = await deskRepository().loadEntity(world(input.worldId), object(input.objectId));
    return entity ? { state: "ok", data: entity } : { state: "missing" };
  } catch (error) {
    return error instanceof InvalidInput ? { state: "invalid", message: error.message } : { state: "failed", message: "This entity could not load." };
  }
}

export async function createEntityAction(input: { worldId: unknown; objectId: unknown; kind?: unknown; label?: unknown }): Promise<ActionResult<EntitySnapshot>> {
  return run(() => deskRepository().createEntity({ worldId: world(input.worldId), objectId: object(input.objectId), kind: kind(input.kind), label: optionalLabel(input.label) }));
}

export async function saveEntityDocumentAction(input: { worldId: unknown; objectId: unknown; observedVersion: unknown; document: unknown; author?: unknown }): Promise<ActionResult<EntitySnapshot>> {
  return run(async () => {
    const worldId = world(input.worldId); const objectId = object(input.objectId);
    if (!validEntityDocument(input.document)) throw new InvalidInput("document is not valid");
    await sameWorldReferences(deskRepository(), worldId, input.document);
    return deskRepository().saveEntityDocument({ worldId, objectId, observedVersion: observed(input.observedVersion, true), document: input.document, author: "gm" });
  });
}

export async function saveEntityIdentityAction(input: { worldId: unknown; objectId: unknown; observedVersion: unknown; label: unknown; fields: unknown }): Promise<ActionResult<EntitySnapshot>> {
  return run(() => deskRepository().saveEntityIdentity({ worldId: world(input.worldId), objectId: object(input.objectId), observedVersion: observed(input.observedVersion), label: optionalLabel(input.label), fields: fields(input.fields) }));
}

export async function saveEntityMechanicsAction(input: { worldId: unknown; objectId: unknown; observedVersion: unknown; profile: unknown }): Promise<ActionResult<EntitySnapshot>> {
  return run(() => {
    if (!validMechanicsProfile(input.profile)) throw new InvalidInput("mechanics profile is not valid");
    return deskRepository().saveEntityMechanics({ worldId: world(input.worldId), objectId: object(input.objectId), observedVersion: observed(input.observedVersion), profile: input.profile });
  });
}

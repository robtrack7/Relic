import type { EntityScope, EntityType } from "@/lib/types";

export const entityConfigs = {
  character: { table: "characters", label: "Character", plural: "Characters" },
  place: { table: "places", label: "Place", plural: "Places" },
  faction: { table: "factions", label: "Faction", plural: "Factions" },
  artifact: { table: "artifacts", label: "Artifact", plural: "Artifacts" },
  thread: { table: "threads", label: "Thread", plural: "Threads" },
  session: { table: "sessions", label: "Session", plural: "Sessions" },
  note: { table: "notes", label: "Note", plural: "Notes" }
} as const;

export const editableEntityTypes = ["character", "place", "faction", "artifact", "thread", "note"] as const;
export type EditableEntityType = (typeof editableEntityTypes)[number];

export function isEditableEntityType(value: string): value is EditableEntityType {
  return editableEntityTypes.includes(value as EditableEntityType);
}

export function normalizeScope(scope: FormDataEntryValue | null): EntityScope {
  return scope === "world" ? "world" : "saga";
}

export function scopedPayload(scope: EntityScope, sagaId: string) {
  return scope === "world" ? { scope, saga_id: null } : { scope, saga_id: sagaId };
}

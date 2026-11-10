import * as actions from "@/app/actions";
import * as entityActions from "@/app/entity-actions";
import { asClaimId, asWorldObjectId, type Claim, type ObjectRef } from "@/lib/world/model";
import { cloneEntityFixture } from "./entity-fixtures";
import { narrativeBody, type EntityDocument, type EntitySnapshot, type MechanicsProfile } from "@/lib/world/entity-document";

export type EntityStorySaveMode = "ok" | "failed" | "conflict";

type MockAction = { mockImplementation: (implementation: (input: Record<string, unknown>) => Promise<unknown>) => void };

const setMock = (action: unknown, implementation: (input: Record<string, unknown>) => Promise<unknown>) => {
  (action as MockAction).mockImplementation(implementation);
};

/**
 * A small in-memory adapter for Focus/Builder stories. It deliberately uses
 * the same entity actions as the application so story interactions exercise
 * loading, CAS saves, recoverable failures, and semantic history writes.
 */
export function configureEntityStoryActions(fixtures: readonly EntitySnapshot[], mode: { current: EntityStorySaveMode } = { current: "ok" }) {
  const store = new Map<string, EntitySnapshot>(fixtures.map(entity => [String(entity.objectId), cloneEntityFixture(entity)]));
  const lookup = (objectId: unknown) => store.get(String(objectId));

  setMock(entityActions.loadEntityAction, async input => {
    const entity = lookup(input.objectId);
    return entity ? { state: "ok", data: cloneEntityFixture(entity) } : { state: "missing" };
  });
  setMock(entityActions.saveEntityDocumentAction, async input => {
    const entity = lookup(input.objectId);
    if (!entity) return { state: "missing" };
    if (mode.current === "failed") return { state: "failed", message: "The Storybook save adapter is offline. Your draft remains here." };
    if (mode.current === "conflict") return { state: "conflict", current: cloneEntityFixture({ ...entity, document: { ...entity.document, version: entity.document.version + 1 } }) };
    const document = input.document as EntityDocument;
    const saved = cloneEntityFixture(entity, { document: { ...document, version: entity.document.version + 1 }, body: narrativeBody(document) });
    store.set(String(entity.objectId), saved);
    return { state: "ok", data: cloneEntityFixture(saved) };
  });
  setMock(entityActions.saveEntityIdentityAction, async input => {
    const entity = lookup(input.objectId);
    if (!entity || !entity.representation) return { state: "missing" };
    if (mode.current !== "ok") return { state: mode.current, message: "Identity changes wait until the draft can be saved." };
    const representation = { ...entity.representation, label: String(input.label ?? ""), fields: { ...entity.representation.fields, ...((input.fields ?? {}) as Record<string, string | number>) }, version: entity.representation.version + 1 };
    const saved = cloneEntityFixture(entity, { representation });
    store.set(String(entity.objectId), saved);
    return { state: "ok", data: saved };
  });
  setMock(entityActions.saveEntityMechanicsAction, async input => {
    const entity = lookup(input.objectId);
    if (!entity || !entity.representation) return { state: "missing" };
    if (mode.current !== "ok") return { state: mode.current, message: "Mechanics changes wait until the draft can be saved." };
    const representation = { ...entity.representation, mechanics: input.profile as MechanicsProfile, version: entity.representation.version + 1 };
    const saved = cloneEntityFixture(entity, { representation });
    store.set(String(entity.objectId), saved);
    return { state: "ok", data: saved };
  });
  setMock(actions.setClaimAction, async input => {
    const entity = lookup(input.subjectId);
    if (!entity) return { state: "missing" };
    if (mode.current !== "ok") return { state: mode.current, message: "This semantic change is waiting for a writable Storybook adapter." };
    const claim: Claim = {
      id: asClaimId(String(input.claimId)),
      subjectId: asWorldObjectId(String(input.subjectId)),
      claimKind: String(input.claimKind),
      value: String(input.value),
      objectValue: input.objectValue ? asWorldObjectId(String(input.objectValue)) : null,
      truthState: "pencil",
      provenance: { kind: "gm_assertion", authoredBy: "gm", recordedAt: new Date().toISOString() },
      settled: null,
      story: (input.story as Claim["story"] | undefined) ?? { order: null, label: null, precision: "unknown" },
      version: 1,
    };
    const saved = cloneEntityFixture(entity, { claims: [...entity.claims, claim] });
    store.set(String(entity.objectId), saved);
    return { state: "ok", data: claim };
  });
  setMock(actions.removeClaimAction, async input => {
    const claimId = asClaimId(String(input.claimId));
    for (const [id, entity] of store) {
      if (!entity.claims.some(claim => claim.id === claimId)) continue;
      store.set(id, cloneEntityFixture(entity, { claims: entity.claims.filter(claim => claim.id !== claimId) }));
    }
    return { state: "ok", data: claimId };
  });
  setMock(actions.searchWorldAction, async input => {
    const query = String(input.query ?? "").toLowerCase();
    const data = [...store.values()].filter(entity => `${entity.representation?.label ?? ""} ${entity.body}`.toLowerCase().includes(query)).map(entity => ({ objectId: entity.objectId, label: entity.representation?.label ?? entity.body.split("\n")[0] ?? "Untitled", kind: entity.representation?.kind ?? null })) as readonly ObjectRef[];
    return { state: "ok", data };
  });
  return store;
}

export function fixtureForStory(fixtures: readonly EntitySnapshot[], entity: EntitySnapshot): EntitySnapshot {
  return fixtures.find(candidate => candidate.objectId === entity.objectId) ?? entity;
}


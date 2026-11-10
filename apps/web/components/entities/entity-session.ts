"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import * as entityActions from "@/app/entity-actions";
import { removeClaimAction, representObjectAction, searchWorldAction, setClaimAction } from "@/app/actions";
import { legacyDocument, narrativeBody, validEntityDocument, validMechanicsProfile, type EntityBlock, type EntityContent, type EntityDocument, type EntitySnapshot, type MechanicsProfile } from "@/lib/world/entity-document";
import { asWorldId, type FieldValues, type ObjectRef, type RepresentationKind, type WorldObjectId } from "@/lib/world/model";
import type { DeskStore } from "@/components/desk/use-desk";

export type SaveStatus = "loading" | "saved" | "saving" | "unsaved" | "error" | "conflict";
export type EntitySessionValue = Readonly<{ entity: EntitySnapshot | null; status: SaveStatus; error: string | null; remote: EntitySnapshot | null }>;
type IdentityDraft = Readonly<{ label: string; fields: FieldValues }>;
const sessions = new Map<string, EntitySession>();
const committedListeners = new Set<(entity: EntitySnapshot) => void>();
export function onEntityCommitted(listener: (entity: EntitySnapshot) => void) { committedListeners.add(listener); return () => { committedListeners.delete(listener); }; }
const note = (result: { state: string; message?: string; reason?: string }) => result.message || result.reason || "This entity changed elsewhere. Your writing is still here.";

/** One recoverable local authoring session shared by every projection of an identity. */
export class EntitySession {
  private listeners = new Set<() => void>();
  private value: EntitySessionValue;
  private server: EntitySnapshot | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private dirty = false;
  private pendingIdentity: IdentityDraft | null = null;
  private pendingMechanics: MechanicsProfile | null = null;
  private loaded = false;
  private flight: Promise<void> = Promise.resolve();
  private recoveryTried = false;
  readonly key: string;
  constructor(readonly worldId: string, readonly objectId: string, seed?: EntityContent) {
    this.key = `relic.entityDraft.v1:${worldId}:${objectId}`;
    const entity = seed ? { worldId: asWorldId(worldId), lifecycle: "active" as const, objectId: seed.objectId, body: seed.body, bodyVersion: seed.bodyVersion, maturity: seed.maturity, settled: seed.settled, written: seed.written, representation: seed.representation, claims: seed.claims, links: seed.links, document: legacyDocument(seed) } : null;
    this.value = { entity, status: "loading", error: null, remote: null };
  }
  getSnapshot = () => this.value;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private emit(value: Partial<EntitySessionValue>) { this.value = { ...this.value, ...value }; this.listeners.forEach(listener => listener()); }
  private hasPending() { return this.dirty || this.pendingIdentity !== null || this.pendingMechanics !== null; }
  private remember() {
    try {
      if (!this.value.entity || !this.hasPending()) return;
      localStorage.setItem(this.key, JSON.stringify({
        schemaVersion: 2,
        baseVersion: this.server?.document.version ?? 0,
        baseRepresentationVersion: this.server?.representation?.version ?? null,
        document: this.dirty ? this.value.entity.document : undefined,
        identity: this.pendingIdentity,
        mechanics: this.pendingMechanics
      }));
    } catch { /* In-memory draft remains available. */ }
  }
  private forget() { try { localStorage.removeItem(this.key); } catch { /* Optional recovery cache. */ } }
  private preview(base: EntitySnapshot, document?: EntityDocument): EntitySnapshot {
    let entity = document ? { ...base, document, body: narrativeBody(document) } : base;
    if (this.pendingIdentity && entity.representation) {
      const fields = { ...entity.representation.fields };
      for (const [key, value] of Object.entries(this.pendingIdentity.fields)) {
        if (value === "") delete fields[key];
        else fields[key] = value;
      }
      entity = { ...entity, representation: { ...entity.representation, label: this.pendingIdentity.label || null, fields } };
    }
    if (this.pendingMechanics && entity.representation) {
      const fields = { ...entity.representation.fields };
      this.pendingMechanics.fields.forEach(field => { fields[field.id] = field.value; });
      entity = { ...entity, representation: { ...entity.representation, mechanics: this.pendingMechanics, fields } };
    }
    return entity;
  }
  private pendingDocument(): EntityDocument | undefined {
    return this.dirty ? this.value.entity?.document : undefined;
  }
  private markDraftPreview() {
    const entity = this.value.entity;
    if (!entity) return;
    this.emit({ entity: this.preview(entity, this.pendingDocument()), status: this.value.status === "conflict" ? "conflict" : "unsaved", error: this.value.status === "conflict" ? this.value.error : null });
    this.remember();
    if (this.value.status !== "conflict") this.schedule();
  }
  load = async (force = false) => {
    if (this.loaded && !force) return;
    this.loaded = true;
    try {
      const result = await entityActions.loadEntityAction({ worldId: this.worldId, objectId: this.objectId });
      if (result.state !== "ok") { this.emit({ status: "error", error: note(result) }); return; }
      const remote = result.data;
      const baselineVersion = this.server?.document.version;
      const baselineRepresentationVersion = this.server?.representation?.version;
      const documentConflict = baselineVersion !== undefined && remote.document.version !== baselineVersion;
      const representationConflict = (this.pendingIdentity !== null || this.pendingMechanics !== null)
        && baselineRepresentationVersion !== undefined
        && remote.representation?.version !== baselineRepresentationVersion;
      if (force && this.hasPending() && (documentConflict || representationConflict)) {
        this.emit({ remote, status: "conflict", error: "A newer version was saved elsewhere. Compare it with your draft before saving." });
        this.remember();
        return;
      }
      this.server = remote;
      this.emit({ entity: this.hasPending() ? this.preview(remote, this.pendingDocument()) : remote, status: this.hasPending() ? "unsaved" : "saved", error: null });
      if (!this.recoveryTried) {
        this.recoveryTried = true;
        try {
          const cached = JSON.parse(localStorage.getItem(this.key) || "null");
          if (cached && typeof cached === "object") {
            const cachedDocument = validEntityDocument(cached.document) ? cached.document as EntityDocument : undefined;
            const cachedIdentity = cached.identity && typeof cached.identity.label === "string" && cached.identity.fields && typeof cached.identity.fields === "object" ? { label: cached.identity.label, fields: cached.identity.fields as FieldValues } : null;
            const cachedMechanics = cached.mechanics && typeof cached.mechanics === "object" && validMechanicsProfile(cached.mechanics) ? cached.mechanics as MechanicsProfile : null;
            if (cachedDocument || cachedIdentity || cachedMechanics) {
              this.dirty = !!cachedDocument;
              this.pendingIdentity = cachedIdentity;
              this.pendingMechanics = cachedMechanics;
              const sameVersion = cached.baseVersion === remote.document.version
                && (cachedIdentity === null && cachedMechanics === null || cached.baseRepresentationVersion === (remote.representation?.version ?? null));
              this.emit({ entity: this.preview(remote, cachedDocument), status: sameVersion ? "unsaved" : "conflict", remote: sameVersion ? null : remote, error: sameVersion ? null : "A recovered draft and a newer saved version are both available." });
              if (sameVersion) this.remember();
              if (sameVersion) this.schedule();
            }
          }
        } catch { /* Invalid recovery cache must not block a real entity. */ }
      }
    } catch { this.emit({ status: "error", error: "This entity could not load. Try again; your workspace is unchanged." }); }
  };
  setDocument = (document: EntityDocument) => {
    const entity = this.value.entity;
    if (!entity || entity.lifecycle !== "active") return;
    this.dirty = true;
    this.emit({ entity: { ...entity, document, body: narrativeBody(document) }, status: this.value.status === "conflict" ? "conflict" : "unsaved", error: this.value.status === "conflict" ? this.value.error : null });
    this.remember();
    if (this.value.status !== "conflict") this.schedule();
  };
  patchBlock = (id: string, update: (block: EntityBlock) => EntityBlock) => {
    const document = this.value.entity?.document;
    if (document) this.setDocument({ ...document, blocks: document.blocks.map(block => block.id === id ? update(block) : block) });
  };
  setIdentityDraft = (label: string, fields?: FieldValues) => {
    const entity = this.value.entity;
    if (!entity?.representation || entity.lifecycle !== "active") return;
    const patch = fields ?? {};
    this.pendingIdentity = { label, fields: { ...(this.pendingIdentity?.fields ?? {}), ...patch } };
    this.markDraftPreview();
  };
  setMechanicsDraft = (profile: MechanicsProfile) => {
    const entity = this.value.entity;
    if (!entity?.representation || entity.lifecycle !== "active") return;
    this.pendingMechanics = profile;
    this.markDraftPreview();
  };
  private schedule() { if (this.timer) clearTimeout(this.timer); this.timer = setTimeout(() => { this.timer = null; void this.flush(); }, 650); }
  private enqueue(work: () => Promise<void>) { const next = this.flight.then(work, work); this.flight = next.catch(() => {}); return next; }
  private async flushWork() {
    if (!this.hasPending() || !this.value.entity || this.value.status === "conflict") return;
    const documentDraft = this.pendingDocument();
    const identityDraft = this.pendingIdentity;
    const mechanicsDraft = this.pendingMechanics;
    this.emit({ status: "saving", error: null });
    try {
      if (identityDraft) {
        const entity = this.server ?? this.value.entity;
        if (!entity.representation) { this.pendingIdentity = null; }
        else {
          const result = await entityActions.saveEntityIdentityAction({ worldId: this.worldId, objectId: this.objectId, observedVersion: entity.representation.version, label: identityDraft.label, fields: identityDraft.fields });
          if (result.state !== "ok") { await this.handleSaveFailure(result); return; }
          this.server = result.data;
          if (this.pendingIdentity === identityDraft) this.pendingIdentity = null;
          committedListeners.forEach(listener => listener(result.data));
        }
      }
      if (mechanicsDraft) {
        const entity = this.server ?? this.value.entity;
        if (!entity.representation) { this.pendingMechanics = null; }
        else {
          const result = await entityActions.saveEntityMechanicsAction({ worldId: this.worldId, objectId: this.objectId, observedVersion: entity.representation.version, profile: mechanicsDraft });
          if (result.state !== "ok") { await this.handleSaveFailure(result); return; }
          this.server = result.data;
          if (this.pendingMechanics === mechanicsDraft) this.pendingMechanics = null;
          committedListeners.forEach(listener => listener(result.data));
        }
      }
      if (documentDraft) {
        const result = await entityActions.saveEntityDocumentAction({ worldId: this.worldId, objectId: this.objectId, observedVersion: this.server?.document.version ?? 0, document: documentDraft });
        if (result.state !== "ok") { await this.handleSaveFailure(result); return; }
        this.server = result.data;
        if (this.value.entity?.document === documentDraft) this.dirty = false;
        committedListeners.forEach(listener => listener(result.data));
      }
      const current = this.server ?? this.value.entity;
      if (current) this.emit({ entity: this.preview(current, this.pendingDocument()), status: this.hasPending() ? "unsaved" : "saved", error: null });
      if (this.hasPending()) { this.remember(); this.schedule(); } else this.forget();
    } catch {
      this.emit({ status: "error", error: "Could not save. Your draft is kept on this device; retry when ready." });
      this.remember();
    }
  }
  private async handleSaveFailure(result: { state: string; message?: string; reason?: string }) {
    if (result.state === "conflict") {
      const remote = await entityActions.loadEntityAction({ worldId: this.worldId, objectId: this.objectId });
      this.emit({ status: "conflict", remote: remote.state === "ok" ? remote.data : null, error: "A newer version was saved elsewhere. Compare it with your draft before saving." });
    } else this.emit({ status: "error", error: note(result) });
    this.remember();
  }
  flush = () => {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    return this.enqueue(() => this.flushWork());
  };
  retry = () => {
    if (!this.hasPending() || this.value.status === "conflict") return Promise.resolve();
    this.emit({ status: "unsaved", error: null });
    return this.flush();
  };
  useSavedVersion = () => {
    if (!this.value.remote) return;
    this.server = this.value.remote;
    this.dirty = false;
    this.pendingIdentity = null;
    this.pendingMechanics = null;
    this.forget();
    this.emit({ entity: this.value.remote, remote: null, status: "saved", error: null });
  };
  saveRecoveredVersion = () => {
    if (!this.value.remote) return;
    this.server = this.value.remote;
    this.emit({ entity: this.preview(this.server, this.pendingDocument()), remote: null, status: "unsaved", error: null });
    this.remember();
    void this.flush();
  };
  saveIdentity = (label: string, fields?: FieldValues) => this.enqueue(async () => {
    const entity = this.server ?? this.value.entity;
    if (!entity?.representation) return;
    this.pendingIdentity = { label, fields: { ...(this.pendingIdentity?.fields ?? {}), ...(fields ?? {}) } };
    await this.flushWork();
  });
  saveMechanics = (profile: MechanicsProfile) => this.enqueue(async () => {
    const entity = this.server ?? this.value.entity;
    if (!entity?.representation) return;
    this.pendingMechanics = profile;
    await this.flushWork();
  });
  search: DeskStore["search"] = async input => {
    const result = await searchWorldAction({ ...input, worldId: this.worldId });
    if (result.state !== "ok") throw new Error(note(result));
    return result.data;
  };
  classify = async (kind: RepresentationKind, label: string) => {
    await this.flush();
    if (this.hasPending()) return false;
    const result = await representObjectAction({ objectId: this.objectId, representationId: crypto.randomUUID(), kind, label });
    if (result.state !== "ok") { this.emit({ status: "error", error: note(result) }); return false; }
    await this.load(true); this.publish(); return true;
  };
  findObjects: DeskStore["findObjects"] = async (query, excludeId) => (await this.search({ query, excludeId, limit: 8 })).map(entry => entry.ref);
  searchReferences = async (query: string) => (await this.findObjects(query, this.objectId as WorldObjectId)).map(ref => ({ objectId: ref.objectId, label: ref.label, kind: ref.kind ?? undefined }));
  assert: DeskStore["assert"] = async (subject, kind, value, target, story, expected, boardProjection) => {
    if (subject !== this.objectId || boardProjection) return false;
    try {
      const result = await setClaimAction({ subjectId: subject, claimId: expected?.claimId ?? crypto.randomUUID(), claimKind: kind, value, objectValue: target?.objectId, story, expectedClaim: expected ? { ...expected, relationshipId: expected.relationshipId ?? undefined } : undefined });
      if (result.state !== "ok") return false;
      await this.load(true); this.publish(); await refreshLinked(this); return true;
    } catch { return false; }
  };
  retract: DeskStore["retract"] = async (subject, claimId, observedVersion) => {
    if (subject !== this.objectId) return false;
    try { const result = await removeClaimAction({ claimId, observedVersion }); if (result.state !== "ok") return false; await this.load(true); this.publish(); await refreshLinked(this); return true; } catch { return false; }
  };
  private publish() { if (this.server) committedListeners.forEach(listener => listener(this.server!)); }
}
async function refreshLinked(source: EntitySession) {
  await Promise.all([...sessions.values()].filter(session => session !== source && session.worldId === source.worldId && (source.getSnapshot().entity?.links.some(link => link.other.objectId === session.objectId) || session.getSnapshot().entity?.links.some(link => link.other.objectId === source.objectId))).map(session => session.load(true)));
}
export function entitySession(worldId: string, objectId: string, seed?: EntityContent) {
  const key = `${worldId}:${objectId}`;
  let session = sessions.get(key);
  if (!session) { session = new EntitySession(worldId, objectId, seed); sessions.set(key, session); }
  return session;
}
export function seedEntitySession(entity: EntitySnapshot) { const session = entitySession(entity.worldId, entity.objectId); void session.load(true); return session; }
export function useEntitySession(worldId: string, objectId: string, seed?: EntityContent) {
  const session = useMemo(() => entitySession(worldId, objectId, seed), [worldId, objectId]);
  const value = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  useEffect(() => { void session.load(); }, [session]);
  return { ...value, session };
}

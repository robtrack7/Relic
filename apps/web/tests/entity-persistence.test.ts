// @vitest-environment node
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { asCardId, asWorldId, asWorldObjectId, emptyLayoutAt } from "@/lib/world/model";
import { closeDb, db } from "@/lib/world/db";
import { PostgresDeskRepository } from "@/lib/world/postgres-store";
import { richText } from "@/lib/world/entity-document";
import type { DeskRepository } from "@/lib/world/repository";

let world = asWorldId(randomUUID());
let repo: DeskRepository;

beforeEach(() => { world = asWorldId(randomUUID()); repo = PostgresDeskRepository.open(db()); });
afterAll(async () => { await closeDb(); });

describe("entity-scoped authoring", () => {
  it("creates an identity and document without creating a placement", async () => {
    await repo.openDesk(world);
    const objectId = asWorldObjectId(randomUUID());
    const created = await repo.createEntity({ worldId: world, objectId, kind: "character", label: "Mara" });
    expect(created.state).toBe("ok");
    if (created.state !== "ok") return;
    expect((await repo.openDesk(world)).cards).toHaveLength(0);
    const loaded = await repo.loadEntity(world, objectId);
    expect(loaded?.representation?.label).toBe("Mara");
    expect(loaded?.document.version).toBe(1);
  });

  it("replays the same active-world creation without duplicating or rewriting it", async () => {
    await repo.openDesk(world);
    const objectId = asWorldObjectId(randomUUID());
    const first = await repo.createEntity({ worldId: world, objectId, kind: "character", label: "Mara" });
    expect(first.state).toBe("ok");
    if (first.state !== "ok") return;
    const replay = await repo.createEntity({ worldId: world, objectId, kind: "place", label: "Should not rewrite" });
    expect(replay.state).toBe("ok");
    if (replay.state !== "ok") return;
    expect(replay.data.objectId).toBe(objectId);
    expect(replay.data.representation?.kind).toBe("character");
    expect(replay.data.representation?.label).toBe("Mara");
    expect((await repo.openDesk(world)).cards).toHaveLength(0);
  });

  it("keeps non-narrative blocks through CAS saves and rejects stale writes", async () => {
    await repo.openDesk(world);
    const objectId = asWorldObjectId(randomUUID());
    await repo.createEntity({ worldId: world, objectId, kind: "character", label: "Mara" });
    const saved = await repo.saveEntityDocument({
      worldId: world,
      objectId,
      observedVersion: 1,
      document: {
        schemaVersion: 1,
        version: 1,
        blocks: [
          { id: `${objectId}:narrative`, kind: "text", role: "narrative", title: "Narrative", content: richText("A scout at the edge of the Vale.") },
          { id: `${objectId}:notes`, kind: "text", role: "notes", title: "GM notes", content: richText("Keep the debt unresolved.") }
        ]
      }
    });
    expect(saved.state).toBe("ok");
    if (saved.state !== "ok") return;
    expect(saved.data.document.version).toBe(2);
    expect((await repo.saveEntityDocument({ worldId: world, objectId, observedVersion: 1, document: saved.data.document })).state).toBe("conflict");
    const loaded = await repo.loadEntity(world, objectId);
    expect(loaded?.document.blocks.some(block => block.kind === "text" && block.role === "notes")).toBe(true);
    expect(loaded?.body).toContain("A scout at the edge");
  });

  it("merges identity fields and permits explicit clears without dropping unknown legacy keys", async () => {
    await repo.openDesk(world);
    const objectId = asWorldObjectId(randomUUID());
    await repo.createEntity({ worldId: world, objectId, kind: "character", label: "Mara" });
    const initial = await repo.loadEntity(world, objectId);
    if (!initial?.representation) throw new Error("entity representation was not created");
    const seeded = await repo.editRepresentation({
      representationId: initial.representation.id,
      observedVersion: initial.representation.version,
      label: "Mara",
      fields: { legacyUnknown: "preserve", role: "scout" }
    });
    expect(seeded.state).toBe("ok");
    if (seeded.state !== "ok") return;
    const saved = await repo.saveEntityIdentity({ worldId: world, objectId, observedVersion: seeded.data.version, label: "Mara Vey", fields: { role: "guide", legacyUnknown: "" } });
    expect(saved.state).toBe("ok");
    if (saved.state !== "ok") return;
    expect(saved.data.representation?.label).toBe("Mara Vey");
    expect(saved.data.representation?.fields).toEqual({ role: "guide" });
  });

  it("rejects document references outside the world, missing, or archived", async () => {
    await repo.openDesk(world);
    const objectId = asWorldObjectId(randomUUID());
    await repo.createEntity({ worldId: world, objectId, kind: "character", label: "Mara" });
    const foreignWorld = asWorldId(randomUUID());
    await repo.openDesk(foreignWorld);
    const foreign = asWorldObjectId(randomUUID());
    await repo.createEntity({ worldId: foreignWorld, objectId: foreign, kind: "place", label: "Elsewhere" });
    const referenceDocument = (target: string) => ({ schemaVersion: 1 as const, version: 1, blocks: [{ id: `${objectId}:narrative`, kind: "text" as const, role: "narrative" as const, title: "Narrative", content: { type: "doc" as const, content: [{ type: "paragraph", content: [{ type: "entityReference", attrs: { objectId: target, label: "Target" } }] }] } }] });
    expect((await repo.saveEntityDocument({ worldId: world, objectId, observedVersion: 1, document: referenceDocument(foreign) })).state).toBe("refused");
    expect((await repo.saveEntityDocument({ worldId: world, objectId, observedVersion: 1, document: referenceDocument(randomUUID()) })).state).toBe("refused");
    const archivedWorld = asWorldId(randomUUID());
    const archivedDesk = await repo.openDesk(archivedWorld);
    const archived = asWorldObjectId(randomUUID());
    const card = await repo.captureCard({ compositionId: archivedDesk.compositionId, cardId: asCardId(randomUUID()), objectId: archived, body: "Soon cleared", layout: emptyLayoutAt(0, 0), author: "gm" });
    if (card.state !== "ok") throw new Error("archive fixture failed");
    await repo.removeCards({ compositionId: archivedDesk.compositionId, cardIds: [card.data.cardId] });
    expect((await repo.saveEntityDocument({ worldId: archivedWorld, objectId: archived, observedVersion: 0, document: referenceDocument(archived) })).state).toBe("missing");
  });

  it("validates mechanics equipment references inside the repository transaction", async () => {
    await repo.openDesk(world);
    const source = asWorldObjectId(randomUUID());
    await repo.createEntity({ worldId: world, objectId: source, kind: "character", label: "Mara" });
    const foreignWorld = asWorldId(randomUUID());
    await repo.openDesk(foreignWorld);
    const foreign = asWorldObjectId(randomUUID());
    await repo.createEntity({ worldId: foreignWorld, objectId: foreign, kind: "artifact", label: "Foreign" });
    const profile = (target: string) => ({ schemaVersion: 1 as const, system: "General", variant: "general" as const, fields: [], resources: [], features: [], equipment: [{ id: "item", label: "Item", objectId: target }], notes: richText("") });
    const loaded = await repo.loadEntity(world, source);
    if (!loaded?.representation) throw new Error("mechanics fixture was not represented");
    expect((await repo.saveEntityMechanics({ worldId: world, objectId: source, observedVersion: loaded.representation.version, profile: profile(foreign) })).state).toBe("refused");
    expect((await repo.saveEntityMechanics({ worldId: world, objectId: source, observedVersion: loaded.representation.version, profile: profile(randomUUID()) })).state).toBe("refused");
  });

  it("preserves the authored blocks when legacy card editing reaches a persisted document", async () => {
    const desk = await repo.openDesk(world);
    const objectId = asWorldObjectId(randomUUID());
    const captured = await repo.captureCard({ compositionId: desk.compositionId, cardId: asCardId(randomUUID()), objectId, body: "Original narrative", layout: emptyLayoutAt(0, 0), author: "gm" });
    if (captured.state !== "ok") throw new Error("capture fixture failed");
    const legacy = await repo.loadEntity(world, objectId);
    expect(legacy?.document.version).toBe(0);
    const persisted = await repo.saveEntityDocument({ worldId: world, objectId, observedVersion: 0, document: { schemaVersion: 1, version: 0, blocks: [{ id: `${objectId}:narrative`, kind: "text", role: "narrative", title: "Narrative", content: richText("Saved narrative") }, { id: `${objectId}:notes`, kind: "text", role: "notes", title: "Notes", content: richText("Keep this note") }] } });
    if (persisted.state !== "ok") throw new Error("document persistence fixture failed");
    const edited = await repo.editCardBody({ compositionId: desk.compositionId, cardId: captured.data.cardId, body: "Updated narrative", observedBodyVersion: persisted.data.bodyVersion, author: "gm" });
    expect(edited.state).toBe("ok");
    const after = await repo.loadEntity(world, objectId);
    expect(after?.body).toContain("Updated narrative");
    expect(after?.document.blocks.some(block => block.kind === "text" && block.role === "notes" && block.content.content.some(node => node.type === "paragraph"))).toBe(true);
  });
});

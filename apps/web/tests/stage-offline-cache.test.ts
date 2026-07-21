import { describe, expect, it } from "vitest";
import {
  MemoryStageOfflineStore,
  StageOfflineCache,
  searchStageLiteralIndex,
  stageOfflineSessionKey,
  type StageOfflineSnapshot,
} from "@/lib/stage-offline-cache";

const scope = {
  workspaceId: "workspace-1",
  worldId: "world-1",
  sagaId: "saga-1",
  sessionId: "session-1",
};

function snapshot(ownerId = "gm-1"): StageOfflineSnapshot {
  return {
    ...scope,
    ownerId,
    sessionKey: stageOfflineSessionKey(ownerId, scope),
    cachedAt: "2026-07-21T08:00:00.000Z",
    packet: { session: { id: scope.sessionId, name: "The Flooded Archive", status: "ready" } },
    pinned: [],
    activeThreads: [],
    literalSearchIndex: [
      { source_kind: "entity", source_entity_type: "character", source_entity_id: "character-1", name: "Mara Vale", summary: "Harbor witness", narrative: "Saw the gate open", canon_state: "canon", is_stub: false, updated_at: "2026-07-21T07:00:00.000Z" },
      { source_kind: "entity", source_entity_type: "place", source_entity_id: "place-1", name: "Tideglass Pier", summary: "Moonlit landing", narrative: null, canon_state: "canon", is_stub: false, updated_at: "2026-07-21T07:01:00.000Z" },
    ],
  };
}

describe("StageOfflineCache", () => {
  it("restores one GM-scoped ready packet and literal index after a queue-equivalent restart", async () => {
    const store = new MemoryStageOfflineStore();
    await new StageOfflineCache(store).put(snapshot());

    const restarted = new StageOfflineCache(store);
    await expect(restarted.get("gm-1", scope)).resolves.toEqual(snapshot());
    await expect(restarted.get("gm-2", scope)).resolves.toBeNull();
  });

  it("searches cached canon literally and ranks an exact name ahead of body matches", () => {
    const results = searchStageLiteralIndex(snapshot().literalSearchIndex, "Mara Vale");
    expect(results.map((result) => result.source_entity_id)).toEqual(["character-1"]);
    expect(results[0].snippet).toContain("Mara Vale");
  });

  it("adds an offline Quick Stub to the local index before replay", async () => {
    const store = new MemoryStageOfflineStore();
    const cache = new StageOfflineCache(store);
    await cache.put(snapshot());

    const updated = await cache.upsertLiteralDocument("gm-1", scope, {
      source_kind: "entity",
      source_entity_type: "thread",
      source_entity_id: "stage_write:stub-1",
      name: "The Missing Courier",
      summary: "Never reached the archive",
      narrative: null,
      canon_state: "canon",
      is_stub: true,
      updated_at: "2026-07-21T08:02:00.000Z",
    });

    expect(searchStageLiteralIndex(updated.literalSearchIndex, "missing courier")[0]).toMatchObject({
      source_entity_id: "stage_write:stub-1",
      is_stub: true,
    });
  });
});

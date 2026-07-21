import { describe, expect, it, vi } from "vitest";
import {
  MemoryStageWriteStore,
  StageWriteQueue,
  type StageWriteScope,
  type StageWriteTransport,
  type StoredStageWriteIntent,
} from "@/lib/stage-write-queue";

const scope: StageWriteScope = {
  workspaceId: "workspace-1",
  worldId: "world-1",
  sagaId: "saga-1",
  sessionId: "session-1",
};

function transport(deliver: (intent: StoredStageWriteIntent) => Promise<Record<string, unknown>>): StageWriteTransport {
  return { deliver };
}

describe("StageWriteQueue", () => {
  it("enqueues and replays writes in order so End cannot pass earlier evidence", async () => {
    const store = new MemoryStageWriteStore();
    const delivered: string[] = [];
    const queue = new StageWriteQueue(store, transport(async (intent) => {
      delivered.push(intent.kind);
      return { id: intent.id };
    }));

    await queue.enqueue(scope, "quick_capture", { body: "The gate opened." });
    await queue.enqueue(scope, "mark_moment", { label: "decision", occurred_at: "2026-07-21T05:00:00.000Z" });
    await queue.enqueue(scope, "end_session", { requested_at: "2026-07-21T05:01:00.000Z" });

    expect(await queue.flushSession(scope)).toMatchObject({ status: "idle", queued: 0, failed: 0 });
    expect(delivered).toEqual(["quick_capture", "mark_moment", "end_session"]);
  });

  it("reuses the same idempotency key when a delivered intent is replayed", async () => {
    const store = new MemoryStageWriteStore();
    const effects = new Set<string>();
    const deliver = vi.fn(async (intent: StoredStageWriteIntent) => {
      effects.add(intent.id);
      return { id: intent.id };
    });
    const queue = new StageWriteQueue(store, transport(deliver));
    const intent = await queue.enqueue(scope, "quick_stub", { entity_type: "character", name: "Mara" });

    await queue.flushSession(scope);
    await store.putIntent({ ...intent, state: "queued" });
    await queue.flushSession(scope);

    expect(deliver).toHaveBeenCalledTimes(2);
    expect(deliver.mock.calls[0][0].id).toBe(deliver.mock.calls[1][0].id);
    expect(effects.size).toBe(1);
  });

  it("stops at a partial failure and recovers the failed dependency before End", async () => {
    const store = new MemoryStageWriteStore();
    const delivered: string[] = [];
    let markAttempts = 0;
    const queue = new StageWriteQueue(store, transport(async (intent) => {
      delivered.push(intent.kind);
      if (intent.kind === "mark_moment" && markAttempts++ === 0) throw new Error("offline");
      return { id: intent.id };
    }));

    await queue.enqueue(scope, "quick_capture", { body: "Evidence first" });
    await queue.enqueue(scope, "mark_moment", { label: "secret" });
    await queue.enqueue(scope, "end_session", { requested_at: "2026-07-21T05:01:00.000Z" });

    expect(await queue.flushSession(scope)).toMatchObject({ status: "failed", failed: 1, queued: 1 });
    expect(delivered).toEqual(["quick_capture", "mark_moment"]);

    expect(await queue.flushSession(scope, true)).toMatchObject({ status: "recovered", failed: 0, queued: 0 });
    expect(delivered).toEqual(["quick_capture", "mark_moment", "mark_moment", "end_session"]);
  });

  it("recovers pending IndexedDB-equivalent state after an app restart", async () => {
    const store = new MemoryStageWriteStore();
    const firstQueue = new StageWriteQueue(store, transport(async () => ({ id: "unused" })));
    const intent = await firstQueue.enqueue(scope, "quick_capture", { body: "Survive restart" });
    const delivered: string[] = [];
    const restartedQueue = new StageWriteQueue(store, transport(async (stored) => {
      delivered.push(stored.id);
      return { id: stored.id };
    }));

    await restartedQueue.recoverAll();

    expect(delivered).toEqual([intent.id]);
    expect(await restartedQueue.getSummary(scope)).toMatchObject({ status: "idle", queued: 0, failed: 0 });
  });
});

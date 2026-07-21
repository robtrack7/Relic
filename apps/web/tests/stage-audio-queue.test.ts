import { describe, expect, it, vi } from "vitest";
import {
  MemoryStageAudioStore,
  StageAudioUploadQueue,
  type StageAudioScope,
  type StageAudioTransport,
  type StoredStageAudioChunk,
} from "@/lib/stage-audio-queue";

const scope: StageAudioScope = {
  workspaceId: "workspace",
  worldId: "world",
  sagaId: "saga",
  sessionId: "session",
};

function transport(overrides: Partial<StageAudioTransport> = {}): StageAudioTransport {
  return {
    getRemoteNextSequence: vi.fn(async () => 0),
    uploadChunk: vi.fn(async () => undefined),
    finalizeRecording: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe("Stage durable audio queue", () => {
  it("starts recording from the local sequence while offline", async () => {
    const queue = new StageAudioUploadQueue(new MemoryStageAudioStore(), transport({
      getRemoteNextSequence: vi.fn(async () => { throw new Error("offline"); }),
    }));
    await expect(queue.prepareSession(scope)).resolves.toBe(0);
    await expect(queue.enqueueChunk(scope, new Blob(["offline"]), "audio/webm", 30_000)).resolves.toMatchObject({ sequence: 0, state: "queued" });
  });

  it("assigns stable FIFO sequences and uploads the same stored chunk", async () => {
    const store = new MemoryStageAudioStore();
    const remote = transport({ getRemoteNextSequence: vi.fn(async () => 3) });
    const queue = new StageAudioUploadQueue(store, remote);
    await queue.prepareSession(scope);
    const chunk = await queue.enqueueChunk(scope, new Blob(["audio"]), "audio/webm", 30_000);

    expect(chunk.sequence).toBe(3);
    expect((await queue.getSummary(scope)).status).toBe("queued");
    await queue.flushSession(scope);
    expect(remote.uploadChunk).toHaveBeenCalledWith(expect.objectContaining({ id: chunk.id, sequence: 3 }));
    expect((await queue.getSummary(scope)).queued).toBe(0);
  });

  it("preserves a failed Blob and reports recovered after an idempotent retry", async () => {
    const store = new MemoryStageAudioStore();
    const attempts: StoredStageAudioChunk[] = [];
    const remote = transport({
      uploadChunk: vi.fn(async (chunk) => {
        attempts.push(chunk);
        if (attempts.length === 1) throw new Error("network unavailable");
      }),
    });
    const queue = new StageAudioUploadQueue(store, remote);
    await queue.prepareSession(scope);
    const saved = await queue.enqueueChunk(scope, new Blob(["preserve-me"]), "audio/webm", 30_000);

    expect((await queue.flushSession(scope))).toMatchObject({ status: "failed", failed: 1, lastError: "network unavailable" });
    const preserved = (await store.listChunks(saved.sessionKey))[0];
    expect(preserved.blob.size).toBe(saved.blob.size);
    expect(Date.parse(preserved.nextRetryAt ?? "")).toBeGreaterThan(Date.now());

    expect((await queue.flushSession(scope, true))).toMatchObject({ status: "recovered", failed: 0, queued: 0 });
    expect(attempts.map((chunk) => chunk.id)).toEqual([saved.id, saved.id]);
    expect(attempts.map((chunk) => chunk.sequence)).toEqual([saved.sequence, saved.sequence]);
  });

  it("finalizes transcription eligibility only after every local chunk uploads", async () => {
    const remote = transport();
    const queue = new StageAudioUploadQueue(new MemoryStageAudioStore(), remote);
    await queue.prepareSession(scope);
    await queue.enqueueChunk(scope, new Blob(["one"]), "audio/webm", 30_000);
    await queue.enqueueChunk(scope, new Blob(["two"]), "audio/webm", 10_000);

    await queue.requestFinalization(scope);

    expect(remote.uploadChunk).toHaveBeenCalledTimes(2);
    expect(remote.finalizeRecording).toHaveBeenCalledTimes(1);
    expect(remote.finalizeRecording).toHaveBeenCalledWith(scope, 2);
  });

  it("keeps a failed finalization visible and recovers it without reuploading audio", async () => {
    let attempts = 0;
    const remote = transport({
      finalizeRecording: vi.fn(async () => {
        attempts += 1;
        if (attempts === 1) throw new Error("finalization unavailable");
      }),
    });
    const queue = new StageAudioUploadQueue(new MemoryStageAudioStore(), remote);
    await queue.prepareSession(scope);
    await queue.enqueueChunk(scope, new Blob(["one"]), "audio/webm", 30_000);

    await expect(queue.requestFinalization(scope)).resolves.toMatchObject({
      status: "failed",
      queued: 0,
      failed: 1,
      lastError: "finalization unavailable",
    });
    await expect(queue.flushSession(scope, true)).resolves.toMatchObject({ status: "recovered", failed: 0 });
    expect(remote.uploadChunk).toHaveBeenCalledTimes(1);
    expect(remote.finalizeRecording).toHaveBeenCalledTimes(2);
  });
});

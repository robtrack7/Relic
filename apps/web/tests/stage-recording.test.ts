import { afterEach, describe, expect, it, vi } from "vitest";
import { StageRecordingAdapter } from "@/lib/stage-recording";

class FakeMediaRecorder extends EventTarget {
  static current: FakeMediaRecorder | null = null;
  state: RecordingState = "inactive";
  mimeType = "audio/webm";
  timeslice = 0;

  constructor(_stream: MediaStream) {
    super();
    FakeMediaRecorder.current = this;
  }

  start(timeslice?: number) {
    this.state = "recording";
    this.timeslice = timeslice ?? 0;
  }

  emit(data: Blob) {
    this.dispatchEvent(Object.assign(new Event("dataavailable"), { data }));
  }

  stop() {
    this.state = "inactive";
    this.dispatchEvent(new Event("stop"));
  }
}

describe("Stage recording adapter", () => {
  afterEach(() => vi.restoreAllMocks());

  it("emits durable 30-second chunks instead of retaining one tab-memory Blob", async () => {
    const stopTrack = vi.fn();
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: vi.fn(async () => ({ getTracks: () => [{ stop: stopTrack }] })) },
    });
    vi.stubGlobal("MediaRecorder", FakeMediaRecorder);
    const writes: Blob[] = [];
    const adapter = new StageRecordingAdapter();

    await adapter.start(async (chunk) => { writes.push(chunk.blob); });
    expect(FakeMediaRecorder.current?.timeslice).toBe(30_000);
    FakeMediaRecorder.current?.emit(new Blob(["first"], { type: "audio/webm" }));
    FakeMediaRecorder.current?.emit(new Blob(["second"], { type: "audio/webm" }));
    const result = await adapter.stop();

    expect(writes).toHaveLength(2);
    expect(result?.chunkCount).toBe(2);
    expect(stopTrack).toHaveBeenCalledOnce();
  });
});

export type StageRecordingChunk = {
  blob: Blob;
  mimeType: string;
  durationMs: number;
  recordedAt: string;
};

export type StageRecordingResult = {
  durationMs: number;
  chunkCount: number;
};

type ChunkHandler = (chunk: StageRecordingChunk) => Promise<void> | void;

/** Captures immutable chunks; the handler must durably save each Blob before it resolves. */
export class StageRecordingAdapter {
  private recorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private startedAt = 0;
  private chunkStartedAt = 0;
  private chunkCount = 0;
  private writes: Promise<void>[] = [];

  constructor(private timesliceMs = 30_000) {}

  get supported() {
    return typeof navigator !== "undefined"
      && Boolean(navigator.mediaDevices?.getUserMedia)
      && typeof MediaRecorder !== "undefined";
  }

  async start(onChunk: ChunkHandler): Promise<void> {
    if (!this.supported) throw new Error("Audio recording is not supported in this browser.");
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.startedAt = Date.now();
    this.chunkStartedAt = this.startedAt;
    this.chunkCount = 0;
    this.writes = [];
    this.recorder = new MediaRecorder(this.stream);
    this.recorder.addEventListener("dataavailable", (event) => {
      if (!event.data.size) return;
      const now = Date.now();
      const chunk: StageRecordingChunk = {
        blob: event.data,
        mimeType: event.data.type || this.recorder?.mimeType || "audio/webm",
        durationMs: Math.max(0, now - this.chunkStartedAt),
        recordedAt: new Date(this.chunkStartedAt).toISOString(),
      };
      this.chunkStartedAt = now;
      this.chunkCount += 1;
      this.writes.push(Promise.resolve(onChunk(chunk)));
    });
    this.recorder.start(this.timesliceMs);
  }

  async stop(): Promise<StageRecordingResult | null> {
    const recorder = this.recorder;
    if (!recorder || recorder.state === "inactive") return null;
    await new Promise<void>((resolve) => {
      recorder.addEventListener("stop", () => resolve(), { once: true });
      recorder.stop();
    });
    await Promise.all(this.writes);
    const result = { durationMs: Math.max(0, Date.now() - this.startedAt), chunkCount: this.chunkCount };
    this.stream?.getTracks().forEach((track) => track.stop());
    this.recorder = null;
    this.stream = null;
    this.writes = [];
    return result;
  }
}

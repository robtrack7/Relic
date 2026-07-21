export type StageRecordingResult = {
  blob: Blob;
  mimeType: string;
  durationMs: number;
};

/**
 * Browser recording boundary for Stage. Audio capture works today; durable
 * chunk upload is intentionally kept outside this adapter until the Storage
 * upload contract is exposed to the web client.
 */
export class StageRecordingAdapter {
  private recorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: BlobPart[] = [];
  private startedAt = 0;

  get supported() {
    return typeof navigator !== "undefined"
      && Boolean(navigator.mediaDevices?.getUserMedia)
      && typeof MediaRecorder !== "undefined";
  }

  async start(): Promise<void> {
    if (!this.supported) {
      throw new Error("Audio recording is not supported in this browser.");
    }
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.chunks = [];
    this.startedAt = Date.now();
    this.recorder = new MediaRecorder(this.stream);
    this.recorder.addEventListener("dataavailable", (event) => {
      if (event.data.size) this.chunks.push(event.data);
    });
    this.recorder.start(5_000);
  }

  async stop(): Promise<StageRecordingResult | null> {
    const recorder = this.recorder;
    if (!recorder || recorder.state === "inactive") return null;

    const result = await new Promise<StageRecordingResult>((resolve) => {
      recorder.addEventListener("stop", () => {
        const mimeType = recorder.mimeType || "audio/webm";
        resolve({
          blob: new Blob(this.chunks, { type: mimeType }),
          mimeType,
          durationMs: Math.max(0, Date.now() - this.startedAt),
        });
      }, { once: true });
      recorder.stop();
    });

    this.stream?.getTracks().forEach((track) => track.stop());
    this.recorder = null;
    this.stream = null;
    this.chunks = [];
    return result;
  }
}

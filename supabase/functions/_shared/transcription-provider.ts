export type TranscriptionSegment = {
  start: number;
  end: number;
  text: string;
  deleted: false;
};

export type TranscriptionResult = {
  segments: TranscriptionSegment[];
  model: string;
  language: string | null;
  durationSeconds: number;
};

export class TranscriptionProviderError extends Error {
  constructor(message: string, readonly retryable: boolean) {
    super(message);
    this.name = "TranscriptionProviderError";
  }
}

function finiteNumber(value: unknown, field: string) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw new TranscriptionProviderError(`Transcription provider returned an invalid ${field}.`, false);
  }
  return number;
}

function normalizeSegments(body: Record<string, unknown>): TranscriptionSegment[] {
  const rawSegments = Array.isArray(body.segments) ? body.segments : [];
  if (rawSegments.length === 0 && typeof body.text === "string" && body.text.trim()) {
    return [{
      start: 0,
      end: finiteNumber(body.duration ?? 0, "duration"),
      text: body.text.trim(),
      deleted: false,
    }];
  }

  let previousStart = -1;
  return rawSegments.map((value, index) => {
    const segment = value as Record<string, unknown>;
    const start = finiteNumber(segment.start, `segment ${index} start`);
    const end = finiteNumber(segment.end, `segment ${index} end`);
    const text = typeof segment.text === "string" ? segment.text.trim() : "";
    if (start < previousStart || end < start || !text) {
      throw new TranscriptionProviderError(`Transcription provider returned an invalid segment at index ${index}.`, false);
    }
    previousStart = start;
    return { start, end, text, deleted: false };
  });
}

function providerConfig() {
  const baseUrl = Deno.env.get("TRANSCRIPTION_PROVIDER_BASE_URL")
    ?? Deno.env.get("LITELLM_PROXY_URL")
    ?? Deno.env.get("AI_PROVIDER_BASE_URL");
  const apiKey = Deno.env.get("TRANSCRIPTION_PROVIDER_API_KEY")
    ?? Deno.env.get("LITELLM_PROXY_KEY")
    ?? Deno.env.get("AI_PROVIDER_API_KEY");
  if (!baseUrl || !apiKey) {
    throw new TranscriptionProviderError("Transcription provider environment is not configured.", false);
  }
  return { baseUrl: baseUrl.replace(/\/$/, ""), apiKey };
}

export async function callTranscriptionProvider(audio: File): Promise<TranscriptionResult> {
  const model = Deno.env.get("TRANSCRIPTION_MODEL") ?? "relic-transcribe";
  const mode = Deno.env.get("TRANSCRIPTION_PROVIDER_MODE") ?? "live";

  if (mode === "test") {
    return {
      segments: [{ start: 0, end: 1, text: "Local transcription provider test completed.", deleted: false }],
      model,
      language: "en",
      durationSeconds: 1,
    };
  }
  if (mode !== "live") {
    throw new TranscriptionProviderError("Transcription provider mode is invalid.", false);
  }

  const { baseUrl, apiKey } = providerConfig();
  const form = new FormData();
  form.set("model", model);
  form.set("response_format", "verbose_json");
  form.set("file", audio);

  const response = await fetch(`${baseUrl}/audio/transcriptions`, {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!response.ok) {
    const retryable = response.status === 408
      || response.status === 409
      || response.status === 425
      || response.status === 429
      || response.status >= 500;
    throw new TranscriptionProviderError(`Transcription provider request failed with status ${response.status}.`, retryable);
  }

  const body = await response.json() as Record<string, unknown>;
  const segments = normalizeSegments(body);
  if (segments.length === 0) {
    throw new TranscriptionProviderError("Transcription provider returned no transcript segments.", false);
  }
  const durationSeconds = finiteNumber(
    body.duration ?? Math.max(...segments.map((segment) => segment.end)),
    "duration",
  );

  return {
    segments,
    model,
    language: typeof body.language === "string" ? body.language : null,
    durationSeconds,
  };
}

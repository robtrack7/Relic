export const TRANSCRIPTION_ALIAS = "relic-transcribe";

export type TranscriptionSegment = {
  start: number;
  end: number;
  text: string;
  deleted: false;
};

export type TranscriptionResult = {
  segments: TranscriptionSegment[];
  alias: string;
  resolvedModel: string;
  provider: string;
  requestId: string | null;
  language: string | null;
  durationSeconds: number;
  billable: boolean;
};

export type TranscriptionFailureCategory =
  | "configuration"
  | "timeout"
  | "provider_unavailable"
  | "provider_rejected"
  | "malformed_response"
  | "invalid_timestamps";

export class TranscriptionProviderError extends Error {
  readonly category: TranscriptionFailureCategory;
  readonly retryable: boolean;

  constructor(category: TranscriptionFailureCategory, retryable: boolean) {
    super(category);
    this.name = "TranscriptionProviderError";
    this.category = category;
    this.retryable = retryable;
  }
}

type EnvironmentReader = { get(name: string): string | undefined };

export type TranscriptionConfig = {
  mode: "live" | "test";
  runtimeEnvironment: string;
  alias: string;
  resolvedModel: string;
  timeoutMs: number;
  baseUrl?: string;
  apiKey?: string;
};

function runtimeEnv(): EnvironmentReader {
  return Deno.env;
}

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new TranscriptionProviderError("configuration", false);
  }
  return parsed;
}

export function resolveTranscriptionConfig(env: EnvironmentReader = runtimeEnv()): TranscriptionConfig {
  const configuredMode = env.get("TRANSCRIPTION_PROVIDER_MODE");
  const mode = configuredMode ?? "live";
  const runtimeEnvironment = (env.get("RELIC_ENV") ?? "production").toLowerCase();
  const hosted = runtimeEnvironment === "staging" || runtimeEnvironment === "production";
  if (mode !== "live" && mode !== "test") {
    throw new TranscriptionProviderError("configuration", false);
  }
  if (mode === "test" && !["development", "test", "local"].includes(runtimeEnvironment)) {
    throw new TranscriptionProviderError("configuration", false);
  }
  if (hosted && configuredMode !== "live") {
    throw new TranscriptionProviderError("configuration", false);
  }

  const alias = env.get("TRANSCRIPTION_MODEL_ALIAS") ?? env.get("TRANSCRIPTION_MODEL") ?? TRANSCRIPTION_ALIAS;
  const resolvedModel = env.get("TRANSCRIPTION_RESOLVED_MODEL") ?? (hosted ? undefined : alias);
  if (alias !== TRANSCRIPTION_ALIAS || !resolvedModel) {
    throw new TranscriptionProviderError("configuration", false);
  }

  const baseUrl = hosted
    ? env.get("LITELLM_PROXY_URL")
    : env.get("TRANSCRIPTION_PROVIDER_BASE_URL") ?? env.get("LITELLM_PROXY_URL");
  const apiKey = hosted
    ? env.get("LITELLM_PROXY_KEY")
    : env.get("TRANSCRIPTION_PROVIDER_API_KEY") ?? env.get("LITELLM_PROXY_KEY");
  if (mode === "live" && (!baseUrl || !apiKey)) {
    throw new TranscriptionProviderError("configuration", false);
  }

  return {
    mode,
    runtimeEnvironment,
    alias,
    resolvedModel,
    timeoutMs: positiveInteger(env.get("TRANSCRIPTION_TIMEOUT_MS"), 120_000),
    baseUrl: baseUrl?.replace(/\/$/, ""),
    apiKey
  };
}

function finiteNumber(value: unknown, category: TranscriptionFailureCategory) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw new TranscriptionProviderError(category, false);
  }
  return number;
}

function normalizeSegments(body: Record<string, unknown>): TranscriptionSegment[] {
  const rawSegments = Array.isArray(body.segments) ? body.segments : [];
  if (rawSegments.length === 0 && typeof body.text === "string" && body.text.trim()) {
    return [{
      start: 0,
      end: finiteNumber(body.duration ?? 0, "invalid_timestamps"),
      text: body.text.trim(),
      deleted: false,
    }];
  }

  let previousStart = -1;
  return rawSegments.map((value) => {
    const segment = value as Record<string, unknown>;
    const start = finiteNumber(segment.start, "invalid_timestamps");
    const end = finiteNumber(segment.end, "invalid_timestamps");
    const text = typeof segment.text === "string" ? segment.text.trim() : "";
    if (start < previousStart || end < start || !text) {
      throw new TranscriptionProviderError("invalid_timestamps", false);
    }
    previousStart = start;
    return { start, end, text, deleted: false };
  });
}

function retryableStatus(status: number) {
  return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
}

export async function callTranscriptionProvider(
  audio: File,
  options: { config?: TranscriptionConfig; fetchImpl?: typeof fetch; signal?: AbortSignal } = {},
): Promise<TranscriptionResult> {
  const config = options.config ?? resolveTranscriptionConfig();
  if (config.mode === "test") {
    return {
      segments: [{ start: 0, end: 1, text: "Local transcription provider test completed.", deleted: false }],
      alias: config.alias,
      resolvedModel: config.resolvedModel,
      provider: "deterministic-test",
      requestId: null,
      language: "en",
      durationSeconds: 1,
      billable: false,
    };
  }

  const form = new FormData();
  form.set("model", config.alias);
  form.set("response_format", "verbose_json");
  form.set("file", audio);

  const controller = new AbortController();
  const onExternalAbort = () => controller.abort();
  options.signal?.addEventListener("abort", onExternalAbort, { once: true });
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const response = await (options.fetchImpl ?? fetch)(`${config.baseUrl}/audio/transcriptions`, {
      method: "POST",
      headers: { authorization: `Bearer ${config.apiKey}` },
      body: form,
      signal: controller.signal,
    });
    if (!response.ok) {
      const retryable = retryableStatus(response.status);
      throw new TranscriptionProviderError(retryable ? "provider_unavailable" : "provider_rejected", retryable);
    }

    let body: Record<string, unknown>;
    try {
      body = await response.json() as Record<string, unknown>;
    } catch {
      throw new TranscriptionProviderError("malformed_response", false);
    }
    const segments = normalizeSegments(body);
    if (segments.length === 0) {
      throw new TranscriptionProviderError("malformed_response", false);
    }
    const durationSeconds = finiteNumber(
      body.duration ?? Math.max(...segments.map((segment) => segment.end)),
      "invalid_timestamps",
    );

    return {
      segments,
      alias: config.alias,
      resolvedModel: config.resolvedModel,
      provider: response.headers.get("x-litellm-provider") ?? "litellm",
      requestId: response.headers.get("x-request-id"),
      language: typeof body.language === "string" ? body.language : null,
      durationSeconds,
      billable: true,
    };
  } catch (error) {
    if (error instanceof TranscriptionProviderError) throw error;
    if (controller.signal.aborted) throw new TranscriptionProviderError("timeout", true);
    throw new TranscriptionProviderError("provider_unavailable", true);
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener("abort", onExternalAbort);
  }
}

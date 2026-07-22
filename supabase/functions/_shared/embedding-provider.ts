export const EMBEDDING_ALIAS = "relic-embed";
export const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIMENSIONS = 1536;
export const EMBEDDING_MAX_INPUT_CHARS = 24_000;

export type EmbeddingUsage = {
  inputTokens: number | null;
  totalTokens: number | null;
};

export type EmbeddingResult = {
  vector: number[];
  provider: string;
  resolvedModel: string;
  dimensions: number;
  requestId: string | null;
  usage: EmbeddingUsage;
  billable: boolean;
};

export type EmbeddingFailureCategory =
  | "invalid_input"
  | "input_too_large"
  | "configuration"
  | "timeout"
  | "provider_unavailable"
  | "provider_rejected"
  | "malformed_response"
  | "dimension_mismatch";

export class EmbeddingProviderError extends Error {
  readonly category: EmbeddingFailureCategory;
  readonly retryable: boolean;

  constructor(category: EmbeddingFailureCategory, retryable: boolean) {
    super(category);
    this.name = "EmbeddingProviderError";
    this.category = category;
    this.retryable = retryable;
  }
}

type EnvironmentReader = { get(name: string): string | undefined };

export type EmbeddingConfig = {
  mode: "live" | "deterministic";
  runtimeEnvironment: string;
  alias: string;
  expectedModel: string;
  dimensions: number;
  timeoutMs: number;
  baseUrl?: string;
  apiKey?: string;
};

export type EmbeddingCallOptions = {
  config?: EmbeddingConfig;
  env?: EnvironmentReader;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
  testFault?: "timeout" | "malformed" | "dimension_mismatch" | "provider_failure";
};

function runtimeEnv(): EnvironmentReader {
  const deno = (globalThis as typeof globalThis & {
    Deno?: { env: EnvironmentReader };
  }).Deno;
  return deno?.env ?? { get: () => undefined };
}

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new EmbeddingProviderError("configuration", false);
  }
  return parsed;
}

export function resolveEmbeddingConfig(env: EnvironmentReader = runtimeEnv()): EmbeddingConfig {
  const rawMode = env.get("EMBEDDING_PROVIDER_MODE") ?? "live";
  if (rawMode !== "live" && rawMode !== "deterministic") {
    throw new EmbeddingProviderError("configuration", false);
  }

  const runtimeEnvironment = (env.get("RELIC_ENV") ?? "production").toLowerCase();
  if (rawMode === "deterministic" && !["development", "test", "local"].includes(runtimeEnvironment)) {
    throw new EmbeddingProviderError("configuration", false);
  }

  const config: EmbeddingConfig = {
    mode: rawMode,
    runtimeEnvironment,
    alias: env.get("EMBEDDING_MODEL_ALIAS") ?? EMBEDDING_ALIAS,
    expectedModel: env.get("EMBEDDING_RESOLVED_MODEL") ?? EMBEDDING_MODEL,
    dimensions: positiveInteger(env.get("EMBEDDING_DIMENSIONS"), EMBEDDING_DIMENSIONS),
    timeoutMs: positiveInteger(env.get("EMBEDDING_TIMEOUT_MS"), 12_000),
    baseUrl: env.get("EMBEDDING_PROVIDER_BASE_URL") ?? env.get("LITELLM_PROXY_URL"),
    apiKey: env.get("EMBEDDING_PROVIDER_API_KEY") ?? env.get("LITELLM_PROXY_KEY"),
  };

  if (config.dimensions !== EMBEDDING_DIMENSIONS) {
    throw new EmbeddingProviderError("configuration", false);
  }
  if (config.mode === "live" && (!config.baseUrl || !config.apiKey)) {
    throw new EmbeddingProviderError("configuration", false);
  }
  return config;
}

export function normalizeEmbeddingInput(input: unknown): string {
  if (typeof input !== "string") {
    throw new EmbeddingProviderError("invalid_input", false);
  }
  const normalized = input
    .normalize("NFKC")
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/[\t ]+/g, " ").replace(/\n/g, " ").trim())
    .filter(Boolean)
    .join("\n\n");
  if (!normalized) {
    throw new EmbeddingProviderError("invalid_input", false);
  }
  if (normalized.length > EMBEDDING_MAX_INPUT_CHARS) {
    throw new EmbeddingProviderError("input_too_large", false);
  }
  return normalized;
}

const CONCEPT_ALIASES: Record<string, string> = {
  npc: "character", person: "character", hero: "character", villain: "character",
  town: "place", city: "place", village: "place", fortress: "place", castle: "place",
  guild: "faction", order: "faction", organization: "faction", clan: "faction",
  relic: "artifact", item: "artifact", weapon: "artifact", object: "artifact",
  quest: "thread", mystery: "thread", objective: "thread", goal: "thread",
  hidden: "secret", concealed: "secret", covert: "secret",
  ocean: "sea", maritime: "sea", nautical: "sea",
  submerged: "underwater", drowned: "underwater", flooded: "underwater",
  door: "gate", portal: "gate", doorway: "gate",
  stronghold: "fortress", citadel: "fortress", keep: "fortress",
  ancient: "old", forgotten: "old", historic: "old",
  monarch: "ruler", king: "ruler", queen: "ruler",
  physician: "healer", doctor: "healer", medic: "healer",
  thief: "rogue", smuggler: "rogue", burglar: "rogue",
  chief: "leader", commander: "leader", captain: "leader",
  sword: "blade", saber: "blade", weapon: "blade",
  temple: "shrine", sanctuary: "shrine", chapel: "shrine",
  rebellion: "revolt", uprising: "revolt", insurrection: "revolt",
  poison: "venom", toxin: "venom", poisonous: "venom",
  ghost: "specter", spirit: "specter", apparition: "specter",
  mountain: "alpine", peak: "alpine", summit: "alpine",
  forest: "woodland", woods: "woodland", grove: "woodland",
  map: "chart", cartography: "chart", atlas: "chart",
  night: "nocturnal", dark: "nocturnal", moonlit: "nocturnal",
  sun: "solar", daylight: "solar", dawn: "solar",
  merchant: "trader", commerce: "trader", vendor: "trader",
};

function hashFeature(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function featureTokens(input: string): string[] {
  const words = input.toLocaleLowerCase("en")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => CONCEPT_ALIASES[word] ?? word);
  const features = [...words];
  for (let index = 0; index + 1 < words.length; index += 1) {
    features.push(`${words[index]}_${words[index + 1]}`);
  }
  for (const word of words) {
    const padded = `^${word}$`;
    for (let index = 0; index + 2 < padded.length; index += 1) {
      features.push(`~${padded.slice(index, index + 3)}`);
    }
  }
  return features;
}

export function deterministicEmbedding(input: unknown, dimensions = EMBEDDING_DIMENSIONS): number[] {
  const normalized = normalizeEmbeddingInput(input);
  if (!Number.isInteger(dimensions) || dimensions <= 0) {
    throw new EmbeddingProviderError("configuration", false);
  }
  const vector = new Array<number>(dimensions).fill(0);
  for (const feature of featureTokens(normalized)) {
    const hash = hashFeature(feature);
    const index = hash % dimensions;
    vector[index] += (hash & 0x80000000) === 0 ? 1 : -1;
  }
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (!Number.isFinite(magnitude) || magnitude === 0) {
    throw new EmbeddingProviderError("invalid_input", false);
  }
  return vector.map((value) => value / magnitude);
}

export function validateEmbeddingVector(value: unknown, dimensions: number): number[] {
  if (!Array.isArray(value)) {
    throw new EmbeddingProviderError("malformed_response", false);
  }
  if (value.length !== dimensions) {
    throw new EmbeddingProviderError("dimension_mismatch", false);
  }
  const vector = value.map(Number);
  if (vector.some((item) => !Number.isFinite(item))) {
    throw new EmbeddingProviderError("malformed_response", false);
  }
  return vector;
}

function safeTokenCount(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function retryableStatus(status: number): boolean {
  return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
}

export async function callEmbeddingProvider(
  input: unknown,
  options: EmbeddingCallOptions = {},
): Promise<EmbeddingResult> {
  const normalized = normalizeEmbeddingInput(input);
  const config = options.config ?? resolveEmbeddingConfig(options.env);

  if (options.testFault === "timeout") {
    throw new EmbeddingProviderError("timeout", true);
  }
  if (options.testFault === "provider_failure") {
    throw new EmbeddingProviderError("provider_unavailable", true);
  }

  if (config.mode === "deterministic") {
    let vector: unknown = deterministicEmbedding(normalized, config.dimensions);
    if (options.testFault === "malformed") vector = new Array(config.dimensions).fill(Number.NaN);
    if (options.testFault === "dimension_mismatch") vector = (vector as number[]).slice(1);
    return {
      vector: validateEmbeddingVector(vector, config.dimensions),
      provider: "deterministic-development-test",
      resolvedModel: config.expectedModel,
      dimensions: config.dimensions,
      requestId: null,
      usage: { inputTokens: null, totalTokens: null },
      billable: false,
    };
  }

  const controller = new AbortController();
  const onExternalAbort = () => controller.abort();
  options.signal?.addEventListener("abort", onExternalAbort, { once: true });
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await (options.fetchImpl ?? fetch)(`${config.baseUrl!.replace(/\/$/, "")}/embeddings`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${config.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ model: config.alias, input: normalized, dimensions: config.dimensions }),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new EmbeddingProviderError(
        retryableStatus(response.status) ? "provider_unavailable" : "provider_rejected",
        retryableStatus(response.status),
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await response.json() as Record<string, unknown>;
    } catch {
      throw new EmbeddingProviderError("malformed_response", false);
    }
    const first = Array.isArray(body.data) ? body.data[0] as Record<string, unknown> | undefined : undefined;
    let vector: unknown = first?.embedding;
    if (options.testFault === "malformed") vector = { invalid: true };
    if (options.testFault === "dimension_mismatch" && Array.isArray(vector)) vector = vector.slice(1);
    const usage = (body.usage ?? {}) as Record<string, unknown>;
    const providerReportedModel = typeof body.model === "string" ? body.model.trim() : "";
    // LiteLLM may echo the public alias rather than the backing provider model.
    // The configured resolved model remains the provenance value in that case.
    const resolvedModel = providerReportedModel && providerReportedModel !== config.alias
      ? providerReportedModel
      : config.expectedModel;
    return {
      vector: validateEmbeddingVector(vector, config.dimensions),
      provider: response.headers.get("x-litellm-provider") ?? "litellm",
      resolvedModel,
      dimensions: config.dimensions,
      requestId: response.headers.get("x-request-id"),
      usage: {
        inputTokens: safeTokenCount(usage.prompt_tokens),
        totalTokens: safeTokenCount(usage.total_tokens),
      },
      billable: true,
    };
  } catch (error) {
    if (error instanceof EmbeddingProviderError) throw error;
    if (controller.signal.aborted) throw new EmbeddingProviderError("timeout", true);
    throw new EmbeddingProviderError("provider_unavailable", true);
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener("abort", onExternalAbort);
  }
}

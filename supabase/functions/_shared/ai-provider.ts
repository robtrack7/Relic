import type { AiProviderRequest, AiProviderResult } from "./ai-contracts.ts";

type EnvironmentReader = { get(name: string): string | undefined };

export type AiProviderConfig = {
  mode: "live" | "test";
  runtimeEnvironment: string;
  alias: "relic-fast" | "relic-balanced" | "relic-deep";
  resolvedModel: string;
  timeoutMs: number;
  maxOutputTokens: number;
  baseUrl?: string;
  apiKey?: string;
};

export type AiFailureCategory =
  | "configuration"
  | "timeout"
  | "provider_unavailable"
  | "provider_rejected"
  | "malformed_response"
  | "model_mismatch";

export class AiProviderError extends Error {
  readonly category: AiFailureCategory;
  readonly retryable: boolean;

  constructor(category: AiFailureCategory, retryable: boolean) {
    super(category);
    this.name = "AiProviderError";
    this.category = category;
    this.retryable = retryable;
  }
}

function envKey(prefix: string, alias: string) {
  return `${prefix}_${alias.toUpperCase().replaceAll("-", "_")}`;
}

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new AiProviderError("configuration", false);
  return parsed;
}

export function resolveAiProviderConfig(modelTier: string, env: EnvironmentReader = Deno.env): AiProviderConfig {
  if (!new Set(["relic-fast", "relic-balanced", "relic-deep"]).has(modelTier)) {
    throw new AiProviderError("configuration", false);
  }
  const alias = modelTier as AiProviderConfig["alias"];
  const configuredMode = env.get("AI_PROVIDER_MODE");
  const mode = configuredMode ?? "live";
  const runtimeEnvironment = (env.get("RELIC_ENV") ?? "production").toLowerCase();
  const hosted = runtimeEnvironment === "staging" || runtimeEnvironment === "production";
  if (mode !== "live" && mode !== "test") throw new AiProviderError("configuration", false);
  if (mode === "test" && !["development", "test", "local"].includes(runtimeEnvironment)) {
    throw new AiProviderError("configuration", false);
  }
  if (hosted && configuredMode !== "live") throw new AiProviderError("configuration", false);

  const configuredAlias = env.get(envKey("AI_MODEL", alias)) ?? alias;
  const resolvedModel = env.get(envKey("AI_RESOLVED_MODEL", alias)) ?? (hosted ? undefined : configuredAlias);
  if (configuredAlias !== alias || !resolvedModel) throw new AiProviderError("configuration", false);

  const baseUrl = hosted
    ? env.get("LITELLM_PROXY_URL")
    : env.get("AI_PROVIDER_BASE_URL") ?? env.get("LITELLM_PROXY_URL");
  const apiKey = hosted
    ? env.get("LITELLM_PROXY_KEY")
    : env.get("AI_PROVIDER_API_KEY") ?? env.get("LITELLM_PROXY_KEY");
  if (mode === "live" && (!baseUrl || !apiKey)) throw new AiProviderError("configuration", false);

  return {
    mode,
    runtimeEnvironment,
    alias,
    resolvedModel,
    timeoutMs: positiveInteger(env.get("AI_TIMEOUT_MS"), 140_000),
    maxOutputTokens: positiveInteger(env.get(envKey("AI_MAX_OUTPUT_TOKENS", alias)), 1_800),
    baseUrl: baseUrl?.replace(/\/$/, ""),
    apiKey
  };
}

function testOutputFor(taskName: string, allowedSourceIds: string[]): Record<string, unknown> {
  if (taskName === "answer_saga_question") {
    return { answer: "No approved context was available.", citations: [], confidence_reason: "ambiguous_source", no_answer: true };
  }
  if (taskName === "compose_prep_briefing") {
    return { body: "No prior canon was available for a detailed briefing.", bullets: ["Review current prep.", "Add canon context.", "Proceed manually."], sources: [], confidence_reason: "ambiguous_source" };
  }
  if (taskName === "generate_session_prep") return { suggestions: [], summary: "No suggestions generated." };
  if (taskName === "synthesize_session") {
    return { proposed_entity_changes: [], loose_threads: [], next_prep_implications: [], stub_evidence_flags: [] };
  }
  if (taskName === "propose_thread_complication") {
    return {
      complications: [{
        id: "deterministic-complication-1",
        summary: "A cautious complication",
        narrative: "A bounded complication raises the stakes without resolving the Thread.",
        entities_implicated: [],
        escalation_level: "low",
        sources: allowedSourceIds.slice(0, 1)
      }],
      confidence_reason: allowedSourceIds.length > 0 ? "single_clear_segment" : "ambiguous_source"
    };
  }
  return { suggestions: [], confidence_reason: "ambiguous_source" };
}

function retryableStatus(status: number) {
  return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
}

function modelMatches(reported: string, expected: string, alias: string) {
  const expectedTail = expected.split("/").at(-1);
  return reported === alias || reported === expected || reported === expectedTail;
}

export async function callAiProvider(
  request: AiProviderRequest,
  options: { config?: AiProviderConfig; fetchImpl?: typeof fetch; signal?: AbortSignal } = {},
): Promise<AiProviderResult> {
  const config = options.config ?? resolveAiProviderConfig(request.taskRun.model_tier);
  if (config.mode === "test") {
    return {
      output: testOutputFor(request.taskRun.task_name, request.taskRun.allowed_source_ids),
      alias: config.alias,
      resolvedModel: config.resolvedModel,
      provider: "deterministic-test",
      requestId: null,
      tokensIn: 0,
      tokensOut: 0,
      costEstimateUsd: 0,
      billable: false
    };
  }

  const prompt = {
    task: request.taskRun.task_name,
    prompt_version: request.taskRun.prompt_version,
    input: request.taskRun.input_payload,
    retrieval_context: request.retrievalContext,
    repair: request.repair ?? null
  };
  const controller = new AbortController();
  const onExternalAbort = () => controller.abort();
  options.signal?.addEventListener("abort", onExternalAbort, { once: true });
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const response = await (options.fetchImpl ?? fetch)(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${config.apiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: config.alias,
        max_completion_tokens: config.maxOutputTokens,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "Return only valid JSON for the requested Relic AI task. Do not write canon." },
          { role: "user", content: JSON.stringify(prompt) }
        ]
      }),
      signal: controller.signal
    });
    if (!response.ok) {
      const retryable = retryableStatus(response.status);
      throw new AiProviderError(retryable ? "provider_unavailable" : "provider_rejected", retryable);
    }

    let body: Record<string, unknown>;
    try {
      body = await response.json() as Record<string, unknown>;
    } catch {
      throw new AiProviderError("malformed_response", false);
    }
    const reportedModel = typeof body.model === "string" ? body.model.trim() : "";
    if (!reportedModel || !modelMatches(reportedModel, config.resolvedModel, config.alias)) {
      throw new AiProviderError("model_mismatch", false);
    }
    const choices = Array.isArray(body.choices) ? body.choices : [];
    const firstChoice = typeof choices[0] === "object" && choices[0] !== null
      ? choices[0] as Record<string, unknown> : {};
    const message = typeof firstChoice.message === "object" && firstChoice.message !== null
      ? firstChoice.message as Record<string, unknown> : {};
    const usage = typeof body.usage === "object" && body.usage !== null
      ? body.usage as Record<string, unknown> : {};
    return {
      output: message.content,
      alias: config.alias,
      resolvedModel: config.resolvedModel,
      provider: response.headers.get("x-litellm-provider") ?? "litellm",
      requestId: response.headers.get("x-request-id"),
      tokensIn: typeof usage.prompt_tokens === "number" ? usage.prompt_tokens : undefined,
      tokensOut: typeof usage.completion_tokens === "number" ? usage.completion_tokens : undefined,
      costEstimateUsd: typeof usage.cost === "number" ? usage.cost : undefined,
      billable: true
    };
  } catch (error) {
    if (error instanceof AiProviderError) throw error;
    if (controller.signal.aborted) throw new AiProviderError("timeout", true);
    throw new AiProviderError("provider_unavailable", true);
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener("abort", onExternalAbort);
  }
}

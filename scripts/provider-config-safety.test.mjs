import test from "node:test";
import assert from "node:assert/strict";
import {
  callEmbeddingProvider,
  EmbeddingProviderError,
  resolveEmbeddingConfig
} from "../supabase/functions/_shared/embedding-provider.ts";
import {
  AiProviderError,
  callAiProvider,
  resolveAiProviderConfig
} from "../supabase/functions/_shared/ai-provider.ts";
import {
  resolveTranscriptionConfig,
  TranscriptionProviderError
} from "../supabase/functions/_shared/transcription-provider.ts";

function environment(values) {
  return { get: (name) => values[name] };
}

test("hosted deterministic provider modes are rejected", () => {
  assert.throws(
    () => resolveEmbeddingConfig(environment({ RELIC_ENV: "staging", EMBEDDING_PROVIDER_MODE: "deterministic" })),
    (error) => error instanceof EmbeddingProviderError && error.category === "configuration"
  );
  assert.throws(
    () => resolveTranscriptionConfig(environment({ RELIC_ENV: "production", TRANSCRIPTION_PROVIDER_MODE: "test" })),
    (error) => error instanceof TranscriptionProviderError && error.category === "configuration"
  );
  assert.throws(
    () => resolveAiProviderConfig("relic-deep", environment({ RELIC_ENV: "staging", AI_PROVIDER_MODE: "test" })),
    (error) => error instanceof AiProviderError && error.category === "configuration"
  );
});

test("hosted provider aliases and resolved models must be explicit", () => {
  assert.throws(
    () => resolveEmbeddingConfig(environment({
      RELIC_ENV: "staging", EMBEDDING_PROVIDER_MODE: "live", LITELLM_PROXY_URL: "https://proxy.test", LITELLM_PROXY_KEY: "server-only"
    })),
    (error) => error instanceof EmbeddingProviderError && error.category === "configuration"
  );
  assert.throws(
    () => resolveTranscriptionConfig(environment({
      RELIC_ENV: "staging", TRANSCRIPTION_PROVIDER_MODE: "live", LITELLM_PROXY_URL: "https://proxy.test", LITELLM_PROXY_KEY: "server-only"
    })),
    (error) => error instanceof TranscriptionProviderError && error.category === "configuration"
  );
  assert.throws(
    () => resolveAiProviderConfig("relic-balanced", environment({
      RELIC_ENV: "staging", AI_PROVIDER_MODE: "live", LITELLM_PROXY_URL: "https://proxy.test", LITELLM_PROXY_KEY: "server-only"
    })),
    (error) => error instanceof AiProviderError && error.category === "configuration"
  );
});

test("valid staging configuration retains only canonical aliases", () => {
  const embedding = resolveEmbeddingConfig(environment({
    RELIC_ENV: "staging", EMBEDDING_PROVIDER_MODE: "live", EMBEDDING_MODEL_ALIAS: "relic-embed",
    EMBEDDING_RESOLVED_MODEL: "text-embedding-3-small", EMBEDDING_DIMENSIONS: "1536",
    LITELLM_PROXY_URL: "https://proxy.test", LITELLM_PROXY_KEY: "server-only"
  }));
  const transcription = resolveTranscriptionConfig(environment({
    RELIC_ENV: "staging", TRANSCRIPTION_PROVIDER_MODE: "live", TRANSCRIPTION_MODEL_ALIAS: "relic-transcribe",
    TRANSCRIPTION_RESOLVED_MODEL: "openai/whisper-1", LITELLM_PROXY_URL: "https://proxy.test", LITELLM_PROXY_KEY: "server-only"
  }));
  const ai = resolveAiProviderConfig("relic-balanced", environment({
    RELIC_ENV: "staging", AI_PROVIDER_MODE: "live", AI_MODEL_RELIC_BALANCED: "relic-balanced",
    AI_RESOLVED_MODEL_RELIC_BALANCED: "provider/model-balanced", LITELLM_PROXY_URL: "https://proxy.test", LITELLM_PROXY_KEY: "server-only"
  }));

  assert.equal(embedding.alias, "relic-embed");
  assert.equal(transcription.alias, "relic-transcribe");
  assert.equal(ai.alias, "relic-balanced");
});

test("hosted transcription cannot silently fall back to generic AI credentials", () => {
  assert.throws(
    () => resolveTranscriptionConfig(environment({
      RELIC_ENV: "staging", TRANSCRIPTION_PROVIDER_MODE: "live", TRANSCRIPTION_MODEL_ALIAS: "relic-transcribe",
      TRANSCRIPTION_RESOLVED_MODEL: "openai/whisper-1", AI_PROVIDER_BASE_URL: "https://wrong.test", AI_PROVIDER_API_KEY: "wrong"
    })),
    (error) => error instanceof TranscriptionProviderError && error.category === "configuration"
  );
});

test("embedding provider rejects an unexpected hosted model", async () => {
  const config = {
    mode: "live", runtimeEnvironment: "staging", alias: "relic-embed",
    expectedModel: "text-embedding-3-small", dimensions: 1536, timeoutMs: 1000,
    baseUrl: "https://proxy.test", apiKey: "server-only"
  };
  await assert.rejects(
    callEmbeddingProvider("safe fixture", {
      config,
      fetchImpl: async () => new Response(JSON.stringify({
        model: "unexpected-embedding-model", data: [{ embedding: new Array(1536).fill(0.01) }], usage: {}
      }), { status: 200, headers: { "content-type": "application/json" } })
    }),
    (error) => error instanceof EmbeddingProviderError && error.category === "model_mismatch"
  );
});

test("AI provider rejects an unexpected hosted model", async () => {
  const taskRun = {
    id: "e2000000-0000-0000-0000-000000000001", workspace_id: "e2000000-0000-0000-0000-000000000002",
    world_id: "e2000000-0000-0000-0000-000000000003", saga_id: "e2000000-0000-0000-0000-000000000004",
    session_id: null, gm_id: "e2000000-0000-0000-0000-000000000005", task_name: "propose_thread_complication",
    prompt_version: "propose_thread_complication@1.0.0", quota_tier: "light", ai_credits: 1,
    model_tier: "relic-balanced", resolved_model: null, resolved_provider: null,
    retrieval_profile: "sanctum_grounding", source_policy: "canon_only", output_mode: "ephemeral",
    input_payload: {}, allowed_source_ids: []
  };
  await assert.rejects(
    callAiProvider({ taskRun, retrievalContext: [] }, {
      config: {
        mode: "live", runtimeEnvironment: "staging", alias: "relic-balanced",
        resolvedModel: "provider/model-balanced", timeoutMs: 1000, maxOutputTokens: 1800,
        baseUrl: "https://proxy.test", apiKey: "server-only"
      },
      fetchImpl: async () => new Response(JSON.stringify({
        model: "provider/unexpected", choices: [{ message: { content: "{}" } }], usage: {}
      }), { status: 200, headers: { "content-type": "application/json" } })
    }),
    (error) => error instanceof AiProviderError && error.category === "model_mismatch"
  );
});

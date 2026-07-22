import test from "node:test";
import assert from "node:assert/strict";

import {
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MAX_INPUT_CHARS,
  EmbeddingProviderError,
  callEmbeddingProvider,
  deterministicEmbedding,
  normalizeEmbeddingInput,
  resolveEmbeddingConfig,
} from "../supabase/functions/_shared/embedding-provider.ts";

const deterministicConfig = {
  mode: "deterministic",
  runtimeEnvironment: "test",
  alias: "relic-embed",
  expectedModel: "text-embedding-3-small",
  dimensions: EMBEDDING_DIMENSIONS,
  timeoutMs: 50,
};

function expectProviderError(error, category, retryable) {
  assert.ok(error instanceof EmbeddingProviderError);
  assert.equal(error.category, category);
  assert.equal(error.retryable, retryable);
  return true;
}

test("deterministic embedding is stable after shared normalization", () => {
  const first = deterministicEmbedding("  The Crown\r\n\r\nkeeps   the old sea gate. ");
  const second = deterministicEmbedding("The Crown\n\nkeeps the old sea gate.");
  assert.deepEqual(first, second);
  assert.equal(normalizeEmbeddingInput(" A\r\nB  "), "A B");
});

test("changed deterministic input produces a changed vector", () => {
  const first = deterministicEmbedding("The healer guards the western village.");
  const second = deterministicEmbedding("The smuggler hides beneath the eastern fortress.");
  assert.notDeepEqual(first, second);
});

test("deterministic embedding uses production dimensions and finite values", async () => {
  const result = await callEmbeddingProvider("An old monarch rules beside the sea.", { config: deterministicConfig });
  assert.equal(result.vector.length, EMBEDDING_DIMENSIONS);
  assert.equal(result.dimensions, EMBEDDING_DIMENSIONS);
  assert.equal(result.billable, false);
  assert.equal(result.provider, "deterministic-development-test");
  assert.ok(result.vector.every(Number.isFinite));
});

test("empty, invalid, and oversized input fail terminally", async () => {
  for (const input of ["  \r\n ", null, "x".repeat(EMBEDDING_MAX_INPUT_CHARS + 1)]) {
    await assert.rejects(
      () => callEmbeddingProvider(input, { config: deterministicConfig }),
      (error) => expectProviderError(
        error,
        typeof input === "string" && input.length > EMBEDDING_MAX_INPUT_CHARS ? "input_too_large" : "invalid_input",
        false,
      ),
    );
  }
});

test("dimension mismatch and malformed responses fail terminally", async () => {
  await assert.rejects(
    () => callEmbeddingProvider("valid input", { config: deterministicConfig, testFault: "dimension_mismatch" }),
    (error) => expectProviderError(error, "dimension_mismatch", false),
  );
  await assert.rejects(
    () => callEmbeddingProvider("valid input", { config: deterministicConfig, testFault: "malformed" }),
    (error) => expectProviderError(error, "malformed_response", false),
  );
});

test("timeout and provider outage are retryable without exposing internals", async () => {
  for (const [fault, category] of [["timeout", "timeout"], ["provider_failure", "provider_unavailable"]]) {
    await assert.rejects(
      () => callEmbeddingProvider("valid input", { config: deterministicConfig, testFault: fault }),
      (error) => {
        expectProviderError(error, category, true);
        assert.equal(error.message, category);
        return true;
      },
    );
  }
});

test("live provider response shape and usage are validated", async () => {
  const config = {
    ...deterministicConfig,
    mode: "live",
    runtimeEnvironment: "production",
    baseUrl: "https://litellm.invalid/v1",
    apiKey: "test-value-not-a-real-secret",
  };
  const fetchImpl = async () => new Response(JSON.stringify({
    data: [{ embedding: deterministicEmbedding("valid input") }],
    model: "text-embedding-3-small",
    usage: { prompt_tokens: 3, total_tokens: 3 },
  }), { status: 200, headers: { "content-type": "application/json", "x-request-id": "request-1" } });
  const result = await callEmbeddingProvider("valid input", { config, fetchImpl });
  assert.equal(result.billable, true);
  assert.equal(result.requestId, "request-1");
  assert.deepEqual(result.usage, { inputTokens: 3, totalTokens: 3 });

  const aliasResult = await callEmbeddingProvider("valid input", {
    config,
    fetchImpl: async () => new Response(JSON.stringify({
      data: [{ embedding: deterministicEmbedding("valid input") }],
      model: "relic-embed",
      usage: { prompt_tokens: 3, total_tokens: 3 },
    }), { status: 200, headers: { "content-type": "application/json" } }),
  });
  assert.equal(aliasResult.resolvedModel, "text-embedding-3-small");

  await assert.rejects(
    () => callEmbeddingProvider("valid input", {
      config,
      fetchImpl: async () => new Response("not-json", { status: 200 }),
    }),
    (error) => expectProviderError(error, "malformed_response", false),
  );
});

test("deterministic mode is never silently enabled in production", () => {
  const env = { get: (name) => ({
    EMBEDDING_PROVIDER_MODE: "deterministic",
    RELIC_ENV: "production",
  })[name] };
  assert.throws(
    () => resolveEmbeddingConfig(env),
    (error) => expectProviderError(error, "configuration", false),
  );
});

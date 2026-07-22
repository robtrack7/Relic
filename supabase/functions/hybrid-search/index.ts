import { jsonResponse } from "../_shared/http.ts";
import { requireInternalAuth } from "../_shared/internal-auth.ts";
import { createScopedClient } from "../_shared/scoped-client.ts";
import { callEmbeddingProvider, EmbeddingProviderError } from "../_shared/embedding-provider.ts";
import { logRuntimeEvent } from "../_shared/worker.ts";

type SearchRequest = {
  gm_user_id?: string;
  workspace_id?: string;
  world_id?: string;
  saga_id?: string;
  query_text?: string;
  top_k?: number;
  include_world_canon?: boolean;
};

async function safeQueryHash(query: string) {
  const bytes = new TextEncoder().encode(query);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).slice(0, 8).map((value) => value.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  const authFailure = requireInternalAuth(req);
  if (authFailure) return authFailure;
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, { status: 405 });

  let body: SearchRequest;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "invalid_request" }, { status: 400 });
  }

  const query = body.query_text?.trim() ?? "";
  const topK = Math.max(1, Math.min(Number(body.top_k ?? 12), 50));
  if (!body.gm_user_id || !body.workspace_id || !body.world_id || !body.saga_id || !query || query.length > 2_000) {
    return jsonResponse({ error: "invalid_request" }, { status: 400 });
  }

  const queryHash = await safeQueryHash(query);
  const providerStartedAt = performance.now();
  const scoped = await createScopedClient(body.gm_user_id, "hybrid_search");

  const lexicalFallback = async (category: string, providerLatencyMs: number) => {
    const databaseStartedAt = performance.now();
    const { data, error } = await scoped.rpc("search_for_ui", {
      workspace_id: body.workspace_id,
      world_id: body.world_id,
      saga_id: body.saga_id,
      query_text: query,
      surface: "sanctum",
      top_k: topK,
      include_archived: false,
      literal_only: true,
      include_world_canon: body.include_world_canon ?? true,
    });
    const databaseLatencyMs = Math.round(performance.now() - databaseStartedAt);
    logRuntimeEvent("hybrid_search_fallback", {
      query_hash: queryHash,
      workspace_id: body.workspace_id,
      world_id: body.world_id,
      saga_id: body.saga_id,
      category,
      provider_latency_ms: Math.round(providerLatencyMs),
      database_latency_ms: databaseLatencyMs,
    });
    if (error) return jsonResponse({ error: "search_unavailable" }, { status: 503 });
    return jsonResponse({ results: data ?? [], retrieval_mode: "lexical_fallback" });
  };

  try {
    const embedding = await callEmbeddingProvider(query);
    const providerLatencyMs = performance.now() - providerStartedAt;
    const databaseStartedAt = performance.now();
    const { data, error } = await scoped.rpc("search_for_ui_hybrid", {
      workspace_id: body.workspace_id,
      world_id: body.world_id,
      saga_id: body.saga_id,
      query_text: query,
      query_embedding: JSON.stringify(embedding.vector),
      top_k: topK,
      include_archived: false,
      include_world_canon: body.include_world_canon ?? true,
    });
    const databaseLatencyMs = Math.round(performance.now() - databaseStartedAt);
    if (error) return lexicalFallback("vector_unavailable", providerLatencyMs);
    logRuntimeEvent("hybrid_search_complete", {
      query_hash: queryHash,
      workspace_id: body.workspace_id,
      world_id: body.world_id,
      saga_id: body.saga_id,
      provider: embedding.provider,
      model: embedding.resolvedModel,
      provider_latency_ms: Math.round(providerLatencyMs),
      database_latency_ms: databaseLatencyMs,
      result_count: data?.length ?? 0,
    });
    return jsonResponse({ results: data ?? [], retrieval_mode: "hybrid" });
  } catch (error) {
    const category = error instanceof EmbeddingProviderError ? error.category : "provider_unavailable";
    return lexicalFallback(category, performance.now() - providerStartedAt);
  }
});

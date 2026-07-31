import { jsonResponse } from "../_shared/http.ts";
import { requireInternalAuth } from "../_shared/internal-auth.ts";
import { createScopedClient } from "../_shared/scoped-client.ts";
import { callEmbeddingProvider, EmbeddingProviderError } from "../_shared/embedding-provider.ts";
import { recordProviderPipelineEvent } from "../_shared/observability.ts";

type SearchRequest = {
  gm_user_id?: string;
  workspace_id?: string;
  world_id?: string;
  saga_id?: string;
  query_text?: string;
  task_profile?: string;
  session_id?: string;
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
  const taskProfile = body.task_profile?.trim() ?? "";
  const topK = Math.max(1, Math.min(Number(body.top_k ?? 12), 50));
  if (!body.gm_user_id || !body.workspace_id || !body.world_id || !body.saga_id || !query || query.length > 2_000) {
    return jsonResponse({ error: "invalid_request" }, { status: 400 });
  }
  const allowedTaskProfiles = new Set([
    "answer_saga_question",
    "compose_prep_briefing",
    "generate_session_prep",
    "propose_scene_beats",
    "propose_thread_complication",
    "propose_npc_for_scene",
    "propose_quick_stub_fleshing",
    "draft_entity_from_prompt"
  ]);
  if (taskProfile && !allowedTaskProfiles.has(taskProfile)) {
    return jsonResponse({ error: "invalid_task_profile" }, { status: 400 });
  }

  const queryHash = await safeQueryHash(query);
  const providerStartedAt = performance.now();
  const scoped = await createScopedClient(body.gm_user_id, "hybrid_search", body.saga_id);

  const taskRetrieval = async (queryEmbedding?: number[]) => {
    const filters: Record<string, string> = {};
    if (queryEmbedding) filters.query_embedding = JSON.stringify(queryEmbedding);
    if (taskProfile === "propose_quick_stub_fleshing" && body.session_id) {
      filters.session_id = body.session_id;
    }
    const strict = await scoped.rpc("retrieve_for_task", {
      workspace_id: body.workspace_id,
      world_id: body.world_id,
      saga_id: body.saga_id,
      era_id: null,
      query_text: query,
      task_profile: taskProfile,
      filters,
      top_k: topK,
    });
    if (strict.error || (strict.data?.length ?? 0) > 0) {
      return { ...strict, relaxed: false };
    }
    if (taskProfile !== "answer_saga_question") return { ...strict, relaxed: false };
    const relaxed = await scoped.rpc("retrieve_for_task_relaxed", {
      workspace_id: body.workspace_id,
      world_id: body.world_id,
      saga_id: body.saga_id,
      query_text: query,
      task_profile: taskProfile,
      top_k: topK,
    });
    return { ...relaxed, relaxed: (relaxed.data?.length ?? 0) > 0 };
  };

  const lexicalFallback = async (category: string, providerLatencyMs: number) => {
    const databaseStartedAt = performance.now();
    const { data, error } = taskProfile
      ? await taskRetrieval()
      : await scoped.rpc("search_for_ui", {
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
    await recordProviderPipelineEvent({
      eventName: "lexical_fallback_activated", severity: "warn", workerType: "hybrid_search",
      workspaceId: body.workspace_id, worldId: body.world_id, sagaId: body.saga_id,
      idempotencyIdentifier: queryHash, providerAlias: "relic-embed",
      providerLatencyMs: Math.round(providerLatencyMs), endToEndLatencyMs: databaseLatencyMs,
      state: "fallback", errorCategory: category, fallbackPath: "lexical_search_for_ui",
      safeMetadata: {
        retrieval_mode: "lexical_fallback",
        retrieval_surface: taskProfile ? "task_profile" : "ui",
        result_count: data?.length ?? 0
      }
    }).catch(() => undefined);
    if (error) return jsonResponse({ error: "search_unavailable" }, { status: 503 });
    return jsonResponse({ results: data ?? [], retrieval_mode: "lexical_fallback" });
  };

  try {
    const embedding = await callEmbeddingProvider(query);
    const providerLatencyMs = performance.now() - providerStartedAt;
    const databaseStartedAt = performance.now();
    const retrieval = taskProfile
      ? await taskRetrieval(embedding.vector)
      : await scoped.rpc("search_for_ui_hybrid", {
        workspace_id: body.workspace_id,
        world_id: body.world_id,
        saga_id: body.saga_id,
        query_text: query,
        query_embedding: JSON.stringify(embedding.vector),
        top_k: topK,
        include_archived: false,
        include_world_canon: body.include_world_canon ?? true,
      });
    const { data, error } = retrieval;
    const databaseLatencyMs = Math.round(performance.now() - databaseStartedAt);
    if (error) return lexicalFallback("vector_unavailable", providerLatencyMs);
    const retrievalMode = "relaxed" in retrieval && retrieval.relaxed ? "lexical_fallback" : "hybrid";
    await recordProviderPipelineEvent({
      eventName: "hybrid_search_completed", workerType: "hybrid_search",
      workspaceId: body.workspace_id, worldId: body.world_id, sagaId: body.saga_id,
      idempotencyIdentifier: queryHash, providerAlias: embedding.alias,
      resolvedModel: embedding.resolvedModel, provider: embedding.provider,
      providerLatencyMs: Math.round(providerLatencyMs), endToEndLatencyMs: databaseLatencyMs,
      state: "success", inputUnits: query.length, inputUnitType: "character",
      outputUnits: data?.length ?? 0, outputUnitType: "result",
      safeMetadata: {
        retrieval_mode: retrievalMode,
        retrieval_surface: taskProfile ? "task_profile" : "ui",
        result_count: data?.length ?? 0
      }
    }).catch(() => undefined);
    return jsonResponse({ results: data ?? [], retrieval_mode: retrievalMode });
  } catch (error) {
    const category = error instanceof EmbeddingProviderError ? error.category : "provider_unavailable";
    return lexicalFallback(category, performance.now() - providerStartedAt);
  }
});

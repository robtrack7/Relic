import { errorResponse, jsonResponse } from "../_shared/http.ts";
import { requireInternalAuth } from "../_shared/internal-auth.ts";
import { createScopedClient } from "../_shared/scoped-client.ts";
import { createServiceClient } from "../_shared/service-client.ts";
import { recordProviderPipelineEvent } from "../_shared/observability.ts";

type GuideSubmitRequest = {
  gm_user_id?: string;
  workspace_id?: string;
  world_id?: string;
  saga_id?: string;
  thread_id?: string | null;
  turn_id?: string;
  idempotency_key?: string;
  question?: string;
  selected_import_source_ids?: string[];
};

type GuideSearchResult = {
  source_id?: string | null;
  source_entity_type?: string | null;
  source_entity_id?: string | null;
};

type LoomRetrievalPlan = {
  strategy?: "deterministic_read" | "exact" | "structured" | "lexical" | "hybrid";
  provider_required?: boolean;
  reason?: string;
  source_ids?: unknown[];
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeQuestion(value: string) {
  return value.normalize("NFKC").replace(/\r\n?/g, "\n").replace(/[\t ]+/g, " ").trim();
}

async function safeQuestionHash(question: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(question));
  return Array.from(new Uint8Array(digest)).slice(0, 8)
    .map((value) => value.toString(16).padStart(2, "0")).join("");
}

async function resolveGuideSourceIds(
  service: ReturnType<typeof createServiceClient>,
  results: GuideSearchResult[],
  scope: Required<Pick<GuideSubmitRequest, "workspace_id" | "world_id" | "saga_id">>
) {
  const { data, error } = await service.rpc("resolve_guide_source_ids_for_worker", {
    p_workspace_id: scope.workspace_id,
    p_world_id: scope.world_id,
    p_saga_id: scope.saga_id,
    p_results: results
  });
  if (error || !Array.isArray(data)) throw new Error("guide_source_resolution_failed");
  return data.filter((value): value is string => typeof value === "string").slice(0, 20);
}

Deno.serve(async (req) => {
  const authFailure = requireInternalAuth(req);
  if (authFailure) return authFailure;
  if (req.method !== "POST") return errorResponse(405, "method_not_allowed", "Method not allowed.");

  const body = await req.json().catch(() => null) as GuideSubmitRequest | null;
  const question = normalizeQuestion(body?.question ?? "");
  if (!body?.gm_user_id || !body.workspace_id || !body.world_id || !body.saga_id
    || !body.turn_id || !body.idempotency_key || question.length < 1 || question.length > 2000) {
    return errorResponse(400, "invalid_request", "The Guide question is invalid.");
  }
  const requestedImports = body.selected_import_source_ids ?? [];
  const selectedImportSourceIds = [...new Set(requestedImports)].sort();
  if (!Array.isArray(requestedImports) || requestedImports.length !== selectedImportSourceIds.length
    || selectedImportSourceIds.length > 8 || selectedImportSourceIds.some((value) => !UUID.test(value))) {
    return errorResponse(400, "invalid_request", "Selected import sources are invalid.");
  }

  const service = createServiceClient();
  const { data: existing, error: replayError } = await service.rpc("get_guide_turn_replay_for_worker", {
    p_gm_id: body.gm_user_id,
    p_saga_id: body.saga_id,
    p_idempotency_key: body.idempotency_key
  });
  if (replayError) return errorResponse(500, "guide_replay_failed", "Relic Guide could not verify this retry.");
  if (existing) {
    const replayImports = Array.isArray(existing.import_source_ids)
      ? existing.import_source_ids.filter((value: unknown): value is string => typeof value === "string").sort()
      : [];
    if (existing.workspace_id !== body.workspace_id || existing.world_id !== body.world_id
      || existing.question !== question || existing.id !== body.turn_id
      || JSON.stringify(replayImports) !== JSON.stringify(selectedImportSourceIds)) {
      return errorResponse(409, "idempotency_conflict", "This Guide retry does not match the original question.");
    }
    return jsonResponse({
      thread_id: existing.thread_id,
      turn_id: existing.id,
      run_id: existing.ai_task_run_id,
      status: existing.status,
      replayed: true
    });
  }

  const { data: planned, error: planError } = selectedImportSourceIds.length
    ? { data: { strategy: "exact", provider_required: true, reason: "explicit_import_enrollment", source_ids: selectedImportSourceIds }, error: null }
    : await service.rpc("plan_loom_retrieval_for_worker", {
      p_workspace_id: body.workspace_id,
      p_world_id: body.world_id,
      p_saga_id: body.saga_id,
      p_gm_id: body.gm_user_id,
      p_question: question
    });
  if (planError || typeof planned !== "object" || planned === null) {
    return errorResponse(503, "retrieval_unavailable", "The Loom could not safely plan this request.");
  }
  const plan = planned as LoomRetrievalPlan;
  const strategy = plan.strategy ?? "hybrid";
  const queryHash = await safeQuestionHash(question);
  if (strategy === "deterministic_read" && plan.provider_required === false) {
    const { data: completed, error: deterministicError } = await service.rpc(
      "create_loom_deterministic_turn_for_worker",
      {
        p_workspace_id: body.workspace_id,
        p_world_id: body.world_id,
        p_saga_id: body.saga_id,
        p_gm_id: body.gm_user_id,
        p_thread_id: body.thread_id ?? null,
        p_turn_id: body.turn_id,
        p_idempotency_key: body.idempotency_key,
        p_question: question
      }
    );
    if (deterministicError) {
      return errorResponse(400, "loom_read_failed", "The Loom could not complete this scoped read.");
    }
    await recordProviderPipelineEvent({
      eventName: "loom_deterministic_read_completed",
      workerType: "loom_retrieval",
      workspaceId: body.workspace_id,
      worldId: body.world_id,
      sagaId: body.saga_id,
      idempotencyIdentifier: queryHash,
      state: "success",
      safeMetadata: {
        retrieval_strategy: strategy,
        planner_reason: typeof plan.reason === "string" ? plan.reason.slice(0, 80) : "deterministic_read",
        source_count: Array.isArray(plan.source_ids) ? plan.source_ids.length : 0,
        provider_dispatched: false,
        query_embedding_requested: false
      }
    }).catch(() => undefined);
    return jsonResponse({ ...completed, status: "complete", deterministic: true });
  }

  const scoped = await createScopedClient(body.gm_user_id, "guide_submit", body.saga_id);
  const { data: preflight, error: preflightError } = await scoped.rpc("preflight_ai_task", {
    p_workspace_id: body.workspace_id,
    p_world_id: body.world_id,
    p_saga_id: body.saga_id,
    p_session_id: null,
    p_task_name: "answer_saga_question",
    p_input_payload: { question_length: question.length, selected_import_count: selectedImportSourceIds.length }
  });
  if (preflightError) return errorResponse(403, "permission_denied", "Relic Guide is unavailable in this Saga.");

  if (!preflight?.allowed) {
    const { data: blocked, error: blockedCreateError } = await service.rpc("create_guide_turn_for_worker", {
      p_workspace_id: body.workspace_id,
      p_world_id: body.world_id,
      p_saga_id: body.saga_id,
      p_gm_id: body.gm_user_id,
      p_thread_id: body.thread_id ?? null,
      p_turn_id: body.turn_id,
      p_idempotency_key: body.idempotency_key,
      p_question: question,
      p_retrieval_mode: "none",
      p_source_ids: []
    });
    if (blockedCreateError) return errorResponse(400, "guide_submit_failed", "Relic Guide could not preserve this question.");
    await service.rpc("block_guide_turn_for_worker", { p_run_id: blocked.run_id, p_reason: "quota_blocked" });
    return jsonResponse({
      ...blocked,
      status: "quota_blocked",
      quota: { severity: preflight.severity, message: preflight.message, reset_at: preflight.reset_at }
    }, { status: 429 });
  }

  const internalToken = Deno.env.get("INTERNAL_TOKEN");
  const baseUrl = Deno.env.get("SUPABASE_URL");
  if (!internalToken || !baseUrl) return errorResponse(500, "configuration", "Relic Guide is temporarily unavailable.");

  let retrievalMode: "hybrid" | "lexical_fallback" | "lexical" | "exact" | "structured" =
    strategy === "exact" || strategy === "structured" ? strategy : strategy === "lexical" ? "lexical" : "hybrid";
  let sourceIds = selectedImportSourceIds.length ? selectedImportSourceIds : strategy === "exact" || strategy === "structured"
    ? [...new Set((Array.isArray(plan.source_ids) ? plan.source_ids : [])
      .filter((value): value is string => typeof value === "string"))].slice(0, 20)
    : [];
  if (strategy === "lexical" || strategy === "hybrid") {
    let results: GuideSearchResult[];
    try {
      const retrievalResponse = await fetch(`${baseUrl}/functions/v1/hybrid-search`, {
        method: "POST",
        headers: { authorization: `Bearer ${internalToken}`, "content-type": "application/json" },
        body: JSON.stringify({
          gm_user_id: body.gm_user_id,
          workspace_id: body.workspace_id,
          world_id: body.world_id,
          saga_id: body.saga_id,
          query_text: question,
          task_profile: "answer_saga_question",
          retrieval_strategy: strategy,
          top_k: 20,
          include_world_canon: true
        })
      });
      if (!retrievalResponse.ok) throw new Error("guide_retrieval_failed");
      const retrieval = await retrievalResponse.json();
      results = Array.isArray(retrieval.results) ? retrieval.results : [];
      retrievalMode = retrieval.retrieval_mode === "lexical_fallback" ? "lexical_fallback"
        : retrieval.retrieval_mode === "lexical" ? "lexical" : "hybrid";
    } catch {
      return errorResponse(503, "retrieval_unavailable", "The Loom could not safely retrieve Saga evidence.");
    }
    try {
      sourceIds = await resolveGuideSourceIds(service, results, {
        workspace_id: body.workspace_id,
        world_id: body.world_id,
        saga_id: body.saga_id
      });
    } catch {
      return errorResponse(503, "retrieval_unavailable", "The Loom could not safely resolve Saga evidence.");
    }
  }
  await recordProviderPipelineEvent({
    eventName: "loom_retrieval_planned",
    workerType: "loom_retrieval",
    workspaceId: body.workspace_id,
    worldId: body.world_id,
    sagaId: body.saga_id,
    idempotencyIdentifier: queryHash,
    state: "success",
    safeMetadata: {
      retrieval_strategy: strategy,
      retrieval_mode: retrievalMode,
      planner_reason: typeof plan.reason === "string" ? plan.reason.slice(0, 80) : "unknown",
      source_count: sourceIds.length,
      provider_dispatched: true,
      query_embedding_requested: strategy === "hybrid"
    }
  }).catch(() => undefined);
  const turnRpc = selectedImportSourceIds.length ? "create_import_loom_turn_for_worker" : "create_loom_provider_turn_for_worker";
  const turnArgs = selectedImportSourceIds.length ? {
    p_workspace_id: body.workspace_id,
    p_world_id: body.world_id,
    p_saga_id: body.saga_id,
    p_gm_id: body.gm_user_id,
    p_thread_id: body.thread_id ?? null,
    p_turn_id: body.turn_id,
    p_idempotency_key: body.idempotency_key,
    p_question: question,
    p_source_ids: selectedImportSourceIds
  } : {
    p_workspace_id: body.workspace_id,
    p_world_id: body.world_id,
    p_saga_id: body.saga_id,
    p_gm_id: body.gm_user_id,
    p_thread_id: body.thread_id ?? null,
    p_turn_id: body.turn_id,
    p_idempotency_key: body.idempotency_key,
    p_question: question,
    p_retrieval_mode: retrievalMode,
    p_source_ids: sourceIds
  };
  const { data: submission, error: createError } = await service.rpc(turnRpc, turnArgs);
  if (createError) return errorResponse(400, "guide_submit_failed", "Relic Guide could not preserve this question.");
  if (submission.replayed || submission.status === "complete") {
    return jsonResponse({ ...submission, quota: { severity: preflight.severity } });
  }

  const runnerResponse = await fetch(`${baseUrl}/functions/v1/ai-task-runner`, {
    method: "POST",
    headers: { authorization: `Bearer ${internalToken}`, "content-type": "application/json" },
    body: JSON.stringify({ run_id: submission.run_id })
  }).catch(() => null);
  const runnerBody = runnerResponse
    ? await runnerResponse.clone().json().catch(() => ({})) as Record<string, unknown>
    : {};
  const validationCategories = Array.isArray(runnerBody.validation_categories)
    ? runnerBody.validation_categories.filter((value): value is string => typeof value === "string").slice(0, 5)
    : [];
  return jsonResponse({
    ...submission,
    dispatch_status: runnerResponse?.status ?? 503,
    ...(validationCategories.length > 0 ? { dispatch_validation_categories: validationCategories } : {}),
    quota: { severity: preflight.severity }
  }, { status: runnerResponse?.ok ? 200 : 202 });
});

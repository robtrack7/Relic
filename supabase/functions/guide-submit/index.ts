import { errorResponse, jsonResponse } from "../_shared/http.ts";
import { requireInternalAuth } from "../_shared/internal-auth.ts";
import { createScopedClient } from "../_shared/scoped-client.ts";
import { createServiceClient } from "../_shared/service-client.ts";

type GuideSubmitRequest = {
  gm_user_id?: string;
  workspace_id?: string;
  world_id?: string;
  saga_id?: string;
  thread_id?: string | null;
  turn_id?: string;
  idempotency_key?: string;
  question?: string;
};

function normalizeQuestion(value: string) {
  return value.normalize("NFKC").replace(/\r\n?/g, "\n").replace(/[\t ]+/g, " ").trim();
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

  const service = createServiceClient();
  const { data: existing, error: replayError } = await service
    .from("guide_turns")
    .select("id,thread_id,ai_task_run_id,status,question,workspace_id,world_id")
    .eq("gm_id", body.gm_user_id)
    .eq("saga_id", body.saga_id)
    .eq("idempotency_key", body.idempotency_key)
    .maybeSingle();
  if (replayError) return errorResponse(500, "guide_replay_failed", "Relic Guide could not verify this retry.");
  if (existing) {
    if (existing.workspace_id !== body.workspace_id || existing.world_id !== body.world_id
      || existing.question !== question || existing.id !== body.turn_id) {
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

  const scoped = await createScopedClient(body.gm_user_id, "guide_submit", body.saga_id);
  const { data: preflight, error: preflightError } = await scoped.rpc("preflight_ai_task", {
    p_workspace_id: body.workspace_id,
    p_world_id: body.world_id,
    p_saga_id: body.saga_id,
    p_session_id: null,
    p_task_name: "answer_saga_question",
    p_input_payload: { question_length: question.length }
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

  let results: Array<{ source_id?: string | null }> = [];
  let retrievalMode = "none";
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
        top_k: 20,
        include_world_canon: true
      })
    });
    if (retrievalResponse.ok) {
      const retrieval = await retrievalResponse.json();
      results = Array.isArray(retrieval.results) ? retrieval.results : [];
      retrievalMode = retrieval.retrieval_mode === "lexical_fallback" ? "lexical_fallback" : "hybrid";
    }
  } catch {
    retrievalMode = "none";
  }

  const sourceIds = [...new Set(results.map((result) => result.source_id).filter(
    (sourceId): sourceId is string => typeof sourceId === "string"
  ))].slice(0, 20);
  const { data: submission, error: createError } = await service.rpc("create_guide_turn_for_worker", {
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
  });
  if (createError) return errorResponse(400, "guide_submit_failed", "Relic Guide could not preserve this question.");
  if (submission.replayed || submission.status === "complete") {
    return jsonResponse({ ...submission, quota: { severity: preflight.severity } });
  }

  const runnerResponse = await fetch(`${baseUrl}/functions/v1/ai-task-runner`, {
    method: "POST",
    headers: { authorization: `Bearer ${internalToken}`, "content-type": "application/json" },
    body: JSON.stringify({ run_id: submission.run_id })
  }).catch(() => null);
  return jsonResponse({
    ...submission,
    dispatch_status: runnerResponse?.status ?? 503,
    quota: { severity: preflight.severity }
  }, { status: runnerResponse?.ok ? 200 : 202 });
});

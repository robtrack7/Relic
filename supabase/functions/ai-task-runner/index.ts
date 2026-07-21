import { errorResponse, jsonResponse } from "../_shared/http.ts";
import { requireInternalAuth } from "../_shared/internal-auth.ts";
import { createServiceClient } from "../_shared/service-client.ts";
import { createScopedClient } from "../_shared/scoped-client.ts";
import { callAiProvider } from "../_shared/ai-provider.ts";
import { parseModelJson, validateTaskOutput } from "../_shared/ai-schemas.ts";
import { logRuntimeEvent } from "../_shared/worker.ts";
import type { AiTaskRun } from "../_shared/ai-contracts.ts";

async function loadRun(service: ReturnType<typeof createServiceClient>, runId: string): Promise<AiTaskRun> {
  const { data, error } = await service.rpc("get_ai_task_run_for_worker", { p_run_id: runId });
  if (error) throw new Error(error.message);
  if (!data?.id) throw new Error("AI task run was not found.");
  return data as AiTaskRun;
}

async function retrieveContext(taskRun: AiTaskRun): Promise<unknown[]> {
  if (taskRun.retrieval_profile === "none" || !taskRun.gm_id || !taskRun.saga_id) return [];

  const scoped = await createScopedClient(taskRun.gm_id, "ai_task_runner");
  const queryText = typeof taskRun.input_payload?.prompt === "string"
    ? taskRun.input_payload.prompt
    : taskRun.task_name;

  const { data, error } = await scoped.rpc("retrieve_for_task", {
    workspace_id: taskRun.workspace_id,
    world_id: taskRun.world_id,
    saga_id: taskRun.saga_id,
    session_id: taskRun.session_id,
    query_text: queryText,
    task_profile: taskRun.task_name,
    filters: {},
    top_k: 20
  });

  if (error) throw new Error(`retrieval failed: ${error.message}`);
  return data ?? [];
}

async function recordUsage(
  service: ReturnType<typeof createServiceClient>,
  taskRun: AiTaskRun,
  resolvedModel: string,
  resolvedProvider: string,
  tokensIn?: number,
  tokensOut?: number,
  costEstimateUsd?: number
) {
  if (!taskRun.gm_id) return;

  const scoped = await createScopedClient(taskRun.gm_id, "ai_task_usage");
  const { data: usageEventId, error } = await scoped.rpc("record_usage_event", {
    p_workspace_id: taskRun.workspace_id,
    p_world_id: taskRun.world_id,
    p_saga_id: taskRun.saga_id,
    p_event_kind: taskRun.quota_tier === "pipeline_synthesis" ? "pipeline_synthesis" : "ai_call",
    p_units: taskRun.ai_credits,
    p_unit_type: "ai_credit",
    p_idempotency_key: `ai-task:${taskRun.id}`,
    p_metadata: {
      task_name: taskRun.task_name,
      prompt_version: taskRun.prompt_version,
      quota_tier: taskRun.quota_tier,
      model_tier: taskRun.model_tier,
      model: resolvedModel,
      provider: resolvedProvider,
      ai_credits: taskRun.ai_credits,
      tokens_in: tokensIn,
      tokens_out: tokensOut,
      cost_estimate_usd: costEstimateUsd,
      heavy: taskRun.quota_tier === "heavy" || taskRun.quota_tier === "pipeline_synthesis",
      user_charge: true
    }
  });
  if (error) throw new Error(`usage metering failed: ${error.message}`);

  await service.rpc("set_ai_task_usage_for_worker", {
    p_run_id: taskRun.id,
    p_usage_event_id: usageEventId
  });
}

async function recordFailedUsage(taskRun: AiTaskRun, reason: string) {
  if (!taskRun.gm_id) return;

  const scoped = await createScopedClient(taskRun.gm_id, "ai_task_failed_usage");
  await scoped.rpc("record_usage_event", {
    p_workspace_id: taskRun.workspace_id,
    p_world_id: taskRun.world_id,
    p_saga_id: taskRun.saga_id,
    p_event_kind: taskRun.quota_tier === "pipeline_synthesis" ? "pipeline_synthesis" : "ai_call",
    p_units: 0,
    p_unit_type: "ai_credit",
    p_idempotency_key: `ai-task:${taskRun.id}:failed`,
    p_metadata: {
      task_name: taskRun.task_name,
      prompt_version: taskRun.prompt_version,
      quota_tier: taskRun.quota_tier,
      model_tier: taskRun.model_tier,
      model: taskRun.resolved_model ?? taskRun.model_tier,
      provider: taskRun.resolved_provider ?? "configured-ai-provider",
      ai_credits: 0,
      user_charge: false,
      failure_reason: reason.slice(0, 200)
    }
  });
}

async function markFailed(service: ReturnType<typeof createServiceClient>, runId: string, reason: string, errors: string[], repairAttempts: number) {
  await service.rpc("mark_ai_task_run_failed_for_worker", {
    p_run_id: runId,
    p_failure_reason: reason,
    p_validation_errors: errors.map((message) => ({ message })),
    p_repair_attempts: repairAttempts
  });
}

Deno.serve(async (req: Request): Promise<Response> => {
  const authFailure = requireInternalAuth(req);
  if (authFailure) return authFailure;

  const service = createServiceClient();
  const { run_id: runId } = await req.json().catch(() => ({}));
  if (typeof runId !== "string" || runId.length === 0) {
    return errorResponse(400, "invalid_request", "run_id is required.");
  }

  let taskRun: AiTaskRun | null = null;

  try {
    taskRun = await loadRun(service, runId);
    const retrievalContext = await retrieveContext(taskRun);
    let providerResult = await callAiProvider({ taskRun, retrievalContext });
    let parsed = parseModelJson(providerResult.output);
    let validated = parsed.ok ? validateTaskOutput(taskRun, parsed.output) : parsed;
    let repairAttempts = 0;

    if (!validated.ok) {
      repairAttempts = 1;
      providerResult = await callAiProvider({
        taskRun,
        retrievalContext,
        repair: {
          invalidOutput: validated.output ?? providerResult.output,
          validationErrors: validated.errors,
          allowedSourceIds: taskRun.allowed_source_ids
        }
      });
      parsed = parseModelJson(providerResult.output);
      validated = parsed.ok ? validateTaskOutput(taskRun, parsed.output) : parsed;
    }

    if (!validated.ok) {
      await markFailed(service, runId, "AI output failed validation.", validated.errors, repairAttempts);
      return jsonResponse({ ok: false, run_id: runId, validation_errors: validated.errors }, { status: 422 });
    }

    await recordUsage(
      service,
      taskRun,
      providerResult.resolvedModel,
      providerResult.provider,
      providerResult.tokensIn,
      providerResult.tokensOut,
      providerResult.costEstimateUsd
    );

    const { data, error } = await service.rpc("record_ai_task_output_for_worker", {
      p_run_id: runId,
      p_output: validated.output,
      p_allowed_source_ids: taskRun.allowed_source_ids,
      p_resolved_model: providerResult.resolvedModel,
      p_resolved_provider: providerResult.provider
    });
    if (error) throw new Error(error.message);

    logRuntimeEvent("ai_task_completed", { run_id: runId, task_name: taskRun.task_name, repair_attempts: repairAttempts });
    return jsonResponse({ ok: true, run_id: runId, result: data });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "AI task runner failed.";
    if (taskRun) {
      await recordFailedUsage(taskRun, reason).catch(() => undefined);
    }
    await markFailed(service, runId, reason, [{ message: reason }].map((entry) => entry.message), 0).catch(() => undefined);
    logRuntimeEvent("ai_task_failed", { run_id: runId, reason });
    return jsonResponse({ ok: false, run_id: runId, error: "ai_task_failed" }, { status: 500 });
  }
});

import { errorResponse, jsonResponse } from "../_shared/http.ts";
import { requireInternalAuth } from "../_shared/internal-auth.ts";
import { createServiceClient } from "../_shared/service-client.ts";
import { createScopedClient } from "../_shared/scoped-client.ts";
import { AiProviderError, callAiProvider } from "../_shared/ai-provider.ts";
import { parseModelJson, validateTaskOutput } from "../_shared/ai-schemas.ts";
import { recordProviderPipelineEvent } from "../_shared/observability.ts";
import type { AiProviderResult, AiTaskRun } from "../_shared/ai-contracts.ts";
import type { ValidationResult } from "../_shared/ai-schemas.ts";

async function claimRun(
  service: ReturnType<typeof createServiceClient>,
  runId: string,
  workerId: string
): Promise<AiTaskRun> {
  const { data, error } = await service.rpc("claim_ai_task_run_for_worker", {
    p_run_id: runId,
    p_worker_id: workerId
  });
  if (error) throw new Error(error.message);
  if (!data?.id) throw new Error("AI task run was not found.");
  return data as AiTaskRun;
}

async function retrieveContext(taskRun: AiTaskRun): Promise<unknown[]> {
  if (taskRun.retrieval_profile === "none" || !taskRun.gm_id || !taskRun.saga_id) return [];

  const scoped = await createScopedClient(taskRun.gm_id, "ai_task_runner", taskRun.saga_id);
  const queryText = typeof taskRun.input_payload?.prompt === "string"
    ? taskRun.input_payload.prompt
    : taskRun.task_name;

  const { data, error } = await scoped.rpc("retrieve_for_task", {
    workspace_id: taskRun.workspace_id,
    world_id: taskRun.world_id,
    saga_id: taskRun.saga_id,
    query_text: queryText,
    task_profile: taskRun.task_name,
    filters: taskRun.session_id ? { session_id: taskRun.session_id } : {},
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

  const scoped = await createScopedClient(taskRun.gm_id, "ai_task_usage", taskRun.saga_id);
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

  const { error: linkError } = await service.rpc("set_ai_task_usage_for_worker", {
    p_run_id: taskRun.id,
    p_usage_event_id: usageEventId
  });
  if (linkError) throw new Error(`usage linkage failed: ${linkError.message}`);
}

async function recordFailedUsage(taskRun: AiTaskRun, category: string) {
  if (!taskRun.gm_id) return;

  const scoped = await createScopedClient(taskRun.gm_id, "ai_task_failed_usage", taskRun.saga_id);
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
      failure_category: category.slice(0, 100)
    }
  });
}

async function failRun(
  service: ReturnType<typeof createServiceClient>,
  runId: string,
  workerId: string,
  category: string,
  retryable: boolean,
  repairAttempts: number
) {
  const { data, error } = await service.rpc("fail_ai_task_run_for_worker", {
    p_run_id: runId,
    p_worker_id: workerId,
    p_category: category,
    p_retryable: retryable,
    p_repair_attempts: repairAttempts
  });
  if (error) throw new Error(error.message);
  return data as { status: string; attempts: number; exact_redelivery: boolean };
}

Deno.serve(async (req: Request): Promise<Response> => {
  const authFailure = requireInternalAuth(req);
  if (authFailure) return authFailure;

  const service = createServiceClient();
  const workerId = `ai-task-${crypto.randomUUID()}`;
  const { run_id: runId } = await req.json().catch(() => ({}));
  if (typeof runId !== "string" || runId.length === 0) {
    return errorResponse(400, "invalid_request", "run_id is required.");
  }

  let taskRun: AiTaskRun | null = null;
  let phase = "claim";
  let repairAttempts = 0;

  try {
    taskRun = await claimRun(service, runId, workerId);
    if (taskRun.claim_state === "complete") {
      await recordProviderPipelineEvent({
        eventName: "ai_task_completed", workerType: `ai_task:${taskRun.task_name}`,
        aiRunId: taskRun.id, pipelineRunId: taskRun.input_payload?.pipeline_run_id as string | undefined,
        workspaceId: taskRun.workspace_id, worldId: taskRun.world_id, sagaId: taskRun.saga_id,
        sessionId: taskRun.session_id, idempotencyIdentifier: `ai-task:${taskRun.id}`,
        attemptCount: taskRun.attempts, state: "success",
        providerAlias: taskRun.model_tier, resolvedModel: taskRun.resolved_model,
        provider: taskRun.resolved_provider, safeMetadata: { exact_redelivery: true, replayed: true }
      }).catch(() => undefined);
      return jsonResponse({ ok: true, run_id: runId, replayed: true });
    }
    if (taskRun.claim_state === "busy" || taskRun.claim_state === "not_due") {
      return jsonResponse({ ok: true, run_id: runId, state: taskRun.claim_state }, { status: 202 });
    }
    if (taskRun.claim_state === "terminal") {
      return jsonResponse({ ok: false, run_id: runId, error: "ai_task_terminal" }, { status: 409 });
    }
    if (taskRun.claim_state !== "claimed") {
      throw new Error("AI task claim state is invalid.");
    }

    await recordProviderPipelineEvent({
      eventName: "worker_claimed", workerType: `ai_task:${taskRun.task_name}`,
      aiRunId: taskRun.id, pipelineRunId: taskRun.input_payload?.pipeline_run_id as string | undefined,
      workspaceId: taskRun.workspace_id, worldId: taskRun.world_id, sagaId: taskRun.saga_id,
      sessionId: taskRun.session_id, idempotencyIdentifier: `ai-task:${taskRun.id}`,
      attemptCount: taskRun.attempts, state: "running", providerAlias: taskRun.model_tier,
      queueDelayMs: taskRun.scheduled_at
        ? Math.max(0, Date.now() - new Date(taskRun.scheduled_at).getTime()) : undefined
    }).catch(() => undefined);

    let providerLatencyMs = 0;
    let inputSize = 0;
    let usedCheckpoint = false;
    let providerResult: AiProviderResult;
    let validated: ValidationResult;

    if (taskRun.provider_completed_at && taskRun.output_payload && taskRun.provider_alias
      && taskRun.resolved_model && taskRun.resolved_provider) {
      usedCheckpoint = true;
      providerResult = {
        output: taskRun.output_payload,
        alias: taskRun.provider_alias,
        resolvedModel: taskRun.resolved_model,
        provider: taskRun.resolved_provider,
        tokensIn: taskRun.provider_tokens_in ?? undefined,
        tokensOut: taskRun.provider_tokens_out ?? undefined,
        costEstimateUsd: taskRun.provider_cost_estimate_usd ?? undefined,
        billable: taskRun.provider_billable ?? true,
        requestId: taskRun.provider_request_id_present ? "checkpointed" : null
      };
      validated = validateTaskOutput(taskRun, taskRun.output_payload);
      if (!validated.ok) throw new Error("Checkpointed AI output no longer validates.");
    } else {
      phase = "retrieval";
      const retrievalContext = await retrieveContext(taskRun);
      const providerStartedAt = performance.now();
      inputSize = JSON.stringify({ input: taskRun.input_payload, retrieval: retrievalContext }).length;
      await recordProviderPipelineEvent({
        eventName: "provider_call_started", workerType: `ai_task:${taskRun.task_name}`,
        aiRunId: taskRun.id, pipelineRunId: taskRun.input_payload?.pipeline_run_id as string | undefined,
        workspaceId: taskRun.workspace_id, worldId: taskRun.world_id, sagaId: taskRun.saga_id,
        sessionId: taskRun.session_id, idempotencyIdentifier: `ai-task:${taskRun.id}`,
        attemptCount: taskRun.attempts, state: "running", providerAlias: taskRun.model_tier,
        inputUnits: inputSize, inputUnitType: "character"
      }).catch(() => undefined);
      phase = "provider";
      providerResult = await callAiProvider({ taskRun, retrievalContext });
      const parsed = parseModelJson(providerResult.output);
      validated = parsed.ok ? validateTaskOutput(taskRun, parsed.output) : parsed;

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
        const parsedRepair = parseModelJson(providerResult.output);
        validated = parsedRepair.ok ? validateTaskOutput(taskRun, parsedRepair.output) : parsedRepair;
      }

      providerLatencyMs = Math.round(performance.now() - providerStartedAt);
    }

    if (!validated.ok) {
      const failure = await failRun(service, runId, workerId, "validation_failed", false, repairAttempts);
      await recordFailedUsage(taskRun, "validation_failed").catch(() => undefined);
      await recordProviderPipelineEvent({
        eventName: "ai_task_validation_failed", severity: "warn", workerType: `ai_task:${taskRun.task_name}`,
        aiRunId: taskRun.id, pipelineRunId: taskRun.input_payload?.pipeline_run_id as string | undefined,
        workspaceId: taskRun.workspace_id, worldId: taskRun.world_id, sagaId: taskRun.saga_id,
        sessionId: taskRun.session_id, idempotencyIdentifier: `ai-task:${taskRun.id}`,
        attemptCount: taskRun.attempts, state: "terminal_failure", errorCategory: "validation_failed",
        providerAlias: providerResult.alias, resolvedModel: providerResult.resolvedModel,
        provider: providerResult.provider, providerLatencyMs, inputUnits: inputSize,
        inputUnitType: "character", retryPath: "single_schema_repair",
        safeMetadata: { validation_repair_attempts: repairAttempts, billable: providerResult.billable }
      }).catch(() => undefined);
      return jsonResponse({ ok: false, run_id: runId, error: "validation_failed", state: failure.status }, { status: 422 });
    }

    if (!usedCheckpoint) {
      phase = "checkpoint";
      const { error: checkpointError } = await service.rpc("checkpoint_ai_task_provider_output_for_worker", {
        p_run_id: runId,
        p_worker_id: workerId,
        p_output: validated.output,
        p_provider_alias: providerResult.alias,
        p_resolved_model: providerResult.resolvedModel,
        p_resolved_provider: providerResult.provider,
        p_tokens_in: providerResult.tokensIn,
        p_tokens_out: providerResult.tokensOut,
        p_cost_estimate_usd: providerResult.costEstimateUsd,
        p_billable: providerResult.billable,
        p_provider_request_id_present: Boolean(providerResult.requestId)
      });
      if (checkpointError) throw new Error(checkpointError.message);
    }

    phase = "metering";
    await recordUsage(
      service,
      taskRun,
      providerResult.resolvedModel,
      providerResult.provider,
      providerResult.tokensIn,
      providerResult.tokensOut,
      providerResult.costEstimateUsd
    );

    phase = "persistence";
    const { data, error } = await service.rpc("record_ai_task_output_for_worker", {
      p_run_id: runId,
      p_output: validated.output,
      p_allowed_source_ids: taskRun.allowed_source_ids,
      p_resolved_model: providerResult.resolvedModel,
      p_resolved_provider: providerResult.provider
    });
    if (error) throw new Error(error.message);

    const outputSize = typeof providerResult.output === "string"
      ? providerResult.output.length : JSON.stringify(providerResult.output).length;
    await recordProviderPipelineEvent({
      eventName: "ai_task_completed", workerType: `ai_task:${taskRun.task_name}`,
      aiRunId: taskRun.id, pipelineRunId: taskRun.input_payload?.pipeline_run_id as string | undefined,
      workspaceId: taskRun.workspace_id, worldId: taskRun.world_id, sagaId: taskRun.saga_id,
      sessionId: taskRun.session_id, idempotencyIdentifier: `ai-task:${taskRun.id}`,
      attemptCount: taskRun.attempts, state: "success", providerAlias: providerResult.alias,
      resolvedModel: providerResult.resolvedModel, provider: providerResult.provider,
      providerLatencyMs, inputUnits: providerResult.tokensIn ?? inputSize,
      inputUnitType: providerResult.tokensIn === undefined ? "character" : "token",
      outputUnits: providerResult.tokensOut ?? outputSize,
      outputUnitType: providerResult.tokensOut === undefined ? "character" : "token",
      usageUnits: taskRun.ai_credits, usageUnitType: "ai_credit",
      safeMetadata: {
        provider_request_id_present: Boolean(providerResult.requestId),
        validation_repair_attempts: repairAttempts,
        billable: providerResult.billable,
        metered: true,
        exact_redelivery: usedCheckpoint
      }
    }).catch(() => undefined);
    return jsonResponse({ ok: true, run_id: runId, result: data });
  } catch (error) {
    const category = error instanceof AiProviderError ? error.category
      : phase === "retrieval" ? "retrieval_failed"
      : phase === "metering" ? "metering_failed"
      : phase === "checkpoint" || phase === "persistence" ? "persistence"
      : "ai_task_internal_failure";
    const retryable = error instanceof AiProviderError ? error.retryable : true;
    if (taskRun) {
      const failure = await failRun(service, runId, workerId, category, retryable, repairAttempts).catch(() => null);
      if (failure?.status === "terminal" || failure?.status === "dead_letter") {
        await recordFailedUsage(taskRun, category).catch(() => undefined);
      }
      await recordProviderPipelineEvent({
        eventName: category === "configuration" || category === "model_mismatch"
          ? "configuration_rejected" : "provider_call_failed",
        severity: "error", workerType: `ai_task:${taskRun.task_name}`,
        aiRunId: taskRun.id, pipelineRunId: taskRun.input_payload?.pipeline_run_id as string | undefined,
        workspaceId: taskRun.workspace_id, worldId: taskRun.world_id, sagaId: taskRun.saga_id,
        sessionId: taskRun.session_id, idempotencyIdentifier: `ai-task:${taskRun.id}`,
        attemptCount: taskRun.attempts,
        state: failure?.status === "dead_letter" ? "dead_letter"
          : failure?.status === "retryable" ? "retryable_failure" : "terminal_failure",
        providerAlias: taskRun.model_tier, errorCategory: category,
        retryPath: retryable ? "bounded_task_retry" : null
      }).catch(() => undefined);
      return jsonResponse(
        { ok: false, run_id: runId, error: "ai_task_failed", state: failure?.status ?? "terminal" },
        { status: failure?.status === "retryable" ? 503 : 500 }
      );
    }
    return jsonResponse({ ok: false, run_id: runId, error: "ai_task_failed" }, { status: 500 });
  }
});

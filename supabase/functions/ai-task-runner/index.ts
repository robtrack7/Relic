import { errorResponse, jsonResponse } from "../_shared/http.ts";
import { requireInternalAuth } from "../_shared/internal-auth.ts";
import { createServiceClient } from "../_shared/service-client.ts";
import { createScopedClient } from "../_shared/scoped-client.ts";
import { AiProviderError, callAiProvider } from "../_shared/ai-provider.ts";
import { parseModelJson, validateTaskOutput } from "../_shared/ai-schemas.ts";
import { recordProviderPipelineEvent } from "../_shared/observability.ts";
import type { AiProviderResult, AiTaskRun } from "../_shared/ai-contracts.ts";
import type { ValidationResult } from "../_shared/ai-schemas.ts";

function validationCategories(errors: string[]) {
  const categories = errors.map((error) => {
    if (/outside the allowed retrieval set/i.test(error)) return "citation_allowlist";
    if (/citation.*UUID/i.test(error)) return "citation_identifier";
    if (/requires at least one citation/i.test(error)) return "citation_required";
    if (/unsupported by cited evidence|contradicts cited evidence/i.test(error)) return "evidence_support";
    if (/no_answer=false requires/i.test(error)) return "substantive_block_required";
    if (/requires a safe insufficiency reason/i.test(error)) return "insufficiency_reason_required";
    if (/cannot contain grounded factual prose/i.test(error)) return "no_answer_grounded_block";
    if (/may contain guidance only/i.test(error)) return "no_answer_block_type";
    if (/insufficiency_reason is only permitted/i.test(error)) return "unexpected_insufficiency_reason";
    if (/no_answer/i.test(error)) return "no_answer_contract";
    if (/confidence_reason/i.test(error)) return "confidence_contract";
    if (/action/i.test(error)) return "action_contract";
    if (/at most|bounded|length/i.test(error)) return "bounds";
    if (/block|field|object|array|type/i.test(error)) return "response_shape";
    return "schema_contract";
  });
  return [...new Set(categories)].slice(0, 5);
}

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

type ProviderUsageTotals = {
  provider_completions: number;
  provider_tokens_in: number;
  provider_tokens_out: number;
  provider_cost_estimate_usd: number;
  provider_cost_estimate_complete: boolean;
  provider_billable: boolean;
  provider_request_id_present: boolean;
  exact_redelivery: boolean;
};

async function callAndLedgerProvider(
  service: ReturnType<typeof createServiceClient>,
  taskRun: AiTaskRun,
  workerId: string,
  retrievalContext: unknown[],
  callKind: "initial" | "schema_repair",
  inputSize: number,
  repair?: {
    invalidOutput: unknown;
    validationErrors: string[];
    allowedSourceIds: string[];
  }
): Promise<{ result: AiProviderResult; totals: ProviderUsageTotals }> {
  await recordProviderPipelineEvent({
    eventName: "provider_call_started", workerType: `ai_task:${taskRun.task_name}`,
    aiRunId: taskRun.id, pipelineRunId: taskRun.input_payload?.pipeline_run_id as string | undefined,
    workspaceId: taskRun.workspace_id, worldId: taskRun.world_id, sagaId: taskRun.saga_id,
    sessionId: taskRun.session_id,
    idempotencyIdentifier: `ai-task:${taskRun.id}:${taskRun.attempts ?? 1}:${callKind}`,
    attemptCount: taskRun.attempts, state: "running", providerAlias: taskRun.model_tier,
    inputUnits: inputSize, inputUnitType: "character"
  }).catch(() => undefined);

  const ledger = async (result: AiProviderResult) => {
    const { data, error } = await service.rpc("record_ai_task_provider_completion_for_worker", {
      p_run_id: taskRun.id,
      p_worker_id: workerId,
      p_attempt_number: taskRun.attempts ?? 1,
      p_call_kind: callKind,
      p_provider_alias: result.alias,
      p_resolved_model: result.resolvedModel,
      p_resolved_provider: result.provider,
      p_tokens_in: result.tokensIn,
      p_tokens_out: result.tokensOut,
      p_cost_estimate_usd: result.costEstimateUsd,
      p_cost_estimate_complete: result.costEstimateComplete,
      p_cost_estimate_source: result.costEstimateSource,
      p_billable: result.billable,
      p_provider_request_id_present: Boolean(result.requestId)
    });
    if (error) throw new Error(`provider accounting failed: ${error.message}`);
    return data as ProviderUsageTotals;
  };

  try {
    const result = await callAiProvider({ taskRun, retrievalContext, repair });
    return { result, totals: await ledger(result) };
  } catch (error) {
    if (error instanceof AiProviderError && error.providerResult) {
      await ledger(error.providerResult);
    }
    throw error;
  }
}

async function retrieveContext(
  service: ReturnType<typeof createServiceClient>,
  taskRun: AiTaskRun
): Promise<unknown[]> {
  if (taskRun.workshop_session_id) {
    const { data, error } = await service.rpc("get_workshop_evidence_for_worker", { p_run_id: taskRun.id });
    if (error) throw new Error(`retrieval failed: ${error.message}`);
    const evidence = Array.isArray(data) ? data : [];
    taskRun.allowed_source_ids = evidence.map((entry: Record<string, unknown>) => entry.source_id)
      .filter((value: unknown): value is string => typeof value === "string");
    taskRun.retrieval_context = evidence as AiTaskRun["retrieval_context"];
    return evidence;
  }
  if (taskRun.retrieval_profile === "none" || !taskRun.gm_id || !taskRun.saga_id) return [];
  if (taskRun.guide_turn_id || typeof taskRun.input_payload?.loom_action_id === "string") {
    const { data, error } = await service.rpc("get_guide_evidence_for_worker", { p_run_id: taskRun.id });
    if (error) throw new Error(`retrieval failed: ${error.message}`);
    const evidence = Array.isArray(data) ? data : [];
    taskRun.retrieval_context = evidence as AiTaskRun["retrieval_context"];
    return evidence;
  }
  if (taskRun.prep_ai_request_id) {
    const { data: frozenState, error: frozenError } = await service.rpc(
      "get_prep_ai_context_for_worker",
      { p_run_id: taskRun.id }
    );
    if (frozenError) throw new Error(`retrieval failed: ${frozenError.message}`);
    const frozenEvidence = Array.isArray(frozenState?.evidence) ? frozenState.evidence : [];
    if (frozenState?.retrieval_mode && frozenState.retrieval_mode !== "none") {
      taskRun.allowed_source_ids = frozenEvidence
        .map((entry: Record<string, unknown>) => entry.source_id)
        .filter((value: unknown): value is string => typeof value === "string");
      taskRun.retrieval_context = frozenEvidence as AiTaskRun["retrieval_context"];
      return frozenEvidence;
    }

    const internalToken = Deno.env.get("INTERNAL_TOKEN");
    const baseUrl = Deno.env.get("SUPABASE_URL");
    if (!internalToken || !baseUrl) throw new Error("retrieval failed: configuration");
    const topK = taskRun.task_name === "generate_session_prep" ? 20
      : taskRun.task_name === "propose_thread_complication" ? 12 : 15;
    const queryText = typeof taskRun.input_payload?.query_text === "string"
      ? taskRun.input_payload.query_text : taskRun.task_name.replaceAll("_", " ");
    const response = await fetch(`${baseUrl}/functions/v1/hybrid-search`, {
      method: "POST",
      headers: { authorization: `Bearer ${internalToken}`, "content-type": "application/json" },
      body: JSON.stringify({
        gm_user_id: taskRun.gm_id,
        workspace_id: taskRun.workspace_id,
        world_id: taskRun.world_id,
        saga_id: taskRun.saga_id,
        query_text: queryText,
        task_profile: taskRun.task_name,
        session_id: taskRun.task_name === "propose_quick_stub_fleshing"
          ? taskRun.session_id : undefined,
        top_k: topK,
        include_world_canon: true
      })
    });
    if (!response.ok) throw new Error("retrieval failed: task retrieval unavailable");
    const retrieval = await response.json() as Record<string, unknown>;
    const results = Array.isArray(retrieval.results) ? retrieval.results : [];
    const sourceIds = [...new Set(results.map((entry) => (
      typeof entry === "object" && entry !== null
        ? (entry as Record<string, unknown>).source_id : null
    )).filter((value): value is string => typeof value === "string"))];
    const retrievalMode = retrieval.retrieval_mode === "lexical_fallback"
      ? "lexical_fallback" : "hybrid";
    const { data: frozen, error: freezeError } = await service.rpc(
      "freeze_prep_ai_evidence_for_worker",
      { p_run_id: taskRun.id, p_source_ids: sourceIds, p_retrieval_mode: retrievalMode }
    );
    if (freezeError) throw new Error(`retrieval failed: ${freezeError.message}`);
    const evidence = Array.isArray(frozen) ? frozen : [];
    taskRun.allowed_source_ids = evidence
      .map((entry: Record<string, unknown>) => entry.source_id)
      .filter((value: unknown): value is string => typeof value === "string");
    taskRun.retrieval_context = evidence as AiTaskRun["retrieval_context"];
    return evidence;
  }

  const scoped = await createScopedClient(taskRun.gm_id, "ai_task_runner", taskRun.saga_id);
  const queryText = typeof taskRun.input_payload?.question === "string"
    ? taskRun.input_payload.question
    : typeof taskRun.input_payload?.prompt === "string"
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
    repairAttempts = taskRun.repair_attempts ?? 0;
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
    if (taskRun.guide_turn_id) {
      await service.rpc("set_guide_turn_state_for_worker", {
        p_run_id: taskRun.id,
        p_status: "running",
        p_failure_category: null
      });
    }
    if (taskRun.prep_ai_request_id) {
      await service.rpc("set_prep_ai_request_state_for_worker", {
        p_run_id: taskRun.id,
        p_status: "running",
        p_failure_category: null
      });
    }
    if (taskRun.workshop_session_id) {
      await service.rpc("set_workshop_state_for_worker", {
        p_run_id: taskRun.id,
        p_status: "running",
        p_failure_category: null
      });
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
    let providerTotals: ProviderUsageTotals;
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
        costEstimateComplete: taskRun.provider_cost_estimate_complete ?? false,
        costEstimateSource: taskRun.provider_cost_estimate_complete
          ? "proxy_or_local_upper_bound" : "unavailable",
        billable: taskRun.provider_billable ?? true,
        requestId: taskRun.provider_request_id_present ? "checkpointed" : null
      };
      providerTotals = {
        provider_completions: taskRun.provider_completions ?? 0,
        provider_tokens_in: taskRun.provider_tokens_in ?? 0,
        provider_tokens_out: taskRun.provider_tokens_out ?? 0,
        provider_cost_estimate_usd: taskRun.provider_cost_estimate_usd ?? 0,
        provider_cost_estimate_complete: taskRun.provider_cost_estimate_complete ?? false,
        provider_billable: taskRun.provider_billable ?? true,
        provider_request_id_present: taskRun.provider_request_id_present ?? false,
        exact_redelivery: true
      };
      validated = validateTaskOutput(taskRun, taskRun.output_payload);
      if (!validated.ok) throw new Error("Checkpointed AI output no longer validates.");
    } else {
      phase = "retrieval";
      const retrievalContext = await retrieveContext(service, taskRun);
      const providerStartedAt = performance.now();
      inputSize = JSON.stringify({ input: taskRun.input_payload, retrieval: retrievalContext }).length;
      phase = "provider";
      let completion = await callAndLedgerProvider(
        service, taskRun, workerId, retrievalContext, "initial", inputSize
      );
      providerResult = completion.result;
      providerTotals = completion.totals;
      const parsed = parseModelJson(providerResult.output);
      validated = parsed.ok ? validateTaskOutput(taskRun, parsed.output) : parsed;

      if (!validated.ok && repairAttempts < 1) {
        repairAttempts += 1;
        completion = await callAndLedgerProvider(
          service, taskRun, workerId, retrievalContext, "schema_repair", inputSize,
          {
            invalidOutput: validated.output ?? providerResult.output,
            validationErrors: validated.errors,
            allowedSourceIds: taskRun.allowed_source_ids
          }
        );
        providerResult = completion.result;
        providerTotals = completion.totals;
        const parsedRepair = parseModelJson(providerResult.output);
        validated = parsedRepair.ok ? validateTaskOutput(taskRun, parsedRepair.output) : parsedRepair;
      }

      providerLatencyMs = Math.round(performance.now() - providerStartedAt);
    }

    if (!validated.ok) {
      const safeValidationCategories = validationCategories(validated.errors);
      const failure = await failRun(service, runId, workerId, "validation_failed", false, repairAttempts);
      if (taskRun.prep_ai_request_id) {
        await service.rpc("set_prep_ai_request_state_for_worker", {
          p_run_id: taskRun.id,
          p_status: "validation_failed",
          p_failure_category: "validation_failed"
        }).catch(() => undefined);
      }
      if (taskRun.workshop_session_id) {
        try {
          await service.rpc("set_workshop_state_for_worker", {
            p_run_id: taskRun.id,
            p_status: "validation_failed",
            p_failure_category: "validation_failed"
          });
        } catch { /* The AI run ledger remains the authoritative terminal state. */ }
      }
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
      return jsonResponse({
        ok: false,
        run_id: runId,
        error: "validation_failed",
        state: failure.status,
        validation_categories: safeValidationCategories
      }, { status: 422 });
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
        p_provider_request_id_present: Boolean(providerResult.requestId),
        p_repair_attempts: repairAttempts
      });
      if (checkpointError) throw new Error(checkpointError.message);
    }

    phase = "metering";
    await recordUsage(
      service,
      taskRun,
      providerResult.resolvedModel,
      providerResult.provider,
      providerTotals.provider_tokens_in,
      providerTotals.provider_tokens_out,
      providerTotals.provider_cost_estimate_usd
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
    if (taskRun.guide_turn_id) {
      const { error: guideError } = await service.rpc("complete_guide_turn_for_worker", {
        p_run_id: runId,
        p_output: validated.output
      });
      if (guideError) throw new Error(guideError.message);
    }
    if (taskRun.prep_ai_request_id) {
      const { error: prepError } = await service.rpc("complete_prep_ai_request_for_worker", {
        p_run_id: runId,
        p_output: validated.output
      });
      if (prepError) throw new Error(prepError.message);
    }
    if (taskRun.workshop_session_id) {
      const { error: workshopError } = await service.rpc("complete_workshop_for_worker", {
        p_run_id: runId,
        p_output: validated.output
      });
      if (workshopError) throw new Error(workshopError.message);
    }

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
      if (taskRun.guide_turn_id) {
        const guideState = failure?.status === "dead_letter" ? "dead_letter"
          : category === "provider_unavailable" || category === "timeout" ? "provider_unavailable"
          : "failed";
        await service.rpc("set_guide_turn_state_for_worker", {
          p_run_id: taskRun.id,
          p_status: guideState,
          p_failure_category: category
        }).catch(() => undefined);
      }
      if (taskRun.prep_ai_request_id) {
        const prepState = failure?.status === "dead_letter" ? "dead_letter"
          : category === "retrieval_failed" ? "retrieval_unavailable"
          : category === "provider_unavailable" || category === "timeout" ? "provider_unavailable"
          : "failed";
        await service.rpc("set_prep_ai_request_state_for_worker", {
          p_run_id: taskRun.id,
          p_status: prepState,
          p_failure_category: category
        }).catch(() => undefined);
      }
      if (taskRun.workshop_session_id) {
        const workshopState = failure?.status === "dead_letter" ? "dead_letter"
          : category === "retrieval_failed" ? "retrieval_unavailable"
          : category === "provider_unavailable" || category === "timeout" ? "provider_unavailable"
          : "failed";
        try {
          await service.rpc("set_workshop_state_for_worker", {
            p_run_id: taskRun.id,
            p_status: workshopState,
            p_failure_category: category
          });
        } catch { /* The AI run ledger remains the authoritative terminal state. */ }
      }
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

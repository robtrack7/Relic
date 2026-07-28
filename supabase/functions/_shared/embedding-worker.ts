import { createWorkerHandler } from "./worker.ts";
import { createScopedClient, ScopedClientError } from "./scoped-client.ts";
import { createServiceClient } from "./service-client.ts";
import { callEmbeddingProvider, EmbeddingProviderError } from "./embedding-provider.ts";
import { recordProviderPipelineEvent } from "./observability.ts";

type EmbeddingJob = {
  id: string;
  gm_id: string;
  workspace_id?: string;
  world_id?: string;
  saga_id?: string;
  attempts?: number;
  idempotency_key?: string;
};

type PreparedEmbedding = {
  status: "ready" | "stale" | "quota_blocked";
  input?: string;
};

async function failSafely(jobId: string, category: string, retryable: boolean) {
  const service = createServiceClient();
  await service.rpc("fail_embedding_job_for_worker", {
    p_job_id: jobId,
    p_category: category,
    p_retryable: retryable,
  });
}

export function createEmbeddingWorkerHandler(
  claimRpc: "claim_embedding_job_for_worker" | "claim_transcript_embedding_job_for_worker",
  workerPurpose: string,
) {
  return createWorkerHandler({
    queueName: "embedding_jobs",
    claimRpc,
    jobTable: "embedding_jobs",
    workerPurpose,
    async handleJob(rawJob) {
      const job = rawJob as EmbeddingJob;
      try {
        const scoped = await createScopedClient(job.gm_id, workerPurpose, job.saga_id);
        const service = createServiceClient();
        const { data, error } = await scoped.rpc("prepare_embedding_job", { job_id: job.id });
        if (error) {
          await failSafely(job.id, "persistence", true);
          return { state: "managed", result: { outcome: "retryable", category: "persistence" } };
        }

        const prepared = data as PreparedEmbedding;
        if (prepared.status !== "ready" || !prepared.input) {
          return { state: "managed", result: { outcome: prepared.status } };
        }

        const providerStartedAt = performance.now();
        await recordProviderPipelineEvent({
          eventName: "provider_call_started", workerType: "embedding", jobId: job.id,
          workspaceId: job.workspace_id, worldId: job.world_id, sagaId: job.saga_id,
          idempotencyIdentifier: job.idempotency_key, attemptCount: Number(job.attempts ?? 0),
          state: "running", inputUnits: prepared.input.length, inputUnitType: "character",
          providerAlias: "relic-embed"
        }).catch(() => undefined);
        const providerResult = await callEmbeddingProvider(prepared.input);
        const providerLatencyMs = Math.round(performance.now() - providerStartedAt);
        const { data: completion, error: completionError } = await service.rpc(
          "complete_embedding_job_for_worker",
          {
            p_job_id: job.id,
            p_vector: providerResult.vector,
            p_provider: providerResult.provider,
            p_resolved_model: providerResult.resolvedModel,
            p_dimensions: providerResult.dimensions,
            p_usage: {
              input_tokens: providerResult.usage.inputTokens,
              total_tokens: providerResult.usage.totalTokens,
            },
            p_provider_request_id: providerResult.requestId,
            p_billable: providerResult.billable,
          },
        );
        if (completionError) {
          await failSafely(job.id, "persistence", true);
          return { state: "managed", result: { outcome: "retryable", category: "persistence" } };
        }
        await recordProviderPipelineEvent({
          eventName: "embedding_completed", workerType: "embedding", jobId: job.id,
          workspaceId: job.workspace_id, worldId: job.world_id, sagaId: job.saga_id,
          idempotencyIdentifier: job.idempotency_key, attemptCount: Number(job.attempts ?? 0),
          state: completion?.status === "stale" ? "cancelled" : "success",
          providerAlias: providerResult.alias, resolvedModel: providerResult.resolvedModel,
          provider: providerResult.provider, providerLatencyMs,
          inputUnits: providerResult.usage.inputTokens ?? prepared.input.length,
          inputUnitType: providerResult.usage.inputTokens === null ? "character" : "token",
          outputUnits: providerResult.dimensions, outputUnitType: "dimension",
          usageUnits: providerResult.usage.totalTokens ?? providerResult.usage.inputTokens,
          usageUnitType: providerResult.usage.totalTokens === null ? null : "token",
          safeMetadata: {
            dimensions: providerResult.dimensions,
            provider_request_id_present: Boolean(providerResult.requestId),
            billable: providerResult.billable,
            exact_redelivery: Boolean(completion?.exact_redelivery)
          }
        }).catch(() => undefined);
        return { state: "managed", result: { outcome: completion?.status ?? "complete" } };
      } catch (error) {
        if (error instanceof ScopedClientError) {
          await recordProviderPipelineEvent({
            eventName: error.category === "configuration"
              ? "configuration_rejected" : "worker_scope_failed",
            severity: "error", workerType: "embedding", jobId: job.id,
            workspaceId: job.workspace_id, worldId: job.world_id, sagaId: job.saga_id,
            idempotencyIdentifier: job.idempotency_key, attemptCount: Number(job.attempts ?? 0),
            state: error.retryable ? "retryable_failure" : "terminal_failure",
            errorCategory: error.category,
            retryPath: error.retryable ? "bounded_queue_retry" : null
          }).catch(() => undefined);
          await failSafely(job.id, error.category, error.retryable);
          return {
            state: "managed",
            result: {
              outcome: error.retryable ? "retryable" : "terminal",
              category: error.category,
            },
          };
        }
        if (error instanceof EmbeddingProviderError) {
          await recordProviderPipelineEvent({
            eventName: error.category === "configuration" || error.category === "model_mismatch"
              ? "configuration_rejected" : "provider_call_failed",
            severity: "error", workerType: "embedding", jobId: job.id,
            workspaceId: job.workspace_id, worldId: job.world_id, sagaId: job.saga_id,
            idempotencyIdentifier: job.idempotency_key, attemptCount: Number(job.attempts ?? 0),
            state: error.retryable ? "retryable_failure" : "terminal_failure",
            providerAlias: "relic-embed", errorCategory: error.category,
            retryPath: error.retryable ? "bounded_queue_retry" : null
          }).catch(() => undefined);
          await failSafely(job.id, error.category, error.retryable);
          return {
            state: "managed",
            result: { outcome: error.retryable ? "retryable" : "terminal", category: error.category },
          };
        }
        await failSafely(job.id, "provider_unavailable", true);
        return { state: "managed", result: { outcome: "retryable", category: "provider_unavailable" } };
      }
    },
  });
}

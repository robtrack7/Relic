import { createWorkerHandler } from "./worker.ts";
import { createScopedClient } from "./scoped-client.ts";
import { createServiceClient } from "./service-client.ts";
import { callEmbeddingProvider, EmbeddingProviderError } from "./embedding-provider.ts";

type EmbeddingJob = {
  id: string;
  gm_id: string;
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
        const scoped = await createScopedClient(job.gm_id, workerPurpose);
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

        const providerResult = await callEmbeddingProvider(prepared.input);
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
        return { state: "managed", result: { outcome: completion?.status ?? "complete" } };
      } catch (error) {
        if (error instanceof EmbeddingProviderError) {
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

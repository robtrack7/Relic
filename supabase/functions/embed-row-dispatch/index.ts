import { createWorkerHandler } from "../_shared/worker.ts";

Deno.serve(createWorkerHandler({
  queueName: "embedding_jobs",
  claimRpc: "claim_embedding_job",
  jobTable: "embedding_jobs",
  workerPurpose: "embed_row",
  async handleJob() {
    return {
      state: "retry",
      reason: "embedding provider handler is not configured in Module 8"
    };
  }
}));

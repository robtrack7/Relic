import { createWorkerHandler } from "../_shared/worker.ts";

Deno.serve(createWorkerHandler({
  queueName: "embedding_jobs",
  claimRpc: "claim_embedding_job",
  jobTable: "embedding_jobs",
  workerPurpose: "transcript_edit_reembed",
  async handleJob(job) {
    if (job.source_kind !== "transcript_chunk") {
      return { state: "retry", reason: "claimed embedding job is not a transcript edit re-embed job" };
    }
    return { state: "retry", reason: "transcript re-embedding provider handler is not configured in Module 8" };
  }
}));

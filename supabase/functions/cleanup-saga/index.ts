import { createWorkerHandler } from "../_shared/worker.ts";

Deno.serve(createWorkerHandler({
  queueName: "cleanup_jobs",
  claimRpc: "claim_cleanup_job",
  jobTable: "cleanup_jobs",
  workerPurpose: "cleanup_saga",
  async handleJob(job) {
    if (job.job_kind !== "saga") {
      return { state: "retry", reason: "claimed cleanup job is not saga cleanup" };
    }
    return { state: "retry", reason: "post-delete storage cleanup handler is not configured in Module 8" };
  }
}));

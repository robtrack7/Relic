import { createWorkerHandler } from "../_shared/worker.ts";

Deno.serve(createWorkerHandler({
  queueName: "cleanup_jobs",
  claimRpc: "claim_cleanup_job",
  jobTable: "cleanup_jobs",
  workerPurpose: "cleanup_audio",
  async handleJob(job) {
    if (job.job_kind !== "audio") {
      return { state: "retry", reason: "claimed cleanup job is not audio cleanup" };
    }
    return { state: "retry", reason: "storage deletion handler is not configured in Module 8" };
  }
}));

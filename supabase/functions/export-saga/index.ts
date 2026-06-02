import { createWorkerHandler } from "../_shared/worker.ts";

Deno.serve(createWorkerHandler({
  queueName: "export_jobs",
  claimRpc: "claim_export_job",
  jobTable: "export_jobs",
  workerPurpose: "export_saga",
  async handleJob() {
    return {
      state: "retry",
      reason: "export archive generation is reserved for Module 10"
    };
  }
}));

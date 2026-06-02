import { createWorkerHandler } from "../_shared/worker.ts";

Deno.serve(createWorkerHandler({
  queueName: "notification_queue",
  claimRpc: "claim_notification_job",
  jobTable: "notification_queue",
  workerPurpose: "send_notification",
  async handleJob() {
    return {
      state: "retry",
      reason: "notification provider handler is reserved for Module 10"
    };
  }
}));

import { createWorkerHandler } from "../_shared/worker.ts";
import { createServiceClient } from "../_shared/service-client.ts";
import { dispatchNotification } from "../_shared/notification-provider.ts";

Deno.serve(createWorkerHandler({
  queueName: "notification_queue",
  claimRpc: "claim_notification_job",
  jobTable: "notification_queue",
  workerPurpose: "send_notification",
  async handleJob(job) {
    const service = createServiceClient();
    await dispatchNotification(service, String(job.id));
    return { state: "complete", result: { notification_id: job.id } };
  }
}));

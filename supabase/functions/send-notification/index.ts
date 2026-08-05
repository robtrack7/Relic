import { createWorkerHandler } from "../_shared/worker.ts";
import { createServiceClient } from "../_shared/service-client.ts";
import { dispatchNotification } from "../_shared/notification-provider.ts";

Deno.serve(createWorkerHandler({
  queueName: "notification_queue",
  claimRpc: "claim_notification_job_for_worker",
  jobTable: "notification_queue",
  workerPurpose: "send_notification",
  async handleJob(job) {
    const service = createServiceClient();
    const delivery = await dispatchNotification(service, String(job.id));
    if (delivery.outcome === "retry") return { state: "retry", reason: delivery.reason };
    if (delivery.outcome === "failed") return { state: "failed", reason: delivery.reason };
    return { state: "managed", result: { outcome: delivery.outcome } };
  }
}));

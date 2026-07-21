import { createWorkerHandler } from "../_shared/worker.ts";
import { createServiceClient } from "../_shared/service-client.ts";
import { cleanupStoragePaths } from "../_shared/storage-cleanup.ts";

Deno.serve(createWorkerHandler({
  queueName: "cleanup_jobs",
  claimRpc: "claim_cleanup_job_for_worker",
  jobTable: "cleanup_jobs",
  workerPurpose: "cleanup_audio",
  async handleJob(job) {
    if (job.job_kind !== "audio") {
      return { state: "retry", reason: "claimed cleanup job is not audio cleanup" };
    }
    const service = createServiceClient();
    const result = await cleanupStoragePaths(service, { id: String(job.id), job_kind: String(job.job_kind), payload: job.payload as Record<string, unknown> });
    const { error } = await service.rpc("complete_cleanup_job_for_worker", {
      p_job_id: job.id,
      p_deleted_paths: result.deletedPaths,
      p_skipped_paths: result.skippedPaths
    });
    if (error) return { state: "retry", reason: error.message };
    return { state: "complete", result };
  }
}));

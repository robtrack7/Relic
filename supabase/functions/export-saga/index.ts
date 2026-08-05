import { createWorkerHandler } from "../_shared/worker.ts";
import { createServiceClient } from "../_shared/service-client.ts";
import { buildSagaExport } from "../_shared/export-builder.ts";

Deno.serve(createWorkerHandler({
  queueName: "export_jobs",
  claimRpc: "claim_export_job_for_worker",
  jobTable: "export_jobs",
  workerPurpose: "export_saga",
  async handleJob(job) {
    const service = createServiceClient();
    const result = await buildSagaExport(service, {
      id: String(job.id),
      workspace_id: String(job.workspace_id),
      world_id: String(job.world_id),
      saga_id: String(job.saga_id),
      requested_formats: Array.isArray(job.requested_formats) ? job.requested_formats.map(String) : undefined,
      include_audit: Boolean(job.include_audit),
      created_at: typeof job.created_at === "string" ? job.created_at : undefined
    });

    const { error } = await service.rpc("complete_export_job_for_worker", {
      p_export_id: job.id,
      p_storage_path: result.storagePath,
      p_archive_bytes: result.archiveBytes,
      p_archive_sha256: result.archiveSha256
    });
    if (error) {
      return { state: "retry", reason: error.message };
    }

    return {
      state: "complete",
      result: { archive_bytes: result.archiveBytes, entry_count: result.entryCount }
    };
  }
}));

type ExportJob = {
  id: string;
  workspace_id: string;
  world_id: string;
  saga_id: string;
  requested_formats?: string[];
};

export async function buildSagaExport(job: ExportJob) {
  const storagePath = `exports/${job.workspace_id}/${job.world_id}/${job.saga_id}/${job.id}.zip`;
  const configuredBase = Deno.env.get("EXPORT_DOWNLOAD_BASE_URL") ?? "https://local.relic.invalid/exports";

  // Module 10 keeps local exports deterministic; production can swap this for archive upload + signed URL creation.
  return {
    storagePath,
    downloadUrl: `${configuredBase.replace(/\/$/, "")}/${job.id}.zip`,
    manifest: {
      export_id: job.id,
      formats: job.requested_formats ?? ["json", "markdown"],
      storage_path: storagePath
    }
  };
}

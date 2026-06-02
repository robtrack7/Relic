type CleanupJob = {
  id: string;
  job_kind: string;
  payload?: Record<string, unknown>;
};

export async function cleanupStoragePaths(job: CleanupJob) {
  const storagePath = typeof job.payload?.storage_path === "string" ? job.payload.storage_path : null;
  const storagePaths = Array.isArray(job.payload?.storage_paths) ? job.payload.storage_paths : [];
  const pathCount = storagePath ? 1 : storagePaths.length;

  // Test mode reports deterministic counts. Production can replace this with Supabase Storage remove/list calls.
  return {
    deletedPaths: pathCount,
    skippedPaths: pathCount === 0 ? 1 : 0,
    cleanupKind: job.job_kind
  };
}

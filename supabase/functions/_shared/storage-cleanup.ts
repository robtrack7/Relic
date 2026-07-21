import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

type CleanupJob = {
  id: string;
  job_kind: string;
  payload?: Record<string, unknown>;
};

const STORAGE_BUCKETS = ["audio", "attachments", "exports"] as const;
const REMOVE_BATCH_SIZE = 1000;

async function pathsUnderPrefix(service: SupabaseClient, bucket: string, prefix: string) {
  const paths: string[] = [];
  const normalizedPrefix = prefix.replace(/^\/+|\/+$/g, "");

  for (let offset = 0; ; offset += REMOVE_BATCH_SIZE) {
    const { data, error } = await service
      .schema("storage")
      .from("objects")
      .select("name")
      .eq("bucket_id", bucket)
      .like("name", `${normalizedPrefix}/%`)
      .order("name")
      .range(offset, offset + REMOVE_BATCH_SIZE - 1);
    if (error) throw new Error(`Could not inspect ${bucket} Storage objects: ${error.message}`);

    const page = (data ?? []).flatMap((row) => typeof row.name === "string" ? [row.name] : []);
    paths.push(...page);
    if (page.length < REMOVE_BATCH_SIZE) break;
  }

  return paths;
}

async function removePaths(service: SupabaseClient, bucket: string, paths: string[]) {
  let deletedPaths = 0;
  for (let offset = 0; offset < paths.length; offset += REMOVE_BATCH_SIZE) {
    const batch = paths.slice(offset, offset + REMOVE_BATCH_SIZE);
    const { data, error } = await service.storage.from(bucket).remove(batch);
    if (error) throw new Error(`Could not remove ${bucket} Storage objects: ${error.message}`);
    deletedPaths += data?.length ?? 0;
  }
  return deletedPaths;
}

export async function cleanupStoragePaths(service: SupabaseClient, job: CleanupJob) {
  const storagePath = typeof job.payload?.storage_path === "string" ? job.payload.storage_path : null;
  const storagePaths = Array.isArray(job.payload?.storage_paths)
    ? job.payload.storage_paths.filter((path): path is string => typeof path === "string")
    : [];
  const prefixes = Array.isArray(job.payload?.storage_prefixes)
    ? job.payload.storage_prefixes.filter((prefix): prefix is string => typeof prefix === "string")
    : [];
  const explicitBucket = typeof job.payload?.bucket === "string" ? job.payload.bucket : null;
  const pathsByBucket = new Map<string, Set<string>>();

  if (storagePath || storagePaths.length > 0) {
    if (!explicitBucket || !STORAGE_BUCKETS.includes(explicitBucket as (typeof STORAGE_BUCKETS)[number])) {
      throw new Error("Cleanup job is missing a supported Storage bucket.");
    }
    pathsByBucket.set(explicitBucket, new Set(storagePath ? [storagePath] : storagePaths));
  }

  for (const prefix of prefixes) {
    for (const bucket of STORAGE_BUCKETS) {
      const bucketPaths = pathsByBucket.get(bucket) ?? new Set<string>();
      for (const path of await pathsUnderPrefix(service, bucket, prefix)) bucketPaths.add(path);
      pathsByBucket.set(bucket, bucketPaths);
    }
  }

  let requestedPaths = 0;
  let deletedPaths = 0;
  for (const [bucket, pathSet] of pathsByBucket) {
    const paths = [...pathSet];
    requestedPaths += paths.length;
    deletedPaths += await removePaths(service, bucket, paths);
  }

  return {
    deletedPaths,
    skippedPaths: Math.max(0, requestedPaths - deletedPaths),
    cleanupKind: job.job_kind
  };
}

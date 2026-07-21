import test from "node:test";
import assert from "node:assert/strict";
import { cleanupStoragePaths } from "../supabase/functions/_shared/storage-cleanup.ts";

function storageService(objects) {
  const removals = [];
  return {
    removals,
    schema(schemaName) {
      assert.equal(schemaName, "storage");
      return {
        from(tableName) {
          assert.equal(tableName, "objects");
          let bucket = "";
          const query = {
            select() { return query; },
            eq(column, value) {
              assert.equal(column, "bucket_id");
              bucket = value;
              return query;
            },
            like(column, value) {
              assert.equal(column, "name");
              assert.match(value, /\/%$/);
              return query;
            },
            order() { return query; },
            range(from, to) {
              return Promise.resolve({ data: (objects[bucket] ?? []).slice(from, to + 1).map((name) => ({ name })), error: null });
            }
          };
          return query;
        }
      };
    },
    storage: {
      from(bucket) {
        return {
          remove(paths) {
            removals.push({ bucket, paths });
            return Promise.resolve({ data: paths.map((name) => ({ name })), error: null });
          }
        };
      }
    }
  };
}

test("Saga cleanup discovers every scoped bucket and removes objects in API-sized batches", async () => {
  const prefix = "workspace/world/saga";
  const audio = Array.from({ length: 1001 }, (_, index) => `${prefix}/session/${index}.webm`);
  const attachments = [`${prefix}/entity/map.png`];
  const service = storageService({ audio, attachments, exports: [] });

  const result = await cleanupStoragePaths(service, {
    id: "job-a",
    job_kind: "saga",
    payload: { storage_prefixes: [prefix] }
  });

  assert.deepEqual(result, { deletedPaths: 1002, skippedPaths: 0, cleanupKind: "saga" });
  assert.equal(service.removals.length, 3);
  assert.deepEqual(service.removals.map(({ bucket, paths }) => [bucket, paths.length]), [
    ["audio", 1000],
    ["audio", 1],
    ["attachments", 1]
  ]);
  assert.equal(service.removals.every(({ paths }) => paths.every((path) => path.startsWith(`${prefix}/`))), true);
});

test("explicit cleanup fails closed without a supported bucket", async () => {
  const service = storageService({});
  await assert.rejects(
    cleanupStoragePaths(service, { id: "job-b", job_kind: "audio", payload: { storage_paths: ["one.webm"] } }),
    /supported Storage bucket/
  );
  assert.equal(service.removals.length, 0);
});

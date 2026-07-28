import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const demo = readFileSync(new URL("./manage-e3-staging-demo.mjs", import.meta.url), "utf8");

test("E3 staging demo is project-locked, owner-bound, stable, and removable", () => {
  assert.match(demo, /PROJECT_REF = "scagegrrilvrpuilthzz"/);
  assert.match(demo, /--owner-email=/);
  assert.match(demo, /relic_e3_staging_demo_v1/);
  assert.match(demo, /demo_workspace_collision/);
  assert.match(demo, /demo_marker_missing/);
  assert.match(demo, /demo_remove_guard_failed/);
  assert.match(demo, /delete from public\.workspaces where id='\$\{WORKSPACE_ID\}'/);
  assert.ok(
    demo.indexOf("delete from internal.guide_evidence_snapshots where workspace_id='${WORKSPACE_ID}'")
      < demo.indexOf("delete from public.workspaces where id='${WORKSPACE_ID}'"),
    "demo removal must delete frozen evidence before cited source rows cascade"
  );
  assert.ok(
    demo.indexOf("delete from public.workspaces where id='${WORKSPACE_ID}'")
      < demo.indexOf("delete from internal.ai_draft_batches where workspace_id='${WORKSPACE_ID}'"),
    "demo removal must cascade public drafts before deleting internal draft batches"
  );
  assert.doesNotMatch(demo, /delete from auth\.users/i);
  assert.doesNotMatch(demo, /insert into auth\.users/i);
});

test("E3 staging demo contains current, World, sibling, and unapproved-import evidence", () => {
  assert.match(demo, /The Amber Archive/);
  assert.match(demo, /The Glass Meridian/);
  assert.match(demo, /Amber Warden/);
  assert.match(demo, /Sunken Archive/);
  assert.match(demo, /Lantern Compact/);
  assert.match(demo, /Tideglass Key/);
  assert.match(demo, /The Waking Stacks/);
  assert.match(demo, /Moon-Tide Protocol/);
  assert.match(demo, /ready_for_review/);
});

test("E3 demo embedding build is separately authorized and hard bounded", () => {
  assert.match(demo, /--build-embeddings/);
  assert.match(demo, /--execute-provider/);
  assert.match(demo, /MAX_EMBEDDING_ATTEMPTS = 8/);
  assert.match(demo, /MAX_EMBEDDING_COST_USD = 0\.05/);
  assert.match(demo, /waitForEmbeddingProxyHealthy/);
  assert.match(demo, /health\/liveliness/);
  assert.ok(
    demo.indexOf("await waitForEmbeddingProxyHealthy()")
      < demo.indexOf("\"pause_embedding_schedule\""),
    "the staging proxy must be warm before demo jobs become dispatchable"
  );
  assert.match(demo, /scheduled_at=now\(\)\+interval '100 years'/);
  assert.match(demo, /replay_embedding_job_for_worker/);
  assert.match(demo, /non_demo_ready/);
  assert.match(demo, /pause_embedding_schedule/);
  assert.match(demo, /getFunctionVerifyJwt\("embed-row-dispatch"\)/);
  assert.match(demo, /typeof current\.verify_jwt !== "boolean"/);
  assert.match(demo, /restore_embedding_schedule/);
  assert.match(demo, /--no-verify-jwt/);
  assert.match(demo, /if \(!priorGatewayVerifyJwt\) restoreArgs\.push\("--no-verify-jwt"\)/);
  assert.match(demo, /restore_embedding_gateway/);
  assert.match(demo, /secrets_printed:\s*false/);
  assert.match(demo, /payloads_printed:\s*false/);
  assert.doesNotMatch(demo, /console\.(?:log|error)\([^)]*(?:internalToken|INTERNAL_TOKEN)/);
});

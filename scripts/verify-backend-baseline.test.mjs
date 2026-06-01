import test from "node:test";
import assert from "node:assert/strict";

import { getSpawnPlan, redactOutput } from "./verify-backend-baseline.mjs";

test("redacts local Supabase secrets from CLI output", () => {
  const output = [
    "Publishable sb_publishable_example",
    "Secret sb_secret_example",
    "Access Key local-access-key",
    "Secret Key local-secret-key",
    "Project URL http://127.0.0.1:54321"
  ].join("\n");

  assert.equal(
    redactOutput(output),
    [
      "Publishable [redacted]",
      "Secret [redacted]",
      "Access Key [redacted]",
      "Secret Key [redacted]",
      "Project URL http://127.0.0.1:54321"
    ].join("\n")
  );
});

test("uses cmd.exe for Windows npm and npx commands", () => {
  assert.deepEqual(getSpawnPlan("npm", ["run", "verify"], "win32"), {
    command: "cmd.exe",
    args: ["/d", "/s", "/c", "npm run verify"]
  });
  assert.deepEqual(getSpawnPlan("npx", ["pnpm@10.11.0", "--filter", "@relic/web", "test"], "win32"), {
    command: "cmd.exe",
    args: ["/d", "/s", "/c", "npx pnpm@10.11.0 --filter @relic/web test"]
  });
  assert.deepEqual(getSpawnPlan("supabase", ["status"], "win32"), {
    command: "supabase",
    args: ["status"]
  });
  assert.deepEqual(getSpawnPlan("npm", ["run", "verify"], "linux"), {
    command: "npm",
    args: ["run", "verify"]
  });
});

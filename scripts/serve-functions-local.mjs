import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";

const root = process.cwd();
const sourceEnvPath = process.env.RELIC_EDGE_ENV_FILE
  ? join(root, process.env.RELIC_EDGE_ENV_FILE)
  : join(root, "supabase", ".env.local");

if (!existsSync(sourceEnvPath)) {
  throw new Error("Missing supabase/.env.local. Copy the example and configure server-only local values first.");
}

const configuredContainer = process.env.SUPABASE_AUTH_CONTAINER?.trim();
const containerResult = configuredContainer
  ? { status: 0, stdout: `${configuredContainer}\n`, stderr: "" }
  : spawnSync(
    "docker",
    ["ps", "--filter", "name=^/supabase_auth_", "--format", "{{.Names}}"],
    { encoding: "utf8" },
  );

if (containerResult.status !== 0) {
  throw new Error("Could not inspect the local Supabase Auth container. Is Docker running?");
}

const authContainers = containerResult.stdout.split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
if (authContainers.length !== 1) {
  throw new Error("Expected one local Supabase Auth container. Set SUPABASE_AUTH_CONTAINER when multiple projects are running.");
}

const secretResult = spawnSync(
  "docker",
  ["exec", authContainers[0], "printenv", "GOTRUE_JWT_SECRET"],
  { encoding: "utf8" },
);
const jwtSecret = secretResult.stdout.trim();
if (secretResult.status !== 0 || !jwtSecret || /[\r\n]/.test(jwtSecret)) {
  throw new Error("The local Supabase Auth JWT secret is unavailable.");
}

const sourceEnv = readFileSync(sourceEnvPath, "utf8")
  .split(/\r?\n/)
  .filter((line) => !/^RELIC_JWT_SIGNING_SECRET\s*=/.test(line))
  .join("\n")
  .replace(/\n*$/, "\n");
const runtimeEnvPath = join(tmpdir(), `relic-edge-${randomUUID()}.env`);
writeFileSync(runtimeEnvPath, `${sourceEnv}RELIC_JWT_SIGNING_SECRET=${jwtSecret}\n`, { mode: 0o600 });

let child;
function cleanup() {
  if (existsSync(runtimeEnvPath)) unlinkSync(runtimeEnvPath);
}

process.once("exit", cleanup);
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    child?.kill(signal);
    cleanup();
    process.exit(signal === "SIGINT" ? 130 : 143);
  });
}

const executable = process.platform === "win32" ? "supabase.exe" : "supabase";
child = spawn(
  executable,
  ["functions", "serve", "--env-file", runtimeEnvPath, "--no-verify-jwt"],
  { cwd: root, env: process.env, stdio: "inherit" },
);

child.once("error", (error) => {
  cleanup();
  throw error;
});
child.once("exit", (code, signal) => {
  cleanup();
  if (signal) process.kill(process.pid, signal);
  else process.exitCode = code ?? 1;
});

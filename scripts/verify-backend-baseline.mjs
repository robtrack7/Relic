import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const redactionPatterns = [
  /(Publishable\s+).+/i,
  /(Access Key\s+).+/i,
  /(Secret Key\s+).+/i,
  /(Secret\s+)(?!Key).+/i,
  /(JWT secret\s*[:=]\s*).+/i,
  /(service_role\s*[:=]\s*).+/i,
  /(anon key\s*[:=]\s*).+/i
];

export function redactOutput(text) {
  return text
    .split(/\r?\n/)
    .map((line) => {
      let next = line;
      for (const pattern of redactionPatterns) {
        next = next.replace(pattern, "$1[redacted]");
      }
      return next;
    })
    .join("\n");
}

function commandToString(command, commandArgs) {
  return [command, ...commandArgs].join(" ");
}

export function getSpawnPlan(command, commandArgs, platform = process.platform) {
  if (platform === "win32" && (command === "npm" || command === "npx")) {
    return {
      command: "cmd.exe",
      args: ["/d", "/s", "/c", commandToString(command, commandArgs)]
    };
  }
  return { command, args: commandArgs };
}

function run(command, commandArgs, options = {}) {
  return new Promise((resolve) => {
    const label = commandToString(command, commandArgs);
    console.log(`\n> ${label}`);
    const plan = getSpawnPlan(command, commandArgs);
    const child = spawn(plan.command, plan.args, {
      cwd: process.cwd(),
      env: process.env
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
      if (!options.quiet) {
        process.stdout.write(redactOutput(chunk.toString()));
      }
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
      if (!options.quiet) {
        process.stderr.write(redactOutput(chunk.toString()));
      }
    });

    child.on("close", (code) => {
      resolve({ code, stdout, stderr, label });
    });
  });
}

async function runRequired(command, commandArgs, options = {}) {
  const result = await run(command, commandArgs, options);
  if (result.code !== 0) {
    console.error(`\nBASELINE_FAILED: ${result.label}`);
    process.exit(result.code ?? 1);
  }
  return result;
}

export function isSupabaseResetRestartFailure(result) {
  const output = `${result.stdout}\n${result.stderr}`;
  return result.code !== 0
    && output.includes("Restarting containers")
    && output.includes("Error status 502");
}

async function runSupabaseReset() {
  const result = await run("supabase", ["db", "reset", "--local", "--yes"]);
  if (result.code === 0) {
    return result;
  }

  if (isSupabaseResetRestartFailure(result)) {
    console.error("\nSupabase reset replayed migrations but failed during container restart with 502; restarting stack before SQL tests.");
    await runRequired("supabase", ["start"]);
    return result;
  }

  console.error(`\nBASELINE_FAILED: ${result.label}`);
  process.exit(result.code ?? 1);
}

async function ensureSupabaseStarted({ skipStart }) {
  if (skipStart) {
    console.log("\nSkipping Supabase start because --skip-start was provided.");
    return;
  }

  const status = await run("supabase", ["status"], { quiet: true });
  if (status.code === 0) {
    console.log("\nSupabase local stack is already running.");
    return;
  }

  console.log("\nSupabase local stack is not running; starting it now.");
  await runRequired("supabase", ["start"]);
}

export async function main(argv = process.argv.slice(2)) {
  const args = new Set(argv);
  const shouldReset = args.has("--reset");
  const skipStart = args.has("--skip-start");
  const shouldStop = args.has("--stop");

  await runRequired("npm", ["run", "test:scripts"]);
  await runRequired("npm", ["run", "verify"]);
  await runRequired("npx", ["pnpm@10.11.0", "--filter", "@relic/web", "test"]);
  await ensureSupabaseStarted({ skipStart });

  if (shouldReset) {
    await runSupabaseReset();
  }

  await runRequired("npm", ["run", "test:supabase"]);

  if (shouldStop) {
    // Keeps CI/local cleanup explicit; the default leaves the stack warm for debugging.
    await runRequired("supabase", ["stop", "--no-backup"]);
  }

  console.log("\nRELIC_BACKEND_BASELINE_OK");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}

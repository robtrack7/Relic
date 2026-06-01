---
status: active
authority: secondary
scope: planning
read_after:
  - "[[00 - Start Here]]"
  - "[[46 - Backend Audit and Module Plan]]"
depends_on:
  - "[[41 - Foundation Implementation Plan]]"
  - "[[46 - Backend Audit and Module Plan]]"
supersedes: []
last_audited: 2026-06-01
source_file: "Relic Vault/47 - Backend Module 0 Baseline Plan.md"
---

# Backend Module 0 Baseline Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a repeatable backend baseline command that starts local Supabase safely, runs repo/web/Supabase verification, and proves migrations can replay cleanly before backend behavior changes.

**Architecture:** Keep Module 0 small: one Node orchestration script in `scripts/`, two package scripts, and documentation links in the vault/Supabase README. The script wraps existing commands, redacts local Supabase keys from CLI output, and supports a deliberate `--reset` mode for migration replay verification.

**Tech Stack:** Node.js 22+, npm scripts, `npx pnpm@10.11.0`, Supabase CLI 2.x, Docker Desktop, Vitest, pgTAP.

---

## Current Baseline Observed

Verified on 2026-06-01:

- Docker Desktop is running and reachable.
- `supabase start` applies all current migrations and seed data.
- `npm run test:supabase` passes: 1 file, 32 tests.
- `npm run verify` passes.
- `npx pnpm@10.11.0 --filter @relic/web test` passes: 7 files, 12 tests.

Do not record local API keys, JWT secrets, storage keys, or other local Supabase secrets in notes, logs, commits, or test snapshots.

## File Structure

- Create `scripts/verify-backend-baseline.mjs`: orchestrates backend baseline verification and optional local database reset.
- Modify `package.json`: adds stable `backend:baseline` and `backend:baseline:reset` scripts.
- Modify `supabase/README.md`: documents the new baseline workflow and what counts as Module 0 done.
- Modify `Relic Vault/46 - Backend Audit and Module Plan.md`: links Module 0 to this plan.
- Modify `Relic Vault/02 - Source Map.md`: adds the Module 0 plan to active planning sources.
- Modify `Relic Vault/50 - Session Log Index.md`: session closeout only, after implementation.

## Task 1: Add Backend Baseline Runner

**Files:**

- Create: `scripts/verify-backend-baseline.mjs`

- [ ] **Step 1: Create the runner**

Add this file:

```js
import { spawn } from "node:child_process";

const args = new Set(process.argv.slice(2));
const shouldReset = args.has("--reset");
const skipStart = args.has("--skip-start");
const shouldStop = args.has("--stop");

const redactionPatterns = [
  /(Publishable\s+).+/i,
  /(Secret\s+).+/i,
  /(Access Key\s+).+/i,
  /(Secret Key\s+).+/i,
  /(JWT secret\s*[:=]\s*).+/i,
  /(service_role\s*[:=]\s*).+/i,
  /(anon key\s*[:=]\s*).+/i
];

function redact(text) {
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

function run(command, commandArgs, options = {}) {
  return new Promise((resolve) => {
    const label = commandToString(command, commandArgs);
    console.log(`\n> ${label}`);
    const child = spawn(command, commandArgs, {
      cwd: process.cwd(),
      shell: process.platform === "win32",
      env: process.env
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
      if (!options.quiet) {
        process.stdout.write(redact(chunk.toString()));
      }
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
      if (!options.quiet) {
        process.stderr.write(redact(chunk.toString()));
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

async function ensureSupabaseStarted() {
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

await runRequired("npm", ["run", "verify"]);
await runRequired("npx", ["pnpm@10.11.0", "--filter", "@relic/web", "test"]);
await ensureSupabaseStarted();

if (shouldReset) {
  await runRequired("supabase", ["db", "reset", "--local", "--yes"]);
}

await runRequired("npm", ["run", "test:supabase"]);

if (shouldStop) {
  await runRequired("supabase", ["stop", "--no-backup"]);
}

console.log("\nRELIC_BACKEND_BASELINE_OK");
```

- [ ] **Step 2: Run the runner without reset**

Run:

```powershell
node scripts/verify-backend-baseline.mjs
```

Expected:

```text
RELIC_REPO_VERIFY_OK
Test Files  7 passed
Tests  12 passed
/Playground/RELIC/supabase/tests/foundation.sql .. ok
Result: PASS
RELIC_BACKEND_BASELINE_OK
```

- [ ] **Step 3: Commit Task 1**

Run:

```powershell
git add scripts/verify-backend-baseline.mjs
git commit -m "chore: add backend baseline verifier"
```

## Task 2: Add Package Scripts

**Files:**

- Modify: `package.json`

- [ ] **Step 1: Update scripts**

Change the scripts block to include the two new commands:

```json
{
  "scripts": {
    "verify": "node scripts/verify-repo.mjs",
    "backend:baseline": "node scripts/verify-backend-baseline.mjs",
    "backend:baseline:reset": "node scripts/verify-backend-baseline.mjs --reset",
    "dev:web": "pnpm --filter @relic/web dev",
    "build:web": "pnpm --filter @relic/web build",
    "lint:web": "pnpm --filter @relic/web lint",
    "test:web": "pnpm --filter @relic/web test",
    "supabase:start": "supabase start",
    "supabase:stop": "supabase stop --no-backup",
    "test:supabase": "supabase test db"
  }
}
```

- [ ] **Step 2: Run baseline through npm**

Run:

```powershell
npm run backend:baseline
```

Expected:

```text
RELIC_BACKEND_BASELINE_OK
```

- [ ] **Step 3: Run reset baseline**

Run:

```powershell
npm run backend:baseline:reset
```

Expected:

```text
Applying migration 001_extensions_enums.sql
Applying migration 002_workspace_world_saga_hierarchy.sql
Applying migration 003_canon_entities_notes_sources.sql
Applying migration 004_sessions_pipeline_evidence.sql
Applying migration 005_usage_quota_jobs.sql
Applying migration 006_storage_buckets_policies.sql
Applying migration 007_rls_helpers_policies.sql
Applying migration 008_retrieval_functions.sql
Applying migration 009_seed_fixtures.sql
Applying migration 20260526155312_foundation_security_hardening.sql
Result: PASS
RELIC_BACKEND_BASELINE_OK
```

- [ ] **Step 4: Commit Task 2**

Run:

```powershell
git add package.json
git commit -m "chore: add backend baseline scripts"
```

## Task 3: Document Module 0 Workflow

**Files:**

- Modify: `supabase/README.md`
- Modify: `Relic Vault/46 - Backend Audit and Module Plan.md`
- Modify: `Relic Vault/02 - Source Map.md`

- [ ] **Step 1: Update `supabase/README.md`**

Replace the `Local Foundation Checks` section with:

````markdown
## Local Foundation Checks

Install Docker Desktop and the Supabase CLI, then run the backend baseline:

```bash
npm run backend:baseline
```

This command runs:

- `npm run verify`
- `npx pnpm@10.11.0 --filter @relic/web test`
- `supabase start` when the local stack is not already running
- `npm run test:supabase`

To prove migrations replay cleanly from the current migration set, run:

```bash
npm run backend:baseline:reset
```

The reset command applies local migrations, runs seed data, then runs the pgTAP harness in `supabase/tests/foundation.sql`.

Do not paste local Supabase keys, JWT secrets, storage keys, or generated service credentials into notes, logs, commits, or screenshots.
````

- [ ] **Step 2: Update Module 0 in `Relic Vault/46 - Backend Audit and Module Plan.md`**

Add this sentence under `Module 0 - Baseline Verification and Migration Hygiene` after the goal:

```markdown
Detailed execution plan: [[47 - Backend Module 0 Baseline Plan]].
```

- [ ] **Step 3: Update `Relic Vault/02 - Source Map.md`**

Add this row after `[[46 - Backend Audit and Module Plan]]`:

```markdown
| [[47 - Backend Module 0 Baseline Plan]] | Detailed implementation plan for repeatable backend baseline verification | Planning |
```

- [ ] **Step 4: Run documentation checks**

Run:

```powershell
npm run verify
```

Expected:

```text
RELIC_REPO_VERIFY_OK
```

Run the vault link check:

```powershell
$vault = Join-Path (Get-Location) 'Relic Vault'; $missing = @(); Get-ChildItem -LiteralPath $vault -Recurse -Filter '*.md' | ForEach-Object { $file=$_.FullName; $text=Get-Content -LiteralPath $file -Raw; [regex]::Matches($text, '\[\[([^\]|#]+)(?:[#|][^\]]*)?\]\]') | ForEach-Object { $target=$_.Groups[1].Value.Trim(); $candidate = Join-Path $vault ($target + '.md'); if (-not (Test-Path -LiteralPath $candidate)) { $candidate2 = Join-Path $vault $target; if (-not (Test-Path -LiteralPath $candidate2)) { $missing += [pscustomobject]@{File=$file.Substring($vault.Length+1); Link=$target} } } } }; if ($missing.Count -gt 0) { $missing | Sort-Object File, Link | Format-Table -AutoSize; exit 1 } else { 'OBSIDIAN_LINK_CHECK_OK' }
```

Expected:

```text
OBSIDIAN_LINK_CHECK_OK
```

- [ ] **Step 5: Commit Task 3**

Run:

```powershell
git add supabase/README.md "Relic Vault/46 - Backend Audit and Module Plan.md" "Relic Vault/02 - Source Map.md"
git commit -m "docs: document backend baseline workflow"
```

## Task 4: Close Module 0 With Evidence

**Files:**

- Modify: `Relic Vault/47 - Backend Module 0 Baseline Plan.md`
- Create: `Relic Vault/Session Logs/YYYY-MM-DD - Backend Module 0 Baseline.md`
- Modify: `Relic Vault/50 - Session Log Index.md`

- [ ] **Step 1: Run final reset baseline**

Run:

```powershell
npm run backend:baseline:reset
```

Expected:

```text
RELIC_BACKEND_BASELINE_OK
```

- [ ] **Step 2: Mark observed Module 0 evidence in this plan**

Under `Current Baseline Observed`, add a dated line:

```markdown
- Module 0 implementation verified on YYYY-MM-DD with `npm run backend:baseline:reset`: passed.
```

- [ ] **Step 3: Add session log**

Create `Relic Vault/Session Logs/YYYY-MM-DD - Backend Module 0 Baseline.md`:

````markdown
---
status: active
authority: support
scope: operations
read_after:
  - "[[50 - Session Log Index]]"
depends_on:
  - "[[47 - Backend Module 0 Baseline Plan]]"
supersedes: []
last_audited: YYYY-MM-DD
source_file: "Relic Vault/Session Logs/YYYY-MM-DD - Backend Module 0 Baseline.md"
---

# YYYY-MM-DD - Backend Module 0 Baseline

Backlink: [[50 - Session Log Index]]

## Accomplished

- Implemented the repeatable backend baseline runner from [[47 - Backend Module 0 Baseline Plan]].
- Added `backend:baseline` and `backend:baseline:reset` package scripts.
- Verified local Supabase migrations replay and pgTAP tests pass.

## Files And Notes Changed

- `scripts/verify-backend-baseline.mjs`
- `package.json`
- `supabase/README.md`
- [[46 - Backend Audit and Module Plan]]
- [[47 - Backend Module 0 Baseline Plan]]
- [[02 - Source Map]]
- [[50 - Session Log Index]]

## Verification Run

- `npm run backend:baseline:reset`: passed.
- `npm run verify`: passed.
- Vault link check: passed.

## Open Follow-Ups

- Proceed to [[46 - Backend Audit and Module Plan]] Module 1: Access Control, RLS, and RPC Boundary.
````

- [ ] **Step 4: Link the log from `Relic Vault/50 - Session Log Index.md`**

Add:

```markdown
- `Session Logs/YYYY-MM-DD - Backend Module 0 Baseline`
```

- [ ] **Step 5: Commit Task 4**

Run:

```powershell
git add "Relic Vault/47 - Backend Module 0 Baseline Plan.md" "Relic Vault/Session Logs/YYYY-MM-DD - Backend Module 0 Baseline.md" "Relic Vault/50 - Session Log Index.md"
git commit -m "docs: record backend module 0 baseline"
```

## Final Verification

Run:

```powershell
npm run backend:baseline:reset
npm run verify
```

Expected:

```text
RELIC_BACKEND_BASELINE_OK
RELIC_REPO_VERIFY_OK
```

Then inspect intended changes:

```powershell
git status --short
git log --oneline -4
```

Expected:

```text
# only unrelated pre-existing local files may remain uncommitted
```

## Self-Review

- Spec coverage: This plan covers all Module 0 done conditions from [[46 - Backend Audit and Module Plan]]: repo verify, web tests, Supabase SQL tests, documented blocker handling, and resettable migration chain.
- Placeholder scan: No implementation step uses open-ended placeholders. The only `YYYY-MM-DD` values are explicit date substitutions for the session log created during execution.
- Type and command consistency: Package scripts call the Node runner; the Node runner calls existing repo scripts and Supabase CLI commands discovered by `supabase --help`, `supabase test --help`, and `supabase db reset --help`.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const requiredPaths = [
  "AGENTS.md",
  "Relic Vault/00 - Start Here.md",
  "Relic Vault/44 - Repo Bootstrap and GitHub Setup Plan.md",
  "Relic Vault/48 - Backend Module 1 Access Control Plan.md",
  "apps/web/README.md",
  "apps/mobile/README.md",
  "packages/core/src/index.ts",
  "packages/config/README.md",
  "supabase/README.md",
  "supabase/functions/.gitkeep",
  "supabase/tests/.gitkeep",
  "supabase/fixtures/.gitkeep",
  "supabase/config.toml",
  "supabase/migrations/001_extensions_enums.sql",
  "supabase/migrations/002_workspace_world_saga_hierarchy.sql",
  "supabase/migrations/003_canon_entities_notes_sources.sql",
  "supabase/migrations/004_sessions_pipeline_evidence.sql",
  "supabase/migrations/005_usage_quota_jobs.sql",
  "supabase/migrations/006_storage_buckets_policies.sql",
  "supabase/migrations/007_rls_helpers_policies.sql",
  "supabase/migrations/008_retrieval_functions.sql",
  "supabase/migrations/009_seed_fixtures.sql",
  "supabase/migrations/20260601171914_access_control_boundary.sql",
  "supabase/seed.sql",
  "supabase/security/rpc-boundary.md",
  "supabase/tests/access_control.sql",
  "supabase/tests/foundation.sql",
  "supabase/fixtures/foundation.sql",
  "scripts/verify-backend-baseline.mjs",
  "scripts/verify-backend-baseline.test.mjs",
  "services/litellm/README.md",
  ".github/workflows/ci.yml",
  ".github/pull_request_template.md"
];

const forbiddenAiImplementationPatterns = [
  /fetch\s*\(\s*["'`]https?:\/\/[^"'`]*litellm/i,
  /new\s+OpenAI\s*\(/i,
  /new\s+Anthropic\s*\(/i,
  /from\s+["'`]openai["'`]/i,
  /from\s+["'`]@anthropic-ai\//i,
  /generate_session_prep@/i,
  /synthesize_session@/i,
  /scaffold_saga@/i
];

const failures = [];

for (const requiredPath of requiredPaths) {
  if (!existsSync(join(process.cwd(), requiredPath))) {
    failures.push(`Missing required path: ${requiredPath}`);
  }
}

const coreFile = join(process.cwd(), "packages/core/src/index.ts");
if (existsSync(coreFile)) {
  const coreSource = readFileSync(coreFile, "utf8");
  for (const pattern of forbiddenAiImplementationPatterns) {
    if (pattern.test(coreSource)) {
      failures.push(`Forbidden AI implementation pattern in packages/core/src/index.ts: ${pattern}`);
    }
  }
}

const implementationRoots = [
  "apps",
  "packages",
  "services",
  "supabase/functions"
];

function walkFiles(root) {
  const rootPath = join(process.cwd(), root);
  if (!existsSync(rootPath)) {
    return [];
  }

  const files = [];
  const stack = [rootPath];
  const ignoredDirectories = new Set(["node_modules", ".next", "coverage", "test-results", "playwright-report"]);
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const fullPath = join(current, entry.name);
      if (entry.isDirectory()) {
        if (!ignoredDirectories.has(entry.name)) {
          stack.push(fullPath);
        }
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    }
  }
  return files;
}

for (const root of implementationRoots) {
  for (const filePath of await walkFiles(root)) {
    const source = readFileSync(filePath, "utf8");
    for (const pattern of forbiddenAiImplementationPatterns) {
      if (pattern.test(source)) {
        failures.push(`Forbidden AI implementation pattern in ${filePath}: ${pattern}`);
      }
    }
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("RELIC_REPO_VERIFY_OK");

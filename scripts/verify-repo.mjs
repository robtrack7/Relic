import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const requiredPaths = [
  "AGENTS.md",
  "Relic Vault/00 - Start Here.md",
  "Relic Vault/44 - Repo Bootstrap and GitHub Setup Plan.md",
  "apps/web/README.md",
  "apps/mobile/README.md",
  "packages/core/src/index.ts",
  "packages/config/README.md",
  "supabase/README.md",
  "supabase/migrations/.gitkeep",
  "supabase/functions/.gitkeep",
  "supabase/tests/.gitkeep",
  "supabase/fixtures/.gitkeep",
  "services/litellm/README.md",
  ".github/workflows/ci.yml",
  ".github/pull_request_template.md"
];

const forbiddenAiImplementationPatterns = [
  /fetch\s*\(\s*["'`]https?:\/\/[^"'`]*litellm/i,
  /new\s+OpenAI\s*\(/i,
  /new\s+Anthropic\s*\(/i,
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

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("RELIC_REPO_VERIFY_OK");

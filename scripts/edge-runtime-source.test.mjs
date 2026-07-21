import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const functionsRoot = join(root, "supabase", "functions");

function read(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

function walkFiles(directory) {
  const files = [];
  const stack = [directory];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const fullPath = join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    }
  }
  return files;
}

test("module 8 edge runtime function tree exists", () => {
  const expectedFiles = [
    "supabase/functions/_shared/http.ts",
    "supabase/functions/_shared/internal-auth.ts",
    "supabase/functions/_shared/service-client.ts",
    "supabase/functions/_shared/scoped-client.ts",
    "supabase/functions/_shared/worker.ts",
    "supabase/functions/_shared/ai-contracts.ts",
    "supabase/functions/_shared/ai-schemas.ts",
    "supabase/functions/_shared/ai-provider.ts",
    "supabase/functions/_shared/export-builder.ts",
    "supabase/functions/_shared/storage-cleanup.ts",
    "supabase/functions/_shared/notification-provider.ts",
    "supabase/functions/_shared/transcription-provider.ts",
    "supabase/functions/issue-scoped-jwt/index.ts",
    "supabase/functions/ai-task-runner/index.ts",
    "supabase/functions/embed-row-dispatch/index.ts",
    "supabase/functions/transcribe-session/index.ts",
    "supabase/functions/cleanup-audio/index.ts",
    "supabase/functions/cleanup-saga/index.ts",
    "supabase/functions/export-saga/index.ts",
    "supabase/functions/send-notification/index.ts",
    "supabase/functions/transcript-edit-reembed/index.ts"
  ];

  for (const file of expectedFiles) {
    assert.equal(existsSync(join(root, file)), true, `${file} should exist`);
  }
});

test("transcription worker uses scoped audio, provider, result, and usage boundaries", () => {
  const worker = read("supabase/functions/transcribe-session/index.ts");
  const provider = read("supabase/functions/_shared/transcription-provider.ts");

  assert.match(worker, /createScopedClient/, "transcription should read user audio through scoped identity");
  assert.match(worker, /\.order\("sequence"/, "transcription should assemble audio chunks in sequence");
  assert.match(worker, /complete_transcription_job_for_worker/, "transcription should use the worker result RPC");
  assert.match(worker, /record_usage_event/, "successful transcription should meter duration once");
  assert.doesNotMatch(worker, /provider handler is not configured/i, "transcription worker should not remain a provider stub");
  assert.match(provider, /audio\/transcriptions/, "provider should use the OpenAI-compatible audio endpoint");
  assert.match(provider, /verbose_json/, "provider should request timestamped segments");
  assert.match(provider, /relic-transcribe/, "provider should use the canonical LiteLLM alias");
  assert.match(provider, /TRANSCRIPTION_PROVIDER_MODE"\) \?\? "live"/, "provider should fail closed into live configuration unless test mode is explicit");
  assert.doesNotMatch(provider, /fetch\s*\(\s*["'`]https?:\/\//i, "provider should not hardcode a provider URL");
});

test("ai task runner uses internal auth and provider adapter boundaries", () => {
  const runner = read("supabase/functions/ai-task-runner/index.ts");
  const provider = read("supabase/functions/_shared/ai-provider.ts");

  assert.match(runner, /requireInternalAuth/, "AI task runner should require internal auth");
  assert.match(runner, /callAiProvider/, "AI task runner should use the shared provider adapter");
  assert.match(runner, /p_resolved_model:\s*providerResult\.resolvedModel/, "AI task runner should persist the resolved model used for the accepted output");
  assert.match(runner, /p_resolved_provider:\s*providerResult\.provider/, "AI task runner should persist provider provenance for the accepted output");
  assert.match(provider, /provider:\s*"deterministic-test"/, "deterministic provider mode should identify its provenance");
  assert.doesNotMatch(provider, /new\s+OpenAI\s*\(/i, "provider adapter should not construct OpenAI clients directly");
  assert.doesNotMatch(provider, /new\s+Anthropic\s*\(/i, "provider adapter should not construct Anthropic clients directly");
  assert.doesNotMatch(provider, /fetch\s*\(\s*["'`]https?:\/\//i, "provider adapter should not hardcode provider URLs");
});

test("only issue-scoped-jwt reads the Supabase JWT secret", () => {
  const files = walkFiles(functionsRoot);
  const secretReaders = files
    .filter((file) => readFileSync(file, "utf8").includes("SUPABASE_JWT_SECRET"))
    .map((file) => file.replace(`${root}\\`, "").replaceAll("\\", "/"));

  assert.deepEqual(secretReaders, ["supabase/functions/issue-scoped-jwt/index.ts"]);
});

test("edge runtime source does not contain checked-in local secrets", () => {
  const forbiddenSecretPatterns = [
    /sb_secret_[A-Za-z0-9_-]+/,
    /sb_publishable_[A-Za-z0-9_-]+/,
    /SUPABASE_SERVICE_ROLE_KEY\s*=\s*["'][^"']+["']/,
    /INTERNAL_TOKEN\s*=\s*["'][^"']+["']/,
    /SUPABASE_JWT_SECRET\s*=\s*["'][^"']+["']/
  ];

  for (const file of walkFiles(functionsRoot)) {
    const source = readFileSync(file, "utf8");
    for (const pattern of forbiddenSecretPatterns) {
      assert.equal(pattern.test(source), false, `${file} should not match ${pattern}`);
    }
  }
});

test("worker dispatchers use the shared runtime wrapper", () => {
  const dispatchers = [
    "embed-row-dispatch",
    "transcribe-session",
    "cleanup-audio",
    "cleanup-saga",
    "export-saga",
    "send-notification",
    "transcript-edit-reembed"
  ];

  for (const dispatcher of dispatchers) {
    const source = read(`supabase/functions/${dispatcher}/index.ts`);
    assert.match(source, /createWorkerHandler/, `${dispatcher} should use the shared worker wrapper`);
    assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE_KEY/, `${dispatcher} should not read service credentials directly`);
    assert.doesNotMatch(source, /SUPABASE_JWT_SECRET/, `${dispatcher} should not read JWT secret directly`);
  }
});

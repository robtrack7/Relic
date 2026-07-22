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
    "supabase/functions/_shared/embedding-provider.ts",
    "supabase/functions/_shared/embedding-worker.ts",
    "supabase/functions/issue-scoped-jwt/index.ts",
    "supabase/functions/ai-task-runner/index.ts",
    "supabase/functions/embed-row-dispatch/index.ts",
    "supabase/functions/transcribe-session/index.ts",
    "supabase/functions/cleanup-audio/index.ts",
    "supabase/functions/cleanup-saga/index.ts",
    "supabase/functions/export-saga/index.ts",
    "supabase/functions/send-notification/index.ts",
    "supabase/functions/transcript-edit-reembed/index.ts"
    ,"supabase/functions/hybrid-search/index.ts"
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

test("embedding delivery uses the scoped worker, validated provider, and lexical fallback boundaries", () => {
  const dispatcher = read("supabase/functions/embed-row-dispatch/index.ts");
  const transcriptDispatcher = read("supabase/functions/transcript-edit-reembed/index.ts");
  const worker = read("supabase/functions/_shared/embedding-worker.ts");
  const provider = read("supabase/functions/_shared/embedding-provider.ts");
  const hybrid = read("supabase/functions/hybrid-search/index.ts");

  assert.match(dispatcher, /createEmbeddingWorkerHandler/, "embedding dispatcher should use the real worker lifecycle");
  assert.match(transcriptDispatcher, /claim_transcript_embedding_job_for_worker/, "transcript worker should claim only transcript work");
  assert.match(worker, /prepare_embedding_job/, "worker input should be prepared through scoped identity");
  assert.match(worker, /complete_embedding_job_for_worker/, "worker should persist through the service-only completion boundary");
  assert.match(worker, /fail_embedding_job_for_worker/, "worker should classify failures through the embedding lifecycle");
  assert.match(provider, /EMBEDDING_PROVIDER_MODE.*live/s, "embedding provider should default to live mode");
  assert.match(provider, /deterministic-development-test/, "deterministic provenance should be explicit");
  assert.doesNotMatch(provider, /fetch\s*\(\s*["'`]https?:\/\//i, "provider should not hardcode a hosted URL");
  assert.match(hybrid, /requireInternalAuth/, "query embedding should be server-only");
  assert.match(hybrid, /search_for_ui_hybrid/, "hybrid search should use the vector-aware RPC");
  assert.match(hybrid, /search_for_ui/, "hybrid search should retain lexical fallback");
  assert.doesNotMatch(hybrid, /query_text:\s*query[^,]*[,}]\s*\}\)/, "telemetry must not log raw queries");
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

test("only issue-scoped-jwt reads the Relic JWT signing secret", () => {
  const files = walkFiles(functionsRoot);
  const secretReaders = files
    .filter((file) => readFileSync(file, "utf8").includes("RELIC_JWT_SIGNING_SECRET"))
    .map((file) => file.replace(`${root}\\`, "").replaceAll("\\", "/"));

  assert.deepEqual(secretReaders, ["supabase/functions/issue-scoped-jwt/index.ts"]);
});

test("local function server injects the Auth JWT secret without persisting it", () => {
  const server = read("scripts/serve-functions-local.mjs");
  assert.match(server, /GOTRUE_JWT_SECRET/, "local server should read the active Auth signing secret");
  assert.match(server, /tmpdir\(\)/, "the composed Edge environment should live outside the repository");
  assert.match(server, /unlinkSync\(runtimeEnvPath\)/, "the temporary secret file should be removed");
  assert.doesNotMatch(server, /console\.(?:log|error).*jwtSecret/i, "the signing secret must never be logged");
});

test("edge runtime source does not contain checked-in local secrets", () => {
  const forbiddenSecretPatterns = [
    /sb_secret_[A-Za-z0-9_-]+/,
    /sb_publishable_[A-Za-z0-9_-]+/,
    /SUPABASE_SERVICE_ROLE_KEY\s*=\s*["'][^"']+["']/,
    /INTERNAL_TOKEN\s*=\s*["'][^"']+["']/,
    /RELIC_JWT_SIGNING_SECRET\s*=\s*["'][^"']+["']/
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
    assert.match(source, /create(?:Embedding)?WorkerHandler/, `${dispatcher} should use the shared worker wrapper`);
    assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE_KEY/, `${dispatcher} should not read service credentials directly`);
    assert.doesNotMatch(source, /RELIC_JWT_SIGNING_SECRET/, `${dispatcher} should not read JWT secret directly`);
  }
});

test("Saga cleanup removes real Storage objects before database finalization", () => {
  const cleanup = read("supabase/functions/_shared/storage-cleanup.ts");
  const worker = read("supabase/functions/cleanup-saga/index.ts");

  assert.match(cleanup, /\.schema\(["']storage["']\)/, "cleanup should discover stored objects under the scoped prefix");
  assert.match(cleanup, /\.remove\(/, "cleanup should permanently remove discovered objects through the Storage API");
  assert.match(cleanup, /1000/, "cleanup should honor the Storage API removal batch limit");
  assert.doesNotMatch(cleanup, /reports deterministic counts/i, "cleanup must not return invented deletion counts");
  assert.match(worker, /createServiceClient\(\)/, "Saga cleanup should use the server-only service client");
  assert.match(worker, /claim_cleanup_job_for_worker/, "Saga cleanup should claim through the service-role-only public wrapper");
  assert.match(worker, /complete_cleanup_job_for_worker/, "database finalization should happen only after Storage cleanup succeeds");
});

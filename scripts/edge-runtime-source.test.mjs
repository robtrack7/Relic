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
    "supabase/functions/_shared/observability.ts",
    "supabase/functions/issue-scoped-jwt/index.ts",
    "supabase/functions/ai-task-runner/index.ts",
    "supabase/functions/guide-submit/index.ts",
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
  assert.match(provider, /TRANSCRIPTION_PROVIDER_MODE/, "provider mode should be explicit and fail closed");
  assert.match(provider, /configuredMode \?\? "live"/, "provider should default to live rather than deterministic mode");
  assert.match(provider, /RELIC_ENV/, "deterministic transcription mode should be environment-gated");
  assert.match(provider, /TRANSCRIPTION_RESOLVED_MODEL/, "hosted transcription should require explicit resolved-model provenance");
  assert.match(provider, /AbortController/, "transcription provider calls should have a bounded timeout");
  assert.doesNotMatch(provider, /AI_PROVIDER_BASE_URL/, "transcription must not silently fall back to the generic AI provider endpoint");
  assert.doesNotMatch(provider, /AI_PROVIDER_API_KEY/, "transcription must not silently fall back to generic AI credentials");
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
  assert.match(provider, /providerReportedModel.*expectedModel/s, "hosted embeddings should reject unexpected resolved models");
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
  assert.match(runner, /claim_ai_task_run_for_worker/, "AI task runner should atomically lease a run before provider work");
  assert.doesNotMatch(runner, /\bsession_id:\s*taskRun\.session_id,/, "session scoping must use the retrieval RPC filters contract");
  assert.match(runner, /filters:\s*taskRun\.session_id\s*\?\s*\{\s*session_id:\s*taskRun\.session_id\s*\}\s*:\s*\{\}/, "session-scoped retrieval should use filters.session_id");
  assert.match(runner, /checkpoint_ai_task_provider_output_for_worker/, "AI task runner should checkpoint validated output before delivery");
  assert.match(runner, /fail_ai_task_run_for_worker/, "AI task runner should use the bounded retry and dead-letter boundary");
  assert.ok(
    runner.indexOf("checkpoint_ai_task_provider_output_for_worker") < runner.indexOf("await recordUsage("),
    "validated provider output should be checkpointed before metering"
  );
  assert.ok(
    runner.indexOf("await recordUsage(") < runner.indexOf('service.rpc("record_ai_task_output_for_worker"'),
    "idempotent metering should precede output persistence"
  );
  assert.match(runner, /p_resolved_model:\s*providerResult\.resolvedModel/, "AI task runner should persist the resolved model used for the accepted output");
  assert.match(runner, /p_resolved_provider:\s*providerResult\.provider/, "AI task runner should persist provider provenance for the accepted output");
  assert.match(provider, /provider:\s*"deterministic-test"/, "deterministic provider mode should identify its provenance");
  assert.match(provider, /AI_PROVIDER_MODE/, "AI provider mode should be explicit and fail closed");
  assert.match(provider, /configuredMode \?\? "live"/, "AI provider should default to live mode");
  assert.match(provider, /RELIC_ENV/, "deterministic AI mode should be environment-gated");
  assert.match(provider, /LITELLM_PROXY_URL/, "hosted AI calls should use the shared server-only proxy boundary");
  assert.match(provider, /AI_RESOLVED_MODEL/, "hosted AI aliases should require explicit resolved-model provenance");
  assert.match(provider, /AbortController/, "AI provider calls should have a bounded timeout");
  assert.doesNotMatch(provider, /new\s+OpenAI\s*\(/i, "provider adapter should not construct OpenAI clients directly");
  assert.doesNotMatch(provider, /new\s+Anthropic\s*\(/i, "provider adapter should not construct Anthropic clients directly");
  assert.doesNotMatch(provider, /fetch\s*\(\s*["'`]https?:\/\//i, "provider adapter should not hardcode provider URLs");
});

test("Relic Guide submission derives scope, retrieval, quota, and dispatch on the server", () => {
  const submit = read("supabase/functions/guide-submit/index.ts");
  const runner = read("supabase/functions/ai-task-runner/index.ts");
  const hybrid = read("supabase/functions/hybrid-search/index.ts");

  assert.match(submit, /requireInternalAuth/, "Guide submission must be server-only");
  assert.match(submit, /createScopedClient/, "Guide permission and quota checks must use the GM identity");
  assert.match(submit, /\.from\("guide_turns"\)/, "Guide exact retries must resolve from their stored logical turn");
  assert.match(submit, /preflight_ai_task/, "Guide must preflight the registered task before retrieval or dispatch");
  assert.ok(
    submit.indexOf('.from("guide_turns")') < submit.indexOf("preflight_ai_task"),
    "exact retry detection must happen before quota or provider work"
  );
  assert.ok(
    submit.indexOf("preflight_ai_task") < submit.indexOf("/functions/v1/hybrid-search"),
    "quota preflight must happen before retrieval/provider work"
  );
  const provider = read("supabase/functions/_shared/ai-provider.ts");
  assert.match(provider, /Every block must be a flat object with a type string/);
  assert.match(provider, /"type":"grounded_answer"/);
  assert.match(provider, /copy its source_id character-for-character/);
  assert.match(provider, /insufficiency_reason is required/);
  assert.match(provider, /A valid no-answer object is/);
  assert.match(provider, /omit insufficiency_reason entirely/);
  assert.match(provider, /When repair is non-null/);
  assert.match(submit, /dispatch_validation_categories/);
  assert.match(submit, /resolveGuideSourceIds/);
  assert.match(submit, /task_profile:\s*"answer_saga_question"/, "Guide retrieval must select its registered task profile");
  assert.match(hybrid, /retrieve_for_task/, "Guide task grounding must use the AI retrieval surface");
  assert.match(hybrid, /retrieve_for_task_relaxed/, "ordinary natural-language misses must have a conservative relaxed fallback");
  assert.match(hybrid, /taskProfile !== "answer_saga_question"/, "the E3 Edge route must reject unregistered task profiles");
  assert.match(submit, /retrieval_unavailable/, "retrieval infrastructure failures must not masquerade as empty evidence");
  assert.match(submit, /if \(error\) throw new Error\("guide_source_resolution_failed"\)/);
  assert.match(submit, /\.neq\("kind", "imported_text"\)/);
  assert.match(submit, /source\.scope === "saga"/);
  assert.match(submit, /source\.scope === "world"/);
  assert.match(submit, /create_guide_turn_for_worker/, "Guide must persist the logical submission through its scoped RPC");
  assert.match(submit, /idempotency_key/, "Guide must carry a stable logical-submission identity");
  assert.match(submit, /resolveGuideSourceIds[\s\S]*slice\(0,\s*20\)/, "Guide retrieval must cap its immutable allowlist");
  assert.match(submit, /runnerResponse\?\.ok\s*\?\s*200\s*:\s*202/, "dispatch failure must preserve a recoverable queued turn");
  assert.doesNotMatch(submit, /console\.(?:log|error)/, "Guide submission must not log questions or evidence");
  assert.match(runner, /get_guide_evidence_for_worker/, "the shared runner must use frozen Guide evidence");
  assert.match(runner, /complete_guide_turn_for_worker/, "the shared runner must persist only validated Guide output");
});

test("provider observability omits sensitive payloads and uses stable safe fields", () => {
  const observability = read("supabase/functions/_shared/observability.ts");
  const worker = read("supabase/functions/_shared/worker.ts");
  const aiRunner = read("supabase/functions/ai-task-runner/index.ts");

  assert.match(observability, /record_provider_pipeline_event_for_worker/, "safe events should persist through the service-only database boundary");
  assert.match(observability, /SENSITIVE_FIELD_NAMES/, "observability should centrally omit sensitive field names");
  assert.doesNotMatch(observability, /console\.(?:log|error)\([^\n]*(?:prompt|transcript|authorization|cookie|jwt|signed_url)/i, "observability must not directly log private fields");
  assert.doesNotMatch(worker, /reason:\s*(?:claimError\.message|reason)/, "shared worker logs must not include raw error messages");
  assert.doesNotMatch(aiRunner, /logRuntimeEvent\([^\n]*reason/, "AI runtime logs must not include raw internal failure text");
});

test("only issue-scoped-jwt reads the Relic JWT signing secret", () => {
  const files = walkFiles(functionsRoot);
  const secretReaders = files
    .filter((file) => readFileSync(file, "utf8").includes("RELIC_JWT_SIGNING_SECRET"))
    .map((file) => file.replace(`${root}\\`, "").replaceAll("\\", "/"));

  assert.deepEqual(secretReaders, ["supabase/functions/issue-scoped-jwt/index.ts"]);
});

test("scoped clients use the SDK access-token boundary for worker RLS", () => {
  const scopedClient = read("supabase/functions/_shared/scoped-client.ts");
  const issuer = read("supabase/functions/issue-scoped-jwt/index.ts");

  assert.match(
    scopedClient,
    /accessToken:\s*async\s*\(\)\s*=>\s*token/,
    "scoped worker JWTs should use the supported Supabase client accessToken option"
  );
  assert.doesNotMatch(
    scopedClient,
    /global:\s*\{\s*headers:\s*\{\s*authorization:/,
    "a lowercase global authorization header can be shadowed by the SDK API-key header"
  );
  assert.match(
    scopedClient,
    /\.\.\.\(sagaId\s*\?\s*\{\s*saga_id:\s*sagaId\s*\}\s*:\s*\{\}\)/,
    "scoped workers should bind Saga jobs while omitting null World scope"
  );
  assert.match(scopedClient, /sagaId\?:\s*string\s*\|\s*null/);
  assert.match(scopedClient, /class ScopedClientError/);
  assert.match(
    read("supabase/functions/_shared/embedding-worker.ts"),
    /error instanceof ScopedClientError/,
    "scoped JWT failures must not be mislabeled as provider outages"
  );
  assert.match(
    issuer,
    /\.\.\.\(sagaId\s*\?\s*\{\s*saga_id:\s*sagaId\s*\}\s*:\s*\{\}\)/,
    "the issuer should include the validated active Saga claim"
  );
});

test("local function server injects the Auth JWT secret without persisting it", () => {
  const server = read("scripts/serve-functions-local.mjs");
  assert.match(server, /GOTRUE_JWT_SECRET/, "local server should read the active Auth signing secret");
  assert.match(server, /tmpdir\(\)/, "the composed Edge environment should live outside the repository");
  assert.match(server, /unlinkSync\(runtimeEnvPath\)/, "the temporary secret file should be removed");
  assert.match(server, /RELIC_LOCAL_PROVIDER_MODE \?\? "deterministic"/, "local functions should default to deterministic provider isolation");
  assert.match(server, /\["AI_PROVIDER_MODE", "test"\]/, "local deterministic mode should explicitly disable hosted AI");
  assert.match(server, /\["EMBEDDING_PROVIDER_MODE", "deterministic"\]/, "local deterministic mode should explicitly disable hosted embeddings");
  assert.match(server, /liveCredentialKeys/, "local deterministic mode should omit live provider credentials");
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

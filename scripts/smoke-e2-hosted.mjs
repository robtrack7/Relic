import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const PROJECT_REF = "scagegrrilvrpuilthzz";
const API_BASE = `https://${PROJECT_REF}.supabase.co`;
const FUNCTIONS_BASE = `${API_BASE}/functions/v1`;
const PREVIOUS_INFERENCE_ATTEMPTS = 41;
const MAX_NEW_INFERENCE_ATTEMPTS = 0;
const PACKET_INFERENCE_LIMIT = 40;

const IDs = Object.freeze({
  gm: "e2000000-0000-4000-8000-000000000001",
  profile: "e2000000-0000-4000-8000-000000000002",
  workspace: "e2010000-0000-4000-8000-000000000001",
  world: "e2020000-0000-4000-8000-000000000001",
  era: "e2020000-0000-4000-8000-000000000002",
  saga: "e2030000-0000-4000-8000-000000000001",
  siblingSaga: "e2030000-0000-4000-8000-000000000002",
  session: "e2030000-0000-4000-8000-000000000003",
  character: "e2040000-0000-4000-8000-000000000001",
  siblingCharacter: "e2040000-0000-4000-8000-000000000002",
  note: "e2050000-0000-4000-8000-000000000001",
  characterSource: "e2060000-0000-4000-8000-000000000001",
  noteSource: "e2060000-0000-4000-8000-000000000002",
  importSource: "e2060000-0000-4000-8000-000000000003",
  pendingDraft: "e2070000-0000-4000-8000-000000000001",
  lightRun: "e2090000-0000-4000-8000-000000000001",
  deepRun: "e2090000-0000-4000-8000-000000000002",
});

const supabaseCli = process.platform === "win32" ? "supabase.exe" : "supabase";
const fixturePhrase = "glass heron";
const secretStatePath = resolve("infra/litellm/.secrets.e2-staging");
let internalToken;
let scopedJwt;
let publishableKey;
let storagePath;
let audioPath;
const safeAiRetryEvidence = [];
const SAFE_AI_RETRY_CATEGORIES = new Set([
  "timeout",
  "rate_limited",
  "provider_unavailable",
  "retrieval_failed",
  "metering_failed",
  "persistence",
  "worker_restart",
  "ai_task_internal_failure",
]);

function fail(message) {
  throw new Error(message);
}

function parseDotEnv(path) {
  const values = {};
  for (const rawLine of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator <= 0) continue;
    values[line.slice(0, separator)] = line.slice(separator + 1);
  }
  return values;
}

function runCli(args, safeStage = "database_operation") {
  const cliArgs = args[0] === "supabase" ? args.slice(1) : args;
  const result = spawnSync(supabaseCli, cliArgs, {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
    windowsHide: true,
  });
  if (result.status !== 0) {
    const launchCategory = result.error?.code ? ` (${result.error.code})` : "";
    fail(`A linked staging CLI operation failed during ${safeStage}${launchCategory} without exposing its output.`);
  }
  return result.stdout.trim();
}

function runSql(sql, safeStage = "database_query") {
  const raw = runCli([
    "supabase", "db", "query", "--linked", sql,
    "--output", "json", "--agent", "no",
  ], safeStage);
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    fail("The linked staging SQL response was not valid JSON.");
  }
  if (Array.isArray(parsed)) return parsed;
  return parsed.rows ?? [];
}

function oneRow(sql, safeStage = "database_query") {
  const rows = runSql(sql, safeStage);
  if (rows.length !== 1) fail("The linked staging query returned an unexpected row count.");
  return rows[0];
}

function getPublishableKey() {
  const raw = runCli([
    "supabase", "projects", "api-keys",
    "--project-ref", PROJECT_REF,
    "--output", "json", "--agent", "no",
  ], "publishable_key_metadata");
  let keys;
  try {
    keys = JSON.parse(raw);
  } catch {
    fail("The staging API-key metadata response was not valid JSON.");
  }
  const selected = keys.find((candidate) => candidate.type === "publishable" && candidate.api_key);
  if (!selected) fail("The staging publishable API key is unavailable.");
  return selected.api_key;
}

async function jsonFetch(url, options, safeLabel, acceptedStatuses = [200]) {
  const startedAt = performance.now();
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(180_000),
  });
  const body = await response.json().catch(() => ({}));
  if (!acceptedStatuses.includes(response.status)) {
    fail(`${safeLabel} failed safely with HTTP ${response.status}.`);
  }
  return { body, status: response.status, latencyMs: Math.round(performance.now() - startedAt) };
}

async function invokeInternal(functionName, body = {}, acceptedStatuses = [200, 202]) {
  return jsonFetch(`${FUNCTIONS_BASE}/${functionName}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${internalToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  }, functionName, acceptedStatuses);
}

async function invokeAiTaskWithRecovery(runId, safeLabel) {
  let result = await invokeInternal("ai-task-runner", { run_id: runId }, [200, 202, 500, 503]);
  if (result.status === 503) {
    const retryEvidence = oneRow(`
select status, failure_category, attempts, repair_attempts,
  greatest(0, ceil(extract(epoch from (scheduled_at - now()))))::integer as retry_after_seconds
from internal.ai_task_runs
where id = '${runId}';
    `, `${safeLabel}_retry_evidence`);
    if (retryEvidence.status !== "retryable"
      || !SAFE_AI_RETRY_CATEGORIES.has(retryEvidence.failure_category)) {
      fail(`The hosted ${safeLabel} task did not enter a safe bounded retry state.`);
    }
    safeAiRetryEvidence.push({
      task: safeLabel,
      category: retryEvidence.failure_category,
      attempt_count: retryEvidence.attempts,
      repair_attempts: retryEvidence.repair_attempts,
    });
    const waitMs = Math.min(55, Math.max(0, Number(retryEvidence.retry_after_seconds ?? 0)) + 20) * 1000;
    await new Promise((resolveDelay) => setTimeout(resolveDelay, waitMs));
    result = await invokeInternal("ai-task-runner", { run_id: runId }, [200, 202, 500, 503]);
  }
  if (result.status !== 200 || !result.body.ok) {
    const terminalEvidence = oneRow(`
select status, failure_category, attempts, repair_attempts
from internal.ai_task_runs
where id = '${runId}';
    `, `${safeLabel}_terminal_evidence`);
    fail(`The hosted ${safeLabel} task did not recover (${terminalEvidence.failure_category ?? "unknown"}, ${terminalEvidence.status}).`);
  }
  return result;
}

async function rpc(name, body) {
  return jsonFetch(`${API_BASE}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: publishableKey,
      authorization: `Bearer ${scopedJwt}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  }, `RPC ${name}`);
}

async function scopedSelect(table, query) {
  return jsonFetch(`${API_BASE}/rest/v1/${table}?${query}`, {
    method: "GET",
    headers: {
      apikey: publishableKey,
      authorization: `Bearer ${scopedJwt}`,
    },
  }, `scoped ${table} read`);
}

function storageObjectUrl(path) {
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `${API_BASE}/storage/v1/object/audio/${encoded}`;
}

async function deleteStorageFixture() {
  if (!storagePath || !scopedJwt || !publishableKey) return;
  await fetch(storageObjectUrl(storagePath), {
    method: "DELETE",
    headers: {
      apikey: publishableKey,
      authorization: `Bearer ${scopedJwt}`,
    },
    signal: AbortSignal.timeout(30_000),
  }).catch(() => undefined);
}

function generateAudioFixture() {
  const executable = process.platform === "win32" ? "powershell.exe" : "pwsh";
  const result = spawnSync(executable, [
    "-NoProfile", "-ExecutionPolicy", "Bypass",
    "-File", resolve("scripts/generate-e2-audio-fixture.ps1"),
  ], {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
    windowsHide: true,
  });
  if (result.status !== 0) fail("The synthetic audio fixture could not be generated.");
  const metadata = JSON.parse(result.stdout);
  if (metadata.result !== "E2_AUDIO_FIXTURE_OK" || metadata.text_classification !== "synthetic_non_sensitive") {
    fail("The audio fixture did not pass its non-sensitive validation.");
  }
  return metadata;
}

function setupFixtureRows() {
  runSql(`
delete from public.workspaces where id = '${IDs.workspace}';
delete from auth.users where id = '${IDs.gm}';

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values (
  '${IDs.gm}', '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', 'e2-hosted-smoke@example.test',
  extensions.crypt('synthetic-not-a-login-secret', extensions.gen_salt('bf')),
  now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false,
  '', '', '', ''
);
insert into public.gm_profiles (id, user_id, experience_level, improv_comfort, prep_style)
values ('${IDs.profile}', '${IDs.gm}', 'experienced', 'mixed', 'light');
insert into public.workspaces (id, owner_gm_id, name)
values ('${IDs.workspace}', '${IDs.gm}', 'E2 Synthetic Hosted Smoke');
insert into public.worlds (id, workspace_id, owner_gm_id, name)
values ('${IDs.world}', '${IDs.workspace}', '${IDs.gm}', 'E2 Synthetic World');
insert into public.world_eras (id, workspace_id, world_id, name)
values ('${IDs.era}', '${IDs.workspace}', '${IDs.world}', 'E2 Synthetic Era');
insert into public.sagas (id, workspace_id, world_id, owner_gm_id, primary_era_id, name, audio_retention)
values
  ('${IDs.saga}', '${IDs.workspace}', '${IDs.world}', '${IDs.gm}', '${IDs.era}', 'E2 Synthetic Saga', 'retain'),
  ('${IDs.siblingSaga}', '${IDs.workspace}', '${IDs.world}', '${IDs.gm}', '${IDs.era}', 'E2 Sibling Isolation Saga', 'retain');
insert into public.sessions (id, workspace_id, world_id, saga_id, scope, name, status, started_at)
values ('${IDs.session}', '${IDs.workspace}', '${IDs.world}', '${IDs.saga}', 'saga', 'E2 Synthetic Session', 'started', now());
insert into public.characters (id, workspace_id, world_id, saga_id, scope, name, summary, narrative, canon_state)
values
  ('${IDs.character}', '${IDs.workspace}', '${IDs.world}', '${IDs.saga}', 'saga',
    'Glass Heron', 'A cobalt messenger guards the salt observatory.',
    'The blue courier protects a seaside tower used to chart the stars.', 'canon'),
  ('${IDs.siblingCharacter}', '${IDs.workspace}', '${IDs.world}', '${IDs.siblingSaga}', 'saga',
    'Forbidden Sibling Raven', 'A sibling-only record must never cross the Saga boundary.',
    'This isolation sentinel belongs only to the sibling Saga.', 'canon');
insert into public.notes (id, workspace_id, world_id, saga_id, scope, note_type, title, body, canon_state)
values ('${IDs.note}', '${IDs.workspace}', '${IDs.world}', '${IDs.saga}', 'saga', 'quick_capture',
  'Synthetic post-session evidence', 'The glass heron waits beside the blue observatory.', 'canon');
insert into public.sources (
  id, workspace_id, world_id, saga_id, scope, kind,
  source_entity_type, source_entity_id, raw_excerpt
) values (
  '${IDs.characterSource}', '${IDs.workspace}', '${IDs.world}', '${IDs.saga}', 'saga',
  'gm_instruction', 'character', '${IDs.character}', 'Synthetic canon character source.'
);
insert into public.sources (
  id, workspace_id, world_id, saga_id, scope, kind, note_id, session_id, raw_excerpt
) values (
  '${IDs.noteSource}', '${IDs.workspace}', '${IDs.world}', '${IDs.saga}', 'saga',
  'note', '${IDs.note}', '${IDs.session}', 'Synthetic post-session note source.'
);
insert into public.sources (
  id, workspace_id, world_id, saga_id, scope, kind, uploader_id,
  original_filename, mime_type, byte_size, ingestion_method, content_sha256,
  import_state, raw_excerpt, ready_at
) values (
  '${IDs.importSource}', '${IDs.workspace}', '${IDs.world}', '${IDs.saga}', 'saga',
  'imported_text', '${IDs.gm}', 'e2-unapproved.txt', 'text/plain', 31, 'paste',
  repeat('a', 64), 'ready_for_review', 'Unapproved synthetic import sentinel.', now()
);
insert into public.drafts (
  id, workspace_id, world_id, saga_id, scope, entity_type, state,
  canon_state, change_kind, proposed_payload, created_by
) values (
  '${IDs.pendingDraft}', '${IDs.workspace}', '${IDs.world}', '${IDs.saga}', 'saga',
  'thread', 'pending', 'ai_draft', 'create',
  '{"name":"Pending synthetic draft sentinel"}', 'gm_via_ai_approval'
);
update internal.embedding_jobs
set source_id = '${IDs.characterSource}'
where workspace_id = '${IDs.workspace}' and source_entity_id = '${IDs.character}';
update internal.embedding_jobs
set source_id = '${IDs.noteSource}'
where workspace_id = '${IDs.workspace}' and source_entity_id = '${IDs.note}';
update internal.embedding_jobs
set scheduled_at = now() + interval '1 day', debounce_until = now() + interval '1 day'
where workspace_id = '${IDs.workspace}';
update internal.embedding_jobs
set scheduled_at = now(), debounce_until = now()
where workspace_id = '${IDs.workspace}' and source_entity_id = '${IDs.character}';
  `);
}

function createAiRuns(pipelineRunId) {
  const lightPrompt = `Return exactly this JSON shape with no additional keys: {"complications":[{"id":"e2-complication-1","summary":"A bounded courier complication","narrative":"The courier must choose between speed and protecting the observatory route.","entities_implicated":[],"escalation_level":"low","sources":["${IDs.characterSource}"]}],"confidence_reason":"single_clear_segment"}.`;
  const deepPrompt = `Return exactly this JSON shape with no additional keys: {"session_summary":{"title":"Synthetic session summary","body":"The observatory route remains an explicit choice for later GM review.","sources":["${IDs.noteSource}"],"confidence_reason":"single_clear_segment"},"proposed_entity_changes":[],"loose_threads":[],"next_prep_implications":[],"stub_evidence_flags":[]}. Do not write canon.`;
  const lightPayload = JSON.stringify({ prompt: lightPrompt }).replaceAll("'", "''");
  const deepPayload = JSON.stringify({ prompt: deepPrompt, pipeline_run_id: pipelineRunId }).replaceAll("'", "''");
  runSql(`
insert into internal.ai_task_runs (
  id, workspace_id, world_id, saga_id, session_id, gm_id,
  task_name, prompt_version, quota_tier, ai_credits, model_tier,
  retrieval_profile, source_policy, output_mode, input_payload, allowed_source_ids
)
select
  '${IDs.lightRun}', '${IDs.workspace}', '${IDs.world}', '${IDs.saga}', null, '${IDs.gm}',
  c.task_name, c.prompt_version, c.quota_tier, c.ai_credits, c.model_tier,
  c.retrieval_profile, c.source_policy, c.output_mode,
  '${lightPayload}'::jsonb, array['${IDs.characterSource}'::uuid]
from internal.ai_task_contracts() c
where c.task_name = 'propose_thread_complication' and c.active;

insert into internal.ai_task_runs (
  id, workspace_id, world_id, saga_id, session_id, gm_id,
  task_name, prompt_version, quota_tier, ai_credits, model_tier,
  retrieval_profile, source_policy, output_mode, input_payload, allowed_source_ids
)
select
  '${IDs.deepRun}', '${IDs.workspace}', '${IDs.world}', '${IDs.saga}', '${IDs.session}', '${IDs.gm}',
  c.task_name, c.prompt_version, c.quota_tier, c.ai_credits, c.model_tier,
  c.retrieval_profile, c.source_policy, c.output_mode,
  '${deepPayload}'::jsonb, array['${IDs.noteSource}'::uuid]
from internal.ai_task_contracts() c
where c.task_name = 'synthesize_session' and c.active;
  `);
}

async function runDeepOnlySmoke() {
  const issuer = await invokeInternal("issue-scoped-jwt", {
    gm_user_id: IDs.gm,
    purpose: "e2_hosted_deep_continuation",
    saga_id: IDs.saga,
  });
  scopedJwt = issuer.body.token;
  if (!scopedJwt) fail("The deep continuation scoped staging JWT was not issued.");

  const pipelineRunId = oneRow(`
insert into public.pipeline_runs (
  workspace_id, world_id, saga_id, session_id, state, inputs_summary
)
values (
  '${IDs.workspace}', '${IDs.world}', '${IDs.saga}', '${IDs.session}',
  'synthesizing', '{"fixture":"synthetic_deep_continuation"}'::jsonb
)
returning id;
  `, "deep_pipeline_setup").id;
  createAiRuns(pipelineRunId);
  runSql(`delete from internal.ai_task_runs where id = '${IDs.lightRun}';`, "deep_scope_setup");

  const deepPreflight = await rpc("preflight_ai_task", {
    p_workspace_id: IDs.workspace,
    p_world_id: IDs.world,
    p_saga_id: IDs.saga,
    p_session_id: IDs.session,
    p_task_name: "synthesize_session",
    p_input_payload: { fixture: "synthetic_deep_continuation" },
  });
  if (!deepPreflight.body.allowed) fail("The hosted deep continuation failed quota preflight.");

  const deep = await invokeAiTaskWithRecovery(IDs.deepRun, "deep");
  stageTimings.deepTaskMs = deep.latencyMs;
  const replay = await invokeInternal("ai-task-runner", { run_id: IDs.deepRun });
  if (!replay.body.replayed) fail("The hosted deep continuation exact retry was not replayed.");

  const evidence = oneRow(`
select jsonb_build_object(
  'status', r.status,
  'attempts', r.attempts,
  'repair_attempts', r.repair_attempts,
  'provider_checkpointed', r.provider_completed_at is not null,
  'provider_alias', r.provider_alias,
  'resolved_model', r.resolved_model,
  'usage_events', (select count(*) from public.usage_events u where u.id = r.usage_event_id),
  'draft_batches', (
    select count(*) from internal.ai_draft_batches b
    where b.ai_task_run_id = r.id and b.state = 'complete'
  ),
  'replay_count', r.replay_count,
  'canon_audit_writes', (
    select count(*) from public.canon_audit a where a.workspace_id = r.workspace_id
  ),
  'sibling_source_matches', (
    select count(*) from public.sources s
    where s.id = any(r.allowed_source_ids) and s.saga_id = '${IDs.siblingSaga}'
  ),
  'unsafe_event_text_matches', (
    select count(*) from internal.provider_pipeline_events e
    where e.workspace_id = r.workspace_id
      and lower(to_jsonb(e)::text) like '%${fixturePhrase}%'
  )
) evidence
from internal.ai_task_runs r
where r.id = '${IDs.deepRun}';
  `, "deep_continuation_evidence").evidence;
  evidence.exact_retry_replayed = true;
  if (evidence.status !== "complete"
    || !evidence.provider_checkpointed
    || evidence.usage_events !== 1
    || evidence.draft_batches !== 1
    || evidence.canon_audit_writes !== 0
    || evidence.sibling_source_matches !== 0
    || evidence.unsafe_event_text_matches !== 0) {
    fail("The hosted deep continuation evidence was incomplete.");
  }

  const externalCalls = Number(evidence.attempts ?? 1) + Number(evidence.repair_attempts ?? 0);
  const cumulativeAttempts = PREVIOUS_INFERENCE_ATTEMPTS + externalCalls;
  if (externalCalls > 4 || cumulativeAttempts > PACKET_INFERENCE_LIMIT) {
    fail("The hosted deep continuation exceeded its call guard.");
  }
  return {
    result: "E2_HOSTED_DEEP_CONTINUATION_OK",
    environment: "staging",
    project_ref: PROJECT_REF,
    fixture_classification: "synthetic_non_sensitive",
    external_inference_attempts_this_pass: externalCalls,
    cumulative_packet_inference_attempts: cumulativeAttempts,
    packet_inference_limit: PACKET_INFERENCE_LIMIT,
    secrets_printed: false,
    private_payloads_printed: false,
    retry_recovery: safeAiRetryEvidence,
    quota_preflight: { deep_allowed: true },
    timings_ms: stageTimings,
    evidence,
  };
}

function collectEvidence(transcriptionJobId, embeddingJobId) {
  return oneRow(`
select jsonb_build_object(
  'transcription', (
    select jsonb_build_object(
      'job_state', j.state,
      'attempts', j.attempts,
      'model', t.whisper_model,
      'duration_seconds', t.duration_seconds,
      'segment_count', jsonb_array_length(t.segments),
      'timestamps_valid', not exists (
        select 1 from jsonb_array_elements(t.segments) segment
        where jsonb_typeof(segment) <> 'object'
          or not (segment ? 'start' and segment ? 'end')
          or (segment->>'start')::numeric < 0
          or (segment->>'end')::numeric < (segment->>'start')::numeric
      ),
      'usage_events', (
        select count(*) from public.usage_events ue
        where ue.idempotency_key = 'transcription-job:${transcriptionJobId}'
      )
    )
    from internal.transcription_jobs j
    join public.transcripts t on t.session_id = j.session_id
    where j.id = '${transcriptionJobId}'
  ),
  'embedding', (
    select jsonb_build_object(
      'job_state', j.state,
      'attempts', j.attempts,
      'provider_alias', j.provider_alias,
      'resolved_model', j.resolved_model,
      'dimensions', e.dimensions,
      'vector_dimensions', extensions.vector_dims(e.embedding),
      'is_current', e.is_current,
      'usage_events', (select count(*) from public.usage_events ue where ue.id = j.usage_event_id),
      'provider_request_id_present', j.provider_request_id is not null,
      'duplicate_replay', (public.replay_embedding_job_for_worker(j.id)->>'duplicate_replay')::boolean
    )
    from internal.embedding_jobs j
    join public.embeddings e on e.embedding_job_id = j.id
    where j.id = '${embeddingJobId}'
  ),
  'ai_runs', (
    select jsonb_agg(jsonb_build_object(
      'task_name', r.task_name,
      'status', r.status,
      'attempts', r.attempts,
      'repair_attempts', r.repair_attempts,
      'provider_alias', r.provider_alias,
      'resolved_model', r.resolved_model,
      'resolved_provider', r.resolved_provider,
      'usage_events', (select count(*) from public.usage_events ue where ue.id = r.usage_event_id),
      'provider_checkpointed', r.provider_completed_at is not null,
      'replay_count', r.replay_count
    ) order by r.task_name)
    from internal.ai_task_runs r
    where r.id in ('${IDs.lightRun}', '${IDs.deepRun}')
  ),
  'isolation', jsonb_build_object(
    'sibling_embedding_count', (
      select count(*) from public.embeddings e where e.source_entity_id = '${IDs.siblingCharacter}' and e.is_current
    ),
    'canon_audit_writes', (
      select count(*) from public.canon_audit where workspace_id = '${IDs.workspace}'
    ),
    'pending_baseline_draft_intact', exists (
      select 1 from public.drafts where id = '${IDs.pendingDraft}' and state = 'pending'
    ),
    'unapproved_import_intact', exists (
      select 1 from public.sources where id = '${IDs.importSource}' and import_state = 'ready_for_review'
    )
  ),
  'observability', jsonb_build_object(
    'event_count', (
      select count(*) from internal.provider_pipeline_events where workspace_id = '${IDs.workspace}'
    ),
    'unsafe_fixture_text_matches', (
      select count(*) from internal.provider_pipeline_events e
      where e.workspace_id = '${IDs.workspace}' and lower(to_jsonb(e)::text) like '%${fixturePhrase}%'
    ),
    'raw_payload_key_matches', (
      select count(*) from internal.provider_pipeline_events e
      cross join lateral jsonb_object_keys(e.safe_metadata) key
      where e.workspace_id = '${IDs.workspace}'
        and lower(key) in ('prompt','transcript','audio','authorization','cookie','jwt','signed_url','embedding','vector','response')
    ),
    'events', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'event_name', event_name,
        'worker_type', worker_type,
        'state', state,
        'provider_alias', provider_alias,
        'resolved_model', resolved_model,
        'attempt_count', attempt_count,
        'queue_delay_ms', queue_delay_ms,
        'provider_latency_ms', provider_latency_ms,
        'e2e_latency_ms', e2e_latency_ms,
        'error_category', error_category
      ) order by occurred_at), '[]'::jsonb)
      from internal.provider_pipeline_events
      where workspace_id = '${IDs.workspace}'
    )
  )
) evidence;
  `).evidence;
}

if (process.argv.includes("--check-access")) {
  const accessKey = getPublishableKey();
  const accessRow = oneRow("select 1 as ok", "read_only_access_check");
  console.log(JSON.stringify({
    result: "E2_HOSTED_ACCESS_CHECK_OK",
    publishable_key_available: Boolean(accessKey),
    database_query_ok: accessRow.ok === 1,
    secrets_printed: false,
  }, null, 2));
  process.exit(0);
}

if (!process.argv.includes("--execute")) {
  console.log(JSON.stringify({
    ready: false,
    reason: "explicit_execute_flag_required",
    environment: "staging",
    project_ref: PROJECT_REF,
    fixture_classification: "synthetic_non_sensitive",
    previous_inference_attempts: PREVIOUS_INFERENCE_ATTEMPTS,
    maximum_new_inference_attempts: MAX_NEW_INFERENCE_ATTEMPTS,
    packet_inference_limit: PACKET_INFERENCE_LIMIT,
    secrets_printed: false,
  }, null, 2));
  process.exit(0);
}

if (PREVIOUS_INFERENCE_ATTEMPTS + MAX_NEW_INFERENCE_ATTEMPTS > PACKET_INFERENCE_LIMIT) {
  fail("The E2 packet inference-attempt guard would be exceeded.");
}

internalToken = process.env.INTERNAL_TOKEN;
if (!internalToken) {
  const secrets = parseDotEnv(secretStatePath);
  internalToken = secrets.INTERNAL_TOKEN;
}
if (!internalToken) fail("The protected local E2 internal token is unavailable.");

const stageTimings = {};
let executionError;
let successOutput;
try {
  publishableKey = getPublishableKey();
  const audioFixture = generateAudioFixture();
  audioPath = audioFixture.path;
  setupFixtureRows();

  if (process.argv.includes("--deep-only")) {
    successOutput = await runDeepOnlySmoke();
  } else {
  const issuer = await invokeInternal("issue-scoped-jwt", {
    gm_user_id: IDs.gm,
    purpose: "e2_hosted_smoke",
    saga_id: IDs.saga,
  });
  scopedJwt = issuer.body.token;
  if (!scopedJwt) fail("The scoped staging JWT was not issued.");

  const uploadTarget = await rpc("get_audio_upload_target", {
    workspace_id: IDs.workspace,
    world_id: IDs.world,
    saga_id: IDs.saga,
    session_id: IDs.session,
    sequence: 0,
    extension: "wav",
    bytes: audioFixture.bytes,
  });
  storagePath = uploadTarget.body.storage_path;
  if (!storagePath || uploadTarget.body.bucket !== "audio") fail("The private audio upload target was invalid.");
  await deleteStorageFixture();

  const audioBytes = readFileSync(audioPath);
  const uploadStartedAt = performance.now();
  const upload = await fetch(storageObjectUrl(storagePath), {
    method: "POST",
    headers: {
      apikey: publishableKey,
      authorization: `Bearer ${scopedJwt}`,
      "content-type": "audio/wav",
      "x-upsert": "true",
    },
    body: audioBytes,
    signal: AbortSignal.timeout(60_000),
  });
  stageTimings.privateStorageUploadMs = Math.round(performance.now() - uploadStartedAt);
  if (!upload.ok) fail(`Private audio upload failed safely with HTTP ${upload.status}.`);

  await rpc("register_audio_chunk", {
    workspace_id: IDs.workspace,
    world_id: IDs.world,
    saga_id: IDs.saga,
    session_id: IDs.session,
    sequence: 0,
    storage_path: storagePath,
    bytes: audioFixture.bytes,
    duration_seconds: null,
    client_recorded_at: new Date().toISOString(),
    idempotency_key: `e2-audio-chunk:${IDs.session}:0`,
  });
  await rpc("finalize_audio_upload", {
    workspace_id: IDs.workspace,
    world_id: IDs.world,
    saga_id: IDs.saga,
    session_id: IDs.session,
    expected_chunks: 1,
  });
  await rpc("set_session_status", {
    workspace_id: IDs.workspace,
    world_id: IDs.world,
    saga_id: IDs.saga,
    session_id: IDs.session,
    status: "ended_pending_undo",
  });
  await rpc("set_session_status", {
    workspace_id: IDs.workspace,
    world_id: IDs.world,
    saga_id: IDs.saga,
    session_id: IDs.session,
    status: "ended",
  });

  const storedRecordingEvidence = oneRow(`
select
  (recording_finalized_at is not null) as finalized,
  audio_chunk_count_expected as expected_chunks,
  (select count(*) from public.audio_chunks ac
   where ac.session_id = s.id and ac.deleted_at is null) as registered_chunks
from public.sessions s
where s.id = '${IDs.session}';
  `, "recording_evidence_check");
  if (!storedRecordingEvidence.finalized
    || Number(storedRecordingEvidence.expected_chunks) !== 1
    || Number(storedRecordingEvidence.registered_chunks) !== 1) {
    fail("The application boundary did not persist complete recording evidence.");
  }

  const scopedWorkspaceEvidence = await scopedSelect(
    "workspaces",
    `select=id&id=eq.${IDs.workspace}`
  );
  const scopedWorldEvidence = await scopedSelect(
    "worlds",
    `select=id&id=eq.${IDs.world}`
  );
  const scopedSagaEvidence = await scopedSelect(
    "sagas",
    `select=id&id=eq.${IDs.saga}`
  );
  const scopedSiblingSagaEvidence = await scopedSelect(
    "sagas",
    `select=id&id=eq.${IDs.siblingSaga}`
  );
  const scopedSessionEvidence = await scopedSelect(
    "sessions",
    `select=id,audio_chunk_count_expected,recording_finalized_at&id=eq.${IDs.session}`
  );
  const scopedChunkEvidence = await scopedSelect(
    "audio_chunks",
    `select=id&session_id=eq.${IDs.session}&deleted_at=is.null`
  );
  if (!Array.isArray(scopedWorkspaceEvidence.body)
    || scopedWorkspaceEvidence.body.length !== 1) {
    fail("The scoped JWT could not read its owned Workspace row.");
  }
  if (!Array.isArray(scopedWorldEvidence.body)
    || scopedWorldEvidence.body.length !== 1) {
    fail("The scoped JWT could not read its owned World row.");
  }
  if (!Array.isArray(scopedSagaEvidence.body)
    || scopedSagaEvidence.body.length !== 1) {
    fail("The scoped JWT could not read its owned Saga row.");
  }
  if (!Array.isArray(scopedSiblingSagaEvidence.body)
    || scopedSiblingSagaEvidence.body.length !== 0) {
    fail("The scoped JWT was not restricted to its active Saga.");
  }
  if (!Array.isArray(scopedSessionEvidence.body)
    || scopedSessionEvidence.body.length !== 1) {
    fail("The scoped JWT could not read the Session row.");
  }
  if (!scopedSessionEvidence.body[0].recording_finalized_at
    || Number(scopedSessionEvidence.body[0].audio_chunk_count_expected) !== 1) {
    fail("The scoped JWT saw the Session but not its finalized recording evidence.");
  }
  if (!Array.isArray(scopedChunkEvidence.body)
    || scopedChunkEvidence.body.length !== 1) {
    fail("The scoped JWT could not read the registered audio chunk row.");
  }

  const transcriptionJobId = oneRow(`
select id from internal.transcription_jobs
where workspace_id = '${IDs.workspace}' and session_id = '${IDs.session}'
order by created_at desc limit 1;
  `).id;
  if (!transcriptionJobId) fail("The hosted application boundary did not enqueue transcription.");
  const transcription = await invokeInternal("transcribe-session");
  stageTimings.transcriptionWorkerMs = transcription.latencyMs;
  const transcriptionOutcome = oneRow(`
select state, case
  when failure_reason = 'Recording session is not visible to the scoped worker.' then 'session_not_visible'
  when failure_reason = 'Recording is not finalized.' then 'recording_not_finalized'
  when failure_reason = 'Recording expected chunk count is missing.' then 'expected_chunk_count_missing'
  when failure_reason = 'Recording chunk count is incomplete.' then 'chunk_count_incomplete'
  when failure_reason like 'Audio chunk % could not be downloaded.' then 'audio_download_failed'
  when failure_reason = 'Session evidence could not be read.' then 'session_read_failed'
  when failure_reason = 'Audio evidence could not be read.' then 'chunk_metadata_read_failed'
  when failure_reason in (
    'configuration', 'timeout', 'provider_unavailable', 'provider_rejected',
    'malformed_response', 'invalid_timestamps'
  ) then failure_reason
  when failure_reason = 'Transcription result could not be saved.' then 'persistence_failed'
  when failure_reason = 'transcription_internal_failure' then 'internal_failure'
  when failure_reason is null then null
  else 'transcription_worker_failure'
end as safe_failure_category
from internal.transcription_jobs where id = '${transcriptionJobId}';
  `, "transcription_outcome_check");
  if (!transcription.body.claimed || transcription.body.job_id !== transcriptionJobId
    || transcription.body.state !== "complete" || transcriptionOutcome.state !== "complete") {
    fail(`The hosted transcription worker did not complete (${transcriptionOutcome.safe_failure_category ?? "unknown"}).`);
  }

  const embeddingJobId = oneRow(`
select id from internal.embedding_jobs
where workspace_id = '${IDs.workspace}' and source_entity_id = '${IDs.character}'
order by created_at desc limit 1;
  `).id;
  if (!embeddingJobId) fail("The hosted application boundary did not enqueue the embedding.");
  const embedding = await invokeInternal("embed-row-dispatch");
  stageTimings.embeddingWorkerMs = embedding.latencyMs;
  const embeddingOutcome = oneRow(`
select state, case
  when failure_category in ('timeout', 'provider_unavailable', 'provider_rejected', 'model_mismatch', 'invalid_dimensions')
    then failure_category
  when failure_category is null then null
  else 'embedding_worker_failure'
end as safe_failure_category
from internal.embedding_jobs where id = '${embeddingJobId}';
  `, "embedding_outcome_check");
  if (!embedding.body.claimed || embedding.body.job_id !== embeddingJobId
    || embedding.body.state !== "managed" || embeddingOutcome.state !== "complete") {
    fail(`The hosted embedding worker did not complete (${embeddingOutcome.safe_failure_category ?? "unknown"}).`);
  }

  if (process.argv.includes("--shared-repeat")) {
    const evidence = collectEvidence(transcriptionJobId, embeddingJobId);
    if (evidence.transcription?.job_state !== "complete"
      || evidence.transcription?.usage_events !== 1
      || evidence.embedding?.job_state !== "complete"
      || evidence.embedding?.dimensions !== 1536
      || evidence.embedding?.vector_dimensions !== 1536
      || evidence.embedding?.usage_events !== 1
      || evidence.isolation?.sibling_embedding_count !== 0
      || evidence.isolation?.canon_audit_writes !== 0
      || evidence.observability?.unsafe_fixture_text_matches !== 0
      || evidence.observability?.raw_payload_key_matches !== 0) {
      fail("The post-restart shared-provider evidence was incomplete.");
    }
    successOutput = {
      result: "E2_HOSTED_POST_RESTART_SHARED_OK",
      environment: "staging",
      project_ref: PROJECT_REF,
      fixture_classification: "synthetic_non_sensitive",
      external_inference_attempts_this_pass: 2,
      cumulative_packet_inference_attempts: PREVIOUS_INFERENCE_ATTEMPTS + 2,
      packet_inference_limit: PACKET_INFERENCE_LIMIT,
      secrets_printed: false,
      private_payloads_printed: false,
      timings_ms: stageTimings,
      evidence: {
        transcription: evidence.transcription,
        embedding: evidence.embedding,
        isolation: evidence.isolation,
        observability: evidence.observability,
      },
    };
  } else {
  const hybrid = await invokeInternal("hybrid-search", {
    gm_user_id: IDs.gm,
    workspace_id: IDs.workspace,
    world_id: IDs.world,
    saga_id: IDs.saga,
    query_text: "blue courier protecting the seaside star tower",
    top_k: 5,
    include_world_canon: true,
  });
  stageTimings.hybridSearchMs = hybrid.latencyMs;
  if (hybrid.body.retrieval_mode !== "hybrid") fail("The hosted query embedding did not reach hybrid retrieval.");
  const hybridIds = new Set((hybrid.body.results ?? []).map((item) => item.source_entity_id));
  if (!hybridIds.has(IDs.character) || hybridIds.has(IDs.siblingCharacter)) {
    fail("Hosted hybrid retrieval failed its Saga-isolation assertion.");
  }

  const lightRetrieval = await rpc("retrieve_for_task", {
    workspace_id: IDs.workspace,
    world_id: IDs.world,
    saga_id: IDs.saga,
    era_id: null,
    query_text: "blue courier protecting the seaside star tower",
    task_profile: "propose_thread_complication",
    filters: {},
    top_k: 20,
  });
  const lightSourceIds = new Set((lightRetrieval.body ?? []).map((item) => item.source_id));
  if (!lightSourceIds.has(IDs.characterSource)
    || lightSourceIds.has(IDs.importSource)
    || (lightRetrieval.body ?? []).some((item) => item.source_entity_id === IDs.siblingCharacter)) {
    fail("The light-task retrieval allowlist corpus was not safely scoped.");
  }

  const deepRetrieval = await rpc("retrieve_for_task", {
    workspace_id: IDs.workspace,
    world_id: IDs.world,
    saga_id: IDs.saga,
    era_id: null,
    query_text: "glass heron blue observatory",
    task_profile: "synthesize_session",
    filters: { session_id: IDs.session },
    top_k: 20,
  });
  const deepSourceIds = new Set((deepRetrieval.body ?? []).map((item) => item.source_id));
  if (!deepSourceIds.has(IDs.noteSource) || deepSourceIds.has(IDs.importSource)) {
    fail("The deep-task session retrieval corpus was not safely scoped.");
  }

  const lightPreflight = await rpc("preflight_ai_task", {
    p_workspace_id: IDs.workspace,
    p_world_id: IDs.world,
    p_saga_id: IDs.saga,
    p_session_id: null,
    p_task_name: "propose_thread_complication",
    p_input_payload: { fixture: "synthetic" },
  });
  const deepPreflight = await rpc("preflight_ai_task", {
    p_workspace_id: IDs.workspace,
    p_world_id: IDs.world,
    p_saga_id: IDs.saga,
    p_session_id: IDs.session,
    p_task_name: "synthesize_session",
    p_input_payload: { fixture: "synthetic" },
  });
  if (!lightPreflight.body.allowed || !deepPreflight.body.allowed) {
    fail("The hosted quota preflight did not allow the bounded synthetic tasks.");
  }

  const pipelineRunId = oneRow(`
select id from public.pipeline_runs
where workspace_id = '${IDs.workspace}' and session_id = '${IDs.session}'
order by created_at desc limit 1;
  `).id;
  if (!pipelineRunId) fail("The hosted Session pipeline boundary was not initialized.");
  runSql(`
update public.pipeline_runs
set state = 'synthesizing', updated_at = now()
where id = '${pipelineRunId}';
  `, "synthesis_pipeline_transition");
  createAiRuns(pipelineRunId);

  const light = await invokeAiTaskWithRecovery(IDs.lightRun, "light");
  stageTimings.lightTaskMs = light.latencyMs;
  if (!light.body.ok) fail("The hosted light AI task did not complete.");
  const lightReplay = await invokeInternal("ai-task-runner", { run_id: IDs.lightRun });
  if (!lightReplay.body.replayed) fail("The light AI task exact retry was not replayed.");

  const lightAttemptEvidence = oneRow(`
select attempts, repair_attempts
from internal.ai_task_runs
where id = '${IDs.lightRun}';
  `);
  const callsBeforeDeep = 3
    + Number(lightAttemptEvidence.attempts ?? 1)
    + Number(lightAttemptEvidence.repair_attempts ?? 0);
  const remainingCallBudget = MAX_NEW_INFERENCE_ATTEMPTS - callsBeforeDeep;
  if (remainingCallBudget < 2) {
    fail("The deep task was not started because its primary-plus-repair allowance would exceed the E2 call guard.");
  }

  const deep = await invokeAiTaskWithRecovery(IDs.deepRun, "deep");
  stageTimings.deepTaskMs = deep.latencyMs;
  if (!deep.body.ok) fail("The hosted deep AI task did not complete.");
  const deepReplay = await invokeInternal("ai-task-runner", { run_id: IDs.deepRun });
  if (!deepReplay.body.replayed) fail("The deep AI task exact retry was not replayed.");

  const idleEmbeddingReplay = await invokeInternal("embed-row-dispatch");
  if (idleEmbeddingReplay.body.claimed) fail("The duplicate embedding delivery unexpectedly claimed another job.");
  const idleTranscriptionReplay = await invokeInternal("transcribe-session");
  if (idleTranscriptionReplay.body.claimed) fail("The duplicate transcription delivery unexpectedly claimed another job.");

  const evidence = collectEvidence(transcriptionJobId, embeddingJobId);
  const transcriptionEvidence = evidence.transcription;
  const embeddingEvidence = evidence.embedding;
  const aiRuns = evidence.ai_runs ?? [];
  if (transcriptionEvidence?.job_state !== "complete"
    || transcriptionEvidence?.segment_count < 1
    || !transcriptionEvidence?.timestamps_valid
    || transcriptionEvidence?.usage_events !== 1) {
    fail("Hosted transcription persistence, timestamps, or metering evidence was incomplete.");
  }
  if (embeddingEvidence?.job_state !== "complete"
    || embeddingEvidence?.dimensions !== 1536
    || embeddingEvidence?.vector_dimensions !== 1536
    || !embeddingEvidence?.is_current
    || embeddingEvidence?.usage_events !== 1
    || !embeddingEvidence?.duplicate_replay) {
    fail("Hosted embedding persistence, dimensions, replay, or metering evidence was incomplete.");
  }
  if (aiRuns.length !== 2 || aiRuns.some((run) => run.status !== "complete"
    || run.usage_events !== 1 || !run.provider_checkpointed)) {
    fail("Hosted AI completion, checkpoint, retry, or metering evidence was incomplete.");
  }
  if (evidence.isolation?.sibling_embedding_count !== 0
    || evidence.isolation?.canon_audit_writes !== 0
    || !evidence.isolation?.pending_baseline_draft_intact
    || !evidence.isolation?.unapproved_import_intact) {
    fail("Hosted isolation or zero-canon-write evidence failed.");
  }
  if (evidence.observability?.event_count < 1
    || evidence.observability?.unsafe_fixture_text_matches !== 0
    || evidence.observability?.raw_payload_key_matches !== 0) {
    fail("Hosted safe-observability evidence failed.");
  }

  const aiExternalCalls = aiRuns.reduce(
    (total, run) => total + Number(run.attempts ?? 1) + Number(run.repair_attempts ?? 0),
    0
  );
  const newExternalCalls = 3 + aiExternalCalls;
  const cumulativeAttempts = PREVIOUS_INFERENCE_ATTEMPTS + newExternalCalls;
  if (cumulativeAttempts > PACKET_INFERENCE_LIMIT) fail("Observed inference attempts exceeded the E2 guard.");

  successOutput = {
    result: "E2_HOSTED_FIRST_PASS_OK",
    environment: "staging",
    project_ref: PROJECT_REF,
    fixture_classification: "synthetic_non_sensitive",
    external_inference_attempts_this_pass: newExternalCalls,
    cumulative_packet_inference_attempts: cumulativeAttempts,
    packet_inference_limit: PACKET_INFERENCE_LIMIT,
    secrets_printed: false,
    private_payloads_printed: false,
    retrieval: {
      mode: hybrid.body.retrieval_mode,
      result_count: hybrid.body.results.length,
      sibling_saga_excluded: true,
      pending_draft_excluded: true,
      unapproved_import_excluded: true,
    },
    quota_preflight: {
      light_allowed: lightPreflight.body.allowed,
      deep_allowed: deepPreflight.body.allowed,
    },
    retry_recovery: safeAiRetryEvidence,
    timings_ms: stageTimings,
    evidence,
  };
  }
  }
} catch (error) {
  executionError = error;
}

let cleanupError;
try {
  await deleteStorageFixture();
  try {
    runSql(`
begin;
delete from internal.provider_pipeline_events where workspace_id = '${IDs.workspace}';
delete from internal.ai_draft_batches where workspace_id = '${IDs.workspace}';
delete from internal.ai_task_runs where workspace_id = '${IDs.workspace}';
delete from internal.notification_queue where workspace_id = '${IDs.workspace}';
delete from internal.dead_letter_jobs where job_id in (
  select id from internal.embedding_jobs where workspace_id = '${IDs.workspace}'
  union all
  select id from internal.transcription_jobs where workspace_id = '${IDs.workspace}'
  union all
  select id from internal.ai_task_runs where workspace_id = '${IDs.workspace}'
);
delete from internal.embedding_jobs where workspace_id = '${IDs.workspace}';
delete from internal.transcription_jobs where workspace_id = '${IDs.workspace}';
delete from internal.cleanup_jobs where workspace_id = '${IDs.workspace}';
delete from internal.export_jobs where workspace_id = '${IDs.workspace}';
delete from internal.stale_pipeline_warning_jobs where workspace_id = '${IDs.workspace}';
delete from internal.session_prep_action_receipts where workspace_id = '${IDs.workspace}';
delete from internal.stage_write_receipts where workspace_id = '${IDs.workspace}';
delete from public.workspaces where id = '${IDs.workspace}';
delete from auth.users where id = '${IDs.gm}';
commit;
    `, "synthetic_fixture_cleanup");
  } catch {
    // Cleanup failure is reported through the post-run read-only residue check.
  }
  const residue = oneRow(`
select jsonb_build_object(
  'workspace_rows', (select count(*) from public.workspaces where id = '${IDs.workspace}'),
  'auth_rows', (select count(*) from auth.users where id = '${IDs.gm}'),
  'storage_rows', (select count(*) from storage.objects where bucket_id = 'audio' and name like '${IDs.workspace}/%'),
  'ai_draft_batches', (select count(*) from internal.ai_draft_batches where workspace_id = '${IDs.workspace}'),
  'ai_task_runs', (select count(*) from internal.ai_task_runs where workspace_id = '${IDs.workspace}'),
  'cleanup_jobs', (select count(*) from internal.cleanup_jobs where workspace_id = '${IDs.workspace}'),
  'dead_letters', (
    select count(*) from internal.dead_letter_jobs
    where job_id in ('${IDs.lightRun}'::uuid, '${IDs.deepRun}'::uuid)
  ),
  'embedding_jobs', (select count(*) from internal.embedding_jobs where workspace_id = '${IDs.workspace}'),
  'export_jobs', (select count(*) from internal.export_jobs where workspace_id = '${IDs.workspace}'),
  'notification_queue', (select count(*) from internal.notification_queue where workspace_id = '${IDs.workspace}'),
  'provider_events', (select count(*) from internal.provider_pipeline_events where workspace_id = '${IDs.workspace}'),
  'prep_receipts', (select count(*) from internal.session_prep_action_receipts where workspace_id = '${IDs.workspace}'),
  'stage_receipts', (select count(*) from internal.stage_write_receipts where workspace_id = '${IDs.workspace}'),
  'stale_jobs', (select count(*) from internal.stale_pipeline_warning_jobs where workspace_id = '${IDs.workspace}'),
  'transcription_jobs', (select count(*) from internal.transcription_jobs where workspace_id = '${IDs.workspace}')
) cleanup;
  `, "cleanup_residue_check").cleanup;
  if (Object.values(residue).some((count) => count !== 0)) {
    fail("Synthetic staging cleanup left recoverable fixture residue.");
  }
} catch (error) {
  cleanupError = error;
}

if (cleanupError && executionError) {
  fail(`${executionError.message} Cleanup verification also failed safely during cleanup_residue_check.`);
}
if (cleanupError) throw cleanupError;
if (executionError) throw executionError;
console.log(JSON.stringify(successOutput, null, 2));

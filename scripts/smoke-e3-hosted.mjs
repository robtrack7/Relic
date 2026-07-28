import { spawnSync } from "node:child_process";

const PROJECT_REF = "scagegrrilvrpuilthzz";
const API_BASE = `https://${PROJECT_REF}.supabase.co`;
const FUNCTIONS_BASE = `${API_BASE}/functions/v1`;
const APPROVED_COST_CEILING_USD = 1.00;
const APPROVED_AI_ATTEMPTS = 6;
const APPROVED_EMBEDDING_ATTEMPTS = 3;
const fixtureRunId = process.env.E3_FIXTURE_RUN_ID;
const internalToken = process.env.INTERNAL_TOKEN;
const configuredCostCeiling = Number(process.env.E3_MAX_COST_USD);
const configuredAiAttempts = Number(process.env.E3_MAX_AI_ATTEMPTS);
const configuredEmbeddingAttempts = Number(process.env.E3_MAX_EMBEDDING_ATTEMPTS);
const validateFixtureOnly = process.argv.includes("--validate-fixture");

const IDs = Object.freeze({
  gm: "e3000000-0000-4000-8000-000000000001",
  profile: "e3000000-0000-4000-8000-000000000002",
  workspace: "e3010000-0000-4000-8000-000000000001",
  world: "e3020000-0000-4000-8000-000000000001",
  era: "e3020000-0000-4000-8000-000000000002",
  saga: "e3030000-0000-4000-8000-000000000001",
  siblingSaga: "e3030000-0000-4000-8000-000000000002",
  character: "e3040000-0000-4000-8000-000000000001",
  worldPlace: "e3040000-0000-4000-8000-000000000002",
  siblingCharacter: "e3040000-0000-4000-8000-000000000003",
  characterSource: "e3060000-0000-4000-8000-000000000001",
  worldSource: "e3060000-0000-4000-8000-000000000002",
  siblingSource: "e3060000-0000-4000-8000-000000000003",
  importSource: "e3060000-0000-4000-8000-000000000004",
  turns: [
    "e3100000-0000-4000-8000-000000000001",
    "e3100000-0000-4000-8000-000000000002",
    "e3100000-0000-4000-8000-000000000003",
  ],
  idempotency: [
    "e3110000-0000-4000-8000-000000000001",
    "e3110000-0000-4000-8000-000000000002",
    "e3110000-0000-4000-8000-000000000003",
  ],
});

const turnSpecs = [
  {
    question: "What does the Amber Warden guard, and where is that place?",
    expected: "grounded",
  },
  {
    question: "Offer a clearly labeled non-canon creative proposal for a complication involving the Amber Warden, and include a draft_entity action preview for a new character called the Tidebound Witness.",
    expected: "creative",
  },
  {
    question: "What is the Moon Emperor's favorite dessert?",
    expected: "no_answer",
  },
];

const supabaseCli = process.platform === "win32" ? "supabase.exe" : "supabase";
let publishableKey;
let scopedJwt;
let threadId = null;
const runIds = [];

function fail(message) {
  throw new Error(message);
}

function assertExecutionGuard() {
  if (!process.argv.includes("--execute")) fail("The E3 hosted smoke requires --execute.");
  if (!fixtureRunId || !/^[0-9a-f-]{36}$/i.test(fixtureRunId)) fail("A valid E3 fixture run ID is required.");
  if (!internalToken) fail("The protected staging internal token is unavailable.");
  if (!Number.isFinite(configuredCostCeiling) || configuredCostCeiling <= 0
    || configuredCostCeiling > APPROVED_COST_CEILING_USD) {
    fail("The configured E3 cost ceiling exceeds authorization.");
  }
  if (!Number.isInteger(configuredAiAttempts) || configuredAiAttempts < 3
    || configuredAiAttempts > APPROVED_AI_ATTEMPTS) {
    fail("The configured E3 AI-attempt ceiling exceeds authorization.");
  }
  if (!Number.isInteger(configuredEmbeddingAttempts) || configuredEmbeddingAttempts !== turnSpecs.length
    || configuredEmbeddingAttempts > APPROVED_EMBEDDING_ATTEMPTS) {
    fail("The configured E3 embedding-attempt ceiling is invalid.");
  }
}

function runCli(args, safeStage) {
  const result = spawnSync(supabaseCli, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
    windowsHide: true,
  });
  if (result.status !== 0) {
    fail(`A linked staging operation failed safely during ${safeStage}.`);
  }
  return result.stdout.trim();
}

function runSql(sql, safeStage = "database_query") {
  const raw = runCli([
    "db", "query", "--linked", sql, "--output", "json", "--agent", "no",
  ], safeStage);
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    fail(`The linked staging response was invalid during ${safeStage}.`);
  }
  return Array.isArray(parsed) ? parsed : parsed.rows ?? [];
}

function oneRow(sql, safeStage) {
  const rows = runSql(sql, safeStage);
  if (rows.length !== 1) fail(`Unexpected row count during ${safeStage}.`);
  return rows[0];
}

function getPublishableKey() {
  const raw = runCli([
    "projects", "api-keys", "--project-ref", PROJECT_REF, "--output", "json", "--agent", "no",
  ], "publishable_key_metadata");
  let keys;
  try {
    keys = JSON.parse(raw);
  } catch {
    fail("The staging API-key metadata response was invalid.");
  }
  const key = keys.find((candidate) => candidate.type === "publishable" && candidate.api_key);
  if (!key) fail("The staging publishable key is unavailable.");
  return key.api_key;
}

async function jsonFetch(url, options, safeLabel, acceptedStatuses = [200]) {
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(180_000),
  });
  const body = await response.json().catch(() => ({}));
  if (!acceptedStatuses.includes(response.status)) {
    fail(`${safeLabel} failed safely with HTTP ${response.status}.`);
  }
  return { body, status: response.status };
}

async function invokeInternal(functionName, body, acceptedStatuses = [200, 202]) {
  return jsonFetch(`${FUNCTIONS_BASE}/${functionName}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${internalToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  }, functionName, acceptedStatuses);
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

async function restSelect(path) {
  return jsonFetch(`${API_BASE}/rest/v1/${path}`, {
    method: "GET",
    headers: {
      apikey: publishableKey,
      authorization: `Bearer ${scopedJwt}`,
    },
  }, `REST ${path}`);
}

async function preflightGuideRetrieval() {
  const strict = await rpc("retrieve_for_task", {
    workspace_id: IDs.workspace,
    world_id: IDs.world,
    saga_id: IDs.saga,
    era_id: null,
    query_text: turnSpecs[0].question,
    task_profile: "answer_saga_question",
    filters: {},
    top_k: 20,
  });
  let results = Array.isArray(strict.body) ? strict.body : [];
  let mode = "strict";
  if (results.length === 0) {
    const relaxed = await rpc("retrieve_for_task_relaxed", {
      workspace_id: IDs.workspace,
      world_id: IDs.world,
      saga_id: IDs.saga,
      query_text: turnSpecs[0].question,
      task_profile: "answer_saga_question",
      top_k: 20,
    });
    results = Array.isArray(relaxed.body) ? relaxed.body : [];
    mode = "relaxed";
  }
  const sourceIds = new Set(results.map((result) => result.source_id).filter(Boolean));
  if (!sourceIds.has(IDs.characterSource) || !sourceIds.has(IDs.worldSource)
    || sourceIds.has(IDs.siblingSource) || sourceIds.has(IDs.importSource)) {
    fail("The zero-provider Guide retrieval preflight did not return the scoped citation sources.");
  }
  return { mode, result_count: results.length, provider_calls_made: 0 };
}

function preflightGuideEvidenceFreeze() {
  const created = oneRow(`
select public.create_guide_turn_for_worker(
  '${IDs.workspace}','${IDs.world}','${IDs.saga}','${IDs.gm}',null,
  '${IDs.turns[0]}','${IDs.idempotency[0]}','${turnSpecs[0].question.replaceAll("'", "''")}',
  'lexical_fallback',array['${IDs.characterSource}'::uuid,'${IDs.worldSource}'::uuid]
) created;
  `, "guide_evidence_freeze_preflight").created;
  if (!created?.run_id) fail("The zero-provider Guide evidence preflight did not create a task run.");
  const evidence = oneRow(`
select public.get_guide_evidence_for_worker('${created.run_id}') evidence;
  `, "guide_evidence_freeze_read").evidence;
  const texts = Array.isArray(evidence)
    ? evidence.map((item) => String(item.text ?? "").toLowerCase())
    : [];
  if (texts.length !== 2
    || !texts.some((text) => text.includes("amber warden") && text.includes("sunken archive"))
    || !texts.some((text) => text.includes("sunken archive") && text.includes("eastern cliffs"))) {
    fail("The zero-provider Guide evidence preflight did not freeze the entity-backed facts.");
  }
  return {
    source_count: texts.length,
    entity_facts_frozen: true,
    provider_calls_made: 0,
  };
}

function setupFixture() {
  runSql(`
begin;
delete from public.workspaces where id = '${IDs.workspace}';
delete from auth.users where id = '${IDs.gm}';
insert into auth.users (
  id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,
  raw_app_meta_data,raw_user_meta_data,is_super_admin,confirmation_token,email_change,
  email_change_token_new,recovery_token
) values (
  '${IDs.gm}','00000000-0000-0000-0000-000000000000','authenticated','authenticated',
  'e3-hosted-smoke@example.test',extensions.crypt('synthetic-not-a-login-secret',extensions.gen_salt('bf')),
  now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false,'','','',''
);
insert into public.gm_profiles (id,user_id,experience_level,improv_comfort,prep_style)
values ('${IDs.profile}','${IDs.gm}','experienced','mixed','light');
insert into public.workspaces (id,owner_gm_id,name)
values ('${IDs.workspace}','${IDs.gm}','E3 Synthetic Hosted Smoke');
insert into public.worlds (id,workspace_id,owner_gm_id,name)
values ('${IDs.world}','${IDs.workspace}','${IDs.gm}','E3 Synthetic World');
insert into public.world_eras (id,workspace_id,world_id,name)
values ('${IDs.era}','${IDs.workspace}','${IDs.world}','E3 Synthetic Era');
insert into public.sagas (id,workspace_id,world_id,owner_gm_id,primary_era_id,name)
values
  ('${IDs.saga}','${IDs.workspace}','${IDs.world}','${IDs.gm}','${IDs.era}','E3 Synthetic Saga'),
  ('${IDs.siblingSaga}','${IDs.workspace}','${IDs.world}','${IDs.gm}','${IDs.era}','E3 Sibling Saga');
insert into public.characters (id,workspace_id,world_id,saga_id,scope,name,summary,narrative,canon_state)
values
  ('${IDs.character}','${IDs.workspace}','${IDs.world}','${IDs.saga}','saga',
   'Amber Warden','The Amber Warden guards the Sunken Archive.',
   'The Amber Warden keeps watch at the Sunken Archive beneath the eastern cliffs.','canon'),
  ('${IDs.siblingCharacter}','${IDs.workspace}','${IDs.world}','${IDs.siblingSaga}','saga',
   'Sibling Sentinel','A forbidden sibling-Saga sentinel.',
   'This record must never enter the current Saga Guide context.','canon');
insert into public.places (id,workspace_id,world_id,saga_id,scope,name,summary,narrative,canon_state)
values ('${IDs.worldPlace}','${IDs.workspace}','${IDs.world}',null,'world',
  'Sunken Archive','The Sunken Archive lies beneath the eastern cliffs.',
  'A flooded World-level library guarded by the Amber Warden.','canon');
insert into public.sources (
  id,workspace_id,world_id,saga_id,scope,kind,source_entity_type,source_entity_id,raw_excerpt
) values
  ('${IDs.characterSource}','${IDs.workspace}','${IDs.world}','${IDs.saga}','saga',
   'gm_instruction','character','${IDs.character}',''),
  ('${IDs.worldSource}','${IDs.workspace}','${IDs.world}',null,'world',
   'gm_instruction','place','${IDs.worldPlace}',''),
  ('${IDs.siblingSource}','${IDs.workspace}','${IDs.world}','${IDs.siblingSaga}','saga',
   'gm_instruction','character','${IDs.siblingCharacter}','Synthetic sibling exclusion sentinel.');
insert into public.sources (
  id,workspace_id,world_id,saga_id,scope,kind,uploader_id,original_filename,mime_type,
  byte_size,ingestion_method,content_sha256,import_state,raw_excerpt,ready_at
) values (
  '${IDs.importSource}','${IDs.workspace}','${IDs.world}','${IDs.saga}','saga','imported_text',
  '${IDs.gm}','e3-unapproved.txt','text/plain',34,'paste',repeat('b',64),'ready_for_review',
  'Synthetic unapproved import sentinel.',now()
);
update internal.embedding_jobs
set scheduled_at=now()+interval '1 day',debounce_until=now()+interval '1 day'
where workspace_id='${IDs.workspace}';
commit;
  `, "fixture_setup");
}

function currentGuardEvidence() {
  return oneRow(`
select jsonb_build_object(
  'ai_attempts',coalesce((select sum(attempts+repair_attempts) from internal.ai_task_runs where workspace_id='${IDs.workspace}'),0),
  'embedding_attempts',(select count(*) from internal.provider_pipeline_events where workspace_id='${IDs.workspace}' and worker_type='hybrid_search'),
  'database_cost_estimate_usd',coalesce((select sum(provider_cost_estimate_usd) from internal.ai_task_runs where workspace_id='${IDs.workspace}'),0),
  'usage_events',(select count(*) from public.usage_events where workspace_id='${IDs.workspace}'),
  'provider_events',(select count(*) from internal.provider_pipeline_events where workspace_id='${IDs.workspace}')
) evidence;
  `, "guard_evidence").evidence;
}

function enforceObservedGuards(evidence, includeNextTurn = false) {
  const reservedAi = includeNextTurn ? 2 : 0;
  const reservedEmbedding = includeNextTurn ? 1 : 0;
  if (Number(evidence.ai_attempts) + reservedAi > configuredAiAttempts) {
    fail("The E3 AI-attempt guard stopped the smoke.");
  }
  if (Number(evidence.embedding_attempts) + reservedEmbedding > configuredEmbeddingAttempts) {
    fail("The E3 embedding-attempt guard stopped the smoke.");
  }
  if (Number(evidence.database_cost_estimate_usd) > configuredCostCeiling) {
    fail("The E3 database cost guard stopped the smoke.");
  }
}

async function submitTurn(index) {
  enforceObservedGuards(currentGuardEvidence(), true);
  const spec = turnSpecs[index];
  const submission = {
    gm_user_id: IDs.gm,
    workspace_id: IDs.workspace,
    world_id: IDs.world,
    saga_id: IDs.saga,
    thread_id: threadId,
    turn_id: IDs.turns[index],
    idempotency_key: IDs.idempotency[index],
    question: spec.question,
  };
  const response = await invokeInternal("guide-submit", submission, [200, 202]);
  if (!response.body.run_id || !response.body.thread_id) fail("Guide submission omitted its target identity.");
  threadId = response.body.thread_id;
  runIds.push(response.body.run_id);
  let run = oneRow(`
select status,failure_category,attempts,repair_attempts
from internal.ai_task_runs where id='${response.body.run_id}';
  `, `turn_${index + 1}_status`);
  if (run.status === "pending") {
    enforceObservedGuards(currentGuardEvidence(), true);
    await invokeInternal("ai-task-runner", { run_id: response.body.run_id }, [200, 202, 422, 500, 503]);
    run = oneRow(`
select status,failure_category,attempts,repair_attempts
from internal.ai_task_runs where id='${response.body.run_id}';
    `, `turn_${index + 1}_direct_dispatch_status`);
  }
  enforceObservedGuards(currentGuardEvidence());
  if (run.status !== "complete") {
    const validationCategories = Array.isArray(response.body.dispatch_validation_categories)
      ? response.body.dispatch_validation_categories.join(",")
      : "none";
    fail(`Guide turn ${index + 1} stopped safely in ${run.status}/${run.failure_category ?? "unknown"} (validation categories: ${validationCategories}).`);
  }
  return submission;
}

async function acceptDraftAction() {
  const action = oneRow(`
select id,state
from public.guide_action_intents
where workspace_id='${IDs.workspace}' and turn_id='${IDs.turns[1]}' and action_type='draft_entity';
  `, "draft_action_preflight");
  if (action.state !== "pending") fail("The hosted creative turn did not preserve a pending draft action.");
  const before = currentGuardEvidence();
  if (Number(before.ai_attempts) + 2 > configuredAiAttempts) {
    fail("The E3 AI-attempt guard stopped the confirmed draft.");
  }
  const accepted = await rpc("set_guide_action_state", {
    p_workspace_id: IDs.workspace,
    p_world_id: IDs.world,
    p_saga_id: IDs.saga,
    p_action_id: action.id,
    p_state: "accepted",
  });
  if (accepted.body?.state !== "processing" || !accepted.body?.run_id) {
    fail("The hosted Guide draft action was not accepted into its registered task.");
  }
  await invokeInternal("ai-task-runner", { run_id: accepted.body.run_id }, [200, 202, 422, 500, 503]);
  const run = oneRow(`
select status,task_name,ai_credits
from internal.ai_task_runs where id='${accepted.body.run_id}';
  `, "draft_action_status");
  if (run.status !== "complete" || run.task_name !== "draft_entity_from_prompt"
    || Number(run.ai_credits) !== 3) {
    fail("The hosted confirmed draft did not complete with the registered 3-credit contract.");
  }
  return { action_id: action.id, run_id: accepted.body.run_id };
}

function collectEvidence() {
  return oneRow(`
select jsonb_build_object(
  'fixture_run_id','${fixtureRunId}',
  'thread_count',(select count(*) from public.guide_threads where workspace_id='${IDs.workspace}'),
  'turn_count',(select count(*) from public.guide_turns where workspace_id='${IDs.workspace}'),
  'complete_turns',(select count(*) from public.guide_turns where workspace_id='${IDs.workspace}' and status='complete'),
  'ai_runs',(
    select jsonb_agg(jsonb_build_object(
      'task_name',task_name,'status',status,'attempts',attempts,'repair_attempts',repair_attempts,
      'ai_credits',ai_credits,
      'provider_alias',provider_alias,'resolved_model',resolved_model,'resolved_provider',resolved_provider,
      'provider_checkpointed',provider_completed_at is not null,
      'usage_events',(select count(*) from public.usage_events u where u.id=r.usage_event_id),
      'metered_credits',(select ai_credits from public.usage_events u where u.id=r.usage_event_id),
      'allowed_source_count',cardinality(allowed_source_ids),
      'source_versions_frozen',allowed_source_versions<>'{}'::jsonb,
      'conversation_context_items',jsonb_array_length(coalesce(input_payload->'conversation_context','[]'::jsonb))
    ) order by created_at)
    from internal.ai_task_runs r where workspace_id='${IDs.workspace}'
  ),
  'response_shapes',(
    select jsonb_agg(jsonb_build_object(
      'ordinal',ordinal,'no_answer',coalesce((response_payload->>'no_answer')::boolean,false),
      'block_types',(select jsonb_agg(b->>'type') from jsonb_array_elements(response_payload->'blocks') b),
      'citation_count',(select count(*) from jsonb_array_elements(response_payload->'blocks') b
        cross join lateral jsonb_array_elements(coalesce(b->'citations','[]'::jsonb)) c)
    ) order by ordinal)
    from public.guide_turns where workspace_id='${IDs.workspace}'
  ),
  'isolation',jsonb_build_object(
    'sibling_allowed_matches',(select count(*) from internal.ai_task_runs where workspace_id='${IDs.workspace}' and '${IDs.siblingSource}'=any(allowed_source_ids)),
    'import_allowed_matches',(select count(*) from internal.ai_task_runs where workspace_id='${IDs.workspace}' and '${IDs.importSource}'=any(allowed_source_ids)),
    'unexpected_allowed_matches',(select count(*) from internal.ai_task_runs r cross join unnest(r.allowed_source_ids) s
      where r.workspace_id='${IDs.workspace}' and s not in ('${IDs.characterSource}'::uuid,'${IDs.worldSource}'::uuid)),
    'canon_writes',(select count(*) from public.canon_audit where workspace_id='${IDs.workspace}')
  ),
  'confirmed_draft',jsonb_build_object(
    'draft_count',(select count(*) from public.drafts where workspace_id='${IDs.workspace}'),
    'pending_count',(select count(*) from public.drafts where workspace_id='${IDs.workspace}' and state='pending'),
    'three_credit_runs',(select count(*) from internal.ai_task_runs r
      join public.usage_events u on u.id=r.usage_event_id
      where r.workspace_id='${IDs.workspace}' and r.task_name='draft_entity_from_prompt'
        and r.ai_credits=3 and u.ai_credits=3)
  ),
  'observability',jsonb_build_object(
    'embedding_events',(select count(*) from internal.provider_pipeline_events where workspace_id='${IDs.workspace}' and worker_type='hybrid_search'),
    'embedding_resolved_models',(select coalesce(jsonb_agg(distinct resolved_model),'[]'::jsonb) from internal.provider_pipeline_events where workspace_id='${IDs.workspace}' and worker_type='hybrid_search'),
    'unsafe_fixture_text_matches',(select count(*) from internal.provider_pipeline_events e where workspace_id='${IDs.workspace}' and lower(to_jsonb(e)::text) like '%amber warden%'),
    'raw_payload_key_matches',(select count(*) from internal.provider_pipeline_events e cross join lateral jsonb_object_keys(e.safe_metadata) key
      where e.workspace_id='${IDs.workspace}' and lower(key) in ('prompt','question','evidence','response','authorization','cookie','jwt','embedding','vector'))
  ),
  'guards','${JSON.stringify(currentGuardEvidence())}'::jsonb
) evidence;
  `, "hosted_evidence").evidence;
}

function validateEvidence(evidence) {
  if (evidence.thread_count !== 1 || evidence.turn_count !== 3 || evidence.complete_turns !== 3) {
    fail("The hosted Guide conversation did not complete three persistent turns.");
  }
  if (!Array.isArray(evidence.ai_runs) || evidence.ai_runs.length !== 4
    || evidence.ai_runs.some((run) => run.status !== "complete"
      || run.provider_alias !== "relic-balanced"
      || run.resolved_model !== "gpt-5.6-terra"
      || run.usage_events !== 1
      || !run.provider_checkpointed
      || (run.allowed_source_count > 0 && !run.source_versions_frozen))) {
    fail("The hosted Guide AI-run evidence was incomplete.");
  }
  const guideRuns = evidence.ai_runs.filter((run) => run.task_name === "answer_saga_question");
  const draftRuns = evidence.ai_runs.filter((run) => run.task_name === "draft_entity_from_prompt");
  if (guideRuns.length !== 3 || draftRuns.length !== 1
    || guideRuns.some((run) => Number(run.ai_credits) !== 1 || Number(run.metered_credits) !== 1)
    || Number(draftRuns[0].ai_credits) !== 3 || Number(draftRuns[0].metered_credits) !== 3) {
    fail("The hosted Guide and confirmed-draft credit evidence was incorrect.");
  }
  if (guideRuns[0].conversation_context_items !== 0
    || guideRuns.slice(1).some((run) => run.conversation_context_items < 2)) {
    fail("The hosted Guide conversation context was not bounded and carried forward.");
  }
  const [grounded, creative, insufficient] = evidence.response_shapes;
  if (grounded.no_answer || grounded.citation_count < 1
    || !grounded.block_types.includes("grounded_answer")) {
    fail(`The hosted grounded answer lacked a paragraph citation (no_answer=${grounded.no_answer}, citations=${grounded.citation_count}, block_types=${grounded.block_types.join(",")}).`);
  }
  if (creative.no_answer
    || !creative.block_types.some((type) => type === "creative_proposal" || type === "grounded_proposal")) {
    fail("The hosted creative turn was not labeled as a proposal.");
  }
  if (!insufficient.no_answer || !insufficient.block_types.every((type) => type === "guidance")) {
    fail("The hosted insufficiency turn did not fail closed.");
  }
  if (Object.values(evidence.isolation).some((value) => value !== 0)) {
    fail("The hosted Guide isolation or zero-canon-write evidence failed.");
  }
  if (evidence.confirmed_draft.draft_count !== 1
    || evidence.confirmed_draft.pending_count !== 1
    || evidence.confirmed_draft.three_credit_runs !== 1) {
    fail("The hosted confirmed draft was not a single pending 3-credit proposal.");
  }
  if (evidence.observability.embedding_events !== 3
    || !evidence.observability.embedding_resolved_models.includes("text-embedding-3-small")
    || evidence.observability.unsafe_fixture_text_matches !== 0
    || evidence.observability.raw_payload_key_matches !== 0) {
    fail("The hosted Guide embedding or safe-log evidence failed.");
  }
  enforceObservedGuards(evidence.guards);
}

function cleanupFixture() {
  try {
    runSql(`
begin;
delete from internal.provider_pipeline_events where workspace_id='${IDs.workspace}';
delete from internal.guide_evidence_snapshots where workspace_id='${IDs.workspace}';
delete from public.workspaces where id='${IDs.workspace}';
delete from internal.ai_draft_batches where workspace_id='${IDs.workspace}';
delete from internal.ai_task_runs where workspace_id='${IDs.workspace}';
delete from internal.notification_queue where workspace_id='${IDs.workspace}';
delete from internal.dead_letter_jobs where job_id in (
  select id from internal.embedding_jobs where workspace_id='${IDs.workspace}'
);
delete from internal.embedding_jobs where workspace_id='${IDs.workspace}';
delete from internal.transcription_jobs where workspace_id='${IDs.workspace}';
delete from internal.cleanup_jobs where workspace_id='${IDs.workspace}';
delete from internal.export_jobs where workspace_id='${IDs.workspace}';
delete from internal.stale_pipeline_warning_jobs where workspace_id='${IDs.workspace}';
delete from internal.session_prep_action_receipts where workspace_id='${IDs.workspace}';
delete from internal.stage_write_receipts where workspace_id='${IDs.workspace}';
delete from auth.users where id='${IDs.gm}';
commit;
    `, "fixture_cleanup");
  } catch {
    // The residue check below is authoritative and contains no payloads.
  }
  const residue = oneRow(`
select jsonb_build_object(
  'workspace_rows',(select count(*) from public.workspaces where id='${IDs.workspace}'),
  'auth_rows',(select count(*) from auth.users where id='${IDs.gm}'),
  'ai_runs',(select count(*) from internal.ai_task_runs where workspace_id='${IDs.workspace}'),
  'embedding_jobs',(select count(*) from internal.embedding_jobs where workspace_id='${IDs.workspace}'),
  'provider_events',(select count(*) from internal.provider_pipeline_events where workspace_id='${IDs.workspace}'),
  'guide_threads',(select count(*) from public.guide_threads where workspace_id='${IDs.workspace}'),
  'guide_evidence',(select count(*) from internal.guide_evidence_snapshots where workspace_id='${IDs.workspace}'),
  'draft_batches',(select count(*) from internal.ai_draft_batches where workspace_id='${IDs.workspace}'),
  'drafts',(select count(*) from public.drafts where workspace_id='${IDs.workspace}'),
  'usage_events',(select count(*) from public.usage_events where workspace_id='${IDs.workspace}')
) cleanup;
  `, "cleanup_residue").cleanup;
  if (Object.values(residue).some((count) => count !== 0)) {
    fail("Synthetic E3 fixture cleanup left residue.");
  }
  return residue;
}

assertExecutionGuard();
let output;
let executionError;
let schedulesPaused = false;
try {
  const queueState = oneRow(`
select jsonb_build_object(
  'queued_ai',(select count(*) from internal.ai_task_runs where status in ('queued','retryable','running')),
  'queued_embeddings',(select count(*) from internal.embedding_jobs where state in ('queued','retryable','running'))
) state;
  `, "queue_preflight").state;
  if (queueState.queued_ai !== 0 || queueState.queued_embeddings !== 0) {
    fail("Staging queues are not idle; refusing fixture execution.");
  }
  runSql(`
select cron.alter_job(jobid, active => false)
from cron.job
where jobname in ('relic-dispatch-ai-tasks','relic-dispatch-embeddings') and active;
  `, "pause_generic_dispatch");
  schedulesPaused = true;
  setupFixture();
  publishableKey = getPublishableKey();
  const issuer = await invokeInternal("issue-scoped-jwt", {
    gm_user_id: IDs.gm,
    purpose: "e3_hosted_guide_smoke",
    saga_id: IDs.saga,
  });
  scopedJwt = issuer.body.token;
  if (!scopedJwt) fail("The E3 scoped staging JWT was not issued.");
  const retrievalPreflight = await preflightGuideRetrieval();

  if (validateFixtureOnly) {
    const threads = await restSelect(
      `guide_threads?select=id&workspace_id=eq.${IDs.workspace}`,
    );
    if (!Array.isArray(threads.body) || threads.body.length !== 0) {
      fail("The authenticated fixture preflight did not observe the expected empty Guide scope.");
    }
    const fixture = oneRow(`
select jsonb_build_object(
  'workspace_rows',(select count(*) from public.workspaces where id='${IDs.workspace}'),
  'current_saga_sources',(select count(*) from public.sources where saga_id='${IDs.saga}' and id='${IDs.characterSource}'),
  'world_sources',(select count(*) from public.sources where world_id='${IDs.world}' and saga_id is null and id='${IDs.worldSource}'),
  'sibling_sources',(select count(*) from public.sources where saga_id='${IDs.siblingSaga}' and id='${IDs.siblingSource}'),
  'unapproved_imports',(select count(*) from public.sources where id='${IDs.importSource}' and import_state='ready_for_review'),
  'provider_events',(select count(*) from internal.provider_pipeline_events where workspace_id='${IDs.workspace}'),
  'ai_runs',(select count(*) from internal.ai_task_runs where workspace_id='${IDs.workspace}')
) fixture;
    `, "fixture_validation").fixture;
    if (fixture.workspace_rows !== 1
      || fixture.current_saga_sources !== 1
      || fixture.world_sources !== 1
      || fixture.sibling_sources !== 1
      || fixture.unapproved_imports !== 1
      || fixture.provider_events !== 0
      || fixture.ai_runs !== 0) {
      fail("The synthetic E3 fixture preflight evidence was incomplete.");
    }
    const evidenceFreezePreflight = preflightGuideEvidenceFreeze();
    output = {
      result: "E3_HOSTED_FIXTURE_PREFLIGHT_OK",
      environment: "staging",
      project_ref: PROJECT_REF,
      fixture_classification: "synthetic_non_sensitive",
      provider_calls_made: 0,
      authenticated_rls_read: true,
      retrieval_preflight: retrievalPreflight,
      evidence_freeze_preflight: evidenceFreezePreflight,
      fixture,
    };
  } else {
    const submissions = [];
    for (let index = 0; index < turnSpecs.length; index += 1) {
      submissions.push(await submitTurn(index));
    }
    const confirmedDraft = await acceptDraftAction();

    const beforeReplay = currentGuardEvidence();
    const replay = await invokeInternal("guide-submit", submissions[0], [200]);
    const afterReplay = currentGuardEvidence();
    if (!replay.body.replayed || JSON.stringify(beforeReplay) !== JSON.stringify(afterReplay)) {
      fail("Exact Guide replay caused additional provider or usage work.");
    }

    const thread = await rpc("get_guide_thread", {
      p_workspace_id: IDs.workspace,
      p_world_id: IDs.world,
      p_saga_id: IDs.saga,
      p_thread_id: threadId,
    });
    if (thread.body?.turns?.length !== 3) fail("The authenticated Guide thread did not recover three turns.");
    const context = await rpc("get_guide_source_context", {
      p_workspace_id: IDs.workspace,
      p_world_id: IDs.world,
      p_saga_id: IDs.saga,
      p_turn_id: IDs.turns[0],
    });
    if (!Array.isArray(context.body) || context.body.length < 1) {
      fail("The authenticated citation context was unavailable.");
    }

    const evidence = collectEvidence();
    validateEvidence(evidence);
    output = {
      result: "E3_HOSTED_GUIDE_SMOKE_OK",
      environment: "staging",
      project_ref: PROJECT_REF,
      fixture_classification: "synthetic_non_sensitive",
      configured_guards: {
        cost_ceiling_usd: configuredCostCeiling,
        ai_attempt_limit: configuredAiAttempts,
        embedding_attempt_limit: configuredEmbeddingAttempts,
      },
      exact_replay_without_provider_work: true,
      authenticated_thread_and_source_context: true,
      secrets_printed: false,
      private_payloads_printed: false,
      retrieval_preflight: retrievalPreflight,
      confirmed_draft: confirmedDraft,
      evidence,
    };
  }
} catch (error) {
  executionError = error;
}

let cleanupError;
let cleanup;
try {
  cleanup = cleanupFixture();
} catch (error) {
  cleanupError = error;
}
if (schedulesPaused) {
  try {
    runSql(`
select cron.alter_job(jobid, active => true)
from cron.job
where jobname in ('relic-dispatch-ai-tasks','relic-dispatch-embeddings');
    `, "restore_generic_dispatch");
  } catch (error) {
    cleanupError ??= error;
  }
}
if (cleanupError && executionError) {
  fail(`${executionError.message} Cleanup or scheduler restoration also failed safely.`);
}
if (cleanupError) throw cleanupError;
if (executionError) throw executionError;
output.cleanup = cleanup;
console.log(JSON.stringify(output, null, 2));

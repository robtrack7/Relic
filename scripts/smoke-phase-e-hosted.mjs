import { spawnSync } from "node:child_process";

const PROJECT_REF = "scagegrrilvrpuilthzz";
const AUTHORIZATION = "PHASE_E_HOSTED_SMOKE_APPROVED";
const COST_CEILING_USD = 1.0;
const MAX_LOGICAL_TASKS = 6;
const MAX_PROVIDER_COMPLETIONS = 12;
const PRODUCT_CREDITS = 28;

const TASKS = Object.freeze([
  { id: "e5200000-0000-4000-8000-000000000001", task: "plan_saga_workshop", prompt: "plan_saga_workshop@1.0.0", alias: "relic-fast", model: "gpt-5.6-luna", credits: 1, session: false, input: {
    saga_name: "The Velvet Astrolabe", game_system: "Cairn",
    notes: "A velvet astrolabe charts a drowned observatory. Keeper Sable protects its last seed while the Lantern Court seeks the eastern gate.",
    gm_profile: { experience_level: "returning", improv_comfort: "mixed", prep_style: "light" }
  } },
  { id: "e5200000-0000-4000-8000-000000000002", task: "scaffold_saga", prompt: "scaffold_saga@1.2.0", alias: "relic-deep", model: "gpt-5.6-sol", credits: 10, session: false, input: {
    saga_name: "The Velvet Astrolabe", game_system: "Cairn",
    conversation: [
      { role: "gm", content: "Keep the drowned observatory mysterious and make every route carry a cost." },
      { role: "assistant", content: "The central pressure is the Lantern Court's attempt to open the eastern gate." }
    ],
    emerging_outline: { premise: "A guarded astrolabe points toward a drowned observatory.", tone: "mysterious and costly", central_conflict: "Keeper Sable opposes the Lantern Court." },
    gm_profile: { experience_level: "returning", improv_comfort: "mixed", prep_style: "light" }
  } },
  { id: "e5200000-0000-4000-8000-000000000003", task: "regenerate_saga_scaffold_section", prompt: "regenerate_saga_scaffold_section@1.0.0", alias: "relic-balanced", model: "gpt-5.6-terra", credits: 3, session: false, input: {
    section_kind: "saga",
    current_section: { name: "The Velvet Astrolabe", premise: "A guarded astrolabe points toward a drowned observatory.", tone: "mysterious and costly", central_conflict: "Keeper Sable opposes the Lantern Court.", first_session_hook: "The eastern gate begins to sing.", game_system: "Cairn" },
    instruction: "Strengthen only the first-session hook and preserve the current Saga identity."
  } },
  { id: "e5200000-0000-4000-8000-000000000004", task: "answer_saga_question", prompt: "answer_saga_question@1.6.0", alias: "relic-balanced", model: "gpt-5.6-terra", credits: 1, session: false, input: {
    question: "First answer in one grounded_answer paragraph cited to the Keeper Sable evidence. Then return a bounded two-step plan: step one uses propose_record_create for a saga Character named Tidebound Witness with the evidence source_ids, and step two uses create_session for a Session named The Singing Gate and depends on step one. Each action must be individually confirmable."
  } },
  { id: "e5200000-0000-4000-8000-000000000005", task: "generate_session_prep", prompt: "generate_session_prep@1.0.0", alias: "relic-deep", model: "gpt-5.6-sol", credits: 10, session: true, input: {
    regenerate_scope: "all", query_text: "Prepare the planned Singing Gate session from current canon without changing canon."
  } },
  { id: "e5200000-0000-4000-8000-000000000006", task: "draft_entity_from_prompt", prompt: "draft_entity_from_prompt@1.1.0", alias: "relic-balanced", model: "gpt-5.6-terra", credits: 3, session: false, input: {
    entity_type: "character", prompt: "Draft a substantial non-canon Character proposal for the Tidebound Witness using Keeper Sable as the relationship anchor."
  } }
]);

const IDS = Object.freeze({
  gm: "e5000000-0000-4000-8000-000000000001",
  profile: "e5000000-0000-4000-8000-000000000002",
  workspace: "e5010000-0000-4000-8000-000000000001",
  world: "e5020000-0000-4000-8000-000000000001",
  era: "e5020000-0000-4000-8000-000000000002",
  saga: "e5030000-0000-4000-8000-000000000001",
  siblingSaga: "e5030000-0000-4000-8000-000000000002",
  session: "e5040000-0000-4000-8000-000000000001",
  character: "e5050000-0000-4000-8000-000000000001",
  siblingCharacter: "e5050000-0000-4000-8000-000000000002",
  source: "e5060000-0000-4000-8000-000000000001",
  siblingSource: "e5060000-0000-4000-8000-000000000002"
});

const supabaseCli = process.platform === "win32" ? "supabase.exe" : "supabase";
const internalToken = process.env.INTERNAL_TOKEN;
const fixtureRunId = process.env.PHASE_E_FIXTURE_RUN_ID;
const configuredAuthorization = process.env.PHASE_E_HOSTED_AUTHORIZATION;
const configuredProjectRef = process.env.PHASE_E_SUPABASE_PROJECT_REF;
const configuredCostCeiling = Number(process.env.PHASE_E_MAX_COST_USD);
const configuredProviderCompletions = Number(process.env.PHASE_E_MAX_PROVIDER_COMPLETIONS);
const wrapperOwnsSchedules = process.env.PHASE_E_WRAPPER_OWNS_SCHEDULES === "1";
const validateLocal = process.argv.includes("--validate-local");
const databaseTarget = validateLocal ? "--local" : "--linked";

function manifest() {
  return {
    mode: "preflight",
    performs_mutation: false,
    network_calls_made: 0,
    provider_calls_made: 0,
    environment: "relic-staging",
    project_ref: PROJECT_REF,
    fixture_classification: "synthetic_non_sensitive",
    task_count: TASKS.length,
    product_credits: PRODUCT_CREDITS,
    maximum_provider_completions: MAX_PROVIDER_COMPLETIONS,
    maximum_repairs_per_task: 1,
    provider_cost_ceiling_usd: COST_CEILING_USD,
    isolated_proxy_budget_usd: 0.99,
    temporary_proxy_infrastructure_cost_hard_capped: false,
    tasks: TASKS.map(({ task, prompt, alias, model, credits }) => ({ task, prompt, alias, model, credits })),
    forbidden: ["query_embedding", "transcription", "synthesis", "canon_commit", "archive", "restore", "hard_delete", "saga_delete", "action_confirmation"],
    cleanup: ["synthetic_rows", "provider_secrets", "gateway_jwt", "dispatch_schedules", "temporary_proxy", "temporary_files"]
  };
}

if (!process.argv.includes("--execute") && !validateLocal) {
  console.log(JSON.stringify(manifest(), null, 2));
  process.exit(0);
}

function fail(message) {
  throw new Error(message);
}

function numberValue(value) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  if (value && typeof value === "object" && Number.isFinite(Number(value.Int)) && Number.isFinite(Number(value.Exp))) {
    return Number(value.Int) * (10 ** Number(value.Exp));
  }
  return Number(value);
}

function assertExecutionGuard() {
  if (configuredAuthorization !== AUTHORIZATION) fail("Fresh Phase E hosted authorization is required.");
  if (configuredProjectRef !== PROJECT_REF) fail("The Phase E staging project lock did not match.");
  if (!fixtureRunId || !/^[0-9a-f-]{36}$/i.test(fixtureRunId)) fail("A valid Phase E fixture run ID is required.");
  if (!internalToken) fail("The protected staging internal token is unavailable.");
  if (TASKS.length !== MAX_LOGICAL_TASKS || TASKS.reduce((sum, task) => sum + task.credits, 0) !== PRODUCT_CREDITS) {
    fail("The Phase E task allowlist no longer matches its approved envelope.");
  }
  if (configuredCostCeiling !== COST_CEILING_USD) fail("The Phase E cost ceiling did not match authorization.");
  if (configuredProviderCompletions !== MAX_PROVIDER_COMPLETIONS) fail("The Phase E provider-completion ceiling did not match authorization.");
  if (!wrapperOwnsSchedules) fail("The protected Phase E wrapper must own staging schedule restoration.");
  const unique = new Set(TASKS.map((task) => `${task.task}@${task.prompt}@${task.alias}@${task.model}@${task.credits}`));
  if (unique.size !== MAX_LOGICAL_TASKS) fail("The Phase E task allowlist contains a duplicate contract.");
}

function runCli(args, safeStage) {
  const result = spawnSync(supabaseCli, args, {
    cwd: process.cwd(), encoding: "utf8", maxBuffer: 8 * 1024 * 1024, windowsHide: true
  });
  if (result.status !== 0) {
    const localFailure = (result.error?.message ?? result.stderr.trim() ?? "unknown local failure").slice(0, 1200).replaceAll("\n", " ").replaceAll("\r", " ");
    const localDetail = validateLocal
      ? ` (${localFailure})`
      : "";
    fail(`A ${validateLocal ? "local" : "linked staging"} operation failed safely during ${safeStage}${localDetail}.`);
  }
  return result.stdout.trim();
}

function runSql(sql, safeStage = "database_query") {
  const statements = sql.split(";").map((statement) => statement.trim())
    .filter((statement) => statement && !new Set(["begin", "commit"]).has(statement.toLowerCase()));
  let rows = [];
  for (let index = 0; index < statements.length; index += 1) {
    const raw = runCli([
      "db", "query", databaseTarget, statements[index], "--output", "json", "--agent", "no"
    ], `${safeStage}_${index + 1}`);
    let parsed;
    try {
      parsed = !raw || /^(DELETE|INSERT|UPDATE)\s+\d+(\s+\d+)?$/i.test(raw) ? [] : JSON.parse(raw);
    } catch {
      const detail = validateLocal ? ` (${raw.slice(0, 200).replaceAll("\n", " ")})` : "";
      fail(`The ${validateLocal ? "local" : "linked staging"} response was invalid during ${safeStage}${detail}.`);
    }
    rows = Array.isArray(parsed) ? parsed : parsed.rows ?? [];
  }
  return rows;
}

function oneRow(sql, safeStage) {
  const rows = runSql(sql, safeStage);
  if (rows.length !== 1) fail(`Unexpected row count during ${safeStage}.`);
  return rows[0];
}

async function invokeRunner(runId) {
  const response = await fetch(`https://${PROJECT_REF}.supabase.co/functions/v1/ai-task-runner`, {
    method: "POST",
    headers: { authorization: `Bearer ${internalToken}`, "content-type": "application/json" },
    body: JSON.stringify({ run_id: runId })
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.ok !== true) {
    const category = typeof body.error === "string" ? body.error.slice(0, 80) : "safe_failure";
    fail(`The Phase E task runner stopped safely (${response.status}/${category}).`);
  }
  return body;
}

function setupFixture() {
  runSql(`
begin;
delete from public.workspaces where id='${IDS.workspace}';
delete from auth.users where id='${IDS.gm}';
insert into auth.users (
  id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,
  raw_app_meta_data,raw_user_meta_data,is_super_admin,confirmation_token,email_change,email_change_token_new,recovery_token
) values (
  '${IDS.gm}','00000000-0000-0000-0000-000000000000','authenticated','authenticated',
  'phase-e-hosted-smoke@example.test',extensions.crypt('synthetic-not-a-login-secret',extensions.gen_salt('bf')),
  now(),now(),now(),'{"provider":"email","providers":["email"]}','{}',false,'','','',''
);
insert into public.gm_profiles(id,user_id,experience_level,improv_comfort,prep_style)
values('${IDS.profile}','${IDS.gm}','returning','mixed','light');
insert into public.workspaces(id,owner_gm_id,name) values('${IDS.workspace}','${IDS.gm}','Phase E Synthetic Hosted Smoke');
insert into public.worlds(id,workspace_id,owner_gm_id,name) values('${IDS.world}','${IDS.workspace}','${IDS.gm}','Synthetic Astrolabe World');
insert into public.world_eras(id,workspace_id,world_id,name) values('${IDS.era}','${IDS.workspace}','${IDS.world}','Synthetic Era');
insert into public.sagas(id,workspace_id,world_id,owner_gm_id,primary_era_id,name) values
  ('${IDS.saga}','${IDS.workspace}','${IDS.world}','${IDS.gm}','${IDS.era}','The Velvet Astrolabe'),
  ('${IDS.siblingSaga}','${IDS.workspace}','${IDS.world}','${IDS.gm}','${IDS.era}','Sibling Isolation Saga');
insert into public.sessions(id,workspace_id,world_id,saga_id,scope,name,status,planned_date,objective,opening_scene) values
  ('${IDS.session}','${IDS.workspace}','${IDS.world}','${IDS.saga}','saga','The Singing Gate','planned',current_date+7,
   'Learn why the eastern gate sings.','Keeper Sable waits beneath the velvet astrolabe.');
insert into public.characters(id,workspace_id,world_id,saga_id,scope,name,summary,narrative,canon_state) values
  ('${IDS.character}','${IDS.workspace}','${IDS.world}','${IDS.saga}','saga','Keeper Sable',
   'Keeper Sable guards the velvet astrolabe and the observatory seed.',
   'Keeper Sable protects the last seed beneath the drowned observatory and distrusts the Lantern Court.','canon'),
  ('${IDS.siblingCharacter}','${IDS.workspace}','${IDS.world}','${IDS.siblingSaga}','saga','Forbidden Sibling Sentinel',
   'A sibling-Saga isolation sentinel.','This text must never enter the current Saga provider context.','canon');
insert into public.sources(id,workspace_id,world_id,saga_id,scope,kind,source_entity_type,source_entity_id,raw_excerpt) values
  ('${IDS.source}','${IDS.workspace}','${IDS.world}','${IDS.saga}','saga','gm_instruction','character','${IDS.character}',
   'Keeper Sable protects the last seed beneath the drowned observatory and distrusts the Lantern Court.'),
  ('${IDS.siblingSource}','${IDS.workspace}','${IDS.world}','${IDS.siblingSaga}','saga','gm_instruction','character','${IDS.siblingCharacter}',
   'Forbidden sibling-Saga isolation sentinel.');
update internal.embedding_jobs set scheduled_at=now()+interval '1 day',debounce_until=now()+interval '1 day'
where workspace_id='${IDS.workspace}';
commit;`, "fixture_setup");
}

function sqlJson(value) {
  return JSON.stringify(value).replaceAll("'", "''");
}

function createRuns() {
  for (const spec of TASKS) {
    const sessionId = spec.session ? `'${IDS.session}'::uuid` : "null::uuid";
    const inserted = oneRow(`
insert into internal.ai_task_runs(
  id,workspace_id,world_id,saga_id,session_id,gm_id,task_name,prompt_version,quota_tier,
  ai_credits,model_tier,retrieval_profile,source_policy,output_mode,input_payload,allowed_source_ids
)
select '${spec.id}','${IDS.workspace}','${IDS.world}','${IDS.saga}',${sessionId},'${IDS.gm}',
  c.task_name,c.prompt_version,c.quota_tier,c.ai_credits,c.model_tier,c.retrieval_profile,c.source_policy,c.output_mode,
  '${sqlJson(spec.input)}'::jsonb,array['${IDS.source}'::uuid]
from internal.ai_task_contracts() c
where c.active and c.task_name='${spec.task}' and c.prompt_version='${spec.prompt}'
  and c.model_tier='${spec.alias}' and c.ai_credits=${spec.credits}
returning task_name,prompt_version,model_tier,ai_credits;`, `create_${spec.task}`);
    if (inserted.task_name !== spec.task || inserted.prompt_version !== spec.prompt
      || inserted.model_tier !== spec.alias || numberValue(inserted.ai_credits) !== spec.credits) {
      fail(`The active ${spec.task} registry contract did not match the approved allowlist.`);
    }
  }
}

function guardEvidence() {
  return oneRow(`select jsonb_build_object(
    'logical_runs',(select count(*) from internal.ai_task_runs where workspace_id='${IDS.workspace}'),
    'complete_runs',(select count(*) from internal.ai_task_runs where workspace_id='${IDS.workspace}' and status='complete'),
    'provider_completions',coalesce((select sum(attempts+repair_attempts) from internal.ai_task_runs where workspace_id='${IDS.workspace}'),0),
    'cost_usd',coalesce((select sum(provider_cost_estimate_usd) from internal.ai_task_runs where workspace_id='${IDS.workspace}'),0),
    'usage_events',(select count(*) from public.usage_events where workspace_id='${IDS.workspace}'),
    'query_embedding_events',(select count(*) from internal.provider_pipeline_events where workspace_id='${IDS.workspace}' and worker_type='hybrid_search'),
    'provider_call_started',(select count(*) from internal.provider_pipeline_events where workspace_id='${IDS.workspace}' and event_name='provider_call_started')
  ) evidence;`, "guard_evidence").evidence;
}

function enforceGuards(evidence, reserveCompletions = 0) {
  if (numberValue(evidence.logical_runs) !== MAX_LOGICAL_TASKS) fail("The Phase E logical-task count changed during execution.");
  if (numberValue(evidence.provider_completions) + reserveCompletions > MAX_PROVIDER_COMPLETIONS) fail("The Phase E provider-completion ceiling stopped execution.");
  if (numberValue(evidence.cost_usd) > COST_CEILING_USD) fail("The Phase E packet cost ceiling stopped execution.");
  if (numberValue(evidence.query_embedding_events) !== 0) fail("The Phase E zero-query-embedding contract was violated.");
}

function collectEvidence() {
  return oneRow(`select jsonb_build_object(
    'runs',(select jsonb_agg(jsonb_build_object(
      'task',task_name,'prompt',prompt_version,'status',status,'attempts',attempts,'repairs',repair_attempts,
      'credits',ai_credits,'alias',provider_alias,'model',resolved_model,'provider',resolved_provider,
      'cost_usd',provider_cost_estimate_usd,'checkpointed',provider_completed_at is not null,
      'usage_events',(select count(*) from public.usage_events u where u.id=r.usage_event_id),
      'allowed_sources',allowed_source_ids
    ) order by created_at) from internal.ai_task_runs r where workspace_id='${IDS.workspace}'),
    'outside_source_payload_matches',(select count(*) from internal.ai_task_runs where workspace_id='${IDS.workspace}' and output_payload::text like '%${IDS.siblingSource}%'),
    'canon_audit_rows',(select count(*) from public.canon_audit where workspace_id='${IDS.workspace}'),
    'draft_rows',(select count(*) from public.drafts where workspace_id='${IDS.workspace}'),
    'pending_entity_drafts',(select count(*) from public.drafts d where d.workspace_id='${IDS.workspace}' and d.state='pending'
      and d.entity_type='character' and d.created_by='gm_via_ai_approval'
      and exists(select 1 from public.draft_sources ds where ds.draft_id=d.id and ds.source_id='${IDS.source}')),
    'action_intents',(select count(*) from public.guide_action_intents where workspace_id='${IDS.workspace}'),
    'embedding_events',(select count(*) from internal.provider_pipeline_events where workspace_id='${IDS.workspace}' and worker_type='hybrid_search'),
    'unsafe_fixture_text_matches',(select count(*) from internal.provider_pipeline_events e where workspace_id='${IDS.workspace}' and lower(to_jsonb(e)::text) like '%velvet astrolabe%'),
    'raw_payload_key_matches',(select count(*) from internal.provider_pipeline_events e cross join lateral jsonb_object_keys(e.safe_metadata) key
      where e.workspace_id='${IDS.workspace}' and lower(key) in ('prompt','question','evidence','response','authorization','cookie','jwt','embedding','vector')),
    'guards','${sqlJson(guardEvidence())}'::jsonb
  ) evidence;`, "hosted_evidence").evidence;
}

function validateEvidence(evidence) {
  if (!Array.isArray(evidence.runs) || evidence.runs.length !== MAX_LOGICAL_TASKS) fail("The Phase E hosted run evidence was incomplete.");
  for (const spec of TASKS) {
    const run = evidence.runs.find((candidate) => candidate.task === spec.task);
    if (!run || run.prompt !== spec.prompt || run.status !== "complete" || run.alias !== spec.alias
      || run.model !== spec.model || numberValue(run.credits) !== spec.credits || !run.checkpointed
      || numberValue(run.usage_events) !== 1 || JSON.stringify(run.allowed_sources) !== JSON.stringify([IDS.source])
      || numberValue(run.repairs) > 1) {
      fail(`The hosted ${spec.task} evidence did not match its approved contract.`);
    }
  }
  if (numberValue(evidence.outside_source_payload_matches) !== 0 || numberValue(evidence.canon_audit_rows) !== 0
    || numberValue(evidence.draft_rows) !== 1 || numberValue(evidence.pending_entity_drafts) !== 1
    || numberValue(evidence.action_intents) !== 0
    || numberValue(evidence.embedding_events) !== 0 || numberValue(evidence.unsafe_fixture_text_matches) !== 0
    || numberValue(evidence.raw_payload_key_matches) !== 0) {
    fail("The Phase E isolation, zero-write, or safe-telemetry evidence failed.");
  }
  enforceGuards(evidence.guards);
  if (numberValue(evidence.guards.complete_runs) !== MAX_LOGICAL_TASKS
    || numberValue(evidence.guards.usage_events) !== MAX_LOGICAL_TASKS) {
    fail("The Phase E completion or metering evidence was incomplete.");
  }
}

function cleanupFixture() {
  try {
    runSql(`begin;
delete from internal.provider_pipeline_events where workspace_id='${IDS.workspace}';
delete from internal.guide_evidence_snapshots where workspace_id='${IDS.workspace}';
delete from public.workspaces where id='${IDS.workspace}';
delete from internal.ai_draft_batches where workspace_id='${IDS.workspace}';
delete from internal.ai_task_runs where workspace_id='${IDS.workspace}';
delete from internal.notification_queue where workspace_id='${IDS.workspace}';
delete from internal.dead_letter_jobs where job_id in (select id from internal.embedding_jobs where workspace_id='${IDS.workspace}');
delete from internal.embedding_jobs where workspace_id='${IDS.workspace}';
delete from internal.transcription_jobs where workspace_id='${IDS.workspace}';
delete from internal.cleanup_jobs where workspace_id='${IDS.workspace}';
delete from internal.export_jobs where workspace_id='${IDS.workspace}';
delete from internal.stale_pipeline_warning_jobs where workspace_id='${IDS.workspace}';
delete from internal.session_prep_action_receipts where workspace_id='${IDS.workspace}';
delete from internal.stage_write_receipts where workspace_id='${IDS.workspace}';
delete from auth.users where id='${IDS.gm}';
commit;`, "fixture_cleanup");
  } catch { /* The payload-free residue query is authoritative. */ }
  const residue = oneRow(`select jsonb_build_object(
    'workspace_rows',(select count(*) from public.workspaces where id='${IDS.workspace}'),
    'auth_rows',(select count(*) from auth.users where id='${IDS.gm}'),
    'ai_runs',(select count(*) from internal.ai_task_runs where workspace_id='${IDS.workspace}'),
    'usage_events',(select count(*) from public.usage_events where workspace_id='${IDS.workspace}'),
    'embedding_jobs',(select count(*) from internal.embedding_jobs where workspace_id='${IDS.workspace}'),
    'provider_events',(select count(*) from internal.provider_pipeline_events where workspace_id='${IDS.workspace}')
  ) cleanup;`, "cleanup_residue").cleanup;
  if (Object.values(residue).some((count) => numberValue(count) !== 0)) fail("Synthetic Phase E fixture cleanup left residue.");
  return residue;
}

if (validateLocal) {
  let localError;
  let localCleanupError;
  let localSchedulesPaused = false;
  let localCleanup;
  let localFixture;
  try {
    runSql(`select count(*) as schedules_updated from (
      select cron.alter_job(jobid,active=>false) from cron.job
      where jobname in ('relic-dispatch-ai-tasks','relic-dispatch-embeddings') and active
    ) changed;`, "local_pause_dispatch");
    localSchedulesPaused = true;
    setupFixture();
    createRuns();
    localFixture = oneRow(`select jsonb_build_object(
      'run_count',(select count(*) from internal.ai_task_runs where workspace_id='${IDS.workspace}'),
      'pending_count',(select count(*) from internal.ai_task_runs where workspace_id='${IDS.workspace}' and status='pending'),
      'credit_total',(select sum(ai_credits) from internal.ai_task_runs where workspace_id='${IDS.workspace}'),
      'answer_manifest_size',(select jsonb_array_length(input_payload->'action_manifest') from internal.ai_task_runs
        where workspace_id='${IDS.workspace}' and task_name='answer_saga_question'),
      'usage_events',(select count(*) from public.usage_events where workspace_id='${IDS.workspace}'),
      'provider_events',(select count(*) from internal.provider_pipeline_events where workspace_id='${IDS.workspace}')
    ) fixture;`, "local_fixture_validation").fixture;
    if (numberValue(localFixture.run_count) !== MAX_LOGICAL_TASKS || numberValue(localFixture.pending_count) !== MAX_LOGICAL_TASKS
      || numberValue(localFixture.credit_total) !== PRODUCT_CREDITS || numberValue(localFixture.answer_manifest_size) !== 19
      || numberValue(localFixture.usage_events) !== 0 || numberValue(localFixture.provider_events) !== 0) {
      fail("The local Phase E fixture did not match the current registry and action manifest.");
    }
  } catch (error) {
    localError = error;
  }
  try { localCleanup = cleanupFixture(); } catch (error) { localCleanupError = error; }
  if (localSchedulesPaused) {
    try {
      runSql(`select count(*) as schedules_updated from (
        select cron.alter_job(jobid,active=>true) from cron.job
        where jobname in ('relic-dispatch-ai-tasks','relic-dispatch-embeddings')
      ) changed;`, "local_restore_dispatch");
    } catch (error) { localCleanupError ??= error; }
  }
  if (localCleanupError && localError) fail(`${localError.message} Local cleanup or scheduler restoration also failed.`);
  if (localCleanupError) throw localCleanupError;
  if (localError) throw localError;
  if (Object.values(localCleanup).some((count) => numberValue(count) !== 0)) fail("The local Phase E cleanup proof failed.");
  console.log(JSON.stringify({
    result: "PHASE_E_HOSTED_LOCAL_FIXTURE_OK",
    environment: "local",
    provider_calls_made: 0,
    network_calls_made: 0,
    fixture: localFixture,
    cleanup: localCleanup
  }, null, 2));
  process.exit(0);
}

assertExecutionGuard();
let output;
let executionError;
try {
  runSql(`select count(*) as schedules_updated from (
    select cron.alter_job(jobid,active=>false) from cron.job
    where jobname in ('relic-dispatch-ai-tasks','relic-dispatch-embeddings') and active
  ) changed;`, "pause_generic_dispatch");
  const queues = oneRow(`select jsonb_build_object(
    'ai',(select count(*) from internal.ai_task_runs where status in ('pending','queued','retryable','running')),
    'embedding',(select count(*) from internal.embedding_jobs where state in ('queued','retryable','running'))
  ) state;`, "queue_preflight").state;
  if (numberValue(queues.ai) !== 0 || numberValue(queues.embedding) !== 0) fail("Staging queues are not idle; refusing Phase E fixture execution.");
  setupFixture();
  createRuns();
  for (const spec of TASKS) {
    enforceGuards(guardEvidence(), 2);
    await invokeRunner(spec.id);
    enforceGuards(guardEvidence());
  }
  const beforeReplay = guardEvidence();
  const replay = await invokeRunner(TASKS[3].id);
  const afterReplay = guardEvidence();
  if (!replay.replayed || numberValue(beforeReplay.provider_completions) !== numberValue(afterReplay.provider_completions)
    || numberValue(beforeReplay.provider_call_started) !== numberValue(afterReplay.provider_call_started)
    || numberValue(beforeReplay.usage_events) !== numberValue(afterReplay.usage_events)
    || numberValue(beforeReplay.cost_usd) !== numberValue(afterReplay.cost_usd)) {
    fail("Exact Phase E replay caused additional provider, usage, or cost work.");
  }
  const evidence = collectEvidence();
  validateEvidence(evidence);
  output = {
    result: "PHASE_E_HOSTED_TASK_FAMILY_SMOKE_OK",
    environment: "relic-staging", project_ref: PROJECT_REF,
    fixture_classification: "synthetic_non_sensitive",
    exact_replay_without_provider_work: true,
    secrets_printed: false, private_payloads_printed: false,
    configured_guards: manifest(), evidence
  };
} catch (error) {
  executionError = error;
}

let cleanupError;
let cleanup;
try { cleanup = cleanupFixture(); } catch (error) { cleanupError = error; }
if (cleanupError && executionError) fail(`${executionError.message} Cleanup or scheduler restoration also failed safely.`);
if (cleanupError) throw cleanupError;
if (executionError) throw executionError;
output.cleanup = cleanup;
console.log(JSON.stringify(output, null, 2));

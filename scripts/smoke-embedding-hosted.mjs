import { spawnSync } from "node:child_process";

const GM = "e3000000-0000-0000-0000-000000000001";
const WORKSPACE = "e3100000-0000-0000-0000-000000000001";
const WORLD = "e3200000-0000-0000-0000-000000000001";
const ERA = "e3300000-0000-0000-0000-000000000001";
const SAGA = "e3400000-0000-0000-0000-000000000001";
const CHARACTER = "e3500000-0000-0000-0000-000000000001";
const FIXTURE_NAME = "Glass Heron";
const FIXTURE_SUMMARY = "A cobalt messenger guards the salt observatory.";
const FIXTURE_NARRATIVE = "The blue courier protects a seaside tower used to chart the stars.";
const QUERY = "blue courier protecting the seaside star tower";

function fail(message) {
  throw new Error(message);
}

function findDatabaseContainer() {
  const result = spawnSync("docker", ["ps", "--format", "{{.Names}}"], { encoding: "utf8" });
  if (result.status !== 0) fail("Docker is unavailable; start the local Supabase stack.");
  const container = result.stdout.split(/\r?\n/).find((name) => name.startsWith("supabase_db_"));
  if (!container) fail("The local Supabase database container is not running.");
  return container;
}

function runSql(container, sql) {
  const result = spawnSync(
    "docker",
    ["exec", "-i", container, "psql", "-U", "postgres", "-d", "postgres", "-qAt"],
    { input: `\\set ON_ERROR_STOP on\n${sql}\n`, encoding: "utf8", maxBuffer: 4 * 1024 * 1024 },
  );
  if (result.status !== 0) fail((result.stderr || result.stdout || "database command failed").trim());
  return result.stdout.trim();
}

function requireConfiguration() {
  const required = ["INTERNAL_TOKEN", "LITELLM_PROXY_URL", "LITELLM_PROXY_KEY"];
  const missing = required.filter((key) => !process.env[key]?.trim());
  if (missing.length) fail(`Missing server-only configuration: ${missing.join(", ")}`);
  if ((process.env.EMBEDDING_PROVIDER_MODE ?? "live") !== "live") {
    fail("EMBEDDING_PROVIDER_MODE must be live for the hosted smoke.");
  }
  if ((process.env.EMBEDDING_MODEL_ALIAS ?? "relic-embed") !== "relic-embed") {
    fail("The hosted smoke is pinned to the relic-embed LiteLLM alias.");
  }
  if ((process.env.EMBEDDING_RESOLVED_MODEL ?? "text-embedding-3-small") !== "text-embedding-3-small") {
    fail("The hosted smoke is pinned to text-embedding-3-small.");
  }
  if (Number(process.env.EMBEDDING_DIMENSIONS ?? 1536) !== 1536) {
    fail("The hosted smoke requires the migrated 1536 dimensions.");
  }
}

async function invoke(functionsUrl, functionName, body) {
  const response = await fetch(`${functionsUrl.replace(/\/$/, "")}/${functionName}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.INTERNAL_TOKEN}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) fail(`${functionName} returned safe status ${response.status}.`);
  return result;
}

if (!process.argv.includes("--execute")) {
  console.log(JSON.stringify({
    ready: false,
    reason: "explicit_execute_flag_required",
    expected_external_calls: 2,
    fixture: { name: FIXTURE_NAME, query: QUERY },
  }, null, 2));
  process.exit(0);
}

requireConfiguration();
const databaseContainer = findDatabaseContainer();
const functionsUrl = process.env.EDGE_FUNCTIONS_URL ?? "http://127.0.0.1:54321/functions/v1";

const cleanupSql = `
delete from internal.embedding_jobs where workspace_id = '${WORKSPACE}';
delete from public.workspaces where id = '${WORKSPACE}';
delete from auth.users where id = '${GM}';
`;

let deferredJobs = [];

try {
  runSql(databaseContainer, cleanupSql);
  deferredJobs = JSON.parse(runSql(databaseContainer, `
select coalesce(
  json_agg(json_build_object(
    'id', id,
    'scheduled_at', scheduled_at,
    'debounce_until', debounce_until
  ) order by created_at),
  '[]'::json
)::text
from internal.embedding_jobs
where source_entity_id <> '${CHARACTER}'
  and state in ('queued', 'retryable');
  `));
  const jobId = runSql(databaseContainer, `
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, email_change, email_change_token_new, recovery_token)
values ('${GM}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'e1-hosted-smoke@example.test', extensions.crypt('not-a-login-secret', extensions.gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', '', '');
insert into public.gm_profiles (id, user_id, experience_level, improv_comfort, prep_style)
values ('e3010000-0000-0000-0000-000000000001', '${GM}', 'experienced', 'mixed', 'light');
insert into public.workspaces (id, owner_gm_id, name) values ('${WORKSPACE}', '${GM}', 'E1 Hosted Smoke Workspace');
insert into public.worlds (id, workspace_id, owner_gm_id, name) values ('${WORLD}', '${WORKSPACE}', '${GM}', 'E1 Hosted Smoke World');
insert into public.world_eras (id, workspace_id, world_id, name) values ('${ERA}', '${WORKSPACE}', '${WORLD}', 'E1 Hosted Smoke Era');
insert into public.sagas (id, workspace_id, world_id, owner_gm_id, primary_era_id, name)
values ('${SAGA}', '${WORKSPACE}', '${WORLD}', '${GM}', '${ERA}', 'E1 Hosted Smoke Saga');
insert into public.characters (id, workspace_id, world_id, saga_id, scope, name, summary, narrative, canon_state)
values ('${CHARACTER}', '${WORKSPACE}', '${WORLD}', '${SAGA}', 'saga', '${FIXTURE_NAME}', '${FIXTURE_SUMMARY}', '${FIXTURE_NARRATIVE}', 'canon');
update internal.embedding_jobs set scheduled_at = now() + interval '1 day', debounce_until = now() + interval '1 day'
where source_entity_id <> '${CHARACTER}' and state in ('queued', 'retryable');
update internal.embedding_jobs set scheduled_at = now(), debounce_until = now()
where source_entity_id = '${CHARACTER}' and state in ('queued', 'retryable');
select id from internal.embedding_jobs where source_entity_id = '${CHARACTER}' order by created_at desc limit 1;
  `);
  if (!jobId) fail("The fixture did not enqueue an embedding job.");

  const worker = await invoke(functionsUrl, "embed-row-dispatch", {});
  if (!worker.claimed || worker.job_id !== jobId) fail("The worker did not claim the prepared fixture job.");
  const completedState = runSql(databaseContainer, `
select state from internal.embedding_jobs where id = '${jobId}';
  `);
  if (completedState !== "complete") {
    fail(`The hosted embedding worker stopped safely in state: ${completedState || "missing"}.`);
  }

  const evidenceText = runSql(databaseContainer, `
select json_build_object(
  'job_state', j.state,
  'provider', e.provider,
  'model', e.model,
  'dimensions', e.dimensions,
  'is_current', e.is_current,
  'usage_events', count(ue.id),
  'request_identity_present', j.request_identity is not null,
  'provider_request_id_present', j.provider_request_id is not null
)::text
from internal.embedding_jobs j
join public.embeddings e on e.embedding_job_id = j.id
left join public.usage_events ue on ue.id = j.usage_event_id
where j.id = '${jobId}'
group by j.state, e.provider, e.model, e.dimensions, e.is_current, j.request_identity, j.provider_request_id;
  `);
  const evidence = JSON.parse(evidenceText);
  if (evidence.job_state !== "complete" || evidence.dimensions !== 1536 || !evidence.is_current || evidence.usage_events !== 1) {
    fail("Hosted embedding persistence or metering evidence was incomplete.");
  }

  const search = await invoke(functionsUrl, "hybrid-search", {
    gm_user_id: GM,
    workspace_id: WORKSPACE,
    world_id: WORLD,
    saga_id: SAGA,
    query_text: QUERY,
    top_k: 5,
    include_world_canon: true,
  });
  if (search.retrieval_mode !== "hybrid" || !search.results?.some((item) => item.source_entity_id === CHARACTER)) {
    fail("The hosted query did not return the scoped fixture through hybrid retrieval.");
  }

  console.log(JSON.stringify({
    result: "HOSTED_EMBEDDING_SMOKE_OK",
    expected_external_calls: 2,
    fixture_id: CHARACTER,
    retrieval_mode: search.retrieval_mode,
    result_count: search.results.length,
    evidence,
  }, null, 2));
} finally {
  runSql(databaseContainer, cleanupSql);
  if (deferredJobs.length > 0) {
    const savedJobsJson = JSON.stringify(deferredJobs).replaceAll("'", "''");
    runSql(databaseContainer, `
with saved as (
  select *
  from jsonb_to_recordset('${savedJobsJson}'::jsonb)
    as restored(id uuid, scheduled_at timestamptz, debounce_until timestamptz)
)
update internal.embedding_jobs jobs
set scheduled_at = saved.scheduled_at,
    debounce_until = saved.debounce_until
from saved
where jobs.id = saved.id
  and jobs.state in ('queued', 'retryable');
    `);
  }
}

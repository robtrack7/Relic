import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const PROJECT_REF = "scagegrrilvrpuilthzz";
const WORKSPACE_ID = "d3010000-0000-4000-8000-000000000001";
const WORLD_ID = "d3020000-0000-4000-8000-000000000001";
const SAGA_ID = "d3030000-0000-4000-8000-000000000001";
const SIBLING_SAGA_ID = "d3030000-0000-4000-8000-000000000002";
const MARKER = "relic_e3_staging_demo_v1";
const EMBEDDING_PROXY_HEALTH_URL = "https://relic-llm-dev.fly.dev/health/liveliness";
const MAX_EMBEDDING_ATTEMPTS = 8;
const MAX_EMBEDDING_COST_USD = 0.05;
const supabaseCli = process.platform === "win32" ? "supabase.exe" : "supabase";

const args = new Set(process.argv.slice(2));
const ownerArgument = process.argv.find((value) => value.startsWith("--owner-email="));
const ownerEmail = ownerArgument?.slice("--owner-email=".length).trim().toLowerCase() ?? "";
const actions = ["--install", "--status", "--remove", "--build-embeddings"].filter((action) => args.has(action));

function fail(message) {
  throw new Error(message);
}

function sqlLiteral(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

function assertSafety() {
  if (actions.length !== 1) fail("Choose exactly one demo action.");
  if (!ownerEmail || ownerEmail.length > 320 || !ownerEmail.includes("@")) {
    fail("A valid --owner-email value is required.");
  }
  const refPath = "supabase/.temp/project-ref";
  if (!existsSync(refPath) || readFileSync(refPath, "utf8").trim() !== PROJECT_REF) {
    fail("The linked Supabase project is not the locked E3 staging project.");
  }
  if (actions[0] === "--build-embeddings" && !args.has("--execute-provider")) {
    fail("Demo embedding creation requires the explicit --execute-provider switch.");
  }
}

function runCli(cliArgs, safeStage) {
  const result = spawnSync(supabaseCli, cliArgs, {
    cwd: process.cwd(),
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 8 * 1024 * 1024,
  });
  if (result.status !== 0) fail(`The staging demo operation failed safely during ${safeStage}.`);
  return result.stdout.trim();
}

function getFunctionVerifyJwt(functionName) {
  const raw = runCli([
    "functions", "list", "--project-ref", PROJECT_REF, "--output", "json",
  ], "inspect_embedding_gateway");
  try {
    const functions = JSON.parse(raw);
    const current = functions.find((entry) => entry.slug === functionName || entry.name === functionName);
    if (!current || typeof current.verify_jwt !== "boolean") {
      fail("The staging function gateway setting was unavailable.");
    }
    return current.verify_jwt;
  } catch (error) {
    if (error instanceof Error && error.message === "The staging function gateway setting was unavailable.") {
      throw error;
    }
    fail("The staging function gateway response was invalid.");
  }
}

function runSql(sql, safeStage) {
  const raw = runCli(["db", "query", "--linked", sql, "--output", "json", "--agent", "no"], safeStage);
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : parsed.rows ?? [];
  } catch {
    fail(`The staging database response was invalid during ${safeStage}.`);
  }
}

function oneRow(sql, safeStage) {
  const rows = runSql(sql, safeStage);
  if (rows.length !== 1) fail(`The staging demo returned an unexpected row count during ${safeStage}.`);
  return rows[0];
}

async function waitForEmbeddingProxyHealthy() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      const response = await fetch(EMBEDDING_PROXY_HEALTH_URL, {
        signal: AbortSignal.timeout(10_000),
      });
      if (response.ok) return;
    } catch {
      // A sleeping staging proxy may need more than the worker timeout to start.
    }
    await new Promise((resolve) => setTimeout(resolve, 3_000));
  }
  fail("The staging embedding proxy did not become healthy before the bounded build.");
}

function status() {
  return oneRow(`
select jsonb_build_object(
  'workspace_rows',(select count(*) from public.workspaces where id='${WORKSPACE_ID}'),
  'owner_matches',(select count(*) from public.workspaces w join auth.users u on u.id=w.owner_gm_id
    where w.id='${WORKSPACE_ID}' and lower(u.email)=${sqlLiteral(ownerEmail)}),
  'world_rows',(select count(*) from public.worlds where id='${WORLD_ID}'
    and source_import_defaults->>'fixture_marker'='${MARKER}'),
  'saga_rows',(select count(*) from public.sagas where id in ('${SAGA_ID}','${SIBLING_SAGA_ID}')),
  'entity_rows',(
    (select count(*) from public.characters where workspace_id='${WORKSPACE_ID}')
    +(select count(*) from public.places where workspace_id='${WORKSPACE_ID}')
    +(select count(*) from public.factions where workspace_id='${WORKSPACE_ID}')
    +(select count(*) from public.artifacts where workspace_id='${WORKSPACE_ID}')
    +(select count(*) from public.threads where workspace_id='${WORKSPACE_ID}')
    +(select count(*) from public.sessions where workspace_id='${WORKSPACE_ID}')
    +(select count(*) from public.notes where workspace_id='${WORKSPACE_ID}')
  ),
  'source_rows',(select count(*) from public.sources where workspace_id='${WORKSPACE_ID}'),
  'embedding_jobs',(select count(*) from internal.embedding_jobs where workspace_id='${WORKSPACE_ID}'),
  'ai_runs',(select count(*) from internal.ai_task_runs where workspace_id='${WORKSPACE_ID}'),
  'guide_evidence',(select count(*) from internal.guide_evidence_snapshots where workspace_id='${WORKSPACE_ID}'),
  'draft_batches',(select count(*) from internal.ai_draft_batches where workspace_id='${WORKSPACE_ID}'),
  'provider_events',(select count(*) from internal.provider_pipeline_events where workspace_id='${WORKSPACE_ID}'),
  'usage_events',(select count(*) from public.usage_events where workspace_id='${WORKSPACE_ID}'),
  'complete_embeddings',(select count(*) from public.embeddings where workspace_id='${WORKSPACE_ID}'
    and is_current and embedding is not null and stale_at is null),
  'provider_cost_usd',(select coalesce(sum(cost_estimate_usd),0) from public.usage_events
    where workspace_id='${WORKSPACE_ID}' and event_kind='embedding')
) status;
  `, "status").status;
}

function install() {
  runSql(`
begin;
do $$
declare owner_id uuid; existing_owner uuid;
begin
  select id into owner_id from auth.users where lower(email)=${sqlLiteral(ownerEmail)};
  if owner_id is null then
    raise exception 'demo_owner_not_found';
  end if;
  if (select count(*) from auth.users where lower(email)=${sqlLiteral(ownerEmail)}) <> 1 then
    raise exception 'demo_owner_not_unique';
  end if;
  select owner_gm_id into existing_owner from public.workspaces where id='${WORKSPACE_ID}';
  if existing_owner is not null and existing_owner <> owner_id then
    raise exception 'demo_workspace_collision';
  end if;
  if existing_owner is not null and not exists (
    select 1 from public.worlds
    where id='${WORLD_ID}' and workspace_id='${WORKSPACE_ID}'
      and source_import_defaults->>'fixture_marker'='${MARKER}'
  ) then
    raise exception 'demo_marker_missing';
  end if;

  insert into public.workspaces(id,owner_gm_id,name)
  values ('${WORKSPACE_ID}',owner_id,'Relic E3 Demo')
  on conflict(id) do nothing;
  insert into public.worlds(id,workspace_id,owner_gm_id,name,summary,default_game_system,source_import_defaults)
  values ('${WORLD_ID}','${WORKSPACE_ID}',owner_id,'The Shattered Coast',
    'A storm-broken coast whose oldest secrets sleep beneath the sea.','System-neutral',
    '{"fixture_marker":"${MARKER}","fixture_version":1}'::jsonb)
  on conflict(id) do nothing;
  insert into public.sagas(id,workspace_id,world_id,owner_gm_id,name,premise,game_system)
  values
    ('${SAGA_ID}','${WORKSPACE_ID}','${WORLD_ID}',owner_id,'The Amber Archive',
      'The party must learn why the Sunken Archive has begun to wake.','System-neutral'),
    ('${SIBLING_SAGA_ID}','${WORKSPACE_ID}','${WORLD_ID}',owner_id,'The Glass Meridian',
      'A sibling-Saga exclusion sentinel.','System-neutral')
  on conflict(id) do nothing;
end $$;

insert into public.characters(id,workspace_id,world_id,saga_id,scope,name,summary,narrative,canon_state,tags)
values
  ('d3040000-0000-4000-8000-000000000001','${WORKSPACE_ID}','${WORLD_ID}','${SAGA_ID}','saga',
    'Amber Warden','The Amber Warden guards the Sunken Archive.',
    'The Warden keeps watch at the flooded entrance beneath the eastern cliffs and admits only those carrying the Tideglass Key.',
    'canon',array['demo','warden']),
  ('d3040000-0000-4000-8000-000000000002','${WORKSPACE_ID}','${WORLD_ID}','${SIBLING_SAGA_ID}','saga',
    'Glass Cartographer','A sibling-Saga retrieval sentinel.',
    'This character belongs only to The Glass Meridian and must never ground answers in The Amber Archive.',
    'canon',array['demo','sibling-sentinel'])
on conflict(id) do nothing;

insert into public.places(id,workspace_id,world_id,saga_id,scope,name,summary,narrative,canon_state,tags)
values ('d3040000-0000-4000-8000-000000000003','${WORKSPACE_ID}','${WORLD_ID}',null,'world',
  'Sunken Archive','A flooded library beneath the eastern cliffs.',
  'The Amber Warden guards this World-level place. Its lower galleries fill and drain with the moon tide.',
  'canon',array['demo','archive'])
on conflict(id) do nothing;

insert into public.factions(id,workspace_id,world_id,saga_id,scope,name,summary,narrative,canon_state,motive,tags)
values ('d3040000-0000-4000-8000-000000000004','${WORKSPACE_ID}','${WORLD_ID}','${SAGA_ID}','saga',
  'Lantern Compact','Salvagers who chart safe paths through drowned ruins.',
  'The Compact wants access to the Archive but refuses to harm the Amber Warden.',
  'canon','Recover lost coastal histories.',array['demo','faction'])
on conflict(id) do nothing;

insert into public.artifacts(id,workspace_id,world_id,saga_id,scope,name,summary,narrative,canon_state,known_properties,tags)
values ('d3040000-0000-4000-8000-000000000005','${WORKSPACE_ID}','${WORLD_ID}','${SAGA_ID}','saga',
  'Tideglass Key','An amber-and-blue key carried by trusted Archive visitors.',
  'The key glows when the Archive entrance is safe to open.',
  'canon','Signals the safe phase of the moon tide.',array['demo','artifact'])
on conflict(id) do nothing;

insert into public.threads(id,workspace_id,world_id,saga_id,scope,name,summary,narrative,canon_state,objective,tags)
values ('d3040000-0000-4000-8000-000000000006','${WORKSPACE_ID}','${WORLD_ID}','${SAGA_ID}','saga',
  'The Waking Stacks','The sealed lower galleries have begun moving at night.',
  'Pages wash ashore bearing tomorrow''s dates.','canon',
  'Discover what woke beneath the Sunken Archive.',array['demo','thread'])
on conflict(id) do nothing;

insert into public.sessions(id,workspace_id,world_id,saga_id,scope,name,summary,narrative,status,objective,opening_scene)
values ('d3040000-0000-4000-8000-000000000007','${WORKSPACE_ID}','${WORLD_ID}','${SAGA_ID}','saga',
  'Session 1 — The Moon Tide','The party meets the Amber Warden at low tide.',
  'A first session for manual Stage and preparation testing.','planned',
  'Earn passage into the Sunken Archive.',
  'At moonrise, the drowned stair emerges and the Amber Warden raises a lantern.')
on conflict(id) do nothing;

insert into public.notes(id,workspace_id,world_id,saga_id,scope,note_type,title,body,canon_state)
values ('d3040000-0000-4000-8000-000000000008','${WORKSPACE_ID}','${WORLD_ID}','${SAGA_ID}','saga',
  'lore','Moon-Tide Protocol',
  'The Archive opens only at the lowest moon tide. The Amber Warden tests each Tideglass Key before allowing passage.',
  'canon')
on conflict(id) do nothing;

insert into public.sources(id,workspace_id,world_id,saga_id,scope,kind,source_entity_type,source_entity_id,note_id,session_id,raw_excerpt)
values
  ('d3060000-0000-4000-8000-000000000001','${WORKSPACE_ID}','${WORLD_ID}','${SAGA_ID}','saga','existing_entity','character','d3040000-0000-4000-8000-000000000001',null,null,'The Amber Warden guards the Sunken Archive and recognizes the Tideglass Key.'),
  ('d3060000-0000-4000-8000-000000000002','${WORKSPACE_ID}','${WORLD_ID}',null,'world','existing_entity','place','d3040000-0000-4000-8000-000000000003',null,null,'The Sunken Archive is a flooded World-level library beneath the eastern cliffs.'),
  ('d3060000-0000-4000-8000-000000000003','${WORKSPACE_ID}','${WORLD_ID}','${SAGA_ID}','saga','existing_entity','faction','d3040000-0000-4000-8000-000000000004',null,null,'The Lantern Compact seeks peaceful access to the Archive.'),
  ('d3060000-0000-4000-8000-000000000004','${WORKSPACE_ID}','${WORLD_ID}','${SAGA_ID}','saga','existing_entity','artifact','d3040000-0000-4000-8000-000000000005',null,null,'The Tideglass Key signals when the Archive is safe to open.'),
  ('d3060000-0000-4000-8000-000000000005','${WORKSPACE_ID}','${WORLD_ID}','${SAGA_ID}','saga','existing_entity','thread','d3040000-0000-4000-8000-000000000006',null,null,'The Waking Stacks began when pages dated tomorrow washed ashore.'),
  ('d3060000-0000-4000-8000-000000000006','${WORKSPACE_ID}','${WORLD_ID}','${SAGA_ID}','saga','existing_entity','session','d3040000-0000-4000-8000-000000000007',null,'d3040000-0000-4000-8000-000000000007','The party meets the Amber Warden at the drowned stair.'),
  ('d3060000-0000-4000-8000-000000000007','${WORKSPACE_ID}','${WORLD_ID}','${SAGA_ID}','saga','note',null,null,'d3040000-0000-4000-8000-000000000008',null,'The Archive opens only at the lowest moon tide.'),
  ('d3060000-0000-4000-8000-000000000008','${WORKSPACE_ID}','${WORLD_ID}','${SIBLING_SAGA_ID}','saga','existing_entity','character','d3040000-0000-4000-8000-000000000002',null,null,'Sibling-Saga exclusion sentinel.')
on conflict(id) do nothing;

insert into public.sources(
  id,workspace_id,world_id,saga_id,scope,kind,uploader_id,original_filename,mime_type,
  byte_size,ingestion_method,content_sha256,import_state,raw_excerpt,ready_at
)
select 'd3060000-0000-4000-8000-000000000009','${WORKSPACE_ID}','${WORLD_ID}','${SAGA_ID}',
  'saga','imported_text',w.owner_gm_id,'e3-demo-unapproved.txt','text/plain',38,'paste',
  repeat('d',64),'ready_for_review','Unapproved import exclusion sentinel.',now()
from public.workspaces w where w.id='${WORKSPACE_ID}'
on conflict(id) do nothing;

update internal.embedding_jobs
set scheduled_at=now()+interval '100 years',debounce_until=now()+interval '100 years'
where workspace_id='${WORKSPACE_ID}' and state in ('queued','retryable');
commit;
  `, "install");
  return status();
}

function remove() {
  runSql(`
begin;
do $$
declare owner_id uuid;
begin
  select id into owner_id from auth.users where lower(email)=${sqlLiteral(ownerEmail)};
  if exists(select 1 from public.workspaces where id='${WORKSPACE_ID}')
    and not exists(
      select 1 from public.workspaces w
      join public.worlds wo on wo.workspace_id=w.id and wo.id='${WORLD_ID}'
      where w.id='${WORKSPACE_ID}' and w.owner_gm_id=owner_id
        and wo.source_import_defaults->>'fixture_marker'='${MARKER}'
    ) then
    raise exception 'demo_remove_guard_failed';
  end if;
end $$;
delete from internal.provider_pipeline_events where workspace_id='${WORKSPACE_ID}';
delete from internal.guide_evidence_snapshots where workspace_id='${WORKSPACE_ID}';
delete from public.workspaces where id='${WORKSPACE_ID}';
delete from internal.ai_draft_batches where workspace_id='${WORKSPACE_ID}';
delete from internal.ai_task_runs where workspace_id='${WORKSPACE_ID}';
delete from internal.notification_queue where workspace_id='${WORKSPACE_ID}';
delete from internal.dead_letter_jobs where job_id in (
  select id from internal.embedding_jobs where workspace_id='${WORKSPACE_ID}'
);
delete from internal.embedding_jobs where workspace_id='${WORKSPACE_ID}';
delete from internal.transcription_jobs where workspace_id='${WORKSPACE_ID}';
delete from internal.cleanup_jobs where workspace_id='${WORKSPACE_ID}';
delete from internal.export_jobs where workspace_id='${WORKSPACE_ID}';
delete from internal.stale_pipeline_warning_jobs where workspace_id='${WORKSPACE_ID}';
delete from internal.session_prep_action_receipts where workspace_id='${WORKSPACE_ID}';
delete from internal.stage_write_receipts where workspace_id='${WORKSPACE_ID}';
commit;
  `, "remove");
  const result = status();
  if (Object.entries(result).some(([key, value]) =>
    !["provider_cost_usd"].includes(key) && Number(value) !== 0)) {
    fail("The staging demo removal left fixture residue.");
  }
  return result;
}

async function buildEmbeddings() {
  const internalToken = process.env.INTERNAL_TOKEN;
  if (!internalToken) fail("The protected INTERNAL_TOKEN is required for explicit demo embedding creation.");
  const priorGatewayVerifyJwt = getFunctionVerifyJwt("embed-row-dispatch");
  const before = oneRow(`
select jsonb_build_object(
  'non_demo_ready',(select count(*) from internal.embedding_jobs
    where workspace_id<>'${WORKSPACE_ID}' and state in ('queued','retryable')
      and scheduled_at<=now() and debounce_until<=now()),
  'demo_ready',(select count(*) from internal.embedding_jobs
    where workspace_id='${WORKSPACE_ID}' and state in ('queued','retryable')),
  'demo_recoverable',(select count(*) from internal.embedding_jobs
    where workspace_id='${WORKSPACE_ID}' and state in ('terminal','dead_letter')),
  'demo_total',(select count(*) from internal.embedding_jobs
    where workspace_id='${WORKSPACE_ID}'),
  'cost_usd',(select coalesce(sum(cost_estimate_usd),0) from public.usage_events
    where workspace_id='${WORKSPACE_ID}' and event_kind='embedding'),
  'schedule_active',(select coalesce(bool_or(active),false) from cron.job
    where jobname='relic-dispatch-embeddings')
) guard;
  `, "embedding_preflight").guard;
  if (Number(before.non_demo_ready) !== 0) fail("Another staging embedding job is ready; refusing demo-only dispatch.");
  const attemptCount = Number(before.demo_ready) + Number(before.demo_recoverable);
  if (attemptCount < 1 || attemptCount > MAX_EMBEDDING_ATTEMPTS
    || Number(before.demo_total) > MAX_EMBEDDING_ATTEMPTS) {
    fail("The demo embedding queue is empty or exceeds its attempt ceiling.");
  }
  if (Number(before.cost_usd) > MAX_EMBEDDING_COST_USD) fail("The demo embedding cost ceiling was already exceeded.");

  let executionError;
  let gatewayChanged = false;
  try {
    await waitForEmbeddingProxyHealthy();
    runSql(`
select cron.alter_job(jobid, active => false)
from cron.job where jobname='relic-dispatch-embeddings' and active;
select public.replay_embedding_job_for_worker(id)
from internal.embedding_jobs
where workspace_id='${WORKSPACE_ID}' and state in ('terminal','dead_letter');
update internal.embedding_jobs
set scheduled_at=now(),debounce_until=now()
where workspace_id='${WORKSPACE_ID}' and state in ('queued','retryable');
    `, "pause_embedding_schedule");
    gatewayChanged = true;
    runCli([
      "functions", "deploy", "embed-row-dispatch", "--project-ref", PROJECT_REF,
      "--use-api", "--no-verify-jwt",
    ], "temporary_embedding_gateway");

    for (let attempt = 0; attempt < attemptCount; attempt += 1) {
      const response = await fetch(`https://${PROJECT_REF}.supabase.co/functions/v1/embed-row-dispatch`, {
        method: "POST",
        headers: { authorization: `Bearer ${internalToken}`, "content-type": "application/json" },
        body: "{}",
        signal: AbortSignal.timeout(180_000),
      });
      if (!response.ok) fail("A bounded demo embedding attempt failed safely.");
      const guard = status();
      if (Number(guard.provider_cost_usd) > MAX_EMBEDDING_COST_USD) {
        fail("The demo embedding cost ceiling stopped further dispatch.");
      }
    }
  } catch (error) {
    executionError = error;
  } finally {
    let restorationError;
    if (gatewayChanged) {
      try {
        const restoreArgs = [
          "functions", "deploy", "embed-row-dispatch", "--project-ref", PROJECT_REF, "--use-api",
        ];
        if (!priorGatewayVerifyJwt) restoreArgs.push("--no-verify-jwt");
        runCli(restoreArgs, "restore_embedding_gateway");
      } catch (error) {
        restorationError = error;
      }
    }
    if (before.schedule_active) {
      try {
        runSql(`
select cron.alter_job(jobid, active => true)
from cron.job where jobname='relic-dispatch-embeddings';
        `, "restore_embedding_schedule");
      } catch (error) {
        restorationError ??= error;
      }
    }
    if (restorationError && executionError) {
      fail(`${executionError.message} Gateway or scheduler restoration also failed safely.`);
    }
    if (restorationError) throw restorationError;
  }
  if (executionError) throw executionError;

  const result = status();
  if (Number(result.complete_embeddings) < Number(before.demo_total)) {
    fail("The bounded demo embedding build did not complete every expected vector.");
  }
  return result;
}

assertSafety();
let result;
switch (actions[0]) {
  case "--install":
    result = install();
    break;
  case "--status":
    result = status();
    break;
  case "--remove":
    result = remove();
    break;
  case "--build-embeddings":
    result = await buildEmbeddings();
    break;
  default:
    fail("Unsupported demo action.");
}

console.log(JSON.stringify({
  result: "E3_STAGING_DEMO_OK",
  action: actions[0].slice(2),
  project_ref: PROJECT_REF,
  fixture_marker: MARKER,
  owner_email_supplied: true,
  embedding_attempt_ceiling: MAX_EMBEDDING_ATTEMPTS,
  embedding_cost_ceiling_usd: MAX_EMBEDDING_COST_USD,
  secrets_printed: false,
  payloads_printed: false,
  status: result,
}, null, 2));

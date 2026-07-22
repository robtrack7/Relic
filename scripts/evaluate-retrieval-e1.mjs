import { spawnSync } from "node:child_process";
import { performance } from "node:perf_hooks";

import { deterministicEmbedding } from "../supabase/functions/_shared/embedding-provider.ts";

const GM = "e2000000-0000-0000-0000-000000000001";
const WORKSPACE = "e2100000-0000-0000-0000-000000000001";
const WORLD = "e2200000-0000-0000-0000-000000000001";
const SAGA = "e2400000-0000-0000-0000-000000000001";
const SIBLING_SAGA = "e2400000-0000-0000-0000-000000000002";

const ids = {
  character: "e2510000-0000-0000-0000-000000000001",
  worldCharacter: "e2510000-0000-0000-0000-000000000002",
  siblingCharacter: "e2510000-0000-0000-0000-000000000003",
  archivedCharacter: "e2510000-0000-0000-0000-000000000004",
  staleCharacter: "e2510000-0000-0000-0000-000000000005",
  place: "e2520000-0000-0000-0000-000000000001",
  faction: "e2530000-0000-0000-0000-000000000001",
  artifact: "e2540000-0000-0000-0000-000000000001",
  thread: "e2550000-0000-0000-0000-000000000001",
  session: "e2560000-0000-0000-0000-000000000001",
  captureSession: "e2560000-0000-0000-0000-000000000002",
  lore: "e2570000-0000-0000-0000-000000000001",
  transcript: "e2600000-0000-0000-0000-000000000001",
  hiddenTranscript: "e2600000-0000-0000-0000-000000000002",
  siblingTranscript: "e2600000-0000-0000-0000-000000000003",
  otherTenantCharacter: "e2910000-0000-0000-0000-000000000001",
  pendingDraft: "e2700000-0000-0000-0000-000000000001",
  rawImport: "e2800000-0000-0000-0000-000000000001",
};

function findDatabaseContainer() {
  const result = spawnSync("docker", ["ps", "--format", "{{.Names}}"], { encoding: "utf8" });
  if (result.status !== 0) throw new Error("Docker is unavailable; start the local Supabase stack.");
  const container = result.stdout.split(/\r?\n/).find((name) => name.startsWith("supabase_db_"));
  if (!container) throw new Error("The local Supabase database container is not running.");
  return container;
}

const databaseContainer = findDatabaseContainer();

function runSql(sql, { timed = false } = {}) {
  const input = `${timed ? "\\timing on\n" : ""}\\set ON_ERROR_STOP on\n${sql}\n`;
  const result = spawnSync(
    "docker",
    ["exec", "-i", databaseContainer, "psql", "-U", "postgres", "-d", "postgres", "-qAt", "-F", "\t"],
    { input, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );
  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || "database command failed").trim());
  }
  const timingMatches = [...`${result.stdout}\n${result.stderr}`.matchAll(/Time:\s+([0-9.]+)\s+ms/gi)];
  const rows = result.stdout.split(/\r?\n/).filter((line) => line && !line.startsWith("Time:"));
  return { rows, latencyMs: timingMatches.length ? Number(timingMatches.at(-1)[1]) : null };
}

function sqlLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function percentile(values, fraction) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)];
}

const setupSql = `
delete from public.workspaces where id in ('${WORKSPACE}', 'e2100000-0000-0000-0000-000000000002');
delete from auth.users where id in ('${GM}', 'e2000000-0000-0000-0000-000000000002');
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, email_change, email_change_token_new, recovery_token)
values
  ('${GM}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'e1-eval-a@example.test', extensions.crypt('password', extensions.gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', '', ''),
  ('e2000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'e1-eval-b@example.test', extensions.crypt('password', extensions.gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', '', '');
insert into public.gm_profiles (id, user_id, experience_level, improv_comfort, prep_style) values
  ('e2010000-0000-0000-0000-000000000001', '${GM}', 'experienced', 'mixed', 'light'),
  ('e2010000-0000-0000-0000-000000000002', 'e2000000-0000-0000-0000-000000000002', 'experienced', 'mixed', 'light');
insert into public.workspaces (id, owner_gm_id, name) values
  ('${WORKSPACE}', '${GM}', 'E1 Evaluation Workspace'),
  ('e2100000-0000-0000-0000-000000000002', 'e2000000-0000-0000-0000-000000000002', 'E1 Unauthorized Workspace');
insert into public.worlds (id, workspace_id, owner_gm_id, name) values
  ('${WORLD}', '${WORKSPACE}', '${GM}', 'E1 Evaluation World'),
  ('e2200000-0000-0000-0000-000000000002', 'e2100000-0000-0000-0000-000000000002', 'e2000000-0000-0000-0000-000000000002', 'E1 Unauthorized World');
insert into public.world_eras (id, workspace_id, world_id, name) values
  ('e2300000-0000-0000-0000-000000000001', '${WORKSPACE}', '${WORLD}', 'E1 Evaluation Era'),
  ('e2300000-0000-0000-0000-000000000002', 'e2100000-0000-0000-0000-000000000002', 'e2200000-0000-0000-0000-000000000002', 'E1 Unauthorized Era');
insert into public.sagas (id, workspace_id, world_id, owner_gm_id, primary_era_id, name) values
  ('${SAGA}', '${WORKSPACE}', '${WORLD}', '${GM}', 'e2300000-0000-0000-0000-000000000001', 'E1 Current Saga'),
  ('${SIBLING_SAGA}', '${WORKSPACE}', '${WORLD}', '${GM}', 'e2300000-0000-0000-0000-000000000001', 'E1 Sibling Saga'),
  ('e2400000-0000-0000-0000-000000000003', 'e2100000-0000-0000-0000-000000000002', 'e2200000-0000-0000-0000-000000000002', 'e2000000-0000-0000-0000-000000000002', 'e2300000-0000-0000-0000-000000000002', 'E1 Unauthorized Saga');

insert into public.characters (id, workspace_id, world_id, saga_id, scope, name, summary, narrative, canon_state) values
  ('${ids.character}', '${WORKSPACE}', '${WORLD}', '${SAGA}', 'saga', 'Mara Voss, Ember Fox', 'A healer guarding the submerged gate', 'The physician protects an underwater door beneath the western cliff.', 'canon'),
  ('${ids.worldCharacter}', '${WORKSPACE}', '${WORLD}', null, 'world', 'Solenne the Dawn Oracle', 'A solar prophet shared by every Saga', 'The daylight seer interprets the sun wheel.', 'canon'),
  ('${ids.siblingCharacter}', '${WORKSPACE}', '${WORLD}', '${SIBLING_SAGA}', 'saga', 'Sibling Mara Voss', 'A healer guarding the submerged gate', 'A physician at an underwater door who must never cross Saga scope.', 'canon'),
  ('${ids.archivedCharacter}', '${WORKSPACE}', '${WORLD}', '${SAGA}', 'saga', 'Archived Ember Fox', 'A healer guarding the submerged gate', 'Archived retrieval distractor.', 'archived'),
  ('${ids.staleCharacter}', '${WORKSPACE}', '${WORLD}', '${SAGA}', 'saga', 'Moon Archivist', 'A nocturnal chart keeper', 'A moonlit cartographer whose embedding will be marked stale.', 'canon');
insert into public.characters (id, workspace_id, world_id, saga_id, scope, name, summary, narrative)
select md5('e1-character-' || i)::uuid, '${WORKSPACE}', '${WORLD}', '${SAGA}', 'saga',
  'E1 Generic Character ' || i, 'Lexically exact character fixture ' || i, 'Unrelated routine character material.'
from generate_series(1,5) i;

insert into public.places (id, workspace_id, world_id, saga_id, scope, name, summary, narrative) values
  ('${ids.place}', '${WORKSPACE}', '${WORLD}', '${SAGA}', 'saga', 'Tidevault Bastion', 'A fortress beneath the ocean', 'The maritime stronghold is a drowned citadel below the sea.');
insert into public.places (id, workspace_id, world_id, saga_id, scope, name, summary, narrative)
select md5('e1-place-' || i)::uuid, '${WORKSPACE}', '${WORLD}', '${SAGA}', 'saga', 'E1 Generic Place ' || i, 'Lexically exact place fixture ' || i, 'Unrelated routine place material.' from generate_series(1,5) i;
insert into public.factions (id, workspace_id, world_id, saga_id, scope, name, summary, narrative) values
  ('${ids.faction}', '${WORKSPACE}', '${WORLD}', '${SAGA}', 'saga', 'Ashen Covenant', 'A covert guild of night traders', 'The hidden organization controls nocturnal commerce.');
insert into public.factions (id, workspace_id, world_id, saga_id, scope, name, summary, narrative)
select md5('e1-faction-' || i)::uuid, '${WORKSPACE}', '${WORLD}', '${SAGA}', 'saga', 'E1 Generic Faction ' || i, 'Lexically exact faction fixture ' || i, 'Unrelated routine faction material.' from generate_series(1,5) i;
insert into public.artifacts (id, workspace_id, world_id, saga_id, scope, name, summary, narrative) values
  ('${ids.artifact}', '${WORKSPACE}', '${WORLD}', '${SAGA}', 'saga', 'Starfall Saber', 'An old blade forged from solar metal', 'The ancient sword shines with daylight fire.');
insert into public.artifacts (id, workspace_id, world_id, saga_id, scope, name, summary, narrative)
select md5('e1-artifact-' || i)::uuid, '${WORKSPACE}', '${WORLD}', '${SAGA}', 'saga', 'E1 Generic Artifact ' || i, 'Lexically exact artifact fixture ' || i, 'Unrelated routine item material.' from generate_series(1,5) i;
insert into public.threads (id, workspace_id, world_id, saga_id, scope, name, summary, narrative, objective) values
  ('${ids.thread}', '${WORKSPACE}', '${WORLD}', '${SAGA}', 'saga', 'The Silent Crown', 'A rebellion against the monarch', 'The uprising spreads through the capital.', 'End the ruler without open war.');
insert into public.threads (id, workspace_id, world_id, saga_id, scope, name, summary, narrative, objective)
select md5('e1-thread-' || i)::uuid, '${WORKSPACE}', '${WORLD}', '${SAGA}', 'saga', 'E1 Generic Thread ' || i, 'Lexically exact thread fixture ' || i, 'Unrelated routine thread material.', 'Resolve generic objective.' from generate_series(1,5) i;
insert into public.sessions (id, workspace_id, world_id, saga_id, scope, name, summary, narrative, objective, opening_scene, status, ended_at) values
  ('${ids.session}', '${WORKSPACE}', '${WORLD}', '${SAGA}', 'saga', 'The Moon Shrine', 'A specter visits the nocturnal sanctuary', 'A ghost speaks inside a dark temple.', 'Question the spirit.', 'Moonlight crosses the chapel floor.', 'ended', now()),
  ('${ids.captureSession}', '${WORKSPACE}', '${WORLD}', '${SAGA}', 'saga', 'Capture Session', 'Quick capture evidence session', 'A completed session.', 'Review captures.', 'The table settles.', 'ended', now());
insert into public.sessions (id, workspace_id, world_id, saga_id, scope, name, summary, narrative, objective, opening_scene, status)
select md5('e1-session-' || i)::uuid, '${WORKSPACE}', '${WORLD}', '${SAGA}', 'saga', 'E1 Generic Session ' || i, 'Lexically exact session fixture ' || i, 'Unrelated routine session material.', 'Generic objective.', 'Generic opening.', 'planned' from generate_series(1,4) i;

-- Exact-word distractors are intentionally poor semantic matches. They keep the
-- corpus from rewarding vector-only agreement or overfitting every query to rank 1.
update public.characters set name = 'Medical Guardian at the Drowned Entrance', summary = 'A stage-play catalog heading', narrative = 'This record describes a title card, not a healer or gate.'
where id = md5('e1-character-5')::uuid;
update public.places set name = 'Maritime Fortress Below the Ocean', summary = 'A shelf label in the archive', narrative = 'This phrase labels a book collection, not a location.'
where id = md5('e1-place-5')::uuid;
update public.threads set name = 'Uprising Intended to Remove the Monarch', summary = 'A copied legal phrase', narrative = 'This is a terminology note, not an active revolt.'
where id = md5('e1-thread-5')::uuid;

insert into public.notes (id, workspace_id, world_id, saga_id, scope, note_type, title, body, canon_state) values
  ('${ids.lore}', '${WORKSPACE}', '${WORLD}', '${SAGA}', 'saga', 'lore', 'The Ranger Atlas', 'A chart links the alpine woodland to a hidden shrine.', 'canon'),
  ('e2570000-0000-0000-0000-000000000002', '${WORKSPACE}', '${WORLD}', '${SAGA}', 'saga', 'lore', 'Archived Lore', 'A chart links the alpine woodland.', 'archived');
insert into public.notes (id, workspace_id, world_id, saga_id, scope, note_type, title, body)
select md5('e1-lore-' || i)::uuid, '${WORKSPACE}', '${WORLD}', '${SAGA}', 'saga', 'lore', 'E1 Generic Lore ' || i, 'Lexically exact lore fixture ' || i || '. Routine unrelated lore.' from generate_series(1,18) i;
insert into public.notes (id, workspace_id, world_id, saga_id, scope, note_type, title, body)
select md5('e1-capture-' || i)::uuid, '${WORKSPACE}', '${WORLD}', '${SAGA}', 'saga', 'quick_capture', 'E1 Capture ' || i, 'Lexically exact capture evidence ' || i || '. Routine table note.' from generate_series(1,50) i;
insert into public.sources (workspace_id, world_id, saga_id, scope, kind, note_id, session_id, raw_excerpt)
select '${WORKSPACE}', '${WORLD}', '${SAGA}', 'saga', 'note', n.id, '${ids.captureSession}', left(n.body,1000)
from public.notes n where n.workspace_id = '${WORKSPACE}' and n.note_type = 'quick_capture';

insert into public.sources (workspace_id, world_id, saga_id, scope, kind, source_entity_type, source_entity_id, raw_excerpt)
select '${WORKSPACE}', '${WORLD}', c.saga_id, c.scope, 'existing_entity', 'character', c.id, c.summary from public.characters c where c.id in ('${ids.character}','${ids.worldCharacter}','${ids.siblingCharacter}','${ids.staleCharacter}');
insert into public.sources (workspace_id, world_id, saga_id, scope, kind, source_entity_type, source_entity_id, raw_excerpt) values
  ('${WORKSPACE}', '${WORLD}', '${SAGA}', 'saga', 'existing_entity', 'place', '${ids.place}', 'Tidevault evidence'),
  ('${WORKSPACE}', '${WORLD}', '${SAGA}', 'saga', 'existing_entity', 'faction', '${ids.faction}', 'Covenant evidence'),
  ('${WORKSPACE}', '${WORLD}', '${SAGA}', 'saga', 'existing_entity', 'artifact', '${ids.artifact}', 'Starfall evidence'),
  ('${WORKSPACE}', '${WORLD}', '${SAGA}', 'saga', 'existing_entity', 'thread', '${ids.thread}', 'Crown evidence'),
  ('${WORKSPACE}', '${WORLD}', '${SAGA}', 'saga', 'existing_entity', 'session', '${ids.session}', 'Shrine evidence');
insert into public.sources (workspace_id, world_id, saga_id, scope, kind, note_id, raw_excerpt) values
  ('${WORKSPACE}', '${WORLD}', '${SAGA}', 'saga', 'note', '${ids.lore}', 'Atlas evidence');

insert into public.pipeline_runs (id, workspace_id, world_id, saga_id, session_id, state) values
  ('e2610000-0000-0000-0000-000000000001', '${WORKSPACE}', '${WORLD}', '${SAGA}', '${ids.session}', 'ready_for_review');
insert into public.transcripts (id, workspace_id, world_id, saga_id, session_id, whisper_model, duration_seconds, state, segments) values
  ('${ids.transcript}', '${WORKSPACE}', '${WORLD}', '${SAGA}', '${ids.session}', 'relic-transcribe', 40, 'pending', '[{"start":0,"end":40,"text":"A verdigris gate opens beneath the sea.","deleted":false}]');
update public.transcripts set state = 'complete', updated_at = clock_timestamp() where id = '${ids.transcript}';
insert into public.sessions (id, workspace_id, world_id, saga_id, scope, name, status, ended_at) values
  ('e2560000-0000-0000-0000-000000000007', '${WORKSPACE}', '${WORLD}', '${SAGA}', 'saga', 'Hidden Transcript Session', 'ended', now()),
  ('e2560000-0000-0000-0000-000000000008', '${WORKSPACE}', '${WORLD}', '${SIBLING_SAGA}', 'saga', 'Sibling Transcript Session', 'ended', now());
insert into public.transcripts (id, workspace_id, world_id, saga_id, session_id, whisper_model, duration_seconds, state, segments) values
  ('${ids.hiddenTranscript}', '${WORKSPACE}', '${WORLD}', '${SAGA}', 'e2560000-0000-0000-0000-000000000007', 'relic-transcribe', 20, 'pending', '[{"start":0,"end":20,"text":"Hidden venom formula.","deleted":true}]'),
  ('${ids.siblingTranscript}', '${WORKSPACE}', '${WORLD}', '${SIBLING_SAGA}', 'e2560000-0000-0000-0000-000000000008', 'relic-transcribe', 20, 'pending', '[{"start":0,"end":20,"text":"A verdigris gate opens beneath the sea.","deleted":false}]');
update public.transcripts set state = 'complete', updated_at = clock_timestamp() where id in ('${ids.hiddenTranscript}','${ids.siblingTranscript}');

insert into public.drafts (id, workspace_id, world_id, saga_id, scope, entity_type, state, change_kind, proposed_payload)
values ('${ids.pendingDraft}', '${WORKSPACE}', '${WORLD}', '${SAGA}', 'saga', 'character', 'pending', 'create', '{"name":"Pending Verdigris Gate"}');
insert into public.sources (id, workspace_id, world_id, saga_id, scope, kind, uploader_id, mime_type, byte_size, ingestion_method, content_sha256, import_state, ready_at, raw_excerpt)
values ('${ids.rawImport}', '${WORKSPACE}', '${WORLD}', '${SAGA}', 'saga', 'imported_text', '${GM}', 'text/plain', 24, 'paste', repeat('a',64), 'ready_for_review', now(), 'Raw verdigris gate import');
insert into public.characters (id, workspace_id, world_id, saga_id, scope, name, summary, narrative)
values ('${ids.otherTenantCharacter}', 'e2100000-0000-0000-0000-000000000002', 'e2200000-0000-0000-0000-000000000002', 'e2400000-0000-0000-0000-000000000003', 'saga', 'Unauthorized Mara', 'A healer guarding the submerged gate', 'Must never cross tenant scope.');

select internal.enqueue_embedding_job('${WORKSPACE}','${WORLD}','${SAGA}','note',null,'${ids.lore}',null,interval '0 seconds');
delete from internal.embedding_jobs
where workspace_id = '${WORKSPACE}'
  and source_entity_id not in (
    '${ids.character}','${ids.worldCharacter}','${ids.siblingCharacter}','${ids.staleCharacter}',
    '${ids.place}','${ids.faction}','${ids.artifact}','${ids.thread}','${ids.session}','${ids.lore}',
    '${ids.transcript}','${ids.siblingTranscript}'
  );
`;

const forbiddenIds = new Set([
  ids.siblingCharacter,
  ids.archivedCharacter,
  ids.hiddenTranscript,
  ids.siblingTranscript,
  ids.otherTenantCharacter,
  ids.pendingDraft,
  ids.rawImport,
]);

const queries = [
  ["medical guardian at the drowned entrance", ids.character, "semantic"],
  ["doctor protecting an underwater portal", ids.character, "semantic"],
  ["maritime fortress below the ocean", ids.place, "semantic"],
  ["nautical citadel under the sea", ids.place, "semantic"],
  ["covert organization of nocturnal merchants", ids.faction, "semantic"],
  ["hidden guild controlling dark commerce", ids.faction, "semantic"],
  ["old blade made from sun metal", ids.artifact, "semantic"],
  ["ancient sword burning with daylight", ids.artifact, "semantic"],
  ["uprising intended to remove the monarch", ids.thread, "semantic"],
  ["quiet revolt against the ruler", ids.thread, "semantic"],
  ["ghost inside a temple at night", ids.session, "semantic"],
  ["specter visiting a nocturnal sanctuary", ids.session, "semantic"],
  ["map between the mountain forest and shrine", ids.lore, "semantic"],
  ["cartography of the alpine woodland", ids.lore, "semantic"],
  ["shared prophet of dawn and sunlight", ids.worldCharacter, "world"],
  ["Mara Voss Ember Fox", ids.character, "hybrid"],
  ["Tidevault Bastion", ids.place, "hybrid"],
  ["Ashen Covenant", ids.faction, "hybrid"],
  ["Starfall Saber", ids.artifact, "hybrid"],
  ["The Silent Crown", ids.thread, "hybrid"],
  ["The Moon Shrine", ids.session, "hybrid"],
  ["The Ranger Atlas", ids.lore, "hybrid"],
  ["Solenne Dawn Oracle", ids.worldCharacter, "hybrid"],
  ["E1 Generic Character 1", null, "lexical"],
  ["E1 Generic Place 2", null, "lexical"],
  ["E1 Generic Faction 3", null, "lexical"],
  ["E1 Generic Lore 4", null, "lexical"],
  ["E1 Capture 7", null, "lexical"],
  ["verdigris doorway below the ocean", ids.transcript, "transcript"],
  ["green gate beneath the sea", ids.transcript, "transcript"],
];

function cleanup() {
  runSql(`delete from public.workspaces where id in ('${WORKSPACE}', 'e2100000-0000-0000-0000-000000000002'); delete from auth.users where id in ('${GM}', 'e2000000-0000-0000-0000-000000000002');`);
}

try {
  runSql(setupSql);

  const preparedRows = runSql(`
    select set_config('request.jwt.claim.sub', '${GM}', false);
    update internal.embedding_jobs set state = 'running', scheduled_at = now(), debounce_until = now()
    where workspace_id = '${WORKSPACE}' and state in ('queued','retryable');
    select j.id::text || E'\\t' || encode(convert_to(public.prepare_embedding_job(j.id)->>'input','UTF8'),'hex')
    from internal.embedding_jobs j
    where j.workspace_id = '${WORKSPACE}' and j.state = 'running'
    order by j.created_at, j.id;
  `).rows.filter((row) => row.includes("\t"));

  const completionStatements = [];
  const providerLatencies = [];
  for (const row of preparedRows) {
    const [jobId, inputHex] = row.split("\t");
    const input = Buffer.from(inputHex, "hex").toString("utf8");
    const startedAt = performance.now();
    const vector = deterministicEmbedding(input);
    providerLatencies.push(performance.now() - startedAt);
    completionStatements.push(`select public.complete_embedding_job_for_worker('${jobId}', '${JSON.stringify(vector)}'::jsonb, 'deterministic-development-test', 'text-embedding-3-small', 1536, '{}', null, false);`);
  }
  runSql(completionStatements.join("\n"));
  runSql(`update public.embeddings set stale_at = now() where source_entity_id = '${ids.staleCharacter}' and is_current;`);

  const databaseLatencies = [];
  const results = [];
  let isolationFailures = 0;
  for (const [query, expectedId, category] of queries) {
    const providerStartedAt = performance.now();
    const queryVector = deterministicEmbedding(query);
    providerLatencies.push(performance.now() - providerStartedAt);
    const sql = `
      select set_config('request.jwt.claim.sub', '${GM}', false);
      set role authenticated;
      select source_entity_id::text || E'\\t' || source_kind || E'\\t' || coalesce(lexical_rank::text,'') || E'\\t' || coalesce(semantic_rank::text,'')
      from public.search_for_ui_hybrid('${WORKSPACE}','${WORLD}','${SAGA}',${sqlLiteral(query)},${sqlLiteral(JSON.stringify(queryVector))},5,false,true);
    `;
    const queryResult = runSql(sql, { timed: true });
    if (queryResult.latencyMs !== null) databaseLatencies.push(queryResult.latencyMs);
    const ranked = queryResult.rows.filter((row) => row.includes("\t")).map((row) => row.split("\t")[0]);
    isolationFailures += ranked.filter((id) => forbiddenIds.has(id)).length;
    const rank = expectedId ? ranked.indexOf(expectedId) + 1 : (ranked.length > 0 ? 1 : 0);
    results.push({ query, category, expected_id: expectedId, rank: rank || null, returned: ranked });
  }

  const fallbackQueries = queries.filter(([, , category]) => category === "lexical");
  let fallbackSuccesses = 0;
  for (const [query] of fallbackQueries) {
    const fallback = runSql(`
      select set_config('request.jwt.claim.sub', '${GM}', false);
      set role authenticated;
      select source_entity_id::text from public.search_for_ui('${WORKSPACE}','${WORLD}','${SAGA}',${sqlLiteral(query)},'sanctum',5,false,true,true);
    `, { timed: true });
    if (fallback.latencyMs !== null) databaseLatencies.push(fallback.latencyMs);
    if (fallback.rows.some((row) => /^[0-9a-f-]{36}$/i.test(row))) fallbackSuccesses += 1;
  }

  const expectedResults = results.filter((result) => result.expected_id);
  const found = expectedResults.filter((result) => result.rank !== null);
  const reciprocalRanks = expectedResults.map((result) => result.rank ? 1 / result.rank : 0);
  const weakQueries = expectedResults.filter((result) => !result.rank || result.rank > 1).map((result) => ({ query: result.query, rank: result.rank }));
  const composition = runSql(`
    select jsonb_build_object(
      'entities', (select count(*) from (
        select id from public.characters where workspace_id='${WORKSPACE}' union all select id from public.places where workspace_id='${WORKSPACE}'
        union all select id from public.factions where workspace_id='${WORKSPACE}' union all select id from public.artifacts where workspace_id='${WORKSPACE}'
        union all select id from public.threads where workspace_id='${WORKSPACE}' union all select id from public.sessions where workspace_id='${WORKSPACE}'
      ) entity_rows),
      'lore_notes', (select count(*) from public.notes where workspace_id='${WORKSPACE}' and note_type='lore'),
      'quick_captures', (select count(*) from public.notes where workspace_id='${WORKSPACE}' and note_type='quick_capture'),
      'transcripts', (select count(*) from public.transcripts where workspace_id='${WORKSPACE}'),
      'queries', ${queries.length},
      'current_embeddings', (select count(*) from public.embeddings where workspace_id='${WORKSPACE}' and is_current and stale_at is null),
      'stale_embeddings', (select count(*) from public.embeddings where workspace_id='${WORKSPACE}' and stale_at is not null)
    )::text;
  `).rows.at(-1);

  const report = {
    corpus: JSON.parse(composition),
    ranking: { algorithm: "RRF", rrf_k: 60, lexical_candidates: 50, semantic_candidates: 50, top_k: 5 },
    quality: {
      recall_at_5: found.length / expectedResults.length,
      mean_reciprocal_rank: reciprocalRanks.reduce((sum, value) => sum + value, 0) / reciprocalRanks.length,
      relevant_rank_p50: percentile(found.map((result) => result.rank), 0.5),
      relevant_rank_p95: percentile(found.map((result) => result.rank), 0.95),
      isolation_failures: isolationFailures,
      lexical_fallback_success: fallbackSuccesses / fallbackQueries.length,
    },
    latency_ms: {
      deterministic_provider_p50: percentile(providerLatencies, 0.5),
      deterministic_provider_p95: percentile(providerLatencies, 0.95),
      database_p50: percentile(databaseLatencies, 0.5),
      database_p95: percentile(databaseLatencies, 0.95),
    },
    weak_queries: weakQueries,
    provisional_warning_thresholds: {
      recall_at_5: 0.8,
      mean_reciprocal_rank: 0.65,
      isolation_failures: 0,
      lexical_fallback_success: 1,
      deterministic_provider_p95_ms: 20,
      database_p95_ms: 150,
      enforcement: "approved provisional warning-only; revisit with E2 production telemetry",
    },
  };

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (isolationFailures > 0 || fallbackSuccesses !== fallbackQueries.length) process.exitCode = 1;
} finally {
  cleanup();
}

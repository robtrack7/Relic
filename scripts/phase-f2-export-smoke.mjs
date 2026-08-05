import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { buildSagaExport } from "../supabase/functions/_shared/export-builder.ts";

function localEnv() {
  const output = execFileSync("supabase", ["status", "-o", "env"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  return Object.fromEntries(output.split(/\r?\n/).map((line) => line.match(/^([^=]+)="?(.*?)"?$/)).filter(Boolean).map((match) => [match[1], match[2].replace(/"$/, "")]));
}

function headers(key, token = key, extra = {}) {
  return { apikey: key, authorization: `Bearer ${token}`, "content-type": "application/json", ...extra };
}

async function checked(url, options, label) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`${label} failed (${response.status})`);
  return response;
}

function storedZipFiles(bytes) {
  const files = new Map();
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 0;
  while (offset + 30 <= bytes.length && view.getUint32(offset, true) === 0x04034b50) {
    const size = view.getUint32(offset + 18, true);
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const nameStart = offset + 30;
    const bodyStart = nameStart + nameLength + extraLength;
    const name = new TextDecoder().decode(bytes.slice(nameStart, nameStart + nameLength));
    files.set(name, new TextDecoder().decode(bytes.slice(bodyStart, bodyStart + size)));
    offset = bodyStart + size;
  }
  assert.equal(view.getUint32(offset, true), 0x02014b50);
  return files;
}

const env = localEnv();
const api = env.API_URL;
const rest = env.REST_URL;
const serviceKey = env.SERVICE_ROLE_KEY;
const anonKey = env.ANON_KEY;
assert.ok(api && rest && serviceKey && anonKey, "local Supabase must be running");

const ids = Object.fromEntries(["workspace", "world", "saga", "siblingSaga", "character", "siblingCharacter", "thread", "turn"].map((key) => [key, crypto.randomUUID()]));
const email = `phase-f2-${crypto.randomUUID()}@example.test`;
const password = `F2-${crypto.randomUUID()}!`;
let userId;
let storagePath;

const serviceRpc = async (name, args) => {
  const response = await fetch(`${rest}/rpc/${name}`, { method: "POST", headers: headers(serviceKey), body: JSON.stringify(args) });
  if (!response.ok) return { data: null, error: { message: `rpc_${name}_${response.status}` } };
  return { data: await response.json(), error: null };
};
const service = {
  rpc: serviceRpc,
  storage: {
    from: (bucket) => ({
      upload: async (path, body, options) => {
        const response = await fetch(`${api}/storage/v1/object/${bucket}/${path}`, {
          method: "POST",
          headers: headers(serviceKey, serviceKey, { "content-type": String(options.contentType ?? "application/octet-stream"), "x-upsert": "true" }),
          body
        });
        return response.ok ? { error: null } : { error: { message: `storage_upload_${response.status}` } };
      }
    })
  }
};

async function insert(table, row) {
  await checked(`${rest}/${table}`, { method: "POST", headers: headers(serviceKey, serviceKey, { prefer: "return=minimal" }), body: JSON.stringify(row) }, `insert ${table}`);
}

try {
  const created = await checked(`${api}/auth/v1/admin/users`, { method: "POST", headers: headers(serviceKey), body: JSON.stringify({ email, password, email_confirm: true }) }, "create export smoke user");
  userId = (await created.json()).id;
  await insert("gm_profiles", { user_id: userId, experience_level: "experienced", improv_comfort: "mixed", prep_style: "light" });
  await insert("workspaces", { id: ids.workspace, owner_gm_id: userId, name: "F2 Smoke Workspace", usage_limits: { plan: "test", ai_credits_monthly: 100, transcription_seconds_monthly: 600, storage_bytes: 10000000, imports_monthly: 10, exports_monthly: 5 } });
  await insert("worlds", { id: ids.world, workspace_id: ids.workspace, owner_gm_id: userId, name: "F2 Smoke World" });
  await insert("sagas", [{ id: ids.saga, workspace_id: ids.workspace, world_id: ids.world, owner_gm_id: userId, name: "The Archive Road", game_system: "Cairn" }, { id: ids.siblingSaga, workspace_id: ids.workspace, world_id: ids.world, owner_gm_id: userId, name: "Forbidden Sibling Saga", game_system: "Cairn" }]);
  await insert("characters", [{ id: ids.character, workspace_id: ids.workspace, world_id: ids.world, saga_id: ids.saga, scope: "saga", name: "Mara Vale", summary: "Road scout", narrative: "Mara remembers every mile." }, { id: ids.siblingCharacter, workspace_id: ids.workspace, world_id: ids.world, saga_id: ids.siblingSaga, scope: "saga", name: "Forbidden Sibling Character", summary: "Must not export", narrative: "" }]);
  await insert("guide_threads", { id: ids.thread, workspace_id: ids.workspace, world_id: ids.world, saga_id: ids.saga, gm_id: userId, title: "Archive questions" });
  await insert("guide_turns", { id: ids.turn, workspace_id: ids.workspace, world_id: ids.world, saga_id: ids.saga, gm_id: userId, thread_id: ids.thread, ordinal: 1, idempotency_key: crypto.randomUUID(), question: "What does Mara remember?", question_hash: "a".repeat(64), status: "complete", retrieval_mode: "none", response_payload: { blocks: [{ type: "grounded_answer", text: "Mara remembers every mile." }] } });

  const login = await checked(`${api}/auth/v1/token?grant_type=password`, { method: "POST", headers: headers(anonKey), body: JSON.stringify({ email, password }) }, "sign in export smoke user");
  const accessToken = (await login.json()).access_token;
  const requested = await checked(`${rest}/rpc/request_saga_export`, { method: "POST", headers: headers(anonKey, accessToken), body: JSON.stringify({ p_workspace_id: ids.workspace, p_world_id: ids.world, p_saga_id: ids.saga, p_requested_formats: ["json", "markdown"], p_include_audit: true }) }, "request export");
  const requestResult = await requested.json();
  assert.equal(requestResult.allowed, true);
  const exportId = requestResult.export_id;
  const built = await buildSagaExport(service, { id: exportId, workspace_id: ids.workspace, world_id: ids.world, saga_id: ids.saga, requested_formats: ["json", "markdown"], include_audit: true });
  storagePath = built.storagePath;
  const completed = await serviceRpc("complete_export_job_for_worker", { p_export_id: exportId, p_storage_path: built.storagePath, p_archive_bytes: built.archiveBytes, p_archive_sha256: built.archiveSha256 });
  assert.equal(completed.error, null);

  const archiveResponse = await checked(`${api}/storage/v1/object/authenticated/exports/${storagePath}`, { headers: headers(serviceKey) }, "download real archive");
  const archive = new Uint8Array(await archiveResponse.arrayBuffer());
  assert.equal(archive.length, built.archiveBytes);
  const files = storedZipFiles(archive);
  assert.ok(files.has("saga.json") && files.has("saga.md") && files.has("characters/mara-vale.md") && files.has("README.txt"));
  const allText = [...files.values()].join("\n");
  assert.match(allText, /The Archive Road/);
  assert.match(allText, /What does Mara remember/);
  assert.doesNotMatch(allText, /Forbidden Sibling/);
  assert.doesNotMatch(files.get("saga.json"), /"(provider_payload|service_role|api_key|question_hash|embedding|embeddings|input_payload|output_payload)"\s*:/i);

  const targetResponse = await checked(`${rest}/rpc/get_saga_export_download`, { method: "POST", headers: headers(anonKey, accessToken), body: JSON.stringify({ p_workspace_id: ids.workspace, p_world_id: ids.world, p_saga_id: ids.saga, p_export_id: exportId }) }, "read scoped signing target");
  const target = await targetResponse.json();
  assert.equal(target.storage_path, storagePath);
  const signedResponse = await checked(`${api}/storage/v1/object/sign/exports/${storagePath}`, { method: "POST", headers: headers(anonKey, accessToken), body: JSON.stringify({ expiresIn: 3600 }) }, "sign private export");
  const signed = await signedResponse.json();
  assert.match(String(signed.signedURL ?? signed.signedUrl), /\/object\/sign\/exports\//);

  console.log(JSON.stringify({ passed: true, entries: files.size, archive_bytes: archive.length, signed_download: true, sibling_scope_denied: true, unsafe_keys_absent: true }));
} finally {
  if (storagePath) await fetch(`${api}/storage/v1/object/exports`, { method: "DELETE", headers: headers(serviceKey), body: JSON.stringify({ prefixes: [storagePath] }) }).catch(() => undefined);
  if (userId) await fetch(`${api}/auth/v1/admin/users/${userId}`, { method: "DELETE", headers: headers(serviceKey) }).catch(() => undefined);
}

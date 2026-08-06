import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const requireFromWeb = createRequire(new URL("../apps/web/package.json", import.meta.url));
const { createClient } = requireFromWeb("@supabase/supabase-js");
const supabaseCli = process.platform === "win32" ? "supabase.exe" : "supabase";
const stagingProjectRef = "scagegrrilvrpuilthzz";
const hosted = process.argv.includes("--hosted");
const fixtureDirectory = ".tmp/phase-g-fixtures";
const cases = [
  { file: "safe-atmosphere.jpg", mime: "image/jpeg", expectedState: "ready" },
  { file: "safe-atmosphere.png", mime: "image/png", expectedState: "ready" },
  { file: "safe-atmosphere.webp", mime: "image/webp", expectedState: "ready" },
  { file: "malformed-image.png", mime: "image/png", expectedState: "rejected", failureCode: "malformed_image" },
  { file: "oversized-dimensions.png", mime: "image/png", expectedState: "rejected", failureCode: "image_dimensions_exceeded" },
  { file: "safe-atmosphere.png", uploadName: "mime-mismatch.jpg", mime: "image/jpeg", expectedState: "rejected", failureCode: "mime_mismatch" },
];

function fail(message) { throw new Error(message); }

function localEnvironment() {
  const result = spawnSync(supabaseCli, ["status", "-o", "env"], { cwd: process.cwd(), encoding: "utf8", windowsHide: true });
  if (result.status !== 0) fail("Local Supabase is not running.");
  const values = Object.fromEntries(result.stdout.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^([A-Z_]+)="(.*)"$/);
    return match ? [[match[1], match[2]]] : [];
  }));
  if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(values.API_URL ?? "")) fail("The image smoke target is not local.");
  if (!values.ANON_KEY || !values.SERVICE_ROLE_KEY) fail("Local Supabase keys are unavailable.");
  return { url: values.API_URL, anonKey: values.ANON_KEY, serviceKey: values.SERVICE_ROLE_KEY };
}

function hostedEnvironment() {
  const result = spawnSync(supabaseCli, ["projects", "api-keys", "--project-ref", stagingProjectRef, "--output", "json"], {
    cwd: process.cwd(), encoding: "utf8", windowsHide: true,
  });
  if (result.status !== 0) fail("The locked Phase G staging API keys are unavailable.");
  const keys = JSON.parse(result.stdout);
  const anonKey = keys.find((key) => key.id === "anon")?.api_key;
  const serviceKey = keys.find((key) => key.id === "service_role")?.api_key;
  if (!anonKey || !serviceKey) fail("The locked Phase G staging keys are incomplete.");
  return { url: `https://${stagingProjectRef}.supabase.co`, anonKey, serviceKey };
}

if (cases.some(({ file }) => !existsSync(`${fixtureDirectory}/${file}`))) {
  fail("Run `pnpm phase-g:fixtures` before the private-image smoke test.");
}

const { url, anonKey, serviceKey } = hosted ? hostedEnvironment() : localEnvironment();
const service = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
const ids = { workspace: crypto.randomUUID(), world: crypto.randomUUID(), saga: crypto.randomUUID(), character: crypto.randomUUID() };
const suffix = crypto.randomUUID();
const email = `phase-g-image-${suffix}@example.invalid`;
const password = `Relic-${crypto.randomUUID()}-image`;
const storagePaths = [];
let userId;
let result;

try {
  const { data: created, error: createError } = await service.auth.admin.createUser({ email, password, email_confirm: true });
  if (createError || !created.user) fail("Could not create the image smoke user.");
  userId = created.user.id;
  for (const [table, row] of [
    ["workspaces", { id: ids.workspace, owner_gm_id: userId, name: "Phase G Image Smoke" }],
    ["worlds", { id: ids.world, workspace_id: ids.workspace, owner_gm_id: userId, name: "Bellweather" }],
    ["sagas", { id: ids.saga, workspace_id: ids.workspace, world_id: ids.world, owner_gm_id: userId, name: "The Sealed Observatory" }],
    ["characters", { id: ids.character, workspace_id: ids.workspace, world_id: ids.world, saga_id: ids.saga, scope: "saga", name: "Keeper Sable", summary: "Observatory keeper" }],
  ]) {
    const { error } = await service.from(table).insert(row);
    if (error) fail(`Could not seed ${table}: ${error.message}`);
  }
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) fail("Could not authenticate the image smoke user.");

  const outcomes = [];
  let readyAttachmentId;
  for (const testCase of cases) {
    const attachmentId = crypto.randomUUID();
    const attemptId = crypto.randomUUID();
    const bytes = readFileSync(`${fixtureDirectory}/${testCase.file}`);
    const uploadName = testCase.uploadName ?? testCase.file;
    const { data: registration, error: registrationError } = await client.rpc("begin_media_attachment", {
      p_workspace_id: ids.workspace, p_world_id: ids.world, p_saga_id: ids.saga,
      p_attachment_id: attachmentId, p_target_kind: "character", p_target_id: ids.character,
      p_original_filename: uploadName, p_declared_mime: testCase.mime, p_declared_byte_size: bytes.byteLength,
      p_title: "Stormglass", p_alt_text: "A bridge under green lightning", p_description: "Cold rain and a hidden path.",
    });
    if (registrationError || registration?.bucket !== "attachments" || !registration.storage_path) {
      fail(`Could not register ${uploadName}: ${registrationError?.message ?? "invalid upload target"}`);
    }
    const { data: writeAllowed, error: writeCheckError } = await client.rpc("attachment_object_write_allowed", { path: registration.storage_path });
    if (writeCheckError || writeAllowed !== true) fail(`The registered private upload path was not writable for ${uploadName}.`);
    storagePaths.push(registration.storage_path);
    const { error: uploadError } = await client.storage.from("attachments").upload(registration.storage_path, bytes, {
      contentType: testCase.mime, upsert: false,
    });
    if (uploadError) fail(`Could not upload ${uploadName}: ${uploadError.message}`);
    const { data: validated, error: validationError } = await client.functions.invoke("media-attachment", {
      body: { workspace_id: ids.workspace, world_id: ids.world, saga_id: ids.saga, attachment_id: attachmentId, attempt_id: attemptId, operation: "validate" },
    });
    const detail = validationError ? await validationError.context?.json?.().catch(() => null) : null;
    const { data: row, error: rowError } = await service.from("media_attachments")
      .select("state,failure_code,detected_mime,pixel_width,pixel_height,deleted_at").eq("id", attachmentId).single();
    if (rowError || row?.state !== testCase.expectedState) fail(`${uploadName} ended in an unexpected state.`);
    if (testCase.failureCode) {
      if (!validationError || detail?.error?.code !== testCase.failureCode || row.failure_code !== testCase.failureCode) {
        fail(`${uploadName} did not fail safely as ${testCase.failureCode}.`);
      }
    } else {
      if (validationError || validated?.state !== "ready" || row.pixel_width !== 640 || row.pixel_height !== 360) {
        fail(`${uploadName} did not validate with trusted dimensions.`);
      }
      readyAttachmentId ??= attachmentId;
    }
    outcomes.push({ file: uploadName, state: row.state, failure_code: row.failure_code ?? null });
  }

  const viewAttempt = crypto.randomUUID();
  const { data: viewed, error: viewError } = await client.functions.invoke("media-attachment", {
    body: { workspace_id: ids.workspace, world_id: ids.world, saga_id: ids.saga, attachment_id: readyAttachmentId, attempt_id: viewAttempt, operation: "view" },
  });
  if (viewError || typeof viewed?.signed_url !== "string" || viewed.expires_in !== 60) fail("Ready private image did not produce a short-lived view.");
  const { data: deleted, error: deleteError } = await client.functions.invoke("media-attachment", {
    body: { workspace_id: ids.workspace, world_id: ids.world, saga_id: ids.saga, attachment_id: readyAttachmentId, attempt_id: crypto.randomUUID(), operation: "delete" },
  });
  if (deleteError || deleted?.deleted !== true) fail("Private image deletion did not complete.");
  const { data: deletedRow } = await service.from("media_attachments").select("deleted_at").eq("id", readyAttachmentId).single();
  if (!deletedRow?.deleted_at) fail("Private image deletion was not persisted.");
  result = { ok: true, target: hosted ? "locked-staging" : "local", cases: outcomes, short_lived_view: true, delete_lifecycle: true };
} finally {
  try { if (storagePaths.length) await service.storage.from("attachments").remove(storagePaths); } catch {}
  try {
    const { data: deletion } = await client.rpc("delete_saga", {
      workspace_id: ids.workspace, world_id: ids.world, saga_id: ids.saga, confirmation_name: "The Sealed Observatory",
    });
    if (deletion?.cleanup_job_id) {
      await service.rpc("complete_cleanup_job_for_worker", { p_job_id: deletion.cleanup_job_id, p_deleted_paths: 0, p_skipped_paths: 0 });
    }
  } catch {}
  try { await service.from("workspaces").delete().eq("id", ids.workspace); } catch {}
  try { if (userId) await service.auth.admin.deleteUser(userId); } catch {}
}

console.log(JSON.stringify(result));

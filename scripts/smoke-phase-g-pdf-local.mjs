import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const requireFromWeb = createRequire(new URL("../apps/web/package.json", import.meta.url));
const { createClient } = requireFromWeb("@supabase/supabase-js");

const fixtureDirectory = ".tmp/phase-g-fixtures";
const cases = [
  { file: "valid-text.pdf", expectedState: "ready_for_review", marker: "Keeper Sable", pageCount: 2 },
  { file: "empty.pdf", expectedState: "rejected", failureCode: "no_extractable_text" },
  { file: "image-only.pdf", expectedState: "rejected", failureCode: "no_extractable_text" },
  { file: "encrypted.pdf", expectedState: "rejected", failureCode: "encrypted_pdf" },
  { file: "active-content.pdf", expectedState: "rejected", failureCode: "active_content_rejected" },
  { file: "embedded-file.pdf", expectedState: "rejected", failureCode: "embedded_file_rejected" },
  { file: "over-page-limit.pdf", expectedState: "rejected", failureCode: "page_limit_exceeded" },
  { file: "malformed-truncated.pdf", expectedState: "rejected", failureCode: "malformed_pdf" },
  { file: "png-disguised-as-pdf.pdf", expectedState: "rejected", failureCode: "mime_mismatch" },
  { file: "polyglot.pdf", expectedState: "rejected", failureCode: "malformed_pdf" },
];
const supabaseCli = process.platform === "win32" ? "supabase.exe" : "supabase";
const stagingProjectRef = "scagegrrilvrpuilthzz";
const hosted = process.argv.includes("--hosted");

function fail(message) {
  throw new Error(message);
}

function localEnvironment() {
  const result = spawnSync(supabaseCli, ["status", "-o", "env"], {
    cwd: process.cwd(),
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.status !== 0) fail("Local Supabase is not running.");
  const values = Object.fromEntries(result.stdout.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^([A-Z_]+)="(.*)"$/);
    return match ? [[match[1], match[2]]] : [];
  }));
  if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(values.API_URL ?? "")) {
    fail("The PDF smoke test is local-only.");
  }
  if (!values.ANON_KEY || !values.SERVICE_ROLE_KEY) fail("Local Supabase keys are unavailable.");
  return { url: values.API_URL, anonKey: values.ANON_KEY, serviceKey: values.SERVICE_ROLE_KEY };
}

function hostedEnvironment() {
  const result = spawnSync(supabaseCli, [
    "projects", "api-keys", "--project-ref", stagingProjectRef, "--output", "json",
  ], { cwd: process.cwd(), encoding: "utf8", windowsHide: true });
  if (result.status !== 0) fail("The locked Phase G staging API keys are unavailable.");
  const keys = JSON.parse(result.stdout);
  const anonKey = keys.find((key) => key.id === "anon")?.api_key;
  const serviceKey = keys.find((key) => key.id === "service_role")?.api_key;
  if (!anonKey || !serviceKey) fail("The locked Phase G staging keys are incomplete.");
  return {
    url: `https://${stagingProjectRef}.supabase.co`,
    anonKey,
    serviceKey,
  };
}

if (cases.some(({ file }) => !existsSync(`${fixtureDirectory}/${file}`))) {
  fail("Run `pnpm phase-g:fixtures` before the PDF smoke test.");
}

const { url, anonKey, serviceKey } = hosted ? hostedEnvironment() : localEnvironment();
const service = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
const suffix = crypto.randomUUID();
const ids = {
  workspace: crypto.randomUUID(),
  world: crypto.randomUUID(),
  saga: crypto.randomUUID(),
};
const email = `phase-g-pdf-${suffix}@example.invalid`;
const password = `Relic-${crypto.randomUUID()}-local`;
let userId;
const storagePaths = [];
let result;

try {
  const { data: created, error: createError } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError || !created.user) fail("Could not create the local PDF smoke user.");
  userId = created.user.id;

  const { error: seedError } = await service.from("workspaces").insert({
    id: ids.workspace,
    owner_gm_id: userId,
    name: "Phase G PDF Local Smoke",
  });
  if (seedError) fail(`Could not seed the local PDF workspace: ${seedError.message}`);
  const { error: worldError } = await service.from("worlds").insert({
    id: ids.world,
    workspace_id: ids.workspace,
    owner_gm_id: userId,
    name: "Bellweather",
  });
  if (worldError) fail(`Could not seed the local PDF world: ${worldError.message}`);
  const { error: sagaError } = await service.from("sagas").insert({
    id: ids.saga,
    workspace_id: ids.workspace,
    world_id: ids.world,
    owner_gm_id: userId,
    name: "The Sealed Observatory",
  });
  if (sagaError) fail(`Could not seed the local PDF Saga: ${sagaError.message}`);

  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) fail("Could not authenticate the local PDF smoke user.");
  const outcomes = [];
  for (const testCase of cases) {
    const sourceId = crypto.randomUUID();
    const attemptId = crypto.randomUUID();
    const bytes = readFileSync(`${fixtureDirectory}/${testCase.file}`);
    const { data: registration, error: registrationError } = await client.rpc("begin_pdf_import", {
      p_workspace_id: ids.workspace,
      p_world_id: ids.world,
      p_saga_id: ids.saga,
      p_source_id: sourceId,
      p_original_filename: testCase.file,
      p_mime_type: "application/pdf",
      p_byte_size: bytes.byteLength,
    });
    if (registrationError || registration?.bucket !== "attachments" || !registration.storage_path) {
      fail(`Could not register ${testCase.file}: ${registrationError?.message ?? "invalid upload target"}`);
    }
    storagePaths.push(registration.storage_path);
    const { error: uploadError } = await client.storage.from("attachments").upload(registration.storage_path, bytes, {
      contentType: "application/pdf",
      upsert: false,
    });
    if (uploadError) fail(`Could not upload ${testCase.file}: ${uploadError.message}`);

    const { data: extracted, error: extractionError } = await client.functions.invoke("extract-import-pdf", {
      body: {
        workspace_id: ids.workspace,
        world_id: ids.world,
        saga_id: ids.saga,
        source_id: sourceId,
        attempt_id: attemptId,
      },
    });
    let responseCode;
    if (extractionError) {
      const detail = await extractionError.context?.json?.().catch(() => null);
      responseCode = detail?.error?.code;
    }
    const { data: source, error: sourceError } = await service.from("sources")
      .select("import_state,failure_code,raw_excerpt,page_count,extracted_characters,extraction_version")
      .eq("id", sourceId)
      .single();
    if (sourceError || source?.import_state !== testCase.expectedState) {
      fail(`${testCase.file} ended in an unexpected state.`);
    }
    if (testCase.failureCode) {
      if (!extractionError || responseCode !== testCase.failureCode || source.failure_code !== testCase.failureCode) {
        fail(`${testCase.file} did not fail safely as ${testCase.failureCode}.`);
      }
    } else {
      if (extractionError || extracted?.state !== "ready_for_review") fail(`${testCase.file} did not extract successfully.`);
      if (source.page_count !== testCase.pageCount || !source.raw_excerpt?.includes(testCase.marker)) {
        fail(`${testCase.file} produced incorrect extracted content.`);
      }
    }
    outcomes.push({ file: testCase.file, state: source.import_state, failure_code: source.failure_code ?? null });
  }

  result = {
    ok: true,
    target: hosted ? "locked-staging" : "local",
    cases: outcomes,
  };
} finally {
  try {
    if (storagePaths.length) await service.storage.from("attachments").remove(storagePaths);
  } catch {
    // Best-effort cleanup must not mask the smoke result.
  }
  try {
    await service.from("workspaces").delete().eq("id", ids.workspace);
  } catch {
    // Best-effort cleanup must not mask the smoke result.
  }
  try {
    if (userId) await service.auth.admin.deleteUser(userId);
  } catch {
    // Best-effort cleanup must not mask the smoke result.
  }
}

console.log(JSON.stringify(result));

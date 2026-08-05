import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

const localEnvironment = new Map([
  ["NOTIFICATION_PROVIDER_MODE", "deterministic"],
  ["RELIC_ENV", "test"],
  ["APP_BASE_URL", "http://127.0.0.1:3001"]
]);
globalThis.Deno = { env: { get: (key) => localEnvironment.get(key) } };
const { dispatchNotification } = await import("../supabase/functions/_shared/notification-provider.ts");

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

const env = localEnv();
const api = env.API_URL;
const rest = env.REST_URL;
const serviceKey = env.SERVICE_ROLE_KEY;
const anonKey = env.ANON_KEY;
assert.ok(api && rest && serviceKey && anonKey, "local Supabase must be running");

const ids = { workspace: crypto.randomUUID() };
const email = `phase-f3-${crypto.randomUUID()}@example.test`;
const password = `F3-${crypto.randomUUID()}!`;
let userId;

const service = {
  rpc: async (name, args) => {
    const response = await fetch(`${rest}/rpc/${name}`, { method: "POST", headers: headers(serviceKey), body: JSON.stringify(args) });
    if (!response.ok) return { data: null, error: { message: `rpc_${name}_${response.status}` } };
    return { data: await response.json(), error: null };
  }
};

async function insert(table, row) {
  await checked(`${rest}/${table}`, { method: "POST", headers: headers(serviceKey, serviceKey, { prefer: "return=minimal" }), body: JSON.stringify(row) }, `insert ${table}`);
}

try {
  const created = await checked(`${api}/auth/v1/admin/users`, { method: "POST", headers: headers(serviceKey), body: JSON.stringify({ email, password, email_confirm: true }) }, "create notification smoke user");
  userId = (await created.json()).id;
  await insert("gm_profiles", { user_id: userId, experience_level: "experienced" });
  await insert("workspaces", { id: ids.workspace, owner_gm_id: userId, name: "F3 Smoke Workspace", usage_limits: { ai_credits_monthly: 100, transcription_seconds_monthly: 600, storage_bytes: 10000000, imports_monthly: 10, exports_monthly: 5 } });
  const periodStart = new Date().toISOString().slice(0, 7) + "-01";
  const nextMonth = new Date(`${periodStart}T00:00:00Z`);
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
  nextMonth.setUTCDate(0);
  await insert("usage_monthly_rollups", { workspace_id: ids.workspace, period_start: periodStart, period_end: nextMonth.toISOString().slice(0, 10), ai_credits_used: 90 });

  const firstClaim = await service.rpc("claim_notification_job_for_worker", { worker_id: "phase-f3-smoke" });
  assert.equal(firstClaim.error, null);
  assert.equal(firstClaim.data.kind, "quota_warn_90");
  const sent = await dispatchNotification(service, firstClaim.data.id);
  assert.deepEqual(sent, { outcome: "sent", provider: "deterministic" });

  await checked(`${rest}/gm_profiles?user_id=eq.${userId}`, { method: "PATCH", headers: headers(serviceKey, serviceKey, { prefer: "return=minimal" }), body: JSON.stringify({ notification_preferences: { paused: true, email: { quota_blocked: true } } }) }, "pause notifications");
  await checked(`${rest}/usage_monthly_rollups?workspace_id=eq.${ids.workspace}&period_start=eq.${periodStart}`, { method: "PATCH", headers: headers(serviceKey, serviceKey, { prefer: "return=minimal" }), body: JSON.stringify({ ai_credits_used: 100 }) }, "cross quota limit");
  const secondClaim = await service.rpc("claim_notification_job_for_worker", { worker_id: "phase-f3-smoke" });
  assert.equal(secondClaim.data.kind, "quota_blocked");
  const skipped = await dispatchNotification(service, secondClaim.data.id);
  assert.deepEqual(skipped, { outcome: "skipped", reasonCode: "preferences_paused" });

  const login = await checked(`${api}/auth/v1/token?grant_type=password`, { method: "POST", headers: headers(anonKey), body: JSON.stringify({ email, password }) }, "sign in notification smoke user");
  const accessToken = (await login.json()).access_token;
  const summaryResponse = await checked(`${rest}/rpc/get_notification_delivery_summary`, { method: "POST", headers: headers(anonKey, accessToken), body: JSON.stringify({ p_workspace_id: ids.workspace, p_saga_id: null }) }, "read delivery summary");
  const summary = await summaryResponse.json();
  assert.equal(summary.length, 2);
  assert.ok(summary.some((item) => item.kind === "quota_warn_90" && item.state === "sent" && item.deep_link === `/app/w/${ids.workspace}/settings?from=notification#usage`));
  assert.ok(summary.some((item) => item.kind === "quota_blocked" && item.state === "skipped" && item.reason_code === "preferences_paused"));
  assert.equal(JSON.stringify(summary).includes("payload"), false);

  console.log(JSON.stringify({ passed: true, deterministic_delivery: true, preference_recheck: true, content_safe_summary: true, exact_jobs: summary.length }));
} finally {
  if (userId) await fetch(`${api}/auth/v1/admin/users/${userId}`, { method: "DELETE", headers: headers(serviceKey) }).catch(() => undefined);
}

import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.API_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SERVICE_ROLE_KEY;

test.skip(process.env.RELIC_E2E_AUTH !== "1" || !supabaseUrl || !serviceRoleKey, "Requires local Supabase auth and service-role fixture setup.");

test("Session Review preserves and saves manual evidence without creating canon", async ({ page }) => {
  test.setTimeout(90_000);
  const admin = createClient(supabaseUrl!, serviceRoleKey!, { auth: { persistSession: false, autoRefreshToken: false } });
  const runId = Date.now();
  const sagaName = `C1 Manual Evidence ${runId}`;
  const email = `c1-${runId}@example.test`;

  await page.goto("/auth/sign-up");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: "Create account" }).click();
  const signInHeading = page.getByRole("heading", { name: "Sign in" });
  const newSagaHeading = page.getByRole("heading", { name: "Create a playable start" });
  await Promise.race([
    signInHeading.waitFor({ state: "visible", timeout: 5_000 }).catch(() => undefined),
    newSagaHeading.waitFor({ state: "visible", timeout: 5_000 }).catch(() => undefined),
  ]);
  if (await signInHeading.isVisible().catch(() => false)) {
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/app(?:\/|$)/, { timeout: 10_000 });
  }

  await page.goto("/app/new-saga");
  await page.getByLabel("Saga name").fill(sagaName);
  await page.getByLabel("Game system").fill("System test");
  await page.getByLabel("New World name").fill(`${sagaName} World`);
  await page.getByRole("button", { name: "Create blank saga" }).click();
  await expect(page.getByRole("heading", { name: sagaName })).toBeVisible();
  const sagaRoot = page.url();
  const sagaId = /\/saga\/([^/?]+)/.exec(sagaRoot)?.[1];
  expect(sagaId).toBeTruthy();

  const plan = page.getByRole("button", { name: "Plan Session 1" });
  if (await plan.isVisible().catch(() => false)) {
    await page.getByPlaceholder("What should the first session accomplish?").fill("Capture manual evidence safely.");
    await plan.click();
  } else {
    await page.getByRole("link", { name: "Continue prep" }).first().click();
  }
  await expect(page).toHaveURL(/\/sessions\/[^/]+\/prep/);
  const sessionId = /\/sessions\/([^/]+)\/prep/.exec(page.url())?.[1];
  expect(sessionId).toBeTruthy();

  const { error: endError } = await admin.from("sessions").update({ status: "ended", ended_at: new Date().toISOString() }).eq("id", sessionId!);
  expect(endError).toBeNull();

  async function scopedCount(table: "notes" | "drafts" | "canon_audit") {
    const result = await admin.from(table).select("id", { count: "exact", head: true }).eq("saga_id", sagaId!);
    expect(result.error).toBeNull();
    return result.count ?? 0;
  }
  const before = { notes: await scopedCount("notes"), drafts: await scopedCount("drafts"), audits: await scopedCount("canon_audit") };

  await page.goto(`${sagaRoot}/sessions/${sessionId}/review`);
  const pasted = page.getByRole("textbox", { name: "Pasted session notes" });
  await pasted.fill("The bridge collapsed after Mara crossed.");
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Pasted session notes" })).toHaveValue("The bridge collapsed after Mara crossed.");
  await page.getByRole("button", { name: "Save pasted notes" }).click();
  await expect(page.getByText("Pasted notes saved as Session evidence. Synthesis has not started.")).toBeVisible();
  await expect(page.getByText("The bridge collapsed after Mara crossed.")).toBeVisible();

  await page.getByRole("textbox", { name: "GM manual summary" }).fill("Mara chose the town over the relic.");
  await page.getByRole("button", { name: "Save manual summary" }).click();
  await expect(page.getByText("Manual summary saved as Session evidence. Synthesis has not started.")).toBeVisible();
  await expect(page.getByText("Mara chose the town over the relic.")).toBeVisible();

  await page.reload();
  await expect(page.getByRole("textbox", { name: "Pasted session notes" })).toHaveValue("");
  await expect(page.getByRole("textbox", { name: "GM manual summary" })).toHaveValue("");
  await expect(page.getByText("The bridge collapsed after Mara crossed.")).toBeVisible();
  await expect(page.getByText("Mara chose the town over the relic.")).toBeVisible();

  const sources = await admin.from("sources").select("id,kind,raw_excerpt,session_id").eq("session_id", sessionId!).in("kind", ["pasted_text", "gm_manual_summary"]);
  expect(sources.error).toBeNull();
  expect(sources.data).toHaveLength(2);
  expect(new Set(sources.data?.map((source) => source.kind))).toEqual(new Set(["pasted_text", "gm_manual_summary"]));

  const pipeline = await admin.from("pipeline_runs").select("state,inputs_summary").eq("session_id", sessionId!).order("created_at", { ascending: false }).limit(1).single();
  expect(pipeline.error).toBeNull();
  expect(pipeline.data?.state).toBe("queued");
  expect(pipeline.data?.inputs_summary).toMatchObject({ manual_evidence_count: 2, pasted_text_count: 1, gm_manual_summary_count: 1, gm_summary_present: true });

  expect({ notes: await scopedCount("notes"), drafts: await scopedCount("drafts"), audits: await scopedCount("canon_audit") }).toEqual(before);
});

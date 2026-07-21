import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.API_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SERVICE_ROLE_KEY;

test.skip(process.env.RELIC_E2E_AUTH !== "1" || !supabaseUrl || !serviceRoleKey, "Requires local Supabase auth and service-role fixture setup.");

test("C3 draft citations open scoped transcript and manual source context from both review surfaces", async ({ page }) => {
  test.setTimeout(120_000);
  const admin = createClient(supabaseUrl!, serviceRoleKey!, { auth: { persistSession: false, autoRefreshToken: false } });
  const runId = Date.now();
  const sagaName = `C4 Citation Context ${runId}`;
  const email = `c4-${runId}@example.test`;

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
  const sagaRoot = page.url().replace(/\/$/, "");
  const ids = /\/app\/w\/([^/]+)\/world\/([^/]+)\/saga\/([^/?]+)/.exec(sagaRoot);
  expect(ids).toBeTruthy();
  const [, workspaceId, worldId, sagaId] = ids!;

  await page.getByPlaceholder("What should the first session accomplish?").fill("Inspect every synthesis citation.");
  await page.getByRole("button", { name: "Plan Session 1" }).click();
  await expect(page).toHaveURL(/\/sessions\/[^/]+\/prep/);
  const sessionId = /\/sessions\/([^/]+)\/prep/.exec(page.url())?.[1];
  expect(sessionId).toBeTruthy();

  const transcriptId = crypto.randomUUID();
  const transcriptSourceId = crypto.randomUUID();
  const manualSourceId = crypto.randomUUID();
  const draftId = crypto.randomUUID();
  const endedAt = new Date().toISOString();

  expect((await admin.from("sessions").update({ status: "ended", ended_at: endedAt }).eq("id", sessionId!)).error).toBeNull();
  expect((await admin.from("transcripts").insert({
    id: transcriptId,
    workspace_id: workspaceId,
    world_id: worldId,
    saga_id: sagaId,
    session_id: sessionId,
    whisper_model: "deterministic-c4",
    state: "complete",
    language: "en",
    duration_seconds: 18,
    segments: [{ start: 0, end: 18, text: "The old gate opened." }],
  })).error).toBeNull();
  expect((await admin.from("sources").insert([
    {
      id: transcriptSourceId,
      workspace_id: workspaceId,
      world_id: worldId,
      saga_id: sagaId,
      scope: "saga",
      kind: "transcript_segment",
      transcript_id: transcriptId,
      session_id: sessionId,
      start_seconds: 0,
      end_seconds: 18,
      raw_excerpt: "The old gate opened.",
    },
    {
      id: manualSourceId,
      workspace_id: workspaceId,
      world_id: worldId,
      saga_id: sagaId,
      scope: "saga",
      kind: "gm_manual_summary",
      session_id: sessionId,
      raw_excerpt: "The gate opened after Mara returned.",
    },
  ])).error).toBeNull();
  expect((await admin.from("drafts").insert({
    id: draftId,
    workspace_id: workspaceId,
    world_id: worldId,
    saga_id: sagaId,
    scope: "saga",
    entity_type: "note",
    state: "pending",
    change_kind: "create",
    proposed_payload: { title: "Session 1 Summary", body: "The old gate opened." },
    confidence_band: "high",
    confidence_reason: "multiple_strong_sources",
    created_by: "gm_via_ai_approval",
    session_id: sessionId,
    ai_task_name: "synthesize_session",
    ai_prompt_version: "c3-output-writer-v1",
    ai_model: "deterministic-synthesis-fixture",
    ai_provider: "deterministic-test",
  })).error).toBeNull();
  expect((await admin.from("draft_sources").insert([
    { workspace_id: workspaceId, world_id: worldId, saga_id: sagaId, scope: "saga", draft_id: draftId, source_id: transcriptSourceId },
    { workspace_id: workspaceId, world_id: worldId, saga_id: sagaId, scope: "saga", draft_id: draftId, source_id: manualSourceId },
  ])).error).toBeNull();

  expect((await admin.from("transcripts").update({
    segments: [{ start: 0, end: 18, text: "The sealed gate opened." }],
    edited_at: new Date().toISOString(),
  }).eq("id", transcriptId)).error).toBeNull();

  const viewports = [
    { width: 1440, height: 900 },
    { width: 1024, height: 768 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
  ];

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    for (const route of [`${sagaRoot}/sessions/${sessionId}/review`, `${sagaRoot}/review`]) {
      await page.goto(route);
      const transcriptCitation = page.locator("summary").filter({ hasText: "Transcript · 0:00–0:18" });
      await expect(transcriptCitation).toBeVisible({ timeout: 10_000 });
      await transcriptCitation.press("Enter");
      const transcriptDetails = transcriptCitation.locator("xpath=..");
      await expect(transcriptDetails).toHaveAttribute("open", "");
      const citationRegion = page.getByLabel("Draft citations");
      await expect(citationRegion.getByText("Edited after citation")).toBeVisible();
      await expect(transcriptDetails).toContainText("The old gate opened.");
      await expect(transcriptDetails).toContainText("The sealed gate opened.");
      await expect(transcriptDetails.getByRole("link", { name: "Open cited transcript segment" })).toBeVisible();
      await expect(citationRegion.getByText("GM manual summary", { exact: true })).toBeVisible();
      const overflow = await page.evaluate(() => ({
        page: document.documentElement.scrollWidth,
        viewport: window.innerWidth,
        elements: [...document.querySelectorAll<HTMLElement>("body *")]
          .map((element) => ({ selector: `${element.tagName.toLowerCase()}.${element.className}`, right: Math.round(element.getBoundingClientRect().right), width: element.scrollWidth }))
          .filter((element) => element.right > window.innerWidth + 1)
          .slice(0, 8),
      }));
      expect(overflow.page, `${route} overflowed at ${viewport.width}×${viewport.height}: ${JSON.stringify(overflow.elements)}`).toBeLessThanOrEqual(overflow.viewport);
    }
  }

  await page.goto(`${sagaRoot}/review`);
  await page.locator("summary").filter({ hasText: "Transcript · 0:00–0:18" }).click();
  await page.getByRole("link", { name: "Open cited transcript segment" }).click();
  await expect(page).toHaveURL(new RegExp(`/sessions/${sessionId}/review#transcript-segment-0-18$`));
  await expect(page.locator("#transcript-segment-0-18")).toBeVisible();
});

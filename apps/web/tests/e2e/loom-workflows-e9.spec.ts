import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SERVICE_ROLE_KEY;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const persistenceOnly = process.env.RELIC_E9_PERSISTENCE_ONLY === "1";
const fixture = {
  email: "e9-loom-workflows@example.test",
  password: "password"
};

test.skip(
  process.env.RELIC_E2E_AUTH !== "1" || !supabaseUrl || !serviceRoleKey || !publishableKey,
  "Requires local Supabase, the deterministic Edge runtime, and an authenticated E9 fixture."
);

test("E9 Loom workflows disclose cost, reuse owner contracts, and persist across processes", async ({ page }) => {
  test.setTimeout(180_000);
  const admin = createClient(supabaseUrl!, serviceRoleKey!, { auth: { persistSession: false, autoRefreshToken: false } });
  const verifier = createClient(supabaseUrl!, publishableKey!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { email, password } = fixture;

  if (!persistenceOnly) {
    const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const old = listed.data.users.find((candidate) => candidate.email === email);
    if (old) await admin.auth.admin.deleteUser(old.id);
    expect((await admin.auth.admin.createUser({ email, password, email_confirm: true })).error).toBeNull();
  }

  expect((await verifier.auth.signInWithPassword({ email, password })).error).toBeNull();
  if (!persistenceOnly) {
    expect((await verifier.rpc("ensure_default_workspace")).error).toBeNull();
    const created = await verifier.rpc("create_blank_saga", {
      saga_name: "The Ember Road", game_system: "Cairn", experience_level: "returning",
      improv_comfort: "mixed", prep_style: "mixed", profile_mode: "use_default",
      save_profile_as_default: false, world_choice: "new", existing_world_id: null,
      world_name: "E9 World", target_workspace_id: null
    });
    expect(created.error).toBeNull();
    const ids = created.data as { workspace_id: string; world_id: string; saga_id: string };
    const character = await verifier.rpc("create_entity", {
      workspace_id: ids.workspace_id, world_id: ids.world_id, saga_id: ids.saga_id,
      entity_type: "character", entity_scope: "saga",
      payload: {
        name: "Mara Venn", summary: "Captain of the ember watch.",
        narrative: "Mara guards the eastern road before the descent.", gm_notes: ""
      }
    });
    expect(character.error).toBeNull();
  }
  const bootstrap = await verifier.rpc("get_bootstrap_context");
  expect(bootstrap.error).toBeNull();
  const context = bootstrap.data as { workspace: { id: string }; world: { id: string }; saga: { id: string } };
  const workspaceId = context.workspace.id;
  const worldId = context.world.id;
  const sagaId = context.saga.id;

  await page.goto("/auth/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/app(?:\/|$)/, { timeout: 15_000 });
  const guideUrl = `/app/w/${workspaceId}/world/${worldId}/saga/${sagaId}/guide`;
  await page.goto(guideUrl);
  const conversation = page.getByRole("region", { name: "The Loom conversation" });
  await page.waitForFunction(() => {
    const composer = document.querySelector("#guide-question");
    return Boolean(composer && Object.keys(composer).some((key) => key.startsWith("__reactProps")));
  });

  if (!persistenceOnly) {
    await conversation.getByLabel("Ask The Loom").fill("Create a new session called Ember Descent");
    await conversation.getByLabel("Ask The Loom").press("Enter");
    await expect(page.getByText(/review before acting · 0 credits · reversible workflow state/i)).toBeVisible({ timeout: 20_000 });
    const sessionsBeforeCreate = await verifier.rpc("get_sessions_for_saga", { workspace_id: workspaceId, world_id: worldId, saga_id: sagaId });
    expect(sessionsBeforeCreate.error).toBeNull();
    expect(sessionsBeforeCreate.data).toHaveLength(0);
    await conversation.getByRole("button", { name: "Review workflow action" }).click();
    await conversation.getByRole("button", { name: "Confirm workflow action" }).click();
    await expect(page.getByText("The planned Session was created.")).toBeVisible({ timeout: 20_000 });
    const sessions = await verifier.rpc("get_sessions_for_saga", { workspace_id: workspaceId, world_id: worldId, saga_id: sagaId });
    expect(sessions.error).toBeNull();
    expect(sessions.data).toHaveLength(1);
    expect(sessions.data![0].status).toBe("planned");
    const sessionId = sessions.data![0].id as string;
    const usageBeforePrep = await verifier.rpc("get_workspace_usage_summary", { workspace_id: workspaceId });
    expect(usageBeforePrep.error).toBeNull();
    expect(usageBeforePrep.data.current_rollup.ai_credits_used).toBe(0);

    await conversation.getByLabel("Ask The Loom").fill("Generate full prep for Session 1");
    await conversation.getByLabel("Ask The Loom").press("Enter");
    await expect(page.getByText(/review before acting · 10 credits · generated output stays pending/i)).toBeVisible({ timeout: 20_000 });
    await conversation.getByRole("button", { name: "Review workflow action" }).last().click();
    await expect(page.getByText(/confirmation is free; the result will still require review in prep/i)).toBeVisible();
    await conversation.getByRole("button", { name: "Confirm 10-credit task" }).click();
    await expect(page.getByText(/task was dispatched once.*generated output remains pending review/i)).toBeVisible({ timeout: 45_000 });
    const prep = await verifier.rpc("get_session_prep_ai", { workspace_id: workspaceId, world_id: worldId, saga_id: sagaId, session_id: sessionId });
    expect(prep.error).toBeNull();
    expect(prep.data).toHaveLength(1);
    expect(prep.data[0]).toMatchObject({ task_name: "generate_session_prep", status: "complete", review_state: "pending" });
    const usageAfterPrep = await verifier.rpc("get_workspace_usage_summary", { workspace_id: workspaceId });
    expect(usageAfterPrep.error).toBeNull();
    expect(usageAfterPrep.data.current_rollup).toMatchObject({ ai_credits_used: 10, ai_calls: 1 });
    const drafts = await verifier.rpc("get_pending_drafts", { workspace_id: workspaceId, world_id: worldId, saga_id: sagaId });
    expect(drafts.error).toBeNull();
    expect(drafts.data).toHaveLength(0);
    await page.getByRole("link", { name: "Review in Prep" }).click();
    await expect(page).toHaveURL(new RegExp(`/sessions/${sessionId}/prep`));
    const suggestions = page.getByRole("article").filter({ hasText: "Session suggestions" });
    await expect(suggestions).toContainText("complete");
    await expect(suggestions.getByRole("button", { name: "Reject" })).toBeVisible();
    await expect(suggestions.getByRole("button", { name: "Dismiss" })).toBeVisible();

    await page.goto(guideUrl);
    await page.waitForFunction(() => {
      const composer = document.querySelector("#guide-question");
      return Boolean(composer && Object.keys(composer).some((key) => key.startsWith("__reactProps")));
    });
    await conversation.getByLabel("Ask The Loom").fill("Compose a prep briefing for Session 1");
    await conversation.getByLabel("Ask The Loom").press("Enter");
    await expect(page.getByText(/review before acting · 3 credits · generated output stays pending/i)).toBeVisible({ timeout: 20_000 });
    const livePrep = await verifier.rpc("get_session_prep", { workspace_id: workspaceId, world_id: worldId, saga_id: sagaId, session_id: sessionId });
    expect(livePrep.error).toBeNull();
    const liveSession = livePrep.data.session;
    const changed = await verifier.rpc("autosave_session_prep", {
      workspace_id: workspaceId, world_id: worldId, saga_id: sagaId, session_id: sessionId,
      expected_version: liveSession.updated_at, session_name: liveSession.name,
      planned_start_at: liveSession.planned_start_at, objective: "Changed after preview",
      opening_scene: liveSession.opening_scene, scene_notes: liveSession.scene_notes,
      prep_checklist: liveSession.prep_checklist ?? [], pinned_entities: [], active_threads: []
    });
    expect(changed.error).toBeNull();
    await conversation.getByRole("button", { name: "Review workflow action" }).last().click();
    await conversation.getByRole("button", { name: "Confirm 3-credit task" }).click();
    await expect(page.getByText(/session changed.*refresh before trying/i)).toBeVisible({ timeout: 20_000 });
    const prepAfterConflict = await verifier.rpc("get_session_prep_ai", { workspace_id: workspaceId, world_id: worldId, saga_id: sagaId, session_id: sessionId });
    expect(prepAfterConflict.data).toHaveLength(1);
    const usageAfterConflict = await verifier.rpc("get_workspace_usage_summary", { workspace_id: workspaceId });
    expect(usageAfterConflict.error).toBeNull();
    expect(usageAfterConflict.data.current_rollup).toMatchObject({ ai_credits_used: 10, ai_calls: 1 });
  }

  await page.reload();
  await expect(page.locator(".guide-question p", { hasText: "Create a new session called Ember Descent" })).toBeVisible();
  await expect(page.getByText("The planned Session was created.")).toBeVisible();
  await expect(page.getByText(/task was dispatched once.*generated output remains pending review/i)).toBeVisible();
  await expect(page.getByText(/session changed.*refresh before trying/i)).toBeVisible();

  for (const viewport of [
    { width: 1440, height: 900 }, { width: 1024, height: 768 },
    { width: 768, height: 1024 }, { width: 390, height: 844 }
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(guideUrl);
    const overflow = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, body: document.body.scrollWidth, inner: window.innerWidth }));
    expect(Math.max(overflow.page, overflow.body)).toBeLessThanOrEqual(overflow.inner + 1);
    await expect(page.getByText(/10 credits · pending review/i)).toBeVisible();
  }
});

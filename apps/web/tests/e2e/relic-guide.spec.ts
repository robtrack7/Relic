import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.API_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SERVICE_ROLE_KEY;

test.skip(
  process.env.RELIC_E2E_AUTH !== "1" || !supabaseUrl || !serviceRoleKey,
  "Requires local Supabase auth and service-role fixture setup."
);

test("E3 Guide recovers cited answers, insufficiency, evidence, and reviewed actions at every viewport", async ({ page }) => {
  test.setTimeout(120_000);
  const admin = createClient(supabaseUrl!, serviceRoleKey!, { auth: { persistSession: false, autoRefreshToken: false } });
  const nonce = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  const email = `e3-guide-${nonce}@example.test`;
  const password = "password";
  const user = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  expect(user.error).toBeNull();
  const gmId = user.data.user!.id;
  const workspaceId = crypto.randomUUID();
  const worldId = crypto.randomUUID();
  const sagaId = crypto.randomUUID();
  const siblingSagaId = crypto.randomUUID();
  const characterId = crypto.randomUUID();
  const sourceId = crypto.randomUUID();
  const siblingCharacterId = crypto.randomUUID();
  const siblingSourceId = crypto.randomUUID();

  expect((await admin.from("workspaces").insert({
    id: workspaceId,
    owner_gm_id: gmId,
    name: `Guide Workspace ${nonce}`,
    usage_limits: {
      plan: "test", ai_credits_monthly: 100, transcription_seconds_monthly: 3600,
      storage_bytes: 1000000, worlds_active: 5, sagas_active: 5,
      entities_per_saga: 100, imports_monthly: 10, exports_monthly: 10
    }
  })).error).toBeNull();
  expect((await admin.from("worlds").insert({
    id: worldId, workspace_id: workspaceId, owner_gm_id: gmId, name: "Guide World"
  })).error).toBeNull();
  expect((await admin.from("sagas").insert([
    { id: sagaId, workspace_id: workspaceId, world_id: worldId, owner_gm_id: gmId, name: "The Iron Road" },
    { id: siblingSagaId, workspace_id: workspaceId, world_id: worldId, owner_gm_id: gmId, name: "Hidden Sibling" }
  ])).error).toBeNull();
  expect((await admin.from("characters").insert([
    {
      id: characterId, workspace_id: workspaceId, world_id: worldId, saga_id: sagaId,
      scope: "saga", name: "Mara Venn", summary: "Captain of the eastern watch.",
      narrative: "Mara Venn guards the sealed Iron Gate on the eastern road.", canon_state: "canon"
    },
    {
      id: siblingCharacterId, workspace_id: workspaceId, world_id: worldId, saga_id: siblingSagaId,
      scope: "saga", name: "Forbidden Sibling", summary: "Must remain isolated.",
      narrative: "This record must never appear in the Guide.", canon_state: "canon"
    }
  ])).error).toBeNull();
  expect((await admin.from("sources").insert([
    {
      id: sourceId, workspace_id: workspaceId, world_id: worldId, saga_id: sagaId,
      scope: "saga", kind: "existing_entity", source_entity_type: "character",
      source_entity_id: characterId, raw_excerpt: "Mara Venn guards the sealed Iron Gate on the eastern road."
    },
    {
      id: siblingSourceId, workspace_id: workspaceId, world_id: worldId, saga_id: siblingSagaId,
      scope: "saga", kind: "existing_entity", source_entity_type: "character",
      source_entity_id: siblingCharacterId, raw_excerpt: "Forbidden sibling evidence."
    }
  ])).error).toBeNull();

  const firstTurnId = crypto.randomUUID();
  const first = await admin.rpc("create_guide_turn_for_worker", {
    p_workspace_id: workspaceId,
    p_world_id: worldId,
    p_saga_id: sagaId,
    p_gm_id: gmId,
    p_thread_id: null,
    p_turn_id: firstTurnId,
    p_idempotency_key: crypto.randomUUID(),
    p_question: "Who protects the eastern road?",
    p_retrieval_mode: "lexical_fallback",
    p_source_ids: [sourceId, siblingSourceId]
  });
  expect(first.error).toBeNull();
  await admin.rpc("complete_guide_turn_for_worker", {
    p_run_id: first.data.run_id,
    p_output: {
      no_answer: false,
      blocks: [
        {
          type: "grounded_answer",
          text: "Mara Venn guards the sealed Iron Gate on the eastern road.",
          citations: [{ source_id: sourceId }]
        },
        {
          type: "action_preview",
          action: { type: "draft_entity", entity_type: "character", intent: "Draft the gate lieutenant." },
          explanation: "Create a non-canon character draft for GM review."
        }
      ],
      confidence_reason: "single_clear_segment"
    }
  });

  const second = await admin.rpc("create_guide_turn_for_worker", {
    p_workspace_id: workspaceId,
    p_world_id: worldId,
    p_saga_id: sagaId,
    p_gm_id: gmId,
    p_thread_id: first.data.thread_id,
    p_turn_id: crypto.randomUUID(),
    p_idempotency_key: crypto.randomUUID(),
    p_question: "What song opens the moon vault?",
    p_retrieval_mode: "none",
    p_source_ids: []
  });
  expect(second.error).toBeNull();
  await admin.rpc("complete_guide_turn_for_worker", {
    p_run_id: second.data.run_id,
    p_output: {
      no_answer: true,
      insufficiency_reason: "no_relevant_evidence",
      blocks: [{ type: "guidance", text: "Add or approve relevant Saga material, or search manually." }],
      confidence_reason: "no_relevant_evidence"
    }
  });

  await page.goto("/auth/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/app(?:\/|$)/, { timeout: 15_000 });
  const guideUrl = `/app/w/${workspaceId}/world/${worldId}/saga/${sagaId}/guide`;
  await page.goto(guideUrl);

  await expect(page.getByText("Mara Venn guards the sealed Iron Gate on the eastern road.")).toBeVisible();
  await expect(page.getByText("Relic does not have enough reliable Saga evidence to answer that.")).toBeVisible();
  await expect(page.getByText("Forbidden sibling evidence.")).toHaveCount(0);
  const citation = page.getByRole("button", { name: /Source 1:/ });
  await citation.press("Enter");
  await expect(page.getByRole("region", { name: /evidence/ })).toContainText("Mara Venn guards");
  await expect(page.getByText(sourceId)).toHaveCount(0);

  await page.getByRole("button", { name: "Review draft action" }).click();
  await expect(page.getByText(/result remains a pending draft/i)).toBeVisible();
  expect((await admin.from("drafts").select("id", { count: "exact", head: true }).eq("saga_id", sagaId)).count).toBe(0);
  await page.getByRole("button", { name: "Confirm and draft" }).click();
  await expect(page.getByText(/Drafting is in progress|pending for your review|sent to the Approval Queue path/i))
    .toBeVisible({ timeout: 20_000 });
  expect((await admin.from("drafts").select("id", { count: "exact", head: true }).eq("saga_id", sagaId)).count).toBe(1);

  await page.reload();
  await expect(page.locator(".guide-question p", { hasText: "Who protects the eastern road?" })).toBeVisible();
  await expect(page.locator(".guide-question p", { hasText: "What song opens the moon vault?" })).toBeVisible();

  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1024, height: 768 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 }
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(guideUrl);
    const overflow = await page.evaluate(() => ({
      page: document.documentElement.scrollWidth,
      viewport: window.innerWidth
    }));
    expect(overflow.page, `Guide overflowed at ${viewport.width}×${viewport.height}`).toBeLessThanOrEqual(overflow.viewport);
    await expect(page.locator("#guide-question")).toBeVisible();
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(guideUrl);
  await page.locator("#guide-question").fill("Who currently guards the eastern road?");
  await page.getByRole("button", { name: "Ask Guide" }).click();
  const submittedTurn = page.locator(".guide-turn").filter({ hasText: "Who currently guards the eastern road?" });
  await expect(submittedTurn.locator(".guide-answer-block, .guide-no-answer")).toBeVisible({ timeout: 20_000 });
  await page.reload();
  await expect(page.locator(".guide-question p", { hasText: "Who currently guards the eastern road?" })).toBeVisible();
});

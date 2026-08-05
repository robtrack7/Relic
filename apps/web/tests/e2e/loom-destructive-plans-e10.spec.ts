import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SERVICE_ROLE_KEY;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const fixture = {
  email: "e10-loom-lifecycle@example.test",
  password: "password"
};

test.skip(
  process.env.RELIC_E2E_AUTH !== "1" || !supabaseUrl || !serviceRoleKey || !publishableKey,
  "Requires local Supabase, the deterministic Edge runtime, and an authenticated E10 fixture."
);

test("E10 protects lifecycle actions, permanent deletion, bounded plans, and stale targets", async ({ page }) => {
  test.setTimeout(180_000);
  const clientErrors: string[] = [];
  page.on("pageerror", (error) => clientErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") clientErrors.push(message.text());
  });
  const admin = createClient(supabaseUrl!, serviceRoleKey!, { auth: { persistSession: false, autoRefreshToken: false } });
  const verifier = createClient(supabaseUrl!, publishableKey!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { email, password } = fixture;

  const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const old = listed.data.users.find((candidate) => candidate.email === email);
  if (old) await admin.auth.admin.deleteUser(old.id);
  expect((await admin.auth.admin.createUser({ email, password, email_confirm: true })).error).toBeNull();
  expect((await verifier.auth.signInWithPassword({ email, password })).error).toBeNull();
  expect((await verifier.rpc("ensure_default_workspace")).error).toBeNull();
  const created = await verifier.rpc("create_blank_saga", {
    saga_name: "The Remembered Roads", game_system: "Cairn", experience_level: "returning",
    improv_comfort: "mixed", prep_style: "mixed", profile_mode: "use_default",
    save_profile_as_default: false, world_choice: "new", existing_world_id: null,
    world_name: "E10 World", target_workspace_id: null
  });
  expect(created.error).toBeNull();
  const ids = created.data as { workspace_id: string; world_id: string; saga_id: string };
  const character = await verifier.rpc("create_entity", {
    workspace_id: ids.workspace_id, world_id: ids.world_id, saga_id: ids.saga_id,
    entity_type: "character", entity_scope: "saga",
    payload: {
      name: "Mara Venn", summary: "Captain of the ember watch.",
      narrative: "Mara Venn guards the eastern road and maps what memory erases.", gm_notes: ""
    }
  });
  expect(character.error).toBeNull();
  const characterId = (character.data as { id: string }).id;

  await page.goto("/auth/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/app(?:\/|$)/, { timeout: 15_000 });
  const guideUrl = `/app/w/${ids.workspace_id}/world/${ids.world_id}/saga/${ids.saga_id}/guide`;
  await page.goto(guideUrl);
  const conversation = page.getByRole("region", { name: "The Loom conversation" });
  const waitForComposer = () => page.waitForFunction(() => {
    const composer = document.querySelector("#guide-question");
    return Boolean(composer && Object.keys(composer).some((key) => key.startsWith("__reactProps")));
  });
  await waitForComposer();
  const ask = async (question: string) => {
    await conversation.getByLabel("Ask The Loom").fill(question);
    await conversation.getByRole("button", { name: "Ask The Loom" }).click();
  };
  const confirmLifecycle = async (confirmation: "Confirm archive" | "Confirm restore" | "Prepare protected delete panel") => {
    await conversation.getByRole("button", { name: "Review lifecycle action" }).last().click();
    await conversation.getByRole("button", { name: confirmation }).click();
  };

  await ask("Archive Mara Venn");
  await page.waitForTimeout(250);
  expect(clientErrors).toEqual([]);
  await expect(page.getByText(/review before acting · 0 credits · reversible lifecycle/i)).toBeVisible({ timeout: 20_000 });
  await confirmLifecycle("Confirm archive");
  await expect(page.getByText(/record was archived through its existing reversible lifecycle path/i)).toBeVisible({ timeout: 20_000 });
  expect((await admin.from("characters").select("canon_state").eq("id", characterId).single()).data?.canon_state).toBe("archived");

  await ask("Restore Mara Venn");
  await confirmLifecycle("Confirm restore");
  await expect(page.getByText(/archived record was restored to canon/i)).toBeVisible({ timeout: 20_000 });
  expect((await admin.from("characters").select("canon_state").eq("id", characterId).single()).data?.canon_state).toBe("canon");

  await ask("Archive Mara Venn");
  await confirmLifecycle("Confirm archive");
  await expect(page.getByText(/record was archived through its existing reversible lifecycle path/i).last()).toBeVisible({ timeout: 20_000 });
  await ask("Open the permanent delete panel for Mara Venn");
  await expect(page.getByText(/review before acting · 0 credits · no deletion/i)).toBeVisible({ timeout: 20_000 });
  await confirmLifecycle("Prepare protected delete panel");
  await expect(page.getByText(/protected record panel is ready.*did not delete anything/i)).toBeVisible({ timeout: 20_000 });
  await page.getByRole("link", { name: "Open protected delete panel" }).click();
  await expect(page).toHaveURL(/prepareDelete=1/);
  await expect(page.getByLabel("I understand this cannot be undone.")).toBeVisible();
  await expect(page.getByLabel(/Type “Mara Venn”/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Delete permanently" })).toBeDisabled();
  expect((await admin.from("characters").select("canon_state").eq("id", characterId).single()).data?.canon_state).toBe("archived");

  await page.goto(guideUrl);
  await waitForComposer();
  await ask("Restore Mara Venn");
  await confirmLifecycle("Confirm restore");
  await expect(page.getByText(/archived record was restored to canon/i).last()).toBeVisible({ timeout: 20_000 });
  const lifecycleUsage = await verifier.rpc("get_workspace_usage_summary", { workspace_id: ids.workspace_id });
  expect(lifecycleUsage.error).toBeNull();
  expect(lifecycleUsage.data.current_rollup).toMatchObject({ ai_credits_used: 0, ai_calls: 0 });

  await ask("Create a bounded plan for Mara Venn");
  await expect(page.getByLabel("Plan step 1 of 2")).toBeVisible({ timeout: 45_000 });
  await expect(page.getByLabel("Plan step 2 of 2")).toBeVisible();
  await expect(page.getByText(/waiting for the earlier plan step/i)).toBeVisible();
  await conversation.getByRole("button", { name: "Review proposal action" }).click();
  await conversation.getByRole("button", { name: "Send to Review" }).click();
  await expect(page.getByText(/pending proposal was created.*canon is unchanged/i)).toBeVisible({ timeout: 20_000 });
  await conversation.getByRole("button", { name: "Review workflow action" }).last().click();
  await conversation.getByRole("button", { name: "Confirm workflow action" }).click();
  await expect(page.getByText("The planned Session was created.")).toBeVisible({ timeout: 20_000 });
  const sessions = await verifier.rpc("get_sessions_for_saga", {
    workspace_id: ids.workspace_id, world_id: ids.world_id, saga_id: ids.saga_id
  });
  expect(sessions.error).toBeNull();
  expect(sessions.data).toEqual(expect.arrayContaining([expect.objectContaining({ name: "Roads Remembered", status: "planned" })]));

  await ask("Archive Mara Venn");
  await expect(page.getByRole("button", { name: "Review lifecycle action" }).last()).toBeVisible({ timeout: 20_000 });
  const live = await admin.from("characters").select("updated_at,name,summary,narrative,gm_notes").eq("id", characterId).single();
  expect(live.error).toBeNull();
  expect((await verifier.rpc("update_entity", {
    workspace_id: ids.workspace_id, world_id: ids.world_id, saga_id: ids.saga_id,
    entity_type: "character", entity_id: characterId,
    payload: { ...live.data, summary: "Changed after the Loom preview.", expected_version: live.data!.updated_at }
  })).error).toBeNull();
  await confirmLifecycle("Confirm archive");
  await expect(page.getByText(/record changed.*stopped before applying/i)).toBeVisible({ timeout: 20_000 });
  expect((await admin.from("characters").select("canon_state").eq("id", characterId).single()).data?.canon_state).toBe("canon");

  const usage = await verifier.rpc("get_workspace_usage_summary", { workspace_id: ids.workspace_id });
  expect(usage.error).toBeNull();
  expect(usage.data.current_rollup).toMatchObject({ ai_credits_used: 1, ai_calls: 1 });
});

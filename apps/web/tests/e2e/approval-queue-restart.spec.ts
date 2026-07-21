import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.API_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.ANON_KEY;
const ids = {
  workspaceId: "e5200000-0000-0000-0000-000000000001",
  worldId: "e5300000-0000-0000-0000-000000000001",
  sagaId: "e5400000-0000-0000-0000-000000000001",
};
const reviewUrl = `/app/w/${ids.workspaceId}/world/${ids.worldId}/saga/${ids.sagaId}/review`;

test.skip(process.env.RELIC_E2E_AUTH !== "1" || !supabaseUrl || !publishableKey, "Requires the completed local C5 browser fixture flow.");

test("C5 unresolved Approval Queue state survives an application restart", async ({ page }) => {
  const verifier = createClient(supabaseUrl!, publishableKey!, { auth: { persistSession: false, autoRefreshToken: false } });
  expect((await verifier.auth.signInWithPassword({ email: "c5-browser@example.test", password: "password" })).error).toBeNull();

  const queue = await verifier.rpc("get_approval_queue", {
    workspace_id: ids.workspaceId,
    world_id: ids.worldId,
    saga_id: ids.sagaId,
  });
  expect(queue.error).toBeNull();
  expect((queue.data as Array<Record<string, unknown>>).find((draft) => draft.id === "e5900000-0000-0000-0000-000000000004")?.state).toBe("pending");

  await page.goto("/auth/sign-in");
  await page.getByLabel("Email").fill("c5-browser@example.test");
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/app(?:\/|$)/, { timeout: 15_000 });
  await page.goto(reviewUrl);

  await expect(page.getByRole("article", { name: "Who forged the bridge? create proposal" })).toBeVisible();
  await expect(page.getByRole("article", { name: "Session 1 Summary create proposal" })).toHaveCount(0);
});

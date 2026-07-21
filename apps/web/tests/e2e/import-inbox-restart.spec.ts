import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.API_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SERVICE_ROLE_KEY;
test.skip(process.env.RELIC_E2E_AUTH !== "1" || !supabaseUrl || !publishableKey || !serviceRoleKey, "Requires the completed D5 browser fixture and a restarted app server.");

test("D5 ready and archived imports survive an application restart", async ({ page }) => {
  const client = createClient(supabaseUrl!, publishableKey!, { auth: { persistSession: false, autoRefreshToken: false } });
  expect((await client.auth.signInWithPassword({ email: "d5-browser@example.test", password: "password" })).error).toBeNull();
  const admin = createClient(supabaseUrl!, serviceRoleKey!, { auth: { persistSession: false, autoRefreshToken: false } });
  const saga = await admin.from("sagas").select("id,workspace_id,world_id").eq("name", "D5 Browser Saga").single();
  expect(saga.error).toBeNull();
  const root = `/app/w/${saga.data!.workspace_id}/world/${saga.data!.world_id}/saga/${saga.data!.id}`;
  await page.goto("/auth/sign-in");
  await page.getByLabel("Email").fill("d5-browser@example.test"); await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/app(?:\/|$)/, { timeout: 15_000 });
  await page.goto(`${root}/imports`);
  await expect(page.locator("article.import-source.ready_for_review").first()).toBeVisible();
  await expect(page.locator("article.import-source.archived").filter({ hasText: "legacy-notes.md" })).toBeVisible();
});

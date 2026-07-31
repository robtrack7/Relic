import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.API_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SERVICE_ROLE_KEY;
const email = "e4-prep-browser@example.test";
const ids = {
  workspace: "e4410000-0000-4000-8000-000000000001",
  world: "e4420000-0000-4000-8000-000000000001",
  saga: "e4430000-0000-4000-8000-000000000001",
  session: "e4440000-0000-4000-8000-000000000001"
};

test.skip(
  process.env.RELIC_E2E_AUTH !== "1" || !supabaseUrl || !serviceRoleKey,
  "Requires the persistent local E4 browser fixture."
);

test("E4 Prep and suggestion review state survive a full web-app restart at every viewport", async ({ page }) => {
  test.setTimeout(120_000);
  const admin = createClient(supabaseUrl!, serviceRoleKey!, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const prepUrl = `/app/w/${ids.workspace}/world/${ids.world}/saga/${ids.saga}/sessions/${ids.session}/prep`;
  try {
    await page.goto("/auth/sign-in");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/app(?:\/|$)/, { timeout: 15_000 });

    for (const viewport of [
      { width: 1440, height: 900 },
      { width: 1024, height: 768 },
      { width: 768, height: 1024 },
      { width: 390, height: 844 }
    ]) {
      await page.setViewportSize(viewport);
      await page.goto(prepUrl);
      await expect(page.getByLabel("Scene notes")).toHaveValue(/Restart-safe manual note\./);
      await expect(page.getByText(/Marked accepted/i).first()).toBeVisible();
      await expect(page.getByText(/Marked rejected/i).first()).toBeVisible();
      await expect(page.getByText(/Marked dismissed/i).first()).toBeVisible();
      const overflow = await page.evaluate(() => ({
        page: document.documentElement.scrollWidth,
        viewport: window.innerWidth
      }));
      expect(overflow.page, `Prep overflowed at ${viewport.width}×${viewport.height}`).toBeLessThanOrEqual(overflow.viewport);
    }

    await page.setViewportSize({ width: 390, height: 844 });
    const sourceButton = page.getByRole("button", { name: /Source 1:/ }).first();
    await sourceButton.focus();
    await sourceButton.press(" ");
    await expect(page.getByRole("region", { name: /evidence/ }).first()).toBeVisible();
    await expect(sourceButton).toBeFocused();

    const session = await admin.from("sessions").select("scene_notes").eq("id", ids.session).single();
    expect((session.data?.scene_notes.match(/GM-edited accepted pressure beat\./g) ?? []).length).toBe(1);
    expect((await admin.from("drafts").select("id", { count: "exact", head: true }).eq("saga_id", ids.saga).eq("state", "pending")).count).toBe(2);
  } finally {
    await admin.from("workspaces").delete().eq("id", ids.workspace);
    const users = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const user = users.data.users.find((candidate) => candidate.email === email);
    if (user) await admin.auth.admin.deleteUser(user.id);
  }
});

import { expect, test } from "@playwright/test";

test("public entry exposes auth and app entry points", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Open app" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
});

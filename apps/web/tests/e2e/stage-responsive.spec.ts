import { expect, test } from "@playwright/test";

const email = process.env.RELIC_E2E_EMAIL;
const password = process.env.RELIC_E2E_PASSWORD;
const stageUrl = process.env.RELIC_E2E_STAGE_URL;

test.skip(!email || !password || !stageUrl, "Requires a local authenticated Stage fixture.");

test("Stage preserves its cockpit at desktop, tablet, portrait, and mobile sizes", async ({ page }) => {
  await page.goto("/auth/sign-in");
  await page.getByLabel("Email").fill(email!);
  await page.getByLabel("Password").fill(password!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/app(?:\/|$)/, { timeout: 10_000 });
  await page.goto(stageUrl!);

  const cases = [
    { name: "desktop", width: 1440, height: 900 },
    { name: "tablet-landscape", width: 1024, height: 768 },
    { name: "tablet-portrait", width: 768, height: 1024 },
    { name: "mobile", width: 390, height: 844 },
  ];

  for (const viewport of cases) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await expect(page.getByRole("navigation", { name: "Stage actions" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Note" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Dice" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Create" })).toBeVisible();
    await expect(page.getByRole("button", { name: "End Session" })).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: `../../output/playwright/stage-${viewport.name}.png`, fullPage: false });
  }
});

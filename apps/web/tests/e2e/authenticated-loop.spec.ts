import { expect, test } from "@playwright/test";

test.skip(process.env.RELIC_E2E_AUTH !== "1", "Requires local Supabase and RELIC_E2E_AUTH=1.");

test("new GM can create a saga and move from Sanctum dashboard to Prepare and Stage", async ({ page }) => {
  const runId = Date.now();
  const sagaName = `E2E Saga ${runId}`;

  await page.goto("/auth/sign-up");
  await page.getByLabel("Email").fill(`e2e-${runId}@example.test`);
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: "Create account" }).click();

  const signInHeading = page.getByRole("heading", { name: "Sign in" });
  const newSagaHeading = page.getByRole("heading", { name: "Create a playable start" });
  await Promise.race([
    signInHeading.waitFor({ state: "visible", timeout: 5_000 }).catch(() => undefined),
    newSagaHeading.waitFor({ state: "visible", timeout: 5_000 }).catch(() => undefined)
  ]);

  if (await signInHeading.isVisible().catch(() => false)) {
    await page.getByLabel("Email").fill(`e2e-${runId}@example.test`);
    await page.getByLabel("Password").fill("password");
    await page.getByRole("button", { name: "Sign in" }).click();
  }

  await page.goto("/app/new-saga");

  await expect(page.getByRole("heading", { name: "Create a playable start" })).toBeVisible();
  await page.getByLabel("Saga name").fill(sagaName);
  await page.getByLabel("Game system").fill("System test");
  await page.getByLabel("New World name").fill(`${sagaName} World`);
  await page.getByRole("button", { name: "Create blank saga" }).click();

  await expect(page.getByRole("heading", { name: sagaName })).toBeVisible();

  const planSession = page.getByRole("button", { name: "Plan Session 1" });
  if (await planSession.isVisible().catch(() => false)) {
    await page.getByPlaceholder("What should the first session accomplish?").fill("Test the Figma-imported prep and Stage loop.");
    await planSession.click();
  } else {
    await page.getByRole("link", { name: "Continue prep" }).first().click();
  }

  await expect(page.getByText("The Stage will read this packet exactly as written here.")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Session .*|Next session|Session 1/ })).toBeVisible();

  const readyOrOpen = page.getByRole("button", { name: /Ready for Stage|Open in Stage/ });
  await readyOrOpen.click();

  await expect(page).toHaveURL(/\/stage(?:\?|$)/);
  await expect(page.getByRole("heading", { name: /Session|Next session/ })).toBeVisible();
  await expect(page.getByRole("region", { name: "Agenda" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Start Session|Go live|Live/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Mark Moment" })).toBeVisible();
  await expect(page.getByRole("button", { name: "End Session" })).toBeVisible();
});

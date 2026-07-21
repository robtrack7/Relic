import { expect, test } from "@playwright/test";

test.skip(process.env.RELIC_E2E_AUTH !== "1", "Requires local Supabase and RELIC_E2E_AUTH=1.");

test("GM can reuse, switch, rename, and delete Sagas without touching a sibling", async ({ page }) => {
  test.setTimeout(90_000);

  const runId = Date.now();
  const email = `d1-${runId}@example.test`;
  const password = "password";
  const firstSaga = `D1 First ${runId}`;
  const secondSaga = `D1 Second ${runId}`;
  const renamedSaga = `D1 Renamed ${runId}`;
  const worldName = `D1 World ${runId}`;
  const siblingCharacter = `D1 Keeper ${runId}`;

  await page.goto("/auth/sign-up");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();

  const signInHeading = page.getByRole("heading", { name: "Sign in" });
  await Promise.race([
    signInHeading.waitFor({ state: "visible", timeout: 5_000 }).catch(() => undefined),
    page.getByRole("heading", { name: "Create a playable start" }).waitFor({ state: "visible", timeout: 5_000 }).catch(() => undefined)
  ]);
  if (await signInHeading.isVisible().catch(() => false)) {
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
  }

  await page.goto("/app/new-saga");
  await page.getByLabel("Saga name").fill(firstSaga);
  await page.getByLabel("New World name").fill(worldName);
  await page.getByRole("button", { name: "Create blank saga" }).click();
  await expect(page.getByRole("heading", { name: firstSaga })).toBeVisible();
  const firstRoot = page.url();

  await page.getByLabel("Saga", { exact: true }).selectOption({ label: "+ New saga" });
  await expect(page.getByRole("heading", { name: "Create a playable start" })).toBeVisible();
  await page.getByLabel("Saga name").fill(secondSaga);
  await expect(page.getByLabel("World choice")).toHaveValue("existing");
  await expect(page.locator('select[name="existingWorldId"]')).toHaveValue(firstRoot.match(/\/world\/([^/]+)/)?.[1] ?? "");
  await page.getByRole("button", { name: "Create blank saga" }).click();
  await expect(page.getByRole("heading", { name: secondSaga })).toBeVisible();

  const sagaSwitcher = page.getByLabel("Saga", { exact: true });
  await expect(sagaSwitcher.getByRole("option", { name: firstSaga })).toBeAttached();
  await expect(sagaSwitcher.getByRole("option", { name: secondSaga })).toBeAttached();
  await sagaSwitcher.selectOption({ label: firstSaga });
  await expect(page).toHaveURL(firstRoot);

  await page.goto(`${firstRoot}/entities/new?type=character`);
  await page.getByLabel("Name / title").fill(siblingCharacter);
  await page.getByLabel("Summary").fill("Must survive sibling Saga deletion.");
  await page.getByLabel("Narrative / body").fill("D1 isolation fixture.");
  await page.getByRole("button", { name: /Create Character/i }).click();
  await expect(page.getByRole("heading", { name: siblingCharacter })).toBeVisible();

  await page.getByLabel("Saga", { exact: true }).selectOption({ label: secondSaga });
  await page.getByRole("link", { name: "Settings" }).click();
  await page.getByLabel("Saga name").fill(renamedSaga);
  await page.getByRole("button", { name: "Rename saga" }).click();
  await expect(page.getByText("Saga renamed.")).toBeVisible();
  await expect(page.locator(".page-title")).toHaveText(renamedSaga);

  await page.getByLabel(new RegExp(`Type ${renamedSaga}`)).fill("wrong name");
  await page.getByRole("button", { name: "Delete saga permanently" }).click();
  await expect(page.getByText("Saga confirmation name does not match")).toBeVisible();

  await page.getByLabel(new RegExp(`Type ${renamedSaga}`)).fill(renamedSaga);
  await page.getByRole("button", { name: "Delete saga permanently" }).click();
  await expect(page).toHaveURL(new RegExp(firstRoot.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  await expect(page.getByLabel("Saga", { exact: true }).getByRole("option", { name: renamedSaga })).toHaveCount(0);

  await page.goto(`${firstRoot}/entities`);
  await expect(page.getByRole("link", { name: new RegExp(siblingCharacter) })).toBeVisible();
});

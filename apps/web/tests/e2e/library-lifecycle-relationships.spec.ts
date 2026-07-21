import { expect, test } from "@playwright/test";

test.skip(process.env.RELIC_E2E_AUTH !== "1", "Requires local Supabase and RELIC_E2E_AUTH=1.");

test("GM autosaves, links, archives, restores, and only deletes an unreferenced Library record", async ({ page }) => {
  test.setTimeout(90_000);
  const runId = Date.now();
  const email = `d2-${runId}@example.test`;
  const sagaName = `D2 Saga ${runId}`;
  const worldName = `D2 World ${runId}`;
  const placeName = `Glass Bridge ${runId}`;
  const characterName = `Mara Vale ${runId}`;
  const artifactName = `Unbound Key ${runId}`;

  await page.goto("/auth/sign-up");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: "Create account" }).click();
  const signInHeading = page.getByRole("heading", { name: "Sign in" });
  await Promise.race([
    signInHeading.waitFor({ state: "visible", timeout: 5_000 }).catch(() => undefined),
    page.getByRole("heading", { name: "Create a playable start" }).waitFor({ state: "visible", timeout: 5_000 }).catch(() => undefined),
  ]);
  if (await signInHeading.isVisible().catch(() => false)) {
    await page.getByLabel("Email").fill(email); await page.getByLabel("Password").fill("password");
    await page.getByRole("button", { name: "Sign in" }).click();
  }

  await page.goto("/app/new-saga");
  await page.getByLabel("Saga name").fill(sagaName);
  await page.getByLabel("New World name").fill(worldName);
  await page.getByRole("button", { name: "Create blank saga" }).click();
  await expect(page.getByRole("heading", { name: sagaName })).toBeVisible();
  const root = page.url();

  await page.goto(`${root}/entities/new?type=place`);
  await page.getByLabel("Name / title").fill(placeName);
  await page.getByLabel("Summary").fill("A bright crossing.");
  await page.getByRole("button", { name: "Create Place" }).click();
  await expect(page.getByRole("heading", { name: placeName })).toBeVisible();

  await page.goto(`${root}/entities/new?type=character`);
  await page.getByLabel("Name / title").fill(characterName);
  await page.getByLabel("Summary").fill("A careful scout.");
  await page.getByLabel("Narrative / body").fill(`${characterName} watches the ${placeName}.`);
  await page.getByRole("button", { name: "Create Character" }).click();
  await expect(page.getByRole("heading", { name: characterName })).toBeVisible();
  const characterUrl = page.url();
  await expect(page.getByText(new RegExp(`may refer to ${placeName}`))).toBeVisible();
  await page.locator(".provenance-entry summary").first().click();
  await expect(page.getByText("Manual GM create", { exact: false })).toBeVisible();

  await page.getByLabel("Summary").fill("A careful scout who now trusts the party.");
  await expect(page.getByRole("status")).toContainText("Unsaved");
  await expect(page.getByRole("status")).toContainText("Saved", { timeout: 5_000 });
  await page.reload();
  await expect(page.getByLabel("Summary")).toHaveValue("A careful scout who now trusts the party.");

  await page.getByRole("button", { name: "Accept link" }).click();
  await expect(page.getByText("No mention suggestions.")).toBeVisible();
  await page.getByRole("combobox", { name: "Related record" }).selectOption({ label: `${placeName} · place` });
  await page.getByRole("combobox", { name: "Relationship" }).selectOption("located-at");
  await page.getByRole("button", { name: "Add link" }).click();
  await expect(page.getByRole("link", { name: placeName })).toBeVisible();

  await page.getByRole("button", { name: "Archive record" }).click();
  await page.getByRole("link", { name: "Show archived" }).click();
  await page.getByRole("link", { name: new RegExp(characterName) }).click();
  await page.getByRole("button", { name: "Permanently delete…" }).click();
  await expect(page.getByText("References must be removed first.")).toBeVisible();
  await page.getByRole("button", { name: "Restore to canon" }).click();
  await expect(page).toHaveURL(characterUrl + "?lifecycleNotice=restored");
  await expect(page.getByRole("status")).toContainText("Saved");

  await page.goto(`${root}/entities/new?type=artifact`);
  await page.getByLabel("Name / title").fill(artifactName);
  await page.getByRole("button", { name: "Create Artifact" }).click();
  await page.getByRole("button", { name: "Archive record" }).click();
  await page.getByRole("link", { name: "Show archived" }).click();
  await page.getByRole("link", { name: new RegExp(artifactName) }).click();
  await page.getByRole("button", { name: "Permanently delete…" }).click();
  await page.getByLabel("I understand this cannot be undone.").check();
  await page.getByLabel(new RegExp(`Type “${artifactName}`)).fill(artifactName);
  await page.getByRole("button", { name: "Delete permanently" }).click();
  await expect(page.getByText("The unreferenced archived record was permanently deleted.", { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: new RegExp(artifactName) })).toHaveCount(0);
});

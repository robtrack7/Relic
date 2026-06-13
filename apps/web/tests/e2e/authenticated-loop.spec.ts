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

  await page.getByRole("link", { name: "Character", exact: true }).click();
  await page.getByLabel("Name").fill("Seraphine Vale");
  await page.getByLabel("Summary").fill("A careful archivist with a dangerous promise.");
  await page.getByLabel("Narrative").fill("Seraphine knows where the sealed letter is hidden.");
  await page.getByRole("button", { name: /Create|Save/ }).click();
  await expect(page.getByRole("heading", { name: "Seraphine Vale" })).toBeVisible();

  await page.goto(page.url().replace(/\/entities\/character\/[^/]+$/, ""));
  await page.getByRole("link", { name: "Thread", exact: true }).click();
  await page.getByLabel("Name").fill("The sealed letter");
  await page.getByLabel("Summary").fill("A letter keeps pulling danger toward the archive.");
  await page.getByLabel("Narrative").fill("The letter names an old betrayal.");
  await page.getByRole("button", { name: /Create|Save/ }).click();
  await expect(page.getByRole("heading", { name: "The sealed letter" })).toBeVisible();

  const threadEntityUrl = page.url();
  const threadId = threadEntityUrl.match(/\/entities\/thread\/([^/]+)$/)?.[1];
  expect(threadId).toBeTruthy();
  const sagaRoot = threadEntityUrl.replace(/\/entities\/thread\/[^/]+$/, "");
  await page.goto(`${sagaRoot}/threads/${threadId}`);
  await expect(page.getByRole("heading", { name: "The sealed letter" })).toBeVisible();
  await page.getByLabel("Add objective").fill("Recover the sealed letter.");
  await page.getByRole("button", { name: "Add objective" }).click();
  await expect(page.getByText("Recover the sealed letter.")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Recover the sealed letter.")).toBeVisible();

  await page.goto(sagaRoot);

  const planSession = page.getByRole("button", { name: "Plan Session 1" });
  if (await planSession.isVisible().catch(() => false)) {
    await page.getByPlaceholder("What should the first session accomplish?").fill("Test the Figma-imported prep and Stage loop.");
    await planSession.click();
  } else {
    await page.getByRole("link", { name: "Continue prep" }).first().click();
  }

  await expect(page.getByText("The Stage will read this packet exactly as written here.")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Session .*|Next session|Session 1/ })).toBeVisible();
  await page.getByLabel("Seraphine Vale").check();
  await page.getByLabel("The sealed letter").check();
  await page.getByRole("button", { name: "Save prep" }).click();

  const readyOrOpen = page.getByRole("button", { name: /Ready for Stage|Open in Stage/ });
  await readyOrOpen.click();

  await expect(page).toHaveURL(/\/stage(?:\?|$)/);
  await expect(page.getByRole("heading", { name: /Session|Next session/ })).toBeVisible();
  await expect(page.getByRole("region", { name: "Agenda" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Start Session|Go live|Live/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Mark Moment" })).toBeVisible();
  await expect(page.getByRole("button", { name: "End Session" })).toBeVisible();
  await expect(page.getByLabel("Pinned entities").getByText("Seraphine Vale")).toBeVisible();

  await page.getByRole("button", { name: "Start Session" }).click();
  await expect(page.getByRole("button", { name: "Go live" })).toBeVisible();
  await page.getByRole("button", { name: "Go live" }).click();
  await expect(page.getByText("Live")).toBeVisible();

  await page.getByRole("button", { name: "Consent" }).click();
  await expect(page.locator(".stage-chip-rec", { hasText: "Consent granted" })).toBeVisible();

  await page.getByPlaceholder("Capture a table note…").fill("The archive door opened by itself.");
  await page.getByRole("button", { name: "Capture" }).click();

  await page.getByPlaceholder("NPC or place name…").fill("Mira Fen");
  await page.getByPlaceholder("Short note…").fill("A messenger seen at the archive.");
  await page.getByRole("button", { name: "Create stub" }).click();

  await page.getByRole("button", { name: "Mark Moment" }).click();

  await page.getByLabel("Dice expression").fill("2d6+1");
  await page.getByRole("button", { name: "Dice" }).click();
  await expect(page.getByText(/2d6\+1 = \d+/)).toBeVisible();

  await page.getByRole("searchbox", { name: "Search saga during play" }).fill("Mira Fen");
  await page.getByRole("searchbox", { name: "Search saga during play" }).press("Enter");
  await expect(page.getByText("Mira Fen")).toBeVisible();
});

import { expect, test } from "@playwright/test";

test.skip(process.env.RELIC_E2E_AUTH !== "1", "Requires local Supabase and RELIC_E2E_AUTH=1.");

test("GM completes the deterministic five-Session Thread lifecycle", async ({ page }) => {
  test.setTimeout(240_000);
  const email = "d3-browser@example.test";
  const sagaName = "D3 Five Session Saga";
  const threadName = "The Glass Crown";
  const characterName = "Mara Vale";

  await page.goto("/auth/sign-up");
  await page.getByLabel("Email").fill(email); await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: "Create account" }).click();
  const signIn = page.getByRole("heading", { name: "Sign in" });
  await Promise.race([signIn.waitFor({ state: "visible", timeout: 5_000 }).catch(() => undefined), page.getByRole("heading", { name: "Create a playable start" }).waitFor({ state: "visible", timeout: 5_000 }).catch(() => undefined)]);
  if (await signIn.isVisible().catch(() => false)) { await page.getByLabel("Email").fill(email); await page.getByLabel("Password").fill("password"); await page.getByRole("button", { name: "Sign in" }).click(); }
  await page.goto("/app/new-saga");
  await page.getByLabel("Saga name").fill(sagaName); await page.getByLabel("New World name").fill("D3 Timeline World");
  await page.getByRole("button", { name: "Create blank saga" }).click();
  await expect(page.getByRole("heading", { name: sagaName })).toBeVisible();
  const root = page.url();

  await page.goto(`${root}/entities/new?type=thread`);
  await page.getByLabel("Name / title").fill(threadName); await page.getByLabel("Summary").fill("The crown is missing.");
  await page.getByRole("button", { name: "Create Thread" }).click();
  await page.goto(`${root}/entities/new?type=character`);
  await page.getByLabel("Name / title").fill(characterName); await page.getByRole("button", { name: "Create Character" }).click();

  const sessionUrls: string[] = [];
  for (let number = 1; number <= 5; number += 1) {
    await page.goto(`${root}/sessions/new`);
    await page.getByLabel("Name").fill(`Session ${number}`);
    await page.getByLabel("Planned date").fill(`2026-07-${String(number * 3).padStart(2, "0")}`);
    await page.getByRole("button", { name: "Create prep workspace" }).click();
    await page.waitForURL(/\/sessions\/[^/]+\/prep$/);
    sessionUrls.push(page.url());
  }

  await page.goto(`${root}/threads`); await page.getByRole("link", { name: threadName, exact: true }).click();
  await page.getByLabel("Session context").selectOption({ label: "Session 1 · Session 1" });
  await page.getByLabel("Thread state").selectOption("loose"); await page.getByRole("button", { name: "Save Thread" }).click();
  await expect(page.getByRole("status")).toContainText("Saved");

  await page.getByLabel("Session context").selectOption({ label: "Session 2 · Session 2" });
  await page.getByLabel("Thread state").selectOption("active"); await page.getByRole("button", { name: "Save Thread" }).click();
  for (const [index, objective] of ["Find the hidden map", "Cross the bridge"].entries()) {
    await page.getByLabel("New objective").fill(objective); await page.getByRole("button", { name: "Add objective" }).click();
    await expect(page.getByLabel(`Objective ${index + 1}`)).toHaveValue(objective);
  }
  await page.getByLabel("Objective 2").fill("Cross the moonlit bridge"); await page.getByLabel("Objective 2").blur();

  await page.getByLabel("Session context").selectOption({ label: "Session 3 · Session 3" });
  await page.getByRole("button", { name: "Complete Find the hidden map" }).click();
  await expect(page.getByRole("button", { name: "Reopen Find the hidden map" })).toBeVisible();
  await page.getByLabel("Session context").selectOption({ label: "Session 4 · Session 4" });
  await page.getByRole("button", { name: "Reopen Find the hidden map" }).click();
  await page.getByRole("button", { name: "Move Cross the moonlit bridge up" }).click();

  await page.getByRole("combobox", { name: "Related record" }).selectOption({ label: `${characterName} · character` });
  await page.getByRole("button", { name: "Add related entity" }).click();
  await expect(page.getByRole("link", { name: characterName })).toBeVisible();

  await page.goto(sessionUrls[3]);
  await page.getByRole("checkbox", { name: threadName }).check();
  await page.getByRole("button", { name: "Save prep" }).click();

  await page.goto(`${root}/threads`); await page.getByRole("link", { name: threadName, exact: true }).click();
  await page.getByLabel("Session context").selectOption({ label: "Session 5 · Session 5" });
  await expect(page.getByLabel("Session context")).not.toHaveValue("");
  await page.getByLabel("Thread state").selectOption("failed");
  await page.getByLabel("Resolution details").fill("The party abandoned the crown beneath the bridge.");
  await page.getByRole("button", { name: "Save Thread" }).click();
  await page.reload();

  const timeline = page.getByRole("region", { name: "Thread timeline" });
  for (const label of ["Thread marked Loose", "Thread became Active", "Objective completed", "Objective reopened", "Thread carried into Session", "Thread failed"]) await expect(timeline.getByText(label, { exact: true })).toBeVisible();
  const sessionNumbers = await timeline.locator("article .timeline-session").allTextContents();
  const order = sessionNumbers.map((text) => text === "Between Sessions" ? 0 : Number(/Session (\d+)/.exec(text)?.[1] ?? 999));
  expect(order).toEqual([...order].sort((a, b) => a - b));
  await expect(timeline.getByRole("button")).toHaveCount(0);

  await page.goto(`${root}/threads`);
  await expect(page.getByRole("region", { name: "Failed Threads" }).getByText(threadName)).toBeVisible();

  for (const viewport of [{ width: 1440, height: 900 }, { width: 1024, height: 768 }, { width: 768, height: 1024 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport); await page.goto(`${root}/threads`); await page.getByRole("link", { name: threadName, exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  }
});

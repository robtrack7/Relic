import { expect, test } from "@playwright/test";

test.skip(process.env.RELIC_E2E_AUTH !== "1", "Requires the completed deterministic D3 browser fixture.");

test("D3 five-Session Thread timeline survives an application restart", async ({ page }) => {
  await page.goto("/auth/sign-in");
  await page.getByLabel("Email").fill("d3-browser@example.test");
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/app(?:\/|$)/, { timeout: 15_000 });
  await page.getByRole("link", { name: "Threads", exact: true }).click();
  await page.getByRole("link", { name: "The Glass Crown", exact: true }).click();

  await expect(page.getByLabel("Thread state")).toHaveValue("failed");
  await expect(page.getByLabel("Resolution details")).toHaveValue("The party abandoned the crown beneath the bridge.");
  const timeline = page.getByRole("region", { name: "Thread timeline" });
  for (const label of ["Thread marked Loose", "Thread became Active", "Objective completed", "Objective reopened", "Thread carried into Session", "Thread failed"]) {
    await expect(timeline.getByText(label, { exact: true })).toBeVisible();
  }
  await expect(page.getByRole("link", { name: "Mara Vale" })).toBeVisible();
});

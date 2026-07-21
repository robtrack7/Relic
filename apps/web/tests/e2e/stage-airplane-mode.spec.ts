import { expect, test } from "@playwright/test";

test.skip(process.env.RELIC_E2E_AUTH !== "1", "Requires local Supabase and RELIC_E2E_AUTH=1.");

test("Stage replays start to end exactly once after an offline reload and reconnect", async ({ page }) => {
  test.setTimeout(120_000);

  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, "onLine", {
      configurable: true,
      get: () => localStorage.getItem("relic-e2e-offline") !== "1",
    });
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: async () => ({ getTracks: () => [{ stop: () => undefined }] }) },
    });
    class RelicFakeMediaRecorder extends EventTarget {
      state = "inactive";
      mimeType = "audio/webm";
      start() { this.state = "recording"; }
      stop() {
        this.dispatchEvent(Object.assign(new Event("dataavailable"), { data: new Blob(["offline-stage-audio"], { type: this.mimeType }) }));
        this.state = "inactive";
        this.dispatchEvent(new Event("stop"));
      }
    }
    Object.defineProperty(window, "MediaRecorder", { configurable: true, value: RelicFakeMediaRecorder });
  });

  const runId = Date.now();
  const sagaName = `B2 Airplane Saga ${runId}`;
  const email = `b2-${runId}@example.test`;

  await page.goto("/auth/sign-up");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: "Create account" }).click();
  const signInHeading = page.getByRole("heading", { name: "Sign in" });
  const newSagaHeading = page.getByRole("heading", { name: "Create a playable start" });
  await Promise.race([
    signInHeading.waitFor({ state: "visible", timeout: 5_000 }).catch(() => undefined),
    newSagaHeading.waitFor({ state: "visible", timeout: 5_000 }).catch(() => undefined),
  ]);
  if (await signInHeading.isVisible().catch(() => false)) {
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/app(?:\/|$)/, { timeout: 10_000 });
  }

  await page.goto("/app/new-saga");
  await page.getByLabel("Saga name").fill(sagaName);
  await page.getByLabel("Game system").fill("System test");
  await page.getByLabel("New World name").fill(`${sagaName} World`);
  await page.getByRole("button", { name: "Create blank saga" }).click();
  await expect(page.getByRole("heading", { name: sagaName })).toBeVisible();
  const sagaRoot = page.url();

  await page.goto(`${sagaRoot}/entities/new?type=character`);
  await page.getByLabel("Name / title").fill("Mara Vale");
  await page.getByLabel("Summary").fill("Harbor witness cached for literal search.");
  await page.getByLabel("Narrative / body").fill("Mara saw the flooded archive open.");
  await page.getByRole("button", { name: /Create .*/ }).click();

  await page.goto(sagaRoot);
  const plan = page.getByRole("button", { name: "Plan Session 1" });
  if (await plan.isVisible().catch(() => false)) {
    await page.getByPlaceholder("What should the first session accomplish?").fill("Prove the B2 airplane-mode loop.");
    await plan.click();
  } else {
    await page.getByRole("link", { name: "Continue prep" }).first().click();
  }
  await page.getByLabel("Objective").fill("Reach the flooded archive.");
  await page.getByLabel("Opening scene").fill("Rain covers the harbor.");
  await page.getByRole("button", { name: "Save prep" }).click();
  await page.getByRole("button", { name: /Ready for Stage|Open in Stage/ }).click();
  await expect(page).toHaveURL(/\/stage(?:\?|$)/);
  const stageUrl = page.url();

  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1024, height: 768 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    const actions = page.getByRole("navigation", { name: "Stage actions" });
    await expect(actions).toBeVisible();
    await expect(actions.getByRole("button", { name: "Note" })).toBeVisible();
    await expect(actions.getByRole("button", { name: "Dice" })).toBeVisible();
    await expect(actions.getByRole("button", { name: "Create" })).toBeVisible();
    await expect(actions.getByRole("button", { name: "Record" })).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  await page.setViewportSize({ width: 1280, height: 800 });

  await expect.poll(() => page.evaluate(async () => {
    const request = indexedDB.open("relic-stage-offline");
    const db = await new Promise<IDBDatabase>((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    return await new Promise<number>((resolve, reject) => {
      const count = db.transaction("snapshots", "readonly").objectStore("snapshots").count();
      count.onsuccess = () => resolve(count.result); count.onerror = () => reject(count.error);
    });
  })).toBe(1);

  await page.evaluate(() => { localStorage.setItem("relic-e2e-offline", "1"); window.dispatchEvent(new Event("offline")); });
  await expect(page.getByText("Offline · packet cached")).toBeVisible();

  await page.getByRole("button", { name: "Start Session" }).click();
  await expect(page.getByRole("button", { name: "Go live" })).toBeVisible();

  await page.getByRole("button", { name: "Note" }).click();
  await page.getByLabel(/Title/).fill("Offline witness note");
  await page.getByPlaceholder("What happened? What do you want to remember?").fill("The archive door opened while the network was gone.");
  await page.getByRole("button", { name: "Save Note" }).click();

  await page.getByRole("button", { name: "Create" }).click();
  const create = page.getByRole("dialog", { name: "Create" });
  await create.getByRole("button", { name: /^Thread/ }).click();
  await create.getByLabel("Name").fill("The Offline Witness");
  await create.getByLabel(/Short note/).fill("A local stub that must replay once.");
  await create.getByRole("button", { name: "Create Thread" }).click();

  await page.getByRole("button", { name: "Record" }).click();
  await page.getByRole("button", { name: "Yes, start recording" }).click();
  await expect(page.getByRole("navigation", { name: "Stage actions" }).getByRole("button", { name: "Recording", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Note" }).click();
  await page.getByPlaceholder("decision, lie, secret…").fill("decision");
  await page.getByRole("button", { name: "Mark moment" }).click();

  await page.getByRole("button", { name: "End Session" }).click();
  await page.getByRole("dialog", { name: "End Session" }).getByRole("button", { name: "End Session", exact: true }).click();
  await page.getByRole("button", { name: "Yes, end session" }).click();
  await expect(page.getByText("Session ended")).toBeVisible();

  await page.reload();
  await expect(page.getByText("Offline · packet cached")).toBeVisible();
  await expect(page.getByText("Session ended")).toBeVisible();
  await page.getByRole("searchbox", { name: "Search saga during play" }).fill("Offline Witness");
  await page.getByRole("searchbox", { name: "Search saga during play" }).press("Enter");
  await expect(page.getByRole("region", { name: "Saga search results" }).getByText("The Offline Witness")).toBeVisible();

  const queuedBeforeReconnect = await page.evaluate(async () => {
    async function count(dbName: string, storeName: string) {
      const request = indexedDB.open(dbName);
      const db = await new Promise<IDBDatabase>((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
      return await new Promise<number>((resolve, reject) => {
        const result = db.transaction(storeName, "readonly").objectStore(storeName).count();
        result.onsuccess = () => resolve(result.result); result.onerror = () => reject(result.error);
      });
    }
    return { writes: await count("relic-stage-writes", "intents"), audio: await count("relic-stage-audio", "chunks") };
  });
  expect(queuedBeforeReconnect).toEqual({ writes: 7, audio: 1 });

  await page.evaluate(() => { localStorage.removeItem("relic-e2e-offline"); window.dispatchEvent(new Event("online")); });
  await expect(page.getByText(/Writes synced|Writes recovered/)).toBeVisible({ timeout: 20_000 });
  await expect.poll(() => page.evaluate(async () => {
    const request = indexedDB.open("relic-stage-audio");
    const db = await new Promise<IDBDatabase>((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    return await new Promise<{ finalizationCompleted: boolean; lastError: string | null }>((resolve, reject) => {
      const result = db.transaction("sessions", "readonly").objectStore("sessions").getAll();
      result.onsuccess = () => resolve({ finalizationCompleted: Boolean(result.result[0]?.finalizationCompleted), lastError: result.result[0]?.lastError ?? null });
      result.onerror = () => reject(result.error);
    });
  }), { timeout: 20_000 }).toEqual({ finalizationCompleted: true, lastError: null });
  await expect(page.getByText(/Synced|Recovered/).first()).toBeVisible();
  await expect(page.getByText(/Conflict ·/)).toHaveCount(0);

  await page.reload();
  const loom = page.getByRole("complementary", { name: "The Loom" });
  await expect(loom.getByText("1 scene captures")).toBeVisible();
  await expect(loom.getByText("1 marked moments")).toBeVisible();

  await page.goto(`${sagaRoot}/entities`);
  await expect(page.locator(".entity-card", { hasText: "The Offline Witness" })).toHaveCount(1);
  await expect(page.locator(".entity-card", { hasText: "Offline witness note" })).toHaveCount(1);

  await page.goto(stageUrl);
  await page.reload();
  await expect(page.getByRole("complementary", { name: "The Loom" }).getByText("1 scene captures")).toBeVisible();
  await expect(page.getByRole("complementary", { name: "The Loom" }).getByText("1 marked moments")).toBeVisible();
});

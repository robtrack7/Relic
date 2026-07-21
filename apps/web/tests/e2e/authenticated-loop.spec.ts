import { expect, test } from "@playwright/test";

test.skip(process.env.RELIC_E2E_AUTH !== "1", "Requires local Supabase and RELIC_E2E_AUTH=1.");

test("new GM can exercise the full manual MVP loop from sign-up through Stage", async ({ page }) => {
  test.setTimeout(90_000);

  const runId = Date.now();
  const sagaName = `E2E Saga ${runId}`;
  const email = `e2e-${runId}@example.test`;
  const password = "password";
  const entityLabels = {
    character: "Character",
    place: "Place",
    faction: "Faction",
    artifact: "Artifact",
    thread: "Thread",
    note: "Note",
  } as const;

  async function createEntity(
    sagaRoot: string,
    type: "character" | "place" | "faction" | "artifact" | "thread" | "note",
    name: string,
    summary: string,
    narrative: string,
    gmNotes = ""
  ) {
    await page.goto(`${sagaRoot}/entities/new?type=${type}`);
    await expect(page.locator(".page-title")).toHaveText(`New ${entityLabels[type]}`);
    await page.getByLabel("Name / title").fill(name);
    await page.getByLabel("Summary").fill(summary);
    await page.getByLabel("Narrative / body").fill(narrative);
    if (gmNotes) {
      await page.getByLabel("GM notes").fill(gmNotes);
    }
    await page.getByRole("button", { name: new RegExp(`Create .*`, "i") }).click();
    await expect(page.getByRole("heading", { name })).toBeVisible();
    return page.url();
  }

  async function quickCreate(label: string, name: string, summary: string) {
    await page.getByRole("button", { name: "Create" }).click();
    const dialog = page.getByRole("dialog", { name: "Create" });
    await dialog.getByRole("button", { name: new RegExp(`^${label}`) }).click();
    await dialog.getByLabel("Name").fill(name);
    await dialog.getByLabel(/Short note/).fill(summary);
    await dialog.getByRole("button", { name: `Create ${label}` }).click();
    await expect(dialog).toBeHidden();
  }

  await page.goto("/auth/sign-up");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();

  const signInHeading = page.getByRole("heading", { name: "Sign in" });
  const newSagaHeading = page.getByRole("heading", { name: "Create a playable start" });
  await Promise.race([
    signInHeading.waitFor({ state: "visible", timeout: 5_000 }).catch(() => undefined),
    newSagaHeading.waitFor({ state: "visible", timeout: 5_000 }).catch(() => undefined)
  ]);

  if (await signInHeading.isVisible().catch(() => false)) {
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
  }

  await page.goto("/app/new-saga");

  await expect(page.getByRole("heading", { name: "Create a playable start" })).toBeVisible();
  await page.getByLabel("Saga name").fill(sagaName);
  await page.getByLabel("Game system").fill("System test");
  await page.getByLabel("New World name").fill(`${sagaName} World`);
  await page.getByRole("button", { name: "Create blank saga" }).click();

  await expect(page.getByRole("heading", { name: sagaName })).toBeVisible();
  const sagaRoot = page.url();
  await expect(page.getByRole("link", { name: "Library", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Prepare", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sessions", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "No session", exact: true })).toBeVisible();

  const characterUrl = await createEntity(
    sagaRoot,
    "character",
    "Seraphine Vale",
    "A careful archivist with a dangerous promise.",
    "Seraphine knows where the sealed letter is hidden.",
    "Voice: quiet and precise\nWants: keep the archive sealed"
  );
  await createEntity(
    sagaRoot,
    "place",
    "Moonwell Archive",
    "A flooded archive under the old chapel.",
    "The archive door opens when the sealed letter is read aloud."
  );
  await createEntity(
    sagaRoot,
    "faction",
    "Amber Court",
    "A court of patrons hunting the old betrayal.",
    "They believe the letter can restore their claim."
  );
  await createEntity(
    sagaRoot,
    "artifact",
    "Glass Key",
    "A fragile key that remembers every lock.",
    "The Glass Key hums near the archive."
  );
  await createEntity(
    sagaRoot,
    "note",
    "Archive safety lines",
    "Consent and table safety notes for the archive session.",
    "Keep horror suggestive, pause on claustrophobia, and ask before memory loss scenes."
  );
  const threadEntityUrl = await createEntity(
    sagaRoot,
    "thread",
    "The sealed letter",
    "A letter keeps pulling danger toward the archive.",
    "The letter names an old betrayal."
  );

  const threadId = threadEntityUrl.match(/\/entities\/thread\/([^/]+)$/)?.[1];
  expect(threadId).toBeTruthy();
  await page.goto(`${sagaRoot}/threads/${threadId}`);
  await expect(page.getByRole("heading", { name: "The sealed letter" })).toBeVisible();
  await page.getByLabel("Add objective").fill("Recover the sealed letter.");
  await page.getByRole("button", { name: "Add objective" }).click();
  await expect(page.getByText("Recover the sealed letter.")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Recover the sealed letter.")).toBeVisible();

  await page.goto(`${sagaRoot}/entities`);
  await expect(page.locator(".page-title")).toHaveText("Library");
  for (const name of ["Seraphine Vale", "Moonwell Archive", "Amber Court", "Glass Key", "Archive safety lines", "The sealed letter"]) {
    await expect(page.getByRole("link", { name: new RegExp(name) })).toBeVisible();
  }

  await page.goto(`${sagaRoot}/search?q=Glass%20Key`);
  await expect(page.locator(".page-title")).toHaveText("Search");
  await expect(page.getByText("Glass Key")).toBeVisible();

  await page.goto(`${sagaRoot}/settings`);
  await expect(page.locator(".page-title")).toHaveText(sagaName);
  await expect(page.getByText("Usage", { exact: true }).first()).toBeVisible();
  await page.getByRole("link", { name: "Open export" }).click();
  await expect(page.locator(".page-title")).toHaveText(`Export ${sagaName}`);
  await expect(page.getByText("No export selected")).toBeVisible();

  await page.goto(`${sagaRoot}/review`);
  await expect(page.locator(".page-title")).toHaveText("Approval Queue");
  await expect(page.getByText("Queue is clear")).toBeVisible();

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
  await page.getByLabel("Moonwell Archive").check();
  await page.getByLabel("Amber Court").check();
  await page.getByLabel("Glass Key").check();
  await page.getByLabel("The sealed letter").check();
  await page.getByLabel("Objective").fill("Recover the sealed letter before the Amber Court arrives.");
  await page.getByLabel("Opening scene").fill("Rain taps on the archive skylight.");
  await page.getByLabel("Scene notes").fill("Offer a quiet clue, then show the door reacting to the Glass Key.");
  await page.getByLabel("One item per line").fill("Confirm consent\nSet the archive clock\nPut the Glass Key on the table");
  await page.getByRole("button", { name: "Save prep" }).click();
  await expect(page.locator(".cl-text", { hasText: "Put the Glass Key on the table" })).toBeVisible();

  await page.goto(`${sagaRoot}/sessions`);
  await expect(page.locator(".page-title")).toHaveText("Sessions");
  await expect(page.getByText("Recover the sealed letter before the Amber Court arrives.")).toBeVisible();
  await page.locator('a[href$="/prep"]', { hasText: "Prepare" }).first().click();
  await expect(page.locator(".cl-text", { hasText: "Put the Glass Key on the table" })).toBeVisible();

  const readyOrOpen = page.getByRole("button", { name: /Ready for Stage|Open in Stage/ });
  await readyOrOpen.click();

  await expect(page).toHaveURL(/\/stage(?:\?|$)/);
  await expect(page.getByRole("heading", { name: /Session|Next session/ })).toBeVisible();
  await expect(page.getByRole("region", { name: "Agenda" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Start Session|Go live/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Note" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Dice" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Create" })).toBeVisible();
  await expect(page.getByRole("button", { name: "End Session" })).toBeVisible();
  await expect(page.getByLabel("Pinned entities").getByText("Seraphine Vale")).toBeVisible();
  await expect(page.getByLabel("Pinned entities").getByText("Moonwell Archive")).toBeVisible();
  await expect(page.getByRole("complementary", { name: "The Loom" })).toBeVisible();

  const activeThreads = page.getByRole("region", { name: "Active Threads" });
  await expect(activeThreads.getByText("The sealed letter")).toBeVisible();
  await expect(activeThreads.getByText("A letter keeps pulling danger toward the archive.")).toBeVisible();
  await expect(activeThreads.getByText("1 objective")).toBeVisible();
  await expect(activeThreads.getByRole("button")).toHaveCount(0);
  await expect(activeThreads.getByRole("link")).toHaveCount(0);

  const stageBrowserErrors: string[] = [];
  const recordConsoleError = (message: { type(): string; text(): string }) => {
    if (message.type() === "error") stageBrowserErrors.push(message.text());
  };
  const recordPageError = (error: Error) => stageBrowserErrors.push(error.message);
  page.on("console", recordConsoleError);
  page.on("pageerror", recordPageError);

  for (const viewport of [
    { name: "desktop", width: 1440, height: 900 },
    { name: "laptop", width: 1024, height: 768 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "mobile", width: 390, height: 844 }
  ]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await expect(page.getByLabel("Stage identity")).toBeVisible();
    await expect(page.getByRole("region", { name: "Active Threads" }).getByText("The sealed letter")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Stage actions" }).getByRole("button")).toHaveCount(5);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await page.screenshot({ path: `../../output/playwright/stage-a3-${viewport.name}.png` });
  }

  page.off("console", recordConsoleError);
  page.off("pageerror", recordPageError);
  expect(stageBrowserErrors).toEqual([]);
  await page.setViewportSize({ width: 1280, height: 720 });

  await page.getByRole("button", { name: "Start Session" }).click();
  await expect(page.getByRole("button", { name: "Go live" })).toBeVisible();
  await page.getByRole("button", { name: "Go live" }).click();
  await expect(page.getByText("Live", { exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: "Record" }).click();
  await expect(page.getByRole("dialog", { name: "Recording" })).toBeVisible();
  await expect(page.getByText(/Completed chunks are saved locally before upload/)).toBeVisible();
  await page.getByRole("button", { name: "Close Recording" }).click();

  await page.getByRole("button", { name: "Note" }).click();
  const noteBody = page.getByPlaceholder("What happened? What do you want to remember?");
  await noteBody.fill("The archive door");
  await page.waitForTimeout(1_100);
  await expect(noteBody).toBeFocused();
  await noteBody.pressSequentially(" opened by itself.");
  await page.getByRole("button", { name: "Save Note" }).click();
  await page.reload();
  await expect(page.getByText("Live", { exact: true }).first()).toBeVisible();

  const stageUrl = page.url();
  const stageCreates = [
    { label: "NPC", type: "character", name: "Mira Fen", summary: "A messenger seen at the archive.", stub: true },
    { label: "Location", type: "place", name: "Tideglass Pier", summary: "A moonlit landing below the archive.", stub: true },
    { label: "Item", type: "artifact", name: "Brass Compass", summary: "Its needle points toward broken promises.", stub: true },
    { label: "Thread", type: "thread", name: "The Missing Courier", summary: "The courier never reached the archive.", stub: true },
    { label: "Note", type: "note", name: "Harbor Witness", summary: "A messenger saw the exchange.", stub: false },
    { label: "Faction", type: "faction", name: "Brass Assembly", summary: "Dockworkers guarding an old compact.", stub: true }
  ];

  for (const item of stageCreates) {
    await quickCreate(item.label, item.name, item.summary);
  }

  await page.goto(`${sagaRoot}/entities`);
  await page.reload();
  for (const item of stageCreates) {
    const card = page.locator(".entity-card", { hasText: item.name });
    await expect(card).toBeVisible();
    await expect(card.locator(".entity-eyebrow")).toHaveText(`${item.type}${item.stub ? " · stub" : ""}`);
    await expect(card.locator(".entity-desc")).toHaveText(item.summary);
  }

  await page.goto(stageUrl);
  await expect(page.getByText("Live", { exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: "Dice" }).click();
  const diceDialog = page.getByRole("dialog", { name: "Dice" });
  await diceDialog.getByRole("button", { name: /d20/ }).first().click();
  await expect(diceDialog.getByRole("group", { name: "d20 roll mode" })).toBeVisible();
  const diceModifier = diceDialog.getByRole("spinbutton");
  await diceModifier.fill("2");
  await page.waitForTimeout(1_100);
  await expect(diceModifier).toBeFocused();
  await diceModifier.fill("0");
  const rollButton = diceDialog.getByRole("button", { name: "Roll", exact: true });
  await rollButton.click();
  await expect(diceDialog.locator(".stage-v2-roll-result")).toBeVisible();
  await expect(rollButton).toBeEnabled();
  await diceDialog.getByRole("button", { name: /Disadvantage/ }).click();
  await rollButton.click();
  await expect(rollButton).toBeEnabled();
  await diceDialog.getByRole("button", { name: /Advantage/ }).click();
  await diceDialog.getByRole("button", { name: "Pin to board" }).click();
  const pinnedDice = page.getByRole("complementary", { name: "Pinned dice widget" });
  await expect(pinnedDice).toBeVisible();
  await pinnedDice.getByRole("button", { name: "Roll" }).click();
  await expect(pinnedDice.locator("strong")).toHaveText(/\d+/);
  await page.reload();
  const loom = page.getByRole("complementary", { name: "The Loom" });
  await expect(loom.getByText(/1d20 = \d+/)).toBeVisible();
  await expect(loom.getByText(/1d20 \(disadvantage\) = \d+/)).toBeVisible();
  await expect(loom.getByText(/Pinned roll · 1d20 \(advantage\) = \d+/)).toBeVisible();

  await page.getByRole("searchbox", { name: "Search saga during play" }).fill("Mira Fen");
  await page.getByRole("searchbox", { name: "Search saga during play" }).press("Enter");
  await expect(page.getByText("Mira Fen")).toBeVisible();

  await page.getByRole("button", { name: "End Session" }).click();
  await page.getByRole("dialog", { name: "End Session" }).getByRole("button", { name: "End Session", exact: true }).click();
  const confirmEnd = page.getByRole("button", { name: "Yes, end session" });
  await confirmEnd.focus();
  await page.waitForTimeout(1_100);
  await expect(confirmEnd).toBeFocused();
  await confirmEnd.click();
  await expect(page.getByText("Session ended")).toBeVisible();
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByText("Live", { exact: true }).first()).toBeVisible();

  await page.goto(characterUrl);
  await expect(page.getByRole("heading", { name: "Seraphine Vale" })).toBeVisible();
  await page.getByLabel("Summary").fill("A careful archivist who chose to trust the party.");
  await expect(page.getByRole("status")).toContainText("Unsaved");
  await expect(page.getByRole("status")).toContainText("Saved", { timeout: 5_000 });
  await page.reload();
  await expect(page.getByLabel("Summary")).toHaveValue("A careful archivist who chose to trust the party.");
});

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

  await page.getByRole("button", { name: "Create" }).click();
  await page.getByRole("dialog", { name: "Create" }).getByRole("button", { name: /NPC/ }).click();
  await page.getByPlaceholder("Name this npc…").fill("Mira Fen");
  const quickCreateSummary = page.getByPlaceholder("What matters at the table?");
  await quickCreateSummary.fill("A messenger seen");
  await page.waitForTimeout(1_100);
  await expect(quickCreateSummary).toBeFocused();
  await quickCreateSummary.pressSequentially(" at the archive.");
  await page.getByRole("button", { name: "Create NPC" }).click();

  await page.getByRole("button", { name: "Dice" }).click();
  await page.getByRole("dialog", { name: "Dice" }).getByRole("button", { name: /d6/ }).first().click();
  await page.getByRole("dialog", { name: "Dice" }).getByRole("button", { name: /d6/ }).first().click();
  const diceModifier = page.getByRole("dialog", { name: "Dice" }).getByRole("spinbutton");
  await diceModifier.fill("2");
  await page.waitForTimeout(1_100);
  await expect(diceModifier).toBeFocused();
  await diceModifier.fill("0");
  await page.getByRole("button", { name: "Roll", exact: true }).click();
  await expect(page.locator(".stage-v2-roll-result")).toBeVisible();
  await page.getByRole("button", { name: "Done" }).click();
  await page.reload();
  await expect(page.getByRole("complementary", { name: "The Loom" }).getByText(/2d6 = \d+/)).toBeVisible();

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
  await page.getByRole("button", { name: "Save manual edit" }).click();
  await expect(page.getByText("A careful archivist who chose to trust the party.")).toBeVisible();
});

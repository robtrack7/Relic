import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.API_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.ANON_KEY;
const ids = { workspaceId: "e5200000-0000-0000-0000-000000000001", worldId: "e5300000-0000-0000-0000-000000000001", sagaId: "e5400000-0000-0000-0000-000000000001" };
const sagaRoot = `/app/w/${ids.workspaceId}/world/${ids.worldId}/saga/${ids.sagaId}`;

test.skip(process.env.RELIC_E2E_AUTH !== "1" || !supabaseUrl || !publishableKey, "Requires the local C5 browser fixture and public Supabase environment.");

test("C5 completes the source-aware Approval Queue trust flow and preserves unresolved state", async ({ page }) => {
  test.setTimeout(120_000);
  const verifier = createClient(supabaseUrl!, publishableKey!, { auth: { persistSession: false, autoRefreshToken: false } });
  expect((await verifier.auth.signInWithPassword({ email: "c5-browser@example.test", password: "password" })).error).toBeNull();

  await page.goto("/auth/sign-in");
  await page.getByLabel("Email").fill("c5-browser@example.test");
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/app(?:\/|$)/, { timeout: 15_000 });
  await page.goto(`${sagaRoot}/review`);

  const summaryCard = page.getByRole("article", { name: "Session 1 Summary create proposal" });
  await summaryCard.getByText("GM manual summary").click();
  await expect(summaryCard.getByText("Mara opened the glass bridge and the old keeper left.")).toBeVisible();
  await summaryCard.getByLabel("New body").fill("GM-edited summary: Mara opened the glass bridge.");
  await summaryCard.getByRole("button", { name: "Approve proposal" }).click();
  await expect(summaryCard).toHaveCount(0);

  let queue = await verifier.rpc("get_approval_queue", { workspace_id: ids.workspaceId, world_id: ids.worldId, saga_id: ids.sagaId });
  expect(queue.error).toBeNull();
  let summary = (queue.data as Array<Record<string, unknown>>).find((draft) => draft.id === "e5900000-0000-0000-0000-000000000001")!;
  expect(summary.state).toBe("approved");
  expect((summary.target as { payload: { body: string } }).payload.body).toBe("GM-edited summary: Mara opened the glass bridge.");
  const audit = summary.audit as { action: string; source_ids: string[]; change_summary: { provenance: { pipeline_run_id: string } } };
  expect(audit.action).toBe("edit_and_approve");
  expect(audit.source_ids).toEqual(["e5800000-0000-0000-0000-000000000001"]);
  expect(audit.change_summary.provenance.pipeline_run_id).toBe("e5700000-0000-0000-0000-000000000001");

  let staleCard = page.getByRole("article", { name: "Mara Vale update proposal" });
  await expect(staleCard.getByText(/Canon changed after this proposal/)).toBeVisible();
  await staleCard.getByRole("button", { name: "Refresh against current canon" }).click();
  staleCard = page.getByRole("article", { name: "Mara Vale update proposal" });
  await expect(staleCard.getByText("Changed by the GM elsewhere")).toBeVisible();
  await staleCard.getByRole("button", { name: "Approve proposal" }).click();
  await expect(staleCard).toHaveCount(0);

  const archiveCard = page.getByRole("article", { name: "Old Keeper archive_request proposal" });
  await expect(archiveCard.getByText(/does not delete data/i)).toBeVisible();
  await archiveCard.getByRole("checkbox", { name: "Archive this record without deleting it." }).check();
  await archiveCard.getByRole("button", { name: "Approve proposal" }).click();
  await expect(archiveCard).toHaveCount(0);

  queue = await verifier.rpc("get_approval_queue", { workspace_id: ids.workspaceId, world_id: ids.worldId, saga_id: ids.sagaId });
  const effects = new Map((queue.data as Array<Record<string, unknown>>).map((draft) => [draft.id, draft]));
  expect((effects.get("e5900000-0000-0000-0000-000000000002")?.target as { payload: { summary: string } }).payload.summary).toBe("After the glass bridge");
  expect((effects.get("e5900000-0000-0000-0000-000000000003")?.target as { canon_state: string }).canon_state).toBe("archived");

  for (const viewport of [{ width: 1440, height: 900 }, { width: 1024, height: 768 }, { width: 768, height: 1024 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await page.reload();
    await expect(page.getByRole("article", { name: "Who forged the bridge? create proposal" })).toBeVisible();
    const overflow = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, viewport: window.innerWidth }));
    expect(overflow.page, `Approval Queue overflowed at ${viewport.width}×${viewport.height}`).toBeLessThanOrEqual(overflow.viewport);
  }

  await page.goto(`${sagaRoot}/sessions/e5500000-0000-0000-0000-000000000001/review`);
  await page.goto(`${sagaRoot}/review`);
  await expect(page.getByRole("article", { name: "Who forged the bridge? create proposal" })).toBeVisible();
  queue = await verifier.rpc("get_approval_queue", { workspace_id: ids.workspaceId, world_id: ids.worldId, saga_id: ids.sagaId });
  expect((queue.data as Array<Record<string, unknown>>).find((draft) => draft.id === "e5900000-0000-0000-0000-000000000004")?.state).toBe("pending");
});

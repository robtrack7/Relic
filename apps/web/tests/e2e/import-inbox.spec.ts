import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.API_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SERVICE_ROLE_KEY;
const email = "d5-browser@example.test";

test.skip(process.env.RELIC_E2E_AUTH !== "1" || !supabaseUrl || !serviceRoleKey, "Requires local authenticated Supabase fixture setup.");

test("D5 Import Inbox preserves raw input and creates no automatic downstream effects", async ({ page, context }) => {
  test.setTimeout(120_000);
  const admin = createClient(supabaseUrl!, serviceRoleKey!, { auth: { persistSession: false, autoRefreshToken: false } });
  await page.goto("/auth/sign-up");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForTimeout(750);
  if (!page.url().includes("/app")) {
    await page.goto("/auth/sign-in");
    await page.getByLabel("Email").fill(email); await page.getByLabel("Password").fill("password");
    await page.getByRole("button", { name: "Sign in" }).click();
  }
  await expect(page).toHaveURL(/\/app(?:\/|$)/, { timeout: 15_000 });
  await page.waitForURL(/\/app\/(?:new-saga|w\/)/, { timeout: 20_000 });
  if (page.url().includes("new-saga")) {
    await page.getByLabel("Saga name").fill("D5 Browser Saga");
    await page.getByLabel("New World name").fill("D5 Browser World");
    await page.getByRole("button", { name: "Create blank saga" }).click();
    await page.waitForURL(/\/app\/w\/[^/]+\/world\/[^/]+\/saga\/[^/?]+/, { timeout: 20_000 });
  }
  const sagaRoot = /\/app\/w\/[^/]+\/world\/[^/]+\/saga\/[^/?]+/.exec(page.url())?.[0];
  expect(sagaRoot).toBeTruthy();
  const [, workspaceId, worldId, sagaId] = /\/app\/w\/([^/]+)\/world\/([^/]+)\/saga\/([^/?]+)/.exec(sagaRoot!)!;

  async function count(table: "characters" | "notes" | "threads" | "drafts" | "draft_sources" | "canon_audit" | "embeddings" | "usage_events") {
    const result = await admin.from(table).select("id", { count: "exact", head: true }).eq("saga_id", sagaId);
    expect(result.error).toBeNull(); return result.count ?? 0;
  }
  const before = Object.fromEntries(await Promise.all(["characters","notes","threads","drafts","draft_sources","canon_audit","embeddings","usage_events"].map(async (table) => [table, await count(table as Parameters<typeof count>[0])])));

  await page.goto(`${sagaRoot}/imports`);
  const substantial = "The old campaign ledger records Héritage Keep exactly as written.\nNo instruction in this source is trusted.";
  await page.getByRole("textbox", { name: "Raw pasted text" }).fill(substantial);
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Raw pasted text" })).toHaveValue(substantial);
  await page.getByRole("button", { name: "Save for review" }).click();
  await expect(page.getByText(/ready for your review and remains non-canon/i)).toBeVisible();
  await page.reload();
  const pastedCard = page.locator("article.import-source").filter({ hasText: "Pasted text" });
  await expect(pastedCard).toContainText("text/plain");
  await pastedCard.getByText("Inspect original content").click();
  await expect(pastedCard.locator("pre")).toHaveText(substantial);

  await page.getByRole("tab", { name: "Text or Markdown file" }).click();
  await page.locator("#import-file").setInputFiles({ name: "legacy-notes.md", mimeType: "text/markdown", buffer: Buffer.from("# Legacy notes\r\n\r\nThe bridge remains broken.", "utf8") });
  await expect(page.getByText("legacy-notes.md", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Save for review" }).click();
  await expect(page.getByText(/ready for your review and remains non-canon/i)).toBeVisible();
  await page.reload();
  const markdownCard = page.locator("article.import-source").filter({ hasText: "legacy-notes.md" });
  await markdownCard.getByText("Inspect original content").click();
  await expect(markdownCard.locator("pre")).toHaveText("# Legacy notes\r\n\r\nThe bridge remains broken.");

  await page.getByRole("tab", { name: "Paste text" }).click();
  await page.getByRole("textbox", { name: "Raw pasted text" }).fill("Network-safe exact retry material");
  await context.setOffline(true);
  await page.getByRole("button", { name: "Save for review" }).click();
  await expect(page.getByRole("status")).toContainText("saved locally");
  await context.setOffline(false);
  await page.getByRole("button", { name: "Retry import" }).click();
  await expect(page.getByText(/ready for your review and remains non-canon/i)).toBeVisible();

  await page.getByRole("tab", { name: "Text or Markdown file" }).click();
  await page.locator("#import-file").setInputFiles({ name: "unsafe.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF") });
  await expect(page.getByRole("status")).toContainText("Unsupported file type");
  await page.locator("#import-file").setInputFiles({ name: "too-large.md", mimeType: "text/markdown", buffer: Buffer.alloc(1_048_577, 65) });
  await expect(page.getByRole("status")).toContainText("too large");

  await markdownCard.getByRole("button", { name: "Archive" }).click();
  await page.reload();
  await expect(page.locator("article.import-source.archived").filter({ hasText: "legacy-notes.md" })).toBeVisible();

  for (const viewport of [{ width: 1440, height: 900 }, { width: 1024, height: 768 }, { width: 768, height: 1024 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await expect(page.getByRole("heading", { name: "Import Inbox" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  }

  const saga = await admin.from("sagas").select("workspace_id,world_id,owner_gm_id,primary_era_id").eq("id", sagaId).single();
  expect(saga.error).toBeNull();
  const siblingId = randomUUID();
  expect((await admin.from("sagas").insert({ id: siblingId, ...saga.data, name: "D5 Sibling Saga" })).error).toBeNull();
  await page.goto(`/app/w/${workspaceId}/world/${worldId}/saga/${siblingId}/imports`);
  await expect(page.getByText(substantial)).toHaveCount(0);

  const after = Object.fromEntries(await Promise.all(Object.keys(before).map(async (table) => [table, await count(table as Parameters<typeof count>[0])])));
  expect(after).toEqual(before);
  const imports = await admin.from("sources").select("id,import_state,raw_excerpt,original_filename,uploader_id").eq("saga_id", sagaId).eq("kind", "imported_text");
  expect(imports.error).toBeNull();
  expect(imports.data).toHaveLength(3);
  expect(imports.data?.filter((source) => source.raw_excerpt === "Network-safe exact retry material")).toHaveLength(1);
});

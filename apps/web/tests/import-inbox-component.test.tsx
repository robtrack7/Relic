import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ImportInbox } from "@/components/ImportInbox";
import { saveImportInboxAction, setImportSourceStateAction } from "@/app/actions";
import { readImportInboxDraft } from "@/lib/import-inbox";
import { installMemoryLocalStorage } from "./local-storage";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/app/actions", () => ({ saveImportInboxAction: vi.fn(), setImportSourceStateAction: vi.fn() }));

const params = { workspaceId: "workspace-a", worldId: "world-a", sagaId: "saga-a" };
const source = {
  id: "source-a", workspace_id: "workspace-a", world_id: "world-a", saga_id: "saga-a", uploader_id: "owner-a",
  filename: "a-very-long-source-filename-that-remains-inspectable.md", mime_type: "text/markdown", byte_size: 13,
  ingestion_method: "markdown_file" as const, state: "ready_for_review" as const, content: "# Lore\n\nExact",
  created_at: "2026-07-21T20:00:00.000Z", ready_at: "2026-07-21T20:00:00.000Z", archived_at: null,
};

describe("ImportInbox", () => {
  beforeEach(() => { vi.clearAllMocks(); installMemoryLocalStorage(); Object.defineProperty(navigator, "onLine", { configurable: true, value: true }); });

  it("saves pasted text, clears only after success, and invokes no provider or canon action", async () => {
    vi.mocked(saveImportInboxAction).mockResolvedValue({ ok: true, source: { id: "source-new", state: "ready_for_review", duplicate: false } });
    render(<ImportInbox ownerId="owner-a" params={params} initialImports={[]} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Raw pasted text" }), { target: { value: "Substantial raw source material." } });
    expect(readImportInboxDraft("owner-a", params)?.content).toBe("Substantial raw source material.");
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Save for review" })); await Promise.resolve(); });
    expect(saveImportInboxAction).toHaveBeenCalledTimes(1);
    expect(readImportInboxDraft("owner-a", params)).toBeNull();
    expect(screen.getByRole("status").textContent).toMatch(/ready for your review.*non-canon/i);
    expect(setImportSourceStateAction).not.toHaveBeenCalled();
  });

  it("preserves input through network failure, refresh-style remount, and exact retry", async () => {
    vi.mocked(saveImportInboxAction).mockRejectedValueOnce(new Error("Network unavailable")).mockResolvedValueOnce({ ok: true, source: { id: "source-new", state: "ready_for_review", duplicate: false } });
    const first = render(<ImportInbox ownerId="owner-a" params={params} initialImports={[]} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Raw pasted text" }), { target: { value: "Network-safe import" } });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Save for review" })); await Promise.resolve(); });
    expect(screen.getByRole("status").textContent).toMatch(/network unavailable/i);
    const sourceId = readImportInboxDraft("owner-a", params)?.sourceId;
    first.unmount();
    render(<ImportInbox ownerId="owner-a" params={params} initialImports={[]} />);
    expect((screen.getByRole("textbox", { name: "Raw pasted text" }) as HTMLTextAreaElement).value).toBe("Network-safe import");
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Retry import" })); await Promise.resolve(); });
    expect(vi.mocked(saveImportInboxAction).mock.calls[0][0].get("sourceId")).toBe(sourceId);
    expect(vi.mocked(saveImportInboxAction).mock.calls[1][0].get("sourceId")).toBe(sourceId);
  });

  it("keeps offline input locally and exposes explicit retry", async () => {
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    render(<ImportInbox ownerId="owner-a" params={params} initialImports={[]} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Raw pasted text" }), { target: { value: "Offline source" } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Save for review" })));
    expect(saveImportInboxAction).not.toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toMatch(/saved locally/i);
    expect(screen.getByRole("button", { name: "Retry import" })).toBeTruthy();
  });

  it("shows immutable provenance and original content, then archives explicitly", async () => {
    vi.mocked(setImportSourceStateAction).mockResolvedValue({ ok: true, source: { id: source.id, state: "archived" } });
    render(<ImportInbox ownerId="owner-a" params={params} initialImports={[source]} />);
    expect(screen.getByTitle(source.filename!)).toBeTruthy();
    fireEvent.click(screen.getByText("Inspect original content"));
    expect(document.querySelector(".import-source pre")?.textContent).toBe("# Lore\n\nExact");
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Archive" })); await Promise.resolve(); });
    expect(setImportSourceStateAction).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalled();
  });
});

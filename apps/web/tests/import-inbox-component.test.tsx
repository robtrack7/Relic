import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ImportInbox } from "@/components/ImportInbox";
import { draftImportsWithLoomAction, extractPdfImportAction, preparePdfImportAction, saveImportInboxAction, setImportSourceStateAction } from "@/app/actions";
import { readImportInboxDraft } from "@/lib/import-inbox";
import { installMemoryLocalStorage } from "./local-storage";

const refresh = vi.fn();
const push = vi.fn();
const upload = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push }) }));
vi.mock("@/lib/supabase/browser", () => ({ createClient: () => ({ storage: { from: () => ({ upload }) } }) }));
vi.mock("@/app/actions", () => ({
  saveImportInboxAction: vi.fn(), setImportSourceStateAction: vi.fn(),
  preparePdfImportAction: vi.fn(), extractPdfImportAction: vi.fn(),
  draftImportsWithLoomAction: vi.fn(),
}));

const params = { workspaceId: "workspace-a", worldId: "world-a", sagaId: "saga-a" };
const source = {
  id: "source-a", workspace_id: "workspace-a", world_id: "world-a", saga_id: "saga-a", uploader_id: "owner-a",
  filename: "a-very-long-source-filename-that-remains-inspectable.md", mime_type: "text/markdown", byte_size: 13,
  ingestion_method: "markdown_file" as const, state: "ready_for_review" as const, content: "# Lore\n\nExact",
  created_at: "2026-07-21T20:00:00.000Z", ready_at: "2026-07-21T20:00:00.000Z", archived_at: null,
};

describe("ImportInbox", () => {
  beforeEach(() => { vi.clearAllMocks(); upload.mockResolvedValue({ data: { path: "private" }, error: null }); installMemoryLocalStorage(); Object.defineProperty(navigator, "onLine", { configurable: true, value: true }); });

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

  it("enrolls only explicitly selected ready sources into a new Loom turn", async () => {
    vi.mocked(draftImportsWithLoomAction).mockResolvedValue({ ok: true, href: "/app/scoped/guide?thread=thread-a" });
    render(<ImportInbox ownerId="owner-a" params={params} initialImports={[source]} />);
    const submit = screen.getByRole("button", { name: "Draft with the Loom (0)" });
    expect((submit as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("checkbox", { name: `Select ${source.filename} for the Loom` }));
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Draft with the Loom (1)" })); await Promise.resolve(); });
    const form = vi.mocked(draftImportsWithLoomAction).mock.calls[0][0];
    expect(form.getAll("sourceId")).toEqual([source.id]);
    expect(String(form.get("question"))).toMatch(/untrusted evidence/i);
    expect(push).toHaveBeenCalledWith("/app/scoped/guide?thread=thread-a");
    expect(saveImportInboxAction).not.toHaveBeenCalled();
  });

  it("uploads a PDF privately and invokes only the trusted extraction path", async () => {
    vi.mocked(preparePdfImportAction).mockResolvedValue({ ok: true, source: {
      id: "source-pdf", state: "uploading", bucket: "attachments",
      storage_path: "workspace-a/world-a/saga-a/imports/source-pdf/original.pdf", replayed: false,
    } });
    vi.mocked(extractPdfImportAction).mockResolvedValue({ ok: true, source: { id: "source-pdf", state: "ready_for_review", duplicate: false } });
    render(<ImportInbox ownerId="owner-a" params={params} initialImports={[]} />);
    fireEvent.click(screen.getByRole("tab", { name: "Text, Markdown, or PDF file" }));
    const pdf = new File(["%PDF-1.7\n%%EOF"], "campaign.pdf", { type: "application/pdf" });
    Object.defineProperty(pdf, "arrayBuffer", { value: async () => new TextEncoder().encode("%PDF-1.7\n%%EOF").buffer });
    await act(async () => { fireEvent.change(screen.getByLabelText("Choose UTF-8 .txt/.md or a text-bearing .pdf"), { target: { files: [pdf] } }); });
    await waitFor(() => expect(screen.getByRole("status").textContent).toMatch(/PDF envelope validated/i));
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Save for review" })); });
    await waitFor(() => expect(preparePdfImportAction).toHaveBeenCalledTimes(1));
    expect(preparePdfImportAction).toHaveBeenCalledTimes(1);
    expect(upload).toHaveBeenCalledWith(expect.stringMatching(/\/imports\/.*\/original\.pdf$/), pdf, expect.objectContaining({ contentType: "application/pdf", upsert: false }));
    expect(extractPdfImportAction).toHaveBeenCalledTimes(1);
    expect(saveImportInboxAction).not.toHaveBeenCalled();
    expect(readImportInboxDraft("owner-a", params)).toBeNull();
    expect(screen.getByRole("status").textContent).toMatch(/versioned text is ready for review/i);
  });
});

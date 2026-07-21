import { beforeEach, describe, expect, it } from "vitest";
import {
  IMPORT_FILE_MAX_BYTES,
  clearImportInboxDraft,
  importInboxDraftKey,
  readImportInboxDraft,
  readTextImportFile,
  writeImportInboxDraft,
} from "@/lib/import-inbox";
import { installMemoryLocalStorage } from "./local-storage";

const scope = { workspaceId: "workspace-a", worldId: "world-a", sagaId: "saga-a" };

function file(name: string, type: string, body: Uint8Array | string) {
  const bytes = typeof body === "string" ? new TextEncoder().encode(body) : body;
  return {
    name,
    type,
    size: bytes.byteLength,
    arrayBuffer: async () => new Uint8Array(bytes).buffer,
  };
}

describe("Import Inbox validation and recovery", () => {
  beforeEach(installMemoryLocalStorage);

  it("accepts UTF-8 plain text and Markdown without changing line endings", async () => {
    await expect(readTextImportFile(file("notes.txt", "text/plain", "one\r\ntwo"))).resolves.toMatchObject({
      filename: "notes.txt", mimeType: "text/plain", content: "one\r\ntwo", ingestionMethod: "plain_text_file",
    });
    await expect(readTextImportFile(file("lore.md", "text/markdown", "# Héritage\n\nExact"))).resolves.toMatchObject({
      filename: "lore.md", content: "# Héritage\n\nExact", ingestionMethod: "markdown_file",
    });
  });

  it.each([
    ["empty", file("empty.md", "text/markdown", "   \n")],
    ["unsupported", file("notes.pdf", "application/pdf", "%PDF")],
    ["deferred docx", file("legacy.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "PK")],
    ["incorrectly identified", file("notes.md", "application/pdf", "# Notes")],
    ["unsafe filename", file("../notes.md", "text/markdown", "# Notes")],
    ["malformed UTF-8", file("notes.txt", "text/plain", new Uint8Array([0xc3, 0x28]))],
    ["binary content", file("notes.txt", "text/plain", new Uint8Array([65, 0, 66]))],
  ])("rejects %s files", async (_label, candidate) => {
    await expect(readTextImportFile(candidate)).rejects.toThrow();
  });

  it("rejects oversized files before reading them", async () => {
    let read = false;
    const candidate = { name: "huge.md", type: "text/markdown", size: IMPORT_FILE_MAX_BYTES + 1, arrayBuffer: async () => { read = true; return new ArrayBuffer(0); } };
    await expect(readTextImportFile(candidate)).rejects.toThrow(/too large/i);
    expect(read).toBe(false);
  });

  it("persists paste and decoded selected-file state with one stable idempotency key", () => {
    const first = writeImportInboxDraft("owner-a", scope, { mode: "paste", content: "First", status: "draft" });
    const changed = writeImportInboxDraft("owner-a", scope, { mode: "paste", content: "Changed", status: "failed", error: "Network unavailable" });
    expect(changed.sourceId).toBe(first.sourceId);
    expect(readImportInboxDraft("owner-a", scope)).toMatchObject({ content: "Changed", status: "failed" });

    const selected = writeImportInboxDraft("owner-a", scope, {
      mode: "file", content: "# Restored", filename: "long-lived.md", mimeType: "text/markdown",
      byteSize: 10, ingestionMethod: "markdown_file", status: "draft",
    });
    expect(selected.sourceId).toBe(first.sourceId);
    expect(readImportInboxDraft("owner-a", scope)).toMatchObject({ filename: "long-lived.md", content: "# Restored" });
    expect(readImportInboxDraft("owner-b", scope)).toBeNull();
    expect(localStorage.getItem(importInboxDraftKey("owner-a", scope))).not.toBeNull();
  });

  it("clears only the confirmed owner and Saga draft", () => {
    writeImportInboxDraft("owner-a", scope, { mode: "paste", content: "Saved", status: "draft" });
    writeImportInboxDraft("owner-a", { ...scope, sagaId: "saga-b" }, { mode: "paste", content: "Sibling", status: "draft" });
    clearImportInboxDraft("owner-a", scope);
    expect(readImportInboxDraft("owner-a", scope)).toBeNull();
    expect(readImportInboxDraft("owner-a", { ...scope, sagaId: "saga-b" })?.content).toBe("Sibling");
  });
});

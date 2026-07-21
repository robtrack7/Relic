import type { IdParams } from "@/lib/types";

export const IMPORT_FILE_MAX_BYTES = 1_048_576;
export const IMPORT_PASTE_MAX_CHARACTERS = 50_000;

export type ImportIngestionMethod = "paste" | "plain_text_file" | "markdown_file";
export type ImportLocalStatus = "draft" | "validating" | "uploading" | "failed" | "rejected";
export type ImportInboxDraft = {
  sourceId: string;
  mode: "paste" | "file";
  content: string;
  filename?: string;
  mimeType?: string;
  byteSize?: number;
  ingestionMethod?: ImportIngestionMethod;
  status: ImportLocalStatus;
  error?: string;
  updatedAt: string;
};

type TextFileLike = { name: string; type: string; size: number; arrayBuffer(): Promise<ArrayBuffer> };

function newId() {
  return globalThis.crypto?.randomUUID?.() ?? `import-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function importInboxDraftKey(ownerId: string, scope: IdParams) {
  return ["relic-import-inbox", ownerId, scope.workspaceId, scope.worldId, scope.sagaId].join(":");
}

export function readImportInboxDraft(ownerId: string, scope: IdParams): ImportInboxDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(importInboxDraftKey(ownerId, scope));
    if (!value) return null;
    const parsed = JSON.parse(value) as Partial<ImportInboxDraft>;
    if (typeof parsed.sourceId !== "string" || typeof parsed.content !== "string" || typeof parsed.updatedAt !== "string") return null;
    if (!(["paste", "file"] as const).includes(parsed.mode as "paste" | "file")) return null;
    if (!(["draft", "validating", "uploading", "failed", "rejected"] as const).includes(parsed.status as ImportLocalStatus)) return null;
    return parsed as ImportInboxDraft;
  } catch {
    return null;
  }
}

export function writeImportInboxDraft(ownerId: string, scope: IdParams, value: Omit<ImportInboxDraft, "sourceId" | "updatedAt">, sourceId?: string) {
  const existing = readImportInboxDraft(ownerId, scope);
  const draft: ImportInboxDraft = {
    ...value,
    sourceId: sourceId || existing?.sourceId || newId(),
    updatedAt: new Date().toISOString(),
  };
  if (typeof window !== "undefined") {
    try { window.localStorage.setItem(importInboxDraftKey(ownerId, scope), JSON.stringify(draft)); } catch { /* React state remains available. */ }
  }
  return draft;
}

export function clearImportInboxDraft(ownerId: string, scope: IdParams) {
  if (typeof window === "undefined") return;
  try { window.localStorage.removeItem(importInboxDraftKey(ownerId, scope)); } catch { /* Confirmed server state remains authoritative. */ }
}

function validateFilename(name: string) {
  if (!name || name.length > 180 || name === "." || name === ".." || /[\\/\u0000-\u001f\u007f]/.test(name)) {
    throw new Error("The selected file has an unsafe filename.");
  }
}

function validateDecodedText(content: string) {
  if (!content.trim()) throw new Error("The selected file is empty.");
  if (content.includes("\u0000") || content.includes("\ufffd") || /[\u0001-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(content)) {
    throw new Error("The selected file is malformed or is not plain UTF-8 text.");
  }
}

export async function readTextImportFile(candidate: TextFileLike) {
  validateFilename(candidate.name);
  if (candidate.size > IMPORT_FILE_MAX_BYTES) throw new Error("The selected file is too large. The MVP limit is 1 MB.");
  const extension = candidate.name.toLowerCase().split(".").pop();
  let ingestionMethod: ImportIngestionMethod;
  if (extension === "txt") {
    if (candidate.type !== "text/plain") throw new Error("The file MIME type does not match a plain-text file.");
    ingestionMethod = "plain_text_file";
  } else if (extension === "md" || extension === "markdown") {
    if (candidate.type !== "text/markdown" && candidate.type !== "text/plain") throw new Error("The file MIME type does not match a Markdown file.");
    ingestionMethod = "markdown_file";
  } else {
    throw new Error("Unsupported file type. Choose .txt, .md, or .markdown.");
  }
  const bytes = new Uint8Array(await candidate.arrayBuffer());
  if (bytes.byteLength !== candidate.size) throw new Error("The selected file changed while it was being read.");
  let content: string;
  try { content = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes); }
  catch { throw new Error("The selected file is not valid UTF-8 text."); }
  validateDecodedText(content);
  return { filename: candidate.name, mimeType: candidate.type, byteSize: bytes.byteLength, content, ingestionMethod };
}

export function validatePastedImport(content: string) {
  validateDecodedText(content);
  if (content.length > IMPORT_PASTE_MAX_CHARACTERS) throw new Error("Pasted text is too large. The MVP limit is 50,000 characters.");
  return { content, mimeType: "text/plain", byteSize: new TextEncoder().encode(content).byteLength, ingestionMethod: "paste" as const };
}

export function encodeImportContent(content: string) {
  const bytes = new TextEncoder().encode(content);
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

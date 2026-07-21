"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { saveImportInboxAction, setImportSourceStateAction } from "@/app/actions";
import {
  clearImportInboxDraft, encodeImportContent, readImportInboxDraft, readTextImportFile, validatePastedImport, writeImportInboxDraft,
  type ImportInboxDraft,
} from "@/lib/import-inbox";
import type { IdParams, ImportSource } from "@/lib/types";

type Props = { ownerId: string; params: IdParams; initialImports: ImportSource[] };

function freshDraft(): ImportInboxDraft {
  return { sourceId: crypto.randomUUID(), mode: "paste", content: "", status: "draft", updatedAt: new Date().toISOString() };
}

export function ImportInbox({ ownerId, params, initialImports }: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState<ImportInboxDraft>(freshDraft);
  const [notice, setNotice] = useState("Raw imports stay outside canon and AI until you choose a later action.");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const recovered = readImportInboxDraft(ownerId, params);
    if (!recovered) return;
    setDraft({ ...recovered, status: recovered.status === "uploading" ? "failed" : recovered.status, error: recovered.status === "uploading" ? "Import was interrupted. Review and retry." : recovered.error });
    setNotice("Recovered local import input.");
  }, [ownerId, params.workspaceId, params.worldId, params.sagaId]);

  function persist(next: Omit<ImportInboxDraft, "sourceId" | "updatedAt">) {
    const saved = writeImportInboxDraft(ownerId, params, next, draft.sourceId);
    setDraft(saved);
    return saved;
  }

  async function chooseFile(candidate: File | undefined) {
    if (!candidate) return;
    persist({ mode: "file", content: draft.content, filename: candidate.name, mimeType: candidate.type, byteSize: candidate.size, status: "validating" });
    try {
      const parsed = await readTextImportFile(candidate);
      persist({ mode: "file", ...parsed, status: "draft" });
      setNotice("File validated locally. Its exact decoded UTF-8 text is ready to save.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "The file could not be validated.";
      persist({ mode: "file", content: "", filename: candidate.name, mimeType: candidate.type, byteSize: candidate.size, status: "rejected", error: message });
      setNotice(message);
    }
  }

  async function submit() {
    let payload;
    try {
      if (draft.mode === "paste") payload = validatePastedImport(draft.content);
      else {
        if (!draft.ingestionMethod || !draft.filename || !draft.mimeType || !draft.byteSize) throw new Error("Choose a valid text or Markdown file first.");
        payload = { content: draft.content, filename: draft.filename, mimeType: draft.mimeType, byteSize: draft.byteSize, ingestionMethod: draft.ingestionMethod };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Import validation failed.";
      persist({ ...draft, status: "rejected", error: message });
      setNotice(message);
      return;
    }
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      persist({ ...draft, status: "failed", error: "You are offline. Input is saved locally; retry when connected." });
      setNotice("You are offline. Input is saved locally; retry when connected.");
      return;
    }
    persist({ ...draft, ...payload, status: "uploading", error: undefined });
    const form = new FormData();
    Object.entries(params).forEach(([key, value]) => form.set(key, value));
    form.set("sourceId", draft.sourceId); form.set("ingestionMethod", payload.ingestionMethod);
    form.set("filename", "filename" in payload ? payload.filename : ""); form.set("mimeType", payload.mimeType);
    form.set("byteSize", String(payload.byteSize)); form.set("contentBase64", encodeImportContent(payload.content));
    try {
      const result = await saveImportInboxAction(form);
      if (!result.ok) throw new Error(result.error);
      clearImportInboxDraft(ownerId, params);
      setDraft(freshDraft());
      setNotice(result.source.duplicate ? "This exact material already exists. Opened the original import." : "Import saved. It is ready for your review and remains non-canon.");
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Import failed. Input is preserved locally.";
      persist({ ...draft, ...payload, status: "failed", error: message });
      setNotice(message);
    }
  }

  async function transition(source: ImportSource) {
    setBusyId(source.id);
    const form = new FormData();
    Object.entries(params).forEach(([key, value]) => form.set(key, value));
    form.set("sourceId", source.id); form.set("nextState", source.state === "archived" ? "ready_for_review" : "archived");
    const result = await setImportSourceStateAction(form);
    setBusyId(null);
    if (!result.ok) setNotice(result.error); else { setNotice(source.state === "archived" ? "Import restored for review." : "Import archived. Its provenance and original content were retained."); router.refresh(); }
  }

  return <div className="import-inbox">
    <section className="card import-compose" aria-labelledby="import-compose-title">
      <div className="import-tabs" role="tablist" aria-label="Import method">
        <button type="button" role="tab" aria-selected={draft.mode === "paste"} onClick={() => persist({ mode: "paste", content: draft.mode === "paste" ? draft.content : "", status: "draft" })}>Paste text</button>
        <button type="button" role="tab" aria-selected={draft.mode === "file"} onClick={() => persist({ mode: "file", content: draft.mode === "file" ? draft.content : "", status: "draft" })}>Text or Markdown file</button>
      </div>
      <h2 id="import-compose-title" className="section-title">Bring source material in safely</h2>
      {draft.mode === "paste" ? <label className="field"><span>Raw pasted text</span><textarea className="textarea import-textarea" aria-label="Raw pasted text" value={draft.content} maxLength={50000} onChange={(event) => persist({ mode: "paste", content: event.target.value, status: "draft" })} /></label>
        : <div className="field"><label htmlFor="import-file"><span>Choose UTF-8 .txt, .md, or .markdown</span></label><input id="import-file" type="file" accept=".txt,.md,.markdown,text/plain,text/markdown" onChange={(event) => void chooseFile(event.target.files?.[0])} />{draft.filename && <p className="import-filename" title={draft.filename}>{draft.filename} · {draft.byteSize ?? 0} bytes</p>}{draft.content && <pre className="import-preview">{draft.content}</pre>}</div>}
      <div className="button-row"><button type="button" className="btn btn-primary" disabled={draft.status === "validating" || draft.status === "uploading"} onClick={() => void submit()}>{draft.status === "uploading" ? "Saving…" : draft.status === "failed" ? "Retry import" : "Save for review"}</button></div>
      <p className={`import-status ${draft.status}`} role="status" aria-live="polite">{draft.error || notice}</p>
      <p className="small muted">Files are decoded as strict UTF-8 in a trusted application runtime. No AI, parsing, summarizing, embedding, splitting, or canon write occurs.</p>
    </section>

    <section aria-labelledby="import-review-title">
      <h2 id="import-review-title" className="section-title">Review imported sources</h2>
      {initialImports.length === 0 ? <div className="card inspector-empty import-empty">No imports yet. Paste text or choose a supported file above.</div> : <div className="import-list">{initialImports.map((source) => <article className={`card import-source ${source.state}`} key={source.id}>
        <header><div><span className={`chip ${source.state === "archived" ? "stone" : "sage"}`}>{source.state.replaceAll("_", " ")}</span><h3 title={source.filename ?? "Pasted text"}>{source.filename ?? "Pasted text"}</h3></div><button type="button" className="btn btn-ghost btn-sm" disabled={busyId === source.id} onClick={() => void transition(source)}>{source.state === "archived" ? "Restore" : "Archive"}</button></header>
        <dl className="import-provenance"><div><dt>Method</dt><dd>{source.ingestion_method.replaceAll("_", " ")}</dd></div><div><dt>MIME</dt><dd>{source.mime_type}</dd></div><div><dt>Size</dt><dd>{source.byte_size} bytes</dd></div><div><dt>Imported</dt><dd>{new Date(source.created_at).toLocaleString()}</dd></div><div><dt>Uploader</dt><dd>{source.uploader_id}</dd></div></dl>
        <details><summary>Inspect original content</summary><pre>{source.content}</pre></details>
      </article>)}</div>}
    </section>
  </div>;
}

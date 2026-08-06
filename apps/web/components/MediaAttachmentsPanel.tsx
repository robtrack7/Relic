"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteMediaAttachmentAction,
  draftMediaAttachmentWithLoomAction,
  prepareMediaAttachmentAction,
  updateMediaAttachmentMetadataAction,
  validateMediaAttachmentAction,
  viewMediaAttachmentAction,
} from "@/app/actions";
import { createClient } from "@/lib/supabase/browser";
import type { EntityType, IdParams, MediaAttachment } from "@/lib/types";

type Props = { params: IdParams; entityType: EntityType; entityId: string; attachments: MediaAttachment[]; readOnly: boolean };

function contextForm(params: IdParams, entityType: EntityType, entityId: string, attachmentId?: string) {
  const form = new FormData();
  Object.entries(params).forEach(([key, value]) => form.set(key, value));
  form.set("entityType", entityType); form.set("entityId", entityId);
  if (attachmentId) form.set("attachmentId", attachmentId);
  return form;
}

function AttachmentCard({ params, entityType, entityId, attachment, onNotice }: Omit<Props, "attachments" | "readOnly"> & { attachment: MediaAttachment; onNotice: (message: string) => void }) {
  const router = useRouter();
  const [title, setTitle] = useState(attachment.title ?? "");
  const [altText, setAltText] = useState(attachment.alt_text);
  const [description, setDescription] = useState(attachment.description ?? "");
  const [loomPrompt, setLoomPrompt] = useState("Use only my authored description and safe metadata. Propose an atmosphere Note and a quest-like Thread that I can review; do not claim to have seen the image.");
  const [busy, setBusy] = useState<string | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  useEffect(() => { setTitle(attachment.title ?? ""); setAltText(attachment.alt_text); setDescription(attachment.description ?? ""); }, [attachment]);

  async function view() {
    setBusy("view");
    const form = contextForm(params, entityType, entityId, attachment.id); form.set("attemptId", crypto.randomUUID());
    const result = await viewMediaAttachmentAction(form);
    setBusy(null);
    if (!result.ok || !result.result.signed_url) onNotice(result.ok ? "The private view URL was unavailable." : result.error);
    else { setSignedUrl(result.result.signed_url); onNotice("Private view opened for 60 seconds."); }
  }

  async function saveMetadata() {
    setBusy("save");
    const form = contextForm(params, entityType, entityId, attachment.id);
    form.set("title", title); form.set("altText", altText); form.set("description", description); form.set("expectedVersion", attachment.updated_at);
    const result = await updateMediaAttachmentMetadataAction(form);
    setBusy(null); onNotice(result.ok ? "Image description saved." : result.error);
    if (result.ok) router.refresh();
  }

  async function remove() {
    if (!window.confirm("Remove this private image from the record? The stored object will be deleted.")) return;
    setBusy("delete");
    const form = contextForm(params, entityType, entityId, attachment.id); form.set("attemptId", crypto.randomUUID());
    const result = await deleteMediaAttachmentAction(form);
    setBusy(null); onNotice(result.ok ? "Private image deleted." : result.error);
    if (result.ok) router.refresh();
  }

  async function useWithLoom() {
    setBusy("loom");
    const form = contextForm(params, entityType, entityId, attachment.id);
    form.set("question", loomPrompt); form.set("turnId", crypto.randomUUID()); form.set("idempotencyKey", crypto.randomUUID());
    const result = await draftMediaAttachmentWithLoomAction(form);
    setBusy(null);
    if (!result.ok) onNotice(result.error); else router.push(result.href);
  }

  return <article className={`media-attachment-card ${attachment.state}`}>
    <header><div><strong>{attachment.title || attachment.original_filename}</strong><span className={`chip ${attachment.state === "ready" ? "sage" : attachment.state === "rejected" || attachment.state === "failed" ? "rust" : "stone"}`}>{attachment.state}</span></div>{attachment.detected_mime && <small>{attachment.detected_mime.replace("image/", "").toUpperCase()} · {attachment.pixel_width}×{attachment.pixel_height}</small>}</header>
    {attachment.failure_code && <p className="validation-warning">{attachment.failure_code.replaceAll("_", " ")}. Remove this entry and choose a replacement.</p>}
    {attachment.state === "ready" && <>
      {signedUrl && <figure className="media-private-preview"><img src={signedUrl} alt={altText} /><figcaption>Short-lived private view · pixels are never sent to the Loom</figcaption></figure>}
      <div className="media-metadata-grid"><label className="field"><span>Title</span><input value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} /></label><label className="field"><span>Alt text</span><input value={altText} maxLength={500} required onChange={(event) => setAltText(event.target.value)} /></label><label className="field media-description"><span>Atmosphere / creative description</span><textarea rows={3} maxLength={2000} value={description} onChange={(event) => setDescription(event.target.value)} /></label></div>
      <div className="button-row"><button type="button" className="btn btn-ghost btn-sm" disabled={busy !== null} onClick={() => void view()}>{busy === "view" ? "Opening…" : "View privately"}</button><button type="button" className="btn btn-secondary btn-sm" disabled={busy !== null || !altText.trim()} onClick={() => void saveMetadata()}>{busy === "save" ? "Saving…" : "Save description"}</button><button type="button" className="btn btn-rust btn-sm" disabled={busy !== null} onClick={() => void remove()}>Delete image</button></div>
      <details className="media-loom-handoff"><summary>Use authored description with the Loom</summary><p className="small muted">This explicit provider action sends title, alt text, description, format, dimensions, and target provenance. It sends no pixels or signed URL and creates no canon without your approval.</p><label className="field"><span>What should the Loom propose?</span><textarea rows={3} maxLength={2000} value={loomPrompt} onChange={(event) => setLoomPrompt(event.target.value)} /></label><button type="button" className="btn btn-primary btn-sm" disabled={busy !== null || !loomPrompt.trim()} onClick={() => void useWithLoom()}>{busy === "loom" ? "Opening the Loom…" : "Draft with the Loom"}</button></details>
    </>}
    {attachment.state !== "ready" && <button type="button" className="btn btn-rust btn-sm" disabled={busy !== null} onClick={() => void remove()}>Remove upload</button>}
  </article>;
}

export function MediaAttachmentsPanel({ params, entityType, entityId, attachments, readOnly }: Props) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [altText, setAltText] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("Images stay private. The Loom can use only the text you explicitly provide.");

  async function upload() {
    if (!file || !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size < 16 || file.size > 5_242_880 || !altText.trim()) {
      setNotice("Choose a JPEG, PNG, or WebP up to 5 MiB and write alt text."); return;
    }
    setBusy(true);
    const attachmentId = crypto.randomUUID();
    const form = contextForm(params, entityType, entityId, attachmentId);
    form.set("filename", file.name); form.set("mimeType", file.type); form.set("byteSize", String(file.size));
    form.set("title", title); form.set("altText", altText); form.set("description", description);
    const prepared = await prepareMediaAttachmentAction(form);
    if (!prepared.ok) { setBusy(false); setNotice(prepared.error); return; }
    const uploaded = await createClient().storage.from(prepared.attachment.bucket).upload(prepared.attachment.storage_path, file, { cacheControl: "60", contentType: file.type, upsert: false });
    if (uploaded.error) { setBusy(false); setNotice("The private upload failed. Remove the interrupted entry and try again."); router.refresh(); return; }
    form.set("attemptId", crypto.randomUUID());
    const validated = await validateMediaAttachmentAction(form);
    setBusy(false);
    setNotice(validated.ok ? validated.result.duplicate ? "This image was already attached; the duplicate upload was discarded." : "Private image validated and linked. No AI or canon action ran." : validated.error);
    if (validated.ok) { setFile(null); setTitle(""); setAltText(""); setDescription(""); }
    router.refresh();
  }

  return <section className="library-inspector-section media-attachments" aria-labelledby="media-attachments-title">
    <h2 id="media-attachments-title">Private images</h2>
    <p className="small muted">Static JPEG, PNG, or WebP · 5 MiB · 8,192 px edge · 32 MP. Vision, OCR, animation, SVG, and image generation are V1.</p>
    {!readOnly && <div className="media-upload-panel"><label className="field"><span>Choose image</span><input type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label><div className="media-metadata-grid"><label className="field"><span>Title (optional)</span><input value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} /></label><label className="field"><span>Alt text</span><input value={altText} maxLength={500} required onChange={(event) => setAltText(event.target.value)} /></label><label className="field media-description"><span>Atmosphere / creative description (optional)</span><textarea rows={3} maxLength={2000} value={description} onChange={(event) => setDescription(event.target.value)} /></label></div><button type="button" className="btn btn-secondary" disabled={busy || !file || !altText.trim()} onClick={() => void upload()}>{busy ? "Validating privately…" : "Upload private image"}</button></div>}
    <p className="import-status" role="status" aria-live="polite">{notice}</p>
    {attachments.length ? <div className="media-attachment-list">{attachments.map((attachment) => <AttachmentCard key={attachment.id} params={params} entityType={entityType} entityId={entityId} attachment={attachment} onNotice={setNotice} />)}</div> : <p className="inspector-empty">No private images are linked to this record.</p>}
  </section>;
}

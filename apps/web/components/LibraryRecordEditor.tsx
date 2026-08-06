"use client";

import Link from "next/link";
import { recordPath } from "@/lib/routes";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  archiveEntityAction,
  autosaveEntityAction,
  createLibraryLinkAction,
  hardDeleteEntityAction,
  removeLibraryLinkAction,
  resolveMentionAction,
  restoreEntityAction,
} from "@/app/actions";
import { HiddenContextFields } from "@/components/HiddenContextFields";
import { entityConfigs } from "@/lib/entities";
import { sagaPath } from "@/lib/routes";
import type { IdParams, LibraryRecordDetail } from "@/lib/types";

const relationshipKinds = ["member-of", "located-at", "owns", "allied-with", "opposed-to", "related-to"] as const;

type SaveState = "saved" | "unsaved" | "saving" | "failed" | "conflict";

function serialize(values: { name: string; summary: string; narrative: string; gmNotes: string; status: string; tags: string }) {
  return JSON.stringify(values);
}

function blockerLabel(key: string) {
  return ({ relationships: "relationships", mentions: "mentions or backlinks", note_attachments: "Note attachments", session_pins: "Session pins", thread_activations: "active Session links", pending_drafts: "pending drafts" } as Record<string, string>)[key] ?? key;
}

export function LibraryRecordEditor({ params, initialDetail, initialDeleteOpen = false }: { params: IdParams; initialDetail: LibraryRecordDetail; initialDeleteOpen?: boolean }) {
  const [detail, setDetail] = useState(initialDetail);
  const [values, setValues] = useState({
    name: initialDetail.record.name,
    summary: initialDetail.record.summary ?? "",
    narrative: initialDetail.record.narrative ?? initialDetail.record.summary ?? "",
    gmNotes: initialDetail.record.gm_notes ?? "",
    status: initialDetail.record.status ?? "active",
    tags: initialDetail.record.tags?.join(", ") ?? "",
  });
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [saveError, setSaveError] = useState("");
  const [linkBusy, setLinkBusy] = useState(false);
  const [linkError, setLinkError] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(initialDeleteOpen && initialDetail.record.canon_state === "archived");
  const [deleteAcknowledged, setDeleteAcknowledged] = useState(false);
  const [confirmationName, setConfirmationName] = useState("");
  const versionRef = useRef(initialDetail.record.updated_at ?? "");
  const valuesRef = useRef(values);
  const lastSavedRef = useRef(serialize(values));
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);
  const archived = detail.record.canon_state === "archived";
  const root = sagaPath(params);

  valuesRef.current = values;

  const saveNow = useCallback(async () => {
    if (archived || savingRef.current) return;
    const captured = valuesRef.current;
    const serialized = serialize(captured);
    if (serialized === lastSavedRef.current) return;
    savingRef.current = true;
    setSaveState("saving");
    setSaveError("");
    const formData = new FormData();
    Object.entries(params).forEach(([key, value]) => formData.set(key, value));
    formData.set("entityType", detail.record.entityType);
    formData.set("entityId", detail.record.id);
    formData.set("expectedVersion", versionRef.current);
    Object.entries(captured).forEach(([key, value]) => formData.set(key, value));
    try {
      const result = await autosaveEntityAction(formData);
      if (!result.ok) {
        setSaveState(result.conflict ? "conflict" : "failed");
        setSaveError(result.error);
        return;
      }
      versionRef.current = result.updatedAt;
      lastSavedRef.current = serialized;
      setDetail(result.detail);
      setSaveState(serialize(valuesRef.current) === serialized ? "saved" : "unsaved");
    } catch {
      setSaveState("failed");
      setSaveError("Save failed. Your text is still in this editor; retry when the connection returns.");
    } finally {
      savingRef.current = false;
      if (serialize(valuesRef.current) !== lastSavedRef.current && saveState !== "conflict") {
        timerRef.current = setTimeout(() => void saveNow(), 0);
      }
    }
  }, [archived, detail.record.entityType, detail.record.id, params, saveState]);

  useEffect(() => {
    if (archived || serialize(values) === lastSavedRef.current || saveState === "conflict") return;
    setSaveState("unsaved");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => void saveNow(), 800);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [archived, saveNow, saveState, values]);

  function updateField(field: keyof typeof values, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function createLink(formData: FormData) {
    setLinkBusy(true); setLinkError("");
    const selected = String(formData.get("target") ?? "");
    const [targetType, targetId] = selected.split(":");
    formData.set("targetType", targetType ?? ""); formData.set("targetId", targetId ?? "");
    try {
      const result = await createLibraryLinkAction(formData);
      if (!result.ok) setLinkError(result.error); else setDetail(result.detail);
    } finally { setLinkBusy(false); }
  }

  async function removeLink(linkId: string, linkType: string) {
    const formData = contextForm(); formData.set("linkId", linkId); formData.set("linkType", linkType);
    setLinkBusy(true); setLinkError("");
    try { const result = await removeLibraryLinkAction(formData); if (!result.ok) setLinkError(result.error); else setDetail(result.detail); }
    finally { setLinkBusy(false); }
  }

  async function resolveMention(mentionId: string, resolution: "accepted" | "dismissed") {
    const formData = contextForm(); formData.set("mentionId", mentionId); formData.set("resolution", resolution);
    setLinkBusy(true); setLinkError("");
    try { const result = await resolveMentionAction(formData); if (!result.ok) setLinkError(result.error); else setDetail(result.detail); }
    finally { setLinkBusy(false); }
  }

  function contextForm() {
    const formData = new FormData();
    Object.entries(params).forEach(([key, value]) => formData.set(key, value));
    formData.set("entityType", detail.record.entityType); formData.set("entityId", detail.record.id);
    return formData;
  }

  const statusText = saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved · just now" : saveState === "unsaved" ? "Unsaved changes" : saveState === "conflict" ? "Conflict · refresh required" : "Save failed · retrying";
  const candidates = detail.record.entityType === "note" ? detail.candidates.filter((candidate) => candidate.entityType !== "note") : detail.candidates;
  const blockers = Object.entries(detail.delete_blockers).filter(([key, count]) => key !== "total" && Number(count) > 0);

  return (
    <div className="lib-detail-layout d2-library-detail">
      <aside className="card entity-sidebar" aria-label="Record status and provenance">
        <div><div className="es-key">Type</div><div className="es-val">{entityConfigs[detail.record.entityType].label}</div></div>
        <div className="es-sep" />
        <div><div className="es-key">Scope</div><div className="es-val">{detail.record.scope} canon</div></div>
        <div className="es-sep" />
        <div><div className="es-key">Canon state</div><div className="es-val"><span className={archived ? "chip rust" : "chip verdigris"}>{detail.record.canon_state}</span></div></div>
        {detail.record.is_stub && <><div className="es-sep" /><div><div className="es-key">Stub</div><span className="chip amber">stub</span></div></>}
        <div className="es-sep" />
        <section className="source-dock" aria-labelledby="source-dock-title">
          <div className="es-key" id="source-dock-title">Sources & provenance</div>
          {detail.provenance.length ? detail.provenance.map((entry) => (
            <details key={entry.id} className="provenance-entry">
              <summary>{entry.operation.replaceAll("_", " ")} · {new Date(entry.created_at).toLocaleDateString()}</summary>
              <div className="provenance-body"><span>{entry.actor_kind.replaceAll("_", " ")}</span>{entry.sources.map((source) => <p key={source.id}><strong>{source.kind.replaceAll("_", " ")}</strong>{source.excerpt ? ` — ${source.excerpt}` : ""}</p>)}</div>
            </details>
          )) : <p className="inspector-empty">No provenance is available.</p>}
        </section>
        <div className="es-sep" />
        {!archived ? (
          <form action={archiveEntityAction}>
            <HiddenContextFields params={params} /><input type="hidden" name="entityType" value={detail.record.entityType} /><input type="hidden" name="entityId" value={detail.record.id} /><input type="hidden" name="expectedVersion" value={versionRef.current} />
            <button className="btn btn-rust btn-sm" type="submit">Archive record</button>
          </form>
        ) : (
          <>
            <form action={restoreEntityAction}>
              <HiddenContextFields params={params} /><input type="hidden" name="entityType" value={detail.record.entityType} /><input type="hidden" name="entityId" value={detail.record.id} /><input type="hidden" name="expectedVersion" value={versionRef.current} />
              <button className="btn btn-secondary btn-sm" type="submit">Restore to canon</button>
            </form>
            <button className="btn btn-rust btn-sm" type="button" onClick={() => setDeleteOpen(true)}>Permanently delete…</button>
            {deleteOpen && <form action={hardDeleteEntityAction} className="hard-delete-panel">
              <HiddenContextFields params={params} /><input type="hidden" name="entityType" value={detail.record.entityType} /><input type="hidden" name="entityId" value={detail.record.id} /><input type="hidden" name="expectedVersion" value={versionRef.current} /><input type="hidden" name="destructiveConfirmed" value={deleteAcknowledged ? "true" : "false"} />
              {blockers.length ? <div className="validation-warning"><strong>References must be removed first.</strong><ul>{blockers.map(([key, count]) => <li key={key}>{count} {blockerLabel(key)}</li>)}</ul></div> : <><label className="delete-check"><input type="checkbox" checked={deleteAcknowledged} onChange={(event) => setDeleteAcknowledged(event.target.checked)} /> I understand this cannot be undone.</label><label className="field"><span>Type “{detail.record.name}”</span><input name="confirmationName" value={confirmationName} onChange={(event) => setConfirmationName(event.target.value)} /></label><button className="btn btn-rust btn-sm" disabled={!deleteAcknowledged || confirmationName !== detail.record.name}>Delete permanently</button></>}
            </form>}
          </>
        )}
      </aside>

      <main className="card entity-main">
        <div className="em-eyebrow">{entityConfigs[detail.record.entityType].label}</div>
        <div className={`autosave-indicator ${saveState}`} role="status" aria-live="polite">{archived ? "Archived · read only" : statusText}</div>
        {saveError && <div className="validation-warning">{saveError}</div>}
        <div className="library-editor-fields">
          <label className="field"><span>Name / title</span><input aria-label="Name / title" className="settings-field" value={values.name} disabled={archived || saveState === "conflict"} onChange={(event) => updateField("name", event.target.value)} onBlur={() => void saveNow()} required /></label>
          {detail.record.entityType !== "note" && <label className="field"><span>Summary</span><input aria-label="Summary" className="settings-field" value={values.summary} disabled={archived || saveState === "conflict"} onChange={(event) => updateField("summary", event.target.value)} onBlur={() => void saveNow()} /></label>}
          {detail.record.entityType !== "note" && <div className="library-editor-metadata"><label className="field"><span>Status</span><input aria-label="Status" className="settings-field" maxLength={80} value={values.status} disabled={archived || saveState === "conflict"} onChange={(event) => updateField("status", event.target.value)} onBlur={() => void saveNow()} /></label><label className="field"><span>Tags</span><input aria-label="Tags" className="settings-field" value={values.tags} disabled={archived || saveState === "conflict"} onChange={(event) => updateField("tags", event.target.value)} onBlur={() => void saveNow()} placeholder="politics, hidden-path" /><small>Comma-separated; saved as lowercase tags.</small></label></div>}
          <label className="field"><span>Narrative / body</span><textarea aria-label="Narrative / body" className="settings-field" rows={8} value={values.narrative} disabled={archived || saveState === "conflict"} onChange={(event) => updateField("narrative", event.target.value)} onBlur={() => void saveNow()} /></label>
          {detail.record.entityType !== "note" && <label className="field"><span>GM notes</span><textarea aria-label="GM notes" className="settings-field" rows={4} value={values.gmNotes} disabled={archived || saveState === "conflict"} onChange={(event) => updateField("gmNotes", event.target.value)} onBlur={() => void saveNow()} /></label>}
        </div>

        <div className="em-sep" />
        <section className="library-inspector-section" aria-labelledby="relationships-title">
          <h2 id="relationships-title">Relationships & attached notes</h2>
          {detail.relationships.length ? <ul className="relationship-list">{detail.relationships.map((relationship) => <li key={`${relationship.link_type}-${relationship.id}`}><div><span className="chip stone">{relationship.kind}</span> <Link href={recordPath(root, relationship.related_type, relationship.related_id)}>{relationship.related_name || "Unavailable record"}</Link>{relationship.notes && <p>{relationship.notes}</p>}</div><button className="btn btn-ghost btn-sm" disabled={linkBusy} onClick={() => void removeLink(relationship.id, relationship.link_type)}>Remove</button></li>)}</ul> : <p className="inspector-empty">No relationships or attached Notes yet.</p>}
          {!archived && candidates.length > 0 && <form action={(formData) => void createLink(formData)} className="relationship-picker">
            <HiddenContextFields params={params} /><input type="hidden" name="entityType" value={detail.record.entityType} /><input type="hidden" name="entityId" value={detail.record.id} />
            <label className="field"><span>Related record</span><select name="target" required defaultValue=""><option value="" disabled>Choose a record</option>{candidates.map((candidate) => <option key={`${candidate.entityType}-${candidate.id}`} value={`${candidate.entityType}:${candidate.id}`}>{candidate.name} · {candidate.entityType}</option>)}</select></label>
            {detail.record.entityType !== "note" && <label className="field"><span>Relationship</span><select name="relationshipKind" defaultValue="related-to">{relationshipKinds.map((kind) => <option key={kind}>{kind}</option>)}</select></label>}
            <label className="field"><span>Context (optional)</span><input name="relationshipNotes" /></label><button className="btn btn-secondary btn-sm" disabled={linkBusy}>Add link</button>
          </form>}
        </section>

        <div className="em-sep" />
        <section className="library-inspector-section" aria-labelledby="mentions-title">
          <h2 id="mentions-title">Mention suggestions</h2>
          {detail.mentions.filter((mention) => mention.state === "suggested").length ? <ul className="mention-list">{detail.mentions.filter((mention) => mention.state === "suggested").map((mention) => <li key={mention.id}><span>“{mention.mention_text}” may refer to <strong>{mention.related_name}</strong>.</span><div><button className="btn btn-secondary btn-sm" disabled={linkBusy} onClick={() => void resolveMention(mention.id, "accepted")}>Accept link</button><button className="btn btn-ghost btn-sm" disabled={linkBusy} onClick={() => void resolveMention(mention.id, "dismissed")}>Dismiss</button></div></li>)}</ul> : <p className="inspector-empty">No mention suggestions.</p>}
          <h3>Backlinks</h3>
          {detail.backlinks.length ? <ul className="backlink-list">{detail.backlinks.map((mention) => <li key={mention.id}>{mention.source_type && mention.source_id ? <Link href={recordPath(root, mention.source_type, mention.source_id)}>{mention.source_name || "Unavailable record"}</Link> : <span>{mention.source_name || "Unavailable record"}</span>}<button className="btn btn-ghost btn-sm" disabled={linkBusy} onClick={() => void resolveMention(mention.id, "dismissed")}>Remove link</button></li>)}</ul> : <p className="inspector-empty">No accepted backlinks.</p>}
          {linkError && <div className="validation-warning">{linkError}</div>}
        </section>
      </main>
    </div>
  );
}

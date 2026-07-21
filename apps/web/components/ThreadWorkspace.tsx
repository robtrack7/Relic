"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { createLibraryLinkAction, mutateThreadObjectiveAction, removeLibraryLinkAction, updateThreadDetailsAction } from "@/app/actions";
import { sagaPath } from "@/lib/routes";
import type { IdParams, SessionStatus, ThreadDetail, ThreadTimelineEntry } from "@/lib/types";

const relationshipKinds = ["member-of", "located-at", "owns", "allied-with", "opposed-to", "related-to"];
type SessionOption = { id: string; name: string; session_number?: number | null; status?: SessionStatus | string };

export function ThreadWorkspace({ params, initialDetail, initialTimeline, sessions = [] }: { params: IdParams; initialDetail: ThreadDetail; initialTimeline: ThreadTimelineEntry[]; sessions?: SessionOption[] }) {
  const [detail, setDetail] = useState(initialDetail);
  const [timeline, setTimeline] = useState(initialTimeline);
  const [title, setTitle] = useState(initialDetail.record.name);
  const [summary, setSummary] = useState(initialDetail.record.summary ?? "");
  const [state, setState] = useState(initialDetail.record.status ?? "active");
  const [resolution, setResolution] = useState(initialDetail.record.resolution_details ?? "");
  const [sessionId, setSessionId] = useState("");
  const [newObjective, setNewObjective] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const sessionRef = useRef<HTMLSelectElement>(null);
  const root = sagaPath(params);
  const objectives = detail.record.objectives_log;

  function baseForm() {
    const form = new FormData();
    form.set("workspaceId", params.workspaceId); form.set("worldId", params.worldId); form.set("sagaId", params.sagaId);
    form.set("threadId", detail.record.id); form.set("entityType", "thread"); form.set("entityId", detail.record.id);
    form.set("expectedVersion", detail.record.updated_at ?? ""); form.set("sessionId", sessionRef.current?.value ?? sessionId);
    return form;
  }

  function accept(next: { detail: ThreadDetail; timeline: ThreadTimelineEntry[] }) {
    setDetail(next.detail); setTimeline(next.timeline); setNotice("Saved");
  }

  async function saveThread() {
    const form = baseForm(); form.set("threadTitle", title); form.set("threadSummary", summary); form.set("threadState", state); form.set("resolutionDetails", resolution);
    setBusy(true); setError(""); setNotice("");
    try { const result = await updateThreadDetailsAction(form); if (!result.ok) setError(result.error); else accept(result); }
    finally { setBusy(false); }
  }

  async function mutate(operation: string, objectiveId?: string, objectiveText?: string, targetIndex?: number) {
    const form = baseForm(); form.set("operation", operation);
    if (objectiveId) form.set("objectiveId", objectiveId); if (objectiveText !== undefined) form.set("objectiveText", objectiveText); if (targetIndex !== undefined) form.set("targetIndex", String(targetIndex));
    setBusy(true); setError(""); setNotice("");
    try { const result = await mutateThreadObjectiveAction(form); if (!result.ok) setError(result.error); else { accept(result); if (operation === "create") setNewObjective(""); } }
    finally { setBusy(false); }
  }

  async function addRelated(form: FormData) {
    const context = baseForm();
    for (const [key, value] of form.entries()) context.set(key, value);
    const [targetType, targetId] = String(form.get("target") ?? "").split(":"); context.set("targetType", targetType ?? ""); context.set("targetId", targetId ?? "");
    setBusy(true); setError("");
    try { const result = await createLibraryLinkAction(context); if (!result.ok) setError(result.error); else setDetail(result.detail as unknown as ThreadDetail); }
    finally { setBusy(false); }
  }

  async function removeRelated(linkId: string, linkType: string) {
    const form = baseForm(); form.set("linkId", linkId); form.set("linkType", linkType);
    setBusy(true); setError("");
    try { const result = await removeLibraryLinkAction(form); if (!result.ok) setError(result.error); else setDetail(result.detail as unknown as ThreadDetail); }
    finally { setBusy(false); }
  }

  return <div className="d3-thread-workspace">
    <div className="thread-edit-grid">
      <section className="card td-card thread-editor" aria-label="Thread details">
        <div className="td-eyebrow">Thread details</div>
        <label className="field"><span>Title</span><input aria-label="Thread title" className="settings-field" value={title} onChange={(event) => setTitle(event.target.value)} /></label>
        <label className="field"><span>Summary</span><textarea aria-label="Thread summary" className="settings-field" rows={3} value={summary} onChange={(event) => setSummary(event.target.value)} /></label>
        <div className="thread-state-fields">
          <label className="field"><span>State</span><select aria-label="Thread state" value={state} onChange={(event) => setState(event.target.value)}><option value="active">Active</option><option value="loose">Loose</option><option value="dormant">Dormant</option><option value="failed">Failed</option><option value="resolved">Resolved</option></select></label>
          {sessions.length > 0 && <label className="field"><span>Session context</span><select ref={sessionRef} aria-label="Session context" value={sessionId} onChange={(event) => setSessionId(event.target.value)}><option value="">No Session</option>{sessions.map((session) => <option key={session.id} value={session.id}>Session {session.session_number ?? "?"} · {session.name}</option>)}</select></label>}
        </div>
        <label className="field"><span>Resolution details</span><textarea aria-label="Resolution details" className="settings-field" rows={3} value={resolution} onChange={(event) => setResolution(event.target.value)} /></label>
        {(state === "failed" || state === "resolved") && <p className="field-help">Explain why this Thread failed or resolved.</p>}
        <button className="btn btn-ink" disabled={busy || !title.trim() || ((state === "failed" || state === "resolved") && !resolution.trim())} onClick={() => void saveThread()}>Save Thread</button>
      </section>

      <section className="card td-card" role="region" aria-label="Thread objectives">
        <div className="td-eyebrow">Objectives</div>
        <div className="thread-objective-list">{objectives.map((objective, index) => <div className={`thread-objective ${objective.state}`} key={objective.id}>
          <button className="objective-toggle" aria-label={`${objective.state === "completed" ? "Reopen" : "Complete"} ${objective.text}`} disabled={busy} onClick={() => void mutate(objective.state === "completed" ? "reopen" : "complete", objective.id)}>{objective.state === "completed" ? "✓" : "○"}</button>
          <input aria-label={`Objective ${index + 1}`} defaultValue={objective.text} onBlur={(event) => { if (event.target.value.trim() && event.target.value.trim() !== objective.text) void mutate("edit", objective.id, event.target.value); }} />
          <span className="objective-date">{objective.completed_at ? `Completed ${new Date(objective.completed_at).toLocaleDateString()}` : "Open"}</span>
          <div className="objective-order"><button aria-label={`Move ${objective.text} up`} disabled={busy || index === 0} onClick={() => void mutate("move", objective.id, undefined, index - 1)}>↑</button><button aria-label={`Move ${objective.text} down`} disabled={busy || index === objectives.length - 1} onClick={() => void mutate("move", objective.id, undefined, index + 1)}>↓</button></div>
        </div>)}</div>
        {!objectives.length && <p className="inspector-empty">No objectives yet.</p>}
        <div className="thread-objective-add"><input aria-label="New objective" placeholder="What needs to happen?" value={newObjective} onChange={(event) => setNewObjective(event.target.value)} /><button className="btn btn-secondary btn-sm" aria-label="Add objective" disabled={busy || !newObjective.trim()} onClick={() => void mutate("create", undefined, newObjective)}>Add objective</button></div>
      </section>
    </div>

    <div className="thread-history-grid">
      <section className="card td-card" role="region" aria-label="Related entities">
        <div className="td-eyebrow">Related entities</div>
        {detail.relationships.length ? <ul className="relationship-list">{detail.relationships.map((relation) => <li key={`${relation.link_type}-${relation.id}`}><div><span className="chip stone">{relation.kind}</span> {relation.related_name ? <Link href={`${root}/entities/${relation.related_type}/${relation.related_id}`}>{relation.related_name}</Link> : <span>Unavailable record</span>} {relation.related_archived && <span className="chip rust">Archived</span>}{relation.notes && <p>{relation.notes}</p>}</div><button className="btn btn-ghost btn-sm" aria-label={`Remove ${relation.related_name || "Unavailable record"}`} disabled={busy} onClick={() => void removeRelated(relation.id, relation.link_type)}>Remove</button></li>)}</ul> : <p className="inspector-empty">No related entities yet.</p>}
        {detail.candidates.length > 0 && <form action={(form) => void addRelated(form)} className="relationship-picker"><label className="field"><span>Related record</span><select name="target" required defaultValue=""><option value="" disabled>Choose a record</option>{detail.candidates.filter((candidate) => candidate.entityType !== "note").map((candidate) => <option key={`${candidate.entityType}-${candidate.id}`} value={`${candidate.entityType}:${candidate.id}`}>{candidate.name} · {candidate.entityType}</option>)}</select></label><label className="field"><span>Relationship</span><select name="relationshipKind" defaultValue="related-to">{relationshipKinds.map((kind) => <option key={kind}>{kind}</option>)}</select></label><label className="field"><span>Context</span><input name="relationshipNotes" /></label><button className="btn btn-secondary btn-sm" disabled={busy}>Add related entity</button></form>}
      </section>

      <section className="card td-card thread-timeline" role="region" aria-label="Thread timeline">
        <div className="td-eyebrow">Read-only timeline</div>
        <p className="timeline-note">Derived from Session pins, source references, objectives, and canon audit. Timeline evidence cannot be edited here.</p>
        {timeline.length ? <div className="timeline-axis">{timeline.map((entry) => <article key={`${entry.source_type}-${entry.event_id}`}><div className="timeline-marker" /><div><span className="timeline-session">{entry.session_number ? `Session ${entry.session_number}${entry.session_name && entry.session_name !== `Session ${entry.session_number}` ? ` · ${entry.session_name}` : ""}` : "Between Sessions"}</span><h3>{entry.title}</h3>{entry.detail && <p>{entry.detail}</p>}<small>{entry.source_type.replaceAll("_", " ")} · {entry.source_id}</small></div></article>)}</div> : <p className="inspector-empty">No traceable Thread history yet.</p>}
      </section>
    </div>
    {(error || notice) && <div className={error ? "validation-warning" : "autosave-indicator saved"} role="status">{error || notice}</div>}
  </div>;
}

"use client";

import { useMemo, useState } from "react";
import { refreshDraftBaselineAction, resolveDraftAction, resolveDraftSelectionAction } from "@/app/actions";
import { HiddenContextFields } from "@/components/HiddenContextFields";
import { RelicIcon } from "@/components/RelicIcon";
import { DraftCitationList } from "@/components/relic-draft/DraftCitationList";
import type { ApprovalDraft, ApprovalFieldDiff } from "@/lib/data";
import type { IdParams } from "@/lib/types";

type Filters = { query: string; status: string; type: string; batch: string; confidence: string; conflict: string };

function displayValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "Not set";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

function conflictCopy(kind: string) {
  if (kind === "stale_target") return "Canon changed after this proposal was created. Refresh against current canon, review the new diff, then approve explicitly.";
  if (kind === "missing_target") return "The affected canon target no longer exists. Reject this proposal or merge its useful content into a valid same-Saga target.";
  if (kind === "archived_target") return "The target is already archived. This proposal cannot overwrite or revive it.";
  if (kind === "broken_source") return "Required evidence is missing or broken. Approval is blocked until evidence is restored; rejection remains safe.";
  if (kind === "source_drift") return "A cited transcript changed after synthesis. Inspect frozen and current text, then acknowledge the drift explicitly if the proposal is still correct.";
  return null;
}

function consequence(draft: ApprovalDraft) {
  if (draft.change_kind === "archive_request") return "Archive keeps the record and backlinks intact; it does not delete data. Approval hides it from active canon and records one canon audit entry.";
  if (draft.change_kind === "merge") return "Merge chooses an existing identity. It does not change canon now; a source-linked update returns to this queue for separate approval.";
  if (draft.entity_type === "session") return `Approval adds this implication to ${draft.title}'s prep suggestions under normal Session state rules and records one canon audit entry.`;
  if (draft.change_kind === "create") return `Approval creates ${draft.title} in canon and records one canon audit entry with its sources and synthesis provenance.`;
  return `Approval writes the reviewed fields to ${draft.title} and records one canon audit entry with its sources and synthesis provenance.`;
}

function editableValue(diff: ApprovalFieldDiff, value: unknown, onChange: (value: unknown) => void) {
  if (diff.value_type === "boolean") {
    return <input aria-label={`New ${diff.label.toLowerCase()}`} type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} />;
  }
  if (diff.value_type === "object" || diff.value_type === "array") {
    return <textarea aria-label={`New ${diff.label.toLowerCase()}`} value={displayValue(value)} onChange={(event) => { try { onChange(JSON.parse(event.target.value)); } catch { onChange(event.target.value); } }} />;
  }
  return <textarea aria-label={`New ${diff.label.toLowerCase()}`} value={value === null || value === undefined ? "" : String(value)} onChange={(event) => onChange(diff.value_type === "number" ? Number(event.target.value) : event.target.value)} />;
}

function DraftCard({ draft, params, sagaRoot, selected, onSelect }: { draft: ApprovalDraft; params: IdParams; sagaRoot: string; selected: boolean; onSelect: (selected: boolean) => void }) {
  const [edited, setEdited] = useState<Record<string, unknown>>({ ...draft.editable_payload });
  const [acknowledgeDrift, setAcknowledgeDrift] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const dirty = JSON.stringify(edited) !== JSON.stringify(draft.editable_payload);
  const sourceDriftReady = draft.conflict.kind === "source_drift" && acknowledgeDrift;
  const blocking = draft.conflict.blocking && !sourceDriftReady;
  const compatible = draft.state === "pending" && !blocking && !["merge", "archive_request"].includes(draft.change_kind) && !dirty;
  const conflict = conflictCopy(draft.conflict.kind);

  return (
    <article id={`draft-${draft.id}`} className={`card approval-item ${blocking ? "has-conflict" : ""}`} aria-label={`${draft.title} ${draft.change_kind} proposal`}>
      <div className="approval-item-head">
        <label className="approval-select">
          <input type="checkbox" aria-label={`Select ${draft.title}`} checked={selected} disabled={!compatible} onChange={(event) => onSelect(event.target.checked)} />
          <span>Select</span>
        </label>
        <div>
          <div className="dd-eyebrow"><RelicIcon name="review" size={11} /> {draft.entity_type} · {draft.change_kind}</div>
          <h2 className="dd-title">{draft.title}</h2>
        </div>
        <span className={`conf-badge ${draft.confidence_band ?? "medium"}`}>{draft.confidence_band ?? "medium"} confidence</span>
      </div>

      {conflict && <div className="conflict-panel"><div className="conflict-title"><RelicIcon name="alert" size={11} /> {draft.conflict.kind.replaceAll("_", " ")}</div><div className="conflict-desc">{conflict}</div></div>}
      {draft.conflict.concurrent_count > 0 && <div className="approval-warning">{draft.conflict.concurrent_count} other pending proposal{draft.conflict.concurrent_count === 1 ? "" : "s"} changes the same target fields. Approving one can make the others stale.</div>}

      <div className="approval-diffs" aria-label="Field changes">
        <div className="approval-diff-head"><span>Field</span><span>Current canon</span><span>Proposed / edited</span></div>
        {draft.field_diffs.map((diff) => (
          <div className="approval-diff-row" key={diff.field}>
            <strong>{diff.label}</strong>
            <div className="approval-old">{displayValue(diff.old)}</div>
            <div className="approval-new">{editableValue(diff, edited[diff.field] ?? diff.new, (next) => { setEdited((current) => ({ ...current, [diff.field]: next })); onSelect(false); })}</div>
          </div>
        ))}
      </div>

      <div className="approval-consequence"><strong>What happens:</strong> {consequence(draft)}</div>
      <div className="source-dock">
        <div className="source-dock-label">Trust context</div>
        <div className="source-ref">
          <em>{draft.confidence_reason?.replaceAll("_", " ") ?? "Unspecified evidence quality"}</em> · {draft.provenance.ai_task_name ?? "unknown task"} · {draft.provenance.prompt_version ?? "unknown prompt"} · {draft.provenance.model ?? "unknown model"} via {draft.provenance.provider ?? "unknown provider"}
        </div>
        {draft.batch_id && <div className="source-ref">Batch {draft.batch_id.slice(0, 8)} · affected target {draft.target_entity_id?.slice(0, 8) ?? "new canon record"}</div>}
        <DraftCitationList sagaRoot={sagaRoot} citations={[...draft.citations]} />
      </div>

      {draft.conflict.kind === "source_drift" && (
        <label className="approval-ack"><input type="checkbox" checked={acknowledgeDrift} onChange={(event) => setAcknowledgeDrift(event.target.checked)} /> I inspected the changed source and still approve this proposal.</label>
      )}
      {draft.change_kind === "archive_request" && (
        <label className="approval-ack"><input type="checkbox" checked={confirmArchive} onChange={(event) => setConfirmArchive(event.target.checked)} /> Archive this record without deleting it.</label>
      )}

      <div className="dd-actions approval-actions">
        <form action={resolveDraftAction}>
          <HiddenContextFields params={params} />
          <input type="hidden" name="draftId" value={draft.id} />
          <input type="hidden" name="resolutionAction" value={dirty ? "edit_and_approve" : "approve"} />
          <input type="hidden" name="committedPayload" value={JSON.stringify(edited)} />
          <input type="hidden" name="acknowledgeSourceDrift" value={acknowledgeDrift ? "true" : "false"} />
          <button className={`btn ${draft.change_kind === "archive_request" ? "btn-rust" : "btn-verdigris"} btn-sm`} type="submit" disabled={draft.state !== "pending" || blocking || draft.change_kind === "merge" || (draft.change_kind === "archive_request" && !confirmArchive)} aria-label="Approve proposal"><RelicIcon name="check" size={12} /> {dirty ? "Edit & approve" : draft.change_kind === "archive_request" ? "Approve archive" : "Approve"}</button>
        </form>
        {draft.conflict.kind === "stale_target" && (
          <form action={refreshDraftBaselineAction}>
            <HiddenContextFields params={params} /><input type="hidden" name="draftId" value={draft.id} />
            <button className="btn btn-secondary btn-sm" type="submit">Refresh against current canon</button>
          </form>
        )}
        {draft.change_kind === "merge" && draft.entity_type !== "session" && <form action={resolveDraftAction} className="approval-merge-form">
          <HiddenContextFields params={params} /><input type="hidden" name="draftId" value={draft.id} /><input type="hidden" name="resolutionAction" value="merge" />
          <input className="settings-field" name="mergeTargetId" aria-label={`Merge target ID for ${draft.title}`} placeholder="Same-Saga target ID" />
          <button className="btn btn-secondary btn-sm" type="submit">Merge</button>
        </form>}
        <form action={resolveDraftAction} className="approval-reject-form">
          <HiddenContextFields params={params} /><input type="hidden" name="draftId" value={draft.id} /><input type="hidden" name="resolutionAction" value="reject" />
          <select className="settings-field" name="rejectionTag" aria-label={`Rejection reason for ${draft.title}`} defaultValue="redundant"><option value="redundant">Redundant</option><option value="hallucinated">Hallucinated</option><option value="wrong_tone">Wrong tone</option><option value="ambiguous_source">Ambiguous source</option><option value="gm_already_changed">GM already changed</option></select>
          <input className="settings-field" name="rejectionNote" aria-label={`Rejection note for ${draft.title}`} placeholder="Optional note" />
          <button className="btn btn-rust btn-sm" type="submit" aria-label="Reject proposal"><RelicIcon name="x" size={12} /> Reject</button>
        </form>
      </div>
    </article>
  );
}

export function ApprovalQueueWorkspace({ params, sagaRoot, drafts }: { params: IdParams; sagaRoot: string; drafts: readonly ApprovalDraft[] }) {
  const [filters, setFilters] = useState<Filters>({ query: "", status: "pending", type: "all", batch: "all", confidence: "all", conflict: "all" });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const batches = useMemo(() => [...new Set(drafts.map((draft) => draft.batch_id).filter(Boolean) as string[])], [drafts]);
  const filtered = useMemo(() => drafts.filter((draft) => {
    const haystack = `${draft.title} ${draft.entity_type} ${draft.change_kind} ${JSON.stringify(draft.editable_payload)} ${draft.citations.map((citation) => citation.frozen_excerpt ?? "").join(" ")}`.toLowerCase();
    return (!filters.query || haystack.includes(filters.query.toLowerCase()))
      && (filters.status === "all" || draft.state === filters.status)
      && (filters.type === "all" || draft.entity_type === filters.type)
      && (filters.batch === "all" || draft.batch_id === filters.batch)
      && (filters.confidence === "all" || draft.confidence_band === filters.confidence)
      && (filters.conflict === "all" || (filters.conflict === "conflict" ? draft.conflict.kind !== "none" || draft.conflict.concurrent_count > 0 : draft.conflict.kind === "none" && draft.conflict.concurrent_count === 0));
  }), [drafts, filters]);
  const compatible = filtered.filter((draft) => draft.state === "pending" && !draft.conflict.blocking && !["merge", "archive_request"].includes(draft.change_kind));
  const selectedCompatible = compatible.filter((draft) => selected.has(draft.id));
  const setFilter = (key: keyof Filters, value: string) => setFilters((current) => ({ ...current, [key]: value }));

  return (
    <div className="approval-workspace">
      <div className="card approval-toolbar">
        <div className="approval-filters">
          <label><span>Search</span><input className="settings-field" aria-label="Search proposals" value={filters.query} onChange={(event) => setFilter("query", event.target.value)} placeholder="Target, field, source…" /></label>
          <label><span>Status</span><select className="settings-field" aria-label="Status filter" value={filters.status} onChange={(event) => setFilter("status", event.target.value)}><option value="pending">Pending</option><option value="all">All</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="merged">Merged</option><option value="superseded">Superseded</option></select></label>
          <label><span>Draft type</span><select className="settings-field" aria-label="Draft type filter" value={filters.type} onChange={(event) => setFilter("type", event.target.value)}><option value="all">All</option>{[...new Set(drafts.map((draft) => draft.entity_type))].map((type) => <option key={type}>{type}</option>)}</select></label>
          <label><span>Batch</span><select className="settings-field" aria-label="Batch filter" value={filters.batch} onChange={(event) => setFilter("batch", event.target.value)}><option value="all">All</option>{batches.map((batch) => <option key={batch} value={batch}>{batch.slice(0, 8)}</option>)}</select></label>
          <label><span>Confidence</span><select className="settings-field" aria-label="Confidence filter" value={filters.confidence} onChange={(event) => setFilter("confidence", event.target.value)}><option value="all">All</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></label>
          <label><span>Conflicts</span><select className="settings-field" aria-label="Conflict filter" value={filters.conflict} onChange={(event) => setFilter("conflict", event.target.value)}><option value="all">All</option><option value="conflict">Needs resolution</option><option value="clear">Clear</option></select></label>
        </div>
        <div className="approval-bulk-actions">
          <form action={resolveDraftSelectionAction}>
            <HiddenContextFields params={params} />{selectedCompatible.map((draft) => <input key={draft.id} type="hidden" name="draftId" value={draft.id} />)}
            <button className="btn btn-secondary" type="submit" disabled={!selectedCompatible.length}>Approve selected</button>
          </form>
          <form action={resolveDraftSelectionAction}>
            <HiddenContextFields params={params} />{compatible.map((draft) => <input key={draft.id} type="hidden" name="draftId" value={draft.id} />)}
            <button className="btn btn-verdigris" type="submit" disabled={!compatible.length}>Approve all {compatible.length} compatible proposal{compatible.length === 1 ? "" : "s"}</button>
          </form>
        </div>
        <p className="approval-bulk-copy">Bulk approval is explicit: only the visible, compatible proposals listed here commit. Conflicts, broken sources, merge decisions, and edited drafts remain for one-by-one review.</p>
      </div>

      {filtered.length ? <div className="approval-list">{filtered.map((draft) => <DraftCard key={draft.id} draft={draft} params={params} sagaRoot={sagaRoot} selected={selected.has(draft.id)} onSelect={(checked) => setSelected((current) => { const next = new Set(current); if (checked) next.add(draft.id); else next.delete(draft.id); return next; })} />)}</div> : <div className="empty-state"><div className="empty-title">No proposals match these filters</div><div className="empty-desc">Adjust search or filters. Queue records have not been discarded.</div></div>}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { commitSagaWorkshopAction, saveSagaWorkshopAction } from "@/app/actions";
import { SourceContextDisclosure } from "@/components/SourceContextDisclosure";
import type { SagaWorkshop } from "@/lib/data";
import { sagaPath } from "@/lib/routes";

type Row = Record<string, unknown>;
const activeStatuses = new Set(["queued", "running"]);
const failedStatuses = new Set(["quota_blocked", "provider_unavailable", "retrieval_unavailable", "validation_failed", "failed", "dead_letter"]);
const asRow = (value: unknown): Row => value && typeof value === "object" && !Array.isArray(value) ? value as Row : {};
const asRows = (value: unknown): Row[] => Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === "object" && !Array.isArray(item)) : [];
const text = (value: unknown) => typeof value === "string" ? value : "";

export function SagaWorkshopReview({ workshop, error }: { workshop: SagaWorkshop; error?: string }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Row>(workshop.draft_payload ?? {});
  const [version, setVersion] = useState(workshop.review_version);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const saga = asRow(draft.saga);
  const entities = asRows(draft.entities);
  const prep = asRow(draft.session_1_prep);

  useEffect(() => {
    if (!activeStatuses.has(workshop.generation_status)) return;
    const timer = window.setInterval(() => router.refresh(), 1800);
    return () => window.clearInterval(timer);
  }, [router, workshop.generation_status]);

  useEffect(() => {
    if (dirty) return;
    setDraft(workshop.draft_payload ?? {});
    setVersion(workshop.review_version);
  }, [dirty, workshop.draft_payload, workshop.review_version]);

  const sourceMap = useMemo(() => new Map(workshop.sources.map((source) => [source.source_id, source])), [workshop.sources]);
  const citations = (sourceIds: unknown) => (Array.isArray(sourceIds) ? sourceIds : []).flatMap((sourceId, index) => {
    const source = sourceMap.get(String(sourceId));
    return source ? [<SourceContextDisclosure key={source.source_id} index={index} citation={{ sourceId: source.source_id, context: {
      status: "available", source_kind: source.kind, label: source.title, frozen_excerpt: source.excerpt,
      current_text: source.excerpt, drift_state: "exact"
    } }} />] : [];
  });
  const updateSaga = (field: string, value: string) => { setDraft((current) => ({ ...current, saga: { ...asRow(current.saga), [field]: value } })); setDirty(true); };
  const updateEntity = (index: number, field: string, value: string) => {
    setDraft((current) => ({ ...current, entities: asRows(current.entities).map((entry, row) => row === index ? { ...entry, [field]: value } : entry) })); setDirty(true);
  };
  const updatePrep = (field: string, value: string) => { setDraft((current) => ({ ...current, session_1_prep: { ...asRow(current.session_1_prep), [field]: value } })); setDirty(true); };
  const reviewDraft = useMemo(() => ({
    ...draft,
    entities: entities.filter((entry) => !excluded.has(text(entry.temp_id))),
    relationships: asRows(draft.relationships).filter((entry) => !excluded.has(text(entry.from_temp_id)) && !excluded.has(text(entry.to_temp_id))),
    session_1_prep: {
      ...prep,
      pinned_entity_temp_ids: (Array.isArray(prep.pinned_entity_temp_ids) ? prep.pinned_entity_temp_ids : []).filter((id) => !excluded.has(String(id))),
      active_thread_temp_ids: (Array.isArray(prep.active_thread_temp_ids) ? prep.active_thread_temp_ids : []).filter((id) => !excluded.has(String(id)))
    }
  }), [draft, entities, excluded, prep]);

  async function save() {
    setSaving(true); setNotice("Saving your review…");
    const form = new FormData(); form.set("workshopId", workshop.id); form.set("expectedVersion", String(version)); form.set("draft", JSON.stringify(reviewDraft));
    const result = await saveSagaWorkshopAction(form);
    setSaving(false);
    if (!result.ok) { setNotice(result.category === "stale" ? "This draft changed elsewhere. Refresh before saving again." : "The draft could not be saved. Your edits remain on this screen."); return; }
    setDraft(reviewDraft); setExcluded(new Set()); setVersion(result.reviewVersion ?? version + 1); setDirty(false); setNotice("Draft saved. Nothing has been published to canon.");
  }

  if (workshop.state === "committed" && workshop.world_id && workshop.saga_id) {
    const base = sagaPath({ workspaceId: workshop.workspace_id, worldId: workshop.world_id, sagaId: workshop.saga_id });
    return <section className="auth-card" aria-live="polite">
      <div className="page-eyebrow">The Loom · published by the GM</div>
      <h1 className="auth-title">Saga published exactly once</h1>
      <p className="auth-subtitle">Your reviewed draft is now canon. Removed proposals were not created, and the frozen workshop remains available as provenance.</p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {workshop.committed_session_id && <Link className="btn btn-ink" href={`${base}/sessions/${workshop.committed_session_id}/prep`}>Open Session 1 Prep</Link>}
        <Link className="btn btn-ghost" href={base}>Open Saga</Link>
      </div>
    </section>;
  }

  if (activeStatuses.has(workshop.generation_status)) return (
    <section className="auth-card" aria-live="polite">
      <div className="page-eyebrow">The Loom · working in the background</div>
      <h1 className="auth-title">Assembling your Saga draft</h1>
      <p className="auth-subtitle">The Loom is shaping lore, entities, relationships, and Session 1 from the frozen evidence. You can leave and return; this workshop will recover after refresh or restart.</p>
      <div className="notice">{workshop.generation_status === "queued" ? "Waiting for the drafting worker…" : "Drafting and validating every cited result…"}</div>
      <Link className="btn btn-ghost" href="/app">Leave safely</Link>
    </section>
  );

  if (failedStatuses.has(workshop.generation_status)) return (
    <section className="auth-card" aria-live="assertive">
      <div className="page-eyebrow">The Loom · manual fallback</div>
      <h1 className="auth-title">Your manual path is still available</h1>
      <p className="auth-subtitle">The draft could not be generated ({workshop.failure_category ?? workshop.generation_status}). Your input remains in this recoverable workshop, and no canon, Thread, entity, Session, or Prep record was created.</p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><Link className="btn btn-ink" href="/app/new-saga">Create manually</Link><Link className="btn btn-ghost" href="/app">Leave safely</Link></div>
    </section>
  );

  return (
    <section className="workshop-review" aria-labelledby="loom-review-title">
      <header className="auth-card">
        <div className="page-eyebrow">The Loom · non-canon review</div>
        <h1 className="auth-title" id="loom-review-title">Edit the final draft</h1>
        <p className="auth-subtitle">Everything below is ephemeral until you choose <strong>Commit saga</strong>. Edit freely, inspect every source, or remove a proposal.</p>
        {error && <p className="danger-note">{error}</p>}
        <div className="notice" role="status" aria-live="polite">{notice || "Draft validated. No automatic canon writes occurred."}</div>
      </header>

      <div className="auth-card form-stack">
        <div className="page-eyebrow">Saga premise</div>
        <label className="field"><span>Name</span><input className="input" value={text(saga.name)} maxLength={120} onChange={(event) => updateSaga("name", event.target.value)} /></label>
        <label className="field"><span>Premise</span><textarea className="textarea" rows={5} value={text(saga.premise)} maxLength={3000} onChange={(event) => updateSaga("premise", event.target.value)} /></label>
      </div>

      <div className="form-stack" aria-label="Proposed lore and entities">
        <div className="page-eyebrow">Deep lore and entities · {entities.length - excluded.size} selected</div>
        {entities.map((entity, index) => {
          const id = text(entity.temp_id); const removed = excluded.has(id);
          return <article className={`card ${removed ? "muted" : "accent"}`} key={id}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <span className="chip">{text(entity.entity_type)}</span>
              <button className="btn btn-ghost" type="button" onClick={() => { setExcluded((current) => { const next = new Set(current); removed ? next.delete(id) : next.add(id); return next; }); setDirty(true); }}>{removed ? "Restore" : "Remove from draft"}</button>
            </div>
            <label className="field"><span>Name</span><input className="input" disabled={removed} value={text(entity.name)} onChange={(event) => updateEntity(index, "name", event.target.value)} /></label>
            <label className="field"><span>Summary</span><textarea className="textarea" disabled={removed} rows={3} value={text(entity.summary)} onChange={(event) => updateEntity(index, "summary", event.target.value)} /></label>
            <label className="field"><span>Deep lore</span><textarea className="textarea" disabled={removed} rows={6} value={text(entity.narrative)} onChange={(event) => updateEntity(index, "narrative", event.target.value)} /></label>
            <div className="guide-citations" aria-label="Sources used">Sources used {citations(entity.sources)}</div>
          </article>;
        })}
      </div>

      <div className="auth-card form-stack">
        <div className="page-eyebrow">Session 1 draft</div>
        <label className="field"><span>Objective</span><textarea className="textarea" rows={3} value={text(prep.objective)} onChange={(event) => updatePrep("objective", event.target.value)} /></label>
        <label className="field"><span>Opening scene</span><textarea className="textarea" rows={5} value={text(prep.opening_scene)} onChange={(event) => updatePrep("opening_scene", event.target.value)} /></label>
        <label className="field"><span>Scene notes</span><textarea className="textarea" rows={7} value={text(prep.scene_notes)} onChange={(event) => updatePrep("scene_notes", event.target.value)} /></label>
      </div>

      <footer className="auth-card form-stack">
        <button className="button" type="button" disabled={saving || !dirty} onClick={save}>{saving ? "Saving…" : "Save edits"}</button>
        <form action={commitSagaWorkshopAction}>
          <input type="hidden" name="workshopId" value={workshop.id} /><input type="hidden" name="expectedVersion" value={version} /><input type="hidden" name="commitKey" value={workshop.id} />
          <button className="button" type="submit" disabled={dirty || saving}>Commit saga</button>
        </form>
        <p className="muted">Commit creates the Saga, selected entities and relationships, and Session 1 exactly once. Save any edits first. This is the explicit canon confirmation.</p>
      </footer>
    </section>
  );
}

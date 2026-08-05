"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { commitSagaWorkshopAction, requestSagaWorkshopRegenerationAction, reviewSagaWorkshopRegenerationAction, saveSagaWorkshopAction } from "@/app/actions";
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
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const regenKeys = useRef(new Map<string, string>());
  const reviewKeys = useRef(new Map<string, string>());
  const saga = asRow(draft.saga);
  const worldUpdates = asRow(draft.world_updates);
  const secrets = asRows(draft.gm_secrets);
  const entities = asRows(draft.entities);
  const relationships = asRows(draft.relationships);
  const prep = asRow(draft.session_1_prep);

  useEffect(() => {
    const regenerationActive = workshop.regeneration_requests?.some((request) => activeStatuses.has(request.status));
    if (!activeStatuses.has(workshop.generation_status) && !regenerationActive) return;
    const timer = window.setInterval(() => router.refresh(), 1800);
    return () => window.clearInterval(timer);
  }, [router, workshop.generation_status, workshop.regeneration_requests]);

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
  const updateEntity = (index: number, field: string, value: unknown) => {
    setDraft((current) => ({ ...current, entities: asRows(current.entities).map((entry, row) => row === index ? { ...entry, [field]: value } : entry) })); setDirty(true);
  };
  const updateWorld = (field: string, value: string) => { setDraft((current) => ({ ...current, world_updates: { ...asRow(current.world_updates), [field]: value } })); setDirty(true); };
  const updateSecret = (index: number, value: string) => { setDraft((current) => ({ ...current, gm_secrets: asRows(current.gm_secrets).map((entry, row) => row === index ? { ...entry, text: value } : entry) })); setDirty(true); };
  const updateRelationship = (index: number, value: string) => { setDraft((current) => ({ ...current, relationships: asRows(current.relationships).map((entry, row) => row === index ? { ...entry, notes: value } : entry) })); setDirty(true); };
  const updatePrep = (field: string, value: string) => { setDraft((current) => ({ ...current, session_1_prep: { ...asRow(current.session_1_prep), [field]: value } })); setDirty(true); };
  const reviewDraft = useMemo(() => ({
    ...draft,
    entities: entities.filter((entry) => !excluded.has(text(entry.temp_id))),
    relationships: relationships.filter((entry) => !excluded.has(text(entry.source_temp_id)) && !excluded.has(text(entry.target_temp_id))),
    session_1_prep: {
      ...prep,
      pinned_temp_ids: (Array.isArray(prep.pinned_temp_ids) ? prep.pinned_temp_ids : []).filter((id) => !excluded.has(String(id))),
      active_thread_temp_ids: (Array.isArray(prep.active_thread_temp_ids) ? prep.active_thread_temp_ids : []).filter((id) => !excluded.has(String(id)))
    }
  }), [draft, entities, excluded, prep, relationships]);

  async function save() {
    setSaving(true); setNotice("Saving your review…");
    const form = new FormData(); form.set("workshopId", workshop.id); form.set("expectedVersion", String(version)); form.set("draft", JSON.stringify(reviewDraft));
    const result = await saveSagaWorkshopAction(form);
    setSaving(false);
    if (!result.ok) { setNotice(result.category === "stale" ? "This draft changed elsewhere. Refresh before saving again." : "The draft could not be saved. Your edits remain on this screen."); return; }
    setDraft(reviewDraft); setExcluded(new Set()); setVersion(result.reviewVersion ?? version + 1); setDirty(false); setNotice("Draft saved. Nothing has been published to canon.");
  }

  async function regenerate(sectionKind: string, targetTempId?: string) {
    if (!window.confirm("Regenerate only this section for 3 AI credits? The result will be a separate proposal and will not replace your current review until you accept it.")) return;
    const targetKey = `${sectionKind}:${targetTempId ?? "section"}`;
    const idempotencyKey = regenKeys.current.get(targetKey) ?? crypto.randomUUID();
    regenKeys.current.set(targetKey, idempotencyKey);
    setRegenerating(targetKey); setNotice("Queuing one targeted 3-credit proposal…");
    const form = new FormData();
    form.set("workshopId", workshop.id); form.set("expectedVersion", String(version)); form.set("sectionKind", sectionKind);
    if (targetTempId) form.set("targetTempId", targetTempId);
    form.set("idempotencyKey", idempotencyKey);
    const result = await requestSagaWorkshopRegenerationAction(form);
    setRegenerating(null);
    if (!result.ok) { setNotice(result.category === "stale" ? "The review changed. Save or refresh before requesting regeneration." : result.message ?? "Regeneration could not be queued."); return; }
    regenKeys.current.delete(targetKey); setNotice("Targeted proposal queued. It cannot replace unrelated edits."); router.refresh();
  }

  async function reviewRegeneration(requestId: string, action: "accept" | "reject") {
    const reviewKey = reviewKeys.current.get(requestId) ?? crypto.randomUUID();
    reviewKeys.current.set(requestId, reviewKey);
    setRegenerating(`review:${requestId}`); setNotice(action === "accept" ? "Checking the proposal against your current review version…" : "Rejecting the proposal…");
    const form = new FormData();
    form.set("workshopId", workshop.id); form.set("requestId", requestId); form.set("expectedVersion", String(version));
    form.set("reviewAction", action); form.set("reviewKey", reviewKey);
    const result = await reviewSagaWorkshopRegenerationAction(form);
    setRegenerating(null);
    if (!result.ok) { setNotice(result.category === "stale" ? "This proposal is stale and did not overwrite your newer edits." : result.message ?? "The proposal could not be reviewed."); return; }
    reviewKeys.current.delete(requestId);
    if (action === "accept" && result.reviewVersion) { setVersion(result.reviewVersion); setDirty(false); }
    setNotice(action === "accept" ? "Only the requested section was replaced. Nothing is canon yet." : "Proposal rejected. Your draft is unchanged.");
    router.refresh();
  }

  const regenerationPreview = (request: SagaWorkshop["regeneration_requests"][number]) => {
    const replacement = asRow(request.output_payload).replacement;
    if (Array.isArray(replacement)) return `${replacement.length} proposed items`;
    const row = asRow(replacement);
    return text(row.name) || text(row.premise) || text(row.summary) || text(row.objective) || "A complete replacement is ready for review.";
  };

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

      {workshop.regeneration_requests?.length > 0 && <div className="auth-card form-stack" aria-label="Targeted regeneration proposals">
        <div className="page-eyebrow">Targeted proposals · separately metered</div>
        {workshop.regeneration_requests.map((request) => <article className="card" key={request.id}>
          <span className="chip">{request.section_kind}{request.target_temp_id ? ` · ${request.target_temp_id}` : ""}</span>
          {activeStatuses.has(request.status) && <p>Generating only this section…</p>}
          {request.status === "complete" && <><p>{regenerationPreview(request)}</p><div className="form-stack"><button className="btn btn-ink" type="button" disabled={regenerating !== null} onClick={() => reviewRegeneration(request.id, "accept")}>Accept this section</button><button className="btn btn-ghost" type="button" disabled={regenerating !== null} onClick={() => reviewRegeneration(request.id, "reject")}>Reject</button></div></>}
          {failedStatuses.has(request.status) && <p className="danger-note">This proposal failed safely ({request.failure_category ?? request.status}). Your reviewed draft is unchanged.</p>}
        </article>)}
      </div>}

      <div className="auth-card form-stack">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><div className="page-eyebrow">Saga premise</div><button className="btn btn-ghost" type="button" disabled={dirty || regenerating !== null} onClick={() => regenerate("saga")}>Regenerate · 3 credits</button></div>
        <label className="field"><span>Name</span><input className="input" value={text(saga.name)} maxLength={120} onChange={(event) => updateSaga("name", event.target.value)} /></label>
        <label className="field"><span>Premise</span><textarea className="textarea" rows={5} value={text(saga.premise)} maxLength={3000} onChange={(event) => updateSaga("premise", event.target.value)} /></label>
        <label className="field"><span>Tone and genre</span><textarea className="textarea" rows={2} value={text(saga.tone)} maxLength={500} onChange={(event) => updateSaga("tone", event.target.value)} /></label>
        <label className="field"><span>Central conflict</span><textarea className="textarea" rows={3} value={text(saga.central_conflict)} maxLength={1500} onChange={(event) => updateSaga("central_conflict", event.target.value)} /></label>
        <label className="field"><span>First-session hook</span><textarea className="textarea" rows={3} value={text(saga.first_session_hook)} maxLength={1500} onChange={(event) => updateSaga("first_session_hook", event.target.value)} /></label>
      </div>

      <div className="auth-card form-stack">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><div className="page-eyebrow">World context · reviewed proposal</div><button className="btn btn-ghost" type="button" disabled={dirty || regenerating !== null} onClick={() => regenerate("world_updates")}>Regenerate · 3 credits</button></div>
        <p className="muted">For a new World these fields initialize its context. For an existing World they stay private on this Saga as a future World-update proposal; commit will not silently change shared canon.</p>
        <label className="field"><span>World summary</span><textarea className="textarea" rows={3} value={text(worldUpdates.summary)} maxLength={2000} onChange={(event) => updateWorld("summary", event.target.value)} /></label>
        <label className="field"><span>World AI context</span><textarea className="textarea" rows={4} value={text(worldUpdates.world_ai_context)} maxLength={5000} onChange={(event) => updateWorld("world_ai_context", event.target.value)} /></label>
      </div>

      <div className="auth-card form-stack">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><div className="page-eyebrow">GM secrets · private and never embedded</div><button className="btn btn-ghost" type="button" disabled={dirty || regenerating !== null} onClick={() => regenerate("gm_secrets")}>Regenerate · 3 credits</button></div>
        {secrets.map((secret, index) => <label className="field" key={index}><span>Secret {index + 1}</span><textarea className="textarea" rows={3} value={text(secret.text)} maxLength={1000} onChange={(event) => updateSecret(index, event.target.value)} />{citations(secret.sources)}</label>)}
      </div>

      <div className="form-stack" aria-label="Proposed lore and entities">
        <div className="page-eyebrow">Deep lore and entities · {entities.length - excluded.size} selected</div>
        {entities.map((entity, index) => {
          const id = text(entity.temp_id); const removed = excluded.has(id);
          return <article className={`card ${removed ? "muted" : "accent"}`} key={id}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <span className="chip">{text(entity.entity_type)}</span>
              <button className="btn btn-ghost" type="button" onClick={() => { setExcluded((current) => { const next = new Set(current); removed ? next.delete(id) : next.add(id); return next; }); setDirty(true); }}>{removed ? "Restore" : "Remove from draft"}</button>
              {!removed && <button className="btn btn-ghost" type="button" disabled={dirty || regenerating !== null} onClick={() => regenerate("entity", id)}>Regenerate card · 3 credits</button>}
            </div>
            <label className="field"><span>Name</span><input className="input" disabled={removed} value={text(entity.name)} onChange={(event) => updateEntity(index, "name", event.target.value)} /></label>
            <label className="field"><span>Summary</span><textarea className="textarea" disabled={removed} rows={3} value={text(entity.summary)} onChange={(event) => updateEntity(index, "summary", event.target.value)} /></label>
            <label className="field"><span>Deep lore</span><textarea className="textarea" disabled={removed} rows={6} value={text(entity.narrative)} onChange={(event) => updateEntity(index, "narrative", event.target.value)} /></label>
            <label className="field"><span>Status</span><input className="input" disabled={removed} value={text(entity.status)} maxLength={80} onChange={(event) => updateEntity(index, "status", event.target.value)} /></label>
            <label className="field"><span>Tags</span><input className="input" disabled={removed} value={Array.isArray(entity.tags) ? entity.tags.join(", ") : ""} onChange={(event) => updateEntity(index, "tags", event.target.value.split(",").map((tag) => tag.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")).filter(Boolean))} /></label>
            <div className="guide-citations" aria-label="Sources used">Sources used {citations(entity.sources)}</div>
          </article>;
        })}
      </div>

      <div className="auth-card form-stack">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><div className="page-eyebrow">Starting relationships · {relationships.length}</div><button className="btn btn-ghost" type="button" disabled={dirty || regenerating !== null} onClick={() => regenerate("relationships")}>Regenerate · 3 credits</button></div>
        {relationships.map((relationship, index) => <div className="card" key={`${text(relationship.source_temp_id)}-${text(relationship.target_temp_id)}-${index}`}>
          <span className="chip">{text(relationship.kind)}</span>
          <p>{text(relationship.source_temp_id)} → {text(relationship.target_temp_id)}</p>
          <label className="field"><span>Relationship notes</span><textarea className="textarea" rows={2} value={text(relationship.notes)} maxLength={500} onChange={(event) => updateRelationship(index, event.target.value)} /></label>
          <div className="guide-citations">Sources used {citations(relationship.sources)}</div>
        </div>)}
      </div>

      <div className="auth-card form-stack">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><div className="page-eyebrow">Session 1 draft</div><button className="btn btn-ghost" type="button" disabled={dirty || regenerating !== null} onClick={() => regenerate("session_1_prep")}>Regenerate · 3 credits</button></div>
        <label className="field"><span>Objective</span><textarea className="textarea" rows={3} value={text(prep.objective)} onChange={(event) => updatePrep("objective", event.target.value)} /></label>
        <label className="field"><span>Opening scene</span><textarea className="textarea" rows={5} value={text(prep.opening_scene)} onChange={(event) => updatePrep("opening_scene", event.target.value)} /></label>
        <label className="field"><span>Scene notes</span><textarea className="textarea" rows={7} value={text(prep.scene_notes)} onChange={(event) => updatePrep("scene_notes", event.target.value)} /></label>
        <div><strong>Prep checklist</strong><ul>{asRows(prep.prep_checklist).map((item, index) => <li key={index}>{text(item.text)} {citations(item.sources)}</li>)}</ul></div>
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

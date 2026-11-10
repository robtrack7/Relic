"use client";

import { useId, useMemo, useState } from "react";
import type { Claim, ClaimObservation, DeskCard, Link, ObjectRef, StoryPosition } from "@/lib/world/model";
import type { DeskStore } from "@/components/desk/use-desk";
import { ObjectPicker } from "./object-picker";
import { RELATIONSHIP_TYPES, relationshipCardinality, relationshipTypeFor } from "./relationship-types";
import styles from "./object-detail.module.css";

export function RelationshipComposer({
  card,
  store,
  existing,
  initialTarget,
  initialRelation,
  boardProjection = false,
  kinds,
  onCancel,
  onSaved
}: {
  card: Pick<DeskCard, "objectId" | "claims" | "representation"> & Partial<Pick<DeskCard, "links">>;
  store: Pick<DeskStore, "assert" | "findObjects" | "search">;
  existing?: Link | null;
  /** Optional endpoint supplied by Canvas Connect when the target is known. */
  initialTarget?: ObjectRef | null;
  /** Optional predicate supplied by a contextual Connect action. */
  initialRelation?: string;
  boardProjection?: boolean;
  kinds?: readonly import("@/lib/world/model").RepresentationKind[];
  onCancel?: () => void;
  onSaved?: () => void;
}) {
  // Freeze the claim observed when the editor opened. A re-render after another
  // write must not silently move the concurrency token or temporal context.
  const [observedClaim] = useState<Claim | null>(() => existing ? card.claims.find((claim) => claim.id === existing.claimId) ?? null : null);
  const [relation, setRelation] = useState(existing?.claimKind ?? initialRelation ?? "");
  const [target, setTarget] = useState<ObjectRef | null>(existing?.other ?? initialTarget ?? null);
  const [storyLabel, setStoryLabel] = useState(observedClaim?.story.label ?? "");
  const [storyPosition, setStoryPosition] = useState<StoryPosition | null>(observedClaim?.story ?? null);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const predicateId = useId();
  const predicateListId = `${predicateId}-predicates`;
  const selected = relationshipTypeFor(relation);
  const replacing = useMemo(() => {
    // Only one-cardinality predicates replace a standing assertion. Many-valued
    // relationships (allies, knows, protects, etc.) must remain additive.
    if (relationshipCardinality(relation) !== "one") return [];
    const normalized = relation.trim();
    const type = relationshipTypeFor(relation);
    return card.claims.filter((claim) => (claim.claimKind === normalized || claim.claimKind === type?.key || claim.claimKind === type?.label) && claim.story.order === null && claim.id !== observedClaim?.id);
  }, [card.claims, observedClaim?.id, relation]);
  const suggestions = useMemo(() => {
    const query = relation.trim().toLowerCase();
    if (!query) return RELATIONSHIP_TYPES.slice(0, 6);
    return RELATIONSHIP_TYPES.filter((type) => `${type.label} ${type.group}`.toLowerCase().includes(query)).slice(0, 8);
  }, [relation]);

  const save = async () => {
    if (!relation.trim() || !target || saving) return;
    // Keep the editor live until an explicit replacement decision is made.
    // The button is disabled for normal pointer use, but this guard also
    // protects keyboard/programmatic submits without leaving the fieldset
    // permanently disabled.
    if (replacing.length > 0 && !confirmReplace) {
      setError("Review the existing relationship before replacing it.");
      return;
    }
    setSaving(true);
    setError("");
    const story: StoryPosition | undefined = storyLabel.trim()
      ? { order: storyPosition?.order ?? null, precision: storyPosition?.precision ?? "relative", label: storyLabel.trim() }
      : storyPosition?.label ? storyPosition : undefined;
    const expectedClaim: ClaimObservation | undefined = existing
      ? { claimId: existing.claimId, version: observedClaim?.version ?? 1, relationshipId: observedClaim?.relationshipId ?? existing.relationshipId ?? null }
      : undefined;
    let ok = false;
    try {
      ok = boardProjection
        ? await store.assert(card.objectId, relation.trim(), target.label, target, story, expectedClaim, true)
        : await store.assert(card.objectId, relation.trim(), target.label, target, story, expectedClaim);
    } catch {
      setError("Could not save this relationship. Your draft is still here; try again.");
      setSaving(false);
      return;
    }
    setSaving(false);
    if (!ok) {
      setError("This relationship changed while you were editing. Review it and try again.");
      return;
    }
    onSaved?.();
  };

  return (
    <fieldset className={styles.addForm} disabled={saving} aria-label={existing ? "Edit relationship" : "New relationship"}>
      <legend className={styles.visuallyHidden}>{existing ? "Edit relationship" : "New relationship"}</legend>
      <div className={styles.relationshipSentence}>
        <strong>{card.representation?.label || "This object"}</strong>
        <span aria-hidden="true"> · </span>
        <label className={styles.visuallyHidden} htmlFor={predicateId}>Relationship</label>
        <input id={predicateId} list={predicateListId} value={relation} maxLength={120} autoFocus placeholder="relationship" onChange={(event) => setRelation(event.target.value)} onKeyDown={(event) => {
          if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onCancel?.(); }
          if (event.key === "Enter" && relation.trim() && target && !(replacing.length > 0 && !confirmReplace)) { event.preventDefault(); void save(); }
        }} />
        <datalist id={predicateListId}>{RELATIONSHIP_TYPES.map((type) => <option key={type.key} value={type.label}>{type.group}</option>)}</datalist>
        <span aria-hidden="true"> · </span>
        <span className={styles.relationshipTarget}><ObjectPicker store={store} subject={card.objectId} label="Connected object" value={target} kinds={kinds} onChange={setTarget}/></span>
      </div>
      {!selected && relation.trim() ? <p className={styles.composerHint}>Custom predicate · saved as typed, with this object as its subject.</p> : null}
      {selected ? <p className={styles.composerHint}>{selected.group} · from this object: “{selected.label}” · inverse: “{selected.inverse}”</p> : null}
      {replacing.length > 0 ? <label className={styles.replaceNotice}><input type="checkbox" checked={confirmReplace} onChange={(event) => setConfirmReplace(event.target.checked)} />This replaces {replacing.length} existing {replacing.length === 1 ? "relationship" : "relationships"} of this type. Review the affected rows before continuing.</label> : null}
      <details className={styles.optionalDetails} open={advanced} onToggle={(event) => setAdvanced(event.currentTarget.open)}>
        <summary>Story context <span aria-hidden="true">{storyLabel ? "· added" : "· optional"}</span></summary>
        <label>When is this true?<input value={storyLabel} maxLength={160} placeholder="e.g. after the harbour fire" onChange={(event) => { const next = event.target.value; setStoryLabel(next); setStoryPosition((current) => current ? { ...current, label: next } : null); }} /></label>
        <p className={styles.composerHint}>New assertions remain Pencil until a GM reviews them.</p>
      </details>
      <div className={styles.localActions}>
        <button type="button" className={styles.strongAction} disabled={!relation.trim() || !target || (replacing.length > 0 && !confirmReplace)} onClick={() => void save()}>{saving ? "Saving…" : existing ? "Save relationship" : "Add relationship"}</button>
        <button type="button" className={styles.quietAction} onClick={onCancel}>Cancel</button>
      </div>
      {suggestions.length && relation.trim().length < 3 ? <div className={styles.suggestions} aria-label="Suggested relationship types">{suggestions.map((type) => <button key={type.key} type="button" onClick={() => setRelation(type.label)}><span>{type.label}</span><small>{type.group}</small></button>)}</div> : null}
      {error ? <p role="alert" className={styles.error}>{error}</p> : null}
    </fieldset>
  );
}


"use client";

import { useState } from "react";
import type { DeskCard } from "@/lib/world/model";
import { previewObjectProposal, type ObjectProposal, type ObjectProposalReviewAction } from "@/lib/world/object-proposal";
import { WorldObjectCard } from "./world-object-card";
import { Button } from "@/components/ui/control";
import styles from "./object-proposal.module.css";

/** The eventual Librarian supplies proposals; this review path works without a model. */
export function ObjectProposalPreview({ card, proposal, onApply, onDismiss }: {
  card: DeskCard;
  proposal: ObjectProposal;
  onApply: ObjectProposalReviewAction;
  onDismiss: () => void;
}) {
  const [draft, setDraft] = useState(proposal);
  const [editing, setEditing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState("");
  const change = draft.change;
  const historical = draft.context.kind === "historical";
  if (historical) return <section className={styles.proposal} aria-label="Historical proposal"><header><strong>Historical proposal</strong><p>As of {draft.context.kind === "historical" ? draft.context.position.label || "an earlier story position" : ""}</p></header><p>Return to Now to review a current proposal. Historical changes require an explicit correction workflow.</p><Button variant="quiet" onClick={onDismiss}>Dismiss</Button></section>;
  const label = change.kind === "body" ? "Description" : change.kind === "create" ? "New world material" : change.kind === "placement" ? "Board arrangement" : change.key.replaceAll("_", " ");
  return <section className={styles.proposal} aria-label="Object proposal"><header><strong>{proposal.provenance.authoredBy === "librarian" ? "Proposed by Librarian" : "Proposed change"}</strong><p>{proposal.reason}</p></header><WorldObjectCard card={previewObjectProposal(card, draft)} proposed disclosure={change.kind === "claim" && change.key.startsWith("development:") ? "expanded" : "card"}/>
    {editing ? <label className={styles.editor}>Proposed {label.toLowerCase()}<textarea value={change.value} onChange={event => setDraft(current => ({ ...current, change: { ...current.change, value: event.target.value } }))} onKeyDown={event => { event.stopPropagation(); if (event.key === "Escape") { setDraft(proposal); setEditing(false); } }}/></label> : <p className={styles.change}><span>{label}</span>{change.value}</p>}
    {error ? <p className={styles.error} role="alert">{error}</p> : null}
    <div className={styles.actions}><Button variant="quiet" disabled={applying} onClick={onDismiss}>Dismiss</Button>{change.kind !== "placement" ? <Button variant="quiet" disabled={applying || historical} onClick={() => setEditing(!editing)}>{editing ? "Preview" : "Edit proposal"}</Button> : null}<Button variant="primary" disabled={applying || historical || !change.value.trim()} onClick={async () => { setApplying(true); setError(""); try { if (!await onApply(draft)) setError("The proposal could not be applied. Your preview is still here; try again."); } catch { setError("The proposal could not be applied. Your preview is still here; try again."); } finally { setApplying(false); } }}>{applying ? "Applying…" : "Apply"}</Button></div>
    <p className={styles.note}>{historical ? "Historical proposals are read only. Return to Now to review a current proposal." : "Applying an assertion keeps it pending until you establish it."}</p>
  </section>;
}

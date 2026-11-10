"use client";

import { useState } from "react";
import type { DeskCard, Link } from "@/lib/world/model";
import type { DeskStore } from "@/components/desk/use-desk";
import { ObjectGlyph } from "./object-parts";
import { RelationshipComposer } from "./relationship-composer";
import { relationshipGroup, relationshipPhrase } from "./relationship-types";
import { TruthMark } from "@/components/desk/truth";
import styles from "./object-detail.module.css";

/** Focus relationship block. Rows are semantic claims; canvas placement is never edited here. */
export function ObjectConnections({ card, store, onFollow, mode = "all", readOnly = false }: { card: Pick<DeskCard, "objectId" | "claims" | "links" | "representation">; store: Pick<DeskStore, "assert" | "findObjects" | "search" | "retract">; onFollow: (link: Link) => void; mode?: "all" | "relationships" | "sources"; readOnly?: boolean }) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Link | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState("");
  const sources = card.links.filter(link => link.other.kind === "source");
  const connections = card.links.filter(link => link.other.kind !== "source");
  const visible = mode === "sources" ? sources : connections;
  const remove = async (link: Link) => {
    if (readOnly || removing) return;
    setRemoving(link.claimId); setError("");
    const claim = card.claims.find(candidate => candidate.id === link.claimId);
    const ok = await store.retract(card.objectId, link.claimId, claim?.version);
    setRemoving(null);
    if (!ok) setError("Could not remove this relationship. It may have changed; review it again.");
  };
  const rows = (links: readonly Link[]) => <div className={styles.connections}>{[...new Set(links.map(link => relationshipGroup(link.claimKind)))].map(group => <div key={group} className={styles.connectionGroup}>
    {links.filter(link => relationshipGroup(link.claimKind) === group).length > 1 ? <h3 className={styles.connectionGroupTitle}>{group}</h3> : null}
    {links.filter(link => relationshipGroup(link.claimKind) === group).map(link => { const phrase = relationshipPhrase(link.claimKind, link.direction); const context = card.claims.find(claim => claim.id === link.claimId) ?? link; const protectedRelationship = link.truthState === "ink" || context.story?.order !== null; return <div className={styles.connectionRow} key={`${link.relationshipId ?? link.claimId}-${link.direction}`} data-relationship-id={link.relationshipId ?? undefined}>
    <button type="button" className={styles.connectionLink} onClick={() => onFollow(link)}><span className={styles.visuallyHidden}>Follow </span><ObjectGlyph family={link.other.kind ?? "fragment"}/><span>{link.other.label}</span><TruthMark state={link.truthState}/><small>{link.direction === "in" ? "Incoming · " : ""}{phrase}</small></button>
    {!readOnly && link.direction === "out" && !protectedRelationship ? <span className={styles.connectionActions}><button type="button" className={styles.connectionAction} onClick={() => { setEditing(link); setAdding(false); }} aria-label={`Edit relationship to ${link.other.label}`}>Edit</button><button type="button" className={styles.connectionAction} onClick={() => void remove(link)} disabled={removing === link.claimId} aria-label={`Remove relationship to ${link.other.label}`}>{removing === link.claimId ? "Removing…" : "Remove"}</button></span> : null}
    {link.direction === "out" && protectedRelationship ? <span className={styles.connectionProtected}>{context.story?.order !== null ? "Historical relationship — changes require review" : "Established relationship — changes require review"}</span> : null}
    {context.provenance ? <details className={styles.relationshipContext}><summary>Context</summary><p>{context.provenance.authoredBy === "gm" ? "Recorded by you" : `Recorded by ${context.provenance.authoredBy}`} · {context.provenance.kind.replace(/_/g, " ")}</p><p>Story time: {context.story?.label || "Not placed in story time"}</p>{context.settled ? <p>{link.truthState === "ink" ? "Established" : "Reviewed"} by {context.settled.by === "gm" ? "you" : context.settled.by}</p> : <p>Pending interpretation · not established truth</p>}</details> : null}
    </div>; })}
  </div>)}</div>;
  return <>
    <section className={styles.section} aria-label={mode === "sources" ? "Sources and evidence" : "Connections"}>
      <div className={styles.sectionHead}>{!adding && !editing && !readOnly ? <button type="button" className={styles.editAction} onClick={() => setAdding(true)}>{mode === "sources" ? "Link a source" : "Add connection"}</button> : null}</div>
      {visible.length ? rows(visible) : <p className={styles.empty}>{mode === "sources" ? "Link the material behind this object." : "Connect this object to its people, places, and story."}</p>}
      {adding ? <RelationshipComposer card={card} store={store} kinds={mode === "sources" ? ["source"] : undefined} onCancel={() => setAdding(false)} onSaved={() => setAdding(false)}/> : null}
      {editing ? <RelationshipComposer card={card} store={store} existing={editing} kinds={mode === "sources" ? ["source"] : undefined} onCancel={() => setEditing(null)} onSaved={() => setEditing(null)}/> : null}
      {error ? <p role="alert" className={styles.error}>{error}</p> : null}
    </section>
    {mode === "all" && sources.length ? <section className={styles.section} aria-label="Sources and evidence"><div className={styles.sectionHead}><h2 className={styles.sectionTitle}>Sources & evidence</h2></div>{rows(sources)}<p className={styles.sectionNote}>A source is evidence, not established story truth.</p></section> : null}
  </>;
}


"use client";

import { useEffect, useRef, useState } from "react";
import { richPlainText, richText, legacyMechanics, type EntityBlock, type EntitySnapshot, type MechanicsProfile } from "@/lib/world/entity-document";
import { builtInTemplate } from "@/lib/world/templates";
import { claimKindLabel, objectMedia } from "@/lib/world/object-presentation";
import { projectEntity } from "@/lib/world/object-projection";
import { ProvenanceLine, TruthMark } from "@/components/desk/truth";
import { ObjectConnections } from "@/components/world-objects/object-connections";
import { ObjectPicker } from "@/components/world-objects/object-picker";
import type { ObjectRef, Link } from "@/lib/world/model";
import { RichContent, RichContentEditor } from "./rich-content";
import type { EntitySession } from "./entity-session";
import styles from "./entity-workspace.module.css";

export function EditableText({ block, session, onReference, editingInitially = false, showTitle = true, onEditingChange }: { block: EntityBlock & { kind: "text" }; session: EntitySession; onReference: (id: string) => void; editingInitially?: boolean; showTitle?: boolean; onEditingChange?: (editing: boolean) => void }) {
  const [editing, setEditing] = useState(editingInitially);
  const reportEditing = useRef(onEditingChange);
  reportEditing.current = onEditingChange;
  useEffect(() => { reportEditing.current?.(editing); return () => reportEditing.current?.(false); }, [editing]);
  return <section className={styles.writingBlock} data-block-id={block.id} data-private={block.role === "notes" || undefined}>
    {showTitle ? <div className={styles.blockHeading}><h2>{block.title}</h2><button type="button" className={styles.revealAction} aria-label={`Edit ${block.title.toLowerCase()}`} onClick={() => setEditing(true)}>Write</button></div> : null}
    {editing ? <RichContentEditor value={block.content} ariaLabel={block.title} placeholder={`Write ${block.title.toLowerCase()}…`} onChange={content => session.patchBlock(block.id, current => current.kind === "text" ? { ...current, content } : current)} onBlur={() => { void session.flush(); }} onExit={() => { setEditing(false); void session.flush(); }} onSearchReferences={session.searchReferences} onReference={onReference}/> : <div className={styles.readingText} tabIndex={0} aria-label={`${block.title}; press Enter to write`} onKeyDown={event => { if (event.key === "Enter" && event.target === event.currentTarget) { event.preventDefault(); event.stopPropagation(); setEditing(true); } }} onClick={event => { if ((event.target as Element).closest("button, a") || window.getSelection()?.toString()) return; setEditing(true); }}>
      {richPlainText(block.content).trim() ? <RichContent value={block.content} onReference={onReference}/> : <p className={styles.writePrompt}>Begin with a thought…</p>}
    </div>}
  </section>;
}

export function EntityRelationships({ entity, session, onFollow, sources = false }: { entity: EntitySnapshot; session: EntitySession; onFollow: (link: Link) => void; sources?: boolean }) {
  return <div className={styles.domainContent}><ObjectConnections card={entity} store={session} onFollow={onFollow} mode={sources ? "sources" : "relationships"}/></div>;
}

export function EntityState({ entity, session, allowAdd = false }: { entity: EntitySnapshot; session: EntitySession; allowAdd?: boolean }) {
  const projection = projectEntity(entity);
  const standing = projection.settledClaims.filter(claim => !claim.claimKind.startsWith("development"));
  const pending = projection.pendingClaims.filter(claim => !claim.claimKind.startsWith("development"));
  const [adding, setAdding] = useState(false);
  const [kind, setKind] = useState("status");
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  return <section className={styles.stateBlock} aria-label="Current state">
    {standing.length ? <dl className={styles.facts}>{standing.map(claim => <div key={claim.id}><dt>{claimKindLabel(claim.claimKind)}</dt><dd>{claim.value}</dd></div>)}</dl> : null}
    {pending.length ? <details className={styles.pending}><summary>{pending.length} pending {pending.length === 1 ? "assertion" : "assertions"}</summary><p>Pending material has not been established as world truth.</p>{pending.map(claim => <div className={styles.pendingRow} key={claim.id}><TruthMark state={claim.truthState}/><span><strong>{claimKindLabel(claim.claimKind)}</strong> {claim.value}</span><ProvenanceLine provenance={claim.provenance} settled={claim.settled} truth={claim.truthState}/></div>)}</details> : null}
    {allowAdd && !adding ? <button type="button" className={styles.textAction} onClick={() => setAdding(true)}>Add an assertion</button> : null}
    {adding ? <form className={styles.compactForm} onSubmit={event => { event.preventDefault(); setSaving(true); void session.assert(entity.objectId, kind, value).then(ok => { setSaving(false); if (ok) { setAdding(false); setValue(""); } else setError("This assertion could not save. Your words are still here."); }); }}><label>Attribute<select value={kind} onChange={event => setKind(event.target.value)}>{(entity.representation ? builtInTemplate(entity.representation.kind).claims : [{ key: "assertion", label: "Assertion" }]).map(def => <option value={def.key} key={def.key}>{def.label}</option>)}</select></label><label>What is being asserted?<input autoFocus value={value} onChange={event => setValue(event.target.value)} required maxLength={4000}/></label><p className={styles.caption}>Saved as pending; this does not establish it.</p><div className={styles.rowActions}><button disabled={saving || !value.trim()}>Add assertion</button><button type="button" onClick={() => setAdding(false)}>Cancel</button></div>{error ? <p role="alert">{error}</p> : null}</form> : null}
  </section>;
}

export function EntityHistory({ entity, session, allowAdd = false }: { entity: EntitySnapshot; session?: EntitySession; allowAdd?: boolean }) {
  const [adding, setAdding] = useState(false);
  const [summary, setSummary] = useState("");
  const [story, setStory] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const entries = entity.claims.filter(claim => claim.story.order !== null || claim.claimKind.startsWith("development")).sort((a, b) => (a.story.order ?? Infinity) - (b.story.order ?? Infinity));
  return <section className={styles.history} aria-label="Story history">{entries.length ? <ol>{entries.map(claim => <li key={claim.id}><span>{claim.story.label || "Unplaced in story time"}</span><p>{claim.value}</p><small>{claim.truthState === "ink" ? "Established" : "Pending interpretation"} · {claim.provenance.authoredBy === "gm" ? "Recorded by you" : `Recorded by ${claim.provenance.authoredBy}`}</small></li>)}</ol> : <p className={styles.quiet}>Meaningful story developments will appear here.</p>}{allowAdd && session ? adding ? <form className={styles.compactForm} onSubmit={event => { event.preventDefault(); setSaving(true); void session.assert(entity.objectId, `development:${crypto.randomUUID()}`, summary, undefined, story.trim() ? { order: null, label: story.trim(), precision: "relative" } : undefined).then(ok => { setSaving(false); if (ok) { setAdding(false); setSummary(""); setStory(""); } else setError("This development could not save. Your words are still here."); }); }}><label>What changed?<textarea rows={3} autoFocus value={summary} onChange={event => setSummary(event.target.value)} required maxLength={4000}/></label><label>Story position<input value={story} onChange={event => setStory(event.target.value)} placeholder="e.g. after the fourth toll" maxLength={160}/></label><p className={styles.caption}>A meaningful story turn, saved as pending interpretation.</p><div className={styles.rowActions}><button disabled={saving || !summary.trim()}>{saving ? "Adding…" : "Add development"}</button><button type="button" onClick={() => setAdding(false)}>Cancel</button></div>{error ? <p role="alert">{error}</p> : null}</form> : <button type="button" className={styles.textAction} onClick={() => setAdding(true)}>Add development</button> : null}</section>;
}

export function EntityMedia({ entity, session, editable = false }: { entity: EntitySnapshot; session: EntitySession; editable?: boolean }) {
  const media = objectMedia(entity);
  const [editing, setEditing] = useState(!media && editable);
  const [url, setUrl] = useState(media?.src ?? "");
  const [alt, setAlt] = useState(media?.alt ?? "");
  return <section className={styles.mediaBlock}>
    {media ? <img src={media.src} alt={media.alt} style={{ objectPosition: media.position }} draggable={false}/> : null}
    {editable && entity.representation ? <><button type="button" className={styles.revealAction} onClick={() => setEditing(current => !current)}>{media ? "Change image" : "Add image"}</button>{editing ? <div className={styles.compactForm}><label>Image URL<input type="url" value={url} onChange={event => setUrl(event.target.value)} onBlur={() => { if (url !== media?.src) void session.saveIdentity(entity.representation?.label ?? "", { image: url, imageAlt: alt }); }}/></label><label>Description<input value={alt} onChange={event => setAlt(event.target.value)} onBlur={() => { if (alt !== media?.alt) void session.saveIdentity(entity.representation?.label ?? "", { image: url, imageAlt: alt }); }}/></label><button type="button" className={styles.textAction} onClick={() => setEditing(false)}>Done</button></div> : null}</> : null}
  </section>;
}

const DETAIL_FIELDS: Record<string, readonly [string, string][]> = {
  character: [["pronouns", "Pronouns"], ["ancestry", "Ancestry"], ["aliases", "Aliases"]],
  place: [["category", "Kind of place"], ["terrain", "Terrain"], ["population", "Population"]],
  faction: [["category", "Kind of faction"], ["size", "Scale"]],
  artifact: [["rarity", "Rarity"], ["attunement", "Attunement"]],
  source: [["sourceType", "Kind of source"], ["origin", "Origin"], ["page", "Page or anchor"], ["url", "Reference URL"], ["excerpt", "Excerpt"]],
  thread: [["category", "Kind of concern"]], event: [["category", "Kind of event"]], note: [["category", "Kind of note"]]
};
export function EntityDetails({ entity, session, showEmpty = false, omit = [] }: { entity: EntitySnapshot; session: EntitySession; showEmpty?: boolean; omit?: readonly string[] }) {
  const representation = entity.representation;
  if (!representation) return null;
  const fields = (DETAIL_FIELDS[representation.kind] ?? []).filter(([key]) => !omit.includes(key) && (showEmpty || String(representation.fields[key] ?? "").trim()));
  return fields.length ? <section className={styles.entityDetails} aria-label="Entity details">{fields.map(([key, label]) => <label key={key}><span>{label}</span>{key === "excerpt" ? <textarea aria-label={label} placeholder={showEmpty ? "Empty" : undefined} value={String(representation.fields[key] ?? "")} rows={showEmpty ? 2 : 4} onChange={event => session.setIdentityDraft(representation.label ?? "", { [key]: event.target.value })} onBlur={() => { void session.flush(); }}/> : <input aria-label={label} placeholder={showEmpty ? "Empty" : undefined} value={String(representation.fields[key] ?? "")} onChange={event => session.setIdentityDraft(representation.label ?? "", { [key]: event.target.value })} onBlur={() => { void session.flush(); }}/>}</label>)}</section> : null;
}

// Mechanics live in their own module; re-exported so existing imports stay stable.
export { EntityMechanics } from "./entity-mechanics";

"use client";

import { useCallback, useEffect, useId, useRef, useState, type PointerEvent } from "react";
import { richPlainText, type EntityBlock, type EntitySnapshot } from "@/lib/world/entity-document";
import { focusPages, type FocusPageId } from "@/lib/world/entity-composition";
import { FAMILY_LABELS, objectFamily, objectMedia } from "@/lib/world/object-presentation";
import type { Link } from "@/lib/world/model";
import { legacyMechanicsProfile } from "@/lib/world/mechanics-presentation";
import { ObjectGlyph } from "@/components/world-objects/object-parts";
import { MechanicsVitals } from "./mechanics-stat-block";
import { EditableText, EntityDetails, EntityHistory, EntityMechanics, EntityRelationships, EntityState } from "./entity-blocks";
import { Chevron, CloseGlyph, EntityRecovery, EntitySaveStatus, NameEditor } from "./entity-chrome";
import type { EntitySession } from "./entity-session";
import styles from "./entity-workspace.module.css";

export function EntityFocus({ entity, session, page = "overview", onPageChange, onBuilder, onClose, onFollow, onBack, canBack = false, onForward, canForward = false, builderEntityId: _builderEntityId }: {
  entity: EntitySnapshot; session: EntitySession; page?: FocusPageId; onPageChange: (page: FocusPageId) => void;
  onBuilder: () => void; onClose: () => void; onFollow: (id: string) => void; onBack?: () => void; canBack?: boolean; onForward?: () => void; canForward?: boolean; builderEntityId?: string | null;
}) {
  const [activeEdits, setActiveEdits] = useState<ReadonlySet<string>>(() => new Set());
  const editingChanged = useCallback((id: string, editing: boolean) => setActiveEdits(current => {
    if (current.has(id) === editing) return current;
    const next = new Set(current); if (editing) next.add(id); else next.delete(id); return next;
  }), []);
  const pages = [...focusPages(entity)];
  if (!pages.some(item => item.id === "notes") && entity.document.blocks.some(block => block.kind === "text" && block.role === "notes" && activeEdits.has(block.id))) pages.push({ id: "notes", label: "Notes" });
  const selected = pages.some(item => item.id === page) ? page : "overview";
  const family = objectFamily(entity);
  const scope = useId(); const tabRefs = useRef(new Map<string, HTMLButtonElement>());
  const scroll = useRef<HTMLDivElement>(null);
  const scrollPositions = useRef(new Map<string, number>());
  const currentPage = useRef(selected);
  useEffect(() => {
    const node = scroll.current;
    if (node) node.scrollTop = scrollPositions.current.get(selected) ?? 0;
    currentPage.current = selected;
  }, [selected]);
  const gesture = useRef<{ x: number; y: number } | null>(null);
  const startSwipe = (event: PointerEvent) => { if (event.pointerType !== "touch" || (event.target as Element).closest('button, a, input, select, textarea, [contenteditable="true"]')) return; gesture.current = { x: event.clientX, y: event.clientY }; };
  const finishSwipe = (event: PointerEvent) => {
    const origin = gesture.current; gesture.current = null;
    if (!origin || window.getSelection()?.toString()) return;
    const dx = event.clientX - origin.x, dy = event.clientY - origin.y;
    if (Math.abs(dx) < 44 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    const index = pages.findIndex(item => item.id === selected);
    // Let native touchend reach the original target before replacing its page.
    const next = pages[index + (dx < 0 ? 1 : -1)]; if (next) requestAnimationFrame(() => onPageChange(next.id));
  };
  const visibleWriting = entity.document.blocks.filter((block): block is EntityBlock & { kind: "text" } => block.kind === "text" && (!!richPlainText(block.content).trim() || activeEdits.has(block.id)));
  const prose = visibleWriting.filter(block => block.role !== "notes");
  const media = objectMedia(entity);
  const mechanicsProfile = family === "character" ? entity.representation?.mechanics ?? legacyMechanicsProfile(entity) : null;
  const onLink = (link: Link) => onFollow(link.other.objectId);
  return <aside className={styles.focus} data-entity-focus data-object-id={entity.objectId} aria-label={`${FAMILY_LABELS[family]} Focus`} onKeyDown={event => { if (event.key !== "Escape" || event.defaultPrevented) return; event.stopPropagation(); event.preventDefault(); if ((event.target as Element).closest("input, textarea, select")) { (event.target as HTMLElement).blur(); void session.flush(); } else onClose(); }}>
    <header className={styles.focusHeader}><div className={styles.headerIdentity}><ObjectGlyph family={family}/><span>{FAMILY_LABELS[family]}</span><span className={styles.maturity}>{entity.maturity === "ink" ? "Ink" : "Pencil"}</span></div><div className={styles.headerControls}>{canBack ? <button type="button" className={styles.iconButton} aria-label="Back in Focus" onClick={onBack}><Chevron direction="left"/></button> : null}{canForward ? <button type="button" className={styles.iconButton} aria-label="Forward in Focus" onClick={onForward}><Chevron direction="right"/></button> : null}<button className={styles.iconButton} type="button" aria-label="Close Focus" onClick={onClose}><CloseGlyph/></button></div></header>
    <div className={styles.focusTabs} role="tablist" aria-label="Focus pages">{pages.map((item, index) => <button ref={node => { if (node) tabRefs.current.set(item.id, node); }} role="tab" type="button" id={`${scope}-${item.id}`} key={item.id} aria-selected={selected === item.id} aria-controls={`${scope}-page`} tabIndex={selected === item.id ? 0 : -1} onClick={() => onPageChange(item.id)} onKeyDown={event => { let next = index; if (event.key === "ArrowRight") next = (index + 1) % pages.length; else if (event.key === "ArrowLeft") next = (index - 1 + pages.length) % pages.length; else if (event.key === "Home") next = 0; else if (event.key === "End") next = pages.length - 1; else return; event.preventDefault(); event.stopPropagation(); onPageChange(pages[next]!.id); tabRefs.current.get(pages[next]!.id)?.focus(); }}>{item.label}</button>)}</div>
    <div className={styles.focusBody} ref={scroll} role="tabpanel" id={`${scope}-page`} aria-labelledby={`${scope}-${selected}`} tabIndex={0} onScroll={() => { if (scroll.current) scrollPositions.current.set(currentPage.current, scroll.current.scrollTop); }} onPointerDown={startSwipe} onPointerUp={finishSwipe}>
      <EntityRecovery session={session}/>
      {selected === "overview" ? <>
        <div className={styles.focusIdentity} data-has-image={!!media || undefined}><div><NameEditor entity={entity} session={session} compact/>{entity.representation?.fields.quote ? <p className={styles.identityLine}>{String(entity.representation.fields.quote)}</p> : null}</div>{media ? <img data-shared="media" src={media.src} alt={media.alt} style={{ objectPosition: media.position }} draggable={false}/> : null}</div>
        {/* Reference before reading: what is true now, who they are, and the numbers a table asks for. */}
        <div className={styles.keyFacts} data-key-facts>
          <EntityState entity={entity} session={session}/><EntityDetails entity={entity} session={session} omit={pages.some(item => item.id === "content") ? ["excerpt"] : []}/>
          {family === "character" && mechanicsProfile ? <MechanicsVitals profile={mechanicsProfile}/> : null}
          {/* The full record lives on Provenance; Overview keeps only the evidence standing. */}
          {family === "source" ? <p className={styles.caption}>Evidence; not automatically established truth.</p> : null}
        </div>
        {prose.length ? prose.map(block => <EditableText key={block.id} block={block} session={session} onReference={onFollow} showTitle={block.role !== "narrative"} onEditingChange={editing => editingChanged(block.id, editing)}/>) : <p className={styles.quiet}>A thought waiting to take shape.</p>}
      </> : null}
      {selected === "mechanics" ? <EntityMechanics entity={entity} session={session} onReference={onFollow}/> : null}
      {selected === "relationships" ? <><h1 className={styles.pageTitle}>{pages.find(item => item.id === selected)?.label}</h1><EntityRelationships entity={entity} session={session} onFollow={onLink}/></> : null}
      {selected === "history" ? <><h1 className={styles.pageTitle}>{family === "thread" ? "Developments" : "History"}</h1><EntityHistory entity={entity} session={session} allowAdd={family === "thread"}/></> : null}
      {selected === "notes" ? <><p className={styles.privateNote}>Private GM material</p>{visibleWriting.filter(block => block.role === "notes").map(block => <EditableText key={block.id} block={block} session={session} onReference={onFollow} onEditingChange={editing => editingChanged(block.id, editing)}/>)}</> : null}
      {selected === "sources" ? <><h1 className={styles.pageTitle}>{family === "source" ? "Provenance" : "Sources & evidence"}</h1>{family === "source" ? <SourceRecord entity={entity}/> : null}<EntityRelationships entity={entity} session={session} onFollow={onLink} sources/></> : null}
      {selected === "content" ? <><h1 className={styles.pageTitle}>{family === "source" ? "Content" : "Participants & consequences"}</h1>{entity.representation?.fields.excerpt ? <blockquote>{String(entity.representation.fields.excerpt)}</blockquote> : null}{entity.representation?.fields.participants ? <p>{String(entity.representation.fields.participants)}</p> : null}<EntityRelationships entity={entity} session={session} onFollow={onLink}/></> : null}
    </div>
    <footer className={styles.focusFooter}><EntitySaveStatus session={session}/><button type="button" className={styles.builderAction} onClick={onBuilder}>Open in Builder<svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor"><path d="M5 15 15 5M5 5h10v10"/></svg></button></footer>
  </aside>;
}

function SourceRecord({ entity }: { entity: EntitySnapshot }) {
  const fields = entity.representation?.fields ?? {};
  return <dl className={styles.sourceRecord}>{["sourceType", "origin", "page", "citation", "url"].filter(key => fields[key]).map(key => <div key={key}><dt>{key === "sourceType" ? "Kind" : key}</dt><dd>{String(fields[key])}</dd></div>)}<div><dt>Authority</dt><dd>Evidence; not automatically established truth</dd></div></dl>;
}


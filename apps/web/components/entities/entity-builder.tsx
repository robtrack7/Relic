"use client";

import { useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { BLOCK_CHOICES, emptyRichText, type EntityBlock, type EntityDocument, type EntitySnapshot } from "@/lib/world/entity-document";
import { REPRESENTATION_KINDS } from "@/lib/world/templates";
import type { RepresentationKind } from "@/lib/world/model";
import { FAMILY_LABELS, objectFamily } from "@/lib/world/object-presentation";
import { ObjectGlyph } from "@/components/world-objects/object-parts";
import { EntityDetails, EntityHistory, EntityMechanics, EntityMedia, EntityRelationships, EntityState } from "./entity-blocks";
import { Chevron, CloseGlyph, EntityRecovery, EntitySaveStatus, NameEditor } from "./entity-chrome";
import { RichContentEditor } from "./rich-content";
import type { EntitySession } from "./entity-session";
import styles from "./entity-workspace.module.css";

type BlockChoice = typeof BLOCK_CHOICES[number];
const choiceId = (choice: BlockChoice) => `${choice.kind}:${choice.role ?? ""}`;
/** Details render as the property sheet under the title, so they never sit in the block flow. */
const inFlow = (block: EntityBlock) => block.kind !== "details";

/**
 * Entity Builder: one manuscript page. Block controls live in a hover/focus gutter;
 * every edit goes through the shared session (setDocument / patchBlock / setIdentityDraft / flush),
 * the same validated operations the Librarian proposes against.
 */
export function EntityBuilder({ entity, session, onClose, onFollow }: { entity: EntitySnapshot; session: EntitySession; onClose: () => void; onFollow: (id: string) => void }) {
  const root = useRef<HTMLElement>(null);
  const addButton = useRef<HTMLButtonElement>(null);
  const [adding, setAdding] = useState(false);
  const [classification, setClassification] = useState<RepresentationKind>("character");
  const [classificationName, setClassificationName] = useState("");
  const [classifying, setClassifying] = useState(false);
  const [dragged, setDragged] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const family = objectFamily(entity);
  const blocks = entity.document.blocks.filter(inFlow);
  // Read the session's live document: an edit may have landed since this render.
  const latest = (): EntityDocument => session.getSnapshot().entity?.document ?? entity.document;

  const focusIn = (id: string, selector: string) => {
    let tries = 0;
    const attempt = () => {
      const block = [...(root.current?.querySelectorAll<HTMLElement>("[data-builder-block]") ?? [])].find(element => element.dataset.builderBlock === id);
      const target = block?.querySelector<HTMLElement>(selector);
      if (target) { target.focus(); target.scrollIntoView?.({ block: "nearest" }); } else if (tries++ < 12) requestAnimationFrame(attempt);
    };
    requestAnimationFrame(attempt);
  };

  const move = (id: string, destination: number, refocus = false) => {
    const document = latest();
    const order = document.blocks.filter(inFlow);
    const from = order.findIndex(block => block.id === id);
    if (from < 0 || destination < 0 || destination >= order.length || from === destination) return;
    const block = order[from]!;
    const target = order[destination]!;
    const next = document.blocks.filter(current => current.id !== id);
    next.splice(next.findIndex(current => current.id === target.id) + (destination > from ? 1 : 0), 0, block);
    session.setDocument({ ...document, blocks: next });
    setAnnouncement(`${block.title} moved to position ${destination + 1} of ${order.length}`);
    if (refocus) focusIn(id, "[data-block-grip]");
  };

  const remove = (block: EntityBlock) => {
    const document = latest();
    const order = document.blocks.filter(inFlow);
    const neighbour = order[order.findIndex(current => current.id === block.id) - 1] ?? order.find(current => current.id !== block.id);
    session.setDocument({ ...document, blocks: document.blocks.filter(current => current.id !== block.id) });
    setAnnouncement(`${block.title} removed`);
    if (neighbour) focusIn(neighbour.id, "[data-block-heading]"); else requestAnimationFrame(() => addButton.current?.focus());
  };

  const add = (choice: BlockChoice, afterId?: string) => {
    const base = { id: crypto.randomUUID(), title: choice.title };
    const block: EntityBlock = choice.kind === "text" ? { ...base, kind: "text", role: choice.role ?? "custom", content: emptyRichText() } : { ...base, kind: choice.kind };
    const document = latest();
    const next = [...document.blocks];
    const after = afterId ? next.findIndex(current => current.id === afterId) : -1;
    next.splice(after >= 0 ? after + 1 : next.length, 0, block);
    session.setDocument({ ...document, blocks: next });
    setAdding(false);
    setAnnouncement(`${block.title} added`);
    focusIn(block.id, "[data-block-heading]");
  };

  const hasNarrative = entity.document.blocks.some(block => block.kind === "text" && block.role === "narrative");
  const choices = BLOCK_CHOICES.filter(choice => choice.kind !== "details" && (choice.kind === "text" ? choice.role !== "narrative" || !hasNarrative : !entity.document.blocks.some(block => block.kind === choice.kind)));
  const unavailable = (choice: BlockChoice) => choice.kind === "mechanics" && !entity.representation;
  const insertChoices = choices.map(choice => ({ id: choiceId(choice), label: choice.title, disabled: unavailable(choice) }));

  const closeMenu = (element: Element) => element.closest("details")?.removeAttribute("open");
  const menuKeys = (event: ReactKeyboardEvent<HTMLDetailsElement>) => {
    if (event.key !== "Escape" || !event.currentTarget.open) return;
    event.preventDefault(); event.stopPropagation();
    event.currentTarget.removeAttribute("open");
    event.currentTarget.querySelector<HTMLElement>("summary")?.focus();
  };
  const enterBody = (id: string) => focusIn(id, "[data-block-body] :is(.ProseMirror, input, textarea, select, button, [tabindex='0'])");

  return <section ref={root} className={styles.builder} tabIndex={-1} data-entity-builder data-object-id={entity.objectId} aria-label={`${FAMILY_LABELS[family]} Entity Builder`} onKeyDown={event => { if (event.key !== "Escape" || event.defaultPrevented) return; event.stopPropagation(); event.preventDefault(); if ((event.target as Element).closest("input, textarea, select")) { (event.target as HTMLElement).blur(); void session.flush(); } else onClose(); }}>
    <header className={styles.builderHeader}><div className={styles.headerIdentity}><ObjectGlyph family={family}/><span>{FAMILY_LABELS[family]}</span><span className={styles.maturity}>{entity.maturity === "ink" ? "Ink" : "Pencil"}</span></div><div className={styles.headerControls}><button type="button" className={styles.textAction} onClick={() => onFollow(entity.objectId)}>Preview</button><EntitySaveStatus session={session}/><button type="button" className={styles.iconButton} aria-label="Close Entity Builder" onClick={() => { void session.flush(); onClose(); }}><CloseGlyph/></button></div></header>
    <div className={styles.builderBody}>
      <article className={styles.builderPage}>
        <header className={styles.builderIdentity} onKeyDownCapture={event => { if (event.key !== "Enter" || !(event.target as Element).matches("textarea[aria-label='Entity name']")) return; /* The name commits on Enter; carry the writer on to the next field. */ requestAnimationFrame(() => root.current?.querySelector<HTMLElement>("[data-builder-properties] input, [data-block-heading]")?.focus()); }}>
          <NameEditor entity={entity} session={session}/>
          {family === "fragment" ? <p>A thought can become anything. Its identity stays the same.</p> : null}
          {entity.representation ? <div className={styles.builderProperties} data-builder-properties><EntityDetails entity={entity} session={session} showEmpty/></div> : null}
        </header>
        <EntityRecovery session={session}/>
        {!entity.representation ? <details className={styles.classification}><summary>Develop this fragment</summary><form className={styles.compactForm} onSubmit={event => { event.preventDefault(); setClassifying(true); void session.classify(classification, classificationName).finally(() => setClassifying(false)); }}><label>Family<select value={classification} onChange={event => setClassification(event.target.value as RepresentationKind)}>{REPRESENTATION_KINDS.map(kind => <option key={kind} value={kind}>{FAMILY_LABELS[kind]}</option>)}</select></label><label>Name<input value={classificationName} onChange={event => setClassificationName(event.target.value)} maxLength={200}/></label><div className={styles.rowActions}><button disabled={classifying}>{classifying ? "Developing…" : "Develop this identity"}</button></div></form></details> : null}
        <div className={styles.builderBlocks}>{blocks.map((block, index) => <section key={block.id} className={styles.builderBlock} data-builder-block={block.id} data-collapsed={block.collapsed || undefined} data-dragging={dragged === block.id || undefined} data-private={block.kind === "text" && block.role === "notes" || undefined} onDragOver={event => { if (dragged) event.preventDefault(); }} onDrop={event => { event.preventDefault(); if (dragged) move(dragged, index); setDragged(null); }}>
          <div className={styles.blockHead}>
            <div className={styles.blockGutter}>
              <button type="button" draggable data-block-grip className={styles.grip} aria-label={`Move ${block.title}`} aria-describedby={`${block.id}-move-hint`} onDragStart={event => { setDragged(block.id); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", block.id); }} onDragEnd={() => setDragged(null)} onKeyDown={event => { if (event.key === "ArrowUp" || event.key === "ArrowDown") { event.preventDefault(); event.stopPropagation(); move(block.id, index + (event.key === "ArrowUp" ? -1 : 1), true); } }}><svg aria-hidden="true" viewBox="0 0 16 20" width="14" height="18" fill="currentColor">{[5, 10, 15].map(y => <g key={y}><circle cx="5" cy={y} r="1.1"/><circle cx="11" cy={y} r="1.1"/></g>)}</svg></button>
              <details className={styles.blockMenu} onKeyDown={menuKeys}><summary aria-label={`Actions for ${block.title}`}><svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16" fill="currentColor"><circle cx="4" cy="10" r="1.2"/><circle cx="10" cy="10" r="1.2"/><circle cx="16" cy="10" r="1.2"/></svg></summary><div><button type="button" disabled={index === 0} onClick={event => { closeMenu(event.currentTarget); move(block.id, index - 1, true); }}>Move up</button><button type="button" disabled={index === blocks.length - 1} onClick={event => { closeMenu(event.currentTarget); move(block.id, index + 1, true); }}>Move down</button><button type="button" disabled={block.kind === "text" && block.role === "narrative"} title={block.kind === "text" && block.role === "narrative" ? "The primary narrative stays with this identity; clear its content to start again." : undefined} onClick={event => { closeMenu(event.currentTarget); remove(block); }}>Remove section</button></div></details>
            </div>
            <span id={`${block.id}-move-hint`} className={styles.srOnly}>Use the up and down arrow keys to reorder.</span>
            <input data-block-heading className={styles.blockName} aria-label={`Section title: ${block.title}`} value={block.title} maxLength={120} placeholder="Untitled section" onChange={event => session.patchBlock(block.id, current => ({ ...current, title: event.target.value }))} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); if (block.collapsed) session.patchBlock(block.id, current => ({ ...current, collapsed: false })); enterBody(block.id); } }}/>
            <button type="button" className={styles.foldButton} aria-label={`${block.collapsed ? "Expand" : "Collapse"} ${block.title}`} aria-expanded={!block.collapsed} onClick={() => session.patchBlock(block.id, current => ({ ...current, collapsed: !current.collapsed }))}><Chevron direction={block.collapsed ? "right" : "down"}/></button>
          </div>
          <div className={styles.builderBlockBody} data-block-body hidden={block.collapsed}>
            {block.kind === "text" ? <RichContentEditor variant="manuscript" value={block.content} ariaLabel={block.title} placeholder={`Write ${block.title.toLowerCase()}… Type / to add a section, @ to mention.`} onChange={content => session.patchBlock(block.id, current => current.kind === "text" ? { ...current, content } : current)} onBlur={() => { void session.flush(); }} onExit={() => focusIn(block.id, "[data-block-grip]")} onSearchReferences={session.searchReferences} onReference={onFollow} insertChoices={insertChoices} onInsert={id => { const choice = choices.find(current => choiceId(current) === id); if (choice && !unavailable(choice)) add(choice, block.id); }}/> : null}
            {block.kind === "mechanics" ? <EntityMechanics entity={entity} session={session} onReference={onFollow}/> : null}
            {block.kind === "media" ? <EntityMedia entity={entity} session={session} editable/> : null}
            {block.kind === "relationships" || block.kind === "sources" ? <EntityRelationships entity={entity} session={session} sources={block.kind === "sources"} onFollow={link => onFollow(link.other.objectId)}/> : null}
            {block.kind === "state" ? <EntityState entity={entity} session={session} allowAdd/> : null}
            {block.kind === "history" ? <EntityHistory entity={entity} session={session} allowAdd={family === "thread"}/> : null}
          </div>
        </section>)}</div>
        <div className={styles.addBlockArea}>
          <button ref={addButton} type="button" className={styles.addBlock} aria-expanded={adding} onClick={() => setAdding(current => !current)}><svg aria-hidden="true" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M8 3v10M3 8h10"/></svg>Add a section</button>
          {adding ? <div className={styles.blockChoices} role="group" aria-label="Sections" onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setAdding(false); addButton.current?.focus(); } }}>{choices.map(choice => <button type="button" key={choiceId(choice)} disabled={unavailable(choice)} onClick={() => add(choice)}>{choice.title}</button>)}</div> : null}
        </div>
      </article>
      <span className={styles.srOnly} role="status">{announcement}</span>
    </div>
  </section>;
}

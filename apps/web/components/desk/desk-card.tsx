"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { cardTitle, type DeskCard as DeskCardModel } from "@/lib/world/model";
import type { Tier } from "@/lib/desk/zoom";
import { FAMILY_LABELS, objectFamily, resolveDisclosure } from "@/lib/world/object-presentation";
import { WorldObjectCard } from "@/components/world-objects/world-object-card";
import { WritingEditor } from "../ui/text-editor";
import styles from "./world-placement.module.css";
import type { FocusSection } from "@/components/world-objects/use-focus-history";

type Props = {
  card: DeskCardModel;
  tier?: Tier;
  selected: boolean;
  editing: boolean;
  expanded?: boolean;
  focused?: boolean;
  neighbour?: boolean;
  receded?: boolean;
  stacked?: boolean;
  rotation?: number;
  onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
  /** Contextual actions are owned by the Canvas; the placement only forwards the gesture. */
  onContextMenu?: (event: React.MouseEvent<HTMLElement>) => void;
  /** Optional Board-specific resize affordance. Geometry remains outside the card projection. */
  onResizeStart?: (event: React.PointerEvent<HTMLElement>) => void;
  onResizeKeyDown?: (event: React.KeyboardEvent<HTMLButtonElement>) => void;
  onOpen?: (section?: FocusSection) => void;
  onExpand?: () => void;
  onFollow?: React.ComponentProps<typeof WorldObjectCard>["onFollow"];
  onMeasure?: (width: number, height: number) => void;
  onRequestEdit: () => void;
  /** Optional representation-label editing, kept as a Board projection concern. */
  onTitleChange?: (label: string) => void;
  onBodyChange: (body: string) => void;
  onEndEdit: () => void;
};

/** The placement owns geometry and gestures; family projections own their content. */
export function DeskCard({ card, tier = "mid", selected, editing, expanded = false, focused = false, neighbour = false, receded = false, stacked = false, rotation = 0, onPointerDown, onContextMenu, onResizeStart, onResizeKeyDown, onOpen, onExpand, onFollow, onMeasure, onRequestEdit, onTitleChange, onBodyChange, onEndEdit }: Props) {
  const node = useRef<HTMLElement>(null);
  const [titleEditing, setTitleEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState(() => cardTitle(card));
  const [titleEditorRect, setTitleEditorRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const titleCommitted = useRef(false);
  const titleInput = useRef<HTMLInputElement>(null);
  const disclosure = resolveDisclosure(tier, expanded);
  const editingRef = useRef(editing);
  editingRef.current = editing;
  const stableFootprint = useRef<{ width: number; height: number } | null>(null);
  const measure = useRef(onMeasure);
  measure.current = onMeasure;
  useEffect(() => {
    const element = node.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      if (!editingRef.current && element.offsetWidth > 0 && element.offsetHeight > 0) stableFootprint.current = { width: element.offsetWidth, height: element.offsetHeight };
      measure.current?.(element.offsetWidth, element.offsetHeight);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useLayoutEffect(() => {
    if (!titleEditing) { setTitleEditorRect(null); return; }
    const article = node.current;
    const heading = article?.querySelector<HTMLElement>("[data-card-title]");
    if (!article || !heading) return;
    const articleRect = article.getBoundingClientRect();
    const headingRect = heading.getBoundingClientRect();
    const scale = article.offsetWidth ? articleRect.width / article.offsetWidth : 1;
    setTitleEditorRect({ left: (headingRect.left - articleRect.left) / scale, top: (headingRect.top - articleRect.top) / scale, width: headingRect.width / scale, height: headingRect.height / scale });
  }, [titleEditing, disclosure, card.objectId]);
  useLayoutEffect(() => {
    if (titleEditing && titleEditorRect) { titleInput.current?.focus({ preventScroll: true }); titleInput.current?.select(); }
  }, [titleEditing, titleEditorRect]);
  const finishTitle = (commit: boolean) => {
    if (titleCommitted.current) return;
    titleCommitted.current = true;
    if (commit) onTitleChange?.(titleDraft.trim());
    setTitleEditing(false);
  };
  const beginTitleEdit = () => {
    if (!onTitleChange || !card.representation) { onRequestEdit(); return; }
    setTitleDraft(cardTitle(card));
    titleCommitted.current = false;
    setTitleEditing(true);
  };
  return <article ref={node} className={styles.placement}
    data-card-id={card.cardId} data-maturity={card.maturity} data-selected={selected || undefined}
    data-editing={editing || undefined} data-kind={card.representation?.kind} data-tier={tier}
    data-paper-tint={card.presentation?.tint || undefined}
    data-disclosure={disclosure} data-focused={focused || undefined} data-neighbour={neighbour || undefined} data-receded={receded || undefined}
    data-stacked={stacked || undefined}
    style={{ left: 0, top: 0, transform: `translate(${card.layout.x}px, ${card.layout.y}px) rotate(${rotation}deg)`, width: card.layout.width, height: editing ? stableFootprint.current?.height ?? card.layout.height : undefined, minHeight: editing ? (stableFootprint.current?.height ?? card.layout.height) : disclosure === "expanded" ? undefined : card.layout.height, zIndex: expanded ? card.z + 100 : card.z }}
    tabIndex={editing ? -1 : 0} aria-description={selected ? "Selected" : undefined}
    aria-label={card.representation ? `${card.representation.kind}: ${cardTitle(card) || "unnamed"}` : cardTitle(card) ? cardTitle(card).slice(0, 120) : "Empty card"}
    onPointerDown={event => {
      if ((event.target as Element).closest("[data-resize-handle]")) { onResizeStart?.(event); return; }
      if ((event.target as Element).closest("button, a, input, textarea, [contenteditable]")) { event.stopPropagation(); return; }
      onPointerDown(event);
    }}
    onContextMenu={event => { if ((event.target as Element).closest('input, textarea, [contenteditable]')) { event.stopPropagation(); return; } onContextMenu?.(event); }}
    onDoubleClick={event => {
      event.stopPropagation();
      const target = event.target as Element;
      if (target.closest("button, a, input, textarea, [contenteditable]")) return;
      if (target.closest("[data-card-title]") && onTitleChange && card.representation) {
        beginTitleEdit();
        return;
      }
      if (onOpen) onOpen(); else onRequestEdit();
    }}
    onKeyDown={event => {
      if (editing || event.target !== event.currentTarget || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key.toLowerCase() === "f" && onOpen) { event.preventDefault(); event.stopPropagation(); onOpen(); }
      else if (event.key.toLowerCase() === "e" && onExpand) { event.preventDefault(); event.stopPropagation(); onExpand(); }
      else if (event.key === "Enter") { event.preventDefault(); event.stopPropagation(); if (onOpen) onOpen(); else onRequestEdit(); }
      else if (event.key === "F2") { event.preventDefault(); event.stopPropagation(); beginTitleEdit(); }
    }}>
    {titleEditing ? <input ref={titleInput} className={styles.titleEditor} style={titleEditorRect ? { left: titleEditorRect.left, top: titleEditorRect.top, width: titleEditorRect.width, minHeight: titleEditorRect.height } : { visibility: "hidden" }} autoFocus value={titleDraft} aria-label="Card title" onChange={event => setTitleDraft(event.target.value)} onPointerDown={event => event.stopPropagation()} onKeyDown={event => { event.stopPropagation(); if (event.key === "Escape") { event.preventDefault(); finishTitle(false); } else if (event.key === "Enter") { event.preventDefault(); finishTitle(true); } }} onBlur={() => finishTitle(true)} /> : null}
    {editing ? <div className={styles.editingShell}>
      <header className={styles.editingHeader}><span>{FAMILY_LABELS[objectFamily(card)]}</span><span>{card.maturity}</span></header>
      <div className={styles.writing}><WritingEditor value={card.body} ariaLabel="Card text" placeholder="Write what the Desk should remember" className={styles.writingFrame} editorClassName={styles.editor} onCommit={body => { flushSync(() => onBodyChange(body)); onEndEdit(); }} onCancel={onEndEdit}/></div>
    </div> : <WorldObjectCard card={card} disclosure={disclosure} selected={selected} onExpand={onExpand} onFocus={onOpen} onFollow={onFollow}/>}
    {selected && !editing && (onResizeStart || onResizeKeyDown) ? <button type="button" className={styles.resizeHandle} data-resize-handle aria-label="Resize card" title="Resize card" onPointerDown={event => { event.preventDefault(); event.stopPropagation(); onResizeStart?.(event); }} onKeyDown={event => { event.stopPropagation(); onResizeKeyDown?.(event); }}><span aria-hidden="true" /></button> : null}
  </article>;
}

"use client";

import { useEffect, useRef, useState } from "react";
import type { DeskCard, SpatialCollection as Collection } from "@/lib/world/model";
import type { Rect } from "@/lib/desk/viewport";
import { cardTitle } from "@/lib/world/model";
import { CanvasGlyph } from "./canvas-controls";
import { FloatingSurface } from "@/components/ui/floating-surface";
import styles from "./spatial-collection.module.css";

export function SpatialCollection({ collection, bounds, cards, selected, dropTarget, onMoveStart, onNudge, onSelect, onToggle, onRename, onBrowse, onDissolve, onContextMenu, onArrange, renameRequested }: {
  collection: Collection; bounds: Rect; cards: readonly DeskCard[]; selected: boolean; dropTarget?: boolean;
  onMoveStart: (event: React.PointerEvent<HTMLElement>) => void;
  onNudge: (dx: number, dy: number) => void;
  onSelect: () => void; onToggle: () => void; onRename: (title: string) => void;
  onBrowse: (cardId: DeskCard["cardId"]) => void; onDissolve: () => void;
  onContextMenu?: (event: React.MouseEvent<HTMLElement>) => void;
  onArrange?: () => void;
  renameRequested?: number;
}) {
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(collection.title);
  const [browsing, setBrowsing] = useState(false);
  const browseTrigger = useRef<HTMLButtonElement>(null);
  const cancelRename = useRef(false);
  const lastRenameRequest = useRef<number | undefined>(undefined);
  const members = collection.cardIds.map(id => cards.find(card => card.cardId === id)).filter((card): card is DeskCard => Boolean(card));
  useEffect(() => {
    if (renameRequested === undefined || lastRenameRequest.current === renameRequested) return;
    lastRenameRequest.current = renameRequested;
    cancelRename.current = false;
    setDraft(collection.title);
    setRenaming(true);
  }, [collection.title, renameRequested]);

  return <section className={styles.collection} data-collapsed={collection.collapsed || undefined} data-selected={selected || undefined} data-drop-target={dropTarget || undefined}
    data-collection-id={collection.id} aria-label={`Collection: ${collection.title}`}
    style={{ left: bounds.x, top: bounds.y, width: bounds.width, height: bounds.height }}
    onContextMenu={event => { event.preventDefault(); event.stopPropagation(); onContextMenu?.(event); }}>
    {!collection.collapsed ? <>
      <button type="button" className={`${styles.boundaryHandle} ${styles.boundaryTop}`} data-collection-handle aria-label={`Move ${collection.title}`} onPointerDown={event => { event.stopPropagation(); onMoveStart(event); }} onClick={onSelect} />
      <button type="button" className={`${styles.boundaryHandle} ${styles.boundaryRight}`} data-collection-handle aria-label={`Move ${collection.title}`} onPointerDown={event => { event.stopPropagation(); onMoveStart(event); }} onClick={onSelect} />
      <button type="button" className={`${styles.boundaryHandle} ${styles.boundaryBottom}`} data-collection-handle aria-label={`Move ${collection.title}`} onPointerDown={event => { event.stopPropagation(); onMoveStart(event); }} onClick={onSelect} />
      <button type="button" className={`${styles.boundaryHandle} ${styles.boundaryLeft}`} data-collection-handle aria-label={`Move ${collection.title}`} onPointerDown={event => { event.stopPropagation(); onMoveStart(event); }} onClick={onSelect} />
    </> : null}
    <header className={styles.header} onPointerDown={event => { event.stopPropagation(); const control = (event.target as Element).closest("button,input,details"); if (!control || control.hasAttribute("data-collection-handle")) onMoveStart(event); }} onDoubleClick={event => event.stopPropagation()} onKeyDown={event => {
      if (event.key === "F10" && event.shiftKey) {
        event.preventDefault();
        event.stopPropagation();
        onContextMenu?.(event as unknown as React.MouseEvent<HTMLElement>);
        return;
      }
      if (!(event.target as Element).hasAttribute("data-collection-handle")) return;
      const step = event.shiftKey ? 32 : 8;
      const delta = event.key === "ArrowLeft" ? [-step, 0] : event.key === "ArrowRight" ? [step, 0] : event.key === "ArrowUp" ? [0, -step] : event.key === "ArrowDown" ? [0, step] : null;
      if (delta) { event.preventDefault(); event.stopPropagation(); onNudge(delta[0]!, delta[1]!); }
      else if (event.key === "F2") { event.preventDefault(); event.stopPropagation(); setDraft(collection.title); setRenaming(true); }
      else if (event.key.toLowerCase() === "e") { event.preventDefault(); event.stopPropagation(); onToggle(); }
    }}>
      <button type="button" className={styles.toggle} aria-expanded={!collection.collapsed} aria-label={`${collection.collapsed ? "Expand" : "Stack"} ${collection.title}`} onClick={onToggle}><CanvasGlyph name={collection.collapsed ? "canvas" : "stack"}/></button>
      {renaming ? <form onSubmit={event => { event.preventDefault(); onRename(draft); setRenaming(false); }}><input autoFocus aria-label="Collection title" value={draft} maxLength={120} onChange={event => setDraft(event.target.value)} onBlur={() => { if (!cancelRename.current) onRename(draft); cancelRename.current = false; setRenaming(false); }} onKeyDown={event => { event.stopPropagation(); if (event.key === "Escape") { event.preventDefault(); cancelRename.current = true; setRenaming(false); } }}/></form> : <button type="button" data-collection-handle className={styles.title} aria-description="Drag to move the collection. Double-click to rename." onClick={onSelect} onDoubleClick={() => { setDraft(collection.title); setRenaming(true); }}>{collection.title}</button>}
      <span className={styles.count}>{members.length} {members.length === 1 ? "item" : "items"}</span>
      <button type="button" ref={browseTrigger} className={styles.browseButton} aria-expanded={browsing} aria-haspopup="menu" aria-label={`Browse ${collection.title}`} onClick={() => setBrowsing(current => !current)}><CanvasGlyph name="more"/></button>
    </header>
    <FloatingSurface open={browsing} label={`Browse ${collection.title}`} triggerRef={browseTrigger} onClose={restore => { setBrowsing(false); if (restore) browseTrigger.current?.focus(); }}>
      <span>Bring a card to the front</span>
      {[...members].reverse().map(card => <button type="button" role="menuitem" key={card.cardId} onClick={() => { onBrowse(card.cardId); setBrowsing(false); }}><span>{cardTitle(card) || "Untitled fragment"}</span><small>{card.representation?.kind ?? "fragment"}</small></button>)}
      {onArrange ? <button className={`${styles.browserAction} ${styles.browserActionStart}`} type="button" role="menuitem" onClick={() => { onArrange(); setBrowsing(false); }}>Arrange cards</button> : null}
      <button className={`${styles.browserAction} ${!onArrange ? styles.browserActionStart : ""}`} type="button" role="menuitem" onClick={() => { setDraft(collection.title); setRenaming(true); setBrowsing(false); }}>Rename</button>
      <button className={styles.browserAction} type="button" role="menuitem" onClick={() => { onDissolve(); setBrowsing(false); }}>Ungroup cards</button>
    </FloatingSurface>
  </section>;
}

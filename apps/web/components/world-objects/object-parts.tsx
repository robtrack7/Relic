"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { objectInitials, objectMedia, type ObjectFamily } from "@/lib/world/object-presentation";
import type { DeskCard, Link } from "@/lib/world/model";
import type { StoryDevelopment } from "@/lib/world/object-projection";
import styles from "./object-cards.module.css";

export function ObjectGlyph({ family, ...props }: { family: ObjectFamily | "expand" | "focus" | "close" | "flip" | "edit" | "history" } & React.SVGProps<SVGSVGElement>) {
  const paths: Record<string, ReactNode> = {
    character: <><circle cx="12" cy="7" r="3"/><path d="M5 21v-3a7 7 0 0 1 14 0v3M8 21h8"/></>,
    place: <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
    fragment: <><path d="M6 3h9l4 4v14H6zM15 3v5h4M9 12h7M9 16h5"/></>,
    source: <><path d="M5 4h14v17H5zM8 1h8M8 8h8M8 12h8M8 16h5"/></>,
    thread: <><circle cx="6" cy="5" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="7" cy="20" r="2"/><path d="M6 7v5c0 5 12-1 12-2M7 18v-3"/></>,
    faction: <><circle cx="8" cy="7" r="3"/><circle cx="17" cy="8" r="2"/><path d="M2 20v-3a6 6 0 0 1 12 0v3M16 14a5 5 0 0 1 6 5"/></>,
    artifact: <><path d="m12 2 8 6-3 13H7L4 8zM4 8h16M12 2v19"/></>,
    event: <><path d="M4 5h16v16H4zM8 2v6M16 2v6M4 10h16M8 14h3M8 17h7"/></>,
    note: <><path d="M5 3h14v18H5zM8 8h8M8 12h8M8 16h5"/></>,
    expand: <><path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5"/></>,
    focus: <><path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5"/><circle cx="12" cy="12" r="4"/></>,
    close: <path d="m6 6 12 12M6 18 18 6"/>,
    flip: <><path d="M4 8a8 8 0 0 1 14-3l3 3M21 3v5h-5M20 16a8 8 0 0 1-14 3l-3-3M3 21v-5h5"/></>,
    edit: <><path d="m14 5 5 5M4 20l5-1L21 7l-5-5L4 14z"/></>,
    history: <><path d="M3 11a9 9 0 1 1 2 7M3 5v6h6M12 7v6l4 2"/></>
  };
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[family]}</svg>;
}

function focalPoint(position: string): [number, number] {
  const [x, y] = position.split(/\s+/).map(part => Number.parseFloat(part) / 100);
  const fx = Number.isFinite(x) ? x! : 0.5;
  return [fx, Number.isFinite(y) ? y! : fx];
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/**
 * Missing and failed imagery collapse instead of leaving an empty rectangle.
 * With `focal`, the authored image position is treated as a focal point and
 * placed at that fraction of the frame height, so a face stays in view however
 * hard a frame crops (a wide band, a tall column, a far-zoom card).
 */
export function ObjectMedia({ card, className = "", focal }: { card: DeskCard; className?: string; focal?: number }) {
  const media = objectMedia(card);
  const [failed, setFailed] = useState(false);
  const image = useRef<HTMLImageElement>(null);
  useEffect(() => setFailed(false), [media?.src]);
  const src = media?.src;
  const position = media?.position;
  useEffect(() => {
    const element = image.current;
    if (!element || focal === undefined || !position) return;
    const [fx, fy] = focalPoint(position);
    const place = () => {
      const { naturalWidth: W, naturalHeight: H, clientWidth: w, clientHeight: h } = element;
      if (!W || !H || !w || !h) return;
      const scale = Math.max(w / W, h / H);
      const overflowX = W * scale - w;
      const overflowY = H * scale - h;
      const px = overflowX > 0.5 ? clamp01((fx * W * scale - w / 2) / overflowX) : 0.5;
      const py = overflowY > 0.5 ? clamp01((fy * H * scale - focal * h) / overflowY) : 0.5;
      element.style.objectPosition = `${(px * 100).toFixed(1)}% ${(py * 100).toFixed(1)}%`;
    };
    if (element.complete) place();
    element.addEventListener("load", place);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(place);
    observer?.observe(element);
    return () => { element.removeEventListener("load", place); observer?.disconnect(); };
  }, [src, position, focal, failed]);
  if (!media || failed) return null;
  // Ordinary images support authored external media without an image-optimizer allowlist.
  // eslint-disable-next-line @next/next/no-img-element
  return <img ref={image} className={className} src={media.src} alt={media.alt} style={{ objectPosition: media.position }} loading="lazy" draggable={false} onError={() => setFailed(true)} />;
}

/** The composed image-less identity mark: initials on the family tint, never an empty slab. */
export function ObjectMonogram({ title, className = "" }: { title: string; className?: string }) {
  return <div className={`${styles.monogram} ${className}`} aria-hidden="true"><span>{objectInitials(title)}</span></div>;
}

export function ObjectMaturity({ card }: { card: DeskCard }) {
  return <span className={styles.maturity} data-maturity={card.maturity} title="Creative maturity; independent of story truth"><i aria-hidden="true" />{card.maturity === "ink" ? "Ink" : "Pencil"}</span>;
}

export function ObjectReferences({ links, onFollow, limit = 4 }: { links: readonly Link[]; onFollow?: (link: Link) => void; limit?: number }) {
  if (!links.length) return null;
  const unique = links.filter((link, index) => links.findIndex(other => other.other.objectId === link.other.objectId) === index);
  return <div className={styles.references}>{unique.slice(0, limit).map(link => <button type="button" key={link.other.objectId} onClick={() => onFollow?.(link)} disabled={!onFollow} title={`${link.direction === "in" ? "Incoming" : "Outgoing"}: ${link.claimKind}`}><ObjectGlyph family={link.other.kind ?? "fragment"}/><span>{link.other.label}</span></button>)}{unique.length > limit ? <span className={styles.moreReferences}>+{unique.length - limit}</span> : null}</div>;
}

export function Developments({ items, onPosition }: { items: readonly StoryDevelopment[]; onPosition?: (item: StoryDevelopment) => void }) {
  if (!items.length) return <p className={styles.empty}>The next development is still unwritten.</p>;
  return <ol className={styles.developments}>{items.map(item => <li key={item.id}><span className={styles.developmentPoint} aria-hidden="true"/><div><span className={styles.storyPosition}>{onPosition ? <button type="button" onClick={() => onPosition(item)}>{item.story.label || "Unplaced in story time"}</button> : item.story.label || "Unplaced in story time"}</span>{item.layer === "pending" ? <span className={styles.pendingDevelopment}>Pending development</span> : null}<p>{item.summary}</p>{item.event ? <span className={styles.developmentEvent}>{item.event.label}</span> : null}</div></li>)}</ol>;
}

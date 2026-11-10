"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { cardTitle, type Claim, type DeskCard, type Link } from "@/lib/world/model";
import { FAMILY_LABELS, objectFamily, objectField } from "@/lib/world/object-presentation";
import type { StoryDevelopment } from "@/lib/world/object-projection";
import styles from "./object-cards.module.css";

export type ObjectCardContentProps = {
  card: DeskCard;
  claims: readonly Claim[];
  links: readonly Link[];
  onFollow?: (link: Link) => void;
};

export type ExpandedCardContentProps = ObjectCardContentProps & { developments: readonly StoryDevelopment[] };

export function claimValue(claims: readonly Claim[], key: string): string {
  return claims.find(claim => claim.claimKind === key)?.value ?? "";
}

/** A claim, falling back to the authored representation field of the same key. */
export function fact(card: DeskCard, claims: readonly Claim[], key: string): string {
  return claimValue(claims, key) || objectField(card, key);
}

export function firstSentence(text: string, limit = 180): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return "";
  const sentence = clean.match(/^(.{1,240}?[.!?])(?:\s|$)/)?.[1] ?? clean;
  return sentence.length > limit ? `${sentence.slice(0, limit - 1).trimEnd()}…` : sentence;
}

export function displayTitle(card: DeskCard): string {
  return cardTitle(card) || `Unnamed ${FAMILY_LABELS[objectFamily(card)].toLowerCase()}`;
}

/** Relationship links that name other objects (development links are story time, not involvement). */
export function involvedLinks(links: readonly Link[]): readonly Link[] {
  const named = links.filter(link => !link.claimKind.startsWith("development"));
  return named.filter((link, index) => named.findIndex(other => other.other.objectId === link.other.objectId) === index);
}

export function CardTitle({ card, size = "card", className = "" }: { card: DeskCard; size?: "card" | "expanded"; className?: string }) {
  return <h2 data-card-title className={`${styles.title} ${size === "expanded" ? styles.titleExpanded : ""} ${className}`}>{displayTitle(card)}</h2>;
}

const LABELS: Record<string, string> = { allegiance: "Faction", sourceType: "Type", open_question: "Open question", next: "Pressure", gmNotes: "GM notes" };

/** At most three family-selected essentials; empty values are omitted, never padded. */
export function Essentials({ card, claims, keys }: { card: DeskCard; claims: readonly Claim[]; keys: readonly string[] }) {
  const shown = keys.flatMap(key => { const value = fact(card, claims, key); return value ? [{ key, value }] : []; }).slice(0, 3);
  if (!shown.length) return null;
  return <dl className={styles.essentials}>{shown.map(({ key, value }) => <div key={key}><dt>{LABELS[key] ?? key.replaceAll("_", " ")}</dt><dd>{firstSentence(value, 90)}</dd></div>)}</dl>;
}

/**
 * Prose clamped to whole lines. When it overflows, the last visible line fades
 * instead of being cut through the middle of its glyphs.
 */
export function FadeText({ children, lines, className = "", as: Tag = "p" }: { children: ReactNode; lines: number; className?: string; as?: "p" | "blockquote" }) {
  const node = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const element = node.current;
    if (!element) return;
    const check = () => {
      const overflowing = element.scrollHeight - element.clientHeight > 1;
      if (overflowing) element.dataset.overflowing = "true"; else delete element.dataset.overflowing;
    };
    check();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(check);
    observer?.observe(element);
    return () => observer?.disconnect();
  }, [children, lines]);
  return <Tag ref={node as never} className={`${styles.fadeText} ${className}`} style={{ "--lines": lines } as React.CSSProperties}>{children}</Tag>;
}

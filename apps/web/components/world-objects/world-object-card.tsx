"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { type DeskCard, type Link } from "@/lib/world/model";
import { objectFamily, objectField, objectMedia, type Disclosure } from "@/lib/world/object-presentation";
import { projectObject, type ResolvedObjectSnapshot } from "@/lib/world/object-projection";
import { ObjectGlyph } from "./object-parts";
import { RecognitionFace } from "./recognition-card";
import styles from "./object-cards.module.css";
import type { FocusSection } from "./use-focus-history";

/** Selects family-owned projections. Data and mutation stay outside this host. */
export function WorldObjectCard({ card: current, disclosure = "card", selected = false, snapshot, proposed = false, onExpand, onFocus, onFollow }: {
  card: DeskCard;
  disclosure?: Disclosure;
  selected?: boolean;
  snapshot?: ResolvedObjectSnapshot;
  proposed?: boolean;
  onExpand?: () => void;
  onFocus?: (section?: FocusSection) => void;
  onFollow?: (link: Link) => void;
}) {
  const view = projectObject(current, snapshot);
  const card = view.card;
  const family = objectFamily(card);
  const hostRef = useRef<HTMLDivElement>(null);
  const faceRef = useRef<HTMLDivElement>(null);
  const previousFace = useRef<HTMLElement | null>(null);
  const outgoingFace = useRef<HTMLElement | null>(null);
  const faceAnimation = useRef<Animation | null>(null);
  const previousHeight = useRef<number | null>(null);
  const stateKey = `${card.objectId}:${disclosure}`;
  const lastStateKey = useRef<string | null>(null);
  const disclosureAnimation = useRef<Animation | null>(null);
  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const firstPass = lastStateKey.current === null;
    const changed = lastStateKey.current !== stateKey;
    lastStateKey.current = stateKey;
    const snapshot = faceRef.current?.cloneNode(true) as HTMLElement | undefined;
    if (firstPass || !changed) {
      previousHeight.current = host.offsetHeight || previousHeight.current;
      previousFace.current = snapshot ?? null;
      return;
    }
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const from = disclosureAnimation.current ? Number.parseFloat(getComputedStyle(host).height) : previousHeight.current ?? host.offsetHeight;
    disclosureAnimation.current?.cancel();
    faceAnimation.current?.cancel();
    disclosureAnimation.current = null;
    faceAnimation.current = null;
    delete host.dataset.transition;
    outgoingFace.current?.remove();
    // Measure the next composition once at its intended width. The live card
    // then reveals that composition while its own shell changes dimensions.
    const clone = host.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('[data-outgoing-face]').forEach(node => node.remove());
    const targetWidth = Number.parseFloat(host.parentElement?.style.width ?? "") || host.parentElement?.offsetWidth || host.offsetWidth;
    clone.style.cssText = `position:absolute;visibility:hidden;pointer-events:none;width:${targetWidth}px;height:auto;left:0;top:0;`;
    clone.inert = true;
    host.parentElement?.append(clone);
    const naturalHeight = Math.max(clone.offsetHeight, Number.parseFloat(host.parentElement ? getComputedStyle(host.parentElement).minHeight : "0") || 0);
    clone.remove();
    previousHeight.current = naturalHeight;
    if (reduceMotion || typeof host.animate !== "function" || Math.abs(from - naturalHeight) < 1) {
      host.style.height = "";
      host.style.overflow = "";
      previousFace.current = snapshot ?? null;
      return;
    }
    host.style.height = `${from}px`;
    host.style.overflow = "hidden";
    const animation = host.animate(
      [{ height: `${from}px` }, { height: `${naturalHeight}px` }],
      { duration: 260, easing: "cubic-bezier(.16, 1, .3, 1)", fill: "both" }
    );
    disclosureAnimation.current = animation;
    host.dataset.transition = "disclosure";
    const outgoing = previousFace.current;
    if (outgoing) {
      outgoing.setAttribute("aria-hidden", "true"); outgoing.inert = true;
      outgoing.dataset.outgoingFace = "true";
      outgoing.style.cssText = `position:absolute;left:0;top:${faceRef.current?.offsetTop ?? 42}px;width:100%;pointer-events:none;z-index:3;`;
      host.append(outgoing);
      outgoingFace.current = outgoing;
      outgoing.animate([{opacity:1},{opacity:0}], {duration:90,fill:"both"}).onfinish = () => outgoing.remove();
    }
    if (faceRef.current) faceAnimation.current = faceRef.current.animate([{opacity:0},{opacity:1}], {duration:160,delay:70,fill:"both"});
    previousFace.current = snapshot ?? null;
    animation.onfinish = () => {
      if (disclosureAnimation.current !== animation) return;
      host.style.height = "";
      host.style.overflow = "";
      delete host.dataset.transition;
      disclosureAnimation.current = null;
      animation.cancel(); faceAnimation.current?.cancel(); outgoingFace.current?.remove();
    };
  }, [stateKey]);
  useEffect(() => () => { disclosureAnimation.current?.cancel(); faceAnimation.current?.cancel(); outgoingFace.current?.remove(); }, []);
  const proposedKinds = new Set(view.pendingClaims.map(claim => claim.claimKind));
  const claims = proposed ? [...view.pendingClaims, ...view.settledClaims.filter(claim => !proposedKinds.has(claim.claimKind))] : view.settledClaims;
  const links = proposed ? [...view.settledLinks, ...view.pendingLinks] : view.settledLinks;
  const developments = proposed ? [...view.developments, ...view.pendingDevelopments] : view.developments;
  const expanded = disclosure === "expanded";
  const body = <RecognitionFace card={card} claims={claims} links={links} developments={developments} disclosure={disclosure} onFollow={onFollow}/>;

  const actions = <div className={styles.cardActions}>
    {onExpand ? <button type="button" aria-label={expanded ? "Collapse card" : "Expand card"} title={expanded ? "Collapse card (E)" : "Expand card (E)"} aria-expanded={expanded} onClick={onExpand}><ObjectGlyph family={expanded ? "close" : "expand"}/></button> : null}
    {onFocus ? <button type="button" aria-label="Open Focus" title="Open Focus (F)" onClick={() => onFocus()}><ObjectGlyph family="focus"/></button> : null}
  </div>;

  return <div ref={hostRef} className={styles.cardHost}><div className={styles.surface} data-object-family={family} data-disclosure={disclosure} data-maturity={card.maturity} data-composition={objectField(card, "composition") || undefined} data-media={objectMedia(card) ? true : undefined} data-selected={selected || undefined} data-proposed={proposed || undefined}>
    <div className={styles.cardActionsOverlay}>{actions}</div>
    {view.context.kind === "historical" ? <div className={styles.asOf}><ObjectGlyph family="history"/>As of {view.context.position.label || "an earlier story position"}</div> : null}
    <div ref={faceRef} className={styles.faceContent}>{body}</div>
  </div></div>;
}

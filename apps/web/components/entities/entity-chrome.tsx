"use client";

import { useLayoutEffect, useRef } from "react";
import type { EntitySnapshot } from "@/lib/world/entity-document";
import { entityTitle } from "@/lib/world/entity-composition";
import { objectFamily } from "@/lib/world/object-presentation";
import type { EntitySession, SaveStatus } from "./entity-session";
import styles from "./entity-workspace.module.css";

/** Chrome shared by Focus and Builder: identity editor, save state, recovery, glyphs. */
export function Chevron({ direction = "down" }: { direction?: "down" | "up" | "left" | "right" }) { return <svg aria-hidden="true" viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" style={{ transform: `rotate(${direction === "up" ? 180 : direction === "left" ? 90 : direction === "right" ? -90 : 0}deg)` }}><path d="m5 8 5 5 5-5"/></svg>; }
export function CloseGlyph() { return <svg aria-hidden="true" viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor"><path d="m5 5 10 10M15 5 5 15"/></svg>; }

export function EntitySaveStatus({ session }: { session: EntitySession }) {
  const state = session.getSnapshot();
  const labels: Record<SaveStatus, string> = { loading: "Opening…", saved: "Saved", saving: "Saving…", unsaved: "Saving shortly…", error: "Draft kept", conflict: "Review draft" };
  return <span className={styles.saveStatus} data-state={state.status} role="status" aria-live="polite">{labels[state.status]}{state.status === "saved" ? <svg aria-hidden="true" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor"><path d="m3 8 3 3 7-7"/></svg> : null}</span>;
}
export function EntityRecovery({ session }: { session: EntitySession }) {
  const state = session.getSnapshot();
  if (!state.error) return null;
  return <div className={styles.recovery} role="alert"><p>{state.error}</p>{state.status === "conflict" && state.remote ? <><details><summary>Compare saved text</summary><p>{state.remote.body || "The saved narrative is empty."}</p></details><div className={styles.rowActions}><button type="button" onClick={session.saveRecoveredVersion}>Save my draft instead</button><button type="button" onClick={session.useSavedVersion}>Use saved version</button></div></> : <button type="button" onClick={() => { void session.retry(); if (!state.entity) void session.load(true); }}>Try again</button>}</div>;
}
export function NameEditor({ entity, session, compact = false }: { entity: EntitySnapshot; session: EntitySession; compact?: boolean }) {
  const name = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const field = name.current;
    if (!field) return;
    const fit = () => { field.style.height = "auto"; field.style.height = `${field.scrollHeight}px`; };
    fit();
    let width = field.clientWidth;
    let frame = 0;
    const observer = new ResizeObserver(() => {
      if (field.clientWidth === width) return;
      width = field.clientWidth;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(fit);
    });
    observer.observe(field);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [entity.representation?.label]);
  return entity.representation ? <textarea ref={name} rows={1} data-shared="title" className={compact ? styles.focusName : styles.builderName} aria-label="Entity name" value={entity.representation.label ?? ""} placeholder={`Unnamed ${objectFamily(entity)}`} onChange={event => session.setIdentityDraft(event.target.value.replace(/[\r\n]+/g, " "))} onBlur={() => { void session.flush(); }} onKeyDown={event => { event.stopPropagation(); if (event.key === "Enter" || event.key === "Escape") { event.preventDefault(); event.currentTarget.blur(); } }}/> : <h1 data-shared="title" className={compact ? styles.focusName : styles.builderName}>{entityTitle(entity)}</h1>;
}

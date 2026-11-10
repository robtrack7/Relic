"use client";
import { useRef, useState } from "react";
import { createEntityAction } from "@/app/entity-actions";
import { REPRESENTATION_KINDS } from "@/lib/world/templates";
import { FAMILY_LABELS } from "@/lib/world/object-presentation";
import type { RepresentationKind } from "@/lib/world/model";
import styles from "./entity-workspace.module.css";

export function EntityCreation({ worldId, onCreated, onClose }: { worldId: string; onCreated: (id: string) => void; onClose: () => void }) {
  const [kind, setKind] = useState<RepresentationKind | "fragment">("character");
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const id = useRef<string | null>(null);
  const create = async () => {
    if (saving) return;
    setSaving(true); setError("");
    const objectId = id.current ?? crypto.randomUUID(); id.current = objectId;
    try {
      const result = await createEntityAction({ worldId, objectId, kind: kind === "fragment" ? undefined : kind, label: kind === "fragment" ? undefined : label });
      if (result.state !== "ok") { setError("This entity could not be created. Your name and choices are still here; try again."); return; }
      onCreated(result.data.objectId);
    } catch { setError("This entity could not be created. Try again when the connection returns."); }
    finally { setSaving(false); }
  };
  return <div className={styles.builderFrame}><section className={styles.builder} aria-label="Create entity"><header className={styles.builderHeader}><span>Create entity</span><button className={styles.iconButton} type="button" aria-label="Close creation" onClick={onClose}><svg aria-hidden="true" width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor"><path d="m5 5 10 10M15 5 5 15"/></svg></button></header><div className={styles.builderBody}><form className={styles.creationForm} onSubmit={event => { event.preventDefault(); void create(); }}><h1>Give the world something new.</h1><p>Start with a person, a place, a question—or an unclassified thought.</p><label>Kind<select value={kind} onChange={event => setKind(event.target.value as typeof kind)}><option value="fragment">Fragment</option>{REPRESENTATION_KINDS.map(value => <option key={value} value={value}>{FAMILY_LABELS[value]}</option>)}</select></label>{kind !== "fragment" ? <label>Name<input autoFocus value={label} onChange={event => setLabel(event.target.value)} placeholder={`Unnamed ${kind}`} maxLength={200}/></label> : null}<div className={styles.rowActions}><button disabled={saving}>{saving ? "Creating…" : "Create and open Builder"}</button><button type="button" onClick={onClose}>Cancel</button></div>{error ? <p role="alert">{error}</p> : null}</form></div></section></div>;
}
